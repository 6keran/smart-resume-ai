/**
 * SMART RESUME AI: IDEMPOTENT POSTGRESQL SCHEMA INITIALIZER
 *
 * This script creates all required PostgreSQL application tables and indexes
 * using IF NOT EXISTS DDL statements.
 *
 * CRITICAL SAFETY RULES:
 * - Completely idempotent: uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
 * - Zero data loss: does NOT truncate, drop, delete, or overwrite existing records.
 * - Safe to run against fresh or already-populated databases.
 */

import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

const { Client } = pg;

function loadEnv() {
  for (const file of ['.env.local', '.env.production', '.env']) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!postgresUrl) {
  console.error('\n❌ ERROR: POSTGRES_URL or DATABASE_URL environment variable is required.');
  console.error('\nUsage:');
  console.error('  POSTGRES_URL="postgresql://user:pass@ep-pooler.region.neon.tech/neondb?sslmode=require" npm run db:init:postgres\n');
  process.exit(1);
}

const TABLE_SCHEMAS = [
  {
    name: 'admin_users',
    sql: `
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
    `,
  },
  {
    name: 'skills_catalog',
    sql: `
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
    `,
  },
  {
    name: 'assessment_configs',
    sql: `
      CREATE TABLE IF NOT EXISTS assessment_configs (
        id TEXT PRIMARY KEY,
        skill_slug TEXT UNIQUE NOT NULL,
        questions_count INTEGER DEFAULT 10,
        pass_percentage INTEGER DEFAULT 70,
        time_limit_minutes INTEGER DEFAULT 20,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    name: 'courses',
    sql: `
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
    `,
  },
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        session_token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        password_hash TEXT,
        role TEXT DEFAULT 'USER',
        is_active INTEGER DEFAULT 1,
        last_login_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_users_token ON users(session_token);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
      CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email));
    `,
  },
  {
    name: 'visitors',
    sql: `
      CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        anonymous_id TEXT UNIQUE NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        total_sessions INTEGER DEFAULT 1,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_visitors_anon ON visitors(anonymous_id);
    `,
  },
  {
    name: 'resumes',
    sql: `
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        parsed_successfully INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        user_id TEXT,
        resume_data TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_resumes_visitor ON resumes(visitor_id);
    `,
  },
  {
    name: 'resume_analyses',
    sql: `
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
        created_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_analyses_date ON resume_analyses(analyzed_at);
    `,
  },
  {
    name: 'resume_improvements',
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_improvements_resume ON resume_improvements(resume_id);
      CREATE INDEX IF NOT EXISTS idx_improvements_user_created ON resume_improvements(user_id, created_at DESC);
    `,
  },
  {
    name: 'resume_versions',
    sql: `
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
    `,
  },
  {
    name: 'assessment_questions',
    sql: `
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
    `,
  },
  {
    name: 'assessments',
    sql: `
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
        created_at TEXT NOT NULL,
        user_id TEXT,
        termination_reason TEXT,
        proctoring_events_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_assessments_skill ON assessments(skill);
    `,
  },
  {
    name: 'assessment_question_snapshots',
    sql: `
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
    `,
  },
  {
    name: 'verified_skills',
    sql: `
      CREATE TABLE IF NOT EXISTS verified_skills (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        skill_name TEXT NOT NULL,
        status TEXT NOT NULL,
        assessment_id TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_skills_name ON verified_skills(skill_name);
    `,
  },
  {
    name: 'certificates',
    sql: `
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
    `,
  },
  {
    name: 'course_progress',
    sql: `
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
    `,
  },
  {
    name: 'user_skills',
    sql: `
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
    `,
  },
  {
    name: 'job_searches',
    sql: `
      CREATE TABLE IF NOT EXISTS job_searches (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        location TEXT,
        category TEXT,
        filters_json TEXT,
        results_count INTEGER DEFAULT 0,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_job_search_date ON job_searches(created_at);
    `,
  },
  {
    name: 'job_search_results',
    sql: `
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
    `,
  },
  {
    name: 'job_applications',
    sql: `
      CREATE TABLE IF NOT EXISTS job_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        job_title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        job_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Applied',
        notes TEXT,
        resume_id TEXT,
        applied_confirmed_at TEXT,
        description_snippet TEXT,
        salary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_job_app_user ON job_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_job_app_status ON job_applications(status);
    `,
  },
  {
    name: 'feedback',
    sql: `
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        rating INTEGER NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        suggestions TEXT,
        status TEXT DEFAULT 'new',
        created_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(created_at);
    `,
  },
  {
    name: 'proctoring_events',
    sql: `
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
    `,
  },
  {
    name: 'audit_events',
    sql: `
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
    `,
  },
];

async function initSchema() {
  const client = new Client({
    connectionString: postgresUrl,
    ssl: postgresUrl.includes('localhost') || postgresUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('================================================================');
    console.log('SMART RESUME AI: IDEMPOTENT POSTGRESQL SCHEMA INITIALIZER');
    console.log('================================================================');
    console.log(`Target: ${postgresUrl.replace(/:[^:@]+@/, ':****@')}`);
    console.log('Mode: Safe DDL (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)\n');

    for (const t of TABLE_SCHEMAS) {
      await client.query(t.sql);
      console.log(`✓ Table and indexes ensured: ${t.name}`);
    }

    const columnReconciliations = [
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_id TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applied_confirmed_at TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS description_snippet TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS salary TEXT',
      'ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_data TEXT',
      'ALTER TABLE resume_improvements ADD COLUMN IF NOT EXISTS resume_id TEXT',
      'ALTER TABLE resume_improvements ADD COLUMN IF NOT EXISTS category TEXT',
      'ALTER TABLE resume_improvements ADD COLUMN IF NOT EXISTS before_text TEXT',
      'ALTER TABLE resume_improvements ADD COLUMN IF NOT EXISTS after_text TEXT',
      'ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS resume_id TEXT',
      'ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1',
      'ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS resume_data TEXT',
      'ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS change_summary TEXT',
      'ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_token TEXT',
      'CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email))',
      'CREATE INDEX IF NOT EXISTS idx_improvements_resume ON resume_improvements(resume_id)',
      'CREATE INDEX IF NOT EXISTS idx_improvements_user_created ON resume_improvements(user_id, created_at DESC)',
    ];

    for (const ddl of columnReconciliations) {
      await client.query(ddl);
    }
    console.log('\n✓ Column reconciliations completed.');
    console.log(`\n🎉 SUCCESS: All ${TABLE_SCHEMAS.length} tables and schemas initialized in PostgreSQL.`);
  } catch (err) {
    console.error('Schema initialization error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initSchema();
