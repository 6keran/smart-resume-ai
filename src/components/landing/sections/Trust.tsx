import { FileCheck2, ListChecks, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ScrollReveal, StaggerChild, StaggerGroup } from '@/components/ui/MotionPrimitives';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

const BOUNDARIES = [
  { icon: ListChecks, title: 'A score you can inspect.', copy: 'The ATS score comes from fixed rules. Identical resume text and inputs return the same score.' },
  { icon: ShieldCheck, title: 'Your experience stays yours.', copy: 'Review AI suggestions before applying them. Rewrites are designed to preserve your facts, roles and achievements.' },
  { icon: FileCheck2, title: 'The layout has a purpose.', copy: 'Structured sections and A4 previews help you prepare readable documents. Choose a layout for your application requirements.' },
  { icon: LockKeyhole, title: 'Advice has its limits.', copy: 'A resume score and an AI recommendation cannot guarantee an interview or a hiring outcome. You make the final decisions.' },
];

export function Trust() {
  return <section className={`${styles.newLandingSection} ${styles.trustSection}`} aria-labelledby="trust-heading"><div className={`${styles.landingContainer} ${styles.trustGrid}`}>
    <ScrollReveal><SectionHeading headingId="trust-heading" number="08" label="Before you apply" title="Clear about the rules." accent="Honest about the limits." description="Your career deserves useful evidence and visible choices. Every tool should help you understand the next decision." /></ScrollReveal>
    <StaggerGroup className={styles.trustRules}>{BOUNDARIES.map((item) => <StaggerChild key={item.title}><article><item.icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.copy}</p></div></article></StaggerChild>)}</StaggerGroup>
  </div></section>;
}
