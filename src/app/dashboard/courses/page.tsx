'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Loader2,
  Play,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { YouTubeIcon } from '@/components/ui/YouTubeIcon';
import { YOUTUBE_ROADMAPS } from '@/lib/learning/youtubeResources';
import { SupportedSkill } from '@/types/skills';

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  totalLessons: number;
  durationMinutes: number;
  level: string;
  lessonsCompleted: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  completionDate: string | null;
  lastAccessedAt: string | null;
  progressPercentage: number;
}

export default function UserCoursesPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'youtube'>('courses');
  const [selectedSkill, setSelectedSkill] = useState<SupportedSkill>('Python');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAdvanceLesson = async (course: CourseItem) => {
    try {
      setUpdatingId(course.id);
      const nextCompleted = Math.min(course.totalLessons, course.lessonsCompleted + 1);

      const res = await fetch('/api/user/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          lessonsCompleted: nextCompleted,
        }),
      });

      if (res.ok) {
        await fetchCourses();
      }
    } catch (err) {
      console.error('Failed to update course progress:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: CourseItem['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] text-[10px] font-semibold">
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Career Courses & Learning Roadmaps
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Engineered learning tracks and curated YouTube video masterclasses to level up your engineering skills.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Structured Tracks ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <YouTubeIcon className="w-3.5 h-3.5 text-white" />
            <span>YouTube Roadmaps (11 Skills)</span>
          </button>
        </div>
      </div>

      {activeTab === 'youtube' ? (
        <div className="space-y-6 text-left">
          {/* Skill Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(YOUTUBE_ROADMAPS) as SupportedSkill[]).map((sk) => (
              <button
                key={sk}
                onClick={() => setSelectedSkill(sk)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedSkill === sk
                    ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-500/30'
                    : 'border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                {sk}
              </button>
            ))}
          </div>

          {YOUTUBE_ROADMAPS[selectedSkill] && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-red-500 mb-1">
                    <YouTubeIcon className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {selectedSkill} Masterclass Roadmaps
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                    {YOUTUBE_ROADMAPS[selectedSkill].overview}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                    Est. Study: {YOUTUBE_ROADMAPS[selectedSkill].recommendedStudyHours} Hours
                  </span>
                </div>
              </div>

              {/* Video Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {YOUTUBE_ROADMAPS[selectedSkill].resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between space-y-4 shadow-sm hover:border-[var(--accent)] transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-red-400 flex items-center gap-1">
                          <YouTubeIcon className="w-3.5 h-3.5 text-red-400" />
                          {res.channelName}
                        </span>
                        <span className="font-mono text-[var(--text-secondary)] px-2 py-0.5 rounded bg-[var(--bg-secondary)]">
                          {res.duration}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug group-hover:text-[var(--accent)] transition-colors">
                        {res.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {res.keyTakeaway}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {res.topicsCovered.map((topic, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <a
                      href={res.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Core Concepts and Retake Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Core Architectural Concepts
                  </h4>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-[var(--text-secondary)]">
                    {YOUTUBE_ROADMAPS[selectedSkill].coreConcepts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Proctored Assessment Retake Advice
                  </h4>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-[var(--text-secondary)]">
                    {YOUTUBE_ROADMAPS[selectedSkill].retakeExamTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)] mb-3" />
          <p className="text-xs text-[var(--text-secondary)]">Loading career courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No courses available currently
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
            Career tracks are currently undergoing curriculum review. Check back soon for upcoming learning paths.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => {
            const isCompleted = course.status === 'Completed';
            const isUpdating = updatingId === course.id;

            return (
              <div
                key={course.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-secondary)] p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-all duration-200 hover:border-[var(--accent)]/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                        {course.category}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                        {course.level}
                      </span>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                        Progress: {course.lessonsCompleted} of {course.totalLessons} Lessons
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-xs">
                        {course.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${course.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{course.durationMinutes} mins total</span>
                    </span>

                    {isCompleted ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed {course.completionDate ? new Date(course.completionDate).toLocaleDateString() : ''}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdvanceLesson(course)}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {course.lessonsCompleted === 0 ? 'Start Course' : 'Next Lesson'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
