import { ScrollReveal, StaggerChild, StaggerGroup } from '@/components/ui/MotionPrimitives';
import type { LandingProductFacts } from '../landingExampleData';
import { SectionHeading } from './SectionHeading';
import styles from '../ProfessionalLandingPage.module.css';

interface NumbersProps {
  productFacts: LandingProductFacts;
}

export function Numbers({ productFacts }: NumbersProps) {
  const productNumbers = [
    {
      value: String(productFacts.templateCount),
      label: 'listed templates',
      detail: 'Current entries in the builder template registry.',
    },
    {
      value: String(productFacts.scorePartCount),
      label: 'score parts',
      detail: 'Keywords, formatting, content, and sections.',
    },
    {
      value: String(productFacts.roleCount),
      label: 'curated role roadmaps',
      detail: 'Current curated profiles across engineering, business, data, and design.',
    },
    {
      value: productFacts.uploadFormats.join(' · '),
      label: 'accepted upload types',
      detail: 'Pasted text is accepted separately.',
      compact: true,
    },
  ];

  return (
    <section className={styles.numbersSection} aria-labelledby="product-numbers-heading">
      <div className={styles.landingContainer}>
        <ScrollReveal>
          <SectionHeading
            headingId="product-numbers-heading"
            number="03"
            label="Real numbers"
            title="What is in"
            accent="the product today."
            description="Counts verified against the current implementation, without customer or outcome statistics."
          />
        </ScrollReveal>
        <StaggerGroup className={styles.numbersGrid}>
          {productNumbers.map((item) => (
            <StaggerChild key={item.label}>
              <article className={styles.numberCard}>
                <strong className={item.compact ? styles.numberCardFormats : undefined}>{item.value}</strong>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </article>
            </StaggerChild>
          ))}
        </StaggerGroup>
        <p className={styles.numbersCaption}>Counts from the current product.</p>
      </div>
    </section>
  );
}
