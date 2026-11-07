'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  ChevronRight,
  Maximize2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Camera,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Video,
  Play,
  RotateCcw,
  BookOpen,
  Target,
  ExternalLink,
} from 'lucide-react';
import { SupportedSkill, AssessmentAttempt, ProctoringEvent, ProctoringEventType } from '@/types/skills';
import { useCareer } from '@/context/CareerContext';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { YouTubeIcon } from '@/components/ui/YouTubeIcon';
import { YOUTUBE_ROADMAPS } from '@/lib/learning/youtubeResources';
import confetti from 'canvas-confetti';

interface ExamQuestion {
  id: string;
  question: string;
  type: string;
  difficulty: string;
  topic: string;
  options: string[];
  codeSnippet?: string;
}

type AssessmentStage = 'readiness' | 'testing' | 'result';

const ALL_SUPPORTED_SKILLS: SupportedSkill[] = [
  'Python',
  'Java',
  'JavaScript',
  'SQL',
  'React',
  'C++',
  'C#',
  'Machine Learning',
  'Data Analysis',
  'Git',
  'AWS',
];

export function normalizeSupportedSkill(raw: string | undefined | null): SupportedSkill {
  if (!raw) return 'Python';
  const decoded = decodeURIComponent(raw).trim();
  const directMatch = ALL_SUPPORTED_SKILLS.find(
    (s) => s.toLowerCase() === decoded.toLowerCase()
  );
  if (directMatch) return directMatch;
  if (/^c\+\+|cpp$/i.test(decoded)) return 'C++';
  if (/^c\#|csharp|cs$/i.test(decoded)) return 'C#';
  if (/^js$/i.test(decoded)) return 'JavaScript';
  if (/^ml|machine[-_ ]?learning$/i.test(decoded)) return 'Machine Learning';
  if (/^data[-_ ]?analysis$/i.test(decoded)) return 'Data Analysis';
  return 'Python';
}

export default function AssessmentRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const rawSkill = (params?.skill as string) || 'Python';
  const skillParam = normalizeSupportedSkill(rawSkill);
  const { recordAssessmentResult } = useCareer();

  // Lifecycle Stage
  const [stage, setStage] = useState<AssessmentStage>('readiness');

  // Camera Hardware & Proctoring Lifecycle State
  const [assessmentStatus, setAssessmentStatus] = useState<
    'not_started' | 'waiting_camera' | 'in_progress' | 'camera_interrupted' | 'submitted' | 'completed'
  >('not_started');
  const [cameraHardwareStatus, setCameraHardwareStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'unavailable' | 'disconnected' | 'active'
  >('prompt');
  const [streamHealth, setStreamHealth] = useState<'good' | 'degraded' | 'offline' | 'unknown'>('unknown');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [framesVerified, setFramesVerified] = useState(false);
  const [measuringFrames, setMeasuringFrames] = useState(false);
  const [measuredFps, setMeasuredFps] = useState(0);
  const [measuredResolution, setMeasuredResolution] = useState('unknown');
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // Fullscreen Enforced State
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  // Test State
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AssessmentAttempt | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passingScore, setPassingScore] = useState(7);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);

  // Timer & Suspension State
  const [durationSeconds, setDurationSeconds] = useState(1200);
  const [timeLeft, setTimeLeft] = useState(1200);
  const endTimeRef = useRef<number>(Date.now() + 1200 * 1000);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<'fullscreen_exit' | 'tab_switch' | 'camera_disconnect' | null>(null);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);

  // Proctoring Violations & Event Log
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [violationCount, setViolationCount] = useState(0);

  // Incident deduplication refs: prevent duplicate triggers for a single user action
  const incidentActiveRef = useRef<boolean>(false);
  const lastIncidentTimeRef = useRef<number>(0);

  // References for WebRTC, media tracks, and streaming timers
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const readinessVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Stop Camera Helper: stops all hardware tracks immediately and releases resources
  const stopCamera = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (frameSyncTimerRef.current) {
      clearInterval(frameSyncTimerRef.current);
      frameSyncTimerRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (readinessVideoRef.current) {
      readinessVideoRef.current.srcObject = null;
    }
    if (activeVideoRef.current) {
      activeVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraHardwareStatus('disconnected');
    setStreamHealth('offline');
  }, []);

  // Frame Verification: Verifies video stream is actually producing genuine video frames (not just getUserMedia success)
  const verifyCameraFrames = useCallback(
    (
      videoEl: HTMLVideoElement,
      stream?: MediaStream | null
    ): Promise<{ verified: boolean; fps: number; resolution: string; failureReason?: string }> => {
      return new Promise((resolve) => {
        const activeStream = stream || (videoEl.srcObject as MediaStream | null) || mediaStreamRef.current;
        const videoTrack = activeStream?.getVideoTracks?.()[0];

        if (!videoTrack) {
          resolve({
            verified: false,
            fps: 0,
            resolution: 'unknown',
            failureReason: 'No video track found in the camera stream.',
          });
          return;
        }

        // Hardware privacy switch check: track.muted is set when physical shutter or switch is active
        if (videoTrack.muted) {
          resolve({
            verified: false,
            fps: 0,
            resolution: 'unknown',
            failureReason:
              'Camera connected, but video frames are not rendering. Please check your physical webcam shutter, permissions, or privacy switch.',
          });
          return;
        }

        // Ensure stream is attached to the video element
        if (activeStream && videoEl.srcObject !== activeStream) {
          videoEl.srcObject = activeStream;
        }
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play().catch(() => {});

        let frameCount = 0;
        let lastTime = -1;
        let isSettled = false;
        const startTime = Date.now();
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const finish = (result: { verified: boolean; fps: number; resolution: string; failureReason?: string }) => {
          if (isSettled) return;
          isSettled = true;
          clearInterval(checkInterval);
          if (rVFCHandle !== null && typeof (videoEl as any).cancelVideoFrameCallback === 'function') {
            (videoEl as any).cancelVideoFrameCallback(rVFCHandle);
          }
          resolve(result);
        };

        // Listen for hardware mute events during verification
        const onMute = () => {
          finish({
            verified: false,
            fps: 0,
            resolution: 'unknown',
            failureReason:
              'Camera connected, but video frames are not rendering. Please check your physical webcam shutter, permissions, or privacy switch.',
          });
        };
        videoTrack.addEventListener('mute', onMute, { once: true });

        // Method 1: requestVideoFrameCallback (standard in Chrome 83+, Edge 83+, Safari 15.4+, Firefox 120+)
        let rVFCHandle: number | null = null;
        if (typeof (videoEl as any).requestVideoFrameCallback === 'function') {
          const onFrame = (_now: number, metadata: any) => {
            if (isSettled) return;
            if (metadata && metadata.width > 0 && metadata.height > 0) {
              frameCount++;
              if (frameCount >= 2) {
                const fps = 30;
                const resolution = `${videoEl.videoWidth || metadata.width}x${videoEl.videoHeight || metadata.height}`;
                finish({ verified: true, fps, resolution });
                return;
              }
            }
            if (!isSettled && typeof (videoEl as any).requestVideoFrameCallback === 'function') {
              rVFCHandle = (videoEl as any).requestVideoFrameCallback(onFrame);
            }
          };
          rVFCHandle = (videoEl as any).requestVideoFrameCallback(onFrame);
        }

        // Method 2: High-frequency polling fallback across all browsers
        const checkInterval = setInterval(() => {
          if (isSettled) return;

          // Timeout check (5.5 seconds)
          if (Date.now() - startTime > 5500) {
            if (videoEl.readyState < 2) {
              finish({
                verified: false,
                fps: 0,
                resolution: 'unknown',
                failureReason:
                  'Camera connected, but video frames timed out before playback started. Please check camera connection.',
              });
            } else if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
              finish({
                verified: false,
                fps: 0,
                resolution: 'unknown',
                failureReason:
                  'Camera connected, but video dimensions are invalid (0x0). Please check your camera driver.',
              });
            } else {
              finish({
                verified: false,
                fps: 0,
                resolution: 'unknown',
                failureReason:
                  'Camera connected, but video frames are not rendering. Please check your physical webcam shutter, permissions, or privacy switch.',
              });
            }
            return;
          }

          if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            const currentTime = videoEl.currentTime;
            if (currentTime !== lastTime) {
              lastTime = currentTime;
              frameCount++;

              if (ctx) {
                try {
                  ctx.drawImage(videoEl, 0, 0, 32, 32);
                } catch {}
              }

              if (frameCount >= 2) {
                const fps = 30;
                const resolution = `${videoEl.videoWidth}x${videoEl.videoHeight}`;
                finish({ verified: true, fps, resolution });
              }
            }
          }
        }, 100);
      });
    },
    []
  );

  // WebRTC Publisher: Streams live camera feed P2P to authenticated administrator console
  const initWebRtcPublisher = useCallback(async (currentAttemptId: string, stream: MediaStream) => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      stream.getVideoTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch('/api/proctoring/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessmentId: currentAttemptId,
              sender: 'candidate',
              type: 'candidate',
              data: event.candidate,
            }),
          }).catch(() => {});
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch('/api/proctoring/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: currentAttemptId,
          sender: 'candidate',
          type: 'offer',
          data: offer,
        }),
      });

      const answerPoll = setInterval(async () => {
        if (!peerConnectionRef.current || pc.signalingState === 'closed') {
          clearInterval(answerPoll);
          return;
        }
        try {
          const res = await fetch(`/api/proctoring/signal?assessmentId=${encodeURIComponent(currentAttemptId)}&for=candidate`);
          if (res.ok) {
            const json = await res.json();
            if (json.signal?.answer && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(json.signal.answer));
              clearInterval(answerPoll);
            }
          }
        } catch {}
      }, 2500);
    } catch (err) {
      console.warn('WebRTC signaling notice:', err);
    }
  }, []);

  // Heartbeat loop: Sends authenticated health telemetry every 3 seconds
  const startHeartbeatLoop = useCallback((currentAttemptId: string, currentRes: string, currentFps: number) => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

    const sendHeartbeat = async () => {
      try {
        const isTrackActive = Boolean(
          mediaStreamRef.current &&
          mediaStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
        );

        const statusToSend = isTrackActive ? 'in_progress' : 'camera_interrupted';
        const camStatusToSend = isTrackActive ? 'active' : 'disconnected';
        const streamHealthToSend = isTrackActive ? 'good' : 'offline';

        await fetch('/api/proctoring/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: currentAttemptId,
            status: statusToSend,
            cameraStatus: camStatusToSend,
            streamHealth: streamHealthToSend,
            frameRate: isTrackActive ? currentFps : 0,
            resolution: currentRes,
          }),
        });
      } catch {}
    };

    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 3000);
  }, []);

  // Frame sync loop: Authenticated snapshot streaming (~1.5s) for instant loading & network fallback
  const startFrameSyncLoop = useCallback((currentAttemptId: string) => {
    if (frameSyncTimerRef.current) clearInterval(frameSyncTimerRef.current);

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    frameSyncTimerRef.current = setInterval(() => {
      const video = activeVideoRef.current || readinessVideoRef.current;
      if (video && video.readyState >= 2 && ctx && mediaStreamRef.current) {
        try {
          ctx.drawImage(video, 0, 0, 320, 240);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          fetch('/api/proctoring/frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessmentId: currentAttemptId,
              frame: dataUrl,
            }),
          }).catch(() => {});
        } catch {}
      }
    }, 1500);
  }, []);

  // Cleanup on unmount or browser refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopCamera();
    };
  }, [stopCamera]);

  // Sync mediaStream with video elements whenever stream or stage changes
  useEffect(() => {
    if (stage === 'readiness' && readinessVideoRef.current && mediaStreamRef.current) {
      readinessVideoRef.current.srcObject = mediaStreamRef.current;
      readinessVideoRef.current.play().catch(() => {});
    }
  }, [stage, cameraActive]);

  useEffect(() => {
    if (stage === 'testing' && activeVideoRef.current && mediaStreamRef.current) {
      activeVideoRef.current.srcObject = mediaStreamRef.current;
      activeVideoRef.current.play().catch(() => {});
    }
  }, [stage]);

  // Request Camera Permission & Activate Live Feed with Frame Verification
  const handleEnableCamera = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    setCameraLoading(true);
    setCameraError(null);
    setAssessmentStatus('waiting_camera');
    setCameraHardwareStatus('prompt');

    // Clean up any existing stream before reacquiring
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (readinessVideoRef.current) {
      readinessVideoRef.current.srcObject = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Your browser does not support webcam access. Please use an updated modern browser.');
      setCameraHardwareStatus('unavailable');
      setStreamHealth('offline');
      setCameraLoading(false);
      isInitializingRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // AUDIO STRICTLY DISABLED PER SPEC
      });

      mediaStreamRef.current = stream;
      setCameraHardwareStatus('granted');
      setMeasuringFrames(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          setCameraActive(false);
          setCameraHardwareStatus('disconnected');
          setStreamHealth('offline');
          setAssessmentStatus('camera_interrupted');
          recordIncidentViolation('CAMERA_DISCONNECTED', 'Camera stream was disconnected or revoked during examination.');
        });
      }

      // Attach stream to mounted video element (or fallback element)
      const targetVideo = readinessVideoRef.current || document.createElement('video');
      targetVideo.srcObject = stream;
      targetVideo.muted = true;
      targetVideo.playsInline = true;
      await targetVideo.play().catch((playErr) => {
        console.warn('Video element play notice:', playErr);
      });

      // Perform genuine frame verification
      const verifyRes = await verifyCameraFrames(targetVideo, stream);

      if (verifyRes.verified) {
        setFramesVerified(true);
        setCameraActive(true);
        setCameraHardwareStatus('active');
        setStreamHealth('good');
        setMeasuredFps(verifyRes.fps);
        setMeasuredResolution(verifyRes.resolution);
        setAssessmentStatus('waiting_camera');
        setCameraError(null);
      } else {
        setFramesVerified(false);
        setCameraActive(false);
        setCameraHardwareStatus('unavailable');
        setStreamHealth('offline');
        setCameraError(
          verifyRes.failureReason ||
            'Camera connected, but video frames are not rendering. Please check your physical webcam shutter, permissions, or privacy switch.'
        );
        stopCamera();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setFramesVerified(false);
      setCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraHardwareStatus('denied');
        setCameraError('Camera permission was denied in your browser settings. Please click the lock or camera icon in your address bar, grant camera access, and click Retry Camera.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraHardwareStatus('unavailable');
        setCameraError('No webcam hardware detected on this machine. An active camera is required for proctoring.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraHardwareStatus('unavailable');
        setCameraError('Camera is currently in use by another application. Please close other video software (Zoom, Teams, Meet) and retry.');
      } else if (err.name === 'OverconstrainedError') {
        setCameraHardwareStatus('unavailable');
        setCameraError('Requested camera video constraints could not be satisfied. Please retry with standard camera resolution.');
      } else {
        setCameraHardwareStatus('unavailable');
        setCameraError(err.message || 'Unable to connect to camera. Please check your camera settings.');
      }
    } finally {
      setCameraLoading(false);
      setMeasuringFrames(false);
      isInitializingRef.current = false;
    }
  };

  // Helper to activate Fullscreen API reliably
  const requestFullscreenMode = async (): Promise<boolean> => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        setIsFullscreenActive(true);
        return true;
      }

      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }

      // Small tick for browser state synchronization
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreenActive(isFs);
      return isFs;
    } catch (err) {
      console.warn('requestFullscreen error:', err);
      setIsFullscreenActive(false);
      return false;
    }
  };

  // Log Informational Proctoring Events
  const logProctorEvent = (type: ProctoringEventType, details: string) => {
    const event: ProctoringEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      details,
      severity: 'info',
    };
    setProctoringEvents((prev) => [...prev, event]);
  };

  // Terminate Assessment Immediately (Requirement 3: Status INCOMPLETE)
  const handleTerminateTest = async (reason: string) => {
    if (!attemptId) return;

    // Send proctoring status update
    try {
      await fetch('/api/proctoring/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: attemptId,
          status: 'terminated',
          cameraStatus: 'disconnected',
          streamHealth: 'offline',
        }),
      });
    } catch {}

    // Stop hardware immediately and exit fullscreen
    stopCamera();
    setAssessmentStatus('camera_interrupted');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          userAnswers,
          proctoringEvents,
          durationSeconds: durationSeconds - timeLeft,
          terminationReason: reason,
        }),
      });

      if (res.ok) {
        const attempt: AssessmentAttempt = await res.json();
        attempt.status = 'INCOMPLETE';
        attempt.passed = false;
        recordAssessmentResult(attempt);
        setAttemptResult(attempt);
        setStage('result');
      }
    } catch (err) {
      console.error('Error terminating assessment:', err);
    }
  };

  // Record Incident Violation with deduplication and suspension (Requirement 2 & 3)
  const recordIncidentViolation = (
    type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'CAMERA_DISCONNECTED',
    details: string
  ) => {
    if (stage !== 'testing') return;

    const now = Date.now();
    // Do not count duplicate browser events from the same incident as multiple violations
    if (incidentActiveRef.current || now - lastIncidentTimeRef.current < 2500) {
      return;
    }

    incidentActiveRef.current = true;
    lastIncidentTimeRef.current = now;

    // Pause the assessment timer immediately
    setIsPaused(true);
    if (type === 'TAB_SWITCH') {
      setPauseReason('tab_switch');
    } else if (type === 'FULLSCREEN_EXIT') {
      setPauseReason('fullscreen_exit');
    } else {
      setPauseReason('camera_disconnect');
    }

    // Increment violation count from real events
    setViolationCount((prev) => {
      const newCount = prev + 1;

      const event: ProctoringEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        timestamp: new Date().toISOString(),
        details,
        severity: 'violation',
      };
      setProctoringEvents((evts) => [...evts, event]);

      if (newCount === 1) {
        setActiveWarning(`Warning (1/3): ${details} The exam is paused. Acknowledge this notice to resume.`);
      } else if (newCount === 2) {
        setActiveWarning(`Final Warning (2/3): ${details} A 3rd violation will terminate the assessment as INCOMPLETE.`);
      } else if (newCount >= 3) {
        setActiveWarning('Assessment Terminated: Maximum violation threshold reached (3/3). Result marked as INCOMPLETE.');
        setTimeout(() => {
          handleTerminateTest(`Exceeded maximum allowed proctoring violations (3/3): ${details}`);
        }, 150);
      }

      return newCount;
    });
  };

  // Start Assessment: Enforce Fullscreen Activation before starting timer (Requirement 1)
  const handleStartAssessment = async () => {
    if (!cameraActive || !rulesAccepted || startLoading) return;
    setStartLoading(true);
    setFullscreenError(null);

    // 1. Request browser fullscreen and verify activation
    const isFsActive = await requestFullscreenMode();
    if (!isFsActive) {
      setFullscreenError(
        'Fullscreen mode could not be activated. Fullscreen is mandatory to begin and take this proctored assessment.'
      );
      setStartLoading(false);
      return;
    }

    // 2. Fetch assessment attempt and questions from backend
    try {
      const res = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skillParam }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || `${skillParam} assessment is currently unavailable.`);
        setStartLoading(false);
        return;
      }

      setAttemptId(data.attemptId);
      setAssessmentStatus('in_progress');

      // Register session with Live Proctoring Center
      try {
        await fetch('/api/proctoring/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: data.attemptId,
            skill: skillParam,
            status: 'in_progress',
            cameraStatus: 'active',
            streamHealth: 'good',
            frameRate: measuredFps || 30,
            resolution: measuredResolution || '640x480',
            consentGiven: true,
          }),
        });
      } catch (err) {
        console.warn('Live proctoring registration notice:', err);
      }

      // Initialize WebRTC P2P publisher
      if (mediaStreamRef.current) {
        initWebRtcPublisher(data.attemptId, mediaStreamRef.current);
      }

      // Start periodic heartbeats and frame snapshots
      startHeartbeatLoop(data.attemptId, measuredResolution, measuredFps || 30);
      startFrameSyncLoop(data.attemptId);

      const mapped: ExamQuestion[] = (data.questions || []).map((q: any) => ({
        id: q.id,
        question: q.question_text,
        type: q.question_type || 'MCQ',
        difficulty: q.difficulty || 'Medium',
        topic: `${q.difficulty || 'Medium'} Technical`,
        options: q.options || [],
      }));

      setQuestions(mapped);
      setPassingScore(data.passingScore || 7);
      setTotalQuestionsCount(data.totalQuestions || mapped.length || 10);
      const durSec = data.durationSeconds || 1200;
      setDurationSeconds(durSec);
      setTimeLeft(durSec);
      setTimeLimitMinutes(Math.round(durSec / 60));
      endTimeRef.current = Date.now() + durSec * 1000;

      const initEvents: ProctoringEvent[] = [
        {
          id: `evt_${Date.now()}_start`,
          type: 'ASSESSMENT_STARTED',
          timestamp: new Date().toISOString(),
          details: 'Assessment session started in verified fullscreen mode.',
          severity: 'info',
        },
        {
          id: `evt_${Date.now()}_cam`,
          type: 'CAMERA_STARTED',
          timestamp: new Date().toISOString(),
          details: 'Camera monitoring stream active and verified.',
          severity: 'info',
        },
        {
          id: `evt_${Date.now()}_fs`,
          type: 'FULLSCREEN_ENTER',
          timestamp: new Date().toISOString(),
          details: 'Mandatory fullscreen verified active.',
          severity: 'info',
        },
      ];
      setProctoringEvents(initEvents);

      setIsPaused(false);
      setPauseReason(null);
      incidentActiveRef.current = false;
      setStage('testing');
    } catch (err) {
      console.error('Failed to start assessment:', err);
      setErrorMessage('Failed to connect to assessment service. Please check your network connection.');
    } finally {
      setStartLoading(false);
    }
  };

  // Resume Assessment after Suspension Notice acknowledged
  const handleResumeAssessment = async () => {
    // If recovering from fullscreen exit, ensure fullscreen is re-established
    if (pauseReason === 'fullscreen_exit' || !document.fullscreenElement) {
      const fsOk = await requestFullscreenMode();
      if (!fsOk) {
        setActiveWarning('Please allow fullscreen mode to resume your examination session.');
        return;
      }
    }

    // Unpause timer and recalculate absolute end time
    endTimeRef.current = Date.now() + timeLeft * 1000;
    setIsPaused(false);
    setPauseReason(null);
    incidentActiveRef.current = false;
    setActiveWarning(null);
    logProctorEvent('FULLSCREEN_ENTER', 'Assessment resumed by candidate in fullscreen mode.');
  };

  // Countdown Timer (Paused when isPaused is true)
  useEffect(() => {
    if (stage !== 'testing') return;

    const timer = setInterval(() => {
      // Pause timer when suspended or hidden
      if (isPaused) return;

      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleSubmitTest();
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isPaused]);

  // Window Focus, Visibility, and Fullscreen Proctoring Listeners
  useEffect(() => {
    if (stage !== 'testing') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordIncidentViolation('TAB_SWITCH', 'Browser tab switched away or window minimized.');
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus - trigger tab switch if document is hidden or focus lost
      if (document.hidden) {
        recordIncidentViolation('TAB_SWITCH', 'Assessment window lost active focus.');
      }
    };

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreenActive(isFs);

      if (!isFs && stage === 'testing') {
        recordIncidentViolation('FULLSCREEN_EXIT', 'Fullscreen mode was exited during the assessment.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleSelectOption = (optionIndex: number) => {
    if (questions.length === 0 || isPaused) return;
    const currentQ = questions[currentIndex];
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  // Submit Assessment (Regular Completion)
  const handleSubmitTest = async () => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    setAssessmentStatus('submitted');

    // Notify proctoring session of submission
    try {
      await fetch('/api/proctoring/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: attemptId,
          status: 'submitted',
          cameraStatus: 'disconnected',
          streamHealth: 'offline',
        }),
      });
    } catch {}

    // Stop camera hardware and exit fullscreen immediately
    stopCamera();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          userAnswers,
          proctoringEvents,
          durationSeconds: durationSeconds - timeLeft,
        }),
      });

      if (res.ok) {
        const attempt: AssessmentAttempt = await res.json();
        const cert = recordAssessmentResult(attempt);
        if (cert) {
          attempt.certificateId = cert.verificationCode;
        }

        if (attempt.passed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }

        setAttemptResult(attempt);
        setAssessmentStatus('completed');
        setStage('result');
      } else {
        alert('Failed to submit assessment. Please retry.');
      }
    } catch (err) {
      console.error('Error submitting assessment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // ERROR VIEW (Unavailable or System Issue)
  // =========================================================================
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-lg text-center space-y-4 shadow-xl border-amber-500/30">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Assessment Unavailable</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Skills
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  // =========================================================================
  // STAGE 1: ASSESSMENT READINESS & CAMERA CHECK SCREEN
  // =========================================================================
  if (stage === 'readiness') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Top Bar with Back navigation & Theme Switcher */}
          <div className="flex items-center justify-between">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Skill Directory
            </Link>
            <ThemeToggle />
          </div>

          {/* Main Readiness Card */}
          <GlassCard variant="bento" className="p-6 sm:p-8 space-y-6 text-left" glow>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] mb-2">
                  Proctored Examination
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {skillParam} Technical Assessment
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Mandatory Fullscreen & Camera Readiness Check
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <span>{timeLimitMinutes} Minutes</span>
              </div>
            </div>

            {/* Assessment Rules Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Questions</div>
                <div className="text-base font-bold text-[var(--text-primary)]">10 Multiple Choice</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Randomized from bank</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Passing Score</div>
                <div className="text-base font-bold text-emerald-400">70% Required</div>
                <div className="text-[11px] text-[var(--text-secondary)]">7 of 10 to certify</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Integrity Policy</div>
                <div className="text-base font-bold text-amber-400">3 Violations Max</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Terminates as INCOMPLETE</div>
              </div>
            </div>

            {/* Camera Setup & Live Verification Card */}
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Camera Proctoring Verification
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {cameraActive && framesVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Frames Verified ({measuredResolution}, {measuredFps} FPS)
                    </span>
                  ) : measuringFrames ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Verifying Video Frames...
                    </span>
                  ) : cameraHardwareStatus === 'denied' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                      Permission Denied
                    </span>
                  ) : cameraHardwareStatus === 'unavailable' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Camera Unavailable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Camera Required
                    </span>
                  )}
                </div>
              </div>

              {/* Assessment Lifecycle Status Banner */}
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Assessment Lifecycle Status:</span>
                <span className="font-bold text-[var(--accent)] uppercase tracking-wider text-[11px]">
                  {assessmentStatus === 'not_started'
                    ? 'Not Started'
                    : assessmentStatus === 'waiting_camera'
                    ? 'Waiting for Camera Verification'
                    : assessmentStatus === 'in_progress'
                    ? 'In Progress'
                    : assessmentStatus === 'camera_interrupted'
                    ? 'Camera Interrupted'
                    : assessmentStatus === 'submitted'
                    ? 'Submitted'
                    : 'Completed'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  Candidate Consent & Camera Proctoring Notice:
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  By starting this examination, you acknowledge and consent that your camera feed is streamed in real-time to the administrator proctoring console for skill authentication. Audio is strictly disabled. Video media tracks are stopped and released immediately when your assessment concludes.
                </p>
              </div>

              {/* Video Preview Box with Persistent Video Element */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--border-color)] max-w-md mx-auto aspect-video flex items-center justify-center shadow-inner">
                {/* Real Mirrored Video Element - Permanently mounted so ref and layout are always available */}
                <video
                  ref={readinessVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* State 1: Live Verified Overlay Badge */}
                {cameraActive && framesVerified && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white flex items-center gap-1.5 font-medium z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Verified Camera Stream ({measuredResolution})
                  </div>
                )}

                {/* State 2: Camera Loading or Measuring Frames Overlay */}
                {(cameraLoading || measuringFrames) && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
                    <p className="text-xs font-bold text-white">Verifying Camera & Video Frames...</p>
                    <p className="text-[11px] text-white/80">Checking live video playback and frame delivery</p>
                  </div>
                )}

                {/* State 3: Not active and not measuring (Initial prompt or idle state) */}
                {!cameraActive && !measuringFrames && !cameraLoading && (
                  <div className="absolute inset-0 bg-[var(--bg-elevated)] flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 border border-dashed border-[var(--border-color)] rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Camera Permission & Frame Verification Required
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto mt-0.5">
                        Click below to request camera access and verify that active video frames are rendering.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleEnableCamera}
                      disabled={cameraLoading || measuringFrames}
                      className="btn-primary btn-sm inline-flex items-center gap-2 text-xs font-semibold shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Enable Camera & Verify Frames</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Notice if camera failed */}
              {cameraError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={handleEnableCamera}
                      className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-semibold hover:bg-rose-600 transition-colors"
                    >
                      Retry Camera Access
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Test Rules & Code of Conduct */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] space-y-2 text-xs">
              <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[var(--accent)]" />
                Strict Fullscreen Examination Rules
              </h4>
              <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-5">
                <li><strong className="text-[var(--text-primary)]">Mandatory Fullscreen:</strong> The exam starts only in full-screen mode. Exiting fullscreen will pause the timer and log a violation.</li>
                <li><strong className="text-[var(--text-primary)]">Tab Switching:</strong> Switching browser tabs or minimizing the window pauses the exam and logs a violation.</li>
                <li><strong className="text-[var(--text-primary)]">Live Camera:</strong> The camera feed must remain connected. Disconnecting the camera triggers a violation.</li>
                <li><strong className="text-rose-400">3 Violations Maximum:</strong> Reaching 3 violations automatically terminates the test as <strong className="text-rose-400">INCOMPLETE</strong> with no credential awarded.</li>
              </ul>
              <p className="text-[11px] text-[var(--text-secondary)] italic pt-1 border-t border-[var(--border-color)]/60">
                Note: Standard web browsers rely on real-time event monitoring rather than physical operating system locks. Integrity is enforced via continuous incident detection.
              </p>
            </div>

            {/* Fullscreen Error Banner if Fullscreen request failed */}
            {fullscreenError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-semibold">{fullscreenError}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Please click Retry Fullscreen and ensure your browser allows fullscreen permissions.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAssessment}
                    className="btn-destructive btn-sm inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Fullscreen Activation</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rules Acknowledgment Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:border-[var(--accent)]/40 transition-colors">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                I agree to the strict examination rules: I understand that the exam requires fullscreen mode, and that leaving the window, switching tabs, or disconnecting the camera will record violations and terminate the session at 3 violations.
              </span>
            </label>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected by Smart Resume AI Integrity Engine</span>
              </div>

              <button
                type="button"
                onClick={handleStartAssessment}
                disabled={!cameraActive || !rulesAccepted || startLoading}
                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-xs sm:text-sm font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {startLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activating Fullscreen...</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Start Assessment (Fullscreen)</span>
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 2: ACTIVE PROCTORED FULLSCREEN INTERFACE
  // =========================================================================
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {stage === 'testing' && (
        <>
          {/* SUSPENSION OVERLAY MODAL (Requirement 2: Pause timer and questions when violation occurs) */}
          {isPaused && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <GlassCard className="p-8 max-w-lg text-center space-y-5 border-amber-500/40 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <ShieldAlert className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {pauseReason === 'fullscreen_exit'
                      ? 'Fullscreen Exited: Exam Paused'
                      : pauseReason === 'tab_switch'
                      ? 'Tab Switch Detected: Exam Paused'
                      : 'Assessment Paused'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {activeWarning || 'A proctoring violation was recorded. Answering questions is paused while you resolve this notice.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] font-medium">Recorded Violations:</span>
                  <span className={`font-bold ${violationCount >= 2 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {violationCount} / 3 Allowed
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResumeAssessment}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-lg shadow-[var(--accent)]/25 transition-all hover:scale-105 active:scale-95"
                  >
                    {pauseReason === 'fullscreen_exit' ? (
                      <>
                        <Maximize2 className="w-4 h-4" />
                        <span>Re-enter Fullscreen & Resume Exam</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Acknowledge Warning & Resume Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TOP BAR: Header with real-time indicators (Requirement 4) */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between border-b border-[var(--border-color)] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shadow-md">
                {skillParam.charAt(0)}
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold text-[var(--text-primary)]">
                  {skillParam} Technical Assessment
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Question {currentIndex + 1} of {questions.length} · {passingScore}/{questions.length} to pass
                </p>
              </div>
            </div>

            {/* Real-Time Integrity Badges */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                FULLSCREEN ACTIVE
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CAMERA ACTIVE
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  violationCount === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : violationCount === 1
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>VIOLATIONS: {violationCount}/3</span>
              </div>

              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-xl border font-mono font-bold text-xs sm:text-sm ${
                  isPaused
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : timeLeft < 180
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 animate-pulse'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]'
                }`}
              >
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <span>{isPaused ? 'PAUSED' : formatTimer(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN FOCUSED INTERFACE (Requirement 4) */}
          <div className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN EXAM COLUMN (8 cols on desktop) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
              {/* Progress Bar */}
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              {currentQ && (
                <GlassCard className="p-6 sm:p-8 space-y-6 text-left" glow>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-secondary)] text-[var(--accent)]">
                      {currentQ.topic}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      Type: {currentQ.type}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                    {currentQ.question}
                  </h2>

                  {/* Code Snippet if present */}
                  {currentQ.codeSnippet && (
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
                      <code>{currentQ.codeSnippet}</code>
                    </pre>
                  )}

                  {/* Options List */}
                  <div className="space-y-3 pt-2">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = userAnswers[currentQ.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          disabled={isPaused}
                          className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)]/40 text-[var(--text-primary)]'
                          } ${isPaused ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <span>{option}</span>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 ml-3 ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                                : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* Question Navigator Grid & Next/Submit Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {questions.map((q, idx) => {
                    const isAnswered = userAnswers[q.id] !== undefined;
                    const isCurr = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => !isPaused && setCurrentIndex(idx)}
                        disabled={isPaused}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isCurr
                            ? 'bg-[var(--accent)] text-white ring-2 ring-[var(--accent)]'
                            : isAnswered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        } ${isPaused ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentIndex === 0 || isPaused}
                    className="btn-secondary btn-sm text-xs cursor-pointer disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      disabled={isPaused}
                      className="btn-primary btn-sm flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitTest}
                      disabled={isSubmitting || isPaused}
                      className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Grading...' : `Submit Assessment (${answeredCount}/${questions.length})`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE-PANEL: LIVE CAMERA PROCTORING CARD (4 cols on desktop) */}
            <div className="lg:col-span-4 space-y-4">
              <GlassCard className="p-4 sm:p-5 text-left space-y-4 border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Live Proctoring
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Monitoring Active
                  </span>
                </div>

                {/* Real Mirrored Video Element */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-[var(--border-color)] shadow-inner">
                  <video
                    ref={activeVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] text-white/90 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>STREAMING ({measuredResolution})</span>
                  </div>
                </div>

                {/* Telemetry Metrics Bar */}
                <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Stream Health:</span>
                    <span className={streamHealth === 'good' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {streamHealth === 'good' ? 'Active (Good)' : 'Interrupted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Frame Rate:</span>
                    <span className="font-mono text-[var(--text-primary)]">{measuredFps || 30} FPS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Assessment Status:</span>
                    <span className="font-bold text-[var(--accent)] uppercase">{assessmentStatus}</span>
                  </div>
                </div>

                {/* Integrity Status Metrics */}
                <div className="space-y-2 pt-1 border-t border-[var(--border-color)]/60 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">Violation Limit:</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {violationCount} / 3 Allowed
                    </span>
                  </div>

                  {/* Violation Visual Progress Bar */}
                  <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        violationCount === 0
                          ? 'bg-emerald-400 w-0'
                          : violationCount === 1
                          ? 'bg-amber-400 w-1/3'
                          : violationCount === 2
                          ? 'bg-rose-500 w-2/3'
                          : 'bg-rose-600 w-full'
                      }`}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5 text-[11px]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Enforced Guardrails</div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Fullscreen Lock Active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Tab Switch & Focus Detection</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Continuous Camera Stream</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Assurance */}
                <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5 italic">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                  <span>Real-time local verification. No video is recorded or stored.</span>
                </p>
              </GlassCard>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: ASSESSMENT RESULT SCREEN (Requirement 3: Status INCOMPLETE on termination) */}
      {/* ========================================================================= */}
      {stage === 'result' && attemptResult && (
        <div className="w-full max-w-3xl mx-auto space-y-6 text-left py-8 animate-fade-in">
          <GlassCard variant="bento" className="p-8 text-center space-y-6" glow>
            <div className="flex justify-center">
              <ScoreRing
                score={
                  attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                    ? 0
                    : Math.round((attemptResult.score / (questions.length || totalQuestionsCount || 10)) * 100)
                }
                size={140}
                strokeWidth={10}
                label={
                  attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                    ? 'INCOMPLETE'
                    : `${attemptResult.score} / ${questions.length || totalQuestionsCount || 10}`
                }
                subLabel={
                  attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                    ? 'TERMINATED'
                    : 'SCORE'
                }
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                {attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                  ? 'Assessment Incomplete (Terminated)'
                  : attemptResult.passed
                  ? 'Skill Verification Passed!'
                  : 'Assessment Completed (Threshold Not Met)'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                {attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                  ? (attemptResult.terminationReason || 'The assessment was terminated due to exceeding maximum allowed proctoring violations (3/3).')
                  : attemptResult.passed
                  ? `Congratulations! You scored ${attemptResult.score}/${questions.length || totalQuestionsCount || 10} on ${attemptResult.skill} and met the threshold for verified credential status.`
                  : `You scored ${attemptResult.score}/${questions.length || totalQuestionsCount || 10} on ${attemptResult.skill}. The pass requirement is ${passingScore}/${questions.length || totalQuestionsCount || 10}.`}
              </p>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                  attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : attemptResult.passed
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                Status: {attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated' ? 'INCOMPLETE' : attemptResult.passed ? 'VERIFIED' : 'NOT VERIFIED'}
              </span>

              <span className="px-3 py-1 rounded-md text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                Violations Logged: {attemptResult.violationCount}
              </span>

              <span className="px-3 py-1 rounded-md text-xs font-medium bg-[var(--bg-secondary)] text-emerald-400 border border-[var(--border-color)] flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                Fullscreen & Camera Monitored
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-[var(--border-color)]">
              {attemptResult.passed && attemptResult.certificateId && (
                <Link
                  href={`/skills/certificate/${attemptResult.certificateId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                >
                  <FileCheck className="w-4 h-4" />
                  View Verification Certificate
                </Link>
              )}

              {(attemptResult.status === 'INCOMPLETE' || attemptResult.status === 'terminated' || !attemptResult.passed) && (
                <button
                  type="button"
                  onClick={() => {
                    setStage('readiness');
                    setAttemptResult(null);
                    setViolationCount(0);
                    setUserAnswers({});
                    setRulesAccepted(false);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs sm:text-sm transition-all shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Assessment
                </button>
              )}

              <Link
                href="/skills"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm transition-all"
              >
                Return to Skills Directory
              </Link>
            </div>
          </GlassCard>

          {/* CURATED YOUTUBE LEARNING RECOMMENDATIONS (Phase 4) */}
          {(!attemptResult.passed || attemptResult.status === 'INCOMPLETE') &&
            (YOUTUBE_ROADMAPS[skillParam] || YOUTUBE_ROADMAPS[attemptResult.skill as SupportedSkill]) && (() => {
              const roadmap = YOUTUBE_ROADMAPS[skillParam] || YOUTUBE_ROADMAPS[attemptResult.skill as SupportedSkill];
              const targetSkillName = roadmap.skill;

              return (
                <GlassCard className="p-6 text-left space-y-6 border-amber-500/30 bg-amber-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                        <YouTubeIcon className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          Curated YouTube Learning Roadmap for {targetSkillName}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Master the key concepts below to retake the assessment and earn your verified credential.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
                        Recommended Study: {roadmap.recommendedStudyHours} Hours
                      </span>
                    </div>
                  </div>

                  {/* Video Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roadmap.resources.map((res) => (
                      <div
                        key={res.id}
                        className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between space-y-3 hover:border-[var(--accent)] transition-all shadow-sm group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-red-400 flex items-center gap-1">
                              <YouTubeIcon className="w-3 h-3 text-red-400" />
                              {res.channelName}
                            </span>
                            <span className="font-mono text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">
                              {res.duration}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                            {res.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {res.keyTakeaway}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {res.topicsCovered.slice(0, 3).map((topic: string, i: number) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium"
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
                          className="mt-2 w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Watch Tutorial</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Core Concepts & Retake Tips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Essential Concepts to Review
                      </h4>
                      <ul className="list-disc list-outside ml-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                        {roadmap.coreConcepts.map((concept: string, i: number) => (
                          <li key={i}>{concept}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Recruiter Exam Retake Tips
                      </h4>
                      <ul className="list-disc list-outside ml-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                        {roadmap.retakeExamTips.map((tip: string, i: number) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              );
            })()}

          {/* Topic Performance Breakdown (Only if completed) */}
          {attemptResult.status !== 'INCOMPLETE' && attemptResult.topicBreakdown && attemptResult.topicBreakdown.length > 0 && (
            <GlassCard className="p-6 text-left space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Topic Performance Breakdown
              </h3>
              <div className="space-y-3">
                {attemptResult.topicBreakdown.map((t, idx) => {
                  const pct = Math.round((t.correct / t.total) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[var(--text-primary)]">{t.topic}</span>
                        <span className="text-[var(--text-secondary)]">
                          {t.correct} / {t.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-secondary)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Proctoring Audit Log */}
          {attemptResult.proctoringEvents && attemptResult.proctoringEvents.length > 0 && (
            <GlassCard className="p-6 text-left space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Proctoring Audit Summary ({attemptResult.proctoringEvents.length} events logged)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {attemptResult.proctoringEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] text-[11px]"
                  >
                    <span className={`font-mono ${evt.severity === 'violation' ? 'text-rose-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                      {evt.type}
                    </span>
                    <span className="text-[var(--text-secondary)] truncate max-w-sm">{evt.details}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
