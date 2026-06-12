'use client';

import React from 'react';
import { Box } from '@mui/material';

interface HorusAvatarProps {
  size?: number;
  showPulse?: boolean;
}

export default function HorusAvatar({ size = 40, showPulse = false }: HorusAvatarProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {showPulse && (
        <>
          <Box
            sx={{
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              border: '2px solid rgba(255, 215, 0, 0.45)',
              animation: 'horus-pulse 2s ease-out infinite',
              '@keyframes horus-pulse': {
                '0%': {
                  transform: 'scale(0.8)',
                  opacity: 1,
                },
                '70%': {
                  transform: 'scale(1.6)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'scale(1.8)',
                  opacity: 0,
                },
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              border: '2px solid rgba(255, 215, 0, 0.35)',
              animation: 'horus-pulse-secondary 2s ease-out infinite',
              animationDelay: '0.3s',
              '@keyframes horus-pulse-secondary': {
                '0%': {
                  transform: 'scale(0.6)',
                  opacity: 0.8,
                },
                '70%': {
                  transform: 'scale(1.4)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'scale(1.6)',
                  opacity: 0,
                },
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px solid rgba(255, 215, 0, 0.25)',
              animation: 'horus-pulse-tertiary 2s ease-out infinite',
              animationDelay: '0.6s',
              '@keyframes horus-pulse-tertiary': {
                '0%': {
                  transform: 'scale(0.4)',
                  opacity: 0.6,
                },
                '70%': {
                  transform: 'scale(1.2)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'scale(1.4)',
                  opacity: 0,
                },
              },
            }}
          />
        </>
      )}
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: 'white',
          border: '2px solid rgba(255, 215, 0, 0.55)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        }}
      >
        <img
          src="/img/Logo-Horus.png"
          alt="Horus"
          draggable={false}
          style={{
            width: size * 0.92,
            height: size * 0.92,
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Box>
  );
}
