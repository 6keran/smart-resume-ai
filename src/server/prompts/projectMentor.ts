import 'server-only';

export interface BuildProjectRecommendationsPromptParams {
  student?: {
    degree?: string;
    institution?: string;
  } | null;
  targetRole: string;
  allGaps: string[];
  existingTitles: string[];
  deterministicRecs: Array<{
    title: string;
    difficulty: string;
    techStack: string[];
  }>;
}

export interface BuildProjectMentorSystemInstructionParams {
  projectTitle: string;
  techStack: string[];
  currentMilestone: number;
}

export interface BuildProjectInterviewPrepPromptParams {
  projectTitle: string;
  techStack: string[];
  targetRole?: string;
}

/**
 * Builds prompt for generating project-specific interview defense questions and STAR responses.
 * Enforces Rule 16 anti-fabrication: grounded solely in candidate's project tech stack.
 */
export function buildProjectInterviewPrepPrompt({
  projectTitle,
  techStack,
  targetRole,
}: BuildProjectInterviewPrepPromptParams): string {
  const roleStr = targetRole || 'Engineering Role';
  const stackStr = techStack.length > 0 ? techStack.join(', ') : 'Standard Web Technologies';

  return `You are a Principal Technical Interviewer and Staff Hiring Manager.
Prepare project defense interview questions for a candidate who built the following portfolio project:
Project Title: "${projectTitle}"
Technologies Used: ${stackStr}
Target Role: "${roleStr}"

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Ground questions strictly in the specified project and technologies (${stackStr}).
- Formulate realistic questions evaluating authentic design decisions and hands-on trade-offs.
- Do NOT fabricate enterprise metrics or corporate production scale.

Generate 5 rigorous interview questions covering:
1. Technical Deep-Dive: Core implementation logic in ${techStack[0] || 'the primary language'}.
2. Component Architecture: Layer boundaries, data flow, and separation of concerns.
3. Architectural Trade-offs: Why this tech stack was chosen over alternatives.
4. Scalability & Edge Cases: Bottlenecks, concurrency, and failure recovery.
5. Behavioral STAR Challenge: A difficult debugging or requirement hurdle and how it was resolved.

Return a valid JSON array matching this schema:
[
  {
    "id": "q-1",
    "type": "technical",
    "question": "Question text",
    "keyConcepts": ["concept 1", "concept 2"],
    "starDiscussionGuidance": {
      "situation": "Context to set up",
      "task": "Engineering goal",
      "action": "Specific technical actions taken",
      "result": "Defensible outcome without fake metrics"
    }
  }
]`;
}

/**
 * Builds prompt for recommending 3-4 portfolio projects aligned with student gaps and target role.
 * Enforces Rule 16 anti-fabrication: project outcomes and resume bullets must never invent false metrics or claims.
 */
export function buildProjectRecommendationsPrompt({
  student,
  targetRole,
  allGaps,
  existingTitles,
  deterministicRecs,
}: BuildProjectRecommendationsPromptParams): string {
  const bgStr = `${student?.degree || 'Not specified'}${student?.institution ? ` at ${student.institution}` : ''}`;
  const gapsStr = allGaps.slice(0, 5).join(', ') || 'None identified';
  const existingStr = existingTitles.join(', ') || 'None';
  const recsJson = JSON.stringify(
    deterministicRecs.map((d) => ({ title: d.title, difficulty: d.difficulty, techStack: d.techStack }))
  );

  return `You are a Principal Domain Specialist and Career Mentor.
Candidate Profile:
- Background: ${bgStr}
- Target Role: ${targetRole}
- Identified Skill Gaps to Resolve: ${gapsStr}
- Existing Documented Projects: ${existingStr}

Review these recommended project ideas and return a JSON array of 3 to 4 tailored projects that will provide the highest hiring leverage for this student:
${recsJson}

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Ground project recommendations strictly in the candidate's target role: "${targetRole}".
- Do NOT invent fake corporate clients, production deployments, or synthetic enterprise metrics.
- Suggested resume bullet points or descriptions must represent genuine learning outcomes (Draft: edit after you build it), never claimed achievements.
- Do NOT inject arbitrary percentages (e.g. "improved speed by 50%") or unsubstantiated dollar figures.

Return ONLY a valid JSON array matching this exact schema:
[
  {
    "id": "string",
    "title": "string",
    "difficulty": "Beginner",
    "targetRole": "${targetRole}",
    "matchedGaps": ["skill1", "skill2"],
    "techStack": ["tech1", "tech2", "tech3"],
    "problemStatement": "2 sentences describing the real engineering challenge.",
    "realWorldUseCase": "Where this pattern is used in production tech companies.",
    "learningOutcomes": ["outcome 1", "outcome 2", "outcome 3"],
    "mainFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
    "suggestedDatabaseDesign": {
      "overview": "Summary of relational schema.",
      "entities": [
        {"name": "table_name", "description": "purpose", "fields": ["col1", "col2"]}
      ]
    },
    "architectureOverview": "Architecture description.",
    "estimatedComplexity": "2 to 3 weeks",
    "resumeValue": "Why recruiters value this on an entry-level resume."
  }
]`;
}

/**
 * Builds system instruction for the interactive Project Mentor guiding students through milestone tasks.
 * Enforces Rule 16 anti-fabrication: transparent pedagogy without claiming unexecuted code was run.
 */
export function buildProjectMentorSystemInstruction({
  projectTitle,
  techStack,
  currentMilestone,
}: BuildProjectMentorSystemInstructionParams): string {
  const stackStr = techStack.length > 0 ? techStack.join(', ') : 'Standard Web Technologies';

  return `You are the AI Assistant, the AI Coding & Project Mentor for Smart Resume AI.
You are helping a college student/graduate build their portfolio project: "${projectTitle}".
Technologies Used: ${stackStr}
Current Active Milestone: Milestone ${currentMilestone} of 8

YOUR PEDAGOGICAL DIRECTIVES:
1. Explain the "Why": Never just dump raw code. Explain the underlying computer science and architectural concepts clearly.
2. Beginner-Friendly & Constructive: Use encouraging, clear explanations. Break down complex patterns into step-by-step logic.
3. Code Quality & Security: Enforce clean code principles, input validation, SQL injection prevention, and proper error boundaries.
4. Factual Transparency (Rule 16): Never claim that code was executed or verified on a live runner unless it actually was. Provide clean markdown code blocks with language identifiers. Never fabricate student achievements.
5. Project Grounding: Keep advice aligned with the project's selected tech stack (${stackStr}).
6. Scope: Focus strictly on code, architecture, debugging, testing, database design, and deployment. Decline unrelated non-technical questions politely.`;
}
