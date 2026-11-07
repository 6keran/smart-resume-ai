import assert from 'node:assert/strict';
import Module from 'node:module';

const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return originalLoad.apply(this, [id, ...args]);
};

async function postJson(url, payload, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

async function run() {
  const suggestionsRoute = await import('../src/app/api/jobs/suggestions/route.ts');
  const { executeJobSearch } = await import('../src/server/services/jobs/search.ts');
  const { jobSearchCache } = await import('../src/server/services/jobs/cache.ts');
  const { normalizePostedAt } = await import('../src/server/services/jobs/normalize.ts');

  const suggestions = async (field, query) => {
    const response = await suggestionsRoute.POST(new Request('http://localhost/api/jobs/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, query }),
    }));
    return { response, body: await response.json() };
  };

  const mechanical = await suggestions('keywords', 'mechan');
  assert.equal(mechanical.response.status, 200);
  assert(mechanical.body.suggestions.some((item) => item.value === 'Mechanical Maintenance Engineer' && item.kind === 'Role'));

  const plc = await suggestions('keywords', 'PLC');
  assert(plc.body.suggestions.some((item) => item.value === 'PLC' && item.kind === 'Skill'));

  const bangalore = await suggestions('location', 'Bangal');
  assert(bangalore.body.suggestions.some((item) => item.value === 'Bangalore'));

  const remote = await suggestions('location', 'remote');
  assert(remote.body.suggestions.some((item) => item.value === 'Remote'));

  const shortQuery = await suggestions('keywords', 'm');
  assert.deepEqual(shortQuery.body.suggestions, []);

  assert.equal((await suggestions('companies', 'Acme')).response.status, 400);
  assert.equal((await suggestions('keywords', 'x'.repeat(81))).response.status, 400);
  assert.equal(normalizePostedAt(undefined), undefined);
  assert.equal(normalizePostedAt('not a publication date'), undefined);
  assert(Number.isFinite(Date.parse(normalizePostedAt('2 days ago'))));

  const jobSearchRoute = await import('../src/app/api/jobs/search/route.ts');
  const overlongSearch = () => jobSearchRoute.POST(new Request('http://localhost/api/jobs/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.70',
    },
    body: JSON.stringify({ keywords: 'x'.repeat(121) }),
  }));

  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.equal((await overlongSearch()).status, 400);
  }
  const rateLimited = await overlongSearch();
  assert.equal(rateLimited.status, 429);
  assert(rateLimited.headers.get('retry-after'));

  jobSearchCache.clear();
  const jobs = Array.from({ length: 5 }, (_, index) => ({
    id: `mechanical-${index}`,
    source: 'Test Provider',
    sourceJobId: String(index),
    title: 'Mechanical Maintenance Engineer',
    company: `Test Company ${index}`,
    location: 'Bengaluru, India',
    description: 'Maintain mechanical systems and equipment.',
    snippet: 'Mechanical maintenance role.',
    employmentType: 'Full-time',
    experienceLevel: 'Mid',
    workplaceType: 'On-site',
    postedAt: undefined,
    applyUrl: `https://jobs.example.test/listing/${index}`,
    sourceUrl: `https://jobs.example.test/listing/${index}`,
    skills: ['Mechanical maintenance'],
    remote: false,
    hybrid: false,
    onsite: true,
  }));
  const liveProvider = {
    name: 'Test Provider',
    isConfigured: () => true,
    searchJobs: async () => jobs,
  };

  const searchParams = {
    keywords: 'Mechanical Maintenance Engineer',
    location: 'Bengaluru',
    page: 1,
    limit: 5,
  };
  const liveResponse = await executeJobSearch(searchParams, [liveProvider]);
  assert.equal(liveResponse.jobs.length, 5);
  assert.deepEqual(liveResponse.activeSources, ['Test Provider']);
  assert.deepEqual(liveResponse.cachedSources, []);

  const unavailableProvider = {
    name: 'Test Provider',
    isConfigured: () => true,
    searchJobs: async () => { throw new Error('simulated provider outage'); },
  };
  const cachedResponse = await executeJobSearch({ ...searchParams, bypassCache: true }, [unavailableProvider]);
  assert.equal(cachedResponse.jobs.length, 5);
  assert(cachedResponse.unavailableSources?.includes('Test Provider'));
  assert(cachedResponse.cachedSources?.includes('Test Provider'));
  assert(Number.isFinite(Date.parse(cachedResponse.cachedAt)));

  jobSearchCache.clear();
  console.log('Job search autocomplete tests passed (suggestions, validation, rate limit, live/cache source states).');
}

run().catch((error) => {
  console.error('Job search autocomplete test failed:', error);
  process.exit(1);
});
