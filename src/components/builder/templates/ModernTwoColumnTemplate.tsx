'use client';

import React from 'react';
import { ResumeData } from '@/types/resume';
import {
  hasContactInfo,
  formatUrl,
  cleanDomain,
  hasSkillsData,
  getTemplateSpacing,
  isSectionVisible,
  formatAchievement,
  formatLanguage,
  hasAdditionalInfo,
  hasCustomSections,
  LinkedinIcon,
  GithubIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  ExternalLinkIcon,
} from './templateUtils';

export function ModernTwoColumnTemplate({
  data,
  isMiniPreview = false,
}: {
  data: ResumeData;
  isMiniPreview?: boolean;
}) {
  const {
    personalInfo,
    summary,
    objective,
    skills,
    experience,
    education,
    projects,
    certifications,
    candidateType,
    hiddenSections,
    additionalInfo,
    customSections,
  } = data;
  const isFresher = candidateType === 'fresher';
  const spacing = getTemplateSpacing(data, isMiniPreview);

  const validExp = (experience || []).filter((e) => e.role?.trim() || e.company?.trim());
  const validEdu = (education || []).filter((e) => e.degree?.trim() || e.institution?.trim());
  const validProj = (projects || []).filter((p) => p.title?.trim());
  const validCerts = (certifications || []).filter((c) => c.name?.trim());
  const validAchievements = (data.achievements || []).filter((a) => (typeof a === 'string' ? a.trim() : a.title?.trim()));
  const validLanguages = (data.languages || []).filter((l) => (typeof l === 'string' ? l.trim() : l.name?.trim()));

  return (
    <div
      className={`w-full bg-white text-slate-800 font-sans select-text flex flex-1 min-h-full ${
        isMiniPreview ? 'text-[6.5px] leading-tight' : `text-[13px] ${spacing.lineHeight}`
      }`}
    >
      {/* LEFT COLUMN: Sidebar (32% width) with Contact, Skills, Education, Certifications, Languages, Additional Info */}
      <div
        className={`w-[32%] bg-slate-50 border-r border-slate-200 flex flex-col justify-between shrink-0 ${
          isMiniPreview ? 'p-2.5 space-y-2' : `${spacing.containerPadding} space-y-4`
        }`}
      >
        <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
          {/* INITIALS MONOGRAM BADGE */}
          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center shrink-0 shadow-sm ${
                isMiniPreview ? 'w-5 h-5 text-[8.5px]' : 'w-10 h-10 text-base'
              }`}
            >
              {(personalInfo.fullName || 'SR')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0">
              <span className={`font-bold text-slate-900 block leading-tight truncate ${isMiniPreview ? 'text-[8px]' : 'text-[13px]'}`}>
                {personalInfo.fullName || 'YOUR NAME'}
              </span>
              {personalInfo.headline && (
                <span className={`text-blue-700 font-medium block truncate ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                  {personalInfo.headline}
                </span>
              )}
            </div>
          </div>

          {/* CONTACT INFO */}
          {hasContactInfo(personalInfo) && (
            <div className={`space-y-1 text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Contact
              </h3>
              {personalInfo.email && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <MailIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <a href={`mailto:${personalInfo.email}`} className="truncate hover:text-blue-700 break-all">
                    {personalInfo.email}
                  </a>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-center gap-1.5">
                  <PhoneIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <span className="truncate">{personalInfo.phone}</span>
                </div>
              )}
              {personalInfo.location && (
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <span className="truncate">{personalInfo.location}</span>
                </div>
              )}
              {personalInfo.linkedin && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <LinkedinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <a
                    href={formatUrl(personalInfo.linkedin)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-blue-700 break-all"
                  >
                    {cleanDomain(personalInfo.linkedin)}
                  </a>
                </div>
              )}
              {personalInfo.github && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <GithubIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <a
                    href={formatUrl(personalInfo.github)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-blue-700 break-all"
                  >
                    {cleanDomain(personalInfo.github)}
                  </a>
                </div>
              )}
              {personalInfo.portfolio && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <GlobeIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                  <a
                    href={formatUrl(personalInfo.portfolio)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-blue-700 break-all"
                  >
                    {cleanDomain(personalInfo.portfolio)}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* SKILLS IN SIDEBAR */}
          {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
            <div className={`space-y-1.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Skills & Tech
              </h3>
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Capabilities';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx}>
                      <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">{catName}:</span>
                      <div className="flex flex-wrap gap-1">
                        {skillNames.map((s, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-800 rounded px-1.5 py-0.2 text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">Core Competencies:</span>
                      <div className="flex flex-wrap gap-1">
                        {skills.technical.map((s, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-800 rounded px-1.5 py-0.2 text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">Tools & Systems:</span>
                      <div className="flex flex-wrap gap-1">
                        {skills.tools.map((t, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-700 rounded px-1.5 py-0.2 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">Leadership & Soft Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {skills.soft.map((ss, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-600 rounded px-1.5 py-0.2 text-[10px]">
                            {ss}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* EDUCATION (IN SIDEBAR) */}
          {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
            <div className={`space-y-1.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Education
              </h3>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <span className={`font-bold text-slate-900 block ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                    {edu.degree || edu.qualification || 'Degree'}
                  </span>
                  <span className="text-slate-600 block text-[11px]">{edu.institution}</span>
                  <span className="text-slate-500 font-mono block text-[10px]">
                    {edu.graduationYear || (edu.current ? 'Present' : '')}
                  </span>
                  {edu.gpa && (
                    <span className="text-blue-800 font-semibold block text-[10px]">GPA: {edu.gpa}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CERTIFICATIONS (IN SIDEBAR) */}
          {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Certifications
              </h3>
              {validCerts.map((c, idx) => (
                <div key={c.id || idx} className="text-[11px] break-inside-avoid">
                  <strong className="text-slate-900 block font-semibold">{c.name}</strong>
                  <span className="text-slate-500 block">{c.issuer} {c.date ? `· ${c.date}` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* LANGUAGES (IN SIDEBAR) */}
          {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Languages
              </h3>
              <div className="space-y-0.5">
                {validLanguages.map((l, idx) => {
                  const lang = formatLanguage(l);
                  return (
                    <div key={idx} className="flex justify-between items-baseline text-[11px]">
                      <span className="font-medium text-slate-800">{lang.name}</span>
                      {lang.proficiency && (
                        <span className="text-slate-500 text-[10px]">{lang.proficiency}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADDITIONAL INFO (IN SIDEBAR) */}
          {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
            <div className={`space-y-1 text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
              <h3
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                  isMiniPreview ? 'text-[7px]' : 'text-xs'
                }`}
              >
                Additional
              </h3>
              <div className="space-y-0.5 text-[10.5px]">
                {additionalInfo?.noticePeriod && (
                  <p><strong>Notice:</strong> {additionalInfo.noticePeriod}</p>
                )}
                {additionalInfo?.relocation && (
                  <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
                )}
                {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                  <p><strong>Shift:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
                )}
                {additionalInfo?.drivingLicence && (
                  <p><strong>Licence:</strong> {additionalInfo.drivingLicence}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Summary, Experience, Projects, Custom Sections (68% width) */}
      <div
        className={`w-[68%] flex flex-col justify-between ${
          isMiniPreview ? 'p-2.5 space-y-2' : `${spacing.containerPadding} space-y-3`
        }`}
      >
        <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
          {/* RIGHT HEADER */}
          <header className="border-b-2 border-slate-900 pb-2">
            <h1
              className={`font-black tracking-tight text-slate-950 uppercase break-words ${
                isMiniPreview ? 'text-[13px]' : 'text-2xl sm:text-[28px]'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p
                className={`font-semibold text-blue-700 tracking-wide mt-0.5 break-words ${
                  isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13.5px]'
                }`}
              >
                {personalInfo.headline}
              </p>
            )}
          </header>

          {/* PROFESSIONAL SUMMARY */}
          {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                {isFresher ? 'Profile & Career Focus' : 'Executive Summary'}
              </h2>
              <p className={`text-slate-700 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                {summary}
              </p>
            </section>
          )}

          {/* OBJECTIVE */}
          {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                Career Objective
              </h2>
              <p className={`text-slate-700 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                {objective}
              </p>
            </section>
          )}

          {/* FRESHER: PROJECTS FIRST */}
          {isFresher && isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                Featured Projects
              </h2>
              <div className={spacing.entryGap}>
                {validProj.map((proj, idx) => (
                  <div key={proj.id || idx} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline flex-wrap gap-1">
                      <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[13px]'}`}>
                        {proj.title}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <span className={`font-normal text-blue-700 italic ml-1.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                            [{proj.technologies.join(', ')}]
                          </span>
                        )}
                      </span>
                    </div>
                    {proj.description && (
                      <p className={`text-slate-700 mt-0.5 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                        {proj.description}
                      </p>
                    )}
                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                        {proj.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    )}
                    {proj.outcome && (
                      <p className={`text-slate-900 font-medium mt-0.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        <strong>Outcome:</strong> {proj.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCE */}
          {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                {isFresher ? 'Practical & Internship Experience' : 'Professional Work History'}
              </h2>
              <div className={spacing.entryGap}>
                {validExp.map((exp, idx) => (
                  <div key={exp.id || idx} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline flex-wrap gap-1">
                      <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[13px]'}`}>
                        {exp.role} <span className="font-normal text-slate-600">@ {exp.company}{exp.department ? ` (${exp.department})` : ''}</span>
                      </span>
                      <span className={`font-semibold text-slate-500 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                      </span>
                    </div>
                    {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                      <ul className={`list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                        {exp.bulletPoints.map((pt, pIdx) => (
                          <li key={pIdx} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <p className={`mt-0.5 text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        <strong>Results:</strong> {exp.achievements.join('; ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCED: PROJECTS AFTER EXPERIENCE */}
          {!isFresher && isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                Key Projects & Initiatives
              </h2>
              <div className={spacing.entryGap}>
                {validProj.map((proj, idx) => (
                  <div key={proj.id || idx} className="break-inside-avoid">
                    <div className="flex justify-between items-baseline flex-wrap gap-1">
                      <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[13px]'}`}>
                        {proj.title}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <span className={`font-normal text-blue-700 italic ml-1.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                            [{proj.technologies.join(', ')}]
                          </span>
                        )}
                      </span>
                    </div>
                    {proj.description && (
                      <p className={`text-slate-700 mt-0.5 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                        {proj.description}
                      </p>
                    )}
                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                        {proj.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    )}
                    {proj.outcome && (
                      <p className={`text-slate-900 font-medium mt-0.5 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        <strong>Outcome:</strong> {proj.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ACHIEVEMENTS */}
          {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
            <section className="break-inside-avoid">
              <h2
                className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
              >
                Key Achievements & Recognition
              </h2>
              <ul className={`list-disc list-outside ml-4 space-y-0.5 text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                {validAchievements.map((item, idx) => {
                  const ach = formatAchievement(item);
                  return (
                    <li key={idx} className="leading-relaxed">
                      <strong>{ach.title}</strong>
                      {ach.date ? ` (${ach.date})` : ''}
                      {ach.description ? `: ${ach.description}` : ''}
                      {ach.result ? ` — ${ach.result}` : ''}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* CUSTOM SECTIONS */}
          {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) && (
            customSections!.filter((s) => s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))).map((sec, idx) => (
              <section key={sec.id || idx} className="break-inside-avoid">
                <h2
                  className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'}`}
                >
                  {sec.title}
                </h2>
                {sec.content && (
                  <p className={`text-slate-700 leading-relaxed ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                    {sec.content}
                  </p>
                )}
                {sec.items && sec.items.length > 0 && (
                  <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
                    {sec.items.filter(Boolean).map((item, iIdx) => (
                      <li key={iIdx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
