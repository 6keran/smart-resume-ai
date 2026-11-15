import 'server-only';
import {
  type UnifiedStudentContext,
  getUnifiedStudentContext,
} from '@/server/services/unifiedStudentContext';

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

/**
 * Dynamically evaluates a student's authoritative context and generates explainable,
 * high-impact, evidence-backed career actions.
 */
export function generateProactiveCareerActions(context: UnifiedStudentContext): CareerActionPlan {
  const actions: CareerActionItem[] = [];
  const targetRole = (context.careerGoal.targetRole || '').trim();
  const displayRole = targetRole || 'your career goal';

  if (!targetRole) {
    actions.push({
      id: 'act-goal-not-set',
      category: 'skills',
      priority: 'high',
      title: 'Set Your Target Role to Personalize Guidance',
      why: 'Skill comparisons, suggested projects, and learning resources adapt dynamically once your target role is configured.',
      evidence: 'Target role is currently not set on your career profile.',
      expectedBenefit: 'Unlocks role-matched skills, curated project ideas, and relevant learning resources across every field.',
      concreteNextAction: 'Choose or type your target role in Onboarding or My Career Data.',
      href: '/onboarding',
      actionText: 'Set Target Role',
    });
  }

  // --------------------------------------------------------------------------
  // 1. SKILL-GAP & VERIFICATION ACTIONS
  // --------------------------------------------------------------------------
  if (context.skills.missingCritical.length > 0 && targetRole) {
    const topMissing = context.skills.missingCritical[0];
    actions.push({
      id: `act-skill-missing-${topMissing.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      category: 'skills',
      priority: 'high',
      title: `Build Suggested Role Skill: ${topMissing}`,
      why: `Job descriptions for "${targetRole}" frequently list ${topMissing} as a core requirement.`,
      evidence: `Your profile currently does not show confirmed or claimed experience in ${topMissing} (${context.skills.missingCritical.length} suggested gap${context.skills.missingCritical.length === 1 ? '' : 's'}).`,
      expectedBenefit: `Strengthens role alignment across your roadmap and tailored resume bullets.`,
      concreteNextAction: `Review curated learning resources for ${topMissing} on your Career Guidance roadmap.`,
      href: '/guidance',
      actionText: `Explore ${topMissing}`,
    });
  }

  if (context.skills.needingAssessment.length > 0) {
    const unverified = context.skills.needingAssessment[0];
    actions.push({
      id: `act-skill-verify-${unverified.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      category: 'skills',
      priority: 'medium',
      title: `Confirm or Assess Skill: ${unverified}`,
      why: `Verified skills carry stronger credibility than unconfirmed claims.`,
      evidence: `${unverified} is currently marked as unverified on your profile.`,
      expectedBenefit: `Keep your skill record accurate or complete a proctored evaluation when available.`,
      concreteNextAction: `Review in My Career Data or launch a skill assessment if eligible.`,
      href: '/dashboard/my-data',
      actionText: `Manage Skills`,
    });
  }

  // --------------------------------------------------------------------------
  // 2. PROJECT EVIDENCE ACTIONS
  // --------------------------------------------------------------------------
  if (context.projects.totalCount === 0) {
    actions.push({
      id: 'act-proj-start-first',
      category: 'projects',
      priority: 'high',
      title: 'Build a Portfolio Project Specification',
      why: 'Structured portfolio projects provide concrete evidence of applied problem solving across engineering, analytics, business, and design.',
      evidence: 'You have 0 guided projects in your portfolio workspace.',
      expectedBenefit: 'Documents deliverables and resume-ready bullet points grounded in real work.',
      concreteNextAction: targetRole
        ? `Browse project ideas tailored to ${displayRole}.`
        : 'Browse curated project blueprints or create a custom project plan.',
      href: '/projects',
      actionText: 'Browse Project Specs',
    });
  } else {
    // Check for in-progress projects
    const inProgress = context.projects.projects.find((p) => p.status === 'in_progress' && p.milestoneProgress < 100);
    if (inProgress) {
      actions.push({
        id: `act-proj-continue-${inProgress.id}`,
        category: 'projects',
        priority: 'medium',
        title: `Advance "${inProgress.title}" (${inProgress.milestoneProgress}%)`,
        why: 'Completing a multi-milestone project signals execution follow-through and technical depth to interviewers.',
        evidence: `Your project "${inProgress.title}" is currently at milestone ${inProgress.milestoneProgress}% completion.`,
        expectedBenefit: 'Unlocks milestone completion verification and automated bullet point export to your active resume.',
        concreteNextAction: 'Implement the next architectural milestone with AI Project Mentor guidance.',
        href: `/projects?id=${inProgress.id}`,
        actionText: 'Continue Project',
      });
    }
  }

  // --------------------------------------------------------------------------
  // 3. RESUME INTELLIGENCE ACTIONS
  // --------------------------------------------------------------------------
  if (!context.resume.hasResume) {
    actions.push({
      id: 'act-res-create-primary',
      category: 'resume',
      priority: 'high',
      title: 'Create Your Professional A4 Resume',
      why: 'A cleanly parsed, single-column resume format is mandatory for passing automated applicant tracking systems (ATS).',
      evidence: 'No active resume document has been created or uploaded to your profile.',
      expectedBenefit: 'Generates a compliant, downloadable A4 PDF structured according to industry recruiting standards.',
      concreteNextAction: 'Build your resume using the live A4 Resume Builder.',
      href: '/builder',
      actionText: 'Open Resume Builder',
    });
  } else if (context.resume.latestAtsScore !== null && context.resume.latestAtsScore < 75) {
    const missing = context.resume.missingKeywords.slice(0, 3).join(', ');
    actions.push({
      id: 'act-res-improve-ats',
      category: 'resume',
      priority: 'high',
      title: `Improve ATS Score (${context.resume.latestAtsScore}/100)`,
      why: 'Resumes scoring below 75 typically get filtered out before human recruiter review due to missing keywords or weak impact metrics.',
      evidence: `Your latest ATS score is ${context.resume.latestAtsScore}/100.${missing ? ` Critical missing keywords: ${missing}.` : ''}`,
      expectedBenefit: 'Increases parsing extractability and keyword match rate for applicant tracking algorithms.',
      concreteNextAction: 'Use the Resume Improver to strengthen bullet metrics and inject verified skills.',
      href: '/improver',
      actionText: 'Polish with Improver',
    });
  }

  // --------------------------------------------------------------------------
  // 4. INTERVIEW PREPARATION ACTIONS
  // --------------------------------------------------------------------------
  if (context.applications.interviewingCount > 0) {
    actions.push({
      id: 'act-int-prep-active-stage',
      category: 'interview',
      priority: 'high',
      title: `Practice Interview for Active Application`,
      why: 'You have active interview rounds scheduled; focused simulation under time constraints significantly reduces live interview anxiety.',
      evidence: `You currently have ${context.applications.interviewingCount} job application(s) in an active interview stage.`,
      expectedBenefit: 'Refines technical precision, system design rationale, and STAR behavioral delivery.',
      concreteNextAction: `Run a simulated 5-question interview for ${targetRole}.`,
      href: `/interview-prep?role=${encodeURIComponent(targetRole)}`,
      actionText: 'Start Interview Practice',
    });
  } else if (context.interviews.totalSessions === 0) {
    actions.push({
      id: 'act-int-baseline',
      category: 'interview',
      priority: 'medium',
      title: 'Establish Your Interview Fluency Baseline',
      why: 'Behavioral and technical fluency requires deliberate practice with structured feedback.',
      evidence: 'You have not yet completed any simulated AI interview sessions.',
      expectedBenefit: 'Identifies communication blind spots and establishes your Interview Fluency quadrant score.',
      concreteNextAction: 'Complete a diagnostic 5-question interview session.',
      href: '/interview-prep',
      actionText: 'Launch Mock Interview',
    });
  } else if (context.interviews.recurringWeaknesses.length > 0) {
    const topWeakness = context.interviews.recurringWeaknesses[0];
    actions.push({
      id: 'act-int-target-weakness',
      category: 'interview',
      priority: 'medium',
      title: `Target Interview Weakness: "${topWeakness}"`,
      why: 'Addressing repeated evaluation critiques across interview sessions is the fastest way to increase hireability.',
      evidence: `AI evaluation noted "${topWeakness}" across your recent mock interview responses.`,
      expectedBenefit: 'Transforms an identified vulnerability into a structured, credible response pattern.',
      concreteNextAction: 'Practice formulating answers using the STAR method with measurable metrics.',
      href: '/interview-prep',
      actionText: 'Practice Weak Areas',
    });
  }

  // --------------------------------------------------------------------------
  // 5. JOB DISCOVERY & APPLICATION ACTIONS
  // --------------------------------------------------------------------------
  if (context.applications.totalCount === 0 && context.resume.hasResume) {
    actions.push({
      id: 'act-job-start-pipeline',
      category: 'jobs',
      priority: 'medium',
      title: `Explore Verified Fresher Openings for ${targetRole}`,
      why: 'Regular application cadence to vetted fresher and internship postings maximizes your pipeline momentum.',
      evidence: 'You have an active resume on file but have not yet logged any job applications.',
      expectedBenefit: 'Discovers verified openings matching your location preferences and tech stack.',
      concreteNextAction: 'Search verified listings with explainable match breakdowns.',
      href: '/jobs',
      actionText: 'Browse Matching Jobs',
    });
  } else if (context.applications.totalCount > 0) {
    actions.push({
      id: 'act-job-tailor-resume',
      category: 'jobs',
      priority: 'medium',
      title: 'Polish Resume Bullets with AI Phrasing Improver',
      why: 'Refining your bullet points with strong action verbs and quantified impact increases recruiter callback rates.',
      evidence: `You have ${context.applications.totalCount} application(s) tracked in your pipeline.`,
      expectedBenefit: 'Strengthens passive phrasing and ensures professional tone without fabricating experience.',
      concreteNextAction: 'Review and improve your resume bullet points before submitting further applications.',
      href: '/improver',
      actionText: 'Open Resume Improver',
    });
  }

  // Sort by priority (high > medium > low)
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  actions.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  return {
    userId: context.userId,
    targetRole,
    overallReadiness: context.readiness.overallScore,
    totalActionsCount: actions.length,
    highPriorityCount: actions.filter((a) => a.priority === 'high').length,
    actions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Convenience helper to fetch unified context and compute actions in a single call.
 */
export async function getStudentCareerActions(userId: string): Promise<CareerActionPlan> {
  const context = await getUnifiedStudentContext(userId);
  return generateProactiveCareerActions(context);
}

