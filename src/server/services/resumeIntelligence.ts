import 'server-only';
import { extractSkillsFromText } from '@/server/services/applicationAssistant';

// ============================================================================
// ADVANCED RESUME INTELLIGENCE TYPES
// ============================================================================

export interface SectionScoreBreakdown {
  score: number; // 0 - 100
  status: 'excellent' | 'adequate' | 'needs_work' | 'missing';
  feedback: string[];
}

export interface SectionScores {
  header: SectionScoreBreakdown;
  summary: SectionScoreBreakdown;
  experience: SectionScoreBreakdown;
  projects: SectionScoreBreakdown;
  skills: SectionScoreBreakdown;
  education: SectionScoreBreakdown;
}

export interface SkillEvidenceItem {
  skill: string;
  isBackedByEvidence: boolean;
  evidenceSnippets: string[];
  warning?: string;
}

export interface DuplicateContentItem {
  type: 'repeated_bullet' | 'repeated_verb' | 'redundant_phrase';
  text: string;
  count: number;
  suggestion: string;
}

export interface ReadabilityMetrics {
  averageBulletWordCount: number;
  optimalWordCountRatio: number; // 0 - 100%
  passiveVoiceInstances: string[];
  metricDensityPercentage: number; // 0 - 100% of bullets with numbers/metrics
  readabilityLevel: 'Easy / Clear' | 'Moderate' | 'Dense / Verbose' | 'Fragmented';
}

export interface JobDescriptionAlignment {
  jobTitle?: string;
  company?: string;
  alignmentScore: number; // 0 - 100
  matchedSkills: string[];
  missingCriticalKeywords: string[];
  missingPreferredKeywords: string[];
  recommendedInsertionPoints: Array<{
    keyword: string;
    targetSection: 'summary' | 'skills' | 'projects' | 'experience';
    suggestedContext: string;
  }>;
}

export interface MissingInformationAlert {
  field: string;
  importance: 'critical' | 'recommended';
  message: string;
}

export interface AdvancedResumeAuditResult {
  overallAtsScore: number;
  sectionScores: SectionScores;
  evidenceConsistency: {
    totalSkillsCount: number;
    backedSkillsCount: number;
    unbackedSkills: SkillEvidenceItem[];
    consistencyScore: number; // 0 - 100
  };
  duplicateContent: DuplicateContentItem[];
  readability: ReadabilityMetrics;
  missingInformation: MissingInformationAlert[];
  jobAlignment?: JobDescriptionAlignment;
  auditedAt: string;
}

// ============================================================================
// SECTION PARSER & EVIDENCE CHECKER
// ============================================================================

const SECTION_HEADERS = {
  header: ['contact', 'personal info', 'header'],
  summary: ['summary', 'professional summary', 'profile', 'about me', 'objective', 'career objective'],
  experience: ['experience', 'work experience', 'employment', 'internships', 'work history', 'professional experience'],
  projects: ['projects', 'academic projects', 'personal projects', 'key projects', 'technical projects', 'portfolio'],
  skills: ['skills', 'technical skills', 'core competencies', 'skills & tools', 'technologies', 'proficiencies'],
  education: ['education', 'academic background', 'academics', 'qualifications', 'degrees'],
};

/**
 * Splits raw resume text into approximate standard sections based on known headings.
 */
export function extractResumeSections(resumeText: string): Record<string, string> {
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections: Record<string, string[]> = {
    header: [],
    summary: [],
    experience: [],
    projects: [],
    skills: [],
    education: [],
    other: [],
  };

  let currentSection = 'header';

  for (const line of lines) {
    const cleanLower = line.toLowerCase().replace(/[:#\-_]/g, '').trim();

    // Check if line matches a known section header
    let matchedHeader: string | null = null;
    for (const [secKey, aliases] of Object.entries(SECTION_HEADERS)) {
      if (aliases.includes(cleanLower) || aliases.some((a) => cleanLower === a || cleanLower.startsWith(a + ' '))) {
        matchedHeader = secKey;
        break;
      }
    }

    if (matchedHeader) {
      currentSection = matchedHeader;
    } else {
      sections[currentSection].push(line);
    }
  }

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(sections)) {
    result[k] = v.join('\n');
  }
  return result;
}

/**
 * Performs deep, multi-dimensional audit of resume content.
 */
export function performAdvancedResumeAudit(
  resumeText: string,
  jobDescription?: string,
  jobTitle?: string,
  company?: string
): AdvancedResumeAuditResult {
  const sections = extractResumeSections(resumeText);
  const missingInfo: MissingInformationAlert[] = [];

  // 1. AUDIT HEADER & CONTACT INFO
  const headerText = sections.header || '';
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const hasLinkedIn = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(resumeText);
  const hasGitHub = /github\.com\/[a-zA-Z0-9_-]+/i.test(resumeText);

  let headerScore = 100;
  const headerFeedback: string[] = [];

  if (!emailMatch) {
    headerScore -= 30;
    headerFeedback.push('Missing contact email address.');
    missingInfo.push({ field: 'Email', importance: 'critical', message: 'No email address found in the resume.' });
  }
  if (!phoneMatch) {
    headerScore -= 20;
    headerFeedback.push('Missing contact phone number.');
    missingInfo.push({ field: 'Phone Number', importance: 'critical', message: 'No phone number detected.' });
  }
  if (!hasLinkedIn) {
    headerScore -= 15;
    headerFeedback.push('Missing LinkedIn profile URL.');
    missingInfo.push({ field: 'LinkedIn URL', importance: 'recommended', message: 'Adding your LinkedIn profile enhances recruiter discoverability.' });
  }
  if (!hasGitHub) {
    headerScore -= 15;
    headerFeedback.push('Missing GitHub profile link (highly recommended for technical candidates).');
    missingInfo.push({ field: 'GitHub Link', importance: 'recommended', message: 'Include a GitHub profile link to showcase verifiable code.' });
  }
  if (headerScore >= 85) headerFeedback.push('Header contains complete contact details and professional links.');

  // 2. AUDIT PROFESSIONAL SUMMARY
  const summaryText = sections.summary || '';
  let summaryScore = 100;
  const summaryFeedback: string[] = [];

  if (!summaryText || summaryText.length < 20) {
    summaryScore = 40;
    summaryFeedback.push('Missing professional summary or objective statement.');
    missingInfo.push({ field: 'Summary Statement', importance: 'recommended', message: 'A 2-3 line summary anchors your target role for recruiters.' });
  } else {
    const wordCount = summaryText.split(/\s+/).length;
    if (wordCount < 25) {
      summaryScore -= 20;
      summaryFeedback.push('Summary is too brief; elaborate on your core technical specialty and target role.');
    } else if (wordCount > 90) {
      summaryScore -= 20;
      summaryFeedback.push('Summary is excessively long; trim to 3-4 impactful sentences.');
    } else {
      summaryFeedback.push('Concise summary with clear career orientation.');
    }

    const buzzwords = ['hardworking', 'go-getter', 'team player', 'motivated', 'passionate', 'fast learner', 'synergy'];
    const detectedBuzz = buzzwords.filter((b) => summaryText.toLowerCase().includes(b));
    if (detectedBuzz.length > 0) {
      summaryScore -= 15;
      summaryFeedback.push(`Replace generic buzzwords (${detectedBuzz.join(', ')}) with specific technical qualifications.`);
    }
  }

  // 3. AUDIT EXPERIENCE & BULLETS
  const experienceText = sections.experience || '';
  let experienceScore = 100;
  const experienceFeedback: string[] = [];
  const expLines = experienceText.split('\n').filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.length > 30);

  if (!experienceText || expLines.length === 0) {
    // For fresh graduates, absence of full-time experience is common, but internships/experience is ideal
    experienceScore = 65;
    experienceFeedback.push('No formal work or internship experience detected; ensure projects section demonstrates practical application.');
  } else {
    // Count quantified metrics (%, $, numbers)
    const metricCount = expLines.filter((l) => /\b\d+(\.\d+)?%|\$\d+|\b\d+\s*(users|clients|ms|seconds|x|million|k)\b/i.test(l)).length;
    const metricRatio = metricCount / Math.max(1, expLines.length);

    if (metricRatio < 0.4) {
      experienceScore -= 25;
      experienceFeedback.push('Low metric quantification: less than 40% of experience bullets include measurable outcomes (%, numbers, scale).');
    } else {
      experienceFeedback.push('Strong quantification with measurable impact metrics.');
    }

    // Check for strong action verbs at start of bullets
    const weakStarters = ['responsible for', 'helped', 'worked on', 'assisted with', 'duties included', 'tasks were'];
    const weakFound = expLines.filter((l) => weakStarters.some((w) => l.toLowerCase().includes(w))).length;
    if (weakFound > 0) {
      experienceScore -= 20;
      experienceFeedback.push(`Found ${weakFound} bullet(s) using passive starters like "Responsible for" or "Worked on". Use action verbs (Engineered, Architected, Optimized).`);
    }
  }

  // 4. AUDIT PROJECTS
  const projectsText = sections.projects || '';
  let projectsScore = 100;
  const projectsFeedback: string[] = [];

  if (!projectsText || projectsText.length < 50) {
    projectsScore = 30;
    projectsFeedback.push('Missing technical projects section. For students and entry-level engineers, projects are the primary proof of competency.');
    missingInfo.push({ field: 'Projects', importance: 'critical', message: 'Add 2-3 substantial technical projects showcasing architecture and tech stack.' });
  } else {
    const hasTechStackMention = /\b(built with|tech stack|technologies|tools|stack):/i.test(projectsText) || /\b(react|python|node|sql|docker|next\.js|java)\b/i.test(projectsText);
    if (!hasTechStackMention) {
      projectsScore -= 25;
      projectsFeedback.push('Specify explicit tech stack tags for each documented project.');
    }
    const hasLinks = /github\.com|http|https|demo|live/i.test(projectsText);
    if (!hasLinks) {
      projectsScore -= 15;
      projectsFeedback.push('Add repository links or live deployment URLs to substantiate your projects.');
    }
    if (projectsScore >= 80) projectsFeedback.push('Substantial technical projects with documented technologies.');
  }

  // 5. AUDIT SKILLS SECTION & EVIDENCE CONSISTENCY
  const skillsText = sections.skills || '';
  let skillsScore = 100;
  const skillsFeedback: string[] = [];

  const claimedSkillsInText = extractSkillsFromText(skillsText);
  const narrativeContent = `${sections.experience}\n${sections.projects}`.toLowerCase();

  const unbackedSkills: SkillEvidenceItem[] = [];
  let backedCount = 0;

  for (const sk of claimedSkillsInText) {
    const skLower = sk.toLowerCase();
    // Check if skill is mentioned in experience or projects narrative
    const isBacked = narrativeContent.includes(skLower);
    if (isBacked) {
      backedCount++;
    } else {
      unbackedSkills.push({
        skill: sk,
        isBackedByEvidence: false,
        evidenceSnippets: [],
        warning: `Listed under skills, but not mentioned or demonstrated in any project or experience bullet point.`,
      });
    }
  }

  const consistencyScore = claimedSkillsInText.length > 0
    ? Math.round((backedCount / claimedSkillsInText.length) * 100)
    : 80;

  if (claimedSkillsInText.length === 0) {
    skillsScore = 40;
    skillsFeedback.push('Missing technical skills section.');
    missingInfo.push({ field: 'Skills Section', importance: 'critical', message: 'Include a categorised technical skills section.' });
  } else {
    if (unbackedSkills.length > 3) {
      skillsScore -= 20;
      skillsFeedback.push(`${unbackedSkills.length} skills listed without supporting evidence in your projects or work experience.`);
    }
    if (skillsScore >= 80) skillsFeedback.push('Skills section clearly enumerates relevant technical proficiencies.');
  }

  // 6. AUDIT EDUCATION
  const educationText = sections.education || '';
  let educationScore = 100;
  const educationFeedback: string[] = [];

  if (!educationText || educationText.length < 20) {
    educationScore = 30;
    educationFeedback.push('Missing education section.');
    missingInfo.push({ field: 'Education', importance: 'critical', message: 'Provide your degree, university, and graduation year.' });
  } else {
    const hasDegree = /\b(bachelor|b\.s\.|b\.tech|b\.e\.|master|m\.s\.|m\.tech|associate|diploma)\b/i.test(educationText);
    const hasYear = /\b(20\d\d)\b/.test(educationText);

    if (!hasDegree) {
      educationScore -= 20;
      educationFeedback.push('Degree title (e.g. B.Tech / B.S. in Computer Science) is not explicitly detected.');
    }
    if (!hasYear) {
      educationScore -= 20;
      educationFeedback.push('Graduation year (e.g. 2025, 2026) is missing.');
      missingInfo.push({ field: 'Graduation Year', importance: 'critical', message: 'Graduation year is essential for campus recruiter filtering.' });
    }
    if (educationScore >= 80) educationFeedback.push('Education details are clear and chronological.');
  }

  // 7. DUPLICATE CONTENT DETECTION
  const duplicateContent: DuplicateContentItem[] = [];
  const allBullets = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => (l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) && l.length > 20)
    .map((l) => l.replace(/^[•\-*]\s*/, ''));

  // A. Repeated starter verbs
  const starterCounts: Record<string, number> = {};
  for (const b of allBullets) {
    const firstWord = b.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && firstWord.length > 3) {
      starterCounts[firstWord] = (starterCounts[firstWord] || 0) + 1;
    }
  }
  for (const [verb, count] of Object.entries(starterCounts)) {
    if (count >= 3) {
      duplicateContent.push({
        type: 'repeated_verb',
        text: `Repeated starter verb: "${verb}"`,
        count,
        suggestion: `You used "${verb}" to start ${count} bullets. Diversify with synonyms like Architected, Orchestrated, Accelerated, or Deployed.`,
      });
    }
  }

  // 8. READABILITY AND FORMATTING
  const totalBullets = Math.max(1, allBullets.length);
  const wordLengths = allBullets.map((b) => b.split(/\s+/).length);
  const totalWords = wordLengths.reduce((a, b) => a + b, 0);
  const avgWordCount = Math.round(totalWords / totalBullets);

  const optimalCount = wordLengths.filter((w) => w >= 12 && w <= 26).length;
  const optimalRatio = Math.round((optimalCount / totalBullets) * 100);

  const metricBullets = allBullets.filter((b) => /\b\d+(\.\d+)?%|\$\d+|\b\d+\s*(users|clients|ms|seconds|x|million|k)\b/i.test(b)).length;
  const metricDensity = Math.round((metricBullets / totalBullets) * 100);

  const passiveIndicators = ['was responsible for', 'duties included', 'was tasked with', 'helped to', 'assisted in'];
  const detectedPassive = passiveIndicators.filter((p) => resumeText.toLowerCase().includes(p));

  let readabilityLevel: ReadabilityMetrics['readabilityLevel'] = 'Easy / Clear';
  if (avgWordCount > 30) readabilityLevel = 'Dense / Verbose';
  else if (avgWordCount < 10) readabilityLevel = 'Fragmented';
  else if (optimalRatio >= 70) readabilityLevel = 'Easy / Clear';
  else readabilityLevel = 'Moderate';

  const readability: ReadabilityMetrics = {
    averageBulletWordCount: avgWordCount,
    optimalWordCountRatio: optimalRatio,
    passiveVoiceInstances: detectedPassive,
    metricDensityPercentage: metricDensity,
    readabilityLevel,
  };

  // 9. JOB DESCRIPTION ALIGNMENT (If JD is supplied)
  let jobAlignment: JobDescriptionAlignment | undefined;
  if (jobDescription && jobDescription.trim().length > 30) {
    const jdSkills = extractSkillsFromText(jobDescription);
    const resumeSkillsAll = extractSkillsFromText(resumeText);
    const resumeSkillsLower = new Set(resumeSkillsAll.map((s) => s.toLowerCase()));

    const matched = jdSkills.filter((s) => resumeSkillsLower.has(s.toLowerCase()));
    const missing = jdSkills.filter((s) => !resumeSkillsLower.has(s.toLowerCase()));

    const alignmentScore = jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 75;

    const recommendedInsertions = missing.slice(0, 4).map((keyword) => ({
      keyword,
      targetSection: 'skills' as const,
      suggestedContext: `Add "${keyword}" under technical proficiencies if you have academic or practical experience with it.`,
    }));

    jobAlignment = {
      jobTitle: jobTitle || 'Target Role',
      company: company || 'Target Company',
      alignmentScore,
      matchedSkills: matched,
      missingCriticalKeywords: missing.slice(0, 6),
      missingPreferredKeywords: missing.slice(6, 12),
      recommendedInsertionPoints: recommendedInsertions,
    };
  }

  // 10. COMPUTE OVERALL ATS SCORE
  const clampScore = (s: number) => Math.max(0, Math.min(100, s));
  const sectionScores: SectionScores = {
    header: {
      score: clampScore(headerScore),
      status: headerScore >= 80 ? 'excellent' : headerScore >= 60 ? 'adequate' : 'needs_work',
      feedback: headerFeedback,
    },
    summary: {
      score: clampScore(summaryScore),
      status: summaryScore >= 80 ? 'excellent' : summaryScore >= 60 ? 'adequate' : summaryScore >= 40 ? 'needs_work' : 'missing',
      feedback: summaryFeedback,
    },
    experience: {
      score: clampScore(experienceScore),
      status: experienceScore >= 80 ? 'excellent' : experienceScore >= 60 ? 'adequate' : 'needs_work',
      feedback: experienceFeedback,
    },
    projects: {
      score: clampScore(projectsScore),
      status: projectsScore >= 80 ? 'excellent' : projectsScore >= 60 ? 'adequate' : 'needs_work',
      feedback: projectsFeedback,
    },
    skills: {
      score: clampScore(skillsScore),
      status: skillsScore >= 80 ? 'excellent' : skillsScore >= 60 ? 'adequate' : 'needs_work',
      feedback: skillsFeedback,
    },
    education: {
      score: clampScore(educationScore),
      status: educationScore >= 80 ? 'excellent' : educationScore >= 60 ? 'adequate' : 'needs_work',
      feedback: educationFeedback,
    },
  };

  const weightedOverall = Math.round(
    sectionScores.header.score * 0.15 +
    sectionScores.summary.score * 0.10 +
    sectionScores.experience.score * 0.25 +
    sectionScores.projects.score * 0.25 +
    sectionScores.skills.score * 0.15 +
    sectionScores.education.score * 0.10
  );

  return {
    overallAtsScore: clampScore(weightedOverall),
    sectionScores,
    evidenceConsistency: {
      totalSkillsCount: claimedSkillsInText.length,
      backedSkillsCount: backedCount,
      unbackedSkills,
      consistencyScore,
    },
    duplicateContent,
    readability,
    missingInformation: missingInfo,
    jobAlignment,
    auditedAt: new Date().toISOString(),
  };
}

