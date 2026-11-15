import { ResumeTemplateId, ResumeTemplateInfo, ResumeData } from '@/types/resume';

export const RESUME_TEMPLATES: ResumeTemplateInfo[] = [
  // 12 Distinct Professional Resume Templates
  {
    id: 'ats-classic',
    name: 'Classic Professional',
    category: 'ATS-Friendly',
    intendedUse: 'Corporate, Finance, Law, Operations, and high-volume applicant tracking systems',
    description: 'Traditional single-column layout with centered contact header, classic serif typography, and clean hairline dividers. Maximizes ATS parseability.',
    styleDescription: 'Georgia serif typography, centered contact bar, traditional section rules',
    isAtsFriendly: true,
    atsScoreRating: 99,
    isPopular: true,
    tags: ['Classic', 'ATS-Friendly', 'Single-Column', 'Traditional', 'Finance & Law'],
  },
  {
    id: 'corporate-executive',
    name: 'Modern Corporate',
    category: 'Corporate',
    intendedUse: 'Mid-to-Senior Corporate Managers, Consultants, Business Analysts, and MNC roles',
    description: 'Refined corporate layout with dark slate header styling, blue designation accents, structured milestone dividers, and crisp contact details.',
    styleDescription: 'Corporate charcoal header, blue accents, structured milestone dividers',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: true,
    tags: ['Corporate', 'Modern', 'Management', 'Consulting', 'Structured'],
  },
  {
    id: 'executive-professional',
    name: 'Executive Leadership',
    category: 'Executive',
    intendedUse: 'Senior Directors, VPs, Department Heads, General Managers, and C-Suite Leaders',
    description: 'Authoritative executive presentation featuring a stylized executive summary narrative box, 3-column strategic competencies matrix, and career milestones.',
    styleDescription: 'Executive narrative quote box, strategic competencies grid, milestone progression',
    isAtsFriendly: true,
    atsScoreRating: 97,
    isPopular: true,
    tags: ['Executive', 'Leadership', 'Strategic Competencies', 'Directors & VPs'],
  },
  {
    id: 'software-engineer',
    name: 'Engineering Professional',
    category: 'Technical',
    intendedUse: 'Mechanical, Electrical, Civil, Production, and Core Engineering specialists',
    description: 'Tailored for core engineering disciplines. Highlighting tools, machinery, simulation CAD software, compliance standards, and practical outcomes.',
    styleDescription: 'Engineering capabilities matrix, tools & machinery highlights, project outcomes',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: true,
    tags: ['Engineering', 'Mechanical/Electrical/Civil', 'CAD & Machinery', 'B.Tech & Diploma'],
  },
  {
    id: 'operations-management',
    name: 'Manufacturing & Operations',
    category: 'Experienced',
    intendedUse: 'Manufacturing, Plant Operations, Quality Control, Shift Supervisors, and EHS Leads',
    description: 'Industrial shop-floor to plant management layout. Highlights production machinery, shift availability, Kaizen/Six Sigma systems, and plant KPIs.',
    styleDescription: 'Industrial header, shift badges, machinery capabilities, production KPIs',
    isAtsFriendly: true,
    atsScoreRating: 97,
    isPopular: true,
    tags: ['Manufacturing', 'Plant Operations', 'Quality Control', 'Shift Supervisor'],
  },
  {
    id: 'full-stack-developer',
    name: 'Software Developer',
    category: 'Technical',
    intendedUse: 'Software Engineers, Full Stack Developers, DevOps, and IT Professionals',
    description: 'Modern developer layout with monospace accents, high-visibility categorized tech stack badges, GitHub/portfolio links, and project architecture cards.',
    styleDescription: 'Monospace code accents, categorized tech pills, live demo & repo links',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: true,
    tags: ['Software', 'Full Stack', 'Cloud & DevOps', 'GitHub & Repos'],
  },
  {
    id: 'graduate-fresher',
    name: 'Fresher & Graduate',
    category: 'Freshers',
    intendedUse: 'University Students, Recent College Graduates, Diploma Holders, and Entry-Level Roles',
    description: 'Entry-level structure placing education and CGPA prominently at the top, followed by academic capstone projects, internships, and campus achievements.',
    styleDescription: 'Education & CGPA priority, academic projects, clean single-column',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: true,
    tags: ['Freshers', 'Graduates', 'Campus Projects', 'Entry-Level'],
  },
  {
    id: 'minimalist-ats',
    name: 'Minimalist ATS',
    category: 'ATS-Friendly',
    intendedUse: 'Candidates seeking maximum parseability across all ATS software without graphical elements',
    description: 'Strictly distraction-free monochrome single-column design. Uses standard typography, simple horizontal underlines, and linear bullet points.',
    styleDescription: 'Ultra-clean monochrome, zero graphics/icons, standard headings, pure text',
    isAtsFriendly: true,
    atsScoreRating: 100,
    isPopular: true,
    tags: ['Minimalist ATS', 'Zero Distraction', 'Highly Parseable', 'Clean Monochrome'],
  },
  {
    id: 'minimalist',
    name: 'Modern Minimalist',
    category: 'Minimal',
    intendedUse: 'Designers, Product Managers, and professionals seeking a clean, whitespace-balanced aesthetic',
    description: 'Swiss-inspired minimalist layout with generous whitespace, elegant typographic weights, subtle slate dividers, and balanced page composition.',
    styleDescription: 'Swiss typography, generous whitespace, understated elegance',
    isAtsFriendly: true,
    atsScoreRating: 99,
    isPopular: true,
    tags: ['Modern Minimalist', 'Swiss Design', 'Whitespace', 'Universal'],
  },
  {
    id: 'academic-research',
    name: 'Academic & Research',
    category: 'Academic',
    intendedUse: 'Professors, Postdocs, Research Scholars, PhD Candidates, and Fellowship Applicants',
    description: 'Formal scholarly curriculum vitae format highlighting degrees with dissertation advisors, research projects, peer-reviewed publications, and teaching appointments.',
    styleDescription: 'Formal Georgia serif, numbered citations, thesis advisor focus',
    isAtsFriendly: true,
    atsScoreRating: 96,
    isPopular: false,
    tags: ['Academic', 'Research', 'Scholarly CV', 'Publications & Grants'],
  },
  {
    id: 'modern-two-column',
    name: 'Professional Sidebar',
    category: 'Creative',
    intendedUse: 'Designers, Product Leaders, Marketers, and candidates wanting a visual dual-column resume',
    description: 'Two-column layout featuring a dedicated 32% cool-grey sidebar for monogram badge, contact info, skill pills, and credentials, paired with a 68% career narrative.',
    styleDescription: '32% sidebar, monogram initials badge, skill pills, dual-column visual layout',
    isAtsFriendly: false,
    atsScoreRating: 92,
    isPopular: true,
    isVisualLayout: true,
    tags: ['Professional Sidebar', 'Dual-Column', 'Visual Layout', 'Portfolio'],
  },
  {
    id: 'compact-one-page',
    name: 'Compact One-Page',
    category: 'Minimal',
    intendedUse: 'Candidates who want to fit extensive experience and skills cleanly onto a single high-impact page',
    description: 'Highly dense, space-efficient layout with an inline header, compact section margins, and multi-column skill and education rows.',
    styleDescription: 'High-density inline header, tight vertical rhythm, single-page optimization',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: true,
    tags: ['Compact', 'One-Page', 'Dense Layout', 'Space-Efficient'],
  },

  // Supplementary & Specialized Roles
  {
    id: 'experienced-professional',
    name: 'Experienced Professional',
    category: 'Experienced',
    intendedUse: 'Professionals with 3+ years of progressive industrial or software tenure',
    description: 'Chronological work history emphasis highlighting designations, departments, responsibilities, tools used, and measurable results.',
    styleDescription: 'Work history priority, responsibilities bullets, career progression',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: false,
    tags: ['Experienced', 'Chronological', 'Career History'],
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    category: 'Technical',
    intendedUse: 'Data Analysts, BI Engineers, Data Scientists, and Analytics Consultants',
    description: 'Analytical layout highlighting SQL, Python, BI tooling, business intelligence pipelines, and quantified business impact metrics.',
    styleDescription: 'Analytical tools matrix, KPI metrics emphasis, dataset projects',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: false,
    tags: ['Technical', 'Data & AI', 'KPIs', 'BI Pipelines'],
  },
  {
    id: 'ui-ux-designer',
    name: 'UI/UX Designer',
    category: 'Creative',
    intendedUse: 'Product Designers, UI/UX Designers, Design System Leads, and UX Researchers',
    description: 'Typographically refined layout featuring design systems, UX research methods, Figma/portfolio links, and case-study project cards.',
    styleDescription: 'Geometric typography, portfolio showcase, design & research skills',
    isAtsFriendly: true,
    atsScoreRating: 96,
    isPopular: false,
    tags: ['Creative', 'Design Systems', 'Figma', 'Case Studies'],
  },
  {
    id: 'internship-applicant',
    name: 'Internship Applicant',
    category: 'Freshers',
    intendedUse: 'University Students, Bootcamp Graduates, and Early Applicants seeking internships',
    description: 'Approachable single-column format emphasizing University standing, expected graduation, coursework, hackathons, and student leadership.',
    styleDescription: 'Balanced whitespace, coursework focus, student leadership highlights',
    isAtsFriendly: true,
    atsScoreRating: 98,
    isPopular: false,
    tags: ['Freshers', 'Internship', 'Coursework'],
  },
  {
    id: 'sales-marketing',
    name: 'Sales & Marketing',
    category: 'Experienced',
    intendedUse: 'Account Executives, Sales Leaders, Growth Marketers, and Business Developers',
    description: 'High-impact commercial layout emphasizing quota attainment, revenue generation, client acquisition, and growth campaign metrics.',
    styleDescription: 'Commercial capabilities, quota performance callouts, revenue KPIs',
    isAtsFriendly: true,
    atsScoreRating: 97,
    isPopular: false,
    tags: ['Experienced', 'Sales & Growth', 'Quota Attainment'],
  },
];

export function normalizeTemplateId(id: string): ResumeTemplateId {
  switch (id) {
    // 1. Classic Professional
    case 'classic-professional':
    case 'ats-classic':
    case 'ats-professional':
    case 'modern-ats':
      return 'ats-classic';

    // 2. Modern Corporate
    case 'modern-corporate':
    case 'corporate-executive':
    case 'corporate':
      return 'corporate-executive';

    // 3. Executive Leadership
    case 'executive-leadership':
    case 'executive-professional':
    case 'executive':
      return 'executive-professional';

    // 4. Engineering Professional
    case 'engineering-professional':
    case 'software-engineer':
    case 'engineering':
    case 'engineering-manufacturing':
    case 'tech-professional':
      return 'software-engineer';

    // 5. Manufacturing & Operations
    case 'manufacturing-operations':
    case 'operations-management':
      return 'operations-management';

    // 6. Software Developer
    case 'software-developer':
    case 'full-stack-developer':
      return 'full-stack-developer';

    // 7. Fresher and Graduate
    case 'fresher-graduate':
    case 'graduate-fresher':
    case 'fresh-graduate':
    case 'fresher':
    case 'graduate-entry':
      return 'graduate-fresher';

    // 8. Minimalist ATS
    case 'minimalist-ats':
    case 'ats-minimal':
      return 'minimalist-ats';

    // 9. Modern Minimalist
    case 'modern-minimalist':
    case 'minimalist':
    case 'minimal-professional':
    case 'minimal':
      return 'minimalist';

    // 10. Academic and Research
    case 'academic-research':
    case 'academic':
      return 'academic-research';

    // 11. Professional Sidebar
    case 'professional-sidebar':
    case 'modern-two-column':
    case 'contemporary':
      return 'modern-two-column';

    // 12. Compact One-Page
    case 'compact-one-page':
      return 'compact-one-page';

    // Supplementary
    case 'experienced-professional':
    case 'experienced':
      return 'experienced-professional';
    case 'data-analyst':
    case 'data-ai':
      return 'data-analyst';
    case 'ui-ux-designer':
    case 'creative-professional':
      return 'ui-ux-designer';
    case 'internship-applicant':
      return 'internship-applicant';
    case 'sales-marketing':
      return 'sales-marketing';

    // Older reference designs
    case 'modern-professional':
    case 'thomas-hamptone':
    case 'nick-koe':
    case 'richard-sanchez':
    case 'olivia-wilson-grid':
    case 'olivia-wilson-blush':
      return id as ResumeTemplateId;

    default:
      return 'ats-classic';
  }
}

// Sample preview data used exclusively for miniature cards when user has not entered details yet
export const MINI_SAMPLE_RESUME_DATA: ResumeData = {
  id: 'mini_preview_sample',
  title: 'Sample Preview',
  candidateType: 'experienced',
  personalInfo: {
    fullName: 'Alexandra Chen',
    headline: 'Senior Full-Stack Engineer & Architect',
    email: 'alex.chen@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexchen',
    github: 'github.com/alexchen',
    portfolio: 'alexchen.dev',
  },
  summary:
    'Accomplished software engineer with 7+ years of experience spearheading distributed systems, cloud-native web architectures, and high-performance APIs.',
  skills: {
    technical: ['TypeScript', 'Next.js', 'React', 'Node.js', 'Go', 'PostgreSQL', 'AWS'],
    tools: ['Docker', 'Kubernetes', 'Git', 'Redis', 'Kafka', 'Terraform'],
    soft: ['Technical Leadership', 'System Architecture', 'Agile Mentorship'],
  },
  experience: [
    {
      id: 'exp_1',
      company: 'Stripe',
      role: 'Staff Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      bulletPoints: [
        'Architected real-time payment ingestion pipeline processing 24k requests/sec with 99.999% availability.',
        'Mentored 12 engineers across product squads and instituted automated end-to-end integration workflows.',
      ],
    },
    {
      id: 'exp_2',
      company: 'Datadog',
      role: 'Senior Software Engineer',
      location: 'New York, NY',
      startDate: '2019',
      endDate: '2022',
      current: false,
      bulletPoints: [
        'Decreased metric query latency by 42% through optimized memory cache tiers and query plan indexing.',
      ],
    },
  ],
  education: [
    {
      id: 'edu_1',
      degree: 'B.S. in Computer Science',
      institution: 'UC Berkeley',
      location: 'Berkeley, CA',
      graduationYear: '2019',
      gpa: '3.91',
      honors: 'Summa Cum Laude · Dean’s Honors List',
    },
  ],
  projects: [
    {
      id: 'proj_1',
      title: 'CloudMesh Engine',
      description: 'Open-source distributed service proxy built in Go with automated mTLS certificate rotation.',
      technologies: ['Go', 'gRPC', 'Docker', 'eBPF'],
      link: 'github.com/alexchen/cloudmesh',
      bullets: ['Grew community to 1.8k GitHub stars with 40+ active enterprise contributors.'],
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
