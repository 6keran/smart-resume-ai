'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Code2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Compass,
  GripHorizontal,
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
  'What is Python?',
  'Explain React hooks with an example',
  'What is the difference between SQL and MongoDB?',
  'How can I improve my resume for a software developer role?',
];

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore if clipboard API is restricted
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
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 font-mono text-[11px] text-blue-600 dark:text-blue-300"
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
const MARGIN = 16;
const DEFAULT_LAUNCHER_WIDTH = 135;
const DEFAULT_LAUNCHER_HEIGHT = 44;
const PANEL_WIDTH = 460;
const PANEL_HEIGHT = 620;

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
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
        "Hello! I am your AI assistant in Smart Resume AI. You can ask me anything from programming, React, Python, or SQL, to writing, interview prep, and resume optimization. What would you like to explore?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Draggable positioning state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const prefersReduced = useReducedMotion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  } | null>(null);

  const { targetJob, resumeData } = useResume();

  // Strict route visibility rules: hide completely on auth, legal, and admin pages
  const isExcludedRoute = Boolean(
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/admin') ||
    pathname === '/privacy' ||
    pathname === '/terms'
  );

  // Close and dismiss chat immediately on logout or session expiry
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      setIsFullScreen(false);
    }
  }, [user]);

  // Safely restore persisted launcher position on client mount
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
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Recalculate and clamp position on viewport resize or mobile orientation changes
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
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, chatLoading, isFullScreen]);

  // Handle Escape key to exit full screen or close chat
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullScreen]);

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
    try {
      localStorage.removeItem(STORAGE_KEY);
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

    if (!textToSend) setInput('');
    setChatLoading(true);

    try {
      const context = {
        jobTitle: targetJob?.title || undefined,
        company: targetJob?.company || undefined,
        jobDescription: targetJob?.description ? targetJob.description.substring(0, 500) : undefined,
        resumeSnippet: resumeData?.summary || undefined,
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
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLastFailedMessage(text);
    } finally {
      setChatLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content:
          "Conversation reset. What question or topic would you like to explore next?",
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

  // Calculate intelligent panel placement when dragged on desktop
  const getPanelStyle = (): React.CSSProperties => {
    if (isFullScreen) return {};

    // Mobile screens: use responsive inset styling via Tailwind classes
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return {};
    }

    // Default position (bottom-right)
    if (!position || !isClient) {
      return {
        bottom: '24px',
        right: '24px',
      };
    }

    const launcherW = DEFAULT_LAUNCHER_WIDTH;
    const launcherH = DEFAULT_LAUNCHER_HEIGHT;
    const style: React.CSSProperties = {};

    // Horizontal placement: check if launcher is in right half or left half of viewport
    const isRightHalf = (position.x + launcherW / 2) > (window.innerWidth / 2);
    if (isRightHalf) {
      const rightDistance = window.innerWidth - (position.x + launcherW);
      style.right = `${clamp(rightDistance, MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN)}px`;
      style.left = 'auto';
    } else {
      style.left = `${clamp(position.x, MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN)}px`;
      style.right = 'auto';
    }

    // Vertical placement: check if launcher is in bottom half or top half of viewport
    const isBottomHalf = (position.y + launcherH / 2) > (window.innerHeight / 2);
    if (isBottomHalf) {
      const bottomDistance = window.innerHeight - position.y + 12;
      style.bottom = `${clamp(bottomDistance, MARGIN, window.innerHeight - PANEL_HEIGHT - MARGIN)}px`;
      style.top = 'auto';
    } else {
      const topDistance = position.y + launcherH + 12;
      style.top = `${clamp(topDistance, MARGIN, window.innerHeight - PANEL_HEIGHT - MARGIN)}px`;
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
        bottom: '1.5rem',
        right: '1.5rem',
        touchAction: 'none',
      };

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Floating Draggable Launcher Trigger */}
        {!isOpen && (
          <motion.div
            key="chat-launcher"
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
            className={`z-50 select-none no-print transition-shadow ${
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
              className="flex items-center gap-2 sm:gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xl hover:shadow-2xl transition-transform border border-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 group cursor-pointer"
              aria-label="Open AI Assistant (Draggable, use arrow keys to reposition)"
              title={position ? "AI Assistant (Drag to move, Home key to reset)" : "AI Assistant (Drag to reposition)"}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:rotate-12 transition-transform">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold tracking-wide hidden xs:inline sm:inline">AI Assistant</span>
              <GripHorizontal className="w-3 h-3 text-slate-500 group-hover:text-slate-300 ml-0.5 opacity-60" aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {/* Chat Window: Windowed vs Full Screen */}
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Smart Resume AI Assistant"
            aria-modal={isFullScreen}
            style={getPanelStyle()}
            initial={
              prefersReduced
                ? { opacity: 0 }
                : isFullScreen
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 10 }
            }
            animate={
              prefersReduced
                ? { opacity: 1 }
                : isFullScreen
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : isFullScreen
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 10 }
            }
            transition={prefersReduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={
              isFullScreen
                ? 'fixed inset-0 z-50 w-screen h-[100dvh] max-h-[100dvh] bg-[var(--bg-primary)]/95 backdrop-blur-2xl flex flex-col overflow-hidden no-print'
                : 'fixed inset-x-2 bottom-2 sm:inset-x-auto z-50 w-auto sm:w-[460px] max-w-[calc(100vw-16px)] sm:max-w-none h-[560px] sm:h-[620px] max-h-[calc(100dvh-16px)] sm:max-h-[85vh] rounded-2xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-[var(--shadow-glass-hover)] backdrop-blur-2xl flex flex-col overflow-hidden no-print'
            }
          >
          {/* Header */}
          <div className="shrink-0 px-4 py-3 sm:px-6 bg-[var(--glass-bg)] border-b border-[var(--glass-border)] backdrop-blur-md">
            <div className={`flex items-center justify-between ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none">
                    Smart Resume AI Assistant
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 inline-block">
                    {isFullScreen ? 'Full Screen View' : 'AI Assistant'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {position && (
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    title="Reset launcher position to default bottom-right (Home)"
                    aria-label="Reset launcher position to default bottom-right"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  title={isFullScreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
                  aria-label={isFullScreen ? 'Exit full screen mode' : 'Expand chat to full screen'}
                  aria-expanded={isFullScreen}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
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
                    <div className="w-6 h-6 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 rounded-bl-xs'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <FormattedAssistantMessage content={m.content} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] sm:text-[10px] opacity-70">
                      <span>{m.timestamp}</span>
                      {m.provider && <span className="font-mono text-[9px]">{m.provider}</span>}
                    </div>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </motion.div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Generating response...</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex flex-col gap-2">
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

          {/* Starter Prompt Chips */}
          {messages.length <= 2 && (
            <div className="shrink-0 px-4 py-2 sm:px-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
              <div className={isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Suggested Questions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                    >
                      {prompt}
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
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about programming, general knowledge, or resumes..."
                  maxLength={2000}
                  disabled={chatLoading}
                  className="flex-1 h-10 px-3 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatLoading}
                  className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  aria-label="Send message"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
