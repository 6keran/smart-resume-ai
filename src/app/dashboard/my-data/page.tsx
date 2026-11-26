'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  Briefcase,
  Check,
  Database,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { JobSearchAutocomplete } from '@/components/jobs/JobSearchAutocomplete';

interface CareerSkillItem {
  id: string;
  name: string;
  category: string;
  status: string;
  source?: 'resume_parsed' | 'user_added' | 'assessed' | 'verified';
  confirmedAt?: string;
  certificateId?: string;
  score?: number;
}

interface MyDataSnapshot {
  account: { id: string; name: string; email: string | null } | null;
  goalSet: boolean;
  targetRole: string | null;
  onboardingStatus: string;
  preferences: {
    workMode?: 'remote' | 'hybrid' | 'onsite' | 'any';
    jobTypes?: string[];
    experienceBand?: 'student' | 'fresher' | 'early_career' | 'experienced';
  };
  profile: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: number;
    preferredLocations: string[];
  } | null;
  skills: CareerSkillItem[];
  resumes: Array<{ id: string; filename: string; uploadedAt: string; isActive: boolean }>;
  certificates: Array<{ id: string; skill: string; certificate_code: string; issued_at: string }>;
}

export default function MyCareerDataPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<MyDataSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable form fields
  const [targetRole, setTargetRole] = useState('');
  const [workMode, setWorkMode] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [jobTypes, setJobTypes] = useState<string[]>(['Full-time']);
  const [preferredLocationsText, setPreferredLocationsText] = useState('');
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'verified' | 'confirmed' | 'unconfirmed'>('all');

  // Clear confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearText, setClearText] = useState('');

  const hydrateForm = (data: MyDataSnapshot) => {
    setSnapshot(data);
    setTargetRole(data.targetRole || '');
    setWorkMode(data.preferences?.workMode || 'any');
    setJobTypes(
      Array.isArray(data.preferences?.jobTypes) && data.preferences.jobTypes.length > 0
        ? data.preferences.jobTypes
        : ['Full-time']
    );
    setPreferredLocationsText((data.profile?.preferredLocations || []).join(', '));
    setInstitution(data.profile?.institution || '');
    setDegree(data.profile?.degree || '');
    setFieldOfStudy(data.profile?.fieldOfStudy || '');
    setGraduationYear(data.profile?.graduationYear ? String(data.profile.graduationYear) : '');
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/my-data');
        if (res.status === 401) {
          router.replace('/login?from=/dashboard/my-data');
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Failed to load career data.');
        } else {
          hydrateForm(data);
        }
      } catch {
        setError('Unable to reach server.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [router]);

  const handleExportProfileData = () => {
    if (!snapshot) return;
    const profilePayload = {
      exportedAt: new Date().toISOString(),
      account: snapshot.account,
      targetRole: snapshot.targetRole,
      preferences: snapshot.preferences,
      profile: snapshot.profile,
    };
    const blob = new Blob([JSON.stringify(profilePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-resume-profile.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportResumeData = async () => {
    try {
      const res = await fetch('/api/user/resumes?active=true');
      const data = await res.json().catch(() => ({}));
      const resume = data.resume || {};
      const resumePayload = {
        exportedAt: new Date().toISOString(),
        resumeId: resume.id,
        filename: resume.filename,
        resumeData: resume.resumeData || resume.resume_data,
      };
      const blob = new Blob([JSON.stringify(resumePayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resume.filename || 'resume').replace(/\s+/g, '_')}_data.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Unable to export active resume data at this time.');
    }
  };

  const handleSaveProfile = async (clearGoal = false) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const nextRole = clearGoal ? '' : targetRole.trim();
      const res = await fetch('/api/user/my-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateProfile',
          targetRole: nextRole,
          workMode,
          jobTypes,
          preferredLocations: preferredLocationsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          institution: institution.trim(),
          degree: degree.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          graduationYear: graduationYear ? Number(graduationYear) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not update career data.');
      } else {
        hydrateForm(data);
        setMessage(clearGoal ? 'Target role cleared (Goal not set).' : 'Career goal and profile saved.');
      }
    } catch {
      setError('Connection error while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkillAction = async (
    action: 'addSkill' | 'confirmSkill' | 'deleteSkill',
    payload: Record<string, string>
  ) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/user/my-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Skill update failed.');
      } else {
        hydrateForm(data);
        if (action === 'addSkill') setNewSkill('');
      }
    } catch {
      setError('Network error while updating skills.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = async () => {
    if (clearText.trim().toUpperCase() !== 'CLEAR') return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/my-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'CLEAR' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not clear career data.');
      } else {
        hydrateForm(data);
        setShowClearConfirm(false);
        setClearText('');
        setMessage('Career profile, target role, and unverified skills have been cleared.');
      }
    } catch {
      setError('Network error while clearing data.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] min-h-screen">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
        <span>Loading My Career Data...</span>
      </div>
    );
  }

  const skills = snapshot?.skills || [];
  const filteredSkills = skills.filter((s) => {
    if (skillFilter === 'verified') return s.status === 'verified';
    if (skillFilter === 'confirmed') return s.status !== 'verified' && Boolean(s.confirmedAt);
    if (skillFilter === 'unconfirmed') return s.status !== 'verified' && !s.confirmedAt;
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="reference-panel bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              <Database className="w-3.5 h-3.5" />
              <span>Data Transparency & Control</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">My Career Data</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Inspect, confirm, edit, export, or clear the goal, profile, and skill records powering your personalized path.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Setup</span>
            </Link>
            <button
              type="button"
              onClick={handleExportProfileData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-white text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer"
              title="Export academic profile, goals and preferences"
            >
              <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Export Profile</span>
            </button>
            <button
              type="button"
              onClick={handleExportResumeData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-white text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer"
              title="Export active resume JSON draft"
            >
              <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Export Resume</span>
            </button>
            <a
              href="/api/user/my-data/export"
              download="smart-resume-career-data.json"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold"
              title="Export full consolidated career snapshot"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Career Data</span>
            </a>
          </div>
        </div>

        {/* AI Transparency & Control Notice */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-3 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[13px] text-indigo-900">
              AI Transparency &amp; Data Control Notice
            </h3>
            <p className="leading-relaxed text-[12px] text-indigo-800">
              Suggestions are generated from your profile, resume, skills, projects, career goals, and saved jobs.
            </p>
            <p className="text-[11px] text-indigo-700">
              Your information is exclusively used to provide explainable recommendations without hallucinating false credentials or skills. You maintain complete ownership of your career data.
            </p>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl border border-[var(--accent)]/30 bg-[#FFFFFF] text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Check className="w-4 h-4 text-[var(--accent)]" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 rounded-xl border border-red-300 bg-[#FFFFFF] text-sm text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Career Goal & Preferences */}
        <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Career Goal & Preferences</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Current Status:{' '}
                <strong className="text-[var(--text-primary)]">
                  {snapshot?.goalSet && snapshot.targetRole ? snapshot.targetRole : 'Goal not set'}
                </strong>
              </p>
            </div>
            {snapshot?.goalSet && (
              <button
                type="button"
                onClick={() => handleSaveProfile(true)}
                disabled={isSaving}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-red-600 cursor-pointer self-start"
              >
                Clear target role
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Target Role
              </label>
              <JobSearchAutocomplete
                field="role"
                label="Target Role"
                value={targetRole}
                onChange={setTargetRole}
                onSelect={setTargetRole}
                placeholder="Type a role or leave blank (Goal not set)"
                leadingIcon={<Briefcase className="w-4 h-4 text-[var(--text-secondary)]" />}
                inputClassName="w-full min-h-[42px] pl-10 pr-3.5 py-2 rounded-lg border border-[#E5E8ED] bg-[#FFFFFF] text-sm text-[#20242B] focus:outline-none focus:border-[#3157C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Preferred Locations
              </label>
              <input
                type="text"
                value={preferredLocationsText}
                onChange={(e) => setPreferredLocationsText(e.target.value)}
                placeholder="e.g. Remote, Bangalore, London"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="any">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
                Opportunity Types
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Full-time', 'Internship', 'Contract'].map((jt) => {
                  const active = jobTypes.includes(jt);
                  return (
                    <button
                      key={jt}
                      type="button"
                      onClick={() =>
                        setJobTypes((prev) =>
                          prev.includes(jt)
                            ? prev.length > 1
                              ? prev.filter((item) => item !== jt)
                              : prev
                            : [...prev, jt]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        active
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      {jt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Degree</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Field of Study</label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Graduation Year</label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveProfile(false)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Career Profile</span>
            </button>
          </div>
        </section>

        {/* 2. Skills Provenance Manager */}
        <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Skills & Provenance ({skills.length})</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Skills show whether they are assessment-verified, user-confirmed, or unconfirmed claims parsed from a resume.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'verified', label: 'Verified' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'unconfirmed', label: 'Needs Review' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSkillFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                    skillFilter === tab.id
                      ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <div className="flex-1 min-w-0">
              <JobSearchAutocomplete
                field="skill"
                label="Add skill"
                value={newSkill}
                onChange={setNewSkill}
                onSelect={(val) => handleSkillAction('addSkill', { skillName: val })}
                placeholder="Add a verified or practiced skill (e.g. AutoCAD, Financial Modeling, TypeScript)"
                inputClassName="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#E5E8ED] bg-[#FFFFFF] text-sm text-[#20242B] focus:outline-none focus:border-[#3157C8]"
              />
            </div>
            <button
              type="button"
              onClick={() => newSkill.trim() && handleSkillAction('addSkill', { skillName: newSkill.trim() })}
              disabled={isSaving || !newSkill.trim()}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] bg-[#FFFFFF] hover:bg-[var(--accent)]/5 text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="p-5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
              No skills match this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
              {filteredSkills.map((skill) => {
                const isVerified = skill.status === 'verified';
                const isConfirmed = isVerified || Boolean(skill.confirmedAt);
                return (
                  <div
                    key={skill.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#FFFFFF]"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{skill.name}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Source: {skill.source || 'user_added'} · Category: {skill.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isVerified ? (
                        <span className="px-2.5 py-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold">
                          Verified{skill.score ? ` (${skill.score}%)` : ''}
                        </span>
                      ) : isConfirmed ? (
                        <span className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-medium">
                          Confirmed
                        </span>
                      ) : (
                        <>
                          <span className="px-2.5 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium">
                            Claimed — needs confirmation
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSkillAction('confirmSkill', { skill: skill.id })}
                            disabled={isSaving}
                            className="px-2.5 py-1 rounded bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSkillAction('deleteSkill', { skill: skill.id })}
                        disabled={isSaving}
                        aria-label={`Remove ${skill.name}`}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Resumes & Certificates Summary + Clear Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Connected Records</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  Saved Resumes ({snapshot?.resumes?.length || 0})
                </span>
                <Link href="/dashboard/resumes" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                  Manage
                </Link>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Award className="w-4 h-4 text-[var(--accent)]" />
                  Verified Certificates ({snapshot?.certificates?.length || 0})
                </span>
                <Link href="/dashboard/certificates" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                  View
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-[#FFFFFF] border border-[var(--border-color)] rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Reset Career Path Data</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Clears your saved target role, onboarding state, roadmap progress, and unverified skills. Your login account, resumes, and assessment certificates are preserved.
            </p>
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-[#FFFFFF] hover:bg-red-50 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Career Data</span>
              </button>
            ) : (
              <div className="p-4 rounded-lg border border-red-200 bg-[var(--bg-primary)] space-y-3">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Type <code>CLEAR</code> to confirm:
                </label>
                <input
                  type="text"
                  value={clearText}
                  onChange={(e) => setClearText(e.target.value)}
                  placeholder="CLEAR"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-sm"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearData}
                    disabled={isSaving || clearText.trim().toUpperCase() !== 'CLEAR'}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearText('');
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[#FFFFFF] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

