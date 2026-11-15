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
} from './templateUtils';

export function ExperiencedProfessionalTemplate({
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
      className={`w-full bg-white text-slate-800 font-sans select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${isMiniPreview ? "text-[7px] leading-tight" : `text-[13px] ${spacing.lineHeight}`}`}
    >
      {/* HEADER: Distinguished Career Narrative */}
      <header className={`pb-3.5 ${spacing.headerMarginBottom} border-b-2 border-slate-700 shrink-0`}>
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <div>
            <h1
              className={`font-black tracking-tight text-slate-950 ${
                isMiniPreview ? 'text-[13px]' : 'text-3xl'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p className={`font-semibold text-slate-700 tracking-wide mt-0.5 ${isMiniPreview ? 'text-[8px]' : 'text-sm'}`}>
                {personalInfo.headline}
              </p>
            )}
          </div>
        </div>

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-3.5 gap-y-0.5 mt-2 text-slate-600 ${
              isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'
            }`}
          >
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="text-slate-900 font-medium hover:underline">
                {personalInfo.email}
              </a>
            )}
            {personalInfo.phone && <span>·</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>·</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
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
      <div className={`${isMiniPreview ? "space-y-2" : spacing.sectionGap} flex-1`}>
        {/* EXECUTIVE SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              {isFresher ? 'CAREER OBJECTIVE' : 'EXECUTIVE SUMMARY & CAREER PROFILE'}
            </h2>
            <p className="text-slate-700 leading-relaxed text-justify">{summary}</p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              CAREER OBJECTIVE
            </h2>
            <p className="text-slate-700 leading-relaxed text-justify">{objective}</p>
          </section>
        )}

        {/* CHRONOLOGICAL CAREER PROGRESSION */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              CHRONOLOGICAL CAREER PROGRESSION
            </h2>
            <div className={isMiniPreview ? "space-y-1.5" : spacing.entryGap}>
              {validExp.map((exp) => (
                <div key={exp.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {exp.role}
                      {exp.department && <span className="font-normal text-slate-600">, {exp.department}</span>}
                      {' — '}
                      <span className="font-semibold text-slate-700">{exp.company}</span>
                      {exp.employmentType && (
                        <span className="font-normal text-slate-500 text-[11px] ml-1.5">
                          [{exp.employmentType}]
                        </span>
                      )}
                    </span>
                    <span className={`font-medium text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.location && (
                    <p className={`text-slate-500 italic mb-0.5 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>{exp.location}</p>
                  )}
                  {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-1 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} leading-relaxed`}>
                      {exp.bulletPoints.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-1 text-slate-800 text-[12px]">
                      <strong>Key Achievements: </strong>
                      <span>{exp.achievements.join(' • ')}</span>
                    </div>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-0.5 text-slate-600 text-[11px]">
                      <em>Tools & Technologies: {Array.isArray(exp.technologies) ? exp.technologies.join(', ') : exp.technologies}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STRATEGIC PROJECTS & DELIVERABLES */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              KEY INITIATIVES & HIGH-IMPACT PROJECTS
            </h2>
            <div className={isMiniPreview ? "space-y-1.5" : spacing.entryGap}>
              {validProj.map((proj) => (
                <div key={proj.id} className="resume-entry">
                  <div className="flex justify-between items-baseline flex-wrap gap-1">
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {proj.title}
                      {proj.role && <span className="font-normal italic text-slate-600 ml-1">({proj.role})</span>}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className={`font-normal text-slate-600 ml-1.5 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                          [{proj.technologies.join(', ')}]
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {proj.startDate && (
                        <span className={`text-slate-500 ${isMiniPreview ? 'text-[5px]' : 'text-[11.5px]'}`}>
                          {proj.startDate}{proj.endDate ? ` – ${proj.endDate}` : ''}
                        </span>
                      )}
                      {proj.link && (
                        <a
                          href={formatUrl(proj.link)}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-slate-600 hover:text-black ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}
                        >
                          {cleanDomain(proj.link)}
                        </a>
                      )}
                    </div>
                  </div>
                  {proj.objective && (
                    <p className="text-slate-700 mt-0.5 text-[12px]">
                      <strong>Objective: </strong>{proj.objective}
                    </p>
                  )}
                  {proj.description && (
                    <p className="text-slate-700 mt-0.5 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {proj.bullets && proj.bullets.length > 0 && (
                    <ul className={`list-disc list-outside ml-4 mt-0.5 ${spacing.bulletGap} text-slate-700 ${spacing.lineHeight} leading-relaxed`}>
                      {proj.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcome && (
                    <p className="text-slate-800 font-medium mt-0.5 text-[11.5px]">
                      <strong>Impact: </strong>{proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SKILLS */}
        {isSectionVisible('skills', hiddenSections) && hasSkillsData(skills) && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              CORE EXPERTISE & TECHNICAL CAPABILITIES
            </h2>
            <div className={`space-y-1 text-slate-700 ${spacing.lineHeight}`}>
              {skills.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const renderedSkills = (cat.skills || []).map((sk) =>
                    typeof sk === 'string' ? sk : `${sk.name}${sk.level ? ` (${sk.level})` : ''}`
                  );
                  if (renderedSkills.length === 0) return null;
                  return (
                    <p key={idx}>
                      <strong className="text-slate-900 font-semibold">{cat.category}: </strong>
                      <span>{renderedSkills.join(', ')}</span>
                    </p>
                  );
                })
              ) : (
                <>
                  {skills.technical && skills.technical.length > 0 && (
                    <p>
                      <strong className="text-slate-900 font-semibold">Technical Infrastructure: </strong>
                      <span>{skills.technical.join(', ')}</span>
                    </p>
                  )}
                  {skills.tools && skills.tools.length > 0 && (
                    <p>
                      <strong className="text-slate-900 font-semibold">Tools & Architecture: </strong>
                      <span>{skills.tools.join(', ')}</span>
                    </p>
                  )}
                </>
              )}
              {skills.soft && skills.soft.length > 0 && (
                <p>
                  <strong className="text-slate-900 font-semibold">Executive Leadership: </strong>
                  <span>{skills.soft.join(', ')}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* EDUCATION */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              EDUCATION & ACADEMIC CREDENTIALS
            </h2>
            <div className={isMiniPreview ? "space-y-1.5" : spacing.entryGap}>
              {validEdu.map((edu) => (
                <div key={edu.id} className="resume-entry flex justify-between items-baseline flex-wrap gap-1">
                  <div>
                    <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[7px]' : 'text-[14px]'}`}>
                      {edu.degree}
                      {edu.qualification && <span className="font-normal text-slate-600 ml-1">({edu.qualification})</span>}
                    </span>
                    <span className={`text-slate-700 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {' '}— {edu.institution}
                      {edu.university && <span>, {edu.university}</span>}
                    </span>
                    {edu.gpa && (
                      <span className="font-semibold text-slate-800 ml-1 text-[11.5px]">
                        [Score: {edu.gpa}]
                      </span>
                    )}
                    {edu.honors && (
                      <span className={`text-slate-600 italic ml-1 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>({edu.honors})</span>
                    )}
                  </div>
                  <span className={`font-medium text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>
                    {edu.startDate ? `${edu.startDate} – ` : ''}
                    {edu.current ? 'Pursuing' : edu.graduationYear}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              CERTIFICATIONS & CREDENTIALS
            </h2>
            <div className={`${spacing.bulletGap} text-slate-700 ${spacing.lineHeight}`}>
              {validCerts.map((cert) => (
                <div key={cert.id} className="resume-entry flex justify-between items-baseline flex-wrap gap-1">
                  <span>
                    <strong className="text-slate-900 font-semibold">{cert.name}</strong> · {cert.issuer}
                    {cert.type && <span className="text-slate-500 ml-1">[{cert.type}]</span>}
                    {cert.duration && <span className="text-slate-500 ml-1">({cert.duration})</span>}
                    {cert.credentialId && <span className="text-slate-500 ml-1">(ID: {cert.credentialId})</span>}
                  </span>
                  <span className={`text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-[12px]'}`}>{cert.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KEY ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              KEY ACHIEVEMENTS & HONORS
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

        {/* LANGUAGES */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="resume-section">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              LANGUAGES KNOWN
            </h2>
            <p className={`text-slate-700 mt-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
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
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
              ADDITIONAL INFORMATION
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
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) &&
          customSections!.map((cs) => {
            if (!isSectionVisible(cs.id, hiddenSections) || (!cs.content?.trim() && (!cs.items || cs.items.length === 0))) {
              return null;
            }
            return (
              <section key={cs.id} className="resume-section">
                <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[7.5px]' : 'text-[14.5px]'}`}>
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
