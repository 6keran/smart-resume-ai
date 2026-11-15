import 'server-only';
import { ResumeData, ExperienceItem, EducationItem, ProjectItem, CertificationItem } from '@/types/resume';
import { extractResumeSections, extractSkillsFromText } from '@/server/services/resumeIntelligence';

// Regex patterns for contact information
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b(?:\+91[-\s]?)?[6-9]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-]+)/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-]+)/i;
const PORTFOLIO_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9_\-]+\.(?:dev|io|me|app|com|org|co))(?:\/[^\s]*)?/i;
const LOCATION_REGEX = /\b([A-Z][a-zA-Z\s.-]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))\b/;
const DATE_RANGE_REGEX = /\b(?:(?:19|20)\d{2}\s*[-–—to\/]+\s*(?:(?:19|20)\d{2}|present|current|ongoing)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\s*[-–—to\/]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}|present|current)|(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}\s*[-–—to\/]+\s*(?:(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}|present))\b/i;
const YEAR_REGEX = /\b(?:19|20)\d{2}\b/;
const DEGREE_REGEX = /\b(?:B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|B\.?Tech\.?|M\.?Tech\.?|B\.?E\.?|M\.?E\.?|BCA|MCA|BBA|MBA|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Diploma|Associate(?:'s)?)\b/i;

// Categorization dictionaries for skills
const TOOL_KEYWORDS = new Set([
  'git', 'github', 'gitlab', 'docker', 'kubernetes', 'aws', 'amazon web services', 'gcp',
  'google cloud', 'azure', 'linux', 'unix', 'jira', 'confluence', 'postman', 'figma',
  'vs code', 'visual studio code', 'webpack', 'vite', 'npm', 'yarn', 'pnpm', 'jenkins',
  'terraform', 'vercel', 'netlify', 'datadog', 'prometheus', 'grafana', 'circleci', 'bash',
  'autocad', 'solidworks', 'ansys', 'matlab', 'kicad', 'excel', 'power bi', 'tableau',
  'hubspot', 'google analytics', 'google ads', 'bloomberg', 'workday'
]);

const SOFT_SKILL_KEYWORDS = new Set([
  'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving', 'agile',
  'scrum', 'mentoring', 'critical thinking', 'adaptability', 'time management', 'organization',
  'negotiation', 'analytical thinking', 'ownership', 'cross-functional'
]);

/**
 * Parses unstructured resume text extracted from a PDF or DOCX file
 * into a typed, validated ResumeData structure suitable for the Resume Editor.
 */
export function parseResumeTextToResumeData(rawText: string, filename?: string): ResumeData {
  const sections = extractResumeSections(rawText);
  const now = new Date().toISOString();
  const baseId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // --------------------------------------------------------------------------
  // 1. EXTRACT PERSONAL / CONTACT INFORMATION
  // --------------------------------------------------------------------------
  const headerText = sections.header || '';
  const fullText = rawText;

  // Email
  const emailMatch = headerText.match(EMAIL_REGEX) || fullText.match(EMAIL_REGEX);
  const email = emailMatch ? emailMatch[0].trim() : '';

  // Phone
  const phoneMatch = headerText.match(PHONE_REGEX) || fullText.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // LinkedIn
  const linkedinMatch = headerText.match(LINKEDIN_REGEX) || fullText.match(LINKEDIN_REGEX);
  const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '';

  // GitHub
  const githubMatch = headerText.match(GITHUB_REGEX) || fullText.match(GITHUB_REGEX);
  const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '';

  // Portfolio
  const portfolioMatch = headerText.match(PORTFOLIO_REGEX) || fullText.match(PORTFOLIO_REGEX);
  let portfolio = '';
  if (portfolioMatch && !portfolioMatch[0].includes('linkedin') && !portfolioMatch[0].includes('github')) {
    portfolio = portfolioMatch[0].startsWith('http') ? portfolioMatch[0] : `https://${portfolioMatch[0]}`;
  }

  // Location
  const locationMatch = headerText.match(LOCATION_REGEX) || fullText.slice(0, 800).match(LOCATION_REGEX);
  const location = locationMatch ? locationMatch[1].trim() : '';

  // Full Name & Headline extraction
  const headerLines = headerText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (l.includes('@')) return false;
      if (PHONE_REGEX.test(l)) return false;
      if (l.toLowerCase().includes('http') || l.toLowerCase().includes('www.')) return false;
      if (/^(?:resume|curriculum vitae|cv|contact|profile)$/i.test(l)) return false;
      return true;
    });

  let fullName = '';
  let headline = '';

  if (headerLines.length > 0) {
    const firstLine = headerLines[0];
    if (firstLine.includes('|')) {
      const parts = firstLine.split('|').map((p) => p.trim());
      fullName = parts[0];
      headline = parts.slice(1).join(' | ');
    } else if (firstLine.includes(' - ') && !firstLine.includes('@')) {
      const parts = firstLine.split(' - ').map((p) => p.trim());
      fullName = parts[0];
      headline = parts.slice(1).join(' - ');
    } else {
      fullName = firstLine;
      if (headerLines.length > 1 && headerLines[1].length < 60) {
        headline = headerLines[1];
      }
    }
  }

  // Fallback to filename if fullName could not be cleanly extracted
  if (!fullName || fullName.length > 50 || /^[0-9\W]+$/.test(fullName)) {
    if (filename) {
      fullName = filename
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b(resume|cv|latest|updated|final|202[0-9])\b/gi, '')
        .trim();
    }
    if (!fullName) fullName = 'Candidate Profile';
  }

  // --------------------------------------------------------------------------
  // 2. EXTRACT SUMMARY
  // --------------------------------------------------------------------------
  let summary = (sections.summary || '').trim();
  if (!summary && sections.other) {
    const firstParagraph = sections.other.split(/\n\s*\n/)[0]?.trim();
    if (firstParagraph && firstParagraph.length > 40 && firstParagraph.length < 500) {
      summary = firstParagraph;
    }
  }

  // --------------------------------------------------------------------------
  // 3. EXTRACT SKILLS
  // --------------------------------------------------------------------------
  const allExtractedSkills = extractSkillsFromText(sections.skills ? `${sections.skills}\n${rawText}` : rawText);
  const technical: string[] = [];
  const tools: string[] = [];
  const soft: string[] = [];

  for (const skill of allExtractedSkills) {
    const lower = skill.toLowerCase();
    if (TOOL_KEYWORDS.has(lower)) {
      tools.push(skill);
    } else if (SOFT_SKILL_KEYWORDS.has(lower)) {
      soft.push(skill);
    } else {
      technical.push(skill);
    }
  }

  // If skills section has bullet points or comma lists not captured by dictionary
  if (sections.skills) {
    const customTokens = sections.skills
      .split(/[,•|\n;]/)
      .map((s) => s.trim().replace(/^[-*•▫▪]\s*/, ''))
      .filter((s) => s.length > 1 && s.length < 35 && !/^\d+$/.test(s));

    for (const token of customTokens) {
      const lower = token.toLowerCase();
      if (!allExtractedSkills.some((s) => s.toLowerCase() === lower)) {
        if (TOOL_KEYWORDS.has(lower)) {
          if (!tools.includes(token)) tools.push(token);
        } else if (SOFT_SKILL_KEYWORDS.has(lower)) {
          if (!soft.includes(token)) soft.push(token);
        } else {
          if (!technical.includes(token) && technical.length < 25) technical.push(token);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. EXTRACT WORK EXPERIENCE
  // --------------------------------------------------------------------------
  const experience: ExperienceItem[] = [];
  const expLines = (sections.experience || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentExp: Partial<ExperienceItem> | null = null;
  let expIndex = 0;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const dateMatch = line.match(DATE_RANGE_REGEX);
    const isBullet = /^[-*•▪▫]\s*/.test(line);

    // If line contains a date range or looks like a company/role title
    if (dateMatch && !isBullet) {
      if (currentExp && currentExp.company) {
        experience.push({
          id: `exp_${expIndex++}_${Date.now()}`,
          company: currentExp.company || 'Organization',
          role: currentExp.role || 'Professional Role',
          location: currentExp.location || '',
          startDate: currentExp.startDate || '2022',
          endDate: currentExp.endDate || 'Present',
          current: currentExp.current ?? true,
          bulletPoints: currentExp.bulletPoints || [],
        });
      }

      // Parse company and role from date line or surrounding lines
      const dateStr = dateMatch[0];
      const lineWithoutDate = line.replace(dateMatch[0], '').trim().replace(/^[,\-|–—\s]+|[,\-|–—\s]+$/g, '');
      const dateParts = dateStr.split(/[-–—to\/]+/i).map((d) => d.trim());

      currentExp = {
        company: lineWithoutDate || (i > 0 && !expLines[i - 1].match(DATE_RANGE_REGEX) ? expLines[i - 1] : 'Company'),
        role: i < expLines.length - 1 && !expLines[i + 1].match(DATE_RANGE_REGEX) && !/^[-*•▪▫]/.test(expLines[i + 1])
          ? expLines[i + 1]
          : 'Role',
        startDate: dateParts[0] || '2022',
        endDate: dateParts[1] || 'Present',
        current: /present|current|ongoing/i.test(dateStr),
        bulletPoints: [],
      };
    } else if (isBullet && currentExp) {
      const cleanBullet = line.replace(/^[-*•▪▫]\s*/, '').trim();
      if (cleanBullet.length > 8) {
        currentExp.bulletPoints = currentExp.bulletPoints || [];
        currentExp.bulletPoints.push(cleanBullet);
      }
    } else if (currentExp && line.length > 25 && !line.match(DATE_RANGE_REGEX)) {
      // Descriptive non-bullet sentence
      currentExp.bulletPoints = currentExp.bulletPoints || [];
      if (currentExp.bulletPoints.length < 6) {
        currentExp.bulletPoints.push(line);
      }
    }
  }

  // Push final item
  if (currentExp && currentExp.company) {
    experience.push({
      id: `exp_${expIndex++}_${Date.now()}`,
      company: currentExp.company || 'Organization',
      role: currentExp.role || 'Professional Role',
      location: currentExp.location || '',
      startDate: currentExp.startDate || '2022',
      endDate: currentExp.endDate || 'Present',
      current: currentExp.current ?? true,
      bulletPoints: currentExp.bulletPoints || [],
    });
  }

  // --------------------------------------------------------------------------
  // 5. EXTRACT EDUCATION
  // --------------------------------------------------------------------------
  const education: EducationItem[] = [];
  const eduLines = (sections.education || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentEdu: Partial<EducationItem> | null = null;
  let eduIndex = 0;

  for (let i = 0; i < eduLines.length; i++) {
    const line = eduLines[i];
    const degreeMatch = line.match(DEGREE_REGEX);
    const yearMatch = line.match(YEAR_REGEX);

    if (degreeMatch || yearMatch || line.toLowerCase().includes('university') || line.toLowerCase().includes('college')) {
      if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
        education.push({
          id: `edu_${eduIndex++}_${Date.now()}`,
          degree: currentEdu.degree || 'Degree Program',
          institution: currentEdu.institution || 'University',
          location: currentEdu.location || '',
          graduationYear: currentEdu.graduationYear || '2024',
          gpa: currentEdu.gpa || '',
          honors: currentEdu.honors || '',
        });
      }

      currentEdu = {
        degree: degreeMatch ? line : 'Degree',
        institution: line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || line.toLowerCase().includes('institute')
          ? line
          : 'University',
        graduationYear: yearMatch ? yearMatch[0] : '2024',
      };

      const gpaMatch = line.match(/(?:GPA|CGPA)[:\s]*([0-4]\.\d{1,2}|[5-9]\.\d{1,2}|10(?:\.0)?)/i);
      if (gpaMatch) {
        currentEdu.gpa = gpaMatch[1];
      }
    } else if (currentEdu) {
      if (!currentEdu.institution || currentEdu.institution === 'University') {
        currentEdu.institution = line;
      } else if (!currentEdu.degree || currentEdu.degree === 'Degree') {
        currentEdu.degree = line;
      }
    }
  }

  if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
    education.push({
      id: `edu_${eduIndex++}_${Date.now()}`,
      degree: currentEdu.degree || 'Degree Program',
      institution: currentEdu.institution || 'University',
      location: currentEdu.location || '',
      graduationYear: currentEdu.graduationYear || '2024',
      gpa: currentEdu.gpa || '',
      honors: currentEdu.honors || '',
    });
  }

  // --------------------------------------------------------------------------
  // 6. EXTRACT PROJECTS
  // --------------------------------------------------------------------------
  const projects: ProjectItem[] = [];
  const projLines = (sections.projects || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentProj: Partial<ProjectItem> | null = null;
  let projIndex = 0;

  for (const line of projLines) {
    const isBullet = /^[-*•▪▫]\s*/.test(line);
    if (!isBullet && line.length < 60 && !line.includes('http')) {
      if (currentProj && currentProj.title) {
        projects.push({
          id: `proj_${projIndex++}_${Date.now()}`,
          title: currentProj.title,
          description: currentProj.description || '',
          technologies: currentProj.technologies || [],
          link: currentProj.link,
          bullets: currentProj.bullets || [],
        });
      }
      currentProj = {
        title: line,
        description: '',
        technologies: [],
        bullets: [],
      };
    } else if (isBullet && currentProj) {
      const clean = line.replace(/^[-*•▪▫]\s*/, '').trim();
      currentProj.bullets = currentProj.bullets || [];
      currentProj.bullets.push(clean);
      if (!currentProj.description) currentProj.description = clean;
    } else if (currentProj) {
      if (!currentProj.description) {
        currentProj.description = line;
      } else {
        currentProj.bullets = currentProj.bullets || [];
        currentProj.bullets.push(line);
      }
    }
  }

  if (currentProj && currentProj.title) {
    projects.push({
      id: `proj_${projIndex++}_${Date.now()}`,
      title: currentProj.title,
      description: currentProj.description || '',
      technologies: currentProj.technologies || [],
      link: currentProj.link,
      bullets: currentProj.bullets || [],
    });
  }

  // --------------------------------------------------------------------------
  // 7. ASSEMBLE COMPLETE RESUMEDATA OBJECT
  // --------------------------------------------------------------------------
  const resumeTitle = filename
    ? filename.replace(/\.[^/.]+$/, '').trim()
    : `${fullName} Resume`;

  return {
    id: baseId,
    title: resumeTitle,
    candidateType: experience.length > 0 ? 'experienced' : 'fresher',
    personalInfo: {
      fullName,
      email,
      phone,
      location,
      headline: headline || undefined,
      linkedin: linkedin || undefined,
      github: github || undefined,
      portfolio: portfolio || undefined,
    },
    summary,
    skills: {
      technical: technical.slice(0, 20),
      soft: soft.slice(0, 8),
      tools: tools.slice(0, 10),
    },
    experience: experience.slice(0, 6),
    education: education.slice(0, 3),
    projects: projects.slice(0, 4),
    certifications: [],
    templateId: 'modern-ats',
    lastUpdated: now,
  };
}
