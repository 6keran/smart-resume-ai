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

export function ATSClassicTemplate({
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
      className={`w-full bg-white text-black font-serif select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${
        isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] sm:text-[13.5px] ${spacing.lineHeight}`
      }`}
      style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
    >
      {/* HEADER: Centered Traditional ATS */}
      <header className={`text-center pb-2 sm:pb-2.5 ${spacing.headerMarginBottom} border-b-2 border-black shrink-0`}>
        <h1
          className={`font-bold tracking-wide uppercase text-black break-words ${
            isMiniPreview ? 'text-[12px]' : 'text-2xl sm:text-[26px]'
          }`}
        >
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>

        {personalInfo.headline && (
          <p className={`italic text-neutral-800 mt-0.5 break-words ${isMiniPreview ? 'text-[8px]' : 'text-sm sm:text-[15px]'}`}>
            {personalInfo.headline}
          </p>
        )}

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap justify-center items-center gap-x-2.5 gap-y-0.5 mt-1.5 text-neutral-800 ${
              isMiniPreview ? 'text-[6.5px]' : 'text-xs sm:text-[12.5px]'
            }`}
          >
            {personalInfo.location && <span className="break-words">{personalInfo.location}</span>}
            {personalInfo.location && (personalInfo.phone || personalInfo.email) && <span>•</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.phone && personalInfo.email && <span>•</span>}
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="text-black hover:underline break-all">
                {personalInfo.email}
              </a>
            )}
            {personalInfo.linkedin && (
              <>
                <span>•</span>
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
            {personalInfo.portfolio && (
              <>
                <span>•</span>
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
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              {isFresher ? 'CAREER OBJECTIVE' : 'PROFESSIONAL SUMMARY'}
            </h2>
            <p className={`text-neutral-900 ${spacing.lineHeight} text-justify break-words [overflow-wrap:anywhere] ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px] sm:text-[13px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE (When distinct from summary) */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              CAREER OBJECTIVE
            </h2>
            <p className={`text-neutral-900 ${spacing.lineHeight} text-justify break-words [overflow-wrap:anywhere] ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px] sm:text-[13px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* EDUCATION */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              {isFresher ? 'EDUCATION & ACADEMIC CREDENTIALS' : 'EDUCATION'}
            </h2>
            <div className={isMiniPreview ? 'space-y-2' : spacing.entryGap}>
              {validEdu.map((edu) => (
                <div key={edu.id} className="resume-entry min-w-0">
                  <div className="flex justify-between items-baseline font-bold flex-wrap gap-1">
                    <span className={`break-words ${isMiniPreview ? 'text-[7px]' : 'text-[13.5px] sm:text-[14px]'}`}>
                      {edu.degree || 'Degree Program'}
                      {edu.qualification && <span className="font-normal text-neutral-700 ml-1">({edu.qualification})</span>}
                    </span>
                    <span className={`text-neutral-800 ${isMiniPreview ? 'text-[5.5px]' : 'text-[12.5px]'}`}>
                      {edu.startDate ? `${edu.startDate} – ` : ''}
                      {edu.current ? 'Present (Pursuing)' : edu.graduationYear}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline italic text-neutral-800 flex-wrap gap-1">
                    <span className="break-words text-[12.5px] sm:text-[13px]">
                      {edu.institution}
                      {edu.university && <span>, {edu.university}</span>}
                    </span>
                    {edu.location && <span className="text-[12px]">{edu.location}</span>}
                  </div>
                  {(edu.gpa || edu.honors) && (
                    <p className={`text-neutral-700 mt-0.5 ${isMiniPreview ? 'text-[5px]' : 'text-[12px]'}`}>
                      {edu.gpa && <span>Score / CGPA: {edu.gpa}</span>}
                      {edu.gpa && edu.honors && <span> | </span>}
                      {edu.honors && <span>Honors: {edu.honors}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TECHNICAL & CATEGORIZED SKILLS */}
        {isSectionVisible('skills', hiddenSections) && hasSkillsData(skills) && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              AREAS OF EXPERTISE & TECHNICAL SKILLS
            </h2>
            <div className={`space-y-1 text-neutral-900 ${spacing.lineHeight} ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px] sm:text-[13px]'}`}>
              {/* Categorized groups if available */}
              {skills.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const renderedSkills = (cat.skills || []).map((sk) =>
                    typeof sk === 'string' ? sk : `${sk.name}${sk.level ? ` (${sk.level})` : ''}`
                  );
                  if (renderedSkills.length === 0) return null;
                  return (
                    <p key={idx} className="break-words">
                      <strong>{cat.category}: </strong>
                      <span>{renderedSkills.join(', ')}</span>
                    </p>
                  );
                })
              ) : (
                <>
                  {skills.technical && skills.technical.length > 0 && (
                    <p className="break-words">
                      <strong>Technical Skills: </strong>
                      <span>{skills.technical.join(', ')}</span>
                    </p>
                  )}
                  {skills.tools && skills.tools.length > 0 && (
                    <p className="break-words">
                      <strong>Tools & Technologies: </strong>
                      <span>{skills.tools.join(', ')}</span>
                    </p>
                  )}
                </>
              )}
              {skills.soft && skills.soft.length > 0 && (
                <p className="break-words">
                  <strong>Professional & Soft Skills: </strong>
                  <span>{skills.soft.join(', ')}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* PROFESSIONAL EXPERIENCE / INTERNSHIPS */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              {isFresher ? 'INTERNSHIPS & PRACTICAL EXPERIENCE' : 'PROFESSIONAL EXPERIENCE'}
            </h2>
            <div className={isMiniPreview ? 'space-y-2' : spacing.entryGap}>
              {validExp.map((exp) => (
                <div key={exp.id} className="resume-entry min-w-0">
                  <div className="flex justify-between items-baseline font-bold flex-wrap gap-1">
                    <span className={`break-words ${isMiniPreview ? 'text-[7px]' : 'text-[13.5px] sm:text-[14px]'}`}>
                      {exp.role}
                      {exp.department && <span className="font-normal text-neutral-700">, {exp.department}</span>}
                      {' – '}
                      <span className="font-normal italic">{exp.company}</span>
                      {exp.employmentType && (
                        <span className="font-normal text-neutral-600 text-[11px] ml-1.5">
                          [{exp.employmentType}]
                        </span>
                      )}
                    </span>
                    <span className={`text-neutral-800 ${isMiniPreview ? 'text-[5.5px]' : 'text-[12.5px]'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.location && (
                    <p className={`italic text-neutral-700 mt-0.5 ${isMiniPreview ? 'text-[5px]' : 'text-[12px]'}`}>{exp.location}</p>
                  )}
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-neutral-900 ${spacing.lineHeight} ${isMiniPreview ? 'text-[5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
                      {exp.bulletPoints.map((bp, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{bp}</li>
                      ))}
                    </ul>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-1 text-neutral-800 text-[12px]">
                      <strong>Key Achievements: </strong>
                      <span>{exp.achievements.join(' • ')}</span>
                    </div>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-0.5 text-neutral-700 text-[11.5px]">
                      <em>Tools & Technologies: {Array.isArray(exp.technologies) ? exp.technologies.join(', ') : exp.technologies}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACADEMIC & TECHNICAL PROJECTS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              ACADEMIC & TECHNICAL PROJECTS
            </h2>
            <div className={isMiniPreview ? 'space-y-2' : spacing.entryGap}>
              {validProj.map((proj) => (
                <div key={proj.id} className="resume-entry min-w-0">
                  <div className="flex justify-between items-baseline font-bold flex-wrap gap-1">
                    <span className={`break-words ${isMiniPreview ? 'text-[7px]' : 'text-[13.5px] sm:text-[14px]'}`}>
                      {proj.title}
                      {proj.role && <span className="font-normal italic text-neutral-700 ml-1">({proj.role})</span>}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className="font-normal text-neutral-700 ml-1">
                          [{proj.technologies.join(', ')}]
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {proj.startDate && (
                        <span className={`text-neutral-700 ${isMiniPreview ? 'text-[5px]' : 'text-[11.5px]'}`}>
                          {proj.startDate}{proj.endDate ? ` – ${proj.endDate}` : ''}
                        </span>
                      )}
                      {proj.link && (
                        <a
                          href={formatUrl(proj.link)}
                          target="_blank"
                          rel="noreferrer"
                          className={`font-normal hover:underline break-all ${isMiniPreview ? 'text-[5px]' : 'text-[12px]'}`}
                        >
                          {cleanDomain(proj.link)}
                        </a>
                      )}
                    </div>
                  </div>
                  {proj.objective && (
                    <p className={`text-neutral-800 mt-0.5 ${spacing.lineHeight} break-words ${isMiniPreview ? 'text-[5.5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
                      <strong>Objective: </strong>{proj.objective}
                    </p>
                  )}
                  {proj.description && (
                    <p className={`text-neutral-800 mt-0.5 ${spacing.lineHeight} break-words [overflow-wrap:anywhere] ${isMiniPreview ? 'text-[5.5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
                      {proj.description}
                    </p>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-neutral-800 ${spacing.lineHeight} ${isMiniPreview ? 'text-[5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
                      {proj.bullets.map((b, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{b}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcome && (
                    <p className={`text-neutral-800 mt-0.5 text-[12px] italic break-words`}>
                      <strong>Outcome: </strong>{proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS & TRAINING */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              CERTIFICATIONS & INDUSTRIAL TRAINING
            </h2>
            <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
              {validCerts.map((cert) => (
                <div key={cert.id} className="flex justify-between items-baseline text-neutral-900 resume-entry flex-wrap gap-1 py-0.5">
                  <span className="break-words text-[12.5px] sm:text-[13px]">
                    <strong>{cert.name}</strong> – {cert.issuer}
                    {cert.type && <span className="text-neutral-600 ml-1">[{cert.type}]</span>}
                    {cert.duration && <span className="text-neutral-600 ml-1">({cert.duration})</span>}
                    {cert.credentialId && (
                      <span className={`text-neutral-600 ml-1 ${isMiniPreview ? 'text-[5px]' : 'text-[12px]'}`}>
                        (ID: {cert.credentialId})
                      </span>
                    )}
                  </span>
                  <span className={`text-neutral-800 ${isMiniPreview ? 'text-[5.5px]' : 'text-[12.5px]'}`}>{cert.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KEY ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              KEY ACHIEVEMENTS & AWARDS
            </h2>
            <ul className={`list-disc list-outside ml-4 mt-1 ${spacing.bulletGap} text-neutral-800 ${spacing.lineHeight} ${isMiniPreview ? 'text-[5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
              {validAchievements.map((item, i) => {
                const ach = formatAchievement(item);
                return (
                  <li key={i} className="break-words">
                    <strong>{ach.title}</strong>
                    {ach.date && <span className="text-neutral-600 ml-1">({ach.date})</span>}
                    {ach.description && <span> – {ach.description}</span>}
                    {ach.result && <span className="font-medium text-neutral-900"> (Result: {ach.result})</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* LANGUAGES KNOWN */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              LANGUAGES KNOWN
            </h2>
            <p className={`text-neutral-800 mt-1 ${isMiniPreview ? 'text-[5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFORMATION */}
        {isSectionVisible('additional', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
              ADDITIONAL INFORMATION
            </h2>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-neutral-800 mt-1 text-[12px] sm:text-[12.5px]`}>
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
                  <strong>Professional Memberships: </strong>
                  {Array.isArray(additionalInfo.memberships) ? additionalInfo.memberships.join(', ') : additionalInfo.memberships}
                </p>
              )}
              {additionalInfo?.other && (
                <p className="col-span-full">
                  <strong>Other Information: </strong>{additionalInfo.other}
                </p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) &&
          hasCustomSections(customSections) &&
          customSections!.map((cs) => {
            if (!isSectionVisible(cs.id, hiddenSections) || (!cs.content?.trim() && (!cs.items || cs.items.length === 0))) {
              return null;
            }
            return (
              <section key={cs.id} className="resume-section">
                <h2 className={`font-bold uppercase tracking-wider border-b-2 border-black pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px] sm:text-[14px]'}`}>
                  {cs.title}
                </h2>
                {cs.content && (
                  <p className={`text-neutral-900 ${spacing.lineHeight} text-justify break-words mt-1 ${isMiniPreview ? 'text-[6px]' : 'text-[12.5px] sm:text-[13px]'}`}>
                    {cs.content}
                  </p>
                )}
                {cs.items && cs.items.length > 0 && (
                  <ul className={`list-disc list-outside ml-4 mt-1 ${spacing.bulletGap} text-neutral-800 ${spacing.lineHeight} ${isMiniPreview ? 'text-[5px]' : 'text-[12.5px] sm:text-[13px]'}`}>
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
