'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileEdit,
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Eye,
  ZoomIn,
  ZoomOut,
  Cpu,
  AlertCircle,
  Plus,
  Trash2,
  Layout,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  User,
  Wand2,
  RotateCcw,
  ShieldCheck,
  Filter,
  Target,
  X,
  ExternalLink,
  RefreshCw,
  History,
  Save,
  Clock,
  Loader2,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { RESUME_TEMPLATES, MINI_SAMPLE_RESUME_DATA, normalizeTemplateId } from '@/lib/templates';
import { isClientDraftResumeId, ResumeData } from '@/types/resume';
import { GlassCard } from '@/components/ui/GlassCard';
import { A4ResumeDocument } from '@/components/builder/A4ResumeDocument';
import { TemplateCard } from '@/components/builder/TemplateCard';

function ResumeBuilderContent() {
  const {
    resumeData,
    setResumeData,
    updatePersonalInfo,
    updateSummary,
    updateSkills,
    updateExperience,
    updateEducation,
    updateProjects,
    updateCertifications,
    setTemplateId,
    setCandidateType,
    targetJob,
    clearTargetJob,
    analysisResult,
    runAnalysis,
    activeResumeId: contextActiveResumeId,
    setActiveResumeId: setContextActiveResumeId,
    saveState,
    saveError,
    saveActiveResume,
  } = useResume();

  const searchParams = useSearchParams();
  const urlResumeId = searchParams?.get('resumeId') || null;
  const activeResumeId = urlResumeId || contextActiveResumeId;
  const setActiveResumeId = setContextActiveResumeId;
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [showSaveSnapshotModal, setShowSaveSnapshotModal] = useState<boolean>(false);
  const [snapshotSummary, setSnapshotSummary] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);
  const [isRestoringVersionId, setIsRestoringVersionId] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(0.60);
  const [defaultFitZoom, setDefaultFitZoom] = useState<number>(0.60);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalBanner, setGlobalBanner] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Target Job & AI Tailoring State
  const [showTargetJobModal, setShowTargetJobModal] = useState<boolean>(false);
  const [isImprovingSummary, setIsImprovingSummary] = useState<boolean>(false);
  const [summaryAiSuggestion, setSummaryAiSuggestion] = useState<{
    improved: string;
    reasoning: string;
  } | null>(null);
  const [improvingExpIdx, setImprovingExpIdx] = useState<number | null>(null);
  const [improvingProjIdx, setImprovingProjIdx] = useState<number | null>(null);
  const [tailorSuccessToast, setTailorSuccessToast] = useState<string | null>(null);

  // Controlled Skills Text Inputs (preserves trailing commas/spaces while typing)
  const [technicalSkillsInput, setTechnicalSkillsInput] = useState<string>(() =>
    (resumeData.skills?.technical || []).join(', ')
  );
  const [toolsSkillsInput, setToolsSkillsInput] = useState<string>(() =>
    (resumeData.skills?.tools || []).join(', ')
  );
  const [softSkillsInput, setSoftSkillsInput] = useState<string>(() =>
    (resumeData.skills?.soft || []).join(', ')
  );

  // Synchronize skills inputs when external changes occur (restore, template, chip remove, db load)
  useEffect(() => {
    setTechnicalSkillsInput((current) => {
      const parsed = current.split(',').map((s) => s.trim()).filter(Boolean);
      const actual = resumeData.skills?.technical || [];
      if (parsed.join('|') !== actual.join('|')) {
        return actual.join(', ');
      }
      return current;
    });
  }, [resumeData.skills?.technical]);

  useEffect(() => {
    setToolsSkillsInput((current) => {
      const parsed = current.split(',').map((s) => s.trim()).filter(Boolean);
      const actual = resumeData.skills?.tools || [];
      if (parsed.join('|') !== actual.join('|')) {
        return actual.join(', ');
      }
      return current;
    });
  }, [resumeData.skills?.tools]);

  useEffect(() => {
    setSoftSkillsInput((current) => {
      const parsed = current.split(',').map((s) => s.trim()).filter(Boolean);
      const actual = resumeData.skills?.soft || [];
      if (parsed.join('|') !== actual.join('|')) {
        return actual.join(', ');
      }
      return current;
    });
  }, [resumeData.skills?.soft]);

  const previewViewportRef = useRef<HTMLDivElement>(null);
  const autoFitZoomRef = useRef(true);

  const isFresher = resumeData.candidateType === 'fresher';

  const triggerToast = (msg: string) => {
    setTailorSuccessToast(msg);
    setTimeout(() => {
      setTailorSuccessToast(null);
    }, 3200);
  };

  const fetchVersions = useCallback(async (resId?: string) => {
    const q = resId || (activeResumeId && !isClientDraftResumeId(activeResumeId) ? activeResumeId : null);
    if (!q || isClientDraftResumeId(q)) {
      setVersions([]);
      return;
    }
    setIsLoadingVersions(true);
    try {
      const url = `/api/user/resumes/versions?resumeId=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      } else if (res.status === 404) {
        setVersions([]);
      }
    } catch (err) {
      console.error('Failed to load resume versions:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [activeResumeId]);

  useEffect(() => {
    fetchVersions(urlResumeId || undefined);
  }, [urlResumeId, fetchVersions]);

  useEffect(() => {
    if (!urlResumeId) return;
    async function loadResumeFromDb() {
      try {
        const res = await fetch(`/api/user/resumes?id=${encodeURIComponent(urlResumeId!)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.resume && data.resume.resumeData) {
            setResumeData(data.resume.resumeData);
            triggerToast(`Loaded "${data.resume.filename || 'Resume'}" into editor.`);
          }
        }
      } catch (err) {
        console.error('Failed to load specified resume:', err);
      }
    }
    loadResumeFromDb();
  }, [urlResumeId, setResumeData]);

  const handleSaveSnapshot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSnapshot(true);
    try {
      let effectiveResumeId = activeResumeId && !isClientDraftResumeId(activeResumeId) ? activeResumeId : null;
      if (!effectiveResumeId) {
        const saveRes = await saveActiveResume(resumeData, undefined, { force: true });
        if (saveRes.success && saveRes.resumeId) {
          effectiveResumeId = saveRes.resumeId;
          setActiveResumeId(effectiveResumeId);
        }
      }

      const summary = snapshotSummary.trim() || `Snapshot at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const res = await fetch('/api/user/resumes/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: effectiveResumeId,
          resumeData,
          changeSummary: summary,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.version?.resumeId && (!activeResumeId || isClientDraftResumeId(activeResumeId))) {
          setActiveResumeId(data.version.resumeId);
        }
        triggerToast(`Saved Version ${data.version?.versionNumber ?? data.version?.version_number ?? ''} snapshot!`);
        setShowSaveSnapshotModal(false);
        setSnapshotSummary('');
        fetchVersions(data.version?.resumeId || effectiveResumeId || undefined);
      } else {
        triggerToast('Please sign in to save cloud snapshots.');
      }
    } catch (err) {
      console.error('Error saving version snapshot:', err);
      triggerToast('Could not save snapshot.');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, versionNumber: number) => {
    if (!window.confirm(`Are you sure you want to restore Version ${versionNumber}? Your current unsaved edits will be replaced.`)) {
      return;
    }
    setIsRestoringVersionId(versionId);
    try {
      const res = await fetch('/api/user/resumes/versions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resumeData) {
          setResumeData(data.resumeData);
          try {
            localStorage.setItem('sra_resume_data', JSON.stringify(data.resumeData));
          } catch {}
          triggerToast(`Restored Version ${versionNumber} successfully!`);
          setShowVersionsModal(false);
        }
      } else {
        triggerToast('Failed to restore selected version.');
      }
    } catch (err) {
      console.error('Error restoring version:', err);
      triggerToast('Error restoring version.');
    } finally {
      setIsRestoringVersionId(null);
    }
  };

  // AI Assistant: Tailor Summary
  // AI Assistant: Tailor Summary
  const handleTailorSummary = async () => {
    const summaryText = resumeData.summary?.trim();
    if (!summaryText) {
      triggerToast('Please write a professional summary first before improving it.');
      return;
    }

    setIsImprovingSummary(true);
    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: 'summary',
          originalContent: summaryText,
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryAiSuggestion({
          improved: data.improvedContent,
          reasoning: data.reasoning,
        });
      } else {
        triggerToast('Unable to improve summary at this time.');
      }
    } catch (err) {
      console.error('Tailor summary error:', err);
      triggerToast('Unable to improve summary at this time.');
    } finally {
      setIsImprovingSummary(false);
    }
  };

  // AI Assistant: Improve Experience Bullet
  const handleImproveBullet = async (expIndex: number) => {
    if (!resumeData.experience[expIndex]) return;
    const bullets = resumeData.experience[expIndex].bulletPoints;
    if (!bullets || bullets.length === 0 || !bullets.join('').trim()) {
      triggerToast('Please write accomplishment bullets first before improving.');
      return;
    }

    setImprovingExpIdx(expIndex);
    try {
      const bulletToImprove = bullets.join('\n');
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: 'experience',
          originalContent: bulletToImprove,
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [...resumeData.experience];
        const improvedList = (data.improvedContent || '')
          .split('\n')
          .map((b: string) => b.trim())
          .filter(Boolean);
        updated[expIndex].bulletPoints = improvedList.length > 0 ? improvedList : [data.improvedContent];
        updateExperience(updated);
        triggerToast('Refined bullet phrasing with professional action verbs while preserving your experience.');
      } else {
        triggerToast('Unable to improve bullet points at this time.');
      }
    } catch (err) {
      console.error('Improve bullet error:', err);
      triggerToast('Unable to improve bullet points at this time.');
    } finally {
      setImprovingExpIdx(null);
    }
  };

  // AI Assistant: Improve Project
  const handleImproveProject = async (projIndex: number) => {
    if (!resumeData.projects[projIndex]) return;
    const proj = resumeData.projects[projIndex];
    const originalText = proj.description || (proj.bullets && proj.bullets.join('\n')) || proj.title;
    if (!originalText || !originalText.trim()) {
      triggerToast('Please provide a project description first before improving.');
      return;
    }

    setImprovingProjIdx(projIndex);
    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: 'projects',
          originalContent: originalText.trim(),
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [...resumeData.projects];
        if (updated[projIndex].bullets && updated[projIndex].bullets.length > 0) {
          const improvedList = (data.improvedContent || '')
            .split('\n')
            .map((b: string) => b.trim())
            .filter(Boolean);
          updated[projIndex].bullets = improvedList.length > 0 ? improvedList : [data.improvedContent];
        } else {
          updated[projIndex].description = data.improvedContent;
        }
        updateProjects(updated);
        triggerToast('Enhanced project description with professional terminology while preserving facts.');
      } else {
        triggerToast('Unable to improve project description at this time.');
      }
    } catch (err) {
      console.error('Improve project error:', err);
      triggerToast('Unable to improve project description at this time.');
    } finally {
      setImprovingProjIdx(null);
    }
  };

  const steps = [
    { number: 1, label: 'Personal Information', icon: User },
    {
      number: 2,
      label: isFresher ? 'Career Objective' : 'Summary',
      icon: Wand2,
    },
    { number: 3, label: 'Skills', icon: Cpu },
    {
      number: 4,
      label: isFresher ? 'Education & Degree' : 'Education',
      icon: GraduationCap,
    },
    {
      number: 5,
      label: isFresher ? 'Internships (Optional)' : 'Experience',
      icon: Briefcase,
    },
    {
      number: 6,
      label: isFresher ? 'Academic Projects *' : 'Projects',
      icon: FolderGit2,
    },
    { number: 7, label: 'Certifications', icon: Award },
    { number: 8, label: 'Template', icon: Layout },
    { number: 9, label: 'Preview', icon: Eye },
    { number: 10, label: 'Generate', icon: Download },
  ];

  // Calculate container fit zoom
  const calculateFitZoom = useCallback(() => {
    if (!previewViewportRef.current) return 0.60;
    const viewport = previewViewportRef.current;
    const styles = window.getComputedStyle(viewport);
    const horizontalPadding =
      Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const availableWidth = viewport.clientWidth - horizontalPadding - 16;
    if (availableWidth <= 0) return 0.60;
    // A4 base document width is 794px
    const widthFit = availableWidth / 794;
    const availableHeight = viewport.clientHeight - verticalPadding - 16;
    let target = widthFit;
    if (availableHeight > 300) {
      const heightFit = availableHeight / 1123;
      // Balance width and height fit so document displays comfortably
      target = Math.min(widthFit, heightFit * 1.05);
    }
    // Clamp between 0.28 and 1.00 for initial fit so mobile viewports fit completely
    return Math.max(0.28, Math.min(1.00, Math.round(target * 100) / 100));
  }, []);

  const updateFitZoom = useCallback(() => {
    const fit = calculateFitZoom();
    setDefaultFitZoom(fit);
    if (autoFitZoomRef.current) {
      setZoom(fit);
    }
  }, [calculateFitZoom]);

  // Refit the preview whenever its responsive viewport changes size.
  useEffect(() => {
    const viewport = previewViewportRef.current;
    const observer = new ResizeObserver(updateFitZoom);
    if (viewport) observer.observe(viewport);
    const initialFrame = window.requestAnimationFrame(updateFitZoom);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      observer.disconnect();
    };
  }, [updateFitZoom]);

  const [isStepLoaded, setIsStepLoaded] = useState(false);

  // Restore saved step on initial mount if valid
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem('sra_builder_step');
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum >= 1 && stepNum <= 10) {
          setCurrentStep(stepNum);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsStepLoaded(true);
    }
  }, []);

  // Persist current step on change (only after initial restoration has completed)
  useEffect(() => {
    if (!isStepLoaded) return;
    try {
      localStorage.setItem('sra_builder_step', String(currentStep));
    } catch {
      // ignore
    }
  }, [currentStep, isStepLoaded]);

  // Clear specific field error on change
  const clearError = (fieldKey: string) => {
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
    if (globalBanner) {
      setGlobalBanner(null);
    }
  };

  // Step-by-step validation engine
  const validateStep = (
    step: number,
    data: ResumeData
  ): { isValid: boolean; errors: Record<string, string>; firstErrorField: string | null } => {
    const errors: Record<string, string> = {};
    let firstErrorField: string | null = null;

    const addError = (fieldKey: string, message: string, elementId: string) => {
      errors[fieldKey] = message;
      if (!firstErrorField) {
        firstErrorField = elementId;
      }
    };

    if (step === 1) {
      if (!data.personalInfo.fullName?.trim()) {
        addError('personalInfo.fullName', 'Please enter your full name.', 'input-fullName');
      }
      if (!data.personalInfo.email?.trim()) {
        addError('personalInfo.email', 'Please enter your email address.', 'input-email');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email.trim())) {
        addError(
          'personalInfo.email',
          'Please enter a valid email address (e.g. name@example.com).',
          'input-email'
        );
      }
      if (!data.personalInfo.phone?.trim()) {
        addError('personalInfo.phone', 'Please enter your phone number.', 'input-phone');
      } else {
        const phone = data.personalInfo.phone.trim();
        const digitCount = phone.replace(/\D/g, '').length;
        if (!/^[+]?[\d\s().-]{7,25}$/.test(phone) || digitCount < 7 || digitCount > 15) {
          addError(
            'personalInfo.phone',
            'Please enter a valid phone number (7 to 15 digits, optionally with country code).',
            'input-phone'
          );
        }
      }
      if (!data.personalInfo.location?.trim()) {
        addError(
          'personalInfo.location',
          'Please enter your location (city, state/country).',
          'input-location'
        );
      }
    } else if (step === 2) {
      if (!data.summary?.trim()) {
        addError('summary', 'Please enter your professional summary.', 'input-summary');
      } else if (data.summary.trim().length < 20) {
        addError(
          'summary',
          'Professional summary must be at least 20 characters.',
          'input-summary'
        );
      }
    } else if (step === 3) {
      if (!data.skills.technical || data.skills.technical.length === 0) {
        addError(
          'skills.technical',
          'Please enter at least one technical skill.',
          'input-skills-technical'
        );
      }
    } else if (step === 4) {
      if (!data.education || data.education.length === 0) {
        addError('education', 'Please add at least one education credential.', 'add-education-btn');
      } else {
        data.education.forEach((edu, idx) => {
          if (!edu.degree?.trim()) {
            addError(
              `education.${idx}.degree`,
              'Please enter your degree or program of study.',
              `input-edu-degree-${idx}`
            );
          }
          if (!edu.institution?.trim()) {
            addError(
              `education.${idx}.institution`,
              'Please enter the institution or university name.',
              `input-edu-institution-${idx}`
            );
          }
        });
      }
    } else if (step === 5) {
      if (data.candidateType === 'experienced') {
        if (!data.experience || data.experience.length === 0) {
          addError(
            'experience',
            'Please add at least one professional work experience.',
            'add-experience-btn'
          );
        } else {
          data.experience.forEach((exp, idx) => {
            if (!exp.role?.trim()) {
              addError(`experience.${idx}.role`, 'Please enter your role title.', `input-exp-role-${idx}`);
            }
            if (!exp.company?.trim()) {
              addError(`experience.${idx}.company`, 'Please enter the company name.', `input-exp-company-${idx}`);
            }
          });
        }
      } else if (data.experience && data.experience.length > 0) {
        data.experience.forEach((exp, idx) => {
          if (!exp.role?.trim()) {
            addError(`experience.${idx}.role`, 'Please enter your role title.', `input-exp-role-${idx}`);
          }
          if (!exp.company?.trim()) {
            addError(`experience.${idx}.company`, 'Please enter the company name.', `input-exp-company-${idx}`);
          }
        });
      }
    } else if (step === 6) {
      if (data.candidateType === 'fresher') {
        if (!data.projects || data.projects.length === 0) {
          addError(
            'projects',
            'Please add at least one project (required for entry-level candidates).',
            'add-project-btn'
          );
        } else {
          data.projects.forEach((proj, idx) => {
            if (!proj.title?.trim()) {
              addError(`projects.${idx}.title`, 'Please enter the project name.', `input-proj-title-${idx}`);
            }
          });
        }
      } else if (data.projects && data.projects.length > 0) {
        data.projects.forEach((proj, idx) => {
          if (!proj.title?.trim()) {
            addError(`projects.${idx}.title`, 'Please enter the project name.', `input-proj-title-${idx}`);
          }
        });
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      firstErrorField,
    };
  };

  // Validate all steps up to target step
  const validateUpToStep = (targetStep: number, data: ResumeData) => {
    for (let s = 1; s < targetStep; s++) {
      const res = validateStep(s, data);
      if (!res.isValid) {
        return {
          isValid: false,
          invalidStep: s,
          errors: res.errors,
          firstErrorField: res.firstErrorField,
        };
      }
    }
    return { isValid: true, invalidStep: null, errors: {}, firstErrorField: null };
  };

  // Focus helper
  const focusElement = (elementId: string | null) => {
    if (!elementId) return;
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  // Next step handler with validation
  const handleNextStep = () => {
    const result = validateStep(currentStep, resumeData);
    if (!result.isValid) {
      setFieldErrors(result.errors);
      setGlobalBanner('Please complete all required fields (*) before moving to the next step.');
      focusElement(result.firstErrorField);
      return;
    }

    setFieldErrors({});
    setGlobalBanner(null);
    setCurrentStep((prev) => Math.min(prev + 1, 10));
  };

  // Previous step handler (always allowed without validation blocking)
  const handlePrevStep = () => {
    setFieldErrors({});
    setGlobalBanner(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Stepper tab click handler
  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;

    // Moving backward is always permitted
    if (targetStep < currentStep) {
      setFieldErrors({});
      setGlobalBanner(null);
      setCurrentStep(targetStep);
      return;
    }

    // Moving forward requires validating all steps up to target
    const validation = validateUpToStep(targetStep, resumeData);
    if (!validation.isValid && validation.invalidStep) {
      setCurrentStep(validation.invalidStep);
      setFieldErrors(validation.errors);
      setGlobalBanner(
        `Please complete the required fields in Step 0${validation.invalidStep} before proceeding.`
      );
      focusElement(validation.firstErrorField);
      return;
    }

    setFieldErrors({});
    setGlobalBanner(null);
    setCurrentStep(targetStep);
  };

  // Final Generate / Print validation
  const handleDownloadPdf = async () => {
    // Validate all steps from 1 through 6
    const validation = validateUpToStep(7, resumeData);
    if (!validation.isValid && validation.invalidStep) {
      setCurrentStep(validation.invalidStep);
      setFieldErrors(validation.errors);
      setGlobalBanner(
        `Please complete the required fields in Step 0${validation.invalidStep} before generating your resume.`
      );
      focusElement(validation.firstErrorField);
      return;
    }

    // Force flush persistence to guarantee latest saved resume data
    try {
      await saveActiveResume(resumeData, undefined, { force: true });
    } catch (saveErr) {
      console.warn('Auto-save prior to PDF export returned an error:', saveErr);
    }

    // All required fields valid! Set document title and trigger browser print/PDF
    setFieldErrors({});
    setGlobalBanner(null);
    setIsExporting(true);
    document.body.classList.add('resume-exporting');

    const candidateName = (resumeData.personalInfo.fullName || 'Candidate')
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_');
    const originalTitle = document.title;
    document.title = `${candidateName}_Resume.pdf`;

    let cleanedUp = false;
    const cleanupExportState = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('resume-exporting');
      setIsExporting(false);
      setTimeout(() => {
        document.title = originalTitle;
      }, 4000);
      window.removeEventListener('afterprint', cleanupExportState);
    };

    window.addEventListener('afterprint', cleanupExportState);

    setTimeout(() => {
      window.print();
      // Fallback cleanup in case afterprint does not fire
      setTimeout(cleanupExportState, 1000);
    }, 250);
  };

  // Candidate type toggle (preserves user entered data)
  const handleCandidateTypeChange = (type: 'experienced' | 'fresher') => {
    setCandidateType(type);
    // Clear validation errors that no longer apply
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (type === 'fresher') {
        delete next['experience'];
        delete next['experience.0.role'];
        delete next['experience.0.company'];
      } else {
        delete next['projects'];
        delete next['projects.0.title'];
      }
      return next;
    });
  };

  // Zoom control helpers (min 28%, max 125%)
  const handleZoomIn = () => {
    autoFitZoomRef.current = false;
    setZoom((prev) => Math.min(1.25, Math.round((prev + 0.05) * 100) / 100));
  };

  const handleZoomOut = () => {
    autoFitZoomRef.current = false;
    setZoom((prev) => Math.max(0.28, Math.round((prev - 0.05) * 100) / 100));
  };

  const handleResetZoom = () => {
    autoFitZoomRef.current = true;
    updateFitZoom();
  };

  // Input styling helper
  const getInputClassName = (fieldKey: string, extraClasses = '') => {
    const hasError = Boolean(fieldErrors[fieldKey]);
    return `w-full p-2.5 rounded-xl border text-[var(--text-primary)] text-xs transition-all duration-150 focus:outline-none ${
      hasError
        ? 'border-[var(--color-error)] bg-[var(--color-error)]/10 focus:border-[var(--color-error)] focus-visible:ring-2 focus-visible:ring-[var(--color-error)]/20'
        : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/80 focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 hover:border-[var(--accent)]/40'
    } ${extraClasses}`;
  };

  return (
    <div className="resume-builder-page-container min-h-screen py-6 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="bento-card p-5 sm:p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Resume Builder
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Build and customize your professional resume across recruiter-approved templates.
            </p>
          </div>

          {/* Candidate Type Toggle (Preserves user data) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-1 shrink-0">
              <button
                id="btn-candidate-experienced"
                type="button"
                onClick={() => handleCandidateTypeChange('experienced')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                  resumeData.candidateType === 'experienced'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Experienced</span>
              </button>
              <button
                id="btn-candidate-fresher"
                type="button"
                onClick={() => handleCandidateTypeChange('fresher')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                  resumeData.candidateType === 'fresher'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Fresher / Graduate</span>
              </button>
            </div>

            {saveState === 'saving' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 text-[var(--text-secondary)] border border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                <span>Saving...</span>
              </span>
            )}
            {saveState === 'saved' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 text-emerald-500 border border-emerald-500/20 bg-emerald-500/10 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveState === 'error' && (
              <button
                type="button"
                onClick={() => saveActiveResume()}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 text-rose-500 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all duration-150 shrink-0 cursor-pointer"
                title={saveError || 'Save failed'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}

            <button
              id="btn-save-snapshot"
              type="button"
              onClick={() => setShowSaveSnapshotModal(true)}
              className="btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Save a named version snapshot of this resume"
            >
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Save Snapshot</span>
            </button>

            <button
              id="btn-version-history"
              type="button"
              onClick={() => {
                setShowVersionsModal(true);
                fetchVersions();
              }}
              className="btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Browse and restore prior resume versions"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>History {versions.length > 0 ? `(${versions.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {tailorSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 glass-card px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-[var(--glass-border)] animate-fade-in text-xs font-semibold backdrop-blur-xl bg-[var(--bg-elevated)]/90 text-[var(--text-primary)]">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{tailorSuccessToast}</span>
        </div>
      )}

      {/* Target Job Banner */}
      {(targetJob.title || targetJob.description) && (
        <div className="no-print p-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Job-Specific Mode: {targetJob.title || 'Target Role'} {targetJob.company ? `@ ${targetJob.company}` : ''}
                </span>
                {analysisResult?.overallAtsScore !== undefined && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {analysisResult.overallAtsScore}% ATS Score
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Real-time preview and AI writing assistants are calibrated to this job specification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/analyzer"
              className="btn-primary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-analyze in Analyser
            </Link>
            <button
              type="button"
              onClick={() => setShowTargetJobModal(true)}
              className="btn-secondary btn-sm inline-flex items-center gap-1 cursor-pointer text-xs"
            >
              <span>View Job Specs</span>
            </button>
            <button
              type="button"
              onClick={clearTargetJob}
              className="btn-icon btn-icon-sm text-[var(--text-secondary)] hover:text-rose-400 transition-colors cursor-pointer"
              title="Exit Job-Specific Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Stepper Bar (1 to 10) */}
      <div className="no-print w-full max-w-full overflow-x-auto pb-1">
        <div className="min-w-[760px] p-2.5 rounded-full bento-card relative">
          <div className="flex items-center justify-between px-3">
            {steps.map((st) => {
              const isCompleted = st.number < currentStep;
              const isCurrent = st.number === currentStep;

              return (
                <button
                  id={`btn-step-${st.number}`}
                  data-step={st.number}
                  key={st.number}
                  type="button"
                  onClick={() => handleStepClick(st.number)}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-150 cursor-pointer px-2 py-1 rounded-full ${
                    isCurrent
                      ? 'text-[var(--accent)] font-semibold'
                      : isCompleted
                      ? 'text-emerald-500 font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
                      isCurrent
                        ? 'bg-[var(--accent)] text-white shadow-sm ring-2 ring-[var(--accent)]/30 scale-105'
                        : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 text-emerald-500" /> : st.number}
                  </div>
                  <span className="text-[10px] whitespace-nowrap tracking-tight">{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="resume-builder-main-grid grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Step Form Content */}
        <div className={`no-print ${currentStep >= 9 ? 'lg:col-span-4' : 'lg:col-span-6'} min-w-0`}>
          <GlassCard variant="bento" className="p-6 sm:p-7 text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  Step 0{currentStep} / 10
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {steps[currentStep - 1].label}
                </h2>
              </div>
              {Object.keys(fieldErrors).length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Required fields (*) missing
                </span>
              )}
            </div>

            {/* Global Validation Banner */}
            {globalBanner && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400 font-medium animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{globalBanner}</span>
              </div>
            )}

            {/* STEP 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label htmlFor="input-fullName" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-fullName"
                    type="text"
                    value={resumeData.personalInfo.fullName}
                    onChange={(e) => {
                      updatePersonalInfo({ fullName: e.target.value });
                      clearError('personalInfo.fullName');
                    }}
                    placeholder="e.g. Rahul Sharma"
                    aria-invalid={Boolean(fieldErrors['personalInfo.fullName'])}
                    aria-describedby={
                      fieldErrors['personalInfo.fullName'] ? 'fullName-error' : undefined
                    }
                    className={getInputClassName('personalInfo.fullName')}
                  />
                  {fieldErrors['personalInfo.fullName'] && (
                    <p
                      id="fullName-error"
                      role="alert"
                      className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors['personalInfo.fullName']}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="input-email" className="block font-semibold text-[var(--text-primary)] mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-email"
                      type="email"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => {
                        updatePersonalInfo({ email: e.target.value });
                        clearError('personalInfo.email');
                      }}
                      placeholder="rahul.sharma@email.com"
                      aria-invalid={Boolean(fieldErrors['personalInfo.email'])}
                      aria-describedby={
                        fieldErrors['personalInfo.email'] ? 'email-error' : undefined
                      }
                      className={getInputClassName('personalInfo.email')}
                    />
                    {fieldErrors['personalInfo.email'] && (
                      <p
                        id="email-error"
                        role="alert"
                        className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {fieldErrors['personalInfo.email']}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="input-phone" className="block font-semibold text-[var(--text-primary)] mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-phone"
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => {
                        updatePersonalInfo({ phone: e.target.value });
                        clearError('personalInfo.phone');
                      }}
                      placeholder="+1 (555) 234-5678"
                      aria-invalid={Boolean(fieldErrors['personalInfo.phone'])}
                      aria-describedby={
                        fieldErrors['personalInfo.phone'] ? 'phone-error' : undefined
                      }
                      className={getInputClassName('personalInfo.phone')}
                    />
                    {fieldErrors['personalInfo.phone'] && (
                      <p
                        id="phone-error"
                        role="alert"
                        className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {fieldErrors['personalInfo.phone']}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="input-location" className="block font-semibold text-[var(--text-primary)] mb-1">
                      Location <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-location"
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => {
                        updatePersonalInfo({ location: e.target.value });
                        clearError('personalInfo.location');
                      }}
                      placeholder="San Francisco, CA"
                      aria-invalid={Boolean(fieldErrors['personalInfo.location'])}
                      aria-describedby={
                        fieldErrors['personalInfo.location'] ? 'location-error' : undefined
                      }
                      className={getInputClassName('personalInfo.location')}
                    />
                    {fieldErrors['personalInfo.location'] && (
                      <p
                        id="location-error"
                        role="alert"
                        className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {fieldErrors['personalInfo.location']}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="input-headline" className="block font-semibold text-[var(--text-primary)] mb-1">
                      Professional Headline
                    </label>
                    <input
                      id="input-headline"
                      type="text"
                      value={resumeData.personalInfo.headline || resumeData.personalInfo.title || ''}
                      onChange={(e) =>
                        updatePersonalInfo({
                          headline: e.target.value,
                          title: e.target.value,
                        })
                      }
                      placeholder="Senior Full Stack & AI Engineer"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="input-linkedin" className="block font-medium text-[var(--text-secondary)] mb-1">
                      LinkedIn
                    </label>
                    <input
                      id="input-linkedin"
                      type="text"
                      value={resumeData.personalInfo.linkedin || ''}
                      onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
                      placeholder="linkedin.com/in/..."
                      className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[11px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-github" className="block font-medium text-[var(--text-secondary)] mb-1">
                      GitHub
                    </label>
                    <input
                      id="input-github"
                      type="text"
                      value={resumeData.personalInfo.github || ''}
                      onChange={(e) => updatePersonalInfo({ github: e.target.value })}
                      placeholder="github.com/..."
                      className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[11px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-portfolio" className="block font-medium text-[var(--text-secondary)] mb-1">
                      Portfolio
                    </label>
                    <input
                      id="input-portfolio"
                      type="text"
                      value={resumeData.personalInfo.portfolio || ''}
                      onChange={(e) => updatePersonalInfo({ portfolio: e.target.value })}
                      placeholder="portfolio.dev"
                      className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Summary */}
            {currentStep === 2 && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="input-summary" className="font-semibold text-[var(--text-primary)]">
                      {isFresher ? 'Career Objective & Summary' : 'Professional Summary'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        resumeData.summary.trim().length >= 20 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {resumeData.summary.trim().length} / 20 characters min
                    </span>
                  </div>
                  <textarea
                    id="input-summary"
                    rows={7}
                    value={resumeData.summary}
                    onChange={(e) => {
                      updateSummary(e.target.value);
                      clearError('summary');
                    }}
                    placeholder={
                      isFresher
                        ? 'Motivated Computer Science graduate with solid foundational skills in modern web development, data structures, and databases. Eager to contribute scalable code and learn rapidly within an innovative engineering team...'
                        : 'Provide a high-impact overview of your engineering domain, years of tenure, and major accomplishments...'
                    }
                    aria-invalid={Boolean(fieldErrors['summary'])}
                    aria-describedby={fieldErrors['summary'] ? 'summary-error' : undefined}
                    className={`w-full p-3 rounded-xl border leading-relaxed text-xs transition-colors focus:outline-none ${
                      fieldErrors['summary']
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 text-[var(--text-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:border-[var(--accent)]'
                    }`}
                  />
                  {fieldErrors['summary'] && (
                    <p
                      id="summary-error"
                      role="alert"
                      className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors['summary']}
                    </p>
                  )}

                  {/* AI Tailoring Assistant Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleTailorSummary}
                      disabled={isImprovingSummary}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isImprovingSummary ? 'animate-spin' : ''}`} />
                      {isImprovingSummary
                        ? 'AI Writing Assistant analyzing...'
                        : targetJob.title
                        ? `Tailor Summary for ${targetJob.title}`
                        : 'AI Enhance Summary'}
                    </button>
                    {targetJob.title && (
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Job: {targetJob.title}
                      </span>
                    )}
                  </div>

                  {/* AI Suggestion Preview Box */}
                  {summaryAiSuggestion && (
                    <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs space-y-2 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Tailored Suggestion
                        </span>
                        <button
                          type="button"
                          onClick={() => setSummaryAiSuggestion(null)}
                          className="text-[var(--text-secondary)] hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[var(--text-primary)] font-semibold leading-relaxed">
                        {summaryAiSuggestion.improved}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--accent)]/20">
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {summaryAiSuggestion.reasoning}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateSummary(summaryAiSuggestion.improved);
                            setSummaryAiSuggestion(null);
                            triggerToast('Applied tailored summary to your resume.');
                          }}
                          className="px-3 py-1 rounded-md bg-[var(--accent)] text-white font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all cursor-pointer shrink-0"
                        >
                          Accept & Replace
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Quick Starters */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Quick Starters:</span>
                    {isFresher ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            updateSummary(
                              'Enthusiastic and results-driven Computer Science graduate with a strong foundation in data structures, algorithms, and full-stack development using React, TypeScript, and Node.js. Eager to leverage hands-on academic project experience and rapid learning aptitude to contribute effectively to scalable software solutions.'
                            );
                            clearError('summary');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                        >
                          + Software Engineer Graduate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSummary(
                              'Detail-oriented graduate specializing in Data Analytics and Python engineering. Proficient in SQL querying, data cleaning, statistical modeling, and interactive dashboard creation. Seeking an entry-level analyst or junior developer role to turn data into actionable intelligence.'
                            );
                            clearError('summary');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                        >
                          + Data & Analytics Graduate
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          updateSummary(
                            'High-impact Senior Full-Stack Engineer with 5+ years of experience architecting resilient distributed systems, modern web platforms, and automated CI/CD pipelines. Proven track record of improving system uptime to 99.99% and accelerating feature delivery across cross-functional product teams.'
                          );
                          clearError('summary');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                      >
                        + Senior Full-Stack Engineer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Skills */}
            {currentStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label htmlFor="input-skills-technical" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Technical Skills (comma separated) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-skills-technical"
                    type="text"
                    value={technicalSkillsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTechnicalSkillsInput(val);
                      updateSkills({
                        ...resumeData.skills,
                        technical: val.split(',').map((s) => s.trim()).filter(Boolean),
                      });
                      clearError('skills.technical');
                    }}
                    placeholder="Python, React, TypeScript, SQL, Docker, AWS..."
                    aria-invalid={Boolean(fieldErrors['skills.technical'])}
                    aria-describedby={fieldErrors['skills.technical'] ? 'skills-technical-error' : undefined}
                    className={getInputClassName('skills.technical')}
                  />
                  {fieldErrors['skills.technical'] && (
                    <p
                      id="skills-technical-error"
                      role="alert"
                      className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors['skills.technical']}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {resumeData.skills.technical.map((sk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium text-[11px]"
                      >
                        <span>{sk}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resumeData.skills.technical.filter((_, i) => i !== idx);
                            updateSkills({ ...resumeData.skills, technical: updated });
                            setTechnicalSkillsInput(updated.join(', '));
                          }}
                          className="hover:text-rose-500 font-bold ml-0.5 text-xs focus:outline-none cursor-pointer"
                          aria-label={`Remove ${sk}`}
                          title={`Remove ${sk}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Target Job Skills Recommendation Chips */}
                  {((analysisResult?.missingSkills && analysisResult.missingSkills.length > 0)
                    ? analysisResult.missingSkills
                    : (analysisResult?.missingKeywords || [])
                  ).filter(
                    (s) =>
                      !resumeData.skills.technical
                        .map((t) => t.toLowerCase())
                        .includes(s.toLowerCase())
                  ).length > 0 && (
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 mt-2">
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider block">
                        Recommended for Target Job (Click to Add):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {((analysisResult?.missingSkills && analysisResult.missingSkills.length > 0)
                          ? analysisResult.missingSkills
                          : (analysisResult?.missingKeywords || [])
                        )
                          .filter(
                            (s) =>
                              !resumeData.skills.technical
                                .map((t) => t.toLowerCase())
                                .includes(s.toLowerCase())
                          )
                          .slice(0, 6)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => {
                                const newTechnical = [...resumeData.skills.technical, skill];
                                updateSkills({
                                  ...resumeData.skills,
                                  technical: newTechnical,
                                });
                                setTechnicalSkillsInput(newTechnical.join(', '));
                                triggerToast(`Added "${skill}" to Technical Skills.`);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all border border-[var(--accent)]/20 cursor-pointer"
                            >
                              + {skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="input-skills-tools" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Tools & Frameworks (optional)
                  </label>
                  <input
                    id="input-skills-tools"
                    type="text"
                    value={toolsSkillsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToolsSkillsInput(val);
                      updateSkills({
                        ...resumeData.skills,
                        tools: val.split(',').map((s) => s.trim()).filter(Boolean),
                      });
                    }}
                    placeholder="VS Code, GitLab CI, Terraform, Datadog..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label htmlFor="input-skills-soft" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Soft / Leadership Skills (optional)
                  </label>
                  <input
                    id="input-skills-soft"
                    type="text"
                    value={softSkillsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSoftSkillsInput(val);
                      updateSkills({
                        ...resumeData.skills,
                        soft: val.split(',').map((s) => s.trim()).filter(Boolean),
                      });
                    }}
                    placeholder="System Architecture, Cross-functional Leadership, Mentorship..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Education */}
            {currentStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                    <span>Education Credentials</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/student/profile');
                        if (res.ok) {
                          const data = await res.json();
                          if (data.profile && data.profile.institution) {
                            const p = data.profile;
                            updateEducation([
                              {
                                id: `edu_${Date.now()}`,
                                degree: p.degree || 'B.Tech / Bachelor',
                                institution: p.institution,
                                graduationYear: String(p.graduationYear || '2026'),
                                gpa: p.cgpa || '',
                              },
                            ]);
                            clearError('education');
                            triggerToast('Imported education from your Student Career Profile!');
                            return;
                          }
                        }
                        triggerToast('No saved student profile found. Please configure your profile first.');
                      } catch {
                        triggerToast('Could not load student profile.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Import from Student Profile</span>
                  </button>
                </div>

                {fieldErrors['education'] && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors['education']}</span>
                  </div>
                )}

                {resumeData.education.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center space-y-3">
                    <GraduationCap className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
                    <p className="text-xs text-[var(--text-secondary)]">
                      No education degree listed yet. At least one education degree is required.
                    </p>
                    <button
                      id="add-education-btn"
                      type="button"
                      onClick={() => {
                        updateEducation([
                          {
                            id: `edu_${Date.now()}`,
                            degree: '',
                            institution: '',
                            graduationYear: '2024',
                            gpa: '',
                          },
                        ]);
                        clearError('education');
                      }}
                      className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Degree / School
                    </button>
                  </div>
                ) : (
                  resumeData.education.map((edu, idx) => (
                    <div
                      key={edu.id}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[var(--text-primary)]">Degree #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resumeData.education.filter((_, i) => i !== idx);
                            updateEducation(updated);
                          }}
                          className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Remove degree"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`input-edu-degree-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Degree / Program <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id={`input-edu-degree-${idx}`}
                            type="text"
                            value={edu.degree}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].degree = e.target.value;
                              updateEducation(updated);
                              clearError(`education.${idx}.degree`);
                            }}
                            placeholder="B.S. in Computer Science"
                            aria-invalid={Boolean(fieldErrors[`education.${idx}.degree`])}
                            aria-describedby={
                              fieldErrors[`education.${idx}.degree`]
                                ? `edu-degree-${idx}-error`
                                : undefined
                            }
                            className={getInputClassName(
                              `education.${idx}.degree`,
                              'bg-[var(--bg-card)]'
                            )}
                          />
                          {fieldErrors[`education.${idx}.degree`] && (
                            <p
                              id={`edu-degree-${idx}-error`}
                              role="alert"
                              className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {fieldErrors[`education.${idx}.degree`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`input-edu-institution-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            University / Institution <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id={`input-edu-institution-${idx}`}
                            type="text"
                            value={edu.institution}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].institution = e.target.value;
                              updateEducation(updated);
                              clearError(`education.${idx}.institution`);
                            }}
                            placeholder="UC Berkeley"
                            aria-invalid={Boolean(fieldErrors[`education.${idx}.institution`])}
                            aria-describedby={
                              fieldErrors[`education.${idx}.institution`]
                                ? `edu-inst-${idx}-error`
                                : undefined
                            }
                            className={getInputClassName(
                              `education.${idx}.institution`,
                              'bg-[var(--bg-card)]'
                            )}
                          />
                          {fieldErrors[`education.${idx}.institution`] && (
                            <p
                              id={`edu-inst-${idx}-error`}
                              role="alert"
                              className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {fieldErrors[`education.${idx}.institution`]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Graduation Year
                          </label>
                          <input
                            type="text"
                            value={edu.graduationYear}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].graduationYear = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="2024"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">GPA</label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].gpa = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="3.85"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {resumeData.education.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateEducation([
                        ...resumeData.education,
                        {
                          id: `edu_${Date.now()}`,
                          degree: '',
                          institution: '',
                          graduationYear: '2024',
                          gpa: '',
                        },
                      ])
                    }
                    className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Another Degree
                  </button>
                )}
              </div>
            )}

            {/* STEP 5: Experience */}
            {currentStep === 5 && (
              <div className="space-y-4 text-xs">
                {resumeData.candidateType === 'experienced' ? (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Required for experienced candidates. Include at least 1 verified professional role.
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    Optional for freshers and recent graduates. You can include internships, part-time roles, or skip to Projects.
                  </div>
                )}

                {fieldErrors['experience'] && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors['experience']}</span>
                  </div>
                )}

                {resumeData.experience.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center space-y-3">
                    <Briefcase className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
                    <p className="text-xs text-[var(--text-secondary)]">
                      {resumeData.candidateType === 'experienced'
                        ? 'No work experience added yet. At least one professional role is required.'
                        : 'No work experience added yet. Click below if you wish to add internships or jobs.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        id="add-experience-btn"
                        type="button"
                        onClick={() => {
                          updateExperience([
                            {
                              id: `exp_${Date.now()}`,
                              company: '',
                              role: '',
                              startDate: '2023-01',
                              endDate: '',
                              current: true,
                              bulletPoints: [
                                isFresher
                                  ? 'Contributed to front-end development, bug resolution, and unit testing as part of agile team.'
                                  : 'Spearheaded engineering deliverables with high performance.',
                              ],
                            },
                          ]);
                          clearError('experience');
                        }}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4" />{' '}
                        {isFresher ? 'Add Internship / Role' : 'Add Work Experience'}
                      </button>
                      {isFresher && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(6)}
                          className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                        >
                          <span>Skip to Projects</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  resumeData.experience.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[var(--text-primary)]">Role #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resumeData.experience.filter((_, i) => i !== idx);
                            updateExperience(updated);
                          }}
                          className="text-rose-400 hover:text-rose-500 transition-colors"
                          title="Remove role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`input-exp-role-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Role Title{' '}
                            {(resumeData.candidateType === 'experienced' || exp.role?.trim() || exp.company?.trim()) && (
                              <span className="text-rose-500">*</span>
                            )}
                          </label>
                          <input
                            id={`input-exp-role-${idx}`}
                            type="text"
                            value={exp.role}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].role = e.target.value;
                              updateExperience(updated);
                              clearError(`experience.${idx}.role`);
                            }}
                            placeholder="Senior Software Engineer"
                            aria-invalid={Boolean(fieldErrors[`experience.${idx}.role`])}
                            aria-describedby={
                              fieldErrors[`experience.${idx}.role`]
                                ? `exp-role-${idx}-error`
                                : undefined
                            }
                            className={getInputClassName(
                              `experience.${idx}.role`,
                              'bg-[var(--bg-card)]'
                            )}
                          />
                          {fieldErrors[`experience.${idx}.role`] && (
                            <p
                              id={`exp-role-${idx}-error`}
                              role="alert"
                              className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {fieldErrors[`experience.${idx}.role`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`input-exp-company-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Company{' '}
                            {(resumeData.candidateType === 'experienced' || exp.role?.trim() || exp.company?.trim()) && (
                              <span className="text-rose-500">*</span>
                            )}
                          </label>
                          <input
                            id={`input-exp-company-${idx}`}
                            type="text"
                            value={exp.company}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].company = e.target.value;
                              updateExperience(updated);
                              clearError(`experience.${idx}.company`);
                            }}
                            placeholder="Nexus Technologies"
                            aria-invalid={Boolean(fieldErrors[`experience.${idx}.company`])}
                            aria-describedby={
                              fieldErrors[`experience.${idx}.company`]
                                ? `exp-comp-${idx}-error`
                                : undefined
                            }
                            className={getInputClassName(
                              `experience.${idx}.company`,
                              'bg-[var(--bg-card)]'
                            )}
                          />
                          {fieldErrors[`experience.${idx}.company`] && (
                            <p
                              id={`exp-comp-${idx}-error`}
                              role="alert"
                              className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {fieldErrors[`experience.${idx}.company`]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-medium text-[var(--text-primary)]">
                            Accomplishment Bullets (one per line)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleImproveBullet(idx)}
                            disabled={improvingExpIdx === idx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Wand2 className={`w-3 h-3 ${improvingExpIdx === idx ? 'animate-spin' : ''}`} />
                            {improvingExpIdx === idx ? 'Enhancing...' : 'AI Enhance Phrasing'}
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={exp.bulletPoints.join('\n')}
                          onChange={(e) => {
                            const updated = [...resumeData.experience];
                            updated[idx].bulletPoints = e.target.value.split('\n');
                            updateExperience(updated);
                          }}
                          placeholder="Developed web application features and resolved software defects to ensure platform reliability."
                          className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() =>
                    updateExperience([
                      ...resumeData.experience,
                      {
                        id: `exp_${Date.now()}`,
                        company: '',
                        role: '',
                        startDate: '2023-01',
                        endDate: '',
                        current: true,
                        bulletPoints: ['Spearheaded engineering deliverables with high performance.'],
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Experience Position
                </button>
              </div>
            )}

            {/* STEP 6: Projects */}
            {currentStep === 6 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-[var(--accent)]" />
                    <span>Capstone & Technical Projects</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/student/profile');
                        if (res.ok) {
                          const data = await res.json();
                          if (data.profile && Array.isArray(data.profile.projects) && data.profile.projects.length > 0) {
                            const imported = data.profile.projects.map((p: any) => ({
                              id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                              title: p.title || 'Untitled Project',
                              description: p.description || (p.highlights && p.highlights[0]) || '',
                              technologies: Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : ['React', 'TypeScript'],
                              link: p.repoUrl || p.liveUrl || '',
                              bullets: Array.isArray(p.highlights) ? p.highlights : [],
                            }));
                            updateProjects([
                              ...resumeData.projects.filter(p => p.title.trim()),
                              ...imported,
                            ]);
                            clearError('projects');
                            triggerToast(`Imported ${imported.length} project(s) from your Student Career Profile!`);
                            return;
                          }
                        }
                        triggerToast('No saved projects found in student profile. Please add them in Profile settings.');
                      } catch {
                        triggerToast('Could not load student profile.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Import from Student Profile</span>
                  </button>
                </div>

                {resumeData.candidateType === 'fresher' ? (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Required for freshers and entry-level candidates. Add at least 1 highlighted project.
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    Optional for experienced candidates. Include projects if you want to highlight open source or flagship systems.
                  </div>
                )}

                {fieldErrors['projects'] && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors['projects']}</span>
                  </div>
                )}

                {resumeData.projects.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center space-y-3">
                    <FolderGit2 className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
                    <p className="text-xs text-[var(--text-secondary)]">
                      {resumeData.candidateType === 'fresher'
                        ? 'No projects added yet. Freshers must add at least one project.'
                        : 'No projects added yet. Click below if you wish to add personal or open source projects.'}
                    </p>
                    <button
                      id="add-project-btn"
                      type="button"
                      onClick={() => {
                        updateProjects([
                          {
                            id: `proj_${Date.now()}`,
                            title: '',
                            description: '',
                            technologies: ['Python'],
                          },
                        ]);
                        clearError('projects');
                      }}
                      className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Project
                    </button>
                  </div>
                ) : (
                  resumeData.projects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[var(--text-primary)]">Project #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resumeData.projects.filter((_, i) => i !== idx);
                            updateProjects(updated);
                          }}
                          className="text-rose-400 hover:text-rose-500 transition-colors"
                          title="Remove project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label
                          htmlFor={`input-proj-title-${idx}`}
                          className="block font-medium text-[var(--text-primary)] mb-1"
                        >
                          Project Name{' '}
                          {(resumeData.candidateType === 'fresher' || proj.title?.trim() || proj.description?.trim()) && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        <input
                          id={`input-proj-title-${idx}`}
                          type="text"
                          value={proj.title}
                          onChange={(e) => {
                            const updated = [...resumeData.projects];
                            updated[idx].title = e.target.value;
                            updateProjects(updated);
                            clearError(`projects.${idx}.title`);
                          }}
                          placeholder="NeuralFlow Vector Search"
                          aria-invalid={Boolean(fieldErrors[`projects.${idx}.title`])}
                          aria-describedby={
                            fieldErrors[`projects.${idx}.title`]
                              ? `proj-title-${idx}-error`
                              : undefined
                          }
                          className={getInputClassName(
                            `projects.${idx}.title`,
                            'bg-[var(--bg-card)]'
                          )}
                        />
                        {fieldErrors[`projects.${idx}.title`] && (
                          <p
                            id={`proj-title-${idx}-error`}
                            role="alert"
                            className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {fieldErrors[`projects.${idx}.title`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-primary)] mb-1">
                          Technologies (comma separated)
                        </label>
                        <input
                          type="text"
                          value={proj.technologies.join(', ')}
                          onChange={(e) => {
                            const updated = [...resumeData.projects];
                            updated[idx].technologies = e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            updateProjects(updated);
                          }}
                          placeholder="Python, C++, Docker"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-medium text-[var(--text-primary)]">
                            Description & Impact
                          </label>
                          <button
                            type="button"
                            onClick={() => handleImproveProject(idx)}
                            disabled={improvingProjIdx === idx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Wand2 className={`w-3 h-3 ${improvingProjIdx === idx ? 'animate-spin' : ''}`} />
                            {improvingProjIdx === idx ? 'Enhancing...' : 'AI Enhance Phrasing'}
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => {
                            const updated = [...resumeData.projects];
                            updated[idx].description = e.target.value;
                            updateProjects(updated);
                          }}
                          placeholder="Designed and deployed high-performance vector search engine with millisecond latency."
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() =>
                    updateProjects([
                      ...resumeData.projects,
                      {
                        id: `proj_${Date.now()}`,
                        title: '',
                        description: '',
                        technologies: ['Python'],
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Project
                </button>
              </div>
            )}

            {/* STEP 7: Certifications */}
            {currentStep === 7 && (
              <div className="space-y-4 text-xs">
                <p className="text-xs text-[var(--text-secondary)]">
                  Certifications are optional. Add credentials, professional licenses, or cloud badges.
                </p>

                {resumeData.certifications.map((cert, idx) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[var(--text-primary)]">Certification #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = resumeData.certifications.filter((_, i) => i !== idx);
                          updateCertifications(updated);
                        }}
                        className="text-rose-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...resumeData.certifications];
                          updated[idx].name = e.target.value;
                          updateCertifications(updated);
                        }}
                        placeholder="AWS Solutions Architect"
                        className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                      />
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...resumeData.certifications];
                          updated[idx].issuer = e.target.value;
                          updateCertifications(updated);
                        }}
                        placeholder="Amazon Web Services"
                        className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    updateCertifications([
                      ...resumeData.certifications,
                      {
                        id: `cert_${Date.now()}`,
                        name: '',
                        issuer: '',
                        date: '2024',
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Certification
                </button>
              </div>
            )}

            {/* STEP 8: Template Library */}
            {currentStep === 8 && (
              <div className="space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Choose from 12 distinct, professionally designed resume templates:
                  </p>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    12 Designs Available
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {[
                    'All',
                    'ATS-Friendly',
                    'Freshers',
                    'Experienced',
                    'Technical',
                    'Creative',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      id={`btn-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Template Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
                  {RESUME_TEMPLATES.filter((tmpl) => {
                    if (selectedCategory === 'All') return true;
                    if (selectedCategory === 'ATS-Friendly') return tmpl.isAtsFriendly;
                    if (selectedCategory === 'Freshers') {
                      return tmpl.category === 'Freshers' || tmpl.tags?.includes('Freshers');
                    }
                    if (selectedCategory === 'Experienced') {
                      return tmpl.category === 'Experienced' || tmpl.tags?.includes('Experienced');
                    }
                    if (selectedCategory === 'Technical') {
                      return tmpl.category === 'Technical' || tmpl.tags?.includes('Technical');
                    }
                    if (selectedCategory === 'Creative') {
                      return tmpl.category === 'Creative' || tmpl.isVisualLayout || tmpl.tags?.includes('Creative');
                    }
                    return (
                      tmpl.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                      tmpl.tags?.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()))
                    );
                  }).map((tmpl) => {
                    const isSelected =
                      normalizeTemplateId(resumeData.templateId) === tmpl.id;
                    const hasEnteredInfo = Boolean(
                      resumeData.personalInfo?.fullName?.trim() || resumeData.summary?.trim()
                    );
                    return (
                      <TemplateCard
                        key={tmpl.id}
                        template={tmpl}
                        isSelected={isSelected}
                        onSelect={(id) => setTemplateId(id)}
                        onPreview={(id) => {
                          setTemplateId(id);
                          setCurrentStep(9);
                        }}
                        previewData={hasEnteredInfo ? resumeData : MINI_SAMPLE_RESUME_DATA}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 9: Preview Instructions & Verification */}
            {currentStep === 9 && (
              <div className="space-y-4 text-left text-xs">
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] text-xs">
                      Selected Template
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-subtle)] px-2.5 py-0.5 rounded-md border border-[var(--accent)]/20">
                      {RESUME_TEMPLATES.find(
                        (t) => t.id === normalizeTemplateId(resumeData.templateId)
                      )?.name || 'ATS Classic'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Review your resume in the live document preview. Zoom in to check formatting and spacing before downloading.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(8)}
                    className="btn-secondary btn-sm flex-1 text-xs cursor-pointer"
                  >
                    Change Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(10)}
                    className="btn-primary btn-sm flex-1 text-xs shadow-sm cursor-pointer"
                  >
                    Proceed to Download
                  </button>
                </div>
              </div>
            )}

            {/* STEP 10: Generate & Download PDF */}
            {currentStep === 10 && (
              <div className="space-y-4 text-left text-xs">
                <div className="p-4 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">Resume ready</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Prepared with{' '}
                      <strong className="text-[var(--text-primary)]">
                        {RESUME_TEMPLATES.find(
                          (t) => t.id === normalizeTemplateId(resumeData.templateId)
                        )?.name || 'ATS Classic'}
                      </strong>{' '}
                      template. Choose Save as PDF in the print dialog.
                    </p>
                  </div>
                </div>

                {/* Primary & Secondary Actions */}
                <div className="space-y-2.5 pt-1">
                  <button
                    id="btn-download-pdf"
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isExporting}
                    className="btn-primary w-full text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Preparing PDF...' : 'Download PDF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn-secondary w-full text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Edit Resume
                  </button>
                </div>

                {/* Return to the preview without repeating the export action. */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="btn-ghost text-xs inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Preview</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons (Steps 1 to 9) */}
            {currentStep < 10 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {currentStep === 9 ? 'Generate Resume' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Live A4 Document Preview */}
        <div
          className={`resume-preview-column ${
            currentStep >= 9 ? 'lg:col-span-8' : 'lg:col-span-6'
          } flex flex-col items-center min-w-0 w-full max-w-full overflow-hidden`}
        >
          {/* Zoom & Document Viewer Controls */}
          <div className="no-print w-full flex items-center justify-between mb-3 px-1 sm:px-2 gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
              <Eye className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span>Resume Preview</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs shrink-0">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.28}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Zoom out"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono font-medium text-[var(--text-primary)] min-w-[38px] text-center text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 1.25}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                aria-label="Zoom in"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-1 transition-colors cursor-pointer"
                aria-label="Fit resume preview to screen"
                title="Fit to Screen"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Fit
              </button>
            </div>
          </div>

          {/* Scrollable A4 Viewport Container */}
          <div
            ref={previewViewportRef}
            id="resume-print-viewport"
            className="resume-preview-viewport w-full max-w-full overflow-x-auto overflow-y-auto max-h-[820px] rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl p-3 sm:p-5 flex justify-center shadow-[var(--shadow-glass)] subtle-grid focus:outline-none"
            tabIndex={0}
            role="region"
            aria-label="A4 Resume Preview Viewport"
          >
            <A4ResumeDocument
              data={resumeData}
              templateId={resumeData.templateId}
              zoom={zoom}
            />
          </div>
        </div>
      </div>

      {/* Target Job Specification Modal */}
      {showTargetJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="w-full max-w-xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Target Job Specification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetJobModal(false)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-[var(--text-secondary)] block text-[11px]">Role & Company</span>
                <p className="font-bold text-[var(--text-primary)] text-sm">
                  {targetJob.title || 'Not specified'} {targetJob.company ? `@ ${targetJob.company}` : ''}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[var(--text-secondary)] block text-[11px] mb-1">Job Description Requirements</span>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] max-h-60 overflow-y-auto leading-relaxed text-[var(--text-secondary)] font-mono text-[11px] whitespace-pre-wrap">
                  {targetJob.description || 'No job description text provided.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <Link
                href="/analyzer"
                className="btn-primary btn-sm inline-flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-Analyze in Analyser
              </Link>
              <button
                type="button"
                onClick={() => setShowTargetJobModal(false)}
                className="btn-secondary btn-sm cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Snapshot Modal */}
      {showSaveSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="relative w-full max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Save Resume Snapshot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveSnapshotModal(false)}
                className="btn-icon btn-icon-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Create a named checkpoint of your current resume data. You can restore this version at any time from your version history.
            </p>

            <form onSubmit={handleSaveSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Change Note / Summary
                </label>
                <input
                  type="text"
                  value={snapshotSummary}
                  onChange={(e) => setSnapshotSummary(e.target.value)}
                  placeholder="e.g. Tailored for Senior Frontend role"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  maxLength={120}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveSnapshotModal(false)}
                  className="btn-secondary btn-sm cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSnapshot}
                  className="btn-primary btn-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 text-xs shadow-sm"
                >
                  {isSavingSnapshot ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Snapshot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="relative w-full max-w-xl rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Resume Version History
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Saved revisions for this resume ({versions.length} available)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionsModal(false)}
                className="btn-icon btn-icon-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingVersions ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                  <span>Loading version history...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-color)] p-6">
                  <History className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    No versions saved yet
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                    Click &quot;Save Snapshot&quot; anytime to preserve your resume state so you can restore it later.
                  </p>
                </div>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)]/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                          v{ver.versionNumber ?? ver.version_number}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {ver.changeSummary ?? ver.change_summary ?? `Version ${ver.versionNumber ?? ver.version_number ?? ''}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                        <span>{new Date(ver.createdAt ?? ver.created_at).toLocaleString()}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isRestoringVersionId === ver.id}
                      onClick={() => handleRestoreVersion(ver.id, ver.versionNumber ?? ver.version_number ?? 1)}
                      className="btn-secondary btn-sm h-8 px-3 text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isRestoringVersionId === ver.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Restoring...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3 text-[var(--accent)]" />
                          <span>Restore</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowVersionsModal(false);
                  setShowSaveSnapshotModal(true);
                }}
                className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save New Snapshot</span>
              </button>
              <button
                type="button"
                onClick={() => setShowVersionsModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumeBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResumeBuilderContent />
    </Suspense>
  );
}
