import { JobProvider, JobSearchParams, NormalizedJob, WorkplaceType, EmploymentType, ExperienceLevel } from '../types';
import {
  cleanHtml,
  detectEmploymentType,
  detectExperienceLevel,
  detectWorkplaceType,
  extractSkills,
  isValidHttpUrl,
  normalizePostedAt,
} from '../normalize';

export class LinkedInProvider implements JobProvider {
  readonly name = 'LinkedIn';

  isConfigured(): boolean {
    return true; // LinkedIn Guest Jobs discovery operates without API key
  }

  /**
   * Translates common experience strings into LinkedIn f_E filter values
   */
  private mapExperienceLevel(level?: string): string | undefined {
    if (!level || level === 'all' || level === 'All') return undefined;
    const l = level.toLowerCase();
    if (l.includes('intern') || l.includes('fresher')) return '1';
    if (l.includes('entry') || l.includes('0-1')) return '2';
    if (l.includes('associate') || l.includes('1-3')) return '3';
    if (l.includes('mid') || l.includes('3-5')) return '4';
    if (l.includes('senior') || l.includes('5+')) return '5';
    if (l.includes('lead') || l.includes('director') || l.includes('manager')) return '6';
    return undefined;
  }

  /**
   * Translates employment type into LinkedIn f_JT filter values
   */
  private mapEmploymentType(type?: string): string | undefined {
    if (!type || type === 'all') return undefined;
    const t = type.toLowerCase();
    if (t.includes('full')) return 'F';
    if (t.includes('part')) return 'P';
    if (t.includes('contract')) return 'C';
    if (t.includes('intern')) return 'I';
    if (t.includes('temp')) return 'T';
    return undefined;
  }

  /**
   * Translates workplace type into LinkedIn f_WT filter values
   * 1 = on-site, 2 = remote, 3 = hybrid
   */
  private mapWorkplaceType(wp?: string): string | undefined {
    if (!wp || wp === 'all') return undefined;
    const w = wp.toLowerCase();
    if (w.includes('remote')) return '2';
    if (w.includes('hybrid')) return '3';
    if (w.includes('on-site') || w.includes('onsite')) return '1';
    return undefined;
  }

  /**
   * Maps posted within days into LinkedIn f_TPR filter values
   */
  private mapPostedWithin(days?: number): string | undefined {
    if (!days) return undefined;
    if (days <= 1) return 'r86400';
    if (days <= 3) return 'r259200';
    if (days <= 7) return 'r604800';
    if (days <= 14) return 'r1209600';
    return 'r2592000';
  }

  /**
   * Searches live public job postings from LinkedIn
   */
  async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    const keywords = (params.keywords || '').trim();
    const location = (params.location || 'India').trim();
    const page = Math.max(params.page || 1, 1);
    const start = (page - 1) * 25;

    const queryParams = new URLSearchParams();
    if (keywords) queryParams.set('keywords', keywords);
    queryParams.set('location', location);
    queryParams.set('start', String(start));

    const fE = this.mapExperienceLevel(params.experienceLevel);
    if (fE) queryParams.set('f_E', fE);

    const fJT = this.mapEmploymentType(params.employmentType);
    if (fJT) queryParams.set('f_JT', fJT);

    const fWT = this.mapWorkplaceType(params.workplaceType);
    if (fWT) queryParams.set('f_WT', fWT);

    const fTPR = this.mapPostedWithin(params.postedWithinDays);
    if (fTPR) queryParams.set('f_TPR', fTPR);

    const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${queryParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('LinkedIn rate limit reached. Please try again shortly.');
        }
        throw new Error(`LinkedIn search returned status ${response.status}`);
      }

      const html = await response.text();
      const rawCards = this.parseJobCards(html);

      if (rawCards.length === 0) {
        return [];
      }

      // Concurrently fetch details for the top items (up to 6) to enrich descriptions & company logos
      const topCards = rawCards.slice(0, 8);
      const remainingCards = rawCards.slice(8);

      const enrichedTop = await Promise.allSettled(
        topCards.map(async (card) => {
          if (!card.jobId) return card;
          try {
            const details = await this.fetchJobDetails(card.jobId);
            return {
              ...card,
              description: details.description || card.description,
              logoUrl: details.logoUrl || card.logoUrl,
              employmentType: details.employmentType || card.employmentType,
              seniority: details.seniority || card.seniority,
            };
          } catch {
            return card;
          }
        })
      );

      const resolvedTop = enrichedTop.map((r, i) =>
        r.status === 'fulfilled' ? r.value : topCards[i]
      );

      const allCards = [...resolvedTop, ...remainingCards];

      return allCards.map((c) => this.normalizeJob(c, location));
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[LinkedInProvider Error]: ${msg}`);
      throw new Error(`LinkedIn search unavailable: ${msg}`);
    }
  }

  /**
   * Parses LinkedIn guest job listing HTML cards
   */
  private parseJobCards(html: string): Array<{
    jobId: string;
    title: string;
    company: string;
    location: string;
    url: string;
    date?: string;
    description?: string;
    logoUrl?: string;
    employmentType?: string;
    seniority?: string;
  }> {
    const cards: Array<{
      jobId: string;
      title: string;
      company: string;
      location: string;
      url: string;
      date?: string;
      description?: string;
      logoUrl?: string;
      employmentType?: string;
      seniority?: string;
    }> = [];

    const cardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const cardHtml = match[1];
      if (!cardHtml.includes('base-search-card')) continue;

      const urnMatch = cardHtml.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/i);
      const titleMatch = cardHtml.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
      const companyMatch = cardHtml.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);
      const locMatch = cardHtml.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const linkMatch = cardHtml.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/i);
      const dateMatch = cardHtml.match(/<time[^>]*datetime="([^"]+)"/i);
      const logoMatch = cardHtml.match(/<img[^>]*class="[^"]*artdeco-entity-image[^"]*"[^>]*data-delayed-url="([^"]+)"/i);

      const title = titleMatch ? cleanHtml(titleMatch[1]).trim() : '';
      const company = companyMatch ? cleanHtml(companyMatch[1]).trim() : '';
      const loc = locMatch ? cleanHtml(locMatch[1]).trim() : '';
      const rawUrl = linkMatch ? linkMatch[1].trim() : '';
      const cleanUrl = rawUrl.split('?')[0];

      // Extract jobId from URN or from URL
      let jobId = urnMatch ? urnMatch[1] : '';
      if (!jobId && cleanUrl) {
        const idFromUrl = cleanUrl.match(/-(\d+)$/);
        if (idFromUrl) jobId = idFromUrl[1];
      }

      if (title && company && jobId && isValidHttpUrl(cleanUrl)) {
        cards.push({
          jobId,
          title,
          company,
          location: loc,
          url: cleanUrl,
          date: dateMatch ? dateMatch[1] : undefined,
          logoUrl: logoMatch ? logoMatch[1].replace(/&amp;/g, '&') : undefined,
        });
      }
    }

    return cards;
  }

  /**
   * Fetches full job details from the guest posting endpoint
   */
  private async fetchJobDetails(jobId: string): Promise<{
    description?: string;
    logoUrl?: string;
    employmentType?: string;
    seniority?: string;
  }> {
    const detailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(detailUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) return {};

      const html = await res.text();

      const descMatch = html.match(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const logoMatch = html.match(/<img[^>]*class="[^"]*artdeco-entity-image[^"]*"[^>]*data-delayed-url="([^"]+)"/i);
      const criteriaMatches = [
        ...html.matchAll(/<li[^>]*class="[^"]*description__job-criteria-item[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi),
      ];

      let employmentType: string | undefined;
      let seniority: string | undefined;

      for (const m of criteriaMatches) {
        const header = cleanHtml(m[1]).toLowerCase();
        const value = cleanHtml(m[2]).trim();
        if (header.includes('employment type')) employmentType = value;
        if (header.includes('seniority level')) seniority = value;
      }

      return {
        description: descMatch ? cleanHtml(descMatch[1]) : undefined,
        logoUrl: logoMatch ? logoMatch[1].replace(/&amp;/g, '&') : undefined,
        employmentType,
        seniority,
      };
    } catch {
      clearTimeout(timeoutId);
      return {};
    }
  }

  /**
   * Normalizes parsed LinkedIn listing into unified NormalizedJob format
   */
  private normalizeJob(
    raw: {
      jobId: string;
      title: string;
      company: string;
      location: string;
      url: string;
      date?: string;
      description?: string;
      logoUrl?: string;
      employmentType?: string;
      seniority?: string;
    },
    searchLoc: string
  ): NormalizedJob {
    const desc = raw.description || `${raw.title} at ${raw.company}. Located in ${raw.location || searchLoc}. View complete listing and apply directly on LinkedIn.`;
    const skills = extractSkills(raw.title, desc);
    const workplaceType = detectWorkplaceType(raw.title, raw.location, desc);
    const empType = detectEmploymentType(raw.employmentType || desc);
    const expLevel = detectExperienceLevel(raw.seniority || desc, raw.title);

    const postedDate = normalizePostedAt(raw.date);

    return {
      id: `li_${raw.jobId}`,
      source: 'LinkedIn',
      sourceJobId: raw.jobId,
      title: raw.title,
      company: raw.company,
      location: raw.location || searchLoc || 'India',
      city: raw.location ? raw.location.split(',')[0].trim() : undefined,
      description: desc,
      snippet: desc.slice(0, 240) + (desc.length > 240 ? '...' : ''),
      employmentType: empType as EmploymentType,
      experienceLevel: expLevel as ExperienceLevel,
      workplaceType: workplaceType as WorkplaceType,
      postedAt: postedDate,
      updatedAt: postedDate,
      applyUrl: raw.url,
      sourceUrl: raw.url,
      logoUrl: raw.logoUrl,
      skills,
      remote: workplaceType === 'Remote',
      hybrid: workplaceType === 'Hybrid',
      onsite: workplaceType === 'On-site',
    };
  }
}
