-- SMART RESUME AI: IDEMPOTENT POSTGRESQL / NEON MIGRATION
-- Feature: Personalized Career Path
-- Date: 2026-11-12
--
-- Safe for existing Neon / PostgreSQL databases:
-- - Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- - Uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- - Does NOT drop, truncate, or overwrite existing user rows.

ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user_added';
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS confirmed_at TEXT;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS resume_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_skills_user_status ON user_skills(user_id, status);

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS onboarding_skipped_at TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS preferences_json TEXT;
ALTER TABLE student_profiles ALTER COLUMN target_role SET DEFAULT '';

CREATE TABLE IF NOT EXISTS user_roadmap_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_slug TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, role_slug, item_type, item_key)
);
CREATE INDEX IF NOT EXISTS idx_user_roadmap_user_role ON user_roadmap_progress(user_id, role_slug);

