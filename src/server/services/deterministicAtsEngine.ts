import 'server-only';
import {
  ResumeAnalysisResult,
  PrioritizedSuggestion,
  AnalysisStrength,
  AnalysisWeakness,
  AnalysisRecommendation,
  MatchedSkillItem,
} from '@/types/resume';
import {
  SectionScores,
  ReadabilityMetrics,
  DuplicateContentItem,
  SkillEvidenceItem,
  MissingInformationAlert,
  JobDescriptionAlignment,
} from '@/server/services/resumeIntelligence';

// ============================================================================
// 1. CANONICAL INPUT NORMALIZATION
// ============================================================================

/**
 * Normalizes resume and job description text into a canonical format.
 * Strips formatting discrepancies (CRLF vs LF, irregular Unicode whitespace,
 * smart quotes, em/en dashes, and variable indentation) to ensure identical
 * text representations yield 100% deterministic downstream analysis.
 */
export function normalizeAtsInput(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Normalize newlines to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace non-breaking and special Unicode spaces with standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Replace smart quotes and backticks with standard quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace em/en dashes and horizontal bars with standard hyphens
    .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // Replace bullet variants with standard bullet symbol
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '•')
    // Collapse multiple horizontal spaces to single space
    .replace(/[ \t]+/g, ' ')
    // Remove trailing spaces on each line
    .replace(/[ \t]+\n/g, '\n')
    // Collapse 3 or more newlines to 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================================
// 2. UNIFIED INDUSTRY SKILLS TAXONOMY
// ============================================================================

export const CANONICAL_INDUSTRY_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte',
  'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails',
  'HTML5', 'HTML', 'CSS3', 'CSS', 'Tailwind', 'Tailwind CSS', 'Sass', 'Bootstrap',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'GitLab',
  'REST API', 'RESTful APIs', 'REST APIs', 'GraphQL', 'Microservices', 'System Design', 'Agile', 'Scrum', 'Jira',
  'Unit Testing', 'Jest', 'PyTest', 'Cypress', 'Playwright', 'Selenium',
  'C++', 'Java', 'C#', '.NET', 'Rust', 'Go', 'Golang', 'Linux', 'Bash',
  'Data Structures', 'Algorithms', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'Pandas', 'NumPy', 'Data Analysis', 'Kafka', 'Terraform', 'DevOps', 'Snowflake', 'BigQuery',
  'Elasticsearch', 'Jenkins', 'Figma'
];

// Deduplicated display list sorted alphabetically
export const UNIQUE_CANONICAL_SKILLS = Array.from(new Set(CANONICAL_INDUSTRY_SKILLS)).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' })
);

// Stop words ignored when extracting custom requirements from job descriptions
const NON_TECH_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'will', 'our', 'are', 'this', 'that', 'have',
  'work', 'team', 'role', 'about', 'job', 'requirements', 'preferred', 'qualifications',
  'experience', 'responsibilities', 'company', 'years', 'candidate', 'join', 'opportunity',
  'workplace', 'equal', 'status', 'strong', 'ability', 'hands', 'must', 'plus', 'skills',
  'degree', 'bachelor', 'master', 'location', 'salary', 'benefits', 'apply', 'full', 'time',
  'part', 'ideal', 'looking', 'who', 'what', 'where', 'when', 'from', 'help', 'across',
  'including', 'such', 'well', 'both', 'each', 'build', 'using', 'used', 'make', 'drive',
  'other', 'support', 'high', 'level', 'based', 'closely', 'growth', 'fast', 'paced'
]);

// Helper for exact boundary-safe keyword regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkSkillPresent(text: string, skill: string): boolean {
  // Special-case skills with symbols like C++, C#, .NET, Node.js
  const escaped = escapeRegex(skill);
  const pattern = new RegExp(`(?:^|[\\s,;()/\\[\\]•-])(?:${escaped})(?=[\\s,;()/\\[\\]•.-]|$)`, 'i');
  return pattern.test(text);
}

// ============================================================================
// 3. DETERMINISTIC ATS METRICS & AUDIT ENGINE
// ============================================================================

export interface DeterministicAtsCalculation {
  overallAtsScore: number;
  keywordMatchScore: number;
  formattingScore: number;
  contentScore: number;
  sectionScore: number;
  wordCount: number;
  readabilityScore: number;
  bulletStrengthScore: number;
  detectedKeywords: string[];
  missingKeywords: string[];
  detectedSections: string[];
  missingSections: string[];
  matchedSkills?: MatchedSkillItem[];
  missingSkills?: string[];
  sectionScores: SectionScores;
  evidenceConsistency: {
    totalSkillsCount: number;
    backedSkillsCount: number;
    unbackedSkills: SkillEvidenceItem[];
    consistencyScore: number;
  };
  duplicateContent: DuplicateContentItem[];
  readabilityMetrics: ReadabilityMetrics;
  missingInformationAlerts: MissingInformationAlert[];
  jobAlignmentAnalysis?: JobDescriptionAlignment;
  strengths: AnalysisStrength[];
  weaknesses: AnalysisWeakness[];
  recommendations: AnalysisRecommendation[];
  topSuggestions: PrioritizedSuggestion[];
  summaryFeedback: string;
}

/**
 * Calculates ATS score and comprehensive metrics with 100% mathematical determinism.
 * Given identical normalized inputs, this function is guaranteed to return
 * identical numerical scores and evaluation findings on every invocation.
 */
export function calculateDeterministicAtsScore(
  rawResumeText: string,
  rawJobDescription?: string,
  rawJobTitle?: string,
  rawCompany?: string
): DeterministicAtsCalculation {
  const normResume = normalizeAtsInput(rawResumeText);
  const normJd = rawJobDescription ? normalizeAtsInput(rawJobDescription) : '';
  const jdProvided = Boolean(normJd && normJd.length > 20);

  const targetRole = rawJobTitle?.trim() || (jdProvided ? 'Target Role' : undefined);
  const targetCompany = rawCompany?.trim() || (jdProvided ? 'Target Company' : undefined);

  const words = normResume.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lowerResume = normResume.toLowerCase();

  // 1. Detect industry skills present in the resume
  const detectedSkillsSet = new Set<string>();
  const missingSkillsSet = new Set<string>();

  for (const skill of UNIQUE_CANONICAL_SKILLS) {
    if (checkSkillPresent(normResume, skill)) {
      detectedSkillsSet.add(skill);
    } else {
      missingSkillsSet.add(skill);
    }
  }

  const detectedKeywords = Array.from(detectedSkillsSet).sort();
  const topMissing = Array.from(missingSkillsSet).sort().slice(0, 6);

  // 2. Job-specific skills matching (if JD is provided)
  const matchedSkills: MatchedSkillItem[] = [];
  const missingJobSkillsList: string[] = [];
  const seenJdSkills = new Set<string>();

  if (jdProvided) {
    // Check canonical industry skills in JD
    for (const skill of UNIQUE_CANONICAL_SKILLS) {
      if (checkSkillPresent(normJd, skill)) {
        seenJdSkills.add(skill.toLowerCase());
        const inResume = detectedSkillsSet.has(skill);
        if (inResume) {
          matchedSkills.push({
            skill,
            status: 'matched',
            context: `Matches explicit requirement in ${targetRole || 'job'} description.`,
          });
        } else {
          missingJobSkillsList.push(skill);
          matchedSkills.push({
            skill,
            status: 'missing',
            context: `Required by ${targetCompany || 'target'} role, but not found in resume text.`,
          });
        }
      }
    }

    // Extract additional dynamic technical keywords from JD not in taxonomy
    const candidateTokens = normJd.match(/\b[A-Za-z][A-Za-z0-9.+/#-]{2,35}\b/g) || [];
    for (const rawToken of candidateTokens) {
      const lowerToken = rawToken.toLowerCase();
      if (
        !NON_TECH_STOP_WORDS.has(lowerToken) &&
        !seenJdSkills.has(lowerToken) &&
        !seenJdSkills.has(lowerToken.replace(/s$/, ''))
      ) {
        // Only consider technical terms with capitalization or technical symbols
        const isTechnicalStyle = /[A-Z]/.test(rawToken) || /[.+#/-]/.test(rawToken);
        if (isTechnicalStyle) {
          seenJdSkills.add(lowerToken);
          const inResume = checkSkillPresent(normResume, rawToken);
          if (inResume) {
            matchedSkills.push({
              skill: rawToken,
              status: 'matched',
              context: `Identified in job requirements and verified in candidate resume.`,
            });
          } else {
            missingJobSkillsList.push(rawToken);
            matchedSkills.push({
              skill: rawToken,
              status: 'missing',
              context: `Mentioned in job description, but not identified on resume.`,
            });
          }
        }
      }
    }

    // Sort matchedSkills deterministically
    matchedSkills.sort((a, b) => a.skill.localeCompare(b.skill));
    missingJobSkillsList.sort();

    // Fallback if no specific skills detected in JD
    if (matchedSkills.filter((s) => s.status === 'matched').length === 0 && detectedKeywords.length > 0) {
      matchedSkills.unshift({
        skill: detectedKeywords[0],
        status: 'matched',
        context: 'Foundational technical competency present in resume.',
      });
    }
  }

  // 3. Section layout detection
  const hasExperience = /experience|work history|employment|career/i.test(lowerResume);
  const hasEducation = /education|academic|university|degree|bachelor|master/i.test(lowerResume);
  const hasSkills = /skills|technical skills|competencies|technologies/i.test(lowerResume) || detectedKeywords.length >= 3;
  const hasProjects = /projects|portfolio|open source/i.test(lowerResume);
  const hasSummary = /summary|profile|about me|objective/i.test(lowerResume);
  const hasContact = /@|linkedin|github|phone|\+?\d{3}/i.test(lowerResume);

  const detectedSections: string[] = [];
  const missingSections: string[] = [];

  if (hasExperience) detectedSections.push('Work Experience');
  else missingSections.push('Work Experience');

  if (hasEducation) detectedSections.push('Education');
  else missingSections.push('Education');

  if (hasSkills) detectedSections.push('Skills');
  else missingSections.push('Skills');

  if (hasProjects) detectedSections.push('Projects');
  else missingSections.push('Projects');

  if (hasSummary) detectedSections.push('Professional Summary');
  else missingSections.push('Professional Summary');

  if (hasContact) detectedSections.push('Contact Information');
  else missingSections.push('Contact Information');

  const sectionsDetectedCount = detectedSections.length;

  // 4. Metric & Action Verb Quantification
  const metricMatches = normResume.match(/\b\d+(\.\d+)?%|\$\d+[km]?|\b\d+[xX]\b|\b\d{2,}\b/g) || [];
  const metricCount = metricMatches.length;

  const actionVerbMatches = normResume.match(
    /\b(built|developed|led|engineered|created|architected|designed|implemented|managed|spearheaded|optimized|automated|orchestrated|delivered|refactored|launched|streamlined|accelerated|pioneered|deployed)\b/gi
  ) || [];
  const actionVerbCount = actionVerbMatches.length;

  // 5. Bullet Extraction & Readability Metrics
  const allBullets = normResume
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.startsWith('–')) && l.length > 20)
    .map((l) => l.replace(/^[•\-*–]\s*/, ''));

  const totalBullets = Math.max(1, allBullets.length);
  const wordLengths = allBullets.map((b) => b.split(/\s+/).length);
  const totalWords = wordLengths.reduce((a, b) => a + b, 0);
  const avgWordCount = Math.round(totalWords / totalBullets);

  const optimalCount = wordLengths.filter((w) => w >= 12 && w <= 28).length;
  const optimalRatio = Math.round((optimalCount / totalBullets) * 100);

  const metricBullets = allBullets.filter((b) =>
    /\b\d+(\.\d+)?%|\$\d+|\b\d+\s*(users|clients|ms|seconds|x|million|k)\b/i.test(b)
  ).length;
  const metricDensity = Math.round((metricBullets / totalBullets) * 100);

  const passiveIndicators = ['was responsible for', 'duties included', 'was tasked with', 'helped to', 'assisted in', 'worked on'];
  const detectedPassive = passiveIndicators.filter((p) => lowerResume.includes(p));

  let readabilityLevel: ReadabilityMetrics['readabilityLevel'] = 'Easy / Clear';
  if (avgWordCount > 30) readabilityLevel = 'Dense / Verbose';
  else if (avgWordCount < 10 && allBullets.length > 0) readabilityLevel = 'Fragmented';
  else if (optimalRatio >= 65) readabilityLevel = 'Easy / Clear';
  else readabilityLevel = 'Moderate';

  const readabilityMetrics: ReadabilityMetrics = {
    averageBulletWordCount: avgWordCount,
    optimalWordCountRatio: optimalRatio,
    passiveVoiceInstances: detectedPassive,
    metricDensityPercentage: metricDensity,
    readabilityLevel,
  };

  // Bullet strength score (30 - 96)
  const bulletStrengthScore = Math.min(
    Math.max(35 + Math.min(actionVerbCount * 5, 30) + Math.min(metricCount * 6, 30), 30),
    96
  );

  // Readability score (40 - 95)
  const readabilityScore = Math.min(
    Math.max(
      50 +
        (wordCount >= 200 && wordCount <= 850 ? 25 : 10) +
        (sectionsDetectedCount >= 4 ? 15 : 5) -
        Math.min(detectedPassive.length * 5, 15),
      40
    ),
    95
  );

  // 6. PILLAR 1: Keyword Match Score (Weight: 35%)
  let keywordMatchScore: number;
  if (jdProvided && (matchedSkills.length > 0 || missingJobSkillsList.length > 0)) {
    const matchedCount = matchedSkills.filter((s) => s.status === 'matched').length;
    const totalJobSkills = matchedCount + missingJobSkillsList.length;
    if (totalJobSkills > 0) {
      const matchRatio = matchedCount / totalJobSkills;
      const rawScore = Math.round(matchRatio * 65 + (detectedKeywords.length > 0 ? 30 : 10));
      keywordMatchScore = Math.min(Math.max(rawScore, 15), 98);
    } else {
      keywordMatchScore = Math.min(detectedKeywords.length * 8 + 20, 95);
    }
  } else {
    if (detectedKeywords.length === 0) {
      keywordMatchScore = 20;
    } else {
      keywordMatchScore = Math.min(25 + detectedKeywords.length * 7, 95);
    }
  }

  // 7. PILLAR 2: ATS Formatting & Layout Score (Weight: 25%)
  let formattingScore: number;
  if (sectionsDetectedCount === 0) {
    formattingScore = 20;
  } else {
    const sectionRatioScore = (sectionsDetectedCount / 6) * 60;
    const lengthScore = wordCount >= 200 && wordCount <= 900 ? 35 : 15;
    formattingScore = Math.min(Math.max(Math.round(sectionRatioScore + lengthScore), 25), 96);
  }

  // 8. PILLAR 3: Content Quality & Quantification Score (Weight: 25%)
  let contentScore: number;
  if (wordCount < 40) {
    contentScore = 15;
  } else {
    const verbBonus = Math.min(actionVerbCount * 5, 25);
    const metricBonus = Math.min(metricCount * 7, 35);
    const lengthBonus = wordCount >= 250 ? 15 : 0;
    contentScore = Math.min(Math.max(25 + metricBonus + verbBonus + lengthBonus, 20), 95);
  }

  // 9. PILLAR 4: Section Completeness Score (Weight: 15%)
  const sectionScore = Math.round((sectionsDetectedCount / 6) * 100);

  // 10. OVERALL DETERMINISTIC ATS SCORE (Weighted Sum: 1.00)
  const overallAtsScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        keywordMatchScore * 0.35 +
        formattingScore   * 0.25 +
        contentScore      * 0.25 +
        sectionScore      * 0.15
      )
    )
  );

  // 11. Section-Level Breakdown Scores & Feedback
  const missingInfoAlerts: MissingInformationAlert[] = [];

  // Contact / Header
  let headerScore = 100;
  const headerFeedback: string[] = [];
  const emailMatch = normResume.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = normResume.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const hasLinkedIn = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(normResume);
  const hasGitHub = /github\.com\/[a-zA-Z0-9_-]+/i.test(normResume);

  if (!emailMatch) {
    headerScore -= 30;
    headerFeedback.push('Missing contact email address.');
    missingInfoAlerts.push({ field: 'Email', importance: 'critical', message: 'No email address found in the resume.' });
  }
  if (!phoneMatch) {
    headerScore -= 20;
    headerFeedback.push('Missing contact phone number.');
    missingInfoAlerts.push({ field: 'Phone Number', importance: 'critical', message: 'No phone number detected.' });
  }
  if (!hasLinkedIn) {
    headerScore -= 15;
    headerFeedback.push('Missing LinkedIn profile URL.');
    missingInfoAlerts.push({ field: 'LinkedIn URL', importance: 'recommended', message: 'Adding your LinkedIn profile enhances recruiter discoverability.' });
  }
  if (!hasGitHub) {
    headerScore -= 15;
    headerFeedback.push('Missing GitHub profile link (highly recommended for technical candidates).');
    missingInfoAlerts.push({ field: 'GitHub Link', importance: 'recommended', message: 'Include a GitHub profile link to showcase verifiable code.' });
  }
  if (headerScore >= 85) headerFeedback.push('Header contains complete contact details and professional links.');

  // Summary
  let summaryScore = 100;
  const summarySectionFeedback: string[] = [];
  if (!hasSummary) {
    summaryScore = 40;
    summarySectionFeedback.push('Missing professional summary or objective statement.');
    missingInfoAlerts.push({ field: 'Summary Statement', importance: 'recommended', message: 'A 2-3 line summary anchors your target role for recruiters.' });
  } else {
    summarySectionFeedback.push('Clear summary detected framing seniority and technical domain.');
  }

  // Experience
  let experienceScore = 100;
  const experienceFeedback: string[] = [];
  if (!hasExperience) {
    experienceScore = 45;
    experienceFeedback.push('No formal work or internship experience section detected.');
    missingInfoAlerts.push({ field: 'Work Experience', importance: 'critical', message: 'Work experience provides primary evidence for ATS ranking.' });
  } else {
    if (metricCount < 2) {
      experienceScore -= 20;
      experienceFeedback.push('Low metric quantification: add measurable project scale and percentage outcomes.');
    } else {
      experienceFeedback.push('Strong quantification with measurable impact metrics.');
    }
  }

  // Projects
  let projectsScore = 100;
  const projectsFeedback: string[] = [];
  if (!hasProjects) {
    projectsScore = 40;
    projectsFeedback.push('Missing technical projects section.');
    missingInfoAlerts.push({ field: 'Projects', importance: 'critical', message: 'Add 2-3 substantial technical projects showcasing architecture and tech stack.' });
  } else {
    projectsFeedback.push('Technical projects documented with tech stack details.');
  }

  // Skills
  let skillsScore = 100;
  const skillsFeedback: string[] = [];
  if (!hasSkills || detectedKeywords.length === 0) {
    skillsScore = 35;
    skillsFeedback.push('Missing dedicated technical skills section.');
    missingInfoAlerts.push({ field: 'Skills Section', importance: 'critical', message: 'Include a categorized technical skills section.' });
  } else {
    skillsFeedback.push(`Identified ${detectedKeywords.length} verified technical keywords.`);
  }

  // Education
  let educationScore = 100;
  const educationFeedback: string[] = [];
  if (!hasEducation) {
    educationScore = 35;
    educationFeedback.push('Missing education section.');
    missingInfoAlerts.push({ field: 'Education', importance: 'critical', message: 'Provide your degree, university, and graduation year.' });
  } else {
    const hasDegree = /\b(bachelor|b\.s\.|b\.tech|b\.e\.|master|m\.s\.|m\.tech|associate|diploma)\b/i.test(normResume);
    const hasYear = /\b(20\d\d)\b/.test(normResume);
    if (!hasDegree) educationScore -= 20;
    if (!hasYear) {
      educationScore -= 20;
      missingInfoAlerts.push({ field: 'Graduation Year', importance: 'critical', message: 'Graduation year is essential for campus recruiter filtering.' });
    }
    if (educationScore >= 80) educationFeedback.push('Education credentials detected with degree and graduation year.');
  }

  const clamp = (val: number) => Math.min(100, Math.max(0, val));
  const sectionScores: SectionScores = {
    header: {
      score: clamp(headerScore),
      status: headerScore >= 80 ? 'excellent' : headerScore >= 60 ? 'adequate' : 'needs_work',
      feedback: headerFeedback,
    },
    summary: {
      score: clamp(summaryScore),
      status: summaryScore >= 80 ? 'excellent' : summaryScore >= 60 ? 'adequate' : summaryScore >= 40 ? 'needs_work' : 'missing',
      feedback: summarySectionFeedback,
    },
    experience: {
      score: clamp(experienceScore),
      status: experienceScore >= 80 ? 'excellent' : experienceScore >= 60 ? 'adequate' : 'needs_work',
      feedback: experienceFeedback,
    },
    projects: {
      score: clamp(projectsScore),
      status: projectsScore >= 80 ? 'excellent' : projectsScore >= 60 ? 'adequate' : 'needs_work',
      feedback: projectsFeedback,
    },
    skills: {
      score: clamp(skillsScore),
      status: skillsScore >= 80 ? 'excellent' : skillsScore >= 60 ? 'adequate' : 'needs_work',
      feedback: skillsFeedback,
    },
    education: {
      score: clamp(educationScore),
      status: educationScore >= 80 ? 'excellent' : educationScore >= 60 ? 'adequate' : 'needs_work',
      feedback: educationFeedback,
    },
  };

  // 12. Evidence consistency: claimed skills vs narrative backing
  const unbackedSkills: SkillEvidenceItem[] = [];
  let backedCount = 0;
  for (const sk of detectedKeywords) {
    const isBacked = lowerResume.indexOf(sk.toLowerCase()) !== lowerResume.lastIndexOf(sk.toLowerCase());
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

  const consistencyScore = detectedKeywords.length > 0
    ? Math.round((backedCount / detectedKeywords.length) * 100)
    : 80;

  // 13. Duplicate Content Detection
  const duplicateContent: DuplicateContentItem[] = [];
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

  // 14. Job alignment analysis (if JD provided)
  let jobAlignmentAnalysis: JobDescriptionAlignment | undefined;
  if (jdProvided) {
    const missingCrit = missingJobSkillsList.slice(0, 6);
    const missingPref = missingJobSkillsList.slice(6, 12);
    const alignmentScore = keywordMatchScore;
    jobAlignmentAnalysis = {
      jobTitle: targetRole || 'Target Role',
      company: targetCompany || 'Target Company',
      alignmentScore,
      matchedSkills: matchedSkills.filter((s) => s.status === 'matched').map((s) => s.skill),
      missingCriticalKeywords: missingCrit,
      missingPreferredKeywords: missingPref,
      recommendedInsertionPoints: missingCrit.slice(0, 4).map((keyword) => ({
        keyword,
        targetSection: 'skills' as const,
        suggestedContext: `Incorporate "${keyword}" in your technical proficiencies if you have authentic working exposure.`,
      })),
    };
  }

  // 15. Strengths
  const strengths: AnalysisStrength[] = [];
  if (detectedKeywords.length >= 3) {
    strengths.push({
      id: 'str_skills',
      section: 'Skills Coverage',
      title: 'Technical Skills Detected',
      description: `Identified ${detectedKeywords.length} relevant technologies in resume text: ${detectedKeywords.slice(0, 6).join(', ')}.`,
    });
  }
  if (metricCount >= 2) {
    strengths.push({
      id: 'str_metrics',
      section: 'Work Experience',
      title: 'Quantified Results',
      description: `Detected ${metricCount} numerical metrics indicating measurable project scope or performance.`,
    });
  }
  if (hasExperience && hasEducation && hasSkills) {
    strengths.push({
      id: 'str_sections',
      section: 'Structure',
      title: 'Standard Section Layout',
      description: 'Identified standard Experience, Education, and Skills sections for clear ATS parsing.',
    });
  }

  // 16. Deterministic Prioritized Suggestions
  const candidateSuggestions: PrioritizedSuggestion[] = [];
  let sugCounter = 1;

  if (jdProvided && missingJobSkillsList.length > 0) {
    candidateSuggestions.push({
      id: `sug_${sugCounter++}`,
      rank: 1,
      priority: 'High',
      section: 'Target Job Description Alignment',
      whatNeedsImprovement: `The resume is missing key technical competencies explicitly requested in the target job posting: ${missingJobSkillsList.slice(0, 4).join(', ')}.`,
      whyItMatters: `Adding relevant technologies you genuinely use may improve keyword coverage for matching job descriptions and ensure hiring teams recognize your qualifications.`,
      howToImprove: `Incorporate ${missingJobSkillsList.slice(0, 2).join(' and ')} directly into your skills inventory and relevant project or experience bullet points where you have genuine working exposure.`,
      extractedText: detectedKeywords.length > 0 ? `Current Technical Skills: ${detectedKeywords.slice(0, 6).join(', ')}` : '(No technical skills detected in standard section)',
      example: `Core Competencies: ${missingJobSkillsList.slice(0, 3).join(', ')} | Tools & Frameworks: ${detectedKeywords.slice(0, 3).join(', ')}`,
    });
  }

  if (!hasExperience) {
    candidateSuggestions.push({
      id: `sug_${sugCounter++}`,
      rank: 2,
      priority: 'High',
      section: 'Work Experience',
      whatNeedsImprovement: 'No Work Experience or Employment History section detected.',
      whyItMatters: 'Applicant tracking systems and recruiters evaluate professional trajectory, domain depth, and project impact primarily through work experience.',
      howToImprove: 'Add an Experience section detailing your past roles, companies, dates, and accomplishment bullets.',
      extractedText: '(No work experience section detected in current resume)',
      example: 'Software Engineer — Company Name (2022 – Present)\n• Engineered full-stack web applications using React and Node.js.',
    });
  }

  if (!hasSkills || detectedKeywords.length === 0) {
    candidateSuggestions.push({
      id: `sug_${sugCounter++}`,
      rank: 3,
      priority: 'High',
      section: 'Technical Skills',
      whatNeedsImprovement: 'No dedicated Technical Skills section detected.',
      whyItMatters: 'ATS search filters parse technical skills to index candidate competency. Without a skills section, keyword extraction is significantly impaired.',
      howToImprove: 'Add a dedicated Skills section categorizing programming languages, frameworks, developer tools, and databases.',
      extractedText: '(No technical skills section detected)',
      example: 'Technical Skills: Python, TypeScript, React, Node.js, PostgreSQL, Docker, Git',
    });
  }

  if (metricCount < 3 && hasExperience) {
    const lines = normResume.split('\n').filter((l) => l.trim().length > 20);
    const foundBullet = lines.find((l) => /^(?:[•\-*]|\d+\.|\b(?:Built|Developed|Led|Engineered|Created|Architected|Designed|Implemented|Managed|Spearheaded)\b)/i.test(l)) || lines[1] || '';
    const cleanBullet = foundBullet.replace(/^[•\-*\d.]+\s*/, '').trim();

    candidateSuggestions.push({
      id: `sug_${sugCounter++}`,
      rank: 4,
      priority: 'High',
      section: 'Work Experience & Impact',
      whatNeedsImprovement: 'Work experience bullets describe duties and responsibilities rather than measurable business outcomes and quantifiable achievements.',
      whyItMatters: 'Hiring managers look for evidence of measurable impact (such as scale handled, latency reductions, or delivery timelines) to evaluate project scope and effectiveness.',
      howToImprove: 'Structure bullet points using the Google X-Y-Z formula: "Accomplished [X] measured by [Y] by doing [Z]". Add genuine metrics representing scale, percentage performance gains, or delivery speed.',
      extractedText: cleanBullet || '(Current bullet point in experience section)',
      example: cleanBullet
        ? `Engineered scalable service workflows, improving system throughput by 35% and accelerating release cycles across production deployments.`
        : 'Optimized database query throughput by 42% by rewriting indexing pipelines and decoupling redundant microservice calls.',
    });
  }

  if (topMissing.length > 0 && candidateSuggestions.length < 3) {
    candidateSuggestions.push({
      id: `sug_${sugCounter++}`,
      rank: 5,
      priority: 'Medium',
      section: 'Technical Keyword Coverage',
      whatNeedsImprovement: `Absence of key modern cloud and infrastructure competencies expected for this discipline: ${topMissing.slice(0, 3).join(', ')}.`,
      whyItMatters: 'Technical recruiters and search filters scan for relevant stack components. Listing the tools and frameworks you actually work with clarifies your domain experience.',
      howToImprove: `Incorporate exposure to ${topMissing.slice(0, 2).join(' and ')} in your technical skills inventory or project descriptions where applicable.`,
      extractedText: detectedKeywords.length > 0 ? `Current Technical Skills: ${detectedKeywords.slice(0, 6).join(', ')}` : '(No skills section detected)',
      example: `Technical Skills: ${detectedKeywords.slice(0, 4).join(', ')}${topMissing.length > 0 ? `, ${topMissing.slice(0, 2).join(', ')}` : ''}`,
    });
  }

  // Ensure top 3
  const topSuggestions = candidateSuggestions.slice(0, 3).map((s, idx) => ({ ...s, rank: idx + 1 }));

  // Synchronize weaknesses and recommendations
  const weaknesses: AnalysisWeakness[] = topSuggestions.map((sug, idx) => ({
    id: `wk_${idx + 1}`,
    section: sug.section,
    whatIsWrong: sug.whatNeedsImprovement,
    whyItMatters: sug.whyItMatters,
    howToImprove: sug.howToImprove,
    severity: sug.priority.toLowerCase() as 'high' | 'medium' | 'low',
  }));

  const recommendations: AnalysisRecommendation[] = topSuggestions.map((sug, idx) => ({
    id: `rec_${idx + 1}`,
    category: sug.section,
    title: sug.howToImprove.slice(0, 60),
    actionText: sug.howToImprove,
    originalText: sug.extractedText || '',
    improvedText: sug.example || '',
    impact: sug.priority === 'High' ? 'High Impact' : sug.priority === 'Medium' ? 'Moderate Impact' : 'Refinement',
    extractedText: sug.extractedText,
  }));

  const summaryFeedback = jdProvided
    ? `Targeted analysis for ${targetRole || 'selected role'} at ${targetCompany || 'target company'} completed. Detected ${detectedKeywords.length} technical skills with ${matchedSkills.filter((s) => s.status === 'matched').length} direct matches to job requirements across ${sectionsDetectedCount} standard sections. ATS compatibility is rated at ${overallAtsScore}%.`
    : `Resume analysis completed. Detected ${detectedKeywords.length} core technical keywords across ${sectionsDetectedCount} standard sections. Overall ATS compatibility is rated at ${overallAtsScore}%.`;

  return {
    overallAtsScore,
    keywordMatchScore,
    formattingScore,
    contentScore,
    sectionScore,
    wordCount,
    readabilityScore,
    bulletStrengthScore,
    detectedKeywords,
    missingKeywords: jdProvided && missingJobSkillsList.length > 0 ? missingJobSkillsList : topMissing,
    detectedSections,
    missingSections,
    matchedSkills: jdProvided ? matchedSkills : undefined,
    missingSkills: jdProvided ? missingJobSkillsList : undefined,
    sectionScores,
    evidenceConsistency: {
      totalSkillsCount: detectedKeywords.length,
      backedSkillsCount: backedCount,
      unbackedSkills,
      consistencyScore,
    },
    duplicateContent,
    readabilityMetrics,
    missingInformationAlerts: missingInfoAlerts,
    jobAlignmentAnalysis,
    strengths,
    weaknesses,
    recommendations,
    topSuggestions,
    summaryFeedback,
  };
}
