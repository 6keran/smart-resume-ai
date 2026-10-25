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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* ── Page Header ── */}
        <div className="text-left space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Dedicated ATS Evaluation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            ATS Resume Score
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Upload your resume to evaluate its compatibility with applicant tracking systems. Audit keyword density, discover missing technical qualifications, and inspect actionable formatting feedback.
          </p>
        </div>

        {/* ── ATS Evaluation Disclaimer ── */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 shadow-xs">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-900 dark:text-white font-semibold">Evaluation Disclaimer:</strong> The ATS Score is an algorithmic compatibility estimate calculated from your resume content and job description. It is not an official score from any commercial ATS vendor and does not guarantee interview callbacks or hiring outcomes.
          </p>
        </div>

        {/* ── Upload & Input Section ── */}
        {!analysis && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6 space-y-5">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Upload File (.pdf, .docx, .txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'paste'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Max file size: 10MB</span>
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
                      className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Click to upload or drag and drop your resume
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Supported formats: PDF, DOCX, TXT (up to 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
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
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Optional Job Description Alignment */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobContext(!showJobContext)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{showJobContext ? 'Hide Target Job Context' : 'Add Target Job Description (Optional for Role-Specific Match)'}</span>
                  {showJobContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showJobContext && (
                  <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Target Job Title
                        </label>
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Target Company
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. Acme Cloud Systems"
                          className="w-full h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Job Description
                      </label>
                      <textarea
                        rows={3}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the required skills, responsibilities, and qualifications from the job posting..."
                        className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{errorMessage}</p>
                    {validationError?.signals?.negativeIndicators && validationError.signals.negativeIndicators.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                        {validationError.signals.negativeIndicators.map((neg: string, idx: number) => (
                          <li key={idx}>{neg}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Real-time semantic ATS calculation</span>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (activeTab === 'upload' ? !selectedFile : !pastedText.trim())}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Analysis Complete: {selectedFile ? selectedFile.name : 'Pasted Resume Text'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  • {new Date(analysis.analyzedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={resetAnalysis}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Analyze Another Resume</span>
              </button>
            </div>

            {/* 1. Hero Score Banner (Prominently Arranged) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score Dial */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="relative w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center mb-3 shadow-xs border-blue-600 dark:border-blue-500">
                    <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                      {analysis.overallAtsScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      / 100
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Overall ATS Score
                  </span>
                  <span className={`text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full border ${getScoreColor(analysis.overallAtsScore)}`}>
                    {analysis.overallAtsScore >= 75 ? 'Recruiter Ready' : analysis.overallAtsScore >= 50 ? 'Needs Optimization' : 'Action Required'}
                  </span>
                </div>

                {/* Right: Score Interpretation & Sub-Metrics */}
                <div className="md:col-span-8 space-y-4 text-left">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {getScoreLabel(analysis.overallAtsScore)}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {analysis.summaryFeedback || 'Your resume has been processed by the automated recruitment heuristics engine across structure, keyword density, and formatting.'}
                    </p>
                  </div>

                  {/* 4 Genuine Sub-Score Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Keywords</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{analysis.keywordMatchScore}%</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Formatting</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{analysis.formattingScore}%</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Content Quality</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{analysis.contentScore}%</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Section Structure</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{analysis.sectionScore}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Word Count: <strong>{analysis.wordCount} words</strong> (optimal range for single/two-page ATS resumes is 450–900 words).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Skills & Keyword Analysis (Matches vs Missing Gaps) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Matched Keywords */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Matched Skills &amp; Keywords
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                    {analysis.detectedKeywords?.length || 0} Matched
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  These verified skills and technologies were discovered by the ATS parser in your work history.
                </p>

                {analysis.detectedKeywords && analysis.detectedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.detectedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No industry-standard technical keywords detected.</p>
                )}
              </div>

              {/* Missing Relevant Keywords */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Missing High-Impact Keywords
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                    {analysis.missingKeywords?.length || 0} Gaps
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  Incorporating these missing terms into factual experience bullets will elevate your ranking in ATS searches.
                </p>

                {analysis.missingKeywords && analysis.missingKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.missingKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs font-medium text-amber-800 dark:text-amber-300"
                      >
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    No major keyword omissions identified for this profile.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Resume Structure & Formatting Feedback */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 text-left shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Structure &amp; Formatting Feedback
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Parser Heuristics</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Verified Strengths ({analysis.strengths?.length || 0})
                  </h4>
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.strengths.map((str, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            {str.title}
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            {str.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific strengths recorded.</p>
                  )}
                </div>

                {/* Weaknesses / Formatting Issues */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Formatting &amp; Parseability Weaknesses ({analysis.weaknesses?.length || 0})
                  </h4>
                  {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.weaknesses.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{w.whatIsWrong}</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              w.severity === 'high'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {w.severity}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            {w.howToImprove}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Zero structural or formatting defects detected by the scanner.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Actionable Content Improvement Recommendations */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 text-left shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Prioritized Improvement Recommendations
                  </h3>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {analysis.topSuggestions?.length || 0} Action Items
                </span>
              </div>

              {analysis.topSuggestions && analysis.topSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {analysis.topSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                            {sug.rank || idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sug.section}: {sug.whatNeedsImprovement}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sug.priority === 'High'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {sug.priority} Priority
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed pl-7">
                        {sug.howToImprove}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No prioritized suggestions returned for this document.</p>
              )}
            </div>

            {/* 5. Next Steps Workflow Dock */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Next Steps: Refine and Export Your Resume
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Apply these recommendations in the fact-preserving Resume Improver, audit with the Interactive Analyzer, or export an exact A4 PDF.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href="/analyzer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <FileSearch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Interactive Analyzer</span>
                </Link>
                <Link
                  href="/improver"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Open Improver</span>
                </Link>
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
