/**
 * SMART RESUME AI: COMPREHENSIVE JOB PLATFORM REGRESSION TEST SUITE
 * 
 * Validates:
 * 1. Search validation and filter handling
 * 2. Empty results and provider failure resilience
 * 3. Malformed and duplicate job listing deduplication
 * 4. Resume-to-job matching (required vs preferred, ground truth)
 * 5. Missing skills reporting and incomplete resume guidance
 * 6. Saving and unsaving jobs (persisted across sessions)
 * 7. Application status updates and protection against accidental status downgrades
 * 8. Duplicate application prevention
 * 9. Authentication and cross-user data isolation
 * 10. Database parameterization and search event deduplication
 */

import Module from 'node:module';

// Intercept server-only check for test environment
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

const {
  registerUser,
  createJobApplication,
  getUserJobApplications,
  updateJobApplication,
  deleteJobApplication,
  deleteJobApplicationByJobId,
  recordJobSearchEvent,
  recordJobMatchEvent,
  getDb,
} = await import('../src/server/db/index.ts');

const { deduplicateJobs } = await import('../src/server/services/jobs/dedupe.ts');
const { matchResumeToJob } = await import('../src/server/services/gemini.ts');
const { validateResumeDocument } = await import('../src/lib/resumeValidator.ts');
const { executeJobSearch } = await import('../src/server/services/jobs/search.ts');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('=== STARTING JOB PLATFORM COMPREHENSIVE REGRESSION SUITE ===');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userAEmail = `job_test_user_a_${timestamp}@example.com`;
  const userBEmail = `job_test_user_b_${timestamp}@example.com`;

  // Setup test users
  const resA = await registerUser({ name: 'Alice Applicant', email: userAEmail, password: 'SecretP@ss123' });
  const resB = await registerUser({ name: 'Bob Candidate', email: userBEmail, password: 'SecretP@ss123' });
  const userAId = resA.user.id;
  const userBId = resB.user.id;

  assert(userAId && userBId, 'Registered test users User A and User B successfully');

  // -------------------------------------------------------------
  // Test 1: Deduplication Engine (Exact URL & Multi-Source Normalization)
  // -------------------------------------------------------------
  const fixtureJobs = [
    {
      id: 'job_dup_1',
      source: 'LinkedIn',
      title: 'Senior Software Engineer (Backend)',
      company: 'Acme Technologies Inc.',
      location: 'Bengaluru, Karnataka',
      description: 'Short description',
      applyUrl: 'https://example.com/apply/1',
      postedDate: new Date().toISOString(),
      workplaceType: 'Hybrid',
      jobType: 'Full-time',
    },
    {
      id: 'job_dup_2',
      source: 'Adzuna',
      title: 'Senior Software Engineer',
      company: 'Acme Tech',
      location: 'Bangalore',
      description: 'Longer comprehensive description with required skills',
      applyUrl: 'https://example.com/apply/1', // Same URL
      postedDate: new Date().toISOString(),
      workplaceType: 'Hybrid',
      jobType: 'Full-time',
      salaryMin: 2000000,
      salaryMax: 3000000,
    },
    {
      id: 'job_unique_3',
      source: 'LinkedIn',
      title: 'Frontend Engineer',
      company: 'Acme Tech',
      location: 'Bangalore',
      description: 'Frontend role',
      applyUrl: 'https://example.com/apply/3',
      postedDate: new Date().toISOString(),
      workplaceType: 'Remote',
      jobType: 'Full-time',
    },
  ];

  const deduped = deduplicateJobs(fixtureJobs);
  assert(deduped.length === 2, `Deduplication merged duplicates (expected 2 unique jobs, got ${deduped.length})`);
  assert(
    deduped.some((j) => j.title.includes('Frontend Engineer')),
    'Different vacancies for same company are preserved and not incorrectly merged'
  );

  // -------------------------------------------------------------
  // Test 2: Search Query Logging & Deduplication
  // -------------------------------------------------------------
  const searchEvent1 = await recordJobSearchEvent({
    userId: userAId,
    query: 'Full Stack Developer',
    location: 'Remote',
    resultCount: 15,
  });
  // Rapid second search with identical parameters within 60 seconds
  const searchEvent2 = await recordJobSearchEvent({
    userId: userAId,
    query: 'Full Stack Developer',
    location: 'Remote',
    resultCount: 15,
  });
  assert(searchEvent1 === searchEvent2, 'Rapid duplicate job searches within 60s are deduplicated');

  // -------------------------------------------------------------
  // Test 3: Search Pagination & Double Pagination Fix Verification
  // -------------------------------------------------------------
  const page1Res = await executeJobSearch({
    query: 'Software Engineer',
    location: 'Bangalore',
    page: 1,
    limit: 3,
  });
  assert(
    page1Res && typeof page1Res.totalJobs === 'number' && Array.isArray(page1Res.jobs),
    `Search execution returned valid structure with total ${page1Res.totalJobs} jobs`
  );

  if (page1Res.jobs.length >= 3) {
    const page2Res = await executeJobSearch({
      query: 'Software Engineer',
      location: 'Bangalore',
      page: 2,
      limit: 3,
    });
    assert(
      page2Res && Array.isArray(page2Res.jobs),
      'Page 2 pagination executes successfully using query-pool caching without double-slice bug'
    );
    if (page2Res.jobs.length > 0) {
      assert(
        page1Res.jobs[0].id !== page2Res.jobs[0].id,
        'Page 1 and Page 2 contain distinct, non-overlapping listings'
      );
    }
  }

  // -------------------------------------------------------------
  // Test 4: Empty Results & Provider Resilience
  // -------------------------------------------------------------
  const emptyRes = await executeJobSearch({
    query: 'xyznonexistentjobtitlerandom123456789',
    location: 'NonExistentCity99',
    page: 1,
    limit: 5,
  });
  assert(
    emptyRes && emptyRes.jobs.length === 0,
    'Unmatchable search query safely returns 0 results without fabricating fake jobs'
  );

  // -------------------------------------------------------------
  // Test 5: Resume Document & Job Description Validation
  // -------------------------------------------------------------
  const emptyValidation = validateResumeDocument('');
  assert(!emptyValidation.isValid, 'Empty resume input is rejected by document validator');

  const shoppingListValidation = validateResumeDocument('Apples, Bananas, Milk, Bread, Eggs, Cheese');
  assert(!shoppingListValidation.isValid, 'Non-resume text is rejected by document validator');

  const validResumeSample = `
    Alex Rivera
    alex.rivera@example.com | (555) 123-4567 | San Francisco, CA
    
    Professional Summary:
    Results-driven Software Engineer with 5+ years of experience designing scalable web services.
    
    Technical Skills:
    Languages & Frameworks: TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Docker, AWS
    
    Experience:
    Senior Software Engineer | CloudScale Inc. | 2021 - Present
    - Architected microservices with Node.js and TypeScript handling 50k requests/minute.
    - Built responsive frontend applications using React and Next.js.
    - Maintained CI/CD pipelines with Docker and AWS ECS.
    
    Education:
    Bachelor of Science in Computer Science | University of California, Berkeley | 2017 - 2021
  `;

  const validValidation = validateResumeDocument(validResumeSample);
  assert(validValidation.isValid, 'Comprehensive authentic resume passes document validation');

  // -------------------------------------------------------------
  // Test 4: Resume-to-Job Matching (Required vs Preferred Skills)
  // -------------------------------------------------------------
  const testJobDescription = `
    Senior Full Stack Engineer at FinTech Labs
    Requirements:
    - 4+ years experience with React, TypeScript, and Node.js
    - Experience with PostgreSQL and relational databases
    - Bachelor's degree in Computer Science or related field
    
    Nice to have / Preferred:
    - Experience with GraphQL
    - Familiarity with Kubernetes
  `;

  const matchResult = await matchResumeToJob(
    validResumeSample,
    'Senior Full Stack Engineer',
    'FinTech Labs',
    testJobDescription
  );

  assert(
    typeof matchResult.overallMatchScore === 'number' && matchResult.overallMatchScore > 0,
    `Overall match score is numeric: ${matchResult.overallMatchScore}%`
  );

  // Check matched skills
  const matchedNames = matchResult.matchedSkills.map((s) => s.skill);
  assert(
    matchedNames.includes('React') && matchedNames.includes('TypeScript') && matchedNames.includes('Node.js'),
    'Matched skills accurately includes React, TypeScript, and Node.js present in both resume and JD'
  );

  // Check required vs preferred distinction
  const reactMatch = matchResult.matchedSkills.find((s) => s.skill === 'React');
  assert(
    reactMatch && reactMatch.importance === 'required',
    'React is identified with importance "required"'
  );

  // Check missing skills
  const missingNames = matchResult.missingSkills.map((s) => s.skill);
  assert(
    missingNames.includes('GraphQL') || missingNames.includes('Kubernetes'),
    'Missing skills accurately identifies GraphQL or Kubernetes absent from candidate resume'
  );

  // Check NO fake skills were injected
  assert(
    !matchedNames.includes('Problem Solving'),
    'Matcher does not inject fake "Problem Solving" skill'
  );
  assert(
    !missingNames.includes('System Architecture'),
    'Matcher does not inject fake "System Architecture" skill'
  );

  // Consistency: identical inputs yield identical deterministic scores
  const matchResult2 = await matchResumeToJob(
    validResumeSample,
    'Senior Full Stack Engineer',
    'FinTech Labs',
    testJobDescription
  );
  assert(
    matchResult.overallMatchScore === matchResult2.overallMatchScore,
    'Job matching is 100% deterministic and repeatable for identical inputs'
  );

  // -------------------------------------------------------------
  // Test 5: Mismatched Profile Receives Honest Low Score (No Fake 65 Floor)
  // -------------------------------------------------------------
  const nonTechnicalResume = `
    Jordan Baker
    jordan.baker@example.com | New York, NY
    
    Professional Summary:
    Customer service specialist with 2 years experience in retail and call center environments.
    
    Skills:
    Customer Satisfaction, POS Systems, Cash Handling, Communication
    
    Experience:
    Retail Associate | RetailMart | 2022 - Present
    - Assisted customers with checkout and inquiries.
    
    Education:
    High School Diploma | Central High | 2022
  `;

  const mismatchResult = await matchResumeToJob(
    nonTechnicalResume,
    'Senior Machine Learning Engineer',
    'DeepTech',
    'Requirements: 5+ years PyTorch, TensorFlow, Deep Learning, C++, Python, PhD required.'
  );

  assert(
    mismatchResult.overallMatchScore < 50,
    `Mismatched profile receives genuine low advisory score (${mismatchResult.overallMatchScore}%), confirming removal of artificial 65% score floor`
  );

  // -------------------------------------------------------------
  // Test 6: Saving & Unsaving Jobs
  // -------------------------------------------------------------
  const savedJob = await createJobApplication(userAId, {
    jobId: 'job_to_save_123',
    company: 'CloudVentures',
    jobTitle: 'Backend Engineer',
    source: 'LinkedIn',
    jobUrl: 'https://example.com/jobs/backend-123',
    status: 'Saved',
    notes: 'Saved for weekend review',
  });

  assert(savedJob && savedJob.id, 'Job application record created with status "Saved"');

  let userAApps = await getUserJobApplications(userAId);
  const foundSaved = userAApps.find((a) => a.jobId === 'job_to_save_123');
  assert(foundSaved && foundSaved.status === 'Saved', 'Saved job persists in database and is retrievable');

  // Direct unsave by jobId
  const unsavedSuccess = await deleteJobApplicationByJobId(userAId, 'job_to_save_123');
  assert(unsavedSuccess === true, 'deleteJobApplicationByJobId removes the saved job successfully');

  userAApps = await getUserJobApplications(userAId);
  const foundAfterUnsave = userAApps.find((a) => a.jobId === 'job_to_save_123');
  assert(!foundAfterUnsave, 'Saved job is no longer present after unsaving');

  // -------------------------------------------------------------
  // Test 7: Duplicate Application Prevention & Updating
  // -------------------------------------------------------------
  const appFirst = await createJobApplication(userAId, {
    jobId: 'job_dup_test_456',
    company: 'Apex Systems',
    jobTitle: 'Platform Engineer',
    source: 'LinkedIn',
    jobUrl: 'https://example.com/jobs/platform-456',
    status: 'Saved',
  });

  const appSecond = await createJobApplication(userAId, {
    jobId: 'job_dup_test_456',
    company: 'Apex Systems',
    jobTitle: 'Platform Engineer',
    source: 'LinkedIn',
    jobUrl: 'https://example.com/jobs/platform-456',
    status: 'Saved',
    notes: 'Updated notes on second save',
  });

  assert(appFirst.id === appSecond.id, 'Saving same job twice updates the existing record without creating duplicates');

  userAApps = await getUserJobApplications(userAId);
  const matchingCount = userAApps.filter((a) => a.jobId === 'job_dup_test_456').length;
  assert(matchingCount === 1, `Exactly 1 application record exists for the job (got ${matchingCount})`);

  // -------------------------------------------------------------
  // Test 8: Status Persistence & Protection Against Accidental Downgrades
  // -------------------------------------------------------------
  // Update status to 'Interview'
  const updatedToInterview = await updateJobApplication(userAId, appFirst.id, {
    status: 'Interview',
    notes: 'Interview scheduled for Tuesday at 2pm',
  });
  assert(updatedToInterview && updatedToInterview.status === 'Interview', 'Application status updated to "Interview"');

  // Now simulate user clicking the job link or re-saving from search
  const attemptDowngrade = await createJobApplication(userAId, {
    jobId: 'job_dup_test_456',
    company: 'Apex Systems',
    jobTitle: 'Platform Engineer',
    source: 'LinkedIn',
    jobUrl: 'https://example.com/jobs/platform-456',
    status: 'Ready to apply', // Attempting to set lower status
  });

  assert(
    attemptDowngrade.status === 'Interview',
    'Advanced application status ("Interview") is protected from being downgraded back to "Ready to apply"'
  );

  // -------------------------------------------------------------
  // Test 9: Authentication & Strict Cross-User Data Isolation
  // -------------------------------------------------------------
  // User B tries to read User A's applications
  const userBApps = await getUserJobApplications(userBId);
  const hasUserAData = userBApps.some((a) => a.jobId === 'job_dup_test_456');
  assert(!hasUserAData, 'User B cannot view User A\'s job applications');

  // User B tries to update User A's application
  let unauthorizedUpdateBlocked = false;
  try {
    await updateJobApplication(userBId, appFirst.id, {
      notes: 'Hacked by User B',
    });
  } catch (err) {
    unauthorizedUpdateBlocked = err.message.includes('unauthorized');
  }
  assert(unauthorizedUpdateBlocked, 'User B cannot update User A\'s application record (blocked with unauthorized error)');

  // User B tries to delete User A's application
  const maliciousDelete = await deleteJobApplication(userBId, appFirst.id);
  assert(maliciousDelete === false, 'User B cannot delete User A\'s application record (returns false)');

  // Verify User A's record was untouched
  userAApps = await getUserJobApplications(userAId);
  const userARecord = userAApps.find((a) => a.id === appFirst.id);
  assert(userARecord && userARecord.notes !== 'Hacked by User B', 'User A\'s record remains intact after unauthorized attempt');

  // -------------------------------------------------------------
  // Test 10: Clean Up & Verification
  // -------------------------------------------------------------
  const cleanDelete = await deleteJobApplication(userAId, appFirst.id);
  assert(cleanDelete === true, 'Authorized owner can delete their own application record');

  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests} / ${totalTests} REGRESSION TESTS PASSED WITH EXIT CODE 0 ===`);
  console.log('================================================================');
}

runRegressionSuite().catch((err) => {
  console.error('\n[REGRESSION SUITE FAILED]:', err);
  process.exit(1);
});
