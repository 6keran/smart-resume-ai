import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const { calculateDeterministicAtsScore } = await import(
  '../src/server/services/deterministicAtsEngine.ts'
);

// ============================================================================
// JOB DESCRIPTIONS
// ============================================================================

const JD_SOFTWARE_ENGINEER = `
Junior to Mid-Level Full Stack Software Engineer
TechCorp is seeking a Full Stack Software Engineer to build web applications.
Responsibilities:
- Build responsive frontend user interfaces using React, Next.js, and TypeScript
- Develop scalable backend REST APIs using Node.js and Express
- Design and optimize relational database schemas in PostgreSQL
- Write unit tests and participate in CI/CD deployment pipelines using Git and Docker
Requirements:
- Hands-on proficiency in JavaScript, TypeScript, React, Node.js, and SQL
- Familiarity with version control (Git) and automated testing (Jest)
- Strong foundation in data structures and web development fundamentals
`;

const JD_SENIOR_FULLSTACK = `
Senior Full Stack Engineer
CloudScale Systems is looking for a Senior Full Stack Engineer.
Responsibilities:
- Architect high-throughput distributed microservices in Node.js and TypeScript
- Optimize frontend web performance using React and Next.js App Router
- Manage production databases with PostgreSQL, Redis caching, and connection pooling
- Implement robust cloud infrastructure using Docker, AWS, and CI/CD pipelines
Requirements:
- 5+ years of software engineering experience with Node.js, TypeScript, React, PostgreSQL
- Demonstrated experience handling high-scale traffic (Redis, microservices, AWS)
- Proven track record of measurable performance optimizations
`;

const JD_SENIOR_BACKEND = `
Senior Backend Engineer
DataCore Technologies is hiring a Senior Backend Engineer.
Requirements:
- Deep expertise in Node.js, TypeScript, PostgreSQL, and Redis
- Experience designing distributed microservices and message queues (Kafka)
- Proven ability to optimize database queries, index strategies, and reduce API latency
- Containerization and cloud orchestration with Docker and AWS
`;

// ============================================================================
// CANDIDATE PROFILES
// ============================================================================

// Profile 1: Fresher with academic projects and technical skills
const PROFILE_1_FRESHER_RELEVANT = `
Alex Rivera
alex.rivera@university.edu | (555) 234-5678 | Austin, TX | github.com/alexrivera | linkedin.com/in/alexrivera

PROFESSIONAL SUMMARY
Recent Computer Science graduate with strong foundational training in full stack software engineering. Proficient in TypeScript, React, Node.js, and SQL databases through academic capstones and open-source contributions.

EDUCATION
B.S. in Computer Science | University of Texas at Austin (Graduation: May 2026) | GPA: 3.82
Relevant Coursework: Data Structures & Algorithms, Database Systems, Web Application Engineering, Operating Systems

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, C++, HTML5, CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS
Databases & Tools: PostgreSQL, SQLite, Git, GitHub, Docker, Jest, REST APIs

PROJECTS
Campus Resource Exchange Platform | React, Node.js, PostgreSQL, Docker
• Built a full-stack student textbook and housing marketplace used by 1,400+ active campus students.
• Engineered 12 secure RESTful API endpoints with JWT authentication and PostgreSQL transactions.
• Containerized the application using Docker and configured continuous testing with GitHub Actions and Jest (88% code coverage).

Algorithmic Trading Backtester | Python, Pandas, PostgreSQL
• Developed a historical market simulation engine processing 500,000 tick records in under 3 seconds.
• Implemented risk metrics (Sharpe ratio, max drawdown) and visualized performance curves.
`;

// Profile 2: Fresher with unrelated projects and unrelated skills
const PROFILE_2_FRESHER_UNRELATED = `
Marcus Vance
marcus.vance@stateu.edu | (555) 876-5432 | Denver, CO | linkedin.com/in/marcusvance

PROFESSIONAL SUMMARY
Creative and detail-oriented Civil Engineering graduate specializing in structural analysis, drafting, and project site coordination. Eager to bring technical modeling precision to analytical challenges.

EDUCATION
B.S. in Civil Engineering | Colorado State University (Graduation: May 2026) | GPA: 3.65
Coursework: Structural Analysis, Fluid Mechanics, Soil Mechanics, Geotechnical Engineering, CAD Design

TECHNICAL SKILLS
Engineering Tools: AutoCAD, Revit, SolidWorks, Civil 3D, ArcGIS
Analysis & Methods: Finite Element Analysis, Concrete Mix Design, Topographic Surveying, MathCAD
Office & Management: MS Project, Excel, Bluebeam Revu, Technical Specifications

PROJECTS
Urban Pedestrian Bridge Structural Design | AutoCAD, Revit, Civil 3D
• Designed a 120-foot steel truss pedestrian bridge compliant with AASHTO load and resistance factor standards.
• Calculated static and dynamic wind load deflection limits using finite element modeling in MathCAD.
• Produced complete 3D BIM models and 24 structural drafting sheets in Revit for city municipal review.

Stormwater Runoff Retention Analysis | ArcGIS, Civil 3D
• Modeled hydrological watershed flow for a 45-acre urban redevelopment parcel predicting 100-year flood levels.
• Sized bio-retention basins and culvert drainage networks to mitigate site runoff by 40%.
`;

// Profile 3: Experienced software developer with relevant experience
const PROFILE_3_EXP_RELEVANT = `
Samantha Reed
samantha.reed@example.com | (555) 345-6789 | Seattle, WA | github.com/samanthareed | linkedin.com/in/samanthareed

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 6+ years of experience architecting distributed cloud applications and high-traffic web platforms. Specialized in TypeScript, React, Next.js, Node.js, PostgreSQL, and AWS infrastructure.

WORK EXPERIENCE
Senior Full Stack Engineer | CloudTech Solutions (2022 - Present)
• Architected and deployed microservices using Node.js, TypeScript, and PostgreSQL serving 18M monthly requests.
• Redesigned customer portal in Next.js 15, improving Core Web Vitals LCP by 48% and boosting conversion by 18%.
• Introduced Redis caching layer that reduced p99 database query response times from 180ms to 24ms.
• Spearheaded automated CI/CD pipelines with Docker and AWS ECS, cutting production deployment time by 65%.

Software Engineer | Apex Digital Labs (2018 - 2022)
• Developed responsive frontend dashboards in React, Redux, and Tailwind CSS for 45,000 enterprise users.
• Engineered REST APIs and background worker queues handling $4.2M in annual recurring billing transactions.
• Mentored 5 junior engineers through code reviews, architectural design docs, and unit testing best practices in Jest.

EDUCATION
B.S. in Computer Science | University of Washington (2014 - 2018)

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, SQL, Python
Frameworks: React, Next.js, Node.js, Express, Tailwind CSS
Databases & Cloud: PostgreSQL, Redis, AWS, Docker, Git, CI/CD, REST APIs, GraphQL, Microservices, Jest

PROJECTS
Open Source Cache Orchestrator | TypeScript, Redis, Docker
• Created an open-source distributed cache warming library with 2,400+ GitHub stars and 80k monthly npm downloads.
• Achieved 98% test coverage using Jest and GitHub Actions automated integration workflows.
`;

// Profile 4: Experienced candidate applying for an unrelated role
const PROFILE_4_EXP_UNRELATED = `
David Harrington
david.harrington@example.com | (555) 456-7890 | Chicago, IL | linkedin.com/in/davidharrington

PROFESSIONAL SUMMARY
Senior Certified Public Accountant (CPA) and Corporate Controller with 7+ years directing financial operations, GAAP compliance, multi-entity consolidations, and strategic audit preparation for enterprise organizations.

WORK EXPERIENCE
Senior Corporate Controller | Midwest Manufacturing Group (2021 - Present)
• Managed full-cycle financial operations, month-end close, and GAAP consolidation across 4 subsidiary companies with $85M annual revenue.
• Spearheaded enterprise SAP ERP migration, accelerating month-end financial reporting cycles from 14 days to 4 days.
• Supervised an internal accounting team of 8 professionals covering general ledger, accounts payable, and statutory reporting.
• Reduced external audit prep fees by $45,000 through automated reconciliation workflows and tighter internal controls.

Senior Financial Auditor | Deloitte & Touche LLP (2017 - 2021)
• Led financial statement audits, SOX 404 internal control testing, and substantive testing for Fortune 500 manufacturing clients.
• Identified $1.2M in balance sheet reclassifications and revenue recognition timing discrepancies.
• Authored comprehensive executive audit committee reports and technical accounting memorandums.

EDUCATION
B.S. in Accounting & Finance | University of Illinois Urbana-Champaign (2013 - 2017)
Certified Public Accountant (CPA) — State of Illinois (Active License #48921)

TECHNICAL SKILLS
Financial Platforms: SAP ERP, QuickBooks Enterprise, NetSuite, Workday Financials, Hyperion
Compliance & Analysis: US GAAP, IFRS, SOX Compliance, Tax Auditing, Variance Analysis, Financial Modeling
Software Tools: Advanced Excel (VBA, PowerQuery), Tableau, Alteryx, Financial Statements
`;

// Profile 5: Resume containing keyword stuffing without genuine supporting experience
const PROFILE_5_KEYWORD_STUFFING = `
Kevin Miller
kevin.miller@example.com | (555) 567-8901 | New York, NY | linkedin.com/in/kevinmiller

PROFESSIONAL SUMMARY
Software professional with vast knowledge in modern software and technology stacks.

WORK EXPERIENCE
IT Operations Assistant | General Services Inc. (2022 - 2024)
• Responsible for office computer setup and basic equipment inventory maintenance.
• Assisted staff members with general computer questions and password resets.
• Helped to update internal spreadsheet records and filed vendor hardware invoices.

EDUCATION
B.A. in General Studies | Metropolitan College (2018 - 2022)

TECHNICAL SKILLS
Python, JavaScript, TypeScript, React, Next.js, Vue.js, Angular, Node.js, Express, Django, Flask, FastAPI, Spring Boot, SQL, PostgreSQL, MySQL, MongoDB, Redis, AWS, Azure, GCP, Docker, Kubernetes, CI/CD, Git, GitHub, REST API, GraphQL, Microservices, System Design, Machine Learning, Deep Learning, TensorFlow, PyTorch, Kafka, Terraform, DevOps, Elasticsearch

PROJECTS
Personal Web Page
• Created a personal webpage using basic HTML and CSS templates.
`;

// Profile 6: Resume with strong projects but no employment history
const PROFILE_6_PROJECTS_NO_EMPLOYMENT = `
Elena Rostova
elena.rostova@example.com | (555) 678-9012 | Portland, OR | github.com/elenarostova | linkedin.com/in/elenarostova

PROFESSIONAL SUMMARY
Independent Systems Software Developer with deep practical experience building high-performance open-source distributed tools, full stack web applications, and containerized microservices.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Go, Python, SQL, HTML5, CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS
Databases & Cloud: PostgreSQL, Redis, Docker, AWS, Git, CI/CD, REST APIs, Microservices, Jest

PROJECTS
EventFlux: Distributed Message Stream Engine | Go, Redis, Docker, AWS
• Designed and engineered an in-memory event streaming broker handling 40,000 events/sec with sub-5ms p99 latency.
• Implemented raft-based consensus clustering for zero-data-loss failovers across 3 nodes under network partition tests.
• Adopted by 35 open-source production projects with 3,800+ GitHub stars and 120,000 Docker Hub image pulls.

DevPulse: Real-Time Developer Analytics Platform | React, Next.js, TypeScript, PostgreSQL, Node.js
• Built a full-stack developer analytics platform monitoring pull request cycle velocity and code review bottlenecks.
• Engineered PostgreSQL time-series indexing pipelines processing 1.2M daily GitHub webhook payloads.
• Designed responsive interactive dashboards using React and Next.js, supporting 1,500 monthly active self-hosted instances.

ContainerCI: Lightweight Sandboxed Execution Engine | Docker, Node.js, TypeScript, REST APIs
• Engineered a sandboxed microVM code execution runner with secure memory cgroups and ephemeral network isolation.
• Reduced build test execution spin-up latency from 1.8s to 120ms through Docker socket pre-warming pools.

EDUCATION
B.S. in Computer Science | Oregon State University (2020 - 2024)
`;

// Profile 7: Resume with incomplete contact information
const PROFILE_7_INCOMPLETE_CONTACT = `
Jordan Lee

PROFESSIONAL SUMMARY
Full Stack Software Developer with 4 years of experience building scalable web applications with React, Node.js, TypeScript, and PostgreSQL.

WORK EXPERIENCE
Software Developer | NextGen Media (2020 - 2024)
• Built responsive user interfaces in React and TypeScript for media streaming service with 250k monthly active users.
• Developed REST APIs in Node.js and Express connected to PostgreSQL database, improving payload delivery speed by 35%.
• Automated build and deployment pipelines using Docker and GitHub Actions CI/CD workflows.

EDUCATION
B.S. in Computer Science | San Jose State University (2016 - 2020)

TECHNICAL SKILLS
TypeScript, JavaScript, React, Node.js, Express, PostgreSQL, Docker, Git, CI/CD, REST APIs

PROJECTS
Interactive Video Platform | React, Node.js, PostgreSQL
• Developed full-stack video bookmarking application with RESTful APIs and authentication.
`;

// Profile 8: Resume with excellent formatting but weak job relevance
const PROFILE_8_PERFECT_FORMAT_WEAK_RELEVANCE = `
Victoria Sterling
victoria.sterling@example.com | (555) 789-0123 | San Francisco, CA | linkedin.com/in/victoriasterling

PROFESSIONAL SUMMARY
High-performing Enterprise SaaS Account Executive with 6+ years driving multi-million dollar revenue growth, complex software licensing negotiations, and executive enterprise stakeholder relationships.

WORK EXPERIENCE
Senior Enterprise Account Executive | CloudScale CRM (2021 - Present)
• Exceeded annual quota at 142% ($2.8M closed ARR) selling enterprise cloud licenses to Fortune 500 accounts.
• Spearheaded 45 complex technical sales cycles, partnering with solutions architects to deliver custom ROI business cases.
• Increased average deal contract size by 35% through multi-year enterprise platform bundling and cross-selling.
• Reduced client sales cycle velocity from 9 months to 5.5 months by establishing executive champion sponsor networks.

Mid-Market Account Executive | DataSync SaaS (2018 - 2021)
• Generated $1.6M in new annual contract value (ACV), achieving 118% quota attainment across 3 consecutive years.
• Sourced 60% of pipeline through outbound executive prospecting, cold call sequences, and LinkedIn Sales Navigator.
• Mentored 4 incoming Sales Development Representatives (SDRs) on discovery call qualification frameworks (MEDDPICC).

EDUCATION
B.A. in Business Administration & Marketing | University of Southern California (2014 - 2018)

SKILLS & PROFICIENCIES
Sales & Strategy: Enterprise Software Sales, MEDDPICC, Challenger Sales, Account Planning, Contract Negotiation
CRM & Sales Tech: Salesforce CRM, HubSpot, Outreach.io, Gong.io, LinkedIn Sales Navigator, ZoomInfo
Business & Communication: Executive Presentations, Revenue Forecasting, Pipeline Management, Customer Retention

PROJECTS & ACCOMPLISHMENTS
President's Club Sales Winner (2022, 2023)
• Top 2% global ranking among 180 enterprise sales executives worldwide.
`;

// ============================================================================
// AUDIT RUNNER
// ============================================================================

async function executeAudit() {
  console.log('================================================================');
  console.log('📊 REALISTIC ATS SCORING ACCURACY AUDIT');
  console.log('Deterministic Scoring Engine Quality & Fairness Evaluation');
  console.log('================================================================\n');

  const testCases = [
    {
      id: 1,
      title: 'Fresher with Academic Projects & Technical Skills',
      candidateName: 'Alex Rivera',
      resume: PROFILE_1_FRESHER_RELEVANT,
      jobTitle: 'Junior Software Engineer',
      company: 'TechCorp',
      jobDescription: JD_SOFTWARE_ENGINEER,
      expectedOutcome: 'High relevance (strong skills + projects), fair fresher scoring',
    },
    {
      id: 2,
      title: 'Fresher with Unrelated Projects & Unrelated Skills',
      candidateName: 'Marcus Vance',
      resume: PROFILE_2_FRESHER_UNRELATED,
      jobTitle: 'Junior Software Engineer',
      company: 'TechCorp',
      jobDescription: JD_SOFTWARE_ENGINEER,
      expectedOutcome: 'Low relevance (Civil Eng skills/projects vs SWE role)',
    },
    {
      id: 3,
      title: 'Experienced Software Developer with Relevant Experience',
      candidateName: 'Samantha Reed',
      resume: PROFILE_3_EXP_RELEVANT,
      jobTitle: 'Senior Full Stack Engineer',
      company: 'CloudScale Systems',
      jobDescription: JD_SENIOR_FULLSTACK,
      expectedOutcome: 'Top tier (perfect skills match, metrics, experience, leadership)',
    },
    {
      id: 4,
      title: 'Experienced Candidate Applying for an Unrelated Role',
      candidateName: 'David Harrington',
      resume: PROFILE_4_EXP_UNRELATED,
      jobTitle: 'Senior Full Stack Engineer',
      company: 'CloudScale Systems',
      jobDescription: JD_SENIOR_FULLSTACK,
      expectedOutcome: 'Low relevance (CPA/Accountant applying for Senior SWE)',
    },
    {
      id: 5,
      title: 'Resume with Keyword Stuffing (No Supporting Experience)',
      candidateName: 'Kevin Miller',
      resume: PROFILE_5_KEYWORD_STUFFING,
      jobTitle: 'Junior Software Engineer',
      company: 'TechCorp',
      jobDescription: JD_SOFTWARE_ENGINEER,
      expectedOutcome: 'Penalized by evidence checker / unbacked skills alert',
    },
    {
      id: 6,
      title: 'Resume with Strong Projects but No Employment History',
      candidateName: 'Elena Rostova',
      resume: PROFILE_6_PROJECTS_NO_EMPLOYMENT,
      jobTitle: 'Junior to Mid Full Stack Engineer',
      company: 'TechCorp',
      jobDescription: JD_SOFTWARE_ENGINEER,
      expectedOutcome: 'Projects credited appropriately, not totally rejected',
    },
    {
      id: 7,
      title: 'Resume with Incomplete Contact Information',
      candidateName: 'Jordan Lee',
      resume: PROFILE_7_INCOMPLETE_CONTACT,
      jobTitle: 'Junior Software Engineer',
      company: 'TechCorp',
      jobDescription: JD_SOFTWARE_ENGINEER,
      expectedOutcome: 'Header penalized for missing contact info, content unaffected',
    },
    {
      id: 8,
      title: 'Resume with Excellent Formatting but Weak Job Relevance',
      candidateName: 'Victoria Sterling',
      resume: PROFILE_8_PERFECT_FORMAT_WEAK_RELEVANCE,
      jobTitle: 'Senior Backend Engineer',
      company: 'DataCore Technologies',
      jobDescription: JD_SENIOR_BACKEND,
      expectedOutcome: 'Formatting/Content high, but Keyword Match low reflects mismatch',
    },
  ];

  const results = [];

  for (const tc of testCases) {
    const analysis = calculateDeterministicAtsScore(
      tc.resume,
      tc.jobDescription,
      tc.jobTitle,
      tc.company
    );

    // Repeat to verify determinism
    const repeatAnalysis = calculateDeterministicAtsScore(
      tc.resume,
      tc.jobDescription,
      tc.jobTitle,
      tc.company
    );
    const isDeterministic =
      analysis.overallAtsScore === repeatAnalysis.overallAtsScore &&
      analysis.keywordMatchScore === repeatAnalysis.keywordMatchScore &&
      analysis.formattingScore === repeatAnalysis.formattingScore &&
      analysis.contentScore === repeatAnalysis.contentScore &&
      analysis.sectionScore === repeatAnalysis.sectionScore;

    results.push({
      id: tc.id,
      title: tc.title,
      candidate: tc.candidateName,
      jobTitle: tc.jobTitle,
      scores: {
        overall: analysis.overallAtsScore,
        keyword: analysis.keywordMatchScore,
        formatting: analysis.formattingScore,
        content: analysis.contentScore,
        section: analysis.sectionScore,
        readability: analysis.readabilityScore,
        bulletStrength: analysis.bulletStrengthScore,
      },
      sectionScores: {
        header: analysis.sectionScores.header.score,
        summary: analysis.sectionScores.summary.score,
        experience: analysis.sectionScores.experience.score,
        projects: analysis.sectionScores.projects.score,
        skills: analysis.sectionScores.skills.score,
        education: analysis.sectionScores.education.score,
      },
      evidenceConsistency: {
        total: analysis.evidenceConsistency.totalSkillsCount,
        backed: analysis.evidenceConsistency.backedSkillsCount,
        consistencyScore: analysis.evidenceConsistency.consistencyScore,
        unbackedCount: analysis.evidenceConsistency.unbackedSkills.length,
      },
      detectedKeywordsCount: analysis.detectedKeywords.length,
      missingKeywordsCount: analysis.missingKeywords.length,
      missingAlerts: analysis.missingInformationAlerts.map((a) => `${a.field} (${a.importance})`),
      topSuggestionsCount: analysis.topSuggestions.length,
      topSuggestions: analysis.topSuggestions.map((s) => `[${s.priority}] ${s.section}: ${s.whatNeedsImprovement}`),
      isDeterministic,
      expectedOutcome: tc.expectedOutcome,
    });
  }

  // Print results summary
  console.log('ID | Profile Title | Overall | Keyword | Format | Content | Section | Consistency | Deterministic');
  console.log('---|---------------|---------|---------|--------|---------|---------|-------------|--------------');
  for (const r of results) {
    console.log(
      `${r.id}  | ${r.title.slice(0, 32).padEnd(32)} | ${String(r.scores.overall).padStart(7)} | ${String(r.scores.keyword).padStart(7)} | ${String(r.scores.formatting).padStart(6)} | ${String(r.scores.content).padStart(7)} | ${String(r.scores.section).padStart(7)} | ${String(r.evidenceConsistency.consistencyScore + '%').padStart(11)} | ${r.isDeterministic ? '✅ YES' : '❌ NO'}`
    );
  }

  // Save audit data to artifact scratch
  const outputPath = path.join(process.cwd(), 'scripts', 'audit_results_dump.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nAudit results dumped to: ${outputPath}`);
}

executeAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

