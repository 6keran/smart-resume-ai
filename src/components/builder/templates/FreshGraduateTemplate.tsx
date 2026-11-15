'use client';

import React from 'react';
import { ResumeData } from '@/types/resume';
import {
  hasContactInfo,
  formatUrl,
  cleanDomain,
  hasSkillsData,
  hasExperienceData,
  hasEducationData,
  hasProjectsData,
  hasCertificationsData,
  getTemplateSpacing,
  isSectionVisible,
  formatAchievement,
  formatLanguage,
  hasAdditionalInfo,
  hasCustomSections,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
} from './templateUtils';

export function FreshGraduateTemplate({
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
    hiddenSections,
    additionalInfo,
    customSections,
  } = data;
  const spacing = getTemplateSpacing(data, isMiniPreview);

  const validExp = (experience || []).filter((e) => e.role?.trim() || e.company?.trim());
  const validEdu = (education || []).filter((e) => e.degree?.trim() || e.institution?.trim());
  const validProj = (projects || []).filter((p) => p.title?.trim());
  const validCerts = (certifications || []).filter((c) => c.name?.trim());
  const validAchievements = (data.achievements || []).filter((a) => (typeof a === 'string' ? a.trim() : a.title?.trim()));
  const validLanguages = (data.languages || []).filter((l) => (typeof l === 'string' ? l.trim() : l.name?.trim()));

  return (
    <div
      className={`w-full bg-white text-slate-800 font-sans select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${
        isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] ${spacing.lineHeight}`
      }`}
    >
      {/* HEADER: Centered & Confident Entry-Level */}
      <header
        className={`text-center border-b-2 border-blue-700 shrink-0 ${
          isMiniPreview ? 'pb-2 mb-2' : `pb-3.5 ${spacing.headerMarginBottom}`
        }`}
      >
        <h1
          className={`font-extrabold tracking-tight text-slate-900 break-words ${
            isMiniPreview ? 'text-[13px]' : 'text-3xl sm:text-[31px]'
          }`}
        >
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>
        {personalInfo.headline ? (
          <p
            className={`font-semibold text-blue-700 break-words ${
              isMiniPreview ? 'text-[8px] mt-0.5' : 'text-[13.5px] mt-0.5'
            }`}
          >
            {personalInfo.headline}
          </p>
        ) : (
          <p
            className={`font-semibold text-blue-700 break-words ${
              isMiniPreview ? 'text-[8px] mt-0.5' : 'text-[13.5px] mt-0.5'
            }`}
          >
            Entry-Level Graduate & Emerging Professional
          </p>
        )}

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap justify-center items-center text-slate-600 ${
              isMiniPreview
                ? 'gap-x-2 gap-y-0.5 mt-1.5 text-[6px]'
                : 'gap-x-3 gap-y-0.5 mt-2 text-[12px]'
            }`}
          >
            {personalInfo.email && (
              <span className="flex items-center gap-1">
                <MailIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <a href={`mailto:${personalInfo.email}`} className="text-slate-700 hover:text-blue-700 break-all">
                  {personalInfo.email}
                </a>
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <span>{personalInfo.phone}</span>
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <span>{personalInfo.location}</span>
              </span>
            )}
            {personalInfo.linkedin && (
              <span className="flex items-center gap-1">
                <LinkedinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <a
                  href={formatUrl(personalInfo.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline break-all"
                >
                  {cleanDomain(personalInfo.linkedin)}
                </a>
              </span>
            )}
            {personalInfo.github && (
              <span className="flex items-center gap-1">
                <GithubIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <a
                  href={formatUrl(personalInfo.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline break-all"
                >
                  {cleanDomain(personalInfo.github)}
                </a>
              </span>
            )}
            {personalInfo.portfolio && (
              <span className="flex items-center gap-1">
                <GlobeIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700`} />
                <a
                  href={formatUrl(personalInfo.portfolio)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline break-all"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </span>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS: Fresher Strategic Hierarchy (Education & Projects First) */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Career Objective
            </h2>
            <p className="text-slate-700 text-justify leading-relaxed break-words [overflow-wrap:anywhere]">
              {objective}
            </p>
          </section>
        )}

        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Professional Summary
            </h2>
            <p className="text-slate-700 text-justify leading-relaxed break-words [overflow-wrap:anywhere]">
              {summary}
            </p>
          </section>
        )}

        {/* 1. EDUCATION (Priority #1 for Freshers) */}
        {validEdu.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Education & Academic Credentials
            </h2>
            <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
              {validEdu.map((edu) => (
                <div key={edu.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {edu.degree || 'Degree Program'}
                    </span>
                    <span className={`font-semibold text-blue-800 ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'}`}>
                      {edu.graduationYear}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline italic text-slate-600 flex-wrap gap-1">
                    <span className="text-[12.5px]">{edu.institution}</span>
                    {edu.location && <span className="text-[12px]">{edu.location}</span>}
                  </div>
                  {(edu.gpa || edu.honors) && (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                      {edu.gpa && (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-semibold text-[11px]">
                          GPA: {edu.gpa}
                        </span>
                      )}
                      {edu.honors && (
                        <span className="text-slate-700 italic text-[11.5px]">
                          Honors: {edu.honors}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. ACADEMIC & CAPSTONE PROJECTS (Priority #2 for Freshers) */}
        {validProj.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Academic & Capstone Projects
            </h2>
            <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
              {validProj.map((proj) => (
                <div key={proj.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {proj.title}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span
                          className={`font-normal text-blue-700 italic ml-1.5 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          ({proj.technologies.join(', ')})
                        </span>
                      )}
                    </span>
                    {proj.link && (
                      <a
                        href={formatUrl(proj.link)}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-blue-700 hover:underline ${isMiniPreview ? 'text-[5.5px]' : 'text-[12px]'}`}
                      >
                        {cleanDomain(proj.link)}
                      </a>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-slate-700 mt-0.5 leading-relaxed break-words [overflow-wrap:anywhere]">
                      {proj.description}
                    </p>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul
                      className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight}`}
                    >
                      {proj.bullets.map((b, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. TECHNICAL & CORE SKILLS */}
        {hasSkillsData(skills) && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Technical & Core Competencies
            </h2>
            <div
              className={`space-y-1 text-slate-800 ${spacing.lineHeight} ${
                isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'
              }`}
            >
              {skills?.technical && skills.technical.length > 0 && (
                <p className="break-words">
                  <strong className="text-slate-900">Technical Skills: </strong>
                  <span>{skills.technical.join(', ')}</span>
                </p>
              )}
              {skills?.tools && skills.tools.length > 0 && (
                <p className="break-words">
                  <strong className="text-slate-900">Developer Tools & Environments: </strong>
                  <span>{skills.tools.join(', ')}</span>
                </p>
              )}
              {skills?.soft && skills.soft.length > 0 && (
                <p className="break-words">
                  <strong className="text-slate-900">Professional Strengths: </strong>
                  <span>{skills.soft.join(', ')}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* 4. INTERNSHIPS / PRACTICAL EXPERIENCE */}
        {validExp.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Internships & Practical Experience
            </h2>
            <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
              {validExp.map((exp) => (
                <div key={exp.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {exp.role} <span className="font-normal text-slate-600">| {exp.company}</span>
                    </span>
                    <span className={`text-slate-500 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.location && (
                    <p className={`text-slate-500 italic ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                      {exp.location}
                    </p>
                  )}
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul
                      className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight}`}
                    >
                      {exp.bulletPoints.map((bp, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{bp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. CERTIFICATIONS & TRAINING */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Certifications & Industrial Training
            </h2>
            <div className={`space-y-1 ${spacing.lineHeight} ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'}`}>
              {validCerts.map((cert) => (
                <div key={cert.id} className="resume-entry flex justify-between items-baseline flex-wrap gap-1">
                  <span>
                    <strong className="text-slate-900 font-semibold">{cert.name}</strong> · {cert.issuer}
                    {cert.type && <span className="text-slate-500 ml-1">[{cert.type}]</span>}
                    {cert.duration && <span className="text-slate-500 ml-1">({cert.duration})</span>}
                    {cert.credentialId && (
                      <span className="text-slate-500 text-xs ml-1 font-mono">(ID: {cert.credentialId})</span>
                    )}
                  </span>
                  <span className={`text-slate-500 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                    {cert.date}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. KEY ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Key Achievements & Honors
            </h2>
            <ul className={`list-disc list-outside ml-4 mt-1 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validAchievements.map((item, i) => {
                const ach = formatAchievement(item);
                return (
                  <li key={i} className="break-words">
                    <strong className="text-slate-900">{ach.title}</strong>
                    {ach.date && <span className="text-slate-500 ml-1">({ach.date})</span>}
                    {ach.description && <span> — {ach.description}</span>}
                    {ach.result && <span className="font-semibold text-slate-900"> [Result: {ach.result}]</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 7. LANGUAGES KNOWN */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Languages Known
            </h2>
            <p className={`text-slate-700 mt-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* 8. ADDITIONAL INFORMATION */}
        {isSectionVisible('additionalInfo', hiddenSections) && isSectionVisible('additional', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="resume-section">
            <h2
              className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
            >
              Additional Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-700 mt-1 text-[12px]">
              {additionalInfo?.noticePeriod && (
                <p><strong>Notice Period: </strong>{additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Willingness to Relocate: </strong>{additionalInfo.relocation}</p>
              )}
              {additionalInfo?.shiftAvailability && (
                <p><strong>Shift Availability: </strong>{additionalInfo.shiftAvailability}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Driving Licence: </strong>{additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p className="col-span-full">
                  <strong>Memberships: </strong>
                  {Array.isArray(additionalInfo.memberships) ? additionalInfo.memberships.join(', ') : additionalInfo.memberships}
                </p>
              )}
              {additionalInfo?.other && (
                <p className="col-span-full">
                  <strong>Other: </strong>{additionalInfo.other}
                </p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) &&
          customSections!.map((cs) => {
            if (!isSectionVisible(cs.id, hiddenSections) || (!cs.content?.trim() && (!cs.items || cs.items.length === 0))) {
              return null;
            }
            return (
              <section key={cs.id} className="resume-section">
                <h2
                  className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}
                >
                  {cs.title}
                </h2>
                {cs.content && (
                  <p className="text-slate-700 leading-relaxed text-justify break-words mt-1 text-[12.5px]">
                    {cs.content}
                  </p>
                )}
                {cs.items && cs.items.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-700 text-[12px]">
                    {cs.items.map((it, idx) => (
                      <li key={idx} className="break-words">{it}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
}

export { FreshGraduateTemplate as GraduateFresherTemplate };
