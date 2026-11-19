import 'server-only';

export interface BuildInterviewQuestionsPromptParams {
  roleTitle: string;
  jobDescription?: string;
  resumeSnippet?: string;
}

export interface BuildInterviewAnswerEvaluationPromptParams {
  targetRole: string;
  question: string;
  gradingCriteria: string[];
  sampleStrongAnswer: string;
  candidateAnswer: string;
}

/**
 * Builds prompt for generating 5 rigorous, role-aligned interview questions.
 * Enforces Rule 16 anti-fabrication: if candidate background is supplied, never hallucinate false background or unverified employer details.
 */
export function buildInterviewQuestionsPrompt({
  roleTitle,
  jobDescription,
  resumeSnippet,
}: BuildInterviewQuestionsPromptParams): string {
  return `You are an elite Staff Software Engineer and Technical Hiring Manager conducting an interview for the role: "${roleTitle}".
${jobDescription ? `Job Description Context: ${jobDescription.slice(0, 1500)}\n` : ''}${resumeSnippet ? `Candidate Background: ${resumeSnippet.slice(0, 1000)}\n` : ''}
CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Formulate realistic questions directly relevant to standard industry requirements for "${roleTitle}".
- If candidate background context is provided, do NOT fabricate fictional prior employers or claims not mentioned.
- Ground all grading criteria and model answers in real-world engineering and domain standards.

Generate exactly 5 realistic, rigorous interview questions:
1. Technical Fundamentals & Architecture
2. Practical Problem Solving / Code Design
3. Scenario / Behavioral (STAR Method)
4. Database / Performance / Edge Case Challenge
5. System Design / Production Reliability

Return a JSON array of 5 objects strictly conforming to this schema:
[
  {
    "id": "q-1",
    "category": "technical",
    "question": "The interview question",
    "context": "Why this question matters for ${roleTitle}",
    "gradingCriteria": ["Key concept 1", "Key concept 2", "Key concept 3"],
    "sampleStrongAnswer": "A high-scoring model answer explaining core principles concisely."
  }
]`;
}

/**
 * Builds prompt for evaluating a candidate's interview response with STAR feedback.
 * Enforces Rule 16 anti-fabrication: sampleRefinement must preserve candidate's genuine experiences without inventing false metrics.
 */
export function buildInterviewAnswerEvaluationPrompt({
  targetRole,
  question,
  gradingCriteria,
  sampleStrongAnswer,
  candidateAnswer,
}: BuildInterviewAnswerEvaluationPromptParams): string {
  const criteriaList = gradingCriteria.length > 0
    ? gradingCriteria.map((c) => `- ${c}`).join('\n')
    : '- Core domain understanding\n- Structured problem solving';

  return `You are a Senior Technical Recruiter and Staff Engineering Interviewer.
Evaluate the candidate's interview response for the role "${targetRole}".

Question:
"${question}"

Expected Core Concepts / Grading Criteria:
${criteriaList}

Model Strong Answer:
"${sampleStrongAnswer}"

Candidate's Answer:
"${candidateAnswer}"

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
- Evaluate ONLY what the candidate actually stated.
- Do NOT fabricate achievements, scale, or metrics that the candidate did not mention.
- The "sampleRefinement" must polish technical phrasing while preserving the candidate's authentic experiences without inventing metrics.

Score the answer on a scale of 0 to 100 based on technical accuracy, completeness, depth, and communication clarity.
Return a valid JSON object matching this schema:
{
  "score": 85,
  "technicalAccuracyScore": 88,
  "communicationScore": 82,
  "readinessLevel": "Strong",
  "strengths": ["Clear strength 1", "Clear strength 2"],
  "areasForImprovement": ["Key gap or missing detail 1", "Refinement suggestion 2"],
  "sampleRefinement": "An enhanced version of the candidate's answer preserving their personal experiences while polishing technical terminology.",
  "starFeedback": {
    "situationTask": "Feedback on the situation/task context provided",
    "action": "Feedback on technical actions explained",
    "result": "Feedback on business or performance outcome described"
  }
}`;
}
