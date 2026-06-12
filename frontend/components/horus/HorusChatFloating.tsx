'use client';

import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, IconButton, useMediaQuery, useTheme, keyframes } from '@mui/material';
import HorusChatPanel from './HorusChatPanel';
import { useHorusChatOptional } from './HorusChatContext';
import HorusAvatar from './HorusAvatar';
import { getViewportMargin, clampToViewport, fitRectInViewport, getMiniSize, getPanelSize } from './floatingUtils';

const ANIM_MS = 200;
const DRAG_CLICK_THRESHOLD = 5;

const pulseBorder = keyframes`
  0% {
    box-shadow: 0 0 0 0px rgba(255, 215, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 215, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0px rgba(255, 215, 0, 0);
  }
`;

const fadeIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export default function HorusChatFloating() {
  const ctx = useHorusChatOptional();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const margin = getViewportMargin(isMobile);

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [isMini, setIsMini] = useState(true);
  const [showAvatar, setShowAvatar] = useState(false);

  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Extraer funciones del contexto de forma segura
  const isCollapsed = ctx ? ctx.isMinimized || !ctx.isPanelOpen : true;
  const setPanelOpen = ctx?.setPanelOpen;
  const setMinimized = ctx?.setMinimized;
  const dockToSidebar = ctx?.dockToSidebar;
  const canDockToSidebar = ctx?.canDockToSidebar;

  // Controlar el avatar fade-in
  useEffect(() => {
    if (isMini) {
      const timer = setTimeout(() => setShowAvatar(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowAvatar(false);
    }
  }, [isMini]);

  // Establecer posición inicial DEBAJO DEL HEADER
  useLayoutEffect(() => {
    if (!ctx?.showFloatingWidget || pos !== null) return;
    const size = getPanelSize(isMobile, margin);
    const initialLeft = window.innerWidth - (typeof size.width === 'number' ? size.width : 420) - margin;
    const initialTop = 80;
    setPos({ left: initialLeft, top: initialTop });
  }, [ctx?.showFloatingWidget, pos, isMobile, margin]);

  const applyClampedPos = useCallback(
    (left: number, top: number) => {
      const size = isMini ? getMiniSize() : getPanelSize(isMobile, margin);
      setPos(clampToViewport(left, top, size.width, size.height, margin));
    },
    [isMini, isMobile, margin],
  );

  const ensureVisibleFromDom = useCallback(() => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    setPos(fitRectInViewport(rect, margin));
  }, [containerRef, margin]);

  useEffect(() => {
    if (!ctx?.showFloatingWidget) return;
    const onResize = () => ensureVisibleFromDom();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ctx?.showFloatingWidget, ensureVisibleFromDom]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || pos === null) return;

      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dx > DRAG_CLICK_THRESHOLD || dy > DRAG_CLICK_THRESHOLD) {
        dragMovedRef.current = true;
      }

      applyClampedPos(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { capture: true });
      window.addEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isDragging, dragOffset, pos, applyClampedPos]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (pos === null) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragMovedRef.current = false;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.left,
      y: e.clientY - pos.top,
    });
  };

  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMini(true);
    if (setMinimized) setMinimized(true);
    if (setPanelOpen) setPanelOpen(true);
  };

  const handleExpand = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (dragMovedRef.current) return;
    setIsMini(false);
    if (setMinimized) setMinimized(false);
    if (setPanelOpen) setPanelOpen(true);

    if (pos) {
      const panel = getPanelSize(isMobile, margin);
      const panelWidth = typeof panel.width === 'number' ? panel.width : 420;
      const panelHeight = typeof panel.height === 'number' ? panel.height : 600;
      
      // Ajustar posición para que el panel no se salga de la pantalla
      let newLeft = pos.left;
      let newTop = pos.top;
      
      // Verificar borde derecho
      if (newLeft + panelWidth > window.innerWidth - margin) {
        newLeft = window.innerWidth - panelWidth - margin;
      }
      
      // Verificar borde izquierdo
      if (newLeft < margin) {
        newLeft = margin;
      }
      
      // Verificar borde inferior
      if (newTop + panelHeight > window.innerHeight - margin) {
        newTop = window.innerHeight - panelHeight - margin;
      }
      
      // Verificar borde superior
      if (newTop < margin) {
        newTop = margin;
      }
      
      setPos({ left: newLeft, top: newTop });
    }
  };

  const panelSize = getPanelSize(isMobile, margin);

  if (!ctx?.showFloatingWidget || pos === null) return null;

  return (
    <>
      {/* Avatar flotante independiente */}
      {showAvatar && (
        <IconButton
          onClick={handleExpand}
          onMouseDown={handleDragStart}
          sx={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            zIndex: theme.zIndex.modal - 1,
            width: 'auto',
            height: 'auto',
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            animation: `${fadeIn} 0.5s ease`,
            '&:hover': {
              transform: 'scale(1.1)',
            },
            transition: 'transform 0.2s ease',
            bgcolor: 'transparent',
          }}
        >
          <HorusAvatar size={48} showPulse />
        </IconButton>
      )}

      {/* Panel principal con clip-path */}
      <Box
        ref={setContainerRef}
        sx={{
          position: 'fixed',
          zIndex: theme.zIndex.modal - 1,
          left: pos.left,
          top: pos.top,
          width: typeof panelSize.width === 'number' ? panelSize.width : '100%',
          height: typeof panelSize.height === 'number' ? panelSize.height : '100%',
          transition: isDragging ? 'none' : `all ${ANIM_MS} cubic-bezier(0.4, 0, 0.2, 1)`,
          opacity: isMini ? 0 : 1,
          pointerEvents: isMini ? 'none' : 'auto',
        }}
      >
        <HorusChatPanel
          variant="floating"
          onClose={handleMinimize}
          onMinimize={handleMinimize}
          onDetach={ctx.detachToFloating}
          onDock={dockToSidebar}
          canDock={canDockToSidebar}
          onHeaderMouseDown={handleDragStart}
          isDragging={isDragging}
          isMini={isMini}
        />
      </Box>
    </>
  );
}
