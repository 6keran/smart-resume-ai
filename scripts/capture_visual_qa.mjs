import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from '@playwright/test';

const PORT = 3192;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = 'C:/Users/kiran/.gemini/antigravity/brain/fa17ef86-118a-432f-a1eb-ce012fdb730d/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function waitForServer(url, timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms.`);
}

async function main() {
  console.log('===============================================================');
  console.log('📸 SMART RESUME AI: VISUAL QA & PLAYWRIGHT SCREENSHOT CAPTURE');
  console.log('===============================================================\n');

  const testDbDir = path.join(process.cwd(), 'data', 'test_sandboxes');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  const baseDb = path.join(process.cwd(), 'data', 'smart_resume.db');
  const testDbPath = path.join(testDbDir, `visual_qa_${Date.now()}.db`);
  if (fs.existsSync(baseDb)) {
    try { fs.copyFileSync(baseDb, testDbPath); } catch {}
  }

  const serverEnv = {
    PORT: String(PORT),
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    SQLITE_PATH: testDbPath,
    STAGING_DB_PATH: testDbPath,
    ADMIN_SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
    SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
  };

  console.log(`[Server] Starting isolated Next.js server on ${BASE_URL}...`);
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', 'localhost'], {
    cwd: process.cwd(),
    env: { ...process.env, ...serverEnv },
    stdio: 'pipe',
    shell: true,
  });

  serverProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg.includes('Ready') || msg.includes('compiled')) console.log(`[Next.js Server] ${msg}`);
  });
  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg.includes('Error')) console.error(`[Next.js Server Err] ${msg}`);
  });

  let browser;
  try {
    console.log('[Server] Waiting for server readiness probe...');
    await waitForServer(`${BASE_URL}/`, 35000);
    console.log(`✓ [Server] Ready at ${BASE_URL}!\n`);

    // 1. Register and login student via HTTP
    console.log('--- 1. SEEDING AUTHENTICATED FIXTURES VIA HTTP ---');
    const studentEmail = `alex.chen.visualqa.${Date.now()}@stanford.edu`;
    const studentPassword = 'Password@123456';

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alex Chen',
        email: studentEmail,
        password: studentPassword,
        confirmPassword: studentPassword,
      }),
    });
    if (!regRes.ok) throw new Error(`Student registration failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    const studentUserId = regData.user.id;

    // Login student
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
      }),
    });
    if (!loginRes.ok) throw new Error(`Student login failed: ${await loginRes.text()}`);
    const studentCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie') || ''];
    const studentCookieRaw = studentCookies.join('; ');
    const studentTokenMatch = studentCookieRaw.match(/sra_user_session=([^;]+)/) || studentCookieRaw.match(/session_token=([^;]+)/);
    const studentToken = studentTokenMatch ? studentTokenMatch[1] : '';

    console.log(`✓ Student authenticated (ID: ${studentUserId}, token: ${studentToken ? 'VALID' : 'MISSING'})`);

    // 2. Insert Admin directly into SQLite and login via HTTP
    const db = new DatabaseSync(testDbPath);
    const adminEmail = `admin.visualqa.${Date.now()}@smartresume.ai`;
    const adminPassword = 'AdminPassword@123';
    const adminId = `adm_${Date.now()}`;

    db.exec(`
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
      )
    `);

    db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, 'ADMIN', datetime('now'), datetime('now'), 1)
    `).run(adminId, adminEmail, hashPassword(adminPassword));

    // Login admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });
    if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${await adminLoginRes.text()}`);
    const adminCookies = adminLoginRes.headers.getSetCookie ? adminLoginRes.headers.getSetCookie() : [adminLoginRes.headers.get('set-cookie') || ''];
    const adminCookieRaw = adminCookies.join('; ');
    const adminTokenMatch = adminCookieRaw.match(/sra_admin_session=([^;]+)/) || adminCookieRaw.match(/admin_session_token=([^;]+)/);
    const adminToken = adminTokenMatch ? adminTokenMatch[1] : '';

    console.log(`✓ Admin authenticated (ID: ${adminId}, token: ${adminToken ? 'VALID' : 'MISSING'})`);

    // 3. Seed student profile & resume via HTTP
    const profileRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${studentToken}; session_token=${studentToken}`,
      },
      body: JSON.stringify({
        institution: 'Stanford University',
        degree: 'B.S. in Computer Science',
        fieldOfStudy: 'Systems & Artificial Intelligence',
        graduationYear: 2026,
        graduationMonth: 'May',
        currentSemester: 'Senior Year',
        cgpa: '3.88',
        studentType: 'college_student',
        targetRole: 'Graduate Software Engineer (SDE-1)',
        targetWorkType: 'both',
        preferredLocations: ['San Francisco, CA', 'Bangalore, India', 'Remote'],
        coursework: ['Data Structures', 'Operating Systems', 'Database Systems', 'Distributed Systems'],
        achievements: ['Dean\'s Honor List 2024-2025', 'ACM ICPC Regional Finalist', 'Stanford TreeHacks 1st Place'],
      }),
    });
    console.log(`✓ Student Career Profile seeded (HTTP ${profileRes.status})`);

    // Seed Sample Resume
    const sampleResumeData = {
      personalInfo: {
        fullName: 'Alex Chen',
        email: studentEmail,
        phone: '+1 (555) 382-9104',
        location: 'San Francisco, CA',
        linkedin: 'https://linkedin.com/in/alex-chen-dev',
        github: 'https://github.com/alexchen',
        portfolio: 'https://alexchen.dev',
      },
      summary: 'Results-driven software engineering graduate with hands-on experience in distributed systems, full-stack web applications, and database optimization. Proven track record of designing high-throughput REST APIs and containerized microservices.',
      candidateType: 'experienced',
      templateId: 'ats-classic',
      skills: {
        technical: ['TypeScript', 'React.js', 'Next.js', 'Node.js', 'Python', 'Go', 'PostgreSQL', 'Redis', 'Docker'],
        soft: ['Technical Leadership', 'System Architecture', 'Agile/Scrum', 'Cross-functional Collaboration'],
        tools: ['Git', 'GitHub Actions', 'AWS (S3, EC2)', 'Linux', 'Jest', 'Playwright'],
        categories: [
          { name: 'Core Languages', skills: ['TypeScript', 'Python', 'Go', 'SQL'] },
          { name: 'Frameworks & Systems', skills: ['React', 'Next.js', 'Node.js', 'Express', 'Tailwind CSS'] },
          { name: 'Data & Infrastructure', skills: ['PostgreSQL', 'Redis', 'Docker', 'AWS', 'Kubernetes'] },
        ],
      },
      experience: [
        {
          id: 'exp-1',
          role: 'Software Engineering Intern',
          company: 'CloudScale Infrastructure Labs',
          location: 'San Francisco, CA',
          startDate: 'Jun 2025',
          endDate: 'Aug 2025',
          current: false,
          bullets: [
            'Architected distributed metrics aggregation pipeline in Go, handling 15,000+ telemetry events per second with sub-50ms latency.',
            'Optimized relational PostgreSQL queries and composite indexing, reducing dashboard latency by 38% for enterprise tenants.',
            'Authored end-to-end integration test suites with Playwright and GitHub Actions, preventing regressions across 8 core services.',
          ],
        },
      ],
      education: [
        {
          id: 'edu-1',
          institution: 'Stanford University',
          degree: 'Bachelor of Science in Computer Science',
          location: 'Stanford, CA',
          graduationDate: 'May 2026',
          gpa: '3.88 / 4.00',
        },
      ],
      projects: [
        {
          id: 'proj-1',
          title: 'Distributed Vector Index & In-Memory Cache',
          technologies: 'Go, Redis, Docker, gRPC',
          link: 'https://github.com/alexchen/vector-cache',
          bullets: [
            'Engineered in-memory LRU vector cache achieving 42% lower lookup latency across simulated multi-client requests.',
            'Implemented consistent hashing ring with virtual nodes, balancing memory footprint across distributed cluster nodes.',
          ],
        },
        {
          id: 'proj-2',
          title: 'Real-Time Collaborative Code Editor',
          technologies: 'TypeScript, Next.js, WebSockets, PostgreSQL',
          link: 'https://github.com/alexchen/collab-editor',
          bullets: [
            'Developed operational transformation algorithms facilitating concurrent multi-user editing with conflict-free synchronization.',
            'Deployed scalable WebSocket gateway managing 500+ active connections per node with automated reconnection protocols.',
          ],
        },
      ],
      certifications: [
        {
          id: 'cert-1',
          name: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services',
          date: '2025',
        },
      ],
      languages: [
        { id: 'lang-1', name: 'English', proficiency: 'Native' },
        { id: 'lang-2', name: 'Mandarin Chinese', proficiency: 'Professional Working' },
      ],
      achievements: [
        'Dean\'s Honor List (Fall 2024, Spring 2025)',
        'ACM International Collegiate Programming Contest (ICPC) Regional Finalist',
        'TreeHacks Grand Prize Winner (Infrastructure Category)',
      ],
      sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'languages', 'achievements'],
      hiddenSections: [],
    };

    const saveResumeRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${studentToken}; session_token=${studentToken}`,
      },
      body: JSON.stringify({
        resumeData: sampleResumeData,
        title: 'Alex Chen - Software Engineer',
      }),
    });
    const resumeDataRes = await saveResumeRes.json();
    const resumeId = resumeDataRes.resume?.id;
    console.log(`✓ Active Resume created (ID: ${resumeId})\n`);

    // Launch Playwright Browser
    console.log('[Browser] Launching Chromium for visual verification...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    async function captureScreen(urlPath, filenamePrefix, authType = 'student', options = {}) {
      for (const vp of viewports) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });

        if (authType === 'student') {
          await context.addCookies([
            { name: 'session_token', value: studentToken, domain: 'localhost', path: '/' },
            { name: 'sra_user_session', value: studentToken, domain: 'localhost', path: '/' },
            { name: 'sra_user_name', value: 'Alex Chen', domain: 'localhost', path: '/' },
            { name: 'theme', value: 'light', domain: 'localhost', path: '/' },
          ]);
        } else if (authType === 'admin') {
          await context.addCookies([
            { name: 'sra_admin_session', value: adminToken, domain: 'localhost', path: '/' },
            { name: 'admin_session_token', value: adminToken, domain: 'localhost', path: '/' },
            { name: 'theme', value: 'light', domain: 'localhost', path: '/' },
          ]);
        }

        const page = await context.newPage();
        try {
          await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(options.waitForMs || 1500);

          if (options.beforeScreenshot) {
            await options.beforeScreenshot(page);
            await page.waitForTimeout(500);
          }

          const outPath = path.join(SCREENSHOT_DIR, `${filenamePrefix}_${vp.name}_${vp.width}x${vp.height}.png`);
          await page.screenshot({
            path: outPath,
            fullPage: options.fullPage !== false,
          });
          console.log(`  📸 [${vp.name.toUpperCase()}] Saved: ${path.basename(outPath)}`);
        } catch (err) {
          console.error(`  ❌ Failed capturing ${urlPath} (${vp.name}):`, err.message);
        } finally {
          await context.close();
        }
      }
    }

    console.log('--- 2. CAPTURING TARGET INTERFACES (1440x900 & 390x844) ---');

    // 1. Student Dashboard
    console.log('\n[1/10] Capturing Student Dashboard...');
    await captureScreen('/dashboard', '01_student_dashboard', 'student');

    // 2. Admin Dashboard
    console.log('\n[2/10] Capturing Admin Dashboard...');
    await captureScreen('/admin/dashboard', '02_admin_dashboard', 'admin');

    // 4. Resume Editor
    console.log('\n[4/11] Capturing Resume Editor...');
    await captureScreen('/builder', '04_resume_editor', 'student', {
      beforeScreenshot: async (page) => {
        await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 }).catch(() => {});
        await page.waitForSelector('#resume-a4-document', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);
      },
    });

    // 5. Resume Management
    console.log('\n[5/11] Capturing Resume Management...');
    await captureScreen('/dashboard/resumes', '05_resume_management', 'student');

    // 6. Resume Template Gallery
    console.log('\n[6/11] Capturing Resume Template Gallery in Builder...');
    await captureScreen('/builder', '06_resume_template_gallery', 'student', {
      beforeScreenshot: async (page) => {
        await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 }).catch(() => {});
        const step15 = page.locator('#sidebar-step-15, button:has-text("Template Selection")').first();
        if (await step15.isVisible({ timeout: 5000 }).catch(() => false)) {
          await step15.click();
          await page.waitForTimeout(1500);
        }
      },
    });

    // 7. ATS Analyzer
    console.log('\n[7/11] Capturing ATS Analyzer...');
    await captureScreen('/ats-score', '07_ats_analyzer', 'student');

    // 8. Job Search
    console.log('\n[8/11] Capturing Job Search...');
    await captureScreen('/jobs', '08_job_search', 'student');

    // 9. Skill Assessments
    console.log('\n[9/11] Capturing Skill Assessments...');
    await captureScreen('/skills', '09_skill_assessments', 'student');

    // 10. AI Assistant & Guidance Studio
    console.log('\n[10/11] Capturing AI Guidance Studio...');
    await captureScreen('/guidance', '10_ai_guidance_studio', 'student');

    // 11. AI Interview Prep
    console.log('\n[11/11] Capturing AI Interview Prep...');
    await captureScreen('/interview-prep', '11_ai_interview_prep', 'student');

    // -------------------------------------------------------------------------
    // CAPTURE ALL 12 TEMPLATES (HIGH-FIDELITY A4 RENDERINGS)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CAPTURING ALL 12 DISTINCT RESUME TEMPLATES (A4 PREVIEWS) ---');

    const templates = [
      { id: 'ats-classic', filename: 'template_01_classic_professional' },
      { id: 'corporate-executive', filename: 'template_02_modern_corporate' },
      { id: 'executive-professional', filename: 'template_03_executive_leadership' },
      { id: 'software-engineer', filename: 'template_04_engineering_professional' },
      { id: 'operations-management', filename: 'template_05_manufacturing_operations' },
      { id: 'full-stack-developer', filename: 'template_06_software_developer' },
      { id: 'graduate-fresher', filename: 'template_07_fresher_graduate' },
      { id: 'minimalist-ats', filename: 'template_08_minimalist_ats' },
      { id: 'minimalist', filename: 'template_09_modern_minimalist' },
      { id: 'academic-research', filename: 'template_10_academic_research' },
      { id: 'modern-two-column', filename: 'template_11_professional_sidebar' },
      { id: 'compact-one-page', filename: 'template_12_compact_one_page' },
    ];

    for (const tmpl of templates) {
      console.log(`Capturing A4 document for: ${tmpl.id}...`);

      // Update resume template in SQLite directly
      const updatedResumeData = { ...sampleResumeData, templateId: tmpl.id, id: resumeId };
      db.prepare(`UPDATE resumes SET resume_data = ? WHERE id = ?`).run(
        JSON.stringify(updatedResumeData),
        resumeId
      );

      const context = await browser.newContext({
        viewport: { width: 1440, height: 1150 },
        deviceScaleFactor: 2,
      });
      await context.addCookies([
        { name: 'session_token', value: studentToken, domain: 'localhost', path: '/' },
        { name: 'sra_user_session', value: studentToken, domain: 'localhost', path: '/' },
        { name: 'sra_user_name', value: 'Alex Chen', domain: 'localhost', path: '/' },
        { name: 'theme', value: 'light', domain: 'localhost', path: '/' },
      ]);

      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}/builder?resumeId=${resumeId}`, { waitUntil: 'networkidle', timeout: 25000 });
        await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 }).catch(() => {});
        await page.waitForSelector('#resume-a4-document', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);

        const previewEl = page.locator('#resume-a4-document, [data-testid="a4-resume-document"], #resume-a4-document-wrapper').first();
        if (await previewEl.isVisible({ timeout: 5000 }).catch(() => false)) {
          const outPath = path.join(SCREENSHOT_DIR, `${tmpl.filename}_a4.png`);
          await previewEl.screenshot({ path: outPath });
          console.log(`  📄 [A4 DOCUMENT] Saved: ${path.basename(outPath)}`);
        } else {
          const outPath = path.join(SCREENSHOT_DIR, `${tmpl.filename}_page.png`);
          await page.screenshot({ path: outPath, fullPage: true });
          console.log(`  📄 [PAGE FALLBACK] Saved: ${path.basename(outPath)}`);
        }
      } catch (err) {
        console.error(`  ❌ Failed capturing template ${tmpl.id}:`, err.message);
      } finally {
        await context.close();
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 VISUAL QA CAPTURE COMPLETE: ALL SCREENSHOTS SAVED!');
    console.log('===============================================================\n');

  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('[Server] Terminating isolated test server...');
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawnSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}

    // Cleanup test db
    for (let i = 0; i < 5; i++) {
      try {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        for (const ext of ['-shm', '-wal', '-journal']) {
          if (fs.existsSync(testDbPath + ext)) fs.unlinkSync(testDbPath + ext);
        }
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal visual QA capture error:', err);
  process.exit(1);
});
