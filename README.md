# Smart Resume AI

Smart Resume AI is a unified, full-stack Next.js application delivering AI-powered resume building, ATS evaluation, deterministic scoring, career intelligence, job matching, and proctored skill assessments.

---

## Architecture Overview

The project is structured as a full-stack Next.js 16 application with React 19, Tailwind CSS v4, and integrated App Router API endpoints backed by SQLite.

```
builder-github/
├── src/
│   ├── app/                      # Next.js App Router (Pages, Layouts & API Route Handlers)
│   │   ├── (auth)/               # Authentication routes (/login, /register)
│   │   ├── admin/                # Admin portal (/admin/dashboard, users, analytics, settings)
│   │   ├── api/                  # Serverless API routes
│   │   │   ├── admin/            # Admin endpoints (users, stats, records, config)
│   │   │   ├── auth/             # Authentication & session endpoints (/login, /register, /me)
│   │   │   ├── career/           # Career intelligence, roadmaps, project mentor endpoints
│   │   │   ├── chat/             # AI Assistant contextual chat endpoint
│   │   │   ├── jobs/             # Job search, suggestions, and NLP matching
│   │   │   ├── onboarding/       # Student onboarding and resume parsing
│   │   │   ├── proctoring/       # Assessment proctoring and anti-tamper signals
│   │   │   ├── resume/           # ATS scoring, improvement, and tailoring endpoints
│   │   │   ├── student/          # Unified student context & readiness history
│   │   │   └── user/             # User data, resumes, versions, skills, applications
│   │   ├── builder/              # Interactive resume builder & template customizer
│   │   ├── dashboard/            # Authenticated student career command center & profile
│   │   ├── job-match/            # Job matching & tailoring interface
│   │   ├── jobs/                 # Role search & market intelligence
│   │   ├── ats-score/            # Deterministic ATS resume analyzer & scorer
│   │   ├── analyzer/             # Comprehensive resume analyzer
│   │   ├── improver/             # Resume improver workspace
│   │   ├── onboarding/           # Student onboarding workflow
│   │   ├── projects/             # Career project portfolio & mentorship
│   │   ├── skills/               # Skill assessment and verification platform
│   │   ├── globals.css           # Global Tailwind CSS and design tokens
│   │   └── layout.tsx            # Root HTML layout with ThemeProvider and Contexts
│   │
│   ├── components/               # React client and server components
│   │   ├── builder/              # Resume builder modules, stage forms, preview & templates
│   │   │   ├── templates/        # 12 ATS-compliant resume templates
│   │   │   └── A4ResumeDocument  # Pixel-accurate A4 print and export layout engine
│   │   ├── chat/                 # AI Assistant floating chatbot interface
│   │   ├── dashboard/            # Command center widgets, readiness quadrants, milestones
│   │   ├── jobs/                 # Job search filters, autocomplete, and match cards
│   │   ├── ui/                   # Shared UI primitives (buttons, modals, cards, inputs)
│   │   └── Navigation.tsx        # Responsive navigation bar
│   │
│   ├── context/                  # React state providers
│   │   ├── AuthContext.tsx       # Authentication state & session lifecycle
│   │   ├── ResumeContext.tsx     # Active resume state, versions, autosave, deletion
│   │   └── ThemeContext.tsx      # Light/Dark theme switching with system detection
│   │
│   ├── server/                   # Server-side business logic and database access
│   │   ├── db/                   # Database connection (SQLite with WAL mode) and schema
│   │   └── services/             # Core server logic
│   │       ├── careerIntelligence.ts       # Unified student context & career advice
│   │       ├── deterministicAtsEngine.ts   # Deterministic ATS scoring engine
│   │       ├── careerActionEngine.ts       # Milestone and action recommendation engine
│   │       ├── projectMentor.ts            # Career project generation and mentoring
│   │       ├── parseResumeToData.ts        # Resume text parsing and schema mapping
│   │       ├── extractResumeText.ts        # PDF/DOCX multi-format text extraction
│   │       └── jobs/                       # Job dataset repository and role suggestions
│   │
│   ├── lib/                      # Client & shared utility functions
│   ├── types/                    # Shared TypeScript interfaces & types
│   └── proxy.ts                  # Security proxy: rate limiting, auth cookies, headers
│
├── e2e/                          # Playwright end-to-end browser regression test suites
│   ├── authenticated.spec.ts     # Core authenticated session flows
│   ├── builder.spec.ts           # Resume builder workflow
│   ├── career-command-center.spec.ts # Readiness quadrants & timeline filtering
│   ├── career-workflow.spec.ts   # End-to-end multi-step student journey
│   ├── dashboard.spec.ts         # Student command center verification
│   ├── job-role-autocomplete.spec.ts # Autocomplete regression tests
│   ├── jobs-authenticated.spec.ts    # Authenticated job search
│   ├── landing.spec.ts           # Public landing page and navigation
│   ├── public-routes.spec.ts     # Anonymous access & redirect protection
│   ├── personalized-career-path.spec.ts # Multi-viewport career path flows
│   ├── resume-removal.spec.ts    # Resume deletion (active & non-active) regression
│   ├── responsive-navigation.spec.ts # Viewport navigation & menus
│   └── theme.spec.ts             # Light/Dark mode and reduced-motion tests
│
├── data/                         # Local SQLite database file (smart_resume.db)
├── scripts/                      # Test runners, verification scripts, and migration utilities
├── public/                       # Static public assets
├── next.config.ts                # Next.js build and proxy configuration
├── playwright.config.ts          # Playwright multi-viewport testing configuration
├── tsconfig.json                 # TypeScript compiler configuration
└── package.json                  # Dependencies and execution scripts
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Components**: React 19, Lucide React, Framer Motion, Recharts
- **Styling**: Tailwind CSS v4 (Strict light-theme design system: `#FFFFFF`, `#F6F7F9`, `#20242B`, `#626B78`, `#3157C8`, `#E5E8ED`)
- **Database**: SQLite with WAL mode (`better-sqlite3` / `node:sqlite`) with parameterized SQL
- **AI & ATS Engines**: Google GenAI SDK (`@google/genai`) with Deterministic Local Fallbacks
- **Document Processing**: `pdf-parse`, `mammoth` (DOCX extraction)
- **Testing**: Playwright multi-device/multi-viewport test framework (`mobile-375x812`, `mobile-390x844`, `tablet-768x1024`, `desktop-1440x900`)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will be accessible at:
- Web Application: [http://localhost:3000](http://localhost:3000)
- Resume Builder: [http://localhost:3000/builder](http://localhost:3000/builder)
- Command Center: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- ATS Analyzer: [http://localhost:3000/ats-score](http://localhost:3000/ats-score)
- Job Search: [http://localhost:3000/jobs](http://localhost:3000/jobs)
- Admin Portal: [http://localhost:3000/admin](http://localhost:3000/admin)

### 3. Production Build
```bash
npm run build
npm start
```

---

## Verification & Testing Suites

### TypeScript & Linting
```bash
npx tsc --noEmit
npm run lint
```

### End-to-End Tests (Playwright)
```bash
# Run all public and responsive route tests (52 tests across 4 viewports)
npm run test:e2e:public

# Run resume removal regression tests
node scripts/run-playwright.mjs e2e/resume-removal.spec.ts

# Run job-role autocomplete regression tests
node scripts/run-playwright.mjs e2e/job-role-autocomplete.spec.ts

# Run personalized career path regression tests
node scripts/run-playwright.mjs e2e/personalized-career-path.spec.ts

# Run core authenticated suites
node scripts/run-playwright.mjs e2e/authenticated.spec.ts e2e/dashboard.spec.ts e2e/builder.spec.ts e2e/jobs-authenticated.spec.ts

# Run career command center & end-to-end student journey
node scripts/run-playwright.mjs e2e/career-workflow.spec.ts e2e/career-command-center.spec.ts
```

### Specialized Verification Scripts
```bash
npm run test:auth          # Authentication security and session isolation
npm run test:admin         # Admin role authorization regression
npm run test:templates     # Production resume template registry tests
npm run test:gemini        # Gemini service resilience & deterministic fallback
npm run test:isolation     # Session and data boundary isolation
```
