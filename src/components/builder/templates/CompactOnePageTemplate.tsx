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
} from './templateUtils';

export function CompactOnePageTemplate({
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
        isMiniPreview ? 'text-[6.5px] leading-tight' : `text-[12.5px] ${spacing.lineHeight}`
      }`}
    >
      {/* HEADER: Ultra Compact Inline Header (Retains shrink-0 flex justify-between) */}
      <header className={`pb-2 ${spacing.headerMarginBottom} border-b border-slate-900 shrink-0 flex justify-between items-baseline flex-wrap gap-x-3 gap-y-1`}>
        <div>
          <h1
            className={`font-black uppercase tracking-tight text-slate-950 inline-block ${
              isMiniPreview ? 'text-[12px]' : 'text-2xl sm:text-[23px]'
            }`}
          >
            {personalInfo.fullName || 'YOUR NAME'}
          </h1>
          {personalInfo.headline && (
            <span className={`text-slate-600 font-semibold ml-2 ${isMiniPreview ? 'text-[7.5px]' : 'text-sm'}`}>
              | {personalInfo.headline}
            </span>
          )}
        </div>

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-2 text-slate-600 ${
              isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'
            }`}
          >
            {personalInfo.location && <span>{personalInfo.location}</span>}
            {personalInfo.location && (personalInfo.phone || personalInfo.email) && <span>·</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.phone && personalInfo.email && <span>·</span>}
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="text-slate-900 hover:underline">
                {personalInfo.email}
              </a>
            )}
            {personalInfo.linkedin && (
              <>
                <span>·</span>
                <a
                  href={formatUrl(personalInfo.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {cleanDomain(personalInfo.linkedin)}
                </a>
              </>
            )}
            {personalInfo.github && (
              <>
                <span>·</span>
                <a
                  href={formatUrl(personalInfo.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {cleanDomain(personalInfo.github)}
                </a>
              </>
            )}
            {personalInfo.portfolio && (
              <>
                <span>·</span>
                <a
                  href={formatUrl(personalInfo.portfolio)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-1.5' : spacing.sectionGap} flex-1`}>
        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              {isFresher ? 'Profile & Objective' : 'Summary'}
            </h2>
            <p className={`text-slate-800 leading-snug text-justify ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Career Objective
            </h2>
            <p className={`text-slate-800 leading-snug text-justify ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* SKILLS & EXPERTISE */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Skills & Expertise
            </h2>
            <div className={`space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Specialization';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <p key={idx} className="leading-snug">
                      <strong>{catName}: </strong>
                      <span>{skillNames.join(', ')}</span>
                    </p>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <p className="leading-snug">
                      <strong>Technical: </strong>
                      <span>{skills.technical.join(', ')}</span>
                    </p>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <p className="leading-snug">
                      <strong>Tools: </strong>
                      <span>{skills.tools.join(', ')}</span>
                    </p>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <p className="leading-snug">
                      <strong>Leadership: </strong>
                      <span>{skills.soft.join(', ')}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* FOR FRESHERS: EDUCATION FIRST */}
        {isFresher && isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Education
            </h2>
            <div className="space-y-0.5">
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="flex justify-between items-baseline flex-wrap gap-x-2">
                  <div>
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-slate-700 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                      , {edu.institution}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-600 ml-1 font-medium ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                        (CGPA: {edu.gpa})
                      </span>
                    )}
                  </div>
                  <span className={`text-slate-500 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                    {edu.graduationYear || (edu.current ? 'Present' : '')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EXPERIENCE */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Professional Experience
            </h2>
            <div className={spacing.entryGap}>
              {validExp.map((exp, idx) => (
                <div key={exp.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2 font-bold text-slate-900">
                    <span className={isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}>
                      {exp.role} — <span className="font-semibold text-slate-700">{exp.company}{exp.department ? ` (${exp.department})` : ''}</span>
                    </span>
                    <span className={`font-normal text-slate-600 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800 leading-snug ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                      {exp.bulletPoints.filter(Boolean).map((bp, pIdx) => (
                        <li key={pIdx}>{bp}</li>
                      ))}
                    </ul>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <p className={`mt-0.5 text-slate-700 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      <strong>Impact:</strong> {exp.achievements.join('; ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Projects
            </h2>
            <div className="space-y-1">
              {validProj.map((proj, idx) => (
                <div key={proj.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.title}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className={`font-normal text-slate-600 ml-1.5 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                          [{proj.technologies.join(', ')}]
                        </span>
                      )}
                    </span>
                    {proj.role && (
                      <span className={`text-slate-500 italic ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                        {proj.role}
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <p className={`text-slate-700 leading-snug ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                      {proj.description}
                    </p>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-700 leading-snug ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                      {proj.bullets.filter(Boolean).map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcome && (
                    <p className={`text-slate-800 font-medium ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      <strong>Outcome:</strong> {proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOR EXPERIENCED: EDUCATION AFTER EXPERIENCE */}
        {!isFresher && isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Education
            </h2>
            <div className="space-y-0.5">
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="flex justify-between items-baseline flex-wrap gap-x-2">
                  <div>
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-slate-700 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                      , {edu.institution}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-600 ml-1 font-medium ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                        (CGPA: {edu.gpa})
                      </span>
                    )}
                  </div>
                  <span className={`text-slate-500 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                    {edu.graduationYear || (edu.current ? 'Present' : '')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Certifications
            </h2>
            <div className={`space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="flex justify-between items-baseline flex-wrap gap-x-2">
                  <span>
                    <strong>{cert.name}</strong> · {cert.issuer} {cert.type ? `(${cert.type})` : ''}
                  </span>
                  <span className={`text-slate-500 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                    {cert.date}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Key Achievements
            </h2>
            <ul className={`list-disc list-outside ml-4 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
              {validAchievements.map((item, idx) => {
                const ach = formatAchievement(item);
                return (
                  <li key={idx} className="leading-snug">
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
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Languages
            </h2>
            <p className={`text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' · ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFO */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
              Additional Information
            </h2>
            <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
              {additionalInfo?.noticePeriod && (
                <span><strong>Notice:</strong> {additionalInfo.noticePeriod}</span>
              )}
              {additionalInfo?.relocation && (
                <span><strong>Relocation:</strong> {additionalInfo.relocation}</span>
              )}
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <span><strong>Shift:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</span>
              )}
              {additionalInfo?.drivingLicence && (
                <span><strong>Licence:</strong> {additionalInfo.drivingLicence}</span>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) && (
          customSections!.filter((s) => s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))).map((sec, idx) => (
            <section key={sec.id || idx} className="break-inside-avoid">
              <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5 ${isMiniPreview ? 'text-[7.5px]' : 'text-xs'}`}>
                {sec.title}
              </h2>
              {sec.content && (
                <p className={`text-slate-800 leading-snug ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                  {sec.content}
                </p>
              )}
              {sec.items && sec.items.length > 0 && (
                <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'}`}>
                  {sec.items.filter(Boolean).map((item, iIdx) => (
                    <li key={iIdx} className="leading-snug">
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
