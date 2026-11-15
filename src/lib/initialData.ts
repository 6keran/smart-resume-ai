import { ResumeData } from '@/types/resume';
import { UserSkill } from '@/types/skills';
import { DashboardMetrics, ActivityLogItem } from '@/types/dashboard';

export const INITIAL_RESUME_DATA: ResumeData = {
  id: 'res_default',
  title: 'Untitled Resume',
  candidateType: 'experienced',
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  summary: '',
  skills: {
    technical: [],
    soft: [],
    tools: [],
  },
  experience: [
    {
      id: 'exp_init',
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      current: true,
      bulletPoints: [],
    },
  ],
  education: [
    {
      id: 'edu_init',
      degree: '',
      institution: '',
      graduationYear: '',
      gpa: '',
    },
  ],
  projects: [
    {
      id: 'proj_init',
      title: '',
      description: '',
      technologies: [],
    },
  ],
  certifications: [],
  languages: [],
  achievements: [],
  sectionOrder: [
    'personal',
    'summary',
    'skills',
    'experience',
    'education',
    'projects',
    'certifications',
    'languages',
    'achievements',
  ],
  templateId: 'modern-ats',
  lastUpdated: new Date().toISOString(),
};

export const INITIAL_USER_SKILLS: UserSkill[] = [];

export const INITIAL_METRICS: DashboardMetrics = {
  resumesAnalyzed: 0,
  averageAtsScore: 0,
  skillsVerified: 0,
  assessmentsCompleted: 0,
  jobMatches: 0,
  careerReadinessScore: 0,
};

export const INITIAL_ACTIVITIES: ActivityLogItem[] = [];
