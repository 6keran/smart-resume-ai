'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileEdit,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Cpu,
  AlertCircle,
  AlertTriangle,
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
  UploadCloud,
  FileText,
  Undo2,
  Redo2,
  Sparkles,
  Languages,
  Layers,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  BookOpen,
  Wrench,
  Compass,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { RESUME_TEMPLATES, MINI_SAMPLE_RESUME_DATA, normalizeTemplateId } from '@/lib/templates';
import { isClientDraftResumeId, ResumeData } from '@/types/resume';
import { GlassCard } from '@/components/ui/GlassCard';
import { A4ResumeDocument } from '@/components/builder/A4ResumeDocument';
import { TemplateCard } from '@/components/builder/TemplateCard';
import { AtsFriendlyPreview } from '@/components/builder/AtsFriendlyPreview';

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
    updateLanguages,
    updateAchievements,
    updateSectionOrder,
    updateObjective,
    updateAdditionalInfo,
    updateCustomSections,
    updateHiddenSections,
    setTemplateId,
    setCandidateType,
    targetJob,
    clearTargetJob,
    analysisResult,
    runAnalysis,
    activeResumeId: contextActiveResumeId,
    setActiveResumeId: setContextActiveResumeId,
    isRehydrating,
    saveState,
    saveError,
    lastSavedAt,
    saveActiveResume,
    userResumes,
    isLoadingUserResumes,
    fetchUserResumes,
    switchActiveResume,
    removeActiveResume,
    createNewResume,
    uploadNewResume,
    setActiveResume,
    hasUnsavedChanges,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useResume();

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlResumeId = searchParams?.get('resumeId') || null;
  const syncedUrlResumeIdRef = useRef<string | null>(null);
  const activeResumeId = urlResumeId || contextActiveResumeId;
  const setActiveResumeId = setContextActiveResumeId;
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [showSaveSnapshotModal, setShowSaveSnapshotModal] = useState<boolean>(false);
  const [snapshotSummary, setSnapshotSummary] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);
  const [isRestoringVersionId, setIsRestoringVersionId] = useState<string | null>(null);

  // Languages & Achievements Form Inputs
  const [languageInput, setLanguageInput] = useState<string>('');
  const [languageProficiency, setLanguageProficiency] = useState<string>('Fluent');
  const [achievementInput, setAchievementInput] = useState<string>('');

  // Categorized Skills state
  const [skillCategorySelect, setSkillCategorySelect] = useState<string>('Design Software');
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<string>('Intermediate');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');

  // Resume Switching, Removal & Upload State
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [showUploadResumeModal, setShowUploadResumeModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showResumeSelectorDropdown, setShowResumeSelectorDropdown] = useState<boolean>(false);
  const [showAddResumeDropdown, setShowAddResumeDropdown] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [isDraggingUpload, setIsDraggingUpload] = useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [previewTab, setPreviewTab] = useState<'design' | 'ats' | 'text'>('design');
  const [relativeSavedText, setRelativeSavedText] = useState<string>('Saved');
  const [zoom, setZoom] = useState<number>(0.60);

  useEffect(() => {
    if (!lastSavedAt) {
      setRelativeSavedText('Saved');
      return;
    }

    const updateRelative = () => {
      const diffMs = Date.now() - new Date(lastSavedAt).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 5) {
        setRelativeSavedText('Saved');
      } else if (diffSec < 60) {
        setRelativeSavedText(`Saved ${diffSec}s ago`);
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        setRelativeSavedText(`Saved ${mins}m ago`);
      } else {
        setRelativeSavedText('Saved');
      }
    };

    updateRelative();
    const interval = setInterval(updateRelative, 5000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);
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
  const [showSummaryCompare, setShowSummaryCompare] = useState<boolean>(false);
  const [isImprovingObjective, setIsImprovingObjective] = useState<boolean>(false);
  const [objectiveAiSuggestion, setObjectiveAiSuggestion] = useState<{
    improved: string;
    reasoning: string;
  } | null>(null);
  const [showObjectiveCompare, setShowObjectiveCompare] = useState<boolean>(false);
  const [bulletAiSuggestion, setBulletAiSuggestion] = useState<{
    expIndex: number;
    original: string;
    improvedList: string[];
    reasoning?: string;
  } | null>(null);
  const [showBulletCompare, setShowBulletCompare] = useState<boolean>(false);
  const [improvingExpIdx, setImprovingExpIdx] = useState<number | null>(null);
  const [improvingProjIdx, setImprovingProjIdx] = useState<number | null>(null);
  const [tailorSuccessToast, setTailorSuccessToast] = useState<string | null>(null);

  // Opt-In Career Profile Import State
  const [showImportProfileModal, setShowImportProfileModal] = useState<boolean>(false);
  const [isLoadingImportProfile, setIsLoadingImportProfile] = useState<boolean>(false);
  const [importProfileError, setImportProfileError] = useState<string | null>(null);
  const [importProfileData, setImportProfileData] = useState<{
    account: { name: string; email: string | null } | null;
    targetRole: string | null;
    goalSet: boolean;
    profile: {
      institution: string;
      degree: string;
      fieldOfStudy: string;
      graduationYear: number;
      projects?: any[];
    } | null;
    skills: Array<{
      id: string;
      name: string;
      status: string;
      source?: string;
      confirmedAt?: string;
    }>;
  } | null>(null);
  const [selectedImportSkills, setSelectedImportSkills] = useState<string[]>([]);
  const [includePersonalImport, setIncludePersonalImport] = useState<boolean>(true);
  const [includeEducationImport, setIncludeEducationImport] = useState<boolean>(true);

  const handleOpenImportProfileModal = async () => {
    setShowImportProfileModal(true);
    setIsLoadingImportProfile(true);
    setImportProfileError(null);
    try {
      const res = await fetch('/api/user/my-data');
      if (res.status === 401) {
        setImportProfileError('Please sign in to import data from your career profile.');
        setImportProfileData(null);
        return;
      }
      if (!res.ok) {
        setImportProfileError('Could not load your career profile.');
        return;
      }
      const data = await res.json();
      setImportProfileData(data);
      const confirmedDefaults = Array.isArray(data.skills)
        ? data.skills
            .filter(
              (s: { status?: string; confirmedAt?: string }) =>
                s.status === 'verified' || s.status === 'confirmed' || Boolean(s.confirmedAt)
            )
            .map((s: { name: string }) => s.name)
        : [];
      setSelectedImportSkills(confirmedDefaults);
      setIncludePersonalImport(true);
      setIncludeEducationImport(Boolean(data.profile?.institution || data.profile?.degree));
    } catch {
      setImportProfileError('Network error while loading your career profile.');
    } finally {
      setIsLoadingImportProfile(false);
    }
  };

  const handleApplyProfileImport = (mode: 'fill_empty' | 'merge') => {
    if (!importProfileData) return;
    let appliedSections = 0;

    if (includePersonalImport) {
      const nextPersonal: Partial<ResumeData['personalInfo']> = {};
      const acctName = importProfileData.account?.name?.trim() || '';
      const acctEmail = importProfileData.account?.email?.trim() || '';
      const goalHeadline = importProfileData.goalSet && importProfileData.targetRole ? importProfileData.targetRole.trim() : '';

      if (acctName && !resumeData.personalInfo.fullName?.trim()) {
        nextPersonal.fullName = acctName;
      }
      if (acctEmail && !resumeData.personalInfo.email?.trim()) {
        nextPersonal.email = acctEmail;
      }
      if (goalHeadline && !resumeData.personalInfo.headline?.trim()) {
        nextPersonal.headline = goalHeadline;
      }

      if (Object.keys(nextPersonal).length > 0) {
        updatePersonalInfo(nextPersonal);
        appliedSections += 1;
      }
    }

    if (includeEducationImport && importProfileData.profile) {
      const p = importProfileData.profile;
      if (p.institution || p.degree) {
        const shouldApplyEdu =
          mode === 'fill_empty'
            ? resumeData.education.length === 0
            : !resumeData.education.some(
                (edu) =>
                  edu.institution.trim().toLowerCase() === (p.institution || '').trim().toLowerCase() &&
                  edu.degree.trim().toLowerCase() === (p.degree || '').trim().toLowerCase()
              );

        if (shouldApplyEdu) {
          const newEdu = {
            id: `edu_${Date.now()}`,
            degree: p.degree || '',
            qualification: p.fieldOfStudy || '',
            institution: p.institution || '',
            university: p.fieldOfStudy || '',
            graduationYear: p.graduationYear ? String(p.graduationYear) : '',
            gpa: '',
          };
          updateEducation(mode === 'fill_empty' ? [newEdu] : [...resumeData.education, newEdu]);
          appliedSections += 1;
        }
      }
    }

    if (selectedImportSkills.length > 0) {
      const existingTech = resumeData.skills?.technical || [];
      const existingLower = new Set(
        [
          ...existingTech,
          ...(resumeData.skills?.tools || []),
          ...(resumeData.skills?.soft || []),
        ].map((s) => s.toLowerCase())
      );

      if (mode === 'fill_empty') {
        if (existingTech.length === 0) {
          updateSkills({
            ...resumeData.skills,
            technical: Array.from(new Set(selectedImportSkills)),
          });
          appliedSections += 1;
        }
      } else {
        const additions = selectedImportSkills.filter((sk) => !existingLower.has(sk.toLowerCase()));
        if (additions.length > 0) {
          updateSkills({
            ...resumeData.skills,
            technical: [...existingTech, ...additions],
          });
          appliedSections += 1;
        }
      }
    }

    if (importProfileData.profile?.projects && Array.isArray(importProfileData.profile.projects) && importProfileData.profile.projects.length > 0) {
      const existingTitles = new Set(resumeData.projects.map((p) => (p.title || '').trim().toLowerCase()));
      const toImport = importProfileData.profile.projects
        .filter((p: any) => p.title && (mode === 'fill_empty' ? resumeData.projects.length === 0 : !existingTitles.has(p.title.trim().toLowerCase())))
        .map((p: any, idx: number) => ({
          id: `proj_${Date.now()}_${idx}`,
          title: p.title || '',
          role: p.role || 'Lead Developer',
          objective: '',
          technologies: Array.isArray(p.techStack) ? p.techStack : [],
          description: p.description || '',
          outcome: '',
          bullets: Array.isArray(p.highlights) && p.highlights.length > 0 ? p.highlights : [p.description || ''].filter(Boolean),
          link: p.repoUrl || p.liveUrl || '',
        }));

      if (toImport.length > 0) {
        updateProjects(mode === 'fill_empty' ? toImport : [...resumeData.projects, ...toImport]);
        appliedSections += 1;
      }
    }

    setShowImportProfileModal(false);
    triggerToast(
      appliedSections > 0
        ? mode === 'fill_empty'
          ? 'Filled empty resume fields from your career profile.'
          : 'Merged selected career profile items into your resume.'
        : 'All selected profile items are already present in this resume.'
    );
  };

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

  // Global Keyboard Shortcuts (Ctrl+Z Undo, Ctrl+Y Redo, Ctrl+S Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (canRedo) redo();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveActiveResume(resumeData);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, saveActiveResume, resumeData]);

  // Handle URL resumeId sync on mount / param change after initial rehydration
  useEffect(() => {
    if (isRehydrating) return;

    if (!urlResumeId) {
      syncedUrlResumeIdRef.current = null;
      return;
    }

    if (syncedUrlResumeIdRef.current === urlResumeId) {
      return;
    }

    syncedUrlResumeIdRef.current = urlResumeId;

    if (contextActiveResumeId !== urlResumeId) {
      switchActiveResume(urlResumeId).then((switched) => {
        if (!switched) {
          router.replace('/builder', { scroll: false });
        }
      });
    }
  }, [isRehydrating, urlResumeId, contextActiveResumeId, switchActiveResume, router]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#btn-resume-selector') && !target.closest('#dropdown-resume-selector')) {
        setShowResumeSelectorDropdown(false);
      }
      if (!target.closest('#btn-add-resume') && !target.closest('#dropdown-add-resume')) {
        setShowAddResumeDropdown(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Compute active resume display title
  const currentResumeTitle =
    (userResumes.find((r) => r.id === activeResumeId) as any)?.title ||
    userResumes.find((r) => r.id === activeResumeId)?.filename ||
    (resumeData.personalInfo?.fullName
      ? `${resumeData.personalInfo.fullName}'s Resume`
      : 'Active Resume');

  const previewViewportRef = useRef<HTMLDivElement>(null);
  const autoFitZoomRef = useRef<boolean>(true);

  const isFresher = resumeData.candidateType === 'fresher';

  // Quick feedback toast helper
  const triggerToast = (msg: string) => {
    setTailorSuccessToast(msg);
    setTimeout(() => {
      setTailorSuccessToast(null);
    }, 4500);
  };

  // Fetch Cloud Version Snapshots
  const fetchVersions = async (targetResumeId?: string) => {
    const effectiveResumeId = targetResumeId || activeResumeId;
    if (!effectiveResumeId || isClientDraftResumeId(effectiveResumeId)) {
      setVersions([]);
      return;
    }
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/user/resumes/versions?resumeId=${encodeURIComponent(effectiveResumeId)}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleOpenVersionsModal = () => {
    setShowVersionsModal(true);
    fetchVersions();
  };

  // Save named snapshot
  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSnapshot(true);
    const summary = snapshotSummary.trim() || `Manual checkpoint - ${new Date().toLocaleTimeString()}`;
    const effectiveResumeId = activeResumeId;

    try {
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

  // Resume Management Actions
  const handleRemoveResumeConfirmed = async () => {
    setIsRemoving(true);
    // Prefer the URL deep-link id so removing a non-active resume via
    // /builder?resumeId=... deletes that resume, never the active one.
    const idToRemove =
      urlResumeId ||
      contextActiveResumeId ||
      (!isClientDraftResumeId(resumeData.id) ? resumeData.id : undefined);
    const hadSavedResume = Boolean(idToRemove && !isClientDraftResumeId(idToRemove));
    const result = await removeActiveResume(idToRemove);
    setIsRemoving(false);
    setShowRemoveConfirmModal(false);

    if (result.success) {
      setVersions([]);
      if (urlResumeId) {
        router.replace('/builder', { scroll: false });
      }
      triggerToast(hadSavedResume ? 'Resume removed successfully.' : 'Draft cleared.');
    } else {
      triggerToast(result.error || 'Could not remove resume.');
    }
  };

  const handleCreateNewResume = async () => {
    setIsCreatingNew(true);
    setShowAddResumeDropdown(false);
    const result = await createNewResume();
    setIsCreatingNew(false);

    if (result.success) {
      setVersions([]);
      setCurrentStep(1);
      if (urlResumeId) {
        router.replace('/builder', { scroll: false });
      }
      triggerToast('Created a new blank resume draft.');
    } else {
      triggerToast(result.error || 'Failed to create resume.');
    }
  };

  const handleUploadNewResume = async (fileToUpload?: File) => {
    const targetFile = fileToUpload || uploadFile;
    if (!targetFile) {
      setUploadError('Please select a PDF or DOCX file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const result = await uploadNewResume(targetFile);
    setIsUploading(false);

    if (result.success) {
      setVersions([]);
      setShowUploadResumeModal(false);
      setUploadFile(null);
      setCurrentStep(1);
      if (urlResumeId) {
        router.replace('/builder', { scroll: false });
      }
      triggerToast(`Uploaded and parsed "${targetFile.name}" successfully!`);
    } else {
      setUploadError(result.error || 'Failed to upload and parse resume file.');
    }
  };

  // AI Assistant: Improve Summary
  const handleTailorSummary = async () => {
    const raw = resumeData.summary;
    if (!raw.trim()) {
      triggerToast('Please write your initial summary before asking AI to refine it.');
      return;
    }

    setIsImprovingSummary(true);
    setSummaryAiSuggestion(null);

    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: isFresher ? 'Career Objective & Summary' : 'Professional Summary',
          originalContent: raw.trim(),
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSummaryAiSuggestion({
          improved: data.improvedContent || raw,
          reasoning: data.reasoning || 'Refined tone and impact while preserving facts.',
        });
      } else {
        triggerToast('AI Assistant currently busy. Please try again in a few moments.');
      }
    } catch (err) {
      console.error('Tailor summary error:', err);
      triggerToast('AI Assistant unavailable. Check your connection.');
    } finally {
      setIsImprovingSummary(false);
    }
  };

  // AI Assistant: Improve Career Objective
  const handleTailorObjective = async () => {
    const raw = resumeData.objective || '';
    if (!raw.trim()) {
      triggerToast('Please write your initial career objective before asking AI to tailor it.');
      return;
    }

    setIsImprovingObjective(true);
    setObjectiveAiSuggestion(null);

    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: 'Career Objective',
          originalContent: raw.trim(),
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setObjectiveAiSuggestion({
          improved: data.improvedContent || raw,
          reasoning: data.reasoning || 'Polished for clarity and professional tone.',
        });
      } else {
        triggerToast('AI Assistant currently busy. Please try again in a few moments.');
      }
    } catch (err) {
      console.error('Tailor objective error:', err);
      triggerToast('AI Assistant unavailable. Check your connection.');
    } finally {
      setIsImprovingObjective(false);
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
        const improvedList = (data.improvedContent || '')
          .split('\n')
          .map((b: string) => b.trim())
          .filter(Boolean);
        setBulletAiSuggestion({
          expIndex,
          original: bulletToImprove,
          improvedList: improvedList.length > 0 ? improvedList : [data.improvedContent],
          reasoning: data.reasoning || 'Elevated with strong leadership verbs and quantified impact metrics.',
        });
        setShowBulletCompare(true);
        triggerToast('AI suggestion ready! Review and Accept, Reject, or Compare.');
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

  // Comprehensive 16-step structure covering all 12 required sections
  const steps = [
    { number: 1, id: 'personal', label: 'Personal Information', icon: User, sectionKey: 'personal' },
    { number: 2, id: 'summary', label: 'Professional Summary', icon: Wand2, sectionKey: 'summary' },
    { number: 3, id: 'objective', label: 'Career Objective', icon: Target, sectionKey: 'objective' },
    { number: 4, id: 'skills', label: 'Technical Skills', icon: Cpu, sectionKey: 'skills' },
    { number: 5, id: 'education', label: 'Educational Qualifications', icon: GraduationCap, sectionKey: 'education' },
    { number: 6, id: 'experience', label: isFresher ? 'Internships / Experience' : 'Work Experience', icon: Briefcase, sectionKey: 'experience' },
    { number: 7, id: 'projects', label: 'Academic & Technical Projects', icon: FolderGit2, sectionKey: 'projects' },
    { number: 8, id: 'certifications', label: 'Certifications & Training', icon: Award, sectionKey: 'certifications' },
    { number: 9, id: 'achievements', label: 'Key Achievements', icon: Sparkles, sectionKey: 'achievements' },
    { number: 10, id: 'soft-skills', label: 'Soft Skills', icon: ShieldCheck, sectionKey: 'softSkills' },
    { number: 11, id: 'languages', label: 'Languages Known', icon: Languages, sectionKey: 'languages' },
    { number: 12, id: 'additional', label: 'Additional Information', icon: Clock, sectionKey: 'additionalInfo' },
    { number: 13, id: 'custom-sections', label: 'Custom Sections', icon: Plus, sectionKey: 'customSections' },
    { number: 14, id: 'reorder', label: 'Section Reorder & Visibility', icon: Layers, sectionKey: 'reorder' },
    { number: 15, id: 'template', label: 'Resume Template', icon: Layout, sectionKey: 'template' },
    { number: 16, id: 'generate', label: 'Download PDF', icon: Download, sectionKey: 'generate' },
  ];

  const DEFAULT_SECTIONS = [
    { id: 'summary', label: 'Professional Summary' },
    { id: 'objective', label: 'Career Objective' },
    { id: 'skills', label: 'Technical Skills' },
    { id: 'education', label: 'Educational Qualifications' },
    { id: 'experience', label: isFresher ? 'Internships & Experience' : 'Work Experience' },
    { id: 'projects', label: 'Academic & Technical Projects' },
    { id: 'certifications', label: 'Certifications & Training' },
    { id: 'achievements', label: 'Key Achievements & Honors' },
    { id: 'softSkills', label: 'Soft Skills' },
    { id: 'languages', label: 'Languages Known' },
    { id: 'additionalInfo', label: 'Additional Information' },
  ];

  const activeSectionOrder = (resumeData.sectionOrder && resumeData.sectionOrder.length > 0)
    ? resumeData.sectionOrder
    : DEFAULT_SECTIONS.map((s) => s.id);

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const newOrder = [...activeSectionOrder];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    updateSectionOrder(newOrder);
    triggerToast('Updated section order.');
  };

  const toggleSectionVisibility = (sectionKey: string) => {
    const currentHidden = resumeData.hiddenSections || [];
    const isHidden = currentHidden.includes(sectionKey);
    const updated = isHidden
      ? currentHidden.filter((k) => k !== sectionKey)
      : [...currentHidden, sectionKey];
    updateHiddenSections(updated);
    triggerToast(
      isHidden
        ? `Section is now visible on your resume.`
        : `Section hidden from printed resume.`
    );
  };

  const isSectionComplete = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return Boolean(resumeData.personalInfo?.fullName?.trim() && resumeData.personalInfo?.email?.trim());
      case 2:
        return Boolean(resumeData.summary?.trim() && resumeData.summary.trim().length >= 20);
      case 3:
        return Boolean(resumeData.objective?.trim() && resumeData.objective.trim().length >= 10);
      case 4:
        return Boolean(
          (resumeData.skills?.technical && resumeData.skills.technical.length > 0) ||
          (resumeData.skills?.categories && resumeData.skills.categories.some((c) => c.skills.length > 0))
        );
      case 5:
        return Boolean(
          (resumeData.education || []).some((e) => e.degree?.trim() && e.institution?.trim())
        );
      case 6:
        return Boolean(
          (resumeData.experience || []).some((e) => e.role?.trim() && e.company?.trim())
        );
      case 7:
        return Boolean((resumeData.projects || []).some((p) => p.title?.trim()));
      case 8:
        return Boolean((resumeData.certifications || []).length > 0);
      case 9:
        return Boolean((resumeData.achievements || []).length > 0);
      case 10:
        return Boolean((resumeData.skills?.soft || []).length > 0);
      case 11:
        return Boolean((resumeData.languages || []).length > 0);
      case 12:
        return Boolean(
          resumeData.additionalInfo &&
          (resumeData.additionalInfo.noticePeriod ||
            resumeData.additionalInfo.relocation ||
            resumeData.additionalInfo.shiftPreference ||
            resumeData.additionalInfo.shiftAvailability ||
            resumeData.additionalInfo.drivingLicence)
        );
      case 13:
        return Boolean(resumeData.customSections && resumeData.customSections.length > 0);
      case 14:
      case 15:
      case 16:
        return true;
      default:
        return false;
    }
  };

  const completedStepsCount = steps.filter((s) => isSectionComplete(s.number)).length;

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
        if (stepNum >= 1 && stepNum <= steps.length) {
          setCurrentStep(stepNum);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsStepLoaded(true);
    }
  }, [steps.length]);

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
      // Objective is optional; if entered, check minimum length
      if (data.objective?.trim() && data.objective.trim().length < 10) {
        addError(
          'objective',
          'Career objective must be at least 10 characters.',
          'input-objective'
        );
      }
    } else if (step === 4) {
      // Skills
      const hasTechnicalSkills =
        (data.skills.technical && data.skills.technical.length > 0) ||
        (data.skills.categories && data.skills.categories.some((c) => c.skills.length > 0));
      if (!hasTechnicalSkills) {
        addError(
          'skills.technical',
          'Please enter at least one technical skill.',
          'input-skills-technical'
        );
      }
    } else if (step === 5) {
      // Education
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
    } else if (step === 6) {
      // Experience
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
    } else if (step === 7) {
      // Projects
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
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
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

    // Moving forward requires validating intermediate steps
    const result = validateUpToStep(targetStep, resumeData);
    if (!result.isValid) {
      setFieldErrors(result.errors);
      setGlobalBanner(
        `Please complete the required fields in Step 0${result.invalidStep} before advancing.`
      );
      if (result.invalidStep) {
        setCurrentStep(result.invalidStep);
      }
      focusElement(result.firstErrorField);
      return;
    }

    setFieldErrors({});
    setGlobalBanner(null);
    setCurrentStep(targetStep);
  };

  // Download PDF / Print handler
  const handleDownloadPdf = async () => {
    // Validate required steps 1 through 7
    const validation = validateUpToStep(8, resumeData);
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
      <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 sm:p-6 shadow-sm no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Resume Builder &amp; Editor
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Build, edit, and organize complete resumes across engineering, corporate, and ATS-friendly templates.
            </p>
          </div>

          {/* Actions & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Resume Selector Dropdown */}
            <div className="relative">
              <button
                id="btn-resume-selector"
                type="button"
                onClick={() => {
                  setShowResumeSelectorDropdown((prev) => !prev);
                  setShowAddResumeDropdown(false);
                }}
                className="btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 max-w-[220px]"
                title="Switch between your saved resumes"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate text-xs font-semibold">
                  {currentResumeTitle}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-150 shrink-0 ${
                    showResumeSelectorDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showResumeSelectorDropdown && (
                <div
                  id="dropdown-resume-selector"
                  className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 p-2 space-y-1 animate-fade-in"
                >
                  <div className="px-3 py-2 border-b border-[var(--border-color)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Your Resumes ({userResumes.length})
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {userResumes.map((r) => {
                      const isCurrent = r.id === activeResumeId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={async () => {
                            setShowResumeSelectorDropdown(false);
                            const switched = await switchActiveResume(r.id);
                            if (switched) {
                              setVersions([]);
                              if (urlResumeId) {
                                router.replace('/builder', { scroll: false });
                              }
                              triggerToast(`Switched to "${(r as any).title || r.filename || 'Untitled Resume'}".`);
                            } else {
                              triggerToast('Could not switch to that resume.');
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                              : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-medium">{(r as any).title || r.filename || 'Untitled Resume'}</p>
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              Updated {new Date((r as any).updatedAt || r.uploaded_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-white font-semibold shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Add Resume Button */}
            <div className="relative">
              <button
                id="btn-add-resume"
                type="button"
                onClick={() => {
                  setShowAddResumeDropdown((prev) => !prev);
                  setShowResumeSelectorDropdown(false);
                }}
                className="btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs font-semibold">Add Resume</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-150 ${
                    showAddResumeDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showAddResumeDropdown && (
                <div
                  id="dropdown-add-resume"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 p-2 space-y-1 animate-fade-in"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddResumeDropdown(false);
                      setShowUploadResumeModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer text-left"
                  >
                    <UploadCloud className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <div>
                      <span className="font-semibold block">Upload Resume</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">PDF or DOCX format</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateNewResume}
                    disabled={isCreatingNew}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-semibold block">Create Blank Resume</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Start fresh with editor</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Remove Active Resume Button */}
            <button
              id="btn-remove-resume"
              type="button"
              onClick={() => setShowRemoveConfirmModal(true)}
              disabled={!activeResumeId && userResumes.length === 0 && !hasUnsavedChanges}
              className="btn-ghost btn-sm text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent text-xs inline-flex items-center gap-1.5 cursor-pointer"
              title={
                !activeResumeId && userResumes.length === 0 && !hasUnsavedChanges
                  ? 'No active resume or draft to remove'
                  : 'Remove this resume'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove Resume</span>
            </button>

            {/* 4. Undo / Redo controls */}
            <div className="flex items-center gap-1 border-l border-[var(--border-color)] pl-2">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="btn-icon btn-icon-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="btn-icon btn-icon-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Save Status Pill */}
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
              <AnimatePresence mode="wait">
                {saveState === 'saving' ? (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                  >
                    <Loader2 className="w-3 h-3 text-[var(--accent)] animate-spin" />
                    <span className="text-[10px] text-[var(--text-secondary)]">Saving...</span>
                  </motion.div>
                ) : hasUnsavedChanges ? (
                  <motion.div
                    key="unsaved"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] text-amber-500 font-medium">Unsaved</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-medium">{relativeSavedText}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 6. Target Job Tailoring Pill */}
            <button
              type="button"
              onClick={() => setShowTargetJobModal(true)}
              className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs cursor-pointer"
              title="Tailor this resume for a specific job target"
            >
              <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="truncate max-w-[110px]">
                {targetJob.title || 'Target Job'}
              </span>
            </button>

            {/* 7. Version History Snapshot Button */}
            <button
              type="button"
              onClick={handleOpenVersionsModal}
              className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs cursor-pointer"
              title="View revision snapshots and restore earlier versions"
            >
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Versions</span>
            </button>

            {/* 8. Opt-In Career Profile Import Button */}
            <button
              type="button"
              onClick={handleOpenImportProfileModal}
              aria-label="Import Profile"
              className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs cursor-pointer"
              title="Opt-in import from My Career Data without overwriting edits"
            >
              <User className="w-3.5 h-3.5 text-[#3157C8]" />
              <span className="hidden sm:inline">Import Profile</span>
            </button>

            {/* 9. Accessible PDF Export Button */}
            <button
              id="toolbar-download-pdf"
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              aria-label="Download PDF resume"
              className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
              title="Download or print your PDF resume"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* Global Toast Banner */}
        <AnimatePresence>
          {tailorSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {tailorSuccessToast}
                </span>
                <button
                  type="button"
                  onClick={() => setTailorSuccessToast(null)}
                  className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="resume-builder-main-grid grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL 1 (Left): Sections Navigation & Quick Controls */}
        <aside className="no-print hidden lg:block lg:col-span-3 min-w-0 space-y-4">
          <GlassCard variant="bento" className="p-4 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Resume Sections
                </h2>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                  {completedStepsCount} of {steps.length} completed
                </span>
              </div>
              <div className="w-16 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${Math.round((completedStepsCount / steps.length) * 100)}%` }}
                />
              </div>
            </div>

            <nav className="space-y-1" aria-label="Resume sections list">
              {steps.map((st) => {
                const isSelected = currentStep === st.number;
                const isComplete = isSectionComplete(st.number);
                const IconComponent = st.icon;
                const isHidden = (resumeData.hiddenSections || []).includes(st.sectionKey);

                return (
                  <div
                    key={st.number}
                    className={`relative w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'text-[var(--accent)] font-semibold'
                        : isHidden
                        ? 'text-[var(--text-muted)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-secondary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="builder-step-active-bg"
                        className="absolute inset-0 bg-[var(--accent)]/15 rounded-xl border border-[var(--accent)]/30"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <button
                      id={`sidebar-step-${st.number}`}
                      type="button"
                      aria-current={isSelected ? 'step' : undefined}
                      onClick={() => handleStepClick(st.number)}
                      className="relative z-10 flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[var(--accent)] text-white'
                            : isComplete
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <IconComponent className="w-3 h-3" />
                        )}
                      </div>
                      <span className="truncate">{st.label}</span>
                    </button>

                    {/* Section Visibility Toggle for content sections */}
                    {st.number <= 13 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSectionVisibility(st.sectionKey);
                        }}
                        className={`relative z-10 p-1 rounded hover:bg-[var(--bg-card)] transition-colors cursor-pointer shrink-0 ml-1 ${
                          isHidden ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isHidden ? 'Hidden on printed resume (Click to show)' : 'Visible (Click to hide)'}
                        aria-label={`Toggle visibility of ${st.label}`}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  const custom = resumeData.customSections || [];
                  const newCustom = [
                    ...custom,
                    {
                      id: `custom_${Date.now()}`,
                      title: 'Additional Section',
                      content: '',
                      items: [],
                    },
                  ];
                  updateCustomSections(newCustom);
                  setCurrentStep(13);
                  triggerToast('Added new custom section.');
                }}
                className="w-full py-2 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Custom Section</span>
              </button>
            </div>
          </GlassCard>
        </aside>

        {/* PANEL 2 (Center): Form Content */}
        <main className="no-print lg:col-span-5 min-w-0">
          <GlassCard variant="bento" className="p-6 sm:p-7 text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  Step 0{currentStep} / {steps.length}
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {steps[currentStep - 1]?.label || 'Resume Section'}
                </h2>
              </div>
              {Object.keys(fieldErrors).length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Required fields (*) missing
                </span>
              )}
            </div>

            {/* Mobile Section Jump Selector (small viewports only) */}
            <div className="lg:hidden block pt-1 pb-1">
              <label htmlFor="mobile-step-select" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Jump to Section
              </label>
              <select
                id="mobile-step-select"
                value={currentStep}
                onChange={(e) => handleStepClick(Number(e.target.value))}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors min-h-[44px]"
                aria-label="Select resume section to jump to"
              >
                {steps.map((st) => (
                  <option key={st.number} value={st.number}>
                    {st.number}. {st.label} {isSectionComplete(st.number) ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Global Validation Banner */}
            {globalBanner && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-500 font-medium animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{globalBanner}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`builder-step-${currentStep}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
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
                      Current City, State / Country <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="input-location"
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => {
                        updatePersonalInfo({ location: e.target.value });
                        clearError('personalInfo.location');
                      }}
                      placeholder="e.g. Bengaluru, Karnataka or San Francisco, CA"
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
                      Professional Headline / Designation
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
                      placeholder="e.g. Mechanical Design Engineer / Full Stack Developer"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="input-linkedin" className="block font-medium text-[var(--text-secondary)] mb-1">
                      LinkedIn URL
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
                      GitHub URL (Technical)
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
                      Portfolio / Project URL
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

                <p className="text-[10px] text-[var(--text-muted)] italic pt-1">
                  Professional contact details only. We never collect or store Aadhaar, PAN, religion, caste, marital status, or full residential address.
                </p>
              </div>
            )}

            {/* STEP 2: Professional Summary */}
            {currentStep === 2 && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="input-summary" className="font-semibold text-[var(--text-primary)]">
                      Professional Summary <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        resumeData.summary.trim().length >= 20 ? 'text-emerald-500' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {resumeData.summary.trim().length} / 20 characters min
                    </span>
                  </div>
                  <textarea
                    id="input-summary"
                    rows={6}
                    value={resumeData.summary}
                    onChange={(e) => {
                      updateSummary(e.target.value);
                      clearError('summary');
                    }}
                    placeholder="Provide a high-impact overview of your professional background, technical expertise, and career strengths..."
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
                        : 'AI Polish Summary'}
                    </button>
                    {targetJob.title && (
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Target Role: {targetJob.title}
                      </span>
                    )}
                  </div>

                  {/* AI Suggestion Preview Box */}
                  {summaryAiSuggestion && (
                    <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs space-y-2 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Polished Professional Summary
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSummaryAiSuggestion(null);
                            setShowSummaryCompare(false);
                          }}
                          className="text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {showSummaryCompare && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Current Summary</span>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                              {resumeData.summary || 'No summary drafted yet.'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">AI Polished Recommendation</span>
                            <p className="text-[11px] text-[var(--text-primary)] font-medium leading-relaxed">
                              {summaryAiSuggestion.improved}
                            </p>
                          </div>
                        </div>
                      )}

                      {!showSummaryCompare && (
                        <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                          {summaryAiSuggestion.improved}
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--accent)]/20">
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {summaryAiSuggestion.reasoning}
                        </span>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowSummaryCompare(!showSummaryCompare)}
                            className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-xs hover:border-[var(--accent)] transition-all cursor-pointer"
                          >
                            {showSummaryCompare ? 'Hide Comparison' : 'Compare'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSummaryAiSuggestion(null);
                              setShowSummaryCompare(false);
                            }}
                            className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSummary(summaryAiSuggestion.improved);
                              setSummaryAiSuggestion(null);
                              setShowSummaryCompare(false);
                              triggerToast('Applied polished summary.');
                            }}
                            className="px-3 py-1 rounded-md bg-[var(--accent)] text-white font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all cursor-pointer shrink-0 shadow-xs"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Starters */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Quick Starters:</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateSummary(
                          'Results-driven engineering professional with practical expertise in designing robust solutions, analyzing complex requirements, and optimizing industrial and digital workflows. Recognized for technical precision, cross-functional collaboration, and continuous delivery of reliable operational outcomes.'
                        );
                        clearError('summary');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                    >
                      + Technical &amp; Engineering Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateSummary(
                          'Experienced software and systems engineer with a background in building scalable web platforms, automating cloud infrastructure, and improving platform reliability. Passionate about writing clean, maintainable code and solving challenging architectural problems.'
                        );
                        clearError('summary');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                    >
                      + Software &amp; IT Professional
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Career Objective */}
            {currentStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="input-objective" className="font-semibold text-[var(--text-primary)]">
                      Career Objective (Ideal for Freshers &amp; Career Switchers)
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)]">Optional</span>
                  </div>
                  <textarea
                    id="input-objective"
                    rows={5}
                    value={resumeData.objective || ''}
                    onChange={(e) => {
                      updateObjective(e.target.value);
                      clearError('objective');
                    }}
                    placeholder="State your immediate career goals, technical interests, and the value you aim to contribute to your target organization..."
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:border-[var(--accent)] leading-relaxed text-xs focus:outline-none"
                  />
                  {fieldErrors['objective'] && (
                    <p
                      id="objective-error"
                      role="alert"
                      className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors['objective']}
                    </p>
                  )}

                  {/* AI Polish Objective Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleTailorObjective}
                      disabled={isImprovingObjective}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isImprovingObjective ? 'animate-spin' : ''}`} />
                      {isImprovingObjective ? 'Refining objective...' : 'AI Polish Objective'}
                    </button>
                  </div>

                  {/* Objective Suggestion Preview */}
                  {objectiveAiSuggestion && (
                    <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs space-y-2 mt-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Polished Career Objective
                        </span>
                        <button
                          type="button"
                          onClick={() => setObjectiveAiSuggestion(null)}
                          className="text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                        {objectiveAiSuggestion.improved}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--accent)]/20">
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {objectiveAiSuggestion.reasoning}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateObjective(objectiveAiSuggestion.improved);
                            setObjectiveAiSuggestion(null);
                            triggerToast('Applied polished objective.');
                          }}
                          className="px-3 py-1 rounded-md bg-[var(--accent)] text-white font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all cursor-pointer"
                        >
                          Accept &amp; Replace
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Starters for Objective */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Quick Starters:</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateObjective(
                          'Ambitious Engineering Graduate seeking an entry-level position to apply solid theoretical knowledge, practical project experience, and modern computational tools in a growth-oriented engineering organization.'
                        );
                        clearError('objective');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                    >
                      + Engineering Graduate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateObjective(
                          'Technically proficient Diploma holder with hands-on workshop, laboratory, and maintenance training. Seeking an operational or technician role to deliver dependable technical support and operational excellence.'
                        );
                        clearError('objective');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                    >
                      + Diploma Technician
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateObjective(
                          'Motivated software aspirant aiming to join an innovative technology team as a Junior Developer, contributing clean code, fast learning capability, and proactive problem-solving to production-grade applications.'
                        );
                        clearError('objective');
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                    >
                      + Software Developer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Technical Skills */}
            {currentStep === 4 && (
              <div className="space-y-5 text-xs">
                {/* 1. Technical Skills Input */}
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
                    placeholder="Python, React, TypeScript, SQL, Docker, AWS, SolidWorks, AutoCAD..."
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

                  {/* Skills Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(resumeData.skills.technical || []).map((sk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] font-medium text-[11px] border border-[var(--accent)]/20"
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

                  {/* Missing Skills from Job Analysis */}
                  {((analysisResult?.missingSkills && analysisResult.missingSkills.length > 0)
                    ? analysisResult.missingSkills
                    : (analysisResult?.missingKeywords || [])
                  ).filter(
                    (s) =>
                      !(resumeData.skills.technical || [])
                        .map((t) => t.toLowerCase())
                        .includes(s.toLowerCase())
                  ).length > 0 && (
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 mt-3">
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
                              !(resumeData.skills.technical || [])
                                .map((t) => t.toLowerCase())
                                .includes(s.toLowerCase())
                          )
                          .slice(0, 6)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => {
                                const newTechnical = [...(resumeData.skills.technical || []), skill];
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

                {/* 2. Tools & Frameworks Input */}
                <div>
                  <label htmlFor="input-skills-tools" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Tools, Machines &amp; Frameworks (optional)
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
                    placeholder="VS Code, CNC Lathe, Git, PLC Siemens, JIRA, SolidWorks..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 3. Soft Skills Input */}
                <div>
                  <label htmlFor="input-skills-soft" className="block font-semibold text-[var(--text-primary)] mb-1">
                    Soft &amp; Leadership Skills (optional)
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
                    placeholder="Problem Solving, Team Coordination, Leadership, Communication..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 4. Categorized Skill Groups Manager */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Categorized Skill Groups</span>
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Organize skills by engineering / technical domains for professional presentation.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={skillCategorySelect}
                      onChange={(e) => setSkillCategorySelect(e.target.value)}
                      className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="Design Software">Design Software</option>
                      <option value="Office Tools">Office Tools</option>
                      <option value="Programming Languages">Programming Languages</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Production">Production</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Quality Control">Quality Control</option>
                      <option value="Industrial Operations">Industrial Operations</option>
                      <option value="Other">Other Category</option>
                    </select>

                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Skill name (e.g. AutoCAD, CNC)"
                      className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                    />

                    <div className="flex gap-1.5">
                      <select
                        value={newSkillProficiency}
                        onChange={(e) => setNewSkillProficiency(e.target.value)}
                        className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs flex-1"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newSkillName.trim()) return;
                          const categoryName = skillCategorySelect === 'Other' && customCategoryInput.trim()
                            ? customCategoryInput.trim()
                            : skillCategorySelect;

                          const currentCats = [...(resumeData.skills?.categories || [])];
                          const catIdx = currentCats.findIndex(
                            (c) => c.category.toLowerCase() === categoryName.toLowerCase()
                          );

                          const skillItem = {
                            name: newSkillName.trim(),
                            level: newSkillProficiency as any,
                          };

                          if (catIdx >= 0) {
                            currentCats[catIdx].skills.push(skillItem);
                          } else {
                            currentCats.push({
                              category: categoryName,
                              skills: [skillItem],
                            });
                          }

                          // Also append to technical list if not present
                          const currentTech = resumeData.skills?.technical || [];
                          const updatedTech = currentTech.includes(newSkillName.trim())
                            ? currentTech
                            : [...currentTech, newSkillName.trim()];

                          updateSkills({
                            ...resumeData.skills,
                            technical: updatedTech,
                            categories: currentCats,
                          });
                          setTechnicalSkillsInput(updatedTech.join(', '));
                          setNewSkillName('');
                          triggerToast(`Added ${newSkillName.trim()} under ${categoryName}.`);
                        }}
                        className="btn-primary btn-sm px-3 rounded-lg text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {skillCategorySelect === 'Other' && (
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Enter custom category name (e.g. Electrical Automation, Metallurgy)"
                      className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                    />
                  )}

                  {/* Rendered Categories */}
                  {resumeData.skills?.categories && resumeData.skills.categories.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                      {resumeData.skills.categories.map((cat, cIdx) => (
                        <div key={cIdx} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--accent)] text-[11px] uppercase tracking-wider">
                              {cat.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (resumeData.skills?.categories || []).filter((_, i) => i !== cIdx);
                                updateSkills({ ...resumeData.skills, categories: updated });
                              }}
                              className="text-rose-400 hover:text-rose-500 text-xs"
                              title="Remove category"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {cat.skills.map((sk, sIdx) => {
                              const label = typeof sk === 'string' ? sk : sk.name;
                              const level = typeof sk === 'object' ? sk.level : null;
                              return (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[10px] text-[var(--text-primary)] border border-[var(--border-color)]"
                                >
                                  <span>{label}</span>
                                  {level && (
                                    <span className="text-[9px] text-[var(--accent)] font-semibold">({level})</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCats = [...(resumeData.skills?.categories || [])];
                                      nextCats[cIdx].skills = nextCats[cIdx].skills.filter((_, i) => i !== sIdx);
                                      updateSkills({ ...resumeData.skills, categories: nextCats });
                                    }}
                                    className="hover:text-rose-500 font-bold text-xs"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Educational Qualifications */}
            {currentStep === 5 && (
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
                                qualification: 'Engineering',
                                institution: p.institution,
                                university: p.department || '',
                                graduationYear: String(p.graduationYear || '2026'),
                                gpa: p.cgpa || '',
                              },
                            ]);
                            clearError('education');
                            triggerToast('Imported education from Student Profile!');
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
                      No education degree listed yet. At least one educational credential is required.
                    </p>
                    <button
                      id="add-education-btn"
                      type="button"
                      onClick={() => {
                        updateEducation([
                          {
                            id: `edu_${Date.now()}`,
                            qualification: 'Engineering',
                            degree: '',
                            institution: '',
                            university: '',
                            location: '',
                            startDate: '',
                            graduationYear: '2025',
                            gpa: '',
                            current: false,
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
                        <span className="font-bold text-[var(--text-primary)]">Qualification #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = resumeData.education.filter((_, i) => i !== idx);
                              updateEducation(updated);
                            }}
                            className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                            title="Remove degree"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Qualification Type Dropdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-primary)] mb-1">
                            Qualification Level
                          </label>
                          <select
                            value={edu.qualification || 'Engineering'}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].qualification = e.target.value;
                              updateEducation(updated);
                            }}
                            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          >
                            <option value="Engineering">Engineering (B.E. / B.Tech / M.Tech)</option>
                            <option value="Diploma">Diploma (Polytechnic)</option>
                            <option value="Undergraduate">Undergraduate (B.Sc / B.Com / B.A / BCA)</option>
                            <option value="Postgraduate">Postgraduate (M.Sc / MCA / MBA / M.Com)</option>
                            <option value="Higher Secondary">Higher Secondary (12th / HSC / CBSE)</option>
                            <option value="SSLC">SSLC (10th / Secondary)</option>
                            <option value="Doctorate">Doctorate (Ph.D.)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`input-edu-degree-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Degree / Branch / Stream <span className="text-rose-500">*</span>
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
                            placeholder="e.g. B.E. Mechanical Engineering or B.Tech CS"
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`input-edu-institution-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Institution / College / School <span className="text-rose-500">*</span>
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
                            placeholder="e.g. College of Engineering, Guindy"
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

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            University / Board Name
                          </label>
                          <input
                            type="text"
                            value={edu.university || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].university = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="e.g. Anna University / State Board / CBSE"
                            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">Start Year</label>
                          <input
                            type="text"
                            value={edu.startDate || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].startDate = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="2021"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">Passing Year</label>
                          <input
                            type="text"
                            value={edu.graduationYear}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].graduationYear = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="2025"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">CGPA / %</label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.education];
                              updated[idx].gpa = e.target.value;
                              updateEducation(updated);
                            }}
                            placeholder="8.7 CGPA or 85%"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div className="flex items-center pt-5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={Boolean(edu.current)}
                              onChange={(e) => {
                                const updated = [...resumeData.education];
                                updated[idx].current = e.target.checked;
                                updateEducation(updated);
                              }}
                              className="rounded border-[var(--border-color)] text-[var(--accent)]"
                            />
                            <span>Currently Pursuing</span>
                          </label>
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
                          qualification: 'Higher Secondary',
                          degree: '',
                          institution: '',
                          graduationYear: '2023',
                          gpa: '',
                        },
                      ])
                    }
                    className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Another Educational Qualification
                  </button>
                )}
              </div>
            )}

            {/* STEP 6: Work Experience */}
            {currentStep === 6 && (
              <div className="space-y-4 text-xs">
                {/* Candidate Type Switcher */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] block">Experience Profile</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isFresher ? 'Fresher / Entry-Level (Experience optional)' : 'Experienced Candidate (1+ roles required)'}
                    </span>
                  </div>
                  <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => handleCandidateTypeChange('fresher')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        isFresher ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Fresher
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateTypeChange('experienced')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        !isFresher ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Experienced
                    </button>
                  </div>
                </div>

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
                        ? 'No work experience added yet. At least one professional role is required for experienced candidates.'
                        : 'No work experience added yet. Freshers can add internships, industrial training, or continue to Projects.'}
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
                              department: '',
                              employmentType: 'Full-time',
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
                        {isFresher ? 'Add Internship / Training' : 'Add Work Experience'}
                      </button>
                    </div>
                  </div>
                ) : (
                  resumeData.experience.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[var(--text-primary)]">Experience #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resumeData.experience.filter((_, i) => i !== idx);
                            updateExperience(updated);
                          }}
                          className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
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
                            Designation / Official Role <span className="text-rose-500">*</span>
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
                            placeholder="e.g. Design Engineer or Frontend Developer"
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
                            Company / Organization Name <span className="text-rose-500">*</span>
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
                            placeholder="e.g. Bosch India or Tata Motors"
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={exp.department || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].department = e.target.value;
                              updateExperience(updated);
                            }}
                            placeholder="e.g. Production / R&D / QA"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Employment Type
                          </label>
                          <select
                            value={exp.employmentType || 'Full-time'}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].employmentType = e.target.value as any;
                              updateExperience(updated);
                            }}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Internship">Internship</option>
                            <option value="Industrial Training">Industrial Training</option>
                            <option value="Apprenticeship">Apprenticeship</option>
                            <option value="Contract">Contract</option>
                            <option value="Part-time">Part-time</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={exp.location || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].location = e.target.value;
                              updateExperience(updated);
                            }}
                            placeholder="City, State"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].startDate = e.target.value;
                              updateExperience(updated);
                            }}
                            placeholder="e.g. Jan 2023"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">End Date</label>
                          <input
                            type="text"
                            value={exp.endDate}
                            disabled={Boolean(exp.current)}
                            onChange={(e) => {
                              const updated = [...resumeData.experience];
                              updated[idx].endDate = e.target.value;
                              updateExperience(updated);
                            }}
                            placeholder={exp.current ? 'Present' : 'e.g. Dec 2024'}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs disabled:opacity-50"
                          />
                        </div>

                        <div className="flex items-center pt-5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={Boolean(exp.current)}
                              onChange={(e) => {
                                const updated = [...resumeData.experience];
                                updated[idx].current = e.target.checked;
                                if (e.target.checked) updated[idx].endDate = 'Present';
                                updateExperience(updated);
                              }}
                              className="rounded border-[var(--border-color)] text-[var(--accent)]"
                            />
                            <span>Currently Working Here</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">
                          Tools, Machines &amp; Technologies Used
                        </label>
                        <input
                          type="text"
                          value={(exp.technologies || []).join(', ')}
                          onChange={(e) => {
                            const updated = [...resumeData.experience];
                            updated[idx].technologies = e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean);
                            updateExperience(updated);
                          }}
                          placeholder="e.g. CATIA, SolidWorks, CNC Milling, Python, AWS"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-medium text-[var(--text-primary)]">
                            Key Responsibilities &amp; Bullets (one per line)
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
                          placeholder="Designed 3D mechanical components reducing assembly cycle time by 15%..."
                          className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                        />

                        {bulletAiSuggestion && bulletAiSuggestion.expIndex === idx && (
                          <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs space-y-2 mt-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Wand2 className="w-3 h-3" />
                                AI Suggested Bullet Rewrites
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBulletAiSuggestion(null);
                                  setShowBulletCompare(false);
                                }}
                                className="text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {showBulletCompare ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Current Bullets</span>
                                  <ul className="text-[11px] text-[var(--text-secondary)] list-disc list-inside space-y-0.5">
                                    {bulletAiSuggestion.original.split('\n').filter(Boolean).map((b, i) => (
                                      <li key={i}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">AI Polished Recommendation</span>
                                  <ul className="text-[11px] text-[var(--text-primary)] font-medium list-disc list-inside space-y-0.5">
                                    {bulletAiSuggestion.improvedList.map((b, i) => (
                                      <li key={i}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : (
                              <ul className="text-[11px] text-[var(--text-primary)] font-medium list-disc list-inside space-y-1">
                                {bulletAiSuggestion.improvedList.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--accent)]/20">
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {bulletAiSuggestion.reasoning}
                              </span>
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowBulletCompare(!showBulletCompare)}
                                  className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-xs hover:border-[var(--accent)] transition-all cursor-pointer"
                                >
                                  {showBulletCompare ? 'Hide Comparison' : 'Compare'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulletAiSuggestion(null);
                                    setShowBulletCompare(false);
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...resumeData.experience];
                                    updated[idx].bulletPoints = bulletAiSuggestion.improvedList;
                                    updateExperience(updated);
                                    setBulletAiSuggestion(null);
                                    setShowBulletCompare(false);
                                    triggerToast('Applied refined bullet phrasing.');
                                  }}
                                  className="px-3 py-1 rounded-md bg-[var(--accent)] text-white font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-xs"
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
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
                        department: '',
                        employmentType: 'Full-time',
                        startDate: '2023-01',
                        endDate: '',
                        current: true,
                        bulletPoints: ['Delivered critical tasks on schedule.'],
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Another Experience / Internship
                </button>
              </div>
            )}

            {/* STEP 7: Academic and Technical Projects */}
            {currentStep === 7 && (
              <div className="space-y-4 text-xs">
                {isFresher ? (
                  <div className="text-[11px] text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Required for fresher / entry-level candidates. Include at least 1 academic or personal project.
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Highlight key academic, open-source, or client projects that demonstrate your capabilities.
                  </p>
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
                      {isFresher
                        ? 'No projects added yet. Entry-level candidates must list at least one project.'
                        : 'No projects added yet. Click below if you wish to feature technical projects.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        id="add-project-btn"
                        type="button"
                        onClick={() => {
                          updateProjects([
                            {
                              id: `proj_${Date.now()}`,
                              title: '',
                              role: 'Lead Developer',
                              objective: '',
                              technologies: [],
                              description: '',
                              outcome: '',
                              bullets: [],
                              link: '',
                            },
                          ]);
                          clearError('projects');
                        }}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Project
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/student/profile');
                            if (res.ok) {
                              const data = await res.json();
                              if (data.profile?.projects && data.profile.projects.length > 0) {
                                const mapped = data.profile.projects.map((p: any, idx: number) => ({
                                  id: `proj_${Date.now()}_${idx}`,
                                  title: p.title || '',
                                  role: p.role || 'Lead Developer',
                                  objective: '',
                                  technologies: Array.isArray(p.techStack) ? p.techStack : [],
                                  description: p.description || '',
                                  outcome: '',
                                  bullets: Array.isArray(p.highlights) && p.highlights.length > 0 ? p.highlights : [p.description || ''].filter(Boolean),
                                  link: p.repoUrl || p.liveUrl || '',
                                }));
                                updateProjects(mapped);
                                clearError('projects');
                                triggerToast(`Imported ${mapped.length} project(s) from Student Profile!`);
                                return;
                              }
                            }
                            triggerToast('No documented projects found in your student profile.');
                          } catch {
                            triggerToast('Could not load student profile projects.');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <FolderGit2 className="w-4 h-4" /> Import from Student Profile
                      </button>
                    </div>
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
                          className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Remove project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`input-proj-title-${idx}`}
                            className="block font-medium text-[var(--text-primary)] mb-1"
                          >
                            Project Title <span className="text-rose-500">*</span>
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
                            placeholder="e.g. Automated Pneumatic Braking System"
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
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Your Role / Contribution
                          </label>
                          <input
                            type="text"
                            value={proj.role || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.projects];
                              updated[idx].role = e.target.value;
                              updateProjects(updated);
                            }}
                            placeholder="e.g. Lead CAD Designer / Circuit Analyst"
                            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Tools, Software &amp; Technologies Used
                          </label>
                          <input
                            type="text"
                            value={(proj.technologies || []).join(', ')}
                            onChange={(e) => {
                              const updated = [...resumeData.projects];
                              updated[idx].technologies = e.target.value
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean);
                              updateProjects(updated);
                            }}
                            placeholder="SolidWorks, ANSYS, Arduino, Python, AWS"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-[var(--text-secondary)] mb-1">
                            Project Link / GitHub URL (optional)
                          </label>
                          <input
                            type="text"
                            value={proj.link || ''}
                            onChange={(e) => {
                              const updated = [...resumeData.projects];
                              updated[idx].link = e.target.value;
                              updateProjects(updated);
                            }}
                            placeholder="github.com/..."
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-medium text-[var(--text-primary)]">
                            Project Description &amp; Highlights
                          </label>
                          <button
                            type="button"
                            onClick={() => handleImproveProject(idx)}
                            disabled={improvingProjIdx === idx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Wand2 className={`w-3 h-3 ${improvingProjIdx === idx ? 'animate-spin' : ''}`} />
                            {improvingProjIdx === idx ? 'Refining...' : 'AI Enhance Description'}
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={proj.description || ''}
                          onChange={(e) => {
                            const updated = [...resumeData.projects];
                            updated[idx].description = e.target.value;
                            updateProjects(updated);
                          }}
                          placeholder="Engineered a micro-controller actuated pneumatic braking prototype achieving 30% reduction in response latency..."
                          className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                        />

                        {bulletAiSuggestion && bulletAiSuggestion.expIndex === idx && (
                          <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-xs space-y-2 mt-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Wand2 className="w-3 h-3" />
                                AI Suggested Bullet Rewrites
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBulletAiSuggestion(null);
                                  setShowBulletCompare(false);
                                }}
                                className="text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {showBulletCompare ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Current Bullets</span>
                                  <ul className="text-[11px] text-[var(--text-secondary)] list-disc list-inside space-y-0.5">
                                    {bulletAiSuggestion.original.split('\n').filter(Boolean).map((b, i) => (
                                      <li key={i}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">AI Polished Recommendation</span>
                                  <ul className="text-[11px] text-[var(--text-primary)] font-medium list-disc list-inside space-y-0.5">
                                    {bulletAiSuggestion.improvedList.map((b, i) => (
                                      <li key={i}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : (
                              <ul className="text-[11px] text-[var(--text-primary)] font-medium list-disc list-inside space-y-1">
                                {bulletAiSuggestion.improvedList.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--accent)]/20">
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {bulletAiSuggestion.reasoning}
                              </span>
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowBulletCompare(!showBulletCompare)}
                                  className="px-2.5 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold text-xs hover:border-[var(--accent)] transition-all cursor-pointer"
                                >
                                  {showBulletCompare ? 'Hide Comparison' : 'Compare'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulletAiSuggestion(null);
                                    setShowBulletCompare(false);
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...resumeData.experience];
                                    updated[idx].bulletPoints = bulletAiSuggestion.improvedList;
                                    updateExperience(updated);
                                    setBulletAiSuggestion(null);
                                    setShowBulletCompare(false);
                                    triggerToast('Applied refined bullet phrasing.');
                                  }}
                                  className="px-3 py-1 rounded-md bg-[var(--accent)] text-white font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-xs"
                                >
                                  Accept
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">
                          Outcome / Key Result (Measurable Result)
                        </label>
                        <input
                          type="text"
                          value={proj.outcome || ''}
                          onChange={(e) => {
                            const updated = [...resumeData.projects];
                            updated[idx].outcome = e.target.value;
                            updateProjects(updated);
                          }}
                          placeholder="e.g. Awarded Best Capstone Project; improved efficiency by 22%"
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
                        technologies: [],
                        description: '',
                        link: '',
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Another Project
                </button>
              </div>
            )}

            {/* STEP 8: Certifications and Training */}
            {currentStep === 8 && (
              <div className="space-y-4 text-xs">
                <p className="text-xs text-[var(--text-secondary)]">
                  Add professional certifications, industrial training programs, or specialized workshops.
                </p>

                {resumeData.certifications.map((cert, idx) => (
                  <div
                    key={cert.id}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[var(--text-primary)]">Certification #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = resumeData.certifications.filter((_, i) => i !== idx);
                          updateCertifications(updated);
                        }}
                        className="text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-[var(--text-primary)] mb-1">
                          Certification / Course Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={cert.name}
                          onChange={(e) => {
                            const updated = [...resumeData.certifications];
                            updated[idx].name = e.target.value;
                            updateCertifications(updated);
                          }}
                          placeholder="e.g. AWS Certified Solutions Architect or Six Sigma Green Belt"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">Category</label>
                        <select
                          value={cert.type || 'Certification'}
                          onChange={(e) => {
                            const updated = [...resumeData.certifications];
                            updated[idx].type = e.target.value as any;
                            updateCertifications(updated);
                          }}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        >
                          <option value="Certification">Certification</option>
                          <option value="Industrial Training">Industrial Training</option>
                          <option value="Workshop">Workshop</option>
                          <option value="Course">Course</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">
                          Issuing Organization
                        </label>
                        <input
                          type="text"
                          value={cert.issuer}
                          onChange={(e) => {
                            const updated = [...resumeData.certifications];
                            updated[idx].issuer = e.target.value;
                            updateCertifications(updated);
                          }}
                          placeholder="e.g. Amazon Web Services / NPTEL"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">Issue Date</label>
                        <input
                          type="text"
                          value={cert.date}
                          onChange={(e) => {
                            const updated = [...resumeData.certifications];
                            updated[idx].date = e.target.value;
                            updateCertifications(updated);
                          }}
                          placeholder="e.g. 2024"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-[var(--text-secondary)] mb-1">Duration</label>
                        <input
                          type="text"
                          value={cert.duration || ''}
                          onChange={(e) => {
                            const updated = [...resumeData.certifications];
                            updated[idx].duration = e.target.value;
                            updateCertifications(updated);
                          }}
                          placeholder="e.g. 4 Weeks / 40 Hours"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                        />
                      </div>
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
                        type: 'Certification',
                      },
                    ])
                  }
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Certification or Training
                </button>
              </div>
            )}

            {/* STEP 9: Key Achievements */}
            {currentStep === 9 && (
              <div className="space-y-4 text-xs text-left">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <span>Key Achievements &amp; Honors</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Highlight awards, hackathon wins, ranks, scholarships, or notable measurable milestones.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="input-achievement"
                    type="text"
                    value={achievementInput}
                    onChange={(e) => setAchievementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (achievementInput.trim()) {
                          const current = (resumeData.achievements || []).map((a) =>
                            typeof a === 'string' ? a : a.title
                          );
                          updateAchievements([...current, achievementInput.trim()]);
                          setAchievementInput('');
                        }
                      }
                    }}
                    placeholder="e.g. First Place - State Level CAD Design Olympiad 2024"
                    className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    id="btn-add-achievement"
                    type="button"
                    onClick={() => {
                      if (achievementInput.trim()) {
                        const current = (resumeData.achievements || []).map((a) =>
                          typeof a === 'string' ? a : a.title
                        );
                        updateAchievements([...current, achievementInput.trim()]);
                        setAchievementInput('');
                      }
                    }}
                    className="btn-secondary btn-sm px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {(resumeData.achievements || []).map((ach, idx) => {
                    const label = typeof ach === 'string' ? ach : ach.title;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60"
                      >
                        <span className="text-[var(--accent)] font-bold text-xs shrink-0">•</span>
                        <input
                          type="text"
                          value={label}
                          onChange={(e) => {
                            const current = (resumeData.achievements || []).map((a) =>
                              typeof a === 'string' ? a : a.title
                            );
                            current[idx] = e.target.value;
                            updateAchievements(current);
                          }}
                          className="flex-1 bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = (resumeData.achievements || []).map((a) =>
                              typeof a === 'string' ? a : a.title
                            );
                            updateAchievements(current.filter((_, i) => i !== idx));
                          }}
                          className="text-[var(--text-muted)] hover:text-rose-500 p-1 cursor-pointer shrink-0"
                          title="Remove achievement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 10: Soft Skills */}
            {currentStep === 10 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                    <span>Soft &amp; Interpersonal Skills</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Core behavioral attributes and teamwork competencies valued by employers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(resumeData.skills?.soft || []).map((sk, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium text-xs border border-[var(--accent)]/20"
                    >
                      <span>{sk}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (resumeData.skills?.soft || []).filter((_, i) => i !== idx);
                          updateSkills({ ...resumeData.skills, soft: updated });
                          setSoftSkillsInput(updated.join(', '));
                        }}
                        className="hover:text-rose-500 font-bold ml-1 text-xs cursor-pointer"
                        title={`Remove ${sk}`}
                        aria-label={`Remove ${sk}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Suggestions Pills */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                    Click to add recommended competencies:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Leadership',
                      'Team Management',
                      'Communication',
                      'Problem-solving',
                      'Time Management',
                      'Decision-making',
                      'Adaptability',
                      'Critical Thinking',
                      'Team Coordination',
                      'Responsibility',
                      'Work Ethic',
                      'Conflict Resolution',
                    ]
                      .filter((s) => !(resumeData.skills?.soft || []).includes(s))
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            const current = resumeData.skills?.soft || [];
                            const updated = [...current, suggestion];
                            updateSkills({ ...resumeData.skills, soft: updated });
                            setSoftSkillsInput(updated.join(', '));
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border-color)] transition-all cursor-pointer"
                        >
                          + {suggestion}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 11: Languages Known */}
            {currentStep === 11 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-[var(--accent)]" />
                    <span>Languages Known</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    List languages with your verified proficiency level.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="input-language"
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    placeholder="e.g. English, Hindi, German, Spanish"
                    className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)] focus:outline-none"
                  />
                  <select
                    value={languageProficiency}
                    onChange={(e) => setLanguageProficiency(e.target.value)}
                    className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                  >
                    <option value="Native">Native</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Professional">Professional</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Conversational">Conversational</option>
                    <option value="Basic">Basic</option>
                  </select>
                  <button
                    id="btn-add-language"
                    type="button"
                    onClick={() => {
                      if (languageInput.trim()) {
                        const formatted = `${languageInput.trim()} (${languageProficiency})`;
                        const current = (resumeData.languages || []).map((l) =>
                          typeof l === 'string' ? l : `${l.name} (${l.proficiency || 'Fluent'})`
                        );
                        if (!current.includes(formatted)) {
                          updateLanguages([...current, formatted]);
                        }
                        setLanguageInput('');
                      }
                    }}
                    className="btn-secondary btn-sm px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Added Languages Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(resumeData.languages || []).map((l, idx) => {
                    const langStr = typeof l === 'string' ? l : `${l.name} (${l.proficiency || 'Fluent'})`;
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                      >
                        <span>{langStr}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = (resumeData.languages || []).map((item) =>
                              typeof item === 'string' ? item : `${item.name} (${item.proficiency || 'Fluent'})`
                            );
                            updateLanguages(current.filter((_, i) => i !== idx));
                          }}
                          className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                          title={`Remove ${langStr}`}
                          aria-label={`Remove ${langStr}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 12: Additional Information */}
            {currentStep === 12 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[var(--accent)]" />
                    <span>Additional Employment Information</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Operational availability and professional logistics for recruiters.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[var(--text-primary)] mb-1">
                      Notice Period
                    </label>
                    <select
                      value={resumeData.additionalInfo?.noticePeriod || 'Immediate'}
                      onChange={(e) =>
                        updateAdditionalInfo({
                          ...resumeData.additionalInfo,
                          noticePeriod: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="Immediate">Immediate (Available right away)</option>
                      <option value="15 Days">15 Days</option>
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="Serving Notice">Currently Serving Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[var(--text-primary)] mb-1">
                      Willing to Relocate
                    </label>
                    <select
                      value={resumeData.additionalInfo?.relocation || 'Yes'}
                      onChange={(e) =>
                        updateAdditionalInfo({
                          ...resumeData.additionalInfo,
                          relocation: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="Yes">Yes, willing to relocate</option>
                      <option value="No">No, local only</option>
                      <option value="Negotiable">Negotiable / Discussion</option>
                      <option value="Remote Only">Remote roles only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[var(--text-primary)] mb-1">
                      Shift Availability
                    </label>
                    <select
                      value={resumeData.additionalInfo?.shiftPreference || 'General Shift'}
                      onChange={(e) =>
                        updateAdditionalInfo({
                          ...resumeData.additionalInfo,
                          shiftPreference: e.target.value,
                          shiftAvailability: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="General Shift">General Shift (Day)</option>
                      <option value="Rotational Shifts">Rotational Shifts (24x7 / Manufacturing)</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="Flexible">Flexible to business requirements</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[var(--text-primary)] mb-1">
                      Driving Licence
                    </label>
                    <select
                      value={resumeData.additionalInfo?.drivingLicence || 'None'}
                      onChange={(e) =>
                        updateAdditionalInfo({
                          ...resumeData.additionalInfo,
                          drivingLicence: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                    >
                      <option value="None">None / Not required</option>
                      <option value="Two Wheeler">Two Wheeler</option>
                      <option value="Four Wheeler (LMV)">Four Wheeler (Light Motor Vehicle)</option>
                      <option value="Commercial / Heavy Vehicle">Commercial / Heavy Vehicle</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Professional Memberships &amp; Affiliations
                  </label>
                  <input
                    type="text"
                    value={(resumeData.additionalInfo?.memberships || []).join(', ')}
                    onChange={(e) =>
                      updateAdditionalInfo({
                        ...resumeData.additionalInfo,
                        memberships: e.target.value
                          .split(',')
                          .map((m) => m.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. IEEE, ASME, CSI, SAE"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 13: Custom Sections */}
            {currentStep === 13 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[var(--accent)]" />
                    <span>Custom Sections</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Create tailored sections for publications, patents, co-curriculars, or domain notes.
                  </p>
                </div>

                {(resumeData.customSections || []).map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...(resumeData.customSections || [])];
                          updated[idx].title = e.target.value;
                          updateCustomSections(updated);
                        }}
                        placeholder="Section Title (e.g. Publications & Patents)"
                        className="font-bold text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-color)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (resumeData.customSections || []).filter((_, i) => i !== idx);
                          updateCustomSections(updated);
                        }}
                        className="text-rose-400 hover:text-rose-500 cursor-pointer"
                        title="Delete custom section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={sec.content || ''}
                      onChange={(e) => {
                        const updated = [...(resumeData.customSections || [])];
                        updated[idx].content = e.target.value;
                        updateCustomSections(updated);
                      }}
                      placeholder="Narrative content or paragraph description..."
                      className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                    />

                    <div>
                      <label className="block font-medium text-[var(--text-secondary)] mb-1">
                        Bullet Points (one per line)
                      </label>
                      <textarea
                        rows={2}
                        value={(sec.items || []).join('\n')}
                        onChange={(e) => {
                          const updated = [...(resumeData.customSections || [])];
                          updated[idx].items = e.target.value.split('\n');
                          updateCustomSections(updated);
                        }}
                        placeholder="Key point 1..."
                        className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const current = resumeData.customSections || [];
                    updateCustomSections([
                      ...current,
                      {
                        id: `custom_${Date.now()}`,
                        title: 'New Section',
                        content: '',
                        items: [],
                      },
                    ]);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--accent)] font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Another Custom Section
                </button>
              </div>
            )}

            {/* STEP 14: Section Reorder & Visibility */}
            {currentStep === 14 && (
              <div className="space-y-4 text-xs text-left">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Reorder and toggle visibility for how sections appear on your printed resume:
                  </p>
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {activeSectionOrder.map((sectionId, idx) => {
                      const info = DEFAULT_SECTIONS.find((s) => s.id === sectionId) || { id: sectionId, label: sectionId };
                      const isHidden = (resumeData.hiddenSections || []).includes(sectionId);

                      return (
                        <motion.div
                          layout
                          key={sectionId}
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isHidden
                              ? 'bg-[var(--bg-secondary)]/40 border-[var(--border-color)] opacity-60'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[11px] text-[var(--text-secondary)]">
                              {idx + 1}
                            </span>
                            <span className={`font-semibold ${isHidden ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                              {info.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleSectionVisibility(sectionId)}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                isHidden
                                  ? 'border-amber-400 text-amber-500 bg-amber-500/10'
                                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                              title={isHidden ? 'Hidden (Click to show)' : 'Visible (Click to hide)'}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move section up"
                              aria-label={`Move ${info.label} up`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'down')}
                              disabled={idx === activeSectionOrder.length - 1}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move section down"
                              aria-label={`Move ${info.label} down`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateSectionOrder(DEFAULT_SECTIONS.map((s) => s.id));
                      triggerToast('Reset to default section order.');
                    }}
                    className="btn-ghost btn-sm text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Default Order</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 15: Template Selection */}
            {currentStep === 15 && (
              <div className="space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Choose from 12 distinct, recruiter-approved resume templates:
                  </p>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    12 Templates Available
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
                          triggerToast(`Switched to "${tmpl.name}" template.`);
                        }}
                        previewData={hasEnteredInfo ? resumeData : MINI_SAMPLE_RESUME_DATA}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 16: Generate & Download PDF */}
            {currentStep === 16 && (
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

                {/* Primary Action */}
                <div className="space-y-2.5 pt-1">
                  <button
                    id="btn-download-pdf"
                    type="button"
                    aria-label="Download PDF resume"
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

                {/* Return to templates */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="btn-ghost text-xs inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Templates</span>
                  </button>
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons (Steps 1 to 15) */}
            {currentStep < 16 && (
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
                  {currentStep === 15 ? 'Review & Download' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </GlassCard>
        </main>

        {/* PANEL 3 (Right): Live A4 Document Preview */}
        <section
          className="resume-preview-column lg:col-span-4 lg:sticky lg:top-6 flex flex-col items-center min-w-0 w-full max-w-full overflow-hidden space-y-3"
          aria-label="A4 Resume Live Preview"
        >
          {/* Zoom & Document Viewer Controls */}
          <div className="no-print w-full flex items-center justify-between mb-1 px-1 sm:px-2 gap-2 flex-wrap">
            {/* View Mode Segmented Controls */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-semibold relative">
              <button
                type="button"
                onClick={() => setPreviewTab('design')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
                  previewTab === 'design'
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {previewTab === 'design' && (
                  <motion.div
                    layoutId="builder-preview-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Layout className="w-3.5 h-3.5" />
                <span>Design View</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('ats')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
                  previewTab === 'ats'
                    ? 'text-emerald-600 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {previewTab === 'ats' && (
                  <motion.div
                    layoutId="builder-preview-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ATS View</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('text')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 relative z-10 ${
                  previewTab === 'text'
                    ? 'text-indigo-600 font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {previewTab === 'text' && (
                  <motion.div
                    layoutId="builder-preview-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <FileText className="w-3.5 h-3.5" />
                <span>Plain Text</span>
              </button>
            </div>

            {previewTab === 'design' && (
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
            )}
          </div>

          {/* Scrollable A4 Viewport Container */}
          <div
            ref={previewViewportRef}
            id="resume-print-viewport"
            className="resume-preview-viewport w-full max-w-full overflow-x-auto overflow-y-auto max-h-[820px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-5 flex justify-center shadow-xs focus:outline-none"
            tabIndex={0}
            role="region"
            aria-label="A4 Resume Preview Viewport"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={previewTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="w-full flex justify-center"
              >
                {previewTab === 'design' ? (
                  <A4ResumeDocument
                    data={resumeData}
                    templateId={resumeData.templateId}
                    zoom={zoom}
                  />
                ) : (
                  <AtsFriendlyPreview
                    data={resumeData}
                    mode={previewTab}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
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
                <span className="font-semibold text-[var(--text-secondary)] block text-[11px]">Role &amp; Company</span>
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

      {/* Remove Resume Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Remove Active Resume?
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  This action removes this saved resume from your list.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 leading-relaxed space-y-1">
              <p className="font-semibold">
                You are removing: &quot;{currentResumeTitle}&quot;
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Other saved resumes and your account data will remain completely intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowRemoveConfirmModal(false)}
                disabled={isRemoving}
                className="btn-secondary btn-sm cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveResumeConfirmed}
                disabled={isRemoving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Another Resume Modal */}
      {showUploadResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Upload Resume File
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadResumeModal(false);
                  setUploadFile(null);
                  setUploadError(null);
                }}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Upload an existing resume in PDF or DOCX format. We will parse your contact info, experience, skills, and education into this editor.
            </p>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingUpload(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingUpload(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingUpload(false);
                const file = e.dataTransfer.files?.[0];
                if (file) setUploadFile(file);
              }}
              className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDraggingUpload
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border-color)] hover:border-[var(--accent)] bg-[var(--bg-secondary)]'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadFile(file);
                }}
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                <UploadCloud className="w-8 h-8 text-[var(--accent)] mx-auto" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {uploadFile ? uploadFile.name : 'Click to select or drag and drop your resume file'}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Accepts PDF or DOCX up to 10MB
                </p>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setShowUploadResumeModal(false);
                  setUploadFile(null);
                  setUploadError(null);
                }}
                disabled={isUploading}
                className="btn-secondary btn-sm cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUploadNewResume()}
                disabled={!uploadFile || isUploading}
                className="btn-primary btn-sm cursor-pointer text-xs inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Resume...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload &amp; Open in Editor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opt-In Career Profile Import Modal */}
      {showImportProfileModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          data-no-print="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E8ED] shadow-2xl p-6 space-y-4 text-left max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E8ED]">
              <div>
                <h3 className="text-base font-bold text-[#20242B]">
                  Import from My Career Data
                </h3>
                <p className="text-xs text-[#626B78]">
                  Preview confirmed profile details before merging. Nothing overwrites existing fields silently.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportProfileModal(false)}
                className="p-1.5 rounded-lg text-[#626B78] hover:text-[#20242B] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingImportProfile ? (
              <div className="py-10 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#3157C8] mx-auto" />
                <p className="text-xs text-[#626B78]">Loading saved profile &amp; confirmed skills...</p>
              </div>
            ) : importProfileError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {importProfileError}
              </div>
            ) : importProfileData ? (
              <div className="space-y-4 text-xs">
                {/* Personal & Target Role */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePersonalImport}
                    onChange={(e) => setIncludePersonalImport(e.target.checked)}
                    className="mt-0.5 accent-[#3157C8]"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#20242B] block">
                      Contact &amp; Target Headline (empty fields only)
                    </span>
                    <span className="text-[#626B78] block">
                      Name: {importProfileData.account?.name || 'Not set'} • Email: {importProfileData.account?.email || 'Not set'}
                    </span>
                    <span className="text-[#626B78] block">
                      Headline: {importProfileData.goalSet && importProfileData.targetRole ? importProfileData.targetRole : 'Goal not set'}
                    </span>
                  </div>
                </label>

                {/* Education */}
                {importProfileData.profile && (importProfileData.profile.institution || importProfileData.profile.degree) && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEducationImport}
                      onChange={(e) => setIncludeEducationImport(e.target.checked)}
                      className="mt-0.5 accent-[#3157C8]"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#20242B] block">Education Record</span>
                      <span className="text-[#626B78] block">
                        {[
                          importProfileData.profile.degree,
                          importProfileData.profile.fieldOfStudy,
                          importProfileData.profile.institution,
                          importProfileData.profile.graduationYear ? `Class of ${importProfileData.profile.graduationYear}` : '',
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>
                  </label>
                )}

                {/* Skills Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#20242B]">
                      Skills ({selectedImportSkills.length} selected)
                    </span>
                    <span className="text-[11px] text-[#626B78]">
                      Verified &amp; confirmed pre-selected; claimed require opt-in
                    </span>
                  </div>
                  {importProfileData.skills.length === 0 ? (
                    <p className="text-[#626B78] p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED]">
                      No saved skills in your career profile yet.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {importProfileData.skills.map((skill) => {
                        const isConfirmed =
                          skill.status === 'verified' ||
                          skill.status === 'confirmed' ||
                          Boolean(skill.confirmedAt);
                        const checked = selectedImportSkills.includes(skill.name);
                        return (
                          <label
                            key={skill.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-[#E5E8ED] bg-white cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedImportSkills((prev) =>
                                    e.target.checked
                                      ? [...prev, skill.name]
                                      : prev.filter((item) => item !== skill.name)
                                  );
                                }}
                                className="accent-[#3157C8]"
                              />
                              <span className="font-medium text-[#20242B]">{skill.name}</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                skill.status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isConfirmed
                                    ? 'bg-[#F6F7F9] text-[#3157C8] border-[#3157C8]/25'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {skill.status === 'verified'
                                ? 'Verified'
                                : isConfirmed
                                  ? 'Confirmed'
                                  : 'Claimed (unconfirmed)'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#E5E8ED]">
                  <button
                    type="button"
                    onClick={() => setShowImportProfileModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#E5E8ED] bg-white text-[#20242B] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyProfileImport('fill_empty')}
                    className="px-3.5 py-2 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#20242B] text-xs font-semibold hover:border-[#3157C8]/40 cursor-pointer"
                  >
                    Fill Empty Fields Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyProfileImport('merge')}
                    className="px-4 py-2 rounded-xl bg-[#3157C8] text-white text-xs font-semibold hover:opacity-95 cursor-pointer"
                  >
                    Merge Into Resume
                  </button>
                </div>
              </div>
            ) : null}
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
