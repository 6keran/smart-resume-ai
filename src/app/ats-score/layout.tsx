import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ATS Resume Score | Smart Resume AI',
  description: 'Evaluate your resume compatibility with real applicant tracking systems. Audit keyword density, discover missing skills, and inspect formatting feedback.',
};

export default function AtsScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
