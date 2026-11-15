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
  ExternalLinkIcon,
} from './templateUtils';

export function SoftwareEngineerTemplate({
  data,
  isMiniPreview = false,
}: {
  data: ResumeData;
  isMiniPreview?: boolean;
}) {
  const spacing = getTemplateSpacing(data, isMiniPreview);
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
      {/* HEADER: Tech & Code Focused */}
      <header className={`pb-3 ${spacing.headerMarginBottom} border-b-2 border-blue-700 shrink-0`}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h1
              className={`font-mono font-bold tracking-tight text-slate-900 break-words ${
                isMiniPreview ? 'text-[13px]' : 'text-3xl'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p
                className={`font-mono text-blue-700 font-medium mt-0.5 break-words ${
                  isMiniPreview ? 'text-[8px]' : 'text-sm'
                }`}
              >
                &gt; {personalInfo.headline}
              </p>
            )}
          </div>
        </div>

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2 text-slate-600 font-mono ${
              isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'
            }`}
          >
            {personalInfo.email && (
              <span className="flex items-center gap-1.5">
                <MailIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                <a href={`mailto:${personalInfo.email}`} className="text-slate-700 hover:text-blue-700 break-all">
                  {personalInfo.email}
                </a>
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-1.5">
                <PhoneIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                <span>{personalInfo.phone}</span>
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                <span>{personalInfo.location}</span>
              </span>
            )}
            {personalInfo.github && (
              <span className="flex items-center gap-1.5">
                <GithubIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
                <a
                  href={formatUrl(personalInfo.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 font-semibold hover:underline break-all"
                >
                  {cleanDomain(personalInfo.github)}
                </a>
              </span>
            )}
            {personalInfo.linkedin && (
              <span className="flex items-center gap-1.5">
                <LinkedinIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
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
            {personalInfo.portfolio && (
              <span className="flex items-center gap-1.5">
                <GlobeIcon className={`${isMiniPreview ? 'w-2 h-2' : 'w-3 h-3'} text-blue-700 shrink-0`} />
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

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// '}{isFresher ? 'ENGINEERING OBJECTIVE' : 'PROFILE & SUMMARY'}
            </h2>
            <p className="text-slate-700 leading-relaxed font-sans text-justify break-words [overflow-wrap:anywhere]">
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// CAREER OBJECTIVE'}
            </h2>
            <p className="text-slate-700 leading-relaxed font-sans text-justify break-words [overflow-wrap:anywhere]">
              {objective}
            </p>
          </section>
        )}

        {/* TECHNICAL & CATEGORIZED SKILLS MATRIX */}
        {isSectionVisible('skills', hiddenSections) && hasSkillsData(skills) && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// TECHNICAL SKILLS & DOMAIN EXPERTISE'}
            </h2>
            <div
              className={`bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5 font-mono ${
                isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'
              }`}
            >
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const renderedSkills = (cat.skills || []).map((sk) =>
                    typeof sk === 'string' ? sk : `${sk.name}${sk.level ? ` [${sk.level}]` : ''}`
                  );
                  if (renderedSkills.length === 0) return null;
                  return (
                    <div key={idx} className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-bold text-slate-900 shrink-0">{cat.category}:</span>
                      <span className="text-slate-700 break-words">{renderedSkills.join(' · ')}</span>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-bold text-slate-900 shrink-0">Technical Skills:</span>
                      <span className="text-slate-700 break-words">{skills.technical.join(' · ')}</span>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-bold text-slate-900 shrink-0">Tools & Machinery:</span>
                      <span className="text-slate-700 break-words">{skills.tools.join(' · ')}</span>
                    </div>
                  )}
                </>
              )}
              {skills?.soft && skills.soft.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="font-bold text-slate-900 shrink-0">Professional Competencies:</span>
                  <span className="text-slate-700 break-words">{skills.soft.join(' · ')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* EXPERIENCE (Or Internships for Fresher) */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// '}{isFresher ? 'INTERNSHIPS & PRACTICAL EXPERIENCE' : 'ENGINEERING EXPERIENCE'}
            </h2>
            <div className={isMiniPreview ? 'space-y-2' : spacing.entryGap}>
              {validExp.map((exp) => (
                <div key={exp.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {exp.role}
                      {exp.department && <span className="font-normal text-slate-600"> ({exp.department})</span>}
                      {' – '}
                      <span className="font-semibold text-blue-700">{exp.company}</span>
                      {exp.employmentType && (
                        <span className="font-mono text-slate-500 text-[11px] ml-1.5">
                          [{exp.employmentType}]
                        </span>
                      )}
                    </span>
                    <span className={`font-mono text-slate-500 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.location && (
                    <p className={`font-mono text-slate-500 text-[11.5px] mt-0.5`}>{exp.location}</p>
                  )}
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul
                      className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} leading-relaxed`}
                    >
                      {exp.bulletPoints.map((bp, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{bp}</li>
                      ))}
                    </ul>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-1 font-mono text-slate-800 text-[11.5px]">
                      <strong>Achievements: </strong>
                      <span>{exp.achievements.join(' · ')}</span>
                    </div>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-0.5 font-mono text-blue-700 text-[11px]">
                      Tools & Technologies: {Array.isArray(exp.technologies) ? exp.technologies.join(', ') : exp.technologies}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// ACADEMIC & TECHNICAL PROJECTS'}
            </h2>
            <div className={isMiniPreview ? 'space-y-2' : spacing.entryGap}>
              {validProj.map((proj) => (
                <div key={proj.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {proj.title}
                      {proj.role && <span className="font-normal italic text-slate-600 ml-1">({proj.role})</span>}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span
                          className={`font-mono text-blue-700 font-semibold ml-1.5 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          [{proj.technologies.join(', ')}]
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {proj.startDate && (
                        <span className={`font-mono text-slate-500 ${isMiniPreview ? 'text-[5px]' : 'text-[11.5px]'}`}>
                          {proj.startDate}{proj.endDate ? ` – ${proj.endDate}` : ''}
                        </span>
                      )}
                      {proj.link && (
                        <a
                          href={formatUrl(proj.link)}
                          target="_blank"
                          rel="noreferrer"
                          className={`font-mono text-blue-700 hover:underline flex items-center gap-1 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          <GithubIcon className="w-2.5 h-2.5" />
                          {cleanDomain(proj.link)}
                        </a>
                      )}
                    </div>
                  </div>
                  {proj.objective && (
                    <p className="font-mono text-slate-700 mt-0.5 text-[12px] leading-relaxed break-words">
                      <strong>Objective: </strong>{proj.objective}
                    </p>
                  )}
                  {proj.description && (
                    <p className="text-slate-700 mt-0.5 leading-relaxed break-words [overflow-wrap:anywhere]">
                      {proj.description}
                    </p>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul
                      className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} leading-relaxed`}
                    >
                      {proj.bullets.map((b, i) => (
                        <li key={i} className="break-words [overflow-wrap:anywhere]">{b}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcome && (
                    <p className="font-mono text-slate-700 mt-0.5 text-[11.5px] italic break-words">
                      <strong>Outcome: </strong>{proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EDUCATION */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// EDUCATION & QUALIFICATIONS'}
            </h2>
            <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
              {validEdu.map((edu) => (
                <div key={edu.id} className="resume-entry flex justify-between items-baseline flex-wrap gap-1">
                  <div>
                    <span className="font-bold text-slate-900">
                      {edu.degree}
                      {edu.qualification && <span className="font-normal text-slate-600 ml-1">({edu.qualification})</span>}
                    </span>
                    <span className="text-slate-600 ml-1">
                      — {edu.institution}
                      {edu.university && <span>, {edu.university}</span>}
                      {edu.location && <span className="italic"> ({edu.location})</span>}
                    </span>
                    {edu.gpa && (
                      <span className="font-mono text-blue-700 font-semibold ml-2">
                        [Score: {edu.gpa}]
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-slate-500 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                    {edu.startDate ? `${edu.startDate} – ` : ''}
                    {edu.current ? 'Pursuing' : edu.graduationYear}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS & TRAINING */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// CERTIFICATIONS & INDUSTRIAL TRAINING'}
            </h2>
            <div
              className={`${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} font-mono ${
                isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'
              }`}
            >
              {validCerts.map((cert) => (
                <div key={cert.id} className="resume-entry flex justify-between items-baseline flex-wrap gap-1">
                  <span>
                    <strong className="text-slate-900 font-semibold">{cert.name}</strong> · {cert.issuer}
                    {cert.type && <span className="text-slate-500 ml-1">[{cert.type}]</span>}
                    {cert.duration && <span className="text-slate-500 ml-1">({cert.duration})</span>}
                    {cert.credentialId && <span className="text-slate-500 ml-1">(ID: {cert.credentialId})</span>}
                  </span>
                  <span className={`text-slate-500 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>{cert.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// HONORS & ACHIEVEMENTS'}
            </h2>
            <ul className={`list-disc list-outside ml-4 mt-1 ${spacing.bulletGap} text-slate-700 font-mono ${spacing.lineHeight} ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validAchievements.map((item, i) => {
                const ach = formatAchievement(item);
                return (
                  <li key={i} className="break-words">
                    <strong>{ach.title}</strong>
                    {ach.date && <span className="text-slate-500 ml-1">({ach.date})</span>}
                    {ach.description && <span> – {ach.description}</span>}
                    {ach.result && <span className="font-semibold text-slate-900"> [Result: {ach.result}]</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* LANGUAGES */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// LANGUAGES'}
            </h2>
            <p className={`text-slate-700 font-mono mt-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFORMATION */}
        {isSectionVisible('additionalInfo', hiddenSections) && isSectionVisible('additional', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="resume-section">
            <h2
              className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
              }`}
            >
              {'// ADDITIONAL INFORMATION'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-700 font-mono mt-1 text-[12px]">
              {additionalInfo?.noticePeriod && (
                <p><strong>Notice Period: </strong>{additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation: </strong>{additionalInfo.relocation}</p>
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
                  className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1 ${
                    isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'
                  }`}
                >
                  {'// '}{cs.title.toUpperCase()}
                </h2>
                {cs.content && (
                  <p className="text-slate-700 leading-relaxed font-sans text-justify break-words mt-1 text-[12.5px]">
                    {cs.content}
                  </p>
                )}
                {cs.items && cs.items.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-700 font-mono text-[12px]">
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
