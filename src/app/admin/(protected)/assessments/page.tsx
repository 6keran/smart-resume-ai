'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Award,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sliders,
  Filter,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BadgeCheck,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type TabType = 'questions' | 'skills' | 'attempts' | 'settings';

interface QuestionItem {
  id: string;
  skill_slug: string;
  skill_name: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  time_limit_seconds: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface SkillItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  is_active: boolean;
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  easyQuestions: number;
  mediumQuestions: number;
  hardQuestions: number;
  assessmentCount: number;
  verifiedCount: number;
  config: {
    questionsCount: number;
    passPercentage: number;
    timeLimitMinutes: number;
  };
}

interface AttemptItem {
  id: string;
  visitor_id: string | null;
  anonymous_id: string | null;
  user_name?: string;
  skill: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  status: string;
  duration_seconds: number;
  started_at: string;
  completed_at: string | null;
  proctoring_violation_count: number;
  termination_reason?: string | null;
  created_at: string;
}

interface AttemptDetail {
  attempt: AttemptItem;
  snapshots: Array<{
    id: string;
    questionId: string;
    questionOrder: number;
    questionText: string;
    questionType: string;
    difficulty: string;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
    selectedAnswer: string | null;
    isCorrect: boolean;
  }>;
  proctoringEvents?: Array<{
    id: string;
    type: string;
    severity: string;
    details: string;
    timestamp: string;
  }>;
}

const SUPPORTED_SKILL_NAMES = [
  'Python',
  'React',
  'SQL',
  'JavaScript',
  'TypeScript',
  'AWS',
  'Git',
  'Machine Learning',
  'Java',
  'C++',
  'C#',
  'Data Analysis',
];

export default function AdminAssessmentsWorkspace() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'questions';
  const initialSkill = searchParams.get('skill') || 'all';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Question Bank State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [qTotal, setQTotal] = useState(0);
  const [qPage, setQPage] = useState(1);
  const [qTotalPages, setQTotalPages] = useState(1);
  const [qLoading, setQLoading] = useState(false);

  // Question Filters
  const [skillFilter, setSkillFilter] = useState<string>(initialSkill);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Skills State
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Attempts State
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionItem | null>(null);

  // Config Modal State
  const [editingConfigSkill, setEditingConfigSkill] = useState<SkillItem | null>(null);
  const [configForm, setConfigForm] = useState({ questionsCount: 10, passPercentage: 70, timeLimitMinutes: 20 });

  // Question Form State
  const [qForm, setQForm] = useState({
    skill: 'Python',
    question_text: '',
    question_type: 'MCQ',
    difficulty: 'Medium',
    options: ['', '', '', ''],
    correct_answer: 'Option A',
    explanation: '',
    time_limit_seconds: 120,
    is_active: true,
  });

  // Fetch Questions
  const fetchQuestions = useCallback(async () => {
    setQLoading(true);
    try {
      const params = new URLSearchParams();
      if (skillFilter !== 'all') params.set('skill', skillFilter);
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchFilter.trim()) params.set('search', searchFilter.trim());
      params.set('page', qPage.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setQTotal(data.total || 0);
        setQTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setQLoading(false);
    }
  }, [skillFilter, difficultyFilter, typeFilter, statusFilter, searchFilter, qPage]);

  // Fetch Skills
  const fetchSkills = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const res = await fetch('/api/admin/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  // Fetch Attempts
  const fetchAttempts = useCallback(async () => {
    setAttemptsLoading(true);
    try {
      const res = await fetch('/api/admin/assessments/attempts');
      if (res.ok) {
        const data = await res.json();
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  // Fetch Attempt Detail
  const openAttemptDetail = async (id: string) => {
    setSelectedAttemptId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/assessments/attempts?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setAttemptDetail(data);
      }
    } catch (err) {
      console.error('Failed to load attempt detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'questions') fetchQuestions();
    if (activeTab === 'skills' || activeTab === 'settings') fetchSkills();
    if (activeTab === 'attempts') fetchAttempts();
  }, [activeTab, fetchQuestions, fetchSkills, fetchAttempts]);

  // Open Add Question Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setQForm({
      skill: skillFilter !== 'all' ? skillFilter : 'Python',
      question_text: '',
      question_type: 'MCQ',
      difficulty: 'Medium',
      options: ['', '', '', ''],
      correct_answer: 'Option A',
      explanation: '',
      time_limit_seconds: 120,
      is_active: true,
    });
    setIsQuestionModalOpen(true);
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q: QuestionItem) => {
    setEditingQuestion(q);
    const opts = q.options.length >= 4 ? q.options : [...q.options, '', '', ''].slice(0, 4);
    setQForm({
      skill: q.skill_name,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      options: opts,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      time_limit_seconds: q.time_limit_seconds || 120,
      is_active: q.is_active,
    });
    setIsQuestionModalOpen(true);
  };

  // Save Question (Create / Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledOptions = qForm.options.filter((o) => o.trim().length > 0);
    if (filledOptions.length < 2) {
      alert('Please provide at least 2 options.');
      return;
    }

    try {
      if (editingQuestion) {
        // Update
        const res = await fetch('/api/admin/questions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingQuestion.id,
            skill: qForm.skill,
            question_text: qForm.question_text,
            question_type: qForm.question_type,
            difficulty: qForm.difficulty,
            options: filledOptions,
            correct_answer: qForm.correct_answer,
            explanation: qForm.explanation,
            time_limit_seconds: qForm.time_limit_seconds,
            is_active: qForm.is_active,
          }),
        });

        if (res.ok) {
          setIsQuestionModalOpen(false);
          fetchQuestions();
        } else {
          const err = await res.json();
          alert(err.message || 'Failed to update question');
        }
      } else {
        // Create
        const res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill: qForm.skill,
            question_text: qForm.question_text,
            question_type: qForm.question_type,
            difficulty: qForm.difficulty,
            options: filledOptions,
            correct_answer: qForm.correct_answer,
            explanation: qForm.explanation,
            time_limit_seconds: qForm.time_limit_seconds,
            is_active: qForm.is_active,
          }),
        });

        if (res.ok) {
          setIsQuestionModalOpen(false);
          fetchQuestions();
        } else {
          const err = await res.json();
          alert(err.message || 'Failed to create question');
        }
      }
    } catch (err) {
      console.error('Save question error:', err);
    }
  };

  // Toggle Question Status
  const handleToggleQuestionStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // Soft Delete Question
  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    try {
      const res = await fetch(`/api/admin/questions?id=${deletingQuestion.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeletingQuestion(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  // Toggle Skill Status
  const handleToggleSkillStatus = async (skillId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skillId, is_active: !currentStatus }),
      });
      if (res.ok) {
        fetchSkills();
      }
    } catch (err) {
      console.error('Toggle skill status error:', err);
    }
  };

  // Save Assessment Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfigSkill) return;

    try {
      const res = await fetch('/api/admin/assessments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillSlug: editingConfigSkill.slug,
          questionsCount: configForm.questionsCount,
          passPercentage: configForm.passPercentage,
          timeLimitMinutes: configForm.timeLimitMinutes,
        }),
      });

      if (res.ok) {
        setEditingConfigSkill(null);
        fetchSkills();
      } else {
        alert('Failed to update config');
      }
    } catch (err) {
      console.error('Save config error:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 mb-2">
            <Award className="w-3 h-3" />
            Skill Evaluation & Question Bank
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Assessment Management
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Maintain technical questions, skill catalogs, per-skill assessment parameters, and review candidate attempt snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'questions' && (
            <button
              onClick={handleOpenAddQuestion}
              className="inline-flex items-center gap-2 h-[40px] px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'questions') fetchQuestions();
              else if (activeTab === 'skills' || activeTab === 'settings') fetchSkills();
              else if (activeTab === 'attempts') fetchAttempts();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'questions'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Question Bank ({qTotal})
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'skills'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          Skills Catalog ({skills.length})
        </button>

        <button
          onClick={() => setActiveTab('attempts')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'attempts'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Assessment Attempts ({attempts.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Assessment Settings
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUESTION BANK */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <GlassCard className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setQPage(1);
                }}
                placeholder="Search question text or explanations..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Skill Filter */}
            <select
              value={skillFilter}
              onChange={(e) => {
                setSkillFilter(e.target.value);
                setQPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Skills</option>
              {SUPPORTED_SKILL_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value);
                setQPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Question Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setQPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="Code Output">Code Output</option>
              <option value="Debugging">Debugging</option>
              <option value="True/False">True/False</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setQPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </GlassCard>

          {/* Questions Table */}
          <GlassCard className="overflow-hidden">
            {qLoading ? (
              <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                Loading question bank...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center">
                <Layers className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No questions match the current filters.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Adjust filters or click &quot;Add Question&quot; to add new questions to the database.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--bg-elevated)]/60 text-[10px] uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="py-3 px-4">Skill</th>
                      <th className="py-3 px-4 min-w-[260px]">Question</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Correct Answer</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                        {/* Skill */}
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {q.skill_name}
                        </td>

                        {/* Question */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)] line-clamp-2">
                            {q.question_text}
                          </div>
                          {q.explanation && (
                            <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                              {q.explanation}
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {q.question_type}
                        </td>

                        {/* Difficulty */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              q.difficulty.toLowerCase() === 'easy'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : q.difficulty.toLowerCase() === 'medium'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </td>

                        {/* Correct Answer */}
                        <td className="py-3 px-4 font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                          {q.correct_answer}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleQuestionStatus(q.id, q.is_active)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              q.is_active
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-500/15 text-slate-400 border border-slate-500/30 hover:bg-slate-500/25'
                            }`}
                            title="Click to toggle Active/Inactive"
                          >
                            {q.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {q.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditQuestion(q)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                              title="Edit Question"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingQuestion(q)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:text-rose-400 hover:border-rose-400 transition-all"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {qTotalPages > 1 && (
              <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>
                  Showing Page {qPage} of {qTotalPages} ({qTotal} total questions)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQPage((p) => Math.max(1, p - 1))}
                    disabled={qPage === 1}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] disabled:opacity-30 hover:bg-[var(--bg-elevated)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setQPage((p) => Math.min(qTotalPages, p + 1))}
                    disabled={qPage === qTotalPages}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] disabled:opacity-30 hover:bg-[var(--bg-elevated)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SKILLS CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((s) => (
              <GlassCard key={s.id} className="p-5 flex flex-col justify-between space-y-4 text-left">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {s.name}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider">
                        {s.category}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleSkillStatus(s.id, s.is_active)}
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        s.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {s.description || 'No description configured.'}
                  </p>

                  {/* Question Metrics */}
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Question Bank</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {s.totalQuestions} ({s.activeQuestions} active · {s.inactiveQuestions} inactive)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                      <span>By Difficulty:</span>
                      <span>
                        {s.easyQuestions} Easy · {s.mediumQuestions} Med · {s.hardQuestions} Hard
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
                      <span className="text-[var(--text-secondary)]">Assessment Rules:</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {s.config.questionsCount} questions · {s.config.passPercentage}% pass · {s.config.timeLimitMinutes}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    <span className="font-bold text-[var(--text-primary)]">{s.assessmentCount}</span> tests ·{' '}
                    <span className="font-bold text-emerald-400">{s.verifiedCount}</span> verified
                  </div>

                  <button
                    onClick={() => {
                      setSkillFilter(s.name);
                      setActiveTab('questions');
                    }}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <span>Manage Questions</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ASSESSMENT ATTEMPTS & RESULTS */}
      {/* ========================================================================= */}
      {activeTab === 'attempts' && (
        <div className="space-y-4">
          <GlassCard className="overflow-hidden">
            {attemptsLoading ? (
              <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                Loading candidate assessment attempts...
              </div>
            ) : attempts.length === 0 ? (
              <div className="p-12 text-center">
                <Award className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No candidate assessment attempts recorded yet.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  When visitors take Skill Verification tests, historical snapshot results will be stored here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--bg-elevated)]/60 text-[10px] uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="py-3 px-4">Candidate / Attempt</th>
                      <th className="py-3 px-4">Skill</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-center">Proctoring Status</th>
                      <th className="py-3 px-4 text-center">Duration</th>
                      <th className="py-3 px-4 text-right">Completed At</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs text-[var(--text-primary)]">
                            {att.user_name || 'Name not provided'}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                            {att.id}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                          {att.skill}
                        </td>

                        <td className="py-3 px-4 text-center font-black text-sm text-[var(--text-primary)]">
                          {att.score} / {att.total_questions} ({att.percentage}%)
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              att.status === 'INCOMPLETE' || att.status === 'terminated'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : att.passed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {att.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {att.status === 'INCOMPLETE' || att.status === 'terminated' ? 'INCOMPLETE' : att.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {att.status === 'INCOMPLETE' || att.status === 'terminated' ? (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                                <AlertTriangle className="w-3 h-3" />
                                INCOMPLETE ({att.proctoring_violation_count || 3} violations)
                              </span>
                              {att.termination_reason && (
                                <span className="text-[9px] text-rose-400/80 truncate max-w-[180px] mt-0.5" title={att.termination_reason}>
                                  {att.termination_reason}
                                </span>
                              )}
                            </div>
                          ) : att.proctoring_violation_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                              <AlertTriangle className="w-3 h-3" />
                              WARNING ({att.proctoring_violation_count} violations)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                              <CheckCircle2 className="w-3 h-3" />
                              CLEAR (0 violations)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center text-xs text-[var(--text-secondary)] font-mono">
                          {Math.floor(att.duration_seconds / 60)}m {att.duration_seconds % 60}s
                        </td>

                        <td className="py-3 px-4 text-right text-xs text-[var(--text-secondary)]">
                          {att.completed_at ? new Date(att.completed_at).toLocaleString() : 'In Progress'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openAttemptDetail(att.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-xs font-semibold transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ASSESSMENT SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
              Assessment Parameter Configuration
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              Configure the number of questions, passing threshold, and time limit for each supported technical skill.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--bg-elevated)]/60 text-[10px] uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="py-3 px-4">Skill</th>
                    <th className="py-3 px-4 text-center">Active Question Pool</th>
                    <th className="py-3 px-4 text-center">Exam Questions</th>
                    <th className="py-3 px-4 text-center">Pass Requirement</th>
                    <th className="py-3 px-4 text-center">Time Limit</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {skills.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {s.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            s.activeQuestions >= s.config.questionsCount ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {s.activeQuestions} available
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[var(--text-primary)]">
                        {s.config.questionsCount} questions
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">
                        {s.config.passPercentage}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[var(--text-secondary)]">
                        {s.config.timeLimitMinutes} minutes
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingConfigSkill(s);
                            setConfigForm({
                              questionsCount: s.config.questionsCount,
                              passPercentage: s.config.passPercentage,
                              timeLimitMinutes: s.config.timeLimitMinutes,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-xs font-semibold transition-all"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT QUESTION */}
      {/* ========================================================================= */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--text-primary)]/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 my-8 text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                {editingQuestion ? 'Edit Assessment Question' : 'Add Question to Question Bank'}
              </h2>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Row 1: Skill, Type, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Skill *
                  </label>
                  <select
                    value={qForm.skill}
                    onChange={(e) => setQForm({ ...qForm, skill: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {SUPPORTED_SKILL_NAMES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Type *
                  </label>
                  <select
                    value={qForm.question_type}
                    onChange={(e) => setQForm({ ...qForm, question_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="Code Output">Code Output</option>
                    <option value="Debugging">Debugging</option>
                    <option value="True/False">True/False</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Difficulty *
                  </label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={3}
                  value={qForm.question_text}
                  onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                  placeholder="Enter the complete question prompt..."
                  className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Options A - D */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Options (Minimum 2 required) *
                </label>
                {['A', 'B', 'C', 'D'].map((letter, idx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0">
                      {letter}
                    </span>
                    <input
                      type="text"
                      required={idx < 2}
                      value={qForm.options[idx] || ''}
                      onChange={(e) => {
                        const newOpts = [...qForm.options];
                        newOpts[idx] = e.target.value;
                        setQForm({ ...qForm, options: newOpts });
                      }}
                      placeholder={`Option ${letter} text...`}
                      className="flex-1 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Correct Answer *
                  </label>
                  <select
                    value={qForm.correct_answer}
                    onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Option A">Option A</option>
                    <option value="Option B">Option B</option>
                    <option value="Option C">Option C</option>
                    <option value="Option D">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Status *
                  </label>
                  <select
                    value={qForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setQForm({ ...qForm, is_active: e.target.value === 'active' })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="active">Active (Available for assessment selection)</option>
                    <option value="inactive">Inactive (Retained in bank but excluded from exams)</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Explanation / Educational Rationale
                </label>
                <textarea
                  rows={2}
                  value={qForm.explanation}
                  onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                  placeholder="Explain why this answer is correct..."
                  className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-md hover:bg-[var(--accent-hover)] transition-all"
                >
                  SAVE QUESTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE QUESTION CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 bg-[var(--text-primary)]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Delete this question?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This question will be safely soft-deleted from the active assessment pool. Historical assessments previously taken will remain accurate and immutable.
            </p>
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-primary)] line-clamp-2">
              &quot;{deletingQuestion.question_text}&quot;
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteQuestion}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTORICAL ATTEMPT REVIEW */}
      {/* ========================================================================= */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 bg-[var(--text-primary)]/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 my-8 text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider">
                  Historical Assessment Snapshot
                </span>
                <h2 className="text-lg font-black text-[var(--text-primary)]">
                  {attemptDetail?.attempt.skill} Attempt Review ({attemptDetail?.attempt.score}/{attemptDetail?.attempt.total_questions})
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedAttemptId(null);
                  setAttemptDetail(null);
                }}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !attemptDetail ? (
              <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                Loading preserved historical question snapshots...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meta Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Result</span>
                    <div className={`font-bold mt-0.5 ${
                      attemptDetail.attempt.status === 'INCOMPLETE' || attemptDetail.attempt.status === 'terminated'
                        ? 'text-rose-400'
                        : attemptDetail.attempt.passed
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {attemptDetail.attempt.status === 'INCOMPLETE' || attemptDetail.attempt.status === 'terminated'
                        ? 'INCOMPLETE'
                        : attemptDetail.attempt.passed
                        ? 'PASSED (VERIFIED)'
                        : 'FAILED'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Score</span>
                    <div className="font-bold text-[var(--text-primary)] mt-0.5">
                      {attemptDetail.attempt.score} / {attemptDetail.attempt.total_questions} ({attemptDetail.attempt.percentage}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Proctoring</span>
                    <div className={`font-bold mt-0.5 ${
                      attemptDetail.attempt.status === 'INCOMPLETE' || attemptDetail.attempt.status === 'terminated'
                        ? 'text-rose-400'
                        : attemptDetail.attempt.proctoring_violation_count > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {attemptDetail.attempt.status === 'INCOMPLETE' || attemptDetail.attempt.status === 'terminated'
                        ? `INCOMPLETE (${attemptDetail.attempt.proctoring_violation_count || 3})`
                        : attemptDetail.attempt.proctoring_violation_count > 0
                        ? `WARNING (${attemptDetail.attempt.proctoring_violation_count})`
                        : 'CLEAR (0)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Duration</span>
                    <div className="font-mono text-[var(--text-primary)] mt-0.5">
                      {Math.floor(attemptDetail.attempt.duration_seconds / 60)}m {attemptDetail.attempt.duration_seconds % 60}s
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Candidate</span>
                    <div className="font-semibold text-[var(--text-primary)] truncate mt-0.5">
                      {attemptDetail.attempt.user_name || 'Name not provided'}
                    </div>
                  </div>
                </div>

                {/* Termination Warning Banner if Terminated */}
                {attemptDetail.attempt.termination_reason && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span><strong>Termination Reason:</strong> {attemptDetail.attempt.termination_reason}</span>
                  </div>
                )}

                {/* Proctoring Event Audit Log if available */}
                {attemptDetail.proctoringEvents && attemptDetail.proctoringEvents.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                      <span>Proctoring Audit Log ({attemptDetail.proctoringEvents.length} events logged)</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Real-time Camera Verified
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {attemptDetail.proctoringEvents.map((evt) => (
                        <div key={evt.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] text-[11px]">
                          <span className={`font-mono ${evt.severity === 'violation' ? 'text-rose-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                            {evt.type}
                          </span>
                          <span className="text-[var(--text-secondary)] truncate max-w-sm">{evt.details}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preserved Question Snapshots Review */}
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                  {attemptDetail.snapshots.map((snap, sIdx) => (
                    <div
                      key={snap.id}
                      className={`p-4 rounded-xl border text-xs space-y-3 ${
                        snap.isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-rose-500/30 bg-rose-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-secondary)]">
                          Question {sIdx + 1} · {snap.difficulty}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            snap.isCorrect
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {snap.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {snap.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <div className="font-semibold text-sm text-[var(--text-primary)]">
                        {snap.questionText}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                          <span className="text-[var(--text-secondary)] font-bold uppercase block text-[9px] mb-0.5">
                            Candidate Selected Answer:
                          </span>
                          <span className={snap.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {snap.selectedAnswer || 'No answer recorded'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                          <span className="text-[var(--text-secondary)] font-bold uppercase block text-[9px] mb-0.5">
                            Correct Answer:
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {snap.correctAnswer}
                          </span>
                        </div>
                      </div>

                      {snap.explanation && (
                        <div className="text-[11px] text-[var(--text-secondary)] pt-1 italic">
                          Rationale: {snap.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => {
                      setSelectedAttemptId(null);
                      setAttemptDetail(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)]"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CONFIGURATION */}
      {/* ========================================================================= */}
      {editingConfigSkill && (
        <div className="fixed inset-0 z-50 bg-[var(--text-primary)]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-left space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Configure {editingConfigSkill.name} Assessment
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Specify test parameters stored in the database.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Questions per Assessment
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={configForm.questionsCount}
                  onChange={(e) => setConfigForm({ ...configForm, questionsCount: parseInt(e.target.value, 10) || 10 })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={configForm.passPercentage}
                  onChange={(e) => setConfigForm({ ...configForm, passPercentage: parseInt(e.target.value, 10) || 70 })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={configForm.timeLimitMinutes}
                  onChange={(e) => setConfigForm({ ...configForm, timeLimitMinutes: parseInt(e.target.value, 10) || 20 })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingConfigSkill(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)]"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
