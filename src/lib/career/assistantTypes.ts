// Shared types and pure calculation helpers for AI Job Application Assistant
// Safe to import in both Client Components and Server Components.

export interface JobDetails {
  id?: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  salary?: string;
  workArrangement?: 'remote' | 'hybrid' | 'on_site' | 'flexible' | string;
  opportunityType?: 'internship' | 'fresher' | 'full_time' | string;
  requiredSkills?: string[];
  educationRequirement?: string;
  experienceRequirement?: string;
}

export interface MatchSkillItem {
  name: string;
  category?: string;
  verified: boolean;
  source: string;
}

export interface MissingSkillItem {
  name: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface EligibilityDetail {
  eligible: boolean;
  status: 'eligible' | 'near_match' | 'review_needed';
  required: string;
  actual: string;
  note: string;
}

export interface MatchAnalysisResult {
  overallMatchScore: number;
  roleTitle: string;
  company: string;
  matchingSkills: MatchSkillItem[];
  missingSkills: MissingSkillItem[];
  educationEligibility: EligibilityDetail;
  experienceEligibility: EligibilityDetail;
  workArrangementEligibility: {
    preferred: string;
    jobOffered: string;
    isMatch: boolean;
    note: string;
  };
  opportunityEligibility: {
    studentType: string;
    jobType: string;
    eligible: boolean;
    note: string;
  };
  strengths: string[];
  potentialConcerns: string[];
  recommendedPrepSteps: string[];
  analyzedAt: string;
}

export interface ImprovedProjectItem {
  originalTitle: string;
  improvedTitle: string;
  technologies: string[];
  originalBullets: string[];
  tailoredBullets: string[];
  alignmentNote: string;
}

export interface HighlightSkillItem {
  skill: string;
  relevance: string;
  whereToShow: 'summary' | 'skills' | 'projects';
}

export interface CoverLetterData {
  subject: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraph1: string;
  bodyParagraph2: string;
  closingParagraph: string;
  signoff: string;
  fullText: string;
  wordCount: number;
}

export interface ApplicationEmailData {
  subject: string;
  recipientPlaceholder: string;
  body: string;
}

export interface RecruiterOutreachData {
  linkedInNote: string;
  linkedInNoteLength: number;
  recruiterEmail: {
    subject: string;
    body: string;
  };
}

export interface ApplicationMaterialsResult {
  tailoredSummary: string;
  improvedProjects: ImprovedProjectItem[];
  skillsToHighlight: HighlightSkillItem[];
  coverLetter: CoverLetterData;
  applicationEmailDraft: ApplicationEmailData;
  recruiterOutreach: RecruiterOutreachData;
  generatedAt: string;
  provider?: 'gemini' | 'deterministic';
  isLiveAi?: boolean;
}

export interface ApplicationChecklistState {
  eligibilityChecked: boolean;
  resumeTailored: boolean;
  resumeReviewed: boolean;
  coverLetterPrepared: boolean;
  documentsChecked: boolean;
  linkVerified: boolean;
  applicationSubmitted: boolean;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  appliedAtConfirmed?: string | null;
}

export interface FollowUpResult {
  type: 'post_application' | 'post_interview';
  timingStatus: 'optimal' | 'early' | 'overdue';
  timingNote: string;
  subject: string;
  message: string;
  channel: 'email' | 'linkedin';
  tips: string[];
}

export interface GenerateFollowUpParams {
  applicationId?: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt?: string | null;
  interviewDate?: string | null;
  type: 'post_application' | 'post_interview';
  channel?: 'email' | 'linkedin';
  studentName: string;
  notes?: string;
}

// Pure Checklist Helpers
export function getDefaultChecklistState(): ApplicationChecklistState {
  return {
    eligibilityChecked: false,
    resumeTailored: false,
    resumeReviewed: false,
    coverLetterPrepared: false,
    documentsChecked: false,
    linkVerified: false,
    applicationSubmitted: false,
    completedSteps: 0,
    totalSteps: 7,
    percentage: 0,
    appliedAtConfirmed: null,
  };
}

export function computeChecklistProgress(
  state: Partial<ApplicationChecklistState>
): ApplicationChecklistState {
  const steps = [
    Boolean(state.eligibilityChecked),
    Boolean(state.resumeTailored),
    Boolean(state.resumeReviewed),
    Boolean(state.coverLetterPrepared),
    Boolean(state.documentsChecked),
    Boolean(state.linkVerified),
    Boolean(state.applicationSubmitted),
  ];
  const completed = steps.filter(Boolean).length;
  const total = steps.length;
  const percentage = Math.round((completed / total) * 100);

  return {
    eligibilityChecked: Boolean(state.eligibilityChecked),
    resumeTailored: Boolean(state.resumeTailored),
    resumeReviewed: Boolean(state.resumeReviewed),
    coverLetterPrepared: Boolean(state.coverLetterPrepared),
    documentsChecked: Boolean(state.documentsChecked),
    linkVerified: Boolean(state.linkVerified),
    applicationSubmitted: Boolean(state.applicationSubmitted),
    completedSteps: completed,
    totalSteps: total,
    percentage,
    appliedAtConfirmed: state.appliedAtConfirmed || (state.applicationSubmitted ? new Date().toISOString() : null),
  };
}

