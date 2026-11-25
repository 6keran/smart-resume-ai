'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, FileText } from 'lucide-react';
import { AnimatedTabPanel } from '@/components/ui/MotionPrimitives';
import { RESUME_TEMPLATES } from '@/lib/templates';

export default function ResumeTemplateWheel() {
  const templates = RESUME_TEMPLATES.slice(0, 12);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTemplate = templates[currentIndex] || templates[0];

  const moveTo = (index: number) => {
    setCurrentIndex((index + templates.length) % templates.length);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveTo(currentIndex + 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveTo(currentIndex - 1);
    }
  };

  return (
    <section
      tabIndex={0}
      role="region"
      aria-label="Resume template carousel"
      onKeyDown={handleKeyDown}
      className="overflow-hidden rounded-panel bg-bg-subtle-2 shadow-marketing"
    >
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border-hairline px-5 sm:px-7">
        <div>
          <p className="font-mono text-caption font-semibold uppercase tracking-widest text-accent">
            Resume layout library
          </p>
          <p className="mt-1 text-small text-text-secondary">
            {String(currentIndex + 1).padStart(2, '0')} of {String(templates.length).padStart(2, '0')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveTo(currentIndex - 1)}
            className="grid h-11 w-11 place-items-center rounded-control border border-border bg-bg-subtle-2 text-text-secondary transition-colors hover:border-text hover:text-text"
            aria-label="Previous template"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveTo(currentIndex + 1)}
            className="grid h-11 w-11 place-items-center rounded-control border border-border bg-bg-subtle-2 text-text-secondary transition-colors hover:border-text hover:text-text"
            aria-label="Next template"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <AnimatedTabPanel tabKey={currentTemplate.id}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch">
            <div className="flex flex-col justify-between rounded-card bg-bg p-6 sm:p-7">
              <div>
                <span className="inline-flex min-h-7 items-center rounded-full bg-accent-tint px-3 text-caption font-semibold text-accent">
                  {currentTemplate.category}
                </span>
                <h3 className="mt-5 text-h1 font-semibold tracking-heading text-text">
                  {currentTemplate.name}
                </h3>
                <p className="mt-2 text-small font-medium text-accent">
                  {currentTemplate.intendedUse}
                </p>
                <p className="mt-5 max-w-xl text-body leading-6 text-text-secondary">
                  {currentTemplate.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(currentTemplate.tags || []).slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-bg-subtle-2 px-3 py-1 text-caption text-text-secondary shadow-card">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/builder"
                className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-accent px-5 text-body font-semibold text-on-accent transition-colors hover:bg-accent-hover"
              >
                Preview in Builder
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-card bg-bg p-5 shadow-card" aria-hidden="true">
              <div className="flex items-center justify-between border-b border-border-hairline pb-3">
                <FileText className="h-4 w-4 text-accent" />
                <span className="font-mono text-caption text-text-tertiary">A4</span>
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="h-3 w-2/3 rounded-full bg-text" />
                  <div className="mt-2 h-2 w-2/5 rounded-full bg-accent" />
                </div>
                {['Summary', 'Experience', 'Skills'].map((section, index) => (
                  <div key={section}>
                    <span className="font-mono text-caption font-semibold uppercase text-text-tertiary">{section}</span>
                    <div className="mt-2 h-2 w-full rounded-full bg-border-hairline" />
                    <div className={`mt-2 h-2 rounded-full bg-border-hairline ${index === 1 ? 'w-4/5' : 'w-2/3'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedTabPanel>

        <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Choose a resume template">
          {templates.map((template, index) => (
            <button
              key={template.id}
              type="button"
              onClick={() => moveTo(index)}
              className={`h-3 rounded-full transition-[width,background-color] duration-200 ${
                currentIndex === index ? 'w-8 bg-accent' : 'w-3 bg-border hover:bg-text-tertiary'
              }`}
              aria-label={`Show ${template.name} template`}
              aria-current={currentIndex === index ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
