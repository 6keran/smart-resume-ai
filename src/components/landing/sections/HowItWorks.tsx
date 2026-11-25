import Link from 'next/link';
import { ArrowRight, Check, FileText, SearchCheck, Target } from 'lucide-react';
import { ScrollReveal, StaggerChild, StaggerGroup } from '@/components/ui/MotionPrimitives';
import { LANDING_SCORE_WEIGHTS, LANDING_UPLOAD_FORMATS } from '../landingExampleData';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

const KEYWORD_WEIGHT = LANDING_SCORE_WEIGHTS.find((part) => part.key === 'keywords')?.weight ?? 0;

const STEPS = [
  {
    number: '01',
    title: 'Choose your target role',
    description: 'Start with a role so the roadmap, skill gaps, and resume checks have a clear direction.',
    icon: Target,
    visual: (
      <div className={styles.roleSelector} aria-label="Example target roles">
        {['Software Engineer', 'Data Analyst', 'UI/UX Designer'].map((role, index) => (
          <span key={role} className={index === 1 ? styles.roleSelected : ''}>
            <span>{role}</span>{index === 1 && <Check aria-hidden="true" />}
          </span>
        ))}
      </div>
    ),
  },
  {
    number: '02',
    title: 'Build or upload your resume',
    description: `Use the guided builder, or bring a ${LANDING_UPLOAD_FORMATS.join(', ')} file, or pasted text to review first.`,
    icon: FileText,
    visual: (
      <div className={styles.buildVisual}>
        <div><FileText aria-hidden="true" /><span>Clean A4 layout</span></div>
        <div className={styles.buildFormats}>{LANDING_UPLOAD_FORMATS.map((format) => <span key={format}>{format}</span>)}</div>
      </div>
    ),
  },
  {
    number: '03',
    title: 'Check, improve and apply',
    description: 'Read the score breakdown, review each suggested change, then export when the resume is ready.',
    icon: SearchCheck,
    visual: (
      <div className={styles.reviewVisual}>
        <div><span>Keywords</span><strong>{Math.round(KEYWORD_WEIGHT * 100)}%</strong></div>
        <div className={styles.reviewBar}><span /></div>
        <div className={styles.suggestionRow}><span>Add role-specific keywords?</span><div><span>Reject</span><strong>Review</strong></div></div>
      </div>
    ),
  },
] as const;

export function HowItWorks() {
  return (
    <section className={styles.newLandingSection} aria-labelledby="how-it-works-heading">
      <div className={styles.landingContainer}>
        <ScrollReveal>
          <SectionHeading
            headingId="how-it-works-heading"
            number="01"
            label="How it works"
            title="Three steps"
            accent="from role to ready."
            description="Start with the information you already have and keep every later change visible and reviewable."
          />
        </ScrollReveal>

        <StaggerGroup className={styles.stepsGrid}>
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <StaggerChild key={step.number}>
                <article className={styles.stepCard}>
                  <div className={styles.stepCardHeader}>
                    <span>{step.number}</span>
                    <span className={styles.stepIcon}><Icon aria-hidden="true" /></span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className={styles.stepVisual}>{step.visual}</div>
                </article>
              </StaggerChild>
            );
          })}
        </StaggerGroup>

        <ScrollReveal className={styles.stepsFooter}>
          <p>Each later change is just edit, re-check, export.</p>
          <Link href="/builder">Start in the resume builder <ArrowRight aria-hidden="true" /></Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
