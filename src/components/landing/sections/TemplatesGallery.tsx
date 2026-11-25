'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { RESUME_TEMPLATES } from '@/lib/templates';
import { ScrollReveal, StaggerChild, StaggerGroup, AnimatedTabPanel } from '@/components/ui/MotionPrimitives';
import { SectionHeading } from './SectionHeading';
import ResumeTemplateWheel from '../ResumeTemplateWheel';
import styles from '../ProfessionalLandingPage.module.css';

const CATEGORIES = ['All', ...new Set(RESUME_TEMPLATES.map((template) => template.category))];

export function TemplatesGallery() {
  const [category, setCategory] = useState('All');
  const [showLibrary, setShowLibrary] = useState(false);
  const templates = RESUME_TEMPLATES.filter((template) => category === 'All' || template.category === category);
  return (
    <section id="templates" className={`${styles.newLandingSection} ${styles.gallerySection}`} aria-labelledby="templates-heading">
      <div className={styles.landingContainer}>
        <ScrollReveal className={styles.galleryHeading}>
          <SectionHeading headingId="templates-heading" number="05" label="The layout library" title="From a blank page" accent="to your next chapter." description="Explore the actual layouts available in the builder. Choose the structure that fits your experience and target role." />
          <button type="button" aria-expanded={showLibrary} onClick={() => setShowLibrary(!showLibrary)} className={styles.secondaryButton}>{showLibrary ? 'Close layout explorer' : 'Explore the layout library'}<ArrowRight aria-hidden="true" /></button>
        </ScrollReveal>
        <div className={styles.galleryFilters} aria-label="Template categories">
          {CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <AnimatedTabPanel tabKey={category}>
          <StaggerGroup className={styles.templateMosaic}>
            {templates.map((template, index) => (
              <StaggerChild key={template.id}>
                <Link href="/builder" className={styles.templateSpecimen} data-template-category={template.category}>
                  <div className={styles.specimenChrome}><span aria-hidden="true">● ● ●</span><span>{template.id}.resume</span></div>
                  <div className={`${styles.specimenContent} ${index % 3 === 1 ? styles.specimenNight : index % 3 === 2 ? styles.specimenViolet : ''}`}>
                    <FileText aria-hidden="true" />
                    <span>{template.category}</span>
                    <h3>{template.name}</h3>
                    <p>{template.styleDescription}</p>
                  </div>
                  <div className={styles.specimenFooter}><span>{template.intendedUse}</span><ArrowRight aria-hidden="true" /></div>
                </Link>
              </StaggerChild>
            ))}
          </StaggerGroup>
        </AnimatedTabPanel>
        {showLibrary && <div className={styles.layoutExplorer}><ResumeTemplateWheel /></div>}
      </div>
    </section>
  );
}
