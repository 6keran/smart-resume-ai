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

export function ExecutiveLeadershipTemplate({
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
      className={`w-full bg-white text-slate-900 font-sans select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${
        isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] ${spacing.lineHeight}`
      }`}
    >
      {/* HEADER: Authoritative Executive Leadership Banner */}
      <header className={`pb-3 ${spacing.headerMarginBottom} border-b-2 border-slate-800 shrink-0`}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <div>
            <h1
              className={`font-serif font-black tracking-tight text-slate-950 uppercase break-words ${
                isMiniPreview ? 'text-[13px]' : 'text-3xl sm:text-[30px]'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p
                className={`font-sans font-bold text-slate-700 tracking-wide mt-0.5 uppercase break-words ${
                  isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13px]'
                }`}
              >
                {personalInfo.headline}
              </p>
            )}
          </div>

          {/* Quick executive badge if senior cert exists */}
          {validCerts.length > 0 && (
            <div className="hidden sm:block shrink-0 text-right">
              <span className={`inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-300 ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                {validCerts[0].name}
              </span>
            </div>
          )}
        </div>

        {/* Shaded Executive Contact Band */}
        {hasContactInfo(personalInfo) && (
          <div
            className={`mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-slate-600 ${
              isMiniPreview ? 'text-[6px]' : 'text-xs'
            }`}
          >
            {personalInfo.location && (
              <div className="flex items-center gap-1">
                <MapPinIcon className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="break-words">{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-1">
                <PhoneIcon className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.email && (
              <div className="flex items-center gap-1">
                <MailIcon className="w-3 h-3 text-slate-500 shrink-0" />
                <a href={`mailto:${personalInfo.email}`} className="text-slate-800 hover:text-blue-700 break-all">
                  {personalInfo.email}
                </a>
              </div>
            )}
            {personalInfo.linkedin && (
              <div className="flex items-center gap-1">
                <LinkedinIcon className="w-3 h-3 text-slate-500 shrink-0" />
                <a
                  href={formatUrl(personalInfo.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-800 hover:text-blue-700 break-all"
                >
                  {cleanDomain(personalInfo.linkedin)}
                </a>
              </div>
            )}
            {personalInfo.portfolio && (
              <div className="flex items-center gap-1">
                <GlobeIcon className="w-3 h-3 text-slate-500 shrink-0" />
                <a
                  href={formatUrl(personalInfo.portfolio)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-800 hover:text-blue-700 break-all"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* EXECUTIVE PROFILE / SUMMARY: Stylized Callout Bar */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <div className="bg-slate-50 border-l-4 border-slate-800 p-2.5 sm:p-3 rounded-r">
              <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 mb-1 ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
                Executive Profile
              </h2>
              <p className={`text-slate-800 leading-relaxed ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                {summary}
              </p>
            </div>
          </section>
        )}

        {/* CAREER OBJECTIVE (IF APPLICABLE) */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Strategic Objective
            </h2>
            <p className={`text-slate-800 leading-relaxed ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* CORE STRATEGIC COMPETENCIES (Skills Matrix) */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Core Strategic Competencies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Competency';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx} className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className={`block font-bold text-slate-900 uppercase ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                        {catName}
                      </span>
                      <span className={`text-slate-700 leading-tight ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                        {skillNames.join(' • ')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className={`block font-bold text-slate-900 uppercase ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                        Executive Governance
                      </span>
                      <span className={`text-slate-700 leading-tight ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                        {skills.technical.join(' • ')}
                      </span>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className={`block font-bold text-slate-900 uppercase ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                        Operational Systems
                      </span>
                      <span className={`text-slate-700 leading-tight ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                        {skills.tools.join(' • ')}
                      </span>
                    </div>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className={`block font-bold text-slate-900 uppercase ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                        Leadership & Strategy
                      </span>
                      <span className={`text-slate-700 leading-tight ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                        {skills.soft.join(' • ')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* WORK EXPERIENCE: Executive Milestones & Impact */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Executive Experience & Career Milestones
            </h2>
            <div className={spacing.entryGap}>
              {validExp.map((exp, idx) => (
                <div key={exp.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <div>
                      <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}>
                        {exp.role}
                      </span>
                      <span className={`text-slate-700 ml-1.5 font-medium ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                        | {exp.company}
                        {exp.department ? ` — ${exp.department}` : ''}
                      </span>
                    </div>
                    <span className={`text-slate-600 font-semibold shrink-0 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>

                  {exp.location && (
                    <div className={`text-slate-500 italic mt-0.5 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      {exp.location}{exp.employmentType ? ` • ${exp.employmentType}` : ''}
                    </div>
                  )}

                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {exp.bulletPoints.filter(Boolean).map((pt, pIdx) => (
                        <li key={pIdx} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-1 p-1.5 bg-slate-50 border-l-2 border-blue-600 rounded-r">
                      <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Executive Impact:{' '}
                      </span>
                      <span className={`text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.achievements.filter(Boolean).join('; ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KEY INITIATIVES / PROJECTS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Strategic Initiatives & Programs
            </h2>
            <div className={spacing.entryGap}>
              {validProj.map((proj, idx) => (
                <div key={proj.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {proj.title}
                      {proj.role ? ` (${proj.role})` : ''}
                    </span>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className={`text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {proj.technologies.join(', ')}
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <p className={`mt-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.description}
                    </p>
                  )}

                  {proj.objective && (
                    <p className={`mt-0.5 text-slate-700 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      <strong>Charter:</strong> {proj.objective}
                    </p>
                  )}

                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.bullets.filter(Boolean).map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {proj.outcome && (
                    <div className="mt-1 p-1 bg-blue-50/50 rounded border-l-2 border-blue-500">
                      <span className={`font-bold text-blue-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Deliverable & ROI:{' '}
                      </span>
                      <span className={`text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {proj.outcome}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EDUCATION & CREDENTIALS */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Education & Academic Credentials
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-slate-600 font-semibold ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'Present' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? ` (${edu.university})` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-800 font-medium ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Honors/Grade: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS & GOVERNANCE */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Executive Certifications & Licences
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">
                      {cert.name}
                    </span>
                    {cert.date && (
                      <span className={`text-slate-500 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {cert.date}
                      </span>
                    )}
                  </div>
                  {cert.issuer && (
                    <p className={`text-slate-600 italic ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      {cert.issuer} {cert.type ? `(${cert.type})` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HONORS & KEY ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Honors & Career Achievements
            </h2>
            <ul className={`list-disc list-outside ml-4 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
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

        {/* LANGUAGES */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Languages
            </h2>
            <p className={`text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFO */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="break-inside-avoid">
            <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Governance & Additional Information
            </h2>
            <div className={`space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {additionalInfo?.noticePeriod && (
                <p><strong>Availability / Notice Period:</strong> {additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
              )}
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <p><strong>Executive Schedule:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Licence:</strong> {additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p><strong>Board & Professional Memberships:</strong> {additionalInfo.memberships.join(', ')}</p>
              )}
              {additionalInfo?.other && (
                <p>{additionalInfo.other}</p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) && (
          customSections!.filter((s) => s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))).map((sec, idx) => (
            <section key={sec.id || idx} className="break-inside-avoid">
              <h2 className={`font-serif font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
                {sec.title}
              </h2>
              {sec.content && (
                <p className={`text-slate-800 leading-relaxed ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                  {sec.content}
                </p>
              )}
              {sec.items && sec.items.length > 0 && (
                <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
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
  );
}
