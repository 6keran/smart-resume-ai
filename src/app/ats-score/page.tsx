'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileSearch,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Target,
  ShieldCheck,
  AlertCircle,
  X,
  FileCheck2,
  Wand2,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { ResumeAnalysisResult, ResumeValidationResult } from '@/types/resume';
import { ScoreRing } from '@/components/ui/ScoreRing';
import {
  PageTransition,
  ScrollReveal,
  StaggerGroup,
  StaggerChild,
  AnimatedCounter,
  AnimatedProgressBar,
} from '@/components/ui/MotionPrimitives';

export default function AtsScorePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Optional job context for role matching
  const [showJobContext, setShowJobContext] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ResumeValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    setValidationError(null);

    const validExtensions = ['.pdf', '.docx', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF, DOCX, or plain text (.txt) file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller document.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPastedText('');
    setErrorMessage(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    setErrorMessage(null);
    setValidationError(null);

    if (activeTab === 'upload' && !selectedFile) {
      setErrorMessage('Please select a PDF, DOCX, or text file to analyze.');
      return;
    }

    if (activeTab === 'paste' && !pastedText.trim()) {
      setErrorMessage('Please paste your resume text to analyze.');
      return;
    }

    setIsAnalyzing(true);

    try {
      let res: Response;

      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (jobDescription.trim()) formData.append('jobDescription', jobDescription.trim());
        if (jobTitle.trim()) formData.append('jobTitle', jobTitle.trim());
        if (company.trim()) formData.append('company', company.trim());

        res = await fetch('/api/resume/analyze', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/resume/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: pastedText.trim(),
            jobDescription: jobDescription.trim() || undefined,
            jobTitle: jobTitle.trim() || undefined,
            company: company.trim() || undefined,
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        if (res.status === 422 && errorData.validation) {
          setValidationError(errorData.validation);
          setErrorMessage(errorData.message || 'The uploaded file does not appear to be an authentic resume.');
        } else if (res.status === 429) {
          setErrorMessage('Rate limit reached for anonymous scans. Please wait a few moments or log in for unlimited evaluations.');
        } else {
          setErrorMessage(errorData.message || 'Failed to analyze resume. Please verify the document format and try again.');
        }
        setIsAnalyzing(false);
        return;
      }

      const data: ResumeAnalysisResult = await res.json();
      setAnalysis(data);
      setIsAnalyzing(false);

      // Scroll smoothly to results
      setTimeout(() => {
        const resultsEl = document.getElementById('ats-score-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: unknown) {
      console.error('ATS Score analysis error:', err);
      setErrorMessage('Network error while communicating with the analysis service. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    clearSelection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/40';
    return 'text-rose-600 dark:text-rose-400 border-rose-500 bg-rose-50 dark:bg-rose-950/40';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'High ATS Compatibility • Recruiter Ready';
    if (score >= 50) return 'Moderate ATS Compatibility • Needs Optimization';
    return 'Low ATS Compatibility • Critical Action Required';
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* ── Page Header ── */}
        <div className="bento-card p-6 sm:p-8 text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-xs font-semibold text-[var(--accent)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dedicated ATS Evaluation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            ATS Resume Score
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Upload your resume to evaluate its compatibility with applicant tracking systems. Audit keyword density, discover missing technical qualifications, and inspect actionable formatting feedback.
          </p>
        </div>

        {/* ── ATS Evaluation Disclaimer ── */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-xs text-[var(--text-secondary)] shadow-sm text-left">
          <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[var(--text-primary)] font-semibold">Evaluation Disclaimer:</strong> The ATS Score is an algorithmic compatibility estimate calculated from your resume content and job description. It is not an official score from any commercial ATS vendor and does not guarantee interview callbacks or hiring outcomes.
          </p>
        </div>

        {/* ── Upload & Input Section ── */}
        {!analysis && (
          <div className="space-y-6">
            <div className="bento-card p-6 sm:p-8 space-y-5 text-left">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4">
                <div className="flex items-center gap-1.5 p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'upload'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Upload File (.pdf, .docx, .txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'paste'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono hidden sm:inline">Max file size: 10MB</span>
              </div>

              {/* Upload Drop Zone */}
              {activeTab === 'upload' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all subtle-grid overflow-hidden ${
                        isDragging
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01] shadow-[var(--shadow-glass-hover)] ring-4 ring-[var(--accent)]/20'
                          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--accent)]/60 hover:bg-[var(--glass-bg-elevated)] shadow-[var(--shadow-glass)]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/25 text-[var(--accent)] flex items-center justify-center mx-auto mb-3 shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Click to upload or drag and drop your resume
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Supported formats: PDF, DOCX, TXT (up to 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/25">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        aria-label="Remove selected file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your raw resume text here (experience, summary, skills, and education)..."
                    className="w-full p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-secondary)] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              )}

              {/* Optional Job Description Alignment */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobContext(!showJobContext)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{showJobContext ? 'Hide Target Job Context' : 'Add Target Job Description (Optional for Role-Specific Match)'}</span>
                  {showJobContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showJobContext && (
                  <div className="mt-3 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-secondary)]/60 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">
                          Target Job Title
                        </label>
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full h-9 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">
                          Target Company
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. Acme Cloud Systems"
                          className="w-full h-9 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-[var(--text-secondary)] mb-1">
                        Job Description
                      </label>
                      <textarea
                        rows={3}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the required skills, responsibilities, and qualifications from the job posting..."
                        className="w-full p-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-200">{errorMessage}</p>
                    {validationError?.signals?.negativeIndicators && validationError.signals.negativeIndicators.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
                        {validationError.signals.negativeIndicators.map((neg: string, idx: number) => (
                          <li key={idx}>{neg}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time semantic ATS calculation</span>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  data-magnetic="true"
                  disabled={isAnalyzing || (activeTab === 'upload' ? !selectedFile : !pastedText.trim())}
                  className="btn-primary py-2.5 px-7 shadow-md transition-all active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating ATS Compatibility...</span>
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>Analyze Resume</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ATS Score Results View ── */}
        {analysis && (
          <div id="ats-score-results" className="space-y-6">
            {/* Top Results Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-xs">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Analysis Complete: {selectedFile ? selectedFile.name : 'Pasted Resume Text'}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                  • {new Date(analysis.analyzedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={resetAnalysis}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Analyze Another Resume</span>
              </button>
            </div>

            {/* 1. Hero Score Banner (Prominently Arranged) */}
            <div className="bento-card p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score Dial */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl glass-card text-center">
                  <div className="mb-3">
                    <ScoreRing score={analysis.overallAtsScore} size={124} strokeWidth={8} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Overall ATS Score
                  </span>
                  <span className={`text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full border ${getScoreColor(analysis.overallAtsScore)}`}>
                    {analysis.overallAtsScore >= 75 ? 'Recruiter Ready' : analysis.overallAtsScore >= 50 ? 'Needs Optimization' : 'Action Required'}
                  </span>
                </div>

                {/* Right: Score Interpretation & Sub-Metrics */}
                <div className="md:col-span-8 space-y-4 text-left">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {getScoreLabel(analysis.overallAtsScore)}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {analysis.summaryFeedback || 'Your resume has been processed by the automated recruitment heuristics engine across structure, keyword density, and formatting.'}
                    </p>
                  </div>

                  {/* 4 Genuine Sub-Score Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Keywords</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{analysis.keywordMatchScore}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Formatting</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{analysis.formattingScore}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Content Quality</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{analysis.contentScore}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)]">
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Section Structure</span>
                      <span className="text-lg font-bold text-[var(--text-primary)]">{analysis.sectionScore}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pt-1">
                    <Info className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>Word Count: <strong className="text-[var(--text-primary)]">{analysis.wordCount} words</strong> (optimal range for single/two-page ATS resumes is 450–900 words).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Skills & Keyword Analysis (Matches vs Missing Gaps) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Matched Keywords */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Matched Skills &amp; Keywords
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {analysis.detectedKeywords?.length || 0} Matched
                  </span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-snug">
                  These verified skills and technologies were discovered by the ATS parser in your work history.
                </p>

                {analysis.detectedKeywords && analysis.detectedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.detectedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-300"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] italic">No industry-standard technical keywords detected.</p>
                )}
              </div>

              {/* Missing Relevant Keywords */}
              <div className="bento-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Missing High-Impact Keywords
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    {analysis.missingKeywords?.length || 0} Gaps
                  </span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-snug">
                  Incorporating these missing terms into factual experience bullets will elevate your ranking in ATS searches.
                </p>

                {analysis.missingKeywords && analysis.missingKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.missingKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300"
                      >
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-medium">
                    No major keyword omissions identified for this profile.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Resume Structure & Formatting Feedback */}
            <div className="bento-card p-6 space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Structure &amp; Formatting Feedback
                  </h3>
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono">Parser Heuristics</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Verified Strengths ({analysis.strengths?.length || 0})
                  </h4>
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.strengths.map((str, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-xs space-y-1">
                          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {str.title}
                          </span>
                          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                            {str.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)] italic">No specific strengths recorded.</p>
                  )}
                </div>

                {/* Weaknesses / Formatting Issues */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Formatting &amp; Parseability Weaknesses ({analysis.weaknesses?.length || 0})
                  </h4>
                  {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.weaknesses.map((w, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-primary)]">{w.whatIsWrong}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              w.severity === 'high'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            }`}>
                              {w.severity}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                            {w.howToImprove}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400 font-medium">
                      Zero structural or formatting defects detected by the scanner.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Actionable Content Improvement Recommendations */}
            <div className="bento-card p-6 space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Prioritized Improvement Recommendations
                  </h3>
                </div>
                <span className="text-xs text-[var(--accent)] font-semibold">
                  {analysis.topSuggestions?.length || 0} Action Items
                </span>
              </div>

              {analysis.topSuggestions && analysis.topSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {analysis.topSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center font-bold text-[10px]">
                            {sug.rank || idx + 1}
                          </span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {sug.section}: {sug.whatNeedsImprovement}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sug.priority === 'High'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25'
                        }`}>
                          {sug.priority} Priority
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed pl-7">
                        {sug.howToImprove}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">No prioritized suggestions returned for this document.</p>
              )}
            </div>

            {/* 5. Next Steps Workflow Dock */}
            <div className="bento-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Next Steps: Refine and Export Your Resume
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Apply these recommendations in the fact-preserving Resume Improver, audit with the Interactive Analyzer, or export an exact A4 PDF.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/analyzer"
                  className="btn-secondary text-xs py-2 px-4 rounded-full inline-flex items-center gap-1.5"
                >
                  <FileSearch className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Interactive Analyzer</span>
                </Link>
                <Link
                  href="/improver"
                  className="btn-primary text-xs py-2 px-4 rounded-full inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Open Improver</span>
                </Link>
                <Link
                  href="/builder"
                  className="btn-secondary text-xs py-2 px-4 rounded-full inline-flex items-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>A4 Builder</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
