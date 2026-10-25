import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, headers: res.headers };
}

async function run() {
  console.log('================================================================');
  console.log('=== DEDICATED ATS SCORE PAGE (/ats-score) VERIFICATION SUITE ===');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${extra}`);
    }
  }

  // 1. Direct Page Route Access
  console.log('--- 1. Direct Route & HTML Rendering ---');
  const pageRes = await request('/ats-score');
  assert('GET /ats-score returns HTTP 200 OK', pageRes.status === 200);
  assert('Contains page heading "ATS Resume Score"', pageRes.text.includes('ATS Resume Score'));
  assert('Contains explanation of ATS evaluation', pageRes.text.includes('evaluate its compatibility with applicant tracking systems'));
  assert('Contains primary action "Analyze Resume"', pageRes.text.includes('Analyze Resume'));
  assert('Contains upload drop zone for PDF/DOCX/TXT', pageRes.text.includes('Supported formats: PDF, DOCX, TXT'));
  assert('Contains Paste Text alternative option', pageRes.text.includes('Paste Text'));

  // 2. Navigation Verification
  console.log('\n--- 2. Navigation Menu Integration ---');
  const homeRes = await request('/');
  assert('Header includes ATS Score link', homeRes.text.includes('href="/ats-score"'));
  assert('Sidebar navigation includes ATS Score', homeRes.text.includes('ATS Score') || pageRes.text.includes('ATS Score'));

  // 3. Backend Integration: Genuine ATS Scoring
  console.log('\n--- 3. Backend ATS Scoring Integration ---');
  const validResume = `
ALEXANDER WRIGHT
Senior Software Engineer | alex.wright@example.com | (555) 234-5678 | San Francisco, CA | linkedin.com/in/alexwright

PROFESSIONAL SUMMARY
Results-driven Senior Software Engineer with 7+ years of experience architecting distributed cloud systems, high-throughput microservices, and modern web applications. Expert in TypeScript, Python, Node.js, React, PostgreSQL, Docker, and AWS.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, Go, SQL
Frontend: React, Next.js, Redux, Tailwind CSS, HTML5, CSS3
Backend: Node.js, Express, FastAPI, Django, REST APIs, GraphQL
Databases & Cloud: PostgreSQL, Redis, MongoDB, AWS (ECS, S3, RDS), Docker, Kubernetes, CI/CD

PROFESSIONAL EXPERIENCE
Senior Full-Stack Engineer | CloudScale Systems | San Francisco, CA | 2021 - Present
- Architected and deployed microservices handling 15M daily requests using TypeScript, Node.js, and PostgreSQL.
- Reduced database query latency by 35% across high-traffic order processing pipelines through composite indexing and Redis caching.
- Spearheaded frontend migration to Next.js 14 and React Server Components, improving initial page load time by 45%.
- Implemented comprehensive automated CI/CD deployment pipelines using Docker and GitHub Actions with 99.9% deployment reliability.

Software Engineer | NexaCorp Solutions | San Jose, CA | 2018 - 2021
- Developed scalable RESTful APIs using Python and FastAPI serving 300,000 monthly active users.
- Designed database schemas and optimized complex SQL queries on PostgreSQL clusters.
- Collaborated with product and UX teams to build responsive user interfaces in React.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2018
`;

  const analyzeRes = await request('/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: validResume }),
  });

  assert('POST /api/resume/analyze returns HTTP 200', analyzeRes.status === 200);
  assert('Returns overallAtsScore as a valid number (0-100)', typeof analyzeRes.json?.overallAtsScore === 'number' && analyzeRes.json.overallAtsScore >= 0 && analyzeRes.json.overallAtsScore <= 100);
  assert('Returns keywordMatchScore', typeof analyzeRes.json?.keywordMatchScore === 'number');
  assert('Returns formattingScore', typeof analyzeRes.json?.formattingScore === 'number');
  assert('Returns contentScore', typeof analyzeRes.json?.contentScore === 'number');
  assert('Returns sectionScore', typeof analyzeRes.json?.sectionScore === 'number');
  assert('Detects matching skills/keywords (e.g. TypeScript, Python, React, PostgreSQL)', Array.isArray(analyzeRes.json?.detectedKeywords) && analyzeRes.json.detectedKeywords.length > 0);
  assert('Identifies missing keywords or skill gaps', Array.isArray(analyzeRes.json?.missingKeywords));
  assert('Provides structural strengths', Array.isArray(analyzeRes.json?.strengths) && analyzeRes.json.strengths.length > 0);
  assert('Provides top prioritized improvement suggestions', Array.isArray(analyzeRes.json?.topSuggestions) && analyzeRes.json.topSuggestions.length > 0);
  assert('Provides summaryFeedback paragraph', typeof analyzeRes.json?.summaryFeedback === 'string' && analyzeRes.json.summaryFeedback.length > 10);

  // 4. Job-Specific Matching Context
  console.log('\n--- 4. Job-Specific Keyword Matching Context ---');
  const jdMatchRes = await request('/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: validResume,
      jobTitle: 'Lead Cloud Infrastructure Architect',
      company: 'DataPlatform Inc.',
      jobDescription: 'Seeking an expert in Kubernetes cluster orchestration, Terraform infrastructure-as-code, Kafka streaming, and AWS cloud architectures.',
    }),
  });

  assert('Target role analysis returns HTTP 200', jdMatchRes.status === 200);
  assert('Identifies missing role-specific keywords (e.g. Kafka, Terraform, Kubernetes)', jdMatchRes.json?.missingKeywords?.some(k => ['kafka', 'terraform', 'kubernetes'].includes(k.toLowerCase())) || jdMatchRes.json?.missingSkills?.length > 0);

  // 5. Validation and Error Handling
  console.log('\n--- 5. Validation & Error Handling ---');
  const invalidDocRes = await request('/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: 'INVOICE #987123\nBILL TO: Acme Corp\nITEM: 10x Office Chairs @ $150 each\nTOTAL AMOUNT DUE: $1,500.00\nPayment Terms: Net 30',
    }),
  });

  assert('Non-resume document returns HTTP 422 Unprocessable Entity', invalidDocRes.status === 422);
  assert('Provides structured validation error message', invalidDocRes.json?.validation && invalidDocRes.json.validation.isValid === false);

  const emptyRes = await request('/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: '' }),
  });
  assert('Empty input returns HTTP 422 or 400', emptyRes.status === 400 || emptyRes.status === 422);

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('================================================================');

  if (passed === total) {
    console.log('🎉 ALL DEDICATED ATS SCORE PAGE TESTS PASSED (100%)\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
