import { JobProvider, JobSearchParams, NormalizedJob } from '../types';
import {
  cleanHtml,
  detectEmploymentType,
  detectExperienceLevel,
  detectWorkplaceType,
  extractSkills,
  isValidHttpUrl,
  normalizePostedAt,
} from '../normalize';

interface JoobleJobItem {
  id: string | number;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

interface JoobleApiResponse {
  totalCount?: number;
  jobs?: JoobleJobItem[];
}

export class JoobleProvider implements JobProvider {
  readonly name = 'Jooble';

  private getApiKey(): string {
    return process.env.JOOBLE_API_KEY?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Resolves target Jooble endpoint (e.g. in.jooble.org or jooble.org)
   */
  private resolveEndpoint(apiKey: string, location = ''): string {
    const loc = location.toLowerCase();
    const isIndia = [
      'india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi',
      'hyderabad', 'chennai', 'pune', 'gurgaon', 'noida', 'kolkata', 'kochi'
    ].some((city) => loc.includes(city));

    // If India search, use in.jooble.org endpoint; fallback to jooble.org
    if (isIndia || !loc) {
      return `https://in.jooble.org/api/${apiKey}`;
    }
    return `https://jooble.org/api/${apiKey}`;
  }

  async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return [];
    }

    const endpoint = this.resolveEndpoint(apiKey, params.location);
    const page = params.page || 1;
    const resultOnPage = Math.min(params.limit || 20, 50);

    const payload: Record<string, unknown> = {
      keywords: params.keywords?.trim() || '',
      page,
      resultOnPage,
    };

    if (params.location?.trim() && params.location.toLowerCase() !== 'remote') {
      payload.location = params.location.trim();
    } else if (params.workplaceType === 'Remote' || params.location?.toLowerCase() === 'remote') {
      payload.location = 'Remote';
    }

    if (params.radiusKm && params.radiusKm > 0) {
      payload.radius = String(Math.round(params.radiusKm));
    }

    if (params.salaryMin && params.salaryMin > 0) {
      payload.salary = params.salaryMin;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Jooble returned status ${res.status}.`);
      }

      const data: JoobleApiResponse = await res.json();
      const rawJobs = (data.jobs || []).filter((item) =>
        item?.id !== undefined && Boolean(item.title?.trim()) && isValidHttpUrl(item.link)
      );

      return rawJobs.map((item) => {
        const title = cleanHtml(item.title);
        const company = cleanHtml(item.company || 'Company not listed');
        const locationStr = cleanHtml(item.location || params.location || 'India');
        const description = cleanHtml(item.snippet || '');
        const snippet = description.slice(0, 240);
        const workplace = detectWorkplaceType(title, locationStr, description);
        const employment = detectEmploymentType(item.type || '', title, description);
        const expLevel = detectExperienceLevel('', title, description);
        const skills = extractSkills(title, description);

        return {
          id: `jooble_${item.id}`,
          source: 'Jooble',
          sourceJobId: String(item.id),
          title,
          company,
          location: locationStr,
          country: locationStr.toLowerCase().includes('india') ? 'IN' : 'GLOBAL',
          description,
          snippet,
          salaryDisplay: item.salary ? cleanHtml(item.salary) : undefined,
          employmentType: employment,
          experienceLevel: expLevel,
          workplaceType: workplace,
          postedAt: normalizePostedAt(item.updated),
          applyUrl: item.link || '',
          sourceUrl: item.link || '',
          skills,
          category: 'Technology',
          remote: workplace === 'Remote',
          hybrid: workplace === 'Hybrid',
          onsite: workplace === 'On-site',
        };
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Jooble Provider] Error during job retrieval:', errorMsg);
      throw new Error(`Jooble search unavailable: ${errorMsg}`);
    }
  }
}
