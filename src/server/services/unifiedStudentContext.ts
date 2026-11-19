import 'server-only';
import {
  getDb,
  getStudentProfile,
  getUserCareerGoal,
  getUserSkills,
  getUserGuidedProjects,
  getUserInterviewSessions,
  getUserActiveRoadmap,
  recordReadinessSnapshot,
  getUserReadinessHistory,
  type ReadinessSnapshotRecord,
  type StudentProfileDTO,
  type GuidedProjectDTO,
  type UserCareerGoalRecord,
} from '@/server/db';
import {
  findRoleSpecification,
  calculateExplainableReadiness,
  type CareerProfileSummary,
  type ExplainableReadinessResult,
} from '@/server/services/careerIntelligence';
import { getAllCuratedSkillSuggestions } from '@/lib/career/roleProfiles';

// ============================================================================
// UNIFIED STUDENT CONTEXT TYPES
// ============================================================================

export interface UnifiedAcademicContext {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationYear: number;
  graduationMonth: string | null;
  currentSemester: string | null;
  cgpa: string | null;
  targetWorkType: 'internship' | 'full_time' | 'both';
  coursework: string[];
  documentedProjects: Array<{
    id?: string;
    title: string;
    description?: string;
    techStack: string[];
    repoUrl?: string;
    liveUrl?: string;
  }>;
}

export interface UnifiedCareerGoalContext {
  goalSet: boolean;
  targetRole: string;
  targetIndustry: string | null;
  experienceLevel: string;
  preferredLocations: string[];
  targetSalary: string | null;
  skillsSummary: string | null;
}

export interface UnifiedCareerInterestsContext {
  targetIndustry: string | null;
  preferredLocations: string[];
  targetSalary: string | null;
  targetWorkType: 'internship' | 'full_time' | 'both' | null;
  primaryInterests: string[];
}

export interface UnifiedSkillItem {
  name: string;
  status: 'verified' | 'confirmed' | 'claimed' | 'inferred';
  score?: number;
  certificateId?: string;
  verifiedDate?: string;
  confirmedDate?: string;
  claimedDate?: string;
  source?: string;
  inferredSource?: 'resume_experience' | 'resume_project' | 'skills_section' | 'guided_project';
}

export interface UnifiedSkillsContext {
  verified: Array<{ name: string; score: number; certificateId?: string; verifiedDate?: string }>;
  confirmed: Array<{ name: string; confirmedDate?: string; source?: string }>;
  claimed: Array<{ name: string; claimedDate?: string; source?: string }>;
  inferred: Array<{ name: string; source: 'resume_experience' | 'resume_project' | 'skills_section' | 'guided_project' }>;
  needingAssessment: string[];
  missingCritical: string[];
  missingRecommended: string[];
  matchingCritical: string[];
}

export interface UnifiedExperienceItem {
  id?: string;
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
  bullets?: string[];
}

export interface UnifiedExperienceContext {
  totalCount: number;
  items: UnifiedExperienceItem[];
  primaryRole?: string;
  hasInternship: boolean;
}

export interface UnifiedAssessmentScoreItem {
  id: string;
  skill: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  date: string;
}

export interface UnifiedAssessmentScoresContext {
  totalAttempts: number;
  passedCount: number;
  averageScore: number | null;
  recentAssessments: UnifiedAssessmentScoreItem[];
}

export interface UnifiedSavedJobItem {
  id: string;
  jobId?: string | null;
  jobTitle: string;
  title?: string;
  company: string;
  location?: string | null;
  source?: string | null;
  status?: string | null;
  descriptionSnippet?: string | null;
  salary?: string | null;
  matchScore?: number | null;
  savedAt: string;
}

export interface UnifiedSavedJobsContext {
  totalCount: number;
  jobs: UnifiedSavedJobItem[];
}

export interface UnifiedChatMessageItem {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
  timestamp?: string;
}

export interface UnifiedChatHistoryContext {
  lastActiveAt?: string | null;
  activeWorkflow?: string | null;
  recentMessages?: UnifiedChatMessageItem[];
  totalTurns?: number;
}

export interface UnifiedResumeContext {
  hasResume: boolean;
  resumesCount: number;
  activeResumeId: string | null;
  latestAtsScore: number | null;
  keywordScore: number | null;
  formattingScore: number | null;
  sectionScore: number | null;
  wordCount: number | null;
  readabilityScore: number | null;
  detectedKeywords: string[];
  missingKeywords: string[];
  analyzedAt: string | null;
}

export interface UnifiedGuidedProjectItem {
  id: string;
  title: string;
  techStack: string[];
  difficulty: string;
  status: 'draft' | 'in_progress' | 'completed' | 'exported';
  milestoneProgress: number; // 0 - 100
  exportedToResume: boolean;
  completedAt?: string | null;
}

export interface UnifiedProjectsContext {
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  exportedCount: number;
  projects: UnifiedGuidedProjectItem[];
}

export interface UnifiedApplicationItem {
  id: string;
  jobId?: string | null;
  jobTitle: string;
  company: string;
  location?: string | null;
  status: string;
  appliedAt: string;
}

export interface UnifiedApplicationsContext {
  totalCount: number;
  activeCount: number;
  interviewingCount: number;
  recentApplications: UnifiedApplicationItem[];
}

export interface UnifiedInterviewContext {
  totalSessions: number;
  completedSessions: number;
  averageScore: number | null;
  topStrengths: string[];
  recurringWeaknesses: string[];
  recentSessions: Array<{
    id: string;
    targetRole: string;
    overallScore: number | null;
    status: string;
    createdAt: string;
  }>;
}

export interface UnifiedLearningContext {
  hasActiveRoadmap: boolean;
  targetRole: string | null;
  completedStepsCount: number;
  totalStepsCount: number;
  progressPercent: number;
  currentMilestoneTitle: string | null;
}

export interface UnifiedStudentContext {
  userId: string;
  name: string;
  email: string | null;
  academic: UnifiedAcademicContext | null;
  careerGoal: UnifiedCareerGoalContext;
  careerInterests: UnifiedCareerInterestsContext;
  skills: UnifiedSkillsContext;
  experience: UnifiedExperienceContext;
  resume: UnifiedResumeContext;
  projects: UnifiedProjectsContext;
  applications: UnifiedApplicationsContext;
  interviews: UnifiedInterviewContext;
  learning: UnifiedLearningContext;
  assessments: UnifiedAssessmentScoresContext;
  savedJobs: UnifiedSavedJobsContext;
  chatHistory: UnifiedChatHistoryContext;
  readiness: ExplainableReadinessResult;
  readinessHistory: ReadinessSnapshotRecord[];
  nextRecommendedActions: Array<{
    title: string;
    description: string;
    href: string;
    priority: 'high' | 'medium' | 'low';
    actionText: string;
  }>;
  studentProfile: StudentProfileDTO | null;
  updatedAt: string;
}

// In-memory short-lived cache (10 seconds) per user to avoid redundant parallel queries
const contextCache = new Map<string, { data: UnifiedStudentContext; expiresAt: number }>();

export function clearStudentContextCache(userId?: string): void {
  if (userId) {
    contextCache.delete(userId);
  } else {
    contextCache.clear();
  }
}

/**
 * Builds the authoritative, multi-system Unified Student Context for an authenticated student.
 */
export async function buildUnifiedStudentContext(userId: string): Promise<UnifiedStudentContext> {
  const cached = contextCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const db = getDb();

  // 1. Concurrent fetching of all authorized student data partitions
  const [
    userRow,
    studentProfile,
    careerGoal,
    userSkills,
    resumeRows,
    atsRow,
    guidedProjects,
    applicationRows,
    interviewSessions,
    roadmapRow,
    assessmentRows,
    savedJobRows,
    savedJobCountRow,
    fallbackJobMatchRows,
  ] = await Promise.all([
    // Basic user info
    Promise.resolve(
      db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as any
    ).catch(() => null),
    // Student profile
    getStudentProfile(userId).catch(() => null),
    // Career goal
    getUserCareerGoal(userId).catch(() => null),
    // Tracked skills
    getUserSkills(userId).catch(() => []),
    // Resumes
    Promise.resolve(
      db.prepare('SELECT id, resume_data, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[]
    ).catch(() => []),
    // Latest ATS Analysis
    Promise.resolve(
      db.prepare(
        'SELECT ats_score, keyword_score, formatting_score, section_score, detected_keywords, missing_keywords, created_at, analyzed_at FROM resume_analyses WHERE user_id = ? ORDER BY analyzed_at DESC LIMIT 1'
      ).get(userId) as any
    ).catch(() => null),
    // Guided projects
    getUserGuidedProjects(userId).catch(() => []),
    // Job applications
    Promise.resolve(
      db.prepare(
        'SELECT id, job_id, job_title, company, location, status, applied_at FROM job_applications WHERE user_id = ? ORDER BY applied_at DESC LIMIT 10'
      ).all(userId) as any[]
    ).catch(() => []),
    // Interview sessions
    getUserInterviewSessions(userId).catch(() => []),
    // Active Learning Roadmap
    getUserActiveRoadmap(userId).catch(() => null),
    // Assessment attempts
    Promise.resolve(
      db.prepare(
        'SELECT id, skill, score, total_questions, passed, created_at FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(userId) as any[]
    ).catch(() => []),
    // Tracked & Saved jobs from job_applications
    Promise.resolve(
      db.prepare(
        "SELECT id, job_id, job_title, company, location, source, status, description_snippet, salary, created_at FROM job_applications WHERE user_id = ? AND status IN ('Saved', 'Ready to apply', 'Application pending', 'Applied', 'Interview') ORDER BY created_at DESC LIMIT 10"
      ).all(userId) as any[]
    ).catch(() => []),
    // Real total count of tracked/saved jobs
    Promise.resolve(
      db.prepare(
        "SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND status IN ('Saved', 'Ready to apply', 'Application pending', 'Applied', 'Interview')"
      ).get(userId) as any
    ).catch(() => ({ count: 0 })),
    // Matched jobs from job_matches (used for matchScore and fallback)
    Promise.resolve(
      db.prepare(
        'SELECT id, job_id, job_title, company, match_score, created_at FROM job_matches WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(userId) as any[]
    ).catch(() => []),
  ]);

  const userName = userRow?.name || 'Candidate';
  const userEmail = userRow?.email || null;

  // 2. Normalize Career Goal & Target Role
  const targetRole = (studentProfile?.targetRole || careerGoal?.target_role || '').trim();
  const goalSet = Boolean(targetRole);
  const experienceLevel = careerGoal?.experience_level || (studentProfile ? 'Fresher / Entry Level' : 'Entry Level');
  const roleSpec = findRoleSpecification(targetRole);

  const careerGoalContext: UnifiedCareerGoalContext = {
    goalSet,
    targetRole,
    targetIndustry: careerGoal?.target_industry || null,
    experienceLevel,
    preferredLocations: studentProfile?.preferredLocations || (careerGoal?.preferred_location ? [careerGoal.preferred_location] : []),
    targetSalary: careerGoal?.target_salary || null,
    skillsSummary: careerGoal?.skills_summary || null,
  };

  const careerInterestsContext: UnifiedCareerInterestsContext = {
    targetIndustry: careerGoal?.target_industry || null,
    preferredLocations: studentProfile?.preferredLocations || (careerGoal?.preferred_location ? [careerGoal.preferred_location] : []),
    targetSalary: careerGoal?.target_salary || null,
    targetWorkType: studentProfile?.targetWorkType || null,
    primaryInterests: studentProfile?.coursework || [],
  };

  // 3. Normalize Academic Context
  let academicContext: UnifiedAcademicContext | null = null;
  if (studentProfile) {
    academicContext = {
      institution: studentProfile.institution,
      degree: studentProfile.degree,
      fieldOfStudy: studentProfile.fieldOfStudy,
      graduationYear: studentProfile.graduationYear,
      graduationMonth: studentProfile.graduationMonth || null,
      currentSemester: studentProfile.currentSemester || null,
      cgpa: studentProfile.cgpa || null,
      targetWorkType: (studentProfile.targetWorkType as any) || 'both',
      coursework: studentProfile.coursework || [],
      documentedProjects: studentProfile.projects || [],
    };
  }

  // 4. Skills Partitioning & Inference
  const verifiedList: UnifiedSkillsContext['verified'] = [];
  const confirmedList: UnifiedSkillsContext['confirmed'] = [];
  const claimedList: UnifiedSkillsContext['claimed'] = [];
  const inferredList: UnifiedSkillsContext['inferred'] = [];
  const inferredSet = new Set<string>();

  for (const s of userSkills) {
    if (s.status === 'verified') {
      verifiedList.push({
        name: s.name,
        score: s.score || 80,
        certificateId: s.certificateId,
        verifiedDate: s.verifiedDate,
      });
    } else if (s.status === 'confirmed' || (s.status === 'claimed' && s.confirmedAt)) {
      confirmedList.push({
        name: s.name,
        confirmedDate: s.confirmedAt,
        source: s.source,
      });
    } else if (s.status === 'claimed') {
      claimedList.push({
        name: s.name,
        claimedDate: s.claimedDate,
        source: s.source,
      });
    }
  }

  // 4b. Parse experience & skills from active resume
  const experienceItems: UnifiedExperienceItem[] = [];
  const activeResume = resumeRows?.[0] || null;
  if (activeResume?.resume_data) {
    try {
      const parsedResume = JSON.parse(activeResume.resume_data);

      // Support skills as array OR object { technical, soft, tools }
      if (Array.isArray(parsedResume.skills)) {
        for (const sk of parsedResume.skills) {
          const skName = typeof sk === 'string' ? sk.trim() : sk.name?.trim();
          if (skName && !inferredSet.has(skName.toLowerCase())) {
            inferredSet.add(skName.toLowerCase());
            inferredList.push({ name: skName, source: 'skills_section' });
          }
        }
      } else if (parsedResume.skills && typeof parsedResume.skills === 'object') {
        const skillGroups = [
          ...(Array.isArray(parsedResume.skills.technical) ? parsedResume.skills.technical : []),
          ...(Array.isArray(parsedResume.skills.tools) ? parsedResume.skills.tools : []),
          ...(Array.isArray(parsedResume.skills.soft) ? parsedResume.skills.soft : []),
        ];
        for (const sk of skillGroups) {
          const skName = typeof sk === 'string' ? sk.trim() : (sk as any)?.name?.trim();
          if (skName && !inferredSet.has(skName.toLowerCase())) {
            inferredSet.add(skName.toLowerCase());
            inferredList.push({ name: skName, source: 'skills_section' });
          }
        }
      }

      // Extract work experience
      if (Array.isArray(parsedResume.experience)) {
        for (const exp of parsedResume.experience) {
          if (exp && (exp.company || exp.position)) {
            experienceItems.push({
              id: exp.id,
              company: exp.company || 'Company',
              position: exp.position || 'Role',
              startDate: exp.startDate,
              endDate: exp.endDate,
              current: Boolean(exp.current),
              location: exp.location,
              description: exp.description,
              bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
            });
          }
        }
      }

      const knownTerms = Array.from(
        new Set([
          ...getAllCuratedSkillSuggestions(),
          'React', 'Python', 'JavaScript', 'TypeScript', 'Java', 'SQL', 'AWS', 'Docker',
          'Git', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind', 'GraphQL', 'Redis', 'Kubernetes',
          'C++', 'Go', 'Linux', 'MongoDB', 'REST APIs', 'FastAPI', 'Django',
        ])
      );
      const rawText = JSON.stringify(parsedResume).toLowerCase();
      for (const term of knownTerms) {
        if (rawText.includes(term.toLowerCase()) && !inferredSet.has(term.toLowerCase())) {
          inferredSet.add(term.toLowerCase());
          inferredList.push({ name: term, source: 'resume_experience' });
        }
      }
    } catch { }
  }

  // Infer skills from documented academic projects
  if (academicContext?.documentedProjects) {
    for (const proj of academicContext.documentedProjects) {
      if (Array.isArray(proj.techStack)) {
        for (const tech of proj.techStack) {
          const tClean = tech.trim();
          if (tClean && !inferredSet.has(tClean.toLowerCase())) {
            inferredSet.add(tClean.toLowerCase());
            inferredList.push({ name: tClean, source: 'resume_project' });
          }
        }
      }
    }
  }

  // Infer skills from guided projects
  for (const gp of guidedProjects) {
    if (Array.isArray(gp.techStack)) {
      for (const tech of gp.techStack) {
        const tClean = tech.trim();
        if (tClean && !inferredSet.has(tClean.toLowerCase())) {
          inferredSet.add(tClean.toLowerCase());
          inferredList.push({ name: tClean, source: 'guided_project' });
        }
      }
    }
  }

  const allKnownSkillNames = new Set([
    ...verifiedList.map((v) => v.name.toLowerCase()),
    ...confirmedList.map((c) => c.name.toLowerCase()),
    ...claimedList.map((c) => c.name.toLowerCase()),
    ...inferredList.map((i) => i.name.toLowerCase()),
  ]);
  const verifiedNames = new Set(verifiedList.map((v) => v.name.toLowerCase()));

  const needingAssessmentSet = new Set<string>();
  for (const c of confirmedList) {
    if (!verifiedNames.has(c.name.toLowerCase())) needingAssessmentSet.add(c.name);
  }
  for (const c of claimedList) {
    if (!verifiedNames.has(c.name.toLowerCase())) needingAssessmentSet.add(c.name);
  }
  for (const inf of inferredList) {
    if (!verifiedNames.has(inf.name.toLowerCase())) needingAssessmentSet.add(inf.name);
  }

  const missingCritical = roleSpec.criticalSkills.filter((crit) => !allKnownSkillNames.has(crit.toLowerCase()));
  const missingRecommended = roleSpec.recommendedSkills.filter((rec) => !allKnownSkillNames.has(rec.toLowerCase()));
  const matchingCritical = roleSpec.criticalSkills.filter((crit) => allKnownSkillNames.has(crit.toLowerCase()));

  const skillsContext: UnifiedSkillsContext = {
    verified: verifiedList,
    confirmed: confirmedList,
    claimed: claimedList,
    inferred: inferredList,
    needingAssessment: Array.from(needingAssessmentSet),
    missingCritical,
    missingRecommended,
    matchingCritical,
  };

  // 4c. Experience Context Synthesis
  const hasInternship = experienceItems.some((e) =>
    (e.position || '').toLowerCase().includes('intern') ||
    (e.description || '').toLowerCase().includes('intern')
  );
  const experienceContext: UnifiedExperienceContext = {
    totalCount: experienceItems.length,
    items: experienceItems,
    primaryRole: experienceItems[0]?.position || undefined,
    hasInternship,
  };

  // 4d. Assessment Scores Synthesis
  const mappedAssessments: UnifiedAssessmentScoreItem[] = (assessmentRows || []).map((a) => ({
    id: String(a.id),
    skill: String(a.skill),
    score: Number(a.score) || 0,
    totalQuestions: Number(a.total_questions) || 10,
    passed: Boolean(Number(a.passed) === 1 || a.passed === true),
    date: a.created_at || '',
  }));
  const passedAssessments = mappedAssessments.filter((a) => a.passed);
  const avgAssessmentScore =
    mappedAssessments.length > 0
      ? Math.round(mappedAssessments.reduce((sum, a) => sum + a.score, 0) / mappedAssessments.length)
      : null;

  const assessmentContext: UnifiedAssessmentScoresContext = {
    totalAttempts: mappedAssessments.length,
    passedCount: passedAssessments.length,
    averageScore: avgAssessmentScore,
    recentAssessments: mappedAssessments.slice(0, 5),
  };

  // 4e. Tracked & Saved Jobs Synthesis
  // Build a lookup map of match scores from job_matches
  const matchScoreMap = new Map<string, number>();
  (fallbackJobMatchRows || []).forEach((m: any) => {
    if (m.job_id && typeof m.match_score === 'number') {
      matchScoreMap.set(String(m.job_id), m.match_score);
    }
  });

  let mappedSavedJobs: UnifiedSavedJobItem[] = [];

  if (savedJobRows && savedJobRows.length > 0) {
    mappedSavedJobs = savedJobRows.map((sj: any) => ({
      id: String(sj.id),
      jobId: sj.job_id || null,
      jobTitle: sj.job_title || 'Target Role',
      title: sj.job_title || 'Target Role',
      company: sj.company || 'Company',
      location: sj.location || null,
      source: sj.source || 'Manual',
      status: sj.status || 'Saved',
      descriptionSnippet: typeof sj.description_snippet === 'string' ? sj.description_snippet.trim() : null,
      salary: sj.salary || null,
      matchScore: sj.job_id && matchScoreMap.has(String(sj.job_id)) ? matchScoreMap.get(String(sj.job_id))! : null,
      savedAt: sj.created_at || '',
    }));
  } else if (fallbackJobMatchRows && fallbackJobMatchRows.length > 0) {
    mappedSavedJobs = fallbackJobMatchRows.map((jm: any) => ({
      id: String(jm.id),
      jobId: jm.job_id || null,
      jobTitle: jm.job_title || 'Target Role',
      title: jm.job_title || 'Target Role',
      company: jm.company || 'Company',
      location: null,
      source: 'Matched',
      status: 'Saved',
      descriptionSnippet: null,
      salary: null,
      matchScore: typeof jm.match_score === 'number' ? jm.match_score : null,
      savedAt: jm.created_at || '',
    }));
  }

  const savedJobsContext: UnifiedSavedJobsContext = {
    totalCount: Number(savedJobCountRow?.count) > 0 ? Number(savedJobCountRow.count) : mappedSavedJobs.length,
    jobs: mappedSavedJobs,
  };

  // 4f. Chat Interaction Context
  const chatHistoryContext: UnifiedChatHistoryContext = {
    lastActiveAt: new Date().toISOString(),
    activeWorkflow: null,
  };

  // 4g. Next Recommended Actions
  const nextRecommendedActions: UnifiedStudentContext['nextRecommendedActions'] = [];

  if (!targetRole) {
    nextRecommendedActions.push({
      title: 'Set Your Target Role',
      description: 'Choose or type a target role to unlock tailored skill roadmaps and project ideas.',
      href: '/onboarding',
      priority: 'high',
      actionText: 'Set Goal',
    });
  }

  if ((resumeRows?.length || 0) === 0) {
    nextRecommendedActions.push({
      title: 'Create Your Professional Resume',
      description: 'Build an ATS-optimized A4 resume tailored for your target role in the builder.',
      href: '/builder',
      priority: 'high',
      actionText: 'Build Resume',
    });
  }

  if (skillsContext.needingAssessment.length > 0) {
    const unverifiedSkill = skillsContext.needingAssessment[0];
    nextRecommendedActions.push({
      title: `Verify ${unverifiedSkill} Assessment`,
      description: `Take the 10-question proctored evaluation to earn a cryptographic certificate in ${unverifiedSkill}.`,
      href: `/skills/assess/${encodeURIComponent(unverifiedSkill)}`,
      priority: 'high',
      actionText: 'Start Assessment',
    });
  }

  nextRecommendedActions.push({
    title: targetRole ? `Practice ${targetRole} Interview` : 'Practice Structured Interviews',
    description: `Prepare for role-focused and behavioral interview questions with structured evaluation.`,
    href: '/interview-prep',
    priority: 'medium',
    actionText: 'Practice Interview',
  });

  nextRecommendedActions.push({
    title: 'Explore Matching Job Openings',
    description: `Discover verified live job openings matching your verified skills and qualifications.`,
    href: '/jobs',
    priority: 'medium',
    actionText: 'Browse Jobs',
  });

  // 5. Resume Intelligence
  const parseKeywords = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
      return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const resumeContext: UnifiedResumeContext = {
    hasResume: Boolean(activeResume),
    resumesCount: resumeRows?.length || 0,
    activeResumeId: activeResume?.id || null,
    latestAtsScore: atsRow ? Number(atsRow.ats_score) : null,
    keywordScore: atsRow ? Number(atsRow.keyword_score) : null,
    formattingScore: atsRow ? Number(atsRow.formatting_score) : null,
    sectionScore: atsRow ? Number(atsRow.section_score) : null,
    wordCount: atsRow?.word_count ? Number(atsRow.word_count) : null,
    readabilityScore: atsRow?.readability_score ? Number(atsRow.readability_score) : null,
    detectedKeywords: parseKeywords(atsRow?.detected_keywords),
    missingKeywords: parseKeywords(atsRow?.missing_keywords),
    analyzedAt: atsRow?.analyzed_at || atsRow?.created_at || null,
  };

  // 6. Guided Projects Synthesis
  const mappedGuidedProjects: UnifiedGuidedProjectItem[] = (guidedProjects || []).map((gp) => {
    const totalMilestones = Array.isArray(gp.milestones) ? gp.milestones.length : 0;
    const completedMilestones = Array.isArray(gp.milestones)
      ? gp.milestones.filter((m: any) => m.status === 'completed').length
      : 0;
    const milestoneProgress = typeof gp.progressPercent === 'number'
      ? gp.progressPercent
      : totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    return {
      id: gp.id,
      title: gp.title,
      techStack: gp.techStack || [],
      difficulty: gp.difficulty || 'Intermediate',
      status: (gp.status as any) || 'in_progress',
      milestoneProgress,
      exportedToResume: Array.isArray(gp.resumeBullets) && gp.resumeBullets.length > 0,
      completedAt: gp.status === 'completed' ? gp.updatedAt : null,
    };
  });

  const projectsContext: UnifiedProjectsContext = {
    totalCount: mappedGuidedProjects.length,
    inProgressCount: mappedGuidedProjects.filter((p) => p.status === 'in_progress').length,
    completedCount: mappedGuidedProjects.filter((p) => p.status === 'completed' || p.milestoneProgress === 100).length,
    exportedCount: mappedGuidedProjects.filter((p) => p.exportedToResume).length,
    projects: mappedGuidedProjects,
  };

  // 7. Applications Synthesis
  const mappedApplications: UnifiedApplicationItem[] = (applicationRows || []).map((app) => ({
    id: String(app.id),
    jobId: app.job_id || null,
    jobTitle: app.job_title || 'Software Role',
    company: app.company || 'Tech Company',
    location: app.location || null,
    status: app.status || 'Applied',
    appliedAt: app.applied_at || '',
  }));

  const activeApps = mappedApplications.filter(
    (a) => !['Rejected', 'Offer Accepted', 'Withdrawn'].includes(a.status)
  );
  const interviewingApps = mappedApplications.filter((a) =>
    ['Interviewing', 'Interview Scheduled', 'Technical Round', 'Final Round'].includes(a.status)
  );

  const applicationsContext: UnifiedApplicationsContext = {
    totalCount: mappedApplications.length,
    activeCount: activeApps.length,
    interviewingCount: interviewingApps.length,
    recentApplications: mappedApplications,
  };

  // 8. Interview Performance Synthesis
  let totalScoreSum = 0;
  let scoredSessionsCount = 0;
  const recurringWeaknessesCount: Record<string, number> = {};
  const topStrengthsCount: Record<string, number> = {};

  const mappedInterviewSessions = (interviewSessions || []).map((s) => {
    if (s.overall_score !== null && s.overall_score !== undefined) {
      totalScoreSum += Number(s.overall_score);
      scoredSessionsCount++;
    }

    if (Array.isArray(s.answers)) {
      for (const ans of s.answers) {
        if (Array.isArray(ans.improvements)) {
          for (const imp of ans.improvements) {
            const key = imp.trim();
            if (key) recurringWeaknessesCount[key] = (recurringWeaknessesCount[key] || 0) + 1;
          }
        }
        if (Array.isArray(ans.strengths)) {
          for (const str of ans.strengths) {
            const key = str.trim();
            if (key) topStrengthsCount[key] = (topStrengthsCount[key] || 0) + 1;
          }
        }
      }
    }

    return {
      id: s.id,
      targetRole: s.target_role,
      overallScore: s.overall_score !== null ? Number(s.overall_score) : null,
      status: s.status,
      createdAt: s.created_at,
    };
  });

  const recurringWeaknesses = Object.entries(recurringWeaknessesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([weakness]) => weakness);

  const topStrengths = Object.entries(topStrengthsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([strength]) => strength);

  const interviewContext: UnifiedInterviewContext = {
    totalSessions: mappedInterviewSessions.length,
    completedSessions: mappedInterviewSessions.filter((s) => s.status === 'completed').length,
    averageScore: scoredSessionsCount > 0 ? Math.round(totalScoreSum / scoredSessionsCount) : null,
    topStrengths,
    recurringWeaknesses,
    recentSessions: mappedInterviewSessions.slice(0, 5),
  };

  // 9. Learning Roadmap Synthesis
  let learningContext: UnifiedLearningContext = {
    hasActiveRoadmap: false,
    targetRole: null,
    completedStepsCount: 0,
    totalStepsCount: 0,
    progressPercent: 0,
    currentMilestoneTitle: null,
  };

  if (roadmapRow && roadmapRow.roadmap_data) {
    const rd = roadmapRow.roadmap_data;
    const steps = Array.isArray(rd.steps) ? rd.steps : [];
    const completedSteps = steps.filter((st: any) => st.isCompleted || st.status === 'completed').length;
    const totalSteps = steps.length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let currentMilestoneTitle: string | null = null;
    if (Array.isArray(rd.milestones)) {
      const activeMs = rd.milestones.find((m: any) => m.status === 'in_progress' || !m.isCompleted);
      if (activeMs) currentMilestoneTitle = activeMs.title;
    }

    learningContext = {
      hasActiveRoadmap: true,
      targetRole: roadmapRow.target_role || null,
      completedStepsCount: completedSteps,
      totalStepsCount: totalSteps,
      progressPercent,
      currentMilestoneTitle,
    };
  }

  // 10. Explainable Career Readiness
  const baseCareerSummary: CareerProfileSummary = {
    userId,
    name: userName,
    email: userEmail,
    targetRole,
    targetIndustry: careerGoalContext.targetIndustry,
    experienceLevel,
    preferredLocation: careerGoalContext.preferredLocations[0] || null,
    targetSalary: careerGoalContext.targetSalary,
    skills: {
      verified: verifiedList,
      claimed: claimedList,
      inferred: inferredList.map((i) => ({
        name: i.name,
        source: (i.source === 'guided_project' ? 'resume_project' : i.source) as 'resume_experience' | 'resume_project' | 'skills_section',
      })),
      needingAssessment: skillsContext.needingAssessment,
    },
    metrics: {
      verifiedCount: verifiedList.length,
      claimedCount: claimedList.length,
      inferredCount: inferredList.length,
      readinessScore: 0,
      activeApplicationsCount: applicationsContext.activeCount,
      savedResumesCount: resumeContext.resumesCount,
    },
    recentAssessments: mappedAssessments.slice(0, 5),
    nextRecommendedActions,
    studentProfile,
    latestAtsAnalysis: atsRow
      ? {
        atsScore: resumeContext.latestAtsScore || 0,
        keywordScore: resumeContext.keywordScore || 0,
        formattingScore: resumeContext.formattingScore || 0,
        sectionScore: resumeContext.sectionScore || 0,
        detectedKeywords: resumeContext.detectedKeywords,
        missingKeywords: resumeContext.missingKeywords,
        createdAt: resumeContext.analyzedAt || undefined,
      }
      : null,
    recentApplications: mappedApplications.slice(0, 5),
    skillGaps: {
      missingCriticalSkills: skillsContext.missingCritical,
      missingRecommendedSkills: skillsContext.missingRecommended,
      matchingSkills: skillsContext.matchingCritical,
    },
  };

  const readiness = calculateExplainableReadiness(baseCareerSummary, {
    latestAtsScore: resumeContext.latestAtsScore,
    interviewAverageScore: interviewContext.averageScore,
  });

  // Fetch or record initial readiness history snapshot
  let readinessHistory = await getUserReadinessHistory(userId, 10);
  if (readinessHistory.length === 0) {
    const initialSnap = await recordReadinessSnapshot(userId, {
      overallScore: readiness.overallScore,
      overallLevel: readiness.overallLevel,
      technicalScore: readiness.quadrants.technicalCompetency.score,
      projectScore: readiness.quadrants.projectEvidence.score,
      resumeScore: readiness.quadrants.resumeAts.score,
      interviewScore: readiness.quadrants.interviewFluency.score,
      triggerActivity: 'initial_baseline',
      activityDetail: 'Initial Career Command Center baseline recorded',
    });
    if (initialSnap) {
      readinessHistory = [initialSnap];
    }
  }

  const unified: UnifiedStudentContext = {
    userId,
    name: userName,
    email: userEmail,
    academic: academicContext,
    careerGoal: careerGoalContext,
    careerInterests: careerInterestsContext,
    skills: skillsContext,
    experience: experienceContext,
    resume: resumeContext,
    projects: projectsContext,
    applications: applicationsContext,
    interviews: interviewContext,
    learning: learningContext,
    assessments: assessmentContext,
    savedJobs: savedJobsContext,
    chatHistory: chatHistoryContext,
    readiness,
    readinessHistory,
    nextRecommendedActions,
    studentProfile,
    updatedAt: new Date().toISOString(),
  };

  // Cache for 10 seconds
  contextCache.set(userId, { data: unified, expiresAt: Date.now() + 10_000 });
  return unified;
}

// Canonical alias for backward compatibility across modules
export const getUnifiedStudentContext = buildUnifiedStudentContext;

/**
 * Maps a UnifiedStudentContext to a CareerProfileSummary DTO for seamless compatibility.
 */
export function mapUnifiedToCareerProfileSummary(context: UnifiedStudentContext): CareerProfileSummary {
  const roleSpec = findRoleSpecification(context.careerGoal.targetRole);
  const allUserSkillNames = new Set([
    ...context.skills.verified.map((v) => v.name.toLowerCase()),
    ...context.skills.claimed.map((c) => c.name.toLowerCase()),
    ...context.skills.inferred.map((i) => i.name.toLowerCase()),
  ]);

  let criticalHits = 0;
  for (const crit of roleSpec.criticalSkills) {
    if (allUserSkillNames.has(crit.toLowerCase())) {
      criticalHits++;
    }
  }

  const readinessPercent =
    roleSpec.criticalSkills.length > 0
      ? Math.min(
        100,
        Math.round((criticalHits / roleSpec.criticalSkills.length) * 85 + (context.skills.verified.length > 0 ? 15 : 0))
      )
      : context.careerGoal.targetRole
        ? context.skills.verified.length > 0
          ? 55
          : 25
        : 0;

  return {
    userId: context.userId,
    name: context.name,
    email: context.email,
    targetRole: context.careerGoal.targetRole,
    targetIndustry: context.careerGoal.targetIndustry,
    experienceLevel: context.careerGoal.experienceLevel,
    preferredLocation: context.careerGoal.preferredLocations[0] || null,
    targetSalary: context.careerGoal.targetSalary,
    skills: {
      verified: context.skills.verified,
      claimed: context.skills.claimed,
      inferred: context.skills.inferred.map((i) => ({
        name: i.name,
        source: (i.source === 'guided_project' ? 'resume_project' : i.source) as 'resume_experience' | 'resume_project' | 'skills_section',
      })),
      needingAssessment: context.skills.needingAssessment,
    },
    metrics: {
      verifiedCount: context.skills.verified.length,
      claimedCount: context.skills.claimed.length,
      inferredCount: context.skills.inferred.length,
      readinessScore: context.readiness.overallScore || readinessPercent,
      activeApplicationsCount: context.applications.activeCount,
      savedResumesCount: context.resume.resumesCount,
    },
    recentAssessments: context.assessments.recentAssessments,
    nextRecommendedActions: context.nextRecommendedActions,
    studentProfile: context.studentProfile,
    latestAtsAnalysis: context.resume.hasResume && context.resume.latestAtsScore !== null
      ? {
        atsScore: context.resume.latestAtsScore,
        keywordScore: context.resume.keywordScore || 0,
        formattingScore: context.resume.formattingScore || 0,
        sectionScore: context.resume.sectionScore || 0,
        detectedKeywords: context.resume.detectedKeywords,
        missingKeywords: context.resume.missingKeywords,
        createdAt: context.resume.analyzedAt || undefined,
      }
      : null,
    recentApplications: context.applications.recentApplications.slice(0, 5),
    skillGaps: {
      missingCriticalSkills: context.skills.missingCritical,
      missingRecommendedSkills: context.skills.missingRecommended,
      matchingSkills: context.skills.matchingCritical,
    },
    explainableReadiness: context.readiness,
  };
}

/**
 * Records a dated career readiness snapshot whenever a meaningful activity occurs
 * (e.g. Assessment passed, Resume analyzed, Milestone completed, Interview done).
 */
export async function recordStudentReadinessSnapshot(
  userId: string,
  triggerActivity: string,
  activityDetail?: string
): Promise<ReadinessSnapshotRecord | null> {
  clearStudentContextCache(userId);
  const context = await getUnifiedStudentContext(userId);
  return recordReadinessSnapshot(userId, {
    overallScore: context.readiness.overallScore,
    overallLevel: context.readiness.overallLevel,
    technicalScore: context.readiness.quadrants.technicalCompetency.score,
    projectScore: context.readiness.quadrants.projectEvidence.score,
    resumeScore: context.readiness.quadrants.resumeAts.score,
    interviewScore: context.readiness.quadrants.interviewFluency.score,
    triggerActivity,
    activityDetail,
  });
}

/**
 * Builds standard system grounding text from a UnifiedStudentContext to inject into LLMs.
 * Ensures consistent prompt context across AI Assistant, Project Mentor, Job Assistant, and Interview Coach.
 */
export function buildUnifiedSystemGrounding(context: UnifiedStudentContext): string {
  const vSkills = context.skills.verified.map((v) => `${v.name} (${v.score}%)`).join(', ');
  const confSkills = (context.skills.confirmed || []).map((c) => `${c.name} (confirmed)`).join(', ');
  const cSkills = context.skills.claimed.map((c) => c.name).join(', ');
  const iSkills = context.skills.inferred.map((i) => i.name).join(', ');

  let grounding = `AUTHENTIC AUTHORIZED STUDENT CONTEXT:
- Student Name: ${context.name}
- Target Career Role: ${context.careerGoal.targetRole || 'Goal not set'}
- Experience Level: ${context.careerGoal.experienceLevel}
- Overall Career Readiness Score: ${context.readiness.overallScore}/100 (${context.readiness.overallLevel})
  • Technical Competency: ${context.readiness.quadrants.technicalCompetency.score}% (${context.readiness.quadrants.technicalCompetency.level})
  • Project Evidence: ${context.readiness.quadrants.projectEvidence.score}% (${context.readiness.quadrants.projectEvidence.level})
  • Resume ATS Alignment: ${context.readiness.quadrants.resumeAts.score}% (${context.readiness.quadrants.resumeAts.level})
  • Interview Fluency: ${context.readiness.quadrants.interviewFluency.score}% (${context.readiness.quadrants.interviewFluency.level})
- Verified Skills: ${vSkills || 'None completed yet'}
- Confirmed Skills: ${confSkills || 'None'}
- Claimed Skills: ${cSkills || 'None'}
- Inferred Skills: ${iSkills || 'None'}
- Missing Critical Role Skills: ${context.skills.missingCritical.join(', ') || 'All critical skills met'}
- Skills Needing Assessment: ${context.skills.needingAssessment.slice(0, 6).join(', ') || 'None pending'}`;

  if (context.academic) {
    const ac = context.academic;
    grounding += `\n- Academic Standing: ${ac.degree} in ${ac.fieldOfStudy} at ${ac.institution} (Class of ${ac.graduationMonth ? ac.graduationMonth + ' ' : ''}${ac.graduationYear})${ac.cgpa ? ', CGPA: ' + ac.cgpa : ''}${ac.currentSemester ? ', ' + ac.currentSemester : ''}
- Target Opportunity Type: ${ac.targetWorkType === 'internship' ? 'Internships' : ac.targetWorkType === 'full_time' ? 'Full-Time Fresher Roles' : 'Internships & Entry-Level Roles'}
- Core Coursework: ${ac.coursework.join(', ') || 'Standard Computer Science Curriculum'}`;
  }

  if (context.resume.hasResume) {
    grounding += `\n- Resume ATS Score: ${context.resume.latestAtsScore || 'Pending analysis'}/100 (Keywords: ${context.resume.keywordScore || 0}/100, Format: ${context.resume.formattingScore || 0}/100)
- ATS Missing Keywords: ${context.resume.missingKeywords.slice(0, 8).join(', ') || 'None identified'}`;
  } else {
    grounding += `\n- Resume Status: No resume created or uploaded yet`;
  }

  if (context.experience.totalCount > 0) {
    const expSummary = context.experience.items
      .slice(0, 3)
      .map((e) => `${e.position} at ${e.company}${e.startDate ? ` (${e.startDate} - ${e.endDate || (e.current ? 'Present' : '')})` : ''}`)
      .join('; ');
    grounding += `\n- Practical Work Experience: ${expSummary}`;
  }

  if (context.assessments.totalAttempts > 0) {
    grounding += `\n- Assessments Completed: ${context.assessments.passedCount}/${context.assessments.totalAttempts} passed (Avg Score: ${context.assessments.averageScore ?? 'N/A'}%)`;
  }

  if (context.savedJobs.totalCount > 0) {
    grounding += `\n- Target Jobs Tracked: (Total: ${context.savedJobs.totalCount}):`;
    context.savedJobs.jobs.slice(0, 5).forEach((j, idx) => {
      grounding += `\n  ${idx + 1}. ${j.jobTitle} at ${j.company} [Status: ${j.status || 'Saved'}${j.source ? `, Source: ${j.source}` : ''}]`;
      if (idx < 3 && j.descriptionSnippet) {
        const cleanSnippet = j.descriptionSnippet.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 300);
        grounding += `\n     <untrusted_job_description>\n     ${cleanSnippet}\n     </untrusted_job_description>`;
      }
    });
  }

  if (context.projects.totalCount > 0) {
    const projSummary = context.projects.projects
      .map((p) => `${p.title} (${p.difficulty}, ${p.status}, ${p.milestoneProgress}% complete)`)
      .join('; ');
    grounding += `\n- Guided Projects: ${projSummary}`;
  }

  if (context.interviews.totalSessions > 0) {
    grounding += `\n- Interview Sessions: ${context.interviews.totalSessions} completed (Avg Score: ${context.interviews.averageScore ?? 'N/A'}/100)
- Recurring Interview Weaknesses: ${context.interviews.recurringWeaknesses.join(', ') || 'None detected'}`;
  }

  if (context.learning.hasActiveRoadmap) {
    grounding += `\n- Learning Roadmap: ${context.learning.progressPercent}% completed (${context.learning.completedStepsCount}/${context.learning.totalStepsCount} steps done; Active: ${context.learning.currentMilestoneTitle || 'In progress'})`;
  }

  if (context.applications.totalCount > 0) {
    const appSummary = context.applications.recentApplications
      .slice(0, 4)
      .map((a) => `${a.company} (${a.jobTitle} - ${a.status})`)
      .join('; ');
    grounding += `\n- Job Application Pipeline: ${appSummary}`;
  }

  return grounding;
}
