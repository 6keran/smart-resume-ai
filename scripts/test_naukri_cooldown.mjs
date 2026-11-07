import assert from 'node:assert/strict';
import Module from 'node:module';

const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return originalLoad.apply(this, [id, ...args]);
};

const challengeBody = JSON.stringify({
  message: 'recaptcha required',
  statusCode: 406,
  validationErrors: [],
  data: null,
});

function providerResponse(status, body, contentType = 'application/json') {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

function makeJob(id, source, title = 'Software Engineer') {
  const url = `https://jobs.example.test/${id}`;
  return {
    id,
    source,
    sourceJobId: id,
    title,
    company: `${source} Example`,
    location: 'Bengaluru, India',
    description: `${title} in Bengaluru.`,
    snippet: `${title} role.`,
    employmentType: 'Full-time',
    experienceLevel: 'Mid',
    workplaceType: 'On-site',
    postedAt: undefined,
    applyUrl: url,
    sourceUrl: url,
    skills: [],
    remote: false,
    hybrid: false,
    onsite: true,
  };
}

async function run() {
  const {
    classifyNaukriResponse,
    NaukriProviderCooldown,
    NaukriProviderUnavailableError,
  } = await import('../src/server/services/jobs/providers/naukriCooldown.ts');
  const { NaukriProvider } = await import('../src/server/services/jobs/providers/naukri.ts');
  const { executeJobSearch } = await import('../src/server/services/jobs/search.ts');
  const { jobSearchCache } = await import('../src/server/services/jobs/cache.ts');
  const { buildNaukriSearchUrl } = await import('../src/lib/jobs/naukriSearchUrl.ts');

  assert.equal(classifyNaukriResponse(406, challengeBody), 'challenge');
  assert.equal(classifyNaukriResponse(403, 'Access denied'), 'restricted');
  assert.equal(classifyNaukriResponse(200, '{"jobDetails":[]}'), null);

  let now = Date.now();
  const boundedCooldown = new NaukriProviderCooldown(60 * 60 * 1_000, () => now);
  assert.equal(boundedCooldown.block('challenge', 406).remainingMs, 10 * 60 * 1_000);
  boundedCooldown.clear();

  const originalFetch = global.fetch;
  let providerFetchCount = 0;
  let currentResponse = providerResponse(406, challengeBody);
  global.fetch = async () => {
    providerFetchCount += 1;
    return currentResponse;
  };

  try {
    const cooldown = new NaukriProviderCooldown(5 * 60 * 1_000, () => now);
    const provider = new NaukriProvider(cooldown);
    const searchParams = {
      keywords: 'Software Engineer',
      location: 'Bengaluru',
      page: 1,
      limit: 5,
      bypassCache: true,
    };

    await assert.rejects(
      () => provider.searchJobs(searchParams),
      (error) => error instanceof NaukriProviderUnavailableError &&
        error.status.reason === 'challenge' && error.status.statusCode === 406 &&
        error.isCooldown === false
    );
    const firstRetryAt = cooldown.getStatus()?.retryAt;
    await assert.rejects(
      () => provider.searchJobs(searchParams),
      (error) => error instanceof NaukriProviderUnavailableError &&
        error.isCooldown === true && error.status.retryAt === firstRetryAt
    );
    assert.equal(providerFetchCount, 1, 'cooldown must suppress repeated Naukri requests');

    now += 5 * 60 * 1_000;
    currentResponse = providerResponse(200, JSON.stringify({
      jobDetails: [{
        jobId: 'naukri-123',
        title: 'Software Engineer',
        companyName: 'Naukri Example',
        staticUrl: '/job-listings/software-engineer-naukri-123',
        createdDate: 'invalid date',
      }],
    }));
    const retriedJobs = await provider.searchJobs(searchParams);
    assert.equal(providerFetchCount, 2, 'Naukri may be retried after the bounded cooldown expires');
    assert.equal(retriedJobs.length, 1);
    assert.equal(retriedJobs[0].postedAt, undefined, 'missing publication dates stay missing');

    const searchCooldown = new NaukriProviderCooldown(5 * 60 * 1_000, () => now);
    const cachedNaukri = new NaukriProvider(searchCooldown);
    const cachedJob = makeJob('naukri-cached-1', 'Naukri');
    const linkedInJob = makeJob('linkedin-live-1', 'LinkedIn');
    jobSearchCache.clear();
    jobSearchCache.set('Naukri', [cachedJob], 'Software Engineer', 'Bengaluru');
    const expectedNaukriSnapshot = jobSearchCache.getEntry('Naukri', 'Software Engineer', 'Bengaluru')?.cachedAt;

    providerFetchCount = 0;
    global.fetch = async () => {
      providerFetchCount += 1;
      return providerResponse(406, challengeBody);
    };

    let linkedinFetchCount = 0;
    const linkedIn = {
      name: 'LinkedIn',
      isConfigured: () => true,
      searchJobs: async () => {
        linkedinFetchCount += 1;
        return [linkedInJob];
      },
    };
    const search = {
      keywords: 'Software Engineer',
      location: 'Bengaluru',
      page: 1,
      limit: 5,
      bypassCache: true,
    };

    const firstSearch = await executeJobSearch(search, [cachedNaukri, linkedIn]);
    assert(firstSearch.unavailableSources?.includes('Naukri'));
    assert.equal(firstSearch.unavailableSourceReasons?.Naukri, 'challenge');
    assert(firstSearch.sourceCooldownUntil?.Naukri);
    assert(firstSearch.liveSources?.includes('LinkedIn'));
    assert(!firstSearch.liveSources?.includes('Naukri'), 'cached Naukri listings must not be labeled live');
    assert(firstSearch.cachedSources?.includes('Naukri'));
    assert.equal(firstSearch.cachedAtBySource?.Naukri, expectedNaukriSnapshot);
    assert(firstSearch.cachedJobIds?.includes(cachedJob.id));
    assert(firstSearch.jobs.some((job) => job.id === linkedInJob.id));
    assert(firstSearch.jobs.some((job) => job.id === cachedJob.id));
    assert.equal(providerFetchCount, 1);
    assert.equal(linkedinFetchCount, 1);

    const secondSearch = await executeJobSearch(search, [cachedNaukri, linkedIn]);
    assert(secondSearch.unavailableSources?.includes('Naukri'));
    assert(secondSearch.cachedSources?.includes('Naukri'));
    assert(secondSearch.jobs.some((job) => job.id === linkedInJob.id));
    assert.equal(providerFetchCount, 1, 'manual retries during cooldown must not call Naukri');
    assert.equal(linkedinFetchCount, 2, 'other sources remain independently searchable');

    const cachedSearchDuringCooldown = await executeJobSearch({ ...search, bypassCache: false }, [cachedNaukri, linkedIn]);
    assert(cachedSearchDuringCooldown.unavailableSources?.includes('Naukri'));
    assert(cachedSearchDuringCooldown.cachedSources?.includes('Naukri'));
    assert.equal(providerFetchCount, 1, 'cache hits during cooldown must still suppress Naukri requests');
    assert.equal(linkedinFetchCount, 3);

    searchCooldown.clear();
    jobSearchCache.clear();
    providerFetchCount = 0;
    const uncachedBlockedNaukri = new NaukriProvider(searchCooldown);
    const withoutNaukriCache = await executeJobSearch(search, [uncachedBlockedNaukri, linkedIn]);
    assert(withoutNaukriCache.unavailableSources?.includes('Naukri'));
    assert(!withoutNaukriCache.cachedSources?.includes('Naukri'));
    assert(!withoutNaukriCache.jobs.some((job) => job.source === 'Naukri'));
    assert(withoutNaukriCache.jobs.some((job) => job.source === 'LinkedIn'));

    const directSearch = new URL(buildNaukriSearchUrl('C++ Engineer & Analyst', 'New York / USA'));
    assert.equal(directSearch.hostname, 'www.naukri.com');
    assert.match(directSearch.pathname, /c-engineer-analyst-jobs-in-new-york-usa$/);

    console.log('Naukri challenge, cooldown, retry, cache, unavailable, and provider-isolation tests passed.');
  } finally {
    global.fetch = originalFetch;
    jobSearchCache.clear();
  }
}

run().catch((error) => {
  console.error('Naukri cooldown tests failed:', error);
  process.exit(1);
});
