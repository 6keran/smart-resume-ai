'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Send,
  Loader2,
  FileText,
  FileEdit,
  Target,
  Lightbulb,
  ShieldCheck,
  Mail,
  HelpCircle,
  Plus,
  Save,
  MessageSquare,
  BookmarkCheck,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Award,
  Layers,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageTransition } from '@/components/ui/MotionPrimitives';
import { useUserProfile } from '@/components/user/UserContext';
import {
  type MatchAnalysisResult,
  type ApplicationMaterialsResult,
  type ApplicationChecklistState,
  type FollowUpResult,
  getDefaultChecklistState,
  computeChecklistProgress,
} from '@/lib/career/assistantTypes';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
}

function LinkedinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24" />
    </svg>
  );
}

interface UserApplicationItem {
  id: string;
  jobTitle: string;
  company: string;
  location?: string | null;
  status: string;
  jobUrl?: string | null;
  appliedAt?: string | null;
  interviewDate?: string | null;
  notes?: string | null;
  coverLetter?: string | null;
  tailoredSummary?: string | null;
  checklistState?: string | null;
  matchAnalysis?: string | null;
  outreachMessage?: string | null;
}

function ApplyAssistantStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserProfile();

  // Active Query Parameters
  const paramId = searchParams.get('id') || '';
  const paramTitle = searchParams.get('title') || searchParams.get('jobTitle') || '';
  const paramCompany = searchParams.get('company') || '';
  const paramLocation = searchParams.get('location') || '';
  const paramUrl = searchParams.get('jobUrl') || searchParams.get('url') || '';

  // Tab State: 'analysis' | 'materials' | 'coverletter' | 'checklist' | 'tracker'
  const [activeTab, setActiveTab] = useState<'analysis' | 'materials' | 'coverletter' | 'checklist' | 'tracker'>('analysis');

  // Job List & Selection State
  const [userApplications, setUserApplications] = useState<UserApplicationItem[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(paramId);
  const [loadingApps, setLoadingApps] = useState<boolean>(true);

  // Active Job Details
  const [jobTitle, setJobTitle] = useState<string>(paramTitle || 'Software Engineer');
  const [company, setCompany] = useState<string>(paramCompany || 'Tech Company');
  const [location, setLocation] = useState<string>(paramLocation || 'Remote / Hybrid');
  const [jobUrl, setJobUrl] = useState<string>(paramUrl || '');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('Saved');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // AI Intelligence & Materials State
  const [analysis, setAnalysis] = useState<MatchAnalysisResult | null>(null);
  const [materials, setMaterials] = useState<ApplicationMaterialsResult | null>(null);
  const [checklist, setChecklist] = useState<ApplicationChecklistState>(getDefaultChecklistState());

  // Editable Cover Letter & Summary State
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>('');
  const [editableSummary, setEditableSummary] = useState<string>('');
  const [editableOutreach, setEditableOutreach] = useState<string>('');

  // Follow-Up Generator State
  const [followUpMode, setFollowUpMode] = useState<'post_application' | 'post_interview'>('post_application');
  const [followUpChannel, setFollowUpChannel] = useState<'email' | 'linkedin'>('email');
  const [followUpResult, setFollowUpResult] = useState<FollowUpResult | null>(null);
  const [generatingFollowUp, setGeneratingFollowUp] = useState<boolean>(false);

  // Operation / Async Statuses
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Saved Applications for this User
  const loadUserApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await fetch('/api/user/applications');
      if (res.ok) {
        const data = await res.json();
        const apps: UserApplicationItem[] = (data.applications || []).map((a: any) => ({
          id: a.id,
          jobTitle: a.jobTitle || a.job_title || 'Untitled Role',
          company: a.company || 'Unknown Company',
          location: a.location || null,
          status: a.status || 'Saved',
          jobUrl: a.jobUrl || a.job_url || null,
          appliedAt: a.appliedAt || a.applied_at || null,
          interviewDate: a.interviewDate || a.interview_date || null,
          notes: a.notes || null,
          coverLetter: a.coverLetter || a.cover_letter || null,
          tailoredSummary: a.tailoredSummary || a.tailored_summary || null,
          checklistState: a.checklistState || a.checklist_state || null,
          matchAnalysis: a.matchAnalysis || a.match_analysis || null,
          outreachMessage: a.outreachMessage || a.outreach_message || null,
        }));
        setUserApplications(apps);

        // Auto-select match if paramId exists or first app
        if (paramId) {
          const matched = apps.find((a) => a.id === paramId);
          if (matched) {
            applySelectedApplication(matched);
          }
        } else if (apps.length > 0 && !paramTitle) {
          setSelectedAppId(apps[0].id);
          applySelectedApplication(apps[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoadingApps(false);
    }
  }, [paramId, paramTitle]);

  useEffect(() => {
    loadUserApplications();
  }, [loadUserApplications]);

  // Synchronize state when switching applications
  function applySelectedApplication(app: UserApplicationItem) {
    setSelectedAppId(app.id);
    setJobTitle(app.jobTitle);
    setCompany(app.company);
    setLocation(app.location || 'Remote / Hybrid');
    setJobUrl(app.jobUrl || '');
    setStatus(app.status);
    setInterviewDate(app.interviewDate || '');
    setNotes(app.notes || '');

    if (app.matchAnalysis) {
      try {
        const parsed = JSON.parse(app.matchAnalysis);
        setAnalysis(parsed);
      } catch {
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }

    if (app.checklistState) {
      try {
        const parsed = JSON.parse(app.checklistState);
        setChecklist(computeChecklistProgress(parsed));
      } catch {
        setChecklist(getDefaultChecklistState());
      }
    } else {
      setChecklist(getDefaultChecklistState());
    }

    if (app.coverLetter) {
      setEditableCoverLetter(app.coverLetter);
    }
    if (app.tailoredSummary) {
      setEditableSummary(app.tailoredSummary);
    }
    if (app.outreachMessage) {
      setEditableOutreach(app.outreachMessage);
    }
  }

  // Handle Application Switch from Dropdown
  function handleSelectApplication(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id === 'new') {
      setSelectedAppId('');
      setJobTitle('');
      setCompany('');
      setLocation('');
      setJobUrl('');
      setJobDescription('');
      setStatus('Saved');
      setInterviewDate('');
      setNotes('');
      setAnalysis(null);
      setMaterials(null);
      setEditableCoverLetter('');
      setEditableSummary('');
      setEditableOutreach('');
      setChecklist(getDefaultChecklistState());
      router.push('/apply-assistant');
      return;
    }

    const matched = userApplications.find((a) => a.id === id);
    if (matched) {
      applySelectedApplication(matched);
      router.push(`/apply-assistant?id=${matched.id}`);
    }
  }

  // Trigger Analysis
  async function runJobAnalysis() {
    if (!jobTitle.trim() || !company.trim()) {
      setErrorMessage('Please provide both Job Title and Company Name to analyze requirements.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/career/assistant/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId || undefined,
          jobTitle,
          company,
          location,
          url: jobUrl,
          description: jobDescription,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Analysis failed.');
      }

      const data = await res.json();
      setAnalysis(data.analysis);

      // Auto check Step 1 on checklist
      updateChecklistStep('eligibilityChecked', true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete job match analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Trigger Application Materials Preparation
  async function prepareApplicationMaterials() {
    if (!jobTitle.trim() || !company.trim()) {
      setErrorMessage('Please provide both Job Title and Company Name to prepare materials.');
      return;
    }

    setErrorMessage(null);
    setIsPreparing(true);
    try {
      const res = await fetch('/api/career/assistant/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId || undefined,
          jobTitle,
          company,
          location,
          url: jobUrl,
          description: jobDescription,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Preparation failed.');
      }

      const data = await res.json();
      setMaterials(data.materials);
      if (data.materials?.tailoredSummary) {
        setEditableSummary(data.materials.tailoredSummary);
      }
      if (data.materials?.coverLetter?.fullText) {
        setEditableCoverLetter(data.materials.coverLetter.fullText);
      }
      if (data.materials?.recruiterOutreach?.linkedInNote) {
        setEditableOutreach(data.materials.recruiterOutreach.linkedInNote);
      }

      // Automatically update checklist step 2 & 4
      updateChecklistStep('resumeTailored', true);
      updateChecklistStep('coverLetterPrepared', true);

      // Switch to materials tab to view results
      setActiveTab('materials');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate tailored application materials.');
    } finally {
      setIsPreparing(false);
    }
  }

  // Update a Checklist Step
  async function updateChecklistStep(stepKey: keyof ApplicationChecklistState, value: boolean) {
    const updated = computeChecklistProgress({
      ...checklist,
      [stepKey]: value,
    });
    setChecklist(updated);

    if (selectedAppId) {
      try {
        await fetch(`/api/career/assistant/application/${selectedAppId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checklistState: updated,
            ...(stepKey === 'applicationSubmitted' && value ? { status: 'Applied' } : {}),
          }),
        });
        if (stepKey === 'applicationSubmitted' && value) {
          setStatus('Applied');
        }
      } catch (err) {
        console.warn('Failed to persist checklist state:', err);
      }
    }
  }

  // Save Application Changes (Summary, Cover Letter, Status, Notes, Interview Date)
  async function saveApplicationChanges() {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (selectedAppId) {
        // Update existing application
        const res = await fetch(`/api/career/assistant/application/${selectedAppId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            coverLetter: editableCoverLetter,
            tailoredSummary: editableSummary,
            outreachMessage: editableOutreach,
            interviewDate: interviewDate || null,
            notes,
            jobUrl,
            checklistState: checklist,
            matchAnalysis: analysis,
          }),
        });

        if (!res.ok) throw new Error('Failed to update application record.');
        setSaveSuccessMessage('Application workspace saved successfully!');
      } else {
        // Create new application
        const res = await fetch('/api/user/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle,
            company,
            location,
            jobUrl,
            status,
            notes,
            coverLetter: editableCoverLetter,
            tailoredSummary: editableSummary,
            outreachMessage: editableOutreach,
            interviewDate: interviewDate || null,
            checklistState: JSON.stringify(checklist),
            matchAnalysis: analysis ? JSON.stringify(analysis) : null,
          }),
        });

        if (!res.ok) throw new Error('Failed to create new application record.');
        const data = await res.json();
        const createdId = data.application?.id;
        if (createdId) {
          setSelectedAppId(createdId);
          await loadUserApplications();
          router.push(`/apply-assistant?id=${createdId}`);
        }
        setSaveSuccessMessage('New application created & synced to Tracker!');
      }

      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  // Safe Job Link Launcher (Step 6)
  function handleOpenJobLink() {
    if (!jobUrl) {
      setErrorMessage('Please enter a valid job URL first.');
      return;
    }

    try {
      const parsed = new URL(jobUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setErrorMessage('Job URL must use secure HTTP or HTTPS protocol.');
        return;
      }
      updateChecklistStep('linkVerified', true);
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      setErrorMessage('The provided job URL is invalid. Please check the address.');
    }
  }

  // Student Manual Submission Confirmation (Step 7)
  async function handleConfirmSubmission() {
    const confirmed = window.confirm(
      `Confirm manual submission?\n\nHave you submitted your application on ${company}'s portal? This will advance status to "Applied" and timestamp your record.`
    );
    if (!confirmed) return;

    await updateChecklistStep('applicationSubmitted', true);
    setStatus('Applied');
    setSaveSuccessMessage('Application marked as Applied! Follow-up reminders are now active.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  }

  // Generate Follow-Up Message
  async function handleGenerateFollowUp() {
    setGeneratingFollowUp(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/career/assistant/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId || undefined,
          jobTitle,
          company,
          status,
          appliedAt: checklist.appliedAtConfirmed || undefined,
          interviewDate: interviewDate || undefined,
          type: followUpMode,
          channel: followUpChannel,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate follow-up.');
      }

      const data = await res.json();
      setFollowUpResult(data.followUp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not generate follow-up message.');
    } finally {
      setGeneratingFollowUp(false);
    }
  }

  // Copy helper with feedback
  async function handleCopy(key: string, text: string) {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  }

  // Calculate cover letter word count
  const coverLetterWordCount = editableCoverLetter
    ? editableCoverLetter.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 pt-4 sm:pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Top Banner & Job Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-semibold mb-1.5 border border-[var(--accent)]/20">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Job Application Assistant</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Application Preparation Studio
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Analyze job requirements, tailor grounded resume bullet points, prepare personalized cover letters, and track readiness.
              </p>
            </div>

            {/* Application Selector Dropdown & Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                <Briefcase className="w-4 h-4 text-[var(--accent)]" />
                <select
                  value={selectedAppId || (jobTitle ? 'custom' : 'new')}
                  onChange={handleSelectApplication}
                  className="bg-transparent text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer max-w-[210px] truncate"
                >
                  <option value="new">+ Prepare New Job...</option>
                  {userApplications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.jobTitle} @ {app.company} ({app.status})
                    </option>
                  ))}
                  {!selectedAppId && jobTitle && (
                    <option value="custom">Active: {jobTitle} @ {company}</option>
                  )}
                </select>
              </div>

              <button
                onClick={saveApplicationChanges}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-[var(--accent)]/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{selectedAppId ? 'Save Workspace' : 'Save to Tracker'}</span>
              </button>

              <Link
                href="/dashboard/applications"
                className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all flex items-center gap-1"
              >
                <span>Tracker</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feedback Messages */}
          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Job Target Details Bar (Always Visible / Editable) */}
          <GlassCard variant="default" className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Target Job Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Graduate Software Engineer"
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google, Microsoft, Startup"
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Official Application Link
                </label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://careers.company.com/job/..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="md:col-span-2 flex items-end gap-2 pt-1 md:pt-4">
                <button
                  onClick={runJobAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-2 px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Run Job Application Analysis"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Target className="w-3.5 h-3.5" />
                  )}
                  <span>{analysis ? 'Re-analyze' : 'Analyze Match'}</span>
                </button>
              </div>
            </div>

            {/* Optional Collapsible Job Description / Snippet */}
            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
              <details className="text-xs">
                <summary className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none font-medium">
                  {jobDescription ? 'Job Description (Pasted)' : '+ Paste job description text for deeper precision'}
                </summary>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description or key responsibilities here..."
                  rows={3}
                  className="w-full mt-2 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </details>
            </div>
          </GlassCard>

          {/* Studio Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-[var(--border-color)] overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'analysis'
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Match & Eligibility</span>
              {analysis && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent)] text-white">
                  {analysis.overallMatchScore}%
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'materials'
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. Resume & Projects</span>
              {materials && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('coverletter')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'coverletter'
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>3. Cover Letter & Outreach</span>
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'checklist'
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>4. Readiness Checklist</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-500/10 text-[var(--text-secondary)] font-semibold">
                {checklist.completedSteps}/{checklist.totalSteps}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'tracker'
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>5. Tracker & Follow-Up</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                status === 'Applied' ? 'bg-emerald-500/10 text-emerald-500' :
                status === 'Interview' ? 'bg-blue-500/10 text-blue-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>
                {status}
              </span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: MATCH & ELIGIBILITY ANALYSIS                               */}
          {/* ================================================================= */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {!analysis ? (
                <GlassCard variant="default" className="p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto border border-[var(--border-color)]">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Ready to Analyze {jobTitle || 'Target Role'} @ {company || 'Target Company'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1">
                      Compare the role&apos;s technical requirements, graduation year eligibility, and experience expectations against your authentic student profile.
                    </p>
                  </div>
                  <button
                    onClick={runJobAnalysis}
                    disabled={isAnalyzing}
                    className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                    <span>Analyze Match & Eligibility</span>
                  </button>
                </GlassCard>
              ) : (
                <div className="space-y-6">
                  {/* Top Match Score & Quick Insights */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Score Gauge Card */}
                    <GlassCard variant="default" className="lg:col-span-4 p-5 flex flex-col items-center justify-center text-center">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-[var(--border-color)]"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={264}
                            strokeDashoffset={264 - (264 * analysis.overallMatchScore) / 100}
                            strokeLinecap="round"
                            className={
                              analysis.overallMatchScore >= 80 ? 'text-emerald-500' :
                              analysis.overallMatchScore >= 65 ? 'text-[var(--accent)]' :
                              'text-amber-500'
                            }
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                            {analysis.overallMatchScore}%
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                            Match Score
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          analysis.overallMatchScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          analysis.overallMatchScore >= 65 ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {analysis.overallMatchScore >= 80 ? 'Strong Candidate Match' :
                           analysis.overallMatchScore >= 65 ? 'Competitive Match' : 'Growth & Bridge Opportunity'}
                        </span>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                          Evaluated against {analysis.matchingSkills.length + analysis.missingSkills.length} job criteria
                        </p>
                      </div>

                      <button
                        onClick={prepareApplicationMaterials}
                        disabled={isPreparing}
                        className="w-full mt-4 py-2 px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isPreparing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileEdit className="w-3.5 h-3.5" />}
                        <span>Prepare Tailored Application</span>
                      </button>
                    </GlassCard>

                    {/* Eligibility Breakdown */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Education Eligibility */}
                      <GlassCard variant="default" className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Education Eligibility</h4>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            analysis.educationEligibility.eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {analysis.educationEligibility.eligible ? 'Eligible' : 'Near Match'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">Requirement: </span>
                          {analysis.educationEligibility.required}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">Your Profile: </span>
                          {analysis.educationEligibility.actual}
                        </p>
                        <p className="text-[11px] text-[var(--accent)] font-medium pt-1 flex items-start gap-1">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{analysis.educationEligibility.note}</span>
                        </p>
                      </GlassCard>

                      {/* Experience Eligibility */}
                      <GlassCard variant="default" className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-[var(--accent)]" />
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Experience Eligibility</h4>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            analysis.experienceEligibility.eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {analysis.experienceEligibility.eligible ? 'Eligible' : 'Bridge Needed'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">Requirement: </span>
                          {analysis.experienceEligibility.required}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">Your Status: </span>
                          {analysis.experienceEligibility.actual}
                        </p>
                        <p className="text-[11px] text-[var(--accent)] font-medium pt-1 flex items-start gap-1">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{analysis.experienceEligibility.note}</span>
                        </p>
                      </GlassCard>

                      {/* Work Arrangement & Program Eligibility */}
                      <GlassCard variant="default" className="p-4 space-y-2 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Work Arrangement & Program Type</h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            Verified Fit
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Workplace: </span>
                            {analysis.workArrangementEligibility.jobOffered}
                            <p className="text-[11px] text-[var(--text-secondary)]/80 mt-0.5">
                              {analysis.workArrangementEligibility.note}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">Program Fit: </span>
                            {analysis.opportunityEligibility.jobType}
                            <p className="text-[11px] text-[var(--text-secondary)]/80 mt-0.5">
                              {analysis.opportunityEligibility.note}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  </div>

                  {/* Matching vs Missing Skills Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Matching Skills */}
                    <GlassCard variant="default" className="p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">
                            Matching Skills ({analysis.matchingSkills.length})
                          </h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">Found in your profile</span>
                      </div>

                      {analysis.matchingSkills.length === 0 ? (
                        <p className="text-xs text-[var(--text-secondary)]">No matching skills identified.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {analysis.matchingSkills.map((sk) => (
                            <span
                              key={sk.name}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                sk.verified
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                              }`}
                            >
                              {sk.verified ? <Award className="w-3.5 h-3.5 text-emerald-400" /> : <Check className="w-3.5 h-3.5" />}
                              <span>{sk.name}</span>
                              {sk.verified && <span className="text-[9px] font-bold uppercase opacity-80">Verified</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </GlassCard>

                    {/* Missing Skills */}
                    <GlassCard variant="default" className="p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">
                            Missing Skills ({analysis.missingSkills.length})
                          </h4>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">Prioritized for preparation</span>
                      </div>

                      {analysis.missingSkills.length === 0 ? (
                        <p className="text-xs text-emerald-400">Full skill coverage! No critical gaps identified.</p>
                      ) : (
                        <div className="space-y-2">
                          {analysis.missingSkills.map((sk) => (
                            <div
                              key={sk.name}
                              className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[var(--text-primary)]">{sk.name}</span>
                                <p className="text-[10px] text-[var(--text-secondary)]">{sk.reason}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                sk.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {sk.priority} priority
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </div>

                  {/* Strengths & Recommended Prep Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Strengths */}
                    <GlassCard variant="default" className="p-5 space-y-3">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Award className="w-4 h-4 text-[var(--accent)]" />
                        <span>Candidate Strengths (Grounded in Your Facts)</span>
                      </h4>
                      <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                        {analysis.strengths.map((str, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>

                    {/* Actionable Prep Steps */}
                    <GlassCard variant="default" className="p-5 space-y-3">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Target className="w-4 h-4 text-[var(--accent)]" />
                        <span>Recommended Preparation Steps</span>
                      </h4>
                      <ol className="space-y-2 text-xs text-[var(--text-secondary)]">
                        {analysis.recommendedPrepSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </GlassCard>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: RESUME TAILORING & PROJECTS                                */}
          {/* ================================================================= */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {!materials && !editableSummary ? (
                <GlassCard variant="default" className="p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto border border-[var(--border-color)]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Generate Job-Specific Application Materials
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1">
                      Generates a tailored professional summary, Google X-Y-Z improved project bullet points using verified student facts, prioritized skills to highlight, and cover letter drafts.
                    </p>
                  </div>
                  <button
                    onClick={prepareApplicationMaterials}
                    disabled={isPreparing}
                    className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
                    <span>Generate Tailored Materials</span>
                  </button>
                </GlassCard>
              ) : (
                <div className="space-y-6">
                  {/* Tailored Professional Summary */}
                  <GlassCard variant="default" className="p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--accent)]" />
                          <span>Job-Tailored Professional Summary</span>
                        </h3>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Grounded in your academic credentials and verified skills for {company}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy('summary', editableSummary)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedKey === 'summary' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'summary' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <Link
                          href="/builder?from=assistant"
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5"
                        >
                          <span>Open in Resume Builder</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    <textarea
                      value={editableSummary}
                      onChange={(e) => setEditableSummary(e.target.value)}
                      rows={4}
                      className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--accent)]"
                    />
                  </GlassCard>

                  {/* Improved Student Projects (Google X-Y-Z formula) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[var(--accent)]" />
                          <span>Tailored Project Descriptions (Google X-Y-Z Formula)</span>
                        </h3>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Rewritten using verified student facts: &quot;Accomplished [X] as measured by [Y], by doing [Z]&quot;. Strictly zero fabricated metrics!
                        </p>
                      </div>
                    </div>

                    {materials?.improvedProjects && materials.improvedProjects.length > 0 ? (
                      <div className="space-y-4">
                        {materials.improvedProjects.map((proj, idx) => (
                          <GlassCard key={idx} variant="default" className="p-5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-primary)]">{proj.improvedTitle}</h4>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {proj.technologies.map((t) => (
                                    <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={() => handleCopy(`proj_${idx}`, proj.tailoredBullets.join('\n• '))}
                                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKey === `proj_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy Bullets</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {/* Original Bullets */}
                              <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)]">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Original Profile Bullet(s)</span>
                                <ul className="mt-2 space-y-1.5 text-[var(--text-secondary)]">
                                  {proj.originalBullets.map((b, bIdx) => (
                                    <li key={bIdx} className="flex items-start gap-1.5">
                                      <span className="text-slate-400">•</span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Tailored Bullets */}
                              <div className="p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                                <span className="text-[10px] uppercase font-bold text-[var(--accent)]">Tailored for {company}</span>
                                <ul className="mt-2 space-y-1.5 text-[var(--text-primary)]">
                                  {proj.tailoredBullets.map((b, bIdx) => (
                                    <li key={bIdx} className="flex items-start gap-1.5">
                                      <span className="text-[var(--accent)] font-bold">•</span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {proj.alignmentNote && (
                              <p className="text-[11px] text-[var(--text-secondary)] pt-1 flex items-start gap-1">
                                <Target className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                                <span>Employer Alignment: {proj.alignmentNote}</span>
                              </p>
                            )}
                          </GlassCard>
                        ))}
                      </div>
                    ) : (
                      <GlassCard variant="default" className="p-6 text-center text-xs text-[var(--text-secondary)]">
                        No projects recorded in your profile. Add student or academic projects in your{' '}
                        <Link href="/profile" className="text-[var(--accent)] underline font-semibold">
                          Career Profile
                        </Link>{' '}
                        or create one with our{' '}
                        <Link href="/projects" className="text-[var(--accent)] underline font-semibold">
                          AI Project Mentor
                        </Link>
                        .
                      </GlassCard>
                    )}
                  </div>

                  {/* Skills to Highlight */}
                  {materials?.skillsToHighlight && materials.skillsToHighlight.length > 0 && (
                    <GlassCard variant="default" className="p-5 space-y-3">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Award className="w-4 h-4 text-[var(--accent)]" />
                        <span>Recommended Placement for High-Impact Skills</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {materials.skillsToHighlight.map((h, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text-primary)]">{h.skill}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] uppercase">
                                in {h.whereToShow}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">{h.relevance}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: COVER LETTER & OUTREACH MESSAGES                           */}
          {/* ================================================================= */}
          {activeTab === 'coverletter' && (
            <div className="space-y-6">
              {/* Cover Letter Editor */}
              <GlassCard variant="default" className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Personalized 4-Paragraph Cover Letter
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        coverLetterWordCount >= 180 && coverLetterWordCount <= 380
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {coverLetterWordCount} words
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Tailored to {company} — Review, edit freely, and copy or download.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy('cover_letter', editableCoverLetter)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === 'cover_letter' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'cover_letter' ? 'Copied Letter' : 'Copy Letter'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const blob = new Blob([editableCoverLetter], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Cover_Letter_${company.replace(/\s+/g, '_')}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>

                <textarea
                  value={editableCoverLetter}
                  onChange={(e) => setEditableCoverLetter(e.target.value)}
                  placeholder="Click 'Generate Tailored Materials' or paste your cover letter draft here..."
                  rows={14}
                  className="w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--accent)] font-mono"
                />

                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1">
                  <span>Standard 4-Paragraph Format: Introduction • Technical Rigor • Company Alignment • Interview Call to Action</span>
                  <button
                    onClick={saveApplicationChanges}
                    className="text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                  >
                    Save Changes to Application
                  </button>
                </div>
              </GlassCard>

              {/* Recruiter Outreach & Email Drafts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* LinkedIn Connection Note (<= 300 Chars) */}
                <GlassCard variant="default" className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <LinkedinIcon className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        LinkedIn Recruiter Note (≤ 300 chars)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${
                        editableOutreach.length <= 300 ? 'text-emerald-400' : 'text-rose-400 font-extrabold'
                      }`}>
                        {editableOutreach.length} / 300
                      </span>
                      <button
                        onClick={() => handleCopy('outreach', editableOutreach)}
                        className="p-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {copiedKey === 'outreach' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={editableOutreach}
                    onChange={(e) => setEditableOutreach(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Tip: Send this short connection note when inviting university recruiters or engineering managers on LinkedIn.
                  </p>
                </GlassCard>

                {/* Application Email Draft */}
                <GlassCard variant="default" className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[var(--accent)]" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Direct Email Application Template
                      </h4>
                    </div>

                    <button
                      onClick={() => handleCopy('email_draft', materials?.applicationEmailDraft?.body || '')}
                      disabled={!materials?.applicationEmailDraft?.body}
                      className="p-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
                    >
                      {copiedKey === 'email_draft' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Subject: </span>
                      {materials?.applicationEmailDraft?.subject || `Application: ${jobTitle} – ${user?.name || 'Candidate'}`}
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed">
                      {materials?.applicationEmailDraft?.body || 'Generate tailored materials to view direct recruiter email template.'}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: APPLICATION READINESS CHECKLIST                            */}
          {/* ================================================================= */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <GlassCard variant="default" className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <BookmarkCheck className="w-5 h-5 text-[var(--accent)]" />
                      <span>7-Step Application Readiness Checklist</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Verify every prerequisite before submitting to maximize your interview conversion rate.
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[var(--border-color)] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${checklist.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {checklist.completedSteps} of {checklist.totalSteps} ({checklist.percentage}%)
                    </span>
                  </div>
                </div>

                {/* The 7 Steps */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.eligibilityChecked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_1"
                      checked={checklist.eligibilityChecked}
                      onChange={(e) => updateChecklistStep('eligibilityChecked', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="step_1" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          1. Job Eligibility & Requirements Checked
                        </span>
                        {checklist.eligibilityChecked && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Reviewed graduation year, degree requirements, and matched core skills in Step 1.
                      </p>
                    </label>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.resumeTailored ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_2"
                      checked={checklist.resumeTailored}
                      onChange={(e) => updateChecklistStep('resumeTailored', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="step_2" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          2. Resume Tailored for this Specific Role
                        </span>
                        {checklist.resumeTailored && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Tailored professional summary and customized project bullets to highlight {company}&apos;s tech stack.
                      </p>
                    </label>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.resumeReviewed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_3"
                      checked={checklist.resumeReviewed}
                      onChange={(e) => updateChecklistStep('resumeReviewed', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="step_3" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          3. Resume Reviewed & Proofread
                        </span>
                        {checklist.resumeReviewed && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Verified contact information, graduation year, spell check, and clean A4 formatting.
                      </p>
                    </label>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.coverLetterPrepared ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_4"
                      checked={checklist.coverLetterPrepared}
                      onChange={(e) => updateChecklistStep('coverLetterPrepared', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="step_4" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          4. Personalized Cover Letter Prepared
                        </span>
                        {checklist.coverLetterPrepared && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Reviewed the 4-paragraph personalized letter and customized company alignment points.
                      </p>
                    </label>
                  </div>

                  {/* Step 5 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.documentsChecked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_5"
                      checked={checklist.documentsChecked}
                      onChange={(e) => updateChecklistStep('documentsChecked', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label htmlFor="step_5" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          5. Supporting Documents Ready
                        </span>
                        {checklist.documentsChecked && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Academic transcript, GitHub profile link, live demo URLs, and references prepared.
                      </p>
                    </label>
                  </div>

                  {/* Step 6 */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.linkVerified ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_6"
                      checked={checklist.linkVerified}
                      onChange={(e) => updateChecklistStep('linkVerified', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="step_6" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                          6. Official Application Portal Verified
                        </label>
                        {checklist.linkVerified && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Verified</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Ensure the company careers URL is legitimate, active, and accepts applications.
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={handleOpenJobLink}
                          className="px-3 py-1 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open Company Application Portal</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 7: Manual Confirmation */}
                  <div className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    checklist.applicationSubmitted ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <input
                      type="checkbox"
                      id="step_7"
                      checked={checklist.applicationSubmitted}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleConfirmSubmission();
                        } else {
                          updateChecklistStep('applicationSubmitted', false);
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="step_7" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                          7. Application Submitted by Student
                        </label>
                        {checklist.applicationSubmitted ? (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmed Applied
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold uppercase">Manual Confirmation Required</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Strict manual confirmation: Smart Resume AI will never submit an application without your explicit confirmation.
                      </p>

                      {!checklist.applicationSubmitted && (
                        <div className="mt-2.5">
                          <button
                            onClick={handleConfirmSubmission}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>I Have Submitted This Application</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: TRACKER & FOLLOW-UP ASSISTANCE                             */}
          {/* ================================================================= */}
          {activeTab === 'tracker' && (
            <div className="space-y-6">
              {/* Status & Interview Details Card */}
              <GlassCard variant="default" className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Application Tracking Details
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Synchronized with your main Application Tracker & Dashboard
                    </p>
                  </div>

                  <button
                    onClick={saveApplicationChanges}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Tracker State</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                      Current Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                    >
                      <option value="Saved">Saved</option>
                      <option value="Ready to apply">Ready to apply</option>
                      <option value="Application pending">Application pending</option>
                      <option value="Applied">Applied</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  {/* Interview Date Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                      Interview Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={interviewDate ? interviewDate.split('T')[0] : ''}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                    />
                  </div>

                  {/* Quick Deep Link to Interview Prep */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <Link
                      href={`/interview-prep?role=${encodeURIComponent(jobTitle)}`}
                      className="btn-secondary w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Start Interview Practice</span>
                    </Link>
                  </div>
                </div>

                {/* Application Notes */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                    Personal Application Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Log conversation notes, recruiter names, referral contacts, or next interview round dates..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </GlassCard>

              {/* Contextual AI Follow-Up Generator */}
              <GlassCard variant="default" className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[var(--accent)]" />
                      <span>Follow-Up Communication Assistant</span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Generate polished follow-up and thank-you messages calibrated by timeline and status.
                    </p>
                  </div>

                  {/* Mode & Channel Switchers */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-0.5 text-xs">
                      <button
                        onClick={() => setFollowUpMode('post_application')}
                        className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                          followUpMode === 'post_application' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        Post-Application
                      </button>
                      <button
                        onClick={() => setFollowUpMode('post_interview')}
                        className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                          followUpMode === 'post_interview' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        Post-Interview
                      </button>
                    </div>

                    <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-0.5 text-xs">
                      <button
                        onClick={() => setFollowUpChannel('email')}
                        className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                          followUpChannel === 'email' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        Email
                      </button>
                      <button
                        onClick={() => setFollowUpChannel('linkedin')}
                        className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                          followUpChannel === 'linkedin' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        LinkedIn
                      </button>
                    </div>

                    <button
                      onClick={handleGenerateFollowUp}
                      disabled={generatingFollowUp}
                      className="btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {generatingFollowUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>Generate Message</span>
                    </button>
                  </div>
                </div>

                {/* Follow-Up Output */}
                {followUpResult ? (
                  <div className="space-y-3.5">
                    {/* Timing Badge */}
                    <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                      followUpResult.timingStatus === 'optimal' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                      followUpResult.timingStatus === 'early' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                      'bg-blue-500/10 border-blue-500/25 text-blue-400'
                    }`}>
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{followUpResult.timingNote}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">
                          Subject: {followUpResult.subject}
                        </span>
                        <button
                          onClick={() => handleCopy('follow_up', `${followUpResult.subject}\n\n${followUpResult.message}`)}
                          className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] hover:border-[var(--accent)] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'follow_up' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'follow_up' ? 'Copied' : 'Copy Message'}</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-mono">
                        {followUpResult.message}
                      </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
                      <span className="font-bold text-[var(--text-primary)] block">Recommended Etiquette:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {followUpResult.tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] italic">
                    Click &quot;Generate Message&quot; above to create a timing-calibrated follow-up email or LinkedIn message.
                  </p>
                )}

                <p className="text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Notice: Smart Resume AI will never send emails or LinkedIn messages on your behalf. All drafts are created for your review, personalization, and manual sending.</span>
                </p>
              </GlassCard>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
}

export default function ApplyAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <ApplyAssistantStudio />
    </Suspense>
  );
}
