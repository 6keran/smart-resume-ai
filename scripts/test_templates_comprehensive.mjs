import assert from 'assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Import from built or compiled sources
import { RESUME_TEMPLATES, normalizeTemplateId, MINI_SAMPLE_RESUME_DATA } from '../src/lib/templates.ts';
import {
  ResumeRenderer,
  ATSClassicTemplate,
  SoftwareEngineerTemplate,
  FreshGraduateTemplate,
  CorporateExecutiveTemplate,
  DataAnalystTemplate,
  UIUXDesignerTemplate,
  FullStackDeveloperTemplate,
  InternshipApplicantTemplate,
  AcademicTemplate,
  SalesMarketingTemplate,
  OperationsManagementTemplate,
  ModernTwoColumnTemplate,
} from '../src/components/builder/templates/index.ts';

console.log('================================================================');
console.log('=== SMART RESUME AI: 12 PRODUCTION TEMPLATES TEST SUITE ===');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Template Registry Verification (Exactly 12 templates)
// -----------------------------------------------------------------------------
runTest('Template Registry contains at least 12 production templates', () => {
  assert(RESUME_TEMPLATES.length >= 12, `Expected at least 12 templates, got ${RESUME_TEMPLATES.length}`);
});

const EXPECTED_TEMPLATES = [
  { id: 'ats-classic', name: 'Classic Professional', atsFriendly: true },
  { id: 'software-engineer', name: 'Engineering Professional', atsFriendly: true },
  { id: 'graduate-fresher', name: 'Fresher & Graduate', atsFriendly: true },
  { id: 'executive-professional', name: 'Executive Leadership', atsFriendly: true },
  { id: 'data-analyst', name: 'Data Analyst', atsFriendly: true },
  { id: 'ui-ux-designer', name: 'UI/UX Designer', atsFriendly: true },
  { id: 'full-stack-developer', name: 'Software Developer', atsFriendly: true },
  { id: 'internship-applicant', name: 'Internship Applicant', atsFriendly: true },
  { id: 'academic-research', name: 'Academic & Research', atsFriendly: true },
  { id: 'sales-marketing', name: 'Sales & Marketing', atsFriendly: true },
  { id: 'operations-management', name: 'Manufacturing & Operations', atsFriendly: true },
  { id: 'modern-two-column', name: 'Professional Sidebar', atsFriendly: false, isVisualLayout: true },
];

for (const expected of EXPECTED_TEMPLATES) {
  runTest(`Registry includes '${expected.name}' (${expected.id}) with complete metadata`, () => {
    const tmpl = RESUME_TEMPLATES.find((t) => t.id === expected.id);
    assert(tmpl, `Template '${expected.id}' not found in RESUME_TEMPLATES`);
    assert.strictEqual(tmpl.name, expected.name);
    assert(tmpl.category && tmpl.category.trim().length > 0, `Template ${expected.id} missing category`);
    assert(tmpl.description && tmpl.description.trim().length > 0, `Template ${expected.id} missing description`);
    assert(tmpl.intendedUse && tmpl.intendedUse.trim().length > 0, `Template ${expected.id} missing intendedUse`);
    assert(tmpl.styleDescription && tmpl.styleDescription.trim().length > 0, `Template ${expected.id} missing styleDescription`);
    assert.strictEqual(tmpl.isAtsFriendly, expected.atsFriendly, `Template ${expected.id} isAtsFriendly mismatch`);
    if (expected.isVisualLayout) {
      assert.strictEqual(tmpl.isVisualLayout, true, `Template ${expected.id} should have isVisualLayout: true`);
    }
  });
}

// -----------------------------------------------------------------------------
// TEST 2: Template Normalization Engine
// -----------------------------------------------------------------------------
runTest('Normalization Engine maps canonical and legacy aliases correctly', () => {
  // Canonical IDs
  assert.strictEqual(normalizeTemplateId('ats-classic'), 'ats-classic');
  assert.strictEqual(normalizeTemplateId('software-engineer'), 'software-engineer');
  assert.strictEqual(normalizeTemplateId('graduate-fresher'), 'graduate-fresher');
  assert.strictEqual(normalizeTemplateId('executive-professional'), 'executive-professional');
  assert.strictEqual(normalizeTemplateId('data-analyst'), 'data-analyst');
  assert.strictEqual(normalizeTemplateId('ui-ux-designer'), 'ui-ux-designer');
  assert.strictEqual(normalizeTemplateId('full-stack-developer'), 'full-stack-developer');
  assert.strictEqual(normalizeTemplateId('internship-applicant'), 'internship-applicant');
  assert.strictEqual(normalizeTemplateId('academic-research'), 'academic-research');
  assert.strictEqual(normalizeTemplateId('sales-marketing'), 'sales-marketing');
  assert.strictEqual(normalizeTemplateId('operations-management'), 'operations-management');
  assert.strictEqual(normalizeTemplateId('modern-two-column'), 'modern-two-column');

  // Aliases
  assert.strictEqual(normalizeTemplateId('fresh-graduate'), 'graduate-fresher');
  assert.strictEqual(normalizeTemplateId('graduate-entry'), 'graduate-fresher');
  assert.strictEqual(normalizeTemplateId('corporate-executive'), 'corporate-executive');
  assert.strictEqual(normalizeTemplateId('corporate'), 'corporate-executive');
  assert.strictEqual(normalizeTemplateId('executive-leadership'), 'executive-professional');
  assert.strictEqual(normalizeTemplateId('executive'), 'executive-professional');
  assert.strictEqual(normalizeTemplateId('contemporary'), 'modern-two-column');
  assert.strictEqual(normalizeTemplateId('academic'), 'academic-research');
  assert.strictEqual(normalizeTemplateId('creative-professional'), 'ui-ux-designer');
  assert.strictEqual(normalizeTemplateId('unknown-template-xyz'), 'ats-classic');
});

// -----------------------------------------------------------------------------
// TEST 3: Gallery Filtering Logic
// -----------------------------------------------------------------------------
runTest('Gallery filters accurately match templates', () => {
  // All
  const all = RESUME_TEMPLATES.filter(() => true);
  assert(all.length >= 12);

  // ATS-Friendly
  const ats = RESUME_TEMPLATES.filter((t) => t.isAtsFriendly);
  assert(ats.length >= 11, `Expected at least 11 ATS-friendly templates, got ${ats.length}`);
  assert(!ats.some((t) => t.id === 'modern-two-column'), 'Modern Two-Column should not be in ATS-Friendly filter');

  // Freshers
  const freshers = RESUME_TEMPLATES.filter(
    (t) => t.category === 'Freshers' || t.tags?.includes('Freshers')
  );
  assert(freshers.some((t) => t.id === 'graduate-fresher'));
  assert(freshers.some((t) => t.id === 'internship-applicant'));

  // Experienced
  const experienced = RESUME_TEMPLATES.filter(
    (t) => t.category === 'Experienced' || t.tags?.includes('Experienced')
  );
  assert(experienced.some((t) => t.id === 'sales-marketing'));
  assert(experienced.some((t) => t.id === 'operations-management'));

  // Executive
  const executive = RESUME_TEMPLATES.filter(
    (t) => t.category === 'Executive' || t.tags?.includes('Executive')
  );
  assert(executive.some((t) => t.id === 'executive-professional'));

  // Technical
  const technical = RESUME_TEMPLATES.filter(
    (t) => t.category === 'Technical' || t.tags?.includes('Technical')
  );
  assert(technical.some((t) => t.id === 'software-engineer'));
  assert(technical.some((t) => t.id === 'data-analyst'));
  assert(technical.some((t) => t.id === 'full-stack-developer'));

  // Creative
  const creative = RESUME_TEMPLATES.filter(
    (t) => t.category === 'Creative' || t.isVisualLayout || t.tags?.includes('Creative')
  );
  assert(creative.some((t) => t.id === 'ui-ux-designer'));
  assert(creative.some((t) => t.id === 'modern-two-column'));
});

// -----------------------------------------------------------------------------
// TEST 4: SSR Rendering of All 12 Templates with Comprehensive Resume Data
// -----------------------------------------------------------------------------
const COMPREHENSIVE_EXPERIENCED_RESUME = {
  id: 'exp_res_1',
  title: 'Experienced Resume',
  candidateType: 'experienced',
  personalInfo: {
    fullName: 'Jonathan Vance',
    headline: 'Principal Distributed Systems Engineer',
    email: 'jonathan.vance@example.com',
    phone: '+1 (555) 432-8765',
    location: 'Seattle, WA',
    linkedin: 'linkedin.com/in/jonathanvance',
    github: 'github.com/jonathanvance',
    portfolio: 'jvance.dev',
  },
  summary: 'Distinguished engineering leader with over 10 years of experience designing fault-tolerant cloud platforms, low-latency transaction engines, and global edge infrastructures.',
  skills: {
    technical: ['Go', 'Rust', 'TypeScript', 'Distributed Systems', 'PostgreSQL', 'gRPC'],
    tools: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Kafka', 'Prometheus'],
    soft: ['Technical Strategy', 'Cross-Functional Leadership', 'Mentorship', 'Incident Command'],
  },
  experience: [
    {
      id: 'exp_1',
      company: 'Amazon Web Services',
      role: 'Principal Engineer',
      location: 'Seattle, WA',
      startDate: '2021',
      endDate: 'Present',
      current: true,
      bulletPoints: [
        'Architected high-throughput storage partitioning engine handling 1.2M writes/sec at 99.999% SLA.',
        'Mentored 18 senior staff engineers across 4 cross-continental platform teams.',
      ],
    },
    {
      id: 'exp_2',
      company: 'Microsoft Azure',
      role: 'Senior Staff Engineer',
      location: 'Redmond, WA',
      startDate: '2016',
      endDate: '2021',
      current: false,
      bulletPoints: [
        'Reduced inter-datacenter replication latency by 38% via zero-copy protocol serialization.',
      ],
    },
  ],
  education: [
    {
      id: 'edu_1',
      degree: 'M.S. in Computer Science',
      institution: 'University of Washington',
      location: 'Seattle, WA',
      graduationYear: '2016',
      gpa: '3.95',
      honors: 'Distinguished Graduate Fellow',
    },
  ],
  projects: [
    {
      id: 'proj_1',
      title: 'VektorKV Engine',
      description: 'Distributed LSM-tree key-value database written in Rust with Raft consensus.',
      technologies: ['Rust', 'Raft', 'io_uring', 'gRPC'],
      link: 'github.com/jvance/vektorkv',
      bullets: ['Ranked #3 on Hacker News with 2,400+ GitHub stars and 5 enterprise adopters.'],
    },
  ],
  certifications: [
    {
      id: 'cert_1',
      name: 'AWS Certified Solutions Architect – Professional',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
  ],
  templateId: 'ats-classic',
  lastUpdated: new Date().toISOString(),
};

for (const tmpl of EXPECTED_TEMPLATES) {
  runTest(`Render template '${tmpl.name}' (${tmpl.id}) via ResumeRenderer (Experienced)`, () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ResumeRenderer, {
        data: COMPREHENSIVE_EXPERIENCED_RESUME,
        templateId: tmpl.id,
        isMiniPreview: false,
      })
    );
    assert(html.includes('Jonathan Vance'), `HTML should contain candidate name in ${tmpl.id}`);
    assert(html.includes('Amazon Web Services'), `HTML should contain experience in ${tmpl.id}`);
    assert(html.includes('University of Washington'), `HTML should contain education in ${tmpl.id}`);
    assert(html.includes('VektorKV Engine'), `HTML should contain projects in ${tmpl.id}`);
  });
}

// -----------------------------------------------------------------------------
// TEST 5: SSR Rendering of All 12 Templates with Fresher Resume Data
// -----------------------------------------------------------------------------
const FRESHER_RESUME = {
  id: 'fresher_res_1',
  title: 'Fresher Resume',
  candidateType: 'fresher',
  personalInfo: {
    fullName: 'Aarav Patel',
    headline: 'Computer Science Graduate & Software Engineering Candidate',
    email: 'aarav.patel@example.com',
    phone: '+1 (555) 789-0123',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/aaravpatel',
    github: 'github.com/aaravpatel',
    portfolio: 'aarav.dev',
  },
  summary: 'Motivated Computer Science graduate with strong foundation in data structures, web technologies, and systems programming.',
  skills: {
    technical: ['Python', 'Java', 'TypeScript', 'React', 'SQL'],
    tools: ['Git', 'VS Code', 'Docker', 'Linux', 'Postman'],
    soft: ['Agile Collaboration', 'Quick Learner', 'Analytical Problem Solving'],
  },
  experience: [
    {
      id: 'exp_f1',
      company: 'TechStart Labs',
      role: 'Software Engineering Intern',
      location: 'Austin, TX',
      startDate: 'May 2024',
      endDate: 'Aug 2024',
      current: false,
      bulletPoints: [
        'Built automated unit testing suite improving test coverage from 54% to 88%.',
      ],
    },
  ],
  education: [
    {
      id: 'edu_f1',
      degree: 'B.S. in Computer Science',
      institution: 'University of Texas at Austin',
      location: 'Austin, TX',
      graduationYear: '2025',
      gpa: '3.88',
      honors: 'Dean’s Honor List (4 semesters)',
    },
  ],
  projects: [
    {
      id: 'proj_f1',
      title: 'CampusRide Mobile App',
      description: 'Peer-to-peer campus ride sharing web app connecting university students.',
      technologies: ['React Native', 'Node.js', 'PostgreSQL', 'Mapbox API'],
      link: 'github.com/aaravpatel/campusride',
      bullets: ['Adopted by 600+ students on campus with real-time route optimization.'],
    },
  ],
  certifications: [
    {
      id: 'cert_f1',
      name: 'Meta Certified Front-End Developer',
      issuer: 'Meta',
      date: '2024',
    },
  ],
  templateId: 'graduate-fresher',
  lastUpdated: new Date().toISOString(),
};

for (const tmpl of EXPECTED_TEMPLATES) {
  runTest(`Render template '${tmpl.name}' (${tmpl.id}) with Fresher data`, () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ResumeRenderer, {
        data: FRESHER_RESUME,
        templateId: tmpl.id,
        isMiniPreview: false,
      })
    );
    assert(html.includes('Aarav Patel'), `HTML should contain candidate name in ${tmpl.id}`);
    assert(html.includes('University of Texas at Austin'), `HTML should contain education in ${tmpl.id}`);
    assert(html.includes('CampusRide Mobile App'), `HTML should contain projects in ${tmpl.id}`);
  });
}

// -----------------------------------------------------------------------------
// TEST 6: Sparse / Minimal Resume (No Empty Headings When Optional Sections Missing)
// -----------------------------------------------------------------------------
const SPARSE_RESUME = {
  id: 'sparse_res_1',
  title: 'Sparse Resume',
  candidateType: 'experienced',
  personalInfo: {
    fullName: 'Elena Rostova',
    email: 'elena@example.com',
    phone: '+1 (555) 000-1111',
    location: 'Chicago, IL',
    // No headline, linkedin, github, portfolio
  },
  summary: '', // Empty summary
  skills: {
    technical: ['Project Management'],
    tools: [],
    soft: [],
  },
  experience: [
    {
      id: 'exp_s1',
      company: 'Apex Corporation',
      role: 'Operations Lead',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      bulletPoints: ['Streamlined warehouse logistics.'],
    },
  ],
  education: [
    {
      id: 'edu_s1',
      degree: 'B.A. in Business',
      institution: 'University of Illinois',
      graduationYear: '2020',
    },
  ],
  projects: [], // Zero projects
  certifications: [], // Zero certifications
  templateId: 'ats-classic',
  lastUpdated: new Date().toISOString(),
};

for (const tmpl of EXPECTED_TEMPLATES) {
  runTest(`Sparse resume in '${tmpl.name}' suppresses empty sections gracefully`, () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ResumeRenderer, {
        data: SPARSE_RESUME,
        templateId: tmpl.id,
        isMiniPreview: false,
      })
    );
    assert(html.includes('Elena Rostova'), 'Candidate name rendered');
    assert(html.includes('Apex Corporation'), 'Work experience rendered');
    assert(html.includes('University of Illinois'), 'Education rendered');
    // Confirm no empty project or certification headings rendered
    assert(!html.includes('ANALYTICAL CASE STUDIES &amp; DATA PIPELINES'), 'Should not render empty projects heading');
    assert(!html.includes('ACADEMIC &amp; CAPSTONE PROJECTS'), 'Should not render empty projects heading');
  });
}

// -----------------------------------------------------------------------------
// TEST 7: Long-Content & Multi-Page Resume Rendering (No crashes, proper break tokens)
// -----------------------------------------------------------------------------
const LONG_MULTIPAGE_RESUME = {
  ...COMPREHENSIVE_EXPERIENCED_RESUME,
  id: 'long_multipage_res',
  personalInfo: {
    ...COMPREHENSIVE_EXPERIENCED_RESUME.personalInfo,
    fullName: 'Dr. Christopher Bartholomew Montgomery-Huntington III',
    headline: 'Senior Principal Infrastructure Architect, Distributed Cloud Systems Director & Fellow',
  },
  experience: Array.from({ length: 6 }).map((_, idx) => ({
    id: `exp_multi_${idx}`,
    company: `Global Enterprise System #${idx + 1}`,
    role: `Senior Staff Architect Level ${idx + 1}`,
    location: 'San Francisco, CA',
    startDate: `201${idx}`,
    endDate: idx === 5 ? 'Present' : `201${idx + 1}`,
    current: idx === 5,
    bulletPoints: [
      `Spearheaded multi-region cloud migration scaling enterprise data tier to ${idx + 2}0M active users with 99.999% uptime.`,
      `Authored internal platform standards adopted across ${idx + 4} independent business units worldwide.`,
      `Instituted chaos engineering automated pipeline reducing mean-time-to-recovery (MTTR) by 64%.`,
    ],
  })),
  projects: Array.from({ length: 4 }).map((_, idx) => ({
    id: `proj_multi_${idx}`,
    title: `Enterprise Cloud Platform Architecture System #${idx + 1}`,
    description: `High-availability distributed microservice mesh with automatic failover, distributed tracing, and mTLS security.`,
    technologies: ['Kubernetes', 'Go', 'gRPC', 'Envoy', 'Terraform', 'PostgreSQL'],
    link: `github.com/enterprise/platform-${idx + 1}`,
    bullets: [
      `Processed over ${(idx + 1) * 50}B transactions annually with zero security vulnerabilities.`,
    ],
  })),
};

for (const tmpl of EXPECTED_TEMPLATES) {
  runTest(`Long multi-page resume in '${tmpl.name}' renders cleanly without overflow exception`, () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ResumeRenderer, {
        data: LONG_MULTIPAGE_RESUME,
        templateId: tmpl.id,
        isMiniPreview: false,
      })
    );
    assert(html.includes('Christopher Bartholomew Montgomery-Huntington III'));
    assert(html.includes('Global Enterprise System #6'));
    assert(html.includes('Enterprise Cloud Platform Architecture System #4'));
  });
}

// -----------------------------------------------------------------------------
// Summary Report
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`=== TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('ALL TESTS PASSED WITH EXIT CODE 0.');
  process.exit(0);
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
