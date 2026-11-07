import { NextResponse } from 'next/server';
import { executeJobSearch } from '@/lib/jobs/search';
import { JobSearchParams } from '@/lib/jobs/types';
import { recordJobSearchEvent } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_LIMIT = 30;
const searchRequestLog = new Map<string, number[]>();

function checkSearchRateLimit(req: Request): number | null {
  const now = Date.now();
  const forwardedIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = req.headers.get('x-real-ip')?.trim() || forwardedIp || 'unknown';
  const key = clientIp.slice(0, 100);
  const requests = (searchRequestLog.get(key) || []).filter((timestamp) => now - timestamp < SEARCH_WINDOW_MS);

  if (requests.length >= SEARCH_LIMIT) {
    searchRequestLog.set(key, requests);
    return Math.max(1, Math.ceil((SEARCH_WINDOW_MS - (now - requests[0])) / 1000));
  }

  requests.push(now);
  searchRequestLog.set(key, requests);

  while (searchRequestLog.size > 2_000) {
    const oldestClient = searchRequestLog.keys().next().value;
    if (!oldestClient) break;
    searchRequestLog.delete(oldestClient);
  }

  return null;
}

function rateLimitResponse(retryAfter: number | null) {
  if (retryAfter === null) return null;
  return NextResponse.json(
    { message: 'You are searching too quickly. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

function validateSearchParams(params: JobSearchParams): string | null {
  if (typeof params.keywords !== 'string' || params.keywords.length > 120) {
    return 'Search terms must be 120 characters or fewer.';
  }
  if (typeof params.location !== 'string' || params.location.length > 120) {
    return 'Location must be 120 characters or fewer.';
  }
  if (!Number.isInteger(params.page) || (params.page || 0) < 1 || (params.page || 0) > 100) {
    return 'Page must be between 1 and 100.';
  }
  if (!Number.isInteger(params.limit) || (params.limit || 0) < 5 || (params.limit || 0) > 50) {
    return 'Result limit must be between 5 and 50.';
  }

  const workplaceTypes = ['all', 'Remote', 'Hybrid', 'On-site'];
  const employmentTypes = ['all', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Other'];
  const sortOptions = ['relevance', 'date', 'salary', 'match'];
  if (!workplaceTypes.includes(params.workplaceType || 'all')) return 'Unsupported workplace filter.';
  if (!employmentTypes.includes(params.employmentType || 'all')) return 'Unsupported employment filter.';
  if (params.experienceLevel && (
    typeof params.experienceLevel !== 'string' || params.experienceLevel.length > 40
  )) return 'Experience filter is invalid.';
  if (params.sortBy && !sortOptions.includes(params.sortBy)) return 'Unsupported sort order.';

  if (params.radiusKm !== undefined && (!Number.isFinite(params.radiusKm) || params.radiusKm < 0 || params.radiusKm > 500)) {
    return 'Search radius is invalid.';
  }
  if (params.salaryMin !== undefined && (!Number.isFinite(params.salaryMin) || params.salaryMin < 0)) {
    return 'Minimum salary is invalid.';
  }
  if (params.postedWithinDays !== undefined && ![0, 1, 3, 7, 14, 30].includes(params.postedWithinDays)) {
    return 'Posted date filter is invalid.';
  }
  if (params.resumeSkills && (
    params.resumeSkills.length > 50 ||
    params.resumeSkills.some((skill) => typeof skill !== 'string' || skill.length > 80)
  )) {
    return 'Resume skills are invalid.';
  }
  if (params.resumeHeadline && params.resumeHeadline.length > 200) return 'Resume headline is too long.';
  if (params.resumeYearsExp !== undefined && (
    !Number.isFinite(params.resumeYearsExp) || params.resumeYearsExp < 0 || params.resumeYearsExp > 80
  )) {
    return 'Resume experience is invalid.';
  }

  return null;
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeCandidateContext(value: unknown): JobSearchParams['candidateContext'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const context = value as Record<string, unknown>;
  const yearsOfExperience = typeof context.yearsOfExperience === 'number' &&
    Number.isFinite(context.yearsOfExperience) && context.yearsOfExperience >= 0 && context.yearsOfExperience <= 80
    ? context.yearsOfExperience
    : undefined;

  const education = Array.isArray(context.education)
    ? context.education.slice(0, 12).flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        return [{
          degree: typeof record.degree === 'string' ? record.degree.trim().slice(0, 120) : '',
          institution: typeof record.institution === 'string' ? record.institution.trim().slice(0, 120) : '',
        }];
      })
    : undefined;

  const projects = Array.isArray(context.projects)
    ? context.projects.slice(0, 12).flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        return [{
          title: typeof record.title === 'string' ? record.title.trim().slice(0, 120) : '',
          description: typeof record.description === 'string' ? record.description.trim().slice(0, 500) : '',
          technologies: stringArray(record.technologies, 20, 80) || [],
        }];
      })
    : undefined;

  return {
    skills: stringArray(context.skills, 50, 80),
    headline: typeof context.headline === 'string' ? context.headline.trim().slice(0, 200) : undefined,
    yearsOfExperience,
    education,
    projects,
    experience: Array.isArray(context.experience)
      ? context.experience.slice(0, 20).flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
          const record = item as Record<string, unknown>;
          return [{
            role: typeof record.role === 'string' ? record.role.trim().slice(0, 120) : '',
            company: typeof record.company === 'string' ? record.company.trim().slice(0, 120) : '',
            bulletPoints: stringArray(record.bulletPoints, 12, 300) || [],
          }];
        })
      : undefined,
    detectedKeywords: stringArray(context.detectedKeywords, 80, 80),
  };
}

export async function GET(req: Request) {
  try {
    const limited = rateLimitResponse(checkSearchRateLimit(req));
    if (limited) return limited;

    const { searchParams } = new URL(req.url);

    const params: JobSearchParams = {
      keywords: searchParams.get('q') || searchParams.get('keywords') || '',
      location: searchParams.get('location') || '',
      radiusKm: searchParams.get('radius') ? Number(searchParams.get('radius')) : undefined,
      workplaceType: (searchParams.get('workplace') as JobSearchParams['workplaceType']) || 'all',
      employmentType: (searchParams.get('type') as JobSearchParams['employmentType']) || 'all',
      experienceLevel: (searchParams.get('experience') as JobSearchParams['experienceLevel']) || 'all',
      salaryMin: searchParams.get('salaryMin') ? Number(searchParams.get('salaryMin')) : undefined,
      postedWithinDays: searchParams.get('days') ? Number(searchParams.get('days')) : undefined,
      sortBy: (searchParams.get('sortBy') as JobSearchParams['sortBy']) || 'relevance',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 15,
      bypassCache: searchParams.get('refresh') === 'true',
    };

    // If resume skills passed in query string (comma separated)
    const skillsParam = searchParams.get('skills');
    if (skillsParam) {
      params.resumeSkills = skillsParam.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const validationError = validateSearchParams(params);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const results = await executeJobSearch(params);

    // Record job search event in database
    try {
      const user = await getUserFromRequest(req);
      const visitorId = await getOrCreateVisitorId(req);
      await recordJobSearchEvent({
        visitorId,
        userId: user?.id,
        query: params.keywords || (params.resumeSkills ? params.resumeSkills.join(', ') : 'All Opportunities'),
        location: params.location || 'India',
        provider: results.activeSources?.[0] || 'LinkedIn',
        resultsCount: results.totalJobs || (results.jobs ? results.jobs.length : 0),
      });
    } catch (dbErr) {
      console.error('[DB Event Error] Failed to persist job search:', dbErr);
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    console.error('[API /api/jobs/search GET Error]:', err);
    return NextResponse.json(
      { message: 'Live job search is temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitResponse(checkSearchRateLimit(req));
    if (limited) return limited;

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 32_768) {
      return NextResponse.json({ message: 'Search request is too large.' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (rawBody.length > 32_768) {
        return NextResponse.json({ message: 'Search request is too large.' }, { status: 413 });
      }
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid request body');
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ message: 'Invalid search request.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);

    const params: JobSearchParams = {
      keywords: (body.keywords ?? searchParams.get('q') ?? '') as string,
      location: (body.location ?? searchParams.get('location') ?? '') as string,
      radiusKm: body.radiusKm ? Number(body.radiusKm) : undefined,
      workplaceType: (body.workplaceType || 'all') as JobSearchParams['workplaceType'],
      employmentType: (body.employmentType || 'all') as JobSearchParams['employmentType'],
      experienceLevel: (body.experienceLevel || 'all') as string,
      salaryMin: body.salaryMin ? Number(body.salaryMin) : undefined,
      postedWithinDays: body.postedWithinDays ? Number(body.postedWithinDays) : undefined,
      sortBy: (body.sortBy || 'relevance') as JobSearchParams['sortBy'],
      page: body.page ? Number(body.page) : 1,
      limit: body.limit ? Number(body.limit) : 15,
      bypassCache: body.bypassCache === true || searchParams.get('refresh') === 'true',
      // Personalized candidate resume context
      resumeSkills: stringArray(body.resumeSkills, 50, 80),
      resumeHeadline: typeof body.resumeHeadline === 'string' ? body.resumeHeadline.slice(0, 200) : undefined,
      resumeYearsExp: typeof body.resumeYearsExp === 'number' ? body.resumeYearsExp : undefined,
      candidateContext: sanitizeCandidateContext(body.candidateContext),
    };

    const validationError = validateSearchParams(params);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const results = await executeJobSearch(params);

    // Record job search event in database
    try {
      const user = await getUserFromRequest(req);
      const visitorId = await getOrCreateVisitorId(req);
      await recordJobSearchEvent({
        visitorId,
        userId: user?.id,
        query: params.keywords || (params.resumeSkills ? params.resumeSkills.join(', ') : 'All Opportunities'),
        location: params.location || 'India',
        provider: results.activeSources?.[0] || 'LinkedIn',
        resultsCount: results.totalJobs || (results.jobs ? results.jobs.length : 0),
      });
    } catch (dbErr) {
      console.error('[DB Event Error] Failed to persist job search (POST):', dbErr);
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    console.error('[API /api/jobs/search POST Error]:', err);
    return NextResponse.json(
      { message: 'Live job search is temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
