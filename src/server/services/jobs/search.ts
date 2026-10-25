import 'server-only';
import { JobSearchParams, JobSearchResponse, NormalizedJob } from './types';
import { getConfiguredProviders } from './providers';
import { deduplicateJobs } from './dedupe';
import { rankJobsWithResume } from './ranking';
import { filterJobs } from './filters';
import { jobSearchCache } from './cache';

/**
 * Orchestrates multi-provider job search with deduplication, ranking, filtering, and caching.
 */
export async function executeJobSearch(params: JobSearchParams): Promise<JobSearchResponse> {
  const configuredProviders = getConfiguredProviders();
  const page = Math.max(params.page || 1, 1);
  const limit = Math.min(Math.max(params.limit || 15, 5), 50);

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
      searchLocation: params.location,
      searchKeywords: params.keywords,
    };
  }

  const activeSources: string[] = [];
  const unavailableSources: string[] = [];
  const rawJobs: NormalizedJob[] = [];
  const neededCount = page * limit;

  // Query each configured provider in parallel
  const queryPromises = configuredProviders.map(async (provider) => {
    // Check in-memory cache first if bypassCache is not requested
    const cached = !params.bypassCache
      ? jobSearchCache.get(provider.name, params.keywords, params.location, params.radiusKm)
      : null;

    if (cached && cached.length >= neededCount) {
      activeSources.push(provider.name);
      return cached;
    }

    try {
      const providerPage = cached && cached.length > 0 ? Math.floor(cached.length / 25) + 1 : 1;
      const results = await provider.searchJobs({
        ...params,
        page: providerPage,
        limit: Math.max(limit, 25),
      });

      if (results && results.length > 0) {
        const combined = cached ? deduplicateJobs([...cached, ...results]) : results;
        jobSearchCache.set(
          provider.name,
          combined,
          params.keywords,
          params.location,
          params.radiusKm
        );
        activeSources.push(provider.name);
        return combined;
      }

      if (cached && cached.length > 0) {
        activeSources.push(provider.name);
        return cached;
      }

      return [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Job Search] Provider ${provider.name} failed:`, msg);
      unavailableSources.push(provider.name);
      if (cached && cached.length > 0) {
        activeSources.push(provider.name);
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

  // 2. Apply filters (workplace, employment type, salary, date posted)
  const filtered = filterJobs(deduplicated, params);

  // 3. Rank with candidate resume if resume context is present
  const ranked = rankJobsWithResume(filtered, params);

  // 4. Calculate pagination
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
    unavailableSources: unavailableSources.length > 0 ? unavailableSources : undefined,
    isConfigured: true,
    searchLocation: params.location,
    searchKeywords: params.keywords,
    lastUpdated: new Date().toISOString(),
  };
}
