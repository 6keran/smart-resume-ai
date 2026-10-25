import { NormalizedJob, JobSearchParams } from './types';

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
    filtered = filtered.filter(
      (job) => job.employmentType.toLowerCase() === params.employmentType!.toLowerCase()
    );
  }

  // 3. Experience level filter (Entry, Mid, Senior, Lead)
  if (params.experienceLevel && params.experienceLevel !== 'all') {
    filtered = filtered.filter(
      (job) => job.experienceLevel.toLowerCase() === params.experienceLevel!.toLowerCase()
    );
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
      const postedTime = new Date(job.postedAt).getTime();
      return !isNaN(postedTime) && postedTime >= cutoffTime;
    });
  }

  // 6. Keywords relevance filter: ensure external provider fallback results actually relate to the user's query
  if (params.keywords && params.keywords.trim().length > 0) {
    const queryTerms = params.keywords
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !['and', 'the', 'for', 'with'].includes(t));

    if (queryTerms.length > 0) {
      filtered = filtered.filter((job) => {
        const text = `${job.title} ${job.company} ${job.description} ${(job.skills || []).join(' ')}`.toLowerCase();
        return queryTerms.some((term) => text.includes(term));
      });
    }
  }

  // 7. Location relevance filter: ensure provider results respect specific location queries
  if (
    params.location &&
    params.location.trim().length > 0 &&
    !['all', 'any', 'india', 'worldwide', 'global'].includes(params.location.toLowerCase().trim())
  ) {
    const locTerm = params.location.toLowerCase().trim();
    filtered = filtered.filter((job) => {
      if (job.workplaceType && job.workplaceType.toLowerCase() === 'remote') return true;
      const jobLoc = (job.location || '').toLowerCase();
      return jobLoc.includes(locTerm) || locTerm.includes(jobLoc);
    });
  }

  return filtered;
}
