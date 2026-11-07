/**
 * SMART RESUME AI: READ-ONLY POSTGRESQL SCHEMA VERIFICATION PROCEDURE
 *
 * This script connects to the target PostgreSQL database using POSTGRES_URL
 * and verifies that all required application tables, indexes, and columns exist.
 *
 * CRITICAL SAFETY RULES:
 * - Read-only: executes only SELECT queries against information_schema.
 * - Zero modifications: does NOT run DDL, INSERT, UPDATE, DELETE, or DROP.
 * - Safe for live production inspection.
 */

import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { assertStagingTargetSafe, verifyDatabaseIdentity, maskDatabaseUrl } from './dbSecurityGate.mjs';

const { Client } = pg;

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
  console.log('================================================================');
  console.log('SMART RESUME AI: POSTGRESQL SCHEMA VERIFICATION (READ-ONLY)');
  console.log('================================================================');
  console.log('\n⚠️  NOTICE: POSTGRES_URL, DATABASE_URL, or NEON_DATABASE_URL is not set in environment or .env.local.');
  console.log('\nTo run a read-only schema verification against your Neon PostgreSQL database:');
  console.log('  POSTGRES_URL="postgresql://user:pass@ep-pooler.region.neon.tech/neondb?sslmode=require" node scripts/verify_postgres_schema.mjs\n');
  process.exit(0);
}

const REQUIRED_TABLES = [
  'admin_users',
  'skills_catalog',
  'assessment_configs',
  'courses',
  'users',
  'visitors',
  'resumes',
  'resume_analyses',
  'resume_improvements',
  'resume_versions',
  'assessment_questions',
  'assessments',
  'assessment_question_snapshots',
  'verified_skills',
  'certificates',
  'course_progress',
  'user_skills',
  'job_searches',
  'job_search_results',
  'job_matches',
  'job_applications',
  'feedback',
  'proctoring_events',
  'live_proctoring_sessions',
  'audit_events',
  'student_profiles',
  'guided_projects',
  'career_readiness_history',
  'user_career_goals',
  'user_learning_roadmaps',
  'user_interview_sessions',
];

const CRITICAL_COLUMNS = {
  career_readiness_history: [
    'id',
    'user_id',
    'overall_score',
    'overall_level',
    'technical_score',
    'project_score',
    'resume_score',
    'interview_score',
    'trigger_activity',
    'created_at',
  ],
  user_career_goals: [
    'id',
    'user_id',
    'target_role',
    'created_at',
    'updated_at',
  ],
  user_learning_roadmaps: [
    'id',
    'user_id',
    'target_role',
    'status',
    'roadmap_data',
    'created_at',
    'updated_at',
  ],
  user_interview_sessions: [
    'id',
    'user_id',
    'target_role',
    'questions_data',
    'status',
    'created_at',
    'updated_at',
  ],
  student_profiles: [
    'id',
    'user_id',
    'institution',
    'degree',
    'field_of_study',
    'graduation_year',
    'target_role',
    'created_at',
    'updated_at',
  ],
  guided_projects: [
    'id',
    'user_id',
    'title',
    'difficulty',
    'target_role',
    'tech_stack',
    'status',
    'created_at',
    'updated_at',
  ],
  resume_versions: [
    'id',
    'user_id',
    'resume_id',
    'version_number',
    'resume_data',
    'change_summary',
    'created_at',
  ],
  resume_improvements: [
    'id',
    'user_id',
    'resume_id',
    'category',
    'title',
    'before_text',
    'after_text',
    'created_at',
  ],
  resumes: [
    'id',
    'user_id',
    'filename',
    'file_type',
    'uploaded_at',
    'resume_data',
    'created_at',
  ],
  job_applications: [
    'id',
    'user_id',
    'job_id',
    'job_title',
    'company',
    'status',
    'resume_id',
    'applied_confirmed_at',
    'cover_letter',
    'tailored_summary',
    'checklist_state',
    'match_analysis',
    'interview_date',
    'outreach_message',
  ],
  users: [
    'id',
    'name',
    'email',
    'session_token',
    'created_at',
    'updated_at',
    'last_active_at',
  ],
  admin_users: [
    'id',
    'email',
    'password_hash',
    'role',
    'created_at',
    'updated_at',
    'is_active',
    'session_token',
  ],
};

const CRITICAL_INDEXES = {
  resume_versions: [
    'idx_resume_ver_user',
    'idx_resume_ver_res',
    'idx_resume_ver_order',
    'idx_resume_ver_unique',
  ],
  resume_improvements: [
    'idx_improvements_user',
    'idx_improvements_resume',
  ],
  users: [
    'idx_users_token',
    'idx_users_lower_email',
  ],
  job_applications: [
    'idx_job_app_user',
  ],
};

async function verifySchema() {
  // 1. Strict pre-connection target validation (runs before opening any socket)
  let target;
  try {
    target = assertStagingTargetSafe(postgresUrl, { actionDescription: 'schema verification' });
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: postgresUrl,
    ssl: target.isLocal ? false : true,
  });

  try {
    await client.connect();

    // 2. Independent post-connection database identity verification
    const identity = await verifyDatabaseIdentity(client);

    console.log('================================================================');
    console.log('SMART RESUME AI: POSTGRESQL SCHEMA VERIFICATION (READ-ONLY)');
    console.log('================================================================');
    console.log(`Connected to: ${target.maskedUrl}`);
    console.log(`Verified DB Identity: Database="${identity.database}" | User="${identity.user}" | IP="${identity.serverIp}"`);
    console.log('Verification mode: READ-ONLY (Zero writes / Zero modifications)\n');

    // Query information_schema for existing tables
    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tableRes.rows.map((r) => r.table_name));

    // Query columns count per table
    const colRes = await client.query(`
      SELECT table_name, count(*) as col_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
    `);
    const colCountMap = new Map(colRes.rows.map((r) => [r.table_name, parseInt(r.col_count, 10)]));

    // Query column names per table for structural verification
    const colNameRes = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const tableColumnsMap = new Map();
    for (const r of colNameRes.rows) {
      if (!tableColumnsMap.has(r.table_name)) {
        tableColumnsMap.set(r.table_name, new Set());
      }
      tableColumnsMap.get(r.table_name).add(r.column_name);
    }

    // Query pg_indexes for index verification
    const indexRes = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    const tableIndexesMap = new Map();
    for (const r of indexRes.rows) {
      if (!tableIndexesMap.has(r.tablename)) {
        tableIndexesMap.set(r.tablename, new Set());
      }
      tableIndexesMap.get(r.tablename).add(r.indexname);
    }

    // Query row counts safely
    console.log('--------------------------------------------------------------------------------');
    console.log('Table Name'.padEnd(34) + 'Status'.padEnd(16) + 'Columns'.padEnd(12) + 'Existing Rows');
    console.log('--------------------------------------------------------------------------------');

    let missingCount = 0;
    for (const table of REQUIRED_TABLES) {
      if (existingTables.has(table)) {
        const countRes = await client.query(`SELECT count(*) as c FROM "${table}"`);
        const rowCount = countRes.rows[0].c;
        const colCount = colCountMap.get(table) || 0;
        console.log(
          table.padEnd(34) +
          '✓ EXISTS'.padEnd(16) +
          String(colCount).padEnd(12) +
          String(rowCount)
        );
      } else {
        missingCount++;
        console.log(table.padEnd(34) + '✗ MISSING'.padEnd(16) + '0'.padEnd(12) + '0');
      }
    }
    console.log('--------------------------------------------------------------------------------');

    // Verify Critical Table Columns
    console.log('\n--------------------------------------------------------------------------------');
    console.log('CRITICAL SCHEMA & COLUMN VERIFICATION');
    console.log('--------------------------------------------------------------------------------');
    let columnDefects = 0;
    for (const [table, requiredCols] of Object.entries(CRITICAL_COLUMNS)) {
      if (!existingTables.has(table)) continue;
      const actualCols = tableColumnsMap.get(table) || new Set();
      const missing = requiredCols.filter((c) => !actualCols.has(c));
      if (missing.length === 0) {
        console.log(`✓ Table "${table}": all ${requiredCols.length} critical columns present.`);
      } else {
        columnDefects++;
        console.log(`✗ Table "${table}": MISSING columns -> [${missing.join(', ')}]`);
      }
    }

    // Verify Critical Indexes
    console.log('\n--------------------------------------------------------------------------------');
    console.log('CRITICAL INDEX VERIFICATION');
    console.log('--------------------------------------------------------------------------------');
    let indexDefects = 0;
    for (const [table, requiredIdxs] of Object.entries(CRITICAL_INDEXES)) {
      if (!existingTables.has(table)) continue;
      const actualIdxs = tableIndexesMap.get(table) || new Set();
      const missing = requiredIdxs.filter((i) => !actualIdxs.has(i));
      if (missing.length === 0) {
        console.log(`✓ Table "${table}": all ${requiredIdxs.length} critical indexes present.`);
      } else {
        indexDefects++;
        console.log(`✗ Table "${table}": MISSING indexes -> [${missing.join(', ')}]`);
      }
    }
    console.log('--------------------------------------------------------------------------------');

    if (missingCount === 0 && columnDefects === 0 && indexDefects === 0) {
      console.log(`\n🎉 VERIFICATION PASSED: All ${REQUIRED_TABLES.length} tables, critical columns, and indexes verified.`);
    } else {
      console.log(`\n⚠️  VERIFICATION INCOMPLETE: ${missingCount} tables, ${columnDefects} column sets, ${indexDefects} index sets need reconciliation.`);
      console.log('Run the idempotent schema initializer: npm run db:init:postgres');
    }
  } catch (err) {
    console.error('Schema verification error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifySchema();
