import { NormalizedJob, JobSearchParams } from './types';
import { correctSearchQuery, normalizeLocationQuery } from './searchQuery';

/**
 * Applies client-side and server-side unified filters to NormalizedJob arrays.
 */
export function filterJobs(jobs: NormalizedJob[], params: JobSearchParams): NormalizedJob[] {
  let filtered = [...jobs];

  // 1. Workplace filter (Remote, Hybrid, On-site)
  if (params.workplaceType && params.workplaceType !== 'all') {
    filtered = filtered.filter(
      (job) => job.workplaceType.toLowerCase() === params.workplaceType!.toLowerCase()
    );
  }

  // 2. Employment type filter (Full-time, Part-time, Contract, Internship)
  if (params.employmentType && params.employmentType !== 'all') {
    const targetEmp = params.employmentType.toLowerCase();
    filtered = filtered.filter((job) => {
      const jType = job.employmentType.toLowerCase();
      if (jType === targetEmp) return true;
      if (targetEmp === 'internship' && /\b(?:intern|internship|co-op|apprentice)\b/i.test(`${job.title} ${job.description}`)) {
        return true;
      }
      return false;
    });
  }

  // 3. Experience level filter (Fresher, Entry, Mid, Senior, Lead)
  if (params.experienceLevel && params.experienceLevel !== 'all') {
    const targetExp = params.experienceLevel.toLowerCase();
    if (targetExp === 'fresher' || targetExp === 'entry') {
      filtered = filtered.filter((job) => {
        const lvl = job.experienceLevel.toLowerCase();
        const text = `${job.title} ${job.snippet || ''}`.toLowerCase();
        // Strict exclusion of senior/staff/lead roles when searching for fresher/entry
        if (/\b(?:senior|sr\.|lead|principal|staff|architect|director|vp|head of)\b/i.test(text)) {
          return false;
        }
        return (
          lvl === 'fresher' ||
          lvl === 'entry' ||
          job.employmentType.toLowerCase() === 'internship' ||
          /\b(?:intern|fresher|graduate|entry|trainee|junior|associate)\b/i.test(text)
        );
      });
    } else {
      filtered = filtered.filter(
        (job) => job.experienceLevel.toLowerCase() === targetExp
      );
    }
  }

  // 4. Salary minimum filter
  if (params.salaryMin && params.salaryMin > 0) {
    filtered = filtered.filter((job) => {
      if (job.salaryMin) return job.salaryMin >= params.salaryMin!;
      if (job.salaryMax) return job.salaryMax >= params.salaryMin!;
      return true; // Don't aggressively drop unlisted salaries unless strict
    });
  }

  // 5. Posted date filter (within days)
  if (params.postedWithinDays && params.postedWithinDays > 0) {
    const cutoffTime = Date.now() - params.postedWithinDays * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((job) => {
      const postedTime = job.postedAt ? new Date(job.postedAt).getTime() : Number.NaN;
      return !isNaN(postedTime) && postedTime >= cutoffTime;
    });
  }

  // 6. Keywords relevance filter: ensure external provider fallback results actually relate to the user's query
  if (params.keywords && params.keywords.trim().length > 0) {
    const rawTerms = params.keywords
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !['and', 'the', 'for', 'with', 'in', 'at'].includes(t));

    const corrected = correctSearchQuery(params.keywords);
    const correctedTerms = corrected.tokens
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length >= 2 && !['and', 'the', 'for', 'with', 'in', 'at'].includes(t));

    const queryTerms = Array.from(new Set([...rawTerms, ...correctedTerms]));

    if (queryTerms.length > 0) {
      filtered = filtered.filter((job) => {
        const text = `${job.title} ${job.company} ${job.description} ${(job.skills || []).join(' ')}`.toLowerCase();
        return queryTerms.some((term) => text.includes(term));
      });
    }
  }

  // 7. Location relevance filter: ensure provider results respect specific location queries and aliases
  if (
    params.location &&
    params.location.trim().length > 0 &&
    !['all', 'any', 'india', 'worldwide', 'global'].includes(params.location.toLowerCase().trim())
  ) {
    const locNorm = normalizeLocationQuery(params.location);
    const locTerm = locNorm.normalizedLocation.toLowerCase();
    const candidateAliases = locNorm.aliasList.length > 0 ? locNorm.aliasList : [locTerm];

    filtered = filtered.filter((job) => {
      if (job.workplaceType && job.workplaceType.toLowerCase() === 'remote') return true;
      const jobLoc = (job.location || '').toLowerCase();
      return candidateAliases.some((alias) => jobLoc.includes(alias) || alias.includes(jobLoc));
    });
  }

  return filtered;
}
