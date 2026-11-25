'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  RotateCcw,
  AlertCircle,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Compass,
  Square,
  ChevronDown,
  Command,
  X,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { useUserProfile } from '@/components/user/UserContext';
import { FeedbackButtons } from '@/components/feedback/FeedbackButtons';
import { AssistantCompanion } from '@/components/assistant/AssistantCompanion';
import type { CompanionDrag } from '@/components/assistant/companionMotion';
import { advanceCompanionDrag, createCompanionDrag, followCompanionPosition } from '@/components/assistant/companionLocomotion';
import { clampCompanionPosition, safeCompanionPosition } from '@/components/assistant/companionPlacement';
import { useAssistantPresentation } from './useAssistantPresentation';
import chatStyles from './CareerChatbot.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: string;
}

type PromptCategory = 'ats' | 'resume' | 'skills' | 'projects' | 'jobs';

const CONTEXT_CHIPS: Array<{ key: PromptCategory; label: string }> = [
  { key: 'ats', label: 'ATS' },
  { key: 'resume', label: 'Resume' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'jobs', label: 'Jobs' },
];

async function copyToClipboard(text: string): Promise<boolean> {
  let copied = false;
  try {
    if (typeof window !== 'undefined' && !document.hasFocus()) {
      window.focus();
    }
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { }

  if (!copied) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch { }
  }

  return copied;
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-card border border-border-hairline bg-bg-subtle text-caption text-text font-mono">
      <div className="flex items-center justify-between border-b border-border-hairline bg-bg px-3 py-2 font-sans text-caption text-text-secondary">
        <span className="uppercase tracking-wider font-semibold">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-control px-2 py-1 transition-colors hover:bg-bg-subtle hover:text-text"
          title={copied ? 'Copied to clipboard' : 'Copy code'}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code snippet'}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="font-medium text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre p-3 leading-relaxed">{code}</pre>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Matches markdown links [label](url), inline code `code`, and bold **text**
  const regex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const label = match[1];
        const href = match[2];
        const isInternal = href.startsWith('/');
        if (isInternal) {
          return (
            <Link
              key={idx}
              href={href}
              data-chat-no-drag="true"
              className="mx-0.5 inline-flex items-center font-medium text-accent-hover underline decoration-accent/40 transition-colors hover:decoration-accent"
            >
              {label}
            </Link>
          );
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-chat-no-drag="true"
            className="mx-0.5 inline-flex items-center font-medium text-accent-hover underline decoration-accent/40 transition-colors hover:decoration-accent"
          >
            {label}
          </a>
        );
      }
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="rounded-control bg-accent-tint px-1.5 py-0.5 font-mono text-caption text-accent"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code_${i}`}
            language={codeLanguage}
            code={codeBlockLines.join('\n')}
          />
        );
        codeBlockLines = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3_${i}`} className="mb-1 mt-4 text-body font-semibold text-text">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2_${i}`} className="mb-1 mt-4 text-h3 font-semibold text-text">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1_${i}`} className="mb-1 mt-5 text-h2 font-semibold text-text">
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq_${i}`} className="my-3 rounded-r-control border-l-2 border-accent bg-accent-tint py-2 pl-3 text-small text-text-secondary">
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={`li_${i}`} className="my-1 ml-5 list-disc text-body leading-relaxed">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)/);
      elements.push(
        <div key={`num_${i}`} className="my-1 ml-1 flex gap-2 text-body leading-relaxed">
          <span className="shrink-0 font-semibold">{match ? match[1] : ''}</span>
          <span>{renderInlineFormatting(match ? match[2] : line)}</span>
        </div>
      );
    } else if (line.trim().length === 0) {
      elements.push(<div key={`sp_${i}`} className="h-2" />);
    } else {
      elements.push(
        <p key={`p_${i}`} className="my-1.5 text-body leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <CodeBlock
        key="code_end"
        language={codeLanguage}
        code={codeBlockLines.join('\n')}
      />
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

function TypingIndicator({ reducedMotion, paused }: { reducedMotion: boolean | null; paused: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-3 py-2 ${chatStyles.typing}`}
      role="status"
      aria-live="polite"
      aria-label="Career Copilot is typing"
    >
      <AssistantCompanion state="thinking" size={32} paused={paused} />
      <span className="sr-only">Assistant is thinking</span>
      <div className="flex items-center gap-2 text-small text-text-secondary">
        <span aria-hidden="true">Career Copilot is thinking</span>
      </div>
    </motion.div>
  );
}

const STORAGE_KEY = 'sra_ai_launcher_pos';
const PANEL_STORAGE_KEY = 'sra_ai_panel_pos';
const MARGIN = 16;
const DEFAULT_LAUNCHER_WIDTH = 80;
const DEFAULT_LAUNCHER_HEIGHT = 104;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 700;
const PANEL_MARGIN = 8;
const MIN_HEADER_VISIBLE = 56;

interface PanelPosition {
  x: number;
  y: number;
}

interface PanelDragStart extends PanelPosition {
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  moved: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function clampPanelPosition(x: number, y: number, width: number, height: number): PanelPosition {
  if (typeof window === 'undefined') return { x, y };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const minX = PANEL_MARGIN;
  const maxX = Math.max(PANEL_MARGIN, vw - width - PANEL_MARGIN);

  const minY = PANEL_MARGIN;
  // If panel fits vertically within viewport, keep entire panel inside viewport.
  // If panel is taller than viewport (e.g. short viewport or mobile landscape),
  // keep at least the header accessible so it moves freely without getting pinned at the top.
  const maxY =
    height <= vh - 2 * PANEL_MARGIN
      ? Math.max(minY, vh - height - PANEL_MARGIN)
      : Math.max(minY, vh - MIN_HEADER_VISIBLE - PANEL_MARGIN);

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

export function CareerChatbot() {
  const pathname = usePathname();
  const { user, loading, refreshUser } = useUserProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI Assistant. I can help tailor your resume, prepare for interviews, plan your job search, and build career skills. What are you working toward?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [careerProfile, setCareerProfile] = useState<any | null>(null);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<PromptCategory>('ats');

  // Draggable positioning state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [petHovered, setPetHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const prefersReduced = useReducedMotion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef;
  const launcherRef = useRef<HTMLDivElement>(null);
  const launcherPositionRef = useRef<{ x: number; y: number } | null>(null);
  const launcherTargetRef = useRef<{ x: number; y: number } | null>(null);
  const launcherLastFrameRef = useRef(0);
  const launcherFrameRef = useRef<number | null>(null);
  const suppressLauncherClickRef = useRef(false);
  const companionDragRef = useRef<CompanionDrag>(createCompanionDrag());
  const panelRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const panelPositionRef = useRef<PanelPosition | null>(null);
  const pendingPanelPositionRef = useRef<PanelPosition | null>(null);
  const panelDragFrameRef = useRef<number | null>(null);
  const panelDragStartRef = useRef<PanelDragStart | null>(null);
  const pointerStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  } | null>(null);

  const { targetJob, resumeData } = useResume();

  useEffect(() => {
    if (!user) {
      setCareerProfile(null);
      return;
    }
    let isMounted = true;
    fetch('/api/career/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.profile) {
          setCareerProfile(data.profile);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (careerProfile && messages.length === 1 && messages[0].id === 'welcome') {
      const targetRole = (careerProfile.targetRole || '').trim();
      const institution = (careerProfile.studentProfile?.institution || '').trim();
      const readinessScore = careerProfile.metrics?.readinessScore;
      const rolePart = targetRole
        ? `I'm tracking your target role as **${targetRole}**${institution ? ` at **${institution}**` : ''}`
        : institution
          ? `Connected to your **${institution}** profile`
          : `Set your target career role anytime to personalize my guidance`;
      const readinessPart = typeof readinessScore === 'number' && readinessScore > 0 ? ` (${readinessScore}% career ready)` : '';
      const greeting = `Hello ${careerProfile.name || 'there'}! I am your AI Assistant. ${rolePart}${readinessPart}. How can I assist your career launch today?`;
      if (messages[0].content !== greeting) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [careerProfile, messages]);

  const getCategoryPrompts = () => {
    const target = careerProfile?.targetRole || targetJob?.title || '';
    const displayTarget = target || 'my career goal';
    const ats = careerProfile?.latestAtsAnalysis;
    const missingSkill = careerProfile?.skillGaps?.missingCriticalSkills?.[0] || null;
    const projects = careerProfile?.studentProfile?.projects;
    const topProject = projects && projects.length > 0 ? projects[0].title : null;
    const apps = careerProfile?.recentApplications;
    const topApp = apps && apps.length > 0 ? apps[0].company : null;

    const allPrompts: Array<{ id: string; category: PromptCategory; text: string }> = [
      // ATS
      {
        id: 'ats-1',
        category: 'ats',
        text: ats?.atsScore
          ? `What should I fix first to improve my ${ats.atsScore}% ATS score?`
          : `How should I prepare my resume for an ATS review for ${displayTarget}?`,
      },
      {
        id: 'ats-2',
        category: 'ats',
        text: 'Explain the most important ATS checks in plain language',
      },
      {
        id: 'ats-3',
        category: 'ats',
        text: 'Which resume sections should I strengthen before my next scan?',
      },

      // Resume
      {
        id: 'res-1',
        category: 'resume',
        text: `How can I tailor my resume for ${displayTarget}?`,
      },
      {
        id: 'res-2',
        category: 'resume',
        text: 'Rewrite a bullet point using the Google XYZ formula',
      },
      {
        id: 'res-3',
        category: 'resume',
        text: 'What formatting mistakes get resumes rejected by ATS?',
      },

      // Projects
      {
        id: 'proj-1',
        category: 'projects',
        text: topProject
          ? `How should I describe my '${topProject}' project on my resume?`
          : missingSkill
            ? `What portfolio project should I build with ${missingSkill} for ${displayTarget}?`
            : `What portfolio project should I build for ${displayTarget}?`,
      },
      {
        id: 'proj-2',
        category: 'projects',
        text: `Suggest a portfolio project plan for ${displayTarget}`,
      },
      {
        id: 'proj-3',
        category: 'projects',
        text: 'How do I document portfolio projects clearly for recruiters?',
      },
      {
        id: 'proj-4',
        category: 'projects',
        text: 'Guide me on using the Project Mentor to structure portfolio projects',
      },

      // Skills
      {
        id: 'skl-1',
        category: 'skills',
        text: `Which core skills should I prioritize learning next for ${displayTarget}?`,
      },
      {
        id: 'skl-2',
        category: 'skills',
        text: 'How do I manage and verify my skills on Smart Resume AI?',
      },
      {
        id: 'skl-3',
        category: 'skills',
        text: 'Break down a learning roadmap for my target role',
      },

      // Jobs
      {
        id: 'job-1',
        category: 'jobs',
        text: topApp
          ? `How should I follow up on my application to ${topApp}?`
          : 'Give me a professional follow-up email template for a job application',
      },
      {
        id: 'job-2',
        category: 'jobs',
        text: 'How do I know if I qualify for a role requiring 1-2 years experience?',
      },
      {
        id: 'job-3',
        category: 'jobs',
        text: `What search queries find verified openings for ${displayTarget}?`,
      },
      {
        id: 'job-4',
        category: 'jobs',
        text: 'How should I tailor my resume bullet points for a specific job description?',
      },
    ];

    return allPrompts.filter((p) => p.category === selectedPromptCategory);
  };

  const getCommandSuggestions = () => {
    const target = careerProfile?.targetRole || targetJob?.title || 'my target role';
    return [
      {
        id: 'command-next',
        command: '/next',
        label: 'Prioritize my next action',
        prompt: `Based on my current profile, what is the single highest-priority action I should take next for ${target}?`,
      },
      {
        id: 'command-tailor',
        command: '/tailor',
        label: 'Plan a focused resume update',
        prompt: `Give me a focused plan to tailor my resume for ${target} without inventing any facts.`,
      },
      {
        id: 'command-practice',
        command: '/practice',
        label: 'Start interview practice',
        prompt: `Ask me one interview question for ${target}, then critique my answer.`,
      },
    ];
  };

  const applyPanelPosition = (nextPosition: PanelPosition) => {
    panelPositionRef.current = nextPosition;
    const panel = panelRef.current;
    if (!panel) return;

    panel.style.left = `${nextPosition.x}px`;
    panel.style.top = `${nextPosition.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  };

  const flushPendingPanelPosition = (): PanelPosition | null => {
    if (panelDragFrameRef.current !== null) {
      window.cancelAnimationFrame(panelDragFrameRef.current);
      panelDragFrameRef.current = null;
    }

    const nextPosition = pendingPanelPositionRef.current || panelPositionRef.current;
    pendingPanelPositionRef.current = null;
    if (nextPosition) {
      applyPanelPosition(nextPosition);
      setPanelPosition(nextPosition);
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(nextPosition));
      } catch {
        // Ignore localStorage errors
      }
    }
    return nextPosition;
  };

  // Strict route visibility rules: hide completely on auth, legal, admin, and assessment interface pages
  const isExcludedRoute = Boolean(
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/skills/assess') ||
    pathname?.startsWith('/skills/certificate') ||
    pathname?.startsWith('/assessment') ||
    pathname?.startsWith('/assessments') ||
    pathname === '/privacy' ||
    pathname === '/terms'
  );

  const welcomeOnly = messages.length === 1 && messages[0].id.startsWith('welcome');
  const latestAssistantId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  const presentation = useAssistantPresentation({
    enabled: Boolean(user) && !loading && !isExcludedRoute && isClient,
    open: isOpen,
    pending: chatLoading,
    typing: Boolean(input.trim()),
    welcome: welcomeOnly,
    dragging: isDragging || isPanelDragging,
    replyId: latestAssistantId,
    copiedId: copiedMessageId,
    error,
    placement: position,
    launcherRef,
  });
  const mascotPaused = presentation.blocked || isDragging || isPanelDragging || showClearConfirm || Boolean(pathname?.startsWith('/dev/style-guide'));

  // Keep only the companion's small hit target clear of page controls, including after scrolling.
  useEffect(() => {
    if (!isClient || !user || isOpen || isDragging || isExcludedRoute || presentation.blocked) return;
    let frame = 0;
    launcherRef.current?.setAttribute('data-placement-ready', 'false');
    const scan = () => {
      frame = 0;
      const launcher = launcherRef.current;
      if (!launcher || pointerStartRef.current) return;
      const rect = launcher.getBoundingClientRect();
      const layout = getComputedStyle(launcher);
      if (Math.abs(rect.width - parseFloat(layout.width)) > .05 || Math.abs(rect.height - parseFloat(layout.height)) > .05) {
        frame = requestAnimationFrame(scan);
        return;
      }
      const next = safeCompanionPosition(launcher);
      if (Math.abs(next.x - rect.left) < 1 && Math.abs(next.y - rect.top) < 1) {
        launcher.dataset.placementReady = 'true';
        return;
      }
      launcherPositionRef.current = next;
      setPosition(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Optional placement storage. */ }
    };
    const schedule = () => { launcherRef.current?.setAttribute('data-placement-ready', 'false'); if (!frame) frame = requestAnimationFrame(scan); };
    const timer = setTimeout(schedule, 240);
    const observer = new ResizeObserver(schedule);
    const layoutObserver = new MutationObserver((records) => {
      if (records.some((record) => !(record.target instanceof Element && record.target.closest('[data-assistant-mode], [data-nimbus-greeting]')))) schedule();
    });
    layoutObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('animationend', schedule, true);
    document.addEventListener('transitionend', schedule, true);
    document.fonts.addEventListener('loadingdone', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); observer.disconnect(); layoutObserver.disconnect(); document.removeEventListener('animationend', schedule, true); document.removeEventListener('transitionend', schedule, true); document.fonts.removeEventListener('loadingdone', schedule); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule); };
  }, [isClient, user, isOpen, isDragging, isExcludedRoute, pathname, presentation.blocked, position]);

  // Close and dismiss chat immediately on logout, session expiry, or navigating to excluded routes
  useEffect(() => {
    if (!user || isExcludedRoute) {
      setIsOpen(false);
      setIsFullScreen(false);
    }
  }, [user, isExcludedRoute]);

  // Safely restore persisted launcher and panel positions on client mount
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
          const clampedX = clamp(parsed.x, MARGIN, Math.max(MARGIN, window.innerWidth - DEFAULT_LAUNCHER_WIDTH - MARGIN));
          const clampedY = clamp(parsed.y, MARGIN, Math.max(MARGIN, window.innerHeight - DEFAULT_LAUNCHER_HEIGHT - MARGIN));
          setPosition({ x: clampedX, y: clampedY });
        }
      }
      const savedPanel = localStorage.getItem(PANEL_STORAGE_KEY);
      if (savedPanel) {
        const parsedPanel = JSON.parse(savedPanel);
        if (typeof parsedPanel?.x === 'number' && typeof parsedPanel?.y === 'number') {
          const clamped = clampPanelPosition(parsedPanel.x, parsedPanel.y, PANEL_WIDTH, PANEL_HEIGHT);
          setPanelPosition(clamped);
          panelPositionRef.current = clamped;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Recalculate and clamp both draggable surfaces on viewport resize or orientation changes.
  useEffect(() => {
    const handleViewportChange = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const w = launcherRef.current?.offsetWidth || DEFAULT_LAUNCHER_WIDTH;
        const h = launcherRef.current?.offsetHeight || DEFAULT_LAUNCHER_HEIGHT;
        return clampCompanionPosition(prev.x, prev.y, w, h, launcherRef.current);
      });

      const currentPanelPosition = panelPositionRef.current || panelPosition;
      const panel = panelRef.current;
      if (currentPanelPosition && panel && !isFullScreen) {
        const rect = panel.getBoundingClientRect();
        const nextPosition = clampPanelPosition(
          currentPanelPosition.x,
          currentPanelPosition.y,
          rect.width,
          rect.height
        );
        if (nextPosition.x !== currentPanelPosition.x || nextPosition.y !== currentPanelPosition.y) {
          applyPanelPosition(nextPosition);
          setPanelPosition(nextPosition);
        }
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [isFullScreen, panelPosition]);

  useEffect(() => {
    return () => {
      if (launcherFrameRef.current !== null) window.cancelAnimationFrame(launcherFrameRef.current);
      if (panelDragFrameRef.current !== null) {
        window.cancelAnimationFrame(panelDragFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (welcomeOnly) messageScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      else messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, chatLoading, isFullScreen, welcomeOnly]);

  // Support programmatic opening of chat with optional contextual prompt
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
      }
    };

    window.addEventListener('sra:open-chat', handleOpenChat);
    return () => window.removeEventListener('sra:open-chat', handleOpenChat);
  }, []);

  // Handle Escape key to exit full screen or close chat
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showClearConfirm) {
          setShowClearConfirm(false);
        } else if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullScreen, showClearConfirm]);

  // Prevent background scroll when in full screen mode
  useEffect(() => {
    if (isFullScreen && isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullScreen, isOpen]);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }, 60);
  };

  const handleResetPosition = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setPosition(null);
    launcherPositionRef.current = null;
    setPanelPosition(null);
    panelPositionRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PANEL_STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (pointerStartRef.current || !e.isPrimary) return;
    suppressLauncherClickRef.current = false;

    const rect = launcherRef.current?.getBoundingClientRect();
    const initialX = rect ? rect.left : (window.innerWidth - DEFAULT_LAUNCHER_WIDTH - MARGIN);
    const initialY = rect ? rect.top : (window.innerHeight - DEFAULT_LAUNCHER_HEIGHT - MARGIN);

    pointerStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      moved: false,
    };
    launcherPositionRef.current = launcherTargetRef.current = { x: initialX, y: initialY };
    launcherLastFrameRef.current = performance.now();
    companionDragRef.current = createCompanionDrag(companionDragRef.current.direction, companionDragRef.current.phase);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || e.pointerId !== pointerStartRef.current.pointerId) return;

    const dx = e.clientX - pointerStartRef.current.startX;
    const dy = e.clientY - pointerStartRef.current.startY;

    // Distinguish between intentional drag and slight tap/click jitter
    if (!pointerStartRef.current.moved) {
      if (dx * dx + dy * dy > 25) {
        pointerStartRef.current.moved = true;
        setIsDragging(true);
        suppressLauncherClickRef.current = true;
        setPosition({ x: pointerStartRef.current.initialX, y: pointerStartRef.current.initialY });
      } else {
        return;
      }
    }

    const launcherW = launcherRef.current?.offsetWidth || DEFAULT_LAUNCHER_WIDTH;
    const launcherH = launcherRef.current?.offsetHeight || DEFAULT_LAUNCHER_HEIGHT;

    const rawX = pointerStartRef.current.initialX + dx;
    const rawY = pointerStartRef.current.initialY + dy;

    const nextPosition = clampCompanionPosition(rawX, rawY, launcherW, launcherH, launcherRef.current);

    e.preventDefault();
    launcherTargetRef.current = nextPosition;
    if (launcherFrameRef.current === null) {
      launcherLastFrameRef.current = performance.now();
      const follow = (now: number) => {
        const from = launcherPositionRef.current;
        const target = launcherTargetRef.current;
        const launcher = launcherRef.current;
        if (from && target && launcher && pointerStartRef.current?.moved) {
          const dt = Math.min(.05, Math.max(1 / 240, (now - launcherLastFrameRef.current) / 1000));
          launcherLastFrameRef.current = now;
          const followed = followCompanionPosition(from, target, dt, Boolean(prefersReduced));
          const next = clampCompanionPosition(followed.x, followed.y, launcher.offsetWidth, launcher.offsetHeight, launcher);
          companionDragRef.current = advanceCompanionDrag(companionDragRef.current, from, next, dt, now);
          launcherPositionRef.current = next;
          launcher.style.left = `${next.x}px`;
          launcher.style.top = `${next.y}px`;
          launcher.style.right = 'auto';
          launcher.style.bottom = 'auto';
          launcherFrameRef.current = companionDragRef.current.speed === 0 && Math.hypot(next.x - target.x, next.y - target.y) < .01
            ? null : window.requestAnimationFrame(follow);
        } else {
          launcherFrameRef.current = null;
        }
      };
      launcherFrameRef.current = window.requestAnimationFrame(follow);
    }
  };

  const finishLauncherDrag = () => {
    if (launcherFrameRef.current !== null) window.cancelAnimationFrame(launcherFrameRef.current);
    launcherFrameRef.current = null;
    companionDragRef.current = { ...companionDragRef.current, speed: 0, velocityX: 0, velocityY: 0, lastMovedAt: 0, facingTravel: 0 };
    const next = launcherPositionRef.current;
    if (next) {
      setPosition(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Optional placement storage. */ }
    }
    setIsDragging(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || e.pointerId !== pointerStartRef.current.pointerId) return;

    const wasMoved = pointerStartRef.current.moved;
    pointerStartRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (wasMoved) {
      finishLauncherDrag();
    } else {
      setIsDragging(false);
      setIsOpen(true);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || e.pointerId !== pointerStartRef.current.pointerId) return;
    const moved = pointerStartRef.current.moved;
    pointerStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    if (moved) finishLauncherDrag();
    else setIsDragging(false);
  };

  const handleKeyDownLauncher = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
      return;
    }

    // Accessible arrow key nudging: allow keyboard users to reposition
    const STEP = 24;
    let newPos: { x: number; y: number } | null = null;
    const rect = launcherRef.current?.getBoundingClientRect();
    const currX = position?.x ?? (rect?.left ?? (window.innerWidth - DEFAULT_LAUNCHER_WIDTH - MARGIN));
    const currY = position?.y ?? (rect?.top ?? (window.innerHeight - DEFAULT_LAUNCHER_HEIGHT - MARGIN));
    const launcherW = launcherRef.current?.offsetWidth || DEFAULT_LAUNCHER_WIDTH;
    const launcherH = launcherRef.current?.offsetHeight || DEFAULT_LAUNCHER_HEIGHT;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newPos = { x: clamp(currX - STEP, MARGIN, window.innerWidth - launcherW - MARGIN), y: currY };
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newPos = { x: clamp(currX + STEP, MARGIN, window.innerWidth - launcherW - MARGIN), y: currY };
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      newPos = { x: currX, y: clamp(currY - STEP, MARGIN, window.innerHeight - launcherH - MARGIN) };
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      newPos = { x: currX, y: clamp(currY + STEP, MARGIN, window.innerHeight - launcherH - MARGIN) };
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleResetPosition();
      return;
    }

    if (newPos) {
      setPosition(newPos);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
      } catch {
        // Ignore
      }
    }
  };

  const handlePanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFullScreen || (e.pointerType === 'mouse' && e.button !== 0)) return;

    const target = e.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, textarea, select, [data-chat-no-drag="true"]')
    ) {
      return;
    }

    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    panelDragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is unavailable in a few embedded browsers
    }

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const dragStart = panelDragStartRef.current;
      if (!dragStart || dragStart.pointerId !== ev.pointerId) return;

      const deltaX = ev.clientX - dragStart.startX;
      const deltaY = ev.clientY - dragStart.startY;
      const nextPosition = clampPanelPosition(
        dragStart.x + deltaX,
        dragStart.y + deltaY,
        dragStart.width,
        dragStart.height
      );

      if (!dragStart.moved) {
        if (deltaX * deltaX + deltaY * deltaY <= 25) return;
        dragStart.moved = true;
        setIsPanelDragging(true);
        setPanelPosition(nextPosition);
        panelRef.current?.style.setProperty('user-select', 'none');
        document.body.style.setProperty('user-select', 'none');
      }

      ev.preventDefault();

      pendingPanelPositionRef.current = nextPosition;
      panelPositionRef.current = nextPosition;

      if (panelDragFrameRef.current === null) {
        panelDragFrameRef.current = window.requestAnimationFrame(() => {
          panelDragFrameRef.current = null;
          const pos = pendingPanelPositionRef.current;
          if (pos) applyPanelPosition(pos);
        });
      }
    };

    const handleWindowPointerUp = (ev: PointerEvent) => {
      const dragStart = panelDragStartRef.current;
      if (!dragStart || dragStart.pointerId !== ev.pointerId) return;

      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);

      panelRef.current?.style.removeProperty('user-select');
      document.body.style.removeProperty('user-select');
      if (dragStart.moved) {
        flushPendingPanelPosition();
      }
      panelDragStartRef.current = null;
      setIsPanelDragging(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handlePanelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = panelDragStartRef.current;
    if (!dragStart || dragStart.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragStart.startX;
    const deltaY = e.clientY - dragStart.startY;
    const nextPosition = clampPanelPosition(
      dragStart.x + deltaX,
      dragStart.y + deltaY,
      dragStart.width,
      dragStart.height
    );

    if (!dragStart.moved) {
      if (deltaX * deltaX + deltaY * deltaY <= 25) return;
      dragStart.moved = true;
      setIsPanelDragging(true);
      setPanelPosition(nextPosition);
      panelRef.current?.style.setProperty('user-select', 'none');
      document.body.style.setProperty('user-select', 'none');
    }

    e.preventDefault();

    pendingPanelPositionRef.current = nextPosition;
    panelPositionRef.current = nextPosition;

    if (panelDragFrameRef.current === null) {
      panelDragFrameRef.current = window.requestAnimationFrame(() => {
        panelDragFrameRef.current = null;
        const pos = pendingPanelPositionRef.current;
        if (pos) applyPanelPosition(pos);
      });
    }
  };

  const finishPanelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = panelDragStartRef.current;
    if (!dragStart || dragStart.pointerId !== e.pointerId) return;

    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore a pointer that was already released by the browser.
    }

    panelRef.current?.style.removeProperty('user-select');
    document.body.style.removeProperty('user-select');
    if (dragStart.moved) {
      flushPendingPanelPosition();
    }
    panelDragStartRef.current = null;
    setIsPanelDragging(false);
  };

  const cancelPanelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    finishPanelDrag(e);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setChatLoading(false);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedMessageId(id);
      setTimeout(() => {
        setCopiedMessageId((curr) => (curr === id ? null : curr));
      }, 2000);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || chatLoading) return;

    setError(null);
    setLastFailedMessage(null);

    // If retrying the last message, don't duplicate it in UI
    const lastMsg = messages[messages.length - 1];
    const isRetrying = Boolean(textToSend && lastMsg && lastMsg.role === 'user' && lastMsg.content === text);

    if (!isRetrying) {
      const userMsg: Message = {
        id: `usr_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    if (!textToSend) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    setChatLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const activeWorkflow = (() => {
        if (!pathname) return 'general';
        if (pathname.startsWith('/builder')) return 'resume_builder';
        if (pathname.startsWith('/ats-score') || pathname.startsWith('/analyzer')) return 'ats_score_checker';
        if (pathname.startsWith('/improver')) return 'resume_improver';
        if (pathname.startsWith('/projects')) return 'project_mentor';
        if (pathname.startsWith('/jobs')) return 'job_discovery';
        if (pathname.startsWith('/interview-prep')) return 'interview_prep';
        if (pathname.startsWith('/skills')) return 'skill_assessments';
        if (pathname.startsWith('/dashboard')) return 'career_command_center';
        return 'general';
      })();

      const context = {
        jobTitle: targetJob?.title || undefined,
        company: targetJob?.company || undefined,
        jobDescription: targetJob?.description ? targetJob.description.substring(0, 500) : undefined,
        resumeSnippet: resumeData?.summary || undefined,
        currentPath: pathname || undefined,
        activeWorkflow,
      };

      // Exclude welcome/greeting messages so multi-turn starts with user
      const history = messages
        .filter((m) => !m.id.startsWith('welcome'))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          context,
        }),
        signal: controller.signal,
      });

      if (res.status === 401) {
        // Session expired: immediately close chat and update session context
        setIsOpen(false);
        setIsFullScreen(false);
        await refreshUser(null);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Chat request failed with status ${res.status}`);
      }

      if (!data.reply) {
        throw new Error('Received an empty answer from the AI model.');
      }

      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      let msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        msg = 'Unable to reach the server. Please check your internet connection and try again.';
      }
      setError(msg);
      setLastFailedMessage(text);
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    const greeting = careerProfile?.targetRole
      ? `Conversation reset. As your AI Assistant for **${careerProfile.targetRole}**, what career, resume, or interview question would you like to explore next?`
      : 'Conversation reset. What would you like help with in your career, resume, or job search?';
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setError(null);
    setLastFailedMessage(null);
  };

  // Visibility Gate: completely hidden during auth loading, unauthenticated status, or on public/admin routes
  if (loading || !user || isExcludedRoute) {
    return null;
  }

  // Calculate intelligent panel placement when dragged on desktop or mobile
  const getPanelStyle = (): React.CSSProperties => {
    if (isFullScreen) return {};

    // Mobile screens: always use responsive inset styling via Tailwind classes
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return {};
    }

    if (panelPosition) {
      return {
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        right: 'auto',
        bottom: 'auto',
      };
    }

    // Default position (bottom-right)
    if (!position || !isClient) {
      return {
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      };
    }

    const launcherW = DEFAULT_LAUNCHER_WIDTH;
    const launcherH = DEFAULT_LAUNCHER_HEIGHT;
    const style: React.CSSProperties = {};

    // Horizontal placement: check if launcher is in right half or left half of viewport
    const isRightHalf = (position.x + launcherW / 2) > (window.innerWidth / 2);
    if (isRightHalf) {
      const rightDistance = window.innerWidth - (position.x + launcherW);
      style.right = `${clamp(rightDistance, MARGIN, Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN))}px`;
      style.left = 'auto';
    } else {
      style.left = `${clamp(position.x, MARGIN, Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN))}px`;
      style.right = 'auto';
    }

    // Vertical placement: check if launcher is in bottom half or top half of viewport
    const isBottomHalf = (position.y + launcherH / 2) > (window.innerHeight / 2);
    if (isBottomHalf) {
      const bottomDistance = window.innerHeight - position.y + 12;
      style.bottom = `${clamp(bottomDistance, MARGIN, Math.max(MARGIN, window.innerHeight - PANEL_HEIGHT - MARGIN))}px`;
      style.top = 'auto';
    } else {
      const topDistance = position.y + launcherH + 12;
      style.top = `${clamp(topDistance, MARGIN, Math.max(MARGIN, window.innerHeight - PANEL_HEIGHT - MARGIN))}px`;
      style.bottom = 'auto';
    }

    return style;
  };

  const launcherStyle: React.CSSProperties = position && isClient
    ? {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      touchAction: 'none',
    }
    : {
      position: 'fixed',
      bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      touchAction: 'none',
    };

  const assistantMode = isFullScreen ? 'expanded' : 'docked';
  const showWelcomeTools = messages.length <= 2 && !chatLoading;
  const assistantInstitution = (careerProfile?.studentProfile?.institution || '').trim();
  const assistantTargetRole = (careerProfile?.targetRole || '').trim();
  const assistantSubtitle = assistantInstitution && assistantTargetRole
    ? assistantInstitution + ' · ' + assistantTargetRole
    : assistantTargetRole
      ? 'Target: ' + assistantTargetRole
      : assistantInstitution || (isFullScreen ? 'Career guidance · Expanded' : 'Career guidance and mentorship');

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Floating Draggable Launcher Trigger */}
        {!isOpen && !presentation.blocked && (
          <motion.div
            key="chat-launcher"
            data-chat-drag="true"
            data-assistant-mode="collapsed"
            data-assistant-state={presentation.state}
            data-dragging={isDragging}
            data-placement-ready="false"
            ref={launcherRef}
            style={launcherStyle}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPetHovered(true); }}
            onPointerLeave={() => setPetHovered(false)}
            className={`${chatStyles.launcher} z-40 select-none no-print ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
          >
            <button
              type="button"
              onClick={(e) => {
                if (suppressLauncherClickRef.current || isDragging) {
                  e.preventDefault();
                  return;
                }
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDownLauncher}
              className={chatStyles.launcherButton}
              aria-label="Open AI Assistant (Draggable, use arrow keys to reposition)"
              title={position ? 'Career Copilot (Drag to move, Home key to reset)' : 'Career Copilot (Drag to reposition)'}
            >
              <AssistantCompanion state={presentation.state} size={80} hovered={petHovered} dragging={isDragging} dragRef={companionDragRef} paused={presentation.blocked || isPanelDragging || showClearConfirm} />
            </button>
          </motion.div>
        )}

        {/* Chat Window: Windowed vs Full Screen */}
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Smart Resume AI Assistant"
            aria-modal={isFullScreen}
            data-assistant-mode={assistantMode}
            data-assistant-state={presentation.state}
            ref={panelRef}
            style={getPanelStyle()}
            initial={
              prefersReduced
                ? { opacity: 0 }
                : isFullScreen
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.97 }
            }
            animate={
              prefersReduced
                ? { opacity: 1 }
                : isFullScreen
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1 }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : isFullScreen
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.97 }
            }
            transition={prefersReduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={
              isFullScreen
                ? 'fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-screen flex-col overflow-hidden bg-bg no-print'
                : 'fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-panel border border-border-hairline bg-bg shadow-popover no-print sm:inset-x-auto sm:bottom-6 sm:h-[700px] sm:max-h-[calc(100dvh-3rem)] sm:w-[420px] sm:rounded-panel'
            }
          >
            {/* Header */}
            <div
              data-chat-drag="true"
              className={[
                'relative shrink-0 select-none border-b border-border-hairline bg-bg px-4 py-3 sm:px-5',
                isFullScreen
                  ? ''
                  : isPanelDragging
                    ? 'cursor-grabbing select-none touch-none'
                    : 'cursor-grab touch-none',
              ].join(' ')}
              onPointerDown={handlePanelPointerDown}
              onPointerMove={handlePanelPointerMove}
              onPointerUp={finishPanelDrag}
              onPointerCancel={cancelPanelDrag}
            >
              <div className={['mx-auto flex w-full items-center justify-between gap-3', isFullScreen ? 'max-w-3xl' : ''].join(' ')}>
                <div className="flex min-w-0 items-center gap-3">
                  <div data-nimbus-header className="shrink-0">
                    <AssistantCompanion state={presentation.state} size={32} paused />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-h3 font-semibold tracking-heading text-text">
                        Career Copilot
                      </h3>
                      {isFullScreen && careerProfile?.metrics?.readinessScore !== undefined && (
                        <span className="hidden rounded-full bg-accent-tint px-2 py-0.5 text-caption font-medium text-accent sm:inline-flex">
                          {careerProfile.metrics.readinessScore}% Ready
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block max-w-[13rem] truncate text-caption text-text-secondary sm:max-w-xs">
                      <span>AI Assistant</span> · {assistantSubtitle}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1" aria-label="Assistant toolbar">
                  {(position || panelPosition) && (
                    <button
                      type="button"
                      onClick={handleResetPosition}
                      title="Reset position to default bottom-right (Home)"
                      aria-label="Reset position to default bottom-right"
                      className="hidden h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text sm:inline-flex"
                    >
                      <Compass className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    title="Reset conversation"
                    aria-label="Reset conversation"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text sm:h-9 sm:w-9"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    title={isFullScreen ? 'Return to docked mode' : 'Expand assistant'}
                    aria-label={isFullScreen ? 'Dock assistant' : 'Expand assistant'}
                    aria-expanded={isFullScreen}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text sm:h-9 sm:w-9"
                  >
                    {isFullScreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullScreen(false);
                      setIsOpen(false);
                    }}
                    title="Collapse assistant"
                    aria-label="Collapse assistant"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text sm:h-9 sm:w-9"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Clear Conversation Confirmation Modal */}
              {showClearConfirm && (
                <div
                  data-chat-no-drag="true"
                  role="alertdialog"
                  aria-modal="true"
                  aria-label="Clear conversation confirmation"
                  className="absolute inset-x-3 top-[calc(100%+0.5rem)] z-30 rounded-card border border-border bg-bg p-4 shadow-popover"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-warning-tint text-warning">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-body">
                      <p className="font-semibold text-text">Clear conversation?</p>
                      <p className="mt-1 text-small text-text-secondary">
                        All messages in this session will be removed. This cannot be undone.
                      </p>
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="inline-flex min-h-10 items-center justify-center rounded-control bg-bg-subtle px-3 text-small font-medium text-text transition-colors hover:bg-border-hairline"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleReset();
                            setShowClearConfirm(false);
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-control bg-danger px-3 text-small font-medium text-on-accent transition-colors"
                        >
                          Clear conversation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {!chatLoading && presentation.state === 'answering' ? 'Answer ready' : presentation.state === 'success' ? 'Answer copied' : ''}
            </span>
            {/* Messages Body */}
            <div
              ref={messageScrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-5"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              <div className={['mx-auto w-full space-y-6', isFullScreen ? 'max-w-3xl' : ''].join(' ')}>
                {welcomeOnly && (
                  <div data-nimbus-welcome className="flex justify-center">
                    <AssistantCompanion state={presentation.state} size={96} paused={mascotPaused || chatLoading} />
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      layout
                      key={m.id}
                      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={prefersReduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className={['flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
                    >
                      {m.role === 'assistant' && (
                        <div data-nimbus-message className="mt-0.5 w-8 shrink-0">
                          <AssistantCompanion state={m.id === latestAssistantId && presentation.state === 'answering' ? 'answering' : 'idle'} size={24} paused />
                        </div>
                      )}

                      <div
                        className={[
                          'min-w-0 leading-relaxed',
                          m.role === 'user'
                            ? 'max-w-[86%] rounded-card bg-accent px-4 py-3 text-on-accent'
                            : 'flex-1 pt-0.5 text-text',
                        ].join(' ')}
                      >
                        {m.role === 'assistant' ? (
                          <FormattedAssistantMessage content={m.content} />
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )}

                        <div
                          className={[
                            'mt-3 flex items-center justify-between gap-3 text-caption',
                            m.role === 'user' ? 'text-on-accent/75' : 'text-text-secondary',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2">
                            <span>{m.timestamp}</span>
                            {m.provider && <span className="font-mono">{m.provider}</span>}
                          </div>
                          {m.role === 'assistant' && (
                            <div className="flex items-center gap-2">
                              <FeedbackButtons category="Career Copilot" contextId={m.id} />
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(m.id, m.content)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-control px-2 text-caption font-medium transition-colors hover:bg-bg-subtle hover:text-text"
                                title={copiedMessageId === m.id ? 'Copied to clipboard' : 'Copy answer'}
                                aria-label={copiedMessageId === m.id ? 'Answer copied' : 'Copy assistant answer'}
                              >
                                {copiedMessageId === m.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-success" />
                                    <span className="font-medium text-success">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {chatLoading && (
                    <TypingIndicator reducedMotion={prefersReduced} paused={mascotPaused} />
                  )}
                </AnimatePresence>

                {showWelcomeTools && (
                  <motion.section
                    initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 0.2, delay: 0.04 }}
                    className="ml-11 space-y-5 rounded-card border border-border-hairline bg-bg-subtle-2 p-4"
                    aria-label="Career Copilot suggestions"
                  >
                    <div>
                      <p className="text-body font-semibold text-text">Choose a focus</p>
                      <p className="mt-1 text-small text-text-secondary">
                        Start with a question or use a quick command for a focused next step.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="Career contexts" data-chat-no-drag="true">
                      {CONTEXT_CHIPS.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          data-chat-no-drag="true"
                          onClick={() => setSelectedPromptCategory(chip.key)}
                          aria-pressed={selectedPromptCategory === chip.key}
                          className={[
                            'inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-caption font-medium transition-colors',
                            selectedPromptCategory === chip.key
                              ? 'border-accent bg-accent-tint text-accent'
                              : 'border-border-hairline bg-bg text-text-secondary hover:border-border hover:text-text',
                          ].join(' ')}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2" data-chat-no-drag="true">
                      <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary">Suggested questions</p>
                      {getCategoryPrompts().map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          data-chat-no-drag="true"
                          onClick={() => handleSend(prompt.text)}
                          className="flex min-h-11 w-full items-center rounded-control border border-border-hairline bg-bg px-3 py-2.5 text-left text-small text-text transition-colors hover:border-border hover:bg-bg-subtle"
                        >
                          {prompt.text}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-border-hairline pt-4" data-chat-no-drag="true">
                      <div className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                        <Command className="h-4 w-4" aria-hidden="true" />
                        <span>Quick commands</span>
                      </div>
                      <div className={['grid gap-2', isFullScreen ? 'sm:grid-cols-3' : ''].join(' ')}>
                        {getCommandSuggestions().map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            data-chat-no-drag="true"
                            onClick={() => handleSend(suggestion.prompt)}
                            className="flex min-h-11 items-center gap-3 rounded-control border border-border-hairline bg-bg px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-bg-subtle"
                          >
                            <code className="shrink-0 font-mono text-caption font-medium text-accent">{suggestion.command}</code>
                            <span className="text-small text-text">{suggestion.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                )}

                {error && (
                  <div className="ml-11 flex flex-col gap-3 rounded-card border border-danger bg-danger-tint p-3 text-small text-danger" role="alert">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                    {lastFailedMessage && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSend(lastFailedMessage)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-danger px-3 text-small font-medium text-on-accent transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <div className="shrink-0 border-t border-border-hairline bg-bg px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              <div className={['mx-auto w-full', isFullScreen ? 'max-w-3xl' : ''].join(' ')}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2 rounded-card border border-border-input bg-bg p-2 focus-within:border-2 focus-within:border-accent"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Ask about your resume, interviews, jobs, or career..."
                    maxLength={2000}
                    disabled={chatLoading}
                    aria-describedby="chat-input-help"
                    style={{ outline: 'none' }}
                    className="min-h-11 max-h-[120px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-body-lg leading-relaxed text-text outline-none placeholder:text-text-tertiary disabled:opacity-50 sm:text-body"
                  />
                  <span id="chat-input-help" className="sr-only">Press Enter to send. Press Shift and Enter for a new line.</span>
                  {chatLoading ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-danger text-on-accent transition-colors"
                      title="Stop generating response"
                      aria-label="Stop generating response"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Send message"
                      title="Send message (Enter)"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {presentation.bubble && (
        <aside data-nimbus-greeting className={`${chatStyles.greeting} no-print`} style={presentation.bubblePosition} aria-label="AI Assistant greeting">
          <p>Ask me about your resume, jobs or interviews.</p>
          <button type="button" onClick={presentation.dismissBubble} aria-label="Dismiss assistant greeting"><X className="h-4 w-4" aria-hidden="true" /></button>
        </aside>
      )}
    </>
  );
}
