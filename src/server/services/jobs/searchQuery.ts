import 'server-only';

/**
 * Standard location alias groups for tech hiring hubs.
 * Maps city variants, historical names, and metropolitan regions.
 */
export const LOCATION_ALIASES: Record<string, string[]> = {
  bengaluru: ['bengaluru', 'bangalore', 'blr'],
  bangalore: ['bengaluru', 'bangalore', 'blr'],
  mumbai: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
  bombay: ['mumbai', 'bombay', 'navi mumbai'],
  gurgaon: ['gurgaon', 'gurugram', 'ncr'],
  gurugram: ['gurgaon', 'gurugram', 'ncr'],
  delhi: ['delhi', 'new delhi', 'delhi ncr', 'ncr', 'noida', 'gurgaon', 'gurugram'],
  'new delhi': ['delhi', 'new delhi', 'delhi ncr', 'ncr'],
  noida: ['noida', 'greater noida', 'delhi ncr', 'ncr'],
  kolkata: ['kolkata', 'calcutta'],
  calcutta: ['kolkata', 'calcutta'],
  chennai: ['chennai', 'madras'],
  madras: ['chennai', 'madras'],
  mysuru: ['mysuru', 'mysore'],
  mysore: ['mysuru', 'mysore'],
  hyderabad: ['hyderabad', 'secunderabad', 'cyberabad'],
  pune: ['pune', 'punecity', 'pcmc'],
  chandigarh: ['chandigarh', 'mohali', 'panchkula'],
  kochi: ['kochi', 'cochin', 'ernakulam'],
  trivandrum: ['trivandrum', 'thiruvananthapuram'],
  thiruvananthapuram: ['trivandrum', 'thiruvananthapuram'],
  ahmedabad: ['ahmedabad', 'amdavad'],
  jaipur: ['jaipur'],
  remote: ['remote', 'work from home', 'wfh', 'anywhere'],
  'new york': ['new york', 'nyc', 'ny', 'manhattan', 'brooklyn'],
  nyc: ['new york', 'nyc', 'ny'],
  'san francisco': ['san francisco', 'sf', 'bay area', 'silicon valley'],
  sf: ['san francisco', 'sf', 'bay area'],
};

/**
 * Canonical display names for known tech hiring hubs.
 */
export const CANONICAL_LOCATION_NAMES: Record<string, string> = {
  bengaluru: 'Bengaluru',
  bangalore: 'Bengaluru',
  hyderabad: 'Hyderabad',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  delhi: 'New Delhi',
  'new delhi': 'New Delhi',
  noida: 'Noida',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
  chennai: 'Chennai',
  madras: 'Chennai',
  mysuru: 'Mysuru',
  mysore: 'Mysuru',
  pune: 'Pune',
  chandigarh: 'Chandigarh',
  kochi: 'Kochi',
  trivandrum: 'Thiruvananthapuram',
  thiruvananthapuram: 'Thiruvananthapuram',
  ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur',
  remote: 'Remote',
  'new york': 'New York',
  nyc: 'New York',
  'san francisco': 'San Francisco',
  sf: 'San Francisco',
};

/**
 * Common misspellings for locations and tech hubs.
 */
export const LOCATION_TYPO_MAP: Record<string, string> = {
  bangaluru: 'bengaluru',
  bengalore: 'bengaluru',
  bangalore: 'bengaluru',
  banglore: 'bengaluru',
  bangalur: 'bengaluru',
  hydrabad: 'hyderabad',
  hyderbad: 'hyderabad',
  hyderabaad: 'hyderabad',
  mumbay: 'mumbai',
  bombai: 'mumbai',
  gurgaun: 'gurgaon',
  gurugram: 'gurugram',
  chenai: 'chennai',
  channai: 'chennai',
  calcuta: 'kolkata',
  calcutta: 'kolkata',
  puna: 'pune',
  poona: 'pune',
  newyork: 'new york',
  sanfrancisco: 'san francisco',
  remot: 'remote',
  remote: 'remote',
  remte: 'remote',
};

/**
 * Known common typos and their authoritative industry terms.
 * Curated for high precision so we NEVER change an unrelated query.
 */
export const COMMON_TYPO_MAP: Record<string, string> = {
  // Software / Developer
  softwere: 'software',
  softwear: 'software',
  softward: 'software',
  sofftware: 'software',
  develper: 'developer',
  devloper: 'developer',
  devlopr: 'developer',
  developper: 'developer',
  devleoper: 'developer',
  dveloper: 'developer',
  develpor: 'developer',
  develpr: 'developer',
  devlpr: 'developer',
  devleper: 'developer',
  // Engineer
  enginer: 'engineer',
  engineeer: 'engineer',
  enginner: 'engineer',
  enginere: 'engineer',
  engneer: 'engineer',
  enginear: 'engineer',
  // Analyst
  anlyst: 'analyst',
  analyist: 'analyst',
  analist: 'analyst',
  anylyst: 'analyst',
  annalyst: 'analyst',
  // Administrator
  administator: 'administrator',
  aministrator: 'administrator',
  adminstrator: 'administrator',
  // Programmer
  programer: 'programmer',
  programmr: 'programmer',
  progammer: 'programmer',
  // Architect
  architecte: 'architect',
  architech: 'architect',
  archtect: 'architect',
  // Frontend / Backend / Fullstack
  fronted: 'frontend',
  frontened: 'frontend',
  frontned: 'frontend',
  backned: 'backend',
  backened: 'backend',
  fullstack: 'full stack',
  fulstack: 'full stack',
  fullstck: 'full stack',
  // DevOps / Cloud
  devops: 'devops',
  devop: 'devops',
  cloude: 'cloud',
  // Tech skills
  pyton: 'python',
  pyhton: 'python',
  pythn: 'python',
  javascrip: 'javascript',
  javascirpt: 'javascript',
  typscript: 'typescript',
  typescrip: 'typescript',
  recat: 'react',
  reect: 'react',
  raect: 'react',
  anguler: 'angular',
  // Data / AI
  artifical: 'artificial',
  inteligence: 'intelligence',
  machne: 'machine',
  machin: 'machine',
  learng: 'learning',
  lernig: 'learning',
  lerning: 'learning',
  // General role words
  manger: 'manager',
  mangerial: 'managerial',
  consultent: 'consultant',
  associte: 'associate',
  assosiate: 'associate',
  internshp: 'internship',
  intren: 'intern',
  securty: 'security',
  databse: 'database',
};

/**
 * High-confidence job title phrases mapped directly to corrected forms.
 */
export const PHRASE_TYPO_MAP: Record<string, string> = {
  'softwere engineer': 'Software Engineer',
  'softwear engineer': 'Software Engineer',
  'data anlyst': 'Data Analyst',
  'data anylyst': 'Data Analyst',
  'react develper': 'React Developer',
  'react devloper': 'React Developer',
  'python develper': 'Python Developer',
  'python develpor': 'Python Developer',
  'machne learning engineer': 'Machine Learning Engineer',
  'machine learng engineer': 'Machine Learning Engineer',
  'machine lerning engineer': 'Machine Learning Engineer',
  'machne learning': 'Machine Learning',
  'machine learng': 'Machine Learning',
  'machine lerning': 'Machine Learning',
  'artifical intelligence': 'Artificial Intelligence',
  'cloud enginer': 'Cloud Engineer',
  'devops enginer': 'DevOps Engineer',
  'frontend develper': 'Frontend Developer',
  'backend develper': 'Backend Developer',
  'full stack develper': 'Full Stack Developer',
  'fullstack develper': 'Full Stack Developer',
};

/**
 * Computes Damerau-Levenshtein edit distance between two strings,
 * accounting for insertions, deletions, substitutions, and adjacent transpositions.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[m][n];
}

/**
 * Computes Levenshtein edit distance between two strings.
 * Maintained for backward compatibility.
 */
export function levenshteinDistance(a: string, b: string): number {
  return damerauLevenshteinDistance(a, b);
}

/**
 * Normalizes leading/trailing whitespace and collapses internal multiple spaces.
 */
export function normalizeWhitespace(str: string = ''): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

export interface QueryCorrectionResult {
  originalQuery: string;
  normalizedQuery: string;
  correctedQuery: string;
  wasCorrected: boolean;
  correctionApplied: boolean;
  suggestion?: string;
  tokens: string[];
}

export interface LocationNormalizationResult {
  originalLocation: string;
  normalizedLocation: string;
  canonicalLocation: string;
  aliasList: string[];
  isAliasApplied: boolean;
  wasCorrected: boolean;
  correctedLocation?: string;
}

export const CANONICAL_ROLE_TARGETS = [
  'software',
  'developer',
  'engineer',
  'analyst',
  'administrator',
  'programmer',
  'architect',
  'frontend',
  'backend',
  'fullstack',
  'devops',
  'cloud',
  'python',
  'javascript',
  'typescript',
  'react',
  'angular',
  'vue',
  'node',
  'java',
  'golang',
  'machine',
  'learning',
  'artificial',
  'intelligence',
  'manager',
  'lead',
  'senior',
  'junior',
  'intern',
  'internship',
  'consultant',
  'associate',
  'specialist',
  'designer',
  'product',
  'security',
  'database',
  'qa',
  'tester',
];

export const CANONICAL_LOCATION_TARGETS = [
  'bengaluru',
  'bangalore',
  'hyderabad',
  'mumbai',
  'pune',
  'gurgaon',
  'gurugram',
  'noida',
  'delhi',
  'chennai',
  'kolkata',
  'chandigarh',
  'kochi',
  'trivandrum',
  'ahmedabad',
  'jaipur',
  'remote',
];

/**
 * Corrects minor typing mistakes in keywords query while preserving the user's intent.
 * Only applies corrections when confidence is sufficiently high.
 */
export function correctSearchQuery(rawQuery: string = ''): QueryCorrectionResult {
  const originalQuery = rawQuery;
  const normalizedQuery = normalizeWhitespace(rawQuery);

  if (!normalizedQuery) {
    return {
      originalQuery,
      normalizedQuery: '',
      correctedQuery: '',
      wasCorrected: false,
      correctionApplied: false,
      tokens: [],
    };
  }

  const lowerQuery = normalizedQuery.toLowerCase();

  // 1. Direct phrase match check
  if (PHRASE_TYPO_MAP[lowerQuery]) {
    const correctedQuery = PHRASE_TYPO_MAP[lowerQuery];
    return {
      originalQuery,
      normalizedQuery,
      correctedQuery,
      wasCorrected: true,
      correctionApplied: true,
      suggestion: correctedQuery,
      tokens: correctedQuery.split(/\s+/),
    };
  }

  // 2. Token-by-token conservative correction
  const tokens = normalizedQuery.split(/\s+/);
  let anyTokenCorrected = false;
  const correctedTokens: string[] = [];

  const CONNECTORS = new Set(['in', 'at', 'for', 'and', 'or', 'to', 'with', 'of', 'on', '&']);

  for (const token of tokens) {
    const cleanToken = token.toLowerCase().replace(/[^a-z0-9#+.]/g, '');
    const punctuationSuffix = token.replace(/^[a-zA-Z0-9#+.]*/, '');

    // Skip connectors
    if (CONNECTORS.has(cleanToken)) {
      correctedTokens.push(token);
      continue;
    }

    // Check location typo dictionary
    if (LOCATION_TYPO_MAP[cleanToken]) {
      const cityKey = LOCATION_TYPO_MAP[cleanToken];
      const canonical = CANONICAL_LOCATION_NAMES[cityKey] || (cityKey.charAt(0).toUpperCase() + cityKey.slice(1));
      correctedTokens.push(canonical + punctuationSuffix);
      if (cleanToken !== cityKey) {
        anyTokenCorrected = true;
      }
      continue;
    }

    // Check direct role/skill typo dictionary
    if (COMMON_TYPO_MAP[cleanToken]) {
      const replacement = COMMON_TYPO_MAP[cleanToken];
      if (replacement.toLowerCase() === cleanToken) {
        correctedTokens.push(token);
        continue;
      }
      const capitalized =
        token.length > 0 && token[0] === token[0].toUpperCase()
          ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
          : replacement;

      correctedTokens.push(capitalized + punctuationSuffix);
      anyTokenCorrected = true;
      continue;
    }

    // If already exact match to any known role or location, preserve as-is
    if (CANONICAL_ROLE_TARGETS.includes(cleanToken) || CANONICAL_LOCATION_TARGETS.includes(cleanToken)) {
      correctedTokens.push(token);
      continue;
    }

    // Damerau-Levenshtein check against known targets
    let bestMatch: string | null = null;
    let minDistance = 999;
    let isLocationMatch = false;

    if (cleanToken.length >= 4) {
      // Evaluate role targets
      for (const target of CANONICAL_ROLE_TARGETS) {
        if (Math.abs(target.length - cleanToken.length) > 2) continue;
        const dist = damerauLevenshteinDistance(cleanToken, target);
        const maxAllowed = cleanToken.length >= 7 ? 2 : 1;
        if (dist > 0 && dist <= maxAllowed && dist < minDistance) {
          minDistance = dist;
          bestMatch = target;
          isLocationMatch = false;
        }
      }

      // Evaluate location targets
      for (const target of CANONICAL_LOCATION_TARGETS) {
        if (Math.abs(target.length - cleanToken.length) > 2) continue;
        const dist = damerauLevenshteinDistance(cleanToken, target);
        const maxAllowed = cleanToken.length >= 7 ? 2 : 1;
        if (dist > 0 && dist <= maxAllowed && dist < minDistance) {
          minDistance = dist;
          bestMatch = target;
          isLocationMatch = true;
        }
      }
    }

    if (bestMatch && minDistance > 0 && minDistance <= 2) {
      let formatted: string;
      if (isLocationMatch) {
        formatted = CANONICAL_LOCATION_NAMES[bestMatch] || (bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1));
      } else {
        formatted =
          token.length > 0 && token[0] === token[0].toUpperCase()
            ? bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1)
            : bestMatch;
      }

      correctedTokens.push(formatted + punctuationSuffix);
      anyTokenCorrected = true;
    } else {
      correctedTokens.push(token);
    }
  }

  const candidateResult = anyTokenCorrected ? correctedTokens.join(' ') : normalizedQuery;
  const isActuallyChanged = candidateResult.toLowerCase() !== normalizedQuery.toLowerCase();
  const correctedQuery = isActuallyChanged ? candidateResult : normalizedQuery;
  const correctionApplied = isActuallyChanged;

  return {
    originalQuery,
    normalizedQuery,
    correctedQuery,
    wasCorrected: correctionApplied,
    correctionApplied,
    suggestion: correctionApplied ? correctedQuery : undefined,
    tokens: (correctionApplied ? correctedQuery : normalizedQuery).split(/\s+/),
  };
}

/**
 * Normalizes location queries, handling capitalization, whitespace, and aliases
 * (e.g., Bengaluru <-> Bangalore, Gurgaon <-> Gurugram, Mumbai <-> Bombay, Hydrabad <-> Hyderabad).
 */
export function normalizeLocationQuery(rawLocation: string = ''): LocationNormalizationResult {
  const originalLocation = rawLocation;
  const normalizedLocation = normalizeWhitespace(rawLocation);

  if (!normalizedLocation) {
    return {
      originalLocation,
      normalizedLocation: '',
      canonicalLocation: '',
      aliasList: [],
      isAliasApplied: false,
      wasCorrected: false,
    };
  }

  let lowerLoc = normalizedLocation.toLowerCase();
  let wasCorrected = false;

  // 1. Check direct typo dictionary for locations
  if (LOCATION_TYPO_MAP[lowerLoc]) {
    const mapped = LOCATION_TYPO_MAP[lowerLoc];
    if (mapped !== lowerLoc) {
      wasCorrected = true;
    }
    lowerLoc = mapped;
  } else if (lowerLoc.length >= 4) {
    // 2. Damerau-Levenshtein check against known city keys
    let bestKey: string | null = null;
    let minDistance = 999;
    const maxAllowed = lowerLoc.length >= 7 ? 2 : 1;

    for (const key of Object.keys(LOCATION_ALIASES)) {
      if (Math.abs(key.length - lowerLoc.length) > 2) continue;
      const dist = damerauLevenshteinDistance(lowerLoc, key);
      if (dist > 0 && dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestKey = key;
      }
    }

    if (bestKey && minDistance > 0) {
      lowerLoc = bestKey;
      wasCorrected = true;
    }
  }

  // 3. Find matching alias group
  let aliasList: string[] = [];
  let canonicalLocation = normalizedLocation;
  let isAliasApplied = false;

  for (const [key, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (lowerLoc === key || aliases.includes(lowerLoc) || aliases.some((a) => lowerLoc.includes(a))) {
      aliasList = aliases;
      canonicalLocation = CANONICAL_LOCATION_NAMES[key] || (key.charAt(0).toUpperCase() + key.slice(1));
      isAliasApplied = true;
      break;
    }
  }

  const correctedLocation = wasCorrected ? canonicalLocation : undefined;

  return {
    originalLocation,
    normalizedLocation: wasCorrected ? canonicalLocation : normalizedLocation,
    canonicalLocation,
    aliasList,
    isAliasApplied,
    wasCorrected,
    correctedLocation,
  };
}
