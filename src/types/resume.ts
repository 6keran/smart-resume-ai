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
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bulletPoints: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  graduationYear: string;
  gpa?: string;
  honors?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  bullets?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface ResumeData {
  id: string;
  title: string;
  candidateType: 'experienced' | 'fresher';
  personalInfo: PersonalInfo;
  summary: string;
  skills: {
    technical: string[];
    soft: string[];
    tools: string[];
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  templateId: ResumeTemplateId;
  lastUpdated: string;
}

export type ResumeTemplateId =
  // 12 Production SaaS Templates
  | 'ats-classic'
  | 'software-engineer'
  | 'graduate-fresher'
  | 'fresh-graduate'
  | 'executive-professional'
  | 'corporate-executive'
  | 'data-analyst'
  | 'ui-ux-designer'
  | 'full-stack-developer'
  | 'internship-applicant'
  | 'academic-research'
  | 'academic'
  | 'sales-marketing'
  | 'operations-management'
  | 'modern-two-column'
  | 'contemporary'
  // Existing / Legacy references for backward compatibility
  | 'modern-professional'
  | 'minimalist'
  | 'creative-professional'
  | 'compact-one-page'
  | 'experienced-professional'
  | 'thomas-hamptone'
  | 'nick-koe'
  | 'richard-sanchez'
  | 'olivia-wilson-grid'
  | 'olivia-wilson-blush'
  | 'modern-ats'
  | 'tech-professional'
  | 'executive'
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
