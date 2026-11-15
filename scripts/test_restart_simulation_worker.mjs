import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const { calculateDeterministicAtsScore } = await import(
  '../src/server/services/deterministicAtsEngine.ts'
);

const sampleResumeStandard = `
Jane Doe
Software Engineer
jane.doe@example.com | +1 555-123-4567 | San Francisco, CA | github.com/janedoe | linkedin.com/in/janedoe

PROFESSIONAL SUMMARY
Experienced Full Stack Software Engineer with 5+ years specializing in TypeScript, React, Next.js, and Node.js.
Passionate about distributed microservices, performance optimization, and developer productivity.

WORK EXPERIENCE
Senior Software Engineer | Tech Corp (2022 - Present)
• Architected and built high-throughput microservices using Node.js, TypeScript, and PostgreSQL handling 25M daily requests.
• Optimized frontend rendering performance in Next.js 15 App Router, improving Core Web Vitals LCP by 45%.
• Spearheaded CI/CD automation with GitHub Actions and Docker, reducing release deployment cycle times by 60%.

Software Engineer | Startup Labs (2019 - 2022)
• Built interactive client-facing dashboards using React, Redux, and Tailwind CSS.
• Implemented RESTful APIs and PostgreSQL schema migrations, improving API latency by 35%.

EDUCATION
B.S. in Computer Science | University of California, Berkeley (2015 - 2019)

TECHNICAL SKILLS
Languages & Frameworks: TypeScript, JavaScript, React, Next.js, Node.js, Express, Python
Databases & Cloud: PostgreSQL, Redis, Docker, AWS, Git, CI/CD, REST APIs, GraphQL, Jest

PROJECTS
Cloud Stream Processor | Docker, Node.js, Redis, AWS
• Engineered an event streaming pipeline processing 15,000 messages/sec with 99.99% availability.
• Open sourced on GitHub with 1,200+ stars and comprehensive unit test coverage.
`;

const sampleJobDescriptionMatching = `
Senior Full Stack Engineer
Tech Corp is hiring a Senior Full Stack Engineer.
Requirements:
- 4+ years of professional software engineering experience
- Strong proficiency in TypeScript, React, Next.js, and Node.js
- Production experience with PostgreSQL, Redis, and REST APIs
- Familiarity with containerization using Docker and cloud infrastructure (AWS)
- Experience designing automated CI/CD pipelines
`;

const res = calculateDeterministicAtsScore(
  sampleResumeStandard,
  sampleJobDescriptionMatching,
  'Senior Full Stack Engineer',
  'Tech Corp'
);

console.log(
  JSON.stringify({
    overall: res.overallAtsScore,
    keyword: res.keywordMatchScore,
    formatting: res.formattingScore,
    content: res.contentScore,
    section: res.sectionScore,
  })
);
