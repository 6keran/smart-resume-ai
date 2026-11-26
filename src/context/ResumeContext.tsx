'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ResumeData,
  ResumeAnalysisResult,
  ImprovementItem,
  ResumeTemplateId,
  TargetJobContext,
  isClientDraftResumeId,
} from '@/types/resume';
import { INITIAL_RESUME_DATA } from '@/lib/initialData';
import { useUserProfile } from '@/components/user/UserContext';

const INITIAL_TARGET_JOB: TargetJobContext = {
  title: '',
  company: '',
  description: '',
};

export type ResumeSaveState = 'idle' | 'saving' | 'saved' | 'error';

function normalizeLoadedResumeData(raw: ResumeData, fallbackId: string): ResumeData {
  const resolvedId = raw.id && !isClientDraftResumeId(raw.id) ? raw.id : fallbackId;
  return {
    ...raw,
    id: resolvedId,
  };
}

function buildStubResumeData(resume: {
  id: string;
  filename?: string | null;
  uploaded_at?: string | null;
}): ResumeData {
  return {
    ...INITIAL_RESUME_DATA,
    id: resume.id,
    title: resume.filename || 'Untitled Resume',
    lastUpdated: resume.uploaded_at || new Date().toISOString(),
  };
}

interface ResumeContextType {
  resumeData: ResumeData;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  activeResumeId: string | null;
  setActiveResumeId: (id: string | null) => void;
  saveState: ResumeSaveState;
  saveError: string | null;
  lastSavedAt: string | null;
  isRehydrating: boolean;
  saveActiveResume: (
    dataToSave?: ResumeData,
    improvementMeta?: {
      title: string;
      category?: string;
      beforeText?: string;
      afterText: string;
    },
    options?: { force?: boolean }
  ) => Promise<{ success: boolean; resumeId?: string; error?: string }>;
  rehydrateResume: () => Promise<void>;
  updatePersonalInfo: (info: Partial<ResumeData['personalInfo']>) => void;
  updateSummary: (summary: string) => void;
  updateSkills: (skills: ResumeData['skills']) => void;
  updateExperience: (exp: ResumeData['experience']) => void;
  updateEducation: (edu: ResumeData['education']) => void;
  updateProjects: (proj: ResumeData['projects']) => void;
  updateCertifications: (certs: ResumeData['certifications']) => void;
  setTemplateId: (templateId: ResumeTemplateId) => void;
  setCandidateType: (type: 'experienced' | 'fresher') => void;
  // Target Job Context
  targetJob: TargetJobContext;
  setTargetJob: React.Dispatch<React.SetStateAction<TargetJobContext>>;
  updateTargetJob: (job: Partial<TargetJobContext>) => void;
  clearTargetJob: () => void;
  // Analysis
  analysisResult: ResumeAnalysisResult | null;
  setAnalysisResult: (result: ResumeAnalysisResult | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  runAnalysis: (
    input?: string | File,
    jobDescription?: string,
    jobTitle?: string,
    company?: string,
    options?: { allowUncertainOverride?: boolean }
  ) => Promise<ResumeAnalysisResult>;
  // Improvement Engine
  improvements: ImprovementItem[];
  setImprovements: React.Dispatch<React.SetStateAction<ImprovementItem[]>>;
  acceptImprovement: (id: string, overrideItem?: ImprovementItem) => Promise<boolean>;
  editImprovement: (id: string, updatedContent: string) => void;
  rejectImprovement: (id: string) => void;
  applyAllApprovedImprovements: () => Promise<boolean>;
  regenerateImprovement: (id: string) => Promise<boolean>;
  tailorResumeToJob: (
    jobTitle?: string,
    company?: string,
    jobDescription?: string
  ) => Promise<void>;
  // Multiple Resumes Management
  userResumes: Array<{
    id: string;
    filename: string;
    file_type?: string;
    uploaded_at: string;
    isActive?: boolean;
    latestAtsScore?: number | null;
    versionsCount?: number;
    resumeData?: ResumeData | null;
  }>;
  isLoadingUserResumes: boolean;
  fetchUserResumes: () => Promise<void>;
  switchActiveResume: (resumeId: string) => Promise<boolean>;
  setActiveResume: (resumeId: string) => Promise<boolean>;
  removeActiveResume: (resumeId?: string) => Promise<{ success: boolean; error?: string }>;
  createNewResume: (templateId?: ResumeTemplateId) => Promise<{ success: boolean; resumeId?: string; error?: string }>;
  uploadNewResume: (file: File) => Promise<{ success: boolean; resumeId?: string; error?: string }>;
  // Editing experience helpers
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (val: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateLanguages: (languages: string[]) => void;
  updateAchievements: (achievements: string[]) => void;
  updateSectionOrder: (order: string[]) => void;
  updateObjective: (objective: string) => void;
  updateAdditionalInfo: (info: ResumeData['additionalInfo']) => void;
  updateCustomSections: (sections: ResumeData['customSections']) => void;
  updateHiddenSections: (hidden: string[]) => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: sessionLoading } = useUserProfile();
  const userId = user?.id;
  const [resumeData, setResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [targetJob, setTargetJob] = useState<TargetJobContext>(INITIAL_TARGET_JOB);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [improvements, setImprovements] = useState<ImprovementItem[]>([]);

  const [saveState, setSaveState] = useState<ResumeSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isRehydrating, setIsRehydrating] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [isLoadingUserResumes, setIsLoadingUserResumes] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [history, setHistory] = useState<ResumeData[]>([INITIAL_RESUME_DATA]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isHistoryActionRef = useRef<boolean>(false);

  const MAX_HISTORY_STACK = 50;
  const recordHistory = useCallback((nextData: ResumeData) => {
    if (isHistoryActionRef.current) return;
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      const next = [...slice, nextData];
      if (next.length > MAX_HISTORY_STACK) return next.slice(next.length - MAX_HISTORY_STACK);
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_STACK - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isHistoryActionRef.current = true;
      const targetIndex = historyIndex - 1;
      const target = history[targetIndex];
      setResumeData(target);
      setHistoryIndex(targetIndex);
      hasUserEditedRef.current = true;
      setHasUnsavedChanges(true);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetIndex = historyIndex + 1;
      const target = history[targetIndex];
      setResumeData(target);
      setHistoryIndex(targetIndex);
      hasUserEditedRef.current = true;
      setHasUnsavedChanges(true);
      setTimeout(() => {
        isHistoryActionRef.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Concurrency and edit tracking refs
  const hasUserEditedRef = useRef<boolean>(false);
  const saveSeqRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedResumeIdsRef = useRef<Set<string>>(new Set());

  const cancelPendingAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    saveSeqRef.current += 1;
  }, []);

  // Save active resume to server database with strict ownership and concurrency check
  const saveActiveResume = useCallback(
    async (
      dataToSave?: ResumeData,
      improvementMeta?: {
        title: string;
        category?: string;
        beforeText?: string;
        afterText: string;
      },
      options?: { force?: boolean }
    ): Promise<{ success: boolean; resumeId?: string; error?: string }> => {
      const target = dataToSave || resumeData;
      const targetResumeId = (activeResumeId && !isClientDraftResumeId(activeResumeId))
        ? activeResumeId
        : (target.id && !isClientDraftResumeId(target.id) ? target.id : null);

      if (targetResumeId && deletedResumeIdsRef.current.has(targetResumeId)) {
        return { success: false, error: 'Cannot save a deleted resume.' };
      }

      const currentSeq = ++saveSeqRef.current;
      setSaveState('saving');
      setSaveError(null);

      try {

        const payload = {
          resumeId: targetResumeId,
          resumeData: target,
          filename: target.personalInfo?.fullName ? `${target.personalInfo.fullName} Resume` : 'My Resume',
          clientLastUpdated: target.lastUpdated,
          force: Boolean(options?.force),
        };

        const res = await fetch('/api/user/resumes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // 401 Unauthorized: user is unauthenticated visitor
        // Persist to local storage draft without throwing fatal error
        if (res.status === 401) {
          if (currentSeq === saveSeqRef.current) {
            setSaveState('saved');
            try {
              localStorage.setItem('sra_resume_data', JSON.stringify(target));
            } catch {}
          }
          return { success: true };
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.message || `Failed to save resume (status ${res.status})`;
          if (currentSeq === saveSeqRef.current) {
            setSaveState('error');
            setSaveError(errMsg);
          }
          return { success: false, error: errMsg };
        }

        const data = await res.json();
        const persistedId = data.resumeId || data.resume?.id || activeResumeId;

        if (
          (targetResumeId && deletedResumeIdsRef.current.has(targetResumeId)) ||
          (persistedId && deletedResumeIdsRef.current.has(persistedId))
        ) {
          return { success: false, error: 'Resume was deleted during save.' };
        }

        if (currentSeq === saveSeqRef.current) {
          const syncedTarget = persistedId ? { ...target, id: persistedId } : target;
          if (persistedId && persistedId !== activeResumeId) {
            setActiveResumeId(persistedId);
          }
          if (persistedId && target.id !== persistedId) {
            setResumeData((prev) => (prev.id === persistedId ? prev : { ...prev, id: persistedId }));
          }
          setSaveState('saved');
          setSaveError(null);
          hasUserEditedRef.current = false;
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date().toISOString());

          // Keep localStorage as recovery draft
          try {
            localStorage.setItem('sra_resume_data', JSON.stringify(syncedTarget));
          } catch {}
        }

        // Persist accepted improvement metadata to server improvements history
        if (improvementMeta) {
          try {
            await fetch('/api/user/improvements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resumeId: persistedId,
                category: improvementMeta.category || 'ATS Optimization',
                title: improvementMeta.title,
                beforeText: improvementMeta.beforeText || 'Previous phrasing',
                afterText: improvementMeta.afterText,
              }),
            });
          } catch (impErr) {
            console.warn('Could not record improvement metadata:', impErr);
          }
        }

        return { success: true, resumeId: persistedId };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Network error saving resume.';
        if (currentSeq === saveSeqRef.current) {
          setSaveState('error');
          setSaveError(errMsg);
        }
        return { success: false, error: errMsg };
      }
    },
    [resumeData, activeResumeId]
  );

  // Fetch list of all saved resumes for authenticated user
  const fetchUserResumes = useCallback(async () => {
    setIsLoadingUserResumes(true);
    try {
      const res = await fetch('/api/user/resumes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserResumes(data.resumes || []);
      } else if (res.status === 401) {
        setUserResumes([]);
      }
    } catch (err) {
      console.warn('Could not fetch user resumes:', err);
    } finally {
      setIsLoadingUserResumes(false);
    }
  }, []);

  // Rehydrate authoritative active resume and saved resumes list from server on page load
  const rehydrateResume = useCallback(async () => {
    if (sessionLoading) return;
    setIsRehydrating(true);
    setSaveError(null);
    let loadedFromServer = false;
    let isAuthenticated = false;
    let serverResumes: any[] = [];

    try {
      if (userId) {
        const [activeRes, listRes] = await Promise.allSettled([
          fetch('/api/user/resumes?active=true', { cache: 'no-store' }),
          fetch('/api/user/resumes', { cache: 'no-store' }),
        ]);

        if (listRes.status === 'fulfilled' && listRes.value.ok) {
          isAuthenticated = true;
          const listData = await listRes.value.json().catch(() => ({}));
          serverResumes = listData.resumes || [];
          setUserResumes(serverResumes);
        } else if (listRes.status === 'fulfilled' && listRes.value.status === 401) {
          setUserResumes([]);
        }

        if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
          isAuthenticated = true;
          const data = await activeRes.value.json().catch(() => ({}));
          if (data.resume) {
            const nextData = data.resume.resumeData
              ? normalizeLoadedResumeData(data.resume.resumeData, data.resume.id)
              : buildStubResumeData(data.resume);
            setResumeData(nextData);
            setActiveResumeId(data.resume.id);
            setHistory([nextData]);
            setHistoryIndex(0);
            loadedFromServer = true;
            setSaveState('saved');
            setHasUnsavedChanges(false);
            hasUserEditedRef.current = false;
            setLastSavedAt(data.resume.uploaded_at || new Date().toISOString());
            try {
              localStorage.setItem('sra_resume_data', JSON.stringify(nextData));
            } catch {}
          }
        }
      } else {
        setUserResumes([]);
      }
    } catch (err) {
      console.warn('Network issue rehydrating active resume from server:', err);
    }

    // If server resume is not available (e.g. guest or new user), load valid draft from local storage
    if (!loadedFromServer) {
      try {
        const savedResume = localStorage.getItem('sra_resume_data');
        if (savedResume) {
          const parsed = JSON.parse(savedResume);
          const hasStaleServerId =
            isAuthenticated &&
            Boolean(parsed?.id) &&
            !isClientDraftResumeId(parsed.id) &&
            !serverResumes.some((r) => r.id === parsed.id);

          if (hasStaleServerId) {
            localStorage.removeItem('sra_resume_data');
            setResumeData(INITIAL_RESUME_DATA);
            setActiveResumeId(null);
            setHistory([INITIAL_RESUME_DATA]);
            setHistoryIndex(0);
            setSaveState('idle');
            setLastSavedAt(null);
          } else if (
            parsed.personalInfo?.fullName !== 'Candidate Profile' &&
            parsed.personalInfo?.fullName !== 'Alex Morgan' &&
            parsed.personalInfo?.email !== 'candidate@email.com'
          ) {
            setResumeData(parsed);
            setHistory([parsed]);
            setHistoryIndex(0);
            if (parsed.id && !isClientDraftResumeId(parsed.id)) {
              setActiveResumeId(parsed.id);
            } else {
              setActiveResumeId(null);
            }
          }
        }
      } catch {
        // ignore storage errors
      }
    }

    // Load secondary data from localStorage
    try {
      const savedJob = localStorage.getItem('sra_target_job');
      if (savedJob) setTargetJob(JSON.parse(savedJob));

      const savedImprovements = localStorage.getItem('sra_improvements');
      if (savedImprovements) setImprovements(JSON.parse(savedImprovements));

      const savedAnalysis = localStorage.getItem('sra_analysis_result');
      if (savedAnalysis) setAnalysisResult(JSON.parse(savedAnalysis));
    } catch {
      // ignore
    }

    setIsLoaded(true);
    setIsRehydrating(false);
  }, [userId, sessionLoading]);

  // Switch active resume to selected saved resume
  const switchActiveResume = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!targetId || deletedResumeIdsRef.current.has(targetId)) return false;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Auto-save current active resume if user made edits
      if (activeResumeId && !deletedResumeIdsRef.current.has(activeResumeId) && hasUserEditedRef.current) {
        try {
          await saveActiveResume(resumeData, undefined, { force: true });
        } catch (err) {
          console.warn('Auto-save prior to switching returned error:', err);
        }
      }

      // Check if target exists in userResumes with parsed resumeData
      const cached = userResumes.find((r) => r.id === targetId);
      if (cached && cached.resumeData) {
        const nextData = normalizeLoadedResumeData(cached.resumeData, targetId);
        cancelPendingAutoSave();
        setResumeData(nextData);
        setActiveResumeId(targetId);
        setHistory([nextData]);
        setHistoryIndex(0);
        hasUserEditedRef.current = false;
        setHasUnsavedChanges(false);
        setSaveState('saved');
        setSaveError(null);
        setLastSavedAt(cached.uploaded_at || new Date().toISOString());
        try {
          localStorage.setItem('sra_resume_data', JSON.stringify(nextData));
        } catch {}
        return true;
      }

      // Fetch specific resume from server (supports analyzer uploads with resumeData === null)
      try {
        const res = await fetch(`/api/user/resumes?id=${encodeURIComponent(targetId)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.resume) {
            const nextData = data.resume.resumeData
              ? normalizeLoadedResumeData(data.resume.resumeData, data.resume.id)
              : buildStubResumeData(data.resume);
            cancelPendingAutoSave();
            setResumeData(nextData);
            setActiveResumeId(data.resume.id);
            setHistory([nextData]);
            setHistoryIndex(0);
            hasUserEditedRef.current = false;
            setHasUnsavedChanges(false);
            setSaveState('saved');
            setSaveError(null);
            setLastSavedAt(data.resume.uploaded_at || new Date().toISOString());
            try {
              localStorage.setItem('sra_resume_data', JSON.stringify(nextData));
            } catch {}
            return true;
          }
        }
      } catch (err) {
        console.error('Failed to switch resume:', err);
      }
      return false;
    },
    [activeResumeId, cancelPendingAutoSave, resumeData, saveActiveResume, userResumes]
  );

  // Set another resume as active across the platform
  const setActiveResume = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!targetId) return false;
      try {
        const res = await fetch(`/api/user/resumes?action=set_active&id=${encodeURIComponent(targetId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_active', resumeId: targetId }),
        });
        if (res.ok) {
          setUserResumes((prev) =>
            prev.map((r) => ({
              ...r,
              isActive: r.id === targetId,
            }))
          );
          if (activeResumeId !== targetId) {
            await switchActiveResume(targetId);
          }
          return true;
        }
      } catch (err) {
        console.error('Error setting active resume:', err);
      }
      return false;
    },
    [activeResumeId, switchActiveResume]
  );

  // Remove active resume from server and switch to next available resume
  const removeActiveResume = useCallback(
    async (targetId?: string): Promise<{ success: boolean; error?: string }> => {
      const idToRemove =
        targetId ||
        activeResumeId ||
        (!isClientDraftResumeId(resumeData.id) ? resumeData.id : null);

      cancelPendingAutoSave();
      hasUserEditedRef.current = false;
      setHasUnsavedChanges(false);

      if (!idToRemove) {
        setResumeData(INITIAL_RESUME_DATA);
        setActiveResumeId(null);
        setHistory([INITIAL_RESUME_DATA]);
        setHistoryIndex(0);
        setSaveState('idle');
        setSaveError(null);
        setLastSavedAt(null);
        try {
          localStorage.removeItem('sra_resume_data');
        } catch {}
        return { success: true };
      }

      let serverNextActiveId: string | null = null;

      // If persistent server ID, delete on server
      if (!isClientDraftResumeId(idToRemove)) {
        deletedResumeIdsRef.current.add(idToRemove);
        try {
          const res = await fetch(`/api/user/resumes?id=${encodeURIComponent(idToRemove)}`, {
            method: 'DELETE',
          });
          if (!res.ok && res.status !== 404) {
            deletedResumeIdsRef.current.delete(idToRemove);
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.message || 'Failed to remove resume from server.' };
          }
          const delData = await res.json().catch(() => ({}));
          serverNextActiveId = delData.nextActiveResumeId || null;
        } catch (err: any) {
          deletedResumeIdsRef.current.delete(idToRemove);
          return { success: false, error: err.message || 'Network error removing resume.' };
        }
      }

      // Immediately clear localStorage if it referenced the deleted resume
      try {
        const storedRaw = localStorage.getItem('sra_resume_data');
        if (storedRaw) {
          const storedParsed = JSON.parse(storedRaw);
          if (!storedParsed?.id || storedParsed.id === idToRemove || isClientDraftResumeId(storedParsed.id)) {
            localStorage.removeItem('sra_resume_data');
          }
        }
      } catch {}

      // Update local state list
      const remainingRaw = userResumes.filter((r) => r.id !== idToRemove);
      const nextActiveCandidateId =
        serverNextActiveId && remainingRaw.some((r) => r.id === serverNextActiveId)
          ? serverNextActiveId
          : (remainingRaw[0]?.id || serverNextActiveId || null);

      const remaining = remainingRaw.map((r) => ({
        ...r,
        isActive: nextActiveCandidateId ? r.id === nextActiveCandidateId : false,
      }));
      setUserResumes(remaining);

      const removedCurrent =
        !targetId ||
        activeResumeId === idToRemove ||
        resumeData.id === idToRemove ||
        isClientDraftResumeId(resumeData.id);

      // Always synchronize authoritative saved resumes list with server state
      await fetchUserResumes();

      // If active resume was removed, switch to next available or reset to initial blank template
      if (removedCurrent) {
        if (nextActiveCandidateId) {
          await switchActiveResume(nextActiveCandidateId);
        } else {
          setResumeData(INITIAL_RESUME_DATA);
          setActiveResumeId(null);
          setHistory([INITIAL_RESUME_DATA]);
          setHistoryIndex(0);
          setSaveState('idle');
          setSaveError(null);
          setLastSavedAt(null);
          try {
            localStorage.removeItem('sra_resume_data');
          } catch {}
        }
      }

      return { success: true };
    },
    [activeResumeId, cancelPendingAutoSave, fetchUserResumes, resumeData.id, switchActiveResume, userResumes]
  );

  // Create a brand new resume in the builder without overwriting existing resumes
  const createNewResume = useCallback(
    async (templateId: ResumeTemplateId = 'modern-ats'): Promise<{ success: boolean; resumeId?: string; error?: string }> => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Auto-save current active resume if user made edits
      if (activeResumeId && !deletedResumeIdsRef.current.has(activeResumeId) && hasUserEditedRef.current) {
        try {
          await saveActiveResume(resumeData, undefined, { force: true });
        } catch {}
      }

      const newResume: ResumeData = {
        ...INITIAL_RESUME_DATA,
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: 'Untitled Resume',
        templateId,
        lastUpdated: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/user/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createNew: true,
            setActive: true,
            resumeData: newResume,
            filename: newResume.title,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const persistedId = data.resumeId || data.resume?.id || newResume.id;
          newResume.id = persistedId;
          cancelPendingAutoSave();
          setResumeData(newResume);
          setActiveResumeId(persistedId);
          setHistory([newResume]);
          setHistoryIndex(0);
          hasUserEditedRef.current = false;
          setSaveState('saved');
          setSaveError(null);
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date().toISOString());
          try {
            localStorage.setItem('sra_resume_data', JSON.stringify(newResume));
          } catch {}
          await fetchUserResumes();
          return { success: true, resumeId: persistedId };
        } else if (res.status === 401) {
          // Guest mode
          cancelPendingAutoSave();
          setResumeData(newResume);
          setActiveResumeId(null);
          setHistory([newResume]);
          setHistoryIndex(0);
          hasUserEditedRef.current = false;
          setSaveState('saved');
          setSaveError(null);
          try {
            localStorage.setItem('sra_resume_data', JSON.stringify(newResume));
          } catch {}
          return { success: true };
        } else {
          const errJson = await res.json().catch(() => ({}));
          return { success: false, error: errJson.message || 'Failed to create new resume.' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error creating resume.' };
      }
    },
    [activeResumeId, cancelPendingAutoSave, resumeData, saveActiveResume, fetchUserResumes]
  );

  // Upload an authentic PDF/DOCX resume directly from the editor
  const uploadNewResume = useCallback(
    async (file: File): Promise<{ success: boolean; resumeId?: string; error?: string }> => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Auto-save current active resume if user made edits
      if (activeResumeId && !deletedResumeIdsRef.current.has(activeResumeId) && hasUserEditedRef.current) {
        try {
          await saveActiveResume(resumeData, undefined, { force: true });
        } catch {}
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/user/resumes', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          return { success: false, error: errJson.message || 'Failed to upload and parse resume.' };
        }

        const data = await res.json();
        const uploadedId = data.resumeId || data.resume?.id || null;
        if (data.resumeData) {
          const nextData = uploadedId
            ? normalizeLoadedResumeData(data.resumeData, uploadedId)
            : data.resumeData;
          cancelPendingAutoSave();
          setResumeData(nextData);
          setActiveResumeId(uploadedId);
          setHistory([nextData]);
          setHistoryIndex(0);
          hasUserEditedRef.current = false;
          setSaveState('saved');
          setSaveError(null);
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date().toISOString());
          try {
            localStorage.setItem('sra_resume_data', JSON.stringify(nextData));
          } catch {}
          await fetchUserResumes();
          return { success: true, resumeId: uploadedId || undefined };
        }

        return { success: true, resumeId: uploadedId || undefined };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error uploading resume.' };
      }
    },
    [activeResumeId, cancelPendingAutoSave, resumeData, saveActiveResume, fetchUserResumes]
  );


  // Rehydrate on initial mount
  useEffect(() => {
    rehydrateResume();
  }, [rehydrateResume]);

  // Debounced auto-save for user edits in Resume Builder & Improver
  useEffect(() => {
    if (!isLoaded || !hasUserEditedRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      saveActiveResume(resumeData);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [resumeData, isLoaded, saveActiveResume]);

  // Secondary local storage persistence as recovery backup
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('sra_target_job', JSON.stringify(targetJob));
    } catch {}
  }, [targetJob, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('sra_improvements', JSON.stringify(improvements));
    } catch {}
  }, [improvements, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (analysisResult) {
        localStorage.setItem('sra_analysis_result', JSON.stringify(analysisResult));
      } else {
        localStorage.removeItem('sra_analysis_result');
      }
    } catch {}
  }, [analysisResult, isLoaded]);

  const updatePersonalInfo = (info: Partial<ResumeData['personalInfo']>) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        personalInfo: { ...prev.personalInfo, ...info },
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateSummary = (summary: string) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        summary,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateSkills = (skills: ResumeData['skills']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        skills,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateExperience = (experience: ResumeData['experience']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        experience,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateEducation = (education: ResumeData['education']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        education,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateProjects = (projects: ResumeData['projects']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        projects,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateCertifications = (certifications: ResumeData['certifications']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        certifications,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateLanguages = (languages: string[]) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        languages,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateAchievements = (achievements: string[]) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        achievements,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateSectionOrder = (sectionOrder: string[]) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        sectionOrder,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateObjective = (objective: string) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        objective,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateAdditionalInfo = (additionalInfo: ResumeData['additionalInfo']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        additionalInfo,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateCustomSections = (customSections: ResumeData['customSections']) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        customSections,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateHiddenSections = (hiddenSections: string[]) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        hiddenSections,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const setTemplateId = (templateId: ResumeTemplateId) => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        templateId,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const setCandidateType = (candidateType: 'experienced' | 'fresher') => {
    hasUserEditedRef.current = true;
    setHasUnsavedChanges(true);
    setResumeData((prev) => {
      const next = {
        ...prev,
        candidateType,
        lastUpdated: new Date().toISOString(),
      };
      recordHistory(next);
      return next;
    });
  };

  const updateTargetJob = (job: Partial<TargetJobContext>) => {
    setTargetJob((prev) => ({ ...prev, ...job }));
  };

  const clearTargetJob = () => {
    setTargetJob(INITIAL_TARGET_JOB);
    try {
      localStorage.removeItem('sra_target_job');
    } catch {}
  };

  const runAnalysis = async (
    input?: string | File,
    jobDescription?: string,
    jobTitle?: string,
    company?: string,
    options?: { allowUncertainOverride?: boolean }
  ): Promise<ResumeAnalysisResult> => {
    setIsAnalyzing(true);
    try {
      let res: Response;
      const effectiveJd = (jobDescription ?? targetJob.description).trim();
      const effectiveRole = (jobTitle ?? targetJob.title).trim();
      const effectiveCompany = (company ?? targetJob.company).trim();

      if (effectiveJd || effectiveRole || effectiveCompany) {
        updateTargetJob({
          title: effectiveRole,
          company: effectiveCompany,
          description: effectiveJd,
        });
      }

      if (input instanceof File) {
        const formData = new FormData();
        formData.append('file', input);
        if (effectiveJd) formData.append('jobDescription', effectiveJd);
        if (effectiveRole) formData.append('jobTitle', effectiveRole);
        if (effectiveCompany) formData.append('company', effectiveCompany);
        if (options?.allowUncertainOverride) {
          formData.append('allowUncertainOverride', 'true');
        }

        res = await fetch('/api/resume/analyze', {
          method: 'POST',
          body: formData,
        });
      } else {
        const textToAnalyze =
          typeof input === 'string' && input.trim()
            ? input
            : `${resumeData.personalInfo.fullName}\n${resumeData.personalInfo.headline || ''}\n${resumeData.summary}\nSkills: ${resumeData.skills.technical.join(', ')}\nExperience:\n${resumeData.experience
                .map((e) => `${e.role} at ${e.company}: ${e.bulletPoints.join(' ')}`)
                .join('\n')}`;

        res = await fetch('/api/resume/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeText: textToAnalyze,
            jobDescription: effectiveJd || undefined,
            jobTitle: effectiveRole || undefined,
            company: effectiveCompany || undefined,
            allowUncertainOverride: options?.allowUncertainOverride || false,
          }),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const customError: any = new Error(
          errJson.message || 'Unable to read this resume. Please upload a valid PDF or DOCX file.'
        );
        if (errJson.validation) {
          customError.validation = errJson.validation;
        }
        throw customError;
      }

      const data: ResumeAnalysisResult = await res.json();
      setAnalysisResult(data);

      if (data.resumeId) {
        setActiveResumeId(data.resumeId);
        setResumeData((prev) => ({
          ...prev,
          id: data.resumeId!,
        }));
      }

      if (data.topSuggestions && Array.isArray(data.topSuggestions) && data.topSuggestions.length > 0) {
        const mappedImprovements: ImprovementItem[] = data.topSuggestions.map((sug, idx) => {
          const sectionLower = (sug.section || '').toLowerCase();
          const targetSection = sectionLower.includes('experience')
            ? 'experience'
            : sectionLower.includes('summary')
            ? 'summary'
            : sectionLower.includes('project')
            ? 'projects'
            : sectionLower.includes('education')
            ? 'education'
            : 'skills';

          const extracted = sug.extractedText || (sug as any).originalText;
          const original = extracted && extracted.trim().length > 0
            ? extracted.trim()
            : sug.whatNeedsImprovement;

          return {
            id: `imp_real_${Date.now()}_${idx}`,
            section: targetSection,
            field: sug.section || 'Resume Section',
            originalContent: original,
            improvedContent: sug.example || sug.howToImprove,
            reasoning: `${sug.whatNeedsImprovement} ${sug.whyItMatters}`.trim(),
            metricImpact: sug.priority ? `${sug.priority} Priority` : 'Actionable Feedback',
            status: 'pending',
            isJobTailored: Boolean(effectiveJd),
            diff: {
              before: original,
              after: sug.example || sug.howToImprove,
            },
          };
        });
        setImprovements(mappedImprovements);
      } else if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        const mappedImprovements: ImprovementItem[] = data.recommendations.map((rec, idx) => ({
          id: `imp_real_${Date.now()}_${idx}`,
          section: (rec.category?.toLowerCase() || 'summary') as any,
          field: rec.title || 'Resume Section',
          originalContent: rec.originalText || rec.title,
          improvedContent: rec.improvedText || rec.actionText || rec.title,
          reasoning: rec.actionText || 'Optimized for recruiter clarity and relevance.',
          metricImpact: 'Clarity & Keyword Coverage',
          status: 'pending',
          isJobTailored: Boolean(effectiveJd),
          diff: {
            before: rec.originalText || rec.title,
            after: rec.improvedText || rec.actionText || rec.title,
          },
        }));
        setImprovements(mappedImprovements);
      }

      return data;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accepts an improvement, applies changes to resumeData clone, and persists to server database.
  // Returns true only after database write succeeds. Avoids reporting success if write fails.
  const acceptImprovement = async (id: string, overrideItem?: ImprovementItem): Promise<boolean> => {
    const item = overrideItem || improvements.find((imp) => imp.id === id);
    if (!item) return false;

    const contentToApply = (item.improvedContent || '').trim();
    if (!contentToApply) return false;

    let applied = false;
    let newResume: ResumeData = { ...resumeData };

    if (item.section === 'summary') {
      newResume = {
        ...newResume,
        summary: contentToApply,
        lastUpdated: new Date().toISOString(),
      };
      applied = true;
    } else if (item.section === 'skills') {
      const cleaned = contentToApply
        .replace(/^(Technical Skills:|Core Competencies:|Skills:|Add:)\s*/i, '')
        .split(/[,|•\n]/)
        .map((s) => s.trim())
        .filter(
          (s) =>
            s.length > 1 &&
            s.length < 40 &&
            !s.toLowerCase().includes('recommend') &&
            !s.toLowerCase().includes('in order to') &&
            !s.toLowerCase().includes('incorporate')
        );

      if (cleaned.length > 0) {
        const existingSet = new Set(
          newResume.skills.technical.map((s) => s.toLowerCase().trim())
        );
        const toAdd = cleaned.filter((s) => !existingSet.has(s.toLowerCase()));
        if (toAdd.length > 0) {
          newResume = {
            ...newResume,
            skills: {
              ...newResume.skills,
              technical: [...newResume.skills.technical, ...toAdd],
            },
            lastUpdated: new Date().toISOString(),
          };
        }
        applied = true;
      } else {
        const parts = contentToApply.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
          newResume = {
            ...newResume,
            skills: {
              ...newResume.skills,
              technical: [...newResume.skills.technical, ...parts],
            },
            lastUpdated: new Date().toISOString(),
          };
          applied = true;
        }
      }
    } else if (item.section === 'experience') {
      if (newResume.experience.length > 0) {
        const newExp = newResume.experience.map((e) => ({
          ...e,
          bulletPoints: [...e.bulletPoints],
        }));
        let replaced = false;

        // 1. Direct index and bullet index targeting if specified
        if (
          typeof item.targetIndex === 'number' &&
          item.targetIndex >= 0 &&
          item.targetIndex < newExp.length
        ) {
          const targetExp = newExp[item.targetIndex];
          if (
            typeof item.targetBulletIndex === 'number' &&
            item.targetBulletIndex >= 0 &&
            item.targetBulletIndex < targetExp.bulletPoints.length
          ) {
            targetExp.bulletPoints[item.targetBulletIndex] = contentToApply;
            replaced = true;
          } else if (targetExp.bulletPoints.length > 0) {
            targetExp.bulletPoints[0] = contentToApply;
            replaced = true;
          } else {
            targetExp.bulletPoints.push(contentToApply);
            replaced = true;
          }
        }

        // 2. Fuzzy content matching across all experience entries
        if (!replaced && item.originalContent) {
          const origSnippet = item.originalContent.slice(0, 30).toLowerCase();
          for (let i = 0; i < newExp.length; i++) {
            for (let b = 0; b < newExp[i].bulletPoints.length; b++) {
              const currentBullet = newExp[i].bulletPoints[b];
              const bulletLower = currentBullet.toLowerCase();
              if (
                bulletLower.includes(origSnippet) ||
                origSnippet.includes(bulletLower.slice(0, 30))
              ) {
                newExp[i].bulletPoints[b] = contentToApply;
                replaced = true;
                break;
              }
            }
            if (replaced) break;
          }
        }

        // 3. Fallback to targetIndex or experience 0
        if (!replaced) {
          const fallbackIdx =
            typeof item.targetIndex === 'number' && item.targetIndex < newExp.length
              ? item.targetIndex
              : 0;
          if (newExp[fallbackIdx].bulletPoints.length > 0) {
            newExp[fallbackIdx].bulletPoints[0] = contentToApply;
          } else {
            newExp[fallbackIdx].bulletPoints.push(contentToApply);
          }
        }

        newResume = {
          ...newResume,
          experience: newExp,
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      } else {
        newResume = {
          ...newResume,
          experience: [
            {
              id: `exp_${Date.now()}`,
              company: 'Current Experience',
              role: 'Engineering Role',
              location: '',
              startDate: '',
              endDate: '',
              current: true,
              bulletPoints: [contentToApply],
            },
          ],
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      }
    } else if (item.section === 'projects') {
      if (newResume.projects.length > 0) {
        const newProj = newResume.projects.map((p) => ({
          ...p,
          bullets: p.bullets ? [...p.bullets] : [],
          technologies: p.technologies ? [...p.technologies] : [],
        }));
        let replaced = false;

        // 1. Direct index targeting if specified
        if (
          typeof item.targetIndex === 'number' &&
          item.targetIndex >= 0 &&
          item.targetIndex < newProj.length
        ) {
          const proj = newProj[item.targetIndex];
          if (
            typeof item.targetBulletIndex === 'number' &&
            item.targetBulletIndex >= 0 &&
            proj.bullets &&
            item.targetBulletIndex < proj.bullets.length
          ) {
            proj.bullets[item.targetBulletIndex] = contentToApply;
            replaced = true;
          } else if (proj.bullets && proj.bullets.length > 0) {
            proj.bullets[0] = contentToApply;
            replaced = true;
          } else {
            proj.description = contentToApply;
            replaced = true;
          }
        }

        // 2. Fuzzy content matching across all projects
        if (!replaced && item.originalContent) {
          const origSnippet = item.originalContent.slice(0, 30).toLowerCase();
          for (let p = 0; p < newProj.length; p++) {
            const proj = newProj[p];
            if (proj.bullets && proj.bullets.length > 0) {
              for (let b = 0; b < proj.bullets.length; b++) {
                const bulletLower = proj.bullets[b].toLowerCase();
                if (
                  bulletLower.includes(origSnippet) ||
                  origSnippet.includes(bulletLower.slice(0, 30))
                ) {
                  proj.bullets[b] = contentToApply;
                  replaced = true;
                  break;
                }
              }
            }
            if (replaced) break;

            if (proj.description) {
              const descLower = proj.description.toLowerCase();
              if (
                descLower.includes(origSnippet) ||
                origSnippet.includes(descLower.slice(0, 30))
              ) {
                proj.description = contentToApply;
                replaced = true;
                break;
              }
            }
          }
        }

        // 3. Fallback to targetIndex or project 0
        if (!replaced) {
          const fallbackIdx =
            typeof item.targetIndex === 'number' && item.targetIndex < newProj.length
              ? item.targetIndex
              : 0;
          if (newProj[fallbackIdx].bullets && newProj[fallbackIdx].bullets.length > 0) {
            newProj[fallbackIdx].bullets[0] = contentToApply;
          } else {
            newProj[fallbackIdx].description = contentToApply;
          }
        }

        newResume = {
          ...newResume,
          projects: newProj,
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      } else {
        newResume = {
          ...newResume,
          projects: [
            {
              id: `proj_${Date.now()}`,
              title: 'Featured Project',
              description: contentToApply,
              bullets: [contentToApply],
              technologies: [],
              link: '',
            },
          ],
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      }
    } else if (item.section === 'education') {
      if (newResume.education.length > 0) {
        const newEdu = newResume.education.map((e) => ({ ...e }));
        const targetEduIdx =
          typeof item.targetIndex === 'number' && item.targetIndex < newEdu.length
            ? item.targetIndex
            : 0;
        newEdu[targetEduIdx] = {
          ...newEdu[targetEduIdx],
          degree: contentToApply.length > 100 ? contentToApply.slice(0, 100) : contentToApply,
        };
        newResume = {
          ...newResume,
          education: newEdu,
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      } else {
        newResume = {
          ...newResume,
          education: [
            {
              id: `edu_${Date.now()}`,
              institution: 'University / Institution',
              degree: contentToApply.length > 100 ? contentToApply.slice(0, 100) : contentToApply,
              graduationYear: new Date().getFullYear().toString(),
            },
          ],
          lastUpdated: new Date().toISOString(),
        };
        applied = true;
      }
    }

    if (!applied) return false;

    // Persist to server database first
    const saveRes = await saveActiveResume(newResume, {
      title: item.field || 'Resume Improvement',
      category: item.section,
      beforeText: item.originalContent,
      afterText: item.improvedContent,
    });

    if (saveRes.success) {
      hasUserEditedRef.current = true;
      setResumeData(newResume);
      setImprovements((prev) => {
        const exists = prev.some((imp) => imp.id === id);
        if (exists) {
          return prev.map((imp) => (imp.id === id ? { ...imp, status: 'accepted' } : imp));
        }
        return [{ ...item, status: 'accepted' }, ...prev];
      });
      return true;
    }

    return false;
  };

  const editImprovement = (id: string, updatedContent: string) => {
    setImprovements((prev) =>
      prev.map((imp) =>
        imp.id === id
          ? {
              ...imp,
              improvedContent: updatedContent,
              diff: imp.diff
                ? { ...imp.diff, after: updatedContent }
                : { before: imp.originalContent, after: updatedContent },
            }
          : imp
      )
    );
  };

  const rejectImprovement = (id: string) => {
    setImprovements((prev) =>
      prev.map((imp) => (imp.id === id ? { ...imp, status: 'rejected' } : imp))
    );
  };

  const applyAllApprovedImprovements = async (): Promise<boolean> => {
    const actionable = improvements.filter(
      (imp) => imp.status !== 'rejected' && imp.status !== 'accepted'
    );
    if (actionable.length === 0) return true;

    let currentResume = { ...resumeData };
    const acceptedIds: string[] = [];

    for (const item of actionable) {
      const contentToApply = (item.improvedContent || '').trim();
      if (!contentToApply) continue;
      let applied = false;

      if (item.section === 'summary') {
        currentResume = { ...currentResume, summary: contentToApply };
        applied = true;
      } else if (item.section === 'skills') {
        const cleaned = contentToApply
          .replace(/^(Technical Skills:|Core Competencies:|Skills:|Add:)\s*/i, '')
          .split(/[,|•\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 40 && !s.toLowerCase().includes('recommend'));
        if (cleaned.length > 0) {
          const existingSet = new Set(
            currentResume.skills.technical.map((s) => s.toLowerCase().trim())
          );
          const toAdd = cleaned.filter((s) => !existingSet.has(s.toLowerCase()));
          if (toAdd.length > 0) {
            currentResume = {
              ...currentResume,
              skills: {
                ...currentResume.skills,
                technical: [...currentResume.skills.technical, ...toAdd],
              },
            };
          }
          applied = true;
        }
      } else if (item.section === 'experience') {
        if (currentResume.experience.length > 0) {
          const newExp = currentResume.experience.map((e) => ({
            ...e,
            bulletPoints: [...e.bulletPoints],
          }));
          let replaced = false;

          // 1. Direct index targeting
          if (
            typeof item.targetIndex === 'number' &&
            item.targetIndex >= 0 &&
            item.targetIndex < newExp.length
          ) {
            const targetExp = newExp[item.targetIndex];
            if (
              typeof item.targetBulletIndex === 'number' &&
              item.targetBulletIndex >= 0 &&
              item.targetBulletIndex < targetExp.bulletPoints.length
            ) {
              targetExp.bulletPoints[item.targetBulletIndex] = contentToApply;
              replaced = true;
            } else if (targetExp.bulletPoints.length > 0) {
              targetExp.bulletPoints[0] = contentToApply;
              replaced = true;
            } else {
              targetExp.bulletPoints.push(contentToApply);
              replaced = true;
            }
          }

          // 2. Fuzzy content matching
          if (!replaced && item.originalContent) {
            const origSnippet = item.originalContent.slice(0, 30).toLowerCase();
            for (let i = 0; i < newExp.length; i++) {
              for (let b = 0; b < newExp[i].bulletPoints.length; b++) {
                const currentBullet = newExp[i].bulletPoints[b];
                const bulletLower = currentBullet.toLowerCase();
                if (
                  bulletLower.includes(origSnippet) ||
                  origSnippet.includes(bulletLower.slice(0, 30))
                ) {
                  newExp[i].bulletPoints[b] = contentToApply;
                  replaced = true;
                  break;
                }
              }
              if (replaced) break;
            }
          }

          // 3. Fallback
          if (!replaced) {
            const fallbackIdx =
              typeof item.targetIndex === 'number' && item.targetIndex < newExp.length
                ? item.targetIndex
                : 0;
            if (newExp[fallbackIdx].bulletPoints.length > 0) {
              newExp[fallbackIdx].bulletPoints[0] = contentToApply;
            } else {
              newExp[fallbackIdx].bulletPoints.push(contentToApply);
            }
          }

          currentResume = { ...currentResume, experience: newExp };
          applied = true;
        }
      } else if (item.section === 'projects') {
        if (currentResume.projects.length > 0) {
          const newProj = currentResume.projects.map((p) => ({
            ...p,
            bullets: p.bullets ? [...p.bullets] : [],
            technologies: p.technologies ? [...p.technologies] : [],
          }));
          let replaced = false;

          // 1. Direct index targeting
          if (
            typeof item.targetIndex === 'number' &&
            item.targetIndex >= 0 &&
            item.targetIndex < newProj.length
          ) {
            const proj = newProj[item.targetIndex];
            if (
              typeof item.targetBulletIndex === 'number' &&
              item.targetBulletIndex >= 0 &&
              proj.bullets &&
              item.targetBulletIndex < proj.bullets.length
            ) {
              proj.bullets[item.targetBulletIndex] = contentToApply;
              replaced = true;
            } else if (proj.bullets && proj.bullets.length > 0) {
              proj.bullets[0] = contentToApply;
              replaced = true;
            } else {
              proj.description = contentToApply;
              replaced = true;
            }
          }

          // 2. Fuzzy content matching
          if (!replaced && item.originalContent) {
            const origSnippet = item.originalContent.slice(0, 30).toLowerCase();
            for (let p = 0; p < newProj.length; p++) {
              const proj = newProj[p];
              if (proj.bullets && proj.bullets.length > 0) {
                for (let b = 0; b < proj.bullets.length; b++) {
                  const bulletLower = proj.bullets[b].toLowerCase();
                  if (
                    bulletLower.includes(origSnippet) ||
                    origSnippet.includes(bulletLower.slice(0, 30))
                  ) {
                    proj.bullets[b] = contentToApply;
                    replaced = true;
                    break;
                  }
                }
              }
              if (replaced) break;

              if (proj.description) {
                const descLower = proj.description.toLowerCase();
                if (
                  descLower.includes(origSnippet) ||
                  origSnippet.includes(descLower.slice(0, 30))
                ) {
                  proj.description = contentToApply;
                  replaced = true;
                  break;
                }
              }
            }
          }

          // 3. Fallback
          if (!replaced) {
            const fallbackIdx =
              typeof item.targetIndex === 'number' && item.targetIndex < newProj.length
                ? item.targetIndex
                : 0;
            if (newProj[fallbackIdx].bullets && newProj[fallbackIdx].bullets.length > 0) {
              newProj[fallbackIdx].bullets[0] = contentToApply;
            } else {
              newProj[fallbackIdx].description = contentToApply;
            }
          }

          currentResume = { ...currentResume, projects: newProj };
          applied = true;
        }
      } else if (item.section === 'education') {
        if (currentResume.education.length > 0) {
          const newEdu = currentResume.education.map((e) => ({ ...e }));
          const targetEduIdx =
            typeof item.targetIndex === 'number' && item.targetIndex < newEdu.length
              ? item.targetIndex
              : 0;
          newEdu[targetEduIdx] = {
            ...newEdu[targetEduIdx],
            degree: contentToApply.length > 100 ? contentToApply.slice(0, 100) : contentToApply,
          };
          currentResume = { ...currentResume, education: newEdu };
          applied = true;
        }
      }

      if (applied) {
        acceptedIds.push(item.id);
      }
    }

    if (acceptedIds.length === 0) return true;

    currentResume.lastUpdated = new Date().toISOString();
    const saveResult = await saveActiveResume(currentResume, {
      title: `Batch Applied ${acceptedIds.length} Suggestions`,
      category: 'ATS Optimization',
      beforeText: 'Multiple resume sections',
      afterText: 'Optimized phrasing across sections',
    });

    if (saveResult.success) {
      hasUserEditedRef.current = true;
      setResumeData(currentResume);
      const acceptedSet = new Set(acceptedIds);
      setImprovements((prev) =>
        prev.map((imp) => (acceptedSet.has(imp.id) ? { ...imp, status: 'accepted' } : imp))
      );
      return true;
    }
    return false;
  };

  const regenerateImprovement = async (id: string): Promise<boolean> => {
    const item = improvements.find((imp) => imp.id === id);
    if (!item) return false;

    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: item.section,
          originalContent: item.originalContent,
          jobDescription: targetJob.description || undefined,
          jobTitle: targetJob.title || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.improvedContent) {
          setImprovements((prev) =>
            prev.map((imp) =>
              imp.id === id
                ? {
                    ...imp,
                    improvedContent: data.improvedContent,
                    reasoning: data.reasoning || imp.reasoning,
                    metricImpact: data.metricImpact || imp.metricImpact,
                    status: 'pending',
                    diff: {
                      before: imp.originalContent,
                      after: data.improvedContent,
                    },
                  }
                : imp
            )
          );
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const tailorResumeToJob = async (
    jobTitle?: string,
    company?: string,
    jobDescription?: string
  ) => {
    const title = (jobTitle || targetJob.title || 'Target Role').trim();
    const comp = (company || targetJob.company || 'Target Company').trim();
    const desc = (jobDescription || targetJob.description).trim();

    if (!desc || desc.length < 20) return;

    updateTargetJob({ title, company: comp, description: desc });

    const textToAnalyze = `${resumeData.personalInfo.fullName}\n${resumeData.personalInfo.headline || ''}\n${resumeData.summary}\nSkills: ${resumeData.skills.technical.join(', ')}\nExperience:\n${resumeData.experience
      .map((e) => `${e.role} at ${e.company}: ${e.bulletPoints.join(' ')}`)
      .join('\n')}`;

    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: textToAnalyze,
          jobTitle: title,
          company: comp,
          jobDescription: desc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newImprovements: ImprovementItem[] = [];

        if (data.tailoredSummary) {
          newImprovements.push({
            id: `imp_tailor_summary_${Date.now()}`,
            section: 'summary',
            field: 'Professional Summary',
            originalContent: resumeData.summary || 'Current summary',
            improvedContent: data.tailoredSummary,
            reasoning: `Refocused summary statement to highlight primary technical alignment for ${title} at ${comp}.`,
            metricImpact: 'Role Alignment',
            status: 'pending',
            isJobTailored: true,
            diff: {
              before: resumeData.summary || '',
              after: data.tailoredSummary,
            },
          });
        }

        if (Array.isArray(data.suggestedBullets)) {
          data.suggestedBullets.forEach((b: any, idx: number) => {
            newImprovements.push({
              id: `imp_tailor_bullet_${Date.now()}_${idx}`,
              section: 'experience',
              field: `Experience Bullet #${idx + 1}`,
              originalContent: b.original,
              improvedContent: b.tailored,
              reasoning:
                b.impactReason ||
                `Restructured with authoritative action verbs aligned with ${title}.`,
              metricImpact: 'Action-Oriented Phrasing',
              status: 'pending',
              isJobTailored: true,
              diff: {
                before: b.original,
                after: b.tailored,
              },
            });
          });
        }

        if (Array.isArray(data.recommendedSkills) && data.recommendedSkills.length > 0) {
          newImprovements.push({
            id: `imp_tailor_skills_${Date.now()}`,
            section: 'skills',
            field: 'Target Job Skills Inventory',
            originalContent: `Current Skills: ${resumeData.skills.technical.slice(0, 5).join(', ')}`,
            improvedContent: data.recommendedSkills.join(', '),
            reasoning: `High-priority technical skills required in job posting that will improve ATS keyword search placement.`,
            metricImpact: 'Target Skill Coverage',
            status: 'pending',
            isJobTailored: true,
            diff: {
              before: `Missing from resume: ${data.recommendedSkills.slice(0, 4).join(', ')}`,
              after: `Add verified skills: ${data.recommendedSkills.join(', ')}`,
            },
          });
        }

        if (newImprovements.length > 0) {
          setImprovements(newImprovements);
        }
      }
    } catch (err) {
      console.error('Tailor error:', err);
    }
  };

  return (
    <ResumeContext.Provider
      value={{
        resumeData,
        setResumeData,
        activeResumeId,
        setActiveResumeId,
        saveState,
        saveError,
        lastSavedAt,
        isRehydrating,
        saveActiveResume,
        rehydrateResume,
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
        setTargetJob,
        updateTargetJob,
        clearTargetJob,
        analysisResult,
        setAnalysisResult,
        isAnalyzing,
        setIsAnalyzing,
        runAnalysis,
        improvements,
        setImprovements,
        acceptImprovement,
        editImprovement,
        rejectImprovement,
        applyAllApprovedImprovements,
        regenerateImprovement,
        tailorResumeToJob,
        userResumes,
        isLoadingUserResumes,
        fetchUserResumes,
        switchActiveResume,
        setActiveResume,
        removeActiveResume,
        createNewResume,
        uploadNewResume,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        undo,
        redo,
        canUndo,
        canRedo,
        updateLanguages,
        updateAchievements,
        updateSectionOrder,
        updateObjective,
        updateAdditionalInfo,
        updateCustomSections,
        updateHiddenSections,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}

/**
 * Checks whether an improvement has genuinely been saved to the resumeData structure.
 */
export function isImprovementAppliedToResume(
  item: ImprovementItem,
  resume: ResumeData
): boolean {
  if (item.status !== 'accepted') return false;
  if (!item.improvedContent) return false;

  const target = item.improvedContent.trim();
  if (item.section === 'summary') {
    return resume.summary.trim() === target;
  }
  if (item.section === 'skills') {
    const cleaned = target
      .replace(/^(Technical Skills:|Core Competencies:|Skills:|Add:)\s*/i, '')
      .split(/[,|•\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1 && !s.includes('recommend'));
    if (cleaned.length === 0) return false;
    const resumeSkills = new Set(
      resume.skills.technical.map((s) => s.toLowerCase().trim())
    );
    return cleaned.some((s) => resumeSkills.has(s));
  }
  if (item.section === 'experience') {
    return resume.experience.some((exp) =>
      exp.bulletPoints.some(
        (b) => b.trim() === target || (target.length > 25 && b.includes(target.slice(0, 30)))
      )
    );
  }
  if (item.section === 'projects') {
    return resume.projects.some(
      (p) =>
        p.description?.trim() === target ||
        p.bullets?.some(
          (b) => b.trim() === target || (target.length > 25 && b.includes(target.slice(0, 30)))
        )
    );
  }
  if (item.section === 'education') {
    return resume.education.some(
      (edu) =>
        edu.degree?.trim() === target ||
        edu.institution?.trim() === target ||
        (target.length > 20 && (edu.degree?.includes(target.slice(0, 25)) || edu.institution?.includes(target.slice(0, 25))))
    );
  }
  return false;
}
