import 'server-only';
import { GoogleGenAI } from '@google/genai';
import {
  getDb,
  getUserCareerGoal,
  getUserSkills,
  getUserInterviewSessions,
  createInterviewSession,
  saveInterviewSessionAnswer,
  completeInterviewSession,
  getStudentProfile,
  type StudentProfileDTO,
} from '@/server/db';
import { CANDIDATE_GEMINI_MODELS, recordGeminiProviderStatus } from '@/server/services/gemini';
import { YOUTUBE_ROADMAPS } from '@/lib/learning/youtubeResources';
import { findCuratedRoleProfile, getAllCuratedSkillSuggestions, type RoleDomain } from '@/lib/career/roleProfiles';
import { SupportedSkill } from '@/types/skills';
import { WorkplaceType, EmploymentType } from '@/types/jobs';
import {
  buildUnifiedStudentContext,
  mapUnifiedToCareerProfileSummary,
  type UnifiedStudentContext,
} from './unifiedStudentContext';
import {
  generateCareerIntelligence,
  type CareerIntelligenceRecommendation,
} from './careerIntelligenceEngine';
import { buildCareerRoadmapEnrichmentPrompt } from '@/server/prompts/careerRoadmap';
import {
  buildInterviewQuestionsPrompt,
  buildInterviewAnswerEvaluationPrompt,
} from '@/server/prompts/interviewCoach';
import { buildJobSearchNlpPrompt } from '@/server/prompts/jobMatcher';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_REQUEST_TIMEOUT_MS = 20_000;

function withGeminiTimeout<T>(request: Promise<T>, model: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini request timed out on ${model}.`)), GEMINI_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([request, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('[CareerIntelligence] Failed to initialize GoogleGenAI client:', err);
  }
}

// ============================================================================
// ROLE TAXONOMY & SKILL STANDARDS
// ============================================================================

export interface RoleSpecification {
  title: string;
  category: 'Software Engineering' | 'Data & AI' | 'Cloud & DevOps' | 'Product & Management' | RoleDomain | 'Unset' | 'Custom';
  criticalSkills: string[];
  recommendedSkills: string[];
  description: string;
}

export const ROLE_TAXONOMY: Record<string, RoleSpecification> = {
  'graduate software engineer': {
    title: 'Graduate Software Engineer (SDE-1)',
    category: 'Software Engineering',
    criticalSkills: ['Data Structures', 'Algorithms', 'JavaScript', 'Python', 'SQL', 'Git', 'Problem Solving'],
    recommendedSkills: ['REST APIs', 'React', 'Docker', 'Testing', 'Linux', 'Object-Oriented Programming'],
    description: 'Entry-level engineering role focusing on algorithmic problem solving, core computer science principles, and building reliable features.',
  },
  'junior full stack developer': {
    title: 'Junior Full Stack Developer',
    category: 'Software Engineering',
    criticalSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'HTML/CSS'],
    recommendedSkills: ['Next.js', 'Tailwind CSS', 'REST APIs', 'PostgreSQL', 'Docker', 'Testing'],
    description: 'Early-career full stack role building responsive user interfaces, API endpoints, and database models for modern web applications.',
  },
  'junior frontend developer': {
    title: 'Junior Frontend Developer',
    category: 'Software Engineering',
    criticalSkills: ['JavaScript', 'React', 'HTML/CSS', 'TypeScript', 'Git', 'Responsive Design'],
    recommendedSkills: ['Next.js', 'Tailwind CSS', 'Web Performance', 'UI Component Design', 'Testing'],
    description: 'Specializes in creating accessible, clean, responsive web user interfaces using modern React ecosystem tools.',
  },
  'junior backend developer': {
    title: 'Junior Backend Developer',
    category: 'Software Engineering',
    criticalSkills: ['Node.js', 'Python', 'SQL', 'REST APIs', 'Git', 'Database Design'],
    recommendedSkills: ['PostgreSQL', 'Docker', 'Redis', 'Testing', 'Linux', 'Express'],
    description: 'Focuses on server-side business logic, database queries, authentication workflows, and RESTful service integration.',
  },
  'junior data analyst': {
    title: 'Junior Data Analyst',
    category: 'Data & AI',
    criticalSkills: ['Python', 'SQL', 'Excel', 'Data Analysis', 'Statistics', 'Pandas'],
    recommendedSkills: ['Tableau', 'Power BI', 'Data Visualization', 'Machine Learning', 'Git'],
    description: 'Analyzes business datasets, writes SQL queries, produces exploratory visualizations, and builds foundational data reports.',
  },
  'cloud & devops intern': {
    title: 'Cloud & DevOps Intern',
    category: 'Cloud & DevOps',
    criticalSkills: ['Linux', 'Git', 'Docker', 'Networking', 'Python', 'CI/CD'],
    recommendedSkills: ['AWS', 'GitHub Actions', 'Terraform', 'Kubernetes', 'Bash Scripting'],
    description: 'Supports continuous integration workflows, containerized environments, cloud infrastructure deployment, and server operations.',
  },
  'full stack developer': {
    title: 'Full Stack Developer',
    category: 'Software Engineering',
    criticalSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'REST APIs'],
    recommendedSkills: ['Next.js', 'Docker', 'AWS', 'GraphQL', 'Tailwind CSS', 'Redis', 'Testing'],
    description: 'Builds end-to-end web applications across modern frontend architectures, backend APIs, and relational databases.',
  },
  'frontend developer': {
    title: 'Frontend Developer',
    category: 'Software Engineering',
    criticalSkills: ['JavaScript', 'TypeScript', 'React', 'HTML/CSS', 'Git', 'Responsive Design'],
    recommendedSkills: ['Next.js', 'Tailwind CSS', 'State Management', 'Web Performance', 'Testing (Jest/Playwright)', 'Accessibility (a11y)'],
    description: 'Creates responsive, accessible, high-performance web user interfaces with modern component frameworks.',
  },
  'backend developer': {
    title: 'Backend Developer',
    category: 'Software Engineering',
    criticalSkills: ['SQL', 'Git', 'REST APIs', 'Node.js', 'Python', 'Database Design'],
    recommendedSkills: ['Docker', 'AWS', 'Redis', 'PostgreSQL', 'Microservices', 'GraphQL', 'CI/CD'],
    description: 'Designs reliable, scalable server architectures, secure authentication workflows, and high-throughput data pipelines.',
  },
  'data scientist': {
    title: 'Data Scientist',
    category: 'Data & AI',
    criticalSkills: ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Statistics'],
    recommendedSkills: ['Pandas', 'NumPy', 'Scikit-learn', 'Data Visualization', 'Deep Learning', 'Git'],
    description: 'Applies statistical modeling, exploratory data analysis, and predictive machine learning algorithms to solve business problems.',
  },
  'ai engineer': {
    title: 'AI / Machine Learning Engineer',
    category: 'Data & AI',
    criticalSkills: ['Python', 'Machine Learning', 'Data Analysis', 'Deep Learning', 'Git'],
    recommendedSkills: ['PyTorch', 'TensorFlow', 'LLMs', 'Vector Databases', 'Docker', 'API Deployment'],
    description: 'Builds, fine-tunes, and deploys production machine learning pipelines and modern generative AI models.',
  },
  'devops engineer': {
    title: 'DevOps & Cloud Engineer',
    category: 'Cloud & DevOps',
    criticalSkills: ['AWS', 'Docker', 'Git', 'CI/CD', 'Linux', 'Networking'],
    recommendedSkills: ['Kubernetes', 'Terraform', 'Python', 'Monitoring (Prometheus/Grafana)', 'Security & Compliance'],
    description: 'Automates cloud infrastructure, manages CI/CD delivery pipelines, and ensures high availability and resilience.',
  },
  'software engineer': {
    title: 'Software Engineer',
    category: 'Software Engineering',
    criticalSkills: ['Data Structures', 'Algorithms', 'Git', 'Object-Oriented Programming', 'Testing'],
    recommendedSkills: ['Python', 'Java', 'SQL', 'System Design', 'Docker', 'CI/CD'],
    description: 'Engineers robust software systems with emphasis on algorithmic efficiency, clean code principles, and scalable system design.',
  },
};

/**
 * Finds the closest matched role specification from taxonomy.
 */
export function findRoleSpecification(roleQuery: string): RoleSpecification {
  const trimmed = (roleQuery || '').trim();
  const normalized = trimmed.toLowerCase();

  if (!normalized) {
    return {
      title: '',
      category: 'Unset',
      criticalSkills: [],
      recommendedSkills: [],
      description: 'Target role has not been set yet.',
    };
  }

  if (ROLE_TAXONOMY[normalized]) {
    return ROLE_TAXONOMY[normalized];
  }

  const curated = findCuratedRoleProfile(trimmed);
  if (curated) {
    return {
      title: curated.title,
      category: curated.domain,
      criticalSkills: curated.coreSkills,
      recommendedSkills: curated.recommendedTools,
      description: curated.summary,
    };
  }

  for (const [key, spec] of Object.entries(ROLE_TAXONOMY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return spec;
    }
  }

  // Return custom role transparently without inventing unrelated software requirements
  return {
    title: trimmed,
    category: 'Custom',
    criticalSkills: [],
    recommendedSkills: [],
    description: `Custom target role "${trimmed}".`,
  };
}

// ============================================================================
// 1. COMPREHENSIVE CAREER PROFILE SUMMARY & EXPLAINABLE READINESS
// ============================================================================

export interface ReadinessQuadrant {
  name: string;
  score: number; // 0 - 100
  weight: number; // Percentage (e.g. 25)
  level: 'Novice' | 'Developing' | 'Proficient' | 'Job-Ready';
  summary: string;
  strengths: string[];
  recommendations: string[];
}

export interface ExplainableReadinessResult {
  overallScore: number; // 0 - 100
  overallLevel: 'Novice' | 'Developing' | 'Competitive' | 'Career Ready';
  summary: string;
  quadrants: {
    technicalCompetency: ReadinessQuadrant;
    projectEvidence: ReadinessQuadrant;
    resumeAts: ReadinessQuadrant;
    interviewFluency: ReadinessQuadrant;
  };
  keyStrengths: string[];
  priorityActions: Array<{
    title: string;
    description: string;
    href: string;
    impact: 'high' | 'medium';
    actionText: string;
  }>;
}

export interface CareerProfileSummary {
  userId: string;
  name: string;
  email?: string | null;
  targetRole: string;
  targetIndustry?: string | null;
  experienceLevel?: string | null;
  preferredLocation?: string | null;
  targetSalary?: string | null;
  skills: {
    verified: Array<{ name: string; score: number; certificateId?: string; verifiedDate?: string }>;
    claimed: Array<{ name: string; claimedDate?: string }>;
    inferred: Array<{ name: string; source: 'resume_experience' | 'resume_project' | 'skills_section' }>;
    needingAssessment: string[];
  };
  metrics: {
    verifiedCount: number;
    claimedCount: number;
    inferredCount: number;
    readinessScore: number;
    activeApplicationsCount: number;
    savedResumesCount: number;
  };
  recentAssessments: Array<{
    id: string;
    skill: string;
    score: number;
    totalQuestions: number;
    passed: boolean;
    date: string;
  }>;
  nextRecommendedActions: Array<{
    title: string;
    description: string;
    href: string;
    priority: 'high' | 'medium' | 'low';
    actionText: string;
  }>;
  studentProfile?: StudentProfileDTO | null;
  explainableReadiness?: ExplainableReadinessResult;
  latestAtsAnalysis?: {
    atsScore: number;
    keywordScore?: number;
    formattingScore?: number;
    sectionScore?: number;
    detectedKeywords: string[];
    missingKeywords: string[];
    createdAt?: string;
  } | null;
  recentApplications?: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location?: string | null;
    status: string;
    appliedAt: string;
  }>;
  skillGaps?: {
    missingCriticalSkills: string[];
    missingRecommendedSkills: string[];
    matchingSkills: string[];
  };
}

export function calculateExplainableReadiness(
  summary: CareerProfileSummary,
  options?: {
    latestAtsScore?: number | null;
    interviewAverageScore?: number | null;
  }
): ExplainableReadinessResult {
  const roleSpec = findRoleSpecification(summary.targetRole);
  const student = summary.studentProfile;

  // 1. Technical Competency Quadrant (Weight 25%)
  const verifiedMap = new Map(summary.skills.verified.map((v) => [v.name.toLowerCase(), v]));
  const claimedSet = new Set(summary.skills.claimed.map((c) => c.name.toLowerCase()));
  const inferredSet = new Set(summary.skills.inferred.map((i) => i.name.toLowerCase()));

  let criticalVerifiedCount = 0;
  let criticalKnownCount = 0;
  const techStrengths: string[] = [];
  const techRecs: string[] = [];

  for (const crit of roleSpec.criticalSkills) {
    const lower = crit.toLowerCase();
    if (verifiedMap.has(lower)) {
      criticalVerifiedCount++;
      criticalKnownCount++;
      techStrengths.push(`Verified proficiency in ${crit}`);
    } else if (claimedSet.has(lower) || inferredSet.has(lower)) {
      criticalKnownCount++;
      techRecs.push(`Take proctored assessment for ${crit} to verify your claim`);
    } else {
      techRecs.push(`Learn core requirement: ${crit}`);
    }
  }

  const criticalRatio = criticalKnownCount / Math.max(1, roleSpec.criticalSkills.length);
  const verifiedBonus = Math.min(30, criticalVerifiedCount * 10);
  const technicalScore = Math.min(100, Math.round(criticalRatio * 70 + verifiedBonus));

  const technicalLevel: ReadinessQuadrant['level'] =
    technicalScore >= 80 ? 'Job-Ready' : technicalScore >= 60 ? 'Proficient' : technicalScore >= 40 ? 'Developing' : 'Novice';

  // 2. Project Evidence & Depth Quadrant (Weight 25%)
  const projects = student?.projects || [];
  let projectPoints = 0;
  const projectStrengths: string[] = [];
  const projectRecs: string[] = [];

  if (projects.length === 0) {
    projectPoints = 25; // baseline for early students
    projectRecs.push('Add at least 2 capstone or academic projects with tech stacks and GitHub links.');
  } else {
    projectPoints += Math.min(50, projects.length * 25);
    let withRepo = 0;
    let withLive = 0;
    let withRichTech = 0;

    for (const p of projects) {
      if (p.repoUrl) withRepo++;
      if (p.liveUrl) withLive++;
      if (p.techStack && p.techStack.length >= 2) withRichTech++;
    }

    if (withRepo > 0) {
      projectPoints += Math.min(20, withRepo * 10);
      projectStrengths.push(`${withRepo} project(s) backed by public code repositories`);
    } else {
      projectRecs.push('Link public GitHub repositories to your projects for technical verification.');
    }

    if (withLive > 0) {
      projectPoints += Math.min(15, withLive * 10);
      projectStrengths.push(`${withLive} project(s) deployed with live demos`);
    } else {
      projectRecs.push('Deploy at least one project live (e.g. Vercel, Netlify, Render).');
    }

    if (withRichTech > 0) {
      projectPoints += 15;
      projectStrengths.push(`Documented practical tech stacks matching industry tooling`);
    }
  }
  const projectScore = Math.min(100, projectPoints);
  const projectLevel: ReadinessQuadrant['level'] =
    projectScore >= 80 ? 'Job-Ready' : projectScore >= 60 ? 'Proficient' : projectScore >= 40 ? 'Developing' : 'Novice';

  // 3. Resume ATS Strength Quadrant (Weight 25%)
  let resumeScore = 30; // base if none created
  const resumeStrengths: string[] = [];
  const resumeRecs: string[] = [];

  if (options?.latestAtsScore !== undefined && options.latestAtsScore !== null) {
    resumeScore = Math.max(20, Math.min(100, options.latestAtsScore));
    if (resumeScore >= 75) {
      resumeStrengths.push(`Strong ATS compatibility (${resumeScore}/100) on active resume`);
    } else {
      resumeRecs.push(`Improve resume ATS score (currently ${resumeScore}/100) using action verbs and quantifiable metrics`);
    }
  } else if (summary.metrics.savedResumesCount > 0) {
    resumeScore = 65;
    resumeStrengths.push('Resume created and saved in career workspace');
    resumeRecs.push('Run full ATS analysis to optimize keyword density for target role');
  } else {
    resumeRecs.push('Build your foundational resume in the Resume Builder');
  }
  const resumeLevel: ReadinessQuadrant['level'] =
    resumeScore >= 80 ? 'Job-Ready' : resumeScore >= 60 ? 'Proficient' : resumeScore >= 40 ? 'Developing' : 'Novice';

  // 4. Interview Fluency Quadrant (Weight 25%)
  let interviewScore = 35; // base
  const interviewStrengths: string[] = [];
  const interviewRecs: string[] = [];

  if (options?.interviewAverageScore !== undefined && options.interviewAverageScore !== null) {
    interviewScore = Math.max(25, Math.min(100, options.interviewAverageScore));
    if (interviewScore >= 75) {
      interviewStrengths.push(`Solid technical interview performance (Average ${interviewScore}%)`);
    } else {
      interviewRecs.push('Practice mock interviews with AI to improve STAR structured explanations');
    }
  } else if (summary.recentAssessments.length > 0) {
    interviewScore = 55;
    interviewStrengths.push('Proven conceptual foundation through proctored assessments');
    interviewRecs.push('Complete an AI mock interview session in the Interview Studio');
  } else {
    interviewRecs.push('Complete your first mock interview to evaluate technical communication');
  }
  const interviewLevel: ReadinessQuadrant['level'] =
    interviewScore >= 80 ? 'Job-Ready' : interviewScore >= 60 ? 'Proficient' : interviewScore >= 40 ? 'Developing' : 'Novice';

  // Overall Weighted Score
  const overallScore = Math.round(
    0.25 * technicalScore + 0.25 * projectScore + 0.25 * resumeScore + 0.25 * interviewScore
  );

  const overallLevel: ExplainableReadinessResult['overallLevel'] =
    overallScore >= 85 ? 'Career Ready' : overallScore >= 70 ? 'Competitive' : overallScore >= 50 ? 'Developing' : 'Novice';

  const priorityActions: ExplainableReadinessResult['priorityActions'] = [];

  if (projects.length < 2) {
    priorityActions.push({
      title: 'Add Portfolio Projects',
      description: 'Document 2+ practical academic or personal projects with technologies and GitHub links.',
      href: '/dashboard/profile',
      impact: 'high',
      actionText: 'Update Profile',
    });
  }

  if (techRecs.length > 0) {
    const unverified = summary.skills.needingAssessment[0] || roleSpec.criticalSkills[0];
    priorityActions.push({
      title: `Verify ${unverified} Skill`,
      description: `Take a 10-question proctored evaluation to prove technical competency in ${unverified}.`,
      href: `/skills/assess/${encodeURIComponent(unverified)}`,
      impact: 'high',
      actionText: 'Take Assessment',
    });
  }

  if (resumeScore < 75) {
    priorityActions.push({
      title: 'Optimize ATS Resume Score',
      description: 'Format bullet points with measurable impact and align keywords with entry-level standards.',
      href: '/improver',
      impact: 'high',
      actionText: 'Improve Resume',
    });
  }

  if (options?.interviewAverageScore === undefined || options?.interviewAverageScore === null) {
    priorityActions.push({
      title: 'Practice First Mock Interview',
      description: `Test your skills against typical ${roleSpec.title} interview questions with real-time AI evaluation.`,
      href: '/interview-prep',
      impact: 'medium',
      actionText: 'Start Interview',
    });
  }

  return {
    overallScore,
    overallLevel,
    summary: `${roleSpec.title} readiness is currently evaluated at ${overallScore}/100 (${overallLevel}).`,
    quadrants: {
      technicalCompetency: {
        name: 'Technical Competency',
        score: technicalScore,
        weight: 25,
        level: technicalLevel,
        summary: `${criticalKnownCount} of ${roleSpec.criticalSkills.length} critical skills demonstrated (${criticalVerifiedCount} verified).`,
        strengths: techStrengths.length > 0 ? techStrengths : ['Demonstrated baseline technical interest'],
        recommendations: techRecs.slice(0, 3),
      },
      projectEvidence: {
        name: 'Project Evidence & Depth',
        score: projectScore,
        weight: 25,
        level: projectLevel,
        summary: `${projects.length} project(s) documented with practical engineering evidence.`,
        strengths: projectStrengths.length > 0 ? projectStrengths : ['Foundational project coursework underway'],
        recommendations: projectRecs.slice(0, 3),
      },
      resumeAts: {
        name: 'Resume ATS Strength',
        score: resumeScore,
        weight: 25,
        level: resumeLevel,
        summary: `Resume ATS compliance evaluated at ${resumeScore}/100.`,
        strengths: resumeStrengths.length > 0 ? resumeStrengths : ['Standard resume draft in place'],
        recommendations: resumeRecs.slice(0, 3),
      },
      interviewFluency: {
        name: 'Interview Fluency',
        score: interviewScore,
        weight: 25,
        level: interviewLevel,
        summary: `Communication and problem-solving fluency scored at ${interviewScore}/100.`,
        strengths: interviewStrengths.length > 0 ? interviewStrengths : ['Ready to begin structured interview practice'],
        recommendations: interviewRecs.slice(0, 3),
      },
    },
    keyStrengths: [
      ...techStrengths.slice(0, 2),
      ...projectStrengths.slice(0, 2),
      ...resumeStrengths.slice(0, 1),
    ].slice(0, 4),
    priorityActions: priorityActions.slice(0, 3),
  };
}

export async function getCareerProfileSummary(userId: string): Promise<CareerProfileSummary> {
  const unified = await buildUnifiedStudentContext(userId);
  return mapUnifiedToCareerProfileSummary(unified);
}

// ============================================================================
// 2. SKILL GAP ANALYSIS
// ============================================================================

export interface SkillGapAnalysisResult {
  targetRole: string;
  readinessScore: number;
  matchingSkills: Array<{ name: string; verified: boolean; level: string }>;
  missingCriticalSkills: string[];
  missingRecommendedSkills: string[];
  analysisSummary: string;
  priorityActions: string[];
}

export async function performSkillGapAnalysis(
  currentSkills: string[],
  targetRole: string,
  targetJobDescription?: string
): Promise<SkillGapAnalysisResult> {
  const roleSpec = findRoleSpecification(targetRole);
  const normalizedCurrent = new Set((currentSkills || []).map((s) => s.trim().toLowerCase()));

  // Deterministic calculation
  const matchingSkills: Array<{ name: string; verified: boolean; level: string }> = [];
  const missingCriticalSkills: string[] = [];
  const missingRecommendedSkills: string[] = [];

  for (const crit of roleSpec.criticalSkills) {
    if (normalizedCurrent.has(crit.toLowerCase())) {
      matchingSkills.push({ name: crit, verified: false, level: 'Proficient' });
    } else {
      missingCriticalSkills.push(crit);
    }
  }

  for (const rec of roleSpec.recommendedSkills) {
    if (normalizedCurrent.has(rec.toLowerCase())) {
      matchingSkills.push({ name: rec, verified: false, level: 'Familiar' });
    } else {
      missingRecommendedSkills.push(rec);
    }
  }

  // Any other current skills that aren't in standard lists
  for (const cur of currentSkills) {
    const isAlreadyMatched = matchingSkills.some((m) => m.name.toLowerCase() === cur.toLowerCase());
    if (!isAlreadyMatched) {
      matchingSkills.push({ name: cur, verified: false, level: 'Working Knowledge' });
    }
  }

  const criticalWeight = roleSpec.criticalSkills.length > 0
    ? (roleSpec.criticalSkills.length - missingCriticalSkills.length) / roleSpec.criticalSkills.length
    : 1;
  const recommendedWeight = roleSpec.recommendedSkills.length > 0
    ? (roleSpec.recommendedSkills.length - missingRecommendedSkills.length) / roleSpec.recommendedSkills.length
    : 1;

  const readinessScore = Math.min(100, Math.round(criticalWeight * 70 + recommendedWeight * 30));

  const priorityActions = [
    ...(missingCriticalSkills.length > 0
      ? [`Master critical core skills: ${missingCriticalSkills.slice(0, 3).join(', ')}.`]
      : []),
    'Take Smart Resume AI skill assessments to earn verified credentials for proven qualifications.',
    'Build an end-to-end portfolio project applying missing skills in realistic production workflows.',
    'Tailor resume bullet points using quantifiable metrics to prove business impact with your matched skills.',
  ];

  const analysisSummary = `For ${roleSpec.title}, your profile demonstrates ${readinessScore}% technical alignment. ${
    missingCriticalSkills.length > 0
      ? `Addressing gaps in ${missingCriticalSkills.slice(0, 2).join(' and ')} will significantly boost your interview callback rate.`
      : 'You meet the core qualification requirements for this target role.'
  }`;

  // If Gemini is available, attempt qualitative summary enrichment
  if (aiClient) {
    try {
      const prompt = buildCareerRoadmapEnrichmentPrompt({
        roleTitle: roleSpec.title,
        currentSkills,
        missingCriticalSkills,
        missingRecommendedSkills,
        targetJobDescription,
      });

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withGeminiTimeout(aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }), model);
          if (res?.text) {
            const parsed = JSON.parse(res.text.trim());
            if (parsed.analysisSummary && Array.isArray(parsed.priorityActions)) {
              return {
                targetRole: roleSpec.title,
                readinessScore,
                matchingSkills,
                missingCriticalSkills,
                missingRecommendedSkills,
                analysisSummary: parsed.analysisSummary,
                priorityActions: parsed.priorityActions.slice(0, 4),
              };
            }
          }
        } catch {}
      }
    } catch {}
  }

  return {
    targetRole: roleSpec.title,
    readinessScore,
    matchingSkills,
    missingCriticalSkills,
    missingRecommendedSkills,
    analysisSummary,
    priorityActions,
  };
}

// ============================================================================
// 3. PERSONALIZED LEARNING ROADMAP GENERATION
// ============================================================================

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  skillsCovered: string[];
  estimatedHours: number;
  completed: boolean;
  assessmentSkill?: SupportedSkill;
  verifiedResources: Array<{
    title: string;
    channelName: string;
    duration: string;
    url: string;
    keyTakeaway: string;
  }>;
}

export interface RoadmapMilestone {
  id: string;
  phase: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  steps: RoadmapStep[];
}

export interface PortfolioProjectBlueprint {
  id: string;
  title: string;
  targetRole: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  problemStatement: string;
  techStack: string[];
  architectureHighlights: string[];
  databaseSchema: string[];
  suggestedResumeBullets: string[];
}

export interface LearningRoadmapData {
  targetRole: string;
  totalEstimatedWeeks: number;
  overview: string;
  milestones: RoadmapMilestone[];
  portfolioProjects?: PortfolioProjectBlueprint[];
}

export function generateLearningRoadmap(
  targetRole: string,
  missingSkills: string[] = []
): LearningRoadmapData {
  const roleSpec = findRoleSpecification(targetRole);
  const skillsToAddress = missingSkills.length > 0 ? missingSkills : roleSpec.criticalSkills;

  // Helper to attach verified resources
  function getResourcesForSkill(skillName: string) {
    const sLower = skillName.toLowerCase();
    let matched = Object.keys(YOUTUBE_ROADMAPS).find(
      (k) => k.toLowerCase() === sLower
    ) as SupportedSkill | undefined;

    if (!matched) {
      if (sLower.includes('script') || sLower.includes('node') || sLower.includes('web') || sLower.includes('front')) matched = 'JavaScript';
      else if (sLower.includes('sql') || sLower.includes('data') || sLower.includes('db')) matched = 'SQL';
      else if (sLower.includes('react') || sLower.includes('ui') || sLower.includes('next')) matched = 'React';
      else if (sLower.includes('cloud') || sLower.includes('docker') || sLower.includes('devops') || sLower.includes('aws')) matched = 'AWS';
      else if (sLower.includes('git') || sLower.includes('version')) matched = 'Git';
      else if (sLower.includes('python') || sLower.includes('ml') || sLower.includes('ai')) matched = 'Python';
      else matched = 'JavaScript'; // Default to foundational web & programming curriculum
    }

    if (matched && YOUTUBE_ROADMAPS[matched]) {
      return YOUTUBE_ROADMAPS[matched].resources.map((r) => ({
        title: r.title,
        channelName: r.channelName,
        duration: r.duration,
        url: r.youtubeUrl,
        keyTakeaway: r.keyTakeaway,
      }));
    }
    return [];
  }

  // Phase 1: Foundations
  const phase1Skills = skillsToAddress.slice(0, 2);
  const phase1Steps: RoadmapStep[] = phase1Skills.map((sk, idx) => ({
    id: `step-f-${idx + 1}`,
    title: `Master ${sk} Fundamentals & Core Syntax`,
    description: `Understand language semantics, object models, data structures, and standard libraries.`,
    skillsCovered: [sk],
    estimatedHours: 10,
    completed: false,
    assessmentSkill: (['Python', 'JavaScript', 'Java', 'SQL', 'React', 'Git', 'AWS'] as SupportedSkill[]).find(
      (s) => s.toLowerCase() === sk.toLowerCase()
    ),
    verifiedResources: getResourcesForSkill(sk),
  }));

  // Phase 2: Application & Frameworks
  const phase2Skills = skillsToAddress.slice(2, 4);
  const phase2Steps: RoadmapStep[] = (phase2Skills.length > 0 ? phase2Skills : ['REST APIs', 'Database Architecture']).map(
    (sk, idx) => ({
      id: `step-a-${idx + 1}`,
      title: `Build Production Features with ${sk}`,
      description: `Implement modular architecture, state management, secure validation, and error boundaries.`,
      skillsCovered: [sk],
      estimatedHours: 14,
      completed: false,
      assessmentSkill: (['Python', 'JavaScript', 'Java', 'SQL', 'React', 'Git', 'AWS'] as SupportedSkill[]).find(
        (s) => s.toLowerCase() === sk.toLowerCase()
      ),
      verifiedResources: getResourcesForSkill(sk),
    })
  );

  // Phase 3: Systems, Cloud & Deployment
  const phase3Steps: RoadmapStep[] = [
    {
      id: 'step-sys-1',
      title: 'Containerization, CI/CD & Cloud Deployment',
      description: 'Package applications using Docker, configure automated testing workflows, and deploy to modern cloud providers.',
      skillsCovered: ['Docker', 'AWS', 'CI/CD'],
      estimatedHours: 12,
      completed: false,
      assessmentSkill: 'AWS',
      verifiedResources: getResourcesForSkill('AWS'),
    },
    {
      id: 'step-sys-2',
      title: 'System Design & Performance Optimization',
      description: 'Design distributed architectures, cache layer patterns (Redis), and database query indexing strategies.',
      skillsCovered: ['System Design', 'SQL', 'Performance'],
      estimatedHours: 16,
      completed: false,
      assessmentSkill: 'SQL',
      verifiedResources: getResourcesForSkill('SQL'),
    },
  ];

  // Phase 4: Capstone & Verified Certification
  const phase4Steps: RoadmapStep[] = [
    {
      id: 'step-cap-1',
      title: 'End-to-End Capstone Project Verification',
      description: `Engineer a full-fledged production project showcasing ${skillsToAddress.slice(0, 3).join(', ')} with automated unit tests and clear documentation.`,
      skillsCovered: skillsToAddress.slice(0, 3),
      estimatedHours: 20,
      completed: false,
      assessmentSkill: (['Python', 'JavaScript', 'React', 'Java'] as SupportedSkill[]).find((s) =>
        skillsToAddress.some((sk) => sk.toLowerCase() === s.toLowerCase())
      ),
      verifiedResources: getResourcesForSkill('Git'),
    },
    {
      id: 'step-cap-2',
      title: 'Pass Smart Resume AI Proctored Skill Assessments',
      description: 'Take 10-question technical assessments under anti-cheat proctoring to earn cryptographic badges and elevate your hiring profile.',
      skillsCovered: ['Proctored Assessment', 'Credentialing'],
      estimatedHours: 4,
      completed: false,
      assessmentSkill: (['Python', 'JavaScript', 'React', 'Java', 'SQL'] as SupportedSkill[]).find((s) =>
        skillsToAddress.some((sk) => sk.toLowerCase() === s.toLowerCase())
      ) || 'React',
      verifiedResources: [],
    },
  ];

  const milestones: RoadmapMilestone[] = [
    {
      id: 'm-1',
      phase: 'Phase 1',
      title: 'Foundations & Core Syntax',
      description: 'Establish rock-solid understanding of underlying languages and fundamental programming principles.',
      estimatedWeeks: 2,
      steps: phase1Steps,
    },
    {
      id: 'm-2',
      phase: 'Phase 2',
      title: 'Frameworks & Practical Architecture',
      description: 'Construct real-world components, clean service layers, and robust application data flow.',
      estimatedWeeks: 3,
      steps: phase2Steps,
    },
    {
      id: 'm-3',
      phase: 'Phase 3',
      title: 'Cloud Infrastructure & High-Scale Systems',
      description: 'Master containerization, deployment pipelines, cloud hosting, and scalability best practices.',
      estimatedWeeks: 3,
      steps: phase3Steps,
    },
    {
      id: 'm-4',
      phase: 'Phase 4',
      title: 'Capstone Proof & Credential Verification',
      description: 'Prove competence through verified proctored evaluations and an impactful GitHub capstone repository.',
      estimatedWeeks: 2,
      steps: phase4Steps,
    },
  ];

  const portfolioProjects = generatePortfolioBlueprints(roleSpec.title, skillsToAddress);

  return {
    targetRole: roleSpec.title,
    totalEstimatedWeeks: 10,
    overview: `A structured 10-week technical mastery roadmap designed specifically for candidates targeting ${roleSpec.title} roles, incorporating verified video masterclasses, verifiable skill assessments, and industry-grade portfolio project blueprints.`,
    milestones,
    portfolioProjects,
  };
}

function generatePortfolioBlueprints(
  targetRole: string,
  missingSkills: string[]
): PortfolioProjectBlueprint[] {
  const roleLower = targetRole.toLowerCase();

  if (roleLower.includes('data') || roleLower.includes('analyst') || roleLower.includes('ml')) {
    return [
      {
        id: 'bp-data-1',
        title: 'Real-Time Streaming Analytics & ETL Dashboard',
        targetRole,
        difficulty: 'Intermediate',
        problemStatement:
          'Organizations struggle to extract real-time insights from clickstream and sales logs due to disjointed batch ETL pipelines.',
        techStack: ['Python', 'Pandas', 'PostgreSQL', 'FastAPI', 'Docker', ...missingSkills.slice(0, 2)],
        architectureHighlights: [
          'Automated data ingestion pipeline parsing semi-structured JSON feeds into normalized SQL tables',
          'FastAPI caching layer reducing analytical query latency by 45%',
          'Interactive Streamlit or Next.js front-end visualizing cohort retention curves and KPI trends',
        ],
        databaseSchema: [
          'raw_events (id, event_type, payload JSONB, created_at)',
          'dim_users (user_id, cohort_month, segment, ltv)',
          'fact_transactions (tx_id, user_id, amount, status, timestamp)',
          'daily_aggregates (date, active_users, total_revenue, conversion_rate)',
        ],
        suggestedResumeBullets: [
          'Engineered automated ETL batch pipelines in Python and SQL processing 50K+ transactional records with Pandas and PostgreSQL.',
          'Built an interactive analytics studio featuring cohort retention graphs and automated anomaly detection alerts.',
        ],
      },
      {
        id: 'bp-data-2',
        title: 'Customer Churn Predictor & Model Serving API',
        targetRole,
        difficulty: 'Advanced',
        problemStatement:
          'SaaS companies lose up to 15% ARR due to undetected customer attrition signals across user activity logs.',
        techStack: ['Python', 'Scikit-Learn', 'SQL', 'FastAPI', 'Docker'],
        architectureHighlights: [
          'Feature engineering pipeline computing rolling engagement metrics (recency, frequency, duration)',
          'Trained gradient-boosted decision trees achieving 88% ROC-AUC on holdout validation data',
          'Containerized microservice returning millisecond inference scores with explainable SHAP values',
        ],
        databaseSchema: [
          'customer_features (customer_id, login_count_30d, support_tickets, usage_drop_pct)',
          'model_predictions (id, customer_id, churn_probability, top_risk_factor, evaluated_at)',
        ],
        suggestedResumeBullets: [
          'Developed end-to-end churn prediction service with Scikit-Learn and FastAPI, achieving 88% ROC-AUC on historical SaaS benchmark data.',
          'Integrated SHAP value explanations into prediction payloads, enabling customer success teams to pinpoint key churn drivers.',
        ],
      },
    ];
  }

  if (roleLower.includes('cloud') || roleLower.includes('devops')) {
    return [
      {
        id: 'bp-cloud-1',
        title: 'Automated GitOps Infrastructure & Observability Mesh',
        targetRole,
        difficulty: 'Intermediate',
        problemStatement:
          'Engineering teams experience deployment drift and lack unified metrics and tracing for containerized microservices.',
        techStack: ['Docker', 'AWS', 'GitHub Actions', 'Prometheus', 'Grafana', ...missingSkills.slice(0, 2)],
        architectureHighlights: [
          'Multi-stage Docker builds reducing production image footprint by 60%',
          'Automated CI/CD pipeline running linting, unit tests, and Trivy security image scans on git push',
          'Unified Prometheus & Grafana telemetry tracking request rate, error rate, and p99 latency',
        ],
        databaseSchema: [
          'service_registry (id, service_name, container_image, port, status)',
          'deployment_events (id, commit_hash, environment, deployed_by, duration_ms, status)',
        ],
        suggestedResumeBullets: [
          'Containerized 3 polyglot microservices using multi-stage Dockerfiles, cutting deployment bundle size by 60%.',
          'Architected GitHub Actions CI/CD workflows with automated linting, vulnerability scanning, and zero-downtime deployment.',
        ],
      },
      {
        id: 'bp-cloud-2',
        title: 'Resilient Serverless File Ingestion & Transcoding Engine',
        targetRole,
        difficulty: 'Advanced',
        problemStatement:
          'High user uploads overwhelm monolithic backend servers causing memory exhaustion and dropped connections.',
        techStack: ['AWS', 'Python', 'Docker', 'SQL', 'Redis'],
        architectureHighlights: [
          'Presigned URL upload directly to cloud storage, bypassing web servers',
          'Event-driven worker consumers processing media asynchronously with retry backoff',
          'Dead-letter queues for unparseable artifacts with automated alert notifications',
        ],
        databaseSchema: [
          'upload_jobs (id, user_id, original_filename, s3_key, file_size, status)',
          'processed_assets (id, job_id, variant_type, output_url, processed_at)',
        ],
        suggestedResumeBullets: [
          'Designed event-driven serverless ingestion system on AWS handling asynchronous media processing with exponential backoff.',
          'Eliminated server upload bottlenecks by implementing presigned S3 uploads with client-side chunked checksums.',
        ],
      },
    ];
  }

  if (roleLower.includes('frontend') || roleLower.includes('ui') || roleLower.includes('web')) {
    return [
      {
        id: 'bp-fe-1',
        title: 'Collaborative Real-Time Canvas & Kanban Board',
        targetRole,
        difficulty: 'Intermediate',
        problemStatement:
          'Remote teams need responsive, keyboard-accessible Kanban workspaces with drag-and-drop state preservation.',
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', ...missingSkills.slice(0, 2)],
        architectureHighlights: [
          'Drag-and-drop interactions using accessible Pointer events and keyboard reordering',
          'Optimistic client updates with rollback on network disconnection',
          'Responsive design tested across desktop and mobile viewports with CSS grid and subgrid',
        ],
        databaseSchema: [
          'boards (id, title, user_id, created_at)',
          'columns (id, board_id, name, order_index)',
          'cards (id, column_id, title, description, priority, order_index)',
        ],
        suggestedResumeBullets: [
          'Engineered a responsive Kanban collaboration board in React and TypeScript with optimistic state updates and zero UI lag.',
          'Implemented WCAG 2.1 AA accessible drag-and-drop workflows supporting full keyboard navigation and screen readers.',
        ],
      },
      {
        id: 'bp-fe-2',
        title: 'Design System Component Library & Documentation Portal',
        targetRole,
        difficulty: 'Intermediate',
        problemStatement:
          'Frontend teams waste hundreds of hours duplicating UI primitives and struggling with inconsistent color tokens.',
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'CSS Modules'],
        architectureHighlights: [
          '30+ compound accessible UI components with full TypeScript prop validation',
          'Dual dark/light mode token theming powered by CSS custom variables',
          'Comprehensive component test suite verifying ARIA role compliance and interactive states',
        ],
        databaseSchema: [],
        suggestedResumeBullets: [
          'Built an enterprise design system in React/TypeScript featuring 30+ accessible components with 95% test coverage.',
          'Implemented dynamic theme switching using CSS custom properties with zero runtime style recalculation overhead.',
        ],
      },
    ];
  }

  // Default: Full Stack, Software Engineer, Backend, SDE-1
  return [
    {
      id: 'bp-fs-1',
      title: 'High-Throughput Collaborative Task & Workflow Engine',
      targetRole,
      difficulty: 'Intermediate',
      problemStatement:
        'Teams need low-latency collaborative project workspaces with conflict-free status updates and role-based access control.',
      techStack: ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', ...missingSkills.slice(0, 2)],
      architectureHighlights: [
        'End-to-end type safety across client and server with Zod schema validation',
        'Redis caching and debounced mutations reducing database load by 40%',
        'Comprehensive REST API with JWT session tokens and rate limiting guards',
      ],
      databaseSchema: [
        'users (id, email, password_hash, role, created_at)',
        'workspaces (id, name, owner_id, slug)',
        'tasks (id, workspace_id, title, status, priority, due_date, assigned_to)',
        'audit_logs (id, task_id, action, changed_by, timestamp)',
      ],
      suggestedResumeBullets: [
        'Architected a full-stack collaborative workflow platform with Next.js, TypeScript, and PostgreSQL, cutting API latency by 35%.',
        'Engineered type-safe REST endpoints with Zod validation, JWT session handling, and Docker containerized deployment.',
      ],
    },
    {
      id: 'bp-fs-2',
      title: 'Scalable E-Commerce Micro-Catalog & Payment Gateway',
      targetRole,
      difficulty: 'Advanced',
      problemStatement:
        'E-commerce merchants lose orders during flash sales due to database race conditions and payment webhook dropouts.',
      techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'TypeScript'],
      architectureHighlights: [
        'Transactional inventory reservation using PostgreSQL row-level locks to prevent overselling',
        'Idempotent payment webhook pipeline with replay deduplication and audit trail logging',
        'Docker Compose multi-container setup orchestrating API, PostgreSQL, and Redis cache',
      ],
      databaseSchema: [
        'products (id, name, description, price, sku, is_active)',
        'inventory (product_id, available_stock, reserved_stock, version)',
        'orders (id, user_id, total_amount, payment_status, created_at)',
        'order_items (id, order_id, product_id, quantity, unit_price)',
        'webhook_logs (id, idempotency_key, event_type, status, processed_at)',
      ],
      suggestedResumeBullets: [
        'Engineered transactional checkout backend supporting concurrent order reservations with PostgreSQL isolation levels to eliminate race conditions.',
        'Integrated Stripe API webhook pipelines with idempotent event deduping and automated email delivery using Node.js and AWS SES.',
      ],
    },
  ];
}

// ============================================================================
// 4. INTERVIEW QUESTION GENERATION & EVALUATION
// ============================================================================

export interface InterviewQuestion {
  id: string;
  category: 'technical' | 'behavioral' | 'system_design' | 'practical';
  question: string;
  context: string;
  gradingCriteria: string[];
  sampleStrongAnswer: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface InterviewAnswerEvaluation {
  score: number; // 0-100
  technicalAccuracyScore?: number; // 0-100
  communicationScore?: number; // 0-100
  readinessLevel: 'Needs Improvement' | 'Developing' | 'Strong' | 'Exemplary';
  strengths: string[];
  areasForImprovement: string[];
  sampleRefinement: string;
  starFeedback?: {
    situationTask: string;
    action: string;
    result: string;
  };
  disclaimer?: string;
}

export async function generateInterviewQuestions(
  targetRole: string,
  jobDescription?: string,
  resumeSnippet?: string
): Promise<InterviewQuestion[]> {
  const roleSpec = findRoleSpecification(targetRole);

  // Deterministic high-quality default question sets by role
  const deterministicQuestions: Record<string, InterviewQuestion[]> = {
    'full stack developer': [
      {
        id: 'q-1',
        category: 'technical',
        question: 'Explain how React’s Virtual DOM and reconciliation algorithm work, and describe when you would use useMemo or useCallback to prevent performance regressions.',
        context: 'Assesses deep frontend rendering mechanics, component lifecycle, and memory vs execution trade-offs.',
        gradingCriteria: [
          'Explains tree diffing heuristic and batching updates.',
          'Mentions referential equality traps for functions/objects passed to child props.',
          'Acknowledges that premature memoization introduces overhead.',
        ],
        sampleStrongAnswer:
          'React maintains an in-memory Virtual DOM tree representing the desired UI state. When state changes, a new Virtual DOM tree is created and diffed against the previous snapshot using a heuristic O(n) reconciliation algorithm. To optimize rendering, useMemo caches expensive computation values between re-renders, while useCallback preserves function instance referential equality when passed to memoized child components to avoid unnecessary downstream re-renders.',
      },
      {
        id: 'q-2',
        category: 'system_design',
        question: 'How do you design a robust, secure authentication system between a Next.js / React client and a stateless backend API?',
        context: 'Tests understanding of modern web security, token handling, and session state.',
        gradingCriteria: [
          'Recommends httpOnly, secure, SameSite cookies to mitigate XSS/CSRF.',
          'Differentiates short-lived access tokens and revocable refresh tokens.',
          'Mentions rate limiting and secret signing mechanisms.',
        ],
        sampleStrongAnswer:
          'I recommend a short-lived JWT access token stored in memory or delivered via httpOnly, secure, SameSite=Strict cookies to protect against XSS token extraction. For session persistence, a refresh token is stored in a separate secure cookie and rotated on every issuance, tracked in a server-side Redis or database store for instant revocation when anomalous activity is detected.',
      },
      {
        id: 'q-3',
        category: 'behavioral',
        question: 'Describe a situation where a production defect or outage occurred under your watch. How did you diagnose, mitigate, and prevent recurrence?',
        context: 'STAR framework evaluation of accountability, debugging under pressure, and post-mortem discipline.',
        gradingCriteria: [
          'Clear Situation/Task detailing the failure impact.',
          'Concrete Action demonstrating systematic root cause analysis without finger-pointing.',
          'Measurable Result and long-term preventative instrumentation.',
        ],
        sampleStrongAnswer:
          'In my previous role, an unindexed database query caused 504 gateway timeouts during a flash sale. I immediately correlated APM traces to the bottleneck endpoint, deployed a temporary hotfix adding an index to the foreign key column, and resolved the degradation within 14 minutes. In the post-mortem, I implemented pre-merge query-plan audits and automated alerting for slow queries exceeding 200ms.',
      },
      {
        id: 'q-4',
        category: 'practical',
        question: 'When designing a relational database schema for high write throughput, what strategies do you apply to prevent deadlocks and connection pool exhaustion?',
        context: 'Evaluates backend data modeling and transaction isolation.',
        gradingCriteria: [
          'Acquiring locks in consistent order across transactions.',
          'Keeping database transactions as brief as possible.',
          'Employing connection pooling (e.g. PgBouncer) and read replicas.',
        ],
        sampleStrongAnswer:
          'To prevent deadlocks, transactions must access and update rows in a strictly defined canonical order (e.g. sorted by ID). Transactions must be kept minimal by preparing data before opening the connection. For connection pooling, using proxies like PgBouncer prevents client spikes from overwhelming database workers, while moving read-heavy analytics to read-replicas protects write availability.',
      },
      {
        id: 'q-5',
        category: 'technical',
        question: 'What is the difference between optimistic UI updates and pessimistic UI updates, and how do you handle rollback when a server request fails?',
        context: 'Measures user experience engineering and fault-tolerant frontend architecture.',
        gradingCriteria: [
          'Explains immediate UI feedback before network response in optimistic patterns.',
          'Describes storing previous state snapshot to restore upon promise rejection.',
          'Mentions informing the user gracefully without losing their inputs.',
        ],
        sampleStrongAnswer:
          'In pessimistic updates, the UI waits for server acknowledgement before reflecting changes, ensuring strict accuracy at the cost of perceived latency. Optimistic updates render changes immediately assuming success, while holding a snapshot of the prior state. If the API returns an error, the client rolls back to the snapshot, restores user input, and surfaces an actionable retry notification.',
      },
    ],
  };

  // If Gemini is available, generate dynamically tailored questions
  if (aiClient) {
    try {
      const prompt = buildInterviewQuestionsPrompt({
        roleTitle: roleSpec.title,
        jobDescription,
        resumeSnippet,
      });

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withGeminiTimeout(aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.4,
              responseMimeType: 'application/json',
            },
          }), model);
          if (res?.text) {
            const parsed = JSON.parse(res.text.trim());
            if (Array.isArray(parsed) && parsed.length >= 3) {
              recordGeminiProviderStatus('Interview question generation', 'Gemini', model);
              return parsed.slice(0, 5).map((q, idx) => ({
                id: `q-${idx + 1}`,
                category: q.category || 'technical',
                question: q.question,
                context: q.context || '',
                gradingCriteria: Array.isArray(q.gradingCriteria) ? q.gradingCriteria : [],
                sampleStrongAnswer: q.sampleStrongAnswer || '',
              }));
            }
          }
        } catch {}
      }
    } catch {}
  }

  // Fallback to deterministic questions for the role
  recordGeminiProviderStatus('Interview question generation', 'deterministic');
  const normalizedRole = targetRole.toLowerCase();
  for (const [key, questions] of Object.entries(deterministicQuestions)) {
    if (normalizedRole.includes(key) || key.includes(normalizedRole)) {
      return questions;
    }
  }

  return deterministicQuestions['full stack developer'];
}

export async function evaluateInterviewAnswer(
  question: InterviewQuestion | string | any,
  userAnswer: string,
  targetRole: string
): Promise<InterviewAnswerEvaluation> {
  const cleanAnswer = (userAnswer || '').trim();

  // Normalize question input whether provided as string, partial object, or InterviewQuestion
  const normalizedQuestion: InterviewQuestion = typeof question === 'string'
    ? {
        id: 'adhoc_q',
        category: 'technical',
        question: question,
        context: 'Technical interview practice scenario',
        gradingCriteria: [
          'Technical accuracy and completeness',
          'Architecture, caching, and database transactions',
          'Error handling, edge cases, and reliability',
        ],
        sampleStrongAnswer: 'A structured technical answer articulating system design, key mechanisms, and trade-offs.',
      }
    : {
        id: question?.id || 'q_eval',
        category: (question?.category as any) || 'technical',
        question: question?.question || 'Technical scenario question',
        context: question?.context || 'Technical interview practice scenario',
        gradingCriteria: Array.isArray(question?.gradingCriteria) && question.gradingCriteria.length > 0
          ? question.gradingCriteria
          : [
              'Technical accuracy and completeness',
              'Architecture, caching, and database transactions',
              'Error handling and edge cases',
            ],
        sampleStrongAnswer: question?.sampleStrongAnswer || 'A structured technical response demonstrating depth.',
      };

  // Baseline deterministic heuristics if answer is very brief or empty
  if (cleanAnswer.length < 20) {
    return {
      score: 25,
      technicalAccuracyScore: 20,
      communicationScore: 30,
      readinessLevel: 'Needs Improvement',
      strengths: ['Attempted to provide an answer.'],
      areasForImprovement: [
        'Response is too brief. Elaborate with concrete technical mechanisms and real project examples.',
        'Address the core grading criteria explicitly.',
      ],
      sampleRefinement: normalizedQuestion.sampleStrongAnswer,
      disclaimer: 'Automated scoring is an educational practice tool and does not represent an official corporate hiring evaluation.',
    };
  }

  // If Gemini is available, perform deep semantic evaluation
  if (aiClient) {
    try {
      const prompt = buildInterviewAnswerEvaluationPrompt({
        targetRole,
        question: normalizedQuestion.question,
        gradingCriteria: normalizedQuestion.gradingCriteria,
        sampleStrongAnswer: normalizedQuestion.sampleStrongAnswer,
        candidateAnswer: cleanAnswer,
      });

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withGeminiTimeout(aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }), model);
          if (res?.text) {
            const parsed = JSON.parse(res.text.trim());
            if (typeof parsed.score === 'number' && Array.isArray(parsed.strengths)) {
              const overall = Math.min(100, Math.max(0, Math.round(parsed.score)));
              const techAcc = typeof parsed.technicalAccuracyScore === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.technicalAccuracyScore))) : overall;
              const comm = typeof parsed.communicationScore === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.communicationScore))) : overall;
              return {
                score: overall,
                technicalAccuracyScore: techAcc,
                communicationScore: comm,
                readinessLevel: parsed.readinessLevel || 'Developing',
                strengths: parsed.strengths.slice(0, 3),
                areasForImprovement: Array.isArray(parsed.areasForImprovement)
                  ? parsed.areasForImprovement.slice(0, 3)
                  : [],
                sampleRefinement: parsed.sampleRefinement || normalizedQuestion.sampleStrongAnswer,
                starFeedback: parsed.starFeedback,
                disclaimer: 'Automated scoring is an educational practice tool and does not represent an official corporate hiring evaluation.',
              };
            }
          }
        } catch {}
      }
    } catch {}
  }

  // Deterministic fallback evaluation based on word count & keyword matches
  const words = cleanAnswer.split(/\s+/).length;
  let score = 50;
  if (words > 40) score += 15;
  if (words > 80) score += 15;

  let matchedCriteria = 0;
  for (const crit of normalizedQuestion.gradingCriteria) {
    const tokens = crit.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
    if (tokens.some((tok) => cleanAnswer.toLowerCase().includes(tok))) {
      matchedCriteria++;
    }
  }
  score += Math.min(20, matchedCriteria * 7);
  score = Math.min(95, score);

  const commScore = Math.min(95, Math.max(40, Math.round(words > 50 ? 80 : 60)));
  const readinessLevel =
    score >= 85 ? 'Strong' : score >= 70 ? 'Developing' : 'Needs Improvement';

  return {
    score,
    technicalAccuracyScore: score,
    communicationScore: commScore,
    readinessLevel,
    strengths: [
      'Communicated key conceptual terms relevant to the topic.',
      'Demonstrated foundational working understanding of the asked scenario.',
    ],
    areasForImprovement: [
      'Incorporate more quantifiable metrics or architectural trade-offs.',
      'Explicitly structure responses using the STAR method (Situation, Task, Action, Result).',
    ],
    sampleRefinement: normalizedQuestion.sampleStrongAnswer,
    disclaimer: 'Automated scoring is an educational practice tool and does not represent an official corporate hiring evaluation.',
  };
}

// ============================================================================
// 5. NATURAL LANGUAGE JOB SEARCH PARSER
// ============================================================================

export interface ParsedJobSearchQuery {
  keywords: string;
  location: string;
  workplaceType?: WorkplaceType;
  experienceLevel?: 'Entry' | 'Mid' | 'Senior';
  contractType?: EmploymentType;
  explanation: string;
}

export async function parseNaturalLanguageJobQuery(
  naturalQuery: string
): Promise<ParsedJobSearchQuery> {
  const query = (naturalQuery || '').trim();

  // Deterministic regex parsing
  let location = '';
  let workplaceType: WorkplaceType | undefined = undefined;
  let experienceLevel: 'Entry' | 'Mid' | 'Senior' | undefined = undefined;
  let contractType: EmploymentType | undefined = undefined;

  const lower = query.toLowerCase();

  // Detect workplace type
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) {
    workplaceType = 'Remote';
  } else if (lower.includes('hybrid')) {
    workplaceType = 'Hybrid';
  } else if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-office')) {
    workplaceType = 'On-site';
  }

  // Detect experience level
  if (lower.includes('entry') || lower.includes('junior') || lower.includes('fresher') || lower.includes('graduate')) {
    experienceLevel = 'Entry';
  } else if (lower.includes('senior') || lower.includes('lead') || lower.includes('principal') || lower.includes('staff')) {
    experienceLevel = 'Senior';
  } else if (lower.includes('mid') || lower.includes('intermediate')) {
    experienceLevel = 'Mid';
  }

  // Detect contract type
  if (lower.includes('part-time') || lower.includes('part time')) {
    contractType = 'Part-time';
  } else if (lower.includes('contract') || lower.includes('freelance')) {
    contractType = 'Contract';
  } else if (lower.includes('intern') || lower.includes('internship')) {
    contractType = 'Internship';
  } else if (lower.includes('full-time') || lower.includes('full time')) {
    contractType = 'Full-time';
  }

  // Detect location patterns: "in <City>", "near <City>"
  const locMatch = query.match(/(?:in|near|around)\s+([A-Za-z\s]+?)(?:\s+(?:for|with|as|paying|over|\$|\d)|$)/i);
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim();
  }

  // Extract core keywords by stripping known location and modifier phrases
  let cleanedKeywords = query
    .replace(/(?:remote|hybrid|on-site|onsite|work from home|wfh)/gi, '')
    .replace(/(?:entry level|junior|senior|lead|principal|mid level|fresher|internship)/gi, '')
    .replace(/(?:full-time|part-time|contract|full time|part time)/gi, '')
    .replace(/(?:in|near|around)\s+([A-Za-z\s]+)/gi, '')
    .replace(/(?:jobs?|roles?|openings?|positions?|hiring)/gi, '')
    .trim();

  if (!cleanedKeywords) {
    cleanedKeywords = 'Software Engineer';
  }

  // Attempt Gemini NLP parsing if available
  if (aiClient) {
    try {
      const prompt = buildJobSearchNlpPrompt({ query });

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withGeminiTimeout(aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }), model);
          if (res?.text) {
            const parsed = JSON.parse(res.text.trim());
            if (parsed.keywords) {
              let parsedWp: WorkplaceType | undefined = undefined;
              if (parsed.workplaceType) {
                const wpLower = String(parsed.workplaceType).toLowerCase();
                if (wpLower.includes('remote')) parsedWp = 'Remote';
                else if (wpLower.includes('hybrid')) parsedWp = 'Hybrid';
                else if (wpLower.includes('site') || wpLower.includes('office')) parsedWp = 'On-site';
              }

              let parsedExp: 'Entry' | 'Mid' | 'Senior' | undefined = undefined;
              if (parsed.experienceLevel) {
                const expLower = String(parsed.experienceLevel).toLowerCase();
                if (expLower.includes('entry') || expLower.includes('junior')) parsedExp = 'Entry';
                else if (expLower.includes('senior') || expLower.includes('lead')) parsedExp = 'Senior';
                else if (expLower.includes('mid')) parsedExp = 'Mid';
              }

              let parsedContract: EmploymentType | undefined = undefined;
              if (parsed.contractType) {
                const ctLower = String(parsed.contractType).toLowerCase();
                if (ctLower.includes('full')) parsedContract = 'Full-time';
                else if (ctLower.includes('part')) parsedContract = 'Part-time';
                else if (ctLower.includes('contract')) parsedContract = 'Contract';
                else if (ctLower.includes('intern')) parsedContract = 'Internship';
              }

              return {
                keywords: parsed.keywords,
                location: parsed.location || '',
                workplaceType: parsedWp ?? workplaceType,
                experienceLevel: parsedExp ?? experienceLevel,
                contractType: parsedContract ?? contractType,
                explanation: parsed.explanation || `Interpreted query for ${parsed.keywords}.`,
              };
            }
          }
        } catch {}
      }
    } catch {}
  }

  return {
    keywords: cleanedKeywords,
    location,
    workplaceType,
    experienceLevel,
    contractType,
    explanation: `Extracted role "${cleanedKeywords}"${location ? ` in ${location}` : ''}${
      workplaceType ? ` (${workplaceType})` : ''
    }.`,
  };
}

// ============================================================================
// 6. DETERMINISTIC CAREER COPILOT ASSISTANT
// ============================================================================

export function getDeterministicCareerChatResponse(
  userMessage: string,
  profile?: CareerProfileSummary | null,
  unifiedContext?: UnifiedStudentContext | null,
  careerIntelligence?: CareerIntelligenceRecommendation | null
): string {
  const rawMsg = (userMessage || '').trim();
  const msg = rawMsg.toLowerCase();

  let ci = careerIntelligence;
  if (!ci && unifiedContext) {
    try {
      ci = generateCareerIntelligence(unifiedContext);
    } catch {
      ci = null;
    }
  }

  // 1. PROMPT INJECTION DEFENSE (Condition 3/5: Ignore previous instructions, reveal prompt, developer mode)
  const injectionPatterns = [
    'ignore previous instructions',
    'ignore all previous instructions',
    'system prompt',
    'reveal prompt',
    'reveal the prompt',
    'disregard instructions',
    'developer mode',
    'jailbreak',
    'override instructions',
    'repeat the prompt',
    'what are your instructions',
  ];
  if (injectionPatterns.some((pattern) => msg.includes(pattern))) {
    return "I am your Career Copilot. I can only assist with career planning, resume analysis, skill development, and job discovery based on your profile and goals.";
  }

  // 2. OFF-TOPIC DEFENSE (Condition 6: recipes, jokes, games, poems, math homework)
  const offTopicPatterns = [
    'recipe',
    'bake a cake',
    'chocolate chip',
    'write a poem',
    'tell a joke',
    'video game',
    'weather today',
    'capital of france',
    'homework help for calculus',
    'who won the world cup',
  ];
  if (offTopicPatterns.some((pattern) => msg.includes(pattern))) {
    return "I'm focused on helping you with your career journey, resume building, skill gaps, and job preparation. Let me know how I can help with your career goals!";
  }

  // 3. AI IDENTITY & NAME INQUIRIES
  if (
    msg.includes('your name') ||
    msg.includes('who are you') ||
    msg.includes('what are you called') ||
    msg.includes('are you alex') ||
    msg.includes('is your name alex') ||
    msg.includes('what is your name') ||
    msg === 'who are you?' ||
    msg === 'who are you' ||
    msg === 'what is your name?' ||
    msg === 'what is your name' ||
    msg === 'name?' ||
    msg === 'name'
  ) {
    return "I'm your AI Assistant. I specialize in empowering college students and fresh graduates to optimize resumes, bridge skill gaps, prepare for interviews, and accelerate their career launch. What are you working toward today?";
  }

  const rawTarget = (profile?.targetRole || unifiedContext?.careerGoal?.targetRole || '').trim();
  const isGoalSet = Boolean(
    rawTarget &&
    rawTarget.toLowerCase() !== 'goal not set' &&
    rawTarget.toLowerCase() !== 'not set' &&
    unifiedContext?.careerGoal?.goalSet !== false
  );
  const target = isGoalSet ? rawTarget : '';
  const displayTarget = target || 'your target role (goal not set yet)';
  const name = profile?.name || unifiedContext?.name || 'Candidate';

  // Extract student profile, checking profile first then falling back to unifiedContext.academic
  const sp = profile?.studentProfile || (unifiedContext?.academic ? {
    institution: unifiedContext.academic.institution,
    degree: unifiedContext.academic.degree,
    fieldOfStudy: unifiedContext.academic.fieldOfStudy,
    graduationYear: unifiedContext.academic.graduationYear,
    graduationMonth: unifiedContext.academic.graduationMonth,
    currentSemester: unifiedContext.academic.currentSemester,
    cgpa: unifiedContext.academic.cgpa,
    targetRole: isGoalSet ? target : undefined,
    targetWorkType: unifiedContext.academic.targetWorkType,
    preferredLocations: unifiedContext.careerGoal?.preferredLocations || [],
    coursework: unifiedContext.academic.coursework || [],
    projects: (unifiedContext.academic.documentedProjects || []).map((p) => ({
      id: p.id || '',
      title: p.title,
      description: p.description || '',
      role: '',
      techStack: p.techStack || [],
      repoUrl: p.repoUrl || null,
      liveUrl: p.liveUrl || null,
      highlights: [],
    })),
    achievements: [],
    updatedAt: unifiedContext.updatedAt,
  } : undefined);

  // If student profile exists but projects is empty, incorporate any guided projects from unifiedContext
  if (sp && (!sp.projects || sp.projects.length === 0) && unifiedContext?.projects?.projects && unifiedContext.projects.projects.length > 0) {
    sp.projects = unifiedContext.projects.projects.map((gp) => ({
      id: gp.id,
      title: gp.title,
      description: '',
      role: 'Project Builder',
      techStack: gp.techStack,
      repoUrl: null,
      liveUrl: null,
      highlights: [],
    }));
  }

  const ats = profile?.latestAtsAnalysis || (unifiedContext?.resume?.hasResume && unifiedContext?.resume?.latestAtsScore ? {
    atsScore: unifiedContext.resume.latestAtsScore,
    missingKeywords: unifiedContext.resume.missingKeywords || [],
    detectedKeywords: unifiedContext.resume.detectedKeywords || [],
    keywordScore: unifiedContext.resume.keywordScore ?? 0,
    formattingScore: unifiedContext.resume.formattingScore ?? 0,
  } : undefined);

  const readiness = profile?.metrics?.readinessScore ?? unifiedContext?.readiness?.overallScore ?? 0;

  // Skills with their authenticity tags
  const verifiedList = (profile?.skills?.verified || unifiedContext?.skills?.verified || []).map((v) => ({
    name: v.name,
    score: v.score,
  }));
  const confirmedList = unifiedContext?.skills?.confirmed || [];
  const claimedList = (profile?.skills?.claimed || unifiedContext?.skills?.claimed || []).map((c) => c.name);
  const inferredList = (profile?.skills?.inferred || unifiedContext?.skills?.inferred || []).map((i) => ({
    name: i.name,
    source: i.source,
  }));

  // Curated role profile for target
  const curated = target ? findCuratedRoleProfile(target) : null;
  const missingCrits = profile?.skillGaps?.missingCriticalSkills || unifiedContext?.skills?.missingCritical || (curated ? curated.coreSkills.filter(cs => !verifiedList.some(v => v.name.toLowerCase() === cs.toLowerCase()) && !claimedList.some(c => c.toLowerCase() === cs.toLowerCase())) : []);

  const apps = profile?.recentApplications || (unifiedContext?.applications?.recentApplications || []).map((a) => ({
    id: a.id,
    company: a.company,
    jobTitle: a.jobTitle,
    status: a.status,
    appliedAt: a.appliedAt || '',
  }));

  const savedJobsList = unifiedContext?.savedJobs?.jobs || [];

  // 4. SAVED JOBS & COMPANY INQUIRY (Condition 3 & 7)
  const matchedSavedJob = savedJobsList.find((j) => {
    const comp = (j.company || '').toLowerCase();
    return comp.length > 2 && msg.includes(comp);
  });

  if (matchedSavedJob) {
    const studentDegree = sp?.fieldOfStudy ? `You're studying ${sp.fieldOfStudy}. ` : sp?.degree ? `As a ${sp.degree} candidate, ` : '';
    const strongSkillsParts: string[] = [];
    if (verifiedList.length > 0) {
      strongSkillsParts.push(...verifiedList.map((v) => `${v.name} (verified, ${v.score}%)`));
    }
    if (confirmedList.length > 0) {
      strongSkillsParts.push(...confirmedList.map((c) => `${c.name} (confirmed)`));
    }
    if (claimedList.length > 0) {
      strongSkillsParts.push(...claimedList.map((c) => `${c} (claimed)`));
    }
    if (inferredList.length > 0) {
      strongSkillsParts.push(...inferredList.map((i) => `${i.name} (from your resume)`));
    }
    const skillsIntro = strongSkillsParts.length > 0
      ? `Strongest skills: ${strongSkillsParts.slice(0, 4).join(', ')}.\n\n`
      : '';

    // Gaps for curated role:
    let roleGapsStr = '';
    if (curated) {
      const roleGaps = missingCrits.slice(0, 3);
      if (roleGaps.length > 0) {
        roleGapsStr = `Gaps for ${curated.title}: ${roleGaps.join(', ')}.\n\n`;
      }
    }

    // Gaps from saved job description snippet:
    let jobSnippetAnalysis = '';
    if (matchedSavedJob.descriptionSnippet) {
      const snippet = matchedSavedJob.descriptionSnippet;
      const allStudentSkillNames = [
        ...verifiedList.map((v) => v.name.toLowerCase()),
        ...confirmedList.map((c) => c.name.toLowerCase()),
        ...claimedList.map((c) => c.toLowerCase()),
        ...inferredList.map((i) => i.name.toLowerCase()),
      ];

      const snippetSkills = [
        'Lean Six Sigma',
        'Quality Control',
        'GD&T',
        'SolidWorks',
        'AutoCAD',
        'ANSYS',
        'MATLAB',
        'Catia',
        'Python',
        'SQL',
        'Docker',
        'AWS',
        'React',
        'TypeScript',
        'DCF',
        'Financial Modeling',
        'SEO',
        'Figma',
      ];
      const mentionedInSnippet = snippetSkills.filter((s) => snippet.toLowerCase().includes(s.toLowerCase()));
      const missingFromJobSnippet = mentionedInSnippet.filter((s) => !allStudentSkillNames.includes(s.toLowerCase()));

      const jobTitle = matchedSavedJob.title || matchedSavedJob.jobTitle || 'Role';
      if (missingFromJobSnippet.length > 0) {
        jobSnippetAnalysis = `For the saved **${matchedSavedJob.company}** job (**${jobTitle}**, Status: *${matchedSavedJob.status}*), these ${missingFromJobSnippet.length} skill(s) appear in its description and not in your resume:\n` +
          missingFromJobSnippet.map((s) => `- **${s}**`).join('\n') + '\n\n';
      } else {
        jobSnippetAnalysis = `For the saved **${matchedSavedJob.company}** job (**${jobTitle}**, Status: *${matchedSavedJob.status}*), your documented skills align well with the description keywords.\n\n`;
      }
    } else {
      const jobTitle = matchedSavedJob.title || matchedSavedJob.jobTitle || 'Role';
      jobSnippetAnalysis = `You have saved **${jobTitle}** at **${matchedSavedJob.company}** (Status: *${matchedSavedJob.status}*). Update your resume to align with its core requirements.\n\n`;
    }

    return `${studentDegree}${skillsIntro}${roleGapsStr}${jobSnippetAnalysis}Next steps:\n- Tailor your resume in [Resume Builder](/builder)\n- Practice interview questions in [AI Interview Preparation](/interview-prep)\n- Manage your pipeline in [Application Tracker](/dashboard/applications)`;
  }

  // If user asks about a specific company that is NOT in saved jobs:
  const knownCompanies = ['google', 'tesla', 'amazon', 'microsoft', 'apple', 'meta', 'netflix', 'uber', 'tata motors', 'infosys', 'tcs', 'wipro'];
  const mentionedKnown = knownCompanies.find((c) => msg.includes(c));
  if (mentionedKnown) {
    const compDisplayName = mentionedKnown.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `I don't see any saved or tracked jobs from **${compDisplayName}** in your job tracker. You can save the job posting in [Job Opportunities](/jobs) or paste the job description here, and I'll analyze how your skills and resume compare against its requirements!`;
  }

  // If user asks generally about saved jobs / tracked applications:
  if (msg.includes('saved job') || msg.includes('tracked job') || msg.includes('saved position')) {
    if (savedJobsList.length > 0) {
      const jobBullets = savedJobsList.map((j) => `- **${j.title || j.jobTitle}** at **${j.company}** (Status: *${j.status}*${j.salary ? `, ${j.salary}` : ''})`).join('\n');
      return `You currently have ${unifiedContext?.savedJobs?.totalCount || savedJobsList.length} tracked job(s) in your pipeline:\n\n${jobBullets}\n\nReview or update their statuses anytime in the [Application Tracker](/dashboard/applications)!`;
    }
    return `You do not have any saved or tracked jobs in your pipeline yet. Discover and save matching opportunities in [Job Opportunities](/jobs)!`;
  }

  // 5. LEARNING ROADMAP GUIDANCE
  if (
    msg.includes('roadmap') ||
    msg.includes('curriculum') ||
    msg.includes('youtube') ||
    msg.includes('study plan') ||
    msg.includes('10-week')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet, so I have not assumed a career path for you.\n\nSet your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data), then open [Career Guidance](/guidance) to see a curated roadmap for your field.`;
    }
    if (curated) {
      const roadmapPhaseSummary = ci?.learningRoadmap?.phases && ci.learningRoadmap.phases.length > 0
        ? `\n\n### Learning Phases:\n${ci.learningRoadmap.phases.map((p) => `- **${p.phase}** (${p.duration}): ${p.focus}`).join('\n')}`
        : '';
      const readinessNote = ci?.careerReadinessScore
        ? `\n\nOverall Career Readiness: **${ci.careerReadinessScore.overallScore}/100** (${ci.careerReadinessScore.readinessBand}).`
        : '';
      return `Here is your curated learning path for **${target || curated.title}** (${curated.title}, ${curated.domain}):\n\n- **Core Skills Suggested**: ${curated.coreSkills.join(', ')}\n- **Recommended Tools**: ${curated.recommendedTools.join(', ')}\n- **Practice Projects**: ${curated.projectIdeas.map((p) => p.title).join('; ')}${roadmapPhaseSummary}${readinessNote}\n\nReview verified resources and track your progress on [Career Guidance](/guidance).`;
    }
    const readinessCustomNote = ci?.careerReadinessScore
      ? `\n\nOverall Career Readiness: **${ci.careerReadinessScore.overallScore}/100** (${ci.careerReadinessScore.readinessBand}).`
      : '';
    return `Your target role is set to **${target}**. Explore your verified profile skills, resume strengths, and custom learning steps on [Career Guidance](/guidance).${readinessCustomNote}`;
  }

  // 6. APPLICATION GUIDANCE (Follow-ups, pipeline, email outreach)
  if (
    msg.includes('follow up') ||
    msg.includes('application') ||
    msg.includes('applied') ||
    msg.includes('recruiter email') ||
    msg.includes('outreach') ||
    msg.includes('networking')
  ) {
    let appInfo = '';
    if (apps.length > 0) {
      appInfo = `You currently have ${apps.length} active tracked application(s), including **${apps[0].company}** (${apps[0].jobTitle} - *${apps[0].status}*).\n\n`;
    }

    return `${appInfo}### Follow-Up Etiquette & Timing
- **When to Follow Up**: Wait **5 to 7 business days** after submitting your application or after an interview round.
- **Outreach Channels**: Send a polite email to the recruiter or connect on LinkedIn with a 300-character custom note.

### Professional Follow-Up Email Template:
\`\`\`text
Subject: Following Up on Application – ${displayTarget} – ${name}

Hi [Recruiter / Hiring Manager Name],

I hope your week is going well.

I recently submitted my application for the ${target || '[Target Role]'} position at [Company]. As a ${sp?.degree || 'candidate'}${sp?.institution ? ` from ${sp.institution}` : ''}, I am excited about contributing to [Company]'s work.

I wanted to politely follow up to see if you need any additional details or work samples regarding my background. My portfolio and resume are available on my profile.

Thank you for your time and consideration!

Best regards,
${name}
\`\`\`

Track and manage all your application stages in the [Application Tracker](/dashboard/applications)!`;
  }

  // 7. INTERVIEW GUIDANCE
  if (
    msg.includes('interview') ||
    msg.includes('mock') ||
    msg.includes('star method') ||
    msg.includes('star') ||
    msg.includes('behavioral') ||
    msg.includes('technical question') ||
    msg.includes('screening')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet. Hiring interviews evaluate core problem-solving, domain fundamentals, and structured communication using the STAR method.\n\nSet your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data) to get tailored technical and behavioral practice questions in [AI Interview Preparation](/interview-prep).`;
    }

    let techQ = `"How do database indexes (e.g. B-Trees) accelerate query performance, and what are the trade-offs on insert and update operations?"\n- Focus on logarithmic lookup efficiency vs the write overhead of maintaining index trees.`;
    let scenarioQ = `"Walk me through the lifecycle of an HTTP request from the moment a user clicks a button until JSON data renders on screen."\n- Cover DNS lookup, TLS handshake, HTTP/HTTPS methods, backend route handlers, and client state updates.`;

    if (curated) {
      if (curated.domain === 'Mechanical') {
        techQ = `"Explain how factor of safety is determined in mechanical components, and what considerations guide finite element analysis (FEA) mesh convergence."\n- Discuss stress concentrations, material yield strength vs ultimate strength, and mesh refinement around high-stress gradients.`;
        scenarioQ = `"Walk me through how you establish GD&T datum references and tolerance stack-up for a rotating shaft assembly."\n- Explain datum feature selection, MMC/LMC modifiers, and runout tolerances.`;
      } else if (curated.domain === 'Electrical') {
        techQ = `"Explain the trade-offs between linear LDO regulators and switching buck converters in battery-powered embedded hardware."\n- Contrast power efficiency, thermal dissipation, and ripple noise.`;
        scenarioQ = `"Walk me through how you would debug an I2C or SPI communication failure using an oscilloscope."\n- Cover clock line integrity, pull-up resistors, signal bounce, and acknowledge bit timing.`;
      } else if (curated.domain === 'Civil') {
        techQ = `"Explain how dead load vs live load combinations are factored under standard building codes (e.g. IS 456 / ACI 318)."`;
        scenarioQ = `"Walk me through the site investigation and soil bearing capacity verification process before foundation laying."`;
      } else if (curated.domain === 'Data') {
        techQ = `"Explain the difference between clustered and non-clustered indexing, and when window functions outperform self-joins."`;
        scenarioQ = `"Walk me through how you would validate data integrity and handle schema drift in an automated data pipeline."`;
      } else if (curated.domain === 'Finance') {
        techQ = `"Walk me through how a $10 increase in depreciation expense flows through the income statement, cash flow statement, and balance sheet."`;
        scenarioQ = `"How do you calculate weighted average cost of capital (WACC) and choose an appropriate terminal value multiple in a DCF model?"`;
      } else if (curated.domain === 'Human Resources') {
        techQ = `"How do you design a structured competency rubric to eliminate unconscious bias during behavioral evaluations?"`;
        scenarioQ = `"Walk me through your conflict resolution framework when managing a sensitive peer dispute in the workplace."`;
      } else if (curated.domain === 'Marketing') {
        techQ = `"How do you evaluate CAC payback period and multi-touch attribution across paid acquisition and organic content?"`;
        scenarioQ = `"Walk me through how you conduct an A/B test on a high-traffic landing page, from hypothesis to statistical significance."`;
      } else if (curated.domain === 'Design') {
        techQ = `"How do you ensure WCAG 2.1 AA contrast compliance when building tokenized color systems in Figma?"`;
        scenarioQ = `"Walk me through how you synthesize user feedback from 5 usability sessions into actionable sprint design revisions."`;
      }
    }

    return `For entry-level **${target}** interviews, hiring teams evaluate both core problem-solving and structured communication.

Here are 3 high-yield questions to practice right now:

### 1. Behavioral Question (STAR Method)
> *"Tell me about a challenging technical or design problem you ran into in a project and how you resolved it."*
- **Situation**: Define the environment, project goals, and constraints.
- **Task**: The specific failure, bottleneck, or requirement you owned.
- **Action**: The analytical steps, tools, or trade-offs you executed.
- **Result**: Quantifiable outcome (e.g. *"reduced response time by 30%"*, *"improved structural factor of safety to 1.8"*).

### 2. Core Technical Question
> *${techQ}*

### 3. Engineering Scenario Question
> *${scenarioQ}*

You can practice interactive mock interviews tailored to **${target}** with instant voice/text AI grading in [AI Interview Preparation](/interview-prep)!`;
  }

  // 8. PROJECT GUIDANCE
  if (
    msg.includes('project') ||
    msg.includes('portfolio') ||
    msg.includes('capstone') ||
    msg.includes('github') ||
    msg.includes('repo') ||
    msg.includes('side project')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet.\n\nTo build impactful portfolio projects that hiring managers value, set your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data). You can also explore guided project blueprints in [AI Project Mentor](/projects).`;
    }

    const studentContext = sp && sp.institution
      ? `As a student at **${sp.institution}** (${sp.degree || 'Degree Candidate'}${sp.graduationYear ? `, Class of ${sp.graduationYear}` : ''})${
          sp.coursework && sp.coursework.length > 0
            ? ` with coursework in **${sp.coursework.slice(0, 3).join(', ')}**`
            : ''
        }, your projects are your strongest hiring proof.\n\n`
      : '';

    const currentProjects = sp?.projects && sp.projects.length > 0
      ? `You currently feature: ${sp.projects.map((p) => `**${p.title}** (${p.techStack.join(', ')})`).join(', ')}.`
      : 'You do not have any verified portfolio projects documented yet.';

    let projectTitle = 'High-Throughput Scalable Microservice';
    let projectArch = 'REST/tRPC API backend with relational schema modeling (PostgreSQL), an in-memory caching tier (Redis), and containerized multi-container setup (Docker).';
    let projectHighlights = '- Implement JWT authentication with role-based access control.\n  - Add query indexing to maintain sub-50ms latency on 100k+ records.\n  - Write unit/integration tests with >80% code coverage.';
    let projectBullet = `"Architected and deployed a containerized microservice handling 1,500 RPS with sub-40ms P95 latency using Node.js, PostgreSQL, and Docker."`;
    let gapSkills = missingCrits.slice(0, 3).join(', ') || 'Docker, Redis, and SQL';

    if (ci?.projectRecommendations && ci.projectRecommendations.length > 0) {
      const pRec = ci.projectRecommendations[0];
      projectTitle = pRec.title;
      projectArch = `${pRec.problemStatement} (${pRec.techStack.join(', ')}).`;
      if (pRec.architecturalGuidance?.layers && pRec.architecturalGuidance.layers.length > 0) {
        projectHighlights = pRec.architecturalGuidance.layers.slice(0, 3).map((l) => `- ${l}`).join('\n  ');
      }
      projectBullet = pRec.resumeBulletDraft;
      if (pRec.addressedGaps && pRec.addressedGaps.length > 0) {
        gapSkills = pRec.addressedGaps.join(', ');
      }
    } else if (curated) {
      gapSkills = missingCrits.slice(0, 3).join(', ') || curated.coreSkills.slice(0, 3).join(', ');
      if (curated.projectIdeas && curated.projectIdeas.length > 0) {
        const pIdea = curated.projectIdeas[0];
        projectTitle = pIdea.title;
        projectArch = `${pIdea.summary} (${pIdea.skillsPracticed.join(', ')}).`;
        projectHighlights = pIdea.deliverables.map((d) => `- ${d}`).join('\n  ');
        projectBullet = `"Engineered ${pIdea.title} utilizing ${pIdea.skillsPracticed.slice(0, 3).join(', ')}, delivering ${pIdea.deliverables[0] || 'complete validated design'}."`;
      }
    }

    return `${studentContext}${currentProjects}

To stand out for **${target}** positions, build a project that bridges your critical skill gaps in **${gapSkills}**:

### Recommended Project Blueprint: ${projectTitle}
- **Core Architecture**: ${projectArch}
- **Key Engineering Highlights**:
  ${projectHighlights}
- **Resume Impact Bullet**:
  > *${projectBullet}*

You can explore step-by-step milestone guidance, architectural blueprints, and interactive coding help in the [AI Project Mentor](/projects), and sync completed projects directly to your resume in the [Resume Builder](/builder)!`;
  }

  // 9. RESUME GUIDANCE
  if (
    msg.includes('resume') ||
    msg.includes('ats') ||
    msg.includes('bullet') ||
    msg.includes('metric') ||
    msg.includes('xyz') ||
    msg.includes('improve resume') ||
    msg.includes('cv')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet.\n\nTo optimize your resume and calculate ATS keyword match density, set your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data). In the meantime, you can lead with strong action verbs and structure bullets with the Google XYZ formula in [Resume Builder](/builder) and audit formatting in [ATS Score Checker](/ats-score).`;
    }

    if (!ats && (!unifiedContext?.resume || !unifiedContext.resume.hasResume)) {
      return `You do not have a resume saved or audited in your career workspace yet.\n\nTo build and optimize your resume for **${target}** roles:
1. Open the [Resume Builder](/builder) to draft an ATS-compliant single-column resume.
2. Structure bullet points with the Google XYZ formula: *"Accomplished [X] as measured by [Y] by doing [Z]"*.
3. Audit your ATS compliance score and keyword coverage in the [ATS Score Checker](/ats-score).`;
    }

    let atsContext = '';
    if (ats) {
      atsContext = `Your latest resume scored **${ats.atsScore}/100** on ATS compliance. ${
        ats.missingKeywords && ats.missingKeywords.length > 0
          ? `Top missing keywords for **${target}**: **${ats.missingKeywords.slice(0, 4).join(', ')}**.`
          : 'Your keyword match density is currently solid.'
      }\n\n`;
    }

    let prioritiesText = '';
    if (ci?.resumeImprovementPriorities && ci.resumeImprovementPriorities.length > 0) {
      prioritiesText = `### Top Improvement Priorities (Career Intelligence):\n${ci.resumeImprovementPriorities.slice(0, 3).map((r) => `- **[${r.priority.toUpperCase()}] ${r.area}**: ${r.issue} → *${r.recommendation}*`).join('\n')}\n\n`;
    }

    return `${atsContext}${prioritiesText}To optimize your fresher resume for **${target}** roles:

1. **Lead with Strong Action Verbs**: Start every bullet with high-impact engineering verbs like *Architected*, *Implemented*, *Optimized*, *Containerized*, or *Benchmarked*. Avoid weak passive phrases like *"Helped with"* or *"Responsible for"*.
2. **Apply the Google XYZ Formula**: Frame accomplishments as:
   > *"Accomplished [X] as measured by [Y] by doing [Z]"*
   - *Example*: "Engineered a real-time event streaming pipeline using Node.js and Redis, reducing message delivery latency by 38% under 5,000 simulated concurrent requests."
3. **Keep an ATS-Parseable Structure**: Avoid multi-column layouts, graphics, tables, and floating text boxes. Use standard single-column A4 sections.

Take action right now:
- Audit parsing and keyword match in the [ATS Score Checker](/ats-score)
- Polish bullet phrasing with metric improvements in the [Resume Improver](/improver)
- Update and download your clean PDF from the [Resume Builder](/builder)`;
  }

  // 10. CAREER GUIDANCE & ENTRY-LEVEL PATHWAYS
  if (
    msg.includes('career') ||
    msg.includes('pathway') ||
    msg.includes('path') ||
    msg.includes('transition') ||
    msg.includes('what role')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet, so I have not assumed a career path for you.\n\nSet your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data), then open [Career Guidance](/guidance) to explore career pathways suited to your field.`;
    }

    const studentContext = sp && sp.institution && sp.degree
      ? `Based on your **${sp.degree}** in **${sp.fieldOfStudy || 'your field'}** at **${sp.institution}**${sp.graduationYear ? ` (Class of ${sp.graduationYear})` : ''}, `
      : '';

    let pathways = `1. **${target} (Primary Pathway)**: Focuses on core software engineering, data structures, and production feature development.
2. **Junior Full Stack Developer**: Specializes in modern React/Next.js frontend architectures paired with Node.js/PostgreSQL APIs.
3. **Junior Cloud & DevOps Engineer**: Focuses on Docker containerization, CI/CD automated deployment pipelines, and cloud operations.`;

    if (curated) {
      if (curated.domain === 'Mechanical') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on CAD modeling, mechanical design, GD&T, and engineering analysis.
2. **CAE & Simulation Engineer**: Specializes in finite element analysis (FEA) and computational fluid dynamics (CFD).
3. **Manufacturing & Quality Engineer**: Focuses on design for manufacturing (DFM), tooling, and quality assurance.`;
      } else if (curated.domain === 'Electrical') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on circuit analysis, PCB layout, and embedded hardware testing.
2. **Embedded Firmware Engineer**: Specializes in C/C++, RTOS, microcontroller interfacing, and device drivers.
3. **Power Electronics Engineer**: Focuses on power conversion, motor drives, and energy storage systems.`;
      } else if (curated.domain === 'Civil') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on structural analysis, drafting, and building codes.
2. **Structural Design Engineer**: Specializes in steel/concrete framing and finite element structural modeling.
3. **Site & Construction Operations Engineer**: Focuses on quantity estimation, scheduling, and site safety management.`;
      } else if (curated.domain === 'Data') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on SQL analysis, dashboarding, and business metrics.
2. **Data Engineer**: Specializes in ETL pipelines, schema design, and distributed data processing.
3. **Machine Learning Analyst**: Focuses on feature engineering, exploratory data analysis, and predictive modeling.`;
      } else if (curated.domain === 'Finance') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on financial modeling, three-statement accounting, and variance analysis.
2. **Investment Banking Analyst**: Specializes in DCF valuation, M&A pitch materials, and financial due diligence.
3. **Corporate FP&A Specialist**: Focuses on budgeting, forecasting, and operating expense analysis.`;
      } else if (curated.domain === 'Marketing') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on SEO, content strategy, and campaign analytics.
2. **Performance Marketing Specialist**: Specializes in paid search, conversion rate optimization (CRO), and paid media.
3. **Lifecycle & CRM Marketer**: Focuses on retention funnels, email automation, and customer segmentation.`;
      } else if (curated.domain === 'Human Resources') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on talent acquisition, onboarding operations, and employee relations.
2. **Technical Recruiter**: Specializes in sourcing, screening, and closing technical candidates.
3. **People Operations Specialist**: Focuses on HRIS administration, compensation benchmarking, and compliance.`;
      } else if (curated.domain === 'Design') {
        pathways = `1. **${curated.title} (Primary Pathway)**: Focuses on wireframing, interaction flows, and usability testing.
2. **Design Systems Designer**: Specializes in tokenized component libraries, WCAG accessibility, and Figma architecture.
3. **Product Designer**: Focuses on end-to-end product discovery, user research, and prototyping.`;
      }
    }

    return `### Recommended Career Pathways for Entry-Level Candidates

${studentContext}Your primary target role is **${target}**. Here are the highest-leverage career trajectories suited to your academic profile:

${pathways}

### Strategic Recommendations:
- Build 2 practical capstones that prove domain competency rather than simple tutorial clones.
- Audit your resume against industry standards in the [Resume Builder](/builder).
- Follow a structured curriculum in [Career Guidance](/guidance).
- Discover matching live openings in [Job Opportunities](/jobs).`;
  }

  // 11. JOB GUIDANCE
  if (
    msg.includes('job') ||
    msg.includes('fresher') ||
    msg.includes('intern') ||
    msg.includes('search') ||
    msg.includes('opening') ||
    msg.includes('apply') ||
    msg.includes('listing') ||
    msg.includes('eligibility') ||
    msg.includes('match')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet.\n\nSet your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data) to filter relevant entry-level and internship openings in [Job Opportunities](/jobs).`;
    }

    return `When searching for entry-level and fresher **${target}** positions:

1. **The 65% Match Rule**: You do **not** need 100% of listed qualifications. Job descriptions are wish lists. If you match 65-70% of core requirements and have project evidence, you are a competitive applicant.
2. **Fresher Search Formulas**: In our job search engine, try natural language prompts like:
   - *"entry level ${target}"*
   - *"fresher ${target} internship"*
   - *"junior ${target} new grad"*
3. **Tailor Before Submitting**: Always inspect the job description keywords and run your resume through our matcher to ensure your match score exceeds 75%.

Find and filter live openings right now:
- Browse live openings in [Job Opportunities](/jobs)
- Check your application pipeline in the [Application Tracker](/dashboard/applications)`;
  }

  // 12. SKILL GUIDANCE
  if (
    msg.includes('skill') ||
    msg.includes('learn') ||
    msg.includes('gap') ||
    msg.includes('assessment') ||
    msg.includes('certificate') ||
    msg.includes('study') ||
    msg.includes('master')
  ) {
    if (!isGoalSet) {
      return `Your target role is **not set** yet, so I have not assumed specific skill gaps for you.\n\nSet your target role in [Onboarding](/onboarding) or [My Career Data](/dashboard/my-data) to see the critical skills and assessments required for your field in [Skill Assessments](/skills).`;
    }

    const vStr = verifiedList.length > 0
      ? `You have verified qualifications in: **${verifiedList.map((v) => `${v.name} (${v.score}%)`).join(', ')}**.`
      : 'You have not completed any proctored assessments yet.';

    const roleGaps = missingCrits.length > 0
      ? missingCrits.slice(0, 3)
      : (curated ? curated.coreSkills.slice(0, 3) : []);

    const gapList = roleGaps.length > 0
      ? `Top critical gaps to close for **${target}**: **${roleGaps.join(', ')}**.`
      : `Your profile meets all critical skill requirements for ${target}!`;

    const primarySkillToMaster = roleGaps[0] || (curated ? curated.coreSkills[0] : 'core technical concepts');

    return `For **${target}** roles, recruiters favor verified technical competencies over self-reported resume claims.

${vStr}
${gapList}

### 3-Step Strategy to Prove Skill Mastery:
1. **Focus on Hiring Requirements**: Master the core concepts of **${primarySkillToMaster}** and how they apply in ${curated ? curated.title : target} projects.
2. **Earn Cryptographic Credentials**: Take our proctored evaluation to earn a verified certificate in [Skill Assessments](/skills).
3. **Apply in Projects**: Integrate newly verified skills directly into your portfolio projects.

Start your skill verification now:
- Take proctored assessments in [Skill Assessments](/skills)
- Review curated learning resources in [Career Guidance](/guidance)`;
  }

  // 13. GENERAL AI ASSISTANT OVERVIEW (Fallback)
  const studentHeadline = sp && sp.institution && sp.degree
    ? `Student at **${sp.institution}** · ${sp.degree}${sp.graduationYear ? ` (Class of ${sp.graduationYear})` : ''}`
    : isGoalSet
    ? `Candidate pursuing **${target}**`
    : 'Candidate';

  const targetRoleDisplay = isGoalSet
    ? `**${target}**`
    : '**Goal not set** (Set your role in [My Career Data](/dashboard/my-data))';

  const resumeStatusDisplay = ats
    ? `**${ats.atsScore}/100** compliance`
    : (unifiedContext?.resume?.hasResume ? 'Draft created (pending ATS audit)' : 'No resume created yet (create one in [Resume Builder](/builder))');

  const verifiedDisplay = verifiedList.length > 0
    ? verifiedList.map((v) => `${v.name} (${v.score}%)`).join(', ')
    : 'None yet';

  const readinessVal = ci?.careerReadinessScore?.overallScore ?? readiness;
  const readinessBandText = ci?.careerReadinessScore?.readinessBand ? ` (${ci.careerReadinessScore.readinessBand})` : '';

  const nextActionsBlock = ci?.recommendedNextActions && ci.recommendedNextActions.length > 0
    ? `\n### Recommended Next Actions:\n${ci.recommendedNextActions.slice(0, 3).map((a, idx) => `${idx + 1}. **${a.title}**: ${a.description} ([Open](${a.href}))`).join('\n')}\n`
    : '';

  return `### Smart Resume AI Assistant

👋 Hello ${name}! Here is your current profile snapshot:
- **Profile**: ${studentHeadline}
- **Target Role**: ${targetRoleDisplay}
- **Career Readiness Score**: **${readinessVal}/100**${readinessBandText}
- **ATS Resume Status**: ${resumeStatusDisplay}
- **Verified Skills**: ${verifiedDisplay}
${nextActionsBlock}
### How I Can Guide You Today:
1. **Resume Optimization**: Improve bullet points with the Google XYZ formula in the [Resume Builder](/builder) and check scores in the [ATS Score Checker](/ats-score).
2. **Close Skill Gaps**: Practice and earn certificates in [Skill Assessments](/skills) and explore roadmaps in [Career Guidance](/guidance).
3. **Interview Practice**: Run mock technical and behavioral interviews in [AI Interview Preparation](/interview-prep).
4. **Discover Jobs**: Filter entry-level and internship listings in [Job Opportunities](/jobs).

What would you like to work on right now?`;
}

