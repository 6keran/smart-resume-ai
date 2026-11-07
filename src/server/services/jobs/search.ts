import 'server-only';
import type { JobProvider, JobSearchParams, JobSearchResponse, NormalizedJob } from './types';
import { getConfiguredProviders } from './providers';
import { deduplicateJobs } from './dedupe';
import { rankJobsWithResume } from './ranking';
import { filterJobs } from './filters';
import { jobSearchCache } from './cache';
import { correctSearchQuery, normalizeLocationQuery } from './searchQuery';
import { NaukriProvider } from './providers/naukri';
import { NaukriProviderUnavailableError } from './providers/naukriCooldown';

/**
 * Orchestrates multi-provider job search with deduplication, ranking, filtering, and caching.
 */
export async function executeJobSearch(
  params: JobSearchParams,
  providersOverride?: JobProvider[]
): Promise<JobSearchResponse> {
  const configuredProviders = (providersOverride || getConfiguredProviders()).filter((provider) => provider.isConfigured());
  const page = Math.max(params.page || 1, 1);
  const limit = Math.min(Math.max(params.limit || 15, 5), 50);

  // Normalize keywords and handle minor spelling mistakes
  const queryCorrection = correctSearchQuery(params.keywords || '');
  const locationNorm = normalizeLocationQuery(params.location || '');

  const effectiveKeywords = queryCorrection.correctedQuery || queryCorrection.normalizedQuery;
  const effectiveLocation = locationNorm.normalizedLocation;

  const normalizedParams: JobSearchParams = {
    ...params,
    keywords: effectiveKeywords,
    location: effectiveLocation,
  };

  // If no live providers configured, return graceful unconfigured state
  if (configuredProviders.length === 0) {
    console.info(
      '[Smart Resume AI] Live job search is not configured yet. Configure ADZUNA_APP_ID/ADZUNA_APP_KEY or JOOBLE_API_KEY in .env.local to enable live job data.'
    );

    return {
      jobs: [],
      totalJobs: 0,
      page: 1,
      totalPages: 0,
      configuredProviders: [],
      activeSources: [],
      isConfigured: false,
      searchLocation: effectiveLocation || params.location,
      searchKeywords: effectiveKeywords || params.keywords,
      originalKeywords: params.keywords,
      correctedKeywords: queryCorrection.wasCorrected ? queryCorrection.correctedQuery : undefined,
      correctionApplied: queryCorrection.correctionApplied,
      originalLocation: params.location,
      correctedLocation: locationNorm.wasCorrected || locationNorm.isAliasApplied ? locationNorm.canonicalLocation : undefined,
      locationAliasApplied: locationNorm.isAliasApplied,
      locationWasCorrected: locationNorm.wasCorrected,
      suggestion: queryCorrection.suggestion,
    };
  }

  const activeSources: string[] = [];
  const liveSources: string[] = [];
  const unavailableSources: string[] = [];
  const cachedSources: string[] = [];
  const cachedTimestamps: number[] = [];
  const cachedAtBySource: Record<string, string> = {};
  const cachedJobIds = new Set<string>();
  const unavailableSourceReasons: Record<string, 'challenge' | 'restricted' | 'error'> = {};
  const sourceCooldownUntil: Record<string, string> = {};
  const rawJobs: NormalizedJob[] = [];
  const neededCount = page * limit;

  const addCachedSnapshot = (
    source: string,
    entry: NonNullable<ReturnType<typeof jobSearchCache.getEntry>>,
    jobs = entry.jobs
  ) => {
    if (jobs.length === 0) return;
    cachedSources.push(source);
    cachedTimestamps.push(Date.parse(entry.cachedAt));
    cachedAtBySource[source] = entry.cachedAt;
    jobs.forEach((job) => cachedJobIds.add(job.id));
  };

  const addUnavailableSource = (source: string, error: unknown) => {
    unavailableSources.push(source);
    if (error instanceof NaukriProviderUnavailableError) {
      unavailableSourceReasons[source] = error.status.reason;
      sourceCooldownUntil[source] = error.status.retryAt;
    } else {
      unavailableSourceReasons[source] = 'error';
    }
  };

  // Query each configured provider in parallel using normalized query
  const queryPromises = configuredProviders.map(async (provider) => {
    // Check in-memory cache first if bypassCache is not requested
    const cachedEntry = jobSearchCache.getEntry(
      provider.name,
      effectiveKeywords,
      effectiveLocation,
      normalizedParams.radiusKm
    );
    const cached = cachedEntry?.jobs || null;

    const cooldownStatus = provider instanceof NaukriProvider ? provider.getCooldownStatus() : null;
    if (cooldownStatus) {
      addUnavailableSource(provider.name, new NaukriProviderUnavailableError(cooldownStatus, true));
      if (cached && cached.length > 0) {
        activeSources.push(provider.name);
        if (cachedEntry) addCachedSnapshot(provider.name, cachedEntry);
        return cached;
      }
      return [];
    }

    if (!normalizedParams.bypassCache && cached && cached.length >= neededCount) {
      activeSources.push(provider.name);
      if (cachedEntry) addCachedSnapshot(provider.name, cachedEntry);
      return cached;
    }

    try {
      const providerPage = cached && cached.length > 0 ? Math.floor(cached.length / 25) + 1 : 1;
      const results = await provider.searchJobs({
        ...normalizedParams,
        page: providerPage,
        limit: Math.max(limit, 25),
      });

      if (results && results.length > 0) {
        const combined = cached ? deduplicateJobs([...cached, ...results]) : results;
        liveSources.push(provider.name);
        if (cached && cachedEntry) {
          const liveJobIds = new Set(results.map((job) => job.id));
          const cachedOnlyJobs = combined.filter((job) => !liveJobIds.has(job.id));
          addCachedSnapshot(provider.name, cachedEntry, cachedOnlyJobs);
        }
        jobSearchCache.set(
          provider.name,
          combined,
          effectiveKeywords,
          effectiveLocation,
          normalizedParams.radiusKm
        );
        activeSources.push(provider.name);
        return combined;
      }

      if (cached && cached.length > 0) {
        activeSources.push(provider.name);
        if (cachedEntry) addCachedSnapshot(provider.name, cachedEntry);
        return cached;
      }

      return [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Job Search] Provider ${provider.name} failed:`, msg);
      addUnavailableSource(provider.name, err);
      if (cached && cached.length > 0) {
        activeSources.push(provider.name);
        if (cachedEntry) addCachedSnapshot(provider.name, cachedEntry);
        return cached;
      }
      return [];
    }
  });

  const resultsByProvider = await Promise.allSettled(queryPromises);

  for (const res of resultsByProvider) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      rawJobs.push(...res.value);
    }
  }

  // 1. Deduplicate listings across providers
  const deduplicated = deduplicateJobs(rawJobs);

  // 2. Apply filters (workplace, employment type, salary, date posted, keywords, location aliases)
  let filtered = filterJobs(deduplicated, normalizedParams);
  let fallbackToOriginalUsed = false;
  let finalKeywords = effectiveKeywords;
  let finalCorrectionApplied = queryCorrection.correctionApplied;

  // 3. Fallback to original query if corrected query produced 0 results
  if (
    filtered.length === 0 &&
    queryCorrection.correctionApplied &&
    params.keywords &&
    params.keywords.trim().toLowerCase() !== effectiveKeywords.toLowerCase()
  ) {
    const originalParams: JobSearchParams = {
      ...params,
      keywords: params.keywords.trim(),
      location: effectiveLocation,
    };

    // Check if the initial provider batch matches the original query
    const originalFiltered = filterJobs(deduplicated, originalParams);
    if (originalFiltered.length > 0) {
      filtered = originalFiltered;
      fallbackToOriginalUsed = true;
      finalKeywords = params.keywords.trim();
      finalCorrectionApplied = false;
    } else {
      // Query providers directly with original keywords if available
      try {
        const fallbackJobs: NormalizedJob[] = [];
        for (const provider of configuredProviders) {
          try {
            const rawFallback = await provider.searchJobs({
              ...originalParams,
              page: 1,
              limit: Math.max(limit, 25),
            });
            if (rawFallback && rawFallback.length > 0) {
              fallbackJobs.push(...rawFallback);
              liveSources.push(provider.name);
              activeSources.push(provider.name);
            }
          } catch (fallbackError) {
            addUnavailableSource(provider.name, fallbackError);
          }
        }
        if (fallbackJobs.length > 0) {
          const fallbackDedupe = deduplicateJobs(fallbackJobs);
          const fallbackFiltered = filterJobs(fallbackDedupe, originalParams);
          if (fallbackFiltered.length > 0) {
            filtered = fallbackFiltered;
            fallbackToOriginalUsed = true;
            finalKeywords = params.keywords.trim();
            finalCorrectionApplied = false;
          }
        }
      } catch (fallbackErr) {
        console.warn('[Job Search] Fallback to original query error:', fallbackErr);
      }
    }
  }

  // 4. Rank with candidate resume if resume context is present
  const ranked = rankJobsWithResume(filtered, normalizedParams);

  // 5. Calculate pagination
  const totalJobs = ranked.length;
  const totalPages = Math.ceil(totalJobs / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedJobs = ranked.slice(startIndex, startIndex + limit);

  return {
    jobs: paginatedJobs,
    totalJobs,
    page,
    totalPages,
    configuredProviders: configuredProviders.map((p) => p.name),
    activeSources: Array.from(new Set(activeSources)),
    liveSources: Array.from(new Set(liveSources)),
    cachedSources: Array.from(new Set(cachedSources)),
    unavailableSources: unavailableSources.length > 0 ? Array.from(new Set(unavailableSources)) : undefined,
    cachedAtBySource: Object.keys(cachedAtBySource).length > 0 ? cachedAtBySource : undefined,
    cachedJobIds: cachedJobIds.size > 0 ? Array.from(cachedJobIds) : undefined,
    unavailableSourceReasons: Object.keys(unavailableSourceReasons).length > 0 ? unavailableSourceReasons : undefined,
    sourceCooldownUntil: Object.keys(sourceCooldownUntil).length > 0 ? sourceCooldownUntil : undefined,
    isConfigured: true,
    searchLocation: effectiveLocation || params.location,
    searchKeywords: finalKeywords || params.keywords,
    originalKeywords: params.keywords,
    correctedKeywords: queryCorrection.wasCorrected ? queryCorrection.correctedQuery : undefined,
    correctionApplied: finalCorrectionApplied,
    originalLocation: params.location,
    correctedLocation: locationNorm.wasCorrected || locationNorm.isAliasApplied ? locationNorm.canonicalLocation : undefined,
    locationAliasApplied: locationNorm.isAliasApplied,
    locationWasCorrected: locationNorm.wasCorrected,
    fallbackToOriginalUsed,
    suggestion: queryCorrection.suggestion,
    cachedAt: cachedTimestamps.length > 0
      ? new Date(Math.min(...cachedTimestamps)).toISOString()
      : undefined,
    lastUpdated: new Date().toISOString(),
  };
}
