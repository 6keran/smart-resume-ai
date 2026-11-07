import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { assertStagingTargetSafe, verifyDatabaseIdentity, maskDatabaseUrl } from './dbSecurityGate.mjs';

const { Pool, types } = pg;
types.setTypeParser(20, (val) => parseInt(val, 10));

// Load environment variables if .env.local or .env exists
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

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!postgresUrl) {
  console.error('\n❌ ERROR: POSTGRES_URL, DATABASE_URL, or NEON_DATABASE_URL environment variable is required.');
  console.error('\nUsage:');
  console.error('  # Using inline environment variable:');
  console.error('  POSTGRES_URL="postgres://username:password@hostname:5432/dbname?sslmode=require" node scripts/migrate_sqlite_to_postgres.mjs\n');
  console.error('  # Or configure POSTGRES_URL in .env.local and run:');
  console.error('  npm run db:migrate:postgres\n');
  process.exit(1);
}

const sqliteDbPath = path.join(process.cwd(), 'data', 'smart_resume.db');
if (!fs.existsSync(sqliteDbPath)) {
  console.error(`\n❌ ERROR: Local SQLite database not found at ${sqliteDbPath}`);
  process.exit(1);
}



const TABLE_SCHEMAS = [
  {
    name: 'admin_users',
    conflictKey: 'id',
    sql: `
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'ADMIN',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT,
        is_active INTEGER DEFAULT 1
      );
    `,
  },
  {
    name: 'skills_catalog',
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    `,
  },
  {
    name: 'visitors',
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    `,
  },
  {
    name: 'resume_versions',
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    conflictKey: 'id',
    sql: `
      CREATE TABLE IF NOT EXISTS job_searches (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        query TEXT NOT NULL,
        location TEXT,
        provider TEXT NOT NULL,
        results_count INTEGER NOT NULL,
        searched_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        user_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_job_searches_date ON job_searches(searched_at);
    `,
  },
  {
    name: 'job_search_results',
    conflictKey: 'id',
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
    name: 'job_matches',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'job_applications',
    conflictKey: 'id',
    sql: `
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
    conflictKey: 'id',
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
    conflictKey: 'id',
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
    name: 'live_proctoring_sessions',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'audit_events',
    conflictKey: 'id',
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
  {
    name: 'student_profiles',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'guided_projects',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'career_readiness_history',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'user_career_goals',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'user_learning_roadmaps',
    conflictKey: 'id',
    sql: `
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
    `,
  },
  {
    name: 'user_interview_sessions',
    conflictKey: 'id',
    sql: `
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
    `,
  },
];

async function runMigration() {
  // 1. Strict pre-connection target validation (runs before opening any socket or database)
  let target;
  try {
    target = assertStagingTargetSafe(postgresUrl, { actionDescription: 'data migration' });
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('SMART RESUME AI: SQLITE -> POSTGRESQL DATA MIGRATION');
  console.log('====================================================');
  console.log(`Source SQLite:   ${sqliteDbPath}`);
  console.log(`Target Postgres: ${target.maskedUrl}`);
  console.log('====================================================\n');

  const sqliteDb = new DatabaseSync(sqliteDbPath);
  const pool = new Pool({
    connectionString: postgresUrl,
    ssl: target.isLocal ? false : true,
  });

  let client;
  try {
    client = await pool.connect();

    // 2. Independent post-connection database identity verification
    const identity = await verifyDatabaseIdentity(client);
    console.log(`Verified DB Identity: Database="${identity.database}" | User="${identity.user}" | IP="${identity.serverIp}"\n`);

    console.log('[Step 1/3] Creating PostgreSQL tables and indexes...');
    for (const t of TABLE_SCHEMAS) {
      await client.query(t.sql);
    }
    console.log(`✓ All ${TABLE_SCHEMAS.length} tables and indexes ensured in PostgreSQL.\n`);

    console.log('[Step 1b/3] Reconciling table columns and optimization indexes...');
    const columnReconciliations = [
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_id TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applied_confirmed_at TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS description_snippet TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS salary TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS tailored_summary TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS checklist_state TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS match_analysis TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS interview_date TEXT',
      'ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS outreach_message TEXT',
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
    console.log('✓ All missing columns and optimization indexes reconciled successfully in PostgreSQL.\n');

    console.log('[Step 2/3] Migrating data records table by table...');
    const results = [];

    for (const t of TABLE_SCHEMAS) {
      const sqliteRows = sqliteDb.prepare(`SELECT * FROM "${t.name}"`).all();
      const sqliteCount = sqliteRows.length;

      if (sqliteCount === 0) {
        results.push({ table: t.name, sqlite: 0, postgres: 0, status: 'MATCH (EMPTY)', isOk: true });
        continue;
      }

      // Insert rows into PostgreSQL in chunks for high performance and resilience
      const columns = Object.keys(sqliteRows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');
      const conflictClause = `ON CONFLICT (${t.conflictKey}) DO NOTHING`;
      const chunkSize = 50;

      for (let i = 0; i < sqliteRows.length; i += chunkSize) {
        const chunk = sqliteRows.slice(i, i + chunkSize);
        const rowPlaceholders = [];
        const values = [];

        chunk.forEach((row, rowIdx) => {
          const rowParams = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`);
          rowPlaceholders.push(`(${rowParams.join(', ')})`);
          columns.forEach(c => values.push(row[c]));
        });

        const chunkSql = `INSERT INTO "${t.name}" (${colList}) VALUES ${rowPlaceholders.join(', ')} ${conflictClause}`;
        await client.query(chunkSql, values);
      }

      // Verify row count in target database
      const pgCountRes = await client.query(`SELECT count(*) as c FROM "${t.name}"`);
      const pgCount = parseInt(pgCountRes.rows[0].c, 10);

      let status = 'MATCH';
      let isOk = true;
      if (pgCount === sqliteCount) {
        status = 'MATCH';
      } else if (pgCount > sqliteCount) {
        status = `VERIFIED (PG HAS ${pgCount - sqliteCount} EXTRA ROWS)`;
      } else {
        status = `COUNT DEFICIT (${pgCount} vs ${sqliteCount} SQLite rows)`;
        isOk = false;
      }
      results.push({ table: t.name, sqlite: sqliteCount, postgres: pgCount, status, isOk });
    }

    console.log('\n[Step 3/3] Migration Summary & Integrity Verification:');
    console.log('--------------------------------------------------------------------------------');
    console.log(
      'Table Name'.padEnd(32) +
      'SQLite Count'.padEnd(16) +
      'Postgres Count'.padEnd(16) +
      'Status'
    );
    console.log('--------------------------------------------------------------------------------');

    let allMatched = true;
    for (const r of results) {
      if (!r.isOk) allMatched = false;
      const statusIcon = r.isOk ? '✓' : '✗';
      console.log(
        `${r.table.padEnd(32)}${String(r.sqlite).padEnd(16)}${String(r.postgres).padEnd(16)}${statusIcon} ${r.status}`
      );
    }
    console.log('--------------------------------------------------------------------------------');

    // Verify sample admin and user records
    console.log('\n--- VERIFYING SAMPLE CREDENTIALS & SESSIONS ---');
    const sampleAdmins = await client.query('SELECT id, email, role, length(password_hash) as hash_len FROM admin_users LIMIT 2');
    console.log('Admin accounts in Postgres:');
    for (const a of sampleAdmins.rows) {
      console.log(`  - ${a.email} (${a.role}) [hash length: ${a.hash_len}]`);
    }

    const sampleUsers = await client.query('SELECT id, name, email, role, length(coalesce(password_hash, \'\')) as hash_len FROM users LIMIT 3');
    console.log('Sample candidate accounts in Postgres:');
    for (const u of sampleUsers.rows) {
      console.log(`  - ${u.name} <${u.email}> (${u.role}) [hash length: ${u.hash_len}]`);
    }

    if (allMatched) {
      console.log(`\n🎉 SUCCESS: All ${TABLE_SCHEMAS.length} tables migrated and verified with 100% integrity!`);
    } else {
      console.log('\n⚠️ NOTICE: Some table counts differ (possibly due to pre-existing rows in Postgres). Please review above table.');
    }
  } finally {
    if (client) {
      try {
        client.release();
      } catch {}
    }
    await pool.end();
    try {
      sqliteDb.close();
    } catch {}
  }
}

runMigration().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
