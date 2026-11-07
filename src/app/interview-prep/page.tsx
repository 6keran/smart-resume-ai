'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  Clock,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Send,
  Loader2,
  BookOpen,
  Briefcase,
  Play,
  FileText,
  Building,
  Target,
  BarChart3,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageTransition } from '@/components/ui/MotionPrimitives';
import { InterviewQuestion, InterviewAnswerEvaluation } from '@/server/services/careerIntelligence';

interface SessionData {
  id: string;
  target_role: string;
  job_title?: string | null;
  company?: string | null;
  questions: InterviewQuestion[];
  answers: Array<{
    answer: string;
    score: number;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
    modelAnswer?: string;
  }>;
  overall_score?: number | null;
  overall_feedback?: string | null;
  status: string;
  created_at: string;
}

export default function InterviewPrepPage() {
  // Step flow: 'setup' | 'session' | 'summary'
  const [viewStep, setViewStep] = useState<'setup' | 'session' | 'summary'>('setup');

  // Setup inputs
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Active Session state
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewAnswerEvaluation | null>(null);

  // Loading & status
  const [isStarting, setIsStarting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Historical sessions
  const [historySessions, setHistorySessions] = useState<SessionData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Fetch previous sessions on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/career/interview');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sessions)) {
            setHistorySessions(data.sessions);
          }
        }
      } catch (err) {
        console.error('Failed to load interview history', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    // Also fetch user's saved career goal if available
    async function loadGoal() {
      try {
        if (typeof window !== 'undefined') {
          const sp = new URLSearchParams(window.location.search);
          const roleParam = sp.get('role');
          const companyParam = sp.get('company');

          if (companyParam) setCompany(companyParam);

          if (roleParam) {
            setTargetRole(roleParam);
            return;
          }
        }

        const res = await fetch('/api/career/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.targetRole) {
            setTargetRole(data.profile.targetRole);
          }
        }
      } catch {}
    }

    loadHistory();
    loadGoal();
  }, []);

  // Timer effect during active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (viewStep === 'session' && !currentEvaluation) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewStep, currentEvaluation]);

  function formatTimer(secs: number) {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  }

  // Handle Start Session
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setErrorMessage('Please specify a target role.');
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/career/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          targetRole: targetRole.trim(),
          company: company.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start interview session');
      }

      setCurrentSession(data.session);
      setCurrentQuestionIndex(0);
      setUserAnswer('');
      setCurrentEvaluation(null);
      setSecondsElapsed(0);
      setViewStep('session');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsStarting(false);
    }
  };

  // Handle Answer Evaluation
  const handleEvaluateAnswer = async () => {
    if (!currentSession || !userAnswer.trim()) {
      setErrorMessage('Please type your response before requesting evaluation.');
      return;
    }

    const question = currentSession.questions[currentQuestionIndex];
    if (!question) return;

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/career/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          sessionId: currentSession.id,
          questionIndex: currentQuestionIndex,
          question,
          answer: userAnswer.trim(),
          targetRole: currentSession.target_role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to evaluate answer');
      }

      setCurrentEvaluation(data.evaluation);

      // Update currentSession local state answers
      const updatedAnswers = [...(currentSession.answers || [])];
      updatedAnswers[currentQuestionIndex] = {
        answer: userAnswer.trim(),
        score: data.evaluation.score,
        feedback: data.evaluation.sampleRefinement,
        strengths: data.evaluation.strengths,
        improvements: data.evaluation.areasForImprovement,
        modelAnswer: question.sampleStrongAnswer,
      };
      setCurrentSession({ ...currentSession, answers: updatedAnswers });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to evaluate answer.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Move to next question or complete
  const handleNextQuestion = async () => {
    if (!currentSession) return;

    if (currentQuestionIndex < currentSession.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer('');
      setCurrentEvaluation(null);
      setSecondsElapsed(0);
    } else {
      // Calculate overall score and finish
      setIsFinishing(true);
      const scores = currentSession.answers.map((a) => a.score || 0);
      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 75;

      const feedback = `Candidate demonstrated ${
        avgScore >= 80 ? 'strong' : avgScore >= 65 ? 'solid' : 'emerging'
      } qualification alignment for ${currentSession.target_role}. Key areas of competence were highlighted with actionable guidance for refinement.`;

      try {
        await fetch('/api/career/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'finish',
            sessionId: currentSession.id,
            overallScore: avgScore,
            overallFeedback: feedback,
          }),
        });

        setCurrentSession({
          ...currentSession,
          overall_score: avgScore,
          overall_feedback: feedback,
          status: 'completed',
        });
        setViewStep('summary');
      } catch (err) {
        setViewStep('summary');
      } finally {
        setIsFinishing(false);
      }
    }
  };

  const rolePills = [
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'Data Scientist',
    'DevOps Engineer',
    'AI Engineer',
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <PageTransition className="space-y-8">
          {/* ─── HEADER ───────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-[var(--border-color)]">
            <div className="space-y-1.5 max-w-2xl text-left">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                  CAREER WORKSPACE
                </span>
                <span className="text-[var(--text-muted)] text-xs">•</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  INTERVIEW PRACTICE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Technical & Behavioral Interview Practice
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Simulate realistic interviews tailored to your target role with instant answer evaluation, scoring, and STAR framework feedback.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link href="/dashboard" className="btn-secondary text-xs py-2 px-4 rounded-lg">
                <span>Dashboard</span>
              </Link>
              <Link href="/skills#skills-directory" className="btn-secondary text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5 cursor-pointer">
                <Award className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Skill Assessments</span>
              </Link>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ─── 1. SETUP VIEW ────────────────────────────────────────────────── */}
          {viewStep === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Setup (7 cols) */}
              <div className="lg:col-span-7">
                <GlassCard className="p-6 sm:p-8 rounded-xl border border-[var(--border-color)] space-y-6 text-left">
                  <div className="border-b border-[var(--border-color)] pb-4">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      Configure Practice Session
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Select your target role and optional job requirements to generate 5 tailored interview questions.
                    </p>
                  </div>

                  <form onSubmit={handleStartSession} className="space-y-5">
                    {/* Role Input & Quick Pills */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                        Target Role
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Senior Full Stack Developer"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors shadow-xs"
                        required
                      />

                      {/* Role Suggestions */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rolePills.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setTargetRole(role)}
                            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                              targetRole === role
                                ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/30'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-muted)]'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Company (Optional) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                        Target Company (Optional)
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Google, Stripe, or Target Startup"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors shadow-xs"
                      />
                    </div>

                    {/* Job Description (Optional) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                        Target Job Description Snippet (Optional)
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste key requirements or responsibility bullets from the job post..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors shadow-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isStarting}
                      className="btn-primary w-full py-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Customized Interview Questions...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Start 5-Question Interview Session</span>
                        </>
                      )}
                    </button>
                  </form>
                </GlassCard>
              </div>

              {/* Right Column: History & Tips (5 cols) */}
              <div className="lg:col-span-5 space-y-6 text-left">
                {/* Method Tips */}
                <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Evaluation Criteria
                    </span>
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc pl-4 leading-relaxed">
                    <li>
                      <strong>STAR Framework:</strong> Structure behavioral answers with Situation, Task, Action, and Measurable Result.
                    </li>
                    <li>
                      <strong>Technical Depth:</strong> Address algorithmic complexity, edge cases, and memory vs execution trade-offs.
                    </li>
                    <li>
                      <strong>Actionable Feedback:</strong> Receive a percentage score, pinpointed strengths, and a model strong answer for every question.
                    </li>
                  </ul>
                </div>

                {/* Previous Sessions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Recent Practice Sessions
                    </h3>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {historySessions.length} total
                    </span>
                  </div>

                  {isLoadingHistory ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading history...
                    </div>
                  ) : historySessions.length === 0 ? (
                    <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 text-center text-xs text-[var(--text-secondary)]">
                      No previous sessions found. Start your first session above!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {historySessions.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[var(--text-primary)] truncate">
                              {s.target_role}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {new Date(s.created_at).toLocaleDateString()} {s.company ? `• ${s.company}` : ''}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.overall_score && s.overall_score >= 75
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            }`}
                          >
                            {s.overall_score ? `${s.overall_score}% Score` : 'In Progress'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── 2. LIVE INTERVIEW SESSION VIEW ───────────────────────────────── */}
          {viewStep === 'session' && currentSession && (
            <div className="space-y-6 text-left max-w-3xl mx-auto">
              {/* Top Bar with Stepper & Live Clock */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {currentSession.questions.length}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">•</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono uppercase">
                    {currentSession.target_role}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{formatTimer(secondsElapsed)}</span>
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const q = currentSession.questions[currentQuestionIndex];
                if (!q) return null;

                return (
                  <GlassCard className="p-6 sm:p-8 rounded-xl border border-[var(--border-color)] space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30">
                        {q.category}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-snug">
                      {q.question}
                    </h2>

                    {q.context && (
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-color)] leading-relaxed">
                        <strong className="text-[var(--text-primary)] font-semibold">Evaluation Context: </strong>
                        {q.context}
                      </p>
                    )}

                    {/* Answer Area (if not evaluated yet) */}
                    {!currentEvaluation ? (
                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                          Your Answer
                        </label>
                        <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Type your response. Clearly address the core technical concepts, state real project actions taken, and mention measurable outcomes..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] transition-colors shadow-xs resize-y leading-relaxed"
                        />

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {userAnswer.trim().split(/\s+/).filter(Boolean).length} words
                          </span>

                          <button
                            type="button"
                            onClick={handleEvaluateAnswer}
                            disabled={isEvaluating || !userAnswer.trim()}
                            className="btn-primary text-xs py-2 px-6 rounded-full inline-flex items-center gap-2 shadow-sm"
                          >
                            {isEvaluating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Evaluating Answer with AI...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit for AI Evaluation</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Instant Evaluation Card */
                      <div className="space-y-5 pt-4 border-t border-[var(--border-color)]">
                        {/* Score & Tier Header */}
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                              AI Evaluator Score
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-2xl font-extrabold text-[var(--text-primary)]">
                                {currentEvaluation.score}
                              </span>
                              <span className="text-xs font-mono text-[var(--text-muted)]">/ 100</span>
                            </div>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              currentEvaluation.score >= 80
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : currentEvaluation.score >= 65
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                            }`}
                          >
                            {currentEvaluation.readinessLevel}
                          </span>
                        </div>

                        {/* Strengths */}
                        {currentEvaluation.strengths && currentEvaluation.strengths.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Key Strengths
                            </span>
                            <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc pl-5">
                              {currentEvaluation.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {currentEvaluation.areasForImprovement && currentEvaluation.areasForImprovement.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Areas for Improvement
                            </span>
                            <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc pl-5">
                              {currentEvaluation.areasForImprovement.map((imp, idx) => (
                                <li key={idx}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Model Strong Answer Accordion/Box */}
                        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
                          <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider block">
                            Staff-Level Model Answer
                          </span>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {q.sampleStrongAnswer}
                          </p>
                        </div>

                        {/* Next Action Pill Button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleNextQuestion}
                            disabled={isFinishing}
                            className="btn-primary text-xs py-2.5 px-6 rounded-full inline-flex items-center gap-2 shadow-sm"
                          >
                            {isFinishing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Completing Session...</span>
                              </>
                            ) : currentQuestionIndex < currentSession.questions.length - 1 ? (
                              <>
                                <span>Next Question</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                <span>View Final Session Results</span>
                                <CheckCircle2 className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              })()}
            </div>
          )}

          {/* ─── 3. SUMMARY VIEW ──────────────────────────────────────────────── */}
          {viewStep === 'summary' && currentSession && (
            <div className="space-y-6 text-left max-w-3xl mx-auto">
              <GlassCard className="p-6 sm:p-8 rounded-xl border border-[var(--border-color)] space-y-6">
                <div className="text-center space-y-2 border-b border-[var(--border-color)] pb-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                    Interview Practice Complete
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    You answered all 5 technical and behavioral interview questions for the{' '}
                    <strong>{currentSession.target_role}</strong> role.
                  </p>
                </div>

                {/* Score Banner */}
                <div className="p-5 rounded-2xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Overall Composite Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {currentSession.overall_score || 80}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">/ 100</span>
                    </div>
                  </div>

                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                      (currentSession.overall_score || 0) >= 75
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {(currentSession.overall_score || 0) >= 75
                      ? 'Interview Ready (Strong Alignment)'
                      : 'Developing (Practice Recommended)'}
                  </span>
                </div>

                {/* Feedback Note */}
                {currentSession.overall_feedback && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)]">
                    {currentSession.overall_feedback}
                  </p>
                )}

                {/* Question-by-Question List */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Question Breakdown
                  </h3>
                  <div className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
                    {currentSession.questions.map((q, idx) => {
                      const ans = currentSession.answers[idx];
                      return (
                        <div key={q.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] font-mono text-[var(--accent)] uppercase font-semibold">
                              Q{idx + 1} • {q.category}
                            </span>
                            <p className="font-semibold text-[var(--text-primary)] truncate mt-0.5">
                              {q.question}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                              ans?.score && ans.score >= 75
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            }`}
                          >
                            {ans?.score ? `${ans.score}%` : 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      setViewStep('setup');
                      setCurrentSession(null);
                    }}
                    className="btn-secondary w-full sm:w-auto text-xs py-2.5 px-6 rounded-full inline-flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Practice Another Role</span>
                  </button>

                  <Link
                    href="/dashboard"
                    className="btn-primary w-full sm:w-auto text-xs py-2.5 px-6 rounded-full inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Return to Career Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>
          )}
        </PageTransition>
      </main>
    </div>
  );
}

