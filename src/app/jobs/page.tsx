'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  MapPin,
  Building,
  DollarSign,
  Clock,
  Filter,
  ArrowRight,
  ExternalLink,
  Target,
  Globe,
  LocateFixed,
  AlertCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Compass,
  KeyRound,
  ShieldCheck,
  RotateCw,
  Award,
  BookOpen,
  FolderGit2,
  Calendar,
  Bookmark,
  FileEdit,
  Send,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { Job, JobSearchResponse, WorkplaceType, EmploymentType } from '@/types/jobs';
import { GlassCard } from '@/components/ui/GlassCard';
import { JobSearchAutocomplete } from '@/components/jobs/JobSearchAutocomplete';
import { buildNaukriSearchUrl } from '@/lib/jobs/naukriSearchUrl';

function formatPostedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(date);
}

function formatSnapshotDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function JobSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resumeData, analysisResult, updateTargetJob } = useResume();

  // Application Tracking & Return Prompt State
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [pendingApplication, setPendingApplication] = useState<{
    id: string | null;
    jobTitle: string;
    company: string;
    source: string;
    jobUrl: string;
  } | null>(null);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [confirmStatusMessage, setConfirmStatusMessage] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savedAppMap, setSavedAppMap] = useState<Map<string, string>>(new Map());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load existing saved applications on mount to ensure persistence across refresh/login
  useEffect(() => {
    async function loadSavedApplications() {
      try {
        const res = await fetch('/api/user/applications');
        if (res.ok) {
          const data = await res.json();
          const apps = data.applications || [];
          const sIds = new Set<string>();
          const aMap = new Map<string, string>();
          for (const app of apps) {
            const jId = app.job_id || app.jobId;
            if (jId) {
              aMap.set(jId, app.id);
              if (app.status === 'Saved' || app.status === 'Ready to apply') {
                sIds.add(jId);
              }
            }
          }
          setSavedJobIds(sIds);
          setSavedAppMap(aMap);
        }
      } catch (err) {
        console.error('Failed to load user saved applications:', err);
      }
    }
    loadSavedApplications();
  }, []);

  // Tab return listener for automatic prompt trigger
  useEffect(() => {
    const handleWindowFocus = () => {
      if (pendingApplication && !showConfirmPrompt) {
        setShowConfirmPrompt(true);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [pendingApplication, showConfirmPrompt]);

  // Primary search inputs
  const initialQuery = searchParams.get('q') || searchParams.get('keywords') || '';
  const initialLocation = searchParams.get('location') || '';
  const fromAnalyzer = searchParams.get('from') === 'analyzer';

  const [keywords, setKeywords] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);

  // Filters requested in specification
  const [experienceLevel, setExperienceLevel] = useState<string>('any');
  const [jobType, setJobType] = useState<string>('any');
  const [workMode, setWorkMode] = useState<string>('any');
  const [postedDays, setPostedDays] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'salary' | 'match'>('relevance');

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResponse, setSearchResponse] = useState<JobSearchResponse | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const jobDrawerRef = useRef<HTMLDivElement>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nlpPrompt, setNlpPrompt] = useState('');
  const [isParsingNlp, setIsParsingNlp] = useState(false);
  const [nlpExplanation, setNlpExplanation] = useState<string | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef(0);

  useEffect(() => () => {
    searchControllerRef.current?.abort();
  }, []);

  // Body scroll lock & Escape key handling for slide-over drawer and confirm prompt
  useEffect(() => {
    if (selectedJob || showConfirmPrompt) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showConfirmPrompt) setShowConfirmPrompt(false);
          else if (selectedJob) setSelectedJob(null);
          return;
        }

        const activeDialog = showConfirmPrompt
          ? confirmDialogRef.current
          : selectedJob
            ? jobDrawerRef.current
            : null;
        if (e.key === 'Tab' && activeDialog) {
          const focusable = Array.from(
            activeDialog.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (!first || !last) {
            e.preventDefault();
            activeDialog.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedJob, showConfirmPrompt]);

  useEffect(() => {
    if (showConfirmPrompt) {
      confirmDialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    } else if (selectedJob) {
      jobDrawerRef.current?.focus();
    } else {
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
  }, [selectedJob, showConfirmPrompt]);

  // Derive candidate skills without inventing any data
  const candidateSkills = Array.from(
    new Set([
      ...(resumeData?.skills?.technical || []),
      ...(resumeData?.skills?.tools || []),
      ...(analysisResult?.detectedKeywords || []),
    ])
  );
  const hasCandidateResume = candidateSkills.length > 0;

  // Execute search against server API
  const performSearch = useCallback(
    async (
      pageToLoad = 1,
      bypassCache = false,
      overrides: {
        keywords?: string;
        location?: string;
        experienceLevel?: string;
        employmentType?: string;
        workplaceType?: string;
        postedWithinDays?: number;
      } = {}
    ) => {
      searchControllerRef.current?.abort();
      const controller = new AbortController();
      const requestId = ++searchRequestIdRef.current;
      searchControllerRef.current = controller;

      setIsLoading(true);
      setHasSearched(true);
      setSearchError(null);
      setCurrentPage(pageToLoad);

      try {
        const payload = {
          keywords: (overrides.keywords ?? keywords).trim(),
          location: (overrides.location ?? location).trim(),
          workplaceType: overrides.workplaceType === 'any' ? undefined : overrides.workplaceType ?? (workMode !== 'any' ? workMode : undefined),
          employmentType: overrides.employmentType === 'any' ? undefined : overrides.employmentType ?? (jobType !== 'any' ? jobType : undefined),
          experienceLevel: overrides.experienceLevel === 'any' ? undefined : overrides.experienceLevel ?? (experienceLevel !== 'any' ? experienceLevel : undefined),
          postedWithinDays: overrides.postedWithinDays ?? (postedDays > 0 ? postedDays : undefined),
          sortBy: hasCandidateResume && sortBy === 'relevance' ? 'match' : sortBy,
          page: pageToLoad,
          limit: 12,
          bypassCache,
          resumeSkills: hasCandidateResume ? candidateSkills : undefined,
          resumeHeadline: resumeData?.personalInfo?.headline,
          resumeYearsExp: resumeData?.candidateType === 'experienced' ? 5 : 1,
          candidateContext: hasCandidateResume
            ? {
              skills: candidateSkills,
              headline: resumeData?.personalInfo?.headline,
              yearsOfExperience: resumeData?.candidateType === 'experienced' ? 5 : 1,
              education: resumeData?.education?.map((e) => ({
                degree: e.degree,
                institution: e.institution,
              })),
              projects: resumeData?.projects?.map((p) => ({
                title: p.title,
                description: p.description,
                technologies: p.technologies || [],
              })),
              detectedKeywords: analysisResult?.detectedKeywords || [],
            }
            : undefined,
        };

        const res = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (res.ok) {
          const data: JobSearchResponse = await res.json();
          if (requestId !== searchRequestIdRef.current) return;
          setSearchResponse(data);
          setSearchError(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          if (requestId !== searchRequestIdRef.current) return;
          setSearchError(errData.message || 'Live job search is temporarily unavailable. Please try again.');
          setSearchResponse({
            jobs: [],
            totalJobs: 0,
            page: 1,
            totalPages: 0,
            configuredProviders: [],
            activeSources: [],
            isConfigured: true,
          });
        }
      } catch (err) {
        if (controller.signal.aborted || requestId !== searchRequestIdRef.current) return;
        console.error('Job search failed:', err);
        setSearchError('Network error connecting to job search service. Please check your connection and retry.');
        setSearchResponse({
          jobs: [],
          totalJobs: 0,
          page: 1,
          totalPages: 0,
          configuredProviders: [],
          activeSources: [],
          isConfigured: true,
        });
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setIsLoading(false);
          searchControllerRef.current = null;
        }
      }
    },
    [
      keywords,
      location,
      workMode,
      jobType,
      experienceLevel,
      postedDays,
      sortBy,
      hasCandidateResume,
      candidateSkills,
      resumeData,
      analysisResult,
    ]
  );

  // Auto-trigger search if query params were passed from analyzer or URL
  useEffect(() => {
    if (initialQuery || initialLocation || fromAnalyzer) {
      let searchKeywords = initialQuery;
      if (fromAnalyzer && !initialQuery && candidateSkills.length > 0) {
        searchKeywords = candidateSkills.slice(0, 3).join(', ');
        setKeywords(searchKeywords);
      }
      performSearch(1, false, { keywords: searchKeywords, location: initialLocation });
    }
  }, [initialQuery, initialLocation, fromAnalyzer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle explicit browser geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.state_district ||
              data.address?.state;
            if (city) setLocation(city);
            else setGeoError('Could not identify a nearby location. Please enter it manually.');
          } else {
            setGeoError('Could not identify a nearby location. Please enter it manually.');
          }
        } catch {
          setGeoError('Could not identify a nearby location. Please enter it manually.');
        } finally {
          setGeoLocating(false);
        }
      },
      () => {
        setGeoError('Location permission was denied. Please enter your location manually.');
        setGeoLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Natural Language AI Query Parser
  const handleNlpSearch = async (overridePrompt?: string) => {
    const promptText = (overridePrompt || nlpPrompt).trim();
    if (!promptText) return;

    setIsParsingNlp(true);
    setNlpExplanation(null);

    try {
      const res = await fetch('/api/jobs/nlp-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: promptText }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.parsed) {
          const { keywords: kw, location: loc, workplaceType: wp, experienceLevel: exp, contractType: ct, explanation } = data.parsed;

          if (kw) setKeywords(kw);
          if (loc !== undefined) setLocation(loc);

          let newWp = 'any';
          if (wp) {
            const wpLower = String(wp).toLowerCase();
            if (wpLower.includes('remote')) newWp = 'Remote';
            else if (wpLower.includes('hybrid')) newWp = 'Hybrid';
            else if (wpLower.includes('site') || wpLower.includes('office')) newWp = 'On-site';
            setWorkMode(newWp);
          }

          let newExp = 'any';
          if (exp) {
            const expLower = String(exp).toLowerCase();
            if (expLower.includes('entry') || expLower.includes('junior')) newExp = '0-1 years';
            else if (expLower.includes('senior') || expLower.includes('lead')) newExp = '5+ years';
            else if (expLower.includes('mid')) newExp = '3-5 years';
            setExperienceLevel(newExp);
          }

          let newCt = 'any';
          if (ct) {
            newCt = ct;
            setJobType(newCt);
          }

          setNlpExplanation(explanation);

          performSearch(1, false, {
            keywords: kw,
            location: loc || '',
            workplaceType: newWp,
            experienceLevel: newExp,
            employmentType: newCt,
          });
        }
      }
    } catch (err) {
      console.error('NLP Search error:', err);
    } finally {
      setIsParsingNlp(false);
    }
  };

  // Application Workflow Handlers
  const handleSaveJob = async (job: Job) => {
    const isCurrentlySaved = savedJobIds.has(job.id);
    try {
      setSavingJobId(job.id);
      if (isCurrentlySaved) {
        // UNSAVE
        const appId = savedAppMap.get(job.id);
        const deleteUrl = appId
          ? `/api/user/applications?id=${encodeURIComponent(appId)}`
          : `/api/user/applications?jobId=${encodeURIComponent(job.id)}`;
        const res = await fetch(deleteUrl, { method: 'DELETE' });
        if (res.ok) {
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.delete(job.id);
            return next;
          });
          setSavedAppMap((prev) => {
            const next = new Map(prev);
            next.delete(job.id);
            return next;
          });
          setConfirmStatusMessage(`Removed "${job.title}" from Saved Jobs.`);
          setTimeout(() => setConfirmStatusMessage(null), 4000);
        }
      } else {
        // SAVE
        const res = await fetch('/api/user/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            location: job.location,
            source: job.source,
            jobUrl: job.applyUrl || job.sourceUrl,
            status: 'Saved',
            descriptionSnippet: job.snippet,
            salary: job.salaryDisplay || job.salary,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const createdApp = data.application;
          setSavedJobIds((prev) => new Set([...prev, job.id]));
          if (createdApp?.id) {
            setSavedAppMap((prev) => new Map(prev).set(job.id, createdApp.id));
          }
          setConfirmStatusMessage(`Saved "${job.title} at ${job.company}" to your Saved Jobs.`);
          setTimeout(() => setConfirmStatusMessage(null), 4000);
        }
      }
    } catch (err) {
      console.error('Error toggling saved job:', err);
    } finally {
      setSavingJobId(null);
    }
  };

  const handlePrepareResume = (job: Job) => {
    updateTargetJob({
      title: job.title,
      company: job.company,
      description: job.description || job.snippet,
    });
    router.push('/builder?from=jobs');
  };

  const handleApplyClick = async (job: Job) => {
    const rawUrl = job.applyUrl || job.sourceUrl;
    if (!rawUrl) {
      alert('This listing does not provide a valid application URL.');
      return;
    }

    let listingOpened = false;
    try {
      let safeUrl: URL;
      try {
        safeUrl = new URL(rawUrl);
      } catch {
        throw new Error('This listing does not provide a valid application URL.');
      }
      if (safeUrl.protocol !== 'https:' && safeUrl.protocol !== 'http:') {
        throw new Error('This listing does not provide a valid application URL.');
      }

      // Open synchronously from the click so browser popup blockers do not suppress the provider page.
      const listingWindow = window.open(safeUrl.toString(), '_blank');
      if (!listingWindow) throw new Error('Your browser blocked the job listing. Allow pop-ups and try again.');
      listingWindow.opener = null;
      listingOpened = true;

      setApplyingJobId(job.id);
      const res = await fetch('/api/user/applications/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          jobUrl: safeUrl.toString(),
          descriptionSnippet: job.snippet,
          salary: job.salaryDisplay || job.salary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize application');
      }

      // Set pending state and open return prompt
      setPendingApplication({
        id: data.applicationId,
        jobTitle: job.title,
        company: job.company,
        source: job.source,
        jobUrl: data.externalUrl || safeUrl.toString(),
      });
      setShowConfirmPrompt(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(listingOpened
        ? 'The job listing opened, but Smart Resume AI could not update application tracking. You can still apply on the source site.'
        : `Could not open application: ${msg}`);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleConfirmApplication = async (status: 'Applied' | 'Ready to apply' | 'Saved') => {
    if (!pendingApplication) return;

    if (pendingApplication.id) {
      try {
        await fetch('/api/user/applications/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: pendingApplication.id,
            status,
          }),
        });
      } catch (err) {
        console.error('Error confirming application status:', err);
      }
    }

    if (status === 'Applied') {
      setConfirmStatusMessage(
        `Application confirmed! "${pendingApplication.jobTitle}" is now tracked under Applied Jobs.`
      );
    } else if (status === 'Saved') {
      setConfirmStatusMessage(
        `"${pendingApplication.jobTitle}" has been saved to your Saved Jobs list.`
      );
    } else {
      setConfirmStatusMessage(
        `"${pendingApplication.jobTitle}" kept as Ready to apply.`
      );
    }

    setShowConfirmPrompt(false);
    setPendingApplication(null);
    setTimeout(() => setConfirmStatusMessage(null), 5000);
  };

  const jobs = searchResponse?.jobs || [];
  const totalJobs = searchResponse?.totalJobs || 0;
  const activeSources = searchResponse?.activeSources || [];
  const liveSources = searchResponse?.liveSources || [];
  const unavailableSources = searchResponse?.unavailableSources || [];
  const cachedSources = searchResponse?.cachedSources || [];
  const cachedJobIds = new Set(searchResponse?.cachedJobIds || []);
  const cachedAtBySource = searchResponse?.cachedAtBySource || {};
  const unavailableSourceReasons = searchResponse?.unavailableSourceReasons || {};
  const sourceCooldownUntil = searchResponse?.sourceCooldownUntil || {};

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 text-left relative">
      {/* Toast Notification */}
      {confirmStatusMessage && (
        <div role="status" aria-live="polite" className="fixed top-20 right-6 z-50 glass-panel px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in text-xs font-semibold text-[var(--text-primary)]">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{confirmStatusMessage}</span>
          <button
            onClick={() => setConfirmStatusMessage(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent Pending Application Banner */}
      {pendingApplication && !showConfirmPrompt && (
        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">
                Application in Progress
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                You opened the application for <strong>{pendingApplication.jobTitle}</strong> at{' '}
                <strong>{pendingApplication.company}</strong> on {pendingApplication.source}.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleConfirmApplication('Applied')}
              className="btn-primary btn-sm text-xs font-semibold shadow-sm cursor-pointer"
            >
              Yes, I applied
            </button>
            <button
              onClick={() => handleConfirmApplication('Ready to apply')}
              className="btn-secondary btn-sm text-xs cursor-pointer"
            >
              Not yet
            </button>
            <button
              onClick={() => handleConfirmApplication('Saved')}
              className="btn-secondary btn-sm text-xs cursor-pointer"
            >
              Save for later
            </button>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {showConfirmPrompt && pendingApplication && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirmPrompt(false);
          }}
        >
          <div
            ref={confirmDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-confirm-title"
            aria-describedby="application-confirm-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-[var(--shadow-glass-hover)] backdrop-blur-2xl p-6 space-y-5 animate-fade-in relative overflow-hidden focus:outline-none"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="application-confirm-title" className="text-base font-bold text-[var(--text-primary)]">
                    Did you apply for this job?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {pendingApplication.jobTitle} @ {pendingApplication.company}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPrompt(false)}
                aria-label="Close application confirmation"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p id="application-confirm-description" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We opened the application page on <strong>{pendingApplication.source}</strong> in a new tab.
              Confirming your submission helps track your interview timeline and status accurately.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleConfirmApplication('Applied')}
                className="btn-primary w-full text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, I applied</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConfirmApplication('Ready to apply')}
                  className="btn-secondary text-xs cursor-pointer"
                >
                  Not yet
                </button>
                <button
                  onClick={() => handleConfirmApplication('Saved')}
                  className="btn-secondary text-xs cursor-pointer"
                >
                  Save for later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Top Section Header */}
      <div className="bento-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Job Search & Role Matcher
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Search active openings and compare role requirements directly against your resume qualifications.
            </p>
          </div>

          {/* Resume-Aware Status Indicator Dock */}
          {hasCandidateResume ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm shrink-0">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--border-color)]">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-[var(--text-primary)] block">
                  Detected Resume Skills
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidateSkills.slice(0, 4).map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                    >
                      {sk}
                    </span>
                  ))}
                  {candidateSkills.length > 4 && (
                    <span className="text-[10px] text-[var(--text-secondary)] self-center font-medium">
                      +{candidateSkills.length - 4} more
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setKeywords(candidateSkills.slice(0, 3).join(', '));
                  performSearch(1);
                }}
                className="btn-primary btn-sm ml-auto"
              >
                Match Roles
              </button>
            </div>
          ) : (
            <Link
              href="/analyzer"
              className="btn-secondary inline-flex items-center gap-2 text-xs font-semibold shadow-sm shrink-0"
            >
              <Target className="w-4 h-4 text-[var(--accent)]" />
              <span>Upload Resume for Match Score</span>
            </Link>
          )}
        </div>
      </div>

      {/* Search Controls Dock */}
      <GlassCard className="p-5 sm:p-6 space-y-4 shadow-sm border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl !overflow-visible">
        {/* Natural Language Search Assistant */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] space-y-2 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Natural Language Search
              </span>
            </div>
            {nlpExplanation && (
              <span className="text-[11px] text-[var(--accent)] font-medium">
                ✓ {nlpExplanation}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nlpPrompt}
              onChange={(e) => setNlpPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNlpSearch();
                }
              }}
              placeholder='Try "remote entry level react developer in new york" or "senior python backend hybrid"...'
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
            />
            <button
              type="button"
              onClick={() => handleNlpSearch()}
              disabled={isParsingNlp || !nlpPrompt.trim()}
              className="btn-primary text-xs py-2 px-5 rounded-lg inline-flex items-center gap-1.5 shrink-0 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              {isParsingNlp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Natural Language Pill Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-mono mr-1">Suggestions:</span>
            {[
              'Software Engineering Intern',
              'Graduate Software Engineer',
              'Remote Junior React Developer',
              'Junior Data Analyst',
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setNlpPrompt(suggestion);
                  handleNlpSearch(suggestion);
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(1);
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          {/* Job title / Keywords */}
          <JobSearchAutocomplete
            field="keywords"
            label="Job title or skill"
            value={keywords}
            onChange={setKeywords}
            onSelect={(value) => performSearch(1, false, { keywords: value })}
            placeholder="Job title or skill"
            leadingIcon={<Search className="h-4 w-4" />}
            className="md:col-span-5"
          />

          {/* Location */}
          <div className="relative md:col-span-4">
            <JobSearchAutocomplete
              field="location"
              label="Location"
              value={location}
              onChange={setLocation}
              onSelect={(value) => performSearch(1, false, { location: value })}
              placeholder="City, region, country, or remote"
              leadingIcon={<MapPin className="h-4 w-4" />}
              className="pr-10 sm:pr-32"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              title="Use my location"
              aria-label="Use my location"
              className="absolute right-2 top-2 z-10 px-2.5 py-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 transition-all duration-150 text-xs flex items-center gap-1 font-medium cursor-pointer"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-[var(--accent)]' : ''}`} />
              <span className="text-[10px] hidden sm:inline">Use my location</span>
            </button>
          </div>

          {/* Primary Search Button */}
          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              data-magnetic="true"
              disabled={isLoading}
              className="btn-ink-pill w-full !h-[44px] px-6 text-xs sm:text-sm font-bold disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Jobs</span>
                </>
              )}
            </button>
          </div>
        </form>

        {geoError && <p className="text-xs text-amber-500 pl-1">{geoError}</p>}

        {/* Detailed Specification Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)] text-xs">
          {/* Student & Fresher Quick Toggles */}
          <div className="flex flex-wrap items-center gap-2 w-full pb-2 border-b border-[var(--border-color)]">
            <span className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1 uppercase tracking-wider mr-1">
              <GraduationCap className="w-3.5 h-3.5" /> Early Career:
            </span>
            <button
              type="button"
              onClick={() => {
                const next = jobType === 'Internship' ? 'any' : 'Internship';
                setJobType(next);
                performSearch(1, false, { employmentType: next === 'any' ? 'all' : next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${jobType === 'Internship'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Internships</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = experienceLevel === 'Fresher' ? 'any' : 'Fresher';
                setExperienceLevel(next);
                performSearch(1, false, { experienceLevel: next === 'any' ? 'all' : next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${experienceLevel === 'Fresher'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Entry-Level & Graduate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = workMode === 'Remote' ? 'any' : 'Remote';
                setWorkMode(next);
                performSearch(1, false, { workplaceType: next === 'any' ? 'all' : next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${workMode === 'Remote'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Remote Friendly</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Experience Filter */}
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
            >
              <option value="any">Experience: Any</option>
              <option value="Fresher">Fresher</option>
              <option value="0-1 years">0–1 years</option>
              <option value="1-3 years">1–3 years</option>
              <option value="3-5 years">3–5 years</option>
              <option value="5+ years">5+ years</option>
            </select>

            {/* Job Type Filter */}
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
            >
              <option value="any">Job type: Any</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Temporary">Temporary</option>
            </select>

            {/* Work Mode Filter */}
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
            >
              <option value="any">Work mode: Any</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>

            {/* Date Posted */}
            <select
              value={postedDays}
              onChange={(e) => setPostedDays(Number(e.target.value))}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
            >
              <option value={0}>Posted: Any time</option>
              <option value={1}>Past 24 hours</option>
              <option value={3}>Past 3 days</option>
              <option value={7}>Past 7 days</option>
              <option value={14}>Past 14 days</option>
              <option value={30}>Past 30 days</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--accent)] transition-all duration-150 cursor-pointer"
            >
              {hasCandidateResume && <option value="match">Sort: Best Resume Match</option>}
              <option value="relevance">Sort: Relevance</option>
              <option value="date">Sort: Most Recent</option>
              <option value="salary">Sort: Highest Salary</option>
            </select>
          </div>

          {/* Grid / List View Toggle & Refresh */}
          <div className="flex items-center gap-2">
            {hasSearched && (
              <button
                type="button"
                onClick={() => performSearch(currentPage, true)}
                disabled={isLoading}
                title="Refresh fresh listings from sources"
                className="btn-secondary btn-sm inline-flex items-center gap-1 font-medium text-xs disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <div className="flex items-center gap-1 border border-[var(--glass-border)] rounded-full p-1 bg-[var(--glass-bg)]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${viewMode === 'grid'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer ${viewMode === 'list'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Provider Status / Partial Results Notice */}
      {hasSearched && (activeSources.length > 0 || unavailableSources.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeSources.map((src) => (
            <span
              key={src}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-semibold ${liveSources.includes(src)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
                  : cachedSources.includes(src)
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
                }`}
            >
              {liveSources.includes(src)
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <Clock className="w-3.5 h-3.5" />}
              {src} · {liveSources.includes(src) && cachedSources.includes(src)
                ? 'live + cached'
                : liveSources.includes(src)
                  ? 'live'
                  : 'cached'}
            </span>
          ))}

          {unavailableSources.map((src) => {
            const isNaukri = src.toLowerCase().includes('naukri');
            const isLinkedIn = src.toLowerCase().includes('linkedin');
            const isAdzuna = src.toLowerCase().includes('adzuna');
            const isJooble = src.toLowerCase().includes('jooble');
            const retryAt = formatSnapshotDate(sourceCooldownUntil[src]);
            const unavailableReason = unavailableSourceReasons[src];

            let message = `${src} search is temporarily unavailable`;
            let fallbackUrl: string | null = null;
            let fallbackLabel = `Search on ${src} ↗`;

            if (isNaukri) {
              message = unavailableReason === 'challenge'
                ? `Naukri requires CAPTCHA verification. Requests are paused${retryAt ? ` until ${retryAt}` : ''}.`
                : unavailableReason === 'restricted'
                  ? `Naukri access is restricted. Requests are paused${retryAt ? ` until ${retryAt}` : ''}.`
                  : 'Naukri is temporarily unavailable.';
              fallbackUrl = buildNaukriSearchUrl(keywords.trim() || 'software developer', location.trim() || 'india');
              fallbackLabel = 'Search on Naukri ↗';
            } else if (isLinkedIn) {
              message = 'LinkedIn search temporarily rate limited';
              fallbackUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords || 'developer')}&location=${encodeURIComponent(location || 'India')}`;
              fallbackLabel = 'Search on LinkedIn ↗';
            } else if (isAdzuna) {
              message = 'Adzuna is temporarily unavailable';
            } else if (isJooble) {
              message = 'Jooble is temporarily unavailable';
            }

            return (
              <div
                key={src}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{message}</span>
                {fallbackUrl && (
                  <a
                    href={fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-300 font-semibold inline-flex items-center gap-0.5 ml-1"
                  >
                    {fallbackLabel}
                  </a>
                )}
              </div>
            );
          })}

          {unavailableSources.length > 0 && (
            <button
              type="button"
              onClick={() => performSearch(currentPage, true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {Object.keys(sourceCooldownUntil).length > 0 ? 'Retry available sources' : 'Retry sources'}
            </button>
          )}
          {cachedSources.length > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Cached snapshots: {cachedSources.map((source) => {
                const timestamp = cachedAtBySource[source] || (cachedSources.length === 1 ? searchResponse?.cachedAt : undefined);
                const formattedTimestamp = formatSnapshotDate(timestamp);
                return `${source}${formattedTimestamp ? ` · ${formattedTimestamp}` : ''}`;
              }).join(' | ')}
            </span>
          )}
        </div>
      )}

      {/* Query Typo Correction / Location Alias Notice */}
      {hasSearched && (searchResponse?.correctionApplied || searchResponse?.locationWasCorrected) && (
        <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-primary)] animate-fade-in">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              {searchResponse?.correctionApplied && searchResponse?.correctedKeywords && (
                <>
                  Showing results for <strong className="font-bold text-[var(--accent)]">{searchResponse.correctedKeywords}</strong>
                  {searchResponse.originalKeywords && searchResponse.originalKeywords.toLowerCase().trim() !== searchResponse.correctedKeywords.toLowerCase().trim() && (
                    <span className="text-[var(--text-secondary)] ml-1">
                      (corrected from &quot;<em>{searchResponse.originalKeywords}</em>&quot;)
                    </span>
                  )}
                </>
              )}
              {searchResponse?.locationWasCorrected && searchResponse?.correctedLocation && (
                <span className="ml-1.5">
                  • Location corrected to <strong className="font-bold text-[var(--accent)]">{searchResponse.correctedLocation}</strong>
                  {searchResponse.originalLocation && searchResponse.originalLocation.toLowerCase().trim() !== searchResponse.correctedLocation.toLowerCase().trim() && (
                    <span className="text-[var(--text-secondary)] ml-1">
                      (from &quot;<em>{searchResponse.originalLocation}</em>&quot;)
                    </span>
                  )}
                </span>
              )}
            </span>
          </div>
          {searchResponse?.locationAliasApplied && searchResponse?.correctedLocation && !searchResponse?.locationWasCorrected && (
            <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
              Location mapped to <strong>{searchResponse.correctedLocation}</strong> area
            </span>
          )}
        </div>
      )}

      {/* Fallback to Original Query Notice */}
      {hasSearched && searchResponse?.fallbackToOriginalUsed && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-[var(--text-primary)] animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Suggested correction &quot;{searchResponse.correctedKeywords}&quot; returned no listings. Showing results for your original query: <strong>{searchResponse.searchKeywords}</strong>.
          </span>
        </div>
      )}

      {/* STATE 1: Initial Discovery State */}
      {!hasSearched && !isLoading && (
        <div className="p-8 sm:p-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-center space-y-5 shadow-xs relative overflow-hidden">
          <div className="relative w-14 h-14 mx-auto">
            <div className="relative w-14 h-14 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-color)] flex items-center justify-center shadow-xs">
              <Compass className="w-7 h-7" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Find your next role
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              Search by title or skill, choose a location, and compare results with your resume.
            </p>
          </div>
        </div>
      )}

      {/* STATE 2: Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-semibold">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            <span>Discovering live listings & calculating profile alignment...</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-24 h-4 bg-[var(--bg-secondary)] rounded" />
                  <div className="w-16 h-4 bg-[var(--bg-secondary)] rounded-full" />
                </div>
                <div className="w-3/4 h-5 bg-[var(--bg-secondary)] rounded" />
                <div className="w-1/2 h-3.5 bg-[var(--bg-secondary)] rounded" />
                <div className="w-full h-12 bg-[var(--bg-secondary)] rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="w-1/2 h-8 bg-[var(--bg-secondary)] rounded-xl" />
                  <div className="w-1/2 h-8 bg-[var(--bg-secondary)] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR STATE: Network or Provider Outage */}
      {!isLoading && Boolean(searchError) && (
        <GlassCard className="p-10 text-center space-y-4 border border-rose-500/30 bg-rose-500/5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Job Search Temporarily Unavailable
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {searchError}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => performSearch(currentPage, true)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        </GlassCard>
      )}

      {/* STATE 3: No Matching Jobs Found */}
      {!isLoading && hasSearched && !searchError && jobs.length === 0 && (
        <GlassCard className="p-10 text-center space-y-4 border border-[var(--border-color)]">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {unavailableSources.length > 0 ? 'Job sources could not be reached.' : 'No matching jobs found.'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {unavailableSources.length > 0
                ? Object.keys(sourceCooldownUntil).length > 0
                  ? 'A source is paused after a provider restriction. Retry the available sources or adjust your search.'
                  : 'Retry the unavailable sources, or adjust your search and try again.'
                : `No listings matched ${keywords ? `“${keywords}”` : 'your role search'}${location ? ` in “${location}”` : ''}.`}
            </p>
            {searchResponse?.suggestion && searchResponse.suggestion.toLowerCase() !== keywords.toLowerCase().trim() && (
              <div className="p-2.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-xs inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Did you mean: </span>
                <button
                  type="button"
                  onClick={() => {
                    setKeywords(searchResponse.suggestion!);
                    performSearch(1);
                  }}
                  className="font-bold text-[var(--accent)] underline hover:opacity-80 cursor-pointer"
                >
                  {searchResponse.suggestion}
                </button>
              </div>
            )}
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setWorkMode('any');
                setJobType('any');
                setExperienceLevel('any');
                setPostedDays(0);
                performSearch(1, false, {
                  workplaceType: 'any',
                  employmentType: 'any',
                  experienceLevel: 'any',
                  postedWithinDays: 0,
                });
              }}
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Clear filters and retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* STATE 4: Results Display */}
      {!isLoading && hasSearched && jobs.length > 0 && (
        <div className="space-y-5 animate-fade-in">
          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-primary)] text-sm">
                {totalJobs} opportunities found
              </span>
            </div>
            <span>Page {searchResponse?.page || 1} of {searchResponse?.totalPages || 1}</span>
          </div>

          {/* Job Cards Grid / List */}
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'space-y-4'
            }
          >
            {jobs.map((job) => (
              <GlassCard
                key={job.id}
                className="flex flex-col justify-between p-5 hover:border-[var(--accent)]/60 transition-all duration-200 group relative text-left"
              >
                <div className="space-y-3">
                  {/* Top Badge: Source & Match Score */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                      <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
                      {job.source}
                      {cachedJobIds.has(job.id) && <span className="text-amber-500">· Cached</span>}
                    </span>

                    {job.matchScore !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${job.matchScore >= 80
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : job.matchScore >= 65
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                      >
                        <Target className="w-3 h-3" />
                        {job.matchScore}% Match
                      </span>
                    )}
                  </div>

                  {formatPostedDate(job.postedAt) && (
                    <p className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      Posted {formatPostedDate(job.postedAt)}
                    </p>
                  )}

                  {/* Title & Company */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        returnFocusRef.current = document.activeElement instanceof HTMLElement
                          ? document.activeElement
                          : null;
                        setSelectedJob(job);
                      }}
                      className="text-left text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm line-clamp-2"
                    >
                      {job.title}
                    </button>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1 mt-1">
                      <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
                      {job.company}
                    </p>
                  </div>

                  {/* Metadata Chips: Location, Workplace, Employment Type, Salary */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <MapPin className="w-3 h-3 text-[var(--accent)]" />
                      {job.location}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] font-medium">
                      {job.employmentType} · {job.workplaceType}
                    </span>

                    {job.salary && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25">
                        <DollarSign className="w-3 h-3" />
                        {job.salary}
                      </span>
                    )}
                  </div>

                  {/* Description Snippet */}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                    {job.snippet || job.description}
                  </p>

                  {/* Skills tags */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.skills.slice(0, 4).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]"
                        >
                          {sk}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-[10px] text-[var(--text-secondary)] self-center">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions: View Job, Prepare Resume, Save, & Apply */}
                <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/apply-assistant?title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}&location=${encodeURIComponent(job.location || '')}&jobUrl=${encodeURIComponent(job.applyUrl || job.sourceUrl || '')}`}
                      title="Job Application Preparation Studio"
                      className="btn-ghost btn-sm h-8 px-2.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply Assistant</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handlePrepareResume(job)}
                      title="Prepare & Tailor Resume for this Job"
                      className="btn-ghost btn-sm h-8 px-2.5 inline-flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Prepare</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveJob(job)}
                      disabled={savingJobId === job.id}
                      title={savedJobIds.has(job.id) ? "Remove from Saved Jobs" : "Save to Application Tracker"}
                      className={`btn-sm h-8 px-2.5 inline-flex items-center gap-1 text-xs transition-colors cursor-pointer ${savedJobIds.has(job.id)
                          ? 'btn-secondary text-emerald-500 font-semibold'
                          : 'btn-ghost text-[var(--text-secondary)] hover:text-emerald-400'
                        }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${savedJobIds.has(job.id) ? 'fill-current' : ''}`} />
                      <span>{savedJobIds.has(job.id) ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyClick(job)}
                    disabled={applyingJobId === job.id}
                    className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {applyingJobId === job.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <span>Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          {searchResponse && searchResponse.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-[var(--border-color)]">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => performSearch(currentPage - 1)}
                className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                Page {currentPage} of {searchResponse.totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= searchResponse.totalPages || isLoading}
                onClick={() => performSearch(currentPage + 1)}
                className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Detailed Job View Drawer */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedJob(null);
          }}
        >
          <div
            ref={jobDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-detail-title"
            tabIndex={-1}
            className="w-full max-w-2xl h-full bg-[var(--glass-bg-elevated)] border-l border-[var(--glass-border)] backdrop-blur-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl space-y-6 relative focus:outline-none"
          >
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-secondary)] text-[var(--accent)] mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Source: {selectedJob.source}
                    {cachedJobIds.has(selectedJob.id) && <span className="text-amber-500">· Cached</span>}
                  </div>
                  <h2 id="job-detail-title" className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
                    {selectedJob.title}
                  </h2>
                  <p className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                    <Building className="w-4 h-4 text-[var(--accent)]" />
                    {selectedJob.company} · {selectedJob.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  aria-label="Close job details"
                  className="p-1.5 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta Grid: Employment type, Experience, Salary, Workplace */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                    Workplace
                  </span>
                  <p className="font-bold text-[var(--text-primary)]">{selectedJob.workplaceType}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                    Employment
                  </span>
                  <p className="font-bold text-[var(--text-primary)]">{selectedJob.employmentType}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                    Experience
                  </span>
                  <p className="font-bold text-[var(--text-primary)]">{selectedJob.experienceLevel}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                    Salary
                  </span>
                  <p className="font-bold text-emerald-400">
                    {selectedJob.salary || selectedJob.salaryDisplay || 'Competitive'}
                  </p>
                </div>
              </div>

              {/* Resume match details are shown when the search API returned a score. */}
              {selectedJob.matchScore !== undefined && selectedJob.matchBreakdown && (
                <div className="p-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      Resume Match
                    </span>
                    <span className="text-lg font-black text-[var(--accent)]">
                      {selectedJob.matchScore}%
                    </span>
                  </div>

                  {/* Factor Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                      Breakdown:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'Skills', val: selectedJob.matchBreakdown.skills, icon: Target },
                        { label: 'Experience', val: selectedJob.matchBreakdown.experience, icon: Calendar },
                        { label: 'Keywords', val: selectedJob.matchBreakdown.keywords, icon: KeyRound },
                        { label: 'Projects', val: selectedJob.matchBreakdown.projects, icon: FolderGit2 },
                        { label: 'Education', val: selectedJob.matchBreakdown.education, icon: BookOpen },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                        >
                          <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                            <item.icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                            {item.label}
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">{item.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matched skills */}
                  {selectedJob.matchedSkills && selectedJob.matchedSkills.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matched skills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.matchedSkills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partial matches */}
                  {selectedJob.partialSkills && selectedJob.partialSkills.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Partial matches:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.partialSkills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-color)]"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing skills */}
                  {selectedJob.missingSkills && selectedJob.missingSkills.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missing skills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.missingSkills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Job Description Content */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Full Description & Responsibilities
                </h4>
                <div className="text-xs leading-relaxed text-[var(--text-secondary)] p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] whitespace-pre-line">
                  {selectedJob.description}
                </div>
              </div>

              {/* Skills Section */}
              {selectedJob.skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Required Competencies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skills.map((sk) => (
                      <span
                        key={sk}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Prepare Resume, Save Job & Apply button */}
            <div className="pt-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveJob(selectedJob)}
                  disabled={savingJobId === selectedJob.id}
                  title={savedJobIds.has(selectedJob.id) ? "Remove from Saved Jobs" : "Save to Application Tracker"}
                  className={`btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${savedJobIds.has(selectedJob.id) ? 'text-emerald-500 border-emerald-500/30' : 'text-[var(--text-secondary)]'
                    }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedJobIds.has(selectedJob.id) ? 'fill-current' : ''}`} />
                  <span>{savedJobIds.has(selectedJob.id) ? 'Saved' : 'Save Job'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrepareResume(selectedJob)}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Prepare & Tailor Resume</span>
                </button>

                <Link
                  href={`/apply-assistant?title=${encodeURIComponent(selectedJob.title)}&company=${encodeURIComponent(selectedJob.company)}&location=${encodeURIComponent(selectedJob.location || '')}&jobUrl=${encodeURIComponent(selectedJob.applyUrl || selectedJob.sourceUrl || '')}`}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Apply Assistant</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => handleApplyClick(selectedJob)}
                disabled={applyingJobId === selectedJob.id}
                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 text-xs sm:text-sm font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {applyingJobId === selectedJob.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Apply on {selectedJob.source}</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-12 text-center text-xs text-[var(--text-secondary)]">
          Loading live job search platform...
        </div>
      }
    >
      <JobSearchContent />
    </Suspense>
  );
}
