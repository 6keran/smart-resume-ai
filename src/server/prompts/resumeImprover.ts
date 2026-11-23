import 'server-only';

export interface BuildResumeSectionImprovementPromptParams {
  sectionName: string;
  originalContent: string;
  hasJd: boolean;
  jobTitle?: string;
  jobDescription?: string;
}

/**
 * Builds the resume bullet and section improvement prompt.
 * Enforces Rule 16 anti-fabrication: user input is the absolute source of truth.
 * Forbids injecting unmentioned technologies, fake metrics, or unearned certifications.
 */
export function buildResumeSectionImprovementPrompt({
  sectionName,
  originalContent,
  hasJd,
  jobTitle,
  jobDescription,
}: BuildResumeSectionImprovementPromptParams): string {
  const jdContext = hasJd
    ? `TARGET ROLE CONTEXT (Use ONLY for tone and standard terminology; NEVER import unverified qualifications, tools, or metrics from this job description into the candidate's experience):\nRole: ${jobTitle || 'Target Role'}\nJob Description Excerpt: ${jobDescription?.slice(0, 300)}\n\n`
    : '';

  return `You are a professional resume editor. Your task is to edit and refine the user's resume content to make it sound professional, clear, and impactful, while STRICTLY PRESERVING ALL FACTS.

CONTENT TYPE / SECTION: ${sectionName}
${jdContext}INPUT TEXT TO EDIT:
"""
${originalContent}
"""

STRICT EDITING RULES & ANTI-FABRICATION DIRECTIVES (Rule 16):
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
}
