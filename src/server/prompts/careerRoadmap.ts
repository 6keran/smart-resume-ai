import 'server-only';

export interface BuildCareerRoadmapPromptParams {
  roleTitle: string;
  currentSkills: string[];
  missingCriticalSkills: string[];
  missingRecommendedSkills: string[];
  targetJobDescription?: string;
}

/**
 * Builds the qualitative enrichment prompt for Career Roadmap skill-gap analysis.
 * Enforces Rule 16 anti-fabrication: actions and summaries must derive solely from verified gaps and curated roles.
 */
export function buildCareerRoadmapEnrichmentPrompt({
  roleTitle,
  currentSkills,
  missingCriticalSkills,
  missingRecommendedSkills,
  targetJobDescription,
}: BuildCareerRoadmapPromptParams): string {
  const currentStr = currentSkills.length > 0 ? currentSkills.join(', ') : 'None documented yet';
  const missingCritStr = missingCriticalSkills.length > 0 ? missingCriticalSkills.join(', ') : 'None';
  const missingRecStr = missingRecommendedSkills.length > 0 ? missingRecommendedSkills.join(', ') : 'None';

  return `You are an elite Career Advisor and Technical Recruiter.
Analyze this candidate's skill gap for the target role: "${roleTitle}".
Current Candidate Skills: ${currentStr}
Missing Critical Skills: ${missingCritStr}
Missing Recommended Skills: ${missingRecStr}
${targetJobDescription ? `Target Job Description: ${targetJobDescription.slice(0, 1000)}\n` : ''}
CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Ground all recommendations strictly in the provided skills, role requirements, and target job description.
- Never invent unmentioned qualifications, phantom job requirements, or arbitrary timeline estimates.
- Priority actions must focus on closing real verified skill gaps for "${roleTitle}".

Return a valid JSON object strictly matching this schema:
{
  "analysisSummary": "A concise, empowering 2-sentence evaluation of candidate readiness and greatest hiring leverage.",
  "priorityActions": ["action 1", "action 2", "action 3"]
}`;
}
