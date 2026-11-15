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

export function MinimalistATSTemplate({
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
      className={`w-full bg-white text-black font-sans select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${
        isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] ${spacing.lineHeight}`
      }`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* HEADER: Pure text, zero graphics, standard parser-friendly layout */}
      <header className={`pb-2 ${spacing.headerMarginBottom} border-b border-black shrink-0`}>
        <h1
          className={`font-bold uppercase tracking-tight text-black break-words ${
            isMiniPreview ? 'text-[12px]' : 'text-2xl sm:text-[24px]'
          }`}
        >
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>

        {personalInfo.headline && (
          <p className={`font-semibold text-neutral-800 mt-0.5 break-words ${isMiniPreview ? 'text-[8px]' : 'text-sm sm:text-[14px]'}`}>
            {personalInfo.headline}
          </p>
        )}

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-neutral-800 ${
              isMiniPreview ? 'text-[6.5px]' : 'text-xs sm:text-[12px]'
            }`}
          >
            {personalInfo.location && <span className="break-words">{personalInfo.location}</span>}
            {personalInfo.location && (personalInfo.phone || personalInfo.email) && <span>|</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.phone && personalInfo.email && <span>|</span>}
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="text-black hover:underline break-all">
                {personalInfo.email}
              </a>
            )}
            {personalInfo.linkedin && (
              <>
                <span>|</span>
                <a
                  href={formatUrl(personalInfo.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-black hover:underline break-all"
                >
                  {cleanDomain(personalInfo.linkedin)}
                </a>
              </>
            )}
            {personalInfo.github && (
              <>
                <span>|</span>
                <a
                  href={formatUrl(personalInfo.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-black hover:underline break-all"
                >
                  {cleanDomain(personalInfo.github)}
                </a>
              </>
            )}
            {personalInfo.portfolio && (
              <>
                <span>|</span>
                <a
                  href={formatUrl(personalInfo.portfolio)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-black hover:underline break-all"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Professional Summary
            </h2>
            <p className={`text-neutral-900 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Career Objective
            </h2>
            <p className={`text-neutral-900 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* FOR FRESHERS: EDUCATION FIRST */}
        {isFresher && isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Education
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-black ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'Present' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-neutral-800 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? ` (${edu.university})` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-neutral-900 font-medium ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        CGPA/Score: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WORK EXPERIENCE */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Professional Experience
            </h2>
            <div className={spacing.entryGap}>
              {validExp.map((exp, idx) => (
                <div key={exp.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-black ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {exp.role}
                    </span>
                    <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-neutral-800 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {exp.company}
                      {exp.department ? ` (${exp.department})` : ''}
                      {exp.employmentType ? ` • ${exp.employmentType}` : ''}
                      {exp.location ? ` — ${exp.location}` : ''}
                    </span>
                  </div>

                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-1 space-y-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {exp.bulletPoints.filter(Boolean).map((pt, pIdx) => (
                        <li key={pIdx} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-1">
                      <span className={`font-semibold text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        Key Results:{' '}
                      </span>
                      <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        {exp.achievements.filter(Boolean).join('; ')}
                      </span>
                    </div>
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-0.5">
                      <span className={`font-semibold text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        Tools/Technologies:{' '}
                      </span>
                      <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        {exp.technologies.filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {isFresher ? 'Academic & Key Projects' : 'Projects'}
            </h2>
            <div className={spacing.entryGap}>
              {validProj.map((proj, idx) => (
                <div key={proj.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-black ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {proj.title}
                      {proj.role ? ` (${proj.role})` : ''}
                    </span>
                    {(proj.startDate || proj.technologies?.length > 0) && (
                      <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        {proj.technologies && proj.technologies.length > 0 ? proj.technologies.join(', ') : proj.startDate}
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <p className={`mt-0.5 text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.description}
                    </p>
                  )}

                  {proj.objective && (
                    <p className={`mt-0.5 text-neutral-800 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      <strong>Objective:</strong> {proj.objective}
                    </p>
                  )}

                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.bullets.filter(Boolean).map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {proj.outcome && (
                    <p className={`mt-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      <strong>Outcome:</strong> {proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOR EXPERIENCED CANDIDATES: EDUCATION AFTER EXPERIENCE */}
        {!isFresher && isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Education
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-black ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-neutral-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'Present' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-neutral-800 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? ` (${edu.university})` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-neutral-900 font-medium ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                        CGPA/Score: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TECHNICAL SKILLS */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Skills & Proficiencies
            </h2>
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {/* Categorized Skills if present */}
              {skills?.categories && skills.categories.length > 0 && (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Technical Domain';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-1.5">
                      <span className="font-bold text-black">{catName}:</span>
                      <span className="text-neutral-800">{skillNames.join(', ')}</span>
                    </div>
                  );
                })
              )}

              {/* Flat technical skills if categories not used */}
              {(!skills?.categories || skills.categories.length === 0) && skills?.technical && skills.technical.length > 0 && (
                <div className="flex flex-wrap gap-x-1.5">
                  <span className="font-bold text-black">Technical Skills:</span>
                  <span className="text-neutral-800">{skills.technical.join(', ')}</span>
                </div>
              )}

              {skills?.tools && skills.tools.length > 0 && (
                <div className="flex flex-wrap gap-x-1.5">
                  <span className="font-bold text-black">Tools & Technologies:</span>
                  <span className="text-neutral-800">{skills.tools.join(', ')}</span>
                </div>
              )}

              {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                <div className="flex flex-wrap gap-x-1.5">
                  <span className="font-bold text-black">Core Competencies:</span>
                  <span className="text-neutral-800">{skills.soft.join(', ')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Certifications & Licences
            </h2>
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="flex justify-between items-baseline flex-wrap gap-x-2">
                  <span className="text-neutral-900">
                    <strong>{cert.name}</strong>
                    {cert.issuer ? ` — ${cert.issuer}` : ''}
                    {cert.type ? ` (${cert.type})` : ''}
                  </span>
                  {cert.date && (
                    <span className={`text-neutral-700 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {cert.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Key Achievements
            </h2>
            <ul className={`list-disc list-outside ml-4 space-y-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
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
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Languages
            </h2>
            <p className={`text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' | ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFO */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Additional Information
            </h2>
            <div className={`space-y-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {additionalInfo?.noticePeriod && (
                <p><strong>Notice Period:</strong> {additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
              )}
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <p><strong>Shift Availability:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Driving Licence:</strong> {additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p><strong>Professional Memberships:</strong> {additionalInfo.memberships.join(', ')}</p>
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
              <h2 className={`font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
                {sec.title}
              </h2>
              {sec.content && (
                <p className={`text-neutral-900 leading-relaxed ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                  {sec.content}
                </p>
              )}
              {sec.items && sec.items.length > 0 && (
                <ul className={`list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-900 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
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
