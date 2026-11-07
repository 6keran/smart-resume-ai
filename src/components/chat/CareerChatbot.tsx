'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Send,
  RotateCcw,
  Bot,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Compass,
  GripHorizontal,
  Square,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { useUserProfile } from '@/components/user/UserContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  'How can I tailor my resume for a role?',
  'Help me prepare for an upcoming interview',
  'Which skills should I build for my target role?',
  'How should I follow up after an application?',
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
  } catch {}

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
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {}
  }

  return true;
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
    <div className="my-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs overflow-hidden border border-slate-700/60 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50 text-[10px] sm:text-[11px] text-slate-400 font-sans">
        <span className="uppercase tracking-wider font-semibold">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-700/50"
          title={copied ? 'Copied to clipboard' : 'Copy code'}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code snippet'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
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
              className="inline-flex items-center font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 hover:decoration-[var(--accent)] hover:opacity-85 transition-all mx-0.5"
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
            className="inline-flex items-center font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/40 hover:decoration-[var(--accent)] hover:opacity-85 transition-all mx-0.5"
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
          className="px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] font-mono text-[11px] text-[var(--accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
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
        <h4 key={`h3_${i}`} className="font-bold text-sm text-slate-900 dark:text-white mt-2 mb-1">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2_${i}`} className="font-bold text-base text-slate-900 dark:text-white mt-2.5 mb-1">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1_${i}`} className="font-bold text-lg text-slate-900 dark:text-white mt-3 mb-1">
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq_${i}`} className="pl-3 py-1 my-1.5 border-l-2 border-[var(--accent)] bg-[var(--accent-subtle)]/40 rounded-r-lg text-xs italic text-[var(--text-secondary)]">
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={`li_${i}`} className="ml-4 list-disc text-xs leading-relaxed my-0.5">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)/);
      elements.push(
        <div key={`num_${i}`} className="ml-2 text-xs leading-relaxed my-0.5 flex gap-1.5">
          <span className="font-bold shrink-0">{match ? match[1] : ''}</span>
          <span>{renderInlineFormatting(match ? match[2] : line)}</span>
        </div>
      );
    } else if (line.trim().length === 0) {
      elements.push(<div key={`sp_${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p_${i}`} className="text-xs leading-relaxed my-1">
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

  return <div className="space-y-0.5">{elements}</div>;
}

const STORAGE_KEY = 'sra_ai_launcher_pos';
const PANEL_STORAGE_KEY = 'sra_ai_panel_pos';
const MARGIN = 16;
const DEFAULT_LAUNCHER_WIDTH = 135;
const DEFAULT_LAUNCHER_HEIGHT = 44;
const PANEL_WIDTH = 460;
const PANEL_HEIGHT = 620;
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
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<'all' | 'resume' | 'projects' | 'interview' | 'skills' | 'jobs'>('all');

  // Draggable positioning state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const prefersReduced = useReducedMotion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef;
  const launcherRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const panelPositionRef = useRef<PanelPosition | null>(null);
  const pendingPanelPositionRef = useRef<PanelPosition | null>(null);
  const panelDragFrameRef = useRef<number | null>(null);
  const panelDragStartRef = useRef<PanelDragStart | null>(null);
  const pointerStartRef = useRef<{
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
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (careerProfile && messages.length === 1 && messages[0].id === 'welcome') {
      const greeting = `Hello ${careerProfile.name || 'there'}! I am your AI Assistant. I'm tracking your target role as **${careerProfile.targetRole}**${
        careerProfile.studentProfile ? ` at **${careerProfile.studentProfile.institution}**` : ''
      }${careerProfile.metrics?.readinessScore ? ` (${careerProfile.metrics.readinessScore}% career ready)` : ''}. How can I assist your career launch today?`;
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
    const target = careerProfile?.targetRole || targetJob?.title || 'Graduate Software Engineer';
    const ats = careerProfile?.latestAtsAnalysis;
    const missingSkill = careerProfile?.skillGaps?.missingCriticalSkills?.[0] || 'Docker';
    const projects = careerProfile?.studentProfile?.projects;
    const topProject = projects && projects.length > 0 ? projects[0].title : null;
    const apps = careerProfile?.recentApplications;
    const topApp = apps && apps.length > 0 ? apps[0].company : null;

    const allPrompts: Array<{ id: string; category: 'resume' | 'projects' | 'interview' | 'skills' | 'jobs'; text: string }> = [
      // Resume
      {
        id: 'res-1',
        category: 'resume',
        text: ats?.atsScore
          ? `How can I improve my ${ats.atsScore}% ATS score for ${target}?`
          : `How can I optimize my fresher resume for ${target}?`,
      },
      {
        id: 'res-2',
        category: 'resume',
        text: 'Rewrite a bullet point using the Google XYZ formula',
      },
      {
        id: 'res-3',
        category: 'resume',
        text: 'What formatting mistakes get fresher resumes rejected by ATS?',
      },

      // Projects
      {
        id: 'proj-1',
        category: 'projects',
        text: topProject
          ? `How should I describe my '${topProject}' project on my resume?`
          : `What portfolio project should I build with ${missingSkill} for ${target}?`,
      },
      {
        id: 'proj-2',
        category: 'projects',
        text: `Suggest a full-stack capstone project architecture for ${target}`,
      },
      {
        id: 'proj-3',
        category: 'projects',
        text: 'How do I document GitHub repositories to impress technical recruiters?',
      },
      {
        id: 'proj-4',
        category: 'projects',
        text: 'Guide me on using the AI Project Mentor to build portfolio projects',
      },

      // Interview
      {
        id: 'int-1',
        category: 'interview',
        text: `Give me 3 practice interview questions for an entry-level ${target}`,
      },
      {
        id: 'int-2',
        category: 'interview',
        text: 'How do I structure behavioral answers using the STAR method?',
      },
      {
        id: 'int-3',
        category: 'interview',
        text: 'Ask me a technical question and critique my answer',
      },

      // Skills
      {
        id: 'skl-1',
        category: 'skills',
        text: `Which critical skills should I prioritize learning next for ${target}?`,
      },
      {
        id: 'skl-2',
        category: 'skills',
        text: 'How do I verify my technical skills on Smart Resume AI?',
      },
      {
        id: 'skl-3',
        category: 'skills',
        text: 'Break down a 10-week learning roadmap for my target role',
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
        text: 'How do I know if I qualify for a junior role requiring 1-2 years experience?',
      },
      {
        id: 'job-3',
        category: 'jobs',
        text: `What search queries find verified fresher ${target} openings?`,
      },
      {
        id: 'job-4',
        category: 'jobs',
        text: 'How does the AI Job Application Assistant tailor my resume and cover letter?',
      },
    ];

    if (selectedPromptCategory === 'all') {
      const selected = [
        allPrompts.find((p) => p.category === 'resume'),
        allPrompts.find((p) => p.category === 'projects'),
        allPrompts.find((p) => p.category === 'interview'),
        allPrompts.find((p) => p.category === 'skills'),
        allPrompts.find((p) => p.category === 'jobs'),
      ].filter(Boolean) as typeof allPrompts;
      return selected;
    }

    return allPrompts.filter((p) => p.category === selectedPromptCategory);
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
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
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
        const clampedX = clamp(prev.x, MARGIN, Math.max(MARGIN, window.innerWidth - w - MARGIN));
        const clampedY = clamp(prev.y, MARGIN, Math.max(MARGIN, window.innerHeight - h - MARGIN));
        return { x: clampedX, y: clampedY };
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
      if (panelDragFrameRef.current !== null) {
        window.cancelAnimationFrame(panelDragFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, chatLoading, isFullScreen]);

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

    const rect = launcherRef.current?.getBoundingClientRect();
    const initialX = rect ? rect.left : (window.innerWidth - DEFAULT_LAUNCHER_WIDTH - MARGIN);
    const initialY = rect ? rect.top : (window.innerHeight - DEFAULT_LAUNCHER_HEIGHT - MARGIN);

    pointerStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      moved: false,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;

    const dx = e.clientX - pointerStartRef.current.startX;
    const dy = e.clientY - pointerStartRef.current.startY;

    // Distinguish between intentional drag and slight tap/click jitter
    if (!pointerStartRef.current.moved) {
      if (dx * dx + dy * dy > 25) {
        pointerStartRef.current.moved = true;
        setIsDragging(true);
      } else {
        return;
      }
    }

    const launcherW = launcherRef.current?.offsetWidth || DEFAULT_LAUNCHER_WIDTH;
    const launcherH = launcherRef.current?.offsetHeight || DEFAULT_LAUNCHER_HEIGHT;

    const rawX = pointerStartRef.current.initialX + dx;
    const rawY = pointerStartRef.current.initialY + dy;

    const clampedX = clamp(rawX, MARGIN, Math.max(MARGIN, window.innerWidth - launcherW - MARGIN));
    const clampedY = clamp(rawY, MARGIN, Math.max(MARGIN, window.innerHeight - launcherH - MARGIN));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const wasMoved = pointerStartRef.current.moved;
    pointerStartRef.current = null;

    if (wasMoved) {
      if (position) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
        } catch {
          // Ignore
        }
      }
      setTimeout(() => setIsDragging(false), 80);
    } else {
      setIsDragging(false);
      setIsOpen(true);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    pointerStartRef.current = null;
    setIsDragging(false);
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
        if (pathname.startsWith('/apply-assistant')) return 'application_assistant';
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

    if (panelPosition) {
      return {
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        right: 'auto',
        bottom: 'auto',
      };
    }

    // Mobile screens: use responsive inset styling via Tailwind classes
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return {};
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

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Floating Draggable Launcher Trigger */}
        {!isOpen && (
          <motion.div
            key="chat-launcher"
            data-chat-drag="true"
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
            className={`z-40 select-none no-print transition-shadow ${
              isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault();
                  return;
                }
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDownLauncher}
              className="flex items-center gap-2 sm:gap-2.5 px-4 py-2.5 rounded-full btn-primary shadow-xl group cursor-pointer select-none"
              aria-label="Open AI Assistant (Draggable, use arrow keys to reposition)"
              title={position ? "AI Assistant (Drag to move, Home key to reset)" : "AI Assistant (Drag to reposition)"}
            >
              <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold tracking-wide hidden xs:inline sm:inline">AI Assistant</span>
              <GripHorizontal className="w-3.5 h-3.5 text-white/70 ml-0.5 opacity-80" aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {/* Chat Window: Windowed vs Full Screen */}
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Smart Resume AI Assistant"
            aria-modal={isFullScreen}
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
                ? 'fixed inset-0 z-50 w-screen h-[100dvh] max-h-[100dvh] bg-[var(--bg-primary)]/98 backdrop-blur-md flex flex-col overflow-hidden no-print'
                : 'fixed inset-x-2 bottom-2 sm:inset-x-auto z-50 w-auto sm:w-[460px] max-w-[calc(100vw-16px)] sm:max-w-none h-[560px] sm:h-[620px] max-h-[calc(100dvh-16px)] sm:max-h-[85vh] rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl flex flex-col overflow-hidden no-print'
            }
          >
          {/* Header */}
          <div
            data-chat-drag="true"
            className={`shrink-0 px-4 py-3 sm:px-6 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] relative select-none ${
              isFullScreen ? '' : isPanelDragging ? 'cursor-grabbing select-none touch-none' : 'cursor-grab touch-none'
            }`}
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={finishPanelDrag}
            onPointerCancel={cancelPanelDrag}
          >
            <div className={`flex items-center justify-between ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-none">
                      AI Assistant
                    </h3>
                    {careerProfile?.metrics?.readinessScore !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                        {careerProfile.metrics.readinessScore}% Ready
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 inline-block truncate max-w-[210px] sm:max-w-xs">
                    {careerProfile?.studentProfile
                      ? `${careerProfile.studentProfile.institution} · ${careerProfile.targetRole}`
                      : careerProfile?.targetRole
                      ? `Target: ${careerProfile.targetRole}`
                      : isFullScreen
                      ? 'Career guidance · Full screen'
                      : 'Career guidance & mentorship'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(position || panelPosition) && (
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    title="Reset position to default bottom-right (Home)"
                    aria-label="Reset position to default bottom-right"
                    className="btn-icon btn-icon-sm rounded-full cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="btn-icon btn-icon-sm rounded-full"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  title={isFullScreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
                  aria-label={isFullScreen ? 'Exit full screen mode' : 'Expand chat to full screen'}
                  aria-expanded={isFullScreen}
                  className="btn-icon btn-icon-sm rounded-full"
                >
                  {isFullScreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullScreen(false);
                    setIsOpen(false);
                  }}
                  title="Close chat"
                  aria-label="Close chat"
                  className="btn-icon btn-icon-sm rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clear Conversation Confirmation Modal */}
            {showClearConfirm && (
              <div data-chat-no-drag="true" role="alertdialog" aria-modal="true" aria-label="Clear conversation confirmation" className="absolute inset-x-4 top-14 z-30 p-4 rounded-2xl bg-[var(--bg-card)]/95 border border-[var(--border-color)] shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-[var(--text-primary)]">Clear conversation?</p>
                    <p className="text-[var(--text-secondary)] mt-0.5">
                      All messages in this session will be removed. This cannot be undone.
                    </p>
                    <div className="mt-3 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="btn-secondary btn-sm rounded-full text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleReset();
                          setShowClearConfirm(false);
                        }}
                        className="btn-destructive btn-sm rounded-full text-xs"
                      >
                        Clear conversation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:px-6 space-y-3.5 text-xs sm:text-sm">
            <div className={`space-y-3.5 ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReduced ? { duration: 0 } : { duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--accent)]/20">
                      <Bot className="w-3 h-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[var(--accent)] text-white rounded-br-xs'
                        : 'bg-[var(--glass-bg)] text-[var(--text-primary)] border border-[var(--glass-border)] rounded-bl-xs'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <FormattedAssistantMessage content={m.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] sm:text-[10px] opacity-70">
                      <div className="flex items-center gap-2">
                        <span>{m.timestamp}</span>
                        {m.provider && <span className="font-mono text-[9px]">{m.provider}</span>}
                      </div>
                      {m.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.id, m.content)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                          title={copiedMessageId === m.id ? 'Copied to clipboard' : 'Copy answer'}
                          aria-label={copiedMessageId === m.id ? 'Answer copied' : 'Copy assistant answer'}
                        >
                          {copiedMessageId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </motion.div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs py-2" role="status" aria-live="polite">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                  <span>Generating response...</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex flex-col gap-2" role="alert">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                  {lastFailedMessage && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleSend(lastFailedMessage)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Starter Prompt Chips with Categories */}
          {messages.length <= 2 && (
            <div className="shrink-0 px-4 py-2.5 sm:px-6 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <div className={isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block shrink-0">
                    Suggested Topics
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5" data-chat-no-drag="true">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'resume', label: 'Resume' },
                      { key: 'projects', label: 'Projects' },
                      { key: 'interview', label: 'Interview' },
                      { key: 'skills', label: 'Skills' },
                      { key: 'jobs', label: 'Jobs' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        data-chat-no-drag="true"
                        onClick={() => setSelectedPromptCategory(cat.key as any)}
                        className={`text-[10px] px-2 py-0.5 rounded-full transition-all cursor-pointer font-medium ${
                          selectedPromptCategory === cat.key
                            ? 'bg-[var(--accent)] text-white shadow-xs'
                            : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar" data-chat-no-drag="true">
                  {getCategoryPrompts().map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      data-chat-no-drag="true"
                      onClick={() => handleSend(prompt.text)}
                      className="text-[11px] px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-all text-left cursor-pointer shadow-xs leading-snug"
                    >
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="shrink-0 p-3 sm:px-6 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className={isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-end gap-2"
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
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none py-2.5 px-4 text-xs sm:text-sm rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(79,131,241,0.22)] disabled:opacity-50 transition-all leading-relaxed shadow-xs"
                />
                <span id="chat-input-help" className="sr-only">Press Enter to send. Press Shift and Enter for a new line.</span>
                {chatLoading ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="btn-destructive h-11 px-4 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                    title="Stop generating response"
                    aria-label="Stop generating response"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-semibold hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="btn-primary h-11 w-11 p-0 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm disabled:opacity-40"
                    aria-label="Send message"
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
