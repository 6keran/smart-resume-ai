async function fetchUrl(url, cookie = '') {
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
    },
  });
  const data = await res.text();
  return { status: res.status, data };
}

async function loginOrRegister() {
  const email = 'candidate_showcase@career.test';
  const password = 'Password123!';
  let res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Candidate Test',
        email,
        password,
        confirmPassword: password,
      }),
    });
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/sra_user_session=([^;]+)/);
  return match ? `sra_user_session=${match[1]}` : '';
}

async function run() {
  console.log('Testing Public Homepage (Unauthenticated)...');
  const pub = await fetchUrl('http://localhost:3000/');
  console.log('Status:', pub.status);

  const checks = [
    { label: 'Has clean heading', test: pub.data.includes('Build, Analyze, and Optimize Your Resume for Real ATS Systems') },
    { label: 'No "Latest ATS Improvements Made"', test: !pub.data.includes('Latest ATS Improvements Made') },
    { label: 'No fake "92 / 100"', test: !pub.data.includes('92 / 100') && !pub.data.includes('92%') },
    { label: 'No fake candidate "Venkatesha"', test: !pub.data.includes('Venkatesha') },
    { label: 'No fake candidate "Alex Johnson"', test: !pub.data.includes('Alex Johnson') },
    { label: 'No fake "10M+ records"', test: !pub.data.includes('10M+') },
    { label: 'No fake "42% latency"', test: !pub.data.includes('reducing search latency by 42%') },
    { label: 'No fake "250K+ daily active users"', test: !pub.data.includes('250K+') },
    { label: 'No "Productivity Heatmap"', test: !pub.data.includes('Productivity Heatmap') },
    { label: 'No "Load Sample" controls', test: !pub.data.includes('Load Sample') },
    { label: 'Has Analyzer link', test: pub.data.includes('/analyzer') },
    { label: 'Has Builder link', test: pub.data.includes('/builder') },
    { label: 'Has Improver link', test: pub.data.includes('/improver') },
    { label: 'Has Skills link', test: pub.data.includes('/skills') },
    { label: 'Has Jobs link', test: pub.data.includes('/jobs') },
    { label: 'Has Privacy link', test: pub.data.includes('/privacy') },
    { label: 'Has Terms link', test: pub.data.includes('/terms') },
  ];

  let passed = 0;
  for (const c of checks) {
    if (c.test) {
      console.log(`  [PASS] ${c.label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${c.label}`);
    }
  }

  console.log(`\nTesting Authenticated Dashboard Homepage...`);
  const cookie = await loginOrRegister();
  console.log('Got Auth Cookie:', Boolean(cookie));

  const auth = await fetchUrl('http://localhost:3000/', cookie);
  console.log('Status:', auth.status);

  const authChecks = [
    { label: 'Rendered authenticated dashboard', test: auth.data.includes('Welcome back') },
    { label: 'No "Latest ATS Improvements Made" on dashboard', test: !auth.data.includes('Latest ATS Improvements Made') },
    { label: 'No fake 78% Target Readiness on dashboard', test: !auth.data.includes('Target Readiness') && !auth.data.includes('Top 15%') },
    { label: 'Career Guidance is marked Coming Soon', test: auth.data.includes('Career Guidance') && auth.data.includes('Coming Soon') },
    { label: 'No "Productivity Heatmap" on dashboard', test: !auth.data.includes('Productivity Heatmap') },
  ];

  for (const c of authChecks) {
    if (c.test) {
      console.log(`  [PASS] ${c.label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${c.label}`);
    }
  }

  console.log(`\nTotal Passed: ${passed} / ${checks.length + authChecks.length}`);
  if (passed === checks.length + authChecks.length) {
    console.log('ALL HOMEPAGE CLEANUP CRITERIA VERIFIED SUCCESSFULLY.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
