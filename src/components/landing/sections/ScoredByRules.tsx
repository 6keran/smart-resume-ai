'use client';

import { Check, ShieldCheck } from 'lucide-react';
import { KeyboardEvent, useRef, useState } from 'react';
import { AnimatedTabPanel, ScrollReveal } from '@/components/ui/MotionPrimitives';
import {
  LANDING_EXAMPLE_CANDIDATE,
  type LandingAtsExampleData,
  type LandingScoredExample,
} from '../landingExampleData';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

const TABS = [
  { id: 'resume', label: 'Resume text' },
  { id: 'result', label: 'Result' },
] as const;

type EvidenceTab = (typeof TABS)[number]['id'];

const RULES = [
  'Checked, not guessed: the same resume and inputs produce the same score.',
  'Missing sections and keywords are tied to the score part they affect.',
  'Suggestions are designed to preserve the skills, employers, and numbers you supplied.',
];

interface ScoredByRulesProps {
  atsExample: LandingAtsExampleData;
}

function scoreWeightLabel(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

export function ScoredByRules({ atsExample }: ScoredByRulesProps) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('resume');
  const [activeExampleId, setActiveExampleId] = useState<LandingScoredExample['id']>('before');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const activeExample = atsExample.status === 'ready'
    ? atsExample.examples.find((example) => example.id === activeExampleId) ?? atsExample.examples[0]
    : null;
  const unavailableMessage = atsExample.status === 'unavailable' ? atsExample.message : '';

  return (
    <section className={`${styles.newLandingSection} ${styles.newLandingSectionWhite}`} aria-labelledby="scored-by-rules-heading">
      <div className={styles.landingContainer}>
        <div className={styles.rulesLayout}>
          <ScrollReveal>
            <SectionHeading
              headingId="scored-by-rules-heading"
              number="02"
              label="Scored by rules"
              title="It reads your resume."
              accent="It does not guess."
              description="The numeric score comes from fixed checks. AI can explain findings and suggest wording, but it does not set the number."
            />
            <ul className={styles.rulesList}>
              {RULES.map((rule) => <li key={rule}><Check aria-hidden="true" /><span>{rule}</span></li>)}
            </ul>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className={styles.evidencePanel}>
              <div className={styles.evidencePanelHeader}>
                <div><ShieldCheck aria-hidden="true" /><span>Deterministic ATS evidence</span></div>
                <span>Example data</span>
              </div>
              {atsExample.status === 'ready' && activeExample ? (
                <>
                  <div className={styles.evidenceVersionSwitch} role="group" aria-label="Example resume version">
                    {atsExample.examples.map((example) => (
                      <button
                        key={example.id}
                        type="button"
                        aria-pressed={activeExample.id === example.id}
                        onClick={() => setActiveExampleId(example.id)}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                  <div className={styles.evidenceTabs} role="tablist" aria-label="ATS evidence views">
                    {TABS.map((tab, index) => (
                      <button
                        key={tab.id}
                        ref={(element) => { tabRefs.current[index] = element; }}
                        id={`evidence-tab-${tab.id}`}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`evidence-panel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        onKeyDown={(event) => moveTab(event, index)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <AnimatedTabPanel tabKey={`${activeTab}-${activeExample.id}`} className={styles.evidenceTabPanel}>
                    {activeTab === 'resume' ? (
                      <div id="evidence-panel-resume" role="tabpanel" aria-labelledby="evidence-tab-resume" className={styles.resumeEvidence}>
                        <div className={styles.resumeEvidenceHeader}>
                          <p><strong>{LANDING_EXAMPLE_CANDIDATE.name}</strong><br />{LANDING_EXAMPLE_CANDIDATE.role}</p>
                          <span>{activeExample.label} draft</span>
                        </div>
                        <pre className={styles.resumeEvidenceText}>{activeExample.text}</pre>
                      </div>
                    ) : (
                      <div id="evidence-panel-result" role="tabpanel" aria-labelledby="evidence-tab-result" className={styles.resultEvidence}>
                        <div
                          className={styles.resultOverall}
                          aria-label={`${activeExample.label} overall ATS score ${activeExample.overallScore} out of 100`}
                        >
                          <span>Overall score</span>
                          <strong>{activeExample.overallScore}<small>/100</small></strong>
                        </div>
                        <div className={styles.resultScores}>
                          {activeExample.parts.map((part) => (
                            <div key={part.key}>
                              <span>{part.label} <small>{scoreWeightLabel(part.weight)}</small></span>
                              <span
                                className={styles.resultScoreTrack}
                                role="progressbar"
                                aria-label={`${part.label} score`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={part.score}
                              >
                                <span style={{ width: `${part.score}%` }} />
                              </span>
                              <strong>{part.score}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </AnimatedTabPanel>
                </>
              ) : (
                <div className={styles.scoreUnavailable} role="status">
                  <strong>Example score unavailable</strong>
                  <p>{unavailableMessage}</p>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
