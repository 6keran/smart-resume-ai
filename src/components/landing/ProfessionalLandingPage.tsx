'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/MotionPrimitives';
import HorizontalCareerTimeline from '@/components/landing/HorizontalCareerTimeline';
import { LandingHeader } from '@/components/landing/sections/Header';
import { LandingHero } from '@/components/landing/sections/Hero';
import { HowItWorks } from '@/components/landing/sections/HowItWorks';
import { ScoredByRules } from '@/components/landing/sections/ScoredByRules';
import { Numbers } from '@/components/landing/sections/Numbers';
import { Capabilities, CAREER_CAPABILITIES } from '@/components/landing/sections/Capabilities';
import { TemplatesGallery } from '@/components/landing/sections/TemplatesGallery';
import { ThreeWays } from '@/components/landing/sections/ThreeWays';
import { Trust } from '@/components/landing/sections/Trust';
import { SectionHeading } from '@/components/landing/sections/SectionHeading';
import type { LandingPageData } from '@/components/landing/landingExampleData';
import styles from './ProfessionalLandingPage.module.css';

function getFaqs(templateCount: number) {
  return [
  {
    question: 'How does the deterministic ATS scoring work?',
    answer:
      'The ATS engine uses fixed, reproducible evaluation algorithms across four core dimensions: section semantics, keyword density, quantified metrics, and action verbs. Testing the identical resume and job description always returns the identical score.',
  },
  {
    question: 'Does the resume improver invent fake accomplishments or metrics?',
    answer:
      'Never. The AI is strictly constrained to preserve your actual roles, dates, technologies, and achievements. It refines passive language and strengthens phrasing without inventing false numbers or unverified technologies.',
  },
  {
    question: 'Are the exported PDF files ATS-safe and parseable?',
    answer:
      `Yes. All ${templateCount} resume templates are built with strict A4 page geometry, clean structural hierarchy, and standard unicode typography, ensuring applicant tracking parsers read every section cleanly without drop-offs.`,
  },
  {
    question: 'Can students or career switchers use Smart Resume AI?',
    answer:
      'Absolutely. The platform includes a candidate mode toggle that prioritizes academic projects, coursework, and verified skill credentials when formal corporate employment history is still developing.',
  },
  ];
}

interface ProfessionalLandingPageProps {
  landingData: LandingPageData;
}

export default function ProfessionalLandingPage({ landingData }: ProfessionalLandingPageProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const faqs = getFaqs(landingData.productFacts.templateCount);

  return (
    <div className={styles.page}>
      <LandingHeader />

      <main id="main-content">
        <LandingHero atsExample={landingData.atsExample} />
        <HowItWorks />
        <ScoredByRules atsExample={landingData.atsExample} />
        <Numbers productFacts={landingData.productFacts} />
        <Capabilities />
        <TemplatesGallery />
        <ThreeWays />

        <section id="pipeline" className={styles.sectionTint}>
          <div className={styles.container}>
            <ScrollReveal className={styles.pipelineHeading}>
              <SectionHeading number="07" label="Discovery and tracking" title="One story, from first draft" accent="to the next interview." description="Search openings, compare requirements and keep each application stage in view." />
              <Link href="/jobs" className={styles.primaryButton}>
                Open Job Finder
                <ArrowRight aria-hidden="true" />
              </Link>
            </ScrollReveal>
            <HorizontalCareerTimeline />
          </div>
        </section>
        <Trust />

        <section className={styles.section}>
          <div className={`${styles.landingContainer} ${styles.editorialFaq}`}>
            <ScrollReveal className={styles.sectionIntro}>
              <SectionHeading number="09" label="Questions and answers" title="Asked, and" accent="answered plainly." description="Scoring, fact preservation and exports. Here is how the tools work." />
            </ScrollReveal>

            <div className={styles.faqList}>
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <article key={faq.question} className={styles.faqItem}>
                    <button
                      type="button"
                      className={styles.faqButton}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`landing-faq-${index}`}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                    </button>
                    <div id={`landing-faq-${index}`} className={styles.faqAnswerReveal} data-open={isOpen} aria-hidden={!isOpen}><div><p className={styles.faqAnswer}>{faq.answer}</p></div></div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.container}>
            <ScrollReveal>
              <div className={styles.ctaCard}>
                <span className={styles.eyebrow}>Get started</span>
                <h2>Let your work speak.<em>Make your next move.</em></h2>
                <p>Create an account to explore A4 resume layouts, review your document, and organize your job search.</p>
                <div className={styles.ctaActions}>
                  <Link href="/builder" className={styles.ctaPrimary}>
                    Get Started for Free
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link href="/login" className={styles.ctaSecondary}>Sign In to Account</Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.landingContainer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerMark}>SR</span>
            <span>Smart Resume AI<br /><small>Your career. One workspace.</small></span>
          </div>
          <nav className={styles.footerLinks} aria-label="Footer navigation">
            <Link href="/faq">FAQ</Link>
            <Link href="/guidance">Career Guidance</Link>
            <Link href="/feedback">Feedback</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <nav className={styles.footerProductLinks} aria-label="Career tools">{CAREER_CAPABILITIES.map((tool) => <Link key={tool.name} href={tool.href}>{tool.name}</Link>)}<Link href="/dashboard/profile">User Profile</Link><Link href="/dashboard/applications">Application History</Link></nav>
        <div className={styles.footerWordmark} aria-hidden="true">Smart Resume</div>
        <div className={styles.footerBottom}><span>© {new Date().getUTCFullYear()} Smart Resume AI</span><span>Built around your next chapter.</span></div>
        </div>
      </footer>
    </div>
  );
}
