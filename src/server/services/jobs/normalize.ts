import { EmploymentType, ExperienceLevel, WorkplaceType } from './types';

/**
 * Standard industry skills taxonomy for skill extraction and matching
 */
export const TECH_SKILLS_TAXONOMY = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Java',
  'C++', 'C#', '.NET', 'Go', 'Golang', 'Rust', 'PHP', 'Ruby', 'Ruby on Rails',
  'HTML5', 'CSS3', 'Tailwind', 'Sass', 'Bootstrap',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub',
  'REST API', 'GraphQL', 'Microservices', 'System Design', 'Kafka', 'RabbitMQ',
  'Linux', 'DevOps', 'Terraform', 'Ansible',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Data Analysis',
  'Pandas', 'NumPy', 'Scikit-learn', 'NLP', 'Computer Vision', 'Generative AI',
  'Agile', 'Scrum', 'Jira', 'Unit Testing', 'Jest', 'PyTest', 'Cypress'
];

/**
 * Strips HTML tags and decodes common entities from provider strings.
 */
export function cleanHtml(raw: string = ''): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize provider publication dates without inventing a date when none is available. */
export function normalizePostedAt(rawDate?: string): string | undefined {
  const value = rawDate?.trim();
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString();

  if (/^(today|just posted|just now)$/i.test(value)) return new Date().toISOString();
  if (/^yesterday$/i.test(value)) return new Date(Date.now() - 86_400_000).toISOString();

  const relative = value.match(/^(?:(\d+|a|an)\s+)?(minute|hour|day|week|month|year)s?\s+ago$/i);
  if (!relative) return undefined;

  const amount = relative[1] === 'a' || relative[1] === 'an' ? 1 : Number(relative[1] || 1);
  const unit = relative[2].toLowerCase();
  const unitMs: Record<string, number> = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
    year: 31_536_000_000,
  };

  return new Date(Date.now() - amount * unitMs[unit]).toISOString();
}

export function isValidHttpUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects workplace type (Remote, Hybrid, On-site) from job title, location, and description.
 */
export function detectWorkplaceType(title = '', location = '', description = ''): WorkplaceType {
  const combined = `${title} ${location} ${description}`.toLowerCase();

  if (
    combined.includes('hybrid') ||
    combined.includes('hybrid remote') ||
    combined.includes('flexible workplace')
  ) {
    return 'Hybrid';
  }

  if (
    combined.includes('remote') ||
    combined.includes('work from home') ||
    combined.includes('wfh') ||
    combined.includes('telecommute') ||
    combined.includes('anywhere')
  ) {
    return 'Remote';
  }

  return 'On-site';
}

/**
 * Detects employment type from provider tags, title, or description.
 */
export function detectEmploymentType(rawType = '', title = '', description = ''): EmploymentType {
  const combined = `${rawType} ${title} ${description}`.toLowerCase();

  if (combined.includes('intern') || combined.includes('internship') || combined.includes('trainee')) {
    return 'Internship';
  }
  if (combined.includes('contract') || combined.includes('contractor') || combined.includes('freelance') || combined.includes('temp')) {
    return 'Contract';
  }
  if (combined.includes('part-time') || combined.includes('part time')) {
    return 'Part-time';
  }
  if (combined.includes('temporary')) {
    return 'Temporary';
  }
  return 'Full-time';
}

/**
 * Detects experience level from title and description.
 */
export function detectExperienceLevel(rawExp = '', title = '', description = ''): ExperienceLevel {
  const combined = `${rawExp} ${title} ${description}`.toLowerCase();

  if (combined.includes('intern') || combined.includes('internship') || combined.includes('fresher') || combined.includes('graduate') || combined.includes('junior') || combined.includes('entry level') || combined.includes('associate')) {
    return 'Entry';
  }
  if (combined.includes('staff') || combined.includes('lead') || combined.includes('principal') || combined.includes('architect') || combined.includes('director') || combined.includes('head of')) {
    return 'Lead';
  }
  if (combined.includes('senior') || combined.includes('sr.') || combined.includes('sr ')) {
    return 'Senior';
  }
  return 'Mid';
}

/**
 * Extracts recognized technical skills from title and description using taxonomy.
 */
export function extractSkills(title = '', description = ''): string[] {
  const text = `${title} ${description}`;
  const found: string[] = [];

  for (const skill of TECH_SKILLS_TAXONOMY) {
    // Regex word boundary matching
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      found.push(skill);
    }
  }

  return found;
}

/**
 * Formats a clean readable salary string from min/max numbers and currency.
 */
export function formatSalary(
  min?: number,
  max?: number,
  currency = 'INR'
): string | undefined {
  if (!min && !max) return undefined;

  const symbolMap: Record<string, string> = {
    INR: '₹',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  const sym = symbolMap[currency.toUpperCase()] || `${currency} `;

  const formatNum = (val: number) => {
    if (currency.toUpperCase() === 'INR') {
      if (val >= 100000) {
        return `${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(0)}k`;
      }
      return val.toLocaleString('en-IN');
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return val.toLocaleString();
  };

  if (min && max && min !== max) {
    return `${sym}${formatNum(min)} - ${sym}${formatNum(max)} / yr`;
  }
  if (min) {
    return `${sym}${formatNum(min)}+ / yr`;
  }
  if (max) {
    return `Up to ${sym}${formatNum(max)} / yr`;
  }
  return undefined;
}
