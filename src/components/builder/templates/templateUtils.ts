import React from 'react';
import { PersonalInfo, ResumeData } from '@/types/resume';

export function hasContactInfo(info?: PersonalInfo): boolean {
  if (!info) return false;
  return Boolean(
    info.email?.trim() ||
    info.phone?.trim() ||
    info.location?.trim() ||
    info.linkedin?.trim() ||
    info.github?.trim() ||
    info.portfolio?.trim()
  );
}

export function formatUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function cleanDomain(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

export function isSectionVisible(sectionId: string, hiddenSections?: string[]): boolean {
  if (!hiddenSections || !Array.isArray(hiddenSections)) return true;
  return !hiddenSections.includes(sectionId);
}

export function formatAchievement(item: string | any): { title: string; description?: string; date?: string; result?: string } {
  if (typeof item === 'string') {
    return { title: item };
  }
  if (item && typeof item === 'object') {
    return {
      title: item.title || '',
      description: item.description,
      date: item.date,
      result: item.result,
    };
  }
  return { title: '' };
}

export function formatLanguage(item: string | any): { name: string; proficiency?: string } {
  if (typeof item === 'string') {
    // Check if format is "Language (Proficiency)"
    const match = item.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { name: match[1].trim(), proficiency: match[2].trim() };
    }
    return { name: item.trim() };
  }
  if (item && typeof item === 'object') {
    return {
      name: item.name || '',
      proficiency: item.proficiency,
    };
  }
  return { name: '' };
}

export function hasAdditionalInfo(info?: any): boolean {
  if (!info || typeof info !== 'object') return false;
  return Boolean(
    info.noticePeriod?.trim() ||
    info.relocation?.trim() ||
    info.shiftAvailability?.trim() ||
    info.shiftPreference?.trim() ||
    info.drivingLicence?.trim() ||
    (info.memberships && info.memberships.length > 0) ||
    info.other?.trim()
  );
}

export function hasCustomSections(customSections?: any[]): boolean {
  if (!customSections || !Array.isArray(customSections)) return false;
  return customSections.some((s) => Boolean(s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))));
}

export function hasSkillsData(skills?: ResumeData['skills']): boolean {
  if (!skills) return false;
  return Boolean(
    (skills.technical && skills.technical.length > 0) ||
    (skills.tools && skills.tools.length > 0) ||
    (skills.soft && skills.soft.length > 0) ||
    (skills.categories && skills.categories.some((c) => c.skills && c.skills.length > 0))
  );
}

export function hasExperienceData(exp?: ResumeData['experience']): boolean {
  if (!exp || exp.length === 0) return false;
  return exp.some((e) => Boolean(e.role?.trim() || e.company?.trim()));
}

export function hasEducationData(edu?: ResumeData['education']): boolean {
  if (!edu || edu.length === 0) return false;
  return edu.some((e) => Boolean(e.degree?.trim() || e.institution?.trim()));
}

export function hasProjectsData(proj?: ResumeData['projects']): boolean {
  if (!proj || proj.length === 0) return false;
  return proj.some((p) => Boolean(p.title?.trim()));
}

export function hasCertificationsData(certs?: ResumeData['certifications']): boolean {
  if (!certs || certs.length === 0) return false;
  return certs.some((c) => Boolean(c.name?.trim()));
}

export function LinkedinIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'currentColor', viewBox: '0 0 24 24' },
    React.createElement('path', {
      d: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z',
    })
  );
}

export function GithubIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'currentColor', viewBox: '0 0 24 24' },
    React.createElement('path', {
      fillRule: 'evenodd',
      clipRule: 'evenodd',
      d: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
    })
  );
}

export function MailIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    })
  );
}

export function PhoneIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    })
  );
}

export function MapPinIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    }),
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    })
  );
}

export function GlobeIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 },
    React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
    })
  );
}

export function ExternalLinkIcon({ className = "w-3 h-3" }: { className?: string }) {
  return React.createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2 },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6m0 0v6m0-6L10 14',
    })
  );
}

export type ContentDensity = 'compact' | 'balanced' | 'spacious';

export interface TemplateSpacingTokens {
  density: ContentDensity;
  containerPadding: string;
  headerMarginBottom: string;
  sectionGap: string;
  entryGap: string;
  headingMarginBottom: string;
  bulletGap: string;
  lineHeight: string;
}

export function getResumeContentDensity(data: ResumeData): ContentDensity {
  if (!data) return 'balanced';
  const { summary, experience, education, projects, skills, certifications } = data;

  let score = 0;

  // Summary
  if (summary?.trim()) {
    const wordCount = summary.trim().split(/\s+/).length;
    score += wordCount > 60 ? 2 : 1;
  }

  // Education
  const validEdu = (education || []).filter((e) => e.degree?.trim() || e.institution?.trim());
  score += validEdu.length * 1.5;

  // Skills
  if (skills) {
    if (skills.technical && skills.technical.length > 0) score += 1;
    if (skills.tools && skills.tools.length > 0) score += 1;
    if (skills.soft && skills.soft.length > 0) score += 1;
  }

  // Experience
  const validExp = (experience || []).filter((e) => e.role?.trim() || e.company?.trim());
  for (const exp of validExp) {
    score += 2;
    if (exp.bulletPoints) {
      score += exp.bulletPoints.length * 0.8;
    }
  }

  // Projects
  const validProj = (projects || []).filter((p) => p.title?.trim());
  for (const proj of validProj) {
    score += 1.8;
    if (proj.bullets) {
      score += proj.bullets.length * 0.8;
    }
  }

  // Certifications
  const validCerts = (certifications || []).filter((c) => c.name?.trim());
  score += validCerts.length * 0.75;

  // Multi-page or dense 1-page resume (e.g. Maya Chen or multiple jobs/projects)
  if (score >= 16) {
    return 'compact';
  }
  // Moderate resume (1-2 roles, 1 project, standard credentials)
  if (score >= 11) {
    return 'balanced';
  }
  // Short resume (students, light entry-level, career transitions needing dignified breathing room)
  return 'spacious';
}

export function getTemplateSpacing(data: ResumeData, isMiniPreview = false): TemplateSpacingTokens {
  const density = getResumeContentDensity(data);

  if (isMiniPreview) {
    return {
      density,
      containerPadding: 'p-3.5',
      headerMarginBottom: 'mb-2',
      sectionGap: 'space-y-2',
      entryGap: 'space-y-1.5',
      headingMarginBottom: 'mb-1 pb-0.5',
      bulletGap: 'space-y-0.5',
      lineHeight: 'leading-tight',
    };
  }

  switch (density) {
    case 'spacious':
      return {
        density,
        containerPadding: 'p-10 sm:p-12',
        headerMarginBottom: 'mb-6 sm:mb-7',
        sectionGap: 'space-y-6 sm:space-y-7',
        entryGap: 'space-y-4 sm:space-y-5',
        headingMarginBottom: 'mb-3 pb-1',
        bulletGap: 'space-y-1.5 sm:space-y-2',
        lineHeight: 'leading-[1.65]',
      };
    case 'compact':
      return {
        density,
        containerPadding: 'p-6 sm:p-7',
        headerMarginBottom: 'mb-3 sm:mb-3.5',
        sectionGap: 'space-y-3 sm:space-y-3.5',
        entryGap: 'space-y-2 sm:space-y-2.5',
        headingMarginBottom: 'mb-1.5 pb-0.5',
        bulletGap: 'space-y-0.5 sm:space-y-1',
        lineHeight: 'leading-[1.5]',
      };
    case 'balanced':
    default:
      return {
        density,
        containerPadding: 'p-8 sm:p-9',
        headerMarginBottom: 'mb-4 sm:mb-5',
        sectionGap: 'space-y-4 sm:space-y-5',
        entryGap: 'space-y-3 sm:space-y-3.5',
        headingMarginBottom: 'mb-2 pb-0.5',
        bulletGap: 'space-y-1',
        lineHeight: 'leading-[1.58]',
      };
  }
}

