'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  Maximize2,
  AlertTriangle,
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Filter,
  Search,
  AlertCircle,
  Terminal,
  Activity,
  Radio,
  Lock,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface ProctoringEventItem {
  id: string;
  assessment_id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'violation';
  details: string | null;
  timestamp: string;
  skill?: string;
  user_name?: string;
  user_email?: string;
}

interface MonitoredSession {
  id: string;
  skill: string;
  score: number;
  passed: number;
  status: string;
  duration_seconds: number;
  proctoring_violation_count: number;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  camera_status?: string | null;
  stream_health?: 'good' | 'degraded' | 'offline' | 'unknown' | null;
  frame_rate?: number | null;
  resolution?: string | null;
  last_heartbeat_at?: string | null;
  consent_given?: number | null;
  started_at?: string | null;
}

interface ProctoringSummaryData {
  totalEvents: number;
  totalViolations: number;
  totalWarnings: number;
  violationBreakdown: Array<{ event_type: string; count: number }>;
  activeOrRecentSessions: MonitoredSession[];
  recentEvents: ProctoringEventItem[];
}

export default function AdminProctoringPage() {
  const [data, setData] = useState<ProctoringSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<MonitoredSession | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'violation' | 'warning' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Proctoring Stream State
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [webRtcConnected, setWebRtcConnected] = useState(false);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [streamHealth, setStreamHealth] = useState<'good' | 'degraded' | 'offline' | 'unknown'>('unknown');
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveResolution, setLiveResolution] = useState<string>('unknown');
  const [heartbeatAge, setHeartbeatAge] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const fetchProctoringData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/proctoring');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.activeOrRecentSessions?.length > 0) {
          setSelectedSession((prev) => {
            if (!prev) return json.activeOrRecentSessions[0];
            const updated = json.activeOrRecentSessions.find((s: MonitoredSession) => s.id === prev.id);
            return updated || prev;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load proctoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProctoringData();
    const interval = setInterval(fetchProctoringData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchProctoringData]);

  // Live Video Streaming & Telemetry receiver for selected candidate
  useEffect(() => {
    setWebRtcConnected(false);
    setLiveFrame(null);
    setStreamError(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (!selectedSession) return;

    // Privacy & Authorization Guard: Stream only while actively running and consented!
    const isActivelyRunning = selectedSession.status === 'in_progress';
    const hasConsent = Boolean(selectedSession.consent_given);

    if (!isActivelyRunning || !hasConsent) {
      setStreamHealth('offline');
      return;
    }

    let isSubscribed = true;
    let pollTimer: NodeJS.Timeout | null = null;
    let signalingTimer: NodeJS.Timeout | null = null;

    // 1. Frame Polling (Fast initial display & reliable network fallback)
    const fetchFrame = async () => {
      try {
        const res = await fetch(`/api/proctoring/frame?assessmentId=${encodeURIComponent(selectedSession.id)}`);
        if (!isSubscribed) return;

        if (res.ok) {
          const json = await res.json();
          if (json.active && json.frame) {
            setLiveFrame(json.frame);
            setStreamHealth(json.streamHealth || 'good');
            setLiveFps(json.frameRate || 30);
            setLiveResolution(json.resolution || '640x480');
            setHeartbeatAge(json.lastHeartbeatAgeSeconds ?? 0);
            setStreamError(null);
          } else {
            setStreamHealth('degraded');
          }
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          setStreamError(errData.message || 'Stream unavailable: assessment is not active or consent missing');
          setStreamHealth('offline');
        }
      } catch {
        if (isSubscribed) setStreamHealth('degraded');
      }
    };

    fetchFrame();
    pollTimer = setInterval(fetchFrame, 1500);

    // 2. WebRTC PeerConnection Setup (Direct P2P video stream)
    const setupWebRtc = async () => {
      try {
        const res = await fetch(`/api/proctoring/signal?assessmentId=${encodeURIComponent(selectedSession.id)}&for=admin`);
        if (!isSubscribed || !res.ok) return;

        const { signal } = await res.json();
        if (!signal?.offer) return;

        if (!peerConnectionRef.current || peerConnectionRef.current.signalingState === 'closed') {
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          });
          peerConnectionRef.current = pc;

          pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
              remoteVideoRef.current.play().catch(() => {});
              setWebRtcConnected(true);
              setStreamHealth('good');
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              fetch('/api/proctoring/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assessmentId: selectedSession.id,
                  sender: 'admin',
                  type: 'candidate',
                  data: event.candidate,
                }),
              }).catch(() => {});
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await fetch('/api/proctoring/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessmentId: selectedSession.id,
              sender: 'admin',
              type: 'answer',
              data: answer,
            }),
          });
        }
      } catch (err) {
        console.warn('Admin WebRTC signal setup notice:', err);
      }
    };

    setupWebRtc();
    signalingTimer = setInterval(setupWebRtc, 4000);

    return () => {
      isSubscribed = false;
      if (pollTimer) clearInterval(pollTimer);
      if (signalingTimer) clearInterval(signalingTimer);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [selectedSession]);

  const handleModerateSession = async (action: 'warn' | 'terminate', assessmentId: string) => {
    try {
      const res = await fetch('/api/admin/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          assessmentId,
          reason: action === 'terminate'
            ? 'Candidate session terminated due to excessive proctoring violations.'
            : 'Candidate issued official warning for suspicious activity.',
        }),
      });

      if (res.ok) {
        setActionNotice({
          type: 'success',
          message: action === 'terminate' ? 'Session terminated successfully.' : 'Warning notice sent to session log.',
        });
        await fetchProctoringData();
      } else {
        setActionNotice({ type: 'error', message: 'Failed to execute moderation action.' });
      }
    } catch {
      setActionNotice({ type: 'error', message: 'Network error executing moderation action.' });
    }
  };

  const filteredEvents = (data?.recentEvents || []).filter((evt) => {
    if (severityFilter !== 'all' && evt.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchType = evt.event_type.toLowerCase().includes(q);
      const matchSkill = evt.skill?.toLowerCase().includes(q);
      const matchUser = evt.user_name?.toLowerCase().includes(q) || evt.user_email?.toLowerCase().includes(q);
      if (!matchType && !matchSkill && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            Live Candidate Proctoring Center
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            AI Camera & Behavioral Proctoring
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Real-time assessment proctoring audit log, webcam telemetry inspection, and anti-cheating supervision.
          </p>
        </div>

        <button
          onClick={fetchProctoringData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Candidate Consent Notice Banner */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-xs leading-relaxed">
        <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-primary)] block font-semibold">
            Candidate Privacy & Consent Compliance:
          </strong>
          <span className="text-[var(--text-secondary)]">
            Candidates explicitly acknowledge and consent to webcam monitoring, browser fullscreen locking, and behavioral event logging prior to beginning assessments. Telemetry is securely encrypted with tamper-evident audit trails.
          </span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
          actionNotice.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Total Telemetry Events</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-black text-[var(--text-primary)]">
            {data?.totalEvents || 0}
          </span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Recorded in SQLite database</p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Violations Flagged</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-2xl font-black text-rose-400">
            {data?.totalViolations || 0}
          </span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Fullscreen escapes & tab switches</p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Warnings Issued</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-400">
            {data?.totalWarnings || 0}
          </span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Soft threshold reminders</p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Monitored Candidates</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400">
            {data?.activeOrRecentSessions.length || 0}
          </span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Active or recent exam takers</p>
        </div>
      </div>

      {/* Main Proctoring Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Monitored Sessions List */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Exam Sessions
            </h3>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {data?.activeOrRecentSessions.length || 0} Total
            </span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {(data?.activeOrRecentSessions || []).map((sess) => {
              const isSelected = selectedSession?.id === sess.id;
              const hasViolations = sess.proctoring_violation_count > 0;
              const isLive = sess.status === 'in_progress';
              const isGoodHealth = sess.stream_health === 'good';

              return (
                <div
                  key={sess.id}
                  onClick={() => setSelectedSession(sess)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm ring-1 ring-[var(--accent)]/20'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/50 hover:border-[var(--border-hover)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-[var(--text-primary)] block truncate">
                        {sess.user_name || 'Candidate'}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                        {sess.user_email || 'No email recorded'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wider ${
                        isLive
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse'
                          : sess.status === 'passed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : sess.status === 'terminated'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {sess.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{sess.skill}</span>
                    <span>Score: {sess.score}/10</span>
                  </div>

                  {/* Telemetry pill bar */}
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[var(--border-color)]/50">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLive && isGoodHealth
                            ? 'bg-emerald-400 animate-pulse'
                            : isLive
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-mono text-[var(--text-secondary)]">
                        {isLive ? (isGoodHealth ? 'Stream Live' : 'Degraded') : 'Stream Ended'}
                      </span>
                    </div>

                    <span className={hasViolations ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {sess.proctoring_violation_count} Violations
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Center: Selected Candidate Live Camera Telemetry & Moderation */}
        <GlassCard className="p-5 lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Live Camera Telemetry & Session Detail
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {selectedSession ? `Session ID: ${selectedSession.id}` : 'Select a session to inspect'}
              </p>
            </div>

            {selectedSession && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleModerateSession('warn', selectedSession.id)}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  Send Warning
                </button>
                <button
                  onClick={() => handleModerateSession('terminate', selectedSession.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Terminate Session
                </button>
              </div>
            )}
          </div>

          {selectedSession ? (
            <div className="space-y-4">
              {/* Remote Live Video Viewport */}
              {selectedSession.status === 'in_progress' && selectedSession.consent_given ? (
                <div className="relative aspect-video rounded-2xl bg-black border border-[var(--border-color)] overflow-hidden shadow-inner flex items-center justify-center">
                  {/* WebRTC Video Element */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${
                      webRtcConnected ? 'block' : 'hidden'
                    }`}
                  />

                  {/* Fallback Live Frame Relay */}
                  {!webRtcConnected && liveFrame && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={liveFrame}
                      alt="Candidate live stream"
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  )}

                  {/* Connecting Placeholder while video stream initializes */}
                  {!webRtcConnected && !liveFrame && (
                    <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center">
                      <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin opacity-80" />
                      <p className="text-xs font-medium text-slate-300">
                        Connecting to candidate live video feed...
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {streamError || 'Waiting for candidate frame handshake...'}
                      </p>
                    </div>
                  )}

                  {/* Top Live Overlay HUD */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[10px] text-white font-mono shadow-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold tracking-wide">LIVE PROCTOR STREAM</span>
                    <span className="text-white/60">({liveResolution} • {liveFps} FPS)</span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-emerald-400 shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{webRtcConnected ? 'WebRTC P2P' : 'Frame Relay'}</span>
                  </div>

                  {/* Bottom Telemetry HUD Bar */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Heartbeat:</span>
                      <span className="text-emerald-400 font-bold">
                        {heartbeatAge !== null ? `${heartbeatAge}s ago` : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Health:</span>
                      <span className={streamHealth === 'good' ? 'text-emerald-400 font-bold uppercase' : 'text-amber-400 font-bold uppercase'}>
                        {streamHealth}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Consent:</span>
                      <span className="text-indigo-300 font-bold">Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Violations:</span>
                      <span className={selectedSession.proctoring_violation_count > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {selectedSession.proctoring_violation_count}/3
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Privacy Protection Placeholder when test is completed/inactive */
                <div className="relative aspect-video rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Lock className="w-7 h-7 opacity-80" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {selectedSession.status === 'in_progress'
                        ? 'Waiting for Camera Verification'
                        : 'Camera Stream Inactive (Privacy Safeguard)'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {selectedSession.status === 'in_progress'
                        ? 'Candidate is currently completing pre-assessment camera verification.'
                        : `Remote camera preview is restricted to active, in-progress assessments with verified candidate consent. Assessment status is "${selectedSession.status.toUpperCase()}". Camera media tracks were released per privacy compliance.`}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-secondary)]">
                    <span>Status: {selectedSession.status.toUpperCase()}</span>
                    <span>•</span>
                    <span>Score: {selectedSession.score}/10</span>
                  </div>
                </div>
              )}

              {/* Candidate Info and Session Metrics Strip */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)]">Candidate Identity:</span>{' '}
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedSession.user_name || 'Verified User'}
                  </span>{' '}
                  <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                    ({selectedSession.user_email || 'No email recorded'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)]">Target Skill:</span>
                  <span className="font-bold text-[var(--accent)]">{selectedSession.skill}</span>
                </div>
              </div>

              {/* Session Metrics Pill Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Exam Skill</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedSession.skill}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Score</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedSession.score} / 10</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Duration</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {Math.round(selectedSession.duration_seconds / 60)} mins
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Session Time</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono text-[11px]">
                    {new Date(selectedSession.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[var(--text-secondary)]">
              No session selected. Click a candidate session on the left to monitor.
            </div>
          )}
        </GlassCard>
      </div>

      {/* Real-Time Behavioral Violation Stream */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Real-Time Behavioral Audit Log Stream
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Severity Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs">
              {(['all', 'violation', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] transition-all cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event type or user..."
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
            No proctoring events matched the current filter.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evt.severity === 'violation'
                        ? 'bg-rose-500 ring-2 ring-rose-500/30'
                        : evt.severity === 'warning'
                        ? 'bg-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-indigo-400'
                    }`}
                  />
                  <div>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-xs">
                      {evt.event_type}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] ml-2">
                      {evt.details || 'Standard telemetry signal recorded'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
                  <span>{evt.user_name || evt.user_email || 'Candidate'}</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
