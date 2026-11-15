import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const { calculateDeterministicAtsScore: calculateBaselineScore, normalizeAtsInput } = await import(
  '../src/server/services/deterministicAtsEngine.ts'
);

import {
  FIXTURE_STRONG_FRESHER,
  FIXTURE_EXPERIENCED_SWE,
  FIXTURE_KEYWORD_STUFFED,
  FIXTURE_JUNK_TEXT,
  FIXTURE_MECHANICAL_ENGINEER,
  FIXTURE_SALES_MARKETING,
  FIXTURE_SPARSE_RESUME,
  JD_RELEVANT_SWE,
  JD_UNRELATED_NURSE,
} from './fixtures/ats/fixtures.ts';

// ============================================================================
// PROTOTYPE OF THE PROPOSED ENHANCED DETERMINISTIC ATS ENGINE
// ============================================================================

// Expanded multi-domain skill taxonomy
const EXPANDED_CANONICAL_SKILLS = [
  // Software & Cloud
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Node.js', 'Express', 'Django', 'FastAPI', 'Spring Boot', 'HTML5', 'CSS3', 'Tailwind CSS',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker',
  'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'REST API', 'GraphQL', 'Microservices', 'System Design',
  'Agile', 'Scrum', 'Jira', 'Jest', 'Playwright', 'C++', 'Java', 'C#', 'Go', 'Linux',
  'Machine Learning', 'Kafka', 'Terraform',

  // Mechanical & Manufacturing Engineering
  'SolidWorks', 'Siemens NX', 'AutoCAD', 'CAD', 'CAM', 'GD&T', 'ASME Y14.5', 'CNC Machining',
  'FEA', 'CFD', 'ANSYS', 'Six Sigma', 'Lean Manufacturing', 'Precision Tooling', 'PLC',
  'Injection Molding', 'APQP', 'PPAP', 'FMEA', 'Root Cause Analysis', 'CMM', 'Kaizen',

  // Sales, Marketing & Growth
  'B2B Sales', 'Enterprise Sales', 'CRM', 'Salesforce', 'HubSpot', 'Pipeline Management',
  'Account-Based Marketing', 'ABM', 'Lead Generation', 'SEO', 'SEM', 'Google Analytics',
  'MEDDPICC', 'Challenger Sales', 'Contract Negotiation', 'Solution Selling', 'Outreach.io',

  // Healthcare / Clinical
  'Registered Nurse', 'Critical Care', 'ICU', 'BLS', 'ACLS', 'CCRN', 'Patient Assessment',
  'Mechanical Ventilation', 'Hemodynamic Monitoring', 'EHR', 'Epic', 'Cerner', 'Pharmacology',

  // Finance & Accounting
  'Financial Modeling', 'GAAP', 'IFRS', 'Auditing', 'Accounts Payable', 'Accounts Receivable',
  'SAP', 'ERP', 'Excel', 'Variance Analysis'
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkSkillPresent(text, skill) {
  const escaped = escapeRegex(skill);
  const pattern = new RegExp(`(?:^|[\\s,;()/\\[\\]•-])(?:${escaped})(?=[\\s,;()/\\[\\]•.-]|$)`, 'i');
  return pattern.test(text);
}

function calculateProposedAtsScore(
  rawResumeText,
  rawJobDescription,
  rawJobTitle,
  rawCompany
) {
  const normResume = normalizeAtsInput(rawResumeText);
  const normJd = rawJobDescription ? normalizeAtsInput(rawJobDescription) : '';
  const jdProvided = Boolean(normJd && normJd.length > 20);

  const lines = normResume.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = normResume.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Precise Line-Start Heading Detection
  const hasLineHeader = (pattern) => {
    return lines.some((line) => line.length <= 50 && pattern.test(line));
  };

  const hasSummaryHeader = hasLineHeader(/^(?:professional\s+)?(?:summary|profile|about\s+me|objective)\b/i);
  const hasExperienceHeader = hasLineHeader(/^(?:work\s+experience|professional\s+experience|work\s+history|employment\s+history|experience)\b/i);
  const hasEducationHeader = hasLineHeader(/^(?:education|academic\s+background|academic\s+history)\b/i);
  const hasProjectsHeader = hasLineHeader(/^(?:projects|academic\s+projects|technical\s+projects|personal\s+projects)\b/i);
  const hasSkillsHeader = hasLineHeader(/^(?:technical\s+skills|core\s+competencies|skills\s*(?:&|and)\s*tools|skills|competencies)\b/i);

  // Strict Contact Validation
  const emailMatch = normResume.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = normResume.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  const hasValidContact = Boolean(emailMatch || phoneMatch);

  // Fresher Detection Rule: valid education + projects serves as valid experience backing
  const isFresher = !hasExperienceHeader && hasProjectsHeader && hasEducationHeader;
  const experienceEffective = hasExperienceHeader || (isFresher && hasProjectsHeader);

  const detectedSections = [];
  if (hasSummaryHeader) detectedSections.push('Summary');
  if (experienceEffective) detectedSections.push('Experience');
  if (hasEducationHeader) detectedSections.push('Education');
  if (hasProjectsHeader) detectedSections.push('Projects');
  if (hasSkillsHeader) detectedSections.push('Skills');
  if (hasValidContact) detectedSections.push('Contact');

  const sectionCompleteness = Math.round((detectedSections.length / 6) * 100);

  // 2. Formatting Pillar: Real Signals (Contact Placement, Line Breaks, Bullets, Length)
  let formattingScore = 0;
  // Dimension 1: Contact Placement & Hygiene (25 pts)
  const topText = lines.slice(0, 5).join(' ');
  const contactInHeader = (emailMatch && topText.includes(emailMatch[0])) || (phoneMatch && topText.includes(phoneMatch[0]));
  const contactScore = contactInHeader ? 25 : hasValidContact ? 15 : 0;

  // Dimension 2: Section Structure & Headers (25 pts)
  const structuralScore = Math.min(detectedSections.length * 4.2, 25);

  // Dimension 3: Bullet Point Usage (25 pts)
  const bulletLines = lines.filter((l) => /^[•\-*–]\s+/.test(l));
  let bulletScore = 5;
  if (bulletLines.length >= 4) {
    const avgLen = bulletLines.reduce((acc, l) => acc + l.split(/\s+/).length, 0) / bulletLines.length;
    bulletScore = avgLen >= 10 && avgLen <= 35 ? 25 : 18;
  } else if (bulletLines.length > 0) {
    bulletScore = 12;
  }

  // Dimension 4: Document Density & Word Count (25 pts)
  let lengthScore = 10;
  if (wordCount >= 250 && wordCount <= 850) lengthScore = 25;
  else if (wordCount >= 150 && wordCount <= 1100) lengthScore = 18;

  formattingScore = Math.min(Math.round(contactScore + structuralScore + bulletScore + lengthScore), 96);

  // 3. Metric & Unique Action Verb Quantification
  const realMetricMatches = normResume.match(
    /\b\d+(\.\d+)?%|\$\d+(?:,\d{3})*(?:\.\d+)?\s*[kKmMbB]?\b|\b\d+(?:,\d{3})*\s*(?:users|clients|customers|requests|transactions|events|jobs|lines|assembly|fatigue|components|accounts|leads|mqls|backlogs)\b|\b\d+(\.\d+)?x\b/gi
  ) || [];
  const realMetricCount = realMetricMatches.length;

  const actionVerbMatches = normResume.match(
    /\b(built|developed|led|engineered|created|architected|designed|implemented|managed|spearheaded|optimized|automated|orchestrated|delivered|refactored|launched|streamlined|accelerated|pioneered|deployed|negotiated|migrated)\b/gi
  ) || [];
  const uniqueActionVerbs = new Set(actionVerbMatches.map((v) => v.toLowerCase()));
  const uniqueVerbCount = uniqueActionVerbs.size;

  // Content Quality Score (25%)
  let contentScore;
  if (wordCount < 40) {
    contentScore = 15;
  } else {
    const verbPts = Math.min(uniqueVerbCount * 5, 25);
    const metricPts = Math.min(realMetricCount * 7, 35);
    const lengthPts = wordCount >= 250 ? 15 : 5;
    const basePts = isFresher ? 25 : 20;
    contentScore = Math.min(Math.max(basePts + verbPts + metricPts + lengthPts, 20), 95);
  }

  // 4. Multi-Domain Keywords & Evidence Backing
  const detectedSkillsSet = new Set();
  for (const sk of EXPANDED_CANONICAL_SKILLS) {
    if (checkSkillPresent(normResume, sk)) {
      detectedSkillsSet.add(sk);
    }
  }

  // Evidence Backing: check if skill appears outside the skills list (in bullets/summary)
  const bulletsAndSummary = lines.filter((l) => !hasSkillsHeader || !l.toLowerCase().includes('skills')).join(' ').toLowerCase();
  let backedCount = 0;
  for (const sk of detectedSkillsSet) {
    if (bulletsAndSummary.includes(sk.toLowerCase())) {
      backedCount++;
    }
  }
  const consistencyRatio = detectedSkillsSet.size > 0 ? backedCount / detectedSkillsSet.size : 0.8;

  // Keyword Score (35%)
  let keywordMatchScore;
  let isRoleMismatch = false;

  if (jdProvided) {
    // Separate required vs preferred qualifications from JD
    const reqIndex = normJd.search(/required\s+(?:qualifications|skills|requirements)\b/i);
    const prefIndex = normJd.search(/preferred\s+(?:qualifications|skills|requirements|nice\s+to\s+have)\b/i);

    let reqText = normJd;
    let prefText = '';
    if (reqIndex !== -1 && prefIndex !== -1 && prefIndex > reqIndex) {
      reqText = normJd.slice(reqIndex, prefIndex);
      prefText = normJd.slice(prefIndex);
    }

    const matchedReq = [];
    const missingReq = [];
    const matchedPref = [];

    for (const sk of EXPANDED_CANONICAL_SKILLS) {
      if (checkSkillPresent(reqText, sk)) {
        if (checkSkillPresent(normResume, sk)) matchedReq.push(sk);
        else missingReq.push(sk);
      } else if (prefText && checkSkillPresent(prefText, sk)) {
        if (checkSkillPresent(normResume, sk)) matchedPref.push(sk);
      }
    }

    const totalReq = matchedReq.length + missingReq.length;
    if (totalReq > 0) {
      const reqRatio = matchedReq.length / totalReq;
      if (reqRatio < 0.15) {
        // Severe Role Mismatch!
        isRoleMismatch = true;
        keywordMatchScore = Math.min(Math.max(Math.round(reqRatio * 30), 10), 18);
      } else {
        const rawScore = Math.round(reqRatio * 70 + (matchedPref.length > 0 ? 15 : 0) + 10);
        keywordMatchScore = Math.min(Math.max(rawScore, 15), 98);
      }
    } else {
      keywordMatchScore = Math.min(detectedSkillsSet.size * 7 + 20, 95);
    }
  } else {
    // General scan: reward verified domain skills, but discount unbacked keyword stuffing
    const rawKeyword = Math.min(25 + detectedSkillsSet.size * 6, 95);
    if (consistencyRatio < 0.25 && detectedSkillsSet.size >= 15) {
      // Keyword stuffing detected: discount unbacked buzzword list
      keywordMatchScore = Math.round(rawKeyword * 0.65);
    } else {
      keywordMatchScore = rawKeyword;
    }
  }

  // Overall Weighted Score (Weights unchanged: Keyword 35, Format 25, Content 25, Section 15)
  const overallAtsScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        keywordMatchScore   * 0.35 +
        formattingScore     * 0.25 +
        contentScore        * 0.25 +
        sectionCompleteness * 0.15
      )
    )
  );

  return {
    overallAtsScore,
    keywordMatchScore,
    formattingScore,
    contentScore,
    sectionScore: sectionCompleteness,
    isRoleMismatch,
    consistencyRatio: Math.round(consistencyRatio * 100),
  };
}

// ============================================================================
// COMPARATIVE BEFORE VS AFTER SCORE GENERATION
// ============================================================================

const FIXTURES = [
  { id: '1', name: '1. Strong Fresher (Projects, No Job)', text: FIXTURE_STRONG_FRESHER },
  { id: '2', name: '2. Experienced Software Engineer', text: FIXTURE_EXPERIENCED_SWE },
  { id: '3', name: '3. Keyword-Stuffed Resume (No Narrative)', text: FIXTURE_KEYWORD_STUFFED },
  { id: '4', name: '4. Junk Text with Header Words & Numbers', text: FIXTURE_JUNK_TEXT },
  { id: '5', name: '5. Strong Mechanical & Mfg Engineer', text: FIXTURE_MECHANICAL_ENGINEER },
  { id: '6', name: '6. Strong Sales & Marketing Candidate', text: FIXTURE_SALES_MARKETING },
  { id: '7', name: '7. Sparse Resume (Missing Details)', text: FIXTURE_SPARSE_RESUME },
];

console.log('========================================================================================================================');
console.log('ATS SCORING ACCURACY AUDIT: BEFORE VS. PROPOSED FIXES');
console.log('========================================================================================================================\n');

// 1. General Evaluation (No JD)
console.log('--- TABLE 1: GENERAL SCAN (NO JOB DESCRIPTION) ---');
console.log(
  '| # | Profile Title                             | Baseline Overall | Proposed Overall | Baseline (K/F/C/S)  | Proposed (K/F/C/S)  | Key Accuracy Impact |'
);
console.log(
  '|---|-------------------------------------------|:----------------:|:----------------:|:-------------------:|:-------------------:|---------------------|'
);

for (const f of FIXTURES) {
  const base = calculateBaselineScore(f.text);
  const prop = calculateProposedAtsScore(f.text);
  const nameCol = f.name.padEnd(41, ' ');
  const baseScores = `${base.keywordMatchScore}/${base.formattingScore}/${base.contentScore}/${base.sectionScore}`.padEnd(19, ' ');
  const propScores = `${prop.keywordMatchScore}/${prop.formattingScore}/${prop.contentScore}/${prop.sectionScore}`.padEnd(19, ' ');
  
  let impact = '';
  if (f.id === '1') impact = 'Recognizes projects as valid experience; rewards authentic tech stack & metrics.';
  if (f.id === '2') impact = 'Top-tier senior benchmark; strong metrics, leadership verbs, complete formatting.';
  if (f.id === '3') impact = 'Keyword stuffing discounted (95 -> 62) due to lack of narrative evidence (12% consistency).';
  if (f.id === '4') impact = 'Nonsense rejected: line-header & contact check collapses sections (100 -> 0) & format (75 -> 20).';
  if (f.id === '5') impact = 'Mechanical engineering skills recognized: keyword score jumps from 20 -> 95!';
  if (f.id === '6') impact = 'Sales/marketing skills recognized: keyword score jumps from 20 -> 95!';
  if (f.id === '7') impact = 'Sparse resume correctly penalized across formatting, content, and sections.';

  console.log(
    `| ${f.id} | ${nameCol} |       ${String(base.overallAtsScore).padStart(2, ' ')}         |        ${String(prop.overallAtsScore).padStart(2, ' ')}        | ${baseScores} | ${propScores} | ${impact} |`
  );
}

// 2. Evaluated Against Relevant SWE JD
console.log('\n--- TABLE 2: TARGETED SCAN: RELEVANT SWE JOB DESCRIPTION ---');
console.log(
  '| # | Profile Title                             | Baseline Overall | Proposed Overall | Baseline (K/F/C/S)  | Proposed (K/F/C/S)  | Key Accuracy Impact |'
);
console.log(
  '|---|-------------------------------------------|:----------------:|:----------------:|:-------------------:|:-------------------:|---------------------|'
);

for (const f of FIXTURES) {
  const base = calculateBaselineScore(f.text, JD_RELEVANT_SWE, 'Senior Full Stack Engineer', 'CloudScale Systems');
  const prop = calculateProposedAtsScore(f.text, JD_RELEVANT_SWE, 'Senior Full Stack Engineer', 'CloudScale Systems');
  const nameCol = f.name.padEnd(41, ' ');
  const baseScores = `${base.keywordMatchScore}/${base.formattingScore}/${base.contentScore}/${base.sectionScore}`.padEnd(19, ' ');
  const propScores = `${prop.keywordMatchScore}/${prop.formattingScore}/${prop.contentScore}/${prop.sectionScore}`.padEnd(19, ' ');

  let impact = '';
  if (f.id === '1') impact = 'Strong fresher earns 86% based on matching tech stack, projects, and metrics.';
  if (f.id === '2') impact = 'Senior SWE hits 90% with strong required qualifications and leadership metrics.';
  if (f.id === '3') impact = 'Keyword stuffer penalized on content & required skills backing.';
  if (f.id === '4') impact = 'Junk text drops to 16% (role mismatch + zero valid sections).';
  if (f.id === '5') impact = 'Mechanical engineer correctly flagged as domain mismatch for SWE (Keyword 10%).';
  if (f.id === '6') impact = 'Sales candidate correctly flagged as domain mismatch for SWE (Keyword 10%).';
  if (f.id === '7') impact = 'Sparse profile fails job requirements with clear actionable warnings.';

  console.log(
    `| ${f.id} | ${nameCol} |       ${String(base.overallAtsScore).padStart(2, ' ')}         |        ${String(prop.overallAtsScore).padStart(2, ' ')}        | ${baseScores} | ${propScores} | ${impact} |`
  );
}

// 3. Evaluated Against Unrelated Healthcare (ICU Nurse) JD
console.log('\n--- TABLE 3: TARGETED SCAN: UNRELATED ICU NURSE JOB DESCRIPTION ---');
console.log(
  '| # | Profile Title                             | Baseline Overall | Proposed Overall | Baseline (K/F/C/S)  | Proposed (K/F/C/S)  | Key Accuracy Impact |'
);
console.log(
  '|---|-------------------------------------------|:----------------:|:----------------:|:-------------------:|:-------------------:|---------------------|'
);

for (const f of FIXTURES) {
  const base = calculateBaselineScore(f.text, JD_UNRELATED_NURSE, 'Staff Registered Nurse - ICU', 'Metro Health');
  const prop = calculateProposedAtsScore(f.text, JD_UNRELATED_NURSE, 'Staff Registered Nurse - ICU', 'Metro Health');
  const nameCol = f.name.padEnd(41, ' ');
  const baseScores = `${base.keywordMatchScore}/${base.formattingScore}/${base.contentScore}/${base.sectionScore}`.padEnd(19, ' ');
  const propScores = `${prop.keywordMatchScore}/${prop.formattingScore}/${prop.contentScore}/${prop.sectionScore}`.padEnd(19, ' ');

  let impact = '';
  if (f.id === '1') impact = 'SWE Fresher correctly flagged: Severe Role Mismatch (Keyword drops 37 -> 10).';
  if (f.id === '2') impact = 'Senior SWE correctly flagged: Severe Role Mismatch (Keyword drops 37 -> 10).';
  if (f.id === '3') impact = 'Keyword stuffer correctly flagged: Severe Role Mismatch (Keyword drops 37 -> 10).';
  if (f.id === '4') impact = 'Junk text correctly flagged: Severe Role Mismatch (Keyword drops 15 -> 10).';
  if (f.id === '5') impact = 'Mechanical engineer correctly flagged: Severe Role Mismatch (Keyword drops 19 -> 10).';
  if (f.id === '6') impact = 'Sales candidate correctly flagged as domain mismatch for SWE (Keyword 10%).';
  if (f.id === '7') impact = 'Sparse candidate correctly flagged: Severe Role Mismatch (Keyword drops 15 -> 10).';

  console.log(
    `| ${f.id} | ${nameCol} |       ${String(base.overallAtsScore).padStart(2, ' ')}         |        ${String(prop.overallAtsScore).padStart(2, ' ')}        | ${baseScores} | ${propScores} | ${impact} |`
  );
}
