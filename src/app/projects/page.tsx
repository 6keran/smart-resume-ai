'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Code2,
  Bot,
  Lightbulb,
  Target,
  Layers,
  CheckCircle2,
  Circle,
  ArrowRight,
  ExternalLink,
  Play,
  RotateCcw,
  Send,
  Loader2,
  FileText,
  Database,
  Server,
  Layout,
  Cpu,
  Shield,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Plus,
  AlertCircle,
  HelpCircle,
  Compass,
  FolderTree,
  Terminal,
  BookOpen,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageTransition } from '@/components/ui/MotionPrimitives';
import { useUserProfile } from '@/components/user/UserContext';
import {
  type RecommendedProject,
  type ProjectSpecification,
  type ProjectMilestone,
} from '@/server/services/projectMentor';
import { type GuidedProjectDTO } from '@/server/db';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ProjectMentorPage() {
  const { user, loading: userLoading } = useUserProfile();

  // Navigation Tabs: 'recommendations' | 'workspace' | 'portfolio'
  const [mainTab, setMainTab] = useState<'recommendations' | 'workspace' | 'portfolio'>('recommendations');

  // Recommendation State
  const [recommendations, setRecommendations] = useState<RecommendedProject[]>([]);
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  // User's Guided Projects
  const [guidedProjects, setGuidedProjects] = useState<GuidedProjectDTO[]>([]);
  const [activeProject, setActiveProject] = useState<GuidedProjectDTO | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Workspace sub-tabs: 'milestones' | 'specification' | 'mentor' | 'resume'
  const [workspaceTab, setWorkspaceTab] = useState<'milestones' | 'specification' | 'mentor' | 'resume'>('milestones');

  // Specification sub-tabs
  const [specTab, setSpecTab] = useState<'requirements' | 'architecture' | 'schema' | 'apis' | 'folder' | 'testing' | 'deployment'>('requirements');

  // Milestone expansion state
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<number | null>(1);

  // AI Coding Mentor State
  const [mentorMessages, setMentorMessages] = useState<Array<{ id: string; role: 'user' | 'model'; text: string; timestamp: string }>>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your AI Project Mentor. Ask me any questions about system architecture, schema design, debugging errors, or technology choices for this project.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [mentorInput, setMentorInput] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Resume Export / Import State
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{
    bullets: string[];
    studentProfileUpdated: boolean;
    resumeUpdated: boolean;
    description?: string;
  } | null>(null);

  // Repository & Live URLs edit modal/state
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [liveUrlInput, setLiveUrlInput] = useState('');
  const [savingUrls, setSavingUrls] = useState(false);
  const [urlSaveSuccess, setUrlSaveSuccess] = useState(false);

  // Starting a project loading state
  const [startingProjectId, setStartingProjectId] = useState<string | null>(null);

  const mentorEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch recommendations & guided projects on mount
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    // Load recommendations
    fetch('/api/career/projects/recommendations')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (isMounted && data.success) {
          setRecommendations(data.recommendations || []);
          setStudentSummary(data.studentSummary || null);
        }
      })
      .catch((err) => {
        if (isMounted) setRecsError(err.message || 'Failed to load recommendations.');
      })
      .finally(() => {
        if (isMounted) setRecsLoading(false);
      });

    // Load user's saved guided projects
    fetch('/api/career/projects')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (isMounted && data.success) {
          const list = data.projects || [];
          setGuidedProjects(list);
          if (list.length > 0) {
            setActiveProject((prev) => {
              if (!prev) {
                setRepoUrlInput(list[0].githubUrl || '');
                setLiveUrlInput(list[0].liveUrl || '');
                setExpandedMilestoneId(list[0].currentMilestone || 1);
                return list[0];
              }
              return prev;
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setProjectsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (workspaceTab === 'mentor') {
      mentorEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mentorMessages, workspaceTab]);

  // Start building a recommended project
  const handleStartProject = async (rec: RecommendedProject) => {
    setStartingProjectId(rec.id);
    try {
      const res = await fetch('/api/career/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          difficulty: rec.difficulty,
          targetRole: rec.targetRole,
          techStack: rec.techStack,
          problemStatement: rec.problemStatement,
          realWorldUseCase: rec.realWorldUseCase,
          architectureOverview: rec.architectureOverview,
          databaseDesign: rec.suggestedDatabaseDesign?.overview || '',
          estimatedComplexity: rec.estimatedComplexity,
          resumeValue: rec.resumeValue,
          suggestedDatabaseDesign: rec.suggestedDatabaseDesign,
        }),
      });

      if (!res.ok) throw new Error('Failed to create guided project');
      const data = await res.json();
      if (data.success && data.project) {
        setGuidedProjects((prev) => [data.project, ...prev]);
        setActiveProject(data.project);
        setRepoUrlInput(data.project.githubUrl || '');
        setLiveUrlInput(data.project.liveUrl || '');
        setExpandedMilestoneId(1);
        setMainTab('workspace');
        setWorkspaceTab('specification');
      }
    } catch (err: any) {
      alert(err.message || 'Error starting project');
    } finally {
      setStartingProjectId(null);
    }
  };

  // Toggle milestone completion
  const handleToggleMilestone = async (milestoneId: number) => {
    if (!activeProject) return;

    const updatedMilestones = activeProject.milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.isCompleted;
        return {
          ...m,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
          tasks: m.tasks.map((t: any) => ({ ...t, isCompleted: nextCompleted })),
        };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const progressPercent = Math.min(100, Math.round((completedCount / updatedMilestones.length) * 100));
    const nextCurrent = progressPercent === 100 ? 8 : Math.min(8, completedCount + 1);
    const nextStatus = progressPercent === 100 ? 'completed' : 'in_progress';

    // Optimistic UI update
    const updatedProject: GuidedProjectDTO = {
      ...activeProject,
      milestones: updatedMilestones,
      progressPercent,
      currentMilestone: nextCurrent,
      status: nextStatus as any,
    };
    setActiveProject(updatedProject);
    setGuidedProjects((prev) => prev.map((p) => (p.id === activeProject.id ? updatedProject : p)));

    try {
      await fetch(`/api/career/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: updatedMilestones,
          progressPercent,
          currentMilestone: nextCurrent,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.warn('Failed to persist milestone update:', err);
    }
  };

  // Toggle individual task within milestone
  const handleToggleTask = async (milestoneId: number, taskId: string) => {
    if (!activeProject) return;

    const updatedMilestones = activeProject.milestones.map((m) => {
      if (m.id === milestoneId) {
        const updatedTasks = m.tasks.map((t: any) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));
        const allDone = updatedTasks.every((t: any) => t.isCompleted);
        return {
          ...m,
          tasks: updatedTasks,
          isCompleted: allDone,
          completedAt: allDone ? new Date().toISOString() : m.completedAt,
        };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const progressPercent = Math.min(100, Math.round((completedCount / updatedMilestones.length) * 100));

    const updatedProject: GuidedProjectDTO = {
      ...activeProject,
      milestones: updatedMilestones,
      progressPercent,
    };
    setActiveProject(updatedProject);
    setGuidedProjects((prev) => prev.map((p) => (p.id === activeProject.id ? updatedProject : p)));

    try {
      await fetch(`/api/career/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: updatedMilestones,
          progressPercent,
        }),
      });
    } catch {}
  };

  // Save GitHub & Live links
  const handleSaveUrls = async () => {
    if (!activeProject) return;
    setSavingUrls(true);
    setUrlSaveSuccess(false);

    try {
      const res = await fetch(`/api/career/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUrl: repoUrlInput.trim(),
          liveUrl: liveUrlInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setActiveProject(data.project);
          setGuidedProjects((prev) => prev.map((p) => (p.id === activeProject.id ? data.project : p)));
          setUrlSaveSuccess(true);
          setTimeout(() => setUrlSaveSuccess(false), 2500);
        }
      }
    } catch {
      alert('Failed to save project URLs');
    } finally {
      setSavingUrls(false);
    }
  };

  // Send message to AI Coding Mentor
  const handleSendMentor = async () => {
    const text = mentorInput.trim();
    if (!text || mentorLoading || !activeProject) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMentorMessages((prev) => [...prev, userMsg]);
    setMentorInput('');
    const codeToSend = codeSnippet.trim() ? codeSnippet : undefined;
    setCodeSnippet('');
    setShowCodeInput(false);
    setMentorLoading(true);

    try {
      const history = mentorMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch(`/api/career/projects/${activeProject.id}/mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          codeSnippet: codeToSend,
          history,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Mentor unavailable');

      const modelMsg = {
        id: `asst_${Date.now()}`,
        role: 'model' as const,
        text: data.reply || 'Here is the architectural pattern for that component.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMentorMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setMentorMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model',
          text: err.message || 'Unable to connect with AI Coding Mentor. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setMentorLoading(false);
    }
  };

  // Export to Resume Builder & Student Profile
  const handleExportToResume = async () => {
    if (!activeProject) return;
    setExportLoading(true);

    try {
      const res = await fetch(`/api/career/projects/${activeProject.id}/export`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Export failed');

      setExportResult({
        bullets: data.bullets || [],
        studentProfileUpdated: data.studentProfileUpdated,
        resumeUpdated: data.resumeUpdated,
        description: data.description,
      });

      // Update local state bullets
      if (Array.isArray(data.bullets)) {
        setActiveProject((prev) => (prev ? { ...prev, resumeBullets: data.bullets } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to export to resume.');
    } finally {
      setExportLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)]">
        <GlassCard className="max-w-md p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
            <Code2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">AI Project Mentor</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Please sign in to access personalized portfolio project blueprints, step-by-step milestone guidance, an interactive AI coding mentor, and 1-click resume integration.
          </p>
          <div className="pt-2">
            <Link href="/login" className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold inline-block">
              Sign In to Continue
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen pb-16 bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Header Hero */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                    AI Project Mentor
                  </span>
                  {studentSummary?.institution && (
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {studentSummary.institution} · {studentSummary.degree || 'Student'}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Portfolio Engineering & Milestone Workspace
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
                  Build production-grade software projects tailored to your skill gaps and target role of{' '}
                  <strong className="text-[var(--text-primary)]">{studentSummary?.targetRole || 'Software Professional'}</strong>.
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] self-start md:self-auto shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMainTab('recommendations')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mainTab === 'recommendations'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Recommendations</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('workspace');
                    if (guidedProjects.length > 0 && !activeProject) {
                      setActiveProject(guidedProjects[0]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mainTab === 'workspace'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Active Workspace</span>
                  {guidedProjects.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white font-mono">
                      {guidedProjects.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab('portfolio')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mainTab === 'portfolio'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Portfolio</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          {/* TAB 1: RECOMMENDATIONS */}
          {mainTab === 'recommendations' && (
            <div className="space-y-6">
              {/* Context Banner */}
              {studentSummary && (
                <div className="p-4 rounded-2xl bg-[var(--accent-subtle)]/30 border border-[var(--accent)]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[var(--accent)]" />
                      Grounded in your Career Intelligence Profile
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      Target Role: <strong>{studentSummary.targetRole}</strong> · Top Skill Gaps to Resolve:{' '}
                      <span className="text-[var(--accent)] font-medium">
                        {studentSummary.topSkillGaps && studentSummary.topSkillGaps.length > 0
                          ? studentSummary.topSkillGaps.join(', ')
                          : 'Advanced System Architecture'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/guidance"
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium text-[11px]"
                    >
                      View Readiness ({studentSummary.readinessScore || 65}%)
                    </Link>
                  </div>
                </div>
              )}

              {/* Recommendations Grid */}
              {recsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                  <span className="text-xs font-medium">Generating student-specific project blueprints...</span>
                </div>
              ) : recsError ? (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  <p className="font-semibold">Failed to load recommendations</p>
                  <p className="mt-1">{recsError}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recommendations.map((rec) => (
                    <GlassCard
                      key={rec.id}
                      variant="elevated"
                      className="p-6 rounded-xl flex flex-col justify-between border border-[var(--border-color)] space-y-4 hover:border-[var(--accent)]/50 transition-all shadow-md group"
                    >
                      <div className="space-y-3.5">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                              rec.difficulty === 'Beginner'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : rec.difficulty === 'Intermediate'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {rec.difficulty}
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {rec.estimatedComplexity}
                          </span>
                        </div>

                        {/* Title & Problem Statement */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {rec.title}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                            {rec.problemStatement}
                          </p>
                        </div>

                        {/* Real-World Use Case */}
                        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                          <strong className="text-[var(--text-primary)] font-semibold block mb-0.5">
                            Industry Application:
                          </strong>
                          {rec.realWorldUseCase}
                        </div>

                        {/* Tech Stack Chips */}
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                            Technologies & Gap Bridges
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.techStack.map((tech, idx) => {
                              const isGap = rec.matchedGaps?.some(
                                (g) => g.toLowerCase() === tech.toLowerCase()
                              );
                              return (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                                    isGap
                                      ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                                      : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                                  }`}
                                  title={isGap ? 'Directly resolves an identified skill gap' : undefined}
                                >
                                  {tech}
                                  {isGap && ' (Gap)'}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Learning Outcomes */}
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                            Expected Learning Outcomes
                          </span>
                          <ul className="space-y-1">
                            {rec.learningOutcomes.slice(0, 3).map((out, i) => (
                              <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5 leading-relaxed">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{out}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                        <span className="text-[11px] text-[var(--text-muted)] italic truncate max-w-[200px] sm:max-w-xs">
                          {rec.resumeValue}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartProject(rec)}
                          disabled={startingProjectId === rec.id}
                          className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {startingProjectId === rec.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating Spec...</span>
                            </>
                          ) : (
                            <>
                              <span>Start Project</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE WORKSPACE */}
          {mainTab === 'workspace' && (
            <div>
              {guidedProjects.length === 0 ? (
                <GlassCard className="p-12 text-center max-w-xl mx-auto rounded-xl space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto border border-[var(--border-color)]">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">No Active Guided Projects Yet</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Select a tailored project blueprint from the Recommendations tab to generate full specifications, milestone checklists, and start coding with your AI mentor.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMainTab('recommendations')}
                    className="btn-primary px-5 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse Recommendations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </GlassCard>
              ) : (
                <div className="space-y-6">
                  {/* Project Selector Bar (if student has multiple active projects) */}
                  {guidedProjects.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase shrink-0">
                        Select Project:
                      </span>
                      {guidedProjects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActiveProject(p);
                            setRepoUrlInput(p.githubUrl || '');
                            setLiveUrlInput(p.liveUrl || '');
                            setExpandedMilestoneId(p.currentMilestone || 1);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer shrink-0 ${
                            activeProject?.id === p.id
                              ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {p.title} ({p.progressPercent}%)
                        </button>
                      ))}
                    </div>
                  )}

                  {activeProject && (
                    <>
                      {/* Active Project Banner */}
                      <GlassCard className="p-6 rounded-xl border border-[var(--border-color)] space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                                  activeProject.difficulty === 'Beginner'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : activeProject.difficulty === 'Intermediate'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'bg-amber-500/10 text-amber-500'
                                }`}
                              >
                                {activeProject.difficulty}
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                                Target Role: {activeProject.targetRole}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                Milestone {activeProject.currentMilestone} of 8
                              </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                              {activeProject.title}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] max-w-3xl leading-relaxed">
                              {activeProject.problemStatement}
                            </p>
                          </div>

                          {/* Progress Meter */}
                          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] lg:w-72 shrink-0 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-primary)]">Completion Progress</span>
                              <span className="font-mono font-bold text-[var(--accent)]">
                                {activeProject.progressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[var(--border-color)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                                style={{ width: `${activeProject.progressPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                              <span>
                                {activeProject.milestones.filter((m) => m.isCompleted).length} of 8 milestones
                              </span>
                              <span className="capitalize">{activeProject.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Repository & Demo URLs Form */}
                        <div className="pt-3 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center gap-3">
                          <div className="flex-1 w-full flex items-center gap-2">
                            <div className="relative flex-1">
                              <GithubIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                              <input
                                type="url"
                                value={repoUrlInput}
                                onChange={(e) => setRepoUrlInput(e.target.value)}
                                placeholder="GitHub Repository (e.g. https://github.com/...)"
                                className="w-full py-1.5 pl-8 pr-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                            <div className="relative flex-1">
                              <ExternalLink className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                              <input
                                type="url"
                                value={liveUrlInput}
                                onChange={(e) => setLiveUrlInput(e.target.value)}
                                placeholder="Live Demonstration URL (e.g. https://...)"
                                className="w-full py-1.5 pl-8 pr-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveUrls}
                            disabled={savingUrls}
                            className="px-3.5 py-1.5 rounded-xl btn-secondary text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {savingUrls ? 'Saving...' : urlSaveSuccess ? 'Saved ✓' : 'Save Links'}
                          </button>
                        </div>
                      </GlassCard>

                      {/* Workspace Sub-Tabs Navigation */}
                      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto pb-1 no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setWorkspaceTab('milestones')}
                          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
                            workspaceTab === 'milestones'
                              ? 'border-[var(--accent)] text-[var(--accent)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>8-Step Milestone Tracker</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkspaceTab('specification')}
                          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
                            workspaceTab === 'specification'
                              ? 'border-[var(--accent)] text-[var(--accent)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Full Project Specification</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkspaceTab('mentor')}
                          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
                            workspaceTab === 'mentor'
                              ? 'border-[var(--accent)] text-[var(--accent)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Terminal className="w-4 h-4" />
                          <span>AI Coding Mentor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkspaceTab('resume')}
                          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
                            workspaceTab === 'resume'
                              ? 'border-[var(--accent)] text-[var(--accent)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Award className="w-4 h-4" />
                          <span>Project-to-Resume Integration</span>
                        </button>
                      </div>

                      {/* SUB-VIEW 1: 8-STEP MILESTONE TRACKER */}
                      {workspaceTab === 'milestones' && (
                        <div className="space-y-4">
                          {activeProject.milestones.map((m) => {
                            const isExpanded = expandedMilestoneId === m.id;
                            return (
                              <GlassCard
                                key={m.id}
                                className={`p-5 rounded-2xl border transition-all ${
                                  m.isCompleted
                                    ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                                    : m.id === activeProject.currentMilestone
                                    ? 'border-[var(--accent)]/50 bg-[var(--accent-subtle)]/10'
                                    : 'border-[var(--border-color)]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMilestone(m.id)}
                                      className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                                      title={m.isCompleted ? 'Mark milestone incomplete' : 'Mark milestone complete'}
                                    >
                                      {m.isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                      ) : (
                                        <Circle className="w-5 h-5" />
                                      )}
                                    </button>
                                    <div
                                      className="flex-1 min-w-0 cursor-pointer"
                                      onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                                    >
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)]">
                                          Step {m.id} · {m.phase}
                                        </span>
                                        {m.isCompleted && (
                                          <span className="text-[10px] text-emerald-500 font-semibold font-mono">
                                            Completed ✓
                                          </span>
                                        )}
                                      </div>
                                      <h4
                                        className={`text-sm sm:text-base font-bold mt-1 ${
                                          m.isCompleted
                                            ? 'line-through text-[var(--text-muted)]'
                                            : 'text-[var(--text-primary)]'
                                        }`}
                                      >
                                        {m.title}
                                      </h4>
                                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                        {m.description}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                    aria-label={isExpanded ? 'Collapse milestone' : 'Expand milestone'}
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </div>

                                {/* Expanded Milestone Checklist & Deliverables */}
                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-3.5 pl-8 text-xs">
                                    <div>
                                      <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                                        Actionable Development Tasks
                                      </span>
                                      <div className="space-y-2">
                                        {m.tasks.map((t: any) => (
                                          <label
                                            key={t.id}
                                            className="flex items-start gap-2.5 cursor-pointer select-none group"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={t.isCompleted}
                                              onChange={() => handleToggleTask(m.id, t.id)}
                                              className="mt-0.5 rounded text-[var(--accent)] focus:ring-[var(--accent)]"
                                            />
                                            <span
                                              className={`leading-relaxed ${
                                                t.isCompleted
                                                  ? 'line-through text-[var(--text-muted)]'
                                                  : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                                              }`}
                                            >
                                              {t.title}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Tips & Deliverable */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                        <span className="text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1 mb-1">
                                          <Lightbulb className="w-3.5 h-3.5 text-[var(--accent)]" />
                                          <span>Pro Tips:</span>
                                        </span>
                                        <ul className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                                          {m.tips.map((tip: string, i: number) => (
                                            <li key={i}>• {tip}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                        <span className="text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1 mb-1">
                                          <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                                          <span>Milestone Deliverable:</span>
                                        </span>
                                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                          {m.deliverable}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </GlassCard>
                            );
                          })}
                        </div>
                      )}

                      {/* SUB-VIEW 2: FULL PROJECT SPECIFICATION */}
                      {workspaceTab === 'specification' && (
                        <div className="space-y-4">
                          {/* Specification Sub-Navigation */}
                          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                            {[
                              { key: 'requirements', label: 'Requirements' },
                              { key: 'architecture', label: 'Architecture & Data Flow' },
                              { key: 'schema', label: 'Database Schema' },
                              { key: 'apis', label: 'API Endpoint Plan' },
                              { key: 'folder', label: 'Folder Structure' },
                              { key: 'testing', label: 'Testing Strategy' },
                              { key: 'deployment', label: 'Deployment Guidance' },
                            ].map((tab) => (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => setSpecTab(tab.key as any)}
                                className={`text-[11px] px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
                                  specTab === tab.key
                                    ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Requirements View */}
                          {specTab === 'requirements' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-6 text-xs">
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                                  Functional Requirements
                                </h4>
                                <ul className="space-y-2">
                                  {activeProject.specification?.functionalRequirements?.map((fr: string, i: number) => (
                                    <li key={i} className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] leading-relaxed">
                                      {fr}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="pt-4 border-t border-[var(--border-color)]">
                                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">
                                  Non-Functional Requirements
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(activeProject.specification?.nonFunctionalRequirements || {}).map(
                                    ([category, reqs]: [string, any]) => (
                                      <div key={category} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5">
                                        <span className="font-bold text-[var(--text-primary)] uppercase font-mono text-[10px]">
                                          {category}
                                        </span>
                                        <ul className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                                          {Array.isArray(reqs) && reqs.map((r: string, idx: number) => (
                                            <li key={idx}>• {r}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </GlassCard>
                          )}

                          {/* Architecture View */}
                          {specTab === 'architecture' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-4 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                System Architecture & Data Flow
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                                  <Layout className="w-4 h-4 text-[var(--accent)]" />
                                  <span className="font-bold text-[var(--text-primary)] block">Frontend Tier</span>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    {activeProject.specification?.architecture?.frontend}
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                                  <Server className="w-4 h-4 text-[var(--accent)]" />
                                  <span className="font-bold text-[var(--text-primary)] block">Backend Tier</span>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    {activeProject.specification?.architecture?.backend}
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                                  <Database className="w-4 h-4 text-[var(--accent)]" />
                                  <span className="font-bold text-[var(--text-primary)] block">Data Layer</span>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    {activeProject.specification?.architecture?.database}
                                  </p>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-semibold">
                                  End-to-End Request Pipeline
                                </span>
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {activeProject.specification?.architecture?.dataFlow}
                                </p>
                              </div>
                            </GlassCard>
                          )}

                          {/* Database Schema View */}
                          {specTab === 'schema' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-4 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                Database Entities & Schema Design
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeProject.specification?.databaseSchema?.tables?.map((table: any, idx: number) => (
                                  <div key={idx} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-[var(--accent)] text-xs">
                                        table: {table.name}
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-[11px] text-left">
                                        <thead>
                                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                                            <th className="py-1">Column</th>
                                            <th className="py-1">Type</th>
                                            <th className="py-1">Constraints</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-color)] font-mono">
                                          {table.columns?.map((col: any, cIdx: number) => (
                                            <tr key={cIdx}>
                                              <td className="py-1 text-[var(--text-primary)] font-semibold">{col.name}</td>
                                              <td className="py-1 text-[var(--text-secondary)]">{col.type}</td>
                                              <td className="py-1 text-[var(--accent)] text-[10px]">{col.constraints || '-'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                          )}

                          {/* APIs View */}
                          {specTab === 'apis' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-3 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                                API Endpoint Contracts
                              </h4>
                              <div className="space-y-2">
                                {activeProject.specification?.apiEndpoints?.map((ep: any, idx: number) => (
                                  <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5 font-mono text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          ep.method === 'GET'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : ep.method === 'POST'
                                            ? 'bg-blue-500/10 text-blue-500'
                                            : ep.method === 'PATCH' || ep.method === 'PUT'
                                            ? 'bg-amber-500/10 text-amber-500'
                                            : 'bg-red-500/10 text-red-500'
                                        }`}
                                      >
                                        {ep.method}
                                      </span>
                                      <span className="font-bold text-[var(--text-primary)]">{ep.path}</span>
                                    </div>
                                    <p className="text-[var(--text-secondary)] font-sans text-xs">{ep.description}</p>
                                    {ep.requestBody && (
                                      <div className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg">
                                        Request: {ep.requestBody}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                          )}

                          {/* Folder Structure */}
                          {specTab === 'folder' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-3 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                Recommended Project Folder Structure
                              </h4>
                              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                                {activeProject.specification?.folderStructure}
                              </pre>
                            </GlassCard>
                          )}

                          {/* Testing Strategy */}
                          {specTab === 'testing' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-4 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                Testing Strategy & Quality Assurance
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                                  <span className="font-bold text-[var(--text-primary)] block">Unit Tests</span>
                                  <ul className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                                    {activeProject.specification?.testingStrategy?.unitTests?.map((t: string, i: number) => (
                                      <li key={i}>• {t}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                                  <span className="font-bold text-[var(--text-primary)] block">Integration & E2E Scenarios</span>
                                  <ul className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                                    {activeProject.specification?.testingStrategy?.integrationTests?.map((t: string, i: number) => (
                                      <li key={i}>• {t}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </GlassCard>
                          )}

                          {/* Deployment View */}
                          {specTab === 'deployment' && (
                            <GlassCard className="p-6 rounded-2xl border border-[var(--border-color)] space-y-4 text-xs">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                Production Cloud Deployment Guide
                              </h4>
                              <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold">
                                Target Platform: {activeProject.specification?.deploymentGuidance?.platform}
                              </div>
                              <div className="space-y-2">
                                {activeProject.specification?.deploymentGuidance?.steps?.map((step: string, i: number) => (
                                  <div key={i} className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-2">
                                    <span className="font-bold text-[var(--accent)] shrink-0">{i + 1}.</span>
                                    <span className="text-[var(--text-secondary)]">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </GlassCard>
                          )}
                        </div>
                      )}

                      {/* SUB-VIEW 3: AI CODING MENTOR CHAT */}
                      {workspaceTab === 'mentor' && (
                        <GlassCard className="rounded-2xl border border-[var(--border-color)] overflow-hidden flex flex-col h-[600px]">
                          {/* Mentor Header */}
                          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs">
                                <Terminal className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                  AI Coding Mentor · {activeProject.title}
                                </h4>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  Ask about architecture, errors, database design, and best practices
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCodeInput((prev) => !prev)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                                showCodeInput
                                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {showCodeInput ? 'Hide Code Box' : '+ Paste Code Snippet'}
                            </button>
                          </div>

                          {/* Message List */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                            {mentorMessages.map((m) => (
                              <div
                                key={m.id}
                                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                {m.role === 'model' && (
                                  <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--accent)]/20">
                                    <Bot className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div
                                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                                    m.role === 'user'
                                      ? 'bg-[var(--accent)] text-white rounded-br-xs'
                                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-xs'
                                  }`}
                                >
                                  <div className="whitespace-pre-wrap">{m.text}</div>
                                  <div className="mt-1 flex items-center justify-between text-[9px] opacity-70">
                                    <span>{m.timestamp}</span>
                                    {m.role === 'model' && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const ok = await copyToClipboard(m.text);
                                          if (ok) {
                                            setCopiedId(m.id);
                                            setTimeout(() => setCopiedId(null), 2000);
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer"
                                      >
                                        {copiedId === m.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {mentorLoading && (
                              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                                <span>Analyzing code and crafting solution...</span>
                              </div>
                            )}
                            <div ref={mentorEndRef} />
                          </div>

                          {/* Code Snippet Box (collapsible) */}
                          {showCodeInput && (
                            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
                              <textarea
                                value={codeSnippet}
                                onChange={(e) => setCodeSnippet(e.target.value)}
                                rows={3}
                                placeholder="Paste your error trace, controller function, or schema snippet here..."
                                className="w-full p-2.5 font-mono text-[11px] rounded-xl bg-slate-900 text-slate-100 border border-slate-700 resize-none focus:outline-none focus:border-[var(--accent)]"
                              />
                            </div>
                          )}

                          {/* Quick Suggestion Pills */}
                          <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase shrink-0">
                              Quick Ask:
                            </span>
                            {[
                              'How do I structure my database schema migrations?',
                              'What is the best way to handle auth tokens in Next.js?',
                              'Explain how Redis caching reduces latency',
                              'How do I write an integration test for my API?',
                            ].map((prompt, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setMentorInput(prompt)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] shrink-0 cursor-pointer"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>

                          {/* Input Bar */}
                          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center gap-2">
                            <input
                              type="text"
                              value={mentorInput}
                              onChange={(e) => setMentorInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSendMentor();
                                }
                              }}
                              placeholder="Ask your coding mentor a question..."
                              className="flex-1 py-2 px-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                              disabled={mentorLoading}
                            />
                            <button
                              type="button"
                              onClick={handleSendMentor}
                              disabled={!mentorInput.trim() || mentorLoading}
                              className="btn-primary p-2.5 rounded-xl shrink-0 cursor-pointer disabled:opacity-40"
                              aria-label="Send question to mentor"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </GlassCard>
                      )}

                      {/* SUB-VIEW 4: PROJECT-TO-RESUME INTEGRATION */}
                      {workspaceTab === 'resume' && (
                        <GlassCard className="p-6 rounded-xl border border-[var(--border-color)] space-y-6 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                            <div>
                              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                Project-to-Resume Integration
                              </h3>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Automatically extract quantifiable Google XYZ resume bullet points and export this project directly into your Resume Builder.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportToResume}
                              disabled={exportLoading}
                              className="btn-primary px-4 py-2.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {exportLoading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Exporting...</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Generate & Import into Resume Builder</span>
                                </>
                              )}
                            </button>
                          </div>

                          {exportResult && (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
                              <p className="font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Successfully imported into your Student Career Profile and active Resume!
                              </p>
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                You can now visit the <Link href="/builder" className="font-semibold text-[var(--accent)] underline">Resume Builder</Link> under Step 6 (Projects) to preview how it renders on your A4 PDF.
                              </p>
                            </div>
                          )}

                          {/* Resume Bullets Preview */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                              Recruiter-Ready Google XYZ Bullets
                            </span>
                            <div className="space-y-2.5">
                              {(activeProject.resumeBullets && activeProject.resumeBullets.length > 0
                                ? activeProject.resumeBullets
                                : [
                                    `Architected a full-stack ${activeProject.targetRole.toLowerCase()} application using ${activeProject.techStack.join(', ')}, implementing transactional persistence and strict schema validation across 6+ REST API endpoints.`,
                                    `Engineered containerized deployment using Docker and relational PostgreSQL modeling, achieving sub-50ms query latency under simulated multi-client requests.`,
                                    `Implemented automated test suites and continuous deployment pipelines, verifying API authentication, error handling boundaries, and cloud hosting availability.`,
                                  ]
                              ).map((bullet, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-2.5 leading-relaxed text-[var(--text-secondary)]"
                                >
                                  <span className="font-bold text-[var(--accent)] shrink-0">•</span>
                                  <span className="flex-1">{bullet}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Google XYZ Explanation Box */}
                          <div className="p-4 rounded-xl bg-[var(--accent-subtle)]/30 border border-[var(--accent)]/20 space-y-1.5 text-xs">
                            <strong className="text-[var(--text-primary)] block font-semibold">
                              Why these bullet points stand out:
                            </strong>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                              Each bullet follows the formula: <strong className="text-[var(--text-primary)]">&quot;Accomplished [X] as measured by [Y] by doing [Z]&quot;</strong>. They emphasize verified engineering decisions—concurrency, database indexes, and API schemas—without fabricating fake company user counts or revenues.
                            </p>
                          </div>
                        </GlassCard>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PORTFOLIO */}
          {mainTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Student Project Portfolio
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Your complete portfolio of documented academic, personal, and guided engineering systems.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMainTab('recommendations')}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Project</span>
                </button>
              </div>

              {guidedProjects.length === 0 ? (
                <GlassCard className="p-12 text-center max-w-md mx-auto rounded-xl space-y-3">
                  <BookOpen className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">No projects in portfolio</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Select a project blueprint from Recommendations to start building your verified portfolio.
                  </p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {guidedProjects.map((p) => (
                    <GlassCard
                      key={p.id}
                      className="p-5 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between space-y-4 hover:border-[var(--accent)]/40 transition-all shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                              p.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            {p.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[var(--accent)]">
                            {p.progressPercent}%
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                            {p.problemStatement}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {p.techStack.slice(0, 4).map((tech, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {p.githubUrl && (
                            <a
                              href={p.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              title="GitHub Repository"
                            >
                              <GithubIcon className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {p.liveUrl && (
                            <a
                              href={p.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              title="Live Demo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveProject(p);
                            setRepoUrlInput(p.githubUrl || '');
                            setLiveUrlInput(p.liveUrl || '');
                            setMainTab('workspace');
                            setWorkspaceTab('milestones');
                          }}
                          className="btn-secondary px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Open Workspace
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
