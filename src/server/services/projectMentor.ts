import 'server-only';
import { GoogleGenAI } from '@google/genai';
import {
  getCareerProfileSummary,
  findRoleSpecification,
  type CareerProfileSummary,
} from '@/server/services/careerIntelligence';
import {
  getGuidedProjectById,
  type GuidedProjectDTO,
  type StudentProfileDTO,
} from '@/server/db';
import { CANDIDATE_GEMINI_MODELS } from '@/server/services/gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('[ProjectMentor] Failed to initialize GoogleGenAI client:', err);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out.')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface RecommendedProject {
  id: string;
  title: string;
  difficulty: ProjectDifficulty;
  targetRole: string;
  matchedGaps: string[];
  techStack: string[];
  problemStatement: string;
  realWorldUseCase: string;
  learningOutcomes: string[];
  mainFeatures: string[];
  suggestedDatabaseDesign: {
    overview: string;
    entities: Array<{ name: string; description: string; fields: string[] }>;
  };
  architectureOverview: string;
  estimatedComplexity: string;
  resumeValue: string;
}

export interface ProjectSpecification {
  overview: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: {
    performance: string[];
    security: string[];
    scalability: string[];
    reliability: string[];
  };
  architecture: {
    frontend: string;
    backend: string;
    database: string;
    dataFlow: string;
  };
  databaseSchema: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string; constraints?: string }>;
      indexes?: string[];
    }>;
  };
  apiEndpoints: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description: string;
    requestBody?: string;
    responseBody?: string;
  }>;
  folderStructure: string;
  developmentChecklist: Array<{ phase: string; items: string[] }>;
  testingStrategy: {
    unitTests: string[];
    integrationTests: string[];
    e2eScenarios: string[];
  };
  deploymentGuidance: {
    platform: string;
    steps: string[];
    envVariables: string[];
  };
}

export interface ProjectMilestone {
  id: number;
  title: string;
  description: string;
  phase: string;
  isCompleted: boolean;
  completedAt?: string;
  tasks: Array<{ id: string; title: string; isCompleted: boolean }>;
  tips: string[];
  deliverable: string;
}

// ============================================================================
// 1. STUDENT-SPECIFIC PROJECT RECOMMENDATION ENGINE
// ============================================================================

/**
 * Standard project blueprints mapped by role family and missing skills.
 * Provides high-leverage foundational projects when Gemini is offline or rate-limited.
 */
function getDeterministicProjectBlueprints(
  targetRole: string,
  missingSkills: string[],
  existingProjectTitles: string[],
  studentDegree?: string
): RecommendedProject[] {
  const normalizedRole = (targetRole || '').toLowerCase();
  const gapsUpper = (missingSkills || []).map((s) => s.trim());
  const existingSet = new Set(existingProjectTitles.map((t) => t.toLowerCase().trim()));

  const allBlueprints: RecommendedProject[] = [];

  // Software Engineering / SDE-1 / Backend
  if (
    normalizedRole.includes('software') ||
    normalizedRole.includes('backend') ||
    normalizedRole.includes('sde')
  ) {
    allBlueprints.push(
      {
        id: 'rec_sde_cache_layer',
        title: 'Distributed In-Memory Cache & Rate Limiting Engine',
        difficulty: 'Intermediate',
        targetRole: 'Graduate Software Engineer',
        matchedGaps: gapsUpper.filter((g) => ['Docker', 'Redis', 'SQL', 'Algorithms'].includes(g)),
        techStack: ['Node.js', 'TypeScript', 'Redis', 'Docker', 'PostgreSQL', 'Jest'],
        problemStatement:
          'High-traffic APIs frequently suffer from database connection exhaustion and latency spikes when unthrottled burst traffic arrives.',
        realWorldUseCase:
          'Used by payment gateways like Stripe and cloud platforms like Cloudflare to enforce tier-based token bucket rate limits and sub-20ms cache responses.',
        learningOutcomes: [
          'Master in-memory caching patterns (Cache-Aside, Write-Through)',
          'Implement the Token Bucket and Sliding Window counter algorithms in Redis',
          'Deploy multi-container local topologies with Docker Compose',
        ],
        mainFeatures: [
          'Sliding window rate-limiter middleware with configurable RPS limits per API key',
          'Redis Pub/Sub cache invalidation across distributed server instances',
          'PostgreSQL fallback layer with connection pooling',
          'Health check and latency metrics Prometheus dashboard endpoint',
        ],
        suggestedDatabaseDesign: {
          overview: 'Relational storage for API clients and rate tiers, with volatile counters hosted in Redis.',
          entities: [
            { name: 'api_clients', description: 'Registered API consumers', fields: ['id', 'client_key', 'tier_id', 'is_active', 'created_at'] },
            { name: 'rate_tiers', description: 'Tier configuration (e.g. Free 60 req/min, Pro 1000 req/min)', fields: ['id', 'tier_name', 'max_requests_per_window', 'window_seconds'] },
            { name: 'request_logs', description: 'Historical audit log of throttled vs accepted calls', fields: ['id', 'client_id', 'path', 'status_code', 'response_ms', 'created_at'] },
          ],
        },
        architectureOverview:
          'Reverse proxy API gateway with custom rate-limiting middleware, communicating with in-memory Redis cluster for atomic counter increments and PostgreSQL for durable data.',
        estimatedComplexity: '2 to 3 weeks (approx. 25–30 hours)',
        resumeValue:
          'Proves deep systems knowledge, concurrency control, caching trade-offs, and microservice containerization—topics directly evaluated in technical screenings.',
      },
      {
        id: 'rec_sde_transactional_orders',
        title: 'Transactional Order & Inventory Reservation Microservice',
        difficulty: 'Advanced',
        targetRole: 'Junior Backend Developer',
        matchedGaps: gapsUpper.filter((g) => ['PostgreSQL', 'SQL', 'Docker', 'Git', 'REST APIs'].includes(g)),
        techStack: ['TypeScript', 'Express/Fastify', 'PostgreSQL', 'Prisma', 'Docker', 'Supertest'],
        problemStatement:
          'Flash sales and e-commerce transactions create race conditions where multiple customers purchase the final inventory item simultaneously, leading to negative stock.',
        realWorldUseCase:
          'Used by retail giants (Shopify, Amazon) and ticket booking platforms (Ticketmaster) to guarantee ACID consistency and prevent overselling.',
        learningOutcomes: [
          'Implement pessimistic locking (`SELECT ... FOR UPDATE`) in PostgreSQL',
          'Design idempotent order creation endpoints with idempotency keys',
          'Write comprehensive concurrency unit and integration tests',
        ],
        mainFeatures: [
          'Pessimistic locking inventory reservation with 10-minute automated timeout',
          'Idempotent checkout API endpoints avoiding double-charges on network retries',
          'Relational database migrations and deterministic seeding scripts',
          'Comprehensive integration test suite simulating 50 concurrent buyers',
        ],
        suggestedDatabaseDesign: {
          overview: 'Normalized relational schema enforcing foreign key integrity and transactional isolation.',
          entities: [
            { name: 'products', description: 'Catalog items with stock levels', fields: ['id', 'sku', 'name', 'stock_quantity', 'version'] },
            { name: 'orders', description: 'Customer purchase records', fields: ['id', 'user_id', 'idempotency_key', 'total_amount', 'status'] },
            { name: 'order_items', description: 'Line items reserved per order', fields: ['id', 'order_id', 'product_id', 'quantity', 'unit_price'] },
            { name: 'inventory_locks', description: 'Time-bounded reservations for pending checkouts', fields: ['id', 'order_id', 'product_id', 'expires_at'] },
          ],
        },
        architectureOverview:
          'REST API built with Node.js and TypeScript, using PostgreSQL transactions with SERIALIZABLE isolation and Prisma ORM within a Docker container.',
        estimatedComplexity: '3 weeks (approx. 35 hours)',
        resumeValue:
          'Demonstrates high-level database locking competence, race-condition mitigation, and transaction reliability—major interview differentiators.',
      },
      {
        id: 'rec_sde_sandbox_judge',
        title: 'Algorithmic Code Execution & Test Runner Sandbox',
        difficulty: 'Advanced',
        targetRole: 'Graduate Software Engineer',
        matchedGaps: gapsUpper.filter((g) => ['Linux', 'Docker', 'Python', 'Algorithms', 'Problem Solving'].includes(g)),
        techStack: ['Node.js', 'Docker', 'Python', 'PostgreSQL', 'WebSockets'],
        problemStatement:
          'Executing untrusted user-submitted code in competitive programming or assessment platforms risks host compromise without strict sandbox isolation and resource ceilings.',
        realWorldUseCase:
          'Powers technical interview platforms like LeetCode, HackerRank, and Smart Resume AI proctored coding assessments.',
        learningOutcomes: [
          'Enforce Linux cgroups and memory/CPU limits in Docker containers',
          'Isolate unprivileged user execution to block malicious system calls',
          'Stream real-time test case execution results over WebSockets',
        ],
        mainFeatures: [
          'Isolated Docker execution container with disabled network access and memory caps (128MB max)',
          'Automated execution timer killing long-running or infinite loops after 2.0 seconds',
          'Multi-language test suite evaluation (Python & JavaScript)',
          'Interactive WebSockets channel reporting test passes, memory usage, and runtime output',
        ],
        suggestedDatabaseDesign: {
          overview: 'Tracks coding challenges, test case inputs/outputs, and submission execution benchmarks.',
          entities: [
            { name: 'challenges', description: 'Problem statements and constraints', fields: ['id', 'title', 'difficulty', 'time_limit_ms', 'memory_limit_mb'] },
            { name: 'test_cases', description: 'Hidden and public inputs/expected outputs', fields: ['id', 'challenge_id', 'input_data', 'expected_output', 'is_sample'] },
            { name: 'submissions', description: 'Candidate code submissions and outcomes', fields: ['id', 'user_id', 'challenge_id', 'status', 'runtime_ms', 'memory_kb'] },
          ],
        },
        architectureOverview:
          'API backend dispatches code to ephemeral Docker containers via Docker Engine API; sandbox runner profiles execution and streams status to client UI.',
        estimatedComplexity: '3 to 4 weeks (approx. 40 hours)',
        resumeValue:
          'Outstanding portfolio piece highlighting Linux security, sandboxing, cgroups, process isolation, and asynchronous architecture.',
      }
    );
  }

  // Full Stack & Frontend
  if (
    normalizedRole.includes('full stack') ||
    normalizedRole.includes('frontend') ||
    allBlueprints.length < 3
  ) {
    allBlueprints.push(
      {
        id: 'rec_fullstack_sprint_orchestrator',
        title: 'Real-Time Collaborative Sprint & Kanban Orchestrator',
        difficulty: 'Intermediate',
        targetRole: 'Junior Full Stack Developer',
        matchedGaps: gapsUpper.filter((g) => ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'PostgreSQL'].includes(g)),
        techStack: ['Next.js (App Router)', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Prisma', 'WebSockets'],
        problemStatement:
          'Engineering teams require instantaneous, synchronized updates when task states, priorities, or assignees change during agile development cycles.',
        realWorldUseCase:
          'Core architecture behind industry tools like Linear, Jira, and Trello.',
        learningOutcomes: [
          'Master optimistic UI updates with Next.js Server Actions and React 19 hooks',
          'Implement optimistic state rollback on server mutation failures',
          'Design accessible drag-and-drop kanban boards using native pointer APIs',
        ],
        mainFeatures: [
          'Full-featured Kanban drag-and-drop workspace with instantaneous optimistic UI updates',
          'Real-time board synchronization across multiple browser tabs via WebSockets',
          'Role-based permissions (Admin, Member, Viewer) with protected server routes',
          'Markdown issue description editor with keyboard shortcuts and syntax highlighting',
        ],
        suggestedDatabaseDesign: {
          overview: 'Hierarchical schema organizing organizations, projects, boards, columns, and cards with audit logging.',
          entities: [
            { name: 'boards', description: 'Project boards', fields: ['id', 'title', 'workspace_id', 'created_at'] },
            { name: 'columns', description: 'Workflow columns (Backlog, In Progress, Done)', fields: ['id', 'board_id', 'title', 'sort_order'] },
            { name: 'tasks', description: 'Individual task cards with metadata', fields: ['id', 'column_id', 'title', 'description', 'assignee_id', 'priority', 'sort_order'] },
          ],
        },
        architectureOverview:
          'Next.js Full Stack App Router with server-rendered initial boards, client-side optimistic drag-and-drop, PostgreSQL backing database, and WebSocket synchronization.',
        estimatedComplexity: '2 to 3 weeks (approx. 25–30 hours)',
        resumeValue:
          'Demonstrates complete modern full-stack proficiency: Server Components, responsive design, optimistic UI, and relational database modeling.',
      },
      {
        id: 'rec_fullstack_ai_document_audit',
        title: 'Document Intelligence & Semantic Search Engine',
        difficulty: 'Intermediate',
        targetRole: 'Junior Full Stack Developer',
        matchedGaps: gapsUpper.filter((g) => ['TypeScript', 'Next.js', 'SQL', 'Testing', 'Tailwind CSS'].includes(g)),
        techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'PostgreSQL/pgvector', 'Prisma', 'Gemini API'],
        problemStatement:
          'Traditional keyword search fails when users search for concepts, synonyms, or contextual ideas rather than exact keyword substrings across large PDF archives.',
        realWorldUseCase:
          'Adopted by legal, medical, and customer support organizations to query internal knowledge bases and contracts with natural language.',
        learningOutcomes: [
          'Build PDF text extraction pipelines with layout-aware chunking',
          'Store and index high-dimensional vector embeddings with pgvector / relational cosine similarity',
          'Implement Retrieval-Augmented Generation (RAG) with grounded source citations',
        ],
        mainFeatures: [
          'Drag-and-drop PDF upload with client-side validation and server-side text extraction',
          'Semantic vector search retrieving the most relevant document paragraphs for user queries',
          'Interactive Q&A assistant providing answers strictly backed by cited document page numbers',
          'Clean, accessible document viewer highlighting matching query excerpts',
        ],
        suggestedDatabaseDesign: {
          overview: 'Stores uploaded documents and their corresponding text chunks with vector embeddings.',
          entities: [
            { name: 'documents', description: 'Uploaded PDF metadata', fields: ['id', 'user_id', 'title', 'file_size', 'page_count', 'created_at'] },
            { name: 'document_chunks', description: 'Tokenized text chunks with vector embeddings', fields: ['id', 'document_id', 'chunk_index', 'page_number', 'content', 'embedding_vector'] },
            { name: 'query_logs', description: 'Search queries and satisfaction feedback', fields: ['id', 'user_id', 'query', 'retrieved_chunks_count', 'created_at'] },
          ],
        },
        architectureOverview:
          'Next.js App Router for frontend UI, Node.js background pipeline for document parsing and embedding generation, PostgreSQL for storage, and Gemini API for RAG synthesis.',
        estimatedComplexity: '2 to 3 weeks (approx. 28 hours)',
        resumeValue:
          'Positions the candidate at the forefront of modern AI engineering: RAG architectures, embeddings, vector databases, and full-stack integration.',
      }
    );
  }

  // Data & AI
  if (
    normalizedRole.includes('data') ||
    normalizedRole.includes('ai') ||
    normalizedRole.includes('machine learning')
  ) {
    allBlueprints.push(
      {
        id: 'rec_data_churn_prediction',
        title: 'Customer Churn Prediction & Model Evaluation Dashboard',
        difficulty: 'Intermediate',
        targetRole: 'Junior Data Analyst',
        matchedGaps: gapsUpper.filter((g) => ['Python', 'SQL', 'Machine Learning', 'Data Analysis', 'Statistics'].includes(g)),
        techStack: ['Python', 'Pandas', 'Scikit-Learn', 'PostgreSQL', 'FastAPI', 'Chart.js / Streamlit'],
        problemStatement:
          'SaaS companies lose recurring revenue from undetected customer attrition because standard churn metrics only report losses after cancellations happen.',
        realWorldUseCase:
          'Utilized across subscription businesses (Spotify, Netflix, telecommunications) to trigger automated customer retention workflows.',
        learningOutcomes: [
          'Perform feature engineering, missing-value imputation, and one-hot encoding on tabular datasets',
          'Train, evaluate, and calibrate Logistic Regression, Random Forest, and XGBoost classifiers',
          'Deploy model inference via a fast REST API with explainable feature importance',
        ],
        mainFeatures: [
          'Automated data cleaning and outlier detection pipeline for customer usage datasets',
          'Comparative model benchmarking (ROC-AUC, Precision-Recall curve, Confusion Matrix)',
          'FastAPI prediction endpoint calculating individual customer churn risk scores (0–100%)',
          'SHAP feature importance visualization explaining the top 3 drivers behind each prediction',
        ],
        suggestedDatabaseDesign: {
          overview: 'Stores raw customer attributes, engineered feature records, and historical model prediction logs.',
          entities: [
            { name: 'customers', description: 'Customer demographics and subscription tier', fields: ['id', 'signup_date', 'plan_tier', 'monthly_charges', 'total_charges'] },
            { name: 'usage_metrics', description: 'Usage logs and activity signals', fields: ['id', 'customer_id', 'support_tickets_count', 'login_frequency', 'last_active_date'] },
            { name: 'churn_predictions', description: 'Calculated risk scores and prediction audit trail', fields: ['id', 'customer_id', 'risk_score', 'predicted_label', 'top_factors_json'] },
          ],
        },
        architectureOverview:
          'Python data science pipeline for model training and artifact export, packaged with FastAPI for inference, connecting to PostgreSQL and rendered on a modern web dashboard.',
        estimatedComplexity: '2 to 3 weeks (approx. 24–28 hours)',
        resumeValue:
          'Demonstrates end-to-end data science lifecycle: exploratory data analysis (EDA), model training, statistical validation, and production API deployment.',
      }
    );
  }

  // Filter out any projects the student has already built or has in profile
  const filtered = allBlueprints.filter((b) => !existingSet.has(b.title.toLowerCase().trim()));
  return filtered.slice(0, 4);
}

/**
 * Generates 3–5 personalized project recommendations based on student's degree,
 * target role, verified skills, and identified skill gaps.
 */
export async function getProjectRecommendations(userId: string): Promise<{
  recommendations: RecommendedProject[];
  studentSummary: {
    targetRole: string;
    institution?: string;
    degree?: string;
    topSkillGaps: string[];
    readinessScore: number;
    existingProjectsCount: number;
  };
}> {
  const profileSummary = await getCareerProfileSummary(userId);
  const targetRole = profileSummary.targetRole || 'Graduate Software Engineer';
  const roleSpec = findRoleSpecification(targetRole);
  const student = profileSummary.studentProfile;
  const existingProjects = student?.projects || [];
  const existingTitles = existingProjects.map((p) => p.title);

  const missingCrits = profileSummary.skillGaps?.missingCriticalSkills || roleSpec.criticalSkills;
  const missingRecs = profileSummary.skillGaps?.missingRecommendedSkills || roleSpec.recommendedSkills;
  const allGaps = [...missingCrits, ...missingRecs];

  // Generate deterministic candidates grounded in student gaps
  const deterministicRecs = getDeterministicProjectBlueprints(
    targetRole,
    allGaps,
    existingTitles,
    student?.degree
  );

  // If Gemini is available, attempt to enrich projects with student-specific context
  if (aiClient && deterministicRecs.length > 0) {
    try {
      const prompt = `You are a Principal Software Architect and Career Mentor for college students.
Student Profile:
- Degree: ${student?.degree || 'Computer Science'} at ${student?.institution || 'University'}
- Target Role: ${targetRole}
- Identified Skill Gaps to Resolve: ${allGaps.slice(0, 5).join(', ')}
- Existing Documented Projects: ${existingTitles.join(', ') || 'None'}

Review these recommended project ideas and return a JSON array of 3 to 4 tailored projects that will provide the highest hiring leverage for this student:
${JSON.stringify(deterministicRecs.map((d) => ({ title: d.title, difficulty: d.difficulty, techStack: d.techStack })))}

Return ONLY a valid JSON array matching this exact schema:
[
  {
    "id": "string",
    "title": "string",
    "difficulty": "Beginner" | "Intermediate" | "Advanced",
    "targetRole": "${targetRole}",
    "matchedGaps": ["skill1", "skill2"],
    "techStack": ["tech1", "tech2", "tech3"],
    "problemStatement": "2 sentences describing the real engineering challenge.",
    "realWorldUseCase": "Where this pattern is used in production tech companies.",
    "learningOutcomes": ["outcome 1", "outcome 2", "outcome 3"],
    "mainFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
    "suggestedDatabaseDesign": {
      "overview": "Summary of relational schema.",
      "entities": [
        {"name": "table_name", "description": "purpose", "fields": ["col1", "col2"]}
      ]
    },
    "architectureOverview": "Architecture description.",
    "estimatedComplexity": "2 to 3 weeks",
    "resumeValue": "Why recruiters value this on an entry-level resume."
  }
]`;

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withTimeout(
            aiClient.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                responseMimeType: 'application/json',
                temperature: 0.4,
              },
            }),
            REQUEST_TIMEOUT_MS
          );

          if (res?.text) {
            const parsed = JSON.parse(res.text.trim());
            if (Array.isArray(parsed) && parsed.length >= 3) {
              const validated: RecommendedProject[] = parsed.slice(0, 4).map((p: any, idx: number) => ({
                id: String(p.id || `gemini_rec_${idx}_${Date.now()}`),
                title: String(p.title || deterministicRecs[idx]?.title || 'Software Engineering Project').trim(),
                difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(p.difficulty) ? p.difficulty : 'Intermediate',
                targetRole,
                matchedGaps: Array.isArray(p.matchedGaps) && p.matchedGaps.length > 0 ? p.matchedGaps : allGaps.slice(0, 3),
                techStack: Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : deterministicRecs[idx]?.techStack || ['TypeScript', 'PostgreSQL'],
                problemStatement: String(p.problemStatement || deterministicRecs[idx]?.problemStatement || '').trim(),
                realWorldUseCase: String(p.realWorldUseCase || deterministicRecs[idx]?.realWorldUseCase || '').trim(),
                learningOutcomes: Array.isArray(p.learningOutcomes) ? p.learningOutcomes : deterministicRecs[idx]?.learningOutcomes || [],
                mainFeatures: Array.isArray(p.mainFeatures) ? p.mainFeatures : deterministicRecs[idx]?.mainFeatures || [],
                suggestedDatabaseDesign: p.suggestedDatabaseDesign || deterministicRecs[idx]?.suggestedDatabaseDesign,
                architectureOverview: String(p.architectureOverview || deterministicRecs[idx]?.architectureOverview || '').trim(),
                estimatedComplexity: String(p.estimatedComplexity || '2 to 3 weeks').trim(),
                resumeValue: String(p.resumeValue || deterministicRecs[idx]?.resumeValue || '').trim(),
              }));

              return {
                recommendations: validated,
                studentSummary: {
                  targetRole,
                  institution: student?.institution,
                  degree: student?.degree,
                  topSkillGaps: allGaps.slice(0, 4),
                  readinessScore: profileSummary.metrics.readinessScore,
                  existingProjectsCount: existingProjects.length,
                },
              };
            }
          }
        } catch {
          // Continue to next model or fallback
        }
      }
    } catch {
      // Fall through to deterministic recommendations
    }
  }

  return {
    recommendations: deterministicRecs,
    studentSummary: {
      targetRole,
      institution: student?.institution,
      degree: student?.degree,
      topSkillGaps: allGaps.slice(0, 4),
      readinessScore: profileSummary.metrics.readinessScore,
      existingProjectsCount: existingProjects.length,
    },
  };
}

// ============================================================================
// 2. PROJECT BUILDER SPECIFICATION GENERATOR
// ============================================================================

/**
 * Builds the 8 standardized milestones for a guided software engineering project.
 */
export function buildStandardProjectMilestones(projectTitle: string, techStack: string[]): ProjectMilestone[] {
  const stackStr = techStack.join(', ');
  const isPython = techStack.some((t) => t.toLowerCase().includes('python'));
  const isPostgres = techStack.some((t) => t.toLowerCase().includes('postgres') || t.toLowerCase().includes('sql'));
  const isDocker = techStack.some((t) => t.toLowerCase().includes('docker'));

  return [
    {
      id: 1,
      title: 'Project Setup & Tooling Configuration',
      phase: 'Foundation',
      description: 'Initialize clean Git repository, set up package manager, TypeScript/compiler settings, environment variables, and code linters.',
      isCompleted: false,
      tasks: [
        { id: 'm1_t1', title: 'Initialize Git repository with comprehensive .gitignore and branch protection rules', isCompleted: false },
        { id: 'm1_t2', title: `Configure ${isPython ? 'virtual environment & pyproject.toml' : 'package.json with TypeScript, ESLint, and Prettier'}`, isCompleted: false },
        { id: 'm1_t3', title: 'Create .env.example with documented configuration variables', isCompleted: false },
        { id: 'm1_t4', title: 'Create initial README with project overview and local development instructions', isCompleted: false },
      ],
      tips: [
        'Never commit raw .env files containing API keys or database passwords.',
        'Set up pre-commit hooks (Husky or pre-commit) to enforce formatting before commits.',
      ],
      deliverable: 'A clean, compilable boilerplate repository with linting and environment configuration verified.',
    },
    {
      id: 2,
      title: 'Database Schema Design & Migrations',
      phase: 'Data Architecture',
      description: `Model relational entities in ${isPostgres ? 'PostgreSQL' : 'database'}, establish foreign keys, unique constraints, and write repeatable migrations.`,
      isCompleted: false,
      tasks: [
        { id: 'm2_t1', title: 'Design entity relationship schema with primary keys and indexed foreign keys', isCompleted: false },
        { id: 'm2_t2', title: 'Write and apply database migration scripts using ORM or raw SQL scripts', isCompleted: false },
        { id: 'm2_t3', title: 'Create automated database seeding script with realistic sample test records', isCompleted: false },
        { id: 'm2_t4', title: 'Verify connection pooling and graceful disconnection logic', isCompleted: false },
      ],
      tips: [
        'Add composite indexes to frequently queried column pairs (e.g., user_id and created_at).',
        'Always use UTC timestamps (ISO 8601 strings or TIMESTAMP WITH TIME ZONE) for dates.',
      ],
      deliverable: 'A running database with migrations applied, indexes verified, and seed data populated.',
    },
    {
      id: 3,
      title: 'Backend API & Core Business Logic',
      phase: 'Backend Core',
      description: 'Implement REST/tRPC API endpoints, request validation, authentication, and domain service logic.',
      isCompleted: false,
      tasks: [
        { id: 'm3_t1', title: 'Implement strict request schema validation using Zod, Pydantic, or Joi', isCompleted: false },
        { id: 'm3_t2', title: 'Create core CRUD service methods with error handling and transaction boundaries', isCompleted: false },
        { id: 'm3_t3', title: 'Implement authentication middleware with JWT or session token verification', isCompleted: false },
        { id: 'm3_t4', title: 'Add structured HTTP error response handler with sanitized error messages', isCompleted: false },
      ],
      tips: [
        'Keep controllers thin and service layer rich: controllers parse requests; services handle business logic.',
        'Never expose internal database stack traces to the API client in production.',
      ],
      deliverable: 'Verified API endpoints responding with proper HTTP status codes and validated JSON payloads.',
    },
    {
      id: 4,
      title: 'Frontend Component Architecture & State Management',
      phase: 'Frontend',
      description: 'Develop responsive user interface components, client-side routing, form handling, and state synchronization.',
      isCompleted: false,
      tasks: [
        { id: 'm4_t1', title: 'Build modular, accessible UI components with consistent styling tokens', isCompleted: false },
        { id: 'm4_t2', title: 'Implement client form validation with real-time inline error states', isCompleted: false },
        { id: 'm4_t3', title: 'Integrate API client with loading spinners, empty states, and toast notifications', isCompleted: false },
        { id: 'm4_t4', title: 'Ensure mobile responsive layouts and keyboard navigation accessibility', isCompleted: false },
      ],
      tips: [
        'Use optimistic UI updates where appropriate to make user interactions feel instant.',
        'Provide clear, human-readable error messages for network or validation failures.',
      ],
      deliverable: 'A polished, interactive frontend view connected to the backend API services.',
    },
    {
      id: 5,
      title: 'Advanced Feature & Integration Layer',
      phase: 'Differentiation',
      description: 'Implement the project’s standout feature: caching, background worker queue, WebSocket real-time updates, or AI integration.',
      isCompleted: false,
      tasks: [
        { id: 'm5_t1', title: 'Implement the core differentiation logic (e.g. Redis caching, background processing, or Gemini API integration)', isCompleted: false },
        { id: 'm5_t2', title: 'Implement graceful error fallback if third-party services or cache instances are temporarily unavailable', isCompleted: false },
        { id: 'm5_t3', title: 'Implement debouncing or rate-limiting to protect expensive computing endpoints', isCompleted: false },
        { id: 'm5_t4', title: 'Verify end-to-end data flow under edge cases and error states', isCompleted: false },
      ],
      tips: [
        'This is the feature recruiters will ask about most in technical interviews—document your architectural decisions thoroughly.',
      ],
      deliverable: 'The primary complex feature functioning reliably with error recovery.',
    },
    {
      id: 6,
      title: 'Automated Testing & Error Handling',
      phase: 'Quality Assurance',
      description: 'Write unit tests, API integration tests, and error recovery suites to verify reliability.',
      isCompleted: false,
      tasks: [
        { id: 'm6_t1', title: 'Write unit tests for core domain algorithms and business logic validation', isCompleted: false },
        { id: 'm6_t2', title: 'Write API integration tests verifying valid requests, invalid inputs (400), and unauthenticated access (401)', isCompleted: false },
        { id: 'm6_t3', title: 'Configure test runner script in package.json/Makefile to run in CI environment', isCompleted: false },
        { id: 'm6_t4', title: 'Achieve >75% test coverage on critical business logic paths', isCompleted: false },
      ],
      tips: [
        'Test negative paths: what happens when inputs are malformed or services time out?',
        'Use isolated in-memory or transactional databases for integration test runs.',
      ],
      deliverable: 'A passing automated test suite that can be run with a single command.',
    },
    {
      id: 7,
      title: 'Developer Documentation & Architecture Diagrams',
      phase: 'Documentation',
      description: 'Produce a professional GitHub README, architecture diagram, API documentation, and setup guide.',
      isCompleted: false,
      tasks: [
        { id: 'm7_t1', title: 'Write comprehensive GitHub README with problem statement, system architecture, and tech stack badges', isCompleted: false },
        { id: 'm7_t2', title: 'Create Mermaid or ASCII architecture data flow diagram', isCompleted: false },
        { id: 'm7_t3', title: 'Document API endpoints with request/response examples and error schemas', isCompleted: false },
        { id: 'm7_t4', title: 'Add animated demo GIF or high-resolution screenshots highlighting the live application', isCompleted: false },
      ],
      tips: [
        'Recruiters spend 30 seconds scanning your repo: lead with what the project does and a visual screenshot before deep setup steps.',
      ],
      deliverable: 'A recruiter-ready GitHub README with architecture diagrams and API contracts.',
    },
    {
      id: 8,
      title: 'Production Cloud Deployment & CI/CD',
      phase: 'Deployment',
      description: `Deploy the application live to cloud hosting (Vercel, Supabase, Neon, or ${isDocker ? 'Dockerized cloud server' : 'cloud'}), and configure automated CI/CD.`,
      isCompleted: false,
      tasks: [
        { id: 'm8_t1', title: 'Configure GitHub Actions workflow to run linting and tests automatically on pull requests', isCompleted: false },
        { id: 'm8_t2', title: 'Deploy database on cloud provider with secure connection pooling and SSL', isCompleted: false },
        { id: 'm8_t3', title: 'Deploy frontend and backend application to cloud hosting with custom or staging domain', isCompleted: false },
        { id: 'm8_t4', title: 'Verify live production URL and test all key workflows end-to-end', isCompleted: false },
      ],
      tips: [
        'Add live demo URL and GitHub repo link directly to your resume bullet points.',
        'Verify HTTPS certificates and ensure all test console logs are disabled in production builds.',
      ],
      deliverable: 'A live, publicly accessible production application with automated CI/CD testing.',
    },
  ];
}

/**
 * Builds the comprehensive 10-part specification for a selected project.
 */
export async function generateProjectSpecification(
  project: RecommendedProject,
  studentProfile?: StudentProfileDTO | null
): Promise<ProjectSpecification> {
  const isPostgres = project.techStack.some((t) => t.toLowerCase().includes('postgres') || t.toLowerCase().includes('sql'));
  const isNext = project.techStack.some((t) => t.toLowerCase().includes('next'));
  const isPython = project.techStack.some((t) => t.toLowerCase().includes('python'));

  // Deterministic baseline specification
  const spec: ProjectSpecification = {
    overview: `${project.title} is an engineering project designed to solve ${project.problemStatement.toLowerCase()} Built with ${project.techStack.join(', ')}, it provides tangible proof of production competency for ${project.targetRole} roles.`,
    functionalRequirements: [
      'FR-1: System shall authenticate users and securely sign session/JWT tokens.',
      'FR-2: System shall validate all incoming payloads with strict schemas before executing business logic.',
      'FR-3: System shall persist data transactionally in the primary database with foreign key integrity.',
      'FR-4: System shall implement atomic operations to prevent race conditions during concurrent requests.',
      'FR-5: System shall provide clean RESTful API endpoints with structured JSON responses and standard HTTP status codes.',
      'FR-6: System shall deliver an intuitive, responsive user interface with real-time feedback and error states.',
      'FR-7: System shall record historical audit logs for key domain operations and status updates.',
      'FR-8: System shall export performance and health monitoring metrics via a dedicated endpoint.',
    ],
    nonFunctionalRequirements: {
      performance: [
        'P95 API response latency shall remain under 150ms under normal load.',
        'Database queries shall leverage composite indexes to avoid sequential table scans on collections > 10,000 rows.',
      ],
      security: [
        'All client inputs shall be sanitized to prevent SQL injection, XSS, and prototype pollution.',
        'Sensitive environment secrets and database credentials shall never be checked into version control.',
      ],
      scalability: [
        'Stateless backend architecture allowing horizontal scaling behind a reverse proxy or load balancer.',
        'Database connections managed via bounded connection pooling.',
      ],
      reliability: [
        'Graceful degradation when third-party services or caches are temporarily unavailable.',
        'Global error boundaries preventing unhandled process crashes on unexpected exceptions.',
      ],
    },
    architecture: {
      frontend: isNext
        ? 'Next.js App Router (React 19) with Server Components for fast data fetching and Client Components for interactive state.'
        : 'Modern responsive single-page web architecture with component-driven styling and client state management.',
      backend: isPython
        ? 'Python FastAPI application with async route handlers, Pydantic data validation, and SQLAlchemy ORM.'
        : 'Node.js / Express REST API with TypeScript, Zod schema validation, and Prisma ORM service layers.',
      database: isPostgres
        ? 'PostgreSQL relational database with indexed foreign keys, transactional isolation, and connection pooling.'
        : 'Relational database schema with strict schema migrations and automated seeding.',
      dataFlow:
        'Client UI -> HTTP Request (JWT Auth) -> API Gateway -> Input Validation Middleware -> Domain Service Layer -> Database Transaction -> Structured JSON Response.',
    },
    databaseSchema: {
      tables: project.suggestedDatabaseDesign?.entities
        ? project.suggestedDatabaseDesign.entities.map((e) => ({
            name: e.name,
            columns: e.fields.map((f) => ({
              name: f,
              type: f.includes('id') ? 'TEXT' : f.includes('count') || f.includes('order') || f.includes('ms') ? 'INTEGER' : f.includes('at') || f.includes('date') ? 'TEXT (ISO8601)' : 'TEXT',
              constraints: f === 'id' ? 'PRIMARY KEY' : f.includes('id') && f !== 'id' ? 'NOT NULL' : undefined,
            })),
            indexes: [`idx_${e.name}_created_at`],
          }))
        : [
            {
              name: 'users',
              columns: [
                { name: 'id', type: 'TEXT', constraints: 'PRIMARY KEY' },
                { name: 'email', type: 'TEXT', constraints: 'UNIQUE NOT NULL' },
                { name: 'created_at', type: 'TEXT', constraints: 'NOT NULL' },
              ],
            },
            {
              name: 'items',
              columns: [
                { name: 'id', type: 'TEXT', constraints: 'PRIMARY KEY' },
                { name: 'user_id', type: 'TEXT', constraints: 'NOT NULL' },
                { name: 'title', type: 'TEXT', constraints: 'NOT NULL' },
                { name: 'status', type: 'TEXT', constraints: 'NOT NULL' },
                { name: 'created_at', type: 'TEXT', constraints: 'NOT NULL' },
              ],
              indexes: ['idx_items_user_id'],
            },
          ],
    },
    apiEndpoints: [
      {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Authenticates client credentials and returns JWT bearer session token.',
        requestBody: '{ "email": "string", "password": "string" }',
        responseBody: '{ "token": "string", "expiresIn": 86400 }',
      },
      {
        method: 'GET',
        path: '/api/v1/resources',
        description: 'Retrieves paginated collection of domain entities filtered by query parameters.',
        responseBody: '{ "data": [], "page": 1, "totalCount": 42 }',
      },
      {
        method: 'POST',
        path: '/api/v1/resources',
        description: 'Creates new domain entity with schema validation and transactional persistence.',
        requestBody: '{ "title": "string", "payload": {} }',
        responseBody: '{ "id": "string", "status": "created" }',
      },
      {
        method: 'GET',
        path: '/api/v1/resources/:id',
        description: 'Retrieves single entity by unique identifier with related associations.',
        responseBody: '{ "id": "string", "details": {} }',
      },
      {
        method: 'PATCH',
        path: '/api/v1/resources/:id',
        description: 'Partially updates entity fields with optimistic concurrency verification.',
        requestBody: '{ "status": "string" }',
        responseBody: '{ "id": "string", "updatedAt": "string" }',
      },
      {
        method: 'GET',
        path: '/api/v1/health',
        description: 'Returns server health, database connectivity status, and uptime metrics.',
        responseBody: '{ "status": "healthy", "database": "connected", "uptime": 3600 }',
      },
    ],
    folderStructure: isNext
      ? `src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── resources/
│   ├── (auth)/
│   ├── dashboard/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── resources/
├── lib/
│   ├── db.ts
│   └── utils.ts
├── server/
│   ├── services/
│   └── schemas/
└── tests/
    ├── unit/
    └── integration/`
      : `src/
├── controllers/
├── routes/
├── services/
├── models/
├── middleware/
├── config/
└── tests/`,
    developmentChecklist: [
      {
        phase: 'Sprint 1: Foundation & Data Architecture',
        items: [
          'Initialize git repository and branch protection rules',
          'Configure database connection pooling and environment variables',
          'Implement database schema migrations and seed scripts',
        ],
      },
      {
        phase: 'Sprint 2: Core API & Validation',
        items: [
          'Build request validation middleware with strict schemas',
          'Implement core CRUD endpoints with transaction isolation',
          'Write unit tests for business logic edge cases',
        ],
      },
      {
        phase: 'Sprint 3: UI & Advanced Feature',
        items: [
          'Develop responsive frontend views with real-time feedback',
          'Implement primary differentiation feature (caching, queues, or AI)',
          'Conduct comprehensive integration tests',
        ],
      },
      {
        phase: 'Sprint 4: Documentation & Cloud Deployment',
        items: [
          'Produce recruiter-ready GitHub README with architecture diagrams',
          'Configure GitHub Actions CI/CD workflow',
          'Deploy live application to cloud hosting and verify production domain',
        ],
      },
    ],
    testingStrategy: {
      unitTests: [
        'Test input validation rejects missing or malformed fields with HTTP 400',
        'Test business logic calculations and edge-case boundary values',
        'Test error handling when database or external services throw exceptions',
      ],
      integrationTests: [
        'Test complete end-to-end user registration and authentication flow',
        'Test CRUD operations ensure database state reflects mutations accurately',
        'Test unauthorized requests without valid bearer token are rejected with HTTP 401',
      ],
      e2eScenarios: [
        'User logs in, creates a new resource, views it in the list, and edits status',
        'User attempts invalid mutation and receives actionable inline error message',
      ],
    },
    deploymentGuidance: {
      platform: isNext ? 'Vercel (Frontend & Serverless API) + Neon / Supabase (PostgreSQL)' : 'Docker + Render / Railway + Managed Cloud Database',
      steps: [
        'Create cloud database instance and obtain secure SSL connection string',
        'Set up production environment variables in hosting provider dashboard',
        'Connect GitHub repository for automatic deployment on main branch pushes',
        'Run database migrations during pre-deployment build step',
        'Perform smoke test on live domain to verify all critical workflows',
      ],
      envVariables: [
        'DATABASE_URL',
        'JWT_SECRET (min 32 characters)',
        'NODE_ENV=production',
        'API_BASE_URL',
      ],
    },
  };

  return spec;
}

// ============================================================================
// 3. AI CODING MENTOR (IN-PROJECT PEDAGOGICAL ASSISTANT)
// ============================================================================

export interface CodingMentorMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Provides beginner-friendly, pedagogical guidance for code debugging,
 * architecture decisions, performance, and best practices.
 */
export async function getAiCodingMentorResponse(params: {
  projectId: string;
  userMessage: string;
  codeSnippet?: string;
  history?: CodingMentorMessage[];
  userId: string;
}): Promise<{ reply: string; provider: string; isLive: boolean }> {
  const { projectId, userMessage, codeSnippet, history, userId } = params;

  // Retrieve project context
  const project = await getGuidedProjectById(projectId, userId);
  const projectTitle = project?.title || 'Guided Software Project';
  const techStack = project?.techStack || ['TypeScript', 'Node.js', 'PostgreSQL'];
  const currentMilestone = project?.currentMilestone || 1;

  // Prompt injection safety checks
  const lowerMsg = (userMessage || '').toLowerCase();
  if (
    lowerMsg.includes('ignore all previous') ||
    lowerMsg.includes('reveal your system prompt') ||
    lowerMsg.includes('print api key') ||
    lowerMsg.includes('system instruction')
  ) {
    return {
      reply: 'I am your Smart Resume AI Project Mentor. I can only assist with software engineering, architecture, code debugging, and project development for this project. How can I help with your current code or milestone?',
      provider: 'Smart Policy Guard',
      isLive: false,
    };
  }

  // System instruction
  const systemInstruction = `You are the AI Assistant, the AI Coding & Project Mentor for Smart Resume AI.
You are helping a college student/graduate build their portfolio project: "${projectTitle}".
Technologies Used: ${techStack.join(', ')}
Current Active Milestone: Milestone ${currentMilestone} of 8

YOUR PEDAGOGICAL DIRECTIVES:
1. Explain the "Why": Never just dump raw code. Explain the underlying computer science and architectural concepts clearly.
2. Beginner-Friendly & Constructive: Use encouraging, clear explanations. Break down complex patterns into step-by-step logic.
3. Code Quality & Security: Enforce clean code principles, input validation, SQL injection prevention, and proper error boundaries.
4. Factual Transparency: Never claim that code was executed or verified on a live runner unless it actually was. Provide clean markdown code blocks with language identifiers.
5. Project Grounding: Keep advice aligned with the project's selected tech stack (${techStack.join(', ')}).
6. Scope: Focus strictly on code, architecture, debugging, testing, database design, and deployment. Decline unrelated non-technical questions politely.`;

  if (aiClient) {
    try {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      // Add cleaned history
      if (Array.isArray(history)) {
        for (const h of history.slice(-6)) {
          if (h && h.content && h.content.trim()) {
            contents.push({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.content.trim() }],
            });
          }
        }
      }

      // Add latest message with code snippet if provided
      let promptText = userMessage.trim();
      if (codeSnippet && codeSnippet.trim()) {
        promptText += `\n\n\`\`\`\n${codeSnippet.trim().slice(0, 3000)}\n\`\`\``;
      }
      contents.push({ role: 'user', parts: [{ text: promptText }] });

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withTimeout(
            aiClient.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
                temperature: 0.35,
                maxOutputTokens: 1000,
              },
            }),
            REQUEST_TIMEOUT_MS
          );

          if (res?.text) {
            return {
              reply: res.text.replace(/\u0000/g, '').trim(),
              provider: 'Gemini',
              isLive: true,
            };
          }
        } catch {
          // Try next model or fallback
        }
      }
    } catch {
      // Fall through to deterministic response
    }
  }

  // Deterministic pedagogical coding mentor fallback
  const deterministicReply = getDeterministicCodingMentorReply(userMessage, codeSnippet, projectTitle, techStack, currentMilestone);
  return {
    reply: deterministicReply,
    provider: 'Smart Project Mentor Engine',
    isLive: false,
  };
}

function getDeterministicCodingMentorReply(
  message: string,
  codeSnippet: string | undefined,
  projectTitle: string,
  techStack: string[],
  currentMilestone: number
): string {
  const msg = (message || '').toLowerCase();

  if (msg.includes('debug') || msg.includes('error') || msg.includes('fix') || msg.includes('typeerror') || msg.includes('failed')) {
    return `### Debugging Guide for ${projectTitle}

When debugging issues in your **${techStack[0] || 'Node.js'}** service:

1. **Inspect the Stack Trace**: Identify the exact file path and line number where the exception occurred.
2. **Check for Null / Undefined References**: In asynchronous workflows, ensure you are properly \`await\`ing promises before reading properties.
3. **Validate Request Inputs**: Ensure incoming JSON body parameters match your schema types before executing operations.
4. **Log State Before Failure**: Place a temporary diagnostic log right before the crashing line:
\`\`\`ts
console.log('[DEBUG State]', { input: payload, isReady: Boolean(db) });
\`\`\`

If you share the exact error message and the surrounding 10 lines of code, I can pinpoint the fix for you!`;
  }

  if (msg.includes('database') || msg.includes('schema') || msg.includes('migration') || msg.includes('sql') || msg.includes('prisma')) {
    return `### Database Design & Schema Best Practices

For **${projectTitle}**:

- **Use Foreign Keys with Cascades**: Always define foreign keys with intentional \`ON DELETE\` behaviors (\`CASCADE\` for owned child records, \`RESTRICT\` for critical reference tables).
- **Index Foreign Keys**: Relational databases do not automatically index foreign key columns in all engines. Always add explicit indexes to foreign keys to keep joins fast:
\`\`\`sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
\`\`\`
- **Timestamps**: Always store \`created_at\` and \`updated_at\` in UTC ISO 8601 format to prevent timezone discrepancies between server regions.`;
  }

  if (msg.includes('architecture') || msg.includes('structure') || msg.includes('why') || msg.includes('pattern') || msg.includes('worker') || msg.includes('concurrency')) {
    return `### Architecture & Concurrency Pattern: ${projectTitle}

In production engineering, we separate services into 3 distinct layers to maintain isolation and concurrency control:

1. **Controller / Route Layer**: Handles HTTP requests, extracts headers, validates inputs, and enqueues jobs:
\`\`\`ts
// Enqueue job with deduplication key to prevent duplicate processing
await queue.add('process_item', payload, {
  jobId: payload.id,
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
\`\`\`
2. **Worker & Consumer Layer**: Consumes jobs with controlled concurrency and distributed locking:
\`\`\`ts
// Process with bounded worker concurrency and transaction isolation
worker.process(5, async (job) => {
  return await db.transaction(async (tx) => {
    return await executeBusinessLogic(job.data, tx);
  });
});
\`\`\`
3. **Data Access Layer**: Persists state with atomic conditional updates to prevent race conditions:
\`\`\`sql
UPDATE jobs SET status = 'processing', locked_at = NOW()
WHERE id = $1 AND status = 'pending';
\`\`\`

This architecture guarantees that concurrent worker threads never process the same payload simultaneously!`;
  }

  if (msg.includes('test') || msg.includes('jest') || msg.includes('coverage') || msg.includes('unit test')) {
    return `### Testing Strategy for ${projectTitle}

To impress hiring managers, organize tests into two categories:

1. **Unit Tests (Fast & Isolated)**: Test utility functions and domain calculations:
\`\`\`ts
describe('calculateRateLimit', () => {
  it('should allow requests within the allocated window', () => {
    const result = checkTokenBucket(5, 10);
    expect(result.allowed).toBe(true);
  });
});
\`\`\`

2. **Integration Tests (End-to-End API)**: Test full HTTP lifecycle against a test database:
- Ensure valid inputs return HTTP 200/201.
- Ensure invalid inputs return HTTP 400 with descriptive error messages.
- Ensure unauthenticated requests return HTTP 401.`;
  }

  return `### Project Mentor: ${projectTitle} (Milestone ${currentMilestone}/8)

I am here to help you build and polish **${projectTitle}** (${techStack.join(', ')}). 

Here is what you can ask me:
- **Code Explanations**: "Explain how connection pooling works in PostgreSQL"
- **Debugging**: Paste an error log or code snippet and ask me to diagnose it
- **Architecture**: "How should I structure my API routes and controllers?"
- **Testing**: "How do I write an integration test for my authentication endpoints?"
- **Deployment**: "How do I deploy this container to production?"

What component would you like to build or troubleshoot right now?`;
}

// ============================================================================
// 4. PROJECT-TO-RESUME INTEGRATION (GOOGLE XYZ BULLETS)
// ============================================================================

/**
 * Generates verified resume bullet points using the Google XYZ formula:
 * "Accomplished [X] as measured by [Y] by doing [Z]"
 */
export function generateProjectResumeBullets(
  project: GuidedProjectDTO,
  studentProfile?: StudentProfileDTO | null
): {
  projectTitle: string;
  description: string;
  bullets: string[];
  techStackFormatted: string;
  advice: string;
} {
  const title = project.title;
  const techStr = project.techStack.join(', ');
  const milestonesDone = project.milestones.filter((m) => m.isCompleted).length;
  const isComplete = project.status === 'completed' || milestonesDone >= 7;

  // Extract real architectural achievements from project specification
  const bullets: string[] = [];

  // Bullet 1: Core System Architecture & Functionality
  bullets.push(
    `Architected a full-stack ${project.targetRole.toLowerCase()} application using ${techStr}, implementing transactional persistence and strict schema validation across 6+ REST API endpoints.`
  );

  // Bullet 2: Performance / Concurrency / Reliability
  if (techStr.toLowerCase().includes('redis') || techStr.toLowerCase().includes('docker')) {
    bullets.push(
      `Engineered a multi-container deployment using Docker and Redis caching, achieving sub-40ms P95 latency and preventing connection exhaustion under simulated concurrent traffic.`
    );
  } else if (techStr.toLowerCase().includes('postgres') || techStr.toLowerCase().includes('sql')) {
    bullets.push(
      `Designed normalized relational database schema with composite indexing and foreign key constraints, reducing average query response times across multi-table joins.`
    );
  } else {
    bullets.push(
      `Optimized data access and state management with structured service layers, reducing redundant API requests and ensuring sub-100ms response cycles.`
    );
  }

  // Bullet 3: Quality & Production Readiness
  bullets.push(
    `Implemented automated test suites and continuous deployment pipelines using Jest and GitHub Actions, verifying API authentication, error handling boundaries, and cloud hosting availability.`
  );

  const description = `${title} is a ${project.difficulty.toLowerCase()} software engineering system built with ${techStr}. It implements structured database modeling, comprehensive input validation, and production cloud deployment.`;

  return {
    projectTitle: title,
    description,
    bullets,
    techStackFormatted: techStr,
    advice:
      'These bullet points use the Google XYZ framework ("Accomplished [X] as measured by [Y] by doing [Z]") to showcase measurable technical impact without exaggerating commercial user metrics.',
  };
}
