import 'server-only';
import { TECH_SKILLS_TAXONOMY } from './normalize';
import { CANONICAL_LOCATION_NAMES } from './searchQuery';
import { getAllCuratedRoleTitles, getAllCuratedSkillSuggestions } from '@/lib/career/roleProfiles';

export type JobSearchSuggestionField = 'keywords' | 'location' | 'role' | 'skill';
export type JobSearchSuggestionKind = 'Role' | 'Skill' | 'Location';

export interface JobSearchSuggestion {
  value: string;
  kind: JobSearchSuggestionKind;
}

const ROLE_SUGGESTIONS = Array.from(
  new Set([
    ...getAllCuratedRoleTitles(),
    'Software Engineer',
    'Software Developer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'React Developer',
    'Data Analyst',
    'Data Scientist',
    'Business Intelligence Analyst',
    'Machine Learning Engineer',
    'Cloud Engineer',
    'DevOps Engineer',
    'Product Manager',
    'UI/UX Designer',
    'Product Designer',
    'UX Researcher',
    'QA Engineer',
    'Cybersecurity Analyst',
    'Mechanical Engineer',
    'CAD Design Engineer',
    'Mechanical Maintenance Engineer',
    'Maintenance Engineer',
    'Electrical Engineer',
    'Embedded Systems Engineer',
    'PLC Engineer',
    'Automation Engineer',
    'Manufacturing Engineer',
    'Civil Engineer',
    'Structural Engineer',
    'Site Engineer',
    'Industrial Engineer',
    'HVAC Technician',
    'Digital Marketing Specialist',
    'SEO Specialist',
    'Growth Marketing Manager',
    'Content Marketing Specialist',
    'Financial Analyst',
    'FP&A Analyst',
    'Investment Analyst',
    'Accountant',
    'HR Generalist',
    'Talent Acquisition Specialist',
    'People Operations Coordinator',
  ])
);

const INDUSTRIAL_SKILLS = [
  'PLC',
  'Mechanical maintenance',
  'Preventive maintenance',
  'Electrical maintenance',
  'SCADA',
  'Hydraulics',
  'Pneumatics',
  'AutoCAD',
  'SolidWorks',
  'ANSYS',
  'MATLAB',
  'KiCad',
  'GD&T',
  'HVAC',
  'CMMS',
  'SAP Plant Maintenance',
  'Lean manufacturing',
];

const BUSINESS_AND_DESIGN_SKILLS = [
  'SEO Fundamentals',
  'Google Analytics',
  'Google Ads',
  'HubSpot',
  'Content Strategy',
  'Email Lifecycle Marketing',
  'Financial Modeling',
  'Three-Statement Accounting',
  'Valuation (DCF)',
  'Variance Analysis',
  'Excel',
  'Power BI',
  'Talent Acquisition',
  'Interview Rubrics',
  'Onboarding Operations',
  'HRIS Administration',
  'SHRM Compliance',
  'Figma',
  'Wireframing',
  'Design Systems',
  'Accessibility (WCAG)',
  'Usability Testing',
  'Prototyping',
];

const LOCATION_SUGGESTIONS = [
  ...new Set([
    ...Object.values(CANONICAL_LOCATION_NAMES),
    'Bangalore',
    'Gurgaon',
    'Bombay',
    'New York',
    'San Francisco',
    'London',
    'Toronto',
    'Vancouver',
    'Sydney',
    'Melbourne',
    'Karnataka, India',
    'Maharashtra, India',
    'Tamil Nadu, India',
    'Telangana, India',
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Remote',
  ]),
];

const SKILL_SUGGESTIONS: JobSearchSuggestion[] = [
  ...new Set([
    ...getAllCuratedSkillSuggestions(),
    ...TECH_SKILLS_TAXONOMY,
    ...INDUSTRIAL_SKILLS,
    ...BUSINESS_AND_DESIGN_SKILLS,
  ]),
].map((value) => ({
  value,
  kind: 'Skill' as const,
}));

const ROLE_ONLY_SUGGESTIONS: JobSearchSuggestion[] = ROLE_SUGGESTIONS.map((value) => ({
  value,
  kind: 'Role' as const,
}));

const KEYWORD_SUGGESTIONS: JobSearchSuggestion[] = [
  ...ROLE_ONLY_SUGGESTIONS,
  ...SKILL_SUGGESTIONS,
];

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function matchesQuery(value: string, query: string): boolean {
  const terms = query.split(' ').filter(Boolean);
  const candidate = value.toLocaleLowerCase();
  return terms.every((term) => candidate.includes(term));
}

function suggestionRank(value: string, query: string): number {
  const candidate = value.toLocaleLowerCase();
  if (candidate.startsWith(query)) return 0;

  const words = candidate.split(/\s+/);
  if (query.split(' ').some((term) => words.some((word) => word.startsWith(term)))) return 1;
  return 2;
}

export function getJobSearchSuggestions(
  field: JobSearchSuggestionField,
  rawQuery: string,
  limit = 8
): JobSearchSuggestion[] {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return [];

  const source: JobSearchSuggestion[] =
    field === 'location'
      ? LOCATION_SUGGESTIONS.map((value) => ({ value, kind: 'Location' }))
      : field === 'role'
      ? ROLE_ONLY_SUGGESTIONS
      : field === 'skill'
      ? SKILL_SUGGESTIONS
      : KEYWORD_SUGGESTIONS;

  const seen = new Set<string>();
  return source
    .filter(({ value }) => {
      const key = value.toLocaleLowerCase();
      if (seen.has(key) || !matchesQuery(value, query)) return false;
      seen.add(key);
      return true;
    })
    .map((suggestion, index) => ({ suggestion, index }))
    .sort((a, b) =>
      suggestionRank(a.suggestion.value, query) - suggestionRank(b.suggestion.value, query) ||
      a.index - b.index
    )
    .slice(0, Math.max(1, Math.min(limit, 10)))
    .map(({ suggestion }) => suggestion);
}
