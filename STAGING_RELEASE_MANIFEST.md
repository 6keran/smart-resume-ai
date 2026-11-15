# Staging Release Manifest: Smart Resume AI

**Milestone:** Production-Ready Staging Deployment (Vercel + Neon PostgreSQL)  
**Generated Date:** November 6, 2026  
**Base Commit:** `b16da90`  
**Active Branch:** `main` (Verified synchronized with `origin/main` at `b16da90`)  
**Target Release Branch:** `staging` (Verified synchronized at `b16da90`)  
**Final Decision:** **SAFE TO STAGE**  

---

## 1. Executive Summary & Safety Pre-Conditions

| Safety Check | Verified Status | Evidence |
|---|:---:|---|
| **Git Branch Hierarchy** | **VERIFIED** | Current branch is `main` (`b16da90`). `staging` branch also points to `b16da90`. |
| **TypeScript Typecheck** | **0 ERRORS** | `npx tsc --noEmit` exited cleanly with code 0. |
| **ESLint Quality** | **0 ERRORS** | `npm run lint` exited cleanly with code 0. |
| **Production Next.js Build** | **85/85 COMPILED** | `next build --webpack` successfully compiled all 85 routes and Edge proxy middleware. |
| **Secrets & Credentials** | **CLEAN (0 LEAKS)** | Automated regex and heuristic scan across all candidate files found 0 leaked credentials. `.env.local` is gitignored. |
| **Database File Isolation** | **PROTECTED** | `data/smart_resume.db` is strictly gitignored (`data/*.db`). 0 database files in manifest. |
| **Local SQLite Intactness** | **UNTOUCHED** | `data/smart_resume.db` intact with 486 users, 350 resumes, 191 applications. |
| **Reset Script Invariant** | **UNTOUCHED** | `scripts/reset_fresh_database.mjs` remains completely untouched. |
| **Legacy Deletion Safety** | **0 BREAKAGES** | Python/Streamlit removal does not break any active workflow or Next.js route. |
| **Package Consistency** | **CONSISTENT** | `npm ls --depth=0` passed cleanly; all 37 package.json script references exist on disk. |
| **Vercel Preview Isolation** | **CONFIRMED** | Staging branch will trigger Vercel Preview Deployments only; production branch remains `main`. |
| **Neon Staging Isolation** | **ENFORCED** | Pre-connection safety gate unconditionally blocks production keywords and enforces allowlist. |

---

## 2. Exact Files to Modify (101 Files)

These existing tracked files have been hardened, updated, or refactored for the staging release:

- `.env.example`
- `.gitignore`
- `eslint.config.mjs`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `scripts/init_postgres_schema.mjs`
- `scripts/migrate_sqlite_to_postgres.mjs`
- `scripts/test_auth_security_comprehensive.mjs`
- `scripts/test_chatbot_visibility_and_drag.mjs`
- `scripts/test_gemini_fallback_child.mjs`
- `scripts/test_gemini_service_resilience.mjs`
- `scripts/test_p0_p1_security_fixes.mjs`
- `scripts/test_resume_builder_and_pdf.mjs`
- `scripts/test_resume_document_validation.mjs`
- `scripts/verify_postgres_schema.mjs`
- `src/app/admin/(protected)/dashboard/page.tsx`
- `src/app/admin/(protected)/job-matches/page.tsx`
- `src/app/admin/(protected)/settings/page.tsx`
- `src/app/admin/(protected)/skills/page.tsx`
- `src/app/admin/(protected)/users/page.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/analyzer/page.tsx`
- `src/app/api/admin/assessments/attempts/route.ts`
- `src/app/api/admin/assessments/config/route.ts`
- `src/app/api/admin/feedback/route.ts`
- `src/app/api/admin/proctoring/route.ts`
- `src/app/api/admin/questions/route.ts`
- `src/app/api/admin/records/route.ts`
- `src/app/api/admin/skills/route.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/jobs/search/route.ts`
- `src/app/api/proctoring/frame/route.ts`
- `src/app/api/proctoring/heartbeat/route.ts`
- `src/app/api/proctoring/session/route.ts`
- `src/app/api/proctoring/signal/route.ts`
- `src/app/api/resume/analyze/route.ts`
- `src/app/api/user/applications/route.ts`
- `src/app/api/user/resumes/versions/route.ts`
- `src/app/ats-score/page.tsx`
- `src/app/builder/page.tsx`
- `src/app/dashboard/analyses/page.tsx`
- `src/app/dashboard/applications/page.tsx`
- `src/app/dashboard/assessments/page.tsx`
- `src/app/dashboard/certificates/page.tsx`
- `src/app/dashboard/courses/page.tsx`
- `src/app/dashboard/improvements/page.tsx`
- `src/app/dashboard/jobs/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/dashboard/resumes/page.tsx`
- `src/app/dashboard/skills/page.tsx`
- `src/app/globals.css`
- `src/app/guidance/page.tsx`
- `src/app/improver/page.tsx`
- `src/app/job-match/page.tsx`
- `src/app/jobs/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/app/register/page.tsx`
- `src/app/skills/assess/[skill]/page.tsx`
- `src/app/skills/certificate/[id]/page.tsx`
- `src/app/skills/page.tsx`
- `src/components/builder/A4ResumeDocument.tsx`
- `src/components/builder/TemplateCard.tsx`
- `src/components/chat/CareerChatbot.tsx`
- `src/components/dashboard/DashboardContent.tsx`
- `src/components/dashboard/UserDashboardHeader.tsx`
- `src/components/dashboard/UserDashboardSidebar.tsx`
- `src/components/landing/LandingPage.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/theme/ThemeSelector.tsx`
- `src/components/ui/GlassCard.tsx`
- `src/components/ui/MotionPrimitives.tsx`
- `src/components/user/UserProfileModal.tsx`
- `src/lib/jobs/filters.ts`
- `src/server/auth/adminSession.ts`
- `src/server/db/adapter.ts`
- `src/server/db/index.ts`
- `src/server/services/extractResumeText.ts`
- `src/server/services/gemini.ts`
- `src/server/services/jobs/cache.ts`
- `src/server/services/jobs/dedupe.ts`
- `src/server/services/jobs/filters.ts`
- `src/server/services/jobs/normalize.ts`
- `src/server/services/jobs/providers/adzuna.ts`
- `src/server/services/jobs/providers/jooble.ts`
- `src/server/services/jobs/providers/linkedin.ts`
- `src/server/services/jobs/providers/naukri.ts`
- `src/server/services/jobs/ranking.ts`
- `src/server/services/jobs/search.ts`
- `src/server/services/jobs/types.ts`
- `src/types/resume.ts`
- `tsconfig.json`

---

## 3. Exact Files to Delete from Git (174 Files)

These obsolete legacy Streamlit, Python, and diagnostic files are deleted from Git tracking:

- `.devcontainer/devcontainer.json`
- `Dockerfile`
- `add_templates.py`
- `app.py`
- `assets/124852522.jpeg`
- `assets/logo.jpg`
- `clean_all.py`
- `clean_code.py`
- `cleaner.py`
- `config/courses.py`
- `config/database.py`
- `config/job_roles.py`
- `config/settings.py`
- `dashboard/__init__.py`
- `dashboard/components.py`
- `dashboard/dashboard.py`
- `feedback/feedback.py`
- `feedback/schema.sql`
- `fix_about.py`
- `fix_app.py`
- `fix_builder_preview.py`
- `fix_dashboard.py`
- `fix_job_icons.py`
- `fix_markdown.py`
- `fix_orphans.py`
- `fix_syntax.py`
- `jobs/companies.py`
- `jobs/job_portals.py`
- `jobs/job_search.py`
- `jobs/linkedin_scraper.py`
- `jobs/suggestions.py`
- `jobs/webdriver_utils.py`
- `legacy_python_pages/analyzer_page.py`
- `legacy_python_pages/builder_page.py`
- `packages.txt`
- `refactor_db.py`
- `requirements.txt`
- `resume_analytics/analyzer.py`
- `run_app.py`
- `scripts/audit_all_print_exact.mjs`
- `scripts/audit_light_theme.mjs`
- `scripts/audit_templates.mjs`
- `scripts/capture_all_templates.mjs`
- `scripts/capture_animation_verification.mjs`
- `scripts/capture_builder_cdp.mjs`
- `scripts/capture_exact_reference.mjs`
- `scripts/capture_feature_showcase.mjs`
- `scripts/capture_light_pages.mjs`
- `scripts/capture_real_ui.mjs`
- `scripts/capture_stack_trace.mjs`
- `scripts/cdp_screenshot.mjs`
- `scripts/check_document_react.mjs`
- `scripts/check_html_scripts.mjs`
- `scripts/check_hydration.mjs`
- `scripts/check_net_body.mjs`
- `scripts/check_overflow.mjs`
- `scripts/check_react_elements.mjs`
- `scripts/check_react_keys.mjs`
- `scripts/check_register_scripts.mjs`
- `scripts/debug_page_scripts.mjs`
- `scripts/diagnose_ats_print.mjs`
- `scripts/diagnose_hmr_and_browser.mjs`
- `scripts/diagnose_job_search.mjs`
- `scripts/diagnose_login_and_theme.mjs`
- `scripts/diagnose_react_script.mjs`
- `scripts/diagnose_theme.mjs`
- `scripts/diagnose_theme_in_detail.mjs`
- `scripts/extract_correction.cjs`
- `scripts/find_failing_line_in_edge.mjs`
- `scripts/find_syntax_error.mjs`
- `scripts/fix_template_lints.mjs`
- `scripts/full_theme_verification.mjs`
- `scripts/get_edge_headers.mjs`
- `scripts/get_exception_source.mjs`
- `scripts/inspect_all_templates_exact.mjs`
- `scripts/inspect_bundle.mjs`
- `scripts/inspect_chunks.mjs`
- `scripts/inspect_culprits.mjs`
- `scripts/inspect_db_schema.mjs`
- `scripts/inspect_div.mjs`
- `scripts/inspect_dom.mjs`
- `scripts/inspect_main_app.mjs`
- `scripts/list_gemini_models.mjs`
- `scripts/measure_actual_content.mjs`
- `scripts/parse_layout_syntax.mjs`
- `scripts/pause_on_exception.mjs`
- `scripts/pinpoint_mockdata_err.mjs`
- `scripts/polish_blush.mjs`
- `scripts/polish_column_templates.mjs`
- `scripts/polish_remaining_3.mjs`
- `scripts/reproduce_extension_hydration.mjs`
- `scripts/run_final_comprehensive_qa.mjs`
- `scripts/summarize_baseline.mjs`
- `scripts/test_127_regression.mjs`
- `scripts/test_admin_system.mjs`
- `scripts/test_admin_user_deletion.mjs`
- `scripts/test_ats_and_improver_comprehensive.mjs`
- `scripts/test_auth_rigorous.mjs`
- `scripts/test_browser_auth.mjs`
- `scripts/test_buttons.mjs`
- `scripts/test_camera_verification_flow.mjs`
- `scripts/test_compile_edge.mjs`
- `scripts/test_complete_auth_suite.mjs`
- `scripts/test_comprehensive_e2e.mjs`
- `scripts/test_dashboard_pages.js`
- `scripts/test_dedicated_ats_score_page.mjs`
- `scripts/test_edge_line161.mjs`
- `scripts/test_edge_port0.mjs`
- `scripts/test_eval_in_browser.mjs`
- `scripts/test_full_e2e_platform_audit.mjs`
- `scripts/test_fullscreen_chatbot.mjs`
- `scripts/test_gemini_generate.mjs`
- `scripts/test_gemini_models.mjs`
- `scripts/test_http_e2e.js`
- `scripts/test_hydrated_submission.mjs`
- `scripts/test_inspect_cards.mjs`
- `scripts/test_kiran_admin.mjs`
- `scripts/test_light_click.mjs`
- `scripts/test_line586.mjs`
- `scripts/test_live_browser_cdp_audit.mjs`
- `scripts/test_live_interactions.mjs`
- `scripts/test_migration_safety_and_login.mjs`
- `scripts/test_neon_bundle.mjs`
- `scripts/test_password_visibility.mjs`
- `scripts/test_raw_http.mjs`
- `scripts/test_reset_script_safeguards.mjs`
- `scripts/test_sample_button.mjs`
- `scripts/test_step8_capture.mjs`
- `scripts/test_strict_fullscreen_proctoring.mjs`
- `scripts/test_theme_and_routes.mjs`
- `scripts/test_user_isolation.js`
- `scripts/test_user_onboarding_and_tracking.js`
- `scripts/update_all_templates_v2.mjs`
- `scripts/update_remaining_templates.mjs`
- `scripts/verify_all_modules.mjs`
- `scripts/verify_full_local_browser_qa.mjs`
- `scripts/verify_global_whitespace_fix.mjs`
- `scripts/verify_homepage_cleanup.mjs`
- `scripts/verify_independent_full_suite.mjs`
- `scripts/verify_local_browser_qa.mjs`
- `scripts/verify_long_multipage.mjs`
- `scripts/verify_registration_flow.mjs`
- `scripts/verify_template_workflow.mjs`
- `scripts/verify_theme_script_console.mjs`
- `scripts/verify_theme_switching.mjs`
- `scripts/verify_user_mgmt_and_live_proctoring.mjs`
- `scripts/wait_for_load.mjs`
- `setup_chromedriver.py`
- `src/middleware.ts`
- `startup.bat`
- `startup.sh`
- `style/style.css`
- `swap_builder.py`
- `test_analyzer_and_theme.js`
- `test_builder_validation.js`
- `test_docx_upload.js`
- `test_https_verification.js`
- `test_job_search_system.js`
- `test_linkedin_provider.ts`
- `test_pdf_upload.js`
- `test_provider_pipeline.ts`
- `test_question_bank_and_admin.js`
- `test_real_pdf_file.js`
- `ui_components.py`
- `utils/.env.example`
- `utils/Admin.png`
- `utils/__init__.py`
- `utils/ai_resume_analyzer.py`
- `utils/database.py`
- `utils/excel_manager.py`
- `utils/pdf_generator.py`
- `utils/resume_analyzer.py`
- `utils/resume_builder.py`
- `utils/resume_parser.py`

---

## 4. Exact Files to Add (99 Files)

These untracked files belong to the production application, assets, database security gate, or curated test suite:

- `e2e\README.md`
- `e2e\assistant.spec.ts`
- `e2e\ats-analyzer.spec.ts`
- `e2e\auth-helpers.ts`
- `e2e\authenticated.spec.ts`
- `e2e\builder.spec.ts`
- `e2e\career-command-center.spec.ts`
- `e2e\career-workflow.spec.ts`
- `e2e\dashboard.spec.ts`
- `e2e\fixtures.ts`
- `e2e\gemini-live.spec.ts`
- `e2e\global-setup.ts`
- `e2e\jobs-authenticated.spec.ts`
- `e2e\jobs.spec.ts`
- `e2e\landing.spec.ts`
- `e2e\proxy-security.spec.ts`
- `e2e\public-routes.spec.ts`
- `e2e\responsive-navigation.spec.ts`
- `e2e\smoke.spec.ts`
- `e2e\theme.spec.ts`
- `e2e\visual-audit.spec.ts`
- `playwright.config.ts`
- `public/hero-landscape.jpg`
- `scripts/benchmark_dashboard_query.mjs`
- `scripts/dbSecurityGate.mjs`
- `scripts/run-playwright.mjs`
- `scripts/test_ai_quality_and_resilience.mjs`
- `scripts/test_application_assistant_comprehensive.mjs`
- `scripts/test_builder_validation.js`
- `scripts/test_career_command_center.mjs`
- `scripts/test_career_ecosystem.ts`
- `scripts/test_career_intelligence_fallback_child.mjs`
- `scripts/test_career_mentor_comprehensive.mjs`
- `scripts/test_career_pages.mjs`
- `scripts/test_chat_safety_and_controls.mjs`
- `scripts/test_chatbot_dragging_comprehensive.mjs`
- `scripts/test_chatbot_identity.mjs`
- `scripts/test_db_security_gate.mjs`
- `scripts/test_final_acceptance_audit.mjs`
- `scripts/test_job_search_autocomplete.mjs`
- `scripts/test_job_search_spelling_tolerance.mjs`
- `scripts/test_naukri_cooldown.mjs`
- `scripts/test_next_gen_intelligence.mjs`
- `scripts/test_pdf_deep_investigation.mjs`
- `scripts/test_pdf_pipeline_comprehensive.mjs`
- `scripts/test_pg_savepoints_atomic.mjs`
- `scripts/test_project_mentor_comprehensive.mjs`
- `scripts/test_resume_analyzer_reliability.mjs`
- `scripts/test_security_isolation_deep.mjs`
- `scripts/test_staging_validation.mjs`
- `scripts/test_student_full_journey_e2e.mjs`
- `scripts/test_student_profile_day1.mjs`
- `scripts/verify_command_center_integrity.mjs`
- `scripts/verify_staging_env.mjs`
- `src/components/landing/ProfessionalLandingPage.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/lib/career/assistantTypes.ts`
- `src/lib/jobs/naukriSearchUrl.ts`
- `src/lib/jobs/searchQuery.ts`
- `src/proxy.ts`
- `src/server/services/applicationAssistant.ts`
- `src/server/services/careerActionEngine.ts`
- `src/server/services/careerIntelligence.ts`
- `src/server/services/chatSafety.ts`
- `src/server/services/jobs/providers/naukriCooldown.ts`
- `src/server/services/jobs/searchQuery.ts`
- `src/server/services/jobs/suggestions.ts`
- `src/server/services/projectMentor.ts`
- `src/server/services/resumeIntelligence.ts`
- `src/server/services/unifiedStudentContext.ts`
- `src/types/career.ts`
- `src\app\api\career\actions\route.ts`
- `src\app\api\career\assistant\analyze\route.ts`
- `src\app\api\career\assistant\application\[id]\route.ts`
- `src\app\api\career\assistant\follow-up\route.ts`
- `src\app\api\career\assistant\prepare\route.ts`
- `src\app\api\career\interview\route.ts`
- `src\app\api\career\profile\route.ts`
- `src\app\api\career\projects\[id]\export\route.ts`
- `src\app\api\career\projects\[id]\mentor\route.ts`
- `src\app\api\career\projects\[id]\route.ts`
- `src\app\api\career\projects\recommendations\route.ts`
- `src\app\api\career\projects\route.ts`
- `src\app\api\career\roadmap\route.ts`
- `src\app\api\career\skill-gap\route.ts`
- `src\app\api\jobs\nlp-search\route.ts`
- `src\app\api\jobs\suggestions\route.ts`
- `src\app\api\student\context\route.ts`
- `src\app\api\student\profile\route.ts`
- `src\app\api\student\readiness-history\route.ts`
- `src\app\api\student\readiness\route.ts`
- `src\app\apply-assistant\page.tsx`
- `src\app\faq\FaqClient.tsx`
- `src\app\faq\page.tsx`
- `src\app\interview-prep\page.tsx`
- `src\app\projects\page.tsx`
- `src\components\cursor\InteractiveCursor.tsx`
- `src\components\jobs\JobSearchAutocomplete.tsx`

---

## 5. Files Explicitly Excluded from Staging (Must Remain Local)

| Excluded File / Directory | Reason for Exclusion |
|---|---|
| `.env.local` | Contains local development credentials and API keys. Strictly gitignored via `.env.*`. |
| `data/smart_resume.db` | Local SQLite development database with candidate records. Strictly gitignored via `data/*.db`. |
| `.planning/` | Agent planning context, execution state, and progress logs. Must remain local to the development environment. |
| `.codex/` | Internal assistant workspace configuration and execution metadata. |
| `test-results/` | Local test outputs, execution screenshots, and temporary test database copies. |
| `.next/` | Local build output and Turbopack compiler cache. |
| `PROJECT_CLEANUP_REPORT.md` | Internal audit report documenting repository cleanup. Kept in workspace for local reference. |
| `STAGING_READINESS_REPORT.md` | Internal readiness assessment report. Kept in workspace for local reference. |
| `VERCEL_NEON_STAGING_SETUP.md` | Deployment setup notes. Kept in workspace for local reference. |
| `FINAL_GIT_RELEASE_REVIEW.md` | Final post-cleanup audit document. Kept in workspace for local reference. |
| `STAGING_RELEASE_MANIFEST.md` | This manifest document itself. Kept in workspace for local reference. |

---

## 6. Unresolved Risks & Mitigations

1. **Remote Neon Database Connection Authorization:**
   - *Risk:* Accidental execution of schema migrations against the wrong database.
   - *Mitigation:* `scripts/dbSecurityGate.mjs` enforces an explicit pre-connection check requiring `TARGET_DB_ENV="staging"`, `CONFIRM_STAGING_TARGET="staging"`, and an exact allowlist match via `APPROVED_STAGING_HOST`. Execution against production is unconditionally blocked by the parser.

2. **Vercel Serverless Rate Limiting Across Instances:**
   - *Risk:* In-memory rate limiting in `src/proxy.ts` does not share state across geographically dispersed serverless lambdas.
   - *Mitigation:* Scheduled for empirical audit in Phase 2 using simulated distributed requests against the Vercel staging preview URL.

3. **Gemini Live Availability vs Fallback:**
   - *Risk:* External Google Gemini API quota limits or network timeouts.
   - *Mitigation:* The built-in deterministic ATS engine (`extractResumeText.ts`, `gemini.ts`) activates seamlessly within sub-500ms if Gemini times out or is unavailable.

---

## 7. Final Decision

### **DECISION: SAFE TO STAGE**

All pre-commit invariants are satisfied:
- Zero secrets or private keys in staging candidate files.
- Zero local database files or SQLite fixtures included.
- Complete 31-table PostgreSQL schema parity verified.
- Next.js production build compiles 85/85 routes cleanly.
- Strict public CA TLS certificate validation enforced.
- The release is safe to proceed to the `staging` branch using targeted file addition.
