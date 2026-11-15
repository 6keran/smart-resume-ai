'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Award,
  Wand2,
  Target,
  X,
  FileCheck,
  AlertCircle,
  Briefcase,
  Check,
  Edit2,
  RotateCcw,
  Building,
  ChevronDown,
  ChevronUp,
  FileEdit,
  TrendingUp,
  ShieldAlert,
  FileWarning,
  Info,
  Lock,
  ShieldCheck,
  BarChart3,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useResume, isImprovementAppliedToResume } from '@/context/ResumeContext';
import { ResumeValidationResult } from '@/types/resume';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { GlassCard } from '@/components/ui/GlassCard';

export type AnalyzerState =
  | 'IDLE'
  | 'FILE_SELECTED'
  | 'UPLOADING'
  | 'EXTRACTING'
  | 'ANALYZING'
  | 'SUCCESS'
  | 'ERROR'
  | 'INVALID_DOCUMENT'
  | 'UNCERTAIN_DOCUMENT';

export default function ResumeAnalyzerPage() {
  const router = useRouter();
  const {
    resumeData,
    updateSkills,
    targetJob,
    updateTargetJob,
    clearTargetJob,
    analysisResult,
    setAnalysisResult,
    runAnalysis,
    improvements,
    setImprovements,
    acceptImprovement,
    editImprovement,
    rejectImprovement,
    applyAllApprovedImprovements,
    regenerateImprovement,
  } = useResume();

  const [state, setState] = useState<AnalyzerState>(
    analysisResult ? 'SUCCESS' : 'IDLE'
  );

  useEffect(() => {
    if (analysisResult && state === 'IDLE') {
      setState('SUCCESS');
    }
  }, [analysisResult, state]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ResumeValidationResult | null>(null);
  const [stageDescription, setStageDescription] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showJobDrawer, setShowJobDrawer] = useState<boolean>(true);

  // Local job inputs for quick editing
  const [jobTitleInput, setJobTitleInput] = useState(targetJob.title || '');
  const [companyInput, setCompanyInput] = useState(targetJob.company || '');
  const [jobDescInput, setJobDescInput] = useState(targetJob.description || '');

  // Inline editing state for suggestions
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [applyToast, setApplyToast] = useState<string | null>(null);

  const [lastAnalysisAttempt, setLastAnalysisAttempt] = useState<{
    type: 'file' | 'text' | 'builder';
    file?: File | null;
    text?: string;
    title?: string;
    customJd?: string;
    customRole?: string;
    customCompany?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearStageTimers = useCallback(() => {
    stageTimersRef.current.forEach((t) => clearTimeout(t));
    stageTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearStageTimers();
    };
  }, [clearStageTimers]);

  const isBusy =
    state === 'UPLOADING' || state === 'EXTRACTING' || state === 'ANALYZING';

  useEffect(() => {
    if (targetJob.title) setJobTitleInput(targetJob.title);
    if (targetJob.company) setCompanyInput(targetJob.company);
    if (targetJob.description) setJobDescInput(targetJob.description);
  }, [targetJob]);

  // Temporary toast notification
  const triggerToast = (msg: string) => {
    setApplyToast(msg);
    setTimeout(() => {
      setApplyToast(null);
    }, 3200);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validate incoming file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a PDF, DOCX, or TXT file.',
      };
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: 'File size exceeds the 10MB limit. Please upload a smaller file.',
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: 'Unable to read this resume. The file appears to be empty.',
      };
    }

    return { valid: true };
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (isBusy) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      setState('ERROR');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setState('FILE_SELECTED');
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setState(analysisResult ? 'SUCCESS' : 'IDLE');
  };

  // Trigger analysis on file
  const handleStartAnalysis = async (fileToAnalyze?: File) => {
    if (isBusy) return;
    const file = fileToAnalyze || selectedFile;
    if (!file) return;

    clearStageTimers();
    setLastAnalysisAttempt({ type: 'file', file });
    setErrorMessage(null);
    setState('UPLOADING');
    setStageDescription('Reading resume and initiating secure pipeline...');

    try {
      const t1 = setTimeout(() => {
        setState((current) => {
          if (current === 'UPLOADING') {
            setStageDescription('Extracting resume structure and text content...');
            return 'EXTRACTING';
          }
          return current;
        });
      }, 500);

      const t2 = setTimeout(() => {
        setState((current) => {
          if (current === 'EXTRACTING') {
            setStageDescription(
              jobDescInput.trim()
                ? `Evaluating resume against target role (${jobTitleInput || 'Target Position'})...`
                : 'Analyzing ATS compatibility, checking keywords & generating top suggestions...'
            );
            return 'ANALYZING';
          }
          return current;
        });
      }, 1200);

      stageTimersRef.current.push(t1, t2);

      const result = await runAnalysis(
        file,
        jobDescInput.trim(),
        jobTitleInput.trim(),
        companyInput.trim()
      );
      clearStageTimers();
      if (result) {
        setState('SUCCESS');
      } else {
        throw new Error('AI analysis is temporarily unavailable. Please try again in a moment.');
      }
    } catch (err: any) {
      clearStageTimers();
      if (err?.validation) {
        setValidationResult(err.validation);
        if (err.validation.status === 'invalid') {
          setErrorMessage(err.validation.message || 'This document does not appear to be a resume or CV.');
          setState('INVALID_DOCUMENT');
          return;
        }
        if (err.validation.status === 'uncertain') {
          setErrorMessage(err.validation.message || 'This document has limited resume structure or appears incomplete.');
          setState('UNCERTAIN_DOCUMENT');
          return;
        }
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'AI analysis is temporarily unavailable. Please try again in a moment.';
      setErrorMessage(msg);
      setState('ERROR');
    }
  };

  // Handle direct text analysis (active resume or pasted)
  const handleTextAnalysis = async (
    text: string,
    title: string,
    customJd?: string,
    customRole?: string,
    customCompany?: string
  ) => {
    if (isBusy) return;
    if (!text || text.trim().length < 20) {
      setErrorMessage('Unable to read this resume. Text content is too short.');
      setState('ERROR');
      return;
    }

    clearStageTimers();
    setLastAnalysisAttempt({
      type: 'text',
      text,
      title,
      customJd,
      customRole,
      customCompany,
    });

    setSelectedFile(null);
    setValidationResult(null);
    setErrorMessage(null);
    setState('ANALYZING');
    setStageDescription(`Evaluating ${title} against ATS intelligence models...`);

    try {
      const jdToUse = typeof customJd === 'string' ? customJd : jobDescInput;
      const roleToUse = typeof customRole === 'string' ? customRole : jobTitleInput;
      const compToUse = typeof customCompany === 'string' ? customCompany : companyInput;

      const result = await runAnalysis(text, jdToUse, roleToUse, compToUse);
      clearStageTimers();
      if (result) {
        setState('SUCCESS');
      } else {
        throw new Error('AI analysis is temporarily unavailable. Please try again in a moment.');
      }
    } catch (err: any) {
      clearStageTimers();
      if (err?.validation) {
        setValidationResult(err.validation);
        if (err.validation.status === 'invalid') {
          setErrorMessage(err.validation.message || 'This document does not appear to be a resume or CV.');
          setState('INVALID_DOCUMENT');
          return;
        }
        if (err.validation.status === 'uncertain') {
          setErrorMessage(err.validation.message || 'This document has limited resume structure or appears incomplete.');
          setState('UNCERTAIN_DOCUMENT');
          return;
        }
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'AI analysis is temporarily unavailable. Please try again in a moment.';
      setErrorMessage(msg);
      setState('ERROR');
    }
  };

  // Proceed with analysis when document is flagged as uncertain
  const handleProceedWithUncertain = async () => {
    if (isBusy) return;
    clearStageTimers();
    setErrorMessage(null);
    setState('ANALYZING');
    setStageDescription('Proceeding with best-effort ATS heuristic analysis...');

    try {
      const inputToUse = selectedFile || customText || undefined;
      const result = await runAnalysis(
        inputToUse,
        jobDescInput.trim(),
        jobTitleInput.trim(),
        companyInput.trim(),
        { allowUncertainOverride: true }
      );
      clearStageTimers();
      if (result) {
        setState('SUCCESS');
      }
    } catch (err: any) {
      clearStageTimers();
      setErrorMessage(err.message || 'AI analysis is temporarily unavailable.');
      setState('ERROR');
    }
  };

  // Analyze active builder resume in 1 click
  const handleAnalyzeBuilderResume = () => {
    if (isBusy) return;
    setLastAnalysisAttempt({ type: 'builder' });
    const text = `${resumeData.personalInfo.fullName}\n${resumeData.personalInfo.headline || ''}\n${resumeData.summary}\nSkills: ${resumeData.skills.technical.join(', ')}\nExperience:\n${resumeData.experience
      .map((e) => `${e.role} at ${e.company}: ${e.bulletPoints.join(' ')}`)
      .join('\n')}`;

    handleTextAnalysis(text, `${resumeData.personalInfo.fullName || 'Builder'}'s Resume`);
  };

  // Retries the last analysis attempt without needing a page refresh
  const handleRetryAnalysis = () => {
    if (isBusy) return;
    if (lastAnalysisAttempt?.type === 'file' && (lastAnalysisAttempt.file || selectedFile)) {
      handleStartAnalysis(lastAnalysisAttempt.file || selectedFile!);
    } else if (lastAnalysisAttempt?.type === 'text' && lastAnalysisAttempt.text) {
      handleTextAnalysis(
        lastAnalysisAttempt.text,
        lastAnalysisAttempt.title || 'Resume',
        lastAnalysisAttempt.customJd,
        lastAnalysisAttempt.customRole,
        lastAnalysisAttempt.customCompany
      );
    } else if (lastAnalysisAttempt?.type === 'builder') {
      handleAnalyzeBuilderResume();
    } else if (selectedFile) {
      handleStartAnalysis(selectedFile);
    }
  };

  const handleResetToUpload = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setErrorMessage(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setState('IDLE');
  };

  // Apply single improvement with feedback
  const handleApplySuggestion = async (id: string, label: string) => {
    const success = await acceptImprovement(id);
    if (success) {
      triggerToast(`Applied suggestion for "${label}" and saved to your resume.`);
    } else {
      triggerToast(`Could not save suggestion for "${label}". Please check your connection and retry.`);
    }
  };

  // Edit and apply suggestion
  const handleSaveEdit = async (id: string, applyImmediately: boolean = false) => {
    const trimmed = editTextValue.trim();
    if (!trimmed) return;
    editImprovement(id, trimmed);
    setEditingSuggestionId(null);
    if (applyImmediately) {
      const ok = await acceptImprovement(id);
      if (ok) {
        triggerToast('Updated phrasing and saved to your resume.');
      } else {
        triggerToast('Could not save to server. Click "Apply" to retry.');
      }
    } else {
      triggerToast('Updated suggestion wording.');
    }
  };

  // Apply all approved
  const handleApplyAll = async () => {
    const ok = await applyAllApprovedImprovements();
    if (ok) {
      triggerToast('All prioritized suggestions applied and saved to your active resume.');
    } else {
      triggerToast('Could not save all suggestions to server. Please retry.');
    }
  };

  // Add missing skill from analysis to resume
  const handleAddMissingSkill = (skill: string) => {
    const existing = new Set(resumeData.skills.technical.map((s) => s.toLowerCase()));
    if (!existing.has(skill.toLowerCase())) {
      updateSkills({
        ...resumeData.skills,
        technical: [...resumeData.skills.technical, skill],
      });
      triggerToast(`Added "${skill}" to your Technical Skills.`);
    }
  };

  // Re-run analysis on modified resume
  const handleReanalyze = () => {
    handleAnalyzeBuilderResume();
  };

  const isJobSpecificMode = Boolean(
    analysisResult?.isJobSpecific || targetJob.description || jobDescInput.trim()
  );

  return (
    <div className="min-h-screen py-8 pb-28 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 text-[#20242B] animate-fade-in">
      {/* Toast Notification */}
      {applyToast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 bg-white border border-[#E5E8ED] px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg text-[14px] font-semibold text-[#20242B]">
          <CheckCircle2 className="w-4 h-4 text-[#16845B] shrink-0" />
          <span>{applyToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-8 text-left shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#3157C8] border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ATS Compatibility Check</span>
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-bold text-[#20242B] tracking-tight">
              Resume Analyzer &amp; ATS Optimizer
            </h1>
            <p className="text-[15px] text-[#626B78] leading-relaxed">
              Diagnose keyword alignment, verify structural parseability, and inspect actionable phrasing optimizations for enterprise applicant tracking systems.
            </p>
          </div>

          {/* Quick Actions Dock */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleAnalyzeBuilderResume}
              className="px-4 py-2 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[14px] font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <FileEdit className="w-4 h-4" />
              <span>Analyze Active Resume</span>
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setShowPasteModal(true)}
              className="px-4 py-2 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[14px] font-semibold cursor-pointer disabled:opacity-50"
            >
              Paste Text
            </button>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN VIEW WHEN NOT IN SUCCESS STATE */}
      {state !== 'SUCCESS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Upload Dropzone & Interactive Status (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Multi-stage Animated Loading View */}
            {isBusy ? (
              <div className="bg-white rounded-2xl border border-[#E5E8ED] p-10 text-center space-y-6 shadow-sm relative overflow-hidden">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="w-20 h-20 rounded-full border-4 border-[#E5E8ED] border-t-[#3157C8] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu className="w-8 h-8 text-[#3157C8] animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#3157C8] uppercase tracking-wider border border-blue-200">
                    {state === 'UPLOADING' && 'Step 1: Reading document'}
                    {state === 'EXTRACTING' && 'Step 2: Extracting text'}
                    {state === 'ANALYZING' && 'Step 3: Analyzing ATS match'}
                  </div>
                  <h3 className="text-[20px] font-bold text-[#20242B]">
                    {stageDescription || 'Evaluating resume architecture...'}
                  </h3>
                  <p className="text-[14px] text-[#626B78] leading-relaxed">
                    Cross-referencing formatting, bullet strength, and keyword density against enterprise ATS standards.
                  </p>
                </div>

                <div className="max-w-sm mx-auto w-full bg-[#F6F7F9] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#E5E8ED]">
                  <div
                    className="bg-[#3157C8] h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width:
                        state === 'UPLOADING'
                          ? '35%'
                          : state === 'EXTRACTING'
                          ? '70%'
                          : '94%',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Dropzone / File Ready Card */
              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-300 text-center ${
                  dragActive
                    ? 'border-[#3157C8] bg-blue-50/50 scale-[1.01]'
                    : 'border-[#E5E8ED] bg-[#F6F7F9] hover:border-[#3157C8] hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="resume-file-input"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Idle / Error State within Dropzone */}
                {(!selectedFile || state === 'IDLE' || state === 'ERROR') && (
                  <div className="space-y-5">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 text-[#3157C8] border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
                      <UploadCloud className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-[20px] font-bold text-[#20242B]">
                        Drop your resume here to begin
                      </h3>
                      <p className="text-[14px] text-[#626B78] max-w-md mx-auto leading-relaxed">
                        Instant deep-scan for ATS compatibility, keyword density, and bullet rewrite opportunities.
                      </p>
                    </div>

                    {/* Supported Formats Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] font-medium">
                      <span className="px-3 py-1 rounded-full bg-white border border-[#E5E8ED] text-[#626B78]">
                        PDF (ATS Safe)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-[#E5E8ED] text-[#626B78]">
                        DOCX
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-[#E5E8ED] text-[#626B78]">
                        TXT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white border border-[#E5E8ED] text-[#626B78]">
                        Max 10MB
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <label
                        htmlFor="resume-file-input"
                        className="px-5 py-2.5 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[14px] font-semibold cursor-pointer inline-flex items-center gap-2 shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Select File from Device</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAnalyzeBuilderResume}
                        className="px-4 py-2.5 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[14px] font-semibold cursor-pointer inline-flex items-center gap-2"
                      >
                        <FileEdit className="w-4 h-4 text-[#3157C8]" />
                        <span>Use Active Resume</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* File Selected State */}
                {selectedFile && state === 'FILE_SELECTED' && (
                  <div className="space-y-6">
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 text-[#16845B] mx-auto flex items-center justify-center shadow-xs border border-emerald-200">
                      <FileCheck className="w-7 h-7" />
                    </div>

                    <div className="max-w-md mx-auto p-4 rounded-xl bg-white border border-[#E5E8ED] space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-[#3157C8] shrink-0" />
                          <div className="text-left min-w-0">
                            <p className="text-[15px] font-bold text-[#20242B] truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-[13px] text-[#626B78]">
                              {formatFileSize(selectedFile.size)} · Validated &amp; ready for parsing
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          title="Remove file"
                          className="p-1.5 rounded-lg text-[#626B78] hover:text-[#C43D43] transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartAnalysis()}
                        className="px-6 py-2.5 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[15px] font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Run Full ATS Analysis</span>
                      </button>
                      <label
                        htmlFor="resume-file-input"
                        className="px-4 py-2.5 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[14px] font-semibold cursor-pointer inline-flex items-center gap-2"
                      >
                        Replace File
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INVALID DOCUMENT Banner */}
            {state === 'INVALID_DOCUMENT' && (
              <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-left space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                    <ShieldAlert className="w-5 h-5 text-[#C43D43]" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-[#C43D43] border border-red-200">
                      Document Validation Failed
                    </div>
                    <h4 className="text-[17px] font-bold text-[#20242B]">
                      This document does not appear to be a resume or CV.
                    </h4>
                    <p className="text-[14px] text-[#626B78] leading-relaxed">
                      {validationResult?.detectedType
                        ? `Identified content: ${validationResult.detectedType}. `
                        : ''}
                      Smart Resume AI requires an authentic resume or CV with career sections (such as work experience, education, or skills) to perform ATS scoring. Invoices, assignments, certificates, and specifications cannot be analyzed.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-red-200">
                  <button
                    type="button"
                    onClick={handleResetToUpload}
                    className="px-4 py-2 rounded-lg bg-[#C43D43] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Upload Another Document
                  </button>
                </div>
              </div>
            )}

            {/* UNCERTAIN DOCUMENT Banner */}
            {state === 'UNCERTAIN_DOCUMENT' && (
              <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 text-left space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                    <FileWarning className="w-5 h-5 text-[#A96812]" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-[#A96812] border border-amber-200">
                      Uncertain Document Structure
                    </div>
                    <h4 className="text-[17px] font-bold text-[#20242B]">
                      We couldn&apos;t clearly verify this document as a resume.
                    </h4>
                    <p className="text-[14px] text-[#626B78] leading-relaxed">
                      The uploaded document has limited standard resume sections (such as work experience, education, or skills) or is very brief. ATS systems often struggle to parse incomplete formats.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={handleResetToUpload}
                    className="px-4 py-2 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Upload a Clearer Resume
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedWithUncertain}
                    className="px-4 py-2 rounded-lg border border-[#E5E8ED] bg-white text-[#20242B] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Proceed with Best-Effort Analysis
                  </button>
                </div>
              </div>
            )}

            {/* ERROR Banner */}
            {state === 'ERROR' && errorMessage && (
              <div className="p-5 rounded-2xl border border-red-200 bg-red-50 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#C43D43] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-bold text-[#C43D43]">Analysis Error</h4>
                    <p className="text-[14px] text-[#20242B] leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-8">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleRetryAnalysis}
                    className="px-3.5 py-1.5 rounded-md bg-[#C43D43] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Analysis
                  </button>
                  {analysisResult && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setState('SUCCESS')}
                      className="px-3.5 py-1.5 rounded-md border border-[#E5E8ED] bg-white text-[13px] text-[#20242B] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Back to Previous Results
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToUpload}
                    className="px-3.5 py-1.5 rounded-md border border-[#E5E8ED] bg-white text-[13px] text-[#20242B] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Upload Another File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Target Job Configuration & ATS Benchmarks Checklist (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Target Job Configuration Drawer Card */}
            <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 space-y-4 text-left shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3157C8] border border-blue-200 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#20242B]">
                      Target Role Tailoring
                    </h3>
                    <p className="text-[13px] text-[#626B78]">
                      Optional: Match keywords to specific job
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    isJobSpecificMode
                      ? 'bg-blue-50 text-[#3157C8] border border-blue-200'
                      : 'bg-[#F6F7F9] text-[#626B78] border border-[#E5E8ED]'
                  }`}
                >
                  {isJobSpecificMode ? 'Job Mode' : 'General Mode'}
                </span>
              </div>

              {/* Job Inputs */}
              <div className="space-y-3 pt-2 border-t border-[#E5E8ED]">
                <div>
                  <label className="block text-[14px] font-semibold text-[#20242B] mb-1.5">
                    Target Job Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-3 text-[#626B78]" />
                    <input
                      type="text"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={jobTitleInput}
                      onChange={(e) => {
                        setJobTitleInput(e.target.value);
                        updateTargetJob({ title: e.target.value });
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#E5E8ED] text-[14px] text-[#20242B] placeholder:text-[#626B78] focus:outline-none focus:border-[#3157C8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-[#20242B] mb-1.5">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-3 text-[#626B78]" />
                    <input
                      type="text"
                      placeholder="e.g. Stripe, Airbnb, Google"
                      value={companyInput}
                      onChange={(e) => {
                        setCompanyInput(e.target.value);
                        updateTargetJob({ company: e.target.value });
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#E5E8ED] text-[14px] text-[#20242B] placeholder:text-[#626B78] focus:outline-none focus:border-[#3157C8]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[14px] font-semibold text-[#20242B]">
                      Job Description &amp; Requirements
                    </label>
                    {jobDescInput.trim() && (
                      <span className="text-[12px] text-[#3157C8] font-semibold">
                        {jobDescInput.split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={jobDescInput}
                    onChange={(e) => {
                      setJobDescInput(e.target.value);
                      updateTargetJob({ description: e.target.value });
                    }}
                    placeholder="Paste the job description to calculate keyword match % and uncover missing skills..."
                    className="w-full p-3 rounded-lg bg-white border border-[#E5E8ED] text-[14px] text-[#20242B] placeholder:text-[#626B78] focus:outline-none focus:border-[#3157C8] resize-y leading-relaxed"
                  />
                </div>

                {jobDescInput && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setJobTitleInput('');
                        setCompanyInput('');
                        setJobDescInput('');
                        clearTargetJob();
                        triggerToast('Target job cleared.');
                      }}
                      className="text-[13px] text-[#C43D43] hover:underline font-semibold cursor-pointer"
                    >
                      Clear Target Job
                    </button>
                    <span className="text-[13px] text-[#16845B] font-medium">
                      ✓ Active for next analysis
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Expandable ATS Criteria & Checklist Preview */}
            <details className="group bg-white rounded-2xl border border-[#E5E8ED] p-5 shadow-sm text-left">
              <summary className="font-bold text-[16px] text-[#20242B] cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3157C8]" />
                  What ATS Scanners Look For (4 Pillars)
                </span>
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 text-[#626B78]" />
              </summary>

              <div className="space-y-3 mt-4 pt-3 border-t border-[#E5E8ED]">
                <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#20242B] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Keyword &amp; Hard Skill Density
                    </span>
                    <span className="text-[12px] font-bold text-[#3157C8]">35% Weight</span>
                  </div>
                  <p className="text-[13px] text-[#626B78] leading-relaxed">
                    Identifies core programming languages, frameworks, cloud platforms, and domain terms matching the target job.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#20242B] flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#16845B]" />
                      Quantified Bullet Impact (XYZ)
                    </span>
                    <span className="text-[12px] font-bold text-[#3157C8]">25% Weight</span>
                  </div>
                  <p className="text-[13px] text-[#626B78] leading-relaxed">
                    Evaluates metrics, percentages, revenue, latency reductions, and strong active past-tense verbs.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#20242B] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#3157C8]" />
                      Section Architecture &amp; Parsing
                    </span>
                    <span className="text-[12px] font-bold text-[#3157C8]">20% Weight</span>
                  </div>
                  <p className="text-[13px] text-[#626B78] leading-relaxed">
                    Verifies standard header hierarchy, clean contact metadata, and machine-readable date ranges.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#20242B] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3157C8]" />
                      Brevity &amp; Recruiter Glance Rate
                    </span>
                    <span className="text-[12px] font-bold text-[#3157C8]">20% Weight</span>
                  </div>
                  <p className="text-[13px] text-[#626B78] leading-relaxed">
                    Ensures concise 1–2 page length, optimal bullet length, and elimination of generic filler phrases.
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* SUCCESS: COMPREHENSIVE ANALYSIS & IMPROVEMENT VIEW */}
      {state === 'SUCCESS' && analysisResult && !isBusy && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Hero Intelligence Dashboard Card */}
          <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-8 shadow-sm text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left">
              {/* Radial Overall Score Ring (4 cols) */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#F6F7F9] border border-[#E5E8ED] text-center space-y-3">
                <ScoreRing
                  score={analysisResult.overallAtsScore}
                  maxScore={100}
                  size={140}
                  strokeWidth={10}
                  subLabel="ATS Score"
                  showPercentage={false}
                />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide mt-1 bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B]" />
                    <span>
                      {analysisResult.overallAtsScore >= 85
                        ? 'Recruiter Ready'
                        : analysisResult.overallAtsScore >= 70
                        ? 'Competitive Baseline'
                        : 'Needs ATS Tuning'}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#626B78] mt-1.5">
                    Scored across 4 enterprise ATS algorithms
                  </p>
                </div>
              </div>

              {/* Score Breakdown Bars & Document Metadata (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E8ED]">
                  <div>
                    <h2 className="text-[22px] font-bold text-[#20242B]">
                      {selectedFile
                        ? selectedFile.name
                        : `${resumeData.personalInfo.fullName || 'Candidate'}'s Resume`}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[13px] text-[#626B78]">
                      <span>{analysisResult.wordCount} words analyzed</span>
                      <span>·</span>
                      {analysisResult.isJobSpecific ? (
                        <span className="text-[#3157C8] font-semibold">
                          Tailored for {analysisResult.jobTitle || 'Role'}
                          {analysisResult.company ? ` at ${analysisResult.company}` : ''}
                        </span>
                      ) : (
                        <span>General ATS Compatibility Scan</span>
                      )}
                      {analysisResult.engineDisplayName && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F6F7F9] text-[#626B78] border border-[#E5E8ED]">
                            <Sparkles className="w-3 h-3 text-[#3157C8]" />
                            {analysisResult.engineDisplayName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href="/builder?from=analyzer"
                      className="px-4 py-2 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span>Edit in Builder</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleReanalyze}
                      title="Re-run analysis to evaluate updated wording"
                      className="px-3.5 py-2 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-Score</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToUpload}
                      className="px-3.5 py-2 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Another</span>
                    </button>
                  </div>
                </div>

                {/* 4 Dimension Progress Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Keyword Match */}
                  <div className="p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-2">
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#626B78]">Keyword Alignment</span>
                      <span className="text-[#20242B] font-bold">
                        {analysisResult.keywordMatchScore}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E8ED] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#3157C8] h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.keywordMatchScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Formatting */}
                  <div className="p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-2">
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#626B78]">Formatting &amp; Parseability</span>
                      <span className="text-[#20242B] font-bold">
                        {analysisResult.formattingScore}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E8ED] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.formattingScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Content Score */}
                  <div className="p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-2">
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#626B78]">Content &amp; Bullet Impact</span>
                      <span className="text-[#20242B] font-bold">
                        {analysisResult.contentScore}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E8ED] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#16845B] h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.contentScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Section Score */}
                  <div className="p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-2">
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[#626B78]">Section Completeness</span>
                      <span className="text-[#20242B] font-bold">
                        {analysisResult.sectionScore}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E8ED] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#3157C8] h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysisResult.sectionScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Area A & Area B: Matched Skills and Recommended Keywords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Area A: Matched Skills */}
            <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 space-y-3 shadow-sm text-left">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E8ED]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
                  <h3 className="text-[17px] font-bold text-[#20242B]">
                    Matched Skills &amp; Competencies
                  </h3>
                </div>
                <span className="text-[13px] text-[#16845B] font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {analysisResult.matchedSkills?.length ?? analysisResult.detectedKeywords.length} Detected
                </span>
              </div>
              <p className="text-[14px] text-[#626B78] leading-relaxed">
                {analysisResult.isJobSpecific
                  ? 'Skills and competencies identified in your resume that directly align with the target job requirements:'
                  : 'Technical and domain skills detected in your resume:'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(analysisResult.matchedSkills && analysisResult.matchedSkills.length > 0
                  ? analysisResult.matchedSkills.map((m) => m.skill)
                  : analysisResult.detectedKeywords
                ).length > 0 ? (
                  (analysisResult.matchedSkills && analysisResult.matchedSkills.length > 0
                    ? analysisResult.matchedSkills.map((m) => m.skill)
                    : analysisResult.detectedKeywords
                  ).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 rounded-lg text-[14px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-[#16845B]" />
                      <span>{skill}</span>
                    </span>
                  ))
                ) : (
                  <p className="text-[14px] text-[#626B78] italic">
                    No standard technical skills were detected in the uploaded text.
                  </p>
                )}
              </div>
            </div>

            {/* Area B: Recommended Keywords */}
            <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 space-y-3 shadow-sm text-left">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E8ED]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3157C8]" />
                  <h3 className="text-[17px] font-bold text-[#20242B]">
                    Recommended Keywords &amp; Missing Skills
                  </h3>
                </div>
                <span className="text-[13px] text-[#3157C8] font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {(analysisResult.missingSkills && analysisResult.missingSkills.length > 0
                    ? analysisResult.missingSkills
                    : analysisResult.missingKeywords
                  ).length} Suggested
                </span>
              </div>
              <p className="text-[14px] text-[#626B78] leading-relaxed">
                {analysisResult.isJobSpecific
                  ? 'Key skills from the job posting not detected in your resume. Click "+" to append skills you have authentic experience with:'
                  : 'Common industry keywords for your field. Click "+" to add to your active resume:'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(analysisResult.missingSkills && analysisResult.missingSkills.length > 0
                  ? analysisResult.missingSkills
                  : analysisResult.missingKeywords
                ).map((skill) => {
                  const alreadyInResume = resumeData.skills.technical.some(
                    (s) => s.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleAddMissingSkill(skill)}
                      disabled={alreadyInResume}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        alreadyInResume
                          ? 'bg-[#F6F7F9] text-[#626B78] border-[#E5E8ED] cursor-default'
                          : 'bg-white hover:bg-blue-50 text-[#20242B] border-[#E5E8ED] hover:border-[#3157C8] shadow-xs'
                      }`}
                    >
                      {alreadyInResume ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16845B]" />
                          <span>{skill} (Added)</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-[#3157C8]">+</span>
                          <span>{skill}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive In-Place Improvement Engine */}
          <div className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8ED] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-[#3157C8]" />
                  <h2 className="text-[20px] font-bold text-[#20242B]">
                    Phrasing &amp; Bullet Rewrite Engine ({improvements.length || (analysisResult.topSuggestions?.length || 0)})
                  </h2>
                </div>
                <p className="text-[14px] text-[#626B78] mt-0.5">
                  Review side-by-side phrasing optimizations, edit content inline, and apply directly to your active resume with 1 click.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="px-4 py-2 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply All Approved</span>
                </button>
                <Link
                  href="/builder?from=analyzer"
                  className="px-4 py-2 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Go to Builder</span>
                </Link>
              </div>
            </div>

            {/* List of Improvement Cards with Visual Diff & Action Controls */}
            <div className="space-y-4">
              {(improvements.length > 0
                ? improvements
                : (analysisResult.topSuggestions || []).map((sug, idx) => ({
                    id: `sug_${idx + 1}`,
                    section: (sug.section?.toLowerCase().includes('experience')
                      ? 'experience'
                      : sug.section?.toLowerCase().includes('summary')
                      ? 'summary'
                      : sug.section?.toLowerCase().includes('project')
                      ? 'projects'
                      : sug.section?.toLowerCase().includes('education')
                      ? 'education'
                      : 'skills') as any,
                    field: sug.section || 'Resume Section',
                    originalContent: sug.extractedText || (sug as any).originalText || sug.whatNeedsImprovement,
                    improvedContent: sug.example || sug.howToImprove,
                    reasoning: `${sug.whatNeedsImprovement} ${sug.whyItMatters}`.trim(),
                    metricImpact: sug.priority ? `${sug.priority} Priority` : 'Actionable Feedback',
                    status: 'pending' as const,
                    isJobTailored: Boolean(isJobSpecificMode),
                    diff: {
                      before: sug.extractedText || (sug as any).originalText || sug.whatNeedsImprovement,
                      after: sug.example || sug.howToImprove,
                    },
                  }))
              ).map((item, idx) => {
                const isAccepted = item.status === 'accepted';
                const isRejected = item.status === 'rejected';
                const isAppliedToResume = isImprovementAppliedToResume(item, resumeData);
                const isEditing = editingSuggestionId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-6 border transition-all space-y-4 bg-white shadow-sm ${
                      isRejected
                        ? 'border-[#E5E8ED] opacity-60'
                        : isAppliedToResume
                        ? 'border-emerald-300'
                        : 'border-[#E5E8ED] hover:border-[#3157C8]'
                    }`}
                  >
                    {/* Header: Section, Field, Subtle Applied Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E5E8ED]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#F6F7F9] border border-[#E5E8ED] text-[#626B78] text-[12px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#F6F7F9] text-[#626B78] border border-[#E5E8ED]">
                          {item.section}
                        </span>
                        <span className="text-[14px] font-semibold text-[#20242B]">
                          {item.field}
                        </span>
                        {item.isJobTailored && (
                          <span className="text-[11px] font-medium text-[#3157C8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Role Alignment
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAppliedToResume && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[12px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 text-[#16845B]" />
                            Applied
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[12px] font-medium text-[#626B78] bg-[#F6F7F9] border border-[#E5E8ED]">
                            <X className="w-3.5 h-3.5 text-[#626B78]" />
                            Dismissed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visual Comparison: Current Phrasing vs Proposed AI Alternative */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Current Phrasing */}
                      <div className="p-4 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[#E5E8ED]">
                            <span className="text-[12px] font-semibold text-[#626B78] uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#626B78]" />
                              Current Phrasing
                            </span>
                            <span className="text-[11px] text-[#626B78] font-mono">
                              Extracted
                            </span>
                          </div>

                          <div className="text-[14px] text-[#20242B] font-mono leading-relaxed bg-white p-3 rounded-lg border border-[#E5E8ED] whitespace-pre-wrap min-h-[68px]">
                            {item.originalContent || 'No existing text recorded for this section.'}
                          </div>
                        </div>

                        {/* Factual explanation */}
                        <div className="text-[13px] text-[#626B78] leading-relaxed pt-2 border-t border-[#E5E8ED] flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-[#3157C8] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-[#20242B]">Observation: </span>
                            <span>{item.reasoning}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Proposed AI Alternative */}
                      <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-blue-200">
                            <span className="text-[12px] font-semibold text-[#3157C8] uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#3157C8]" />
                              Proposed AI Alternative
                            </span>
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSuggestionId(item.id);
                                  setEditTextValue(item.improvedContent);
                                }}
                                className="text-[12px] font-semibold text-[#3157C8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={editTextValue}
                                onChange={(e) => setEditTextValue(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-white border border-[#3157C8] text-[14px] text-[#20242B] focus:outline-none"
                                placeholder="Edit suggested wording..."
                              />
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingSuggestionId(null)}
                                  className="px-2.5 py-1 rounded-md text-[13px] text-[#626B78] hover:text-[#20242B] hover:bg-slate-100 border border-[#E5E8ED] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(item.id, false)}
                                  className="px-3 py-1 rounded-md bg-[#3157C8] hover:bg-[#2447AB] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[14px] text-[#20242B] leading-relaxed bg-white p-3 rounded-lg border border-blue-200 whitespace-pre-wrap font-medium min-h-[68px]">
                              {item.improvedContent}
                            </div>
                          )}
                        </div>

                        {/* Evidence-based note */}
                        <div className="text-[13px] text-[#626B78] leading-relaxed pt-2 border-t border-blue-200 flex items-start gap-1.5">
                          <span className="font-semibold text-[#20242B]">Guideline: </span>
                          <span>Phrased with strong action verbs and relevant domain skills without fabricating experience.</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls for this Suggestion */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setRegeneratingId(item.id);
                            const success = await regenerateImprovement(item.id);
                            if (success) {
                              triggerToast('Alternative phrasing generated.');
                            } else {
                              triggerToast('Unable to regenerate alternative at this time.');
                            }
                          } catch {
                            triggerToast('Unable to regenerate alternative at this time.');
                          } finally {
                            setRegeneratingId(null);
                          }
                        }}
                        disabled={regeneratingId === item.id}
                        className="px-3 py-1.5 rounded-lg border border-[#E5E8ED] bg-white hover:bg-[#F6F7F9] text-[#20242B] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${regeneratingId === item.id ? 'animate-spin' : ''}`}
                        />
                        Regenerate
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isRejected) {
                            setImprovements((prev) =>
                              prev.map((imp) => (imp.id === item.id ? { ...imp, status: 'pending' } : imp))
                            );
                            triggerToast('Suggestion restored.');
                          } else {
                            rejectImprovement(item.id);
                            triggerToast('Suggestion dismissed.');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer ${
                          isRejected
                            ? 'border border-[#E5E8ED] bg-[#F6F7F9] text-[#626B78]'
                            : 'hover:text-[#C43D43] text-[#626B78]'
                        }`}
                      >
                        <X className="w-3.5 h-3.5 inline mr-1" />
                        {isRejected ? 'Restore' : 'Dismiss'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(item.id, item.field)}
                        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer shadow-sm inline-flex items-center gap-1.5 ${
                          isAppliedToResume
                            ? 'border border-[#E5E8ED] bg-[#F6F7F9] text-[#626B78]'
                            : 'bg-[#3157C8] hover:bg-[#2447AB] text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAppliedToResume ? 'Re-Apply to Resume' : 'Apply to Resume'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resume Strengths Section */}
          {analysisResult.strengths && analysisResult.strengths.length > 0 && (
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#3157C8]" />
                <h2 className="text-[20px] font-bold text-[#20242B]">
                  Resume Strengths &amp; Key Advantages
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisResult.strengths.map((st) => (
                  <div
                    key={st.id}
                    className="p-5 rounded-xl border border-[#E5E8ED] bg-white space-y-2 text-left shadow-sm"
                  >
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#F6F7F9] text-[#626B78] border border-[#E5E8ED]">
                      {st.section}
                    </span>
                    <h4 className="text-[15px] font-semibold text-[#20242B]">{st.title}</h4>
                    <p className="text-[13px] text-[#626B78] leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paste Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#20242B]/40 p-4 animate-fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-[#E5E8ED] p-6 sm:p-8 shadow-2xl space-y-4 text-left">
            <h3 className="text-[18px] font-bold text-[#20242B]">
              Paste Resume Content Directly
            </h3>
            <textarea
              rows={8}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Paste raw text or markdown from your resume..."
              className="w-full p-4 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#20242B] placeholder:text-[#626B78] text-[14px] font-mono focus:bg-white focus:outline-none focus:border-[#3157C8]"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-lg border border-[#E5E8ED] bg-white text-[#20242B] text-[13px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  if (customText.trim()) {
                    handleTextAnalysis(customText, 'Pasted Resume');
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[#3157C8] hover:bg-[#2447AB] text-white text-[13px] font-semibold shadow-sm cursor-pointer"
              >
                Run AI Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
