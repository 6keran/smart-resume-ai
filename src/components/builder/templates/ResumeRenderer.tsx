'use client';

import React from 'react';
import { ResumeData, ResumeTemplateId } from '@/types/resume';
import { normalizeTemplateId } from '@/lib/templates';
import { ATSClassicTemplate } from './ATSClassicTemplate';
import { SoftwareEngineerTemplate } from './SoftwareEngineerTemplate';
import { FreshGraduateTemplate } from './FreshGraduateTemplate';
import { CorporateExecutiveTemplate } from './CorporateExecutiveTemplate';
import { ExecutiveLeadershipTemplate } from './ExecutiveLeadershipTemplate';
import { MinimalistATSTemplate } from './MinimalistATSTemplate';
import { SoftwareDeveloperTemplate } from './SoftwareDeveloperTemplate';
import { OperationsManagementTemplate } from './OperationsManagementTemplate';
import { ModernTwoColumnTemplate } from './ModernTwoColumnTemplate';
import { CompactOnePageTemplate } from './CompactOnePageTemplate';
import { MinimalistTemplate } from './MinimalistTemplate';
import { AcademicTemplate } from './AcademicTemplate';
import { ExperiencedProfessionalTemplate } from './ExperiencedProfessionalTemplate';
import { DataAnalystTemplate } from './DataAnalystTemplate';
import { UIUXDesignerTemplate } from './UIUXDesignerTemplate';
import { InternshipApplicantTemplate } from './InternshipApplicantTemplate';
import { SalesMarketingTemplate } from './SalesMarketingTemplate';

import dynamic from 'next/dynamic';

// Legacy / Reference components loaded dynamically on demand for backward compatibility
const ModernProfessionalTemplate = dynamic(() => import('./ModernProfessionalTemplate').then((m) => m.ModernProfessionalTemplate));
const CreativeProfessionalTemplate = dynamic(() => import('./CreativeProfessionalTemplate').then((m) => m.CreativeProfessionalTemplate));
const ContemporaryTemplate = dynamic(() => import('./ContemporaryTemplate').then((m) => m.ContemporaryTemplate));
const ThomasHamptoneTemplate = dynamic(() => import('./ThomasHamptoneTemplate').then((m) => m.ThomasHamptoneTemplate));
const NickKoeTemplate = dynamic(() => import('./NickKoeTemplate').then((m) => m.NickKoeTemplate));
const RichardSanchezTemplate = dynamic(() => import('./RichardSanchezTemplate').then((m) => m.RichardSanchezTemplate));
const OliviaWilsonGridTemplate = dynamic(() => import('./OliviaWilsonGridTemplate').then((m) => m.OliviaWilsonGridTemplate));
const OliviaWilsonBlushTemplate = dynamic(() => import('./OliviaWilsonBlushTemplate').then((m) => m.OliviaWilsonBlushTemplate));

export function ResumeRenderer({
  data,
  templateId,
  isMiniPreview = false,
}: {
  data: ResumeData;
  templateId?: ResumeTemplateId;
  isMiniPreview?: boolean;
}) {
  const activeTemplate = normalizeTemplateId(templateId || data.templateId);

  // Sanitize bullet points so blank/empty lines never render empty bullets in preview or print
  const cleanData = React.useMemo<ResumeData>(() => {
    return {
      ...data,
      experience: (data.experience || []).map((exp) => ({
        ...exp,
        bulletPoints: (exp.bulletPoints || [])
          .map((b) => (typeof b === 'string' ? b.trim() : b))
          .filter(Boolean),
      })),
      projects: (data.projects || []).map((proj) => ({
        ...proj,
        bullets: (proj.bullets || [])
          .map((b) => (typeof b === 'string' ? b.trim() : b))
          .filter(Boolean),
      })),
    };
  }, [data]);

  switch (activeTemplate) {
    // 12 Distinct Production Templates
    case 'classic-professional':
    case 'ats-classic':
    case 'ats-professional':
      return <ATSClassicTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'modern-corporate':
    case 'corporate-executive':
    case 'corporate':
      return <CorporateExecutiveTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'executive-leadership':
    case 'executive-professional':
    case 'executive':
      return <ExecutiveLeadershipTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'engineering-professional':
    case 'software-engineer':
    case 'engineering':
    case 'engineering-manufacturing':
      return <SoftwareEngineerTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'manufacturing-operations':
    case 'operations-management':
      return <OperationsManagementTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'software-developer':
    case 'full-stack-developer':
      return <SoftwareDeveloperTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'fresher-graduate':
    case 'graduate-fresher':
    case 'fresh-graduate':
    case 'fresher':
    case 'graduate-entry':
      return <FreshGraduateTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'minimalist-ats':
    case 'ats-minimal':
      return <MinimalistATSTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'modern-minimalist':
    case 'minimalist':
    case 'minimal-professional':
    case 'minimal':
      return <MinimalistTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'academic-research':
    case 'academic':
      return <AcademicTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'professional-sidebar':
    case 'modern-two-column':
    case 'contemporary':
      return <ModernTwoColumnTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'compact-one-page':
      return <CompactOnePageTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    // Specialized & Supplementary Templates
    case 'experienced-professional':
    case 'experienced':
      return <ExperiencedProfessionalTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'data-analyst':
    case 'data-ai':
      return <DataAnalystTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'ui-ux-designer':
    case 'creative-professional':
      return <UIUXDesignerTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'internship-applicant':
      return <InternshipApplicantTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    case 'sales-marketing':
      return <SalesMarketingTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    // Legacy Reference Templates
    case 'modern-professional':
      return <ModernProfessionalTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
    case 'thomas-hamptone':
      return <ThomasHamptoneTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
    case 'nick-koe':
      return <NickKoeTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
    case 'richard-sanchez':
      return <RichardSanchezTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
    case 'olivia-wilson-grid':
      return <OliviaWilsonGridTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
    case 'olivia-wilson-blush':
      return <OliviaWilsonBlushTemplate data={cleanData} isMiniPreview={isMiniPreview} />;

    default:
      return <ATSClassicTemplate data={cleanData} isMiniPreview={isMiniPreview} />;
  }
}
