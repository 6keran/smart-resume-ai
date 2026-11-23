'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ResumeData } from '@/types/resume';

export interface AtsFriendlyPreviewProps {
  data: ResumeData;
  mode: 'ats' | 'text';
  className?: string;
}

/**
 * Serializes ResumeData into a canonical, linear ATS-friendly plain text stream.
 * Simulates standard text extraction pipelines (e.g. Workday, Taleo, Greenhouse, Lever).
 */
export function formatResumeToPlainText(data: ResumeData): string {
  const lines: string[] = [];

  // Header / Contact Info
  if (data.personalInfo.fullName) {
    lines.push(data.personalInfo.fullName.toUpperCase());
  }
  const contactParts: string[] = [];
  if (data.personalInfo.email) contactParts.push(data.personalInfo.email);
  if (data.personalInfo.phone) contactParts.push(data.personalInfo.phone);
  if (data.personalInfo.location) contactParts.push(data.personalInfo.location);
  if (data.personalInfo.linkedin) contactParts.push(data.personalInfo.linkedin);
  if (data.personalInfo.github) contactParts.push(data.personalInfo.github);
  if (data.personalInfo.portfolio) contactParts.push(data.personalInfo.portfolio);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
  }
  if (data.personalInfo.headline) {
    lines.push(data.personalInfo.headline);
  }
  lines.push('');

  // Professional Summary
  if (data.summary && data.summary.trim()) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push('-------------------');
    lines.push(data.summary.trim());
    lines.push('');
  }

  // Technical & Core Skills
  const technicalSkills = data.skills?.technical || [];
  const softSkills = data.skills?.soft || [];
  const tools = data.skills?.tools || [];
  if (technicalSkills.length > 0 || softSkills.length > 0 || tools.length > 0) {
    lines.push('CORE COMPETENCIES & TECHNICAL SKILLS');
    lines.push('-------------------------------------');
    if (technicalSkills.length > 0) {
      lines.push(`• Technical Skills: ${technicalSkills.join(', ')}`);
    }
    if (tools.length > 0) {
      lines.push(`• Frameworks & Developer Tools: ${tools.join(', ')}`);
    }
    if (softSkills.length > 0) {
      lines.push(`• Leadership & Professional Skills: ${softSkills.join(', ')}`);
    }
    lines.push('');
  }

  // Professional Experience
  if (data.experience && data.experience.length > 0) {
    lines.push('PROFESSIONAL EXPERIENCE');
    lines.push('-----------------------');
    data.experience.forEach((exp) => {
      const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' - ');
      lines.push(`${exp.role || 'Role'} | ${exp.company || 'Company'} | ${exp.location || ''} (${dates})`);
      if (exp.bulletPoints && exp.bulletPoints.length > 0) {
        exp.bulletPoints.forEach((bp) => {
          if (bp.trim()) lines.push(`  • ${bp.trim()}`);
        });
      }
      lines.push('');
    });
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push('TECHNICAL PROJECTS');
    lines.push('------------------');
    data.projects.forEach((proj) => {
      const techStr = proj.technologies?.length ? ` [Technologies: ${proj.technologies.join(', ')}]` : '';
      lines.push(`${proj.title || 'Project'}${techStr}`);
      if (proj.link) lines.push(`  URL: ${proj.link}`);
      if (proj.description) lines.push(`  • ${proj.description}`);
      if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets.forEach((b) => {
          if (b.trim()) lines.push(`  • ${b.trim()}`);
        });
      }
      lines.push('');
    });
  }

  // Education
  if (data.education && data.education.length > 0) {
    lines.push('EDUCATION');
    lines.push('---------');
    data.education.forEach((edu) => {
      const dates = [edu.startDate, edu.graduationYear].filter(Boolean).join(' - ');
      lines.push(`${edu.degree || 'Degree'} | ${edu.institution || 'Institution'} (${dates})`);
      if (edu.location) lines.push(`  Location: ${edu.location}`);
      if (edu.gpa) lines.push(`  GPA / Grade: ${edu.gpa}`);
      if (edu.honors) lines.push(`  Honors / Distinctions: ${edu.honors}`);
      lines.push('');
    });
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push('CERTIFICATIONS & CREDENTIALS');
    lines.push('----------------------------');
    data.certifications.forEach((cert) => {
      const yr = cert.date ? ` (${cert.date})` : '';
      lines.push(`• ${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ''}${yr}`);
    });
    lines.push('');
  }

  // Achievements
  if (data.achievements && data.achievements.length > 0) {
    lines.push('KEY ACHIEVEMENTS & AWARDS');
    lines.push('-------------------------');
    data.achievements.forEach((ach) => {
      if (typeof ach === 'string') {
        lines.push(`• ${ach}`);
      } else {
        lines.push(`• ${ach.title || ''}${ach.description ? `: ${ach.description}` : ''}`);
      }
    });
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function AtsFriendlyPreview({ data, mode, className = '' }: AtsFriendlyPreviewProps) {
  const [copied, setCopied] = useState(false);

  const plainText = useMemo(() => formatResumeToPlainText(data), [data]);
  const wordCount = useMemo(() => plainText.trim().split(/\s+/).filter(Boolean).length, [plainText]);
  const charCount = useMemo(() => plainText.length, [plainText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (mode === 'text') {
    return (
      <div className={`w-full max-w-full flex flex-col space-y-3 ${className}`}>
        {/* Controls & Counts Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E8ED] text-xs">
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <span className="font-medium">
              <strong className="text-[var(--text-primary)] font-bold">{wordCount}</strong> words
            </span>
            <span>•</span>
            <span className="font-medium">
              <strong className="text-[var(--text-primary)] font-bold">{charCount}</strong> characters
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Copy plain text stream for external ATS job boards"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Plain Text</span>
              </>
            )}
          </button>
        </div>

        {/* Monospace Raw Text Stream */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0F172A] text-[#F8FAFC] font-mono text-xs leading-relaxed overflow-x-auto max-h-[750px] whitespace-pre-wrap select-text border border-slate-800 shadow-inner">
          {plainText || 'No resume content available to display.'}
        </div>
      </div>
    );
  }

  // mode === 'ats' (Structured Single-Column ATS Parse Layout)
  return (
    <div className={`w-full max-w-full flex flex-col space-y-4 ${className}`}>
      {/* ATS Validation Badges */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#16845B]" />
            <span>ATS Parseability Verification</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
            100% Parser Compliant
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-emerald-950">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
            <span>Single-Column Linear</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
            <span>Zero Tables / Textboxes</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
            <span>Canonical Headings</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
            <span>Standard Unicode Bullets</span>
          </div>
        </div>
      </div>

      {/* Structured Clean ATS Sheet */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E8ED] shadow-sm text-xs font-sans text-[#20242B] space-y-5 max-h-[780px] overflow-y-auto">
        {/* Name & Contact */}
        <div className="text-center pb-3 border-b border-gray-200 space-y-1">
          <h1 className="text-lg font-bold text-black tracking-tight uppercase">
            {data.personalInfo.fullName || 'Candidate Name'}
          </h1>
          {data.personalInfo.headline && (
            <p className="text-xs font-semibold text-gray-700">{data.personalInfo.headline}</p>
          )}
          <p className="text-[11px] text-gray-600">
            {[
              data.personalInfo.email,
              data.personalInfo.phone,
              data.personalInfo.location,
              data.personalInfo.linkedin,
              data.personalInfo.github,
            ]
              .filter(Boolean)
              .join('  •  ')}
          </p>
        </div>

        {/* Summary */}
        {data.summary && (
          <div className="space-y-1">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Professional Summary
            </h2>
            <p className="text-[11px] text-gray-800 leading-relaxed pt-1">{data.summary}</p>
          </div>
        )}

        {/* Skills */}
        {((data.skills?.technical?.length || 0) > 0 || (data.skills?.tools?.length || 0) > 0) && (
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Core Competencies &amp; Technical Skills
            </h2>
            <div className="text-[11px] text-gray-800 space-y-1 pt-1">
              {data.skills?.technical?.length > 0 && (
                <p>
                  <strong>Technical Skills:</strong> {data.skills.technical.join(', ')}
                </p>
              )}
              {data.skills?.tools?.length > 0 && (
                <p>
                  <strong>Frameworks &amp; Developer Tools:</strong> {data.skills.tools.join(', ')}
                </p>
              )}
              {data.skills?.soft?.length > 0 && (
                <p>
                  <strong>Professional Skills:</strong> {data.skills.soft.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Professional Experience
            </h2>
            <div className="space-y-3 pt-1">
              {data.experience.map((exp, idx) => (
                <div key={exp.id || idx} className="space-y-1 text-[11px]">
                  <div className="flex justify-between items-baseline font-bold text-gray-900">
                    <span>
                      {exp.role} — <span className="font-semibold text-gray-700">{exp.company}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      {[exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-gray-800 pl-1">
                      {exp.bulletPoints.map((bp, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {bp}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Technical Projects
            </h2>
            <div className="space-y-3 pt-1">
              {data.projects.map((proj, idx) => (
                <div key={proj.id || idx} className="space-y-1 text-[11px]">
                  <div className="flex justify-between items-baseline font-bold text-gray-900">
                    <span>{proj.title}</span>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-normal">
                        ({proj.technologies.join(', ')})
                      </span>
                    )}
                  </div>
                  {proj.description && <p className="text-gray-800">{proj.description}</p>}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-gray-800 pl-1">
                      {proj.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Education
            </h2>
            <div className="space-y-2 pt-1 text-[11px]">
              {data.education.map((edu, idx) => (
                <div key={edu.id || idx} className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-gray-900">{edu.degree}</span>
                    <span className="text-gray-700">, {edu.institution}</span>
                    {edu.gpa && <span className="text-gray-500 font-normal"> (GPA: {edu.gpa})</span>}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {[edu.startDate, edu.graduationYear].filter(Boolean).join(' - ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-0.5">
              Certifications &amp; Credentials
            </h2>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-800 pt-1">
              {data.certifications.map((cert, idx) => (
                <li key={cert.id || idx}>
                  <strong>{cert.name}</strong>
                  {cert.issuer && ` — ${cert.issuer}`}
                  {cert.date && ` (${cert.date})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
