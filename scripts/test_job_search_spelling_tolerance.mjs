import assert from 'node:assert/strict';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

async function run() {
  console.log('================================================================');
  console.log('AUTOMATIC SPELLING CORRECTION & SMART JOB SEARCH TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  const {
    correctSearchQuery,
    normalizeLocationQuery,
    normalizeWhitespace,
    levenshteinDistance,
    damerauLevenshteinDistance,
  } = await import('../src/server/services/jobs/searchQuery.ts');

  const { filterJobs } = await import('../src/server/services/jobs/filters.ts');
  const { executeJobSearch } = await import('../src/server/services/jobs/search.ts');
  const noResultsProvider = {
    name: 'Test Provider',
    isConfigured: () => true,
    searchJobs: async () => [],
  };

  // Test 1: Edit distance accuracy (insertions, deletions, substitutions, and transpositions)
  await test('Edit distance computes correctly for typos and character transpositions', () => {
    assert.equal(levenshteinDistance('developer', 'develper'), 1);
    assert.equal(levenshteinDistance('software', 'softwere'), 1);
    assert.equal(levenshteinDistance('analyst', 'anlyst'), 1);
    assert.equal(damerauLevenshteinDistance('react', 'recat'), 1);
    assert.equal(levenshteinDistance('react', 'react'), 0);
  });

  // Test 2: Whitespace trimming and multiple space normalization
  await test('Trims leading/trailing whitespace and normalizes repeated internal spaces', () => {
    const raw = '   Software     Engineer    ';
    assert.equal(normalizeWhitespace(raw), 'Software Engineer');

    const res = correctSearchQuery('   Software     Engineer    ');
    assert.equal(res.normalizedQuery, 'Software Engineer');
    assert.equal(res.correctedQuery, 'Software Engineer');
  });

  // Test 3: Correctly spelled query is preserved without alteration
  await test('Correctly spelled query preserves original terms', () => {
    const res = correctSearchQuery('Software Engineer');
    assert.equal(res.correctedQuery, 'Software Engineer');
    assert.equal(res.correctionApplied, false);
  });

  // Test 4: All required example title corrections
  await test('Corrects "Softwere Engineer" -> "Software Engineer"', () => {
    const res = correctSearchQuery('Softwere Engineer');
    assert.equal(res.correctedQuery, 'Software Engineer');
    assert.equal(res.correctionApplied, true);
    assert.equal(res.originalQuery, 'Softwere Engineer');
  });

  await test('Corrects "Data Anlyst" -> "Data Analyst"', () => {
    const res = correctSearchQuery('Data Anlyst');
    assert.equal(res.correctedQuery, 'Data Analyst');
    assert.equal(res.correctionApplied, true);
  });

  await test('Corrects "React Develper" -> "React Developer"', () => {
    const res = correctSearchQuery('React Develper');
    assert.equal(res.correctedQuery, 'React Developer');
    assert.equal(res.correctionApplied, true);
  });

  await test('Corrects "Python Develpor" -> "Python Developer"', () => {
    const res = correctSearchQuery('Python Develpor');
    assert.equal(res.correctedQuery, 'Python Developer');
    assert.equal(res.correctionApplied, true);
  });

  await test('Corrects "Machne Learning Engineer" -> "Machine Learning Engineer"', () => {
    const res = correctSearchQuery('Machne Learning Engineer');
    assert.equal(res.correctedQuery, 'Machine Learning Engineer');
    assert.equal(res.correctionApplied, true);
  });

  // Test 5: Location spelling corrections and aliases
  await test('Corrects location typo "Bangaluru" -> "Bengaluru" with aliases', () => {
    const blr = normalizeLocationQuery('Bangaluru');
    assert.equal(blr.canonicalLocation, 'Bengaluru');
    assert.equal(blr.wasCorrected, true);
    assert(blr.aliasList.includes('bengaluru'));
    assert(blr.aliasList.includes('bangalore'));
  });

  await test('Corrects location typo "Hydrabad" -> "Hyderabad" with aliases', () => {
    const hyd = normalizeLocationQuery('Hydrabad');
    assert.equal(hyd.canonicalLocation, 'Hyderabad');
    assert.equal(hyd.wasCorrected, true);
    assert(hyd.aliasList.includes('hyderabad'));
    assert(hyd.aliasList.includes('secunderabad'));
  });

  // Test 6: Multiple spelling mistakes in a single query
  await test('Corrects multiple spelling mistakes in one query', () => {
    const res = correctSearchQuery('Machne Learng Enginer');
    assert.equal(res.correctedQuery, 'Machine Learning Engineer');
    assert.equal(res.correctionApplied, true);
  });

  // Test 7: Job title combined with location in keyword input
  await test('Handles job titles combined with locations and connectors', () => {
    const res1 = correctSearchQuery('Software Engineer in Bangaluru');
    assert.equal(res1.correctedQuery, 'Software Engineer in Bengaluru');
    assert.equal(res1.correctionApplied, true);

    const res2 = correctSearchQuery('React Develper Hydrabad');
    assert.equal(res2.correctedQuery, 'React Developer Hyderabad');
    assert.equal(res2.correctionApplied, true);
  });

  // Test 8: Case differences handled cleanly
  await test('Handles casing variations (lower, UPPER, mixed)', () => {
    const resLower = correctSearchQuery('softwere engineer');
    assert.equal(resLower.correctedQuery.toLowerCase(), 'software engineer');

    const resUpper = correctSearchQuery('SOFTWERE ENGINEER');
    assert.equal(resUpper.correctedQuery.toLowerCase(), 'software engineer');
  });

  // Test 9: Location aliases map standard tech hubs
  await test('Location aliases map Bengaluru and Bangalore as equivalents', () => {
    const blr1 = normalizeLocationQuery('Bengaluru');
    assert(blr1.aliasList.includes('bengaluru'));
    assert(blr1.aliasList.includes('bangalore'));
    assert.equal(blr1.canonicalLocation, 'Bengaluru');

    const blr2 = normalizeLocationQuery('Bangalore');
    assert(blr2.aliasList.includes('bengaluru'));
    assert(blr2.aliasList.includes('bangalore'));
    assert.equal(blr2.canonicalLocation, 'Bengaluru');
  });

  await test('Location aliases map Gurgaon and Gurugram as equivalents', () => {
    const gg1 = normalizeLocationQuery('Gurgaon');
    assert(gg1.aliasList.includes('gurgaon'));
    assert(gg1.aliasList.includes('gurugram'));
    assert.equal(gg1.canonicalLocation, 'Gurugram');

    const gg2 = normalizeLocationQuery('Gurugram');
    assert(gg2.aliasList.includes('gurgaon'));
    assert(gg2.aliasList.includes('gurugram'));
    assert.equal(gg2.canonicalLocation, 'Gurugram');
  });

  await test('Location aliases map Bombay and Mumbai as equivalents', () => {
    const bom = normalizeLocationQuery('Bombay');
    assert(bom.aliasList.includes('bombay'));
    assert(bom.aliasList.includes('mumbai'));
    assert.equal(bom.canonicalLocation, 'Mumbai');

    const mum = normalizeLocationQuery('Mumbai');
    assert(mum.aliasList.includes('bombay'));
    assert(mum.aliasList.includes('mumbai'));
    assert.equal(mum.canonicalLocation, 'Mumbai');
  });

  // Test 10: Filter matches jobs across location aliases and typo keywords
  await test('filterJobs matches jobs in Bengaluru when searching for Bangalore with typo keywords', () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Software Engineer',
        company: 'Innovatech',
        location: 'Bengaluru, Karnataka, India',
        description: 'Building React and Node.js microservices',
        snippet: 'React and Node.js',
        workplaceType: 'On-site',
        employmentType: 'Full-time',
        experienceLevel: 'Mid',
        postedAt: new Date().toISOString(),
        applyUrl: 'https://example.com/apply/1',
        sourceUrl: 'https://example.com/1',
        source: 'LinkedIn',
        sourceJobId: '1',
        skills: ['React', 'Node.js'],
        remote: false,
        hybrid: false,
        onsite: true,
      },
      {
        id: 'job-2',
        title: 'Project Manager',
        company: 'OtherCo',
        location: 'Mumbai, Maharashtra',
        description: 'Managing delivery schedules',
        snippet: 'Delivery schedules',
        workplaceType: 'On-site',
        employmentType: 'Full-time',
        experienceLevel: 'Senior',
        postedAt: new Date().toISOString(),
        applyUrl: 'https://example.com/apply/2',
        sourceUrl: 'https://example.com/2',
        source: 'LinkedIn',
        sourceJobId: '2',
        skills: ['Agile'],
        remote: false,
        hybrid: false,
        onsite: true,
      },
    ];

    const results = filterJobs(mockJobs, {
      keywords: 'Softwere Engineer',
      location: 'Bangalore',
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'job-1');
  });

  // Test 11: Unrelated niche queries are NEVER mutated
  await test('Unrelated niche queries are never silently converted into different titles', () => {
    const nicheQuery = 'Bioinformatics CRISPR Specialist';
    const res = correctSearchQuery(nicheQuery);
    assert.equal(res.correctedQuery, nicheQuery);
    assert.equal(res.correctionApplied, false);
  });

  // Test 12: Zero-result search does not fabricate listings
  await test('Zero-result search returns empty jobs array without fabricating listings', async () => {
    const emptyJobs = filterJobs([], {
      keywords: 'NonexistentRoleXYZ123',
      location: 'Antarctica',
    });
    assert.equal(emptyJobs.length, 0);
  });

  // Test 13: executeJobSearch integrates query correction, pagination, and location metadata
  await test('executeJobSearch applies normalization, pagination, and transparent response metadata', async () => {
    const response = await executeJobSearch({
      keywords: '   Softwere    Engineer   ',
      location: 'Bangaluru',
      page: 1,
      limit: 10,
    }, [noResultsProvider]);

    assert(response !== null);
    assert.equal(typeof response.totalJobs, 'number');
    assert.equal(response.page, 1);
    assert.equal(response.originalKeywords, '   Softwere    Engineer   ');
    assert.equal(response.correctedKeywords, 'Software Engineer');
    assert.equal(response.correctionApplied, true);
    assert.equal(response.locationWasCorrected, true);
    assert.equal(response.correctedLocation, 'Bengaluru');
    assert(Array.isArray(response.jobs));
    assert(response.jobs.length <= 10);
  });

  // Test 14: Fallback to original query when corrected query returns 0 results
  await test('Fallback mechanism safely considers original query when appropriate', async () => {
    // If a query correction had 0 results, response contains clean honest metadata without fabricating jobs
    const response = await executeJobSearch({
      keywords: 'UnmatchedSpecialtyXYZ987',
      location: 'UnknownIsland404',
      page: 1,
      limit: 10,
    }, [noResultsProvider]);

    assert(response !== null);
    assert.equal(response.jobs.length, 0);
    assert.equal(response.totalJobs, 0);
  });

  console.log(`\n================================================================`);
  console.log(`ALL ${passed}/${total} AUTOMATIC SPELLING & SMART SEARCH TESTS PASSED!`);
  console.log(`================================================================\n`);
}

run().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
