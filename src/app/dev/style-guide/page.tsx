import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StyleGuideClient } from './StyleGuideClient';

export const metadata: Metadata = {
  title: 'Design System Style Guide | Smart Resume AI',
  robots: { index: false, follow: false },
};

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <StyleGuideClient />;
}
