'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookmarkCheck,
  Bot,
  Briefcase,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { AnimatedTabPanel } from '@/components/ui/MotionPrimitives';

interface StageItem {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  ctaText: string;
  icon: React.ElementType;
  highlights: string[];
  badge: string;
}

const STAGES: StageItem[] = [
  {
    id: 'discovery',
    step: '01',
    title: 'Role Discovery',
    subtitle: 'Verified fresher & tech listings',
    description: 'Explore live curated openings with explainable match breakdowns and tech stack alignment before applying.',
    href: '/jobs',
    ctaText: 'Search Roles',
    icon: Briefcase,
    highlights: ['Skill match indicators', 'Direct verified sources', 'Salary & location filters'],
    badge: 'STAGE 01 // DISCOVERY',
  },
  {
    id: 'pipeline',
    step: '02',
    title: 'Pipeline Organization',
    subtitle: 'Save & prioritize target companies',
    description: 'Bookmark positions to revisit, compare requirements, and prepare your application package.',
    href: '/dashboard/jobs',
    ctaText: 'View Saved Jobs',
    icon: BookmarkCheck,
    highlights: ['Deadline tracking', 'Requirement comparison', 'Direct apply links'],
    badge: 'STAGE 02 // SHORTLIST',
  },
  {
    id: 'tracking',
    step: '03',
    title: 'Application Tracking',
    subtitle: 'End-to-end recruitment lifecycle',
    description: 'Log every submission with notes, interview dates, and status transitions from Applied to Offer.',
    href: '/dashboard/applications',
    ctaText: 'Open Tracker',
    icon: Send,
    highlights: ['Custom notes & links', 'Status progression', 'Zero data lock-in'],
    badge: 'STAGE 03 // PIPELINE',
  },
  {
    id: 'interview',
    step: '04',
    title: 'Interview Preparation',
    subtitle: 'Simulated technical & behavioral practice',
    description: 'Rehearse role-specific questions with AI-assisted STAR method feedback and rubric-based scoring.',
    href: '/interview-prep',
    ctaText: 'Start Mock Interview',
    icon: Bot,
    highlights: ['STAR technique critique', 'Instant feedback scoring', 'Role-specific questions'],
    badge: 'STAGE 04 // REHEARSAL',
  },
];

export default function HorizontalCareerTimeline() {
  const [activeStage, setActiveStage] = useState(0);
  const stage = STAGES[activeStage];
  const Icon = stage.icon;

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="flex gap-2 overflow-x-auto rounded-panel bg-bg-subtle-2 p-3 shadow-card lg:flex-col lg:overflow-visible lg:p-4">
        {STAGES.map((item, index) => {
          const active = index === activeStage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStage(index)}
              className={`min-w-56 rounded-card px-4 py-4 text-left transition-colors lg:min-w-0 ${
                active
                  ? 'bg-accent text-on-accent'
                  : 'bg-transparent text-text hover:bg-bg'
              }`}
              aria-pressed={active}
            >
              <span className={`font-mono text-caption font-semibold ${active ? 'text-on-accent/70' : 'text-accent'}`}>
                {item.step}
              </span>
              <span className="mt-2 block text-body font-semibold">{item.title}</span>
              <span className={`mt-1 block text-small ${active ? 'text-on-accent/75' : 'text-text-secondary'}`}>
                {item.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatedTabPanel tabKey={stage.id}>
        <article className="flex min-h-[26rem] flex-col justify-between rounded-panel bg-bg-subtle-2 p-7 shadow-marketing sm:p-9">
          <div>
            <div className="flex items-start justify-between gap-5">
              <span className="grid h-14 w-14 place-items-center rounded-card bg-accent text-on-accent">
                <Icon className="h-6 w-6" />
              </span>
              <span className="font-mono text-caption font-semibold text-accent">{stage.badge}</span>
            </div>

            <h3 className="mt-9 text-h1 font-semibold tracking-heading text-text">
              {stage.title}
            </h3>
            <p className="mt-2 text-body font-medium text-accent">{stage.subtitle}</p>
            <p className="mt-5 max-w-2xl text-body-lg leading-7 text-text-secondary">{stage.description}</p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {stage.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 rounded-card bg-bg p-4 text-small text-text-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={stage.href}
            className="mt-8 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-accent px-5 text-body font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            {stage.ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </AnimatedTabPanel>
    </div>
  );
}
