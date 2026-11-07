import 'server-only';
import { TECH_SKILLS_TAXONOMY } from './normalize';
import { CANONICAL_LOCATION_NAMES } from './searchQuery';

export type JobSearchSuggestionField = 'keywords' | 'location';
export type JobSearchSuggestionKind = 'Role' | 'Skill' | 'Location';

export interface JobSearchSuggestion {
  value: string;
  kind: JobSearchSuggestionKind;
}

const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'React Developer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'Cloud Engineer',
  'DevOps Engineer',
  'Product Manager',
  'UX Designer',
  'QA Engineer',
  'Cybersecurity Analyst',
  'Mechanical Engineer',
  'Mechanical Maintenance Engineer',
  'Maintenance Engineer',
  'Electrical Engineer',
  'PLC Engineer',
  'Automation Engineer',
  'Manufacturing Engineer',
  'Civil Engineer',
  'Industrial Engineer',
  'HVAC Technician',
];

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
  'HVAC',
  'CMMS',
  'SAP Plant Maintenance',
  'Lean manufacturing',
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

const KEYWORD_SUGGESTIONS: JobSearchSuggestion[] = [
  ...ROLE_SUGGESTIONS.map((value) => ({ value, kind: 'Role' as const })),
  ...[...new Set([...TECH_SKILLS_TAXONOMY, ...INDUSTRIAL_SKILLS])].map((value) => ({
    value,
    kind: 'Skill' as const,
  })),
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

  const source: JobSearchSuggestion[] = field === 'location'
    ? LOCATION_SUGGESTIONS.map((value) => ({ value, kind: 'Location' }))
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
