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

export function OperationsManagementTemplate({
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
      {/* HEADER: Industrial Operations Header */}
      <header className={`pb-2.5 ${spacing.headerMarginBottom} border-b-2 border-slate-900 shrink-0`}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <div>
            <h1
              className={`font-black tracking-tight text-slate-950 uppercase break-words ${
                isMiniPreview ? 'text-[13px]' : 'text-3xl sm:text-[28px]'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p
                className={`font-bold text-blue-800 tracking-wide mt-0.5 uppercase break-words ${
                  isMiniPreview ? 'text-[7.5px]' : 'text-xs sm:text-[13.5px]'
                }`}
              >
                {personalInfo.headline}
              </p>
            )}
          </div>

          {/* Shift & Safety Badge if available in additionalInfo */}
          {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference || validCerts.length > 0) && (
            <div className="shrink-0 flex items-center gap-1.5 mt-1 sm:mt-0 flex-wrap">
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-300 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                  Shift: {additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference}
                </span>
              )}
              {validCerts.length > 0 && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800 border border-slate-300 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                  {validCerts[0].name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contact Row with bold dividers */}
        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-slate-700 ${
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
                <a href={`mailto:${personalInfo.email}`} className="text-slate-900 hover:text-blue-700 break-all font-medium">
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
                  className="text-slate-900 hover:text-blue-700 break-all font-medium"
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
                  className="text-slate-900 hover:text-blue-700 break-all font-medium"
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
        {/* SUMMARY: Operations Profile */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Operations & Plant Management Profile
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Operational Objective
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* TECHNICAL SKILLS, MACHINERY & QUALITY STANDARDS */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Plant Capabilities, Machinery & Standards
            </h2>
            <div className={`space-y-1.5 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Capabilities';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-slate-950 uppercase tracking-tight min-w-[130px]">
                        {catName}:
                      </span>
                      <span className="text-slate-800">{skillNames.join(' • ')}</span>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-slate-950 uppercase tracking-tight min-w-[130px]">
                        Machinery & Tech:
                      </span>
                      <span className="text-slate-800">{skills.technical.join(' • ')}</span>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-slate-950 uppercase tracking-tight min-w-[130px]">
                        Tools & Quality Systems:
                      </span>
                      <span className="text-slate-800">{skills.tools.join(' • ')}</span>
                    </div>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-slate-950 uppercase tracking-tight min-w-[130px]">
                        Shop-Floor Leadership:
                      </span>
                      <span className="text-slate-800">{skills.soft.join(' • ')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* WORK EXPERIENCE */}
        {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Industrial & Operations Experience
            </h2>
            <div className={spacing.entryGap}>
              {validExp.map((exp, idx) => (
                <div key={exp.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <div>
                      <span className={`font-bold text-slate-950 uppercase tracking-tight ${isMiniPreview ? 'text-[7.5px]' : 'text-[13.5px]'}`}>
                        {exp.role}
                      </span>
                      <span className={`text-slate-700 ml-1.5 font-semibold ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                        | {exp.company}
                        {exp.department ? ` (${exp.department})` : ''}
                      </span>
                    </div>
                    <span className={`text-slate-700 font-bold ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>

                  <div className={`flex justify-between items-baseline text-slate-600 mt-0.5 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                    <span>
                      {exp.location || 'Plant Site'}{exp.employmentType ? ` • ${exp.employmentType}` : ''}
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
                    <div className="mt-1 p-1 bg-slate-50 border-l-2 border-slate-900 rounded-r">
                      <span className={`font-bold text-slate-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Production & Safety KPIs:{' '}
                      </span>
                      <span className={`text-slate-800 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.achievements.filter(Boolean).join('; ')}
                      </span>
                    </div>
                  )}

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-0.5">
                      <span className={`font-semibold text-slate-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Machinery/Systems:{' '}
                      </span>
                      <span className={`text-slate-700 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.technologies.filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS & CONTINUOUS IMPROVEMENT INITIATIVES */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Process Improvement & Kaizen Projects
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
                      <span className={`text-slate-600 font-medium ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
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
                      <strong>Objective:</strong> {proj.objective}
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
                    <p className={`mt-0.5 text-slate-900 font-semibold ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      <strong>Operational Outcome:</strong> {proj.outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EDUCATION */}
        {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Education & Technical Qualifications
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {edu.degree || edu.qualification || 'Degree / Diploma'}
                    </span>
                    <span className={`text-slate-700 font-semibold ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'Present' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? ` (${edu.university})` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-900 font-medium ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Score/Division: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS & LICENCES */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Safety, Six Sigma & Industrial Certifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-950">
                      {cert.name}
                    </span>
                    {cert.date && (
                      <span className={`text-slate-500 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {cert.date}
                      </span>
                    )}
                  </div>
                  {cert.issuer && (
                    <p className={`text-slate-600 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      {cert.issuer} {cert.type ? `(${cert.type})` : ''}
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
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Key Milestones & Safety Awards
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
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Languages (Shop Floor Communication)
            </h2>
            <p className={`text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {validLanguages.map((l) => {
                const lang = formatLanguage(l);
                return lang.proficiency ? `${lang.name} (${lang.proficiency})` : lang.name;
              }).join(' • ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFO (Shift, Notice Period, Driving Licence, Relocation) */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="break-inside-avoid">
            <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              Operational Availability & Compliance Details
            </h2>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <p><strong>Shift Availability:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
              )}
              {additionalInfo?.noticePeriod && (
                <p><strong>Notice Period:</strong> {additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Heavy / Commercial Licence:</strong> {additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p className="col-span-full"><strong>Industry Associations:</strong> {additionalInfo.memberships.join(', ')}</p>
              )}
              {additionalInfo?.other && (
                <p className="col-span-full">{additionalInfo.other}</p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) && (
          customSections!.filter((s) => s.title?.trim() && (s.content?.trim() || (s.items && s.items.length > 0))).map((sec, idx) => (
            <section key={sec.id || idx} className="break-inside-avoid">
              <h2 className={`font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
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
