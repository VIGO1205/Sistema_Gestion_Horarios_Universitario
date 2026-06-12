'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';

export type HorusDisplayMode = 'sidebar' | 'floating';

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hola, soy HORUS. Puedo ayudarte con disponibilidades, aulas y horarios. ¿Qué deseas consultar hoy?',
};

interface HorusChatContextValue {
  displayMode: HorusDisplayMode;
  isPanelOpen: boolean;
  isMinimized: boolean;
  setPanelOpen: (open: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  detachToFloating: () => void;
  dockToSidebar: () => void;
  canDockToSidebar: boolean;
  showSidebarSection: boolean;
  showFloatingWidget: boolean;
  sidebarOpen: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  startNewConversation: () => void;
}

const HorusChatContext = createContext<HorusChatContextValue | null>(null);

const STORAGE_KEY_DETACHED = 'horus-chat-detached';
const getStorageKeyMessages = (userId: string | undefined) => {
  if (!userId) return 'horus-chat-messages';
  return `horus-chat-messages-${userId}`;
};

interface HorusChatProviderProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  isMobile: boolean;
  enabled: boolean;
}

export function HorusChatProvider({
  children,
  sidebarOpen,
  isMobile,
  enabled,
}: HorusChatProviderProps) {
  const { usuario } = useAuth();
  const [isDetached, setIsDetached] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);

  useEffect(() => {
    if (typeof window !== 'undefined' && enabled) {
      localStorage.removeItem(STORAGE_KEY_DETACHED);
      
      const storageKey = getStorageKeyMessages(usuario?.id);
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        } catch (e) {
          console.error('Error al cargar mensajes de HORUS:', e);
        }
      }
      // Si no hay mensajes guardados, usar el inicial
      setMessages([INITIAL_MESSAGE]);
    }
  }, [enabled, usuario?.id]);

  // Guardar mensajes en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined' && enabled) {
      const storageKey = getStorageKeyMessages(usuario?.id);
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, enabled, usuario?.id]);

  // Guardar modo detached en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && enabled) {
      localStorage.setItem(STORAGE_KEY_DETACHED, isDetached.toString());
    }
  }, [isDetached, enabled]);

  const startNewConversation = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
  }, []);

  const detachToFloating = useCallback(() => {
    setIsDetached(true);
    setIsMinimized(false);
    setIsPanelOpen(true);
  }, []);

  const dockToSidebar = useCallback(() => {
    setIsDetached(false);
    setIsMinimized(false);
    setIsPanelOpen(true);
  }, []);

  const showInSidebar = enabled && !isMobile && !isDetached;
  const showFloating = enabled && (isMobile || isDetached);

  const canDockToSidebar = enabled && !isMobile;

  const displayMode: HorusDisplayMode = (showInSidebar && sidebarOpen) ? 'sidebar' : 'floating';

  const value = useMemo<HorusChatContextValue>(
    () => ({
      displayMode,
      isPanelOpen,
      isMinimized,
      setPanelOpen: setIsPanelOpen,
      setMinimized: setIsMinimized,
      detachToFloating,
      dockToSidebar,
      canDockToSidebar,
      showSidebarSection: showInSidebar,
      showFloatingWidget: showFloating,
      sidebarOpen,
      messages,
      setMessages,
      startNewConversation,
    }),
    [
      displayMode,
      isPanelOpen,
      isMinimized,
      detachToFloating,
      dockToSidebar,
      canDockToSidebar,
      showInSidebar,
      showFloating,
      sidebarOpen,
      messages,
      setMessages,
      startNewConversation,
    ],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return <HorusChatContext.Provider value={value}>{children}</HorusChatContext.Provider>;
}

export function useHorusChat() {
  const ctx = useContext(HorusChatContext);
  if (!ctx) {
    throw new Error('useHorusChat debe usarse dentro de HorusChatProvider');
  }
  return ctx;
}

export function useHorusChatOptional() {
  return useContext(HorusChatContext);
}
