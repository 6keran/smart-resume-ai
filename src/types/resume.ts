export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline?: string;
  title?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  department?: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  employmentType?: string;
  bulletPoints: string[];
  achievements?: string[];
  technologies?: string[];
}

export interface EducationItem {
  id: string;
  qualification?: string;
  degree: string;
  institution: string;
  university?: string;
  location?: string;
  startDate?: string;
  graduationYear: string;
  gpa?: string;
  honors?: string;
  current?: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  objective?: string;
  technologies: string[];
  role?: string;
  outcome?: string;
  startDate?: string;
  endDate?: string;
  link?: string;
  bullets?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  type?: string;
  date: string;
  duration?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
}

export interface SkillGroupItem {
  name: string;
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface SkillCategoryGroup {
  category: string;
  skills: Array<SkillGroupItem | string>;
}

export interface AchievementItem {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  result?: string;
}

export interface LanguageItem {
  id?: string;
  name: string;
  proficiency?: 'Native' | 'Fluent' | 'Professional' | 'Intermediate' | 'Conversational' | 'Basic';
}

export interface AdditionalInfo {
  noticePeriod?: string;
  relocation?: string;
  shiftAvailability?: string;
  shiftPreference?: string;
  drivingLicence?: string;
  memberships?: string[];
  other?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content?: string;
  items?: string[];
}

export interface ResumeData {
  id: string;
  title: string;
  candidateType: 'experienced' | 'fresher';
  personalInfo: PersonalInfo;
  summary: string;
  objective?: string;
  summaryType?: 'summary' | 'objective' | 'both';
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
    categories?: SkillCategoryGroup[];
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  languages?: Array<string | LanguageItem>;
  achievements?: Array<string | AchievementItem>;
  additionalInfo?: AdditionalInfo;
  customSections?: CustomSection[];
  hiddenSections?: string[];
  sectionOrder?: string[];
  templateId: ResumeTemplateId;
  lastUpdated: string;
}

export type ResumeTemplateId =
  // 12 Distinct Professional Templates & Aliases
  | 'classic-professional'
  | 'ats-classic'
  | 'ats-professional'
  | 'modern-corporate'
  | 'corporate-executive'
  | 'executive-leadership'
  | 'executive-professional'
  | 'executive'
  | 'engineering-professional'
  | 'software-engineer'
  | 'engineering'
  | 'engineering-manufacturing'
  | 'manufacturing-operations'
  | 'operations-management'
  | 'software-developer'
  | 'full-stack-developer'
  | 'fresher-graduate'
  | 'graduate-fresher'
  | 'fresh-graduate'
  | 'fresher'
  | 'minimalist-ats'
  | 'ats-minimal'
  | 'modern-minimalist'
  | 'minimalist'
  | 'minimal-professional'
  | 'academic-research'
  | 'academic'
  | 'professional-sidebar'
  | 'modern-two-column'
  | 'contemporary'
  | 'compact-one-page'
  | 'experienced'
  | 'experienced-professional'
  | 'data-analyst'
  | 'ui-ux-designer'
  | 'internship-applicant'
  | 'sales-marketing'
  // Existing / Legacy references for backward compatibility
  | 'modern-professional'
  | 'creative-professional'
  | 'thomas-hamptone'
  | 'nick-koe'
  | 'richard-sanchez'
  | 'olivia-wilson-grid'
  | 'olivia-wilson-blush'
  | 'modern-ats'
  | 'tech-professional'
  | 'data-ai'
  | 'corporate'
  | 'minimal'
  | 'graduate-entry';

export interface ResumeTemplateInfo {
  id: ResumeTemplateId;
  name: string;
  category: string;
  description: string;
  styleDescription: string;
  isAtsFriendly: boolean;
  atsScoreRating: number; // e.g., 99
  isPopular?: boolean;
  tags?: string[];
  intendedUse?: string;
  isVisualLayout?: boolean;
}

export interface AnalysisWeakness {
  id: string;
  section: string;
  whatIsWrong: string;
  whyItMatters: string;
  howToImprove: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AnalysisStrength {
  id: string;
  section: string;
  title: string;
  description: string;
}

export interface AnalysisRecommendation {
  id: string;
  category: string;
  title: string;
  actionText: string;
  originalText?: string;
  improvedText?: string;
  impact: string;
  extractedText?: string;
}

export interface PrioritizedSuggestion {
  id: string;
  rank: number;
  priority: 'High' | 'Medium' | 'Low';
  section: string;
  whatNeedsImprovement: string;
  whyItMatters: string;
  howToImprove: string;
  example?: string;
  extractedText?: string;
}

export interface TargetJobContext {
  title: string;
  company: string;
  description: string;
}

export interface MatchedSkillItem {
  skill: string;
  status: 'matched' | 'partial' | 'missing';
  context?: string;
}

export interface ResumeAnalysisResult {
  overallAtsScore: number;
  keywordMatchScore: number;
  formattingScore: number;
  contentScore: number;
  sectionScore: number;
  wordCount: number;
  readabilityScore: number;
  bulletStrengthScore?: number;
  detectedKeywords: string[];
  missingKeywords: string[];
  missingSections?: string[];
  detectedSections?: string[];
  strengths: AnalysisStrength[];
  weaknesses: AnalysisWeakness[];
  recommendations: AnalysisRecommendation[];
  topSuggestions: PrioritizedSuggestion[];
  summaryFeedback: string;
  analyzedAt: string;
  // Job-specific tailoring attributes
  isJobSpecific?: boolean;
  jobTitle?: string;
  company?: string;
  matchedSkills?: MatchedSkillItem[];
  missingSkills?: string[];
  // Provenance / attribution
  analysisEngine?: 'gemini' | 'deterministic-ats';
  engineDisplayName?: string;
  resumeId?: string | null;
  // Advanced Resume Intelligence additions
  sectionScores?: Record<string, { score: number; status: 'excellent' | 'adequate' | 'needs_work' | 'missing'; feedback: string[] }> | any;
  evidenceConsistency?: {
    totalSkillsCount: number;
    backedSkillsCount: number;
    unbackedSkills: Array<{ skill: string; isBackedByEvidence: boolean; warning?: string }>;
    consistencyScore: number;
  };
  duplicateContent?: Array<{ type: string; text: string; count: number; suggestion: string }>;
  readabilityMetrics?: {
    averageBulletWordCount: number;
    optimalWordCountRatio: number;
    passiveVoiceInstances: string[];
    metricDensityPercentage: number;
    readabilityLevel: string;
  };
  missingInformationAlerts?: Array<{ field: string; importance: 'critical' | 'recommended'; message: string }>;
  jobAlignmentAnalysis?: {
    jobTitle?: string;
    company?: string;
    alignmentScore: number;
    matchedSkills: string[];
    missingCriticalKeywords: string[];
    missingPreferredKeywords: string[];
    recommendedInsertionPoints: Array<{ keyword: string; targetSection: string; suggestedContext: string }>;
  };
}

export interface ImprovementItem {
  id: string;
  section: 'summary' | 'experience' | 'projects' | 'skills' | 'education';
  field: string;
  originalContent: string;
  improvedContent: string;
  reasoning: string;
  metricImpact?: string;
  status: 'pending' | 'accepted' | 'rejected';
  targetIndex?: number;
  targetBulletIndex?: number;
  isJobTailored?: boolean;
  diff?: {
    before: string;
    after: string;
  };
}

export type ResumeValidationStatus = 'valid' | 'invalid' | 'uncertain';

export type ResumeValidationReasonCode =
  | 'VALID_RESUME'
  | 'INSUFFICIENT_SIGNALS'
  | 'NON_RESUME_INVOICE'
  | 'NON_RESUME_ASSIGNMENT'
  | 'NON_RESUME_CERTIFICATE'
  | 'NON_RESUME_REPORT'
  | 'NON_RESUME_LEGAL_CONTRACT'
  | 'NON_RESUME_GENERIC_TEXT'
  | 'EMPTY_OR_CORRUPT'
  | 'UNCERTAIN_STRUCTURE';

export interface ResumeValidationSignals {
  hasContactInfo: boolean;
  hasExperienceOrInternship: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasProjectsOrAchievements: boolean;
  hasSummaryOrObjective: boolean;
  hasChronology: boolean;
  detectedSections: string[];
  negativeIndicators: string[];
}

export interface ResumeValidationResult {
  status: ResumeValidationStatus;
  isValid: boolean;
  confidence: number;
  message: string;
  reasonCode: ResumeValidationReasonCode;
  detectedType?: string;
  signals: ResumeValidationSignals;
}

/**
 * Determines whether a resume ID is a transient client-side template, sample,
 * or draft placeholder rather than a canonical persisted database record.
 */
export function isClientDraftResumeId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return true;
  const trimmed = id.trim();
  if (!trimmed || trimmed === 'res_default') return true;
  return /^(res_default|res_fresher|res_sample|fresher_|exp_|sparse_|draft_|demo_|temp_)/i.test(trimmed);
}
