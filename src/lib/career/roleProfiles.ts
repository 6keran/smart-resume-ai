export type RoleDomain =
  | 'Software'
  | 'Data'
  | 'Mechanical'
  | 'Electrical'
  | 'Civil'
  | 'Marketing'
  | 'Finance'
  | 'Human Resources'
  | 'Design';

export interface CuratedResource {
  title: string;
  provider: string;
  url?: string;
  type: 'official_docs' | 'courseware' | 'certification_page';
  lastVerified: string;
}

export interface CuratedCertification {
  name: string;
  provider: string;
  url?: string;
  notes?: string;
}

export interface CuratedProjectTemplate {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  deliverables: string[];
  skillsPracticed: string[];
  estimatedEffort: string;
}

export interface CuratedRoleProfile {
  slug: string;
  title: string;
  domain: RoleDomain;
  aliases: string[];
  summary: string;
  coreSkills: string[];
  recommendedTools: string[];
  projectIdeas: CuratedProjectTemplate[];
  certifications: CuratedCertification[];
  learningResources: CuratedResource[];
  defaultSearchKeywords: string[];
}

export const ROLE_PROFILES: CuratedRoleProfile[] = [
  {
    slug: 'software-engineer',
    title: 'Software Engineer',
    domain: 'Software',
    aliases: [
      'graduate software engineer',
      'junior software engineer',
      'software developer',
      'sde',
      'sde-1',
      'full stack developer',
      'backend developer',
      'frontend developer',
    ],
    summary: 'Designs, tests, and maintains reliable web services, user interfaces, and data-backed applications.',
    coreSkills: ['TypeScript', 'React', 'SQL', 'Git', 'REST APIs', 'Unit Testing'],
    recommendedTools: ['Node.js', 'PostgreSQL', 'Docker', 'Playwright'],
    projectIdeas: [
      {
        id: 'proj-se-issue-tracker',
        title: 'Issue & Milestone Tracker with Authentication and Tests',
        difficulty: 'Intermediate',
        summary: 'Build a role-scoped issue tracker supporting filtering, status transitions, and automated integration tests.',
        deliverables: [
          'Normalized SQL schema and CRUD endpoints with ownership checks',
          'Accessible filterable UI table and validation states',
          'Automated test suite covering happy paths and authorization boundaries',
        ],
        skillsPracticed: ['TypeScript', 'React', 'SQL', 'REST APIs', 'Unit Testing'],
        estimatedEffort: '2-3 weeks',
      },
      {
        id: 'proj-se-schema-tool',
        title: 'Database Migration & Audit Log Service',
        difficulty: 'Intermediate',
        summary: 'Implement a REST service that tracks versioned records, audit events, and idempotent schema setup.',
        deliverables: [
          'Versioned API endpoints with input schema validation',
          'Structured JSON audit log and pagination',
          'README documenting architecture trade-offs and local setup',
        ],
        skillsPracticed: ['SQL', 'REST APIs', 'Git', 'Unit Testing'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'AWS Certified Cloud Practitioner',
        provider: 'Amazon Web Services',
        url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
      },
    ],
    learningResources: [
      {
        title: 'React Official Learn Guide',
        provider: 'React',
        url: 'https://react.dev/learn',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'TypeScript Documentation',
        provider: 'Microsoft / TypeScript',
        url: 'https://www.typescriptlang.org/docs/',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'PostgreSQL Official Tutorial',
        provider: 'PostgreSQL Global Development Group',
        url: 'https://www.postgresql.org/docs/current/tutorial.html',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'AWS Certified Cloud Practitioner Overview',
        provider: 'Amazon Web Services',
        url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
        type: 'certification_page',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Software Engineer', 'Backend Engineer', 'Frontend Engineer'],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    domain: 'Data',
    aliases: ['business intelligence analyst', 'junior data analyst', 'analytics engineer', 'bi analyst'],
    summary: 'Cleans, models, and interprets operational datasets using SQL, Python, and structured reporting.',
    coreSkills: ['SQL', 'Python', 'Pandas', 'NumPy', 'Spreadsheets', 'Data Visualization'],
    recommendedTools: ['PostgreSQL', 'Jupyter', 'Power BI', 'Excel'],
    projectIdeas: [
      {
        id: 'proj-da-cohort-funnel',
        title: 'Cohort Retention & Conversion Funnel SQL Analysis',
        difficulty: 'Intermediate',
        summary: 'Analyze a public or exported event dataset using window functions, CTEs, and clear summary charts.',
        deliverables: [
          'Reproducible SQL queries calculating weekly retention and drop-off stages',
          'Executive summary memo citing methodology and data caveats',
          'Cleaned dataset and visualization workbook',
        ],
        skillsPracticed: ['SQL', 'Data Visualization', 'Spreadsheets'],
        estimatedEffort: '1-2 weeks',
      },
      {
        id: 'proj-da-eda-notebook',
        title: 'Public Dataset Cleaning & Exploratory Notebook',
        difficulty: 'Beginner',
        summary: 'Audit missing values, outliers, and summary statistics in Python with reproducible notebooks.',
        deliverables: [
          'Data quality checklist handling nulls and duplicates',
          'Pandas + NumPy transformation pipeline with clear charts',
        ],
        skillsPracticed: ['Python', 'Pandas', 'NumPy', 'Data Visualization'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'Microsoft Certified: Power BI Data Analyst Associate',
        provider: 'Microsoft Learn',
        url: 'https://learn.microsoft.com/en-us/training/',
      },
    ],
    learningResources: [
      {
        title: 'PostgreSQL Official Tutorial',
        provider: 'PostgreSQL Global Development Group',
        url: 'https://www.postgresql.org/docs/current/tutorial.html',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'The Python Tutorial',
        provider: 'Python Software Foundation',
        url: 'https://docs.python.org/3/tutorial/',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'Pandas Getting Started Guides',
        provider: 'PyData / Pandas',
        url: 'https://pandas.pydata.org/docs/getting_started/index.html',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'NumPy Learn',
        provider: 'NumPy',
        url: 'https://numpy.org/learn/',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'Microsoft Learn Training Catalog',
        provider: 'Microsoft',
        url: 'https://learn.microsoft.com/en-us/training/',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Data Analyst', 'Business Intelligence', 'SQL Analyst'],
  },
  {
    slug: 'mechanical-engineer',
    title: 'Mechanical Engineer',
    domain: 'Mechanical',
    aliases: ['cad engineer', 'design engineer mechanical', 'manufacturing engineer', 'graduate mechanical engineer'],
    summary: 'Designs mechanical assemblies, performs structural/thermal trade-off checks, and specifies manufacturable tolerances.',
    coreSkills: ['CAD Modeling', 'Engineering Drawing / GD&T', 'Thermodynamics', 'Mechanics of Materials', 'FEA Basics', 'Manufacturing Processes'],
    recommendedTools: ['SolidWorks', 'AutoCAD', 'ANSYS', 'MATLAB'],
    projectIdeas: [
      {
        id: 'proj-me-bracket',
        title: 'Parametric Mounting Bracket Design & Tolerance Study',
        difficulty: 'Intermediate',
        summary: 'Design a load-bearing bracket with GD&T callouts, material selection rationale, and basic hand-checked stress calculations.',
        deliverables: [
          '2D engineering drawing with datum scheme and tolerance stack-up notes',
          'Bill of materials comparing aluminum vs steel mass and safety factor',
          'Manufacturing process notes (CNC machining vs sheet metal)',
        ],
        skillsPracticed: ['CAD Modeling', 'Engineering Drawing / GD&T', 'Mechanics of Materials', 'Manufacturing Processes'],
        estimatedEffort: '2 weeks',
      },
      {
        id: 'proj-me-thermal',
        title: 'Compact Heat-Sink Fin Trade-Off Study',
        difficulty: 'Intermediate',
        summary: 'Evaluate fin spacing, airflow velocity, and thermal resistance using first-principles convection equations.',
        deliverables: [
          'Spreadsheet or script calculating heat dissipation across geometry variants',
          'One-page design summary with boundary assumptions',
        ],
        skillsPracticed: ['Thermodynamics', 'FEA Basics'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'Certified Associate in Project Management (CAPM)',
        provider: 'Project Management Institute (PMI)',
        notes: 'Verify current exam eligibility on PMI.org.',
      },
      {
        name: 'ASME Standards & Engineering Courses',
        provider: 'ASME',
        url: 'https://www.asme.org/',
      },
    ],
    learningResources: [
      {
        title: 'MIT OpenCourseWare — Mechanical Engineering',
        provider: 'MIT OpenCourseWare',
        url: 'https://ocw.mit.edu/search/?d=Mechanical%20Engineering&s=department_course_numbers.sort_coursenum',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
      {
        title: 'ASME Engineering Portal',
        provider: 'ASME',
        url: 'https://www.asme.org/',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Mechanical Engineer', 'CAD Engineer', 'Manufacturing Engineer'],
  },
  {
    slug: 'electrical-engineer',
    title: 'Electrical Engineer',
    domain: 'Electrical',
    aliases: ['electronics engineer', 'embedded engineer', 'hardware engineer', 'pcb design engineer'],
    summary: 'Designs and validates analog/digital circuits, power regulation stages, embedded firmware interfaces, and test plans.',
    coreSkills: ['Circuit Analysis', 'PCB Layout Basics', 'Embedded C', 'Digital Logic', 'Oscilloscope Testing', 'Signals & Systems'],
    recommendedTools: ['KiCad', 'SPICE', 'MATLAB', 'Multimeter / Oscilloscope'],
    projectIdeas: [
      {
        id: 'proj-ee-sensor-node',
        title: 'Microcontroller Environmental Sensor Schematic & BOM',
        difficulty: 'Intermediate',
        summary: 'Capture a two-layer schematic with power regulation, decoupling, programming header, and annotated BOM.',
        deliverables: [
          'Annotated schematic PDF and ERC checklist',
          'Component selection rationale and power budget spreadsheet',
          'Bench test plan covering rail bring-up and bus verification',
        ],
        skillsPracticed: ['Circuit Analysis', 'PCB Layout Basics', 'Embedded C', 'Oscilloscope Testing'],
        estimatedEffort: '2 weeks',
      },
      {
        id: 'proj-ee-buck',
        title: 'Step-Down Regulator Trade-Off & Ripple Analysis',
        difficulty: 'Intermediate',
        summary: 'Model inductor current ripple, thermal losses, and capacitor ESR selection across load steps.',
        deliverables: [
          'SPICE simulation plots and efficiency calculations',
          'Layout guidelines checklist for switch-node minimization',
        ],
        skillsPracticed: ['Circuit Analysis', 'Signals & Systems'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'IEEE Continuing Education & Society Credentials',
        provider: 'IEEE',
        notes: 'Available directly via IEEE Learning Network.',
      },
    ],
    learningResources: [
      {
        title: 'MIT OpenCourseWare — Electrical Engineering & Computer Science',
        provider: 'MIT OpenCourseWare',
        url: 'https://ocw.mit.edu/search/?d=Electrical%20Engineering%20and%20Computer%20Science&s=department_course_numbers.sort_coursenum',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Electrical Engineer', 'Embedded Systems Engineer', 'Hardware Engineer'],
  },
  {
    slug: 'civil-engineer',
    title: 'Civil Engineer',
    domain: 'Civil',
    aliases: ['structural engineer', 'site engineer', 'construction engineer', 'graduate civil engineer'],
    summary: 'Plans and checks structural elements, site layouts, material quantities, and construction quality compliance.',
    coreSkills: ['Structural Analysis', 'AutoCAD / Drafting', 'Concrete & Steel Design Codes', 'Surveying', 'Quantity Estimation', 'Geotechnical Basics'],
    recommendedTools: ['AutoCAD', 'ETABS / STAAD Basics', 'Excel'],
    projectIdeas: [
      {
        id: 'proj-ce-beam',
        title: 'Simply Supported Reinforced Concrete Beam Calculation Sheet',
        difficulty: 'Intermediate',
        summary: 'Document dead/live load combinations, shear and bending moment diagrams, and reinforcement checks.',
        deliverables: [
          'Transparent step-by-step calculation workbook with unit checks',
          'Cross-section rebar detailing sketch and bar bending schedule',
        ],
        skillsPracticed: ['Structural Analysis', 'Concrete & Steel Design Codes', 'AutoCAD / Drafting'],
        estimatedEffort: '1-2 weeks',
      },
      {
        id: 'proj-ce-boq',
        title: 'Small Structure Quantity Takeoff & Construction Sequence Plan',
        difficulty: 'Beginner',
        summary: 'Prepare an itemized Bill of Quantities (BOQ) for excavation, formwork, concrete volume, and steel reinforcement.',
        deliverables: [
          'BOQ spreadsheet separating labor, material quantities, and wastage assumptions',
          'Milestone bar chart sequencing site works and curing windows',
        ],
        skillsPracticed: ['Quantity Estimation', 'Surveying'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'Fundamentals of Engineering (FE Civil)',
        provider: 'NCEES',
        notes: 'Verify exam registration requirements with NCEES / state board.',
      },
      {
        name: 'Certified Associate in Project Management (CAPM)',
        provider: 'Project Management Institute (PMI)',
        notes: 'Verify current exam eligibility on PMI.org.',
      },
    ],
    learningResources: [
      {
        title: 'MIT OpenCourseWare — Civil & Environmental Engineering',
        provider: 'MIT OpenCourseWare',
        url: 'https://ocw.mit.edu/search/?d=Civil%20and%20Environmental%20Engineering&s=department_course_numbers.sort_coursenum',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Civil Engineer', 'Site Engineer', 'Structural Engineer'],
  },
  {
    slug: 'digital-marketing-specialist',
    title: 'Digital Marketing Specialist',
    domain: 'Marketing',
    aliases: ['growth marketer', 'performance marketer', 'seo specialist', 'marketing coordinator', 'content marketer'],
    summary: 'Plans acquisition campaigns, measures funnel performance, optimizes organic search visibility, and refines messaging.',
    coreSkills: ['SEO Fundamentals', 'Campaign Analytics', 'Content Strategy', 'Paid Search Basics', 'Email Lifecycle Marketing', 'Copywriting'],
    recommendedTools: ['Google Analytics', 'Google Ads', 'HubSpot', 'Spreadsheets'],
    projectIdeas: [
      {
        id: 'proj-mkt-seo-audit',
        title: 'Organic Search & Landing-Page Funnel Audit',
        difficulty: 'Beginner',
        summary: 'Audit a real or sample product site for technical SEO hygiene, search intent alignment, and CTA clarity.',
        deliverables: [
          'Keyword cluster map segmented by informational vs high-intent queries',
          'Prioritized on-page recommendations with before/after copy drafts',
        ],
        skillsPracticed: ['SEO Fundamentals', 'Content Strategy', 'Copywriting'],
        estimatedEffort: '1 week',
      },
      {
        id: 'proj-mkt-launch-plan',
        title: 'Multi-Channel Product Launch & Attribution Plan',
        difficulty: 'Intermediate',
        summary: 'Structure a sample launch brief across search, email onboarding, and UTM tracking taxonomy.',
        deliverables: [
          'UTM naming convention sheet and funnel KPI definitions (CTR, CVR, CAC)',
          '3-email lifecycle sequence with A/B test hypotheses',
        ],
        skillsPracticed: ['Campaign Analytics', 'Paid Search Basics', 'Email Lifecycle Marketing'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'Google Ads & Analytics Certifications',
        provider: 'Google Skillshop',
        url: 'https://skillshop.withgoogle.com/',
      },
      {
        name: 'Inbound & Digital Marketing Certifications',
        provider: 'HubSpot Academy',
        url: 'https://academy.hubspot.com/',
      },
    ],
    learningResources: [
      {
        title: 'Google Skillshop Training',
        provider: 'Google',
        url: 'https://skillshop.withgoogle.com/',
        type: 'certification_page',
        lastVerified: '2026-11-12',
      },
      {
        title: 'HubSpot Academy Courses',
        provider: 'HubSpot',
        url: 'https://academy.hubspot.com/',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Digital Marketing', 'SEO Specialist', 'Growth Marketing'],
  },
  {
    slug: 'financial-analyst',
    title: 'Financial Analyst',
    domain: 'Finance',
    aliases: ['fp&a analyst', 'junior financial analyst', 'corporate finance analyst', 'equity analyst', 'investment analyst'],
    summary: 'Builds three-statement financial models, tracks budget vs actual variances, and evaluates investment or operating decisions.',
    coreSkills: ['Financial Modeling', 'Three-Statement Accounting', 'Valuation (DCF)', 'Excel / Spreadsheets', 'Variance Analysis', 'Financial Reporting'],
    recommendedTools: ['Excel', 'SQL', 'Power BI', 'SEC / Company Filings'],
    projectIdeas: [
      {
        id: 'proj-fin-3stmt',
        title: 'Three-Statement Financial Model & Sensitivity Case Study',
        difficulty: 'Intermediate',
        summary: 'Extract historical figures from a public annual filing, link income statement/balance sheet/cash flow, and test scenarios.',
        deliverables: [
          'Dynamic spreadsheet model with clearly separated assumption drivers',
          'Base/Bull/Bear valuation sensitivity table and 1-page investment memo',
        ],
        skillsPracticed: ['Financial Modeling', 'Three-Statement Accounting', 'Valuation (DCF)', 'Excel / Spreadsheets'],
        estimatedEffort: '2 weeks',
      },
      {
        id: 'proj-fin-variance',
        title: 'Monthly Budget vs. Actuals Variance Pack',
        difficulty: 'Beginner',
        summary: 'Decompose revenue and operating expense variances into price, volume, and timing drivers.',
        deliverables: [
          'Variance bridge summary table and concise management commentary',
          'Error-checked forecast roll-forward template',
        ],
        skillsPracticed: ['Variance Analysis', 'Financial Reporting', 'Excel / Spreadsheets'],
        estimatedEffort: '1 week',
      },
    ],
    certifications: [
      {
        name: 'Investment Foundations Certificate',
        provider: 'CFA Institute',
        url: 'https://www.cfainstitute.org/programs/investment-foundations-certificate',
      },
    ],
    learningResources: [
      {
        title: 'CFA Institute Investment Foundations Certificate',
        provider: 'CFA Institute',
        url: 'https://www.cfainstitute.org/programs/investment-foundations-certificate',
        type: 'certification_page',
        lastVerified: '2026-11-12',
      },
      {
        title: 'Microsoft Learn Training (Excel & Power BI)',
        provider: 'Microsoft',
        url: 'https://learn.microsoft.com/en-us/training/',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['Financial Analyst', 'FP&A Analyst', 'Corporate Finance'],
  },
  {
    slug: 'hr-generalist',
    title: 'HR Generalist',
    domain: 'Human Resources',
    aliases: ['people operations specialist', 'hr coordinator', 'talent acquisition specialist', 'human resources specialist'],
    summary: 'Supports structured hiring, onboarding programs, employee documentation, and consistent HR policy operations.',
    coreSkills: ['Talent Acquisition', 'Interview Rubrics', 'Onboarding Operations', 'HR Compliance Basics', 'Employee Relations', 'HRIS Administration'],
    recommendedTools: ['Applicant Tracking Systems', 'Spreadsheets', 'Documentation Wikis'],
    projectIdeas: [
      {
        id: 'proj-hr-rubric',
        title: 'Structured Interview Scorecard & Hiring Rubric Kit',
        difficulty: 'Beginner',
        summary: 'Create role-calibrated behavioral rubrics, scoring anchors (1-4), and debrief templates to reduce bias.',
        deliverables: [
          'Job scorecard mapping competencies to structured interview prompts',
          'Standardized interviewer calibration guide and feedback form',
        ],
        skillsPracticed: ['Talent Acquisition', 'Interview Rubrics', 'HR Compliance Basics'],
        estimatedEffort: '1 week',
      },
      {
        id: 'proj-hr-onboarding',
        title: '30-60-90 Day New-Hire Onboarding Playbook',
        difficulty: 'Intermediate',
        summary: 'Design pre-boarding checklists, manager touchpoints, and milestone feedback surveys for hybrid/remote teams.',
        deliverables: [
          'Day-1 to Day-90 checklist split by HR, IT, and hiring manager',
          'Onboarding pulse survey template and documentation index',
        ],
        skillsPracticed: ['Onboarding Operations', 'Employee Relations', 'HRIS Administration'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'SHRM Certified Professional (SHRM-CP)',
        provider: 'SHRM',
        url: 'https://www.shrm.org/credentials/certification',
      },
    ],
    learningResources: [
      {
        title: 'SHRM Certification Portal',
        provider: 'Society for Human Resource Management',
        url: 'https://www.shrm.org/credentials/certification',
        type: 'certification_page',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['HR Generalist', 'People Operations', 'Talent Acquisition'],
  },
  {
    slug: 'ui-ux-designer',
    title: 'UI/UX Designer',
    domain: 'Design',
    aliases: ['product designer', 'ux designer', 'ui designer', 'interaction designer'],
    summary: 'Designs clear user flows, accessible component systems, interactive prototypes, and usability validation plans.',
    coreSkills: ['Wireframing', 'Design Systems', 'Interaction Flows', 'Accessibility (WCAG)', 'Usability Testing', 'Prototyping'],
    recommendedTools: ['Figma', 'FigJam', 'Contrast Checkers'],
    projectIdeas: [
      {
        id: 'proj-ux-flow-audit',
        title: 'Multi-Step Onboarding Flow Usability & Accessibility Redesign',
        difficulty: 'Intermediate',
        summary: 'Audit an onboarding or checkout flow for friction, keyboard focus order, error recovery, and mobile layout.',
        deliverables: [
          'Task flow diagram highlighting drop-off risks and edge states',
          'Interactive wireframe/UI prototype with WCAG contrast annotations',
        ],
        skillsPracticed: ['Wireframing', 'Interaction Flows', 'Accessibility (WCAG)', 'Prototyping'],
        estimatedEffort: '1-2 weeks',
      },
      {
        id: 'proj-ux-tokens',
        title: 'Accessible Light-Mode Component & Token Specification',
        difficulty: 'Intermediate',
        summary: 'Document typography scale, spacing tokens, focus rings, and form validation states cleanly.',
        deliverables: [
          'Component spec covering buttons, inputs, tables, and empty states',
          'Usability test script with 5 task prompts and observation grid',
        ],
        skillsPracticed: ['Design Systems', 'Accessibility (WCAG)', 'Usability Testing'],
        estimatedEffort: '1-2 weeks',
      },
    ],
    certifications: [
      {
        name: 'Web Design & Accessibility Learning Path',
        provider: 'web.dev / Google & Figma',
        url: 'https://web.dev/learn/design',
      },
    ],
    learningResources: [
      {
        title: 'Figma Help Center & Learning Guides',
        provider: 'Figma',
        url: 'https://help.figma.com/hc/en-us',
        type: 'official_docs',
        lastVerified: '2026-11-12',
      },
      {
        title: 'web.dev Learn Responsive Design',
        provider: 'Google / web.dev',
        url: 'https://web.dev/learn/design',
        type: 'courseware',
        lastVerified: '2026-11-12',
      },
    ],
    defaultSearchKeywords: ['UI/UX Designer', 'Product Designer', 'UX Researcher'],
  },
];

function normalizeRoleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9/+&]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Looks up a curated role profile without ever silently falling back to a default role.
 * Returns null if roleInput is blank or does not match a curated profile.
 */
export function findCuratedRoleProfile(roleInput?: string | null): CuratedRoleProfile | null {
  if (!roleInput || typeof roleInput !== 'string') return null;
  const cleaned = normalizeRoleKey(roleInput);
  if (!cleaned) return null;

  for (const profile of ROLE_PROFILES) {
    if (profile.slug === roleInput.trim().toLowerCase()) return profile;
    if (normalizeRoleKey(profile.title) === cleaned) return profile;
    if (profile.aliases.some((alias) => normalizeRoleKey(alias) === cleaned)) return profile;
  }

  for (const profile of ROLE_PROFILES) {
    const titleNorm = normalizeRoleKey(profile.title);
    if (cleaned.includes(titleNorm) || profile.aliases.some((alias) => cleaned.includes(normalizeRoleKey(alias)))) {
      return profile;
    }
  }

  return null;
}

export function searchCuratedRoleProfiles(query: string): CuratedRoleProfile[] {
  const q = normalizeRoleKey(query);
  if (!q) return ROLE_PROFILES;
  return ROLE_PROFILES.filter((profile) => {
    if (normalizeRoleKey(profile.title).includes(q)) return true;
    if (profile.domain.toLowerCase().includes(q)) return true;
    if (profile.aliases.some((a) => normalizeRoleKey(a).includes(q))) return true;
    if (profile.coreSkills.some((s) => s.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function getAllCuratedRoleTitles(): string[] {
  return ROLE_PROFILES.map((p) => p.title);
}

export function getAllCuratedSkillSuggestions(): string[] {
  const seen = new Map<string, string>();
  for (const profile of ROLE_PROFILES) {
    for (const skill of [...profile.coreSkills, ...profile.recommendedTools]) {
      const key = skill.toLowerCase();
      if (!seen.has(key)) seen.set(key, skill);
    }
  }
  return Array.from(seen.values());
}

