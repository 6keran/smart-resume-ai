'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FilePlus2, Upload, Wand2 } from 'lucide-react';
import { AnimatedTabPanel, ScrollReveal } from '@/components/ui/MotionPrimitives';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

const WAYS = [
  { name: 'Start a new resume', icon: FilePlus2, title: 'Start with your story.', copy: 'Choose a layout, add your experience, and shape each section beside a live document preview.', href: '/builder', action: 'Open the builder', steps: ['Choose your layout', 'Add your experience', 'Preview and export'] },
  { name: 'Bring your resume', icon: Upload, title: 'Keep what you already have.', copy: 'Upload a PDF, DOCX or TXT document, or paste your resume text. Inspect the score breakdown before deciding what to change.', href: '/ats-score', action: 'Check your resume', steps: ['Upload or paste text', 'Read the four score parts', 'Review the next steps'] },
  { name: 'Improve a draft', icon: Wand2, title: 'Give your work clearer words.', copy: 'Review original and suggested wording side by side. Choose the edits that describe your actual experience.', href: '/improver', action: 'Open the improver', steps: ['Keep your original facts', 'Review each suggestion', 'Apply the changes you choose'] },
] as const;

export function ThreeWays() {
  const [selected, setSelected] = useState(0);
  const way = WAYS[selected];
  return (
    <section id="workspace" className={styles.newLandingSection} aria-labelledby="three-ways-heading">
      <div className={styles.landingContainer}>
        <ScrollReveal><SectionHeading headingId="three-ways-heading" number="06" label="Three ways to begin" title="However your career" accent="reaches us." align="center" /></ScrollReveal>
        <div className={styles.wayTabs} role="group" aria-label="Choose how to begin">
          {WAYS.map((item, index) => <button key={item.name} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><item.icon aria-hidden="true" />{item.name}</button>)}
        </div>
        <AnimatedTabPanel tabKey={way.name}>
          <div className={styles.waySplit}>
            <div><h3>{way.title}</h3><p>{way.copy}</p><Link href={way.href} className={styles.capabilityLink}>{way.action}<ArrowRight aria-hidden="true" /></Link></div>
            <div className={styles.wayConsole}>
              <header><span>SMART RESUME / WORKSPACE</span><way.icon aria-hidden="true" /></header>
              <ol>{way.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p><Check aria-hidden="true" /></li>)}</ol>
              <Link href={way.href}>Continue to {way.action.toLowerCase()}<ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </AnimatedTabPanel>
      </div>
    </section>
  );
}
