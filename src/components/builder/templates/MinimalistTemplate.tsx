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

export function MinimalistTemplate({
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
    achievements,
    languages,
    additionalInfo,
    customSections,
    hiddenSections,
    candidateType,
  } = data;
  const isFresher = candidateType === 'fresher';

  const validExp = (experience || []).filter((e) => e.role?.trim() || e.company?.trim());
  const validEdu = (education || []).filter((e) => e.degree?.trim() || e.institution?.trim());
  const validProj = (projects || []).filter((p) => p.title?.trim());
  const validCerts = (certifications || []).filter((c) => c.name?.trim());
  const validAchievements = (achievements || []).filter((a) =>
    typeof a === 'string' ? a.trim() : a?.title?.trim()
  );
  const validLanguages = (languages || []).filter((l) =>
    typeof l === 'string' ? l.trim() : l?.name?.trim()
  );

  return (
    <div
      className={`w-full bg-white text-neutral-800 font-sans select-text flex-1 flex flex-col min-h-full ${
        spacing.containerPadding
      } ${isMiniPreview ? 'text-[7px] leading-tight' : `text-[13px] ${spacing.lineHeight}`}`}
    >
      {/* HEADER: Ultra Clean & Minimal */}
      <header className={`shrink-0 ${spacing.headerMarginBottom}`}>
        <div className="w-12 h-0.5 bg-neutral-300 mb-3" />
        <h1
          className={`font-light tracking-wider uppercase text-neutral-900 ${
            isMiniPreview ? 'text-[13px]' : 'text-3xl'
          }`}
        >
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>
        {personalInfo.headline && (
          <p
            className={`font-normal text-neutral-500 tracking-wide mt-0.5 ${
              isMiniPreview ? 'text-[7.5px]' : 'text-sm'
            }`}
          >
            {personalInfo.headline}
          </p>
        )}

        {hasContactInfo(personalInfo) && (
          <div
            className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-2 text-neutral-500 ${
              isMiniPreview ? 'text-[6px]' : 'text-[12.5px]'
            }`}
          >
            {personalInfo.location && <span>{personalInfo.location}</span>}
            {personalInfo.location && personalInfo.phone && <span>·</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.phone && personalInfo.email && <span>·</span>}
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="hover:text-black">
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
                  className="hover:text-black"
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
                  className="hover:text-black"
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
                  className="hover:text-black"
                >
                  {cleanDomain(personalInfo.portfolio)}
                </a>
              </>
            )}
          </div>
        )}
        <div className="w-12 h-0.5 bg-neutral-300 mt-3" />
      </header>

      {/* BODY SECTIONS */}
      <div className={`${isMiniPreview ? 'space-y-2' : spacing.sectionGap} flex-1`}>
        {/* SUMMARY */}
        {isSectionVisible('summary', hiddenSections) && summary?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              {isFresher ? 'Profile' : 'Summary'}
            </h2>
            <p className="text-neutral-700 leading-relaxed font-normal">{summary}</p>
          </section>
        )}

        {/* CAREER OBJECTIVE */}
        {isSectionVisible('objective', hiddenSections) && objective?.trim() && (
          <section className="resume-section">
            <h2
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              Career Objective
            </h2>
            <p className="text-neutral-700 leading-relaxed font-normal">{objective}</p>
          </section>
        )}

        {/* ORDER BASED ON FRESHER OR EXPERIENCED */}
        {isFresher ? (
          <>
            {/* EDUCATION (Fresher first) */}
            {isSectionVisible('education', hiddenSections) && validEdu.length > 0 && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Education
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validEdu.map((edu) => (
                    <div key={edu.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {edu.degree}
                          {edu.qualification && (
                            <span className="text-neutral-500 font-normal ml-1">
                              ({edu.qualification})
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-neutral-400 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Pursuing' : edu.graduationYear}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-baseline text-neutral-600 ${
                          isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'
                        }`}
                      >
                        <span>
                          {edu.institution}
                          {edu.university && <span> · {edu.university}</span>}
                        </span>
                        {edu.location && <span>{edu.location}</span>}
                      </div>
                      {(edu.gpa || edu.honors) && (
                        <p
                          className={`text-neutral-500 mt-0.5 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {edu.gpa && <span>Score: {edu.gpa}</span>}
                          {edu.gpa && edu.honors && <span> · </span>}
                          {edu.honors && <span>{edu.honors}</span>}
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
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Skills & Technical Stack
                </h2>
                <div className={`${spacing.bulletGap} text-neutral-700 ${spacing.lineHeight}`}>
                  {skills.categories && skills.categories.length > 0 ? (
                    skills.categories.map((cat, idx) => {
                      const renderedSkills = (cat.skills || []).map((sk) =>
                        typeof sk === 'string' ? sk : `${sk.name}${sk.level ? ` (${sk.level})` : ''}`
                      );
                      if (renderedSkills.length === 0) return null;
                      return (
                        <p key={idx}>
                          <span className="text-neutral-900 font-medium">{cat.category}: </span>
                          <span>{renderedSkills.join(' · ')}</span>
                        </p>
                      );
                    })
                  ) : (
                    <>
                      {skills.technical && skills.technical.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Technical: </span>
                          <span>{skills.technical.join(' · ')}</span>
                        </p>
                      )}
                      {skills.tools && skills.tools.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Tools & Systems: </span>
                          <span>{skills.tools.join(' · ')}</span>
                        </p>
                      )}
                      {skills.soft && skills.soft.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Competencies: </span>
                          <span>{skills.soft.join(' · ')}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* PROJECTS */}
            {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Academic & Technical Projects
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validProj.map((proj) => (
                    <div key={proj.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {proj.title}
                          {proj.role && (
                            <span className="text-neutral-500 font-normal ml-1.5">
                              — {proj.role}
                            </span>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <span
                              className={`text-neutral-500 font-normal ml-1.5 ${
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
                            className={`text-neutral-400 hover:text-black ${
                              isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                            }`}
                          >
                            {cleanDomain(proj.link)}
                          </a>
                        )}
                      </div>
                      {proj.objective && (
                        <p className="text-neutral-600 mt-0.5 leading-relaxed italic">
                          Objective: {proj.objective}
                        </p>
                      )}
                      {proj.description && (
                        <p className="text-neutral-600 mt-0.5 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                      {proj.bullets && proj.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                          {proj.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {proj.outcome && (
                        <p className="text-neutral-700 mt-0.5 font-medium leading-relaxed">
                          Outcome: {proj.outcome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* EXPERIENCE / INTERNSHIPS */}
            {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Experience & Internships
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validExp.map((exp) => (
                    <div key={exp.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {exp.role}{' '}
                          <span className="text-neutral-500 font-normal">
                            / {exp.company}
                            {exp.department && ` · ${exp.department}`}
                            {exp.employmentType && ` (${exp.employmentType})`}
                          </span>
                        </span>
                        <span
                          className={`text-neutral-400 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                        </span>
                      </div>
                      {exp.technologies && exp.technologies.length > 0 && (
                        <p className="text-neutral-500 mt-0.5">
                          Tools & Technologies: {exp.technologies.join(', ')}
                        </p>
                      )}
                      {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                          {exp.bulletPoints.map((bp, i) => (
                            <li key={i}>{bp}</li>
                          ))}
                        </ul>
                      )}
                      {exp.achievements && exp.achievements.length > 0 && (
                        <div className="mt-1">
                          <span className="text-neutral-800 font-medium text-xs">
                            Key Achievements:
                          </span>
                          <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                            {exp.achievements.map((ach, i) => (
                              <li key={i}>{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* EXPERIENCE (Experienced first) */}
            {isSectionVisible('experience', hiddenSections) && validExp.length > 0 && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Professional Experience
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validExp.map((exp) => (
                    <div key={exp.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {exp.role}{' '}
                          <span className="text-neutral-500 font-normal">
                            / {exp.company}
                            {exp.department && ` · ${exp.department}`}
                            {exp.employmentType && ` (${exp.employmentType})`}
                          </span>
                        </span>
                        <span
                          className={`text-neutral-400 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                        </span>
                      </div>
                      {exp.technologies && exp.technologies.length > 0 && (
                        <p className="text-neutral-500 mt-0.5">
                          Tools & Technologies: {exp.technologies.join(', ')}
                        </p>
                      )}
                      {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                          {exp.bulletPoints.map((bp, i) => (
                            <li key={i}>{bp}</li>
                          ))}
                        </ul>
                      )}
                      {exp.achievements && exp.achievements.length > 0 && (
                        <div className="mt-1">
                          <span className="text-neutral-800 font-medium text-xs">
                            Key Achievements:
                          </span>
                          <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                            {exp.achievements.map((ach, i) => (
                              <li key={i}>{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SKILLS */}
            {isSectionVisible('skills', hiddenSections) && hasSkillsData(skills) && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Technical Expertise & Skills
                </h2>
                <div className={`${spacing.bulletGap} text-neutral-700 ${spacing.lineHeight}`}>
                  {skills.categories && skills.categories.length > 0 ? (
                    skills.categories.map((cat, idx) => {
                      const renderedSkills = (cat.skills || []).map((sk) =>
                        typeof sk === 'string' ? sk : `${sk.name}${sk.level ? ` (${sk.level})` : ''}`
                      );
                      if (renderedSkills.length === 0) return null;
                      return (
                        <p key={idx}>
                          <span className="text-neutral-900 font-medium">{cat.category}: </span>
                          <span>{renderedSkills.join(' · ')}</span>
                        </p>
                      );
                    })
                  ) : (
                    <>
                      {skills.technical && skills.technical.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Core Technical: </span>
                          <span>{skills.technical.join(' · ')}</span>
                        </p>
                      )}
                      {skills.tools && skills.tools.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Tooling & Software: </span>
                          <span>{skills.tools.join(' · ')}</span>
                        </p>
                      )}
                      {skills.soft && skills.soft.length > 0 && (
                        <p>
                          <span className="text-neutral-900 font-medium">Competencies: </span>
                          <span>{skills.soft.join(' · ')}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* PROJECTS */}
            {isSectionVisible('projects', hiddenSections) && validProj.length > 0 && (
              <section className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Projects & Key Initiatives
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validProj.map((proj) => (
                    <div key={proj.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {proj.title}
                          {proj.role && (
                            <span className="text-neutral-500 font-normal ml-1.5">
                              — {proj.role}
                            </span>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <span
                              className={`text-neutral-500 font-normal ml-1.5 ${
                                isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                              }`}
                            >
                              [{proj.technologies.join(', ')}]
                            </span>
                          )}
                        </span>
                        {proj.link && (
                          <a
                            href={formatUrl(proj.link)}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-neutral-400 hover:text-black ${
                              isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                            }`}
                          >
                            {cleanDomain(proj.link)}
                          </a>
                        )}
                      </div>
                      {proj.objective && (
                        <p className="text-neutral-600 mt-0.5 leading-relaxed italic">
                          Objective: {proj.objective}
                        </p>
                      )}
                      {proj.description && (
                        <p className="text-neutral-600 mt-0.5 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                      {proj.bullets && proj.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-0.5 space-y-0.5 text-neutral-600 leading-relaxed">
                          {proj.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {proj.outcome && (
                        <p className="text-neutral-700 mt-0.5 font-medium leading-relaxed">
                          Outcome: {proj.outcome}
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
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  Education
                </h2>
                <div className={isMiniPreview ? 'space-y-1.5' : spacing.entryGap}>
                  {validEdu.map((edu) => (
                    <div key={edu.id} className="resume-entry">
                      <div className="flex justify-between items-baseline">
                        <span
                          className={`font-medium text-neutral-900 ${
                            isMiniPreview ? 'text-[7px]' : 'text-[14px]'
                          }`}
                        >
                          {edu.degree}
                          {edu.qualification && (
                            <span className="text-neutral-500 font-normal ml-1">
                              ({edu.qualification})
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-neutral-400 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Pursuing' : edu.graduationYear}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-baseline text-neutral-600 ${
                          isMiniPreview ? 'text-[6.5px]' : 'text-[12.5px]'
                        }`}
                      >
                        <span>
                          {edu.institution}
                          {edu.university && <span> · {edu.university}</span>}
                        </span>
                        {edu.location && <span>{edu.location}</span>}
                      </div>
                      {(edu.gpa || edu.honors) && (
                        <p
                          className={`text-neutral-500 mt-0.5 ${
                            isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                          }`}
                        >
                          {edu.gpa && <span>GPA/Score: {edu.gpa}</span>}
                          {edu.gpa && edu.honors && <span> · </span>}
                          {edu.honors && <span>{edu.honors}</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* SOFT SKILLS (if separated) */}
        {isSectionVisible('softSkills', hiddenSections) &&
          skills.soft &&
          skills.soft.length > 0 && (
            <section className="resume-section">
              <h2
                className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                  spacing.headingMarginBottom
                } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
              >
                Professional & Soft Skills
              </h2>
              <p className="text-neutral-700 leading-relaxed">{skills.soft.join(' · ')}</p>
            </section>
          )}

        {/* CERTIFICATIONS */}
        {isSectionVisible('certifications', hiddenSections) && validCerts.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              Certifications & Training
            </h2>
            <div className={`${spacing.bulletGap} text-neutral-700 ${spacing.lineHeight}`}>
              {validCerts.map((cert) => (
                <div key={cert.id} className="resume-entry">
                  <div className="flex justify-between items-baseline">
                    <span>
                      <span className="text-neutral-900 font-medium">{cert.name}</span> · {cert.issuer}
                      {cert.type && <span className="text-neutral-500"> ({cert.type})</span>}
                      {cert.duration && <span className="text-neutral-500"> — {cert.duration}</span>}
                    </span>
                    <span
                      className={`text-neutral-400 ${
                        isMiniPreview ? 'text-[6px]' : 'text-[12px]'
                      }`}
                    >
                      {cert.date}
                    </span>
                  </div>
                  {cert.credentialId && (
                    <p className="text-neutral-500 text-xs">Credential ID: {cert.credentialId}</p>
                  )}
                  {cert.credentialUrl && (
                    <a
                      href={formatUrl(cert.credentialUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-400 hover:text-black text-xs underline"
                    >
                      Verify Credential
                    </a>
                  )}
                  {cert.description && (
                    <p className="text-neutral-600 mt-0.5">{cert.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KEY ACHIEVEMENTS */}
        {isSectionVisible('achievements', hiddenSections) && validAchievements.length > 0 && (
          <section className="resume-section">
            <h2
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              Key Achievements & Honors
            </h2>
            <ul className="list-disc list-outside ml-4 space-y-1 text-neutral-700">
              {validAchievements.map((item, idx) => {
                const ach = formatAchievement(item);
                return (
                  <li key={idx} className="break-words">
                    <span className="text-neutral-900 font-medium">{ach.title}</span>
                    {ach.date && <span className="text-neutral-500 ml-1">({ach.date})</span>}
                    {ach.description && <span> – {ach.description}</span>}
                    {ach.result && <span className="font-semibold text-neutral-900"> ({ach.result})</span>}
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
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              Languages Known
            </h2>
            <p className="text-neutral-700 leading-relaxed">
              {validLanguages.map((l) => formatLanguage(l)).join(' · ')}
            </p>
          </section>
        )}

        {/* ADDITIONAL INFORMATION */}
        {isSectionVisible('additionalInfo', hiddenSections) && hasAdditionalInfo(additionalInfo) && (
          <section className="resume-section">
            <h2
              className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                spacing.headingMarginBottom
              } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
            >
              Additional Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-neutral-700">
              {additionalInfo?.noticePeriod && (
                <p>
                  <span className="text-neutral-900 font-medium">Notice Period: </span>
                  {additionalInfo.noticePeriod}
                </p>
              )}
              {additionalInfo?.relocation && (
                <p>
                  <span className="text-neutral-900 font-medium">Willing to Relocate: </span>
                  {additionalInfo.relocation}
                </p>
              )}
              {additionalInfo?.shiftPreference && (
                <p>
                  <span className="text-neutral-900 font-medium">Shift Preference: </span>
                  {additionalInfo.shiftPreference}
                </p>
              )}
              {additionalInfo?.drivingLicence && (
                <p>
                  <span className="text-neutral-900 font-medium">Driving Licence: </span>
                  {additionalInfo.drivingLicence}
                </p>
              )}
              {additionalInfo?.memberships && additionalInfo.memberships.length > 0 && (
                <p className="col-span-full">
                  <span className="text-neutral-900 font-medium">Professional Memberships: </span>
                  {additionalInfo.memberships.join(', ')}
                </p>
              )}
              {additionalInfo?.other && (
                <p className="col-span-full">
                  <span className="text-neutral-900 font-medium">Notes: </span>
                  {additionalInfo.other}
                </p>
              )}
            </div>
          </section>
        )}

        {/* CUSTOM SECTIONS */}
        {isSectionVisible('customSections', hiddenSections) && hasCustomSections(customSections) &&
          customSections!
            .filter((custom) => isSectionVisible(custom.id, hiddenSections))
            .map((custom) => (
              <section key={custom.id} className="resume-section">
                <h2
                  className={`font-semibold tracking-widest uppercase text-neutral-500 ${
                    spacing.headingMarginBottom
                  } ${isMiniPreview ? 'text-[7.5px]' : 'text-[14px]'}`}
                >
                  {custom.title}
                </h2>
                {custom.content && (
                  <p className="text-neutral-700 leading-relaxed">{custom.content}</p>
                )}
                {custom.items && custom.items.length > 0 && (
                  <ul className="list-disc list-outside ml-4 space-y-0.5 text-neutral-700">
                    {custom.items.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
      </div>
    </div>
  );
}
