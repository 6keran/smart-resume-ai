import 'server-only';
import { escapeXmlData, formatBulletList } from './sharedUtils';

export interface BuildSkillGapAnalysisPromptParams {
  resumeText: string;
  jobDescription: string;
  targetRole?: string;
  currentSkills?: string[];
  atsScore?: number;
  atsBreakdown?: {
    keywordScore?: number;
    contentScore?: number;
    formatScore?: number;
    sectionScore?: number;
  };
  studentGoal?: string;
}

export interface SkillGapLearningRecommendation {
  skill: string;
  category: 'critical' | 'recommended' | 'tool';
  priority: 'high' | 'medium' | 'low';
  recommendedAction: string;
  estimatedWeeks: number;
}

export interface SkillGapSuggestedProject {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  description: string;
  expectedOutcome: string;
}

export interface SkillGapTimelinePhase {
  phase: string;
  duration: string;
  focus: string;
  milestones: string[];
}

export interface SkillGapAnalysisResult {
  matchScore: number;
  missingSkills: string[];
  missingTools: string[];
  missingKeywords: string[];
  learningRecommendations: SkillGapLearningRecommendation[];
  suggestedProjects: SkillGapSuggestedProject[];
  recommendedTimeline: SkillGapTimelinePhase[];
  readinessAssessment: string;
}

/**
 * Builds the comprehensive prompt for Skill Gap Analysis comparing a candidate's resume
 * against a target job description and role requirements.
 * Enforces Rule 16 anti-fabrication: gaps and suggestions must derive strictly from provided texts.
 */
export function buildSkillGapAnalysisPrompt({
  resumeText,
  jobDescription,
  targetRole,
  currentSkills,
  atsScore,
  atsBreakdown,
  studentGoal,
}: BuildSkillGapAnalysisPromptParams): string {
  const sanitizedResume = escapeXmlData(resumeText.slice(0, 5000));
  const sanitizedJd = escapeXmlData(jobDescription.slice(0, 3000));
  const skillsList = formatBulletList(currentSkills, 'None explicitly documented');
  const roleStr = targetRole?.trim() || 'Target Role';
  const goalStr = studentGoal?.trim() ? `\nCandidate Goal: ${escapeXmlData(studentGoal)}` : '';

  let atsContext = '';
  if (typeof atsScore === 'number') {
    atsContext = `\nDeterministic ATS Baseline Score: ${atsScore}/100`;
    if (atsBreakdown) {
      atsContext += ` (Keywords: ${atsBreakdown.keywordScore ?? 'N/A'}, Content: ${atsBreakdown.contentScore ?? 'N/A'}, Formatting: ${atsBreakdown.formatScore ?? 'N/A'}, Sections: ${atsBreakdown.sectionScore ?? 'N/A'})`;
    }
  }

  return `You are a Principal Career Architect and AI Talent Assessor specializing in skill-gap bridging and career acceleration.
Analyze the alignment between the candidate's authentic resume and the target job description for: "${roleStr}".${goalStr}${atsContext}

Candidate Current Skills: ${skillsList}

<untrusted_job_description>
${sanitizedJd}
</untrusted_job_description>

<untrusted_resume_text>
${sanitizedResume}
</untrusted_resume_text>

CRITICAL ANTI-FABRICATION DIRECTIVES (Rule 16):
1. Analyze alignment strictly based on the text provided in the resume and job description.
2. NEVER invent candidate experience, projects, degrees, or false metrics.
3. Categorize gaps accurately:
   - "missingSkills": Conceptual, architectural, or domain skills required by the job that are absent from the resume.
   - "missingTools": Specific tools, frameworks, languages, or software explicitly requested in the job description that are missing.
   - "missingKeywords": Critical domain keywords and ATS terminology in the job description not present in the candidate's resume.
4. Suggested projects must represent learning prototypes (Draft: edit after you build it), never claimed enterprise or commercial achievements.
5. Provide realistic learning timelines (in weeks) proportional to the student's background.

Return ONLY a valid JSON object strictly matching this schema:
{
  "matchScore": 75,
  "missingSkills": ["System Design", "Microservices Architecture"],
  "missingTools": ["Docker", "Kubernetes", "PostgreSQL"],
  "missingKeywords": ["CI/CD pipeline", "RESTful APIs", "Containerization"],
  "learningRecommendations": [
    {
      "skill": "Docker",
      "category": "tool",
      "priority": "high",
      "recommendedAction": "Containerize a full-stack Next.js web application and write multi-stage Dockerfiles.",
      "estimatedWeeks": 2
    }
  ],
  "suggestedProjects": [
    {
      "title": "Cloud-Native Containerized Application",
      "difficulty": "Intermediate",
      "techStack": ["Next.js", "Docker", "Node.js"],
      "description": "Develop and deploy a containerized service with health checks and automated CI/CD pipeline.",
      "expectedOutcome": "Demonstrates production containerization and modern deployment workflows."
    }
  ],
  "recommendedTimeline": [
    {
      "phase": "Phase 1: Core Foundation & Tooling",
      "duration": "Weeks 1-2",
      "focus": "Hands-on containerization and local dev environments",
      "milestones": ["Build first Docker container", "Set up docker-compose for multi-service stack"]
    }
  ],
  "readinessAssessment": "A concise, empowering 2-3 sentence evaluation of candidate readiness, greatest leverage, and immediate next steps."
}`;
}
