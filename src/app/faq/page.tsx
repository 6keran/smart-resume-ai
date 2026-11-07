import type { Metadata } from 'next';
import { FaqClient } from './FaqClient';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Smart Resume AI',
  description:
    'Clear answers about building your resume, ATS compatibility, job search tracking, skill assessments, and account privacy on Smart Resume AI.',
};

export default function FaqPage() {
  return <FaqClient />;
}

