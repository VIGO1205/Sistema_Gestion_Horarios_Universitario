'use client';

import React, { useState } from 'react';
import { Box, Divider, Typography, Tooltip, IconButton, ButtonBase } from '@mui/material';
import { useHorusChatOptional } from './HorusChatContext';
import HorusChatPanel from './HorusChatPanel';
import HorusAvatar from './HorusAvatar';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export default function HorusChatSidebar() {
  const ctx = useHorusChatOptional();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // En móviles, el sidebar NO debe renderizar a Horus bajo ninguna circunstancia
  // En móviles Horus es SIEMPRE flotante (avatar)
  if (!ctx?.showSidebarSection || ctx.sidebarOpen === undefined) return null;
  const { detachToFloating, sidebarOpen } = ctx;

  if (!sidebarOpen) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pb: 2,
          gap: 1.5,
          width: '100%',
        }}
      >
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', width: '60%' }} />
        <Tooltip title="Asistente IA (HORUS)" placement="right">
          <IconButton
            onClick={detachToFloating}
            sx={{
              p: 0.5,
              border: '2px solid rgba(255, 215, 0, 0.2)',
              '&:hover': {
                border: '2px solid #FFD700',
                bgcolor: 'rgba(255, 215, 0, 0.05)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <HorusAvatar size={40} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: 2,
        pb: 2,
        pt: 1,
        flexShrink: 0,
        width: '100%',
      }}
    >
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />
      
      {/* Contenedor del Chat con Altura Animada */}
      <Box 
        sx={{ 
          height: isExpanded ? 400 : 60, 
          overflow: 'hidden',
          width: '100%',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: 3,
          border: '1px solid rgba(255, 215, 0, 0.2)',
          bgcolor: 'rgba(0, 20, 50, 0.55)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <HorusChatPanel 
          variant="sidebar" 
          onDetach={detachToFloating}
          isSidebarExpanded={isExpanded}
          onToggleSidebarExpand={() => setIsExpanded(!isExpanded)}
        />
      </Box>
    </Box>
  );
}
