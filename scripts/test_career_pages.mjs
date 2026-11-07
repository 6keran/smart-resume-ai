import http from 'http';

const routes = [
  '/',
  '/dashboard',
  '/interview-prep',
  '/skills',
  '/jobs',
  '/job-match',
  '/builder',
  '/analyzer',
  '/ats-score',
  '/improver',
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      resolve({ path, statusCode: res.statusCode });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing Career Ecosystem Routes on localhost:3000...\n');
  let allPassed = true;
  for (const r of routes) {
    const res = await checkRoute(r);
    const ok = res.statusCode >= 200 && res.statusCode < 400;
    console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${res.path} -> ${res.statusCode || res.error}`);
    if (!ok) allPassed = false;
  }

  if (allPassed) {
    console.log('\nAll checked routes returned 2xx/3xx!');
    process.exit(0);
  } else {
    console.error('\nSome routes failed.');
    process.exit(1);
  }
}

run();

