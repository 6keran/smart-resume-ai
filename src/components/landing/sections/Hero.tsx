'use client';

import Link from 'next/link';
import { ArrowRight, Check, FileText, Pause, Play } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useInView } from 'framer-motion';
import {
  AnimatedTabPanel,
  ScrollReveal,
  StaggerChild,
  StaggerGroup,
} from '@/components/ui/MotionPrimitives';
import {
  LANDING_EXAMPLE_CANDIDATE,
  LANDING_UPLOAD_FORMATS,
  type LandingAtsExampleData,
  type LandingScoredExample,
} from '../landingExampleData';
import styles from '../ProfessionalLandingPage.module.css';

const INPUT_METHODS = [...LANDING_UPLOAD_FORMATS, 'Paste text'];
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

interface LandingHeroProps {
  atsExample: LandingAtsExampleData;
}

function scoreWeightLabel(weight: number): string {
  return `${Math.round(weight * 100)}% weight`;
}

export function LandingHero({ atsExample }: LandingHeroProps) {
  const [activeExampleId, setActiveExampleId] = useState<LandingScoredExample['id']>('before');
  const [isPlaying, setIsPlaying] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const exampleTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null);
  const stageViewportRef = useMemo(() => ({ current: stageElement }), [stageElement]);
  const stageVisible = useInView(stageViewportRef, { amount: 0.12 });

  useEffect(() => {
    if (atsExample.status !== 'ready' || !isPlaying || prefersReducedMotion || !stageVisible) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setActiveExampleId((current) => (current === 'before' ? 'after' : 'before'));
    }, 5200);

    return () => window.clearInterval(timer);
  }, [atsExample, isPlaying, prefersReducedMotion, stageVisible]);

  const selectExample = (id: LandingScoredExample['id']) => {
    setActiveExampleId(id);
    setIsPlaying(false);
  };

  const moveExampleTab = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (atsExample.status !== 'ready') return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % atsExample.examples.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + atsExample.examples.length) % atsExample.examples.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = atsExample.examples.length - 1;
    else return;

    event.preventDefault();
    selectExample(atsExample.examples[nextIndex].id);
    exampleTabRefs.current[nextIndex]?.focus();
  };

  const activeExample = atsExample.status === 'ready'
    ? atsExample.examples.find((example) => example.id === activeExampleId) ?? atsExample.examples[0]
    : null;
  const unavailableMessage = atsExample.status === 'unavailable' ? atsExample.message : '';

  return (
    <section className={styles.landingHero} aria-labelledby="landing-hero-title">
      <div className={styles.landingContainer}>
        <div className={styles.heroGrid}>
          <StaggerGroup hero className={styles.heroMessage}>
            <StaggerChild>
              <p className={styles.heroKicker}>Resume builder and ATS checker for students and job seekers</p>
            </StaggerChild>
            <StaggerChild>
              <h1 id="landing-hero-title" className={styles.newHeroTitle}>
                Build a resume for the job you want. <em>Know how it will be read.</em>
              </h1>
            </StaggerChild>
            <StaggerChild>
              <p className={styles.newHeroCopy}>
                Pick a target role, build or upload your resume, and get a repeatable ATS score with a clear breakdown. AI suggests improvements and is designed to preserve the facts you provide.
              </p>
            </StaggerChild>
            <StaggerChild>
              <div className={styles.newHeroActions}>
                <Link href="/builder" className={styles.heroPrimaryButton}>
                  Create your resume
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/ats-score" className={styles.heroSecondaryButton}>Check your ATS score</Link>
              </div>
            </StaggerChild>
            <StaggerChild>
              <p className={styles.heroNote}><Check aria-hidden="true" />The ATS check works without an account, with limited scans.</p>
            </StaggerChild>
            <StaggerChild>
              <div className={styles.inputMethods} aria-label="Supported resume input methods">
                <span>Bring what you already have</span>
                <div>
                  {INPUT_METHODS.map((method) => <span key={method}>{method}</span>)}
                </div>
              </div>
            </StaggerChild>
          </StaggerGroup>

          <ScrollReveal delay={0.08} className={styles.heroDemoWrap}>
            <div ref={setStageElement} className={styles.heroDemo} data-playing={isPlaying && stageVisible && !prefersReducedMotion} aria-label="Example resume score timeline">
              <div className={styles.exampleLabel}>Example data · scored by the live rules engine</div>
              {atsExample.status === 'ready' && activeExample ? (
                <>
                  <div className={styles.heroTimelineHeader}>
                    <div className={styles.heroTimelineTabs} role="tablist" aria-label="Example resume version">
                      {atsExample.examples.map((example, index) => (
                        <button
                          key={example.id}
                          ref={(element) => { exampleTabRefs.current[index] = element; }}
                          id={`hero-example-tab-${example.id}`}
                          type="button"
                          role="tab"
                          aria-selected={activeExample.id === example.id}
                          aria-controls={`hero-example-panel-${example.id}`}
                          tabIndex={activeExample.id === example.id ? 0 : -1}
                          onClick={() => selectExample(example.id)}
                          onKeyDown={(event) => moveExampleTab(event, index)}
                        >
                          <span>{example.label}</span>
                          <small>{example.description}</small>
                        </button>
                      ))}
                    </div>
                    {!prefersReducedMotion && (
                      <button
                        type="button"
                        className={styles.heroTimelinePlayback}
                        aria-label={isPlaying ? 'Pause example timeline' : 'Play example timeline'}
                        onClick={() => setIsPlaying((current) => !current)}
                      >
                        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                      </button>
                    )}
                  </div>

                  <AnimatedTabPanel tabKey={activeExample.id} className={styles.heroTimelineAnimation}>
                    <div
                      id={`hero-example-panel-${activeExample.id}`}
                      role="tabpanel"
                      aria-labelledby={`hero-example-tab-${activeExample.id}`}
                      className={styles.heroTimelinePanel}
                    >
                      <article className={styles.exampleResume}>
                        <header>
                          <span aria-hidden="true"><FileText /></span>
                          <div>
                            <h2>{LANDING_EXAMPLE_CANDIDATE.name}</h2>
                            <p>{LANDING_EXAMPLE_CANDIDATE.role} · {activeExample.label} draft</p>
                          </div>
                        </header>
                        <p className={styles.exampleStateDescription}>{activeExample.description}</p>
                        <pre className={styles.exampleResumeText}>{activeExample.text}</pre>
                      </article>

                      <aside className={styles.exampleScoreCard}>
                        <div className={styles.exampleScoreHeader}>
                          <div>
                            <span>ATS breakdown</span>
                            <strong>Four fixed parts</strong>
                          </div>
                          <span className={styles.exampleScoreBadge}>Rules</span>
                        </div>
                        <div
                          className={styles.exampleOverallScore}
                          aria-label={`${activeExample.label} overall ATS score ${activeExample.overallScore} out of 100`}
                        >
                          <span>Overall score</span>
                          <strong>{activeExample.overallScore}<small>/100</small></strong>
                        </div>
                        <div className={styles.exampleScores}>
                          {activeExample.parts.map((part) => (
                            <div key={part.key} className={styles.exampleScoreRow}>
                              <div>
                                <span>{part.label}</span>
                                <span>{scoreWeightLabel(part.weight)}</span>
                              </div>
                              <div
                                className={styles.exampleScoreTrack}
                                role="progressbar"
                                aria-label={`${part.label} score`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={part.score}
                              >
                                <span style={{ width: `${part.score}%` }} />
                              </div>
                              <strong>{part.score}</strong>
                            </div>
                          ))}
                        </div>
                        <p>The same resume and inputs produce the same score.</p>
                      </aside>
                    </div>
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
