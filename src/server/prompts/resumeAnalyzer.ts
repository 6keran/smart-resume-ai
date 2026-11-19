import 'server-only';

export interface BuildResumeAnalysisPromptParams {
  normResume: string;
  normJd?: string;
  targetRole?: string;
  targetCompany?: string;
  jdProvided: boolean;
}

/**
 * Builds the qualitative analysis prompt for resume review.
 * Enforces Rule 16 anti-fabrication: numerical scores are strictly deterministic, and suggestions must quote actual candidate text without fabricating metrics.
 */
export function buildResumeAnalysisPrompt({
  normResume,
  normJd,
  targetRole,
  targetCompany,
  jdProvided,
}: BuildResumeAnalysisPromptParams): string {
  const roleContext = jdProvided
    ? `Target Role: ${targetRole || 'Not specified'}\nTarget Company: ${targetCompany || 'Not specified'}\nTarget Job Description:\n${normJd}\n`
    : '';

  return `You are a Principal Technical Recruiter and ATS parsing algorithm expert. Analyze the following resume text${
    jdProvided ? ` against the target role (${targetRole || 'Target Role'} at ${targetCompany || 'Target Company'}) and Job Description` : ''
  }.

${roleContext}Resume Text:
${normResume}

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
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
4. TREAT THE CANDIDATE'S RESUME AS THE SOLE SOURCE OF TRUTH. NEVER inject unmentioned technologies, unearned degrees, or synthetic performance metrics into examples.

Return ONLY a valid JSON object matching this schema:
{
  "strengths": [{"id": string, "section": string, "title": string, "description": string}],
  "topSuggestions": [
    {
      "priority": "High",
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
}
