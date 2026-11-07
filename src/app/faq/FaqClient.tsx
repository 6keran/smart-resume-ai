'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FaqCategory {
  id: string;
  category: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    id: 'resume-builder',
    category: 'RESUME BUILDER',
    items: [
      {
        id: 'rb-1',
        question: 'How do I create a resume with Smart Resume AI?',
        answer: (
          <span>
            Open the <Link href="/builder" className="font-semibold text-[#111111] underline hover:opacity-80">Resume Builder</Link> and
            follow the guided 10-step wizard. You will enter your contact details, professional summary, work experience, education,
            technical competencies, and key projects. The builder generates a real-time A4 preview across 12 ATS-compliant templates,
            allowing you to customize fonts, layout columns, and formatting before downloading your finalized resume as a print-ready PDF.
          </span>
        ),
      },
      {
        id: 'rb-2',
        question: 'Can I create a resume if I have no work experience?',
        answer: (
          <span>
            Yes. The Resume Builder includes a dedicated Fresher mode toggle. In Fresher mode, mandatory workplace experience requirements
            are replaced with academic projects, internships, coursework, and technical skills, allowing entry-level candidates to present
            a compelling, professional resume tailored for their career entry.
          </span>
        ),
      },
      {
        id: 'rb-3',
        question: 'Can I edit my resume after creating it?',
        answer: (
          <span>
            Yes. Your drafts in the builder are stored automatically in your browser session. When signed in to your account, your resumes
            are saved to your cloud <Link href="/dashboard/resumes" className="font-semibold text-[#111111] underline hover:opacity-80">Resume Library</Link>.
            From there, you can edit entries, create new version snapshots for specific target roles, compare scoring progressions, and restore
            any earlier revision at any time.
          </span>
        ),
      },
      {
        id: 'rb-4',
        question: 'Can I download my resume as a PDF?',
        answer: (
          <span>
            Yes. The Resume Builder includes a native PDF export feature. Clicking &ldquo;Download PDF&rdquo; formats the document strictly to
            international A4 dimensions (210×297mm) and triggers your browser&rsquo;s native high-resolution print engine, ensuring clean margins,
            vector text sharpness, and zero background visual artifacts.
          </span>
        ),
      },
    ],
  },
  {
    id: 'ai-features',
    category: 'AI FEATURES',
    items: [
      {
        id: 'ai-1',
        question: 'How does AI help improve my resume?',
        answer: (
          <span>
            Smart Resume AI provides two dedicated intelligence tools: the <Link href="/improver" className="font-semibold text-[#111111] underline hover:opacity-80">AI Phrasing Improver</Link> and
            the <Link href="/analyzer" className="font-semibold text-[#111111] underline hover:opacity-80">Resume Analyzer</Link>. The Improver strengthens
            weak bullet points by incorporating strong action verbs and quantifiable impact metrics. The Analyzer scans your document against ATS
            keyword benchmarks to highlight missing qualifications and structural discrepancies before you submit applications.
          </span>
        ),
      },
      {
        id: 'ai-2',
        question: 'Does Smart Resume AI guarantee that my resume will pass an ATS?',
        answer: (
          <span>
            No resume tool can guarantee specific applicant tracking system outcomes or hiring results. Smart Resume AI tests your document
            against standard enterprise ATS parsing rules, keyword density targets, and structural standards to maximize readability by recruitment
            systems, but hiring decisions depend on individual employers and specific position requirements.
          </span>
        ),
      },
      {
        id: 'ai-3',
        question: 'Can AI generate information about my experience or qualifications?',
        answer: (
          <span>
            No. Smart Resume AI operates with a strict fact-preservation policy. Our models enhance clarity, active voice, and professional syntax,
            but they never invent employer history, unearned credentials, or technologies you have not used. You retain complete editorial authority
            over every piece of information on your resume.
          </span>
        ),
      },
    ],
  },
  {
    id: 'job-search',
    category: 'JOB SEARCH',
    items: [
      {
        id: 'js-1',
        question: 'Can I find jobs that match my skills?',
        answer: (
          <span>
            Yes. Our <Link href="/jobs" className="font-semibold text-[#111111] underline hover:opacity-80">Job Search</Link> tool aggregates verified,
            real-time openings across major career providers including LinkedIn, Adzuna, and Jooble. You can filter by role, location, and keywords,
            and use our <Link href="/job-match" className="font-semibold text-[#111111] underline hover:opacity-80">Job Match</Link> feature to calculate
            an instant compatibility percentage between your resume and target job descriptions.
          </span>
        ),
      },
      {
        id: 'js-2',
        question: 'Does Smart Resume AI automatically apply for jobs?',
        answer: (
          <span>
            No. Smart Resume AI does not submit automated bot applications on your behalf, as automated submissions frequently trigger anti-spam
            filters on recruitment portals. Instead, we provide direct links to the official employer posting so you can review requirements and
            submit your application directly, then track your progress in your dashboard.
          </span>
        ),
      },
      {
        id: 'js-3',
        question: 'Can I track my job applications?',
        answer: (
          <span>
            Yes. Registered users have access to the <Link href="/dashboard/applications" className="font-semibold text-[#111111] underline hover:opacity-80">Application Tracker</Link>.
            You can organize your job search across stages—including Saved, Ready to apply, Applied, Interview, Offer, and Rejected—and record
            application dates, interview notes, and compensation details in one centralized workspace.
          </span>
        ),
      },
    ],
  },
  {
    id: 'skills-assessments',
    category: 'SKILLS & ASSESSMENTS',
    items: [
      {
        id: 'sa-1',
        question: 'What is the purpose of a skill assessment?',
        answer: (
          <span>
            Skill assessments (<Link href="/skills" className="font-semibold text-[#111111] underline hover:opacity-80">Skill Catalog</Link>) provide
            objective technical examinations across languages and engineering topics including JavaScript, React, Python, SQL, and DevOps.
            Passing an assessment awards a verified skill badge on your profile that demonstrates your practical competency to prospective employers.
          </span>
        ),
      },
      {
        id: 'sa-2',
        question: 'Do I receive a certificate after an assessment?',
        answer: (
          <span>
            Yes. Achieving a score of 70% or higher on an assessment generates an authentic digital skill certificate. Each credential includes
            a unique certificate ID, issue date, and a public verification link that you can share with hiring managers or display on your LinkedIn profile.
          </span>
        ),
      },
      {
        id: 'sa-3',
        question: 'Can I retake an assessment?',
        answer: (
          <span>
            Yes. If you do not pass an assessment or wish to benchmark your knowledge after additional study, you can retake the quiz. The system
            records your highest verified score and updates your credential status accordingly.
          </span>
        ),
      },
    ],
  },
  {
    id: 'account-privacy',
    category: 'ACCOUNT & PRIVACY',
    items: [
      {
        id: 'ap-1',
        question: 'Do I need an account to use Smart Resume AI?',
        answer: (
          <span>
            You can explore the platform, benchmark your ATS score with our <Link href="/ats-score" className="font-semibold text-[#111111] underline hover:opacity-80">ATS Score</Link> tool,
            and draft a resume in the builder without an account. Creating a free candidate account is required to save resumes to your cloud library,
            save application records, maintain version snapshots, and earn verified skill certificates.
          </span>
        ),
      },
      {
        id: 'ap-2',
        question: 'How is my resume information stored?',
        answer: (
          <span>
            Your account credentials and resume data are stored securely in your dedicated database instance protected by bcrypt password hashing
            and encrypted HTTP-only session cookies. Your resume content is never sold to third parties or used to train public machine learning models.
            For full technical and data governance details, please review our <Link href="/privacy" className="font-semibold text-[#111111] underline hover:opacity-80">Privacy Policy</Link>.
          </span>
        ),
      },
      {
        id: 'ap-3',
        question: 'Can I update my account information?',
        answer: (
          <span>
            Yes. You can update your display name, email address, password, target job role, and account preferences at any time through
            your <Link href="/dashboard/profile" className="font-semibold text-[#111111] underline hover:opacity-80">Profile Settings</Link>. You can
            also export or permanently delete your stored resume documents whenever you choose.
          </span>
        ),
      },
    ],
  },
];

export function FaqClient() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'rb-1': true, // Open the first question by default for immediate discoverability
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="w-full bg-[#FFFFFF] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-24">
        {/* Navigation Breadcrumb */}
        <div className="mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5F6368] hover:text-[#111111] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header / Heading */}
        <div className="border-b border-[#DCDCDC] pb-10 sm:pb-16 mb-12 sm:mb-20">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#111111] leading-[1.05]">
            Frequently Asked Questions
          </h1>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-[#5F6368] max-w-2xl leading-relaxed font-normal">
            Clear answers about building your resume, improving your profile, finding relevant opportunities, and using Smart Resume AI.
          </p>
        </div>

        {/* Main Two-Column Editorial FAQ Layout */}
        <div className="space-y-16 sm:space-y-24">
          {FAQ_DATA.map((categoryGroup) => (
            <div
              key={categoryGroup.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 lg:gap-16 items-start"
            >
              {/* Left Column: Category Label in Heavy Condensed Uppercase */}
              <div className="md:col-span-4 lg:col-span-4 sticky top-24">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-[#111111] leading-snug">
                  {categoryGroup.category}
                </h2>
              </div>

              {/* Right Column: Accordion Questions */}
              <div className="md:col-span-8 lg:col-span-8 border-b border-[#DCDCDC]">
                {categoryGroup.items.map((item) => {
                  const isOpen = !!openItems[item.id];
                  const questionId = `faq-q-${item.id}`;
                  const answerId = `faq-a-${item.id}`;

                  return (
                    <div
                      key={item.id}
                      className="border-t border-[#DCDCDC] transition-colors"
                    >
                      <button
                        type="button"
                        id={questionId}
                        aria-expanded={isOpen}
                        aria-controls={answerId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full py-5 sm:py-6 flex items-start justify-between gap-6 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 rounded-xs"
                      >
                        <span className="text-base sm:text-lg font-semibold text-[#111111] leading-snug group-hover:text-black transition-colors">
                          {item.question}
                        </span>
                        <div className="mt-0.5 w-6 h-6 flex items-center justify-center shrink-0 text-[#111111]">
                          {isOpen ? (
                            <Minus className="w-5 h-5 transition-transform duration-150" />
                          ) : (
                            <Plus className="w-5 h-5 transition-transform duration-150" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div
                          id={answerId}
                          role="region"
                          aria-labelledby={questionId}
                          className="pb-6 sm:pb-8 text-sm sm:text-base text-[#5F6368] leading-relaxed pr-6 animate-fade-in"
                        >
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation / Support Strip */}
        <div className="mt-20 sm:mt-28 pt-10 sm:pt-14 border-t border-[#DCDCDC] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#5F6368]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#111111]">Smart Resume AI</span>
            <span>· Technical Career Documentation</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 sm:gap-8 font-medium">
            <Link href="/" className="hover:text-[#111111] transition-colors">
              Home
            </Link>
            <Link href="/builder" className="hover:text-[#111111] transition-colors">
              Resume Builder
            </Link>
            <Link href="/jobs" className="hover:text-[#111111] transition-colors">
              Job Search
            </Link>
            <Link href="/skills" className="hover:text-[#111111] transition-colors">
              Skill Assessments
            </Link>
            <Link href="/privacy" className="hover:text-[#111111] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#111111] transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

