'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/components/user/UserContext';
import { isAssistantExcludedRoute } from './assistantVisibility';

const Assistant = dynamic(() => import('./CareerChatbot').then((module) => module.CareerChatbot), { ssr: false });

export function AssistantEntry() {
  const { user, loading } = useUserProfile();
  const pathname = usePathname();
  const userId = user?.id;
  const [activated, setActivated] = useState(false);
  const readyUser = useRef<string | undefined>(undefined);
  const pendingOpen = useRef<{ pathname: string; userId?: string; prompt?: string } | null>(null);
  const allowedPage = !isAssistantExcludedRoute(pathname);
  const eligible = !loading && Boolean(userId) && allowedPage;

  useEffect(() => { if (eligible) setActivated(true); }, [eligible]);
  useEffect(() => {
    if (!loading && !userId) {
      readyUser.current = undefined;
      pendingOpen.current = null;
      setActivated(false);
      return;
    }
    if (!allowedPage) {
      pendingOpen.current = null;
      return;
    }
    const queueOpen = (event: Event) => {
      if (userId && readyUser.current === userId) return;
      pendingOpen.current = { pathname, userId, prompt: (event as CustomEvent<{ prompt?: string }>).detail?.prompt };
    };
    window.addEventListener('sra:open-chat', queueOpen);
    return () => window.removeEventListener('sra:open-chat', queueOpen);
  }, [allowedPage, loading, pathname, userId]);
  const onReady = useCallback(() => {
    readyUser.current = userId;
    const request = pendingOpen.current;
    pendingOpen.current = null;
    if (request && request.pathname === pathname && allowedPage && (!request.userId || request.userId === userId)) {
      window.dispatchEvent(new CustomEvent('sra:open-chat', { detail: { prompt: request.prompt } }));
    }
  }, [allowedPage, pathname, userId]);
  // Preserve the conversation across pages only within the same signed-in account.
  return userId && (activated || eligible) ? <Assistant key={userId} onReady={onReady} /> : null;
}
