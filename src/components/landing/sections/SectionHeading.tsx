import styles from '../ProfessionalLandingPage.module.css';

interface SectionHeadingProps {
  headingId?: string;
  number: string;
  label: string;
  title: string;
  accent: string;
  description?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({
  headingId,
  number,
  label,
  title,
  accent,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={`${styles.newSectionHeading} ${align === 'center' ? styles.newSectionHeadingCenter : ''}`}>
      <p className={styles.newSectionLabel}><span>{number}</span>{label}</p>
      <h2 id={headingId}>{title} <em>{accent}</em></h2>
      {description && <p className={styles.newSectionDescription}>{description}</p>}
    </div>
  );
}
