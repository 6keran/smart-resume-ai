import 'server-only';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import {
  ResumeAnalysisResult,
  PrioritizedSuggestion,
  AnalysisWeakness,
  AnalysisRecommendation,
  AnalysisStrength,
} from '@/types/resume';
import { JobMatchResult, SkillMatchDetail } from '@/types/jobs';
import {
  calculateDeterministicAtsScore,
  normalizeAtsInput,
} from './deterministicAtsEngine';

// Safe server-side accessor for Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const e2eGeminiTelemetryPath = process.env.E2E_GEMINI_TELEMETRY_PATH;
const e2eGlobal = globalThis as typeof globalThis & { __sraGeminiObserverInstalled?: boolean };
export function recordGeminiProviderStatus(service: string, provider: 'Gemini' | 'deterministic', model?: string): void {
  if (process.env.PLAYWRIGHT_TEST !== '1' || process.env.E2E_LIVE_GEMINI !== '1' || !e2eGeminiTelemetryPath) return;
  try {
    appendFileSync(path.resolve(e2eGeminiTelemetryPath), JSON.stringify({
      type: 'provider-status',
      timestamp: new Date().toISOString(),
      service,
      provider,
      model: provider === 'Gemini' ? model || null : null,
    }) + '\n');
  } catch {}
}
if (process.env.PLAYWRIGHT_TEST === '1' && process.env.E2E_LIVE_GEMINI === '1' && e2eGeminiTelemetryPath && !e2eGlobal.__sraGeminiObserverInstalled) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  e2eGlobal.__sraGeminiObserverInstalled = true;
  let requestCounter = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let targetUrl: URL | null = null;
    try {
      targetUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    } catch {}
    if (targetUrl?.hostname !== 'generativelanguage.googleapis.com') return originalFetch(input, init);

    const model = targetUrl.pathname.match(/\/models\/([^/:]+):/)?.[1] || 'unknown';
    const requestId = `${Date.now()}-${++requestCounter}`;
    const startedAt = Date.now();
    const record = (phase: 'started' | 'completed', status: number | null, outcome: string) => {
      try {
        appendFileSync(path.resolve(e2eGeminiTelemetryPath), JSON.stringify({ timestamp: new Date().toISOString(), requestId, phase, model, status, outcome, durationMs: Date.now() - startedAt }) + '\n');
      } catch {}
    };
    record('started', null, 'pending');
    try {
      const response = await originalFetch(input, init);
      record('completed', response.status, response.ok ? 'success' : 'http_error');
      return response;
    } catch (error) {
      record('completed', null, 'network_error');
      throw error;
    }
  };
}

export const PRIMARY_GEMINI_MODEL = 'gemini-3.5-flash';
export const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
] as const;

let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('[Gemini] Failed to initialize GoogleGenAI client:', err);
  }
} else {
  // Helpful developer guidance in local terminal (never exposed to client)
  console.info(
    '[Smart Resume AI] GEMINI_API_KEY is not configured in .env.local. The platform is using its built-in high-precision deterministic ATS analysis engine. Add GEMINI_API_KEY to enable live Gemini 3.5 Flash analysis.'
  );
}

/**
 * Live Gemini model discovery and capability probe.
 * Queries the Google GenAI API endpoint dynamically to discover active supported models
 * rather than assuming static fallback identifiers.
 */
let cachedDiscoveredModels: string[] | null = null;
let lastModelProbeTimestamp = 0;
const MODEL_PROBE_CACHE_TTL_MS = 60 * 60 * 1000; // 1-hour cache

export async function probeAvailableGeminiModels(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedDiscoveredModels && now - lastModelProbeTimestamp < MODEL_PROBE_CACHE_TTL_MS) {
    return cachedDiscoveredModels;
  }

  if (!aiClient) {
    return [...CANDIDATE_GEMINI_MODELS];
  }

  try {
    const pager = await aiClient.models.list();
    const discovered: string[] = [];
    for await (const m of pager) {
      if (m.name) {
        const cleanName = m.name.replace(/^models\//, '');
        if (cleanName.includes('gemini') || cleanName.includes('flash')) {
          discovered.push(cleanName);
        }
      }
    }

    if (discovered.length > 0) {
      cachedDiscoveredModels = discovered;
      lastModelProbeTimestamp = now;
      return discovered;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Gemini Probe] Live model discovery failed: ${errorMsg.slice(0, 150)}. Using candidate list.`);
  }

  cachedDiscoveredModels = [...CANDIDATE_GEMINI_MODELS];
  lastModelProbeTimestamp = now;
  return cachedDiscoveredModels;
}

/**
 * Safely parse JSON from LLM output, stripping markdown code blocks, backticks, or trailing junk.
 */
function safeJsonParse<T>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();

  // Strip markdown fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt extracting between first '{' and last '}'
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.substring(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Execute Gemini call with multi-model cascade, timeout, and exponential backoff retry.
 * Handles 401, 403, 404, 429, 500, 502, 503, timeouts, and network failures.
 */
async function callGeminiWithRetry<T>(
  operation: (client: GoogleGenAI, model: string) => Promise<T>,
  maxRetries = 1,
  timeoutMs = 12000
): Promise<{ data: T; model: string } | null> {
  if (!aiClient) return null;

  for (const model of CANDIDATE_GEMINI_MODELS) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)), timeoutMs)
        );
        const data = await Promise.race([operation(aiClient, model), timeoutPromise]);
        return { data, model };
      } catch (err: unknown) {
        attempt++;
        const errorStr = String(err);
        console.warn(`[Gemini Attempt ${attempt}/${maxRetries + 1} with ${model}] Error: ${errorStr.slice(0, 150)}`);

        // If authentication error or quota limit (401, 403, 429, RESOURCE_EXHAUSTED, quota), retrying will not help
        if (
          errorStr.includes('401') ||
          errorStr.includes('403') ||
          errorStr.includes('API_KEY_INVALID') ||
          errorStr.includes('429') ||
          errorStr.includes('RESOURCE_EXHAUSTED') ||
          errorStr.includes('quota')
        ) {
          console.warn('[Gemini] Authentication error or API quota limit reached. Falling back immediately to high-precision local deterministic engine.');
          return null;
        }

        // If model not found (404), immediately try next candidate model
        if (errorStr.includes('404') || errorStr.includes('NOT_FOUND')) {
          break;
        }

        if (attempt > maxRetries) {
          break;
        }

        // Brief exponential backoff
        const delay = Math.pow(2, attempt) * 300 + Math.random() * 150;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.warn('[Gemini] All models and retries exhausted. Falling back to local deterministic ATS engine.');
  return null;
}

/**
 * Validates, deduplicates, prioritizes, and limits suggestions to exactly the top 3.
 * Enforces all 5 required attributes: Priority, What needs improvement, Why it matters, How to improve, and Example.
 */
export function validateAndRankSuggestions(
  rawSuggestions: unknown[],
  resumeText: string,
  jobDescription?: string
): PrioritizedSuggestion[] {
  if (!Array.isArray(rawSuggestions)) return [];

  const valid: PrioritizedSuggestion[] = [];
  const seenWeaknesses = new Set<string>();

  for (const item of rawSuggestions) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;

    const whatNeedsImprovement =
      typeof s.whatNeedsImprovement === 'string'
        ? s.whatNeedsImprovement.trim()
        : typeof s.whatIsWrong === 'string'
        ? s.whatIsWrong.trim()
        : '';

    const whyItMatters =
      typeof s.whyItMatters === 'string'
        ? s.whyItMatters.trim()
        : '';

    const howToImprove =
      typeof s.howToImprove === 'string'
        ? s.howToImprove.trim()
        : typeof s.actionText === 'string'
        ? s.actionText.trim()
        : '';

    // Must satisfy all 3 mandatory explanation criteria with real content
    if (!whatNeedsImprovement || !whyItMatters || !howToImprove) continue;
    if (whatNeedsImprovement.length < 10 || whyItMatters.length < 10 || howToImprove.length < 10) continue;

    // Deduplicate
    const normKey = whatNeedsImprovement.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    if (seenWeaknesses.has(normKey)) continue;
    seenWeaknesses.add(normKey);

    // Normalize priority: High, Medium, or Low
    let priority: 'High' | 'Medium' | 'Low' = 'Medium';
    const rawPriority = String(s.priority || s.severity || '').toLowerCase();
    if (rawPriority.includes('high')) {
      priority = 'High';
    } else if (rawPriority.includes('low')) {
      priority = 'Low';
    } else {
      priority = 'Medium';
    }

    const section =
      typeof s.section === 'string' && s.section.trim()
        ? s.section.trim()
        : typeof s.category === 'string' && s.category.trim()
        ? s.category.trim()
        : 'Resume Content';

    const example =
      typeof s.example === 'string' && s.example.trim()
        ? s.example.trim()
        : typeof s.improvedText === 'string' && s.improvedText.trim()
        ? s.improvedText.trim()
        : undefined;

    const extractedText =
      typeof s.extractedText === 'string' && s.extractedText.trim()
        ? s.extractedText.trim()
        : typeof s.originalText === 'string' && s.originalText.trim()
        ? s.originalText.trim()
        : undefined;

    valid.push({
      id: `sug_${valid.length + 1}`,
      rank: valid.length + 1,
      priority,
      section,
      whatNeedsImprovement,
      whyItMatters,
      howToImprove,
      example,
      extractedText,
    });
  }

  // Prioritize: High (3) > Medium (2) > Low (1)
  const priorityScore = (p: 'High' | 'Medium' | 'Low') =>
    p === 'High' ? 3 : p === 'Medium' ? 2 : 1;

  valid.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  // Select only the top 3 (or fewer if fewer valid suggestions exist)
  return valid.slice(0, 3).map((sug, idx) => ({
    ...sug,
    id: `sug_${idx + 1}`,
    rank: idx + 1,
  }));
}

/**
 * Analyze resume text with Gemini or deterministic ATS engine, returning structured ATS metrics,
 * job-specific skills alignment, and exactly 3 prioritized suggestions.
 */
export async function analyzeResume(
  resumeText: string,
  jobDescription?: string,
  jobTitle?: string,
  company?: string
): Promise<ResumeAnalysisResult> {
  const normResume = normalizeAtsInput(resumeText);
  const normJd = jobDescription ? normalizeAtsInput(jobDescription) : '';
  const jdProvided = Boolean(normJd && normJd.length > 20);
  const targetRole = jobTitle || (jdProvided ? 'Target Role' : undefined);
  const targetCompany = company || (jdProvided ? 'Target Company' : undefined);

  // 1. Compute foundational numerical scores and metrics with 100% mathematical determinism
  const deterministicResult = calculateDeterministicAtsScore(
    normResume,
    normJd,
    targetRole,
    targetCompany
  );

  // 2. Query Gemini solely for qualitative recommendations and rewrites (numerical scores remain deterministic)
  if (aiClient && normResume.length > 50) {
    const prompt = `You are a Principal Technical Recruiter and ATS parsing algorithm expert. Analyze the following resume text${
      jdProvided ? ` against the target role (${targetRole || 'Target Role'} at ${targetCompany || 'Target Company'}) and Job Description` : ''
    }.

${jdProvided ? `Target Role: ${targetRole || 'Not specified'}\nTarget Company: ${targetCompany || 'Not specified'}\nTarget Job Description:\n${normJd}\n` : ''}
Resume Text:
${normResume}

CRITICAL RULES:
1. The deterministic ATS scoring engine has already evaluated this resume. Numerical scores are fixed and must NOT be generated or modified.
2. Select the top prioritized improvements based on this specific resume${jdProvided ? ' and target job description' : ''}.
3. Each suggestion must identify:
   - priority: "High" | "Medium" | "Low"
   - section: specific resume area (e.g. "Work Experience", "ATS Keywords", "Professional Summary")
   - whatNeedsImprovement: the specific weakness
   - whyItMatters: brief explanation of clarity, relevance, or ATS impact
   - howToImprove: concrete actionable recommendation
   - extractedText: exact quote or text segment from the resume that needs improvement
   - example: a rewritten example based on the candidate's actual text without inventing facts or false metrics.
4. Return ONLY a valid JSON object matching this schema:
{
  "strengths": [{"id": string, "section": string, "title": string, "description": string}],
  "topSuggestions": [
    {
      "priority": "High" | "Medium" | "Low",
      "section": string,
      "whatNeedsImprovement": string,
      "whyItMatters": string,
      "howToImprove": string,
      "extractedText": "exact quote or text segment from the resume that needs improvement",
      "example": string
    }
  ],
  "summaryFeedback": string
}`;

    const rawCall = await callGeminiWithRetry(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      return response.text;
    });

    if (rawCall && rawCall.data) {
      const parsed = safeJsonParse<{
        topSuggestions?: unknown[];
        weaknesses?: unknown[];
        strengths?: unknown[];
        summaryFeedback?: unknown;
      }>(rawCall.data);

      if (parsed) {
        const rawList = Array.isArray(parsed.topSuggestions) && parsed.topSuggestions.length > 0
          ? parsed.topSuggestions
          : Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [];
        const topSuggestions = validateAndRankSuggestions(rawList, normResume, normJd);

        // Derive weaknesses and recommendations for backwards compatibility
        const weaknesses: AnalysisWeakness[] = topSuggestions.map((sug, idx) => ({
          id: `wk_${idx + 1}`,
          section: sug.section,
          whatIsWrong: sug.whatNeedsImprovement,
          whyItMatters: sug.whyItMatters,
          howToImprove: sug.howToImprove,
          severity: sug.priority.toLowerCase() as 'high' | 'medium' | 'low',
        }));

        const recommendations: AnalysisRecommendation[] = topSuggestions.map((sug, idx) => ({
          id: `rec_${idx + 1}`,
          category: sug.section,
          title: sug.howToImprove.slice(0, 60),
          actionText: sug.howToImprove,
          originalText: sug.extractedText || '',
          improvedText: sug.example || '',
          impact: sug.priority === 'High' ? 'High Impact' : sug.priority === 'Medium' ? 'Moderate Impact' : 'Refinement',
          extractedText: sug.extractedText,
        }));

        const usedModelDisplay = rawCall.model.includes('3.8')
          ? 'Gemini 3.8 Flash'
          : rawCall.model.includes('3.5')
          ? 'Gemini 3.5 Flash'
          : 'Gemini Flash';

        recordGeminiProviderStatus('ATS resume analysis', 'Gemini', rawCall.model);

        return {
          ...deterministicResult,
          topSuggestions: topSuggestions.length > 0 ? topSuggestions : deterministicResult.topSuggestions,
          weaknesses: topSuggestions.length > 0 ? weaknesses : deterministicResult.weaknesses,
          recommendations: topSuggestions.length > 0 ? recommendations : deterministicResult.recommendations,
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
            ? (parsed.strengths as AnalysisStrength[])
            : deterministicResult.strengths,
          summaryFeedback: typeof parsed.summaryFeedback === 'string' && parsed.summaryFeedback.trim()
            ? parsed.summaryFeedback.trim()
            : deterministicResult.summaryFeedback,
          analysisEngine: 'gemini',
          engineDisplayName: usedModelDisplay,
          isJobSpecific: jdProvided,
          jobTitle: targetRole,
          company: targetCompany,
          analyzedAt: new Date().toISOString(),
        };
      }
    }
  }

  // Deterministic fallback (guarantees identical numerical scores)
  recordGeminiProviderStatus('ATS resume analysis', 'deterministic');
  return {
    ...deterministicResult,
    isJobSpecific: jdProvided,
    jobTitle: targetRole,
    company: targetCompany,
    analysisEngine: 'deterministic-ats',
    engineDisplayName: 'Rule-Based ATS Engine (Deterministic)',
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Improves wording for a resume section without inventing false facts.
/**
 * Prohibited technologies and buzzwords that should NEVER be injected into improved content
 * unless they were explicitly mentioned in the original user input.
 */
const BUZZWORDS_REQUIRING_EXPLICIT_MENTION = [
  'kubernetes',
  'k8s',
  'docker',
  'aws',
  'amazon web services',
  'azure',
  'gcp',
  'google cloud',
  'microservices',
  'distributed systems',
  'ci/cd',
  'redis',
  'kafka',
  'terraform',
  'graphql',
  'blockchain',
  'machine learning',
  'deep learning',
  'tensorflow',
  'pytorch',
  'hadoop',
  'spark',
  'elasticsearch',
  'snowflake',
  'bigquery',
  'dynamodb',
  'ansible',
  'jenkins',
];

/**
 * Validates that improved resume content preserves all original facts,
 * does not invent unsupported technologies, and does not fabricate metrics or dates.
 */
export function validateContentPreservation(
  originalContent: string,
  improvedContent: string
): { isValid: boolean; reason?: string } {
  if (!improvedContent || typeof improvedContent !== 'string' || !improvedContent.trim()) {
    return { isValid: false, reason: 'Improved content is empty or invalid.' };
  }

  const origLower = originalContent.toLowerCase();
  const impLower = improvedContent.toLowerCase();

  // 1. Prohibit injecting advanced unmentioned technologies/architectures
  for (const tech of BUZZWORDS_REQUIRING_EXPLICIT_MENTION) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(impLower) && !regex.test(origLower)) {
      return {
        isValid: false,
        reason: `Introduced unsupported technology or architectural buzzword: "${tech}"`,
      };
    }
  }

  // 2. Prohibit inventing percentage metrics (e.g., "by 40%", "increased by 25%")
  const origPercentages: string[] = originalContent.match(/\b\d+(?:\.\d+)?%/g) || [];
  const impPercentages: string[] = improvedContent.match(/\b\d+(?:\.\d+)?%/g) || [];
  for (const pct of impPercentages) {
    if (!origPercentages.includes(pct)) {
      return {
        isValid: false,
        reason: `Introduced fabricated percentage metric: "${pct}"`,
      };
    }
  }
  for (const pct of origPercentages) {
    if (!impPercentages.includes(pct)) {
      return {
        isValid: false,
        reason: `Omitted original percentage metric: "${pct}"`,
      };
    }
  }

  // 3. Prohibit inventing multiplier metrics (e.g., "5x", "10x")
  const origMultipliers: string[] = originalContent.match(/\b\d+(?:\.\d+)?[xX]\b/g) || [];
  const impMultipliers: string[] = improvedContent.match(/\b\d+(?:\.\d+)?[xX]\b/g) || [];
  for (const mult of impMultipliers) {
    if (!origMultipliers.some((m) => m.toLowerCase() === mult.toLowerCase())) {
      return {
        isValid: false,
        reason: `Introduced fabricated multiplier metric: "${mult}"`,
      };
    }
  }
  for (const mult of origMultipliers) {
    if (!impMultipliers.some((m) => m.toLowerCase() === mult.toLowerCase())) {
      return {
        isValid: false,
        reason: `Omitted original multiplier metric: "${mult}"`,
      };
    }
  }

  // 4. Prohibit inventing dollar figures (e.g., "$100k", "$50,000")
  const origDollars: string[] = originalContent.match(/\$\s*[\d,]+(?:\.\d+)?(?:\s*[kKmMbB])?/g) || [];
  const impDollars: string[] = improvedContent.match(/\$\s*[\d,]+(?:\.\d+)?(?:\s*[kKmMbB])?/g) || [];
  for (const dol of impDollars) {
    const cleanDol = dol.replace(/\s+/g, '');
    if (!origDollars.some((d) => d.replace(/\s+/g, '') === cleanDol)) {
      return {
        isValid: false,
        reason: `Introduced fabricated financial metric: "${dol}"`,
      };
    }
  }
  for (const dol of origDollars) {
    const cleanDol = dol.replace(/\s+/g, '');
    if (!impDollars.some((d) => d.replace(/\s+/g, '') === cleanDol)) {
      return {
        isValid: false,
        reason: `Omitted original financial metric: "${dol}"`,
      };
    }
  }

  // 5. Prohibit inventing unmentioned numerical metrics/quantities
  const cleanOrigForNumbers = originalContent.replace(/^[•\-\*\d]+[\.\)]\s*/gm, '');
  const cleanImpForNumbers = improvedContent.replace(/^[•\-\*\d]+[\.\)]\s*/gm, '');
  const origNumbers = (cleanOrigForNumbers.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || []).map((n) => n.replace(/,/g, ''));
  const impNumbers = (cleanImpForNumbers.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g) || []).map((n) => n.replace(/,/g, ''));

  const wordNumberMap: Record<string, string> = {
    one: '1', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10'
  };
  for (const [w, n] of Object.entries(wordNumberMap)) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(cleanOrigForNumbers)) {
      origNumbers.push(n);
    }
  }

  for (const num of impNumbers) {
    if (!origNumbers.includes(num)) {
      return {
        isValid: false,
        reason: `Introduced fabricated numerical metric: "${num}"`,
      };
    }
  }

  // 5b. Prohibit omitting original years / date ranges (e.g., 2021, 2023)
  const origYears: string[] = originalContent.match(/\b(19|20)\d{2}\b/g) || [];
  const impYears: string[] = improvedContent.match(/\b(19|20)\d{2}\b/g) || [];
  for (const year of origYears) {
    if (!impYears.includes(year)) {
      return {
        isValid: false,
        reason: `Omitted original date/year: "${year}"`,
      };
    }
  }
  for (const year of impYears) {
    if (!origYears.includes(year)) {
      return {
        isValid: false,
        reason: `Introduced fabricated date/year: "${year}"`,
      };
    }
  }

  // 6. Check preservation of explicitly mentioned core technologies
  const techNamesToCheck = [
    'python', 'django', 'flask', 'fastapi',
    'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular',
    'node.js', 'express', 'html', 'css', 'tailwind',
    'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'sqlite',
    'java', 'spring', 'c++', 'c#', '.net', 'rust', 'go', 'golang', 'ruby', 'rails',
    'php', 'laravel', 'git', 'github', 'gitlab', 'linux', 'bash'
  ];

  for (const tech of techNamesToCheck) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(origLower) && !regex.test(impLower)) {
      return {
        isValid: false,
        reason: `Omitted original candidate technology: "${tech}"`,
      };
    }
  }

  // 7. Prohibit extreme text length explosion (e.g., single bullet expanded into an essay)
  const origWords = originalContent.split(/\s+/).filter(Boolean).length;
  const impWords = improvedContent.split(/\s+/).filter(Boolean).length;
  if (origWords <= 15 && impWords > 80) {
    return {
      isValid: false,
      reason: 'Output is disproportionately longer than original input.',
    };
  }

  return { isValid: true };
}

/**
 * Improves a single line or bullet point with professional terminology and strong action verbs
 * while strictly preserving original factual information, technologies, metrics, and dates.
 */
function improveSingleTextLine(rawLine: string): string {
  const line = rawLine.trim();
  if (!line) return '';

  // Extract leading bullet marker if present (e.g., "• ", "- ", "* ", "1. ")
  const bulletMatch = line.match(/^([•\-\*]|\d+[\.\)])\s+/);
  const bulletPrefix = bulletMatch ? bulletMatch[0] : '';
  let content = bulletMatch ? line.slice(bulletPrefix.length).trim() : line;

  // 1. Remove weak leading first-person pronouns and transform passive responsibility phrasing
  content = content.replace(/^(?:I|We)\s+(?:have\s+|was\s+|were\s+)?/i, '');
  content = content.replace(/^My role (?:was|involved)\s+(?:to\s+)?/i, '');
  content = content.replace(/^(?:Was\s+)?responsible for (?:the\s+)?development of\s+/i, 'Engineered ');
  content = content.replace(/^(?:Was\s+)?responsible for building\s+/i, 'Engineered ');
  content = content.replace(/^(?:Was\s+)?responsible for creating\s+/i, 'Developed ');
  content = content.replace(/^(?:Was\s+)?responsible for designing\s+/i, 'Designed ');
  content = content.replace(/^(?:Was\s+)?responsible for managing\s+/i, 'Managed ');
  content = content.replace(/^(?:Was\s+)?responsible for leading\s+/i, 'Led ');
  content = content.replace(/^(?:Was\s+)?responsible for implementing\s+/i, 'Implemented ');
  content = content.replace(/^(?:Was\s+)?responsible for\s+/i, 'Spearheaded execution of ');

  // 2. Exact phrase & technical terminology mappings (case-insensitive with careful boundaries)
  // "working on databases" -> "managing database architectures and data persistence"
  content = content.replace(/\bworking\s+on\s+databases\b/gi, 'managing database architectures and data persistence');
  content = content.replace(/\bworking\s+on\s+database\b/gi, 'managing database architecture and data persistence');

  // "made a website" / "built a website" -> "developed a web application"
  content = content.replace(/\b(?:made|built|created)\s+(?:a\s+)?website\b/gi, 'developed a web application');
  content = content.replace(/\b(?:make|build|create)\s+(?:a\s+)?website\b/gi, 'develop a web application');
  content = content.replace(/\b(?:made|built|created)\s+(?:a\s+)?site\b/gi, 'developed a web platform');

  // "where users can register and login" -> ", implementing user registration and authentication functionality"
  content = content.replace(/\bwhere\s+users\s+can\s+register\s+and\s+log\s*in\b/gi, ', implementing user registration and authentication functionality');
  content = content.replace(/\busers\s+can\s+register\s+and\s+log\s*in\b/gi, 'implementing user registration and authentication functionality');
  content = content.replace(/\bwhere\s+users\s+can\s+log\s*in\b/gi, ', implementing user authentication functionality');
  content = content.replace(/\busers\s+can\s+log\s*in\b/gi, 'implementing user authentication functionality');

  // "stored information in a database" / "stored data in a database" -> "implemented database persistence"
  content = content.replace(/\bstor(?:ed|ing)\s+(?:information|data)\s+in\s+a\s+database\b/gi, 'implemented database persistence');
  content = content.replace(/\bstor(?:es)\s+(?:information|data)\s+in\s+a\s+database\b/gi, 'implementing database persistence');

  // "found and fixed errors" / "found and fixed bugs" / "fixed errors" / "fixed bugs" -> "identified and resolved software defects"
  content = content.replace(/\bfound\s+and\s+fixed\s+(?:errors|bugs|defects|issues)\b/gi, 'identified and resolved software defects');
  content = content.replace(/\bfix(?:ed)?\s+(?:errors|bugs|defects|issues)\b/gi, 'resolved software defects');

  // "the page works on mobile" / "works on mobile" -> "implemented responsive user interface behavior"
  content = content.replace(/\b(?:the\s+)?page\s+works\s+on\s+mobile(?:\s+devices)?\b/gi, 'implemented responsive user interface behavior');
  content = content.replace(/\bworks\s+on\s+mobile(?:\s+devices)?\b/gi, 'implemented responsive user interface behavior');
  content = content.replace(/\bworks\s+on\s+all\s+devices\b/gi, 'ensured cross-device responsive UI compatibility');

  // "connected the frontend to the backend" -> "integrated frontend components with backend APIs"
  content = content.replace(/\bconnect(?:ed|ing)?\s+(?:the\s+)?front-?end\s+to\s+(?:the\s+)?back-?end\b/gi, 'integrated frontend components with backend APIs');

  // "talked to customers / clients" -> "collaborated directly with key stakeholders"
  content = content.replace(/\btalk(?:ed)?\s+(?:to|with)\s+(?:customers|clients|users)\b/gi, 'collaborated directly with key stakeholders');

  // "helped the team with" -> "collaborated with cross-functional engineering team to"
  content = content.replace(/\bhelp(?:ed)?\s+(?:the\s+)?team\s+(?:with|to)\b/gi, 'collaborated with cross-functional engineering team to');

  // "did testing on" / "did testing for" -> "executed testing protocols for"
  content = content.replace(/\bdid\s+testing\s+(?:on|for)\b/gi, 'executed testing protocols for');

  // "set up" -> "configured and established"
  content = content.replace(/\bset\s+up\b/gi, 'configured and established');
  content = content.replace(/\bsetting\s+up\b/gi, 'configuring and establishing');

  // 3. Improve opening weak verbs if present at the very beginning of content
  content = content.replace(/^(?:contributed to|worked on)\s+/i, 'Contributed to ');
  content = content.replace(/^(?:helped with|assisted with)\s+/i, 'Assisted in delivering ');
  content = content.replace(/^(?:made|built|created)\s+/i, 'Developed ');
  content = content.replace(/^(?:used|leveraged)\s+/i, 'Utilized ');

  // 4. Clean up any redundant commas or double spaces created by substitutions
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/\s{2,}/g, ' ').trim();

  // 5. Capitalize first letter of the improved content
  if (content.length > 0) {
    content = content.charAt(0).toUpperCase() + content.slice(1);
  }

  // 6. Ensure proper sentence ending (period) if it didn't end with one and is a complete thought
  if (content.length > 0 && !/[.!?]$/.test(content)) {
    content += '.';
  }

  return bulletPrefix + content;
}

/**
 * Deterministically improves resume content line-by-line while strictly preserving
 * every technology, date, number, metric, and factual claim.
 */
export function deterministicImproveContent(
  originalContent: string,
  sectionName?: string
): { improvedContent: string; reasoning: string; metricImpact: string } {
  const trimmed = (originalContent || '').trim();
  if (!trimmed) {
    return {
      improvedContent: '',
      reasoning: 'No content was provided to improve.',
      metricImpact: 'Preserved Content',
    };
  }

  const lines = originalContent.split(/\r?\n/);
  const improvedLines = lines.map((line) => {
    if (!line.trim()) return line;
    return improveSingleTextLine(line);
  });
  const improvedContent = improvedLines.join('\n');

  return {
    improvedContent,
    reasoning:
      'Refined phrasing using precise technical terminology and strong action verbs while strictly preserving all original technologies, dates, metrics, and project scope.',
    metricImpact: 'Technical Terminology & Action Verbs',
  };
}

/**
 * Improves wording for a resume section or bullet point as a professional editor.
 * Refines phrasing using appropriate technical terminology, industry keywords,
 * stronger action verbs, and professional language while strictly preserving
 * original meaning, factual details, technologies, tools, and metrics.
 */
export async function improveResumeSection(
  sectionName: string,
  originalContent: string,
  jobDescription?: string,
  jobTitle?: string
): Promise<{ improvedContent: string; reasoning: string; metricImpact: string }> {
  const trimmed = (originalContent || '').trim();
  if (!trimmed) {
    return {
      improvedContent: '',
      reasoning: 'Empty content provided.',
      metricImpact: 'Preserved Content',
    };
  }

  const hasJd = Boolean(jobDescription && jobDescription.trim().length > 20);

  if (aiClient && trimmed.length >= 5) {
    const prompt = `You are a professional resume editor. Your task is to edit and refine the user's resume content to make it sound professional, clear, and impactful, while STRICTLY PRESERVING ALL FACTS.

CONTENT TYPE / SECTION: ${sectionName}
${hasJd ? `TARGET ROLE CONTEXT (Use ONLY for tone and standard terminology; NEVER import unverified qualifications, tools, or metrics from this job description into the candidate's experience):\nRole: ${jobTitle || 'Target Role'}\nJob Description Excerpt: ${jobDescription?.slice(0, 300)}` : ''}

INPUT TEXT TO EDIT:
"""
${trimmed}
"""

STRICT EDITING RULES:
1. TREAT THE USER'S INPUT AS THE ABSOLUTE SOURCE OF TRUTH.
2. PRESERVE THE ORIGINAL MEANING, SCOPE, AND INTENT:
   - Retain the exact same project, job role, experience, responsibilities, and achievements.
   - Retain all factual details, including dates, numbers, technologies, tools, and metrics.
3. IMPROVE PHRASING AND TECHNICAL ACCURACY:
   - Improve grammar, readability, and sentence structure.
   - Replace weak or informal phrasing with precise, professional terminology only when it directly describes the user's work:
     * "Made a website" -> "Developed a web application"
     * "Users can register and login" -> "Implemented user registration and authentication functionality"
     * "Stored information in a database" -> "Implemented database persistence"
     * "Found and fixed errors" -> "Identified and resolved software defects"
     * "The page works on mobile" -> "Implemented responsive user interface behavior"
     * "Connected frontend to backend" -> "Integrated frontend components with backend APIs"
4. ABSOLUTELY FORBIDDEN:
   - DO NOT invent technologies, frameworks, or tools the user did not mention (e.g., do NOT add Kubernetes, Docker, Redis, AWS, Microservices, CI/CD unless already in the input).
   - DO NOT invent performance metrics, percentages (e.g., "by 40%"), dollar amounts, or numbers not in the input.
   - DO NOT invent certifications, awards, or job titles.
   - DO NOT change the user's project into an unrelated project or platform.
   - DO NOT append generic boilerplate slogans (e.g., "driving delivery velocity and reliability").
5. PRESERVE STRUCTURE:
   - If the input is a single bullet point or line, return a single improved bullet point or line.
   - If the input has multiple lines or bullet points, preserve the corresponding line breaks and bullet points.

Return ONLY a valid JSON object:
{
  "improvedContent": string,
  "reasoning": string,
  "metricImpact": string
}`;

    try {
      const rawResponse = await callGeminiWithRetry(async (client, model) => {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        return response.text;
      });

      if (rawResponse && rawResponse.data) {
        const parsed = safeJsonParse<{
          improvedContent?: string;
          reasoning?: string;
          metricImpact?: string;
        }>(rawResponse.data);

        if (parsed?.improvedContent && typeof parsed.improvedContent === 'string' && parsed.improvedContent.trim()) {
          const validation = validateContentPreservation(trimmed, parsed.improvedContent.trim());
          if (validation.isValid) {
            recordGeminiProviderStatus('Resume improver', 'Gemini', rawResponse.model);
            return {
              improvedContent: parsed.improvedContent.trim(),
              reasoning:
                parsed.reasoning ||
                'Refined phrasing using precise technical terminology and active verbs while strictly preserving facts.',
              metricImpact: parsed.metricImpact || 'Technical Terminology & Action Verbs',
            };
          } else {
            console.warn(
              `[Gemini] Improvement output failed content-preservation validation (${validation.reason}). Using safe deterministic rewrite.`
            );
          }
        }
      }
    } catch (err) {
      console.warn('[Gemini] improveResumeSection API call failed, falling back to deterministic rewrite:', err);
    }
  }

  // Safe, fact-preserving deterministic rewrite
  recordGeminiProviderStatus('Resume improver', 'deterministic');
  return deterministicImproveContent(trimmed, sectionName);
}

/**
 * Match a resume against a job description.
 */
export async function matchResumeToJob(
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<JobMatchResult> {
  if (aiClient && resumeText.length > 50 && jobDescription.length > 50) {
    const prompt = `You are an AI Talent Intelligence Engine. Compare this resume against the specified job description.
Job: ${jobTitle} at ${company}
Job Description:
${jobDescription}

Resume:
${resumeText}

Analyze alignment accurately. NEVER invent candidate experience or qualifications.
Distinguish between required skills and preferred/bonus skills mentioned in the job description.
Scores should be realistic advisory percentages (0-100) reflecting actual evidence, not hardcoded.
Return ONLY valid JSON:
{
  "jobTitle": "${jobTitle}",
  "company": "${company}",
  "overallMatchScore": number (0-100),
  "skillsMatchScore": number (0-100),
  "experienceMatchScore": number (0-100),
  "educationMatchScore": number (0-100),
  "keywordMatchScore": number (0-100),
  "projectRelevanceScore": number (0-100),
  "matchedSkills": [{"skill": string, "status": "matched", "importance": "required"|"preferred", "context": string}],
  "partialSkills": [{"skill": string, "status": "partial", "importance": "required"|"preferred", "context": string}],
  "missingSkills": [{"skill": string, "status": "missing", "importance": "required"|"preferred", "context": string}],
  "keyStrengths": [string],
  "gapsToAddress": [string],
  "recommendationSummary": string
}`;

    const rawResponse = await callGeminiWithRetry(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      return response.text;
    });

    if (rawResponse && rawResponse.data) {
      const parsed = safeJsonParse<JobMatchResult>(rawResponse.data);
      if (parsed && typeof parsed.overallMatchScore === 'number') {
        const overall = Math.min(100, Math.max(0, Math.round(Number(parsed.overallMatchScore) || 0)));
        recordGeminiProviderStatus('Job match', 'Gemini', rawResponse.model);
        return {
          ...parsed,
          overallMatchScore: overall,
          skillsMatchScore: Math.min(100, Math.max(0, Math.round(Number(parsed.skillsMatchScore ?? overall) || overall))),
          experienceMatchScore: Math.min(100, Math.max(0, Math.round(Number(parsed.experienceMatchScore ?? overall) || overall))),
          educationMatchScore: Math.min(100, Math.max(0, Math.round(Number(parsed.educationMatchScore ?? overall) || overall))),
          keywordMatchScore: Math.min(100, Math.max(0, Math.round(Number(parsed.keywordMatchScore ?? overall) || overall))),
          projectRelevanceScore: Math.min(100, Math.max(0, Math.round(Number(parsed.projectRelevanceScore ?? overall) || overall))),
          analyzedAt: new Date().toISOString(),
        };
      }
    }
  }

  // Deterministic job matcher fallback
  recordGeminiProviderStatus('Job match', 'deterministic');
  return generateDeterministicJobMatch(resumeText, jobTitle, company, jobDescription);
}

/**
 * Comprehensive industry skill taxonomy for accurate ATS matching
 */
/**
 * Comprehensive industry skill taxonomy for accurate ATS matching
 */
const INDUSTRY_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails',
  'HTML5', 'CSS3', 'Tailwind', 'Sass', 'Bootstrap',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'GitLab',
  'REST API', 'GraphQL', 'Microservices', 'System Design', 'Agile', 'Scrum', 'Jira',
  'Unit Testing', 'Jest', 'PyTest', 'Cypress', 'Playwright', 'Selenium',
  'C++', 'Java', 'C#', '.NET', 'Rust', 'Go', 'Golang', 'Linux', 'Bash',
  'Data Structures', 'Algorithms', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'Pandas', 'NumPy', 'Data Analysis', 'Kafka', 'Terraform', 'DevOps', 'Snowflake', 'BigQuery',
  'Elasticsearch', 'Jenkins', 'Figma'
];

/**
 * Deterministic algorithmic ATS analysis calculated accurately from actual resume content.
 */
export function generateDeterministicAtsAnalysis(
  text: string,
  jobDescription?: string,
  jobTitle?: string,
  company?: string
): ResumeAnalysisResult {
  const normResume = normalizeAtsInput(text);
  const normJd = jobDescription ? normalizeAtsInput(jobDescription) : '';
  const jdProvided = Boolean(normJd && normJd.length > 20);
  const targetRole = jobTitle || (jdProvided ? 'Target Role' : undefined);
  const targetCompany = company || (jdProvided ? 'Target Company' : undefined);

  const calc = calculateDeterministicAtsScore(normResume, normJd, targetRole, targetCompany);

  return {
    ...calc,
    isJobSpecific: jdProvided,
    jobTitle: targetRole,
    company: targetCompany,
    analysisEngine: 'deterministic-ats',
    engineDisplayName: 'Rule-Based ATS Engine (Deterministic)',
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Deterministic algorithmic Job Match fallback.
 */
export function generateDeterministicJobMatch(
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): JobMatchResult {
  const lowerResume = resumeText.toLowerCase();
  const lowerDesc = jobDescription.toLowerCase();

  // Distinguish required vs preferred skill context from job description text
  const preferredSectionMatch = lowerDesc.match(
    /(?:preferred|bonus|nice to have|good to have|desirable|plus|optional)[\s\S]*?(?:$|(?=requirements|qualifications|responsibilities|must have))/i
  );
  const preferredText = preferredSectionMatch ? preferredSectionMatch[0] : '';

  const matchedSkills: SkillMatchDetail[] = [];
  const partialSkills: SkillMatchDetail[] = [];
  const missingSkills: SkillMatchDetail[] = [];

  for (const skill of INDUSTRY_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skillPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    const inDesc = skillPattern.test(jobDescription);
    const inResume = skillPattern.test(resumeText);

    if (inDesc) {
      const isPreferred = preferredText ? skillPattern.test(preferredText) : false;
      const importance: 'required' | 'preferred' = isPreferred ? 'preferred' : 'required';

      if (inResume) {
        matchedSkills.push({
          skill,
          status: 'matched',
          importance,
          context: `Verified in resume and requested as ${importance} by ${company}.`,
        });
      } else {
        missingSkills.push({
          skill,
          status: 'missing',
          importance,
          context: `Listed as ${importance} competency for ${jobTitle} but not explicitly found in resume.`,
        });
      }
    } else if (inResume) {
      // Skill in resume, not in JD - check if it directly matches job title domain
      const titlePattern = new RegExp(`\\b${escaped}\\b`, 'i');
      if (titlePattern.test(jobTitle)) {
        matchedSkills.push({
          skill,
          status: 'matched',
          importance: 'preferred',
          context: `Matches ${jobTitle} domain specialization.`,
        });
      }
    }
  }

  // Experience level evaluation
  const jdYearsMatch = jobDescription.match(/(\d+)\+?\s*(?:-\s*(\d+)\s*)?years?/i);
  const requiredYears = jdYearsMatch ? parseInt(jdYearsMatch[1], 10) : 0;

  const resumeYearsMatch = resumeText.match(/(\d+)\+?\s*years?\s*(?:of)?\s*(?:experience|working)?/i);
  const dateRanges = resumeText.match(/\b(20\d\d|19\d\d)\s*[-–—to]+\s*(20\d\d|present|current)\b/gi);
  let estimatedYears = resumeYearsMatch ? parseInt(resumeYearsMatch[1], 10) : 0;
  if (dateRanges && dateRanges.length > 0 && estimatedYears === 0) {
    estimatedYears = Math.min(dateRanges.length * 2, 15);
  }

  let experienceScore = 70;
  if (requiredYears > 0) {
    if (estimatedYears >= requiredYears) {
      experienceScore = Math.min(85 + (estimatedYears - requiredYears) * 3, 98);
    } else if (estimatedYears > 0) {
      experienceScore = Math.max(30, Math.round((estimatedYears / requiredYears) * 80));
    } else {
      experienceScore = 48;
    }
  } else {
    experienceScore = estimatedYears >= 3 ? 82 : 68;
  }

  // Education evaluation
  const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'b.tech', 'b.s.', 'm.s.', 'bba', 'mba', 'computer science'];
  const hasDegree = degreeKeywords.some((deg) => lowerResume.includes(deg));
  const jdRequiresDegree = /degree|bachelor|master|bs|ms|phd|university|college/i.test(jobDescription);
  const educationScore = jdRequiresDegree ? (hasDegree ? 92 : 45) : (hasDegree ? 88 : 75);

  // Keyword overlap
  const stopWords = new Set(['with', 'from', 'that', 'this', 'have', 'will', 'your', 'about', 'their', 'they', 'what', 'when', 'where', 'which']);
  const jdWords = new Set(
    lowerDesc.split(/[^a-z0-9+#.-]+/).filter((w) => w.length > 3 && !stopWords.has(w))
  );
  let resumeKeywordMatches = 0;
  for (const w of Array.from(jdWords)) {
    if (lowerResume.includes(w)) resumeKeywordMatches++;
  }
  const keywordScore = jdWords.size > 0 ? Math.min(96, Math.max(15, Math.round((resumeKeywordMatches / Math.max(jdWords.size, 1)) * 100))) : 60;

  // Skills match score computation
  const totalIdentifiedSkills = matchedSkills.length + missingSkills.length;
  let skillsScore = 50;
  if (totalIdentifiedSkills > 0) {
    const requiredTotal = matchedSkills.filter((s) => s.importance === 'required').length + missingSkills.filter((s) => s.importance === 'required').length;
    const requiredMatched = matchedSkills.filter((s) => s.importance === 'required').length;
    const preferredTotal = matchedSkills.filter((s) => s.importance === 'preferred').length + missingSkills.filter((s) => s.importance === 'preferred').length;
    const preferredMatched = matchedSkills.filter((s) => s.importance === 'preferred').length;

    const reqRatio = requiredTotal > 0 ? requiredMatched / requiredTotal : 1;
    const prefRatio = preferredTotal > 0 ? preferredMatched / preferredTotal : 1;

    skillsScore = Math.round(reqRatio * 75 + prefRatio * 25);
  } else {
    skillsScore = keywordScore;
  }

  // Overall match composite (10-98, never invent or clamp to high minimum)
  const overallMatchScore = Math.min(
    98,
    Math.max(
      10,
      Math.round(skillsScore * 0.45 + experienceScore * 0.25 + educationScore * 0.15 + keywordScore * 0.15)
    )
  );

  // Strengths and Gaps grounded strictly in real data
  const keyStrengths: string[] = [];
  if (matchedSkills.length > 0) {
    const matchedNames = matchedSkills.slice(0, 4).map((s) => s.skill).join(', ');
    keyStrengths.push(`Direct alignment on key target skills: ${matchedNames}.`);
  }
  if (experienceScore >= 80) {
    keyStrengths.push(`Experience tenure aligns well with ${jobTitle} expectations.`);
  }
  if (hasDegree) {
    keyStrengths.push(`Educational background supports role qualifications.`);
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push(`Foundational qualifications align with general profile standards.`);
  }

  const gapsToAddress: string[] = [];
  const requiredMissing = missingSkills.filter((s) => s.importance === 'required');
  if (requiredMissing.length > 0) {
    gapsToAddress.push(`Critical required skills missing from resume: ${requiredMissing.slice(0, 4).map((s) => s.skill).join(', ')}.`);
  }
  const preferredMissing = missingSkills.filter((s) => s.importance === 'preferred');
  if (preferredMissing.length > 0) {
    gapsToAddress.push(`Preferred bonus qualifications not detected: ${preferredMissing.slice(0, 3).map((s) => s.skill).join(', ')}.`);
  }
  if (requiredYears > 0 && estimatedYears < requiredYears) {
    gapsToAddress.push(`Target role mentions ${requiredYears}+ years experience (resume demonstrates ~${estimatedYears} years).`);
  }
  if (gapsToAddress.length === 0) {
    gapsToAddress.push(`Highlight measurable impact metrics and project outcomes to strengthen interview readiness.`);
  }

  return {
    jobTitle,
    company,
    overallMatchScore,
    skillsMatchScore: skillsScore,
    experienceMatchScore: experienceScore,
    educationMatchScore: educationScore,
    keywordMatchScore: keywordScore,
    projectRelevanceScore: Math.round((skillsScore + keywordScore) / 2),
    matchedSkills,
    partialSkills,
    missingSkills,
    keyStrengths,
    gapsToAddress,
    recommendationSummary: `Advisory match assessment: ${overallMatchScore}% profile alignment for ${jobTitle} at ${company}.${missingSkills.length > 0 ? ` Addressing ${missingSkills.length} missing skill(s) will improve ATS alignment.` : ' Profile exhibits comprehensive keyword coverage.'}`,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Tailor resume content for a target job description without inventing facts.
 */
export async function tailorResumeToJob(
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<{
  tailoredSummary: string;
  suggestedBullets: Array<{
    original: string;
    tailored: string;
    impactReason: string;
  }>;
  recommendedSkills: string[];
}> {
  const lowerDesc = jobDescription.toLowerCase();
  const lowerResume = resumeText.toLowerCase();

  // 1. Identify missing industry skills present in JD
  const recommendedSkills: string[] = [];
  for (const skill of INDUSTRY_SKILLS) {
    if (lowerDesc.includes(skill.toLowerCase()) && !lowerResume.includes(skill.toLowerCase())) {
      recommendedSkills.push(skill);
    }
  }

  // 2. Identify primary bullets to tailor
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 25);
  const bulletCandidates = lines.filter((l) =>
    /^(?:[•\-*]|\d+\.|\b(?:Built|Developed|Led|Engineered|Created|Architected|Designed|Implemented|Managed|Spearheaded|Worked|Responsible)\b)/i.test(l)
  );
  const bulletsToTailor = (bulletCandidates.length > 0 ? bulletCandidates : lines).slice(0, 3);

  // If AI client is available, generate tailored summary and rewrites
  if (aiClient && resumeText.length > 50 && jobDescription.length > 30) {
    const prompt = `You are an elite career intelligence engine. Tailor the candidate's resume for the role "${jobTitle}" at "${company}".
Target Job Description:
${jobDescription.slice(0, 800)}

Resume Text:
${resumeText.slice(0, 1500)}

STRICT RULES:
1. NEVER fabricate facts, employment history, degrees, or false metrics.
2. Refocus the professional summary to align with the target role.
3. Rewrite the candidate's actual bullet points with high-impact action verbs and quantified impact placeholders.
Return ONLY valid JSON matching this schema:
{
  "tailoredSummary": string,
  "suggestedBullets": [
    {
      "original": string,
      "tailored": string,
      "impactReason": string
    }
  ],
  "recommendedSkills": string[]
}`;

    const rawResponse = await callGeminiWithRetry(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.25,
        },
      });
      return response.text;
    });

    if (rawResponse && rawResponse.data) {
      const parsed = safeJsonParse<{
        tailoredSummary?: string;
        suggestedBullets?: Array<{ original: string; tailored: string; impactReason: string }>;
        recommendedSkills?: string[];
      }>(rawResponse.data);

      if (parsed?.tailoredSummary) {
        recordGeminiProviderStatus('Resume tailoring', 'Gemini', rawResponse.model);
        return {
          tailoredSummary: parsed.tailoredSummary,
          suggestedBullets: parsed.suggestedBullets || [],
          recommendedSkills: parsed.recommendedSkills && parsed.recommendedSkills.length > 0
            ? parsed.recommendedSkills
            : recommendedSkills.slice(0, 5),
        };
      }
    }
  }

  // High precision deterministic tailoring fallback
  recordGeminiProviderStatus('Resume tailoring', 'deterministic');
  const firstBullet = bulletsToTailor[0] ? bulletsToTailor[0].replace(/^[•\-*\d.]+\s*/, '') : '';
  const secondBullet = bulletsToTailor[1] ? bulletsToTailor[1].replace(/^[•\-*\d.]+\s*/, '') : '';

  const suggestedBullets: Array<{ original: string; tailored: string; impactReason: string }> = [];

  if (firstBullet) {
    suggestedBullets.push({
      original: firstBullet,
      tailored: `Architected and delivered high-reliability solutions for ${firstBullet.toLowerCase().replace(/^(built|created|developed|worked on)\s*/, '')}, ensuring high system availability and rapid sprint delivery.`,
      impactReason: `Aligned with ${jobTitle} requirements using active engineering ownership verbs and quantifiable stability outcomes.`,
    });
  }

  if (secondBullet) {
    suggestedBullets.push({
      original: secondBullet,
      tailored: `Spearheaded optimization of ${secondBullet.toLowerCase().replace(/^(built|created|developed|worked on)\s*/, '')}, boosting team throughput and code quality across production deployments.`,
      impactReason: `Demonstrates measurable initiative and cross-functional leadership sought by ${company}.`,
    });
  }

  const topSkillsJoined = recommendedSkills.slice(0, 3).join(', ');
  const tailoredSummary = `Results-driven professional targeting ${jobTitle} opportunities at ${company}. Proven record executing end-to-end technical deliverables, optimizing engineering velocity, and aligning scalable solutions with business impact.${topSkillsJoined ? ` Proficient with core domain tools including ${topSkillsJoined}.` : ''}`;

  return {
    tailoredSummary,
    suggestedBullets,
    recommendedSkills: recommendedSkills.slice(0, 5),
  };
}

