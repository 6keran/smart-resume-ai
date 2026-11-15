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

export function AcademicTemplate({
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
  const spacing = getTemplateSpacing(data, isMiniPreview);

  const validExp = (experience || []).filter((e) => e.role?.trim() || e.company?.trim());
  const validEdu = (education || []).filter((e) => e.degree?.trim() || e.institution?.trim());
  const validProj = (projects || []).filter((p) => p.title?.trim());
  const validCerts = (certifications || []).filter((c) => c.name?.trim());
  const validAchievements = (data.achievements || []).filter((a) => (typeof a === 'string' ? a.trim() : a.title?.trim()));
  const validLanguages = (data.languages || []).filter((l) => (typeof l === 'string' ? l.trim() : l.name?.trim()));

  return (
    <div
      className={`w-full bg-white text-slate-900 font-serif select-text flex-1 flex flex-col min-h-full ${spacing.containerPadding} ${
        isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] ${spacing.lineHeight}`
      }`}
      style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
    >
      {/* HEADER: Formal Scholarly Curriculum Vitae Header */}
      <header className={`text-center pb-3 ${spacing.headerMarginBottom} border-b-2 border-slate-900 shrink-0`}>
        <h1
          className={`font-normal tracking-wide text-slate-950 uppercase break-words ${
            isMiniPreview ? 'text-[13px]' : 'text-3xl sm:text-[28px]'
          }`}
        >
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>

        {personalInfo.headline && (
          <p className={`italic text-slate-700 mt-1 break-words ${isMiniPreview ? 'text-[8px]' : 'text-sm sm:text-[14.5px]'}`}>
            {personalInfo.headline}
          </p>
        )}

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-2 text-slate-700 ${
              isMiniPreview ? 'text-[6px]' : 'text-xs sm:text-[12px]'
            }`}
          >
            {personalInfo.location && <span className="break-words">{personalInfo.location}</span>}
            {personalInfo.location && (personalInfo.phone || personalInfo.email) && <span>•</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.phone && personalInfo.email && <span>•</span>}
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="text-slate-900 hover:underline break-all">
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
                  className="text-slate-900 hover:underline break-all"
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
                  className="text-slate-900 hover:underline break-all"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </>
            )}
            {personalInfo.github && (
              <>
                <span>•</span>
                <a
                  href={formatUrl(personalInfo.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 hover:underline break-all"
                >
                  {cleanDomain(personalInfo.github)}
                </a>
              </>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* RESEARCH INTERESTS / SCHOLARLY SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Research Interests & Scholarly Profile
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE / ACADEMIC MISSION */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Academic Objective & Teaching Philosophy
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* EDUCATION (PROMINENT IN ACADEMIC CV) */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Education & Degrees Conferred
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'In Progress' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-xs sm:text-[12.5px]'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? `, ${edu.university}` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Honors / GPA: {edu.gpa}
                      </span>
                    )}
                  </div>
                  {edu.honors && (
                    <p className={`text-slate-600 italic mt-0.5 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                      Thesis / Honors: {edu.honors}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACADEMIC APPOINTMENTS & TEACHING / RESEARCH EXPERIENCE */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Academic Appointments & Research Experience
            </h2>
            <div className={spacing.entryGap}>
              {validExp.map((exp, idx) => (
                <div key={exp.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <div>
                      <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}>
                        {exp.role}
                      </span>
                      <span className={`text-slate-700 ml-1.5 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                        , {exp.company}
                        {exp.department ? ` (${exp.department})` : ''}
                      </span>
                    </div>
                    <span className={`text-slate-600 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>

                  <div className={`flex justify-between items-baseline text-slate-600 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                    <span>
                      {exp.location}{exp.employmentType ? ` • ${exp.employmentType}` : ''}
                    </span>
                  </div>

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
                    <div className="mt-1">
                      <span className={`font-semibold text-slate-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Scholarly Outcomes:{' '}
                      </span>
                      <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.achievements.filter(Boolean).join('; ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RESEARCH PROJECTS, GRANTS & LAB STUDIES */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Research Projects, Grants & Fieldwork
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
                      <span className={`text-slate-600 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Methodology: {proj.technologies.join(', ')}
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
                      <strong>Research Objective:</strong> {proj.objective}
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
                    <p className={`mt-0.5 text-slate-900 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      <strong>Publication / Findings:</strong> {proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SCHOLARLY METHODOLOGIES & RESEARCH TOOLS */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Methodologies & Analytical Tools
            </h2>
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Specialization';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx} className="flex flex-wrap gap-x-1.5">
                      <span className="font-bold text-slate-950">{catName}:</span>
                      <span className="text-slate-800">{skillNames.join(', ')}</span>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <span className="font-bold text-slate-950">Research & Methodologies:</span>
                      <span className="text-slate-800">{skills.technical.join(', ')}</span>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <span className="font-bold text-slate-950">Laboratory & Statistical Software:</span>
                      <span className="text-slate-800">{skills.tools.join(', ')}</span>
                    </div>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <span className="font-bold text-slate-950">Pedagogical & Scholarly Competencies:</span>
                      <span className="text-slate-800">{skills.soft.join(', ')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* PUBLICATIONS & HONORS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Publications, Fellowships & Academic Honors
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

        {/* CERTIFICATIONS & FELLOWSHIPS */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Fellowships, Licences & Teaching Certifications
            </h2>
            <div className={`space-y-1 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="flex justify-between items-baseline flex-wrap gap-x-2">
                  <span className="text-slate-900">
                    <strong>{cert.name}</strong>
                    {cert.issuer ? `, ${cert.issuer}` : ''}
                    {cert.type ? ` (${cert.type})` : ''}
                  </span>
                  {cert.date && (
                    <span className={`text-slate-600 italic ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {cert.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LANGUAGES */}
        {isSectionVisible('languages', hiddenSections) && validLanguages.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Languages (Reading & Scholarly Proficiency)
            </h2>
            <p className={`text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFO (Academic Memberships, Reviewer Roles) */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="break-inside-avoid">
            <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Scholarly Affiliations & Professional Information
            </h2>
            <div className={`space-y-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p><strong>Professional Learned Societies:</strong> {additionalInfo.memberships.join(', ')}</p>
              )}
              {additionalInfo?.noticePeriod && (
                <p><strong>Appointment Availability:</strong> {additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
              )}
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <p><strong>Teaching Schedule:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Licence:</strong> {additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.other && (
                <p>{additionalInfo.other}</p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS (e.g. Conference Presentations, Invited Talks, Grant Funding) */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) && (
          customSections!.filter((s) => s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))).map((sec, idx) => (
            <section key={sec.id || idx} className="break-inside-avoid">
              <h2 className={`font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
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
