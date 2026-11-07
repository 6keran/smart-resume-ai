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

export interface ReadinessSnapshotRecord {
  id: string;
  userId: string;
  overallScore: number;
  overallLevel: string;
  technicalScore: number;
  projectScore: number;
  resumeScore: number;
  interviewScore: number;
  triggerActivity: string;
  activityDetail: string | null;
  createdAt: string;
}

export interface CareerTimelineItem {
  id: string;
  type:
    | 'profile_completed'
    | 'resume_analyzed'
    | 'assessment_completed'
    | 'project_milestone'
    | 'project_completed'
    | 'interview_completed'
    | 'job_applied'
    | 'certificate_earned';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  href?: string;
  meta?: Record<string, any>;
}

export interface CareerAchievementItem {
  id: string;
  type: 'certificate' | 'project' | 'ats_milestone' | 'interview_mastery' | 'assessment_passed';
  title: string;
  subtitle: string;
  date: string;
  badge: string;
  href?: string;
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

export interface UnifiedApplicationItem {
  id: string;
  jobId?: string | null;
  jobTitle: string;
  company: string;
  location?: string | null;
  status: string;
  appliedAt: string;
}

export interface UnifiedStudentContext {
  userId: string;
  name: string;
  email: string | null;
  academic: {
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
  } | null;
  careerGoal: {
    targetRole: string;
    targetIndustry: string | null;
    experienceLevel: string;
    preferredLocations: string[];
    targetSalary: string | null;
    skillsSummary: string | null;
  };
  skills: {
    verified: Array<{ name: string; score: number; certificateId?: string; verifiedDate?: string }>;
    claimed: Array<{ name: string; claimedDate?: string }>;
    inferred: Array<{ name: string; source: 'resume_experience' | 'resume_project' | 'skills_section' | 'guided_project' }>;
    needingAssessment: string[];
    missingCritical: string[];
    missingRecommended: string[];
    matchingCritical: string[];
  };
  resume: {
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
  };
  projects: {
    totalCount: number;
    inProgressCount: number;
    completedCount: number;
    exportedCount: number;
    projects: UnifiedGuidedProjectItem[];
  };
  applications: {
    totalCount: number;
    activeCount: number;
    interviewingCount: number;
    recentApplications: UnifiedApplicationItem[];
  };
  interviews: {
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
  };
  learning: {
    hasActiveRoadmap: boolean;
    targetRole: string | null;
    completedStepsCount: number;
    totalStepsCount: number;
    progressPercent: number;
    currentMilestoneTitle: string | null;
  };
  readiness: ExplainableReadinessResult;
  readinessHistory: ReadinessSnapshotRecord[];
  updatedAt: string;
}

export interface CareerActionItem {
  id: string;
  category: 'skills' | 'projects' | 'resume' | 'jobs' | 'interview';
  priority: 'high' | 'medium' | 'low';
  title: string;
  why: string;
  evidence: string;
  expectedBenefit: string;
  concreteNextAction: string;
  href: string;
  actionText: string;
}

export interface CareerActionPlan {
  userId: string;
  targetRole: string;
  overallReadiness: number;
  totalActionsCount: number;
  highPriorityCount: number;
  actions: CareerActionItem[];
  generatedAt: string;
}

