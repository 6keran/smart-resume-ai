'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Check,
  ChevronRight,
  ChevronLeft,
  FileUp,
  GraduationCap,
  Loader2,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { ROLE_PROFILES } from '@/lib/career/roleProfiles';
import { JobSearchAutocomplete } from '@/components/jobs/JobSearchAutocomplete';

interface ParsedSkillCandidate {
  skillName: string;
  category: string;
  source: 'resume_parsed' | 'user_added';
  confidence: number;
  selected: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state — never pre-filled with a software default
  const [targetRole, setTargetRole] = useState('');
  const [workMode, setWorkMode] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [jobTypes, setJobTypes] = useState<string[]>(['Full-time']);
  const [experienceBand, setExperienceBand] = useState<
    'student' | 'fresher' | 'early_career' | 'experienced'
  >('fresher');
  const [preferredLocationsText, setPreferredLocationsText] = useState('');

  // Step 2 state
  const [entryMode, setEntryMode] = useState<'resume' | 'manual'>('resume');
  const [parsedFilename, setParsedFilename] = useState<string | null>(null);
  const [parsedNotice, setParsedNotice] = useState<string | null>(null);
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');

  // Step 3 state
  const [skillCandidates, setSkillCandidates] = useState<ParsedSkillCandidate[]>([]);
  const [rejectedSkills, setRejectedSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/onboarding');
        if (res.status === 401) {
          router.replace('/login?from=/onboarding');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.targetRole) setTargetRole(data.targetRole);
          if (data.preferences?.workMode) setWorkMode(data.preferences.workMode);
          if (Array.isArray(data.preferences?.jobTypes) && data.preferences.jobTypes.length > 0) {
            setJobTypes(data.preferences.jobTypes);
          }
          if (data.preferences?.experienceBand) setExperienceBand(data.preferences.experienceBand);
          if (data.profile?.institution) setInstitution(data.profile.institution);
          if (data.profile?.degree) setDegree(data.profile.degree);
          if (data.profile?.fieldOfStudy) setFieldOfStudy(data.profile.fieldOfStudy);
          if (data.profile?.graduationYear) setGraduationYear(String(data.profile.graduationYear));
          if (Array.isArray(data.profile?.preferredLocations) && data.profile.preferredLocations.length > 0) {
            setPreferredLocationsText(data.profile.preferredLocations.join(', '));
          }
          if (Array.isArray(data.skills) && data.skills.length > 0) {
            setSkillCandidates(
              data.skills.map((s: any) => ({
                skillName: s.name,
                category: s.category || 'General',
                source: s.source === 'resume_parsed' ? 'resume_parsed' : 'user_added',
                confidence: typeof s.confidence === 'number' ? s.confidence : 1.0,
                selected: true,
              }))
            );
          }
        }
      } catch {
        setError('Could not load your saved onboarding state.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, [router]);

  const toggleJobType = (value: string) => {
    setJobTypes((prev) =>
      prev.includes(value) ? (prev.length > 1 ? prev.filter((item) => item !== value) : prev) : [...prev, value]
    );
  };

  const handleResumeUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setParsedNotice(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/onboarding/parse-resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Could not extract resume details.');
        return;
      }

      const parsed = data.parsed;
      setParsedFilename(parsed?.fileName || file.name);
      setParsedNotice(
        data.claimedNotice || 'Extracted items are labeled claimed until you review and confirm them.'
      );

      if (parsed?.education) {
        if (parsed.education.institution && !institution) setInstitution(parsed.education.institution);
        if (parsed.education.degree && !degree) setDegree(parsed.education.degree);
        if (parsed.education.fieldOfStudy && !fieldOfStudy) setFieldOfStudy(parsed.education.fieldOfStudy);
        const yearMatch = String(parsed.education.graduationYear || '').match(/\b(19|20)\d{2}\b/);
        if (yearMatch && !graduationYear) setGraduationYear(yearMatch[0]);
      }

      if (Array.isArray(parsed?.skills)) {
        setSkillCandidates((prev) => {
          const byLower = new Map<string, ParsedSkillCandidate>();
          for (const item of prev) byLower.set(item.skillName.toLowerCase(), item);
          for (const s of parsed.skills) {
            const key = String(s.skillName || '').toLowerCase();
            if (key && !byLower.has(key)) {
              byLower.set(key, {
                skillName: s.skillName,
                category: s.category || 'General',
                source: 'resume_parsed',
                confidence: typeof s.confidence === 'number' ? s.confidence : 0.75,
                selected: true,
              });
            }
          }
          return Array.from(byLower.values());
        });
      }
      setStep(3);
    } catch {
      setError('Upload failed due to a network error.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddSkill = (rawSkill?: string) => {
    const clean = (rawSkill ?? newSkillInput).trim();
    if (!clean) return;
    setSkillCandidates((prev) => {
      if (prev.some((s) => s.skillName.toLowerCase() === clean.toLowerCase())) {
        return prev.map((s) =>
          s.skillName.toLowerCase() === clean.toLowerCase() ? { ...s, selected: true } : s
        );
      }
      return [
        ...prev,
        {
          skillName: clean,
          category: 'User Added',
          source: 'user_added',
          confidence: 1.0,
          selected: true,
        },
      ];
    });
    setRejectedSkills((prev) => prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()));
    setNewSkillInput('');
  };

  const toggleSkillCandidate = (skillName: string) => {
    setSkillCandidates((prev) =>
      prev.map((item) => {
        if (item.skillName !== skillName) return item;
        const nextSelected = !item.selected;
        if (!nextSelected) {
          setRejectedSkills((rej) => (rej.includes(skillName) ? rej : [...rej, skillName]));
        } else {
          setRejectedSkills((rej) => rej.filter((r) => r !== skillName));
        }
        return { ...item, selected: nextSelected };
      })
    );
  };

  const handleComplete = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const preferredLocations = preferredLocationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const confirmedSkills = skillCandidates
        .filter((s) => s.selected)
        .map((s) => ({
          skillName: s.skillName,
          category: s.category,
          source: s.source,
          confidence: s.confidence,
        }));

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: targetRole.trim(),
          workMode,
          jobTypes,
          experienceBand,
          preferredLocations,
          institution: institution.trim(),
          degree: degree.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          graduationYear: graduationYear ? Number(graduationYear) : 0,
          confirmedSkills,
          rejectedSkills,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Could not save your onboarding profile.');
        setIsSaving(false);
        return;
      }
      router.replace('/dashboard');
    } catch {
      setError('Failed to save onboarding details.');
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/onboarding/skip', { method: 'POST' });
    } catch {
      // Allow skip navigation even if background persistence failed
    } finally {
      router.replace('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span>Loading career setup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="bg-[#FFFFFF] border-b border-[var(--border-color)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">
              Smart Resume AI
            </Link>
            <span className="text-[var(--border-color)]">/</span>
            <span className="text-sm text-[var(--text-secondary)]">Personalized Career Setup</span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stepper Header */}
        <div className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 1, label: 'Step 1', title: 'Role & Preferences', icon: Target },
              { id: 2, label: 'Step 2', title: 'Resume or Background', icon: FileUp },
              { id: 3, label: 'Step 3', title: 'Review & Confirm', icon: UserCheck },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = step === item.id;
              const isDone = step > item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id as 1 | 2 | 3)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : isDone
                      ? 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                      : 'border-[var(--border-color)] bg-[#FFFFFF]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : isDone
                        ? 'bg-[var(--text-primary)] text-white'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                      {item.label}
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-4 rounded-xl border border-red-300 bg-[#FFFFFF] text-sm text-red-700"
          >
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">What role are you aiming for?</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Leave this blank if you are still exploring — we never assign a default career track without your input.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Target Role (Optional)
              </label>
              <JobSearchAutocomplete
                field="role"
                label="Target Role"
                value={targetRole}
                onChange={setTargetRole}
                onSelect={setTargetRole}
                placeholder="Start typing a role (e.g. Mechanical Engineer, Data Analyst, HR Generalist)"
                leadingIcon={<Briefcase className="w-4 h-4 text-[var(--text-secondary)]" />}
                inputClassName="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-lg border border-[#E5E8ED] bg-[#FFFFFF] text-sm text-[#20242B] focus:outline-none focus:border-[#3157C8]"
              />

              <div className="pt-2">
                <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Curated tracks across engineering, analytics, business, and design:
                </span>
                <div className="flex flex-wrap gap-2">
                  {ROLE_PROFILES.map((role) => {
                    const selected = targetRole.trim().toLowerCase() === role.title.toLowerCase();
                    return (
                      <button
                        key={role.slug}
                        type="button"
                        onClick={() => setTargetRole(selected ? '' : role.title)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {role.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[var(--border-color)]">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Career Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'student', label: 'Student' },
                    { value: 'fresher', label: 'Recent Graduate' },
                    { value: 'early_career', label: 'Early Career' },
                    { value: 'experienced', label: 'Experienced' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExperienceBand(opt.value as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left cursor-pointer ${
                        experienceBand === opt.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                          : 'border-[var(--border-color)] bg-[#FFFFFF] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Work Mode Preference</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'any', label: 'Any' },
                    { value: 'remote', label: 'Remote' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'onsite', label: 'On-site' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWorkMode(opt.value as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center cursor-pointer ${
                        workMode === opt.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                          : 'border-[var(--border-color)] bg-[#FFFFFF] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Opportunity Types</label>
                <div className="flex flex-wrap gap-2">
                  {['Full-time', 'Internship', 'Contract'].map((jt) => {
                    const active = jobTypes.includes(jt);
                    return (
                      <button
                        key={jt}
                        type="button"
                        onClick={() => toggleJobType(jt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                            : 'border-[var(--border-color)] bg-[#FFFFFF] text-[var(--text-secondary)]'
                        }`}
                      >
                        {jt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="pref-locations" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Preferred Locations (Optional)
                </label>
                <input
                  id="pref-locations"
                  type="text"
                  value={preferredLocationsText}
                  onChange={(e) => setPreferredLocationsText(e.target.value)}
                  placeholder="e.g. Remote, Bangalore, New York"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Continue to Resume or Background</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Import your resume or enter core details</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Uploaded files (up to 10 MB PDF, DOCX, or TXT) are parsed in memory only and never stored raw. Extracted items remain unconfirmed claims until Step 3.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setEntryMode('resume')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer ${
                  entryMode === 'resume'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                    : 'border-[var(--border-color)] bg-[#FFFFFF] text-[var(--text-secondary)]'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>Parse Existing Resume</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer ${
                  entryMode === 'manual'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                    : 'border-[var(--border-color)] bg-[#FFFFFF] text-[var(--text-secondary)]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Enter Manually</span>
              </button>
            </div>

            {entryMode === 'resume' && (
              <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] space-y-3">
                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Select PDF, DOCX, or TXT Resume (Max 10 MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  disabled={isParsing}
                  onChange={(e) => handleResumeUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--border-color)] file:text-xs file:font-semibold file:bg-[#FFFFFF] file:text-[var(--text-primary)] hover:file:border-[var(--accent)] cursor-pointer"
                />
                {isParsing && (
                  <p className="flex items-center gap-2 text-xs text-[var(--accent)] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Extracting text and identifying claimed skills...
                  </p>
                )}
                {parsedFilename && !isParsing && (
                  <p className="text-xs text-[var(--text-primary)]">
                    Parsed <strong>{parsedFilename}</strong>. Review extracted items in Step 3.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Institution / University (Optional)
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. State University"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Degree / Credential (Optional)
                </label>
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.S., B.Tech, MBA"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Field of Study / Discipline (Optional)
                </label>
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  placeholder="e.g. Mechanical Engineering, Finance, Marketing"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                  Graduation Year (Optional)
                </label>
                <input
                  type="number"
                  min={1980}
                  max={new Date().getFullYear() + 10}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Review & Confirm Data</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Confirm your career profile</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {parsedNotice ||
                  'Only checked skills will be saved as confirmed skills on your profile. Unchecked items will be discarded.'}
              </p>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Target Role</div>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {targetRole.trim() || 'Goal not set'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Work Preferences</div>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {workMode.toUpperCase()} · {jobTypes.join(', ')}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Education</div>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {degree || fieldOfStudy || institution
                    ? [degree, fieldOfStudy, institution].filter(Boolean).join(' · ')
                    : 'Not provided'}
                </div>
              </div>
            </div>

            {/* Add Skill with Autocomplete */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Add or Verify Skills ({skillCandidates.filter((s) => s.selected).length} selected)
              </label>
              <div className="flex flex-row gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <JobSearchAutocomplete
                    field="skill"
                    label="Add a skill"
                    value={newSkillInput}
                    onChange={setNewSkillInput}
                    onSelect={(val) => handleAddSkill(val)}
                    placeholder="Type a skill (e.g. AutoCAD, Financial Modeling, Python, Figma)"
                    inputClassName="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#E5E8ED] bg-[#FFFFFF] text-sm text-[#20242B] focus:outline-none focus:border-[#3157C8]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] bg-[#FFFFFF] hover:bg-[var(--accent)]/5 text-sm font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Skill</span>
                </button>
              </div>
            </div>

            {/* Claimed vs Confirmed Toggle List */}
            {skillCandidates.length > 0 ? (
              <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                {skillCandidates.map((item) => (
                  <div
                    key={item.skillName}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-[#FFFFFF]"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSkillCandidate(item.skillName)}
                        className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)]"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.skillName}
                      </span>
                    </label>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                        {item.source === 'resume_parsed' ? 'Claimed from resume' : 'User added'}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.skillName}`}
                        onClick={() => {
                          setSkillCandidates((prev) => prev.filter((s) => s.skillName !== item.skillName));
                          setRejectedSkills((rej) => (rej.includes(item.skillName) ? rej : [...rej, item.skillName]));
                        }}
                        className="p-1 text-[var(--text-secondary)] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
                No skills listed yet. Add skills above or upload a resume in Step 2 — or save your goal now and add skills anytime in{' '}
                <strong className="text-[var(--text-primary)]">My Career Data</strong>.
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Continue to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

