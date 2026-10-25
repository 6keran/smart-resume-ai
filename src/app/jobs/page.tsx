'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  MapPin,
  Building,
  DollarSign,
  Clock,
  Sparkles,
  Filter,
  ArrowRight,
  ExternalLink,
  Target,
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
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { Job, JobSearchResponse, WorkplaceType, EmploymentType } from '@/types/jobs';
import { GlassCard } from '@/components/ui/GlassCard';

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
  const [showResumeMatchBreakdown, setShowResumeMatchBreakdown] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  // Body scroll lock & Escape key handling for slide-over drawer and confirm prompt
  useEffect(() => {
    if (selectedJob || showConfirmPrompt) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showConfirmPrompt) setShowConfirmPrompt(false);
          else if (selectedJob) setSelectedJob(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
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
    async (pageToLoad = 1, bypassCache = false) => {
      setIsLoading(true);
      setHasSearched(true);
      setSearchError(null);
      setCurrentPage(pageToLoad);

      try {
        const payload = {
          keywords: keywords.trim(),
          location: location.trim(),
          workplaceType: workMode !== 'any' ? workMode : undefined,
          employmentType: jobType !== 'any' ? jobType : undefined,
          experienceLevel: experienceLevel !== 'any' ? experienceLevel : undefined,
          postedWithinDays: postedDays > 0 ? postedDays : undefined,
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
        });

        if (res.ok) {
          const data: JobSearchResponse = await res.json();
          setSearchResponse(data);
          setSearchError(null);
          setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          const errData = await res.json().catch(() => ({}));
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
        setIsLoading(false);
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
      if (fromAnalyzer && !initialQuery && candidateSkills.length > 0) {
        setKeywords(candidateSkills.slice(0, 3).join(', '));
      }
      performSearch(1);
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
              data.address?.state ||
              'Bengaluru';
            setLocation(city);
          } else {
            setLocation('Bengaluru');
          }
        } catch {
          setLocation('Bengaluru');
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

    try {
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
          jobUrl: rawUrl,
          descriptionSnippet: job.snippet,
          salary: job.salaryDisplay || job.salary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize application');
      }

      const externalUrl = data.externalUrl || rawUrl;
      // Open original application page in new tab safely
      window.open(externalUrl, '_blank', 'noopener,noreferrer');

      // Set pending state and open return prompt
      setPendingApplication({
        id: data.applicationId,
        jobTitle: job.title,
        company: job.company,
        source: job.source,
        jobUrl: externalUrl,
      });
      setShowConfirmPrompt(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not open application: ${msg}`);
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
  const unavailableSources = searchResponse?.unavailableSources || [];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 text-left relative">
      {/* Toast Notification */}
      {confirmStatusMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{confirmStatusMessage}</span>
          <button
            onClick={() => setConfirmStatusMessage(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent Pending Application Banner */}
      {pendingApplication && (
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
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              Yes, I applied
            </button>
            <button
              onClick={() => handleConfirmApplication('Ready to apply')}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
            >
              Not yet
            </button>
            <button
              onClick={() => handleConfirmApplication('Saved')}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
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
          <div className="w-full max-w-md rounded-2xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-[var(--shadow-glass-hover)] backdrop-blur-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Did you apply for this job?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {pendingApplication.jobTitle} @ {pendingApplication.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmPrompt(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We opened the application page on <strong>{pendingApplication.source}</strong> in a new tab.
              Confirming your submission helps track your interview timeline and status accurately.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleConfirmApplication('Applied')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, I applied</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConfirmApplication('Ready to apply')}
                  className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Not yet
                </button>
                <button
                  onClick={() => handleConfirmApplication('Saved')}
                  className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Save for later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Top Section Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-card border border-[var(--glass-border)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Market Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Job Search & Role Matcher
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Search active verified openings across LinkedIn and major platforms. Compare job requirements directly against your resume with real-time match scoring.
            </p>
          </div>

          {/* Resume-Aware Status Indicator Dock */}
          {hasCandidateResume ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-md shadow-sm shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
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
                className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:opacity-95 transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
              >
                Match Roles
              </button>
            </div>
          ) : (
            <Link
              href="/analyzer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-md backdrop-blur-md active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Upload Resume for Match Score</span>
            </Link>
          )}
        </div>
      </div>

      {/* Frosted Glass Search Controls Dock */}
      <GlassCard className="p-6 sm:p-7 space-y-4 shadow-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl rounded-3xl relative overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(1);
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          {/* Job title / Keywords */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Job title / keywords (e.g. Python Developer, React, Data Analyst)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 transition-all duration-150"
            />
          </div>

          {/* Location */}
          <div className="relative md:col-span-4">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Bengaluru, India, Hyderabad, Mumbai, Remote)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 transition-all duration-150"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              title="Use my location"
              className="absolute right-2 top-2 px-2.5 py-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 transition-all duration-150 text-xs flex items-center gap-1 font-medium cursor-pointer"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-[var(--accent)]' : ''}`} />
              <span className="text-[10px] hidden sm:inline">Use my location</span>
            </button>
          </div>

          {/* Primary Search Button */}
          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 h-[44px] px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold hover:opacity-95 transition-all duration-150 shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
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
            {lastUpdatedTime && (
              <span className="text-[11px] text-[var(--text-secondary)] hidden sm:inline">
                Last updated: {lastUpdatedTime}
              </span>
            )}

            {hasSearched && (
              <button
                type="button"
                onClick={() => performSearch(currentPage, true)}
                disabled={isLoading}
                title="Refresh fresh listings from sources"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] active:scale-95 transition-all duration-150 font-medium text-xs disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <div className="flex items-center gap-1 border border-[var(--glass-border)] rounded-xl p-1 bg-[var(--glass-bg)]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg active:scale-95 transition-all duration-150 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg active:scale-95 transition-all duration-150 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Provider Status / Partial Results Notice */}
      {hasSearched && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeSources.map((src) => (
            <span
              key={src}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {src} results available
            </span>
          ))}

          {unavailableSources.map((src) => {
            const isNaukri = src.toLowerCase().includes('naukri');
            const isLinkedIn = src.toLowerCase().includes('linkedin');
            const isAdzuna = src.toLowerCase().includes('adzuna');
            const isJooble = src.toLowerCase().includes('jooble');

            let message = `${src} search is temporarily unavailable`;
            let fallbackUrl: string | null = null;
            let fallbackLabel = `Search on ${src} ↗`;

            if (isNaukri) {
              message = 'Naukri temporarily protected by automated challenge';
              fallbackUrl = `https://www.naukri.com/${encodeURIComponent(keywords || 'software-developer')}-jobs-in-${encodeURIComponent(location || 'india')}`;
              fallbackLabel = 'Search on Naukri ↗';
            } else if (isLinkedIn) {
              message = 'LinkedIn search temporarily rate limited';
              fallbackUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords || 'developer')}&location=${encodeURIComponent(location || 'India')}`;
              fallbackLabel = 'Search on LinkedIn ↗';
            } else if (isAdzuna) {
              message = 'Adzuna API credentials not configured or limit reached';
            } else if (isJooble) {
              message = 'Jooble API credentials not configured or limit reached';
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
        </div>
      )}

      {/* STATE 1: Initial Discovery State */}
      {!hasSearched && !isLoading && (
        <div className="p-10 sm:p-14 rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-xl text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-[var(--accent)]/20 rounded-full blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-color)] flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)]">
              Discover Thousands of Verified Opportunities
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
              Explore active listings from LinkedIn and top corporate career portals with real-time ATS match scoring and qualification alignment.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            <span className="font-semibold text-[var(--text-secondary)] mr-1">Recommended searches:</span>
            {[
              { q: 'Python Developer', loc: 'Bengaluru' },
              { q: 'React Developer', loc: 'Hyderabad' },
              { q: 'Data Analyst', loc: 'Bengaluru' },
              { q: 'Full Stack Engineer', loc: 'Pune' },
              { q: 'Cloud Engineer', loc: 'Remote' },
            ].map((s) => (
              <button
                key={`${s.q}-${s.loc}`}
                onClick={() => {
                  setKeywords(s.q);
                  setLocation(s.loc);
                  performSearch(1);
                }}
                className="px-3.5 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--glass-bg-elevated)] text-[var(--text-primary)] transition-all font-semibold shadow-xs cursor-pointer active:scale-95"
              >
                {s.q} · <span className="text-[var(--text-secondary)] font-normal">{s.loc}</span>
              </button>
            ))}
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
              No matching jobs found.
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find matching opportunities for &quot;{keywords || 'all roles'}&quot; in &quot;{location || 'specified location'}&quot;.
            </p>
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-left text-xs max-w-sm mx-auto space-y-1 text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)] block">Try:</span>
              <p>• another location (e.g. Bengaluru, Hyderabad, Mumbai, Remote)</p>
              <p>• broader keywords (e.g. &quot;Developer&quot; or &quot;Engineer&quot;)</p>
              <p>• fewer filters (set experience or work mode to &quot;Any&quot;)</p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <button
              onClick={() => {
                setLocation('Bengaluru');
                performSearch(1);
              }}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)] font-semibold"
            >
              Try Bengaluru
            </button>
            <button
              onClick={() => {
                setWorkMode('Remote');
                performSearch(1);
              }}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)] font-semibold"
            >
              Try Remote
            </button>
            <button
              onClick={() => {
                setWorkMode('any');
                setJobType('any');
                setExperienceLevel('any');
                performSearch(1);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold"
            >
              Reset filters
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
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-semibold text-[var(--accent)]">
                Active Sources: {activeSources.join(' + ') || 'LinkedIn'}
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
                      SOURCE: {job.source}
                    </span>

                    {job.matchScore !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          job.matchScore >= 80
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : job.matchScore >= 65
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {job.matchScore}% Match
                      </span>
                    )}
                  </div>

                  {/* Title & Company */}
                  <div>
                    <h3
                      onClick={() => {
                        setSelectedJob(job);
                        setShowResumeMatchBreakdown(false);
                      }}
                      className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors cursor-pointer line-clamp-2"
                    >
                      {job.title}
                    </h3>
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJob(job);
                        setShowResumeMatchBreakdown(false);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrepareResume(job)}
                      title="Prepare & Tailor Resume for this Job"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-blue-500 transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Prepare</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveJob(job)}
                      disabled={savingJobId === job.id}
                      title={savedJobIds.has(job.id) ? "Remove from Saved Jobs" : "Save to Application Tracker"}
                      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                        savedJobIds.has(job.id)
                          ? 'text-emerald-500 font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-emerald-400'
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
          <div className="w-full max-w-2xl h-full bg-[var(--glass-bg-elevated)] border-l border-[var(--glass-border)] backdrop-blur-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl space-y-6 relative">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-secondary)] text-[var(--accent)] mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Provider: {selectedJob.source}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
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

              {/* Action: Match with my resume button */}
              {hasCandidateResume && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Compare role with your uploaded resume
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResumeMatchBreakdown((prev) => !prev)}
                    className="px-3 py-1 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all"
                  >
                    {showResumeMatchBreakdown ? 'Hide Match' : 'Match with my resume'}
                  </button>
                </div>
              )}

              {/* Specification 11: Transparent Resume Match Breakdown Display */}
              {(showResumeMatchBreakdown || selectedJob.matchScore !== undefined) && selectedJob.matchBreakdown && (
                <div className="p-5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
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
                        { label: 'Keywords', val: selectedJob.matchBreakdown.keywords, icon: Sparkles },
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
                        <Sparkles className="w-3.5 h-3.5" /> Partial matches:
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
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold transition-all cursor-pointer ${
                    savedJobIds.has(selectedJob.id) ? 'text-emerald-500 border-emerald-500/30' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${savedJobIds.has(selectedJob.id) ? 'fill-current' : ''}`} />
                  <span>{savedJobIds.has(selectedJob.id) ? 'Saved' : 'Save Job'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrepareResume(selectedJob)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Prepare & Tailor Resume</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApplyClick(selectedJob)}
                disabled={applyingJobId === selectedJob.id}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
