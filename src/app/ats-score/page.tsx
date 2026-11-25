'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
import { AtsExplainabilityBreakdown } from '@/components/ats/AtsExplainabilityBreakdown';

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

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B]" />
          <span>High Compatibility • Recruiter Ready</span>
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-[#A96812]" />
          <span>Moderate Compatibility • Needs Optimization</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5 text-[#C43D43]" />
        <span>Low Compatibility • Immediate Fixes Needed</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-10 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <div className="reference-workspace-heading text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dedicated ATS Evaluation Engine</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
            ATS Resume Score
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Evaluate your resume against enterprise applicant tracking systems. Detect missing keywords, verify clean formatting, and receive clear, actionable steps to increase your interview callback rate.
          </p>
        </div>

        {/* ── Upload & Input Section ── */}
        {!analysis && (
          <div className="space-y-6">
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 space-y-6 text-left shadow-sm">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div role="tablist" aria-label="Resume input mode" className="flex items-center gap-2 p-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] relative">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'upload'}
                    type="button"
                    onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
                    className={`px-4 py-2 rounded-md text-[14px] font-semibold transition-colors cursor-pointer relative z-10 ${
                      activeTab === 'upload'
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {activeTab === 'upload' && (
                      <motion.div
                        layoutId="ats-tab-pill"
                        className="absolute inset-0 bg-white rounded-md shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    Upload Resume File
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'paste'}
                    type="button"
                    onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
                    className={`px-4 py-2 rounded-md text-[14px] font-semibold transition-colors cursor-pointer relative z-10 ${
                      activeTab === 'paste'
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {activeTab === 'paste' && (
                      <motion.div
                        layoutId="ats-tab-pill"
                        className="absolute inset-0 bg-white rounded-md shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    Paste Text
                  </button>
                </div>
                <span className="text-[13px] text-[var(--text-secondary)] hidden sm:inline">Supported: PDF, DOCX, TXT (Max 10MB)</span>
              </div>

              {/* Upload Drop Zone / Paste Area */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                >
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
                          role="button"
                          tabIndex={0}
                          aria-label="Upload resume file"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                            isDragging
                              ? 'border-[var(--accent)] bg-blue-50/50 scale-[1.01]'
                              : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:bg-white'
                          }`}
                        >
                          <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center mx-auto mb-3 shadow-xs">
                            <UploadCloud className="w-7 h-7" />
                          </div>
                          <p className="text-[16px] font-semibold text-[var(--text-primary)]">
                            Click to upload or drag and drop your resume
                          </p>
                          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
                            Accepts standard PDF, DOCX, or plain text resumes
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-[13px] text-[var(--text-secondary)]">
                                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearSelection}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#C43D43] hover:bg-red-50 transition-colors cursor-pointer"
                            aria-label="Remove selected file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="ats-paste-textarea" className="sr-only">
                        Paste Resume Text
                      </label>
                      <textarea
                        id="ats-paste-textarea"
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste your raw resume text here (experience, summary, skills, and education)..."
                        aria-label="Paste resume text"
                        className="reference-panel w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[14px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Optional Job Description Alignment */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowJobContext(!showJobContext)}
                  className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <Target className="w-4 h-4" />
                  <span>{showJobContext ? 'Hide Target Job Context' : 'Add Target Job Description (Optional for Role-Specific Match)'}</span>
                  {showJobContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showJobContext && (
                  <div className="mt-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-3 text-[14px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="ats-target-job-title" className="block font-semibold text-[var(--text-primary)] mb-1">
                          Target Job Title
                        </label>
                        <input
                          id="ats-target-job-title"
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Full Stack Developer"
                          className="w-full h-10 px-3 rounded-lg border border-[var(--border-color)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ats-target-company" className="block font-semibold text-[var(--text-primary)] mb-1">
                          Target Company
                        </label>
                        <input
                          id="ats-target-company"
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. Acme Tech"
                          className="w-full h-10 px-3 rounded-lg border border-[var(--border-color)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ats-job-description" className="block font-semibold text-[var(--text-primary)] mb-1">
                        Job Description
                      </label>
                      <textarea
                        id="ats-job-description"
                        rows={3}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste required skills and qualifications from the target job posting..."
                        className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-white text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-[14px] text-[#C43D43] flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{errorMessage}</p>
                    {validationError?.signals?.negativeIndicators && validationError.signals.negativeIndicators.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 text-[13px] text-red-700">
                        {validationError.signals.negativeIndicators.map((neg: string, idx: number) => (
                          <li key={idx}>{neg}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-[14px] text-[var(--text-secondary)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
                  <span>Real-time semantic ATS scoring</span>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (activeTab === 'upload' ? !selectedFile : !pastedText.trim())}
                  className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[15px] font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Evaluating ATS Compatibility...</span>
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-4 h-4" />
                      <span>Analyze Resume</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Disclaimer Accordion */}
            <details className="reference-panel group bg-white rounded-xl border border-[var(--border-color)] p-4 text-[13px] text-[var(--text-secondary)] shadow-xs">
              <summary className="font-medium text-[var(--text-primary)] cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[var(--accent)]" />
                  How ATS Scoring Works &amp; Disclaimer
                </span>
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 text-[var(--text-secondary)]" />
              </summary>
              <p className="mt-3 leading-relaxed">
                The ATS Score is an algorithmic compatibility estimate calculated from your resume content, section balance, formatting parseability, and target job keywords. It models modern ATS engines like Workday, Greenhouse, and Lever. It is not an official score from any commercial ATS vendor and does not guarantee interview callbacks.
              </p>
            </details>
          </div>
        )}

        {/* ── ATS Score Results View ── */}
        {analysis && (
          <motion.div
            id="ats-score-results"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Top Navigation Bar */}
            <div className="reference-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-white shadow-xs">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#16845B]" />
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  Analysis Complete: {selectedFile ? selectedFile.name : 'Pasted Resume Text'}
                </span>
                <span className="text-[13px] text-[var(--text-secondary)]">
                  • {new Date(analysis.analyzedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={resetAnalysis}
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Analyze Another Resume</span>
              </button>
            </div>

            {/* 1. TOP SUMMARY CARD (Hero Score Banner with ONE Main Action) */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 space-y-6 shadow-sm text-left">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score Dial */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-center">
                  <div className="mb-3">
                    <ScoreRing score={analysis.overallAtsScore} size={130} strokeWidth={9} />
                  </div>
                  <span className="text-[14px] font-bold tracking-wide text-[var(--text-primary)] uppercase">
                    Overall ATS Score
                  </span>
                  <div className="mt-2">
                    {getScoreBadge(analysis.overallAtsScore)}
                  </div>
                </div>

                {/* Right: Summary & ONE Primary Action */}
                <div className="md:col-span-8 space-y-4">
                  <div>
                    <h2 className="text-[22px] font-bold text-[var(--text-primary)]">
                      {analysis.overallAtsScore >= 75
                        ? 'High ATS Compatibility • Recruiter Ready'
                        : analysis.overallAtsScore >= 50
                        ? 'Moderate ATS Compatibility • Needs Optimization'
                        : 'Low ATS Compatibility • Critical Action Required'}
                    </h2>
                    <p className="text-[15px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {analysis.summaryFeedback || 'Your resume has been processed by automated recruitment heuristics across keyword density, section structure, and formatting.'}
                    </p>
                  </div>

                  {/* 4 Clean Sub-Score Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="text-[13px] font-semibold text-[var(--text-secondary)] block">Keywords</span>
                      <span className="text-[20px] font-bold text-[var(--text-primary)]">{analysis.keywordMatchScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="text-[13px] font-semibold text-[var(--text-secondary)] block">Formatting</span>
                      <span className="text-[20px] font-bold text-[var(--text-primary)]">{analysis.formattingScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="text-[13px] font-semibold text-[var(--text-secondary)] block">Content</span>
                      <span className="text-[20px] font-bold text-[var(--text-primary)]">{analysis.contentScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                      <span className="text-[13px] font-semibold text-[var(--text-secondary)] block">Structure</span>
                      <span className="text-[20px] font-bold text-[var(--text-primary)]">{analysis.sectionScore}%</span>
                    </div>
                  </div>

                  {/* ONE Main Action Button */}
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <Link
                      href="/improver"
                      className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[15px] font-semibold transition-all inline-flex items-center gap-2 shadow-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>Improve Resume with AI</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/builder"
                      className="reference-panel px-4 py-2.5 rounded-lg border border-[var(--border-color)] bg-white hover:bg-[var(--bg-primary)] text-[var(--text-primary)] text-[15px] font-semibold transition-all inline-flex items-center gap-2"
                    >
                      <FileEdit className="w-4 h-4 text-[var(--accent)]" />
                      <span>Open in Builder</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 1b. ATS EXPLAINABILITY & CATEGORY BREAKDOWN */}
            <AtsExplainabilityBreakdown analysis={analysis} />

            {/* 2. KEY PROBLEMS & FORMATTING DEFECTS */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 space-y-4 text-left shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-[#C43D43]" />
                  <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                    Key Problems &amp; Parseability Weaknesses
                  </h3>
                </div>
                <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-[#C43D43] border border-red-200">
                  {analysis.weaknesses?.length || 0} Issues Found
                </span>
              </div>

              {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                <div className="space-y-3">
                  {analysis.weaknesses.map((w, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[15px] text-[var(--text-primary)]">{w.whatIsWrong}</span>
                        <span className={`text-[12px] font-bold uppercase px-2.5 py-0.5 rounded-md ${
                          w.severity === 'high'
                            ? 'bg-red-50 text-[#C43D43] border border-red-200'
                            : 'bg-amber-50 text-[#A96812] border border-amber-200'
                        }`}>
                          {w.severity} priority
                        </span>
                      </div>
                      <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                        {w.howToImprove}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] text-[#16845B] font-medium flex items-center gap-2 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Zero formatting or parseability defects identified in this document.
                </p>
              )}
            </div>

            {/* 3. MISSING & MATCHED KEYWORDS (2 Clean Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Missing High-Impact Keywords */}
              <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#A96812]" />
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                      Missing Keywords
                    </h3>
                  </div>
                  <span className="text-[13px] font-semibold text-[#A96812] px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                    {analysis.missingKeywords?.length || 0} Missing
                  </span>
                </div>

                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  Add these missing terms to bullet points where you have authentic experience to boost keyword density.
                </p>

                {analysis.missingKeywords && analysis.missingKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analysis.missingKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[14px] font-medium text-amber-900"
                      >
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[#16845B] font-medium">
                    No major keyword omissions detected for this profile.
                  </p>
                )}
              </div>

              {/* Matched Skills */}
              <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#16845B]" />
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                      Detected Skills
                    </h3>
                  </div>
                  <span className="text-[13px] font-semibold text-[#16845B] px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                    {analysis.detectedKeywords?.length || 0} Matched
                  </span>
                </div>

                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  These verified skills and technologies were successfully indexed by the ATS parser.
                </p>

                {analysis.detectedKeywords && analysis.detectedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analysis.detectedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[14px] font-medium text-emerald-900"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B]" />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[var(--text-secondary)] italic">No standard technical keywords recognized.</p>
                )}
              </div>
            </div>

            {/* 4. TOP RECOMMENDATIONS */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 space-y-4 text-left shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                    Top Recommendations
                  </h3>
                </div>
                <span className="text-[13px] text-[var(--accent)] font-semibold">
                  {analysis.topSuggestions?.length || 0} Action Items
                </span>
              </div>

              {analysis.topSuggestions && analysis.topSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {analysis.topSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-[var(--accent)] flex items-center justify-center font-bold text-[12px]">
                            {sug.rank || idx + 1}
                          </span>
                          <span className="font-bold text-[16px] text-[var(--text-primary)]">
                            {sug.section}: {sug.whatNeedsImprovement}
                          </span>
                        </div>
                        <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-md ${
                          sug.priority === 'High'
                            ? 'bg-red-50 text-[#C43D43] border border-red-200'
                            : 'bg-blue-50 text-[var(--accent)] border border-blue-200'
                        }`}>
                          {sug.priority} Priority
                        </span>
                      </div>
                      <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-8">
                        {sug.howToImprove}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] text-[var(--text-secondary)]">No prioritized suggestions returned for this document.</p>
              )}
            </div>

            {/* 5. Progressive Disclosure: Verified Strengths & Document Diagnostics */}
            <details className="reference-panel group bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm text-left">
              <summary className="font-bold text-[17px] text-[var(--text-primary)] cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16845B]" />
                  Verified Strengths &amp; Detailed Parser Heuristics ({analysis.strengths?.length || 0})
                </span>
                <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-[var(--text-secondary)]" />
              </summary>
              <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-4">
                <div className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]">
                  <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>Word Count: <strong className="text-[var(--text-primary)]">{analysis.wordCount} words</strong> (optimal range for 1-2 page resumes is 450–900 words).</span>
                </div>

                {analysis.strengths && analysis.strengths.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.strengths.map((str, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
                        <span className="font-bold text-[14px] text-[var(--text-primary)] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#16845B] shrink-0" />
                          {str.title}
                        </span>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                          {str.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[var(--text-secondary)] italic">No specific strengths recorded.</p>
                )}
              </div>
            </details>
          </motion.div>
        )}
      </div>
    </div>
  );
}
