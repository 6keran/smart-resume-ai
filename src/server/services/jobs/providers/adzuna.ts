import { JobProvider, JobSearchParams, NormalizedJob } from '../types';
import {
  cleanHtml,
  detectEmploymentType,
  detectExperienceLevel,
  detectWorkplaceType,
  extractSkills,
  isValidHttpUrl,
  formatSalary,
  normalizePostedAt,
} from '../normalize';

interface AdzunaJobItem {
  id: string | number;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  salary_min?: number;
  salary_max?: number;
  created?: string;
  redirect_url?: string;
  category?: { label?: string; tag?: string };
  contract_time?: string;
  contract_type?: string;
}

interface AdzunaApiResponse {
  results?: AdzunaJobItem[];
  count?: number;
}

export class AdzunaProvider implements JobProvider {
  readonly name = 'Adzuna';

  private getCredentials(): { appId: string; appKey: string } {
    return {
      appId: process.env.ADZUNA_APP_ID?.trim() || '',
      appKey: process.env.ADZUNA_APP_KEY?.trim() || '',
    };
  }

  isConfigured(): boolean {
    const { appId, appKey } = this.getCredentials();
    return Boolean(appId && appKey);
  }

  /**
   * Resolves country code based on location string.
   * Defaults to 'in' (India) for Indian tech hubs, or 'us', 'gb', etc.
   */
  private resolveCountryCode(location = ''): string {
    const loc = location.toLowerCase();
    const indianLocations = [
      'india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi',
      'hyderabad', 'chennai', 'pune', 'gurgaon', 'gurugram', 'noida',
      'kolkata', 'ahmedabad', 'kochi', 'mysuru', 'mysore', 'chandigarh'
    ];

    if (indianLocations.some((city) => loc.includes(city))) {
      return 'in';
    }

    if (loc.includes('united kingdom') || loc.includes('london') || loc.includes('uk') || loc.includes('england')) {
      return 'gb';
    }

    if (loc.includes('canada') || loc.includes('toronto') || loc.includes('vancouver')) {
      return 'ca';
    }

    if (loc.includes('australia') || loc.includes('sydney') || loc.includes('melbourne')) {
      return 'au';
    }

    // Default to 'in' if empty or Indian, otherwise 'us'
    if (!loc || loc === 'remote') return 'in';

    return 'us';
  }

  async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const { appId, appKey } = this.getCredentials();
    const country = this.resolveCountryCode(params.location);
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);

    const queryParams = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      'content-type': 'application/json',
      results_per_page: String(limit),
    });

    if (params.keywords?.trim()) {
      queryParams.set('what', params.keywords.trim());
    }

    if (params.location?.trim() && params.location.toLowerCase() !== 'remote') {
      queryParams.set('where', params.location.trim());
    }

    if (params.radiusKm && params.radiusKm > 0) {
      queryParams.set('distance', String(Math.round(params.radiusKm)));
    }

    if (params.salaryMin && params.salaryMin > 0) {
      queryParams.set('salary_min', String(params.salaryMin));
    }

    if (params.postedWithinDays && params.postedWithinDays > 0) {
      queryParams.set('max_days_old', String(params.postedWithinDays));
    }

    if (params.employmentType === 'Full-time') {
      queryParams.set('full_time', '1');
    }

    if (params.sortBy === 'date') {
      queryParams.set('sort_by', 'date');
    } else if (params.sortBy === 'salary') {
      queryParams.set('sort_by', 'salary');
    }

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${queryParams.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Adzuna returned status ${res.status}.`);
      }

      const data: AdzunaApiResponse = await res.json();
      const rawResults = (data.results || []).filter((item) =>
        item?.id !== undefined && Boolean(item.title?.trim()) && isValidHttpUrl(item.redirect_url)
      );

      return rawResults.map((item) => {
        const title = cleanHtml(item.title);
        const company = cleanHtml(item.company?.display_name || 'Company not listed');
        const locationStr = cleanHtml(item.location?.display_name || params.location || 'India');
        const description = cleanHtml(item.description || '');
        const snippet = description.slice(0, 240);
        const workplace = detectWorkplaceType(title, locationStr, description);
        const employment = detectEmploymentType(
          `${item.contract_time || ''} ${item.contract_type || ''}`,
          title,
          description
        );
        const expLevel = detectExperienceLevel('', title, description);
        const skills = extractSkills(title, description);
        const currency = country === 'in' ? 'INR' : country === 'us' ? 'USD' : 'GBP';

        return {
          id: `adzuna_${item.id}`,
          source: 'Adzuna',
          sourceJobId: String(item.id),
          title,
          company,
          location: locationStr,
          country: country.toUpperCase(),
          city: item.location?.area?.[item.location.area.length - 1] || locationStr,
          description,
          snippet,
          salaryMin: item.salary_min,
          salaryMax: item.salary_max,
          salaryCurrency: currency,
          salaryDisplay: formatSalary(item.salary_min, item.salary_max, currency),
          employmentType: employment,
          experienceLevel: expLevel,
          workplaceType: workplace,
          postedAt: normalizePostedAt(item.created),
          applyUrl: item.redirect_url || '',
          sourceUrl: item.redirect_url || '',
          skills,
          category: item.category?.label || 'Engineering',
          remote: workplace === 'Remote',
          hybrid: workplace === 'Hybrid',
          onsite: workplace === 'On-site',
        };
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Adzuna Provider] Error during job retrieval:', errorMsg);
      throw new Error(`Adzuna search unavailable: ${errorMsg}`);
    }
  }
}
