'use client';

import Link from 'next/link';
import { ArrowRight, FileText, ScanText, Wand2, BriefcaseBusiness, MessageSquare, BadgeCheck, FolderGit2, Route, Bot } from 'lucide-react';
import { ScrollReveal, StaggerChild, StaggerGroup } from '@/components/ui/MotionPrimitives';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

export const CAREER_CAPABILITIES = [
  { name: 'Resume Builder', href: '/builder', icon: FileText, label: 'YOUR DOCUMENT', description: 'Build and edit your resume with structured sections and a live A4 preview.', detail: 'Personal details → Experience → Education' },
  { name: 'ATS Analyzer', href: '/ats-score', icon: ScanText, label: 'KNOW THE RULES', description: 'See how your resume scores across keywords, formatting, content and sections.', detail: 'Keywords · Formatting · Content · Sections' },
  { name: 'Resume Improver', href: '/improver', icon: Wand2, label: 'MAKE IT CLEARER', description: 'Review suggested rewrites while keeping your original facts visible.', detail: 'Original → Suggestion → Your review' },
  { name: 'Job Discovery', href: '/jobs', icon: BriefcaseBusiness, label: 'FIND YOUR FIT', description: 'Search openings, compare role requirements, and organize your next application.', detail: 'Discover → Compare → Apply' },
  { name: 'Interview Preparation', href: '/interview-prep', icon: MessageSquare, label: 'TELL YOUR STORY', description: 'Practice technical and behavioral questions with structured answer feedback.', detail: 'Situation · Task · Action · Result' },
  { name: 'Skills Assessment', href: '/skills', icon: BadgeCheck, label: 'SHOW WHAT YOU KNOW', description: 'Take technical assessments and keep your results with your career profile.', detail: 'Prepare → Assess → Review' },
  { name: 'Project Mentor', href: '/projects', icon: FolderGit2, label: 'BUILD THE EVIDENCE', description: 'Turn your target role into guided portfolio projects and trackable milestones.', detail: 'Brief → Roadmap → Milestones' },
  { name: 'Career Roadmap', href: '/guidance', icon: Route, label: 'CHOOSE A DIRECTION', description: 'Map your current skills and project evidence to the role you want.', detail: 'Your profile → Skill gaps → Next steps' },
  { name: 'AI Assistant', href: '/dashboard', icon: Bot, label: 'KEEP THE CONTEXT', description: 'Ask Career Copilot about your resume, projects, skills and job search.', detail: 'Resume · Skills · Projects · Jobs' },
] as const;

export function Capabilities() {
  return (
    <section id="features" className={styles.newLandingSection} aria-labelledby="capabilities-heading">
      <div className={styles.landingContainer}>
        <ScrollReveal><SectionHeading headingId="capabilities-heading" number="04" label="One career workspace" title="Everything your next move needs." accent="In one place." description="From the first draft to the next interview, your tools work around the same career story." align="center" /></ScrollReveal>
        <StaggerGroup className={styles.capabilityGrid}>
          {CAREER_CAPABILITIES.map((item, index) => (
            <StaggerChild key={item.href}>
              <Link href={item.href} className={styles.capabilityCard}>
                <div className={styles.capabilityDiagram} aria-hidden="true">
                  <span className={styles.capabilityIcon}><item.icon /></span>
                  <span>{item.detail}</span>
                </div>
                <div className={styles.capabilityMeta}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <span className={styles.capabilityLink}>Open {item.name}<ArrowRight aria-hidden="true" /></span>
              </Link>
            </StaggerChild>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
