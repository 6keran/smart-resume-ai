import 'server-only';

export interface BuildJobMatchPromptParams {
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
}

export interface BuildResumeTailoringPromptParams {
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
}

export interface BuildJobSearchNlpPromptParams {
  query: string;
}

/**
 * Builds prompt for qualitative job-to-resume matching analysis.
 * Enforces Rule 16 anti-fabrication: evaluate actual evidence in resume text without fabricating qualifications.
 */
export function buildJobMatchPrompt({
  jobTitle,
  company,
  jobDescription,
  resumeText,
}: BuildJobMatchPromptParams): string {
  return `You are an AI Talent Intelligence Engine. Compare this resume against the specified job description.
Job: ${jobTitle} at ${company}
Job Description:
${jobDescription}

Resume:
${resumeText}

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Analyze alignment accurately based ONLY on the actual text in the resume.
- NEVER invent candidate experience, projects, tools, or qualifications.
- Distinguish clearly between required skills and preferred/bonus skills mentioned in the job description.
- Scores must be realistic advisory percentages (0-100) reflecting authentic evidence.

Return ONLY valid JSON:
{
  "jobTitle": "${jobTitle}",
  "company": "${company}",
  "overallMatchScore": 80,
  "skillsMatchScore": 85,
  "experienceMatchScore": 75,
  "educationMatchScore": 80,
  "keywordMatchScore": 82,
  "projectRelevanceScore": 78,
  "matchedSkills": [{"skill": "skill_name", "status": "matched", "importance": "required", "context": "evidence from resume"}],
  "partialSkills": [{"skill": "skill_name", "status": "partial", "importance": "preferred", "context": "partial evidence"}],
  "missingSkills": [{"skill": "skill_name", "status": "missing", "importance": "required", "context": "missing from resume"}],
  "keyStrengths": ["Strength 1"],
  "gapsToAddress": ["Gap 1"],
  "recommendationSummary": "Concise summary of alignment"
}`;
}

/**
 * Builds prompt for tailoring resume summary and bullets to a target job description.
 * Enforces Rule 16 anti-fabrication: never fabricate facts, employment history, degrees, or false metrics.
 */
export function buildResumeTailoringPrompt({
  jobTitle,
  company,
  jobDescription,
  resumeText,
}: BuildResumeTailoringPromptParams): string {
  return `You are an elite career intelligence engine. Tailor the candidate's resume for the role "${jobTitle}" at "${company}".
Target Job Description:
${jobDescription.slice(0, 800)}

Resume Text:
${resumeText.slice(0, 1500)}

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
1. NEVER fabricate facts, employment history, degrees, or false metrics.
2. Refocus the professional summary to align with the target role while preserving genuine candidate history.
3. Rewrite the candidate's actual bullet points with high-impact action verbs and quantified impact placeholders without inventing false numbers.

Return ONLY valid JSON matching this schema:
{
  "tailoredSummary": "string",
  "suggestedBullets": [
    {
      "original": "string",
      "tailored": "string",
      "impactReason": "string"
    }
  ],
  "recommendedSkills": ["string"]
}`;
}

/**
 * Builds prompt for parsing natural language job search queries into structured search filters.
 */
export function buildJobSearchNlpPrompt({ query }: BuildJobSearchNlpPromptParams): string {
  return `You are a search query understanding engine for a job search platform.
Parse the user's natural language search prompt into structured query filters.

User Prompt: "${query}"

Return a valid JSON object matching this schema:
{
  "keywords": "Clean role title and primary technical keywords (e.g. React Frontend Developer)",
  "location": "City or Country if specified, otherwise empty string",
  "workplaceType": "remote" | "hybrid" | "on-site" | null,
  "experienceLevel": "entry" | "mid" | "senior" | null,
  "contractType": "full-time" | "part-time" | "contract" | "internship" | null,
  "explanation": "Brief explanation of how the query was interpreted"
}`;
}
