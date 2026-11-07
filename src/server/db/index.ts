import 'server-only';
import crypto from 'node:crypto';
import { SEED_SKILLS, INITIAL_ASSESSMENT_QUESTIONS } from './seedQuestions';
import { getDb as getDbFromAdapter, getActiveTx, type DatabaseClient } from './adapter';
import { isClientDraftResumeId } from '@/types/resume';

function skillSlug(name: string): string {
  const normalizedName = name.trim().toLowerCase();
  // Keep the legacy C++ slug stable while giving C# its own unique catalog key.
  if (normalizedName === 'c#') return 'c-sharp';
  return normalizedName.replace(/[^a-z0-9]+/g, '-');
}

export type { DatabaseClient };
export { isClientDraftResumeId };

let dbInstance: DatabaseClient | null = null;
let isInitialized = false;

/**
 * Development-only fallback secret strictly restricted to non-production environments.
 * IN PRODUCTION: This fallback is NEVER used; ADMIN_SESSION_SECRET must be explicitly provided with >= 32 characters.
 */
const DEV_ONLY_FALLBACK_SECRET = 'dev-only-secret-smart-resume-ai-do-not-use-in-production-min-32-chars';

/**
 * Centralized function to retrieve and validate ADMIN_SESSION_SECRET.
 *
 * Requirements:
 * 1. In production (NODE_ENV === 'production' or VERCEL):
 *    - Strictly requires ADMIN_SESSION_SECRET to exist and contain at least 32 characters.
 *    - If missing, empty, or < 32 characters, fails closed (returns null).
 *    - Never generates or substitutes a predictable default in production.
 * 2. Outside production (development / test):
 *    - Uses configured ADMIN_SESSION_SECRET if provided and valid (>= 32 chars).
 *    - If missing or empty, allows a development-only fallback.
 *    - If configured but < 32 characters, fails closed (returns null) to reject weak secrets.
 */
export function getAdminSessionSecret(): string | null {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const rawSecret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
  const secret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

  if (isProduction) {
    if (!secret || secret.length < 32) {
      return null;
    }
    return secret;
  }

  // Outside production:
  if (secret) {
    if (secret.length < 32) {
      return null;
    }
    return secret;
  }

  return DEV_ONLY_FALLBACK_SECRET;
}

export const getValidatedSessionSecret = getAdminSessionSecret;

export async function closeDb(): Promise<void> {
  if (dbInstance?.close) {
    await dbInstance.close();
  }
  dbInstance = null;
  isInitialized = false;
}

/**
 * Returns the active database instance (PostgreSQL on Vercel/production, SQLite in local development).
 */
export function getDb(): DatabaseClient {
  const activeTx = getActiveTx();
  if (activeTx) {
    return activeTx;
  }

  if (dbInstance && isInitialized) {
    return dbInstance;
  }

  dbInstance = getDbFromAdapter();

  if (isInitialized) {
    return dbInstance;
  }

  isInitialized = true;

  if (!dbInstance.isPostgres) {
    // 1. Admin Users Table
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      session_token TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // 1b. Real Users / Candidate Profiles Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      session_token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(session_token);
    CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
  `);

  // 2. Visitors / Sessions Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      anonymous_id TEXT UNIQUE NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      total_sessions INTEGER DEFAULT 1,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_visitors_anon ON visitors(anonymous_id);
  `);

  // 3. Resumes Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      parsed_successfully INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resumes_visitor ON resumes(visitor_id);
  `);

  // 4. Resume Analyses Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      resume_id TEXT,
      file_type TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      ats_score REAL NOT NULL,
      keyword_score REAL NOT NULL,
      formatting_score REAL NOT NULL,
      section_score REAL NOT NULL,
      analysis_status TEXT NOT NULL,
      detected_keywords TEXT,
      missing_keywords TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_date ON resume_analyses(analyzed_at);
  `);

  // 5. Verified Skills Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS verified_skills (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      skill_name TEXT NOT NULL,
      status TEXT NOT NULL,
      assessment_id TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skills_name ON verified_skills(skill_name);
  `);

  // 6. Assessments Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      skill TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      status TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      proctoring_violation_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assessments_skill ON assessments(skill);
  `);

  // 7. Job Searches Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS job_searches (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      query TEXT NOT NULL,
      location TEXT,
      provider TEXT NOT NULL,
      results_count INTEGER NOT NULL,
      searched_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_job_searches_date ON job_searches(searched_at);
  `);

  // 7b. Job Search Results Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS job_search_results (
      id TEXT PRIMARY KEY,
      search_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      salary TEXT,
      description TEXT,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      posted_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jsr_search ON job_search_results(search_id);
  `);

  // 8. Job Matches Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS job_matches (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      resume_id TEXT,
      job_id TEXT,
      job_title TEXT,
      company TEXT,
      match_score REAL NOT NULL,
      matched_skills TEXT,
      partial_skills TEXT,
      missing_skills TEXT,
      created_at TEXT NOT NULL,
      user_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_job_matches_resume ON job_matches(resume_id);
    CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);
  `);

  // 9. Feedback Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      visitor_id TEXT,
      rating INTEGER NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      suggestions TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(created_at);
  `);

  // 10. Skills Catalog Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS skills_catalog (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skills_cat_slug ON skills_catalog(slug);
  `);

  // 11. Assessment Configuration Table (per-skill settings)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assessment_configs (
      id TEXT PRIMARY KEY,
      skill_slug TEXT UNIQUE NOT NULL,
      questions_count INTEGER DEFAULT 10,
      pass_percentage INTEGER DEFAULT 70,
      time_limit_minutes INTEGER DEFAULT 20,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 12. Assessment Questions Table (Question Bank)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assessment_questions (
      id TEXT PRIMARY KEY,
      skill_slug TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'MCQ',
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      time_limit_seconds INTEGER DEFAULT 120,
      is_active INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_aq_skill ON assessment_questions(skill_slug);
    CREATE INDEX IF NOT EXISTS idx_aq_status ON assessment_questions(is_active, is_deleted);
  `);

  // 13. Assessment Question Snapshots Table (preserves exact questions at assessment time for historical integrity)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS assessment_question_snapshots (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      selected_answer TEXT,
      is_correct INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snap_assessment ON assessment_question_snapshots(assessment_id);
  `);

  // 14. Real Audit Events Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      description TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
  `);

  // 15. Job Applications Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT,
      job_title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      source TEXT,
      job_url TEXT,
      applied_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Applied',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_job_app_user ON job_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_app_status ON job_applications(status);
  `);

  // 16. Resume Improvements Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS resume_improvements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resume_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      before_text TEXT NOT NULL,
      after_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_improvements_user ON resume_improvements(user_id);
  `);

  // 16b. Resume Versions Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resume_id TEXT,
      version_number INTEGER NOT NULL DEFAULT 1,
      resume_data TEXT NOT NULL,
      change_summary TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resume_ver_user ON resume_versions(user_id);
    CREATE INDEX IF NOT EXISTS idx_resume_ver_res ON resume_versions(resume_id);
    CREATE INDEX IF NOT EXISTS idx_resume_ver_order ON resume_versions(user_id, resume_id, version_number DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_ver_unique ON resume_versions(user_id, resume_id, version_number);
  `);

  // 17. Certificates Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      certificate_code TEXT UNIQUE NOT NULL,
      issue_date TEXT NOT NULL,
      verification_status TEXT DEFAULT 'VERIFIED',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
  `);

  // 18. Courses Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      total_lessons INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      level TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
  `);

  // 19. Course Progress Table
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS course_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      lessons_completed INTEGER DEFAULT 0,
      total_lessons INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      completion_date TEXT,
      last_accessed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cp_user ON course_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_cp_course ON course_progress(course_id);
  `);

  // 20. Proctoring Events Table (Audit logs for camera & behavioral monitoring)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS proctoring_events (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_proctor_assessment ON proctoring_events(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_proctor_type ON proctoring_events(event_type);
  `);

  // 21. User Skills Table (Profile skills claimed / tracked per user)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not-verified',
      score INTEGER,
      certificate_id TEXT,
      verified_date TEXT,
      claimed_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, skill_name)
    );
    CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(skill_name);
  `);

  // 22. Live Proctoring Sessions Table (Camera & Assessment Telemetry)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS live_proctoring_sessions (
      id TEXT PRIMARY KEY,
      assessment_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT,
      skill TEXT NOT NULL,
      status TEXT NOT NULL,
      camera_status TEXT NOT NULL,
      stream_health TEXT NOT NULL DEFAULT 'unknown',
      frame_rate REAL DEFAULT 0,
      resolution TEXT DEFAULT 'unknown',
      consent_given INTEGER DEFAULT 0,
      consent_timestamp TEXT,
      started_at TEXT,
      last_heartbeat_at TEXT NOT NULL,
      completed_at TEXT,
      signaling_offer TEXT,
      signaling_answer TEXT,
      candidate_ice_candidates TEXT,
      admin_ice_candidates TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lps_assessment ON live_proctoring_sessions(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_lps_status ON live_proctoring_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_lps_last_hb ON live_proctoring_sessions(last_heartbeat_at);
  `);

  // 23. User Career Goals
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS user_career_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      target_role TEXT NOT NULL,
      target_industry TEXT,
      experience_level TEXT,
      preferred_location TEXT,
      target_salary TEXT,
      skills_summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ucg_user ON user_career_goals(user_id);
  `);

  // 24. User Learning Roadmaps
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS user_learning_roadmaps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      roadmap_data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ulr_user ON user_learning_roadmaps(user_id);
  `);

  // 25. User Interview Sessions
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS user_interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_role TEXT NOT NULL,
      job_title TEXT,
      company TEXT,
      questions_data TEXT NOT NULL,
      answers_data TEXT,
      overall_score INTEGER,
      overall_feedback TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_uis_user ON user_interview_sessions(user_id);
  `);

  // 26. Student Profiles Table (Centralized Student & Fresher Career Profile)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field_of_study TEXT NOT NULL,
      graduation_year INTEGER NOT NULL,
      graduation_month TEXT,
      current_semester TEXT,
      cgpa TEXT,
      student_type TEXT DEFAULT 'college_student',
      target_role TEXT NOT NULL DEFAULT 'Graduate Software Engineer',
      target_work_type TEXT DEFAULT 'both',
      preferred_locations TEXT,
      projects_data TEXT,
      coursework TEXT,
      achievements TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sp_user ON student_profiles(user_id);
  `);

  // 27. Guided Projects Table (AI Project Mentor & Milestone Tracker)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS guided_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Intermediate',
      target_role TEXT NOT NULL DEFAULT 'Graduate Software Engineer',
      tech_stack TEXT NOT NULL DEFAULT '[]',
      problem_statement TEXT,
      real_world_use_case TEXT,
      architecture_overview TEXT,
      database_design TEXT,
      estimated_complexity TEXT,
      resume_value TEXT,
      specification_json TEXT,
      milestones_json TEXT,
      current_milestone INTEGER DEFAULT 1,
      progress_percent INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      github_url TEXT,
      live_url TEXT,
      resume_bullets_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_guided_proj_user ON guided_projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_guided_proj_status ON guided_projects(status);
  `);

  // 28. Career Readiness History Table (Dated Readiness Snapshots)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS career_readiness_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      overall_level TEXT NOT NULL,
      technical_score INTEGER NOT NULL,
      project_score INTEGER NOT NULL,
      resume_score INTEGER NOT NULL,
      interview_score INTEGER NOT NULL,
      trigger_activity TEXT NOT NULL,
      activity_detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crh_user ON career_readiness_history(user_id, created_at DESC);
  `);

  // Safe column migrations to associate activity with user_id and expand users table
  const migrateColumns = [
    'ALTER TABLE visitors ADD COLUMN user_id TEXT;',
    'ALTER TABLE resumes ADD COLUMN user_id TEXT;',
    'ALTER TABLE resume_analyses ADD COLUMN user_id TEXT;',
    'ALTER TABLE verified_skills ADD COLUMN user_id TEXT;',
    'ALTER TABLE assessments ADD COLUMN user_id TEXT;',
    'ALTER TABLE assessments ADD COLUMN termination_reason TEXT;',
    'ALTER TABLE assessments ADD COLUMN proctoring_events_json TEXT;',
    'ALTER TABLE job_searches ADD COLUMN user_id TEXT;',
    'ALTER TABLE job_matches ADD COLUMN user_id TEXT;',
    'ALTER TABLE feedback ADD COLUMN user_id TEXT;',
    'ALTER TABLE users ADD COLUMN password_hash TEXT;',
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';",
    'ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;',
    'ALTER TABLE users ADD COLUMN last_login_at TEXT;',
    'ALTER TABLE job_applications ADD COLUMN resume_id TEXT;',
    'ALTER TABLE job_applications ADD COLUMN applied_confirmed_at TEXT;',
    'ALTER TABLE job_applications ADD COLUMN description_snippet TEXT;',
    'ALTER TABLE job_applications ADD COLUMN salary TEXT;',
    'ALTER TABLE job_applications ADD COLUMN cover_letter TEXT;',
    'ALTER TABLE job_applications ADD COLUMN tailored_summary TEXT;',
    'ALTER TABLE job_applications ADD COLUMN checklist_state TEXT;',
    'ALTER TABLE job_applications ADD COLUMN match_analysis TEXT;',
    'ALTER TABLE job_applications ADD COLUMN interview_date TEXT;',
    'ALTER TABLE job_applications ADD COLUMN outreach_message TEXT;',
    'ALTER TABLE resumes ADD COLUMN resume_data TEXT;',
    'ALTER TABLE admin_users ADD COLUMN session_token TEXT;',
  ];
  for (const sql of migrateColumns) {
    try {
      dbInstance.exec(sql);
    } catch {
      // Column already exists or table updated
    }
  }

  const migrateIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_resume_ver_order ON resume_versions(user_id, resume_id, version_number DESC);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_ver_unique ON resume_versions(user_id, resume_id, version_number);',
  ];
  for (const sql of migrateIndexes) {
    try {
      dbInstance.exec(sql);
    } catch {
      // Index already exists
    }
  }

    // Ensure default admin user is seeded securely
    ensureAdminUserExists(dbInstance);

    // Ensure seed skills and initial question bank are populated if empty
    ensureSeedQuestionsAndSkills(dbInstance);

    // Ensure career courses are seeded if empty
    ensureSeedCourses(dbInstance);
  }

  return dbInstance;
}

// ==========================================
// PASSWORD & AUTHENTICATION HELPERS
// ==========================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(userOrAdmin: { id?: string; sub?: string; email: string; role: string }): string {
  const secret = getAdminSessionSecret();
  if (!secret) {
    throw new Error(
      'Session token creation failed: ADMIN_SESSION_SECRET or SESSION_SECRET is missing or invalid in production environment (minimum 32 characters required).'
    );
  }

  const sub = userOrAdmin.id || userOrAdmin.sub;
  if (!sub) {
    throw new Error('Session token creation failed: user id or sub is required.');
  }

  const payload = {
    sub,
    email: userOrAdmin.email,
    role: userOrAdmin.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
} | null {
  if (!token || typeof token !== 'string') return null;

  const secret = getAdminSessionSecret();
  if (!secret) {
    // In production with missing or invalid secret, fail closed: no token can be authenticated
    return null;
  }

  try {
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    // Require non-empty string sub
    if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
      return null;
    }

    // Require valid, explicitly allowed role
    if (payload.role !== 'USER' && payload.role !== 'ADMIN') {
      return null;
    }

    // Require numeric, finite, positive iat and exp claims
    if (
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.iat <= 0 ||
      payload.exp <= 0
    ) {
      return null;
    }

    // Reject tokens where expiration is at or before issuance
    if (payload.exp <= payload.iat) {
      return null;
    }

    const now = Date.now();
    const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000; // 60 seconds tolerance for clock skew

    // Reject future-issued tokens beyond clock-skew tolerance
    if (payload.iat > now + CLOCK_SKEW_TOLERANCE_MS) {
      return null;
    }

    // Reject expired tokens
    if (now > payload.exp) {
      return null;
    }

    return {
      sub: payload.sub.trim(),
      email: typeof payload.email === 'string' ? payload.email.trim() : '',
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string | undefined | null): {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
} | null {
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified || verified.role !== 'ADMIN') return null;

  try {
    const db = getDb();
    if (!db.isPostgres) {
      const adminRecord = db
        .prepare('SELECT id, is_active, session_token FROM admin_users WHERE id = ? OR LOWER(email) = ?')
        .get(verified.sub, verified.email.toLowerCase()) as
        | { id: string; is_active: number; session_token?: string | null }
        | undefined;

      if (!adminRecord) {
        return null;
      }
      if (Number(adminRecord.is_active) === 0) {
        return null;
      }
      if (adminRecord.session_token === 'REVOKED' || (adminRecord.session_token && adminRecord.session_token.startsWith('revoked_'))) {
        return null;
      }
      if (adminRecord.session_token && adminRecord.session_token !== token) {
        return null;
      }
    }
  } catch {
    // Fall back to cryptographic verification if DB query unavailable
  }

  return verified;
}

export async function verifyAdminTokenAsync(token: string | undefined | null): Promise<{
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
} | null> {
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified || verified.role !== 'ADMIN') return null;

  try {
    const db = getDb();
    const adminRecord = (await db
      .prepare('SELECT id, is_active, session_token FROM admin_users WHERE id = ? OR LOWER(email) = ?')
      .get(verified.sub, verified.email.toLowerCase())) as
      | { id: string; is_active: number; session_token?: string | null }
      | undefined;

    if (!adminRecord) {
      return null;
    }
    if (Number(adminRecord.is_active) === 0) {
      return null;
    }
    if (adminRecord.session_token === 'REVOKED' || (adminRecord.session_token && adminRecord.session_token.startsWith('revoked_'))) {
      return null;
    }
    if (adminRecord.session_token && adminRecord.session_token !== token) {
      return null;
    }
  } catch {
    // Fall back to cryptographic verification if DB query unavailable
  }

  return verified;
}

function ensureAdminUserExists(db: DatabaseClient) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPass) return;

  const existingStmt = db.prepare('SELECT id, password_hash FROM admin_users WHERE LOWER(email) = ?');
  const existing = existingStmt.get(adminEmail) as { id: string; password_hash: string } | undefined;

  const hash = hashPassword(adminPass);
  const now = new Date().toISOString();

  if (!existing) {
    const insertStmt = db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
    `);

    insertStmt.run(`adm_${Date.now()}`, adminEmail, hash, now, now);
    console.info(`[Smart Resume AI] Initialized admin account from environment: ${adminEmail}`);
  } else {
    // If credentials were changed in environment, refresh password hash securely
    const isMatching = verifyPassword(adminPass, existing.password_hash);
    if (!isMatching) {
      db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, now, existing.id);
      console.info(`[Smart Resume AI] Refreshed password hash for admin: ${adminEmail}`);
    }
  }
}

function ensureSeedQuestionsAndSkills(db: DatabaseClient) {
  try {
    // 1. Check and seed skills_catalog & default configs
    const skillCount = (db.prepare('SELECT COUNT(*) as c FROM skills_catalog').get() as { c: number }).c;
    if (skillCount === 0) {
      const insertSkill = db.prepare(`
        INSERT INTO skills_catalog (id, name, slug, category, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `);
      const insertConfig = db.prepare(`
        INSERT INTO assessment_configs (id, skill_slug, questions_count, pass_percentage, time_limit_minutes, created_at, updated_at)
        VALUES (?, ?, 10, 70, 20, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const s of SEED_SKILLS) {
        const slug = skillSlug(s.name);
        const skillId = `skl_${slug}`;
        insertSkill.run(skillId, s.name, slug, s.category, s.description, now, now);
        insertConfig.run(`cfg_${slug}`, slug, now, now);
      }
      console.info(`[Smart Resume AI] Initialized skills catalog with ${SEED_SKILLS.length} skills`);
    }

    // 2. Check and seed assessment_questions
    const qCount = (db.prepare('SELECT COUNT(*) as c FROM assessment_questions').get() as { c: number }).c;
    if (qCount === 0) {
      const insertQ = db.prepare(`
        INSERT INTO assessment_questions (
          id, skill_slug, skill_name, question_text, question_type,
          difficulty, options_json, correct_answer, explanation,
          time_limit_seconds, is_active, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 120, 1, 0, ?, ?)
      `);

      const now = new Date().toISOString();
      INITIAL_ASSESSMENT_QUESTIONS.forEach((q, idx) => {
        const slug = skillSlug(q.skill);
        const qId = `qst_${slug}_${idx + 1}`;
        const correctLetter = `Option ${String.fromCharCode(65 + q.correct_answer_index)}`;
        insertQ.run(
          qId,
          slug,
          q.skill,
          q.question_text,
          q.question_type,
          q.difficulty,
          JSON.stringify(q.options),
          correctLetter,
          q.explanation,
          now,
          now
        );
      });
      console.info(`[Smart Resume AI] Initialized assessment question bank with ${INITIAL_ASSESSMENT_QUESTIONS.length} questions`);
    }
  } catch (err) {
    console.error('[Smart Resume AI] Error initializing seed questions/skills:', err);
  }
}

export const SEED_COURSES = [
  {
    id: 'crs_full_stack_dev',
    slug: 'full-stack-web-dev',
    title: 'Full-Stack Web Development Career Path',
    category: 'Software Engineering',
    description: 'Master modern full-stack development with Next.js, Node.js, TypeScript, and cloud deployment pipelines.',
    totalLessons: 12,
    durationMinutes: 360,
    level: 'Intermediate',
  },
  {
    id: 'crs_react_ts_mastery',
    slug: 'modern-react-typescript',
    title: 'Modern React & TypeScript Mastery',
    category: 'Frontend Engineering',
    description: 'Deep dive into advanced React patterns, performance optimization, hooks architecture, and strict TypeScript.',
    totalLessons: 10,
    durationMinutes: 240,
    level: 'Advanced',
  },
  {
    id: 'crs_python_ai_systems',
    slug: 'python-data-science-ai',
    title: 'Python for Data Science & AI Systems',
    category: 'Data & AI',
    description: 'Build production AI applications, understand LLM engineering, data manipulation, and modern Python tooling.',
    totalLessons: 15,
    durationMinutes: 450,
    level: 'Intermediate',
  },
  {
    id: 'crs_system_design',
    slug: 'system-design-architecture',
    title: 'System Design & Scalable Architecture',
    category: 'Architecture',
    description: 'Learn distributed caching, microservices, load balancing, message queues, and high-concurrency architectures.',
    totalLessons: 8,
    durationMinutes: 300,
    level: 'Advanced',
  },
  {
    id: 'crs_tech_interview_ats',
    slug: 'tech-interview-ats-strategy',
    title: 'Technical Interview & ATS Optimization Strategy',
    category: 'Career Prep',
    description: 'Proven strategies for resume keyword optimization, behavioral interview storytelling, and technical rounds.',
    totalLessons: 6,
    durationMinutes: 180,
    level: 'All Levels',
  },
  {
    id: 'crs_sql_cloud_databases',
    slug: 'sql-cloud-databases',
    title: 'SQL & Cloud Database Management',
    category: 'Backend & Data',
    description: 'Write complex SQL queries, optimize indexes, manage relational schemas, and migrate to cloud database engines.',
    totalLessons: 8,
    durationMinutes: 220,
    level: 'Beginner',
  },
];

function ensureSeedCourses(db: DatabaseClient) {
  try {
    const count = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as { c: number }).c;
    if (count === 0) {
      const stmt = db.prepare(`
        INSERT INTO courses (id, slug, title, category, description, total_lessons, duration_minutes, level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      for (const c of SEED_COURSES) {
        stmt.run(c.id, c.slug, c.title, c.category, c.description, c.totalLessons, c.durationMinutes, c.level, now);
      }
      console.info(`[Smart Resume AI] Initialized career courses catalog with ${SEED_COURSES.length} courses`);
    }
  } catch (err) {
    console.error('[Smart Resume AI] Error initializing seed courses:', err);
  }
}

// ==========================================
// REAL AUDIT LOG SYSTEM
// ==========================================

export async function logAuditEvent(
  data: {
    eventType: string;
    actorType?: 'USER' | 'VISITOR' | 'ADMIN' | 'SYSTEM';
    actorId?: string;
    description: string;
    metadata?: Record<string, any>;
  },
  dbClient?: DatabaseClient,
  throwOnError: boolean = false
): Promise<string> {
  const db = dbClient || getDb();
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    await db.prepare(`
      INSERT INTO audit_events (id, event_type, actor_type, actor_id, description, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.eventType,
      data.actorType || 'SYSTEM',
      data.actorId || null,
      data.description,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now
    );
  } catch (err) {
    console.error('[DB Audit Event Error] Failed to record audit event:', err);
    if (throwOnError || (dbClient && throwOnError !== false)) {
      throw err;
    }
  }

  return id;
}

export function formatAuditEventTitle(eventType: string): string {
  switch (eventType) {
    case 'RESUME_ANALYZED': return 'Resume Analyzed';
    case 'ASSESSMENT_STARTED': return 'Assessment Started';
    case 'ASSESSMENT_COMPLETED': return 'Assessment Completed';
    case 'SKILL_VERIFIED': return 'Skill Badge Verified';
    case 'JOB_SEARCHED': return 'Job Search Executed';
    case 'JOB_MATCHED': return 'Job Match Recorded';
    case 'FEEDBACK_SUBMITTED': return 'User Feedback Received';
    case 'ADMIN_LOGIN': return 'Admin Session Initialized';
    case 'QUESTION_CREATED': return 'Question Added to Bank';
    case 'QUESTION_UPDATED': return 'Question Updated';
    case 'QUESTION_STATUS_CHANGED': return 'Question Status Updated';
    case 'QUESTION_DELETED': return 'Question Soft-Deleted';
    case 'SKILL_STATUS_CHANGED': return 'Skill Status Updated';
    case 'ASSESSMENT_CONFIG_UPDATED': return 'Assessment Config Updated';
    default: return eventType.replace(/_/g, ' ');
  }
}

export async function getRealAuditEvents(limit = 20) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT id, event_type, actor_type, actor_id, description, metadata_json, created_at
    FROM audit_events
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string;
    event_type: string;
    actor_type: string;
    actor_id: string | null;
    description: string;
    metadata_json: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    actorType: r.actor_type,
    actorId: r.actor_id,
    description: r.description,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
    createdAt: r.created_at,
    timeAgo: formatTimeAgo(r.created_at),
  }));
}

// ==========================================
// USER PROFILE & SESSION MANAGEMENT
// ==========================================

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  lastActiveAt: string;
}

export async function getUserNameById(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const db = getDb();
  try {
    const row = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
    return row?.name || null;
  } catch {
    return null;
  }
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  visitorId?: string | null;
}): Promise<{
  user: UserProfile;
  sessionToken: string;
}> {
  const db = getDb();
  const trimmedName = (data.name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Please enter a valid full name (at least 2 characters).');
  }
  if (trimmedName.length > 70) {
    throw new Error('Full name cannot exceed 70 characters.');
  }

  const trimmedEmail = (data.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  if (!data.password || data.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Prevent public registration from claiming or colliding with administrative accounts
  const existingAdmin = (await db.prepare('SELECT id FROM admin_users WHERE LOWER(email) = ?').get(trimmedEmail)) as any;
  if (existingAdmin) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const existing = (await db.prepare(`
    SELECT id, email, password_hash, role, is_active, created_at
    FROM users
    WHERE LOWER(email) = ?
    ORDER BY 
      CASE WHEN password_hash IS NOT NULL AND length(trim(password_hash)) > 0 THEN 1 ELSE 0 END DESC,
      updated_at DESC
    LIMIT 1
  `).get(trimmedEmail)) as any;
  const now = new Date().toISOString();

  let userId: string;
  let createdAt = now;
  if (existing) {
    if (existing.password_hash || existing.role === 'ADMIN') {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    // Existing user record without password (e.g. from prior name-onboarding)
    userId = existing.id;
    createdAt = existing.created_at || now;
    const passwordHash = hashPassword(data.password);
    const sessionToken = createSessionToken({ id: userId, email: trimmedEmail, role: 'USER' });

    await db.prepare(`
      UPDATE users
      SET name = ?, password_hash = ?, role = 'USER', is_active = 1,
          session_token = ?, updated_at = ?, last_login_at = ?, last_active_at = ?
      WHERE id = ?
    `).run(trimmedName, passwordHash, sessionToken, now, now, now, userId);

    await logAuditEvent({
      eventType: 'USER_REGISTERED',
      actorType: 'USER',
      actorId: userId,
      description: `${trimmedName} registered an account`,
      metadata: { userId, email: trimmedEmail, name: trimmedName },
    });

    return {
      user: {
        id: userId,
        name: trimmedName,
        email: trimmedEmail,
        role: 'USER',
        isActive: true,
        createdAt,
        updatedAt: now,
        lastLoginAt: now,
        lastActiveAt: now,
      },
      sessionToken,
    };
  }

  userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const passwordHash = hashPassword(data.password);
  const sessionToken = createSessionToken({ id: userId, email: trimmedEmail, role: 'USER' });

  await db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, is_active, session_token,
      created_at, updated_at, last_login_at, last_active_at
    ) VALUES (?, ?, ?, ?, 'USER', 1, ?, ?, ?, ?, ?)
  `).run(userId, trimmedName, trimmedEmail, passwordHash, sessionToken, now, now, now, now);

  // Link previous visitor activity if any
  if (data.visitorId) {
    try {
      await db.prepare('UPDATE visitors SET user_id = ? WHERE id = ? OR anonymous_id = ?').run(userId, data.visitorId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - visitors]:', e?.message);
    }
    try {
      await db.prepare("UPDATE resumes SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - resumes]:', e?.message);
    }
    try {
      await db.prepare("UPDATE resume_analyses SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - analyses]:', e?.message);
    }
    try {
      await db.prepare("UPDATE verified_skills SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - skills]:', e?.message);
    }
    try {
      await db.prepare("UPDATE assessments SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - assessments]:', e?.message);
    }
    try {
      await db.prepare("UPDATE job_searches SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - searches]:', e?.message);
    }
    try {
      await db.prepare("UPDATE job_matches SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - matches]:', e?.message);
    }
    try {
      await db.prepare("UPDATE feedback SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(userId, data.visitorId);
    } catch (e: any) {
      console.log('[visitor migration error - feedback]:', e?.message);
    }
  }

  await logAuditEvent({
    eventType: 'USER_REGISTERED',
    actorType: 'USER',
    actorId: userId,
    description: `${trimmedName} registered an account`,
    metadata: { userId, email: trimmedEmail, name: trimmedName },
  });

  return {
    user: {
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      role: 'USER',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      lastActiveAt: now,
    },
    sessionToken,
  };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{
  user: UserProfile;
  sessionToken: string;
}> {
  const db = getDb();
  const trimmedEmail = (data.email || '').trim().toLowerCase();
  const trimmedPass = data.password || '';

  if (!trimmedEmail || !trimmedPass) {
    throw new Error('Please enter both email and password.');
  }

  const user = await db.prepare(`
    SELECT id, name, email, password_hash, role, is_active, created_at, updated_at, last_login_at, last_active_at
    FROM users
    WHERE LOWER(email) = ?
    ORDER BY 
      CASE WHEN password_hash IS NOT NULL AND length(trim(password_hash)) > 0 THEN 1 ELSE 0 END DESC,
      updated_at DESC
    LIMIT 1
  `).get(trimmedEmail) as any;

  if (!user || !user.password_hash) {
    throw new Error('Invalid email or password.');
  }

  if (user.is_active === 0) {
    throw new Error('This account has been deactivated. Please contact support.');
  }

  const isValid = verifyPassword(trimmedPass, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const now = new Date().toISOString();
  const sessionToken = createSessionToken({
    id: user.id,
    email: user.email,
    role: user.role || 'USER',
  });

  await db.prepare(`
    UPDATE users
    SET session_token = ?, last_login_at = ?, last_active_at = ?, updated_at = ?
    WHERE id = ?
  `).run(sessionToken, now, now, now, user.id);
  console.log('[DEBUG loginUser] 9. updated session_token');

  await logAuditEvent({
    eventType: 'USER_LOGGED_IN',
    actorType: 'USER',
    actorId: user.id,
    description: `${user.name} logged into their dashboard`,
    metadata: { userId: user.id, email: user.email },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'USER',
      isActive: true,
      createdAt: user.created_at,
      updatedAt: now,
      lastLoginAt: now,
      lastActiveAt: now,
    },
    sessionToken,
  };
}

export async function getUserBySession(token: string): Promise<UserProfile | null> {
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified || !verified.sub) return null;

  const db = getDb();
  try {
    const row = await db.prepare(`
      SELECT id, name, email, role, is_active, session_token, created_at, updated_at, last_login_at, last_active_at
      FROM users
      WHERE id = ?
    `).get(verified.sub) as any;

    if (!row || row.is_active === 0) return null;
    // Verify that session_token matches current active session (invalidates logged out sessions)
    if (!row.session_token || row.session_token.startsWith('revoked_')) return null;
    if (row.session_token !== token) return null;

    const now = new Date().toISOString();
    try {
      await db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, row.id);
    } catch { }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || 'USER',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      lastActiveAt: now,
    };
  } catch (err) {
    console.error('Error fetching user by session:', err);
    return null;
  }
}

export async function logoutUser(token: string): Promise<void> {
  if (!token) return;
  const db = getDb();
  const now = new Date().toISOString();
  try {
    const verified = verifySessionToken(token);
    const randSuffix = Math.random().toString(36).substring(2, 10);
    const revokedToken = `revoked_${verified?.sub || randSuffix}_${Date.now()}`;
    if (verified && verified.sub) {
      await db.prepare(`
        UPDATE users
        SET session_token = ?, updated_at = ?
        WHERE id = ?
      `).run(revokedToken, now, verified.sub);
    } else {
      await db.prepare(`
        UPDATE users
        SET session_token = ?, updated_at = ?
        WHERE session_token = ?
      `).run(revokedToken, now, token);
    }
  } catch (err: any) {
    console.log('[Auth logoutUser Error]:', err?.message || String(err));
  }
}

export async function getUserBySessionToken(sessionToken: string): Promise<UserProfile | null> {
  if (!sessionToken) return null;
  if (sessionToken.includes('.')) {
    return await getUserBySession(sessionToken);
  }
  const db = getDb();
  try {
    const row = await db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at, last_active_at FROM users WHERE session_token = ?').get(sessionToken) as any;
    if (!row || row.is_active === 0) return null;

    const now = new Date().toISOString();
    try {
      await db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(now, row.id);
    } catch { }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || 'USER',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      lastActiveAt: now,
    };
  } catch (err) {
    console.error('Error fetching user by session token:', err);
    return null;
  }
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  if (!id) return null;
  const db = getDb();
  try {
    const row = await db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at, last_active_at FROM users WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || 'USER',
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      lastActiveAt: row.last_active_at,
    };
  } catch {
    return null;
  }
}

export async function updateUserProfile(userId: string, data: { name: string; email?: string }): Promise<UserProfile> {
  const db = getDb();
  const trimmedName = (data.name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }
  if (trimmedName.length > 70) {
    throw new Error('Name cannot exceed 70 characters.');
  }

  const existingUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!existingUser) {
    throw new Error('User not found.');
  }

  let finalEmail = existingUser.email;
  if (data.email) {
    const trimmedEmail = data.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    const emailCheck = (await db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(trimmedEmail, userId)) as any;
    if (emailCheck) {
      throw new Error('Email address is already in use by another account.');
    }
    finalEmail = trimmedEmail;
  }

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE users
    SET name = ?, email = ?, updated_at = ?, last_active_at = ?
    WHERE id = ?
  `).run(trimmedName, finalEmail, now, now, userId);

  return {
    id: userId,
    name: trimmedName,
    email: finalEmail,
    role: existingUser.role || 'USER',
    isActive: Boolean(existingUser.is_active),
    createdAt: existingUser.created_at,
    updatedAt: now,
    lastLoginAt: existingUser.last_login_at,
    lastActiveAt: now,
  };
}

export async function changeUserPassword(userId: string, currentPass: string, newPass: string): Promise<boolean> {
  const db = getDb();
  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
  if (!user || !user.password_hash) {
    throw new Error('User account not found.');
  }

  if (!verifyPassword(currentPass, user.password_hash)) {
    throw new Error('Current password does not match.');
  }

  if (!newPass || newPass.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const newHash = hashPassword(newPass);
  const now = new Date().toISOString();
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);
  return true;
}

export async function createOrUpdateUserProfile(data: {
  name: string;
  email?: string | null;
  sessionToken?: string | null;
  visitorId?: string | null;
}): Promise<{ id: string; name: string; email: string | null; sessionToken: string }> {
  const db = getDb();
  const trimmedName = (data.name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Please enter a valid full name with at least 2 characters.');
  }
  if (trimmedName.length > 60) {
    throw new Error('Full name cannot exceed 60 characters.');
  }

  const trimmedEmail = data.email && typeof data.email === 'string' ? data.email.trim().toLowerCase() : null;
  const now = new Date().toISOString();

  if (data.sessionToken) {
    const existing = await db.prepare('SELECT id, session_token FROM users WHERE session_token = ?').get(data.sessionToken) as
      | { id: string; session_token: string }
      | undefined;
    if (existing) {
      await db.prepare(`
        UPDATE users
        SET name = ?, email = COALESCE(?, email), updated_at = ?, last_active_at = ?
        WHERE id = ?
      `).run(trimmedName, trimmedEmail, now, now, existing.id);

      return {
        id: existing.id,
        name: trimmedName,
        email: trimmedEmail,
        sessionToken: existing.session_token,
      };
    }
  }

  const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sessionToken = crypto.randomBytes(24).toString('hex');

  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, trimmedName, trimmedEmail, sessionToken, now, now, now);

  if (data.visitorId) {
    try {
      await db.prepare('UPDATE visitors SET user_id = ? WHERE id = ? OR anonymous_id = ?').run(id, data.visitorId, data.visitorId);
      await db.prepare("UPDATE resumes SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE resume_analyses SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE verified_skills SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE assessments SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE job_searches SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE job_matches SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
      await db.prepare("UPDATE feedback SET user_id = ? WHERE visitor_id = ? AND (user_id IS NULL OR user_id = '')").run(id, data.visitorId);
    } catch (e) {
      console.error('Error linking visitor activity to user:', e);
    }
  }

  return {
    id,
    name: trimmedName,
    email: trimmedEmail,
    sessionToken,
  };
}

// ==========================================
// WRITE TRACKING HELPERS (Called by Public APIs)
// ==========================================

export async function trackVisitor(anonymousId: string, userAgent = ''): Promise<string> {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = await db.prepare('SELECT id, total_sessions FROM visitors WHERE anonymous_id = ?').get(anonymousId) as
    | { id: string; total_sessions: number }
    | undefined;

  if (existing) {
    await db.prepare('UPDATE visitors SET last_seen_at = ?, total_sessions = total_sessions + 1, updated_at = ? WHERE id = ?')
      .run(now, now, existing.id);
    return existing.id;
  }

  const id = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.prepare(`
    INSERT INTO visitors (id, anonymous_id, first_seen_at, last_seen_at, total_sessions, user_agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `).run(id, anonymousId, now, now, userAgent.slice(0, 255), now, now);

  return id;
}

export async function recordResumeUpload(data: {
  visitorId?: string;
  userId?: string;
  filename: string;
  fileType: string;
  parsedSuccessfully?: boolean;
}): Promise<string> {
  const db = getDb();
  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);

  await db.prepare(`
    INSERT INTO resumes (id, visitor_id, user_id, filename, file_type, uploaded_at, parsed_successfully, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.filename,
    data.fileType,
    now,
    data.parsedSuccessfully ? 1 : 0,
    now
  );

  return id;
}

export async function recordResumeAnalysis(data: {
  visitorId?: string;
  userId?: string;
  resumeId?: string;
  fileType: string;
  atsScore: number;
  keywordScore: number;
  formattingScore: number;
  sectionScore: number;
  analysisStatus: string;
  detectedKeywords?: string[];
  missingKeywords?: string[];
  recommendations?: Array<{
    category?: string;
    title: string;
    actionText?: string;
    originalText?: string;
    improvedText?: string;
  }>;
}): Promise<string> {
  const db = getDb();
  const id = `anl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  await db.prepare(`
    INSERT INTO resume_analyses (
      id, visitor_id, user_id, resume_id, file_type, analyzed_at,
      ats_score, keyword_score, formatting_score, section_score,
      analysis_status, detected_keywords, missing_keywords, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.resumeId || null,
    data.fileType,
    now,
    data.atsScore,
    data.keywordScore,
    data.formattingScore,
    data.sectionScore,
    data.analysisStatus,
    JSON.stringify(data.detectedKeywords || []),
    JSON.stringify(data.missingKeywords || []),
    now
  );

  // Auto-record specific improvements for user dashboard
  if (effectiveUserId && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
    try {
      const insertImp = await db.prepare(`
        INSERT INTO resume_improvements (id, user_id, resume_id, category, title, before_text, after_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const rec of data.recommendations) {
        if (!rec.title) continue;
        const impId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await insertImp.run(
          impId,
          effectiveUserId,
          data.resumeId || null,
          rec.category || 'ATS Optimization',
          rec.title,
          rec.originalText || 'Previous unoptimized phrasing or missing bullet points',
          rec.improvedText || rec.actionText || 'Optimized industry-standard action impact phrasing',
          now
        );
      }
    } catch (e) {
      console.error('Error inserting auto improvements:', e);
    }
  }

  // Genuine Audit Log with real user name
  await logAuditEvent({
    eventType: 'RESUME_ANALYZED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || data.visitorId,
    description: `${actorName} analyzed resume (${data.fileType.toUpperCase()}) with ATS score ${data.atsScore}/100`,
    metadata: { analysisId: id, atsScore: data.atsScore, fileType: data.fileType, userId: effectiveUserId, userName },
  });

  return id;
}

export async function recordAssessmentEvent(data: {
  visitorId?: string;
  userId?: string;
  skill: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  status: string;
  durationSeconds?: number;
  startedAt?: string;
  completedAt?: string;
  proctoringViolationCount?: number;
}): Promise<string> {
  const db = getDb();
  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  await db.prepare(`
    INSERT INTO assessments (
      id, visitor_id, user_id, skill, score, total_questions,
      passed, status, duration_seconds, started_at, completed_at,
      proctoring_violation_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.skill,
    data.score,
    data.totalQuestions,
    data.passed ? 1 : 0,
    data.status,
    data.durationSeconds || 0,
    data.startedAt || now,
    data.completedAt || now,
    data.proctoringViolationCount || 0,
    now
  );

  // If passed, record into verified_skills
  if (data.passed) {
    const vsId = `vsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.prepare(`
      INSERT INTO verified_skills (id, visitor_id, user_id, skill_name, status, assessment_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'VERIFIED', ?, ?, ?)
    `).run(vsId, data.visitorId || null, effectiveUserId || null, data.skill, id, now, now);

    await logAuditEvent({
      eventType: 'SKILL_VERIFIED',
      actorType: effectiveUserId ? 'USER' : 'VISITOR',
      actorId: effectiveUserId || data.visitorId,
      description: `${actorName} verified skill "${data.skill}" with score ${data.score}/${data.totalQuestions}`,
      metadata: { skill: data.skill, assessmentId: id, score: data.score, userId: effectiveUserId, userName },
    });
  }

  await logAuditEvent({
    eventType: 'ASSESSMENT_COMPLETED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || data.visitorId,
    description: `${actorName} completed ${data.skill} assessment: ${data.score}/${data.totalQuestions} (${data.passed ? 'PASSED' : 'FAILED'})`,
    metadata: { assessmentId: id, skill: data.skill, score: data.score, passed: data.passed, userId: effectiveUserId, userName },
  });

  return id;
}

export async function recordJobSearchEvent(data: {
  visitorId?: string;
  userId?: string;
  query: string;
  location?: string;
  provider?: string;
  resultsCount?: number;
  resultCount?: number;
}): Promise<string> {
  const db = getDb();
  const id = `jsr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const provider = data.provider || 'All';
  const count = typeof data.resultsCount === 'number' ? data.resultsCount : (typeof data.resultCount === 'number' ? data.resultCount : 0);

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  // Deduplicate rapid identical search events (e.g. pagination or refresh within 60 seconds)
  const cutoffTime = new Date(Date.now() - 60000).toISOString();
  let existingRecent: any = null;
  if (effectiveUserId) {
    existingRecent = await db.prepare(`
      SELECT id FROM job_searches
      WHERE user_id = ? AND LOWER(query) = LOWER(?) AND LOWER(COALESCE(location, '')) = LOWER(?) AND searched_at >= ?
      ORDER BY searched_at DESC LIMIT 1
    `).get(effectiveUserId, data.query, data.location || 'India', cutoffTime);
  } else if (data.visitorId) {
    existingRecent = await db.prepare(`
      SELECT id FROM job_searches
      WHERE visitor_id = ? AND LOWER(query) = LOWER(?) AND LOWER(COALESCE(location, '')) = LOWER(?) AND searched_at >= ?
      ORDER BY searched_at DESC LIMIT 1
    `).get(data.visitorId, data.query, data.location || 'India', cutoffTime);
  }

  if (existingRecent) {
    await db.prepare('UPDATE job_searches SET results_count = ?, searched_at = ? WHERE id = ?').run(
      count,
      now,
      existingRecent.id
    );
    return existingRecent.id;
  }

  await db.prepare(`
    INSERT INTO job_searches (id, visitor_id, user_id, query, location, provider, results_count, searched_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.query,
    data.location || 'India',
    provider,
    count,
    now,
    now
  );

  await logAuditEvent({
    eventType: 'JOB_SEARCHED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || data.visitorId,
    description: `${actorName} searched jobs: "${data.query}" in ${data.location || 'India'} (${count} found on ${provider})`,
    metadata: { query: data.query, location: data.location, count, provider, userId: effectiveUserId, userName },
  });

  return id;
}

export async function recordJobMatchEvent(data: {
  visitorId?: string;
  userId?: string;
  resumeId?: string;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  matchScore: number;
  matchedSkills?: string[];
  partialSkills?: string[];
  missingSkills?: string[];
}): Promise<string> {
  const db = getDb();
  const id = `jmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  await db.prepare(`
    INSERT INTO job_matches (
      id, visitor_id, user_id, resume_id, job_id, job_title, company,
      match_score, matched_skills, partial_skills, missing_skills, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.resumeId || null,
    data.jobId || null,
    data.jobTitle || 'Role',
    data.company || 'Company',
    data.matchScore,
    JSON.stringify(data.matchedSkills || []),
    JSON.stringify(data.partialSkills || []),
    JSON.stringify(data.missingSkills || []),
    now
  );

  await logAuditEvent({
    eventType: 'JOB_MATCHED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || data.visitorId,
    description: `${actorName} matched job "${data.jobTitle || 'Role'}" at ${data.company || 'Company'} with score ${Math.round(data.matchScore)}%`,
    metadata: { jobTitle: data.jobTitle, company: data.company, score: data.matchScore, userId: effectiveUserId, userName },
  });

  return id;
}

export async function recordFeedbackEvent(data: {
  visitorId?: string;
  userId?: string;
  rating: number;
  category: string;
  message: string;
  suggestions?: string;
}): Promise<string> {
  const db = getDb();
  const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = data.userId || (data.visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(data.visitorId, data.visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  await db.prepare(`
    INSERT INTO feedback (id, visitor_id, user_id, rating, category, message, suggestions, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `).run(
    id,
    data.visitorId || null,
    effectiveUserId || null,
    data.rating,
    data.category,
    data.message,
    data.suggestions || null,
    now
  );

  await logAuditEvent({
    eventType: 'FEEDBACK_SUBMITTED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || data.visitorId,
    description: `${actorName} submitted feedback (${data.rating}★, ${data.category}): "${data.message.slice(0, 50)}"`,
    metadata: { rating: data.rating, category: data.category, userId: effectiveUserId, userName },
  });

  return id;
}

// ==========================================
// REAL ADMIN ANALYTICS & AGGREGATION QUERIES
// ==========================================

export interface RealAdminStats {
  totalVisitors: number;
  totalResumesAnalyzed: number;
  averageAtsScore: number;
  verifiedSkillsCount: number;
  completedAssessmentsCount: number;
  totalJobSearches: number;
  totalJobMatches: number;
  totalFeedback: number;
  atsHistory: Array<{ date: string; avgScore: number; avgFormatting: number; avgKeywords: number }>;
  skillMastery: Array<{ skill: string; count: number; avgScore: number }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  questionBankStats: {
    totalQuestions: number;
    activeQuestions: number;
    inactiveQuestions: number;
    skillsCovered: number;
  };
}

export async function getRealAdminStats(): Promise<RealAdminStats> {
  const db = getDb();

  const visitorsCount = ((await db.prepare('SELECT COUNT(*) as c FROM visitors').get()) as { c: number }).c;
  const analysesCount = ((await db.prepare('SELECT COUNT(*) as c FROM resume_analyses').get()) as { c: number }).c;
  const avgAts = ((await db.prepare('SELECT ROUND(AVG(ats_score), 1) as a FROM resume_analyses').get()) as { a: number | null }).a || 0;
  const verifiedCount = ((await db.prepare("SELECT COUNT(*) as c FROM verified_skills WHERE status = 'VERIFIED'").get()) as { c: number }).c;
  const assessmentsCount = ((await db.prepare("SELECT COUNT(*) as c FROM assessments WHERE status IN ('passed', 'completed')").get()) as { c: number }).c;
  const jobSearchesCount = ((await db.prepare('SELECT COUNT(*) as c FROM job_searches').get()) as { c: number }).c;
  const jobMatchesCount = ((await db.prepare('SELECT COUNT(*) as c FROM job_matches').get()) as { c: number }).c;
  const feedbackCount = ((await db.prepare('SELECT COUNT(*) as c FROM feedback').get()) as { c: number }).c;

  // Real ATS History: Group by Day (YYYY-MM-DD)
  const atsHistoryRows = await db.prepare(`
    SELECT
      substr(analyzed_at, 1, 10) as date,
      ROUND(AVG(ats_score), 1) as avgScore,
      ROUND(AVG(formatting_score), 1) as avgFormatting,
      ROUND(AVG(keyword_score), 1) as avgKeywords
    FROM resume_analyses
    GROUP BY substr(analyzed_at, 1, 10)
    ORDER BY date ASC
    LIMIT 14
  `).all() as Array<{ date: string; avgScore: number; avgFormatting: number; avgKeywords: number }>;

  // Real Skill Mastery: Verified assessment scores
  const skillMasteryRows = await db.prepare(`
    SELECT
      skill,
      COUNT(*) as count,
      ROUND(AVG(score * 10), 1) as avgScore
    FROM assessments
    WHERE passed = 1
    GROUP BY skill
    ORDER BY count DESC
    LIMIT 8
  `).all() as Array<{ skill: string; count: number; avgScore: number }>;

  // Real Audit Log: strictly from audit_events table. If table has no rows, activities is []
  const auditRows = await db.prepare(`
    SELECT
      a.id,
      a.event_type,
      a.actor_type,
      a.actor_id,
      a.description,
      a.created_at,
      u.name as user_name
    FROM audit_events a
    LEFT JOIN users u ON a.actor_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all() as Array<{
    id: string;
    event_type: string;
    actor_type: string;
    actor_id: string | null;
    description: string;
    created_at: string;
    user_name: string | null;
  }>;

  const activities = auditRows.map((row) => ({
    id: row.id,
    type: row.event_type.toLowerCase(),
    title: formatAuditEventTitle(row.event_type),
    description: row.description,
    userName: row.user_name || 'Name not provided',
    timestamp: formatTimeAgo(row.created_at),
  }));

  // Assessment Question Bank Telemetry
  const qBankStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
      COUNT(DISTINCT skill_slug) as skillsCovered
    FROM assessment_questions
    WHERE is_deleted = 0
  `).get() as { total: number; active: number; inactive: number; skillsCovered: number };

  const usersCount = ((await db.prepare('SELECT COUNT(*) as c FROM users').get()) as { c: number }).c;

  return {
    totalVisitors: usersCount > 0 ? usersCount : visitorsCount,
    totalResumesAnalyzed: analysesCount,
    averageAtsScore: avgAts,
    verifiedSkillsCount: verifiedCount,
    completedAssessmentsCount: assessmentsCount,
    totalJobSearches: jobSearchesCount,
    totalJobMatches: jobMatchesCount,
    totalFeedback: feedbackCount,
    atsHistory: atsHistoryRows,
    skillMastery: skillMasteryRows,
    recentActivities: activities,
    questionBankStats: {
      totalQuestions: qBankStats?.total || 0,
      activeQuestions: qBankStats?.active || 0,
      inactiveQuestions: qBankStats?.inactive || 0,
      skillsCovered: qBankStats?.skillsCovered || 0,
    },
  };
}

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

// ==========================================
// SUBPAGE ADMIN QUERIES & MANAGEMENT
// ==========================================

export async function getAdminByEmail(email: string) {
  const db = getDb();
  return (await db
    .prepare('SELECT id, email, password_hash, role, is_active, last_login_at, created_at FROM admin_users WHERE LOWER(email) = ?')
    .get(email.trim().toLowerCase())) as
    | { id: string; email: string; password_hash: string; role: string; is_active: number; last_login_at: string | null; created_at: string }
    | undefined;
}

export async function recordAdminLogin(id: string, sessionToken?: string) {
  const db = getDb();
  const now = new Date().toISOString();
  if (sessionToken) {
    await db.prepare('UPDATE admin_users SET last_login_at = ?, session_token = ?, updated_at = ? WHERE id = ?').run(now, sessionToken, now, id);
  } else {
    await db.prepare('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  }
}

export async function revokeAdminSession(adminIdOrEmail: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.prepare("UPDATE admin_users SET session_token = 'REVOKED', updated_at = ? WHERE id = ? OR LOWER(email) = ?")
    .run(now, adminIdOrEmail, adminIdOrEmail.toLowerCase());
}

export async function getAdminUsers(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      COALESCE(u.role, 'USER') as role,
      COALESCE(u.is_active, 1) as is_active,
      u.created_at,
      u.last_active_at,
      (SELECT COUNT(*) FROM resumes WHERE user_id = u.id) as resumes_count,
      (SELECT COUNT(*) FROM resume_analyses WHERE user_id = u.id) as analyses_count,
      (SELECT COUNT(*) FROM job_searches WHERE user_id = u.id) as searches_count,
      (SELECT COUNT(*) FROM assessments WHERE user_id = u.id) as assessments_count,
      (SELECT COUNT(*) FROM verified_skills WHERE user_id = u.id AND status = 'VERIFIED') as verified_skills_count
    FROM users u
    ORDER BY u.last_active_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string;
    name: string;
    email: string | null;
    role: string;
    is_active: number;
    created_at: string;
    last_active_at: string;
    resumes_count: number;
    analyses_count: number;
    searches_count: number;
    assessments_count: number;
    verified_skills_count: number;
  }>;
}

export async function getAdminUserDetail(userId: string) {
  const db = getDb();
  const user = await db.prepare('SELECT id, name, email, COALESCE(role, \'USER\') as role, COALESCE(is_active, 1) as is_active, created_at, last_active_at FROM users WHERE id = ?').get(userId) as any;
  if (!user) return null;

  const resumes = await db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC').all(userId);
  const analyses = await db.prepare(`
    SELECT a.*, r.filename
    FROM resume_analyses a
    LEFT JOIN resumes r ON a.resume_id = r.id
    WHERE a.user_id = ?
    ORDER BY a.analyzed_at DESC
  `).all(userId);
  const assessments = await db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const verifiedSkills = await db.prepare('SELECT * FROM verified_skills WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const searches = await db.prepare('SELECT * FROM job_searches WHERE user_id = ? ORDER BY searched_at DESC').all(userId);
  const matches = await db.prepare('SELECT * FROM job_matches WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const jobApplications = await db.prepare('SELECT * FROM job_applications WHERE user_id = ? ORDER BY applied_confirmed_at DESC, created_at DESC').all(userId);
  const feedbackList = await db.prepare('SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC').all(userId);

  return {
    user,
    resumes,
    analyses,
    assessments,
    verifiedSkills,
    searches,
    matches,
    jobApplications,
    feedback: feedbackList,
  };
}

export async function getAdminVisitors(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      v.id,
      v.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      u.email as user_email,
      v.first_seen_at,
      v.last_seen_at,
      v.total_sessions,
      v.user_agent,
      (SELECT COUNT(*) FROM resume_analyses WHERE visitor_id = v.id OR user_id = v.user_id) as analyses_count,
      (SELECT COUNT(*) FROM assessments WHERE visitor_id = v.id OR user_id = v.user_id) as assessments_count,
      (SELECT COUNT(*) FROM job_searches WHERE visitor_id = v.id OR user_id = v.user_id) as searches_count,
      (SELECT COUNT(*) FROM feedback WHERE visitor_id = v.id OR user_id = v.user_id) as feedback_count
    FROM visitors v
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY v.last_seen_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string;
    user_id: string | null;
    user_name: string;
    user_email: string | null;
    first_seen_at: string;
    last_seen_at: string;
    total_sessions: number;
    user_agent: string | null;
    analyses_count: number;
    assessments_count: number;
    searches_count: number;
    feedback_count: number;
  }>;
}

export async function getVisitorActivity(visitorId: string) {
  const db = getDb();
  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ? OR anonymous_id = ? OR user_id = ?').get(visitorId, visitorId, visitorId) as any;
  if (!visitor) return null;

  const actualId = visitor.id;
  const userId = visitor.user_id;

  const resumes = await db.prepare('SELECT * FROM resumes WHERE visitor_id = ? OR user_id = ? ORDER BY uploaded_at DESC').all(actualId, userId || actualId);
  const analyses = await db.prepare('SELECT * FROM resume_analyses WHERE visitor_id = ? OR user_id = ? ORDER BY analyzed_at DESC').all(actualId, userId || actualId);
  const assessments = await db.prepare('SELECT * FROM assessments WHERE visitor_id = ? OR user_id = ? ORDER BY completed_at DESC').all(actualId, userId || actualId);
  const searches = await db.prepare('SELECT * FROM job_searches WHERE visitor_id = ? OR user_id = ? ORDER BY searched_at DESC').all(actualId, userId || actualId);
  const matches = await db.prepare('SELECT * FROM job_matches WHERE visitor_id = ? OR user_id = ? ORDER BY created_at DESC').all(actualId, userId || actualId);
  const feedbackList = await db.prepare('SELECT * FROM feedback WHERE visitor_id = ? OR user_id = ? ORDER BY created_at DESC').all(actualId, userId || actualId);

  return {
    visitor,
    resumes,
    analyses,
    assessments,
    searches,
    matches,
    feedback: feedbackList,
  };
}

export async function getAdminResumeAnalyses(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      a.id,
      a.visitor_id,
      a.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      a.resume_id,
      r.filename,
      a.file_type,
      a.ats_score,
      a.keyword_score,
      a.formatting_score,
      a.section_score,
      a.analysis_status,
      a.detected_keywords,
      a.missing_keywords,
      a.analyzed_at
    FROM resume_analyses a
    LEFT JOIN resumes r ON a.resume_id = r.id
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.analyzed_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminVerifiedSkills(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      s.id,
      s.visitor_id,
      s.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      s.skill_name,
      s.status,
      s.assessment_id,
      s.verified_at,
      s.created_at,
      a.score,
      a.total_questions
    FROM verified_skills s
    LEFT JOIN assessments a ON s.assessment_id = a.id
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminAssessments(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      a.id,
      a.visitor_id,
      a.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      a.skill,
      a.score,
      a.total_questions,
      a.passed,
      a.status,
      a.duration_seconds,
      a.started_at,
      a.completed_at,
      a.proctoring_violation_count,
      a.created_at
    FROM assessments a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminJobSearches(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      j.id,
      j.visitor_id,
      j.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      j.query,
      j.location,
      j.provider,
      j.results_count,
      j.searched_at
    FROM job_searches j
    LEFT JOIN users u ON j.user_id = u.id
    ORDER BY j.searched_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminJobMatches(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      m.id,
      m.visitor_id,
      m.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      m.resume_id,
      m.job_id,
      m.job_title,
      m.company,
      m.match_score,
      m.matched_skills,
      m.partial_skills,
      m.missing_skills,
      m.created_at
    FROM job_matches m
    LEFT JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminJobApplications(limit = 100) {
  const db = getDb();
  return await db.prepare(`
    SELECT
      a.id,
      a.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      COALESCE(u.email, '') as user_email,
      a.job_id,
      a.job_title,
      a.company,
      a.location,
      a.salary,
      a.job_url,
      a.status,
      a.notes,
      a.resume_id,
      a.applied_confirmed_at,
      a.created_at,
      a.updated_at
    FROM job_applications a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(limit);
}

export async function getAdminFeedback(limit = 100, statusFilter?: string) {
  const db = getDb();
  if (statusFilter && statusFilter !== 'all') {
    return await db.prepare(`
      SELECT
        f.id,
        f.visitor_id,
        f.user_id,
        COALESCE(u.name, 'Name not provided') as user_name,
        f.rating,
        f.category,
        f.message,
        f.suggestions,
        f.status,
        f.created_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.status = ?
      ORDER BY f.created_at DESC
      LIMIT ?
    `).all(statusFilter, limit);
  }

  return await db.prepare(`
    SELECT
      f.id,
      f.visitor_id,
      f.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      f.rating,
      f.category,
      f.message,
      f.suggestions,
      f.status,
      f.created_at
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
    LIMIT ?
  `).all(limit);
}

export async function updateFeedbackStatus(id: string, status: string): Promise<boolean> {
  const db = getDb();
  const res = await db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id);
  return res.changes > 0;
}

export async function getDetailedAnalytics() {
  const db = getDb();

  // Resume Analytics
  const totalResumes = ((await db.prepare('SELECT COUNT(*) as c FROM resumes').get()) as { c: number }).c;
  const pdfCount = ((await db.prepare("SELECT COUNT(*) as c FROM resumes WHERE LOWER(file_type) LIKE '%pdf%'").get()) as { c: number }).c;
  const docxCount = ((await db.prepare("SELECT COUNT(*) as c FROM resumes WHERE LOWER(file_type) LIKE '%doc%'").get()) as { c: number }).c;
  const successfulAnalyses = ((await db.prepare("SELECT COUNT(*) as c FROM resume_analyses WHERE analysis_status = 'COMPLETED'").get()) as { c: number }).c;
  const failedAnalyses = ((await db.prepare("SELECT COUNT(*) as c FROM resume_analyses WHERE analysis_status != 'COMPLETED'").get()) as { c: number }).c;

  const scoreStats = await db.prepare(`
    SELECT
      ROUND(AVG(ats_score), 1) as avgAts,
      ROUND(AVG(keyword_score), 1) as avgKeywords,
      ROUND(AVG(formatting_score), 1) as avgFormatting,
      ROUND(AVG(section_score), 1) as avgSection
    FROM resume_analyses
  `).get() as { avgAts: number | null; avgKeywords: number | null; avgFormatting: number | null; avgSection: number | null };

  // Job Analytics
  const totalSearches = ((await db.prepare('SELECT COUNT(*) as c FROM job_searches').get()) as { c: number }).c;

  // Searches today (UTC date substring)
  const todayStr = new Date().toISOString().slice(0, 10);
  const searchesToday = ((await db.prepare("SELECT COUNT(*) as c FROM job_searches WHERE substr(searched_at, 1, 10) = ?").get(todayStr)) as { c: number }).c;

  // Searches this week (past 7 days)
  const pastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const searchesThisWeek = ((await db.prepare("SELECT COUNT(*) as c FROM job_searches WHERE substr(searched_at, 1, 10) >= ?").get(pastWeekDate)) as { c: number }).c;

  const topJobTitles = await db.prepare(`
    SELECT query as title, COUNT(*) as count
    FROM job_searches
    GROUP BY query
    ORDER BY count DESC
    LIMIT 5
  `).all() as Array<{ title: string; count: number }>;

  const topLocations = await db.prepare(`
    SELECT location, COUNT(*) as count
    FROM job_searches
    WHERE location IS NOT NULL AND location != ''
    GROUP BY location
    ORDER BY count DESC
    LIMIT 5
  `).all() as Array<{ location: string; count: number }>;

  const providerCounts = await db.prepare(`
    SELECT provider, COUNT(*) as count, SUM(results_count) as totalResults
    FROM job_searches
    GROUP BY provider
    ORDER BY count DESC
  `).all() as Array<{ provider: string; count: number; totalResults: number }>;

  const avgJobsReturned = ((await db.prepare('SELECT ROUND(AVG(results_count), 1) as avg FROM job_searches').get()) as { avg: number | null }).avg || 0;

  // Assessment Analytics
  const totalAssessments = ((await db.prepare('SELECT COUNT(*) as c FROM assessments').get()) as { c: number }).c;
  const completedAssessments = ((await db.prepare("SELECT COUNT(*) as c FROM assessments WHERE status IN ('passed', 'completed', 'failed')").get()) as { c: number }).c;
  const passedAssessments = ((await db.prepare('SELECT COUNT(*) as c FROM assessments WHERE passed = 1').get()) as { c: number }).c;
  const failedAssessments = ((await db.prepare('SELECT COUNT(*) as c FROM assessments WHERE passed = 0').get()) as { c: number }).c;
  const passRate = completedAssessments > 0 ? Math.round((passedAssessments / completedAssessments) * 100) : 0;

  const assessmentScoreStats = await db.prepare(`
    SELECT
      ROUND(AVG(score * 10), 1) as avgScore,
      ROUND(AVG(duration_seconds), 0) as avgDuration
    FROM assessments
  `).get() as { avgScore: number | null; avgDuration: number | null };

  const topVerifiedSkills = await db.prepare(`
    SELECT skill_name as skill, COUNT(*) as count
    FROM verified_skills
    WHERE status = 'VERIFIED'
    GROUP BY skill_name
    ORDER BY count DESC
    LIMIT 6
  `).all() as Array<{ skill: string; count: number }>;

  // Student Career Funnel Progression
  const totalRegisteredUsers = ((await db.prepare('SELECT COUNT(*) as c FROM users').get()) as { c: number }).c;
  const withProfileCount = ((await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM student_profiles').get()) as { c: number }).c;
  const withResumeCount = ((await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM resumes WHERE user_id IS NOT NULL').get()) as { c: number }).c;
  const withVerifiedSkillCount = ((await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM verified_skills WHERE status = 'VERIFIED'").get()) as { c: number }).c;
  const withInterviewSessionCount = ((await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM user_interview_sessions').get()) as { c: number }).c;
  const withJobApplicationCount = ((await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM job_applications').get()) as { c: number }).c;

  // Career Readiness Distribution
  const readinessDistribution = {
    novice: ((await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM career_readiness_history WHERE overall_level = 'Novice'").get()) as { c: number })?.c || 0,
    developing: ((await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM career_readiness_history WHERE overall_level = 'Developing'").get()) as { c: number })?.c || 0,
    competitive: ((await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM career_readiness_history WHERE overall_level = 'Competitive'").get()) as { c: number })?.c || 0,
    careerReady: ((await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM career_readiness_history WHERE overall_level = 'Career Ready'").get()) as { c: number })?.c || 0,
    totalSnapshots: ((await db.prepare('SELECT COUNT(*) as c FROM career_readiness_history').get()) as { c: number })?.c || 0,
  };

  // Guided Projects Telemetry
  const projectStats = {
    totalGuidedProjects: ((await db.prepare('SELECT COUNT(*) as c FROM guided_projects').get()) as { c: number })?.c || 0,
    completedProjects: ((await db.prepare("SELECT COUNT(*) as c FROM guided_projects WHERE status = 'completed'").get()) as { c: number })?.c || 0,
    inProgressProjects: ((await db.prepare("SELECT COUNT(*) as c FROM guided_projects WHERE status = 'in_progress'").get()) as { c: number })?.c || 0,
  };

  const aiServiceHealth = {
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    geminiStatus: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? 'configured' : 'deterministic_fallback',
    deterministicAtsStatus: 'healthy',
    jobSearchProviders: ['Adzuna', 'Jooble', 'LinkedIn', 'Naukri'],
  };

  return {
    studentFunnel: {
      totalRegisteredUsers,
      withProfileCount,
      withResumeCount,
      withVerifiedSkillCount,
      withInterviewSessionCount,
      withJobApplicationCount,
    },
    readinessDistribution,
    projectStats,
    aiServiceHealth,
    resumeAnalytics: {
      totalResumes,
      pdfCount,
      docxCount,
      successfulAnalyses,
      failedAnalyses,
      avgAtsScore: scoreStats.avgAts || 0,
      avgKeywordScore: scoreStats.avgKeywords || 0,
      avgFormattingScore: scoreStats.avgFormatting || 0,
      avgSectionScore: scoreStats.avgSection || 0,
    },
    jobAnalytics: {
      totalSearches,
      searchesToday,
      searchesThisWeek,
      topJobTitles,
      topLocations,
      providerCounts,
      avgJobsReturned,
    },
    assessmentAnalytics: {
      totalAssessments,
      completedAssessments,
      passedAssessments,
      failedAssessments,
      passRate,
      avgScore: assessmentScoreStats.avgScore || 0,
      avgDurationSeconds: assessmentScoreStats.avgDuration || 0,
      topVerifiedSkills,
    },
  };
}

// ==========================================
// QUESTION BANK MANAGEMENT (CRUD)
// ==========================================

export interface AssessmentQuestionRecord {
  id: string;
  skill_slug: string;
  skill_name: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  time_limit_seconds: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAdminQuestions(options: {
  skill?: string;
  difficulty?: string;
  questionType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  questions: AssessmentQuestionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const db = getDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['is_deleted = 0'];
  const params: any[] = [];

  if (options.skill && options.skill !== 'all') {
    conditions.push('(skill_slug = ? OR LOWER(skill_name) = ?)');
    params.push(options.skill.toLowerCase(), options.skill.toLowerCase());
  }

  if (options.difficulty && options.difficulty !== 'all') {
    conditions.push('LOWER(difficulty) = ?');
    params.push(options.difficulty.toLowerCase());
  }

  if (options.questionType && options.questionType !== 'all') {
    conditions.push('LOWER(question_type) = ?');
    params.push(options.questionType.toLowerCase());
  }

  if (options.status && options.status !== 'all') {
    if (options.status === 'active') {
      conditions.push('is_active = 1');
    } else if (options.status === 'inactive') {
      conditions.push('is_active = 0');
    }
  }

  if (options.search && options.search.trim()) {
    conditions.push('(question_text LIKE ? OR explanation LIKE ?)');
    const term = `%${options.search.trim()}%`;
    params.push(term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await db.prepare(`SELECT COUNT(*) as c FROM assessment_questions ${whereClause}`).get(...params) as { c: number };
  const total = countRow.c;
  const totalPages = Math.ceil(total / limit) || 1;

  const rows = await db.prepare(`
    SELECT * FROM assessment_questions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const questions: AssessmentQuestionRecord[] = rows.map((r) => ({
    id: r.id,
    skill_slug: r.skill_slug,
    skill_name: r.skill_name,
    question_text: r.question_text,
    question_type: r.question_type,
    difficulty: r.difficulty,
    options: JSON.parse(r.options_json || '[]'),
    correct_answer: r.correct_answer,
    explanation: r.explanation,
    time_limit_seconds: r.time_limit_seconds,
    is_active: Boolean(r.is_active),
    is_deleted: Boolean(r.is_deleted),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return { questions, total, page, limit, totalPages };
}

export async function getQuestionById(id: string): Promise<AssessmentQuestionRecord | null> {
  const db = getDb();
  const r = await db.prepare('SELECT * FROM assessment_questions WHERE id = ?').get(id) as any;
  if (!r) return null;

  return {
    id: r.id,
    skill_slug: r.skill_slug,
    skill_name: r.skill_name,
    question_text: r.question_text,
    question_type: r.question_type,
    difficulty: r.difficulty,
    options: JSON.parse(r.options_json || '[]'),
    correct_answer: r.correct_answer,
    explanation: r.explanation,
    time_limit_seconds: r.time_limit_seconds,
    is_active: Boolean(r.is_active),
    is_deleted: Boolean(r.is_deleted),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createQuestion(data: {
  skill: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  time_limit_seconds?: number;
  is_active?: boolean;
}): Promise<string> {
  const db = getDb();
  const slug = skillSlug(data.skill);
  const id = `qst_${slug}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO assessment_questions (
      id, skill_slug, skill_name, question_text, question_type,
      difficulty, options_json, correct_answer, explanation,
      time_limit_seconds, is_active, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    slug,
    data.skill,
    data.question_text,
    data.question_type || 'MCQ',
    data.difficulty || 'Medium',
    JSON.stringify(data.options),
    data.correct_answer,
    data.explanation || null,
    data.time_limit_seconds || 120,
    data.is_active !== false ? 1 : 0,
    now,
    now
  );

  await logAuditEvent({
    eventType: 'QUESTION_CREATED',
    actorType: 'ADMIN',
    description: `Added new question for ${data.skill}: "${data.question_text.slice(0, 50)}..."`,
    metadata: { questionId: id, skill: data.skill, difficulty: data.difficulty },
  });

  return id;
}

export async function updateQuestion(
  id: string,
  data: {
    skill?: string;
    question_text?: string;
    question_type?: string;
    difficulty?: string;
    options?: string[];
    correct_answer?: string;
    explanation?: string;
    time_limit_seconds?: number;
    is_active?: boolean;
  }
): Promise<boolean> {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM assessment_questions WHERE id = ?').get(id) as any;
  if (!existing) return false;

  const now = new Date().toISOString();
  const skill = data.skill || existing.skill_name;
  const slug = skillSlug(skill);
  const questionText = data.question_text !== undefined ? data.question_text : existing.question_text;
  const questionType = data.question_type !== undefined ? data.question_type : existing.question_type;
  const difficulty = data.difficulty !== undefined ? data.difficulty : existing.difficulty;
  const optionsJson = data.options ? JSON.stringify(data.options) : existing.options_json;
  const correctAnswer = data.correct_answer !== undefined ? data.correct_answer : existing.correct_answer;
  const explanation = data.explanation !== undefined ? data.explanation : existing.explanation;
  const timeLimitSeconds = data.time_limit_seconds !== undefined ? data.time_limit_seconds : existing.time_limit_seconds;
  const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active;

  const res = await db.prepare(`
    UPDATE assessment_questions
    SET skill_slug = ?, skill_name = ?, question_text = ?, question_type = ?,
        difficulty = ?, options_json = ?, correct_answer = ?, explanation = ?,
        time_limit_seconds = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    slug,
    skill,
    questionText,
    questionType,
    difficulty,
    optionsJson,
    correctAnswer,
    explanation,
    timeLimitSeconds,
    isActive,
    now,
    id
  );

  await logAuditEvent({
    eventType: 'QUESTION_UPDATED',
    actorType: 'ADMIN',
    description: `Updated question ${id} (${skill})`,
    metadata: { questionId: id, skill },
  });

  return res.changes > 0;
}

export async function toggleQuestionStatus(id: string, isActive: boolean): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const res = await db.prepare('UPDATE assessment_questions SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
  if (res.changes > 0) {
    await logAuditEvent({
      eventType: 'QUESTION_STATUS_CHANGED',
      actorType: 'ADMIN',
      description: `Set question ${id} status to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
      metadata: { questionId: id, isActive },
    });
    return true;
  }
  return false;
}

export async function softDeleteQuestion(id: string): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  // Soft delete preserves historical assessment integrity
  const res = await db.prepare('UPDATE assessment_questions SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?').run(now, id);
  if (res.changes > 0) {
    await logAuditEvent({
      eventType: 'QUESTION_DELETED',
      actorType: 'ADMIN',
      description: `Soft-deleted question ${id} from question bank`,
      metadata: { questionId: id },
    });
    return true;
  }
  return false;
}

// ==========================================
// SKILLS CATALOG & CONFIGURATION
// ==========================================

export async function getSkillsCatalogWithMetrics() {
  const db = getDb();
  const skills = await db.prepare('SELECT * FROM skills_catalog ORDER BY name ASC').all() as any[];

  return Promise.all(skills.map(async (s) => {
    const slug = s.slug;
    const qStats = (await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN LOWER(difficulty) = 'easy' THEN 1 ELSE 0 END) as easy,
        SUM(CASE WHEN LOWER(difficulty) = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN LOWER(difficulty) = 'hard' THEN 1 ELSE 0 END) as hard
      FROM assessment_questions
      WHERE skill_slug = ? AND is_deleted = 0
    `).get(slug)) as any;

    const attemptsCount = ((await db.prepare('SELECT COUNT(*) as c FROM assessments WHERE LOWER(skill) = LOWER(?)').get(s.name)) as { c: number }).c;
    const verifiedCount = ((await db.prepare("SELECT COUNT(*) as c FROM verified_skills WHERE LOWER(skill_name) = LOWER(?) AND status = 'VERIFIED'").get(s.name)) as { c: number }).c;

    const config = (await db.prepare('SELECT * FROM assessment_configs WHERE skill_slug = ?').get(slug)) as any;

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      description: s.description,
      is_active: Boolean(s.is_active),
      totalQuestions: qStats?.total || 0,
      activeQuestions: qStats?.active || 0,
      inactiveQuestions: qStats?.inactive || 0,
      easyQuestions: qStats?.easy || 0,
      mediumQuestions: qStats?.medium || 0,
      hardQuestions: qStats?.hard || 0,
      assessmentCount: attemptsCount,
      verifiedCount: verifiedCount,
      config: config ? {
        questionsCount: config.questions_count,
        passPercentage: config.pass_percentage,
        timeLimitMinutes: config.time_limit_minutes,
      } : {
        questionsCount: 10,
        passPercentage: 70,
        timeLimitMinutes: 20,
      },
    };
  }));
}

export async function toggleSkillStatus(id: string, isActive: boolean): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const res = await db.prepare('UPDATE skills_catalog SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now, id);
  if (res.changes > 0) {
    await logAuditEvent({
      eventType: 'SKILL_STATUS_CHANGED',
      actorType: 'ADMIN',
      description: `Set skill ${id} status to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
      metadata: { skillId: id, isActive },
    });
    return true;
  }
  return false;
}

export async function updateSkill(id: string, data: { name?: string; category?: string; description?: string }): Promise<boolean> {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM skills_catalog WHERE id = ?').get(id) as any;
  if (!existing) return false;

  const now = new Date().toISOString();
  const name = data.name || existing.name;
  const category = data.category || existing.category;
  const description = data.description !== undefined ? data.description : existing.description;
  const slug = skillSlug(name);

  const res = await db.prepare(`
    UPDATE skills_catalog
    SET name = ?, slug = ?, category = ?, description = ?, updated_at = ?
    WHERE id = ?
  `).run(name, slug, category, description, now, id);

  return res.changes > 0;
}

export async function getAssessmentConfigs() {
  const db = getDb();
  return await db.prepare(`
    SELECT
      c.*,
      s.name as skill_name,
      s.category as skill_category
    FROM assessment_configs c
    LEFT JOIN skills_catalog s ON c.skill_slug = s.slug
    ORDER BY s.name ASC
  `).all();
}

export async function updateAssessmentConfig(skillSlug: string, data: { questionsCount?: number; passPercentage?: number; timeLimitMinutes?: number }): Promise<boolean> {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT * FROM assessment_configs WHERE skill_slug = ?').get(skillSlug) as any;

  if (existing) {
    const qCount = data.questionsCount !== undefined ? data.questionsCount : existing.questions_count;
    const pPerc = data.passPercentage !== undefined ? data.passPercentage : existing.pass_percentage;
    const tLim = data.timeLimitMinutes !== undefined ? data.timeLimitMinutes : existing.time_limit_minutes;

    await db.prepare(`
      UPDATE assessment_configs
      SET questions_count = ?, pass_percentage = ?, time_limit_minutes = ?, updated_at = ?
      WHERE skill_slug = ?
    `).run(qCount, pPerc, tLim, now, skillSlug);
  } else {
    await db.prepare(`
      INSERT INTO assessment_configs (id, skill_slug, questions_count, pass_percentage, time_limit_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`cfg_${skillSlug}`, skillSlug, data.questionsCount || 10, data.passPercentage || 70, data.timeLimitMinutes || 20, now, now);
  }

  await logAuditEvent({
    eventType: 'ASSESSMENT_CONFIG_UPDATED',
    actorType: 'ADMIN',
    description: `Updated assessment config for ${skillSlug}`,
    metadata: { skillSlug, ...data },
  });

  return true;
}

// ==========================================
// CANDIDATE EXAM RUNTIME & SNAPSHOT ENGINE
// ==========================================

export async function startAssessmentAttempt(skillName: string, visitorId?: string, userId?: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  attemptId?: string;
  skill?: string;
  durationSeconds?: number;
  passingScore?: number;
  totalQuestions?: number;
  passPercentage?: number;
  questions?: Array<{
    id: string;
    question_text: string;
    question_type: string;
    difficulty: string;
    options: string[];
    time_limit_seconds: number;
  }>;
  startedAt?: string;
}> {
  const db = getDb();
  const slug = skillSlug(skillName);

  // Verify skill exists and is active
  const skillRow = (await db.prepare('SELECT * FROM skills_catalog WHERE slug = ? OR LOWER(name) = ?').get(slug, skillName.toLowerCase())) as any;
  if (skillRow && !skillRow.is_active) {
    return {
      success: false,
      error: 'skill_inactive',
      message: `${skillName} assessment is currently disabled by the administrator.`,
    };
  }

  // Get config
  const config = await db.prepare('SELECT * FROM assessment_configs WHERE skill_slug = ?').get(slug) as any;
  const configuredCount = config?.questions_count || 10;
  const passPercentage = config?.pass_percentage || 70;
  const timeLimitMinutes = config?.time_limit_minutes || 20;

  // Retrieve active, non-deleted questions
  const activeQuestions = await db.prepare(`
    SELECT * FROM assessment_questions
    WHERE skill_slug = ? AND is_active = 1 AND is_deleted = 0
    ORDER BY RANDOM()
  `).all(slug) as any[];

  if (activeQuestions.length === 0) {
    return {
      success: false,
      error: 'insufficient_questions',
      message: `${skillName} assessment is currently unavailable because no active questions are available. Please contact the administrator.`,
    };
  }

  const requiredCount = Math.min(configuredCount, activeQuestions.length);

  const selectedQuestions = activeQuestions.slice(0, requiredCount);
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const effectiveUserId = userId || (visitorId ? (await db.prepare('SELECT user_id FROM visitors WHERE id = ? OR anonymous_id = ?').get(visitorId, visitorId) as any)?.user_id : null);
  const userName = await getUserNameById(effectiveUserId);
  const actorName = userName || 'Name not provided';

  // Create assessment attempt record
  await db.prepare(`
    INSERT INTO assessments (
      id, visitor_id, user_id, skill, score, total_questions,
      passed, status, duration_seconds, started_at, completed_at,
      proctoring_violation_count, created_at
    ) VALUES (?, ?, ?, ?, 0, ?, 0, 'in_progress', ?, ?, NULL, 0, ?)
  `).run(
    attemptId,
    visitorId || null,
    effectiveUserId || null,
    skillRow?.name || skillName,
    requiredCount,
    timeLimitMinutes * 60,
    now,
    now
  );

  // Store snapshots of questions at assessment time to preserve historical correctness!
  const insertSnap = await db.prepare(`
    INSERT INTO assessment_question_snapshots (
      id, assessment_id, question_id, question_order, question_text,
      question_type, difficulty, options_json, correct_answer, explanation,
      selected_answer, is_correct, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
  `);

  for (let idx = 0; idx < selectedQuestions.length; idx++) {
    const q = selectedQuestions[idx];
    await insertSnap.run(
      `snp_${attemptId}_${idx + 1}`,
      attemptId,
      q.id,
      idx + 1,
      q.question_text,
      q.question_type,
      q.difficulty,
      q.options_json,
      q.correct_answer,
      q.explanation || null,
      now
    );
  }

  await logAuditEvent({
    eventType: 'ASSESSMENT_STARTED',
    actorType: effectiveUserId ? 'USER' : 'VISITOR',
    actorId: effectiveUserId || visitorId,
    description: `${actorName} started ${skillRow?.name || skillName} assessment (Attempt ${attemptId})`,
    metadata: { attemptId, skill: skillRow?.name || skillName, questionsCount: requiredCount, userId: effectiveUserId, userName },
  });

  const passingScore = Math.ceil(requiredCount * (passPercentage / 100));

  return {
    success: true,
    attemptId,
    skill: skillRow?.name || skillName,
    durationSeconds: timeLimitMinutes * 60,
    passingScore,
    totalQuestions: requiredCount,
    passPercentage,
    questions: selectedQuestions.map((q, idx) => ({
      id: `snp_${attemptId}_${idx + 1}`, // use snapshot ID for secure answer submission
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      options: JSON.parse(q.options_json || '[]'),
      time_limit_seconds: q.time_limit_seconds || 120,
    })),
    startedAt: now,
  };
}

export async function submitAssessmentAttempt(data: {
  attemptId: string;
  userAnswers: Record<string, string | number>;
  proctoringEvents?: any[];
  durationSeconds?: number;
  terminationReason?: string;
  requesterUserId?: string;
  requesterVisitorId?: string;
}): Promise<{
  id: string;
  skill: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  isTerminated: boolean;
  status: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  violationCount: number;
  terminationReason?: string;
  certificateId?: string;
}> {
  const db = getDb();
  const attempt = await db.prepare('SELECT * FROM assessments WHERE id = ?').get(data.attemptId) as any;
  if (!attempt) {
    return {
      error: 'attempt_not_found',
      message: 'Assessment attempt not found.',
    } as any;
  }

  // Prevent double submission and repeated answer changes after termination or completion
  if (attempt.status !== 'in_progress' && attempt.status !== 'in-progress') {
    const certRow = await db.prepare('SELECT certificate_code FROM certificates WHERE assessment_id = ?').get(attempt.id) as any;
    const isTerm = attempt.status === 'INCOMPLETE';
    return {
      id: attempt.id,
      skill: attempt.skill,
      score: isTerm ? 0 : attempt.score,
      totalQuestions: attempt.total_questions,
      percentage: isTerm ? 0 : (attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0),
      passed: Boolean(attempt.passed),
      isTerminated: isTerm,
      status: attempt.status,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at || attempt.created_at,
      durationSeconds: attempt.duration_seconds,
      violationCount: attempt.proctoring_violation_count,
      terminationReason: attempt.termination_reason || undefined,
      certificateId: isTerm ? undefined : (certRow?.certificate_code || undefined),
    };
  }

  // Validate attempt ownership
  if (data.requesterUserId && attempt.user_id && attempt.user_id !== data.requesterUserId) {
    return {
      error: 'unauthorized_candidate',
      message: 'Unauthorized: assessment attempt belongs to a different candidate.',
    } as any;
  }
  if (data.requesterVisitorId && attempt.visitor_id && attempt.visitor_id !== data.requesterVisitorId && !attempt.user_id) {
    return {
      error: 'unauthorized_visitor',
      message: 'Unauthorized: assessment attempt belongs to a different visitor.',
    } as any;
  }

  const snapshots = await db.prepare(`
    SELECT * FROM assessment_question_snapshots
    WHERE assessment_id = ?
    ORDER BY question_order ASC
  `).all(data.attemptId) as any[];

  let score = 0;
  const updateSnap = await db.prepare(`
    UPDATE assessment_question_snapshots
    SET selected_answer = ?, is_correct = ?
    WHERE id = ?
  `);

  const answersMap = data.userAnswers || (data as any).answers || {};
  for (const snap of snapshots) {
    // User answer might be keyed by snapshot ID or original question ID
    const rawAnswer = answersMap[snap.id] ?? answersMap[snap.question_id];
    let selectedStr = '';
    let isCorrect = false;

    const options: string[] = JSON.parse(snap.options_json || '[]');

    if (typeof rawAnswer === 'number') {
      selectedStr = `Option ${String.fromCharCode(65 + rawAnswer)}`;
      const letter = String.fromCharCode(65 + rawAnswer);
      isCorrect = snap.correct_answer === selectedStr ||
        snap.correct_answer === letter ||
        snap.correct_answer === options[rawAnswer];
    } else if (typeof rawAnswer === 'string') {
      selectedStr = rawAnswer.trim();
      isCorrect = selectedStr.toLowerCase() === snap.correct_answer.trim().toLowerCase() ||
        selectedStr.toLowerCase() === snap.correct_answer.replace('Option ', '').trim().toLowerCase();
    }

    if (isCorrect) {
      score += 1;
    }

    await updateSnap.run(selectedStr || 'Unanswered', isCorrect ? 1 : 0, snap.id);
  }

  const violations = (data.proctoringEvents || []).filter(
    (e: any) => e.severity === 'violation' || e.type === 'TAB_SWITCH' || e.type === 'FULLSCREEN_EXIT'
  );
  const isTerminated = violations.length >= 3 || Boolean(data.terminationReason);
  if (isTerminated) {
    score = 0;
  }

  const totalQuestions = snapshots.length || attempt.total_questions || 10;
  const slug = skillSlug(attempt.skill);
  const config = await db.prepare('SELECT * FROM assessment_configs WHERE skill_slug = ?').get(slug) as any;
  const passPercentage = config?.pass_percentage || 70;
  const passingScore = Math.ceil(totalQuestions * (passPercentage / 100));

  const passed = !isTerminated && score >= passingScore;
  const status = isTerminated ? 'INCOMPLETE' : passed ? 'passed' : 'failed';
  const now = new Date().toISOString();
  
  // Enforce server-side time bounds
  const maxAllowedDuration = (config?.time_limit_minutes || 20) * 60 + 180;
  const duration = Math.min(data.durationSeconds || attempt.duration_seconds || 0, maxAllowedDuration);
  const terminationReason = isTerminated
    ? (data.terminationReason || `Assessment terminated due to exceeding maximum allowed proctoring violations (${violations.length}/3).`)
    : null;

  // Insert individual events into proctoring_events table
  if (Array.isArray(data.proctoringEvents) && data.proctoringEvents.length > 0) {
    const insertEvent = await db.prepare(`
      INSERT OR IGNORE INTO proctoring_events (id, assessment_id, event_type, severity, details, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const evt of data.proctoringEvents) {
      await insertEvent.run(
        evt.id || `pevt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        data.attemptId,
        evt.type || 'UNKNOWN',
        evt.severity || 'info',
        evt.details || '',
        evt.timestamp || now,
        now
      );
    }
  }

  const proctoringEventsJson = JSON.stringify(data.proctoringEvents || []);

  await db.prepare(`
    UPDATE assessments
    SET score = ?, passed = ?, status = ?, duration_seconds = ?,
        completed_at = ?, proctoring_violation_count = ?,
        termination_reason = ?, proctoring_events_json = ?
    WHERE id = ?
  `).run(
    score,
    passed ? 1 : 0,
    status,
    duration,
    now,
    violations.length,
    terminationReason,
    proctoringEventsJson,
    data.attemptId
  );

  const userName = await getUserNameById(attempt.user_id);
  const actorName = userName || 'Name not provided';

  let certificateCode: string | undefined;
  if (passed) {
    const vsId = `vsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.prepare(`
      INSERT INTO verified_skills (id, visitor_id, user_id, skill_name, status, assessment_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'VERIFIED', ?, ?, ?)
    `).run(vsId, attempt.visitor_id || null, attempt.user_id || null, attempt.skill, data.attemptId, now, now);

    if (attempt.user_id) {
      certificateCode = `CERT-${new Date().getFullYear()}-${attempt.skill.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
      const certId = `crt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.prepare(`
        INSERT INTO certificates (id, user_id, assessment_id, skill, score, total_questions, certificate_code, issue_date, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
      `).run(certId, attempt.user_id, data.attemptId, attempt.skill, score, totalQuestions, certificateCode, now, now);

      await syncUserSkillVerification(attempt.user_id, attempt.skill, score, certificateCode, now.split('T')[0]);
    }

    await logAuditEvent({
      eventType: 'SKILL_VERIFIED',
      actorType: attempt.user_id ? 'USER' : 'VISITOR',
      actorId: attempt.user_id || attempt.visitor_id,
      description: `${actorName} verified skill "${attempt.skill}" with score ${score}/${totalQuestions}${certificateCode ? ` (Certificate: ${certificateCode})` : ''}`,
      metadata: { skill: attempt.skill, assessmentId: data.attemptId, score, certificateCode, userId: attempt.user_id, userName },
    });
  }

  await logAuditEvent({
    eventType: isTerminated ? 'ASSESSMENT_TERMINATED' : 'ASSESSMENT_COMPLETED',
    actorType: attempt.user_id ? 'USER' : 'VISITOR',
    actorId: attempt.user_id || attempt.visitor_id,
    description: isTerminated
      ? `${actorName}'s ${attempt.skill} assessment was TERMINATED: ${terminationReason}`
      : `${actorName} completed ${attempt.skill} assessment: ${score}/${totalQuestions} (${passed ? 'PASSED' : 'FAILED'})`,
    metadata: {
      attemptId: data.attemptId,
      skill: attempt.skill,
      score,
      passed,
      violations: violations.length,
      terminationReason,
      userId: attempt.user_id,
      userName,
    },
  });

  if (attempt.user_id) {
    try {
      const { recordStudentReadinessSnapshot } = await import('@/server/services/unifiedStudentContext');
      await recordStudentReadinessSnapshot(
        attempt.user_id,
        'assessment_completed',
        `${passed ? 'Passed' : 'Completed'} ${attempt.skill} assessment (${Math.round((score / totalQuestions) * 100)}%)`
      );
    } catch (snapErr) {
      console.warn('[Assessment Attempt] Non-blocking snapshot error:', snapErr);
    }
  }

  return {
    id: data.attemptId,
    skill: attempt.skill,
    score,
    totalQuestions,
    percentage: isTerminated ? 0 : Math.round((score / totalQuestions) * 100),
    passed,
    isTerminated,
    status,
    startedAt: attempt.started_at,
    completedAt: now,
    durationSeconds: duration,
    violationCount: violations.length,
    terminationReason: terminationReason || undefined,
    certificateId: isTerminated ? undefined : (certificateCode || (passed ? `SRA-VER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined)),
  };
}

export async function getAdminAssessmentAttempts(limit = 100, page = 1) {
  const db = getDb();
  const offset = (Math.max(1, page) - 1) * limit;

  const total = ((await db.prepare('SELECT COUNT(*) as c FROM assessments').get()) as { c: number }).c;
  const rows = await db.prepare(`
    SELECT
      a.id,
      a.visitor_id,
      a.user_id,
      COALESCE(u.name, 'Name not provided') as user_name,
      a.skill,
      a.score,
      a.total_questions,
      a.passed,
      a.status,
      a.duration_seconds,
      a.started_at,
      a.completed_at,
      a.proctoring_violation_count,
      a.termination_reason,
      a.created_at
    FROM assessments a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as any[];

  return {
    attempts: rows.map((r) => ({
      ...r,
      passed: Boolean(r.passed),
      percentage: r.total_questions > 0 ? Math.round((r.score / r.total_questions) * 100) : 0,
      termination_reason: r.termination_reason || null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getAssessmentAttemptDetail(attemptId: string) {
  const db = getDb();
  const attempt = await db.prepare(`
    SELECT
      a.*,
      COALESCE(u.name, 'Name not provided') as user_name,
      u.email as user_email
    FROM assessments a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(attemptId) as any;

  if (!attempt) return null;

  const snapshots = await db.prepare(`
    SELECT * FROM assessment_question_snapshots
    WHERE assessment_id = ?
    ORDER BY question_order ASC
  `).all(attemptId) as any[];

  let proctoringEvents = await db.prepare(`
    SELECT * FROM proctoring_events
    WHERE assessment_id = ?
    ORDER BY timestamp ASC, id ASC
  `).all(attemptId) as any[];

  if (proctoringEvents.length === 0 && attempt.proctoring_events_json) {
    try {
      proctoringEvents = JSON.parse(attempt.proctoring_events_json);
    } catch {}
  }

  return {
    attempt: {
      ...attempt,
      passed: Boolean(attempt.passed),
      percentage: attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
      termination_reason: attempt.termination_reason || null,
      proctoring_violation_count: attempt.proctoring_violation_count || 0,
    },
    snapshots: snapshots.map((s) => ({
      id: s.id,
      questionId: s.question_id,
      questionOrder: s.question_order,
      questionText: s.question_text,
      questionType: s.question_type,
      difficulty: s.difficulty,
      options: JSON.parse(s.options_json || '[]'),
      correctAnswer: s.correct_answer,
      explanation: s.explanation,
      selectedAnswer: s.selected_answer,
      isCorrect: s.is_correct === 1,
    })),
    proctoringEvents: proctoringEvents.map((pe: any) => ({
      id: pe.id,
      type: pe.event_type || pe.type,
      severity: pe.severity,
      details: pe.details,
      timestamp: pe.timestamp,
    })),
  };
}

// ==========================================
// USER DASHBOARD QUERIES (Strict User Isolation)
// ==========================================

export async function getUserDashboardData(userId: string) {
  const db = getDb();

  // 1-10. Consolidated single-query metrics aggregation
  const counts = (await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM resumes WHERE user_id = ?) as resumes_count,
      (SELECT COUNT(*) FROM resume_analyses WHERE user_id = ?) as analyses_count,
      (SELECT AVG(ats_score) FROM resume_analyses WHERE user_id = ?) as avg_ats_score,
      (SELECT COUNT(*) FROM resume_improvements WHERE user_id = ?) as improvements_count,
      (SELECT COUNT(*) FROM job_applications WHERE user_id = ? AND status = 'Applied') as jobs_applied_count,
      (SELECT COUNT(*) FROM job_applications WHERE user_id = ?) as total_applications,
      (SELECT COUNT(*) FROM job_matches WHERE user_id = ?) as job_matches_count,
      (SELECT COUNT(*) FROM verified_skills WHERE user_id = ? AND status = 'VERIFIED') as verified_skills_count,
      (SELECT COUNT(*) FROM assessments WHERE user_id = ? AND status = 'COMPLETED') as assessments_count,
      (SELECT COUNT(*) FROM certificates WHERE user_id = ?) as certificates_count,
      (SELECT COUNT(*) FROM course_progress WHERE user_id = ? AND status = 'Completed') as courses_completed_count
  `).get(
    userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId
  )) as any;

  const resumesCount = counts?.resumes_count || 0;
  const analysesCount = counts?.analyses_count || 0;
  const avgAtsScore = counts?.avg_ats_score ? Math.round(counts.avg_ats_score * 10) / 10 : 0;
  const improvementsCount = counts?.improvements_count || 0;
  const jobsAppliedCount = counts?.jobs_applied_count || 0;
  const totalApplications = counts?.total_applications || 0;
  const jobMatchesCount = counts?.job_matches_count || 0;
  const verifiedSkillsCount = counts?.verified_skills_count || 0;
  const assessmentsCount = counts?.assessments_count || 0;
  const certificatesCount = counts?.certificates_count || 0;
  const coursesCompletedCount = counts?.courses_completed_count || 0;

  // Resume Progress Section (per resume: latest score, previous score, improvement)
  const resumes = await db.prepare(`
    SELECT id, filename, file_type, uploaded_at, created_at
    FROM resumes
    WHERE user_id = ?
    ORDER BY uploaded_at DESC
  `).all(userId) as any[];

  const resumeProgress = await Promise.all(resumes.map(async (r) => {
    const analyses = await db.prepare(`
      SELECT id, ats_score, analyzed_at
      FROM resume_analyses
      WHERE resume_id = ? AND user_id = ?
      ORDER BY analyzed_at DESC
      LIMIT 2
    `).all(r.id, userId) as any[];

    const latest = analyses[0] || null;
    const previous = analyses[1] || null;

    const latestScore = latest ? Math.round(latest.ats_score) : null;
    const previousScore = previous ? Math.round(previous.ats_score) : null;
    const improvement = (latestScore !== null && previousScore !== null) ? (latestScore - previousScore) : null;

    return {
      id: r.id,
      filename: r.filename,
      fileType: r.file_type,
      uploadedAt: r.uploaded_at,
      latestScore,
      previousScore,
      improvement,
      latestAnalysisDate: latest?.analyzed_at || null,
      latestAnalysisId: latest?.id || null,
    };
  }));

  // Recent job applications
  const recentApplications = await db.prepare(`
    SELECT id, job_title, company, location, status, applied_at, created_at, job_url
    FROM job_applications
    WHERE user_id = ?
    ORDER BY applied_at DESC, created_at DESC
    LIMIT 8
  `).all(userId) as any[];

  // Application activity timeline (all applications for the user across time)
  const applicationTimeline = await db.prepare(`
    SELECT id, applied_at, status, created_at
    FROM job_applications
    WHERE user_id = ?
    ORDER BY applied_at ASC, created_at ASC
  `).all(userId) as any[];

  // Recent assessments
  const recentAssessments = await db.prepare(`
    SELECT id, skill, score, total_questions, passed, status, completed_at
    FROM assessments
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 4
  `).all(userId) as any[];

  // Recent improvements
  const recentImprovements = await db.prepare(`
    SELECT id, category, title, before_text, after_text, created_at
    FROM resume_improvements
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 4
  `).all(userId) as any[];

  const studentProfile = await getStudentProfile(userId);
  const timeline = await getStudentCareerTimeline(userId);
  const achievements = await getStudentAchievements(userId);

  return JSON.parse(
    JSON.stringify({
      metrics: {
        totalResumes: resumesCount,
        totalAnalyses: analysesCount,
        avgAtsScore,
        improvementsMade: improvementsCount,
        jobsApplied: jobsAppliedCount,
        totalApplications,
        jobMatches: jobMatchesCount,
        verifiedSkills: verifiedSkillsCount,
        assessmentsCompleted: assessmentsCount,
        certificatesEarned: certificatesCount,
        coursesCompleted: coursesCompletedCount,
      },
      resumeProgress,
      recentApplications,
      applicationTimeline,
      recentAssessments,
      recentImprovements,
      studentProfile,
      timeline,
      achievements,
    })
  );
}

export async function getStudentCareerTimeline(
  userId: string,
  limit = 20
): Promise<Array<{
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  href?: string;
  meta?: Record<string, any>;
}>> {
  if (!userId) return [];
  const db = getDb();
  const events: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    badge?: string;
    href?: string;
    meta?: Record<string, any>;
  }> = [];

  try {
    // 1. Student Profile
    const sp = (await db
      .prepare('SELECT id, target_role, degree, institution, created_at, updated_at FROM student_profiles WHERE user_id = ?')
      .get(userId)) as any;
    if (sp) {
      events.push({
        id: `ev_prof_${sp.id}`,
        type: 'profile_completed',
        title: 'Student Career Profile Set',
        description: `Profile established for ${sp.target_role || 'Software Role'} (${sp.degree || 'Degree'} at ${sp.institution || 'University'}).`,
        timestamp: sp.updated_at || sp.created_at,
        badge: 'Profile',
        href: '/dashboard/profile',
      });
    }

    // 2. Resume Analyses
    const analyses = (await db
      .prepare(`
        SELECT a.id, a.ats_score, a.analyzed_at, r.filename
        FROM resume_analyses a
        LEFT JOIN resumes r ON a.resume_id = r.id
        WHERE a.user_id = ?
        ORDER BY a.analyzed_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const a of analyses) {
      events.push({
        id: `ev_anl_${a.id}`,
        type: 'resume_analyzed',
        title: 'Resume ATS Audit Completed',
        description: `Analyzed "${a.filename || 'Resume Document'}" with ${Math.round(a.ats_score)}/100 ATS alignment.`,
        timestamp: a.analyzed_at,
        badge: `${Math.round(a.ats_score)} ATS`,
        href: '/dashboard/resumes',
        meta: { atsScore: a.ats_score },
      });
    }

    // 3. Proctored Assessments
    const assessments = (await db
      .prepare(`
        SELECT id, skill, score, total_questions, passed, completed_at, created_at
        FROM assessments
        WHERE user_id = ? AND status IN ('passed', 'completed', 'failed')
        ORDER BY completed_at DESC, created_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const asm of assessments) {
      const percentage = asm.total_questions > 0 ? Math.round((asm.score / asm.total_questions) * 100) : 0;
      events.push({
        id: `ev_asm_${asm.id}`,
        type: 'assessment_completed',
        title: `${asm.passed ? 'Verified Assessment Passed' : 'Skill Assessment Completed'}: ${asm.skill}`,
        description: `Scored ${asm.score}/${asm.total_questions} (${percentage}%) on proctored technical evaluation.`,
        timestamp: asm.completed_at || asm.created_at,
        badge: asm.passed ? 'Passed' : 'Completed',
        href: '/skills',
        meta: { skill: asm.skill, passed: Boolean(asm.passed), score: asm.score },
      });
    }

    // 4. Guided Capstones
    const projects = (await db
      .prepare(`
        SELECT id, title, current_milestone, progress_percent, status, created_at, updated_at
        FROM guided_projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const p of projects) {
      if (p.status === 'completed' || p.progress_percent >= 100) {
        events.push({
          id: `ev_prj_comp_${p.id}`,
          type: 'project_completed',
          title: `Capstone Completed: ${p.title}`,
          description: `Finished all project milestones with verified architecture and code implementation.`,
          timestamp: p.updated_at || p.created_at,
          badge: 'Completed',
          href: `/projects?id=${p.id}`,
        });
      } else if (p.progress_percent > 0) {
        events.push({
          id: `ev_prj_prog_${p.id}`,
          type: 'project_milestone',
          title: `Project Milestone Advanced: ${p.title}`,
          description: `Advanced to milestone ${p.current_milestone || 1} with ${p.progress_percent}% completion.`,
          timestamp: p.updated_at || p.created_at,
          badge: `${p.progress_percent}%`,
          href: `/projects?id=${p.id}`,
        });
      } else {
        events.push({
          id: `ev_prj_init_${p.id}`,
          type: 'project_milestone',
          title: `Capstone Started: ${p.title}`,
          description: `Initialized milestone blueprint and architecture specification.`,
          timestamp: p.created_at,
          badge: 'Started',
          href: `/projects?id=${p.id}`,
        });
      }
    }

    // 5. Interview Sessions
    const interviews = (await db
      .prepare(`
        SELECT id, target_role, overall_score, status, created_at, updated_at
        FROM user_interview_sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const inv of interviews) {
      events.push({
        id: `ev_int_${inv.id}`,
        type: 'interview_completed',
        title: `AI Mock Interview: ${inv.target_role || 'Technical Role'}`,
        description: inv.status === 'completed' && inv.overall_score
          ? `Completed full mock interview with AI evaluation score of ${inv.overall_score}/100.`
          : `Practiced realistic technical interview questions with STAR feedback.`,
        timestamp: inv.updated_at || inv.created_at,
        badge: inv.overall_score ? `${inv.overall_score}/100` : 'Interview',
        href: '/interview-prep',
        meta: { score: inv.overall_score },
      });
    }

    // 6. Job Applications
    const applications = (await db
      .prepare(`
        SELECT id, job_title, company, status, applied_at, created_at
        FROM job_applications
        WHERE user_id = ?
        ORDER BY applied_at DESC, created_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const app of applications) {
      events.push({
        id: `ev_app_${app.id}`,
        type: 'job_applied',
        title: `Application Tracked: ${app.company}`,
        description: `${app.job_title} — stage updated to "${app.status}".`,
        timestamp: app.applied_at || app.created_at,
        badge: app.status,
        href: '/dashboard/applications',
        meta: { company: app.company, status: app.status },
      });
    }

    // 7. Verified Certificates
    const certs = (await db
      .prepare(`
        SELECT id, skill, score, total_questions, certificate_code, issue_date, created_at
        FROM certificates
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 6
      `)
      .all(userId)) as any[];
    for (const c of certs) {
      events.push({
        id: `ev_cert_${c.id}`,
        type: 'certificate_earned',
        title: `Certificate Earned: ${c.skill}`,
        description: `Official credential issued (${c.certificate_code}) with verified proctored score.`,
        timestamp: c.issue_date || c.created_at,
        badge: 'Verified',
        href: '/dashboard/certificates',
        meta: { certificateCode: c.certificate_code },
      });
    }
  } catch (err) {
    console.warn('[getStudentCareerTimeline] Error compiling timeline:', err);
  }

  // Sort chronologically descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, limit);
}

export async function getStudentAchievements(userId: string): Promise<Array<{
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  badge: string;
  href?: string;
}>> {
  if (!userId) return [];
  const db = getDb();
  const achievements: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    date: string;
    badge: string;
    href?: string;
  }> = [];

  try {
    // 1. Certificates
    const certs = (await db
      .prepare(`
        SELECT id, skill, score, total_questions, certificate_code, issue_date, created_at
        FROM certificates
        WHERE user_id = ?
        ORDER BY created_at DESC
      `)
      .all(userId)) as any[];
    for (const c of certs) {
      const pct = c.total_questions > 0 ? Math.round((c.score / c.total_questions) * 100) : 0;
      achievements.push({
        id: `ach_cert_${c.id}`,
        type: 'certificate',
        title: `${c.skill} Certified`,
        subtitle: `Proctored verification badge (${pct}% score) • ${c.certificate_code}`,
        date: c.issue_date || c.created_at,
        badge: 'Verified Skill',
        href: '/dashboard/certificates',
      });
    }

    // 2. Completed Guided Projects
    const compProjects = (await db
      .prepare(`
        SELECT id, title, tech_stack, updated_at, created_at
        FROM guided_projects
        WHERE user_id = ? AND (status = 'completed' OR progress_percent >= 100)
        ORDER BY updated_at DESC
      `)
      .all(userId)) as any[];
    for (const p of compProjects) {
      let stackStr = '';
      try {
        const stack = JSON.parse(p.tech_stack || '[]');
        stackStr = Array.isArray(stack) ? stack.slice(0, 3).join(', ') : '';
      } catch {}
      achievements.push({
        id: `ach_prj_${p.id}`,
        type: 'project',
        title: `${p.title} Finished`,
        subtitle: `All milestones completed and verified${stackStr ? ` (${stackStr})` : ''}`,
        date: p.updated_at || p.created_at,
        badge: 'Capstone Evidence',
        href: `/projects?id=${p.id}`,
      });
    }

    // 3. Top ATS Score >= 75
    const topAts = (await db
      .prepare(`
        SELECT a.id, a.ats_score, a.analyzed_at, r.filename
        FROM resume_analyses a
        LEFT JOIN resumes r ON a.resume_id = r.id
        WHERE a.user_id = ? AND a.ats_score >= 75
        ORDER BY a.ats_score DESC, a.analyzed_at DESC
        LIMIT 1
      `)
      .get(userId)) as any;
    if (topAts) {
      achievements.push({
        id: `ach_ats_${topAts.id}`,
        type: 'ats_milestone',
        title: 'ATS Target Benchmark Met',
        subtitle: `Achieved ${Math.round(topAts.ats_score)}/100 recruiter parser score on ${topAts.filename || 'resume'}`,
        date: topAts.analyzed_at,
        badge: `${Math.round(topAts.ats_score)} ATS`,
        href: '/dashboard/resumes',
      });
    }

    // 4. Interview Mastery >= 70
    const topInt = (await db
      .prepare(`
        SELECT id, target_role, overall_score, updated_at, created_at
        FROM user_interview_sessions
        WHERE user_id = ? AND overall_score >= 70
        ORDER BY overall_score DESC, updated_at DESC
        LIMIT 1
      `)
      .get(userId)) as any;
    if (topInt) {
      achievements.push({
        id: `ach_int_${topInt.id}`,
        type: 'interview_mastery',
        title: 'Interview Fluency Milestone',
        subtitle: `Demonstrated ${topInt.overall_score}/100 fluency on ${topInt.target_role || 'technical'} mock interview`,
        date: topInt.updated_at || topInt.created_at,
        badge: `${topInt.overall_score}/100`,
        href: '/interview-prep',
      });
    }
  } catch (err) {
    console.warn('[getStudentAchievements] Error compiling achievements:', err);
  }

  // Sort by date descending
  achievements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return achievements;
}

export async function getUserResumes(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT
      r.id,
      r.filename,
      r.file_type,
      r.uploaded_at,
      r.parsed_successfully,
      r.resume_data,
      (SELECT COUNT(*) FROM resume_analyses WHERE resume_id = r.id AND user_id = r.user_id) as analyses_count,
      (SELECT COUNT(*) FROM resume_versions WHERE resume_id = r.id AND user_id = r.user_id) as versions_count,
      (SELECT ats_score FROM resume_analyses WHERE resume_id = r.id AND user_id = r.user_id ORDER BY analyzed_at DESC LIMIT 1) as latest_ats_score,
      (SELECT id FROM resume_analyses WHERE resume_id = r.id AND user_id = r.user_id ORDER BY analyzed_at DESC LIMIT 1) as latest_analysis_id
    FROM resumes r
    WHERE r.user_id = ?
    ORDER BY r.uploaded_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    ...r,
    resumeData: r.resume_data ? (typeof r.resume_data === 'string' ? JSON.parse(r.resume_data) : r.resume_data) : null,
    parsedSuccessfully: Boolean(r.parsed_successfully),
    latestAtsScore: r.latest_ats_score !== null ? Math.round(r.latest_ats_score) : null,
    versionsCount: Number(r.versions_count || 0),
  }));
}

export async function getUserAnalyses(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT
      a.*,
      COALESCE(r.filename, 'Resume Document') as resume_filename
    FROM resume_analyses a
    LEFT JOIN resumes r ON a.resume_id = r.id
    WHERE a.user_id = ?
    ORDER BY a.analyzed_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    resumeId: r.resume_id,
    resumeFilename: r.resume_filename,
    fileType: r.file_type,
    analyzedAt: r.analyzed_at,
    atsScore: Math.round(r.ats_score),
    keywordScore: Math.round(r.keyword_score),
    formattingScore: Math.round(r.formatting_score),
    sectionScore: Math.round(r.section_score),
    analysisStatus: r.analysis_status,
    detectedKeywords: JSON.parse(r.detected_keywords || '[]'),
    missingKeywords: JSON.parse(r.missing_keywords || '[]'),
  }));
}

export async function getUserSingleAnalysis(userId: string, analysisId: string) {
  const db = getDb();
  const row = await db.prepare(`
    SELECT
      a.*,
      COALESCE(r.filename, 'Resume Document') as resume_filename
    FROM resume_analyses a
    LEFT JOIN resumes r ON a.resume_id = r.id
    WHERE a.id = ? AND a.user_id = ?
  `).get(analysisId, userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    resumeId: row.resume_id,
    resumeFilename: row.resume_filename,
    fileType: row.file_type,
    analyzedAt: row.analyzed_at,
    atsScore: Math.round(row.ats_score),
    keywordScore: Math.round(row.keyword_score),
    formattingScore: Math.round(row.formatting_score),
    sectionScore: Math.round(row.section_score),
    analysisStatus: row.analysis_status,
    detectedKeywords: JSON.parse(row.detected_keywords || '[]'),
    missingKeywords: JSON.parse(row.missing_keywords || '[]'),
  };
}

export async function getUserImprovements(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT
      i.*,
      COALESCE(r.filename, 'Active Resume') as resume_filename
    FROM resume_improvements i
    LEFT JOIN resumes r ON i.resume_id = r.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    resumeId: r.resume_id,
    resumeFilename: r.resume_filename,
    category: r.category,
    title: r.title,
    beforeText: r.before_text,
    afterText: r.after_text,
    createdAt: r.created_at,
  }));
}

export async function getUserJobApplications(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT *
    FROM job_applications
    WHERE user_id = ?
    ORDER BY applied_at DESC, created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    company: r.company,
    location: r.location,
    source: r.source,
    jobUrl: r.job_url,
    appliedAt: r.applied_at,
    status: r.status,
    notes: r.notes,
    resumeId: r.resume_id,
    appliedConfirmedAt: r.applied_confirmed_at,
    descriptionSnippet: r.description_snippet || null,
    salary: r.salary || null,
    coverLetter: r.cover_letter || null,
    tailoredSummary: r.tailored_summary || null,
    checklistState: r.checklist_state || null,
    matchAnalysis: r.match_analysis || null,
    interviewDate: r.interview_date || null,
    outreachMessage: r.outreach_message || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    user_id: r.user_id,
    job_id: r.job_id,
    job_title: r.job_title,
    job_url: r.job_url,
    applied_at: r.applied_at,
    resume_id: r.resume_id,
    applied_confirmed_at: r.applied_confirmed_at,
    description_snippet: r.description_snippet || null,
    cover_letter: r.cover_letter || null,
    tailored_summary: r.tailored_summary || null,
    checklist_state: r.checklist_state || null,
    match_analysis: r.match_analysis || null,
    interview_date: r.interview_date || null,
    outreach_message: r.outreach_message || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getJobApplicationById(userId: string, applicationId: string) {
  if (!userId || !applicationId) return null;
  const db = getDb();
  const r = (await db
    .prepare('SELECT * FROM job_applications WHERE id = ? AND user_id = ?')
    .get(applicationId, userId)) as any;
  if (!r) return null;

  return {
    id: r.id,
    userId: r.user_id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    company: r.company,
    location: r.location,
    source: r.source,
    jobUrl: r.job_url,
    appliedAt: r.applied_at,
    status: r.status,
    notes: r.notes,
    resumeId: r.resume_id,
    appliedConfirmedAt: r.applied_confirmed_at,
    descriptionSnippet: r.description_snippet || null,
    salary: r.salary || null,
    coverLetter: r.cover_letter || null,
    tailoredSummary: r.tailored_summary || null,
    checklistState: r.checklist_state || null,
    matchAnalysis: r.match_analysis || null,
    interviewDate: r.interview_date || null,
    outreachMessage: r.outreach_message || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    user_id: r.user_id,
    job_id: r.job_id,
    job_title: r.job_title,
    job_url: r.job_url,
    applied_at: r.applied_at,
    resume_id: r.resume_id,
    applied_confirmed_at: r.applied_confirmed_at,
    description_snippet: r.description_snippet || null,
    cover_letter: r.cover_letter || null,
    tailored_summary: r.tailored_summary || null,
    checklist_state: r.checklist_state || null,
    match_analysis: r.match_analysis || null,
    interview_date: r.interview_date || null,
    outreach_message: r.outreach_message || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createJobApplication(userId: string, data: {
  jobId?: string;
  jobTitle: string;
  company: string;
  location?: string;
  source?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: string;
  notes?: string;
  resumeId?: string;
  appliedConfirmedAt?: string;
  descriptionSnippet?: string;
  salary?: string;
  coverLetter?: string;
  tailoredSummary?: string;
  checklistState?: string;
  matchAnalysis?: string;
  interviewDate?: string;
  outreachMessage?: string;
}) {
  const db = getDb();
  const cleanTitle = data.jobTitle.trim();
  const cleanCompany = data.company.trim();

  // Deduplication check: verify if an application for this user and job already exists
  let existing: any = null;
  if (data.jobId) {
    existing = await db.prepare('SELECT * FROM job_applications WHERE user_id = ? AND job_id = ?').get(userId, data.jobId);
  }
  if (!existing && cleanCompany && cleanTitle) {
    existing = await db.prepare(
      'SELECT * FROM job_applications WHERE user_id = ? AND LOWER(company) = LOWER(?) AND LOWER(job_title) = LOWER(?)'
    ).get(userId, cleanCompany, cleanTitle);
  }

  const now = new Date().toISOString();

  if (existing) {
    // Update existing record rather than creating a duplicate
    const ADVANCED_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
    let newStatus = data.status || existing.status;
    if (
      existing.status &&
      ADVANCED_STATUSES.includes(existing.status) &&
      (data.status === 'Application pending' || data.status === 'Saved' || data.status === 'Ready to apply')
    ) {
      // Do not downgrade an already applied or interviewing application
      newStatus = existing.status;
    }
    const newAppliedAt = data.appliedAt || existing.applied_at;
    const newResumeId = data.resumeId !== undefined ? data.resumeId : existing.resume_id;
    const newNotes = data.notes !== undefined ? data.notes : existing.notes;
    const newConfirmedAt = data.appliedConfirmedAt !== undefined ? data.appliedConfirmedAt : existing.applied_confirmed_at;
    const newJobUrl = data.jobUrl || existing.job_url;
    const newCoverLetter = data.coverLetter !== undefined ? data.coverLetter : existing.cover_letter;
    const newTailoredSummary = data.tailoredSummary !== undefined ? data.tailoredSummary : existing.tailored_summary;
    const newChecklistState = data.checklistState !== undefined ? data.checklistState : existing.checklist_state;
    const newMatchAnalysis = data.matchAnalysis !== undefined ? data.matchAnalysis : existing.match_analysis;
    const newInterviewDate = data.interviewDate !== undefined ? data.interviewDate : existing.interview_date;
    const newOutreachMessage = data.outreachMessage !== undefined ? data.outreachMessage : existing.outreach_message;

    await db.prepare(`
      UPDATE job_applications
      SET status = ?, applied_at = ?, resume_id = ?, notes = ?, applied_confirmed_at = ?, job_url = ?,
          cover_letter = ?, tailored_summary = ?, checklist_state = ?, match_analysis = ?,
          interview_date = ?, outreach_message = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      newStatus,
      newAppliedAt,
      newResumeId,
      newNotes,
      newConfirmedAt,
      newJobUrl,
      newCoverLetter || null,
      newTailoredSummary || null,
      newChecklistState || null,
      newMatchAnalysis || null,
      newInterviewDate || null,
      newOutreachMessage || null,
      now,
      existing.id,
      userId
    );

    return {
      id: existing.id,
      userId,
      jobId: existing.job_id,
      jobTitle: existing.job_title,
      company: existing.company,
      location: existing.location,
      source: existing.source,
      jobUrl: newJobUrl,
      appliedAt: newAppliedAt,
      status: newStatus,
      notes: newNotes,
      resumeId: newResumeId,
      appliedConfirmedAt: newConfirmedAt,
      coverLetter: newCoverLetter || null,
      tailoredSummary: newTailoredSummary || null,
      checklistState: newChecklistState || null,
      matchAnalysis: newMatchAnalysis || null,
      interviewDate: newInterviewDate || null,
      outreachMessage: newOutreachMessage || null,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const appliedAt = data.appliedAt || now.split('T')[0];
  const status = data.status || 'Applied';

  await db.prepare(`
    INSERT INTO job_applications (
      id, user_id, job_id, job_title, company, location, source,
      job_url, applied_at, status, notes, resume_id, applied_confirmed_at,
      description_snippet, salary, cover_letter, tailored_summary, checklist_state,
      match_analysis, interview_date, outreach_message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.jobId || null,
    cleanTitle,
    cleanCompany,
    data.location?.trim() || null,
    data.source?.trim() || 'Manual',
    data.jobUrl?.trim() || null,
    appliedAt,
    status,
    data.notes?.trim() || null,
    data.resumeId || null,
    data.appliedConfirmedAt || (status === 'Applied' ? now : null),
    data.descriptionSnippet?.trim() || null,
    data.salary?.trim() || null,
    data.coverLetter || null,
    data.tailoredSummary || null,
    data.checklistState || null,
    data.matchAnalysis || null,
    data.interviewDate || null,
    data.outreachMessage || null,
    now,
    now
  );

  return {
    id,
    userId,
    jobId: data.jobId || null,
    jobTitle: cleanTitle,
    company: cleanCompany,
    location: data.location || null,
    source: data.source || 'Manual',
    jobUrl: data.jobUrl || null,
    appliedAt,
    status,
    notes: data.notes || null,
    resumeId: data.resumeId || null,
    appliedConfirmedAt: data.appliedConfirmedAt || (status === 'Applied' ? now : null),
    descriptionSnippet: data.descriptionSnippet || null,
    salary: data.salary || null,
    coverLetter: data.coverLetter || null,
    tailoredSummary: data.tailoredSummary || null,
    checklistState: data.checklistState || null,
    matchAnalysis: data.matchAnalysis || null,
    interviewDate: data.interviewDate || null,
    outreachMessage: data.outreachMessage || null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateJobApplication(userId: string, applicationId: string, data: {
  jobTitle?: string;
  company?: string;
  location?: string;
  source?: string;
  jobUrl?: string;
  appliedAt?: string;
  status?: string;
  notes?: string;
  resumeId?: string;
  appliedConfirmedAt?: string;
  descriptionSnippet?: string;
  salary?: string;
  coverLetter?: string;
  tailoredSummary?: string;
  checklistState?: string;
  matchAnalysis?: string;
  interviewDate?: string;
  outreachMessage?: string;
}) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM job_applications WHERE id = ? AND user_id = ?').get(applicationId, userId) as any;
  if (!existing) {
    throw new Error('Job application not found or unauthorized.');
  }

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE job_applications
    SET job_title = COALESCE(?, job_title),
        company = COALESCE(?, company),
        location = COALESCE(?, location),
        source = COALESCE(?, source),
        job_url = COALESCE(?, job_url),
        applied_at = COALESCE(?, applied_at),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        resume_id = COALESCE(?, resume_id),
        applied_confirmed_at = COALESCE(?, applied_confirmed_at),
        description_snippet = COALESCE(?, description_snippet),
        salary = COALESCE(?, salary),
        cover_letter = COALESCE(?, cover_letter),
        tailored_summary = COALESCE(?, tailored_summary),
        checklist_state = COALESCE(?, checklist_state),
        match_analysis = COALESCE(?, match_analysis),
        interview_date = COALESCE(?, interview_date),
        outreach_message = COALESCE(?, outreach_message),
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    data.jobTitle !== undefined ? data.jobTitle.trim() : null,
    data.company !== undefined ? data.company.trim() : null,
    data.location !== undefined ? data.location.trim() : null,
    data.source !== undefined ? data.source.trim() : null,
    data.jobUrl !== undefined ? data.jobUrl.trim() : null,
    data.appliedAt !== undefined ? data.appliedAt : null,
    data.status !== undefined ? data.status : null,
    data.notes !== undefined ? data.notes.trim() : null,
    data.resumeId !== undefined ? data.resumeId : null,
    data.appliedConfirmedAt !== undefined ? data.appliedConfirmedAt : null,
    data.descriptionSnippet !== undefined ? data.descriptionSnippet.trim() : null,
    data.salary !== undefined ? data.salary.trim() : null,
    data.coverLetter !== undefined ? data.coverLetter : null,
    data.tailoredSummary !== undefined ? data.tailoredSummary : null,
    data.checklistState !== undefined ? data.checklistState : null,
    data.matchAnalysis !== undefined ? data.matchAnalysis : null,
    data.interviewDate !== undefined ? data.interviewDate : null,
    data.outreachMessage !== undefined ? data.outreachMessage : null,
    now,
    applicationId,
    userId
  );

  return await getJobApplicationById(userId, applicationId);
}

export async function confirmJobApplication(userId: string, applicationId: string, status: string, resumeId?: string) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM job_applications WHERE id = ? AND user_id = ?').get(applicationId, userId) as any;
  if (!existing) {
    throw new Error('Application not found or unauthorized.');
  }
  const now = new Date().toISOString();
  const confirmedAt = status === 'Applied' ? now : existing.applied_confirmed_at;
  const appliedAt = status === 'Applied' ? (existing.applied_at || now.split('T')[0]) : existing.applied_at;

  await db.prepare(`
    UPDATE job_applications
    SET status = ?, applied_at = ?, applied_confirmed_at = ?, resume_id = COALESCE(?, resume_id), updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(status, appliedAt, confirmedAt, resumeId || null, now, applicationId, userId);

  return await db.prepare('SELECT * FROM job_applications WHERE id = ? AND user_id = ?').get(applicationId, userId);
}

export function areResumeDatasEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  let parsedA = a;
  let parsedB = b;

  if (typeof a === 'string') {
    try { parsedA = JSON.parse(a); } catch { parsedA = a; }
  }
  if (typeof b === 'string') {
    try { parsedB = JSON.parse(b); } catch { parsedB = b; }
  }

  if (typeof parsedA !== 'object' || typeof parsedB !== 'object') {
    return parsedA === parsedB;
  }

  function canonicalize(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(canonicalize);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      const val = obj[key];
      if (val !== undefined) {
        result[key] = canonicalize(val);
      }
    }
    return result;
  }

  return JSON.stringify(canonicalize(parsedA)) === JSON.stringify(canonicalize(parsedB));
}

export async function runDatabaseMigrations(dbClient?: DatabaseClient): Promise<{
  applied: string[];
  skipped: string[];
  success: boolean;
}> {
  const db = dbClient || getDb();
  const applied: string[] = [];
  const skipped: string[] = [];

  // 1. Ensure resume_versions table
  const createResumeVersionsSql = `
    CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resume_id TEXT,
      version_number INTEGER NOT NULL DEFAULT 1,
      resume_data TEXT NOT NULL,
      change_summary TEXT,
      created_at TEXT NOT NULL
    );
  `;
  try {
    await db.exec(createResumeVersionsSql);
    applied.push('CREATE TABLE IF NOT EXISTS resume_versions');
  } catch (err: any) {
    skipped.push(`resume_versions: ${err?.message}`);
  }

  // 2. Ensure indexes on resume_versions
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_resume_ver_user ON resume_versions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_resume_ver_res ON resume_versions(resume_id);',
    'CREATE INDEX IF NOT EXISTS idx_resume_ver_order ON resume_versions(user_id, resume_id, version_number DESC);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_ver_unique ON resume_versions(user_id, resume_id, version_number);',
  ];
  for (const idxSql of indexes) {
    try {
      await db.exec(idxSql);
      applied.push(idxSql.split('ON')[0].trim());
    } catch (err: any) {
      skipped.push(`${idxSql}: ${err?.message}`);
    }
  }

  // 3. Ensure required columns on job_applications and resumes
  const columns = [
    { table: 'job_applications', column: 'resume_id', type: 'TEXT' },
    { table: 'job_applications', column: 'applied_confirmed_at', type: 'TEXT' },
    { table: 'job_applications', column: 'description_snippet', type: 'TEXT' },
    { table: 'job_applications', column: 'salary', type: 'TEXT' },
    { table: 'job_applications', column: 'cover_letter', type: 'TEXT' },
    { table: 'job_applications', column: 'tailored_summary', type: 'TEXT' },
    { table: 'job_applications', column: 'checklist_state', type: 'TEXT' },
    { table: 'job_applications', column: 'match_analysis', type: 'TEXT' },
    { table: 'job_applications', column: 'interview_date', type: 'TEXT' },
    { table: 'job_applications', column: 'outreach_message', type: 'TEXT' },
    { table: 'resumes', column: 'user_id', type: 'TEXT' },
    { table: 'resumes', column: 'resume_data', type: 'TEXT' },
  ];

  for (const col of columns) {
    const alterSql = `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type};`;
    try {
      await db.exec(alterSql);
      applied.push(`Added ${col.table}.${col.column}`);
    } catch {
      // In SQLite: duplicate column name, in Postgres: already exists
      skipped.push(`${col.table}.${col.column} already exists`);
    }
  }

  // 4. Ensure career intelligence tables
  const careerTables = [
    {
      name: 'user_career_goals',
      sql: `CREATE TABLE IF NOT EXISTS user_career_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        target_role TEXT NOT NULL,
        target_industry TEXT,
        experience_level TEXT,
        preferred_location TEXT,
        target_salary TEXT,
        skills_summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    },
    {
      name: 'user_learning_roadmaps',
      sql: `CREATE TABLE IF NOT EXISTS user_learning_roadmaps (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        roadmap_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    },
    {
      name: 'user_interview_sessions',
      sql: `CREATE TABLE IF NOT EXISTS user_interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_role TEXT NOT NULL,
        job_title TEXT,
        company TEXT,
        questions_data TEXT NOT NULL,
        answers_data TEXT,
        overall_score INTEGER,
        overall_feedback TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    },
    {
      name: 'student_profiles',
      sql: `CREATE TABLE IF NOT EXISTS student_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        institution TEXT NOT NULL,
        degree TEXT NOT NULL,
        field_of_study TEXT NOT NULL,
        graduation_year INTEGER NOT NULL,
        graduation_month TEXT,
        current_semester TEXT,
        cgpa TEXT,
        student_type TEXT DEFAULT 'college_student',
        target_role TEXT NOT NULL DEFAULT 'Graduate Software Engineer',
        target_work_type TEXT DEFAULT 'both',
        preferred_locations TEXT,
        projects_data TEXT,
        coursework TEXT,
        achievements TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    },
    {
      name: 'guided_projects',
      sql: `CREATE TABLE IF NOT EXISTS guided_projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'Intermediate',
        target_role TEXT NOT NULL DEFAULT 'Graduate Software Engineer',
        tech_stack TEXT NOT NULL DEFAULT '[]',
        problem_statement TEXT,
        real_world_use_case TEXT,
        architecture_overview TEXT,
        database_design TEXT,
        estimated_complexity TEXT,
        resume_value TEXT,
        specification_json TEXT,
        milestones_json TEXT,
        current_milestone INTEGER DEFAULT 1,
        progress_percent INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_progress',
        github_url TEXT,
        live_url TEXT,
        resume_bullets_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    },
  ];

  for (const t of careerTables) {
    try {
      await db.exec(t.sql);
      applied.push(`CREATE TABLE IF NOT EXISTS ${t.name}`);
    } catch (err: any) {
      skipped.push(`${t.name}: ${err?.message}`);
    }
  }

  const careerIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_ucg_user ON user_career_goals(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_ulr_user ON user_learning_roadmaps(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_uis_user ON user_interview_sessions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_sp_user ON student_profiles(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_guided_proj_user ON guided_projects(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_guided_proj_status ON guided_projects(status);',
  ];
  for (const idxSql of careerIndexes) {
    try {
      await db.exec(idxSql);
      applied.push(idxSql.split('ON')[0].trim());
    } catch (err: any) {
      skipped.push(`${idxSql}: ${err?.message}`);
    }
  }

  return { applied, skipped, success: true };
}

export async function saveResumeVersion(
  userId: string,
  resumeId: string | null,
  resumeData: any,
  changeSummary?: string
) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: Valid user ID is required.');
  }

  if (!resumeData) {
    throw new Error('Bad Request: resumeData is required to save a version snapshot.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  let targetResumeId = resumeId && !isClientDraftResumeId(resumeId) ? resumeId.trim() : null;

  if (targetResumeId) {
    const existingResume = (await db.prepare('SELECT id, user_id, resume_data FROM resumes WHERE id = ?').get(targetResumeId)) as any;
    if (!existingResume) {
      throw new Error('Resume not found.');
    }
    if (existingResume.user_id !== userId) {
      throw new Error('Forbidden: You do not own this resume.');
    }
  } else {
    // If no resumeId provided, find user's latest resume
    const existing = (await db.prepare('SELECT id, user_id, resume_data FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1').get(userId)) as any;
    if (existing) {
      targetResumeId = existing.id;
    } else {
      // Create new canonical resume record for this user
      targetResumeId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const name = resumeData?.personalInfo?.fullName ? `${resumeData.personalInfo.fullName} Resume` : 'My Resume';
      await db.prepare(`
        INSERT INTO resumes (id, user_id, filename, file_type, uploaded_at, parsed_successfully, resume_data, created_at)
        VALUES (?, ?, ?, 'builder', ?, 1, ?, ?)
      `).run(targetResumeId, userId, name, now, JSON.stringify(resumeData), now);
    }
  }

  // Check for duplicate snapshot: if the data is identical to the latest snapshot for this resume
  const latestVersion = (await db.prepare(`
    SELECT * FROM resume_versions
    WHERE user_id = ? AND resume_id = ?
    ORDER BY version_number DESC
    LIMIT 1
  `).get(userId, targetResumeId)) as any;

  if (latestVersion && areResumeDatasEqual(latestVersion.resume_data, resumeData)) {
    return {
      id: latestVersion.id,
      userId: latestVersion.user_id,
      resumeId: latestVersion.resume_id,
      versionNumber: latestVersion.version_number,
      version_number: latestVersion.version_number,
      changeSummary: latestVersion.change_summary,
      change_summary: latestVersion.change_summary,
      createdAt: latestVersion.created_at,
      created_at: latestVersion.created_at,
      isDuplicate: true,
    };
  }

  const dataString = typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData);
  const summary = changeSummary?.trim() || '';

  // Concurrency retry loop: if two concurrent saves race on MAX(version_number), retry up to 3 times
  let attempts = 0;
  let savedVersion: any = null;

  while (attempts < 3) {
    attempts++;
    try {
      const verRow = (await db.prepare('SELECT MAX(version_number) as max_v FROM resume_versions WHERE user_id = ? AND resume_id = ?').get(userId, targetResumeId)) as any;
      const nextVer = (verRow?.max_v || 0) + 1;
      const versionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const finalSummary = summary || `Version ${nextVer}`;
      const createdAt = new Date().toISOString();

      await db.prepare(`
        INSERT INTO resume_versions (id, user_id, resume_id, version_number, resume_data, change_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(versionId, userId, targetResumeId, nextVer, dataString, finalSummary, createdAt);

      try {
        await db.prepare('UPDATE resumes SET resume_data = ? WHERE id = ? AND user_id = ?').run(dataString, targetResumeId, userId);
      } catch {}

      savedVersion = {
        id: versionId,
        userId,
        resumeId: targetResumeId,
        versionNumber: nextVer,
        version_number: nextVer,
        changeSummary: finalSummary,
        change_summary: finalSummary,
        createdAt,
        created_at: createdAt,
        isDuplicate: false,
      };
      break;
    } catch (err: any) {
      if (/UNIQUE|duplicate|conflict/i.test(err?.message || '') && attempts < 3) {
        // Concurrency conflict: retry with fresh MAX(version_number)
        continue;
      }
      throw err;
    }
  }

  if (!savedVersion) {
    throw new Error('Failed to save resume version snapshot due to concurrency conflict.');
  }

  return savedVersion;
}

export async function getResumeVersions(
  userId: string,
  resumeId?: string,
  options?: { isAdmin?: boolean }
) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: Valid user ID is required.');
  }

  const db = getDb();

  if (resumeId) {
    if (isClientDraftResumeId(resumeId)) {
      return [];
    }

    const resume = (await db.prepare('SELECT id, user_id FROM resumes WHERE id = ?').get(resumeId)) as any;
    if (!resume) {
      throw new Error('Resume not found.');
    }
    if (!options?.isAdmin && resume.user_id !== userId) {
      throw new Error('Forbidden: You do not own this resume.');
    }

    const rows = (await db.prepare(`
      SELECT id, user_id, resume_id, version_number, change_summary, created_at
      FROM resume_versions
      WHERE resume_id = ? ${options?.isAdmin ? '' : 'AND user_id = ?'}
      ORDER BY version_number DESC
    `).all(...(options?.isAdmin ? [resumeId] : [resumeId, userId]))) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      resumeId: r.resume_id,
      versionNumber: r.version_number,
      version_number: r.version_number,
      changeSummary: r.change_summary,
      change_summary: r.change_summary,
      createdAt: r.created_at,
      created_at: r.created_at,
    }));
  }

  const rows = (await db.prepare(`
    SELECT id, user_id, resume_id, version_number, change_summary, created_at
    FROM resume_versions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId)) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    resumeId: r.resume_id,
    versionNumber: r.version_number,
    version_number: r.version_number,
    changeSummary: r.change_summary,
    change_summary: r.change_summary,
    createdAt: r.created_at,
    created_at: r.created_at,
  }));
}

export async function getResumeVersion(
  userId: string,
  versionId: string,
  options?: { isAdmin?: boolean }
) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: Valid user ID is required.');
  }
  if (!versionId || typeof versionId !== 'string') {
    throw new Error('Bad Request: Valid version ID is required.');
  }

  const db = getDb();
  const row = (await db.prepare(`
    SELECT *
    FROM resume_versions
    WHERE id = ?
  `).get(versionId)) as any;

  if (!row) {
    throw new Error('Resume version not found.');
  }

  if (!options?.isAdmin && row.user_id !== userId) {
    throw new Error('Forbidden: You do not have permission to view this version.');
  }

  return {
    id: row.id,
    userId: row.user_id,
    resumeId: row.resume_id,
    versionNumber: row.version_number,
    version_number: row.version_number,
    changeSummary: row.change_summary,
    change_summary: row.change_summary,
    createdAt: row.created_at,
    created_at: row.created_at,
    resumeData: typeof row.resume_data === 'string' ? JSON.parse(row.resume_data) : row.resume_data,
  };
}

export async function restoreResumeVersion(
  userId: string,
  versionId: string,
  options?: { isAdmin?: boolean }
) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: Valid user ID is required.');
  }
  if (!versionId || typeof versionId !== 'string') {
    throw new Error('Bad Request: Valid version ID is required.');
  }

  const db = getDb();

  // 1. Fetch target version and verify ownership
  const targetVersion = (await db.prepare(`
    SELECT * FROM resume_versions WHERE id = ?
  `).get(versionId)) as any;

  if (!targetVersion) {
    throw new Error('Resume version not found.');
  }

  if (!options?.isAdmin && targetVersion.user_id !== userId) {
    throw new Error('Forbidden: You do not have permission to restore this version.');
  }

  const targetResumeId = targetVersion.resume_id;

  // 2. Fetch target resume and verify ownership
  const targetResume = (await db.prepare(`
    SELECT * FROM resumes WHERE id = ?
  `).get(targetResumeId)) as any;

  if (!targetResume) {
    throw new Error('Resume associated with this version not found.');
  }

  if (!options?.isAdmin && targetResume.user_id !== userId) {
    throw new Error('Forbidden: You do not own this resume.');
  }

  // 3. Check if active resume data has un-snapshotted changes compared to latest version
  const latestVersion = (await db.prepare(`
    SELECT * FROM resume_versions
    WHERE user_id = ? AND resume_id = ?
    ORDER BY version_number DESC
    LIMIT 1
  `).get(userId, targetResumeId)) as any;

  const currentResumeData = targetResume.resume_data;
  let preRestoreCheckpoint = null;

  if (currentResumeData && (!latestVersion || !areResumeDatasEqual(latestVersion.resume_data, currentResumeData))) {
    // Save checkpoint of current unsaved edits before restoring
    preRestoreCheckpoint = await saveResumeVersion(
      userId,
      targetResumeId,
      typeof currentResumeData === 'string' ? JSON.parse(currentResumeData) : currentResumeData,
      `Checkpoint before restoring Version ${targetVersion.version_number}`
    );
  }

  // 4. Create a new version snapshot representing the restored state
  const targetData = typeof targetVersion.resume_data === 'string'
    ? JSON.parse(targetVersion.resume_data)
    : targetVersion.resume_data;

  // We explicitly save a new version snapshot for the restoration
  const verRow = (await db.prepare('SELECT MAX(version_number) as max_v FROM resume_versions WHERE user_id = ? AND resume_id = ?').get(userId, targetResumeId)) as any;
  const nextVer = (verRow?.max_v || 0) + 1;
  const newVersionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dataString = typeof targetVersion.resume_data === 'string' ? targetVersion.resume_data : JSON.stringify(targetVersion.resume_data);
  const now = new Date().toISOString();
  const summary = `Restored from Version ${targetVersion.version_number}`;

  await db.prepare(`
    INSERT INTO resume_versions (id, user_id, resume_id, version_number, resume_data, change_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(newVersionId, userId, targetResumeId, nextVer, dataString, summary, now);

  // Update active resume data in resumes table
  await db.prepare('UPDATE resumes SET resume_data = ? WHERE id = ? AND user_id = ?').run(dataString, targetResumeId, userId);

  const restoredSnapshot = {
    id: newVersionId,
    userId,
    resumeId: targetResumeId,
    versionNumber: nextVer,
    changeSummary: summary,
    createdAt: now,
    isDuplicate: false,
  };

  return {
    success: true,
    message: `Restored Version ${targetVersion.version_number} successfully. Created Version ${nextVer}.`,
    resumeId: targetResumeId,
    restoredFromVersionNumber: targetVersion.version_number,
    newVersion: restoredSnapshot,
    preRestoreCheckpoint,
    resumeData: targetData,
  };
}

export async function getUserResume(userId: string, resumeId: string) {
  const db = getDb();
  const row = (await db.prepare(`
    SELECT *
    FROM resumes
    WHERE id = ? AND user_id = ?
  `).get(resumeId, userId)) as any;

  if (!row) {
    return null;
  }

  return {
    ...row,
    resumeData: row.resume_data ? (typeof row.resume_data === 'string' ? JSON.parse(row.resume_data) : row.resume_data) : null,
  };
}

export async function deleteUserResume(userId: string, resumeId: string): Promise<{ found: boolean; deleted: boolean }> {
  const db = getDb();
  const existing = (await db.prepare('SELECT id, user_id FROM resumes WHERE id = ?').get(resumeId)) as any;
  if (!existing) {
    return { found: false, deleted: false };
  }
  if (existing.user_id !== userId) {
    throw new Error('Forbidden: You do not own this resume.');
  }

  // Delete versions & resume
  await db.prepare('DELETE FROM resume_versions WHERE resume_id = ? AND user_id = ?').run(resumeId, userId);
  await db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(resumeId, userId);

  return { found: true, deleted: true };
}

export async function getUserActiveResume(userId: string) {
  const db = getDb();
  const row = (await db.prepare(`
    SELECT *
    FROM resumes
    WHERE user_id = ?
    ORDER BY uploaded_at DESC, created_at DESC
    LIMIT 1
  `).get(userId)) as any;

  if (!row) {
    return null;
  }

  return {
    ...row,
    parsedSuccessfully: Boolean(row.parsed_successfully),
    resumeData: row.resume_data ? (typeof row.resume_data === 'string' ? JSON.parse(row.resume_data) : row.resume_data) : null,
  };
}

export async function saveUserResume(
  userId: string,
  data: {
    resumeId?: string | null;
    resumeData: any;
    filename?: string | null;
    fileType?: string | null;
    clientLastUpdated?: string | null;
    force?: boolean;
  }
) {
  const db = getDb();
  const now = new Date().toISOString();
  let targetResumeId: string | null = null;
  const dataString = typeof data.resumeData === 'string' ? data.resumeData : JSON.stringify(data.resumeData);
  const parsedIncoming = typeof data.resumeData === 'string' ? JSON.parse(data.resumeData) : data.resumeData;

  const suggestedFilename =
    data.filename ||
    (parsedIncoming?.personalInfo?.fullName ? `${parsedIncoming.personalInfo.fullName} Resume` : null) ||
    'My Resume';

  // If a valid existing resumeId is supplied
  if (data.resumeId && !isClientDraftResumeId(data.resumeId)) {
    const existing = (await db.prepare('SELECT id, user_id, filename, resume_data, uploaded_at FROM resumes WHERE id = ?').get(data.resumeId)) as any;
    if (existing) {
      if (existing.user_id !== userId) {
        throw new Error('Forbidden: You do not own this resume.');
      }
      targetResumeId = existing.id;

      // Concurrency check: prevent stale client edits from overwriting newer server records
      if (!data.force && data.clientLastUpdated && existing.resume_data) {
        try {
          const serverData = typeof existing.resume_data === 'string' ? JSON.parse(existing.resume_data) : existing.resume_data;
          if (serverData?.lastUpdated) {
            const serverTime = new Date(serverData.lastUpdated).getTime();
            const clientTime = new Date(data.clientLastUpdated).getTime();
            // Allow 3 seconds tolerance for clock differences
            if (serverTime - clientTime > 3000) {
              const conflictErr: any = new Error('Conflict: A newer edit of this resume was saved to the server.');
              conflictErr.code = 'CONFLICT';
              conflictErr.serverResume = { ...existing, resumeData: serverData };
              throw conflictErr;
            }
          }
        } catch (e: any) {
          if (e.code === 'CONFLICT') throw e;
        }
      }

      await db.prepare(`
        UPDATE resumes
        SET resume_data = ?,
            filename = COALESCE(?, filename),
            uploaded_at = ?
        WHERE id = ? AND user_id = ?
      `).run(dataString, suggestedFilename, now, targetResumeId, userId);
    }
  }

  // If targetResumeId is still null, look for user's most recent resume to update
  if (!targetResumeId) {
    const latestExisting = (await db.prepare(`
      SELECT id, user_id, resume_data FROM resumes
      WHERE user_id = ?
      ORDER BY uploaded_at DESC, created_at DESC
      LIMIT 1
    `).get(userId)) as any;

    if (latestExisting) {
      targetResumeId = latestExisting.id;
      await db.prepare(`
        UPDATE resumes
        SET resume_data = ?,
            filename = COALESCE(?, filename),
            uploaded_at = ?
        WHERE id = ? AND user_id = ?
      `).run(dataString, suggestedFilename, now, targetResumeId, userId);
    } else {
      // Create new canonical resume record for this user
      targetResumeId = (data.resumeId && !isClientDraftResumeId(data.resumeId))
        ? data.resumeId
        : `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await db.prepare(`
        INSERT INTO resumes (id, user_id, filename, file_type, uploaded_at, parsed_successfully, resume_data, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        targetResumeId,
        userId,
        suggestedFilename,
        data.fileType || 'builder',
        now,
        dataString,
        now
      );
    }
  }

  const updatedRow = (await db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(targetResumeId, userId)) as any;

  try {
    const { recordStudentReadinessSnapshot, clearStudentContextCache } = await import('@/server/services/unifiedStudentContext');
    clearStudentContextCache(userId);
    await recordStudentReadinessSnapshot(
      userId,
      'resume_created',
      `Resume saved: ${suggestedFilename || 'Primary Resume'}`
    );
  } catch (snapErr) {
    console.warn('[saveUserResumeData] Non-blocking snapshot error:', snapErr);
  }

  return {
    ...updatedRow,
    resumeData: parsedIncoming,
  };
}

export async function recordUserImprovement(
  userId: string,
  data: {
    resumeId?: string | null;
    category?: string | null;
    title: string;
    beforeText?: string | null;
    afterText: string;
  }
) {
  const db = getDb();
  const id = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  if (data.resumeId) {
    const resume = (await db.prepare('SELECT id, user_id FROM resumes WHERE id = ?').get(data.resumeId)) as any;
    if (resume && resume.user_id !== userId) {
      throw new Error('Forbidden: You do not own this resume.');
    }
  }

  await db.prepare(`
    INSERT INTO resume_improvements (id, user_id, resume_id, category, title, before_text, after_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.resumeId || null,
    data.category || 'ATS Optimization',
    data.title,
    data.beforeText || 'Previous phrasing',
    data.afterText,
    now
  );

  return {
    id,
    userId,
    resumeId: data.resumeId || null,
    category: data.category || 'ATS Optimization',
    title: data.title,
    beforeText: data.beforeText || 'Previous phrasing',
    afterText: data.afterText,
    createdAt: now,
  };
}

export async function deleteJobApplication(userId: string, applicationId: string): Promise<boolean> {
  const db = getDb();
  const res = await db.prepare('DELETE FROM job_applications WHERE id = ? AND user_id = ?').run(applicationId, userId);
  return res.changes > 0;
}

export async function deleteJobApplicationByJobId(userId: string, jobId: string): Promise<boolean> {
  const db = getDb();
  const res = await db.prepare('DELETE FROM job_applications WHERE job_id = ? AND user_id = ?').run(jobId, userId);
  return res.changes > 0;
}

export async function getUserJobMatches(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT jm.*, r.filename as resume_filename
    FROM job_matches jm
    LEFT JOIN resumes r ON jm.resume_id = r.id
    WHERE jm.user_id = ?
    ORDER BY jm.created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    company: r.company,
    matchScore: Math.round(r.match_score),
    matchedSkills: JSON.parse(r.matched_skills || '[]'),
    partialSkills: JSON.parse(r.partial_skills || '[]'),
    missingSkills: JSON.parse(r.missing_skills || '[]'),
    resumeFilename: r.resume_filename,
    createdAt: r.created_at,
  }));
}

export async function getUserSkillsStatus(userId: string) {
  const db = getDb();
  const catalog = await db.prepare('SELECT * FROM skills_catalog WHERE is_active = 1 ORDER BY category, name').all() as any[];

  return Promise.all(catalog.map(async (skill) => {
    const verified = await db.prepare(`
      SELECT vs.*, a.score, a.total_questions, c.certificate_code
      FROM verified_skills vs
      LEFT JOIN assessments a ON vs.assessment_id = a.id
      LEFT JOIN certificates c ON vs.assessment_id = c.assessment_id
      WHERE vs.user_id = ? AND LOWER(vs.skill_name) = LOWER(?) AND vs.status = 'VERIFIED'
      ORDER BY vs.verified_at DESC
      LIMIT 1
    `).get(userId, skill.name) as any;

    if (verified) {
      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        description: skill.description,
        status: 'VERIFIED',
        score: verified.score ? `${verified.score}/${verified.total_questions}` : null,
        percentage: verified.score ? Math.round((verified.score / verified.total_questions) * 100) : null,
        verifiedAt: verified.verified_at,
        certificateCode: verified.certificate_code || null,
      };
    }

    const latestAttempt = await db.prepare(`
      SELECT * FROM assessments
      WHERE user_id = ? AND LOWER(skill) = LOWER(?)
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, skill.name) as any;

    if (latestAttempt) {
      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        description: skill.description,
        status: latestAttempt.passed ? 'VERIFIED' : 'NOT VERIFIED',
        score: `${latestAttempt.score}/${latestAttempt.total_questions}`,
        percentage: Math.round((latestAttempt.score / latestAttempt.total_questions) * 100),
        attemptDate: latestAttempt.completed_at || latestAttempt.created_at,
        certificateCode: null,
      };
    }

    return {
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category,
      description: skill.description,
      status: 'NOT VERIFIED',
      score: null,
      percentage: null,
      verifiedAt: null,
      certificateCode: null,
    };
  }));
}

export async function getUserAssessments(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT a.*, c.certificate_code
    FROM assessments a
    LEFT JOIN certificates c ON a.id = c.assessment_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    skill: r.skill,
    score: r.score,
    totalQuestions: r.total_questions,
    passed: Boolean(r.passed),
    status: r.status,
    durationSeconds: r.duration_seconds,
    violationCount: r.proctoring_violation_count || 0,
    terminationReason: r.termination_reason || null,
    startedAt: r.started_at,
    completedAt: r.completed_at || r.created_at,
    certificateCode: r.certificate_code || null,
    percentage: r.total_questions > 0 ? Math.round((r.score / r.total_questions) * 100) : 0,
  }));
}

export async function getUserCertificates(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT *
    FROM certificates
    WHERE user_id = ?
    ORDER BY issue_date DESC, created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    certificateCode: r.certificate_code,
    skill: r.skill,
    score: r.score,
    totalQuestions: r.total_questions,
    percentage: r.total_questions > 0 ? Math.round((r.score / r.total_questions) * 100) : 0,
    issueDate: r.issue_date,
    verificationStatus: r.verification_status,
  }));
}

export async function getCertificateByCode(code: string) {
  const db = getDb();
  const row = await db.prepare(`
    SELECT c.*, u.name as user_name
    FROM certificates c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.certificate_code = ?
  `).get(code) as any;

  if (!row) return null;

  return {
    id: row.id,
    certificateCode: row.certificate_code,
    userName: row.user_name || 'Verified Professional',
    skill: row.skill,
    score: row.score,
    totalQuestions: row.total_questions,
    percentage: row.total_questions > 0 ? Math.round((row.score / row.total_questions) * 100) : 0,
    issueDate: row.issue_date,
    verificationStatus: row.verification_status,
  };
}

export async function getUserCourses(userId: string) {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT
      c.*,
      COALESCE(cp.lessons_completed, 0) as lessons_completed,
      COALESCE(cp.status, 'Not Started') as status,
      cp.completion_date,
      cp.last_accessed_at
    FROM courses c
    LEFT JOIN course_progress cp ON c.id = cp.course_id AND cp.user_id = ?
    ORDER BY c.created_at ASC
  `).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    description: r.description,
    totalLessons: r.total_lessons,
    durationMinutes: r.duration_minutes,
    level: r.level,
    lessonsCompleted: r.lessons_completed,
    status: r.status,
    completionDate: r.completion_date,
    lastAccessedAt: r.last_accessed_at,
    progressPercentage: r.total_lessons > 0 ? Math.min(100, Math.round((r.lessons_completed / r.total_lessons) * 100)) : 0,
  }));
}

export async function updateUserCourseProgress(userId: string, courseId: string, lessonsCompleted: number) {
  const db = getDb();
  const course = await db.prepare('SELECT id, total_lessons FROM courses WHERE id = ? OR slug = ?').get(courseId, courseId) as any;
  if (!course) {
    throw new Error('Course not found.');
  }

  const resolvedCourseId = course.id;
  const totalLessons = course.total_lessons;
  const clampedCompleted = Math.max(0, Math.min(totalLessons, lessonsCompleted));
  const isCompleted = clampedCompleted >= totalLessons;
  const status = isCompleted ? 'Completed' : clampedCompleted > 0 ? 'In Progress' : 'Not Started';
  const now = new Date().toISOString();
  const completionDate = isCompleted ? now : null;

  const existing = await db.prepare('SELECT id FROM course_progress WHERE user_id = ? AND course_id = ?').get(userId, resolvedCourseId) as any;

  if (existing) {
    await db.prepare(`
      UPDATE course_progress
      SET lessons_completed = ?, status = ?, completion_date = COALESCE(?, completion_date),
          last_accessed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(clampedCompleted, status, completionDate, now, now, existing.id);
  } else {
    const id = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.prepare(`
      INSERT INTO course_progress (
        id, user_id, course_id, lessons_completed, total_lessons,
        status, completion_date, last_accessed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, resolvedCourseId, clampedCompleted, totalLessons, status, completionDate, now, now, now);
  }

  return {
    courseId: resolvedCourseId,
    lessonsCompleted: clampedCompleted,
    totalLessons,
    status,
    completionDate,
  };
}

/**
 * Retrieves a user's active profile skills.
 * If the user has no skills tracked yet, seeds initial profile skills.
 */
export async function getUserSkills(userId: string) {
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM user_skills WHERE user_id = ? ORDER BY created_at ASC').all(userId) as any[];

  // If user has no skills tracked yet, return empty list
  if (rows.length === 0) {
    return [];
  }

  // Sync any newly verified skills from verified_skills/certificates
  return Promise.all(rows.map(async (r) => {
    let status = r.status;
    let score = r.score;
    let certificateId = r.certificate_id;
    let verifiedDate = r.verified_date;

    if (status !== 'verified') {
      const verified = await db.prepare(`
        SELECT vs.*, a.score as att_score, c.certificate_code
        FROM verified_skills vs
        LEFT JOIN assessments a ON vs.assessment_id = a.id
        LEFT JOIN certificates c ON vs.assessment_id = c.assessment_id
        WHERE vs.user_id = ? AND LOWER(vs.skill_name) = LOWER(?) AND vs.status = 'VERIFIED'
        ORDER BY vs.verified_at DESC LIMIT 1
      `).get(userId, r.skill_name) as any;

      if (verified) {
        status = 'verified';
        score = verified.att_score;
        certificateId = verified.certificate_code;
        verifiedDate = verified.verified_at;
        await db.prepare(`
          UPDATE user_skills
          SET status = 'verified', score = ?, certificate_id = ?, verified_date = ?, updated_at = ?
          WHERE id = ?
        `).run(score, certificateId, verifiedDate, new Date().toISOString(), r.id);
      }
    }

    return {
      id: r.id,
      name: r.skill_name,
      category: r.category,
      status: status,
      score: score || undefined,
      certificateId: certificateId || undefined,
      verifiedDate: verifiedDate || undefined,
      claimedDate: r.claimed_date || undefined,
    };
  }));
}

/**
 * Adds or claims a skill for an authenticated user.
 */
export async function addUserSkill(
  userId: string,
  skillName: string,
  category: string,
  claimDirectly = true
) {
  const db = getDb();
  const now = new Date().toISOString();

  // Check if skill already exists for this user
  const existing = (await db.prepare(
    'SELECT * FROM user_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)'
  ).get(userId, skillName)) as any;

  if (existing) {
    if (claimDirectly && existing.status === 'not-verified') {
      await db.prepare(`
        UPDATE user_skills
        SET status = 'claimed', claimed_date = ?, updated_at = ?
        WHERE id = ?
      `).run(now.split('T')[0], now, existing.id);
      existing.status = 'claimed';
      existing.claimed_date = now.split('T')[0];
    }
    return {
      id: existing.id,
      name: existing.skill_name,
      category: existing.category,
      status: existing.status,
      score: existing.score || undefined,
      certificateId: existing.certificate_id || undefined,
      verifiedDate: existing.verified_date || undefined,
      claimedDate: existing.claimed_date || undefined,
    };
  }

  // Check if already verified in verified_skills
  const verified = await db.prepare(`
    SELECT vs.*, a.score as att_score, c.certificate_code
    FROM verified_skills vs
    LEFT JOIN assessments a ON vs.assessment_id = a.id
    LEFT JOIN certificates c ON vs.assessment_id = c.assessment_id
    WHERE vs.user_id = ? AND LOWER(vs.skill_name) = LOWER(?) AND vs.status = 'VERIFIED'
    ORDER BY vs.verified_at DESC LIMIT 1
  `).get(userId, skillName) as any;

  const id = `usk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const status = verified ? 'verified' : claimDirectly ? 'claimed' : 'not-verified';
  const score = verified ? verified.att_score : null;
  const certificateId = verified ? verified.certificate_code : null;
  const verifiedDate = verified ? verified.verified_at : null;
  const claimedDate = claimDirectly ? now.split('T')[0] : null;

  await db.prepare(`
    INSERT INTO user_skills (
      id, user_id, skill_name, category, status, score, certificate_id,
      verified_date, claimed_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    skillName,
    category,
    status,
    score,
    certificateId,
    verifiedDate,
    claimedDate,
    now,
    now
  );

  return {
    id,
    name: skillName,
    category,
    status,
    score: score || undefined,
    certificateId: certificateId || undefined,
    verifiedDate: verifiedDate || undefined,
    claimedDate: claimedDate || undefined,
  };
}

/**
 * Removes a skill from a user's active profile.
 * PRESERVES historical assessment attempts and certificates in the database archive.
 */
export async function deleteUserSkill(
  userId: string,
  skillIdOrName: string
): Promise<{ success: boolean; error?: string; deletedSkill?: { id: string; name: string; status: string; certificateId?: string } }> {
  const db = getDb();

  // Strict ownership check: must match userId AND (id OR skill_name)
  const target = await db.prepare(`
    SELECT * FROM user_skills
    WHERE user_id = ? AND (id = ? OR LOWER(skill_name) = LOWER(?))
  `).get(userId, skillIdOrName, skillIdOrName) as any;

  if (!target) {
    return { success: false, error: 'Skill not found in user profile or unauthorized.' };
  }

  // Delete from user_skills table
  await db.prepare('DELETE FROM user_skills WHERE id = ? AND user_id = ?').run(target.id, userId);

  // NOTE: Assessments and certificates tables are explicitly preserved.
  // We do NOT delete historical attempts or verified credentials.

  const userName = await getUserNameById(userId);
  await logAuditEvent({
    eventType: 'SKILL_REMOVED',
    actorType: 'USER',
    actorId: userId,
    description: `${userName || 'Candidate'} removed skill "${target.skill_name}" from active profile`,
    metadata: {
      skillId: target.id,
      skillName: target.skill_name,
      wasVerified: target.status === 'verified',
      certificateId: target.certificate_id || null,
      userId,
    },
  });

  return {
    success: true,
    deletedSkill: {
      id: target.id,
      name: target.skill_name,
      status: target.status,
      certificateId: target.certificate_id || undefined,
    },
  };
}

/**
 * Synchronizes verified skill status when an assessment is passed.
 */
export async function syncUserSkillVerification(
  userId: string,
  skillName: string,
  score: number,
  certificateCode: string,
  verifiedAt: string
) {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = (await db.prepare(
    'SELECT * FROM user_skills WHERE user_id = ? AND LOWER(skill_name) = LOWER(?)'
  ).get(userId, skillName)) as any;

  if (existing) {
    await db.prepare(`
      UPDATE user_skills
      SET status = 'verified', score = ?, certificate_id = ?, verified_date = ?, updated_at = ?
      WHERE id = ?
    `).run(score, certificateCode, verifiedAt, now, existing.id);
  } else {
    const catalogItem = (await db.prepare('SELECT category FROM skills_catalog WHERE LOWER(name) = LOWER(?)').get(skillName)) as any;
    const category = catalogItem?.category || 'Technical';
    const id = `usk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.prepare(`
      INSERT INTO user_skills (
        id, user_id, skill_name, category, status, score, certificate_id,
        verified_date, claimed_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'verified', ?, ?, ?, NULL, ?, ?)
    `).run(id, userId, skillName, category, score, certificateCode, verifiedAt, now, now);
  }
}

/**
 * Records a camera / fullscreen / behavioral proctoring event into SQLite database.
 */
export async function recordProctoringEvent(
  assessmentId: string,
  eventType: string,
  severity: 'info' | 'warning' | 'violation',
  details?: string
) {
  const db = getDb();
  const id = `pevt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  try {
    await db.prepare(`
      INSERT INTO proctoring_events (id, assessment_id, event_type, severity, details, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, assessmentId, eventType, severity, details || null, now, now);

    if (severity === 'violation') {
      await db.prepare(`
        UPDATE assessments
        SET proctoring_violation_count = COALESCE(proctoring_violation_count, 0) + 1
        WHERE id = ?
      `).run(assessmentId);
    }
  } catch (err) {
    console.warn('Failed to record proctoring event:', err);
  }

  return { id, assessmentId, eventType, severity, details, timestamp: now };
}

/**
 * Retrieves proctoring event logs for admin monitoring.
 */
export async function getProctoringEvents(limit = 50, assessmentId?: string) {
  const db = getDb();
  try {
    if (assessmentId) {
      return await db.prepare(`
        SELECT pe.*, a.skill, a.visitor_id, u.name as user_name, u.email as user_email
        FROM proctoring_events pe
        LEFT JOIN assessments a ON pe.assessment_id = a.id
        LEFT JOIN users u ON a.visitor_id = u.id
        WHERE pe.assessment_id = ?
        ORDER BY pe.created_at DESC
        LIMIT ?
      `).all(assessmentId, limit);
    }

    return await db.prepare(`
      SELECT pe.*, a.skill, a.visitor_id, u.name as user_name, u.email as user_email
      FROM proctoring_events pe
      LEFT JOIN assessments a ON pe.assessment_id = a.id
      LEFT JOIN users u ON a.visitor_id = u.id
      ORDER BY pe.created_at DESC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.warn('Failed to query proctoring events:', err);
    return [];
  }
}

/**
 * Returns aggregated proctoring telemetry for admin center.
 */
export async function getProctoringSummary() {
  const db = getDb();
  try {
    const totalEvents = ((await db.prepare('SELECT COUNT(*) as count FROM proctoring_events').get()) as any)?.count || 0;
    const totalViolations = ((await db.prepare("SELECT COUNT(*) as count FROM proctoring_events WHERE severity = 'violation'").get()) as any)?.count || 0;
    const totalWarnings = ((await db.prepare("SELECT COUNT(*) as count FROM proctoring_events WHERE severity = 'warning'").get()) as any)?.count || 0;

    const violationBreakdown = await db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM proctoring_events
      WHERE severity = 'violation'
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    const activeOrRecentSessions = await db.prepare(`
      SELECT a.id, a.skill, a.score, a.passed,
             COALESCE(lps.status, a.status) as status,
             a.duration_seconds, a.proctoring_violation_count, a.created_at,
             COALESCE(lps.candidate_name, u.name, 'Candidate') as user_name,
             COALESCE(lps.candidate_email, u.email, 'No email recorded') as user_email,
             lps.camera_status,
             lps.stream_health,
             lps.frame_rate,
             lps.resolution,
             lps.last_heartbeat_at,
             lps.consent_given,
             lps.started_at
      FROM assessments a
      LEFT JOIN live_proctoring_sessions lps ON a.id = lps.assessment_id
      LEFT JOIN users u ON (a.user_id = u.id OR a.visitor_id = u.id)
      ORDER BY COALESCE(lps.last_heartbeat_at, a.created_at) DESC
      LIMIT 20
    `).all();

    const recentEvents = await getProctoringEvents(30);

    return {
      totalEvents,
      totalViolations,
      totalWarnings,
      violationBreakdown,
      activeOrRecentSessions,
      recentEvents,
    };
  } catch (err) {
    console.warn('Failed to get proctoring summary:', err);
    return {
      totalEvents: 0,
      totalViolations: 0,
      totalWarnings: 0,
      violationBreakdown: [],
      activeOrRecentSessions: [],
      recentEvents: [],
    };
  }
}

// ==========================================
// ADMIN USER DELETION & DATA PURGE
// ==========================================

export async function deleteUserAndData(
  targetUserId: string,
  adminActor: { id: string; email: string }
): Promise<{ success: boolean; message: string; deletedUser: { id: string; name: string; email: string | null } }> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Fetch user to verify existence
    const user = (await tx
      .prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?')
      .get(targetUserId)) as { id: string; name: string; email: string | null; role: string; is_active: number } | undefined;

    if (!user) {
      throw new Error('User account not found.');
    }

    // 2. Prevent self-deletion
    const adminActorEmail = (adminActor.email || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();
    if (adminActor.id === user.id || (userEmail && adminActorEmail === userEmail)) {
      throw new Error('Action prohibited: Administrators cannot delete their own account from the Admin Console.');
    }

    // 3. Prevent deleting the last active administrator
    if (user.role === 'ADMIN') {
      const activeAdminUsersCount = ((await tx.prepare('SELECT COUNT(*) as c FROM admin_users WHERE is_active = 1').get()) as { c: number })?.c || 0;
      const otherActiveUsersAdminsCount = ((await tx.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id != ?").get(user.id)) as { c: number })?.c || 0;
      if (activeAdminUsersCount <= 1 && otherActiveUsersAdminsCount === 0) {
        throw new Error('Action prohibited: Cannot delete the last active administrator account.');
      }
    }

    // 4. Cascade delete & anonymize related data across all 23 database tables
    // Resumes and versioning
    await tx.prepare('DELETE FROM resume_improvements WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM resume_versions WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM resume_analyses WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM resumes WHERE user_id = ?').run(targetUserId);

    // Job applications
    await tx.prepare('DELETE FROM job_applications WHERE user_id = ?').run(targetUserId);

    // Assessments & related snapshots/proctoring
    await tx.prepare('DELETE FROM certificates WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM verified_skills WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM user_skills WHERE user_id = ?').run(targetUserId);

    const userAssessments = (await tx.prepare('SELECT id FROM assessments WHERE user_id = ?').all(targetUserId)) as Array<{ id: string }>;
    for (const a of userAssessments) {
      await tx.prepare('DELETE FROM assessment_question_snapshots WHERE assessment_id = ?').run(a.id);
      await tx.prepare('DELETE FROM proctoring_events WHERE assessment_id = ?').run(a.id);
    }
    await tx.prepare('DELETE FROM assessments WHERE user_id = ?').run(targetUserId);

    // Course progress
    await tx.prepare('DELETE FROM course_progress WHERE user_id = ?').run(targetUserId);

    // Job searches & matches
    const userSearches = (await tx.prepare('SELECT id FROM job_searches WHERE user_id = ?').all(targetUserId)) as Array<{ id: string }>;
    for (const s of userSearches) {
      try {
        await tx.prepare('DELETE FROM job_search_results WHERE search_id = ?').run(s.id);
      } catch {}
    }
    await tx.prepare('DELETE FROM job_searches WHERE user_id = ?').run(targetUserId);
    await tx.prepare('DELETE FROM job_matches WHERE user_id = ?').run(targetUserId);

    // Live proctoring sessions
    try {
      await tx.prepare('DELETE FROM live_proctoring_sessions WHERE user_id = ?').run(targetUserId);
    } catch {}

    // Anonymize visitors & feedback to preserve aggregate metrics without PII
    await tx.prepare('UPDATE visitors SET user_id = NULL WHERE user_id = ?').run(targetUserId);
    await tx.prepare('UPDATE feedback SET user_id = NULL WHERE user_id = ?').run(targetUserId);

    // Delete matching admin_users account if one exists (and is not the executing admin)
    if (userEmail && userEmail !== adminActorEmail) {
      await tx.prepare('DELETE FROM admin_users WHERE LOWER(email) = ? AND id != ?').run(userEmail, adminActor.id);
    }

    // Delete from primary users table
    await tx.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

    // 5. Record Administrative Audit Log in the same transaction
    await logAuditEvent({
      eventType: 'ADMIN_USER_DELETED',
      actorType: 'ADMIN',
      actorId: adminActor.id,
      description: `Administrator ${adminActor.email} deleted user "${user.name}" (${user.email || 'no-email'}) [ID: ${user.id}] and purged associated candidate records.`,
      metadata: {
        deletedUserId: user.id,
        deletedUserName: user.name,
        deletedUserEmail: user.email,
        adminId: adminActor.id,
        adminEmail: adminActor.email,
        timestamp: new Date().toISOString(),
      },
    }, tx, true);

    return {
      success: true,
      message: `User "${user.name}" and all associated data have been successfully removed.`,
      deletedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  });
}

// ==========================================
// ADMIN USER CREATION & UPDATES
// ==========================================

export async function createAdminUserRecord(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  isActive?: number;
  adminActor: { id: string; email: string };
}) {
  const db = getDb();
  const trimmedName = data.name.trim();
  const trimmedEmail = data.email.trim().toLowerCase();
  const role = (data.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  const isActive = data.isActive === 0 ? 0 : 1;
  const now = new Date().toISOString();

  // Duplicate email check across users and admin_users
  const existingUser = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(trimmedEmail);
  if (existingUser) {
    throw new Error(`An account with email "${trimmedEmail}" already exists.`);
  }
  const existingAdmin = await db.prepare('SELECT id FROM admin_users WHERE LOWER(email) = ?').get(trimmedEmail);
  if (existingAdmin) {
    throw new Error(`An administrator account with email "${trimmedEmail}" already exists.`);
  }

  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sessionToken = createSessionToken({ id: userId, email: trimmedEmail, role });

  return await db.transaction(async (tx) => {
    await tx.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, is_active, session_token,
        created_at, updated_at, last_login_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, trimmedName, trimmedEmail, data.passwordHash, role, isActive, sessionToken, now, now, now, now);

    if (role === 'ADMIN') {
      const adminId = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await tx.prepare(`
        INSERT INTO admin_users (
          id, email, password_hash, role, created_at, updated_at, is_active
        ) VALUES (?, ?, ?, 'ADMIN', ?, ?, ?)
      `).run(adminId, trimmedEmail, data.passwordHash, now, now, isActive);
    }

    await logAuditEvent({
      eventType: 'ADMIN_USER_CREATED',
      actorType: 'ADMIN',
      actorId: data.adminActor.id,
      description: `Administrator ${data.adminActor.email} created user account "${trimmedName}" (${trimmedEmail}) [ID: ${userId}] with role ${role}.`,
      metadata: {
        createdUserId: userId,
        name: trimmedName,
        email: trimmedEmail,
        role,
        isActive,
        adminId: data.adminActor.id,
        adminEmail: data.adminActor.email,
        timestamp: now,
      },
    }, tx, true);

    return {
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      role,
      is_active: isActive,
      created_at: now,
      updated_at: now,
      last_active_at: now,
    };
  });
}

export async function updateAdminUserRecord(
  userId: string,
  data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: string;
    isActive?: number;
    adminActor: { id: string; email: string };
  }
) {
  const db = getDb();
  const now = new Date().toISOString();

  return await db.transaction(async (tx) => {
    const existing = (await tx.prepare('SELECT * FROM users WHERE id = ?').get(userId)) as any;
    if (!existing) {
      throw new Error('User account not found.');
    }

    const currentEmail = (existing.email || '').trim().toLowerCase();
    const currentRole = (existing.role || 'USER').toUpperCase();
    const currentIsActive = existing.is_active === 0 ? 0 : 1;

    const newName = data.name !== undefined ? data.name.trim() : existing.name;
    const newEmail = data.email !== undefined ? data.email.trim().toLowerCase() : currentEmail;
    const newRole = data.role !== undefined ? (data.role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') : currentRole;
    const newIsActive = data.isActive !== undefined ? (data.isActive === 0 ? 0 : 1) : currentIsActive;

    // Email duplicate check if email changed
    if (newEmail && newEmail !== currentEmail) {
      const dupUser = await tx.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(newEmail, userId);
      if (dupUser) {
        throw new Error(`An account with email "${newEmail}" already exists.`);
      }
      const dupAdmin = await tx.prepare('SELECT id FROM admin_users WHERE LOWER(email) = ? AND id != ?').get(newEmail, userId);
      if (dupAdmin) {
        throw new Error(`An administrator account with email "${newEmail}" already exists.`);
      }
    }

    // Last Active Admin Protection:
    // Prevent demotion or deactivation of the last active administrator
    const wasActiveAdmin = currentRole === 'ADMIN' && currentIsActive === 1;
    const becomingInactiveOrDemoted = (newRole !== 'ADMIN' || newIsActive === 0);

    if (wasActiveAdmin && becomingInactiveOrDemoted) {
      const totalActiveAdmins = ((await tx.prepare('SELECT COUNT(*) as c FROM admin_users WHERE is_active = 1').get()) as any)?.c || 0;
      const otherActiveUserAdmins = ((await tx.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id != ?").get(userId)) as any)?.c || 0;

      if (totalActiveAdmins <= 1 && otherActiveUserAdmins === 0) {
        throw new Error('Action prohibited: Cannot demote or deactivate the last active administrator account.');
      }
    }

    // Update users record
    if (data.passwordHash) {
      await tx.prepare(`
        UPDATE users
        SET name = ?, email = ?, role = ?, is_active = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
      `).run(newName, newEmail || null, newRole, newIsActive, data.passwordHash, now, userId);
    } else {
      await tx.prepare(`
        UPDATE users
        SET name = ?, email = ?, role = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(newName, newEmail || null, newRole, newIsActive, now, userId);
    }

    // Sync admin_users table
    if (newRole === 'ADMIN') {
      const existingAdmin = (await tx.prepare('SELECT id FROM admin_users WHERE LOWER(email) = ?').get(currentEmail || newEmail)) as any;
      if (existingAdmin) {
        if (data.passwordHash) {
          await tx.prepare(`
            UPDATE admin_users
            SET email = ?, password_hash = ?, role = 'ADMIN', is_active = ?, updated_at = ?
            WHERE id = ?
          `).run(newEmail, data.passwordHash, newIsActive, now, existingAdmin.id);
        } else {
          await tx.prepare(`
            UPDATE admin_users
            SET email = ?, role = 'ADMIN', is_active = ?, updated_at = ?
            WHERE id = ?
          `).run(newEmail, newIsActive, now, existingAdmin.id);
        }
      } else {
        const newAdminId = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const passHash = data.passwordHash || existing.password_hash || hashPassword(crypto.randomBytes(16).toString('hex'));
        await tx.prepare(`
          INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
          VALUES (?, ?, ?, 'ADMIN', ?, ?, ?)
        `).run(newAdminId, newEmail, passHash, now, now, newIsActive);
      }
    } else if (currentRole === 'ADMIN' && newRole === 'USER') {
      // User was demoted: remove or deactivate in admin_users if not the acting admin
      if (currentEmail && currentEmail !== data.adminActor.email.toLowerCase()) {
        await tx.prepare('DELETE FROM admin_users WHERE LOWER(email) = ?').run(currentEmail);
      }
    }

    await logAuditEvent({
      eventType: 'ADMIN_USER_UPDATED',
      actorType: 'ADMIN',
      actorId: data.adminActor.id,
      description: `Administrator ${data.adminActor.email} updated user account "${newName}" (${newEmail || 'no-email'}) [ID: ${userId}]. Role: ${newRole}, Active: ${newIsActive}.`,
      metadata: {
        userId,
        name: newName,
        email: newEmail,
        role: newRole,
        isActive: newIsActive,
        passwordChanged: Boolean(data.passwordHash),
        adminId: data.adminActor.id,
        adminEmail: data.adminActor.email,
        timestamp: now,
      },
    }, tx, true);

    return {
      id: userId,
      name: newName,
      email: newEmail || null,
      role: newRole,
      is_active: newIsActive,
      updated_at: now,
    };
  });
}

// ==========================================
// LIVE PROCTORING SESSIONS & STREAM SIGNALING
// ==========================================

const liveFramesCache = new Map<string, { frame: string; timestamp: number }>();

export function saveLiveStreamFrame(assessmentId: string, frameDataUrl: string) {
  liveFramesCache.set(assessmentId, { frame: frameDataUrl, timestamp: Date.now() });
}

export function getLiveStreamFrame(assessmentId: string): string | null {
  const item = liveFramesCache.get(assessmentId);
  if (!item) return null;
  if (Date.now() - item.timestamp > 10000) {
    liveFramesCache.delete(assessmentId);
    return null;
  }
  return item.frame;
}

export function clearLiveStreamFrame(assessmentId: string) {
  liveFramesCache.delete(assessmentId);
}

export async function upsertLiveProctoringSession(data: {
  assessmentId: string;
  userId?: string | null;
  candidateName: string;
  candidateEmail?: string | null;
  skill: string;
  status: string;
  cameraStatus: string;
  streamHealth?: string;
  frameRate?: number;
  resolution?: string;
  consentGiven?: boolean;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const sessionId = `lps_${data.assessmentId}`;
  const consentGivenInt = data.consentGiven ? 1 : 0;
  const consentTimestamp = data.consentGiven ? now : null;

  const existing = (await db.prepare('SELECT id, user_id FROM live_proctoring_sessions WHERE assessment_id = ?').get(data.assessmentId)) as any;

  if (existing) {
    if (existing.user_id && data.userId && existing.user_id !== data.userId) {
      throw new Error('Forbidden: You do not own this proctoring session.');
    }
    await db.prepare(`
      UPDATE live_proctoring_sessions
      SET status = ?,
          camera_status = ?,
          stream_health = COALESCE(?, stream_health),
          frame_rate = COALESCE(?, frame_rate),
          resolution = COALESCE(?, resolution),
          consent_given = COALESCE(?, consent_given),
          last_heartbeat_at = ?,
          updated_at = ?
      WHERE assessment_id = ?
    `).run(
      data.status,
      data.cameraStatus,
      data.streamHealth || null,
      data.frameRate !== undefined ? data.frameRate : null,
      data.resolution || null,
      consentGivenInt,
      now,
      now,
      data.assessmentId
    );
  } else {
    await db.prepare(`
      INSERT INTO live_proctoring_sessions (
        id, assessment_id, user_id, candidate_name, candidate_email,
        skill, status, camera_status, stream_health, frame_rate, resolution,
        consent_given, consent_timestamp, started_at, last_heartbeat_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      data.assessmentId,
      data.userId || null,
      data.candidateName,
      data.candidateEmail || null,
      data.skill,
      data.status,
      data.cameraStatus,
      data.streamHealth || 'unknown',
      data.frameRate || 0,
      data.resolution || 'unknown',
      consentGivenInt,
      consentTimestamp,
      now,
      now,
      now,
      now
    );
  }

  return { success: true, sessionId, timestamp: now };
}

export async function updateLiveProctoringHeartbeat(
  assessmentId: string,
  data: {
    status?: string;
    cameraStatus?: string;
    streamHealth?: string;
    frameRate?: number;
    resolution?: string;
  }
) {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE live_proctoring_sessions
    SET last_heartbeat_at = ?,
        updated_at = ?,
        status = COALESCE(?, status),
        camera_status = COALESCE(?, camera_status),
        stream_health = COALESCE(?, stream_health),
        frame_rate = COALESCE(?, frame_rate),
        resolution = COALESCE(?, resolution)
    WHERE assessment_id = ?
  `).run(
    now,
    now,
    data.status || null,
    data.cameraStatus || null,
    data.streamHealth || null,
    data.frameRate !== undefined ? data.frameRate : null,
    data.resolution || null,
    assessmentId
  );

  return { success: true, timestamp: now };
}

export async function getLiveProctoringSessionDetail(assessmentId: string) {
  const db = getDb();
  const session = (await db.prepare(`
    SELECT * FROM live_proctoring_sessions WHERE assessment_id = ?
  `).get(assessmentId)) as any;

  if (!session) return null;

  const lastHb = new Date(session.last_heartbeat_at).getTime();
  const diffSec = Math.floor((Date.now() - lastHb) / 1000);
  const isHeartbeatFresh = diffSec <= 12;

  let effectiveConnection = 'offline';
  if (session.status === 'in_progress') {
    effectiveConnection = isHeartbeatFresh ? 'connected' : 'interrupted';
  } else if (session.status === 'waiting_camera') {
    effectiveConnection = isHeartbeatFresh ? 'waiting' : 'offline';
  } else if (session.status === 'completed' || session.status === 'submitted') {
    effectiveConnection = 'completed';
  }

  return {
    ...session,
    heartbeat_age_seconds: diffSec,
    is_live: isHeartbeatFresh && session.status === 'in_progress',
    connection_status: effectiveConnection,
  };
}

export async function saveWebRtcSignal(
  assessmentId: string,
  sender: 'candidate' | 'admin',
  type: 'offer' | 'answer' | 'candidate',
  signalData: any
) {
  const db = getDb();
  const now = new Date().toISOString();
  const serialized = typeof signalData === 'string' ? signalData : JSON.stringify(signalData);

  if (type === 'offer') {
    await db.prepare(`
      UPDATE live_proctoring_sessions
      SET signaling_offer = ?, updated_at = ?
      WHERE assessment_id = ?
    `).run(serialized, now, assessmentId);
  } else if (type === 'answer') {
    await db.prepare(`
      UPDATE live_proctoring_sessions
      SET signaling_answer = ?, updated_at = ?
      WHERE assessment_id = ?
    `).run(serialized, now, assessmentId);
  } else if (type === 'candidate') {
    const col = sender === 'candidate' ? 'candidate_ice_candidates' : 'admin_ice_candidates';
    const row = (await db.prepare(`SELECT ${col} FROM live_proctoring_sessions WHERE assessment_id = ?`).get(assessmentId)) as any;
    let list: any[] = [];
    if (row && row[col]) {
      try { list = JSON.parse(row[col]); } catch {}
    }
    list.push(signalData);
    await db.prepare(`
      UPDATE live_proctoring_sessions
      SET ${col} = ?, updated_at = ?
      WHERE assessment_id = ?
    `).run(JSON.stringify(list), now, assessmentId);
  }

  return { success: true };
}

export async function getWebRtcSignal(assessmentId: string, forRole: 'candidate' | 'admin') {
  const db = getDb();
  const row = (await db.prepare(`
    SELECT signaling_offer, signaling_answer, candidate_ice_candidates, admin_ice_candidates, status, last_heartbeat_at
    FROM live_proctoring_sessions
    WHERE assessment_id = ?
  `).get(assessmentId)) as any;

  if (!row) return null;

  let offer = null;
  let answer = null;
  let candidates: any[] = [];

  if (row.signaling_offer) {
    try { offer = JSON.parse(row.signaling_offer); } catch {}
  }
  if (row.signaling_answer) {
    try { answer = JSON.parse(row.signaling_answer); } catch {}
  }

  if (forRole === 'admin') {
    if (row.candidate_ice_candidates) {
      try { candidates = JSON.parse(row.candidate_ice_candidates); } catch {}
    }
    return { offer, answer, candidates, status: row.status };
  } else {
    if (row.admin_ice_candidates) {
      try { candidates = JSON.parse(row.admin_ice_candidates); } catch {}
    }
    return { offer, answer, candidates, status: row.status };
  }
}

export async function endLiveProctoringSession(assessmentId: string, status: 'completed' | 'submitted' | 'terminated' | 'camera_interrupted') {
  const db = getDb();
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE live_proctoring_sessions
    SET status = ?,
        camera_status = 'disconnected',
        stream_health = 'offline',
        completed_at = ?,
        updated_at = ?
    WHERE assessment_id = ?
  `).run(status, now, now, assessmentId);

  clearLiveStreamFrame(assessmentId);

  return { success: true, timestamp: now };
}

// ============================================================================
// CAREER INTELLIGENCE PERSISTENCE HELPERS
// ============================================================================

export interface UserCareerGoalRecord {
  id: string;
  user_id: string;
  target_role: string;
  target_industry?: string | null;
  experience_level?: string | null;
  preferred_location?: string | null;
  target_salary?: string | null;
  skills_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserCareerGoal(userId: string): Promise<UserCareerGoalRecord | null> {
  if (!userId) return null;
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM user_career_goals WHERE user_id = ?')
    .get(userId)) as UserCareerGoalRecord | undefined;
  return row || null;
}

export async function upsertUserCareerGoal(
  userId: string,
  data: {
    targetRole: string;
    targetIndustry?: string | null;
    experienceLevel?: string | null;
    preferredLocation?: string | null;
    targetSalary?: string | null;
    skillsSummary?: string[] | null;
  }
): Promise<UserCareerGoalRecord> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error('Valid User ID is required to upsert career goal.');
  }
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await getUserCareerGoal(userId);

  const skillsSummaryJson = Array.isArray(data.skillsSummary)
    ? JSON.stringify(data.skillsSummary)
    : null;

  if (existing) {
    await db
      .prepare(`
        UPDATE user_career_goals
        SET target_role = ?,
            target_industry = ?,
            experience_level = ?,
            preferred_location = ?,
            target_salary = ?,
            skills_summary = COALESCE(?, skills_summary),
            updated_at = ?
        WHERE user_id = ?
      `)
      .run(
        data.targetRole.trim(),
        data.targetIndustry?.trim() || null,
        data.experienceLevel?.trim() || null,
        data.preferredLocation?.trim() || null,
        data.targetSalary?.trim() || null,
        skillsSummaryJson,
        now,
        userId
      );

    return {
      ...existing,
      target_role: data.targetRole.trim(),
      target_industry: data.targetIndustry?.trim() || null,
      experience_level: data.experienceLevel?.trim() || null,
      preferred_location: data.preferredLocation?.trim() || null,
      target_salary: data.targetSalary?.trim() || null,
      skills_summary: skillsSummaryJson ?? existing.skills_summary,
      updated_at: now,
    };
  } else {
    const id = `goal_${crypto.randomUUID()}`;
    await db
      .prepare(`
        INSERT INTO user_career_goals (
          id, user_id, target_role, target_industry, experience_level,
          preferred_location, target_salary, skills_summary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        userId,
        data.targetRole.trim(),
        data.targetIndustry?.trim() || null,
        data.experienceLevel?.trim() || null,
        data.preferredLocation?.trim() || null,
        data.targetSalary?.trim() || null,
        skillsSummaryJson,
        now,
        now
      );

    return {
      id,
      user_id: userId,
      target_role: data.targetRole.trim(),
      target_industry: data.targetIndustry?.trim() || null,
      experience_level: data.experienceLevel?.trim() || null,
      preferred_location: data.preferredLocation?.trim() || null,
      target_salary: data.targetSalary?.trim() || null,
      skills_summary: skillsSummaryJson,
      created_at: now,
      updated_at: now,
    };
  }
}

// ============================================================================
// STUDENT CAREER PROFILE PERSISTENCE HELPERS
// ============================================================================

export interface StudentProject {
  id?: string;
  title: string;
  description?: string;
  role?: string;
  techStack: string[];
  repoUrl?: string;
  liveUrl?: string;
  highlights?: string[];
  bullets?: string[];
  startDate?: string;
  endDate?: string;
}

export interface StudentProfileRecord {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: number;
  graduation_month?: string | null;
  current_semester?: string | null;
  cgpa?: string | null;
  student_type: string;
  target_role: string;
  target_work_type: string;
  preferred_locations?: string | null;
  projects_data?: string | null;
  coursework?: string | null;
  achievements?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileDTO {
  id: string;
  userId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationYear: number;
  graduationMonth?: string | null;
  currentSemester?: string | null;
  cgpa?: string | null;
  studentType: 'college_student' | 'recent_graduate' | 'fresher';
  targetRole: string;
  targetWorkType: 'internship' | 'full_time' | 'both';
  preferredLocations: string[];
  projects: StudentProject[];
  coursework: string[];
  achievements: string[];
  createdAt: string;
  updatedAt: string;
}

function safeParseJsonStringArray(str?: string | null): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function safeParseStudentProjects(str?: string | null): StudentProject[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      id: String(p.id || `proj_${Math.random().toString(36).slice(2, 9)}`),
      title: String(p.title || '').trim(),
      description: String(p.description || '').trim(),
      role: p.role ? String(p.role).trim() : undefined,
      techStack: Array.isArray(p.techStack) ? p.techStack.map((t: any) => String(t).trim()).filter(Boolean) : [],
      repoUrl: p.repoUrl ? String(p.repoUrl).trim() : undefined,
      liveUrl: p.liveUrl ? String(p.liveUrl).trim() : undefined,
      highlights: Array.isArray(p.highlights) ? p.highlights.map((h: any) => String(h).trim()).filter(Boolean) : [],
      startDate: p.startDate ? String(p.startDate).trim() : undefined,
      endDate: p.endDate ? String(p.endDate).trim() : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getStudentProfile(userId: string): Promise<StudentProfileDTO | null> {
  if (!userId) return null;
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM student_profiles WHERE user_id = ?')
    .get(userId)) as StudentProfileRecord | undefined;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    institution: row.institution || '',
    degree: row.degree || '',
    fieldOfStudy: row.field_of_study || '',
    graduationYear: Number(row.graduation_year) || new Date().getFullYear(),
    graduationMonth: row.graduation_month || null,
    currentSemester: row.current_semester || null,
    cgpa: row.cgpa || null,
    studentType: (['college_student', 'recent_graduate', 'fresher'].includes(row.student_type)
      ? row.student_type
      : 'college_student') as StudentProfileDTO['studentType'],
    targetRole: row.target_role || 'Graduate Software Engineer',
    targetWorkType: (['internship', 'full_time', 'both'].includes(row.target_work_type)
      ? row.target_work_type
      : 'both') as StudentProfileDTO['targetWorkType'],
    preferredLocations: safeParseJsonStringArray(row.preferred_locations),
    projects: safeParseStudentProjects(row.projects_data),
    coursework: safeParseJsonStringArray(row.coursework),
    achievements: safeParseJsonStringArray(row.achievements),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertStudentProfile(
  userId: string,
  data: Partial<Omit<StudentProfileDTO, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<StudentProfileDTO> {
  if (!userId) throw new Error('User ID is required to upsert student profile.');
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await getStudentProfile(userId);

  const institution = (data.institution !== undefined ? data.institution : (existing?.institution || '')).trim();
  const degree = (data.degree !== undefined ? data.degree : (existing?.degree || '')).trim();
  const fieldOfStudy = (data.fieldOfStudy !== undefined ? data.fieldOfStudy : (existing?.fieldOfStudy || '')).trim();
  const graduationYear = Number(
    data.graduationYear !== undefined
      ? data.graduationYear
      : (existing?.graduationYear || new Date().getFullYear())
  );
  const graduationMonth = (data.graduationMonth !== undefined ? data.graduationMonth : (existing?.graduationMonth || null))?.trim() || null;
  const currentSemester = (data.currentSemester !== undefined ? data.currentSemester : (existing?.currentSemester || null))?.trim() || null;
  const cgpa = data.cgpa !== undefined && data.cgpa !== null ? String(data.cgpa).trim() : (existing?.cgpa || null);
  const studentType = (data.studentType || existing?.studentType || 'college_student') as StudentProfileDTO['studentType'];
  const targetRole = (data.targetRole || existing?.targetRole || 'Graduate Software Engineer').trim();
  const targetWorkType = (data.targetWorkType || existing?.targetWorkType || 'both') as StudentProfileDTO['targetWorkType'];

  const preferredLocations = Array.isArray(data.preferredLocations)
    ? data.preferredLocations
    : existing?.preferredLocations || [];
  const projects = Array.isArray(data.projects)
    ? data.projects
    : existing?.projects || [];
  const coursework = Array.isArray(data.coursework)
    ? data.coursework
    : existing?.coursework || [];
  const achievements = Array.isArray(data.achievements)
    ? data.achievements
    : existing?.achievements || [];

  const preferredLocationsJson = JSON.stringify(preferredLocations);
  const projectsJson = JSON.stringify(projects);
  const courseworkJson = JSON.stringify(coursework);
  const achievementsJson = JSON.stringify(achievements);

  if (existing) {
    await db
      .prepare(`
        UPDATE student_profiles
        SET institution = ?,
            degree = ?,
            field_of_study = ?,
            graduation_year = ?,
            graduation_month = ?,
            current_semester = ?,
            cgpa = ?,
            student_type = ?,
            target_role = ?,
            target_work_type = ?,
            preferred_locations = ?,
            projects_data = ?,
            coursework = ?,
            achievements = ?,
            updated_at = ?
        WHERE user_id = ?
      `)
      .run(
        institution,
        degree,
        fieldOfStudy,
        graduationYear,
        graduationMonth,
        currentSemester,
        cgpa,
        studentType,
        targetRole,
        targetWorkType,
        preferredLocationsJson,
        projectsJson,
        courseworkJson,
        achievementsJson,
        now,
        userId
      );
  } else {
    const id = `sp_${crypto.randomUUID()}`;
    await db
      .prepare(`
        INSERT INTO student_profiles (
          id, user_id, institution, degree, field_of_study,
          graduation_year, graduation_month, current_semester, cgpa,
          student_type, target_role, target_work_type, preferred_locations,
          projects_data, coursework, achievements, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        userId,
        institution,
        degree,
        fieldOfStudy,
        graduationYear,
        graduationMonth,
        currentSemester,
        cgpa,
        studentType,
        targetRole,
        targetWorkType,
        preferredLocationsJson,
        projectsJson,
        courseworkJson,
        achievementsJson,
        now,
        now
      );
  }

  // Keep user_career_goals in sync so legacy interfaces reflect targetRole & fresher level
  try {
    await upsertUserCareerGoal(userId, {
      targetRole,
      experienceLevel: 'Fresher / Entry Level',
      preferredLocation: preferredLocations[0] || null,
    });
  } catch {}

  const updated = await getStudentProfile(userId);
  if (!updated) {
    throw new Error('Failed to retrieve updated student profile.');
  }
  return updated;
}

export async function getUserActiveRoadmap(userId: string, targetRole?: string) {
  if (!userId) return null;
  const db = getDb();
  let row: any;
  if (targetRole && targetRole.trim()) {
    row = await db
      .prepare('SELECT * FROM user_learning_roadmaps WHERE user_id = ? AND LOWER(target_role) = LOWER(?) ORDER BY updated_at DESC LIMIT 1')
      .get(userId, targetRole.trim());
  } else {
    row = await db
      .prepare("SELECT * FROM user_learning_roadmaps WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1")
      .get(userId);
  }

  if (!row) return null;
  try {
    return {
      ...row,
      roadmap_data: JSON.parse(row.roadmap_data),
    };
  } catch {
    return null;
  }
}

export async function saveUserRoadmap(userId: string, targetRole: string, roadmapData: any) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `rdm_${crypto.randomUUID()}`;
  const dataString = JSON.stringify(roadmapData);

  // Set any previous active roadmaps for this user to superseded
  try {
    await db.prepare("UPDATE user_learning_roadmaps SET status = 'superseded', updated_at = ? WHERE user_id = ? AND status = 'active'").run(now, userId);
  } catch {}

  await db
    .prepare(`
      INSERT INTO user_learning_roadmaps (
        id, user_id, target_role, status, roadmap_data, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?)
    `)
    .run(id, userId, targetRole.trim(), dataString, now, now);

  return {
    id,
    user_id: userId,
    target_role: targetRole.trim(),
    status: 'active',
    roadmap_data: roadmapData,
    created_at: now,
    updated_at: now,
  };
}

export async function updateRoadmapStep(
  userId: string,
  roadmapId: string,
  milestoneIndex: number,
  stepIndex: number,
  completed: boolean
) {
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM user_learning_roadmaps WHERE id = ? AND user_id = ?')
    .get(roadmapId, userId)) as any;

  if (!row) return { success: false, error: 'Roadmap not found.' };

  try {
    const data = JSON.parse(row.roadmap_data);
    if (data.milestones && data.milestones[milestoneIndex]?.steps?.[stepIndex]) {
      data.milestones[milestoneIndex].steps[stepIndex].completed = completed;
    }
    const now = new Date().toISOString();
    await db
      .prepare('UPDATE user_learning_roadmaps SET roadmap_data = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(data), now, roadmapId);

    return { success: true, roadmap: { ...row, roadmap_data: data, updated_at: now } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update step.' };
  }
}

export async function createInterviewSession(
  userId: string,
  data: {
    targetRole: string;
    jobTitle?: string | null;
    company?: string | null;
    questions: any[];
  }
) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `int_${crypto.randomUUID()}`;

  await db
    .prepare(`
      INSERT INTO user_interview_sessions (
        id, user_id, target_role, job_title, company, questions_data,
        answers_data, overall_score, overall_feedback, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'in_progress', ?, ?)
    `)
    .run(
      id,
      userId,
      data.targetRole.trim(),
      data.jobTitle?.trim() || null,
      data.company?.trim() || null,
      JSON.stringify(data.questions),
      JSON.stringify([]),
      now,
      now
    );

  return {
    id,
    user_id: userId,
    target_role: data.targetRole.trim(),
    job_title: data.jobTitle || null,
    company: data.company || null,
    questions: data.questions,
    answers: [],
    overall_score: null,
    overall_feedback: null,
    status: 'in_progress',
    created_at: now,
  };
}

export async function getUserInterviewSessions(userId: string) {
  if (!userId) return [];
  const db = getDb();
  const rows = (await db
    .prepare('SELECT * FROM user_interview_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(userId)) as any[];

  return rows.map((r) => {
    let questions = [];
    let answers = [];
    try { questions = JSON.parse(r.questions_data); } catch {}
    try { answers = JSON.parse(r.answers_data || '[]'); } catch {}
    return {
      ...r,
      questions,
      answers,
    };
  });
}

export async function getInterviewSession(userId: string, sessionId: string) {
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM user_interview_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId)) as any;

  if (!row) return null;
  let questions = [];
  let answers = [];
  try { questions = JSON.parse(row.questions_data); } catch {}
  try { answers = JSON.parse(row.answers_data || '[]'); } catch {}

  return {
    ...row,
    questions,
    answers,
  };
}

export async function saveInterviewSessionAnswer(
  userId: string,
  sessionId: string,
  questionIndex: number,
  answerData: {
    answer: string;
    score: number;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
    modelAnswer?: string;
  }
) {
  const db = getDb();
  const session = await getInterviewSession(userId, sessionId);
  if (!session) return { success: false, error: 'Session not found.' };

  const answers = Array.isArray(session.answers) ? [...session.answers] : [];
  answers[questionIndex] = {
    ...answerData,
    submittedAt: new Date().toISOString(),
  };

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE user_interview_sessions SET answers_data = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(JSON.stringify(answers), now, sessionId, userId);

  return { success: true, answers };
}

export async function completeInterviewSession(
  userId: string,
  sessionId: string,
  overallScore: number,
  overallFeedback: string
) {
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .prepare(`
      UPDATE user_interview_sessions
      SET overall_score = ?,
          overall_feedback = ?,
          status = 'completed',
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(Math.round(overallScore), overallFeedback, now, sessionId, userId);

  try {
    const { recordStudentReadinessSnapshot } = await import('@/server/services/unifiedStudentContext');
    await recordStudentReadinessSnapshot(
      userId,
      'interview_completed',
      `Mock Interview completed: Score ${Math.round(overallScore)}/100`
    );
  } catch (snapErr) {
    console.warn('[completeInterviewSession] Non-blocking snapshot error:', snapErr);
  }

  return { success: true, timestamp: now };
}

// ============================================================================
// GUIDED PROJECTS & AI PROJECT MENTOR
// ============================================================================

export interface GuidedProjectDTO {
  id: string;
  userId: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetRole: string;
  techStack: string[];
  problemStatement: string;
  realWorldUseCase: string;
  architectureOverview: string;
  databaseDesign: string;
  estimatedComplexity: string;
  resumeValue: string;
  specification: any;
  milestones: any[];
  currentMilestone: number;
  progressPercent: number;
  status: 'in_progress' | 'completed' | 'paused';
  githubUrl?: string | null;
  liveUrl?: string | null;
  resumeBullets: string[];
  createdAt: string;
  updatedAt: string;
}

function mapGuidedProjectRow(row: any): GuidedProjectDTO {
  let techStack: string[] = [];
  let specification: any = null;
  let milestones: any[] = [];
  let resumeBullets: string[] = [];

  try { techStack = JSON.parse(row.tech_stack || '[]'); } catch {}
  try { specification = JSON.parse(row.specification_json || '{}'); } catch {}
  try { milestones = JSON.parse(row.milestones_json || '[]'); } catch {}
  try { resumeBullets = JSON.parse(row.resume_bullets_json || '[]'); } catch {}

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    difficulty: (row.difficulty as any) || 'Intermediate',
    targetRole: row.target_role || 'Graduate Software Engineer',
    techStack,
    problemStatement: row.problem_statement || '',
    realWorldUseCase: row.real_world_use_case || '',
    architectureOverview: row.architecture_overview || '',
    databaseDesign: row.database_design || '',
    estimatedComplexity: row.estimated_complexity || '',
    resumeValue: row.resume_value || '',
    specification,
    milestones,
    currentMilestone: Number(row.current_milestone) || 1,
    progressPercent: Number(row.progress_percent) || 0,
    status: (row.status as any) || 'in_progress',
    githubUrl: row.github_url || null,
    liveUrl: row.live_url || null,
    resumeBullets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGuidedProject(
  userId: string,
  data: Partial<GuidedProjectDTO>
): Promise<GuidedProjectDTO> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error('Valid User ID is required to create a guided project.');
  }
  const db = getDb();
  const id = `gproj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const title = (data.title || 'Portfolio Software Project').trim();
  const difficulty = data.difficulty || 'Intermediate';
  const targetRole = (data.targetRole || 'Graduate Software Engineer').trim();
  const techStack = Array.isArray(data.techStack) ? data.techStack : [];
  const problemStatement = data.problemStatement || '';
  const realWorldUseCase = data.realWorldUseCase || '';
  const architectureOverview = data.architectureOverview || '';
  const databaseDesign = data.databaseDesign || '';
  const estimatedComplexity = data.estimatedComplexity || '2-3 weeks';
  const resumeValue = data.resumeValue || '';
  const specification = data.specification || {};
  const milestones = Array.isArray(data.milestones) ? data.milestones : [];
  const currentMilestone = Number(data.currentMilestone) || 1;
  const progressPercent = Number(data.progressPercent) || 0;
  const status = data.status || 'in_progress';
  const githubUrl = data.githubUrl || null;
  const liveUrl = data.liveUrl || null;
  const resumeBullets = Array.isArray(data.resumeBullets) ? data.resumeBullets : [];

  await db
    .prepare(`
      INSERT INTO guided_projects (
        id, user_id, title, difficulty, target_role, tech_stack,
        problem_statement, real_world_use_case, architecture_overview, database_design,
        estimated_complexity, resume_value, specification_json, milestones_json,
        current_milestone, progress_percent, status, github_url, live_url,
        resume_bullets_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      userId,
      title,
      difficulty,
      targetRole,
      JSON.stringify(techStack),
      problemStatement,
      realWorldUseCase,
      architectureOverview,
      databaseDesign,
      estimatedComplexity,
      resumeValue,
      JSON.stringify(specification),
      JSON.stringify(milestones),
      currentMilestone,
      progressPercent,
      status,
      githubUrl,
      liveUrl,
      JSON.stringify(resumeBullets),
      now,
      now
    );

  const created = await getGuidedProjectById(id, userId);
  if (!created) throw new Error('Failed to create guided project');

  try {
    const { recordStudentReadinessSnapshot, clearStudentContextCache } = await import('@/server/services/unifiedStudentContext');
    clearStudentContextCache(userId);
    await recordStudentReadinessSnapshot(
      userId,
      'project_started',
      `Started guided capstone project: ${created.title}`
    );
  } catch (snapErr) {
    console.warn('[createGuidedProject] Non-blocking snapshot error:', snapErr);
  }

  return created;
}

export async function getGuidedProjectById(
  id: string,
  userId: string
): Promise<GuidedProjectDTO | null> {
  if (!id || !userId) return null;
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM guided_projects WHERE id = ? AND user_id = ?')
    .get(id, userId)) as any;
  if (!row) return null;
  return mapGuidedProjectRow(row);
}

export async function getUserGuidedProjects(
  userId: string
): Promise<GuidedProjectDTO[]> {
  if (!userId) return [];
  const db = getDb();
  const rows = (await db
    .prepare('SELECT * FROM guided_projects WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId)) as any[];
  return (rows || []).map(mapGuidedProjectRow);
}

export async function updateGuidedProject(
  id: string,
  userId: string,
  updates: Partial<GuidedProjectDTO>
): Promise<GuidedProjectDTO | null> {
  if (!id || !userId) return null;
  const db = getDb();
  const existing = await getGuidedProjectById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = updates.title !== undefined ? updates.title : existing.title;
  const difficulty = updates.difficulty !== undefined ? updates.difficulty : existing.difficulty;
  const targetRole = updates.targetRole !== undefined ? updates.targetRole : existing.targetRole;
  const techStack = updates.techStack !== undefined ? updates.techStack : existing.techStack;
  const problemStatement = updates.problemStatement !== undefined ? updates.problemStatement : existing.problemStatement;
  const realWorldUseCase = updates.realWorldUseCase !== undefined ? updates.realWorldUseCase : existing.realWorldUseCase;
  const architectureOverview = updates.architectureOverview !== undefined ? updates.architectureOverview : existing.architectureOverview;
  const databaseDesign = updates.databaseDesign !== undefined ? updates.databaseDesign : existing.databaseDesign;
  const estimatedComplexity = updates.estimatedComplexity !== undefined ? updates.estimatedComplexity : existing.estimatedComplexity;
  const resumeValue = updates.resumeValue !== undefined ? updates.resumeValue : existing.resumeValue;
  const specification = updates.specification !== undefined ? updates.specification : existing.specification;
  const milestones = updates.milestones !== undefined ? updates.milestones : existing.milestones;
  const currentMilestone = updates.currentMilestone !== undefined ? updates.currentMilestone : existing.currentMilestone;
  const progressPercent = updates.progressPercent !== undefined ? updates.progressPercent : existing.progressPercent;
  const status = updates.status !== undefined ? updates.status : existing.status;
  const githubUrl = updates.githubUrl !== undefined ? updates.githubUrl : existing.githubUrl;
  const liveUrl = updates.liveUrl !== undefined ? updates.liveUrl : existing.liveUrl;
  const resumeBullets = updates.resumeBullets !== undefined ? updates.resumeBullets : existing.resumeBullets;

  await db
    .prepare(`
      UPDATE guided_projects
      SET title = ?,
          difficulty = ?,
          target_role = ?,
          tech_stack = ?,
          problem_statement = ?,
          real_world_use_case = ?,
          architecture_overview = ?,
          database_design = ?,
          estimated_complexity = ?,
          resume_value = ?,
          specification_json = ?,
          milestones_json = ?,
          current_milestone = ?,
          progress_percent = ?,
          status = ?,
          github_url = ?,
          live_url = ?,
          resume_bullets_json = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(
      title,
      difficulty,
      targetRole,
      JSON.stringify(techStack),
      problemStatement,
      realWorldUseCase,
      architectureOverview,
      databaseDesign,
      estimatedComplexity,
      resumeValue,
      JSON.stringify(specification),
      JSON.stringify(milestones),
      currentMilestone,
      progressPercent,
      status,
      githubUrl,
      liveUrl,
      JSON.stringify(resumeBullets),
      now,
      id,
      userId
    );

  if (
    updates.currentMilestone !== undefined ||
    updates.progressPercent !== undefined ||
    updates.status === 'completed'
  ) {
    try {
      const { recordStudentReadinessSnapshot } = await import('@/server/services/unifiedStudentContext');
      await recordStudentReadinessSnapshot(
        userId,
        updates.status === 'completed' ? 'project_completed' : 'project_milestone_completed',
        `Project: ${title} (${updates.status === 'completed' ? 'Completed' : `Milestone ${currentMilestone}, ${progressPercent}%`})`
      );
    } catch (snapErr) {
      console.warn('[updateGuidedProject] Non-blocking snapshot error:', snapErr);
    }
  }

  return getGuidedProjectById(id, userId);
}

export async function deleteGuidedProject(
  id: string,
  userId: string
): Promise<boolean> {
  if (!id || !userId) return false;
  const db = getDb();
  const res = (await db
    .prepare('DELETE FROM guided_projects WHERE id = ? AND user_id = ?')
    .run(id, userId)) as any;
  return Boolean(res && Number(res.changes) > 0);
}

export async function importGuidedProjectToProfileAndResume(
  userId: string,
  projectId: string
): Promise<{ success: boolean; studentProfileUpdated: boolean; resumeUpdated: boolean; projectTitle: string }> {
  const project = await getGuidedProjectById(projectId, userId);
  if (!project) throw new Error('Guided project not found or unauthorized.');

  const db = getDb();
  let studentProfileUpdated = false;
  let resumeUpdated = false;

  // 1. Update Student Profile Portfolio
  try {
    const sp = await getStudentProfile(userId);
    const bullets = project.resumeBullets && project.resumeBullets.length > 0
      ? project.resumeBullets
      : [project.problemStatement || project.title];

    const studentProj: StudentProject = {
      id: `proj_${project.id}`,
      title: project.title,
      description: project.problemStatement || project.realWorldUseCase || project.title,
      role: project.targetRole,
      techStack: project.techStack,
      repoUrl: project.githubUrl || undefined,
      liveUrl: project.liveUrl || undefined,
      highlights: bullets,
    };

    const existingProjects = sp?.projects ? [...sp.projects] : [];
    const filtered = existingProjects.filter((p) => p.title.toLowerCase() !== project.title.toLowerCase());
    const updatedProjects = [studentProj, ...filtered];

    await upsertStudentProfile(userId, {
      projects: updatedProjects,
    });
    studentProfileUpdated = true;
  } catch (err) {
    console.warn('[importGuidedProject] Student profile update error:', err);
  }

  // 2. Update Latest Resume (for Resume Builder & A4 PDF)
  try {
    const resumeRow = (await db
      .prepare('SELECT id, resume_data FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(userId)) as any;

    if (resumeRow?.resume_data) {
      const parsed = JSON.parse(resumeRow.resume_data);
      const existingResProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
      const newProjItem = {
        id: `res_proj_${project.id}`,
        title: project.title,
        description: project.problemStatement || project.title,
        technologies: project.techStack,
        link: project.liveUrl || project.githubUrl || undefined,
        bullets: project.resumeBullets && project.resumeBullets.length > 0 ? project.resumeBullets : undefined,
      };

      const filteredRes = existingResProjects.filter((p: any) => (p.title || '').toLowerCase() !== project.title.toLowerCase());
      parsed.projects = [newProjItem, ...filteredRes];

      await db
        .prepare('UPDATE resumes SET resume_data = ? WHERE id = ?')
        .run(JSON.stringify(parsed), resumeRow.id);
      resumeUpdated = true;
    }
  } catch (err) {
    console.warn('[importGuidedProject] Resume data update error:', err);
  }

  return {
    success: true,
    studentProfileUpdated,
    resumeUpdated,
    projectTitle: project.title,
  };
}

// ==========================================
// 28. CAREER READINESS HISTORY (SNAPSHOTS)
// ==========================================

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

export interface ReadinessSnapshotInput {
  overallScore: number;
  overallLevel: string;
  technicalScore: number;
  projectScore: number;
  resumeScore: number;
  interviewScore: number;
  triggerActivity: string;
  activityDetail?: string | null;
}

export async function recordReadinessSnapshot(
  userId: string,
  data: ReadinessSnapshotInput
): Promise<ReadinessSnapshotRecord | null> {
  if (!userId) return null;
  const db = getDb();

  try {
    // Deduplication check: check if the user already has a snapshot within the last 2 minutes with identical score and trigger
    const recent = (await db
      .prepare(
        'SELECT * FROM career_readiness_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(userId)) as any;

    if (recent) {
      const recentTime = new Date(recent.created_at).getTime();
      const elapsedMinutes = (Date.now() - recentTime) / 60000;
      if (
        elapsedMinutes < 2 &&
        recent.overall_score === Math.round(data.overallScore) &&
        recent.trigger_activity === data.triggerActivity
      ) {
        return {
          id: recent.id,
          userId: recent.user_id,
          overallScore: recent.overall_score,
          overallLevel: recent.overall_level,
          technicalScore: recent.technical_score,
          projectScore: recent.project_score,
          resumeScore: recent.resume_score,
          interviewScore: recent.interview_score,
          triggerActivity: recent.trigger_activity,
          activityDetail: recent.activity_detail,
          createdAt: recent.created_at,
        };
      }
    }

    const id = `crh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO career_readiness_history (
          id, user_id, overall_score, overall_level, technical_score,
          project_score, resume_score, interview_score, trigger_activity,
          activity_detail, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        userId,
        Math.round(data.overallScore),
        data.overallLevel,
        Math.round(data.technicalScore),
        Math.round(data.projectScore),
        Math.round(data.resumeScore),
        Math.round(data.interviewScore),
        data.triggerActivity,
        data.activityDetail || null,
        now
      );

    return {
      id,
      userId,
      overallScore: Math.round(data.overallScore),
      overallLevel: data.overallLevel,
      technicalScore: Math.round(data.technicalScore),
      projectScore: Math.round(data.projectScore),
      resumeScore: Math.round(data.resumeScore),
      interviewScore: Math.round(data.interviewScore),
      triggerActivity: data.triggerActivity,
      activityDetail: data.activityDetail || null,
      createdAt: now,
    };
  } catch (err) {
    console.warn('[recordReadinessSnapshot] Error inserting snapshot:', err);
    return null;
  }
}

export async function getUserReadinessHistory(
  userId: string,
  limit = 15
): Promise<ReadinessSnapshotRecord[]> {
  if (!userId) return [];
  const db = getDb();
  try {
    const rows = (await db
      .prepare(
        'SELECT * FROM career_readiness_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
      )
      .all(userId, limit)) as any[];

    return (rows || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      overallScore: r.overall_score,
      overallLevel: r.overall_level,
      technicalScore: r.technical_score,
      projectScore: r.project_score,
      resumeScore: r.resume_score,
      interviewScore: r.interview_score,
      triggerActivity: r.trigger_activity,
      activityDetail: r.activity_detail || null,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn('[getUserReadinessHistory] Error querying history:', err);
    return [];
  }
}




