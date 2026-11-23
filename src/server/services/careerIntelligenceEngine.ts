import 'server-only';
import type {
  UnifiedStudentContext,
} from './unifiedStudentContext';
import { buildUnifiedStudentContext } from './unifiedStudentContext';
import {
  findCuratedRoleProfile,
  type CuratedRoleProfile,
} from '@/lib/career/roleProfiles';
import { escapeXmlData } from '@/server/prompts/sharedUtils';

// ============================================================================
// TYPES
// ============================================================================

export interface CareerIntelligenceOptions {
  targetRoleOverride?: string;
  jobDescriptionOverride?: string;
}

export interface CareerReadinessBreakdown {
  resumeCompleteness: number;  // 0 - 100
  atsScore: number;            // 0 - 100
  skillAlignment: number;      // 0 - 100
  projectReadiness: number;    // 0 - 100
  assessmentReadiness: number; // 0 - 100
  interviewReadiness: number;  // 0 - 100
}

export interface CareerReadinessFactor {
  factor: string;
  score: number;
  weight: number;
  status: 'strong' | 'moderate' | 'needs_work';
  impactExplanation: string;
}

export interface CareerReadinessScore {
  overallScore: number;
  readinessBand: 'READY' | 'NEAR_READY' | 'DEVELOPING' | 'NEEDS_FOCUS';
  breakdown: CareerReadinessBreakdown;
  readinessFactors: CareerReadinessFactor[];
  explanation: string;
}

export interface SkillGapItem {
  skill: string;
  priority: 'critical' | 'recommended';
  category: 'core_competency' | 'tool' | 'framework' | 'domain';
  estimatedEffort: string;
  recommendedAction: string;
}

export interface SkillGapsResult {
  targetRole: string;
  hasRoleProfile: boolean;
  matchPercentage: number;
  criticalGaps: SkillGapItem[];
  recommendedGaps: SkillGapItem[];
  verifiedSkills: string[];
  confirmedSkills: string[];
  claimedSkills: string[];
  inferredSkills: string[];
  missingCriticalCount: number;
  missingRecommendedCount: number;
}

export interface LearningMilestone {
  title: string;
  skill: string;
  status: 'completed' | 'in_progress' | 'pending';
  recommendedResource?: string;
}

export interface LearningPhase {
  phase: string;
  duration: string;
  focus: string;
  milestones: LearningMilestone[];
}

export interface LearningRoadmapResult {
  roleTitle: string;
  hasActiveRoadmap: boolean;
  progressPercent: number;
  phases: LearningPhase[];
  currentFocus: string | null;
}

export interface ArchitecturalGuidance {
  layers: string[];
  recommendedPatterns: string[];
  suggestedDbEntities: string[];
  recommendedTesting: string[];
  deploymentGuidance: string[];
}

export interface ProjectRecommendation {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetRole: string;
  techStack: string[];
  addressedGaps: string[];
  problemStatement: string;
  realWorldContext: string;
  resumeBulletDraft: string;
  estimatedTime: string;
  architecturalGuidance: ArchitecturalGuidance;
}

export interface InterviewSuggestedQuestion {
  id: string;
  category: 'fundamentals' | 'practical_code' | 'behavioral' | 'edge_cases' | 'system_architecture';
  question: string;
  targetSkill: string;
  evaluationFocus: string;
}

export interface InterviewRoadmapResult {
  targetRole: string;
  readinessLevel: string;
  averageHistoricalScore: number | null;
  totalCompletedSessions: number;
  focusAreas: string[];
  suggestedQuestions: InterviewSuggestedQuestion[];
  preparationStrategy: string;
}

export interface ResumeImprovementPriority {
  priority: 'critical' | 'high' | 'medium';
  area: 'ATS_KEYWORDS' | 'PROJECTS' | 'SKILLS_CONFIRMATION' | 'BULLET_IMPACT' | 'SECTION_COMPLETENESS';
  issue: string;
  recommendation: string;
  actionableTarget: string;
}

export interface RecommendedNextAction {
  title: string;
  description: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  actionText: string;
  category: 'resume' | 'skill' | 'project' | 'interview' | 'job';
}

export interface CareerIntelligenceRecommendation {
  careerReadinessScore: CareerReadinessScore;
  skillGaps: SkillGapsResult;
  learningRoadmap: LearningRoadmapResult;
  projectRecommendations: ProjectRecommendation[];
  interviewRoadmap: InterviewRoadmapResult;
  resumeImprovementPriorities: ResumeImprovementPriority[];
  recommendedNextActions: RecommendedNextAction[];
  generatedAt: string;
}

// ============================================================================
// CURATED PROJECT BLUEPRINTS
// ============================================================================

const ROLE_PROJECT_BLUEPRINTS: Record<string, ProjectRecommendation[]> = {
  'software-engineer': [
    {
      id: 'fse-proj-1',
      title: 'Real-Time Collaborative Workspace with Role-Based Access',
      difficulty: 'Intermediate',
      targetRole: 'Software Engineer',
      techStack: ['Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'WebSocket', 'Tailwind CSS'],
      addressedGaps: ['WebSocket', 'PostgreSQL', 'Role-Based Access Control'],
      problemStatement: 'Distributed teams need concurrent document collaboration with low-latency state synchronization and strict authorization permissions.',
      realWorldContext: 'Standard SaaS architectures (like Notion or Figma) require conflict-free event delivery and secure multi-tenant database partitioning.',
      resumeBulletDraft: 'Architected and built real-time collaborative workspace with Next.js, Node.js, and WebSockets, supporting concurrent edits and sub-100ms sync across distributed clients (Draft: edit after you build it)',
      estimatedTime: '3-4 weeks',
      architecturalGuidance: {
        layers: ['Client UI (Next.js App Router)', 'WebSocket Gateway Server', 'Business Logic Services', 'PostgreSQL Database with Prisma/Drizzle', 'Redis Session Cache'],
        recommendedPatterns: ['Repository Pattern', 'Optimistic UI Updates', 'JWT + Refresh Token Cookie Strategy', 'Database Connection Pooling'],
        suggestedDbEntities: ['User', 'Workspace', 'Document', 'DocumentRevision', 'RolePermission', 'SessionLog'],
        recommendedTesting: ['Unit tests with Jest for permission utilities', 'Integration tests with Supertest for API routes', 'End-to-end user flows with Playwright'],
        deploymentGuidance: ['Deploy Next.js frontend to Vercel', 'Host Node.js WebSocket service on Railway/Render', 'Provision managed PostgreSQL with connection pooling']
      }
    },
    {
      id: 'fse-proj-2',
      title: 'E-Commerce Micro-Services Platform with Idempotent Payments',
      difficulty: 'Advanced',
      targetRole: 'Full Stack Engineer',
      techStack: ['Node.js', 'Express', 'React', 'PostgreSQL', 'Redis', 'Docker', 'Stripe API'],
      addressedGaps: ['Docker', 'Microservices', 'Idempotency', 'Caching'],
      problemStatement: 'High-volume checkout flows risk duplicate order processing and checkout failures under network interruptions.',
      realWorldContext: 'Modern commerce platforms require idempotency keys and asynchronous webhook reconciliation to ensure zero phantom billing.',
      resumeBulletDraft: 'Developed modular e-commerce service implementing Redis-backed idempotency keys and Stripe webhook handlers, preventing duplicate payment transactions during simulated network retries (Draft: edit after you build it)',
      estimatedTime: '4 weeks',
      architecturalGuidance: {
        layers: ['API Gateway & Rate Limiter', 'Catalog Service', 'Order & Inventory Service', 'Payment Webhook Consumer', 'Relational Store'],
        recommendedPatterns: ['Idempotent Consumer Pattern', 'Outbox Pattern for events', 'Cache-Aside with Redis TTL', 'Database Transactions for Stock Reservation'],
        suggestedDbEntities: ['Product', 'InventoryLedger', 'Order', 'OrderItem', 'PaymentAttempt', 'IdempotencyRecord'],
        recommendedTesting: ['Concurrency testing with k6 for duplicate payment submission', 'Unit tests for inventory reservation locks', 'Mocked Stripe webhook tests'],
        deploymentGuidance: ['Containerize services with Docker Compose', 'Deploy API to containerized host (Fly.io/AWS ECS)', 'Set up automated GitHub Actions CI pipeline']
      }
    },
    {
      id: 'fse-proj-3',
      title: 'Automated Job Application Tracker & Resume Matcher',
      difficulty: 'Beginner',
      targetRole: 'Full Stack Engineer',
      techStack: ['TypeScript', 'Next.js', 'SQLite/PostgreSQL', 'Tailwind CSS', 'REST API'],
      addressedGaps: ['TypeScript', 'REST API Design', 'Relational Modeling'],
      problemStatement: 'Job seekers lack unified visibility into application stages, response rates, and keyword alignment across target postings.',
      realWorldContext: 'Enterprise applicant tracking systems rely on normalized relational schemas and structured stage transitions.',
      resumeBulletDraft: 'Designed and implemented full-stack job application tracker with Next.js and TypeScript, supporting custom stage pipelines and keyword match scoring across 100+ tracked records (Draft: edit after you build it)',
      estimatedTime: '2 weeks',
      architecturalGuidance: {
        layers: ['Next.js App Router Pages', 'Server Action / API Handlers', 'Validation Layer (Zod)', 'Database Layer with Foreign Key Constraints'],
        recommendedPatterns: ['Server-Side Rendering (SSR)', 'Single Source of Truth state store', 'Zod schema validation on requests'],
        suggestedDbEntities: ['Application', 'Company', 'StageHistory', 'Note', 'MatchScoreSnapshot'],
        recommendedTesting: ['Unit tests for stage transition validation logic', 'Component tests with React Testing Library', 'Playwright smoke tests for CRUD operations'],
        deploymentGuidance: ['Deploy to Vercel with serverless SQLite or PostgreSQL', 'Configure environment variables securely']
      }
    }
  ],
  'mechanical-cad-engineer': [
    {
      id: 'cad-proj-1',
      title: 'Automotive Sub-Assembly Stress & Fatigue Optimization in FEA',
      difficulty: 'Intermediate',
      targetRole: 'Mechanical / CAD Engineer',
      techStack: ['AutoCAD', 'SolidWorks', 'ANSYS Mechanical', 'GD&T', 'Excel / MATLAB'],
      addressedGaps: ['ANSYS', 'GD&T', 'Finite Element Analysis', 'Fatigue Life Analysis'],
      problemStatement: 'Automotive suspension arms experience cyclic shock loading resulting in premature weld seam fatigue and weight inefficiencies.',
      realWorldContext: 'Tier-1 automotive suppliers (e.g., Tata Motors, Mahindra) require ISO-compliant GD&T drawings and ANSYS stress simulations to approve chassis components.',
      resumeBulletDraft: 'Modelled suspension sub-assembly in SolidWorks and conducted ANSYS FEA fatigue simulations, reducing localized stress concentrations by 18% while adhering strictly to ASME Y14.5 GD&T standards (Draft: edit after you build it)',
      estimatedTime: '3-4 weeks',
      architecturalGuidance: {
        layers: ['Parametric 3D CAD Modeling (SolidWorks)', 'Meshing & Convergence Studies', 'Static Structural & Harmonic FEA (ANSYS)', 'Manufacturing Drawing Generation (AutoCAD GD&T)', 'Design Failure Mode Effects Analysis (DFMEA)'],
        recommendedPatterns: ['Design for Manufacturing and Assembly (DFMA)', 'ASME Y14.5 Geometric Dimensioning & Tolerancing', 'Mesh Refinement at Stress Risers'],
        suggestedDbEntities: ['MaterialPropertiesTable', 'LoadCaseScenarios', 'SafetyFactorMatrix', 'ToleranceStackupWorksheet'],
        recommendedTesting: ['Grid Independence & Mesh Convergence Verification', 'Theoretical hand calculations vs ANSYS stress divergence checks', 'Fatigue S-N curve limit validations'],
        deploymentGuidance: ['Compile engineering package with 2D manufacturing prints', 'Generate formal Design Verification Plan and Report (DVP&R)', 'Export STEP/IGES neutral files for CNC machining quote']
      }
    },
    {
      id: 'cad-proj-2',
      title: 'Precision Gearbox Housing Design for Manufacturing (DFM)',
      difficulty: 'Intermediate',
      targetRole: 'Mechanical / CAD Engineer',
      techStack: ['AutoCAD', 'SolidWorks', 'GD&T', 'Tolerance Stack-Up', 'DFM'],
      addressedGaps: ['Tolerance Stack-Up', 'DFM', 'Manufacturing Drawings'],
      problemStatement: 'Mismatched axial tolerances in two-stage planetary reduction gearboxes cause bearing misalignment and noise under thermal expansion.',
      realWorldContext: 'Precision powertrain manufacturers rely on statistical tolerance stack-up analysis (Worst-Case and RSS) to eliminate machining assembly rejections.',
      resumeBulletDraft: 'Engineered planetary reduction gearbox housing in SolidWorks with complete ASME Y14.5 tolerance stack-up analysis, ensuring zero interference across -20°C to 90°C thermal operating ranges (Draft: edit after you build it)',
      estimatedTime: '3 weeks',
      architecturalGuidance: {
        layers: ['Gear Tooth Profile Generation', 'Shaft & Bearing Fit Selection (ISO 286)', 'Cast/Machined Casing DFM Evaluation', 'Tolerance Stack-Up Calculations', 'Production 2D Drawings'],
        recommendedPatterns: ['RSS Statistical Tolerancing', 'Thermal Clearance Compensation', 'Draft Angle Optimization for Casting'],
        suggestedDbEntities: ['GearParameters', 'BearingLifeL10hTable', 'ToleranceStackupRSS', 'FastenerTorqueSpec'],
        recommendedTesting: ['Worst-case vs RSS clearance checks', 'Interference volume detection in CAD assembly', 'Bearing reaction load verification'],
        deploymentGuidance: ['Publish PDF drawing package with weld symbols and datum references', 'Create bill of materials (BOM) with standard fastener part numbers']
      }
    }
  ],
  'data-analyst': [
    {
      id: 'da-proj-1',
      title: 'Executive Revenue & Customer Retention Cohort Analytics Dashboard',
      difficulty: 'Intermediate',
      targetRole: 'Data Analyst',
      techStack: ['SQL', 'Python', 'Pandas', 'PowerBI', 'Tableau', 'PostgreSQL'],
      addressedGaps: ['Cohort Analysis', 'PowerBI', 'SQL Window Functions', 'Tableau'],
      problemStatement: 'SaaS leadership lacks granular visibility into month-over-month net dollar retention (NDR) and churn drivers across customer tiers.',
      realWorldContext: 'Data analytics teams at modern tech firms build automated SQL transformation pipelines and self-serve BI dashboards for executive decision support.',
      resumeBulletDraft: 'Constructed automated SQL cohort retention pipeline and interactive PowerBI dashboard, tracking monthly recurring revenue (MRR) and customer churn across 50,000+ customer records (Draft: edit after you build it)',
      estimatedTime: '2-3 weeks',
      architecturalGuidance: {
        layers: ['Raw Transaction Ingestion', 'SQL Transformation / Mart Layer (Window Functions)', 'Python Validation & Outlier Detection', 'PowerBI / Tableau Semantic Model', 'Scheduled Refresh'],
        recommendedPatterns: ['Star Schema Dimensional Modeling', 'Idempotent SQL Mart Views', 'DAX Time-Intelligence Calculations'],
        suggestedDbEntities: ['DimCustomer', 'DimDate', 'DimSubscriptionTier', 'FactMonthlyRevenue', 'FactChurnEvent'],
        recommendedTesting: ['SQL assertion checks for duplicate transaction IDs', 'Null rate monitoring across key dimensions', 'Reconciliation of dashboard metrics against GL balances'],
        deploymentGuidance: ['Host SQL views in cloud data warehouse (PostgreSQL / BigQuery)', 'Publish interactive dashboard to PowerBI Service / Tableau Public']
      }
    }
  ]
};

ROLE_PROJECT_BLUEPRINTS['full-stack-engineer'] = ROLE_PROJECT_BLUEPRINTS['software-engineer'];
ROLE_PROJECT_BLUEPRINTS['mechanical-engineer'] = ROLE_PROJECT_BLUEPRINTS['mechanical-cad-engineer'];

// ============================================================================
// CORE ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Calculates deterministic readiness breakdown and weighted overall score.
 */
function calculateDeterministicReadiness(
  context: UnifiedStudentContext,
  curatedProfile: CuratedRoleProfile | null
): CareerReadinessScore {
  // 1. Resume Completeness (0-100)
  let resumeCompleteness = 0;
  if (context.resume?.hasResume) {
    resumeCompleteness = 50;
    if ((context.resume.wordCount || 0) >= 200) resumeCompleteness += 20;
    if ((context.resume.keywordScore || 0) > 0) resumeCompleteness += 15;
    if (context.resume.detectedKeywords?.length > 0) resumeCompleteness += 15;
  }

  // 2. ATS Score (0-100)
  const atsScore = context.resume?.latestAtsScore ?? 0;

  // 3. Skill Alignment (0-100)
  let skillAlignment = 30; // baseline for having any profile
  const allKnownSkills = new Set([
    ...context.skills.verified.map((s) => s.name.toLowerCase()),
    ...context.skills.confirmed.map((s) => s.name.toLowerCase()),
    ...context.skills.claimed.map((s) => s.name.toLowerCase()),
    ...context.skills.inferred.map((s) => s.name.toLowerCase()),
  ]);

  if (curatedProfile) {
    const critical = curatedProfile.coreSkills || [];
    const recommended = curatedProfile.recommendedTools || [];
    const totalRequired = critical.length + recommended.length;

    if (totalRequired > 0) {
      let matchedCritical = 0;
      let matchedRecommended = 0;

      for (const skill of critical) {
        if (allKnownSkills.has(skill.toLowerCase())) matchedCritical++;
      }
      for (const skill of recommended) {
        if (allKnownSkills.has(skill.toLowerCase())) matchedRecommended++;
      }

      const criticalWeight = critical.length > 0 ? (matchedCritical / critical.length) * 70 : 70;
      const recWeight = recommended.length > 0 ? (matchedRecommended / recommended.length) * 30 : 30;
      skillAlignment = Math.min(100, Math.round(criticalWeight + recWeight));
    }
  } else if (allKnownSkills.size > 0) {
    skillAlignment = Math.min(85, 30 + allKnownSkills.size * 5);
  }

  // 4. Project Readiness (0-100)
  let projectReadiness = 20;
  const totalProjects = (context.projects?.totalCount || 0) + (context.academic?.documentedProjects?.length || 0);
  const completedProjects = (context.projects?.completedCount || 0) + (context.academic?.documentedProjects?.length || 0);
  if (totalProjects > 0) {
    projectReadiness = Math.min(100, 30 + completedProjects * 30 + (context.projects?.inProgressCount || 0) * 15);
  }

  // 5. Assessment Readiness (0-100)
  let assessmentReadiness = 0;
  if ((context.assessments?.totalAttempts || 0) > 0) {
    const avg = context.assessments.averageScore ?? 50;
    const passedRatio = (context.assessments.passedCount || 0) / (context.assessments.totalAttempts || 1);
    assessmentReadiness = Math.min(100, Math.round(avg * 0.7 + passedRatio * 30));
  } else if (context.skills.verified.length > 0) {
    assessmentReadiness = 70;
  }

  // 6. Interview Readiness (0-100)
  let interviewReadiness = 0;
  if ((context.interviews?.totalSessions || 0) > 0) {
    const avg = context.interviews.averageScore ?? 60;
    const completedRatio = (context.interviews.completedSessions || 0) / (context.interviews.totalSessions || 1);
    interviewReadiness = Math.min(100, Math.round(avg * 0.8 + completedRatio * 20));
  }

  // Weighted overall calculation:
  // Resume & ATS: 25% | Skills: 25% | Projects: 20% | Assessments: 15% | Interviews: 15%
  const overallScore = Math.round(
    (resumeCompleteness * 0.10) +
    (atsScore * 0.15) +
    (skillAlignment * 0.25) +
    (projectReadiness * 0.20) +
    (assessmentReadiness * 0.15) +
    (interviewReadiness * 0.15)
  );

  let readinessBand: CareerReadinessScore['readinessBand'] = 'NEEDS_FOCUS';
  if (overallScore >= 80) readinessBand = 'READY';
  else if (overallScore >= 65) readinessBand = 'NEAR_READY';
  else if (overallScore >= 45) readinessBand = 'DEVELOPING';

  const factors: CareerReadinessFactor[] = [
    {
      factor: 'Resume Completeness',
      score: resumeCompleteness,
      weight: 10,
      status: resumeCompleteness >= 75 ? 'strong' : resumeCompleteness >= 50 ? 'moderate' : 'needs_work',
      impactExplanation: resumeCompleteness >= 75
        ? 'Well-structured resume content ready for applicant tracking scans.'
        : 'Resume requires additional sections or detail to maximize recruiter visibility.'
    },
    {
      factor: 'Deterministic ATS Score',
      score: atsScore,
      weight: 15,
      status: atsScore >= 75 ? 'strong' : atsScore >= 55 ? 'moderate' : 'needs_work',
      impactExplanation: atsScore >= 75
        ? 'Strong keyword and formatting compliance with modern parsing engines.'
        : 'Target job keyword density or formatting standards need optimization.'
    },
    {
      factor: 'Role Skill Alignment',
      score: skillAlignment,
      weight: 25,
      status: skillAlignment >= 75 ? 'strong' : skillAlignment >= 50 ? 'moderate' : 'needs_work',
      impactExplanation: skillAlignment >= 75
        ? 'High overlap with core competencies required by hiring managers.'
        : 'Key critical and recommended technical skills remain unverified or missing.'
    },
    {
      factor: 'Portfolio Project Evidence',
      score: projectReadiness,
      weight: 20,
      status: projectReadiness >= 70 ? 'strong' : projectReadiness >= 40 ? 'moderate' : 'needs_work',
      impactExplanation: projectReadiness >= 70
        ? 'Verified project portfolio demonstrating applied domain problem-solving.'
        : 'More production-grade projects are needed to provide credible evidence of skills.'
    },
    {
      factor: 'Skill Assessment Proof',
      score: assessmentReadiness,
      weight: 15,
      status: assessmentReadiness >= 70 ? 'strong' : assessmentReadiness >= 40 ? 'moderate' : 'needs_work',
      impactExplanation: assessmentReadiness >= 70
        ? 'Verified competency badges validate claimed resume capabilities.'
        : 'Complete verified assessments to convert claimed skills into high-trust credentials.'
    },
    {
      factor: 'Interview Readiness',
      score: interviewReadiness,
      weight: 15,
      status: interviewReadiness >= 70 ? 'strong' : interviewReadiness >= 40 ? 'moderate' : 'needs_work',
      impactExplanation: interviewReadiness >= 70
        ? 'Consistent performance on technical, behavioral, and architectural mock queries.'
        : 'Complete mock technical and STAR-method interview rounds to build verbal fluency.'
    }
  ];

  const explanation = `Candidate is in the ${readinessBand} band with an overall readiness score of ${overallScore}/100. Greatest leverage: ${
    factors.sort((a, b) => a.score - b.score)[0].factor
  }.`;

  return {
    overallScore,
    readinessBand,
    breakdown: {
      resumeCompleteness,
      atsScore,
      skillAlignment,
      projectReadiness,
      assessmentReadiness,
      interviewReadiness
    },
    readinessFactors: factors,
    explanation
  };
}

/**
 * Derives verified skill gaps against curated role profiles and saved job descriptions.
 */
function deriveSkillGaps(
  context: UnifiedStudentContext,
  targetRole: string,
  curatedProfile: CuratedRoleProfile | null
): SkillGapsResult {
  const verifiedList = context.skills.verified.map((s) => s.name);
  const confirmedList = context.skills.confirmed.map((s) => s.name);
  const claimedList = context.skills.claimed.map((s) => s.name);
  const inferredList = context.skills.inferred.map((s) => s.name);

  const candidateKnownSkills = new Set(
    [...verifiedList, ...confirmedList, ...claimedList, ...inferredList].map((s) => s.toLowerCase().trim())
  );

  const criticalGaps: SkillGapItem[] = [];
  const recommendedGaps: SkillGapItem[] = [];

  if (curatedProfile) {
    for (const skill of curatedProfile.coreSkills || []) {
      if (!candidateKnownSkills.has(skill.toLowerCase().trim())) {
        criticalGaps.push({
          skill,
          priority: 'critical',
          category: 'core_competency',
          estimatedEffort: '2-3 weeks',
          recommendedAction: `Complete verified coursework and build a dedicated milestone focusing on ${skill}.`
        });
      }
    }

    for (const skill of curatedProfile.recommendedTools || []) {
      if (!candidateKnownSkills.has(skill.toLowerCase().trim())) {
        recommendedGaps.push({
          skill,
          priority: 'recommended',
          category: 'tool',
          estimatedEffort: '1-2 weeks',
          recommendedAction: `Integrate ${skill} into an existing portfolio project or complete an assessment.`
        });
      }
    }
  }

  // Cross-reference saved job description snippets for company-specific tool mentions
  if (context.savedJobs?.jobs && Array.isArray(context.savedJobs.jobs)) {
    for (const job of context.savedJobs.jobs.slice(0, 3)) {
      if (job.descriptionSnippet) {
        const snippetLower = job.descriptionSnippet.toLowerCase();
        // Look for common uncurated tools mentioned in snippet
        const commonTools = ['docker', 'kubernetes', 'aws', 'figma', 'ansys', 'autocad', 'solidworks', 'graphql', 'redis', 'tableau'];
        for (const tool of commonTools) {
          if (snippetLower.includes(tool) && !candidateKnownSkills.has(tool)) {
            const alreadyInGaps = criticalGaps.some((g) => g.skill.toLowerCase() === tool) || recommendedGaps.some((g) => g.skill.toLowerCase() === tool);
            if (!alreadyInGaps) {
              recommendedGaps.push({
                skill: tool.charAt(0).toUpperCase() + tool.slice(1),
                priority: 'recommended',
                category: 'tool',
                estimatedEffort: '1 week',
                recommendedAction: `Required by saved job posting at ${job.company}: integrate into targeted projects.`
              });
            }
          }
        }
      }
    }
  }

  const totalRequired = (curatedProfile?.coreSkills?.length || 0) + (curatedProfile?.recommendedTools?.length || 0);
  const totalMissing = criticalGaps.length + recommendedGaps.length;
  const matchPercentage = totalRequired > 0
    ? Math.max(0, Math.min(100, Math.round(((totalRequired - totalMissing) / totalRequired) * 100)))
    : (candidateKnownSkills.size > 0 ? 70 : 25);

  return {
    targetRole,
    hasRoleProfile: Boolean(curatedProfile),
    matchPercentage,
    criticalGaps,
    recommendedGaps,
    verifiedSkills: verifiedList,
    confirmedSkills: confirmedList,
    claimedSkills: claimedList,
    inferredSkills: inferredList,
    missingCriticalCount: criticalGaps.length,
    missingRecommendedCount: recommendedGaps.length
  };
}

/**
 * Generates or enriches the student's learning roadmap.
 */
function deriveLearningRoadmap(
  context: UnifiedStudentContext,
  targetRole: string,
  gaps: SkillGapsResult
): LearningRoadmapResult {
  const hasActiveRoadmap = Boolean(context.learning?.hasActiveRoadmap);
  const progressPercent = context.learning?.progressPercent ?? 0;

  const phases: LearningPhase[] = [];

  // Phase 1: Critical Core Skills
  if (gaps.criticalGaps.length > 0) {
    phases.push({
      phase: 'Phase 1: Core Fundamentals & Critical Gaps',
      duration: 'Weeks 1-4',
      focus: `Master high-priority core competencies: ${gaps.criticalGaps.slice(0, 3).map((g) => g.skill).join(', ')}`,
      milestones: gaps.criticalGaps.slice(0, 4).map((gap) => ({
        title: `Master ${gap.skill} Fundamentals`,
        skill: gap.skill,
        status: 'pending',
        recommendedAction: gap.recommendedAction,
      }))
    });
  }

  // Phase 2: Practical Projects & Tool Integration
  if (gaps.recommendedGaps.length > 0 || gaps.criticalGaps.length > 0) {
    const focusSkills = gaps.recommendedGaps.slice(0, 3).map((g) => g.skill).join(', ') || targetRole;
    phases.push({
      phase: 'Phase 2: Applied Architecture & Production Tooling',
      duration: 'Weeks 5-8',
      focus: `Apply skills in hands-on projects with modern tooling (${focusSkills})`,
      milestones: [
        {
          title: `Build Portfolio Project Addressing ${gaps.criticalGaps[0]?.skill || targetRole}`,
          skill: gaps.criticalGaps[0]?.skill || 'Architecture',
          status: 'pending',
        },
        ...gaps.recommendedGaps.slice(0, 3).map((g) => ({
          title: `Integrate and verify ${g.skill}`,
          skill: g.skill,
          status: 'pending' as const,
        }))
      ]
    });
  }

  // Phase 3: Interview Mastery & Portfolio Polish
  phases.push({
    phase: 'Phase 3: Interview Readiness & Portfolio Polish',
    duration: 'Weeks 9-10',
    focus: 'Technical mock interviews, STAR-method behavioral preparation, and ATS resume tailoring',
    milestones: [
      {
        title: `Complete 3 Mock Interviews for ${targetRole}`,
        skill: 'Interviewing',
        status: (context.interviews?.completedSessions || 0) >= 3 ? 'completed' : 'pending'
      },
      {
        title: 'Optimize ATS Resume Keywords & Bullet Impact',
        skill: 'ATS Optimization',
        status: (context.resume?.latestAtsScore || 0) >= 75 ? 'completed' : 'pending'
      }
    ]
  });

  const currentFocus = phases[0]?.milestones[0]?.title ?? 'Explore Role Requirements';

  return {
    roleTitle: targetRole,
    hasActiveRoadmap,
    progressPercent,
    phases,
    currentFocus
  };
}

/**
 * Generates structured, architecturally grounded project recommendations.
 */
function deriveProjectRecommendations(
  targetRole: string,
  gaps: SkillGapsResult,
  curatedProfile: CuratedRoleProfile | null
): ProjectRecommendation[] {
  const roleSlug = (curatedProfile?.slug || targetRole.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
  const existingBlueprints = ROLE_PROJECT_BLUEPRINTS[roleSlug] || (curatedProfile ? ROLE_PROJECT_BLUEPRINTS[curatedProfile.slug] : null);

  if (existingBlueprints && existingBlueprints.length > 0) {
    return existingBlueprints.map((bp) => {
      // Map addressed gaps dynamically to student's real gaps
      const matchedGaps = bp.techStack.filter((tech) =>
        gaps.criticalGaps.some((g) => g.skill.toLowerCase() === tech.toLowerCase()) ||
        gaps.recommendedGaps.some((g) => g.skill.toLowerCase() === tech.toLowerCase())
      );

      return {
        ...bp,
        addressedGaps: matchedGaps.length > 0 ? matchedGaps : bp.addressedGaps,
      };
    });
  }

  // For uncurated or custom roles, generate a rigorous structured blueprint based on role title and gaps
  const topGaps = [...gaps.criticalGaps, ...gaps.recommendedGaps].map((g) => g.skill);
  const primarySkills = topGaps.length > 0 ? topGaps.slice(0, 4) : ['Core Domain Concepts', 'Industry Tooling'];

  return [
    {
      id: `custom-proj-1`,
      title: `${targetRole} Milestone Engineering Project`,
      difficulty: 'Intermediate',
      targetRole,
      techStack: primarySkills,
      addressedGaps: primarySkills,
      problemStatement: `Develop an end-to-end practical solution addressing core technical challenges encountered in standard ${targetRole} positions.`,
      realWorldContext: `Enterprise hiring teams look for direct evidence that candidates can design, test, and document solutions meeting industry criteria.`,
      resumeBulletDraft: `Designed and executed production-ready ${targetRole} system utilizing ${primarySkills.join(', ')}, satisfying functional benchmarks and testing criteria (Draft: edit after you build it)`,
      estimatedTime: '3-4 weeks',
      architecturalGuidance: {
        layers: ['Domain Logic / Processing Layer', 'Interface / Presentation Layer', 'Persistence / Storage Layer', 'Automated Verification Suite'],
        recommendedPatterns: ['Modular Separation of Concerns', 'Single Responsibility Principle', 'Input Sanitization & Error Handling'],
        suggestedDbEntities: ['PrimaryRecord', 'ConfigurationData', 'AuditLog'],
        recommendedTesting: ['Unit tests for core logic', 'Integration tests for data workflows', 'Regression edge-case assertions'],
        deploymentGuidance: ['Package with clear README and setup scripts', 'Document architecture decisions in ARCHITECTURE.md']
      }
    }
  ];
}

/**
 * Derives interview preparation roadmap and targeted questions.
 */
function deriveInterviewRoadmap(
  context: UnifiedStudentContext,
  targetRole: string,
  gaps: SkillGapsResult
): InterviewRoadmapResult {
  const avgScore = context.interviews?.averageScore ?? null;
  const totalSessions = context.interviews?.completedSessions ?? 0;

  let readinessLevel = 'Beginner';
  if (totalSessions >= 5 && (avgScore || 0) >= 80) readinessLevel = 'Advanced';
  else if (totalSessions >= 2 && (avgScore || 0) >= 65) readinessLevel = 'Intermediate';

  const focusAreas = [
    ...gaps.criticalGaps.slice(0, 2).map((g) => g.skill),
    'STAR-Method Behavioral Structuring',
    'System Architecture & Trade-Offs'
  ];

  const suggestedQuestions: InterviewSuggestedQuestion[] = [
    {
      id: 'iq-1',
      category: 'fundamentals',
      question: `Explain how you evaluate trade-offs when selecting core technologies or libraries for a ${targetRole} project.`,
      targetSkill: gaps.criticalGaps[0]?.skill || 'Technical Fundamentals',
      evaluationFocus: 'Clarity of core principles, depth of knowledge, and structured rationale.'
    },
    {
      id: 'iq-2',
      category: 'practical_code',
      question: `Walk through how you would diagnose and resolve a severe performance bottleneck or defect in your system.`,
      targetSkill: 'Debugging & Reliability',
      evaluationFocus: 'Step-by-step troubleshooting methodology, telemetry usage, and root-cause analysis.'
    },
    {
      id: 'iq-3',
      category: 'behavioral',
      question: `Describe a challenging technical project you worked on where requirements changed midway. How did you adapt?`,
      targetSkill: 'STAR Behavioral Communication',
      evaluationFocus: 'STAR framework compliance (Situation, Task, Action, Result) with clear personal accountability.'
    },
    {
      id: 'iq-4',
      category: 'edge_cases',
      question: `How do you ensure data integrity and prevent security vulnerabilities (e.g. injection, race conditions) in production?`,
      targetSkill: 'Defensive Engineering & Security',
      evaluationFocus: 'Input validation, parameterized access, and defense-in-depth principles.'
    },
    {
      id: 'iq-5',
      category: 'system_architecture',
      question: `If your application received a 10x spike in concurrent requests or data volume, which layer would fail first, and how would you scale it?`,
      targetSkill: 'Scalability & System Design',
      evaluationFocus: 'Understanding of bottlenecks, caching, horizontal scaling, and asynchronous decoupling.'
    }
  ];

  return {
    targetRole,
    readinessLevel,
    averageHistoricalScore: avgScore,
    totalCompletedSessions: totalSessions,
    focusAreas,
    suggestedQuestions,
    preparationStrategy: `Focus on bridging verified gaps in ${gaps.criticalGaps.slice(0, 2).map((g) => g.skill).join(' and ') || 'core competencies'}. Practice speaking out loud using the STAR method for behavioral queries.`
  };
}

/**
 * Derives actionable resume improvement priorities based on authentic candidate data.
 */
function deriveResumeImprovementPriorities(
  context: UnifiedStudentContext,
  gaps: SkillGapsResult
): ResumeImprovementPriority[] {
  const priorities: ResumeImprovementPriority[] = [];

  if (!context.resume?.hasResume) {
    priorities.push({
      priority: 'critical',
      area: 'SECTION_COMPLETENESS',
      issue: 'No active resume document has been uploaded or created.',
      recommendation: 'Use the AI Resume Builder to create a structured resume tailored to your target role.',
      actionableTarget: 'Create your primary resume in the Resume Builder.'
    });
    return priorities;
  }

  // ATS Keyword Gaps
  if ((context.resume.missingKeywords || []).length > 0 || gaps.criticalGaps.length > 0) {
    const topMissing = (context.resume.missingKeywords || []).slice(0, 3).join(', ') || gaps.criticalGaps.slice(0, 2).map((g) => g.skill).join(', ');
    priorities.push({
      priority: 'critical',
      area: 'ATS_KEYWORDS',
      issue: `Key technical keywords are missing from your resume (${topMissing}).`,
      recommendation: `Incorporate missing keywords naturally into your Work Experience and Projects sections where you have genuine hands-on experience.`,
      actionableTarget: `Update your resume to reflect experience with ${topMissing}.`
    });
  }

  // Project Evidence Gaps
  if ((context.projects?.completedCount || 0) === 0 && (context.academic?.documentedProjects?.length || 0) === 0) {
    priorities.push({
      priority: 'high',
      area: 'PROJECTS',
      issue: 'Your resume lacks verified technical projects demonstrating production-grade skills.',
      recommendation: 'Complete a guided portfolio project and export verified bullets to your resume.',
      actionableTarget: 'Build and export 1 guided project to showcase applied domain competence.'
    });
  }

  // Skills Confirmation
  if (context.skills.claimed.length > 0 && context.skills.verified.length === 0) {
    priorities.push({
      priority: 'medium',
      area: 'SKILLS_CONFIRMATION',
      issue: 'Claimed skills have not been verified via competency assessments.',
      recommendation: 'Take quick 10-minute skill assessments to earn verified badges and elevate recruiter trust.',
      actionableTarget: 'Complete verified skill assessment for top skills.'
    });
  }

  // Bullet Phrasing & Impact
  priorities.push({
    priority: 'medium',
    area: 'BULLET_IMPACT',
    issue: 'Resume bullets can be upgraded with stronger action verbs and quantified impact.',
    recommendation: 'Use the AI Resume Improver to polish phrasing while strictly preserving authentic facts.',
    actionableTarget: 'Refine 3 experience bullets with Google XYZ format in Resume Improver.'
  });

  return priorities;
}

/**
 * Derives top 4-5 prioritized next actions across all modules.
 */
function deriveRecommendedNextActions(
  context: UnifiedStudentContext,
  readiness: CareerReadinessScore,
  gaps: SkillGapsResult
): RecommendedNextAction[] {
  const actions: RecommendedNextAction[] = [];

  // Goal missing
  if (!context.careerGoal?.goalSet && !context.careerGoal?.targetRole) {
    actions.push({
      title: 'Set Target Career Goal',
      description: 'Define your desired role and target industry to unlock tailored roadmaps and ATS alignment.',
      href: '/profile',
      priority: 'high',
      actionText: 'Set Target Role',
      category: 'job'
    });
  }

  // Resume missing
  if (!context.resume?.hasResume) {
    actions.push({
      title: 'Upload or Build Your Resume',
      description: 'Create a professional resume to get instant ATS parsing feedback and keyword scoring.',
      href: '/builder',
      priority: 'high',
      actionText: 'Build Resume',
      category: 'resume'
    });
  } else if ((context.resume.latestAtsScore || 0) < 70) {
    actions.push({
      title: 'Optimize ATS Resume Score',
      description: `Current ATS score is ${context.resume.latestAtsScore ?? 0}/100. Resolve formatting and missing keyword warnings.`,
      href: '/analyzer',
      priority: 'high',
      actionText: 'Run ATS Audit',
      category: 'resume'
    });
  }

  // Critical Skill Gaps
  if (gaps.criticalGaps.length > 0) {
    const topGap = gaps.criticalGaps[0].skill;
    actions.push({
      title: `Bridge Skill Gap: ${topGap}`,
      description: `Master ${topGap} to satisfy a critical requirement for ${gaps.targetRole}.`,
      href: '/career/skills',
      priority: 'high',
      actionText: 'Start Learning',
      category: 'skill'
    });
  }

  // Project Recommendation
  if ((context.projects?.inProgressCount || 0) === 0) {
    actions.push({
      title: 'Start a Guided Portfolio Project',
      description: `Build a production-grade portfolio project tailored to ${gaps.targetRole}.`,
      href: '/career/projects',
      priority: 'medium',
      actionText: 'Browse Projects',
      category: 'project'
    });
  }

  // Interview Practice
  if ((context.interviews?.completedSessions || 0) === 0) {
    actions.push({
      title: 'Practice Mock Interview',
      description: `Complete a 5-question technical and STAR-method mock interview for ${gaps.targetRole}.`,
      href: '/career/interview',
      priority: 'medium',
      actionText: 'Start Interview',
      category: 'interview'
    });
  }

  return actions.slice(0, 5);
}

// ============================================================================
// MAIN EXPORTED FUNCTIONS
// ============================================================================

/**
 * Pure, deterministic recommendation engine generating unified career intelligence.
 * Enforces Rule 16 anti-fabrication: derives all insights strictly from verified candidate context.
 */
export function generateCareerIntelligence(
  context: UnifiedStudentContext,
  options?: CareerIntelligenceOptions
): CareerIntelligenceRecommendation {
  const targetRole = (options?.targetRoleOverride || context.careerGoal?.targetRole || 'Software Engineer').trim();
  const curatedProfile = findCuratedRoleProfile(targetRole);

  const careerReadinessScore = calculateDeterministicReadiness(context, curatedProfile);
  const skillGaps = deriveSkillGaps(context, targetRole, curatedProfile);
  const learningRoadmap = deriveLearningRoadmap(context, targetRole, skillGaps);
  const projectRecommendations = deriveProjectRecommendations(targetRole, skillGaps, curatedProfile);
  const interviewRoadmap = deriveInterviewRoadmap(context, targetRole, skillGaps);
  const resumeImprovementPriorities = deriveResumeImprovementPriorities(context, skillGaps);
  const recommendedNextActions = deriveRecommendedNextActions(context, careerReadinessScore, skillGaps);

  return {
    careerReadinessScore,
    skillGaps,
    learningRoadmap,
    projectRecommendations,
    interviewRoadmap,
    resumeImprovementPriorities,
    recommendedNextActions,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Resolves full UnifiedStudentContext for a user and runs the Career Intelligence Engine.
 */
export async function getCareerIntelligenceForUser(
  userId: string,
  options?: CareerIntelligenceOptions
): Promise<CareerIntelligenceRecommendation> {
  const context = await buildUnifiedStudentContext(userId);
  return generateCareerIntelligence(context, options);
}
