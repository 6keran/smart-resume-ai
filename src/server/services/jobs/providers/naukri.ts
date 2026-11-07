import { JobProvider, JobSearchParams, NormalizedJob } from '../types';
import { normalizePostedAt } from '../normalize';
import { buildNaukriSearchUrl } from '@/lib/jobs/naukriSearchUrl';
import {
  classifyNaukriResponse,
  NaukriProviderCooldown,
  NaukriProviderUnavailableError,
  naukriProviderCooldown,
} from './naukriCooldown';

export class NaukriProvider implements JobProvider {
  readonly name = 'Naukri';

  constructor(private readonly cooldown: NaukriProviderCooldown = naukriProviderCooldown) {}

  isConfigured(): boolean {
    return true;
  }

  getCooldownStatus() {
    return this.cooldown.getStatus();
  }

  /**
   * Formats keywords and location for Naukri URLs
   */
  public static buildNaukriSearchUrl(keywords?: string, location?: string): string {
    return buildNaukriSearchUrl(keywords, location);
  }

  /**
   * Attempts discovery from Naukri's official public API.
   * If blocked by reCAPTCHA / anti-bot protection (HTTP 406/403),
   * handles it cleanly without attempting unauthorized bypass.
   */
  async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    this.cooldown.throwIfBlocked();

    const kw = (params.keywords || '').trim();
    const loc = (params.location || '').trim();

    const queryParams = new URLSearchParams();
    queryParams.set('noOfResults', '20');
    queryParams.set('urlType', 'search_by_keyword');
    queryParams.set('searchType', 'adv');
    if (kw) queryParams.set('keyword', kw);
    if (loc) queryParams.set('location', loc);

    const apiUrl = `https://www.naukri.com/jobapi/v3/search?${queryParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
          appid: '109',
          systemid: '109',
        },
      });

      const responseBody = await response.text();
      const unavailableReason = classifyNaukriResponse(response.status, responseBody);

      if (unavailableReason) {
        const status = this.cooldown.block(unavailableReason, response.status);
        console.warn(
          `[NaukriProvider] ${unavailableReason === 'challenge' ? 'Challenge' : 'Access restriction'} received (HTTP ${response.status}); requests paused until ${status.retryAt}.`
        );
        throw new NaukriProviderUnavailableError(status, false);
      }

      if (!response.ok) {
        throw new Error(`Naukri returned status ${response.status}`);
      }

      let data: { jobDetails?: unknown[] };
      try {
        data = JSON.parse(responseBody) as { jobDetails?: unknown[] };
      } catch {
        throw new Error('Naukri returned an invalid response.');
      }
      const jobDetails = (data?.jobDetails || []) as Array<{
        jobId?: string;
        title?: string;
        companyName?: string;
        placeholders?: Array<{ type: string; label: string }>;
        jobDescription?: string;
        staticUrl?: string;
        createdDate?: string;
      }>;

      if (!Array.isArray(jobDetails) || jobDetails.length === 0) {
        return [];
      }

      const validJobDetails = jobDetails.flatMap((item: {
        jobId?: string;
        title?: string;
        staticUrl?: string;
      }) => {
        if (!item?.jobId?.trim() || !item?.title?.trim() || !item.staticUrl?.trim()) return [];
        try {
          const listingUrl = new URL(item.staticUrl, 'https://www.naukri.com');
          if (listingUrl.protocol !== 'https:' || !/(^|\.)naukri\.com$/i.test(listingUrl.hostname)) return [];
          return [{ item, applyUrl: listingUrl.toString() }];
        } catch {
          return [];
        }
      });

      return validJobDetails.map(({ item, applyUrl }: { item: {
        jobId?: string;
        title?: string;
        companyName?: string;
        placeholders?: Array<{ type: string; label: string }>;
        jobDescription?: string;
        staticUrl?: string;
        createdDate?: string;
      }; applyUrl: string }) => {
        const jobId = item.jobId!.trim();
        const title = item.title!.trim();
        const company = item.companyName?.trim() || 'Company not listed';
        const locationText =
          item.placeholders?.find((p) => p.type === 'location')?.label || loc || 'India';
        const salaryText = item.placeholders?.find((p) => p.type === 'salary')?.label;
        const expText = item.placeholders?.find((p) => p.type === 'experience')?.label;
        return {
          id: `nk_${jobId}`,
          source: 'Naukri' as const,
          sourceJobId: jobId,
          title,
          company,
          location: locationText,
          description: item.jobDescription || `${title} at ${company} in ${locationText}`,
          snippet: (item.jobDescription || '').slice(0, 240),
          salary: salaryText,
          experience: expText,
          employmentType: 'Full-time' as const,
          experienceLevel: 'Mid' as const,
          workplaceType: 'On-site' as const,
          postedAt: normalizePostedAt(item.createdDate),
          applyUrl,
          sourceUrl: applyUrl,
          skills: [],
          remote: false,
          hybrid: false,
          onsite: true,
        };
      });
    } catch (err: unknown) {
      if (err instanceof NaukriProviderUnavailableError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
