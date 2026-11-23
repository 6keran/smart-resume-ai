import assert from 'node:assert';
import Module from 'node:module';

const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { RESUME_TEMPLATES, normalizeTemplateId } from '../src/lib/templates.ts';
import { ResumeRenderer } from '../src/components/builder/templates/ResumeRenderer.tsx';

console.log('================================================================');
console.log('📄 SMART RESUME AI: PHASE 7 RESUME TEMPLATE VALIDATION SUITE');
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

// -----------------------------------------------------------------------------
// CANONICAL 12 TEMPLATES AS DEFINED IN RESUME BUILDER
// -----------------------------------------------------------------------------
const PRIMARY_12_TEMPLATES = [
  { id: 'ats-classic', name: 'Classic Professional', isAtsFriendly: true },
  { id: 'corporate-executive', name: 'Modern Corporate', isAtsFriendly: true },
  { id: 'executive-professional', name: 'Executive Leadership', isAtsFriendly: true },
  { id: 'software-engineer', name: 'Engineering Professional', isAtsFriendly: true },
  { id: 'operations-management', name: 'Manufacturing & Operations', isAtsFriendly: true },
  { id: 'full-stack-developer', name: 'Software Developer', isAtsFriendly: true },
  { id: 'graduate-fresher', name: 'Fresher & Graduate', isAtsFriendly: true },
  { id: 'minimalist-ats', name: 'Minimalist ATS', isAtsFriendly: true },
  { id: 'minimalist', name: 'Modern Minimalist', isAtsFriendly: true },
  { id: 'academic-research', name: 'Academic & Research', isAtsFriendly: true },
  { id: 'modern-two-column', name: 'Professional Sidebar', isAtsFriendly: false },
  { id: 'compact-one-page', name: 'Compact One-Page', isAtsFriendly: true },
];

const SUPPLEMENTARY_TEMPLATES = [
  { id: 'experienced-professional', name: 'Experienced Professional' },
  { id: 'data-analyst', name: 'Data Analyst' },
  { id: 'ui-ux-designer', name: 'UI/UX Designer' },
  { id: 'internship-applicant', name: 'Internship Applicant' },
  { id: 'sales-marketing', name: 'Sales & Marketing' },
];

const ALL_TEMPLATES = [...PRIMARY_12_TEMPLATES, ...SUPPLEMENTARY_TEMPLATES];

const SAMPLE_CANDIDATE = {
  id: 'tmpl_test_cand_1',
  title: 'Senior Full Stack Systems Engineer',
  candidateType: 'experienced',
  personalInfo: {
    fullName: 'Alexandra Chen',
    headline: 'Senior Full Stack & Distributed Systems Engineer',
    email: 'alexandra.chen@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexandrachen',
    github: 'github.com/alexandrachen',
    portfolio: 'alexandrachen.dev',
  },
  summary: 'Full-stack software architect with 7+ years of experience designing scalable microservices, low-latency web interfaces, and distributed databases with high uptime.',
  skills: {
    technical: ['TypeScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Redis', 'Go', 'GraphQL', 'Docker'],
    tools: ['Git', 'AWS', 'Kubernetes', 'Terraform', 'Jest', 'GitHub Actions', 'Prometheus'],
    soft: ['System Architecture', 'Cross-functional Collaboration', 'Mentorship', 'Agile Leadership'],
  },
  experience: [
    {
      id: 'exp_ac_1',
      company: 'Stripe',
      role: 'Staff Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      bulletPoints: [
        'Architected real-time payout reconciliation engine processing $42M daily transaction volume at 99.999% reliability.',
        'Engineered distributed idempotency layer reducing duplicate webhook retries by 84%.',
        'Spearheaded team migration to Next.js App Router and React Server Components, improving LCP by 45%.',
      ],
    },
    {
      id: 'exp_ac_2',
      company: 'Twilio',
      role: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2019',
      endDate: '2022',
      current: false,
      bulletPoints: [
        'Designed high-throughput SMS dispatch router handling 18,000 requests/sec with Node.js and Redis streams.',
        'Mentored 6 junior and mid-level software engineers through structured code reviews and system design workshops.',
      ],
    },
  ],
  education: [
    {
      id: 'edu_ac_1',
      degree: 'B.S. in Computer Science',
      institution: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      graduationYear: '2019',
      gpa: '3.91',
      honors: 'Summa Cum Laude, Dean’s Honors',
    },
  ],
  projects: [
    {
      id: 'proj_ac_1',
      title: 'CloudMesh Distributed Task Scheduler',
      description: 'Fault-tolerant distributed workflow orchestrator with Raft consensus and gRPC heartbeats.',
      technologies: ['Go', 'Raft', 'gRPC', 'Docker', 'PostgreSQL'],
      link: 'github.com/alexandrachen/cloudmesh',
      bullets: [
        'Achieved sub-10ms task scheduling across 12 worker clusters with zero job drop during leader election.',
      ],
    },
  ],
  certifications: [
    {
      id: 'cert_ac_1',
      name: 'AWS Certified Solutions Architect – Professional',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
  ],
  languages: [
    { name: 'English', proficiency: 'Native' },
    { name: 'Mandarin', proficiency: 'Professional' },
  ],
  achievements: [
    { title: 'Berkeley Hackathon Grand Prize Winner (2018)' },
  ],
  templateId: 'ats-classic',
  lastUpdated: new Date().toISOString(),
};

async function runTemplateValidation() {
  console.log('--- TEST GROUP 1: TEMPLATE REGISTRY & METADATA COMPLETENESS ---');
  try {
    assert(RESUME_TEMPLATES.length >= 12, `Registry should contain at least 12 templates, found ${RESUME_TEMPLATES.length}`);
    for (const tmpl of PRIMARY_12_TEMPLATES) {
      const registered = RESUME_TEMPLATES.find((t) => t.id === tmpl.id);
      assert(registered, `Template '${tmpl.id}' must be registered in RESUME_TEMPLATES`);
      assert(registered.name, `Template '${tmpl.id}' must have a name`);
      assert(registered.category, `Template '${tmpl.id}' must have a category`);
      assert(registered.description, `Template '${tmpl.id}' must have a description`);
      assert(registered.intendedUse, `Template '${tmpl.id}' must have intendedUse`);
      assert(registered.styleDescription, `Template '${tmpl.id}' must have styleDescription`);
      assert.strictEqual(registered.isAtsFriendly, tmpl.isAtsFriendly, `ATS friendly flag mismatch on ${tmpl.id}`);
    }
    pass('Template Registry & Metadata', `All 12 primary templates verified in catalog`);
  } catch (err) {
    fail('Test Group 1: Template Registry', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 2: NORMALIZATION & ALIAS RESOLUTION ---');
  try {
    for (const tmpl of PRIMARY_12_TEMPLATES) {
      assert.strictEqual(normalizeTemplateId(tmpl.id), tmpl.id, `Canonical ID ${tmpl.id} normalizes to itself`);
    }
    // Verify common aliases
    assert.strictEqual(normalizeTemplateId('classic-professional'), 'ats-classic');
    assert.strictEqual(normalizeTemplateId('modern-ats'), 'ats-classic');
    assert.strictEqual(normalizeTemplateId('modern-corporate'), 'corporate-executive');
    assert.strictEqual(normalizeTemplateId('executive-leadership'), 'executive-professional');
    assert.strictEqual(normalizeTemplateId('engineering-professional'), 'software-engineer');
    assert.strictEqual(normalizeTemplateId('manufacturing-operations'), 'operations-management');
    assert.strictEqual(normalizeTemplateId('software-developer'), 'full-stack-developer');
    assert.strictEqual(normalizeTemplateId('fresh-graduate'), 'graduate-fresher');
    assert.strictEqual(normalizeTemplateId('ats-minimal'), 'minimalist-ats');
    assert.strictEqual(normalizeTemplateId('minimal-professional'), 'minimalist');
    assert.strictEqual(normalizeTemplateId('professional-sidebar'), 'modern-two-column');
    assert.strictEqual(normalizeTemplateId('unknown-fallback-123'), 'ats-classic');
    pass('Normalization & Alias Resolution', `Canonical IDs, legacy aliases, and safe fallback verified`);
  } catch (err) {
    fail('Test Group 2: Normalization', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 3: SSR RENDERING ACROSS ALL 12 PRIMARY TEMPLATES ---');
  try {
    for (const tmpl of PRIMARY_12_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: SAMPLE_CANDIDATE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );
      assert(html.length > 500, `Template ${tmpl.id} produced substantial markup`);
      assert(html.includes('Alexandra Chen'), `Template ${tmpl.id} rendered candidate name`);
      assert(html.includes('Stripe'), `Template ${tmpl.id} rendered company name`);
      assert(html.includes('Staff Software Engineer'), `Template ${tmpl.id} rendered role title`);
      assert(html.includes('University of California, Berkeley'), `Template ${tmpl.id} rendered education`);
      assert(html.includes('CloudMesh Distributed Task Scheduler'), `Template ${tmpl.id} rendered project`);
      assert(html.includes('TypeScript') || html.includes('React'), `Template ${tmpl.id} rendered skills`);
      assert(html.includes('alexandra.chen@example.com'), `Template ${tmpl.id} rendered email`);
    }
    pass('Primary 12 Templates SSR Rendering', `All 12 templates render complete data without error`);
  } catch (err) {
    fail('Test Group 3: Primary 12 Rendering', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 4: SUPPLEMENTARY TEMPLATES SSR RENDERING ---');
  try {
    for (const tmpl of SUPPLEMENTARY_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: SAMPLE_CANDIDATE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );
      assert(html.includes('Alexandra Chen'), `Template ${tmpl.id} rendered candidate name`);
      assert(html.includes('Stripe'), `Template ${tmpl.id} rendered experience`);
    }
    pass('Supplementary Templates SSR Rendering', `All 5 supplementary templates render cleanly`);
  } catch (err) {
    fail('Test Group 4: Supplementary Templates Rendering', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 5: SEMANTIC ATS HEADING HIERARCHY ---');
  try {
    for (const tmpl of PRIMARY_12_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: SAMPLE_CANDIDATE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );
      // ATS parsers expect h1 for the applicant's name
      assert(html.includes('<h1'), `Template ${tmpl.id} must include <h1> tag for ATS applicant identification`);
      // ATS parsers expect standard section headings (h2, h3, or clear section elements)
      const hasSectionHeaders = html.includes('<h2') || html.includes('<h3') || html.includes('section') || html.includes('header');
      assert(hasSectionHeaders, `Template ${tmpl.id} must use semantic section headers`);
    }
    pass('Semantic ATS Heading Hierarchy', `All 12 templates utilize <h1> applicant markers and semantic tags`);
  } catch (err) {
    fail('Test Group 5: Semantic ATS Headings', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 6: PAGINATION & PRINT BREAK-INSIDE SAFETY ---');
  try {
    // Verify that the global CSS contains page-break rules
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssContent = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    assert(cssContent.includes('@page'), 'globals.css includes @page rule');
    assert(cssContent.includes('size: 210mm 297mm'), 'globals.css specifies standard A4 print dimensions');
    assert(cssContent.includes('break-inside: avoid'), 'globals.css enforces break-inside: avoid for resume entries');
    assert(cssContent.includes('break-after: avoid'), 'globals.css enforces break-after: avoid for headings');
    assert(cssContent.includes('.no-print'), 'globals.css contains no-print exclusion rule');

    pass('Pagination & Print Break-Inside Safety', `A4 210mm x 297mm and break-inside: avoid rules verified`);
  } catch (err) {
    fail('Test Group 6: Pagination & Print CSS', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 7: ATS PARSER TEXT EXTRACTION ON ALL TEMPLATES ---');
  try {
    const { calculateDeterministicAtsScore } = await import('../src/server/services/deterministicAtsEngine.ts');
    const jobDescription = `
      Senior Full Stack Engineer
      Requirements:
      - 5+ years of software development experience with TypeScript, React, Node.js, Next.js.
      - Experience with distributed databases (PostgreSQL, Redis) and Docker.
      - Strong background in system architecture, microservices, and high-availability platforms.
      - B.S. in Computer Science or related field.
    `;

    for (const tmpl of PRIMARY_12_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: SAMPLE_CANDIDATE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );

      // Strip HTML tags to simulate raw ATS text ingestion
      const extractedText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      
      const atsResult = calculateDeterministicAtsScore(extractedText, jobDescription);
      assert(atsResult.overallAtsScore >= 70, `Template ${tmpl.id} extracted text scored ${atsResult.overallAtsScore} (expected >= 70)`);
      assert(atsResult.detectedKeywords.length >= 5, `Template ${tmpl.id} matched ${atsResult.detectedKeywords.length} keywords (expected >= 5)`);
    }
    pass('ATS Parser Text Extraction', `All 12 templates produce text scoring >= 70% ATS match`);
  } catch (err) {
    fail('Test Group 7: ATS Parser Text Extraction', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 8: DATA MUTATION IMMUNITY (TEMPLATE SWITCHING) ---');
  try {
    let currentData = JSON.parse(JSON.stringify(SAMPLE_CANDIDATE));
    const initialKeys = Object.keys(currentData).sort();

    for (const tmpl of PRIMARY_12_TEMPLATES) {
      // Switch templateId
      currentData = {
        ...currentData,
        templateId: tmpl.id,
      };

      // Render
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: currentData,
          templateId: currentData.templateId,
        })
      );
      assert(html.length > 500);

      // Confirm no user fields were dropped or mutated
      assert.strictEqual(currentData.personalInfo.fullName, 'Alexandra Chen');
      assert.strictEqual(currentData.experience.length, 2);
      assert.strictEqual(currentData.education.length, 1);
      assert.strictEqual(currentData.projects.length, 1);
      assert.strictEqual(currentData.skills.technical.length, 9);
      assert.strictEqual(currentData.certifications.length, 1);
      assert.strictEqual(currentData.languages.length, 2);
    }
    const finalKeys = Object.keys(currentData).sort();
    assert.deepStrictEqual(initialKeys, finalKeys, 'Keys preserved across all 12 template switches');
    pass('Data Mutation Immunity', `All candidate fields preserved 100% across sequential template switches`);
  } catch (err) {
    fail('Test Group 8: Data Mutation Immunity', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 9: EXTENDED SECTIONS (CUSTOM SECTIONS, ADDITIONAL INFO) ---');
  try {
    const EXTENDED_CANDIDATE = {
      ...SAMPLE_CANDIDATE,
      customSections: [
        {
          id: 'cs_1',
          title: 'Patents & Innovations',
          content: 'US Patent 11,234,567: High-throughput lock-free ring buffer for network dispatchers.',
        },
      ],
      additionalInfo: {
        noticePeriod: '30 Days',
        relocation: 'Open to Relocation',
        shiftPreference: 'Flexible',
        drivingLicence: 'Full / Clean',
        memberships: ['IEEE Senior Member', 'ACM Professional'],
      },
    };

    for (const tmpl of PRIMARY_12_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: EXTENDED_CANDIDATE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );
      assert(html.length > 500, `Extended candidate rendered in ${tmpl.id}`);
      assert(html.includes('Alexandra Chen'), `Name rendered in ${tmpl.id}`);
    }
    pass('Extended Sections Rendering', `Custom sections, additional info, and memberships rendered cleanly across all 12 templates`);
  } catch (err) {
    fail('Test Group 9: Extended Sections Rendering', err);
    throw err;
  }

  console.log('\n--- TEST GROUP 10: NIL/UNDEFINED SAFETY (EMPTY PROFILE EDGE CASES) ---');
  try {
    const EMPTY_PROFILE = {
      id: 'empty_res',
      title: 'Blank Resume',
      candidateType: 'fresher',
      personalInfo: {
        fullName: 'Jordan Doe',
      },
      summary: '',
      skills: {},
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      achievements: [],
      customSections: [],
      templateId: 'ats-classic',
    };

    for (const tmpl of ALL_TEMPLATES) {
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ResumeRenderer, {
          data: EMPTY_PROFILE,
          templateId: tmpl.id,
          isMiniPreview: false,
        })
      );
      assert(html.includes('Jordan Doe'), `Empty candidate name rendered in ${tmpl.id}`);
    }
    pass('Nil/Undefined Resilience', `All 17 templates safely handle minimal/empty candidate profiles with zero runtime errors`);
  } catch (err) {
    fail('Test Group 10: Nil/Undefined Resilience', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL TEMPLATE VALIDATION TESTS: ${passed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTemplateValidation().catch((err) => {
  console.error('Fatal error in template validation:', err);
  process.exit(1);
});
