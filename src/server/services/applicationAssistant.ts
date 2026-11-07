import 'server-only';
import { GoogleGenAI } from '@google/genai';
import {
  getCareerProfileSummary,
  type CareerProfileSummary,
} from '@/server/services/careerIntelligence';
import { CANDIDATE_GEMINI_MODELS } from '@/server/services/gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('[ApplicationAssistant] Failed to initialize GoogleGenAI client:', err);
  }
}

const REQUEST_TIMEOUT_MS = 14_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out.')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// ============================================================================
// SHARED TYPES & CHECKLIST HELPERS
// ============================================================================

export * from '@/lib/career/assistantTypes';
import {
  type JobDetails,
  type MatchSkillItem,
  type MissingSkillItem,
  type EligibilityDetail,
  type MatchAnalysisResult,
  type ImprovedProjectItem,
  type HighlightSkillItem,
  type CoverLetterData,
  type ApplicationEmailData,
  type RecruiterOutreachData,
  type ApplicationMaterialsResult,
  type ApplicationChecklistState,
  type FollowUpResult,
  type GenerateFollowUpParams,
  getDefaultChecklistState,
  computeChecklistProgress,
} from '@/lib/career/assistantTypes';

// ============================================================================
// SKILL & REQUIREMENT PARSING
// ============================================================================

const COMMON_TECH_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker',
  'Git', 'AWS', 'Linux', 'Java', 'C++', 'C#', 'GraphQL',
  'HTML', 'CSS', 'Tailwind', 'Tailwind CSS', 'FastAPI', 'Express',
  'Django', 'Flask', 'Spring Boot', 'REST APIs', 'Data Structures',
  'Algorithms', 'Jest', 'CI/CD', 'Machine Learning', 'Data Analysis'
];

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const s of COMMON_TECH_SKILLS) {
    const sLower = s.toLowerCase();
    const regex = new RegExp(`\\b${sLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) {
      matched.push(s);
    }
  }

  return Array.from(new Set(matched));
}

// ============================================================================
// 1. JOB APPLICATION INTELLIGENCE (ANALYSIS ENGINE)
// ============================================================================

export async function analyzeJobApplicationRequirements(
  userId: string,
  jobDetails: JobDetails,
  resumeData?: any
): Promise<MatchAnalysisResult> {
  const profileSummary = await getCareerProfileSummary(userId);
  const student = profileSummary.studentProfile;

  // Aggregate verified skills, claimed skills, and resume skills
  const verifiedList = profileSummary.skills?.verified || [];
  const claimedList = profileSummary.skills?.claimed || [];
  const inferredList = profileSummary.skills?.inferred || [];

  const verifiedMap = new Map<string, boolean>();
  for (const v of verifiedList) {
    verifiedMap.set(v.name.toLowerCase().trim(), true);
  }

  const allStudentSkillsMap = new Map<string, { verified: boolean; source: string }>();
  for (const v of verifiedList) {
    allStudentSkillsMap.set(v.name.toLowerCase().trim(), { verified: true, source: 'Skill Assessment' });
  }
  for (const c of claimedList) {
    const key = c.name.toLowerCase().trim();
    if (!allStudentSkillsMap.has(key)) {
      allStudentSkillsMap.set(key, { verified: false, source: 'Student Profile' });
    }
  }
  for (const inf of inferredList) {
    const key = inf.name.toLowerCase().trim();
    if (!allStudentSkillsMap.has(key)) {
      allStudentSkillsMap.set(key, { verified: false, source: 'Projects/Coursework' });
    }
  }

  // Parse required skills from job
  let requiredSkills = jobDetails.requiredSkills || [];
  if (requiredSkills.length === 0 && jobDetails.description) {
    requiredSkills = extractSkillsFromText(jobDetails.description);
  }
  if (requiredSkills.length === 0) {
    // Default reasonable expectations for software / tech role
    requiredSkills = ['JavaScript', 'Python', 'Git', 'SQL', 'Data Structures'];
  }

  // Calculate matching & missing skills deterministically
  const matchingSkills: MatchSkillItem[] = [];
  const missingSkills: MissingSkillItem[] = [];

  for (const req of requiredSkills) {
    const reqClean = req.trim();
    const reqKey = reqClean.toLowerCase();
    let found = false;

    for (const [studentSkillKey, info] of allStudentSkillsMap.entries()) {
      if (studentSkillKey === reqKey || studentSkillKey.includes(reqKey) || reqKey.includes(studentSkillKey)) {
        matchingSkills.push({
          name: reqClean,
          verified: info.verified,
          source: info.source,
        });
        found = true;
        break;
      }
    }

    if (!found) {
      missingSkills.push({
        name: reqClean,
        priority: ['sql', 'python', 'javascript', 'react', 'data structures'].some((k) => reqKey.includes(k))
          ? 'high'
          : 'medium',
        reason: `Listed in job criteria for ${jobDetails.title}`,
      });
    }
  }

  // Education Eligibility
  const studentDegree = student?.degree || 'Bachelor of Science in Computer Science';
  const gradYear = student?.graduationYear || new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const isDegreeTech = ['computer', 'software', 'technology', 'data', 'information', 'engineering', 'math']
    .some((term) => studentDegree.toLowerCase().includes(term));

  const eduReq = jobDetails.educationRequirement || 'Bachelor’s degree in Computer Science, Engineering, or related technical field';
  const educationEligibility: EligibilityDetail = {
    eligible: isDegreeTech,
    status: isDegreeTech ? 'eligible' : 'near_match',
    required: eduReq,
    actual: `${studentDegree} (Graduating ${gradYear}) at ${student?.institution || 'Accredited University'}`,
    note: isDegreeTech
      ? `Meets degree criteria. Candidate's graduation year (${gradYear}) matches fresher/campus eligibility.`
      : `Related analytical background. Consider highlighting strong programming coursework and verified technical skills.`,
  };

  // Experience Eligibility
  const rawJobDesc = (jobDetails.description || '').toLowerCase();
  const rawJobTitle = jobDetails.title.toLowerCase();
  const isFresherJob =
    rawJobTitle.includes('intern') ||
    rawJobTitle.includes('graduate') ||
    rawJobTitle.includes('junior') ||
    rawJobTitle.includes('associate') ||
    rawJobTitle.includes('entry') ||
    rawJobTitle.includes('fresher') ||
    rawJobDesc.includes('0-1 year') ||
    rawJobDesc.includes('0-2 year') ||
    rawJobDesc.includes('fresh graduate') ||
    rawJobDesc.includes('recent graduate') ||
    rawJobDesc.includes('internship') ||
    rawJobDesc.includes('no experience required');

  const expReq = jobDetails.experienceRequirement || (isFresherJob ? '0–1 years / Fresh Graduate or Student' : 'Entry-level (0–2 years)');
  const experienceEligibility: EligibilityDetail = {
    eligible: isFresherJob || gradYear >= currentYear - 1,
    status: isFresherJob ? 'eligible' : gradYear >= currentYear - 1 ? 'near_match' : 'review_needed',
    required: expReq,
    actual: student?.studentType === 'college_student'
      ? `Current College Student (Class of ${gradYear}) with ${student?.projects?.length || 0} documented academic & personal projects`
      : `Recent Graduate (Class of ${gradYear}) seeking entry-level software opportunities`,
    note: isFresherJob
      ? `Perfect fit for student/fresher profile. Emphasize verified skills and project achievements.`
      : `Job may prefer 1+ years. Bridge this gap by showcasing comprehensive full-stack and architecture projects.`,
  };

  // Work arrangement match
  const preferredLoc = student?.preferredLocations || 'Flexible';
  const preferredType = (student?.targetWorkType as string) || 'both';
  const jobArrangement = jobDetails.workArrangement || 'Hybrid / Flexible';
  const workArrangementEligibility = {
    preferred: preferredType === 'remote' ? 'Remote' : preferredType === 'on_site' ? 'On-site' : 'Remote / Hybrid / On-site',
    jobOffered: jobArrangement,
    isMatch: true,
    note: `Work format (${jobArrangement}) aligns with candidate's ${preferredLoc} preferences.`,
  };

  // Opportunity eligibility
  const isInternshipJob = rawJobTitle.includes('intern') || (jobDetails.opportunityType === 'internship');
  const opportunityEligibility = {
    studentType: student?.studentType || 'college_student',
    jobType: isInternshipJob ? 'Internship' : 'Full-Time Entry Level',
    eligible: true,
    note: isInternshipJob
      ? `Eligible for student internship programs before graduation.`
      : `Eligible for graduate hiring and fresher intake programs.`,
  };

  // Calculate Match Score
  const totalSkills = Math.max(requiredSkills.length, 1);
  const skillRatio = matchingSkills.length / totalSkills;
  const verifiedBonus = matchingSkills.filter((s) => s.verified).length * 4;
  const eduPoints = educationEligibility.eligible ? 20 : 10;
  const expPoints = experienceEligibility.eligible ? 20 : 10;
  const baseSkillPoints = Math.round(skillRatio * 50);
  const overallMatchScore = Math.min(Math.max(baseSkillPoints + verifiedBonus + eduPoints + expPoints, 35), 98);

  // Authentic Strengths
  const strengths: string[] = [];
  if (matchingSkills.length > 0) {
    const verifiedNames = matchingSkills.filter((s) => s.verified).map((s) => s.name);
    if (verifiedNames.length > 0) {
      strengths.push(`Verified competency in core requirements: ${verifiedNames.join(', ')}.`);
    } else {
      strengths.push(`Documented experience in matching technologies: ${matchingSkills.map((s) => s.name).slice(0, 4).join(', ')}.`);
    }
  }
  if (student?.cgpa && parseFloat(student.cgpa) >= 3.5) {
    strengths.push(`Strong academic standing with CGPA of ${student.cgpa}.`);
  }
  if (student?.projects && student.projects.length > 0) {
    strengths.push(`${student.projects.length} documented portfolio projects demonstrating hands-on implementation ability.`);
  } else {
    strengths.push(`Strong foundational coursework in Computer Science principles and software development.`);
  }

  // Potential Concerns
  const potentialConcerns: string[] = [];
  if (missingSkills.length > 0) {
    potentialConcerns.push(`Candidate has not yet verified: ${missingSkills.slice(0, 3).map((s) => s.name).join(', ')}.`);
  }
  if (!experienceEligibility.eligible) {
    potentialConcerns.push(`Job description mentions prior experience requirements. Address this with practical project metrics.`);
  }
  if (potentialConcerns.length === 0) {
    potentialConcerns.push(`High applicant volume typical for ${jobDetails.company}; personalized outreach recommended.`);
  }

  // Recommended Prep Steps
  const recommendedPrepSteps: string[] = [];
  if (missingSkills.length > 0) {
    recommendedPrepSteps.push(`Review fundamental syntax and standard design patterns for ${missingSkills[0].name}.`);
  }
  recommendedPrepSteps.push(`Tailor resume summary to highlight relevant coursework and matching skills (${matchingSkills.slice(0, 3).map((s) => s.name).join(', ')}).`);
  recommendedPrepSteps.push(`Prepare structured STAR stories for student projects emphasizing architectural trade-offs and impact.`);
  recommendedPrepSteps.push(`Connect with recruiters or university alumni at ${jobDetails.company} on LinkedIn using the provided template.`);

  const deterministicResult: MatchAnalysisResult = {
    overallMatchScore,
    roleTitle: jobDetails.title,
    company: jobDetails.company,
    matchingSkills,
    missingSkills,
    educationEligibility,
    experienceEligibility,
    workArrangementEligibility,
    opportunityEligibility,
    strengths,
    potentialConcerns,
    recommendedPrepSteps,
    analyzedAt: new Date().toISOString(),
  };

  // If Gemini is available, refine analysis with AI intelligence
  if (aiClient) {
    try {
      const prompt = `You are a Senior University Recruiter and Career Assessment Director.
Analyze this student applicant against a real job opening.

JOB DETAILS:
- Title: ${jobDetails.title}
- Company: ${jobDetails.company}
- Location: ${jobDetails.location || 'Anywhere'}
- Work Arrangement: ${jobDetails.workArrangement || 'Not specified'}
- Job Description:
${(jobDetails.description || 'Entry level software engineering position focusing on frontend, backend, or cloud systems.').slice(0, 1500)}

STUDENT CANDIDATE PROFILE:
- Degree: ${studentDegree} (${student?.institution || 'University'})
- Graduation: ${gradYear} (${student?.studentType || 'Student'})
- Verified Skills: ${verifiedList.map((s) => s.name).join(', ') || 'None'}
- All Tracked Skills: ${Array.from(allStudentSkillsMap.keys()).join(', ')}
- Documented Projects: ${student?.projects?.map((p) => `${p.title} (${p.techStack.join(', ')})`).join('; ') || 'None'}

STRICT GROUNDING RULES:
1. Base strengths ONLY on the student's authentic data above. Do not hallucinate past full-time work or commercial employers.
2. Calculate an honest, calibrated match score from 0 to 100.
3. Identify matching skills and missing skills accurately based on the job requirements.

Return ONLY a valid JSON object matching this schema:
{
  "overallMatchScore": number,
  "matchingSkills": [
    { "name": "string", "verified": boolean, "source": "string" }
  ],
  "missingSkills": [
    { "name": "string", "priority": "high"|"medium"|"low", "reason": "string" }
  ],
  "strengths": ["string", "string"],
  "potentialConcerns": ["string", "string"],
  "recommendedPrepSteps": ["string", "string", "string"]
}`;

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withTimeout(
            aiClient.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            }),
            REQUEST_TIMEOUT_MS
          );

          const text = res.text?.trim() || '';
          const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(cleaned);

          if (typeof parsed.overallMatchScore === 'number' && Array.isArray(parsed.matchingSkills)) {
            return {
              ...deterministicResult,
              overallMatchScore: Math.min(Math.max(Math.round(parsed.overallMatchScore), 25), 98),
              matchingSkills: parsed.matchingSkills.length > 0 ? parsed.matchingSkills : deterministicResult.matchingSkills,
              missingSkills: Array.isArray(parsed.missingSkills) && parsed.missingSkills.length > 0 ? parsed.missingSkills : deterministicResult.missingSkills,
              strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : deterministicResult.strengths,
              potentialConcerns: Array.isArray(parsed.potentialConcerns) && parsed.potentialConcerns.length > 0 ? parsed.potentialConcerns : deterministicResult.potentialConcerns,
              recommendedPrepSteps: Array.isArray(parsed.recommendedPrepSteps) && parsed.recommendedPrepSteps.length > 0 ? parsed.recommendedPrepSteps : deterministicResult.recommendedPrepSteps,
            };
          }
        } catch (innerErr) {
          console.warn(`[ApplicationAssistant] Model ${model} failed, trying next:`, innerErr);
        }
      }
    } catch (e) {
      console.warn('[ApplicationAssistant] Gemini analysis failed, using deterministic result:', e);
    }
  }

  return deterministicResult;
}

// ============================================================================
// 2. JOB-SPECIFIC APPLICATION PREPARATION ENGINE
// ============================================================================

export async function generateApplicationMaterials(
  userId: string,
  jobDetails: JobDetails,
  resumeData?: any
): Promise<ApplicationMaterialsResult> {
  const profileSummary = await getCareerProfileSummary(userId);
  const student = profileSummary.studentProfile;
  const userName = profileSummary.name || 'Applicant';
  const studentEmail = profileSummary.email || 'applicant@email.com';
  const studentDegree = student?.degree || 'Bachelor of Science in Computer Science';
  const studentInstitution = student?.institution || 'University';
  const gradYear = student?.graduationYear || new Date().getFullYear();
  const targetRole = jobDetails.title || student?.targetRole || 'Software Engineer';
  const companyName = jobDetails.company || 'the Company';

  // Extract student verified and tracked skills
  const verifiedNames = (profileSummary.skills?.verified || []).map((s) => s.name);
  const claimedNames = (profileSummary.skills?.claimed || []).map((s) => s.name);
  const inferredNames = (profileSummary.skills?.inferred || []).map((s) => s.name);
  const allSkills = Array.from(new Set([
    ...verifiedNames,
    ...claimedNames,
    ...inferredNames,
  ]));

  // Genuine student projects
  const studentProjects = student?.projects || [];

  // Deterministic Tailored Summary
  const topTech = verifiedNames.slice(0, 4).join(', ') || allSkills.slice(0, 4).join(', ') || 'modern software engineering';
  const deterministicSummary = `Motivated ${studentDegree} graduate (Class of ${gradYear}) from ${studentInstitution} with hands-on proficiency in ${topTech}. Eager to contribute to ${companyName} as a ${targetRole}, bringing a solid foundation in software architecture, clean code standards, and agile project delivery proven through academic and open-source development.`;

  // Deterministic Improved Projects (NEVER invent new projects, only enhance existing verified student projects)
  const deterministicImprovedProjects: ImprovedProjectItem[] = studentProjects.map((p) => {
    const tech = (p.techStack || []).join(', ');
    const originalBullets = p.bullets && p.bullets.length > 0
      ? p.bullets
      : p.highlights && p.highlights.length > 0
      ? p.highlights
      : [p.description || 'Full-stack software application.'];

    return {
      originalTitle: p.title,
      improvedTitle: p.title,
      technologies: p.techStack || [],
      originalBullets,
      tailoredBullets: originalBullets.map((bullet: string) => {
        if (/engineered|developed|implemented|architected/i.test(bullet)) {
          return `${bullet.trim().replace(/\.$/, '')}, ensuring modular code quality and high responsiveness for end users.`;
        }
        return `Architected and implemented responsive features using ${tech || 'modern tech stack'}, focusing on performance and reliable data handling.`;
      }),
      alignmentNote: `Highlights technical rigor and practical implementation of ${tech || 'core technologies'} directly relevant to ${targetRole} requirements at ${companyName}.`,
    };
  });

  // Skills to highlight
  const skillsToHighlight: HighlightSkillItem[] = allSkills.slice(0, 6).map((skill, idx) => ({
    skill,
    relevance: `Directly matches core technologies sought for ${targetRole} positions at ${companyName}.`,
    whereToShow: idx < 2 ? 'summary' : idx < 4 ? 'skills' : 'projects',
  }));

  // Deterministic 4-Paragraph Cover Letter
  const projectHighlight = studentProjects.length > 0
    ? `During my academic tenure, I architected "${studentProjects[0].title}", building core features using ${(studentProjects[0].techStack || []).join(', ') || 'modern technologies'}. This experience strengthened my ability to translate complex specifications into maintainable, production-ready code.`
    : `Through rigorous coursework and hands-on laboratory implementations in Data Structures, Algorithms, and System Design, I have developed disciplined problem-solving methodologies and automated testing standards.`;

  const coverLetterOpening = `I am writing to express my enthusiastic interest in the ${targetRole} position at ${companyName}. As a ${studentDegree} student at ${studentInstitution} graduating in ${gradYear}, I have followed ${companyName}'s impactful engineering work and am excited about the opportunity to bring my technical skills and collaborative work ethic to your team.`;

  const coverLetterBody1 = `My academic background and technical projects have equipped me with solid foundations in ${topTech}. ${projectHighlight} I take pride in writing clean, well-tested code and thrive in collaborative environments where performance and reliability are paramount.`;

  const coverLetterBody2 = `What excites me most about ${companyName} is your commitment to engineering excellence and user-centric innovation. I am particularly eager to apply my knowledge of ${verifiedNames[0] || 'software development'} to help build scalable, resilient solutions while learning from your experienced engineering leaders.`;

  const coverLetterClosing = `Thank you for your time and consideration. I would welcome the opportunity to discuss how my academic training, project portfolio, and eager mindset align with the goals of the engineering team at ${companyName}. I look forward to speaking with you.`;

  const fullCoverLetterText = `Dear Hiring Team,\n\n${coverLetterOpening}\n\n${coverLetterBody1}\n\n${coverLetterBody2}\n\n${coverLetterClosing}\n\nSincerely,\n${userName}\n${studentEmail}`;
  const wordCount = fullCoverLetterText.split(/\s+/).filter(Boolean).length;

  // Deterministic Application Email Draft
  const emailDraft: ApplicationEmailData = {
    subject: `Application: ${targetRole} – ${userName}`,
    recipientPlaceholder: 'hiring-team@company.com',
    body: `Dear Hiring Team at ${companyName},\n\nI hope this message finds you well. I am writing to apply for the ${targetRole} position at ${companyName}.\n\nAs a ${studentDegree} graduate from ${studentInstitution} (Class of ${gradYear}), I specialize in ${topTech}. I have attached my resume and cover letter for your review, highlighting my hands-on portfolio projects and verified technical skills.\n\nI would be thrilled to contribute to ${companyName}'s engineering milestones and welcome the opportunity to connect for an interview.\n\nThank you for your consideration.\n\nWarm regards,\n\n${userName}\n${studentEmail}`,
  };

  // Deterministic Recruiter Outreach Message
  const linkedInNote = `Hi! I recently applied for the ${targetRole} role at ${companyName}. As a ${studentDegree} student from ${studentInstitution} proficient in ${verifiedNames[0] || 'software development'}, I'm passionate about your work and would love to connect. Thank you!`.slice(0, 298);

  const recruiterEmail = {
    subject: `Prospective Candidate: ${targetRole} – ${userName}`,
    body: `Hello,\n\nI hope you are having a wonderful week.\n\nI recently submitted my application for the ${targetRole} opportunity at ${companyName}. Given ${companyName}'s impressive growth, I wanted to introduce myself directly.\n\nI am completing my ${studentDegree} at ${studentInstitution} with verified competencies in ${topTech}. I would appreciate the opportunity to learn more about the team's upcoming initiatives and how my technical background can add immediate value.\n\nBest regards,\n\n${userName}\n${studentEmail}`,
  };

  const deterministicMaterials: ApplicationMaterialsResult = {
    tailoredSummary: deterministicSummary,
    improvedProjects: deterministicImprovedProjects,
    skillsToHighlight,
    coverLetter: {
      subject: `Application for ${targetRole} – ${userName}`,
      salutation: 'Dear Hiring Team,',
      openingParagraph: coverLetterOpening,
      bodyParagraph1: coverLetterBody1,
      bodyParagraph2: coverLetterBody2,
      closingParagraph: coverLetterClosing,
      signoff: `Sincerely,\n${userName}`,
      fullText: fullCoverLetterText,
      wordCount,
    },
    applicationEmailDraft: emailDraft,
    recruiterOutreach: {
      linkedInNote,
      linkedInNoteLength: linkedInNote.length,
      recruiterEmail,
    },
    generatedAt: new Date().toISOString(),
    provider: 'deterministic',
    isLiveAi: false,
  };

  // If Gemini is available, refine materials using high-leverage contextual generation
  if (aiClient) {
    try {
      const prompt = `You are a Principal Technical Career Coach and Executive Hiring Partner.
Generate tailored application materials for a college student applying for a specific job.

JOB TARGET:
- Role: ${targetRole}
- Company: ${companyName}
- Job Description:
${(jobDetails.description || 'Software Engineer position requiring clean code, problem solving, and modern frameworks.').slice(0, 1200)}

AUTHENTIC STUDENT FACTS (DO NOT FABRICATE):
- Name: ${userName}
- Degree: ${studentDegree} (${studentInstitution}, Class of ${gradYear})
- CGPA: ${student?.cgpa || 'Good Standing'}
- Verified Skills: ${verifiedNames.join(', ') || 'Software Development, Problem Solving'}
- All Skills: ${allSkills.join(', ')}
- Student Projects: ${JSON.stringify(studentProjects.map((p) => ({ title: p.title, tech: p.techStack, bullets: p.bullets || p.highlights || [p.description] })))}

STRICT RULES:
1. NEVER fabricate previous corporate employment, senior job titles, or commercial revenue metrics.
2. Only rewrite the student's REAL projects listed above using Google's X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".
3. Cover letter must be exactly 4 structured paragraphs:
   - Paragraph 1: Enthusiastic opening, target role, school, graduation year, alignment with company mission.
   - Paragraph 2: Core technical capabilities and specific highlight of their student project.
   - Paragraph 3: Why this specific company inspires them and cultural fit.
   - Paragraph 4: Professional closing and call to action for an interview.
4. LinkedIn note MUST be <= 300 characters.

Return ONLY a valid JSON object matching this schema:
{
  "tailoredSummary": "string",
  "improvedProjects": [
    {
      "originalTitle": "string",
      "improvedTitle": "string",
      "technologies": ["string"],
      "originalBullets": ["string"],
      "tailoredBullets": ["string"],
      "alignmentNote": "string"
    }
  ],
  "skillsToHighlight": [
    { "skill": "string", "relevance": "string", "whereToShow": "summary"|"skills"|"projects" }
  ],
  "coverLetter": {
    "openingParagraph": "string",
    "bodyParagraph1": "string",
    "bodyParagraph2": "string",
    "closingParagraph": "string"
  },
  "recruiterOutreach": {
    "linkedInNote": "string",
    "emailSubject": "string",
    "emailBody": "string"
  }
}`;

      for (const model of CANDIDATE_GEMINI_MODELS) {
        try {
          const res = await withTimeout(
            aiClient.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.25,
                responseMimeType: 'application/json',
              },
            }),
            REQUEST_TIMEOUT_MS
          );

          const text = res.text?.trim() || '';
          const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(cleaned);

          if (parsed.tailoredSummary && parsed.coverLetter) {
            const clOpening = parsed.coverLetter.openingParagraph || coverLetterOpening;
            const clB1 = parsed.coverLetter.bodyParagraph1 || coverLetterBody1;
            const clB2 = parsed.coverLetter.bodyParagraph2 || coverLetterBody2;
            const clClosing = parsed.coverLetter.closingParagraph || coverLetterClosing;
            const assembledCl = `Dear Hiring Team,\n\n${clOpening}\n\n${clB1}\n\n${clB2}\n\n${clClosing}\n\nSincerely,\n${userName}\n${studentEmail}`;

            const note = (parsed.recruiterOutreach?.linkedInNote || linkedInNote).slice(0, 300);

            return {
              tailoredSummary: parsed.tailoredSummary || deterministicSummary,
              improvedProjects: Array.isArray(parsed.improvedProjects) && parsed.improvedProjects.length > 0
                ? parsed.improvedProjects
                : deterministicImprovedProjects,
              skillsToHighlight: Array.isArray(parsed.skillsToHighlight) && parsed.skillsToHighlight.length > 0
                ? parsed.skillsToHighlight
                : skillsToHighlight,
              coverLetter: {
                subject: `Application for ${targetRole} – ${userName}`,
                salutation: 'Dear Hiring Team,',
                openingParagraph: clOpening,
                bodyParagraph1: clB1,
                bodyParagraph2: clB2,
                closingParagraph: clClosing,
                signoff: `Sincerely,\n${userName}`,
                fullText: assembledCl,
                wordCount: assembledCl.split(/\s+/).filter(Boolean).length,
              },
              applicationEmailDraft: {
                subject: parsed.recruiterOutreach?.emailSubject || emailDraft.subject,
                recipientPlaceholder: 'hiring-team@company.com',
                body: parsed.recruiterOutreach?.emailBody || emailDraft.body,
              },
              recruiterOutreach: {
                linkedInNote: note,
                linkedInNoteLength: note.length,
                recruiterEmail: {
                  subject: parsed.recruiterOutreach?.emailSubject || recruiterEmail.subject,
                  body: parsed.recruiterOutreach?.emailBody || recruiterEmail.body,
                },
              },
              generatedAt: new Date().toISOString(),
              provider: 'gemini',
              isLiveAi: true,
            };
          }
        } catch (innerErr) {
          console.warn(`[ApplicationAssistant] Model ${model} generation failed, trying next:`, innerErr);
        }
      }
    } catch (e) {
      console.warn('[ApplicationAssistant] Gemini preparation failed, using deterministic materials:', e);
    }
  }

  return deterministicMaterials;
}

// ============================================================================
// 3. AI FOLLOW-UP ASSISTANCE ENGINE
// ============================================================================

export function generateFollowUpMessage(params: GenerateFollowUpParams): FollowUpResult {
  const {
    jobTitle,
    company,
    appliedAt,
    interviewDate,
    type,
    channel = 'email',
    studentName,
  } = params;

  const now = new Date();
  let daysElapsed = 0;

  if (type === 'post_application' && appliedAt) {
    const applyDate = new Date(appliedAt);
    if (!isNaN(applyDate.getTime())) {
      const diffMs = now.getTime() - applyDate.getTime();
      daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  } else if (type === 'post_interview' && interviewDate) {
    const intDate = new Date(interviewDate);
    if (!isNaN(intDate.getTime())) {
      const diffMs = now.getTime() - intDate.getTime();
      daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  if (type === 'post_application') {
    let timingStatus: 'optimal' | 'early' | 'overdue' = 'optimal';
    let timingNote = '5 to 7 business days have passed—ideal time to check in professionally.';

    if (daysElapsed < 5) {
      timingStatus = 'early';
      timingNote = `It has been ${daysElapsed} day(s) since applying. Most recruiters recommend waiting 5–7 business days before sending a follow-up.`;
    } else if (daysElapsed > 14) {
      timingStatus = 'overdue';
      timingNote = `Over two weeks have elapsed since applying. A polite status check is highly appropriate.`;
    }

    if (channel === 'linkedin') {
      const message = `Hi! I wanted to follow up on my recent application for the ${jobTitle} position at ${company}. I remain very enthusiastic about the opportunity and would love to answer any questions or provide additional work samples. Thanks for your time! – ${studentName}`;
      return {
        type: 'post_application',
        timingStatus,
        timingNote,
        subject: `Follow-up: ${jobTitle} Application`,
        message,
        channel: 'linkedin',
        tips: [
          'Keep LinkedIn messages brief, friendly, and non-presumptuous.',
          'Send directly to the university recruiter or talent acquisition specialist if known.',
          'Never follow up more than twice without a response.',
        ],
      };
    }

    // Default: Email
    const subject = `Following Up: Application for ${jobTitle} – ${studentName}`;
    const message = `Dear Hiring Team at ${company},

I hope this email finds you well.

I am writing to respectfully follow up on the application I submitted for the ${jobTitle} position${appliedAt ? ` on ${new Date(appliedAt).toLocaleDateString()}` : ''}.

I remain very excited about the prospect of joining ${company} and contributing my technical skills and problem-solving drive to your team. Please let me know if there are any additional materials, portfolio links, or questions I can provide to assist in your evaluation.

Thank you very much for your time and consideration.

Warm regards,

${studentName}`;

    return {
      type: 'post_application',
      timingStatus,
      timingNote,
      subject,
      message,
      channel: 'email',
      tips: [
        'Send Tuesday through Thursday morning (9 AM – 11 AM) for highest open rates.',
        'Reply in the same email thread as your initial application confirmation if available.',
        'Proofread carefully to ensure company name and job title are 100% accurate.',
      ],
    };
  }

  // Type: post_interview
  let timingStatus: 'optimal' | 'early' | 'overdue' = 'optimal';
  let timingNote = 'Sending a thank-you note within 24 to 48 hours of an interview leaves a strong impression.';

  if (daysElapsed > 2) {
    timingStatus = 'overdue';
    timingNote = `${daysElapsed} days have passed since your interview. Send this check-in promptly to maintain momentum.`;
  }

  if (channel === 'linkedin') {
    const message = `Hi! Thank you for the insightful conversation regarding the ${jobTitle} role at ${company}. I really enjoyed learning more about the team's engineering goals and remain very excited about the opportunity. Wishing you a great week! – ${studentName}`;
    return {
      type: 'post_interview',
      timingStatus,
      timingNote,
      subject: `Thank You – ${jobTitle} Interview`,
      message,
      channel: 'linkedin',
      tips: [
        'Reference a specific technical topic discussed during your interview.',
        'Reiterate genuine enthusiasm for the company and team culture.',
        'Send within 24 hours of concluding your conversation.',
      ],
    };
  }

  // Default: Post-interview Email
  const subject = `Thank You – ${jobTitle} Interview with ${company}`;
  const message = `Dear Interview Team,

Thank you very much for taking the time to speak with me${interviewDate ? ` on ${new Date(interviewDate).toLocaleDateString()}` : ' recently'} regarding the ${jobTitle} opportunity at ${company}.

I truly enjoyed learning more about the team's engineering architecture and upcoming roadmap milestones. Our conversation reinforced my strong enthusiasm for joining ${company} and applying my technical background to help solve challenging problems.

Please let me know if you need any follow-up code samples or references. I look forward to hearing about the next steps in the process.

Best regards,

${studentName}`;

  return {
    type: 'post_interview',
    timingStatus,
    timingNote,
    subject,
    message,
    channel: 'email',
    tips: [
      'Personalize the note with 1 specific detail or question discussed in your session.',
      'Send within 24 hours while the conversation is fresh in the interviewer’s mind.',
      'Keep it concise, gracious, and focused on shared value.',
    ],
  };
}
