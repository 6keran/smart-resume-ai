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
  targetRole: string;
  targetIndustry: string | null;
  experienceLevel: string;
  preferredLocations: string[];
  targetSalary: string | null;
  skillsSummary: string | null;
}

export interface UnifiedSkillItem {
  name: string;
  status: 'verified' | 'claimed' | 'inferred';
  score?: number;
  certificateId?: string;
  verifiedDate?: string;
  claimedDate?: string;
  inferredSource?: 'resume_experience' | 'resume_project' | 'skills_section' | 'guided_project';
}

export interface UnifiedSkillsContext {
  verified: Array<{ name: string; score: number; certificateId?: string; verifiedDate?: string }>;
  claimed: Array<{ name: string; claimedDate?: string }>;
  inferred: Array<{ name: string; source: 'resume_experience' | 'resume_project' | 'skills_section' | 'guided_project' }>;
  needingAssessment: string[];
  missingCritical: string[];
  missingRecommended: string[];
  matchingCritical: string[];
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
  skills: UnifiedSkillsContext;
  resume: UnifiedResumeContext;
  projects: UnifiedProjectsContext;
  applications: UnifiedApplicationsContext;
  interviews: UnifiedInterviewContext;
  learning: UnifiedLearningContext;
  readiness: ExplainableReadinessResult;
  readinessHistory: ReadinessSnapshotRecord[];
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
export async function getUnifiedStudentContext(userId: string): Promise<UnifiedStudentContext> {
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
  ]);

  const userName = userRow?.name || 'Candidate';
  const userEmail = userRow?.email || null;

  // 2. Normalize Career Goal & Target Role
  const targetRole = studentProfile?.targetRole || careerGoal?.target_role || 'Graduate Software Engineer';
  const experienceLevel = careerGoal?.experience_level || (studentProfile ? 'Fresher / Entry Level' : 'Entry Level');
  const roleSpec = findRoleSpecification(targetRole);

  const careerGoalContext: UnifiedCareerGoalContext = {
    targetRole,
    targetIndustry: careerGoal?.target_industry || null,
    experienceLevel,
    preferredLocations: studentProfile?.preferredLocations || (careerGoal?.preferred_location ? [careerGoal.preferred_location] : []),
    targetSalary: careerGoal?.target_salary || null,
    skillsSummary: careerGoal?.skills_summary || null,
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
    } else if (s.status === 'claimed') {
      claimedList.push({
        name: s.name,
        claimedDate: s.claimedDate,
      });
    }
  }

  // Infer skills from latest saved resume
  const activeResume = resumeRows?.[0] || null;
  if (activeResume?.resume_data) {
    try {
      const parsedResume = JSON.parse(activeResume.resume_data);
      if (Array.isArray(parsedResume.skills)) {
        for (const sk of parsedResume.skills) {
          const skName = typeof sk === 'string' ? sk.trim() : sk.name?.trim();
          if (skName && !inferredSet.has(skName.toLowerCase())) {
            inferredSet.add(skName.toLowerCase());
            inferredList.push({ name: skName, source: 'skills_section' });
          }
        }
      }
      const knownTechTerms = [
        'React', 'Python', 'JavaScript', 'TypeScript', 'Java', 'SQL', 'AWS', 'Docker',
        'Git', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind', 'GraphQL', 'Redis', 'Kubernetes',
        'C++', 'Go', 'Linux', 'MongoDB', 'REST APIs', 'FastAPI', 'Django'
      ];
      const rawText = JSON.stringify(parsedResume).toLowerCase();
      for (const term of knownTechTerms) {
        if (rawText.includes(term.toLowerCase()) && !inferredSet.has(term.toLowerCase())) {
          inferredSet.add(term.toLowerCase());
          inferredList.push({ name: term, source: 'resume_experience' });
        }
      }
    } catch {}
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
    ...claimedList.map((c) => c.name.toLowerCase()),
    ...inferredList.map((i) => i.name.toLowerCase()),
  ]);
  const verifiedNames = new Set(verifiedList.map((v) => v.name.toLowerCase()));

  const needingAssessmentSet = new Set<string>();
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
    claimed: claimedList,
    inferred: inferredList,
    needingAssessment: Array.from(needingAssessmentSet),
    missingCritical,
    missingRecommended,
    matchingCritical,
  };

  // 5. Resume Intelligence
  const parseKeywords = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
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
    recentAssessments: [],
    nextRecommendedActions: [],
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
    skills: skillsContext,
    resume: resumeContext,
    projects: projectsContext,
    applications: applicationsContext,
    interviews: interviewContext,
    learning: learningContext,
    readiness,
    readinessHistory,
    updatedAt: new Date().toISOString(),
  };

  // Cache for 10 seconds
  contextCache.set(userId, { data: unified, expiresAt: Date.now() + 10_000 });
  return unified;
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
  const cSkills = context.skills.claimed.map((c) => c.name).join(', ');
  const iSkills = context.skills.inferred.map((i) => i.name).join(', ');

  let grounding = `AUTHENTIC AUTHORIZED STUDENT CONTEXT:
- Student Name: ${context.name}
- Target Career Role: ${context.careerGoal.targetRole}
- Experience Level: ${context.careerGoal.experienceLevel}
- Overall Career Readiness Score: ${context.readiness.overallScore}/100 (${context.readiness.overallLevel})
  • Technical Competency: ${context.readiness.quadrants.technicalCompetency.score}% (${context.readiness.quadrants.technicalCompetency.level})
  • Project Evidence: ${context.readiness.quadrants.projectEvidence.score}% (${context.readiness.quadrants.projectEvidence.level})
  • Resume ATS Alignment: ${context.readiness.quadrants.resumeAts.score}% (${context.readiness.quadrants.resumeAts.level})
  • Interview Fluency: ${context.readiness.quadrants.interviewFluency.score}% (${context.readiness.quadrants.interviewFluency.level})
- Verified Skills: ${vSkills || 'None completed yet'}
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
