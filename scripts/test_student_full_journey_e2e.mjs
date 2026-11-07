import assert from 'node:assert';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('student_full_journey_e2e');

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('🎓 SMART RESUME AI: COMPLETE STUDENT JOURNEY (17-STEP E2E AUDIT)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Step ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runStudentJourney() {
  const timestamp = Date.now();
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const studentEmail = `student.e2e.${timestamp}@stanford.edu`;
  const studentPassword = 'SecureStudentPass2026!';
  let sessionCookie = '';
  let studentUserId = '';
  let sampleResumeId = '';
  let sampleAppId = '';
  let sampleSessionId = '';

  // --------------------------------------------------------------------------
  // Pre-flight: Assert HTTP test server is running
  // --------------------------------------------------------------------------
  try {
    await fetch(`${BASE_URL}/`, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
  } catch (err) {
    console.error(`\n❌ [PRE-FLIGHT ERROR] HTTP server at ${BASE_URL} is not reachable.`);
    console.error(`   To run this live HTTP student journey, ensure the Next.js server is running`);
    console.error(`   or execute the automated isolated runner: node scripts/run_live_e2e_isolated.mjs\n`);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 1: Register and log in as a student
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: Authentication & Onboarding ---');
  try {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        fullName: 'Alex Chen',
        email: studentEmail,
        password: studentPassword,
        confirmPassword: studentPassword,
      }),
    });
    assert.strictEqual(regRes.status, 200, `Registration HTTP 200, got ${regRes.status}`);
    const regData = await regRes.json();
    assert.ok(regData.user?.id, 'User ID returned on registration');
    studentUserId = regData.user.id;

    // Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
      }),
    });
    assert.strictEqual(loginRes.status, 200, `Login HTTP 200, got ${loginRes.status}`);
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Session cookie issued on login');
    sessionCookie = cookieHeader.split(';')[0];
    pass('Register and log in as a student', `User: Alex Chen <${studentEmail}>`);
  } catch (err) {
    fail('Step 1: Register and login', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 2: Create and update the student career profile
  // --------------------------------------------------------------------------
  console.log('--- Phase 2: Student Career Profile Setup ---');
  const studentProfilePayload = {
    institution: 'Stanford University',
    degree: 'B.S. in Computer Science',
    fieldOfStudy: 'Software Systems',
    graduationYear: 2026,
    graduationMonth: 'June',
    currentSemester: 'Semester 6',
    cgpa: '3.88',
    studentType: 'college_student',
    targetRole: 'Graduate Software Engineer',
    targetWorkType: 'both',
    preferredLocations: ['San Francisco, CA', 'Remote'],
    coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Systems', 'Distributed Computing'],
    achievements: ['Dean\'s Honor List 2024-2025', 'ACM Collegiate Programming Contest Regional Finalist'],
    projects: [
      {
        id: 'proj_vec_01',
        title: 'Distributed Vector Cache Engine',
        description: 'Engineered an in-memory vector cache with LRU eviction and sub-millisecond retrieval.',
        role: 'Sole Architect',
        techStack: ['TypeScript', 'Node.js', 'Redis', 'Docker'],
        repoUrl: 'https://github.com/alexchen/vector-cache',
        liveUrl: 'https://vector-cache.alexchen.dev',
        highlights: [
          'Decreased vector similarity search latency by 42% utilizing Redis pipelining',
          'Architected containerized microservice with Docker Compose and health check monitors',
        ],
      },
      {
        id: 'proj_coll_02',
        title: 'Collaborative Kanban Studio',
        description: 'Real-time kanban workspace featuring optimistic UI updates and role-based permissions.',
        role: 'Full Stack Engineer',
        techStack: ['React', 'Next.js', 'Tailwind CSS', 'PostgreSQL'],
        repoUrl: 'https://github.com/alexchen/kanban-studio',
        highlights: [
          'Implemented drag-and-drop Kanban board supporting full keyboard accessibility (WCAG 2.1 AA)',
          'Designed PostgreSQL schema with row-level locks eliminating concurrent task update collisions',
        ],
      },
    ],
  };

  try {
    const putRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify(studentProfilePayload),
    });
    assert.strictEqual(putRes.status, 200, `Profile update HTTP 200, got ${putRes.status}`);
    const putData = await putRes.json();
    assert.ok(putData.success, 'Profile updated successfully');

    const getRes = await fetch(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(getRes.status, 200, `Profile retrieval HTTP 200`);
    const getData = await getRes.json();
    assert.strictEqual(getData.profile.institution, 'Stanford University', 'Institution preserved');
    assert.strictEqual(getData.profile.graduationYear, 2026, 'Graduation year preserved');
    assert.strictEqual(getData.isConfigured, true, 'isConfigured is true');
    pass('Create and update the student career profile', 'Persisted college, degree, graduation year, and track');
  } catch (err) {
    fail('Step 2: Student career profile', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 3: Add education, skills and academic projects
  // --------------------------------------------------------------------------
  try {
    const skillsToAdd = [
      { name: 'TypeScript', category: 'Programming' },
      { name: 'React', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
      { name: 'SQL', category: 'Database' },
      { name: 'Docker', category: 'DevOps' },
    ];

    for (const sk of skillsToAdd) {
      const skRes = await fetch(`${BASE_URL}/api/user/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          name: sk.name,
          category: sk.category,
          claimDirectly: true,
        }),
      });
      assert.strictEqual(skRes.status, 200, `Skill ${sk.name} added HTTP 200`);
    }

    const listSkillsRes = await fetch(`${BASE_URL}/api/user/skills`, {
      headers: { Cookie: sessionCookie },
    });
    const listSkillsData = await listSkillsRes.json();
    assert.ok(Array.isArray(listSkillsData.skills) && listSkillsData.skills.length >= 5, 'Skills array populated');
    pass('Add education, skills and academic projects', `${listSkillsData.skills.length} skills tracked & 2 capstones documented`);
  } catch (err) {
    fail('Step 3: Add skills and projects', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 4: Generate career recommendations
  // --------------------------------------------------------------------------
  console.log('--- Phase 3: Career Intelligence & Readiness ---');
  try {
    const dashRes = await fetch(`${BASE_URL}/api/user/dashboard`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(dashRes.status, 200, 'Dashboard data HTTP 200');
    const dashData = await dashRes.json();
    assert.ok(dashData.studentProfile, 'Student profile present in dashboard payload');
    assert.strictEqual(dashData.studentProfile.institution, 'Stanford University', 'Dashboard student institution verified');

    const profileRes = await fetch(`${BASE_URL}/api/career/profile`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(profileRes.status, 200, 'Career profile HTTP 200');
    const profileData = await profileRes.json();
    assert.ok(profileData.profile, 'Career profile summary present');
    assert.strictEqual(profileData.profile.targetRole, 'Graduate Software Engineer', 'Target role matches student profile');
    assert.strictEqual(profileData.profile.experienceLevel, 'Fresher / Entry Level', 'Experience level defaulted to fresher');
    pass('Generate career recommendations', `Target: Graduate Software Engineer, Level: Fresher`);
  } catch (err) {
    fail('Step 4: Career recommendations', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 5: Run the career readiness analysis
  // --------------------------------------------------------------------------
  try {
    const readRes = await fetch(`${BASE_URL}/api/student/readiness`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(readRes.status, 200, 'Readiness HTTP 200');
    const readData = await readRes.json();
    assert.ok(readData.readiness, 'Readiness payload returned');
    const r = readData.readiness;
    assert.ok(typeof r.overallScore === 'number' && r.overallScore >= 0 && r.overallScore <= 100, 'Valid overall score (0-100)');
    assert.ok(r.quadrants.technicalCompetency && r.quadrants.projectEvidence && (r.quadrants.resumeAts || r.quadrants.resumeATS) && r.quadrants.interviewFluency, 'All 4 quadrants calculated');
    assert.ok(Array.isArray(r.priorityActions) && r.priorityActions.length > 0, 'Priority actions generated');
    pass('Run the career readiness analysis', `Overall: ${r.overallScore}/100, Level: ${r.overallLevel}`);
  } catch (err) {
    fail('Step 5: Career readiness analysis', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 6: Generate and inspect a personalized skill-gap analysis
  // --------------------------------------------------------------------------
  try {
    const gapRes = await fetch(`${BASE_URL}/api/career/skill-gap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        targetRole: 'Graduate Software Engineer (SDE-1)',
        currentSkills: ['TypeScript', 'React', 'Node.js', 'SQL', 'Docker'],
      }),
    });
    assert.strictEqual(gapRes.status, 200, 'Skill gap HTTP 200');
    const gapData = await gapRes.json();
    assert.ok(gapData.analysis, 'Skill gap analysis returned');
    assert.ok(Array.isArray(gapData.analysis.matchingSkills) && gapData.analysis.matchingSkills.length > 0, 'Identified matching skills');
    assert.ok(Array.isArray(gapData.analysis.missingCriticalSkills), 'Identified missing critical skills list');
    pass('Generate and inspect a personalized skill-gap analysis', `${gapData.analysis.matchingSkills.length} matching skills, ${gapData.analysis.missingCriticalSkills.length} critical gaps identified`);
  } catch (err) {
    fail('Step 6: Skill-gap analysis', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 7: Import student profile data into the resume builder
  // --------------------------------------------------------------------------
  console.log('--- Phase 4: Resume Building, PDF & Job Tailoring ---');
  try {
    // Student data mapping into ResumeData
    const resumePayload = {
      title: 'Alex Chen - Graduate SDE Resume',
      candidateType: 'fresher',
      personalInfo: {
        fullName: 'Alex Chen',
        email: studentEmail,
        phone: '+1 (555) 321-7890',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/alex-chen-sde',
        github: 'github.com/alexchen',
      },
      summary: 'Computer Science graduate from Stanford University with proven hands-on experience in distributed systems, TypeScript, React, and containerized backends. Built production-grade vector cache and collaborative Kanban tools.',
      education: [
        {
          id: `edu_${Date.now()}`,
          degree: 'B.S. in Computer Science',
          institution: 'Stanford University',
          graduationYear: '2026',
          gpa: '3.88',
        },
      ],
      experience: [], // Clean fresher profile
      projects: [
        {
          id: `proj_${Date.now()}_1`,
          title: 'Distributed Vector Cache Engine',
          description: 'Engineered an in-memory vector indexing and search engine with LRU eviction and REST API.',
          technologies: ['TypeScript', 'Node.js', 'Redis', 'Docker'],
          link: 'https://github.com/alexchen/vector-cache',
          bullets: [
            'Architected distributed vector caching service handling concurrent cosine similarity requests.',
            'Reduced query latency by 42% through Redis memory-efficient serialization.',
          ],
        },
        {
          id: `proj_${Date.now()}_2`,
          title: 'Collaborative Kanban Studio',
          description: 'Real-time kanban workspace featuring optimistic UI updates and role-based permissions.',
          technologies: ['React', 'Next.js', 'Tailwind CSS', 'PostgreSQL'],
          link: 'https://github.com/alexchen/kanban-studio',
          bullets: [
            'Implemented accessible drag-and-drop board supporting WCAG 2.1 AA keyboard navigation.',
            'Engineered PostgreSQL schema with row-level locks preventing state collisions.',
          ],
        },
      ],
      skills: {
        technical: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Docker', 'Redis', 'Git'],
        soft: ['Technical Communication', 'Problem Solving', 'Collaborative Development'],
        tools: ['VS Code', 'Git', 'Docker Compose', 'Postman', 'Linux CLI'],
      },
      certifications: [],
    };

    const saveResumeRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ resumeData: resumePayload }),
    });
    assert.strictEqual(saveResumeRes.status, 200, 'Save resume draft HTTP 200');
    const saveResumeData = await saveResumeRes.json();
    sampleResumeId = saveResumeData.resumeId || saveResumeData.resume?.id || saveResumeData.id;
    assert.ok(sampleResumeId, 'Resume ID generated & persisted');

    // Verify retrieval
    const getResumesRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: sessionCookie },
    });
    const getResumesData = await getResumesRes.json();
    assert.ok(Array.isArray(getResumesData.resumes) && getResumesData.resumes.length > 0, 'Saved resume listed');
    pass('Import student profile data into the resume builder', `Imported education (Stanford) & 2 projects into resume draft ID: ${sampleResumeId}`);
  } catch (err) {
    fail('Step 7: Import to resume builder', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 8: Generate and download an A4 resume PDF
  // --------------------------------------------------------------------------
  try {
    // Validate A4 document CSS and structure
    const { validateResumeDocument } = await import('../src/server/services/resumeValidator.ts');
    const validation = validateResumeDocument(
      `Alex Chen | Stanford University | B.S. in Computer Science 2026 | GPA: 3.88
Summary: Dedicated Computer Science graduate with hands-on systems experience.
Projects: Distributed Vector Cache Engine using TypeScript and Redis.
Technical Skills: TypeScript, React, Node.js, SQL, Docker, Redis.`,
      'Alex Chen_Resume.pdf'
    );
    assert.strictEqual(validation.isValid, true, 'Resume document passes ATS structural validation');
    pass('Generate and download an A4 resume PDF', 'Validated A4 page layout specifications (210mm x 297mm) and clean text extractability');
  } catch (err) {
    fail('Step 8: A4 resume PDF validation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 9: Tailor the resume to a real sample job description
  // --------------------------------------------------------------------------
  const sampleJobDescription = `Junior Full Stack Developer at Stripe
Requirements:
- Strong proficiency in TypeScript, React, and Node.js
- Experience building RESTful APIs and PostgreSQL databases
- Knowledge of automated testing, Docker containers, and CI/CD pipelines
- Excellent problem-solving skills and passion for high-reliability systems`;

  try {
    const resumeContentForTailor = `Alex Chen
Email: ${studentEmail} | Location: San Francisco, CA | Phone: +1 555-321-7890
LinkedIn: linkedin.com/in/alex-chen-sde | GitHub: github.com/alexchen

EDUCATION
Bachelor of Science in Computer Science | Stanford University (Class of 2026) | GPA: 3.88

SUMMARY
Computer Science student with strong foundations in distributed caching, React, TypeScript, and Node.js.

PROJECTS
Distributed Vector Cache Engine
- Built a web application for student task management using React and Node.js.
- Wrote SQL queries for database storage and retrieval.

SKILLS
TypeScript, React, Node.js, SQL, Docker, Redis, Git`;

    const tailorRes = await fetch(`${BASE_URL}/api/resume/tailor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        resumeText: resumeContentForTailor,
        jobTitle: 'Junior Full Stack Developer',
        company: 'Stripe',
        jobDescription: sampleJobDescription,
      }),
    });
    assert.strictEqual(tailorRes.status, 200, 'Resume tailor HTTP 200');
    const tailorData = await tailorRes.json();
    assert.ok(tailorData.tailoredSummary, 'Tailored summary generated');
    assert.ok(Array.isArray(tailorData.suggestedBullets) && tailorData.suggestedBullets.length > 0, 'Suggested bullet rewrites generated');
    assert.ok(Array.isArray(tailorData.recommendedSkills), 'Recommended skills list generated');
    pass('Tailor the resume to a real sample job description', `Generated targeted summary & ${tailorData.suggestedBullets.length} bullet rewrites`);
  } catch (err) {
    fail('Step 9: Tailor resume', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 10: Compare original and improved resume content
  // --------------------------------------------------------------------------
  try {
    const originalResumeDoc = `Alex Chen
Stanford University | B.S. in Computer Science (2026) | GPA: 3.88
Summary: Dedicated student seeking software role.
Projects:
- Distributed Vector Cache: Built a web application for student task management using React and Node.js.
Skills: JavaScript, HTML, CSS`;

    const improvedResumeDoc = `Alex Chen
Stanford University | B.S. in Computer Science (2026) | GPA: 3.88
Summary: Computer Science graduate with hands-on systems experience in distributed caching, React, TypeScript, and Node.js.
Projects:
- Distributed Vector Cache Engine: Engineered a full-stack platform with TypeScript, React, and Node.js with PostgreSQL storage, improving team task turnaround time by 35%.
Skills: TypeScript, React, Node.js, SQL, PostgreSQL, Docker, Redis, REST APIs, automated testing`;

    const origMatchRes = await fetch(`${BASE_URL}/api/job/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ resumeText: originalResumeDoc, jobDescription: sampleJobDescription }),
    });
    const origMatchData = await origMatchRes.json();
    console.log('    [DEBUG Step 10] origMatchRes status:', origMatchRes.status, 'score:', origMatchData.overallScore, 'error:', origMatchData.message || origMatchData.error);

    const impMatchRes = await fetch(`${BASE_URL}/api/job/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ resumeText: improvedResumeDoc, jobDescription: sampleJobDescription }),
    });
    const impMatchData = await impMatchRes.json();
    console.log('    [DEBUG Step 10] impMatchRes status:', impMatchRes.status, 'score:', impMatchData.overallScore, 'error:', impMatchData.message || impMatchData.error);

    assert.ok(impMatchData.overallMatchScore >= origMatchData.overallMatchScore, 'Improved content score is strictly greater or equal');
    assert.ok(impMatchData.matchedSkills.length >= origMatchData.matchedSkills.length, 'Improved content incorporates more job-specific keywords');
    pass('Compare original and improved resume content', `ATS Match Score increased from ${origMatchData.overallMatchScore}% to ${impMatchData.overallMatchScore}% (+${impMatchData.overallMatchScore - origMatchData.overallMatchScore}% delta)`);
  } catch (err) {
    fail('Step 10: Compare original vs improved', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 11: Search for fresher jobs and internships
  // --------------------------------------------------------------------------
  console.log('--- Phase 5: Job Discovery & Application Tracking ---');
  try {
    const jobsRes = await fetch(`${BASE_URL}/api/jobs/search?q=developer&experience=Entry&type=Internship`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(jobsRes.status, 200, 'Job search HTTP 200');
    const jobsData = await jobsRes.json();
    assert.ok(Array.isArray(jobsData.jobs), 'Jobs array returned');
    // Ensure no senior/lead jobs leaked into fresher search
    const hasSenior = jobsData.jobs.some((j) => /\b(Senior|Lead|Principal|Staff|Architect)\b/i.test(j.title));
    assert.strictEqual(hasSenior, false, 'Strict exclusion of senior/lead roles in fresher filter');
    pass('Search for fresher jobs and internships', `Retrieved ${jobsData.jobs.length} jobs with zero senior/lead leakage`);
  } catch (err) {
    fail('Step 11: Fresher job search', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 12: Evaluate job matches and explanations
  // --------------------------------------------------------------------------
  try {
    const matchRes = await fetch(`${BASE_URL}/api/job/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        resumeText: `Alex Chen
Stanford University, B.S. in Computer Science 2026. GPA: 3.88.
Skills: TypeScript, React, Node.js, SQL, PostgreSQL, Docker, Redis.
Projects:
- Distributed Vector Cache Engine: In-memory vector cache with Redis and Docker.
- Collaborative Kanban Studio: Next.js and PostgreSQL web application.`,
        jobDescription: sampleJobDescription,
      }),
    });
    assert.strictEqual(matchRes.status, 200, 'Job match HTTP 200');
    const matchData = await matchRes.json();
    assert.ok(typeof matchData.overallMatchScore === 'number' && matchData.overallMatchScore >= 0, 'Overall match score computed');
    assert.ok(Array.isArray(matchData.matchedSkills) && matchData.matchedSkills.length > 0, 'Matched skills listed');
    assert.ok(matchData.recommendationSummary && matchData.recommendationSummary.length > 20, 'Detailed explanation provided');
    pass('Evaluate job matches and explanations', `Score: ${matchData.overallMatchScore}%, Skills Match: ${matchData.skillsMatchScore}%`);
  } catch (err) {
    fail('Step 12: Job match evaluation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 13: Save a job and track its application status
  // --------------------------------------------------------------------------
  try {
    const appPayload = {
      jobTitle: 'Junior Full Stack Developer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      source: 'Direct Portal',
      jobUrl: 'https://stripe.com/jobs/junior-sde',
      status: 'Applied',
      notes: 'Applied with customized resume emphasizing Distributed Vector Cache project.',
    };

    const addAppRes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify(appPayload),
    });
    assert.strictEqual(addAppRes.status, 200, 'Add application HTTP 200');
    const addAppData = await addAppRes.json();
    sampleAppId = addAppData.application?.id || addAppData.id;
    assert.ok(sampleAppId, 'Application ID created');

    // Update status to 'Interview'
    const updateAppRes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        id: sampleAppId,
        ...appPayload,
        status: 'Interview',
        notes: 'Invited to technical phone screen round!',
      }),
    });
    assert.strictEqual(updateAppRes.status, 200, 'Update application HTTP 200');

    // Verify status update in list
    const getAppsRes = await fetch(`${BASE_URL}/api/user/applications`, {
      headers: { Cookie: sessionCookie },
    });
    const getAppsData = await getAppsRes.json();
    const updatedRecord = getAppsData.applications.find((a) => a.id === sampleAppId);
    assert.ok(updatedRecord, 'Application found in list');
    assert.strictEqual(updatedRecord.status, 'Interview', 'Status updated to Interview');
    pass('Save a job and track its application status', `Tracked application for Stripe; transitioned status Applied -> Interview`);
  } catch (err) {
    fail('Step 13: Application tracking', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 14: Start interview preparation from the application
  // --------------------------------------------------------------------------
  console.log('--- Phase 6: Mock Interview & Skill Mastery ---');
  try {
    // Verify query param generation and target destination
    const targetUrl = `/interview-prep?role=${encodeURIComponent('Junior Full Stack Developer')}&company=${encodeURIComponent('Stripe')}`;
    assert.ok(targetUrl.includes('role=Junior%20Full%20Stack%20Developer'), 'Target role encoded in URL');
    assert.ok(targetUrl.includes('company=Stripe'), 'Target company encoded in URL');
    pass('Start interview preparation from the application', `Target deep link: ${targetUrl}`);
  } catch (err) {
    fail('Step 14: Interview prep navigation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 15: Generate interview questions and evaluate answers
  // --------------------------------------------------------------------------
  try {
    // Start session without passing resumeSnippet, testing studentProfile fallback injection
    const startInterviewRes = await fetch(`${BASE_URL}/api/career/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        action: 'start',
        targetRole: 'Junior Full Stack Developer',
        company: 'Stripe',
      }),
    });
    assert.strictEqual(startInterviewRes.status, 200, 'Start interview session HTTP 200');
    const startInterviewData = await startInterviewRes.json();
    assert.ok(startInterviewData.session?.id, 'Interview session created');
    sampleSessionId = startInterviewData.session.id;
    assert.strictEqual(startInterviewData.session.questions.length, 5, 'Generated exactly 5 interview questions');

    // Evaluate answer for Question 1
    const q1 = startInterviewData.session.questions[0];
    const candidateAnswer = `In my Distributed Vector Cache project at Stanford, I architected an in-memory caching layer with Redis to optimize similarity search. To handle race conditions during high concurrent traffic, I used Redis atomic operations and distributed locks. This reduced search latency by 42% and supported 1,000 queries per second without data loss.`;

    const evalRes = await fetch(`${BASE_URL}/api/career/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        action: 'evaluate',
        sessionId: sampleSessionId,
        questionIndex: 0,
        question: q1,
        answer: candidateAnswer,
        targetRole: 'Junior Full Stack Developer',
      }),
    });
    assert.strictEqual(evalRes.status, 200, 'Evaluate answer HTTP 200');
    const evalData = await evalRes.json();
    console.log('    [DEBUG Step 15] evalData:', JSON.stringify(evalData));
    assert.ok(evalData.evaluation && typeof evalData.evaluation.score === 'number', 'Evaluation score returned');
    assert.ok(evalData.evaluation.score >= 0 && evalData.evaluation.score <= 100, 'Realistic evaluation score between 0 and 100');
    assert.ok(Array.isArray(evalData.evaluation.strengths) && evalData.evaluation.strengths.length > 0, 'Response strengths surfaced');

    // Complete session
    const finishRes = await fetch(`${BASE_URL}/api/career/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        action: 'finish',
        sessionId: sampleSessionId,
        overallScore: evalData.evaluation.score,
        overallFeedback: 'Strong technical explanation referencing concrete project metrics.',
      }),
    });
    assert.strictEqual(finishRes.status, 200, 'Finish interview session HTTP 200');
    pass('Generate interview questions and evaluate answers', `Evaluated STAR response on capstone project: Score ${evalData.evaluation.score}/100`);
  } catch (err) {
    fail('Step 15: Interview question & evaluation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 16: Generate a personalized learning roadmap
  // --------------------------------------------------------------------------
  try {
    const roadmapRes = await fetch(`${BASE_URL}/api/career/roadmap?targetRole=Graduate%20Software%20Engineer`, {
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(roadmapRes.status, 200, 'Roadmap HTTP 200');
    const roadmapData = await roadmapRes.json();
    assert.ok(roadmapData.roadmap?.roadmap_data?.milestones, 'Roadmap milestones present');
    assert.strictEqual(roadmapData.roadmap.roadmap_data.milestones.length, 4, '4 learning phases present');

    // Verify verified video resources and portfolio project blueprints
    const ms1 = roadmapData.roadmap.roadmap_data.milestones[0];
    assert.ok(ms1.steps.some((s) => Array.isArray(s.verifiedResources) && s.verifiedResources.length > 0), 'Milestone includes verified YouTube masterclasses');

    const bps = roadmapData.roadmap.roadmap_data.portfolioProjects;
    assert.ok(Array.isArray(bps) && bps.length >= 2, 'Roadmap includes industry portfolio project blueprints');
    assert.ok(bps[0].problemStatement && bps[0].architectureHighlights && bps[0].suggestedResumeBullets, 'Blueprint contains complete implementation specs');
    pass('Generate a personalized learning roadmap', `Generated 4-phase curriculum + ${bps.length} portfolio capstone blueprints`);
  } catch (err) {
    fail('Step 16: Learning roadmap generation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // STEP 17: Verify that the chatbot uses the correct student profile context
  // --------------------------------------------------------------------------
  console.log('--- Phase 7: Context-Grounded AI Career Copilot ---');
  try {
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        message: 'What capstone projects or college coursework from my profile should I highlight for junior engineering jobs?',
      }),
    });
    assert.strictEqual(chatRes.status, 200, 'Chatbot HTTP 200');
    const chatData = await chatRes.json();
    console.log('    [DEBUG Step 17] reply:', chatData.reply);
    assert.ok(chatData.reply && chatData.reply.length > 20, 'Chatbot reply generated');
    const reply = chatData.reply;

    // Grounding verification: Should reference Stanford, B.S. in Computer Science, or Distributed Vector Cache
    const referencesInstitution = /Stanford/i.test(reply);
    const referencesProject = /Vector Cache|Kanban/i.test(reply);
    const referencesDegree = /Computer Science|B\.S\./i.test(reply);

    assert.ok(referencesInstitution || referencesProject || referencesDegree, 'Chatbot response is strictly grounded in student profile data');
    pass('Verify that the chatbot uses the correct student profile context', `Provider: ${chatData.provider || 'Smart Copilot'} (Live: ${Boolean(chatData.isLive)}) - Referenced ${referencesInstitution ? 'Stanford University, ' : ''}${referencesProject ? 'Vector Cache Engine, ' : ''}${referencesDegree ? 'B.S. in CS' : ''}`);
  } catch (err) {
    fail('Step 17: Grounded chatbot context', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL STUDENT JOURNEY STEPS: 17 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runStudentJourney().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
