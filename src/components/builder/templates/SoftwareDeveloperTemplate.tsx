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

export function SoftwareDeveloperTemplate({
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
      {/* HEADER: Modern Developer Header with Monospace Accents */}
      <header className={`pb-3 ${spacing.headerMarginBottom} border-b-2 border-slate-900 shrink-0`}>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <div>
            <h1
              className={`font-mono font-bold tracking-tight text-slate-950 break-words ${
                isMiniPreview ? 'text-[13px]' : 'text-3xl sm:text-[28px]'
              }`}
            >
              {personalInfo.fullName || 'YOUR NAME'}
            </h1>
            {personalInfo.headline && (
              <p
                className={`font-mono text-blue-700 font-semibold mt-0.5 break-words ${
                  isMiniPreview ? 'text-[8px]' : 'text-[13.5px]'
                }`}
              >
                &lt;{personalInfo.headline} /&gt;
              </p>
            )}
          </div>

          {/* GitHub / Portfolio Priority Quick Badges */}
          <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
            {personalInfo.github && (
              <a
                href={formatUrl(personalInfo.github)}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono hover:bg-slate-800 ${
                  isMiniPreview ? 'text-[5.5px]' : 'text-xs'
                }`}
              >
                <GithubIcon className="w-3 h-3 shrink-0" />
                <span>github.com/{cleanDomain(personalInfo.github).split('/').pop()}</span>
              </a>
            )}
            {personalInfo.portfolio && (
              <a
                href={formatUrl(personalInfo.portfolio)}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono hover:bg-blue-100 ${
                  isMiniPreview ? 'text-[5.5px]' : 'text-xs'
                }`}
              >
                <GlobeIcon className="w-3 h-3 shrink-0" />
                <span>{cleanDomain(personalInfo.portfolio)}</span>
              </a>
            )}
          </div>
        </div>

        {/* Contact links */}
        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-slate-600 font-mono ${
              isMiniPreview ? 'text-[6px]' : 'text-[11.5px]'
            }`}
          >
            {personalInfo.location && (
              <div className="flex items-center gap-1 font-sans">
                <MapPinIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-1 font-sans">
                <PhoneIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.email && (
              <div className="flex items-center gap-1">
                <MailIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <a href={`mailto:${personalInfo.email}`} className="text-slate-800 hover:text-blue-600 underline-offset-2 hover:underline break-all">
                  {personalInfo.email}
                </a>
              </div>
            )}
            {personalInfo.linkedin && (
              <div className="flex items-center gap-1">
                <LinkedinIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <a
                  href={formatUrl(personalInfo.linkedin)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-800 hover:text-blue-600 underline-offset-2 hover:underline break-all"
                >
                  {cleanDomain(personalInfo.linkedin)}
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Summary'}
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {summary}
            </p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Objective'}
            </h2>
            <p className={`text-slate-800 leading-relaxed text-justify ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {objective}
            </p>
          </section>
        )}

        {/* TECHNICAL STACK & ARCHITECTURE (HIGH VISIBILITY) */}
        {isSectionVisible('technicalSkills', hiddenSections) && hasSkillsData(skills) && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Tech Stack & Tooling'}
            </h2>
            <div className={`space-y-1.5 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
              {skills?.categories && skills.categories.length > 0 ? (
                skills.categories.map((cat, idx) => {
                  const catName = cat.category || (cat as any).name || 'Tech Stack';
                  const skillNames = (cat.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                  return (
                    <div key={idx} className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono font-bold text-slate-900 min-w-[130px]">
                        {catName}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {skillNames.map((sk, sIdx) => (
                          <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  {skills?.technical && skills.technical.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono font-bold text-slate-900 min-w-[130px]">
                        Languages & Frameworks:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {skills.technical.map((sk, sIdx) => (
                          <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {skills?.tools && skills.tools.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono font-bold text-slate-900 min-w-[130px]">
                        Cloud, DB & DevOps:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {skills.tools.map((sk, sIdx) => (
                          <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {isSectionVisible('softSkills', hiddenSections) && skills?.soft && skills.soft.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono font-bold text-slate-900 min-w-[130px]">
                        Methodologies:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {skills.soft.map((sk, sIdx) => (
                          <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 text-[11px]">
                            {sk}
                          </span>
                        ))}
                      </div>
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
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Professional Experience'}
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
                        @ {exp.company}
                        {exp.department ? ` (${exp.department})` : ''}
                      </span>
                    </div>
                    <span className={`text-slate-600 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Present'}
                    </span>
                  </div>

                  <div className={`flex justify-between items-baseline text-slate-500 mt-0.5 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11.5px]'}`}>
                    <span>
                      {exp.location || 'Remote'}{exp.employmentType ? ` • ${exp.employmentType}` : ''}
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

                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className={`font-mono text-slate-600 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                        Stack:
                      </span>
                      {exp.technologies.filter(Boolean).map((t, tIdx) => (
                        <span key={tIdx} className={`px-1 py-0.2 rounded bg-slate-50 text-slate-700 font-mono border border-slate-200 ${isMiniPreview ? 'text-[5px]' : 'text-[10.5px]'}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <div className="mt-0.5">
                      <span className={`font-semibold text-slate-900 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        Impact:{' '}
                      </span>
                      <span className={`text-slate-700 ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {exp.achievements.filter(Boolean).join('; ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS WITH LIVE / REPO LINKS */}
        {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Featured Projects & Deployments'}
            </h2>
            <div className={spacing.entryGap}>
              {validProj.map((proj, idx) => (
                <div key={proj.id || idx} className="break-inside-avoid p-2 bg-slate-50/50 rounded border border-slate-100">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-950 font-mono ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {proj.title}
                      {proj.role ? ` (${proj.role})` : ''}
                    </span>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.technologies.map((tech, tIdx) => (
                          <span key={tIdx} className={`px-1 py-0.2 rounded bg-white text-blue-800 font-mono border border-blue-200 ${isMiniPreview ? 'text-[5px]' : 'text-[10px]'}`}>
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {proj.description && (
                    <p className={`mt-0.5 text-slate-800 ${isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'}`}>
                      {proj.description}
                    </p>
                  )}

                  {proj.objective && (
                    <p className={`mt-0.5 text-slate-700 italic font-mono ${isMiniPreview ? 'text-[6px]' : 'text-[11px]'}`}>
                      {'// Architecture: '}{proj.objective}
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
                    <p className={`mt-0.5 text-slate-900 font-medium ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      <strong>Outcome:</strong> {proj.outcome}
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
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Education'}
            </h2>
            <div className={spacing.entryGap}>
              {validEdu.map((edu, idx) => (
                <div key={edu.id || idx} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`font-bold text-slate-950 ${isMiniPreview ? 'text-[7.5px]' : 'text-[13px]'}`}>
                      {edu.degree || edu.qualification || 'Degree'}
                    </span>
                    <span className={`text-slate-600 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                      {edu.graduationYear || (edu.current ? 'Present' : '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline flex-wrap gap-x-2">
                    <span className={`text-slate-700 italic ${isMiniPreview ? 'text-[6.5px]' : 'text-xs'}`}>
                      {edu.institution}{edu.university && edu.university !== edu.institution ? ` (${edu.university})` : ''}
                      {edu.location ? ` — ${edu.location}` : ''}
                    </span>
                    {edu.gpa && (
                      <span className={`text-slate-800 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        CGPA: {edu.gpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS (AWS, GCP, etc.) */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Certifications & Credentials'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {validCerts.map((cert, idx) => (
                <div key={cert.id || idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-950 font-mono">
                      {cert.name}
                    </span>
                    {cert.date && (
                      <span className={`text-slate-500 font-mono ${isMiniPreview ? 'text-[6px]' : 'text-xs'}`}>
                        {cert.date}
                      </span>
                    )}
                  </div>
                  {cert.issuer && (
                    <p className={`text-slate-600 ${isMiniPreview ? 'text-[5.5px]' : 'text-[11px]'}`}>
                      {cert.issuer} {cert.type ? `(${cert.type})` : ''}
                    </p>
                  )}
                  {cert.credentialUrl && (
                    <a
                      href={formatUrl(cert.credentialUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-blue-600 hover:underline break-all inline-flex items-center gap-1 mt-0.5 ${isMiniPreview ? 'text-[5px]' : 'text-[11px]'}`}
                    >
                      <span>Verify Credential</span>
                      <ExternalLinkIcon className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACHIEVEMENTS / HACKATHONS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Honors & Hackathon Achievements'}
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
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Languages'}
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
            <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
              {'// Work Authorization & Availability'}
            </h2>
            <div className={`space-y-0.5 text-slate-800 font-mono ${isMiniPreview ? 'text-[6.5px]' : 'text-[12px]'}`}>
              {additionalInfo?.noticePeriod && (
                <p><strong>Notice Period:</strong> {additionalInfo.noticePeriod}</p>
              )}
              {additionalInfo?.relocation && (
                <p><strong>Relocation:</strong> {additionalInfo.relocation}</p>
              )}
              {(additionalInfo?.shiftAvailability || additionalInfo?.shiftPreference) && (
                <p><strong>Work Hours / Shift:</strong> {additionalInfo.shiftAvailability || additionalInfo.shiftPreference}</p>
              )}
              {additionalInfo?.drivingLicence && (
                <p><strong>Licence:</strong> {additionalInfo.drivingLicence}</p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p><strong>Open Source / Community:</strong> {additionalInfo.memberships.join(', ')}</p>
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
              <h2 className={`font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 ${spacing.headingMarginBottom} ${isMiniPreview ? 'text-[8.5px]' : 'text-xs sm:text-[13px]'}`}>
                {'// '}{sec.title}
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
