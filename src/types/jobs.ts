import { SupportedSkill } from './skills';
export * from '@/lib/jobs/types';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  location: string;
  workplaceType: 'Remote' | 'Hybrid' | 'On-site';
  jobType: 'Full-time' | 'Contract' | 'Part-time';
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead';
  salaryRange?: string;
  postedDate: string;
  description: string;
  requiredSkills: (SupportedSkill | string)[];
  preferredSkills: (SupportedSkill | string)[];
  responsibilities: string[];
  educationRequirement: string;
  experienceYears: string;
  applyUrl: string;
}

export interface SkillMatchDetail {
  skill: string;
  status: 'matched' | 'partial' | 'missing';
  importance?: 'required' | 'preferred';
  context?: string;
}

export interface JobMatchResult {
  jobId?: string;
  jobTitle: string;
  company: string;
  overallMatchScore: number; // 0 - 100
  skillsMatchScore: number;
  experienceMatchScore: number;
  educationMatchScore: number;
  keywordMatchScore: number;
  projectRelevanceScore: number;
  matchedSkills: SkillMatchDetail[];
  partialSkills: SkillMatchDetail[];
  missingSkills: SkillMatchDetail[];
  keyStrengths: string[];
  gapsToAddress: string[];
  recommendationSummary: string;
  analyzedAt: string;
}

export interface JobFilterState {
  searchQuery: string;
  workplaceType: string;
  jobType: string;
  experienceLevel: string;
  location: string;
  skill: string;
}
