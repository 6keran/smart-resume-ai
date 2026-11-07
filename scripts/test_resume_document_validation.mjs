import Module from 'node:module';
import assert from 'node:assert';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  // Keep this API validation suite isolated from both local and remote databases.
  if (id === '@/server/db') {
    return {
      recordResumeUpload: async () => null,
      recordResumeAnalysis: async () => undefined,
      recordJobMatchEvent: async () => undefined,
    };
  }
  if (id === '@/server/auth/visitor') {
    return { getOrCreateVisitorId: async () => '' };
  }
  return origLoad.apply(this, [id, ...args]);
};

async function runValidationTests() {
  console.log('================================================================');
  console.log('=== SMART RESUME AI: RESUME DOCUMENT VALIDATION SUITE ===');
  console.log('================================================================\n');

  const { validateResumeDocument } = await import('../src/server/services/resumeValidator.ts');
  const analyzeRoute = await import('../src/app/api/resume/analyze/route.ts');
  const jobMatchRoute = await import('../src/app/api/job/match/route.ts');
  const tailorRoute = await import('../src/app/api/resume/tailor/route.ts');

  // -------------------------------------------------------------
  // TEST DOCUMENT FIXTURES
  // -------------------------------------------------------------

  const docValidExperienced = `
Sarah Jenkins, Lead Cloud Architect
Email: sarah.jenkins@cloudmail.com | Phone: (415) 555-0199 | Location: San Francisco, CA
LinkedIn: linkedin.com/in/sarah-jenkins-cloud | GitHub: github.com/sjenkins-cloud

PROFESSIONAL SUMMARY
Results-driven Cloud Architect with 8+ years of enterprise experience designing scalable AWS and Kubernetes infrastructures. Proven track record reducing infrastructure expenses by 32% while maintaining 99.99% system uptime across multi-region production clusters.

WORK EXPERIENCE
Principal Cloud Engineer | Apex Global Systems
Jan 2021 - Present | San Francisco, CA
- Architected enterprise cloud infrastructure on AWS utilizing Terraform, EKS, and Istio service mesh across 40+ microservices.
- Spearheaded migration of on-premises monolithic billing system to event-driven serverless architecture, reducing P99 latency by 45%.
- Implemented automated CI/CD pipelines using GitHub Actions and ArgoCD, accelerating release velocity from bi-weekly to multiple daily deployments.

Senior DevOps Engineer | CloudScale Networks
Aug 2017 - Dec 2020 | San Jose, CA
- Engineered automated infrastructure provisioning and observability stack using Prometheus, Grafana, and OpenTelemetry.
- Optimized database query performance and Amazon Aurora PostgreSQL configurations, supporting 1.5M daily active users.
- Mentored 6 junior and mid-level DevOps engineers on infrastructure-as-code and cloud security posture.

EDUCATION
Bachelor of Science in Computer Science | UC Berkeley
Aug 2013 - May 2017 | GPA: 3.8 / 4.0

TECHNICAL SKILLS
Cloud Platforms: AWS (EKS, Lambda, S3, Aurora, CloudFront, IAM), GCP
Containers & Orchestration: Kubernetes, Docker, Helm, Istio
Infrastructure as Code: Terraform, Ansible, CloudFormation
Languages & Databases: Go, Python, Bash, PostgreSQL, Redis
CI/CD & Monitoring: GitHub Actions, ArgoCD, Prometheus, Datadog
`;

  const docValidFresher = `
Rahul Sharma
Email: rahul.sharma@collegemail.edu | Mobile: +91 98765 43210
GitHub: github.com/rahulsharma-dev | LinkedIn: linkedin.com/in/rahul-sharma-2024

CAREER OBJECTIVE
Passionate Computer Science graduate with strong fundamentals in Data Structures, Algorithms, and Full Stack Web Development. Seeking an entry-level Software Engineer position to build reliable, user-centric web applications.

EDUCATION
Bachelor of Technology in Computer Science & Engineering
National Institute of Technology (NIT) | 2020 - 2024
CGPA: 8.7 / 10.0 | Relevant Coursework: Data Structures, Operating Systems, Database Management Systems, Computer Networks

TECHNICAL SKILLS
Programming Languages: Java, Python, C++, TypeScript, JavaScript
Web Technologies: React.js, Next.js, Node.js, Express, HTML5, CSS3, Tailwind CSS
Databases & Tools: PostgreSQL, MongoDB, Git, GitHub, Postman, Docker (Basics)

ACADEMIC PROJECTS
E-Commerce Microservices Platform (React, Node.js, PostgreSQL)
- Developed responsive web application supporting product discovery, shopping cart, and mock payment gateway.
- Designed RESTful API endpoints and relational database schema with indexed queries for sub-100ms response times.
- Implemented JWT-based authentication and role-based access control for customers and administrators.

AI Document Summarizer (Python, Flask, Transformers)
- Built NLP utility that extracts long articles and generates concise 3-sentence extractive summaries.
- Created intuitive user interface and deployed prototype on Vercel and Render.

ACHIEVEMENTS & CERTIFICATIONS
- Solved 400+ problems on LeetCode (Top 15% rating).
- Finalist, Smart India Hackathon 2023.
`;

  const docValidInternship = `
Emily Watson
emily.watson@stanford.edu | (650) 555-0142 | Palo Alto, CA
github.com/emilywatson-cs | linkedin.com/in/emily-watson-cs

EDUCATION
Stanford University | Expected Graduation: June 2026
Candidate for Bachelor of Science in Symbolic Systems (Computer Science concentration)
Current GPA: 3.91 | Dean's Honor Roll (All Quarters)

INTERNSHIP EXPERIENCE
Software Engineering Intern | Stripe (Summer 2024)
- Collaborated with checkout optimization team to build A/B testing components in React and TypeScript.
- Implemented real-time form validation and accessibility improvements (WCAG AA compliant), increasing mobile checkout completion by 2.4%.
- Wrote comprehensive unit and integration tests using Jest and Cypress with 94% code coverage.

KEY PROJECTS
OpenCampus Tutoring Network (Next.js, Supabase, Tailwind CSS)
- Architected peer tutoring marketplace connecting 1,200+ undergraduate students with verified subject mentors.
- Integrated automated calendar scheduling and WebSockets for real-time tutoring chat rooms.

SKILLS
Languages: Python, TypeScript, JavaScript, SQL, C++
Frameworks: React, Next.js, Node.js, Jest
Tools: Git, Figma, Docker, Supabase
`;

  const docValidAcademicCv = `
Dr. Marcus Vance, Ph.D.
Department of Computer Science & Artificial Intelligence
Email: m.vance@mit.edu | Phone: +1 (617) 555-0188
Website: https://marcusvance-research.org

EDUCATION
Ph.D. in Computer Science | Massachusetts Institute of Technology | 2019 - 2024
Dissertation: "Provably Robust Representation Learning in Deep Neural Networks"
Advisor: Prof. Elena Rostova

Master of Science in Computer Science | Carnegie Mellon University | 2017 - 2019
Bachelor of Science in Mathematics and Computer Science | Cornell University | 2013 - 2017
Summa Cum Laude | Phi Beta Kappa

RESEARCH & PROFESSIONAL EXPERIENCE
Postdoctoral Research Fellow | CSAIL, MIT | 2024 - Present
- Leading research on adversarial robustness in multimodal foundation models.
- Supervised 4 graduate research assistants in experimental design and formal verification.

Graduate Research Assistant | MIT | 2019 - 2024
- Formulated geometric regularization bounds for high-dimensional classification problems.
- Published 7 first-author papers at NeurIPS, ICML, and ICLR.

PEER-REVIEWED PUBLICATIONS
1. Vance, M., & Rostova, E. (2024). Geometric Regularization for Certifiable Robustness in Transformers. Advances in Neural Information Processing Systems (NeurIPS 2024).
2. Vance, M., Chen, L., & Rostova, E. (2023). Tight Lower Bounds on Spectral Norm Generalization. International Conference on Machine Learning (ICML 2023).
3. Vance, M. (2022). Representation Geometry in Self-Supervised Vision Models. International Conference on Learning Representations (ICLR 2022).

TEACHING EXPERIENCE
Head Teaching Assistant | 6.867 Machine Learning (MIT, Fall 2022, Fall 2023)
Instructor | Introduction to Deep Learning Theory (MIT IAP 2023)

AWARDS & FELLOWSHIPS
- NSF Graduate Research Fellowship (2019 - 2023)
- MIT Presidential Fellowship (2019)
`;

  const docInvalidInvoice = `
TAX INVOICE
INVOICE NUMBER: INV-2024-9982
INVOICE DATE: October 14, 2024
DUE DATE: November 14, 2024

BILL TO:
Acme Corporation
Attn: Accounts Payable
100 Corporate Blvd, Suite 400
New York, NY 10001
GSTIN / TAX ID: 27AABCT3521R1Z8

SOLD BY:
CloudServices Global LLC
PO Box 4882, Seattle, WA 98101
Payment Terms: Net 30 Days

LINE ITEMS:
1. Enterprise Cloud Subscription (October 2024) | Qty: 1 | Unit Price: $3,200.00 | Total: $3,200.00
2. Dedicated Support Tier (24/7 Priority SLA)  | Qty: 1 | Unit Price: $1,250.00 | Total: $1,250.00
3. Additional Data Transfer Overages (TB)     | Qty: 5 | Unit Price: $50.00   | Total: $250.00

SUBTOTAL: $4,700.00
TAX (8.5%): $399.50
SHIPPING & HANDLING: $0.00
TOTAL AMOUNT DUE: $5,099.50

REMITTANCE INSTRUCTIONS:
Please make all checks payable to CloudServices Global LLC.
Wire Transfer: Bank of America | Routing: 026009593 | Account: 9821839218
`;

  const docInvalidAssignment = `
DEPARTMENT OF COMPUTER SCIENCE
COURSE: CS 3110 - Data Structures and Functional Programming
SEMESTER: Fall 2024
ASSIGNMENT #4: Red-Black Trees & Persistent Data Structures
INSTRUCTOR: Professor David Gries

STUDENT NAME: Christopher Taylor
STUDENT ID: 4892183
SUBMITTED TO: cs3110-grading@university.edu
SUBMISSION DATE: October 18, 2024

QUESTION 1: (25 Marks)
Prove by mathematical induction that a Red-Black tree with n internal nodes has height at most 2 * log2(n + 1).
SOLUTION:
Let h be the height of the tree and bh(x) be the black-height of node x.
Base Case: If the tree is empty (height 0), n = 0, and log2(1) = 0.
Inductive Step: Assume the inductive hypothesis holds for all trees with height < h...

QUESTION 2: (25 Marks)
Implement the left-rotate and right-rotate balance methods in OCaml maintaining invariant (3).
CODE EXERCISE:
let rotate_left (t: 'a rbtree) : 'a rbtree =
  match t with
  | Node (c, a, x, Node(c2, b, y, d)) -> Node (c, Node(c, a, x, b), y, d)
  | _ -> failwith "Invalid rotation state"

TOTAL MARKS: 100
ACADEMIC INTEGRITY PLEDGE:
I hereby certify that this assignment submission is entirely my own original work.
`;

  const docInvalidCertificate = `
CERTIFICATE OF COMPLETION
THIS IS TO CERTIFY THAT

ALEXANDER PIERCE

HAS SUCCESSFULLY COMPLETED THE INTENSIVE 12-WEEK PROFESSIONAL ACCREDITATION PROGRAM IN
FULL STACK CLOUD ARCHITECTURE & ENTERPRISE DEVOPS

AWARDED ON: SEPTEMBER 20, 2024
CERTIFICATE ID: CERT-2024-8849182
VERIFICATION URL: https://accreditation.verify-creds.org/8849182

AUTHORIZED SIGNATORY:
Dr. Katherine Bell, Dean of Global Professional Education
IN WITNESS WHEREOF, THE OFFICIAL SEAL AND SIGNATURES ARE DULY AFFIXED.
`;

  const docInvalidProjectReport = `
SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
PROJECT: Autonomous Delivery Fleet Management System
DOCUMENT VERSION: 2.1.0
DATE: October 2024

TABLE OF CONTENTS
1. Executive Summary for the Project
2. System Scope and Objectives
3. Functional Requirements
4. System Design Document & Architecture Overview
5. Non-Functional Deliverables and Milestones
6. Conclusion and Future Scope
7. Appendix A: User Manual

1. EXECUTIVE SUMMARY FOR THE PROJECT
The purpose of this software requirements specification is to establish the formal architectural and functional boundaries for the urban autonomous delivery platform.

2. FUNCTIONAL REQUIREMENTS
2.1 Vehicle Telemetry Dispatch
The dispatch daemon must query GPS telemetry every 250 milliseconds and broadcast state to the central message bus.
Figure 1.1: System Architecture and Data Ingestion Pipeline.
Table 1.2: Message Queue Throughput Parameters.
`;

  const docInvalidPlainText = `
The Art of Slow-Fermented Sourdough Bread

Baking artisanal sourdough is both a science and a mindful culinary ritual. Unlike commercial breads that rely on isolated baker's yeast, sourdough relies on a wild symbiotic culture of wild yeasts and lactic acid bacteria.

To begin, combine 450 grams of unbleached bread flour with 50 grams of stone-ground whole wheat flour. Add 350 grams of filtered water at 80 degrees Fahrenheit and mix until no dry flour remains. Allow the dough to rest for a 45-minute autolyse phase. This hydration window allows the enzymatic breakdown of starches into fermentable sugars.

Next, gently incorporate 100 grams of active starter along with 10 grams of fine sea salt. Over the next 4 hours of bulk fermentation, perform coil folds every 45 minutes to develop an elastic, gluten-rich crumb structure.
`;

  const docInvalidEmpty = `     \n\n\t   `;

  const docInvalidInvoiceNamedResume = docInvalidInvoice; // Named resume.pdf

  const docValidUnusualLayout = `
ELENA ROSTOVA
Senior Full-Stack Product Builder
elena.rostova@designcraft.dev | (512) 555-0189 | Austin, TX
GitHub: github.com/erostova | Portfolio: https://elenarostova.design

ABOUT
Product-minded engineer bridging modern React UX design with high-scale backend services. 6+ years shipping high-velocity SaaS applications from concept to millions in ARR.

MY TOOLKIT
TypeScript, React, Next.js, Node.js, GraphQL, PostgreSQL, Tailwind, AWS, Docker, Figma

JOURNEY
Staff Software Engineer @ HyperGrowth Labs (2022 - Present)
- Architected collaborative real-time canvas editor using WebSockets and CRDTs, scaling to 85,000 daily concurrent users.
- Led front-end architecture transformation, decreasing initial bundle size by 48% and boosting Core Web Vitals to 98+.

Senior Frontend Developer @ StudioSix (2019 - 2022)
- Built component design system adopted by 22 product squads across web and mobile surfaces.
- Mentored junior engineers, ran weekly engineering reading groups, and instituted rigorous accessibility standards.

STUDIES
B.S. in Computer Science & Digital Media | University of Texas at Austin | Class of 2019
`;

  const docUncertainDraft = `
Kevin Miller
Software enthusiast.
I have done some coding in Python and built a few small web pages using HTML. Looking to learn more and grow in tech.
`;

  // -------------------------------------------------------------
  // RUN TESTS
  // -------------------------------------------------------------

  // Test 1: Valid Experienced Professional
  const res1 = validateResumeDocument(docValidExperienced, { fileName: 'Sarah_Jenkins_Resume.pdf' });
  assert.strictEqual(res1.status, 'valid');
  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res1.reasonCode, 'VALID_RESUME');
  console.log('[PASS] Test 1: Valid experienced professional resume correctly identified as VALID.');

  // Test 2: Valid Fresher Resume
  const res2 = validateResumeDocument(docValidFresher, { fileName: 'Rahul_Sharma_Fresher.docx' });
  assert.strictEqual(res2.status, 'valid');
  assert.strictEqual(res2.isValid, true);
  assert.strictEqual(res2.reasonCode, 'VALID_RESUME');
  console.log('[PASS] Test 2: Valid fresher resume (education, skills, projects, no job history) identified as VALID.');

  // Test 3: Valid Internship Resume
  const res3 = validateResumeDocument(docValidInternship, { fileName: 'Emily_Watson_Internship.pdf' });
  assert.strictEqual(res3.status, 'valid');
  assert.strictEqual(res3.isValid, true);
  assert.strictEqual(res3.reasonCode, 'VALID_RESUME');
  console.log('[PASS] Test 3: Valid internship resume identified as VALID.');

  // Test 4: Valid Academic CV
  const res4 = validateResumeDocument(docValidAcademicCv, { fileName: 'Marcus_Vance_CV.pdf' });
  assert.strictEqual(res4.status, 'valid');
  assert.strictEqual(res4.isValid, true);
  assert.strictEqual(res4.reasonCode, 'VALID_RESUME');
  console.log('[PASS] Test 4: Valid academic CV (publications, teaching, fellowships) identified as VALID.');

  // Test 5: Invoice
  const res5 = validateResumeDocument(docInvalidInvoice, { fileName: 'Invoice_OCT_2024.pdf' });
  assert.strictEqual(res5.status, 'invalid');
  assert.strictEqual(res5.isValid, false);
  assert.strictEqual(res5.reasonCode, 'NON_RESUME_INVOICE');
  console.log('[PASS] Test 5: Invoice document correctly rejected as INVALID (NON_RESUME_INVOICE).');

  // Test 6: College Assignment
  const res6 = validateResumeDocument(docInvalidAssignment, { fileName: 'CS3110_Assignment_4.docx' });
  assert.strictEqual(res6.status, 'invalid');
  assert.strictEqual(res6.isValid, false);
  assert.strictEqual(res6.reasonCode, 'NON_RESUME_ASSIGNMENT');
  console.log('[PASS] Test 6: College assignment correctly rejected as INVALID (NON_RESUME_ASSIGNMENT).');

  // Test 7: Certificate
  const res7 = validateResumeDocument(docInvalidCertificate, { fileName: 'Course_Certificate.pdf' });
  assert.strictEqual(res7.status, 'invalid');
  assert.strictEqual(res7.isValid, false);
  assert.strictEqual(res7.reasonCode, 'NON_RESUME_CERTIFICATE');
  console.log('[PASS] Test 7: Completion certificate correctly rejected as INVALID (NON_RESUME_CERTIFICATE).');

  // Test 8: Project Report / Specification
  const res8 = validateResumeDocument(docInvalidProjectReport, { fileName: 'SRS_Specification.docx' });
  assert.strictEqual(res8.status, 'invalid');
  assert.strictEqual(res8.isValid, false);
  assert.strictEqual(res8.reasonCode, 'NON_RESUME_REPORT');
  console.log('[PASS] Test 8: Project report/spec document correctly rejected as INVALID (NON_RESUME_REPORT).');

  // Test 9: Plain Text Unrelated to Careers (Recipe)
  const res9 = validateResumeDocument(docInvalidPlainText, { fileName: 'Article.txt' });
  assert.strictEqual(res9.status, 'invalid');
  assert.strictEqual(res9.isValid, false);
  assert.strictEqual(res9.reasonCode, 'INSUFFICIENT_SIGNALS');
  console.log('[PASS] Test 9: Unrelated plain-text article rejected as INVALID (INSUFFICIENT_SIGNALS).');

  // Test 10: Empty or Corrupted Document
  const res10 = validateResumeDocument(docInvalidEmpty, { fileName: 'corrupt.pdf' });
  assert.strictEqual(res10.status, 'invalid');
  assert.strictEqual(res10.isValid, false);
  assert.strictEqual(res10.reasonCode, 'EMPTY_OR_CORRUPT');
  console.log('[PASS] Test 10: Empty or unreadable document rejected as INVALID (EMPTY_OR_CORRUPT).');

  // Test 11: Document named "resume.pdf" containing Invoice
  const res11 = validateResumeDocument(docInvalidInvoiceNamedResume, { fileName: 'resume.pdf' });
  assert.strictEqual(res11.status, 'invalid');
  assert.strictEqual(res11.isValid, false);
  assert.strictEqual(res11.reasonCode, 'NON_RESUME_INVOICE');
  console.log('[PASS] Test 11: Fake "resume.pdf" containing invoice content strictly rejected as INVALID.');

  // Test 12: Valid Resume with Unusual / Non-Standard Layout
  const res12 = validateResumeDocument(docValidUnusualLayout, { fileName: 'Elena_Portfolio_CV.pdf' });
  assert.strictEqual(res12.status, 'valid');
  assert.strictEqual(res12.isValid, true);
  assert.strictEqual(res12.reasonCode, 'VALID_RESUME');
  console.log('[PASS] Test 12: Valid resume with non-standard creative layout correctly identified as VALID.');

  // Test 13: Uncertain / Incomplete Document
  const res13 = validateResumeDocument(docUncertainDraft, { fileName: 'draft_notes.txt' });
  assert.strictEqual(res13.status, 'uncertain');
  assert.strictEqual(res13.isValid, false);
  assert.strictEqual(res13.reasonCode, 'UNCERTAIN_STRUCTURE');
  console.log('[PASS] Test 13: Brief incomplete draft correctly classified as UNCERTAIN (UNCERTAIN_STRUCTURE).');

  // Test 13b: Uncertain Document with User Override Option
  const res13Override = validateResumeDocument(docUncertainDraft, {
    fileName: 'draft_notes.txt',
    allowUncertainOverride: true,
  });
  assert.strictEqual(res13Override.status, 'valid');
  assert.strictEqual(res13Override.isValid, true);
  console.log('[PASS] Test 13b: Uncertain document successfully allowed to proceed when allowUncertainOverride is TRUE.');

  // -------------------------------------------------------------
  // API ROUTE DIRECT REQUEST TESTS (ZERO ATS SCORE ON INVALID)
  // -------------------------------------------------------------

  console.log('\n--- TESTING DIRECT API ENFORCEMENT & SCORE SUPPRESSION ---');

  // Test 14: Direct call to /api/resume/analyze with Invoice
  const mockInvoiceReq = new Request('http://localhost:3000/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: docInvalidInvoice,
      fileName: 'resume.pdf',
    }),
  });

  const apiRes = await analyzeRoute.POST(mockInvoiceReq);
  const apiJson = await apiRes.json();

  assert.strictEqual(apiRes.status, 422, 'Invoice must return HTTP 422 Unprocessable Entity');
  assert.strictEqual(apiJson.validation?.status, 'invalid');
  assert.strictEqual(apiJson.validation?.isValid, false);
  assert.strictEqual(apiJson.overallAtsScore, undefined, 'Invalid document must NEVER receive an ATS score');
  console.log('[PASS] Test 14: Direct POST /api/resume/analyze with invoice returned HTTP 422 with 0 ATS score generated.');

  // Test 15: Direct call to /api/job/match with Invoice
  const mockMatchReq = new Request('http://localhost:3000/api/job/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: docInvalidInvoice,
      jobTitle: 'Software Engineer',
      jobDescription: 'Build and maintain software applications with a collaborative engineering team.',
    }),
  });

  const matchRes = await jobMatchRoute.POST(mockMatchReq);
  const matchJson = await matchRes.json();

  assert.strictEqual(matchRes.status, 422, 'Job match with invoice must return HTTP 422');
  assert.strictEqual(matchJson.validation?.status, 'invalid');
  console.log('[PASS] Test 15: Direct POST /api/job/match with invoice blocked with HTTP 422 (cannot bypass validation).');

  // Test 16: Direct call to /api/resume/tailor with Invoice
  const mockTailorReq = new Request('http://localhost:3000/api/resume/tailor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: docInvalidInvoice,
      jobDescription: 'Seeking Senior Full Stack Developer with React and Node.js skills.',
    }),
  });

  const tailorRes = await tailorRoute.POST(mockTailorReq);
  const tailorJson = await tailorRes.json();

  assert.strictEqual(tailorRes.status, 422, 'Resume tailoring with invoice must return HTTP 422');
  assert.strictEqual(tailorJson.validation?.status, 'invalid');
  console.log('[PASS] Test 16: Direct POST /api/resume/tailor with invoice blocked with HTTP 422 (cannot bypass validation).');

  // Test 17: Direct call to /api/resume/analyze with Valid Resume
  const mockValidReq = new Request('http://localhost:3000/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText: docValidExperienced,
      fileName: 'Sarah_Jenkins_Resume.pdf',
    }),
  });

  const validApiRes = await analyzeRoute.POST(mockValidReq);
  const validApiJson = await validApiRes.json();

  assert.strictEqual(validApiRes.status, 200, 'Valid resume must return HTTP 200');
  assert.ok(typeof validApiJson.overallAtsScore === 'number' && validApiJson.overallAtsScore > 0, 'Valid resume must receive an ATS score');
  console.log(`[PASS] Test 17: Valid resume analyzed normally with ATS Score: ${validApiJson.overallAtsScore}%.`);

  console.log('\n================================================================');
  console.log('=== ALL 17 / 17 DOCUMENT VALIDATION TESTS PASSED (EXIT CODE 0) ===');
  console.log('================================================================');
}

runValidationTests().catch((err) => {
  console.error('\n[FATAL ERROR IN VALIDATION SUITE]:', err);
  process.exit(1);
});
