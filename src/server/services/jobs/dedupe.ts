import { NormalizedJob } from './types';

/**
 * Normalizes title for fingerprint comparison.
 */
function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove parentheticals like (m/f/d) or (hybrid)
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes company name for fingerprint comparison.
 */
function cleanCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|pvt|corp|corporation|technologies|tech|solutions|systems|services)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes location (e.g. Bangalore -> Bengaluru).
 */
function cleanLocation(location: string): string {
  const loc = location.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (loc.includes('bangalore') || loc.includes('bengaluru')) return 'bengaluru';
  if (loc.includes('bombay') || loc.includes('mumbai')) return 'mumbai';
  if (loc.includes('calcutta') || loc.includes('kolkata')) return 'kolkata';
  if (loc.includes('madras') || loc.includes('chennai')) return 'chennai';
  if (loc.includes('new delhi') || loc.includes('delhi')) return 'delhi';
  return loc;
}

/**
 * Deduplicates an array of NormalizedJob listings across multiple providers.
 */
export function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seenFingerprints = new Map<string, NormalizedJob>();
  const seenApplyUrls = new Set<string>();

  for (const job of jobs) {
    // If exact apply URL already seen, skip duplicate
    if (job.applyUrl && seenApplyUrls.has(job.applyUrl)) {
      continue;
    }

    const titleKey = cleanTitle(job.title);
    const compKey = cleanCompany(job.company);
    const locKey = cleanLocation(job.location);

    const fingerprint = `${titleKey}|${compKey}|${locKey}`;

    if (seenFingerprints.has(fingerprint)) {
      const existing = seenFingerprints.get(fingerprint)!;
      // If the incoming job has salary information or longer description, replace existing
      if ((!existing.salaryMin && job.salaryMin) || ((job.description?.length || 0) > (existing.description?.length || 0))) {
        seenFingerprints.set(fingerprint, job);
      }
    } else {
      seenFingerprints.set(fingerprint, job);
      if (job.applyUrl) {
        seenApplyUrls.add(job.applyUrl);
      }
    }
  }

  return Array.from(seenFingerprints.values());
}
