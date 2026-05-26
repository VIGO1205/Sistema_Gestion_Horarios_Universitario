'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Chip, Slide, IconButton, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '@/lib/api';
import { useAuth } from './providers/AuthProvider';
import { getVentanasSocket } from '@/lib/socket';

const formatCountdown = (segundos: number) => {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export default function VentanaFlotanteDocente() {
  const { usuario, isAuthenticated, isValidating } = useAuth();
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isMinimized, setIsMinimized] = useState(false);
  const [estadoSincronizadoMs, setEstadoSincronizadoMs] = useState(Date.now());

  const docenteId = usuario?.docenteId;
  const storageKey = `ventana-flotante-minimizada:${docenteId ?? 'docente'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    setIsMinimized(stored === '1');
  }, [storageKey]);

  const toggleMinimized = () => {
    setIsMinimized(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isAuthenticated || isValidating || usuario?.rol !== 'docente' || !docenteId) return;

    let mounted = true;
    let detachSocket: (() => void) | null = null;

    const initializeSocket = async () => {
      try {
        const s = await getVentanasSocket();
        if (!mounted) return;

        const handler = (payload: any) => {
          if (!mounted) return;
          if (payload.docenteId && Number(payload.docenteId) !== Number(docenteId)) return;
          setEstadoSeleccion(payload);
          setEstadoSincronizadoMs(Date.now());
          // eslint-disable-next-line no-console
          console.log('[VentanaFlotante] socket update', { payload });
        };

        s.off('ventanas:mi-estado', handler);
        s.on('ventanas:mi-estado', handler);
        detachSocket = () => {
          s.off('ventanas:mi-estado', handler);
        };

        // initial fetch fallback
        try {
          const estadoRes = await api.get('/ventanas/mi-estado');
          if (mounted) {
            setEstadoSeleccion(estadoRes.data);
            setEstadoSincronizadoMs(Date.now());
          }
        } catch (e) {
          console.error('Error fetching initial estado for VentanaFlotante', e);
        }
      } catch (err) {
        console.error('Error connecting VentanaFlotante to socket', err);
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
      if (detachSocket) {
        detachSocket();
        detachSocket = null;
      }
    };
  }, [docenteId, isAuthenticated, isValidating, usuario?.rol]);

  useEffect(() => {
    if (estadoSeleccion?.estado !== 'en_atencion' && estadoSeleccion?.estado !== 'en_espera') return;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [estadoSeleccion?.estado]);

  const view = useMemo(() => {
    const estadoActual = estadoSeleccion?.estado ?? null;
    const segundosTranscurridos = Math.max(0, Math.floor((nowMs - estadoSincronizadoMs) / 1000));

    if (estadoActual === 'en_atencion') {
      const fin = new Date(estadoSeleccion?.finAtencion).getTime();
      const segundosRestantes = Math.max(0, Math.floor((fin - nowMs) / 1000));

      if (segundosRestantes <= 0) {
        return { visible: false };
      }

      return {
        visible: true,
        title: 'Registro activo',
        subtitle: 'Tu turno ya comenzó.',
        countdown: formatCountdown(segundosRestantes),
        badge: 'ACTIVO',
        icon: <TimerIcon sx={{ color: '#166534' }} />,
        accent: '#166534',
        bg: 'rgba(22, 101, 52, 0.08)',
        border: '#bbf7d0',
      };
    }

    if (estadoActual === 'en_espera' && estadoSeleccion?.hayVentanaAtencion) {
      const segundosIniciales = Math.max(0, Number(estadoSeleccion?.segundosHastaTurno ?? 0));
      const segundosHastaTurno = Math.max(0, segundosIniciales - segundosTranscurridos);
      const estadoActivoEnTiempoReal = segundosHastaTurno === 0;

      // Log para comparar valores entre servidor y cliente
      // eslint-disable-next-line no-console
      console.log('[VentanaFlotante] countdown calc', {
        segundosIniciales,
        segundosTranscurridos,
        segundosHastaTurno,
        nowMs,
        estadoSincronizadoMs,
      });

      if (estadoActivoEnTiempoReal) {
        const duracionMinutos = Math.max(1, Number(estadoSeleccion?.tiempoDisponibleMinutos ?? 0));
        const segundosRestantes = duracionMinutos * 60;

        return {
          visible: true,
          title: 'Registro activo',
          subtitle: 'Tu turno ya comenzó.',
          countdown: formatCountdown(segundosRestantes),
          badge: 'ACTIVO',
          icon: <TimerIcon sx={{ color: '#166534' }} />,
          accent: '#166534',
          bg: 'rgba(22, 101, 52, 0.08)',
          border: '#bbf7d0',
        };
      }

      return {
        visible: true,
        title: 'Disponible para registrarse',
        subtitle: 'Tu turno aún no inicia.',
        countdown: formatCountdown(segundosHastaTurno),
        badge: 'EN ESPERA',
        icon: <AccessTimeIcon sx={{ color: '#0b3a75' }} />,
        accent: '#0b3a75',
        bg: 'rgba(11, 58, 117, 0.08)',
        border: '#bfdbfe',
      };
    }

    return { visible: false };
  }, [estadoSeleccion, nowMs, estadoSincronizadoMs]);

  if (!view.visible) return null;

  return (
    <Slide direction="left" in mountOnEnter unmountOnExit>
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          right: { xs: 12, md: 24 },
          bottom: { xs: 12, md: 24 },
          zIndex: 1400,
          width: isMinimized ? 'auto' : { xs: 'calc(100vw - 24px)', sm: 320 },
          maxWidth: 'calc(100vw - 24px)',
          p: isMinimized ? 1 : 2,
          borderRadius: isMinimized ? 999 : 4,
          border: `1px solid ${view.border}`,
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
          bgcolor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {isMinimized ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, pr: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: view.accent,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                minWidth: 116,
                textAlign: 'center',
              }}
            >
              {view.countdown}
            </Typography>
            <Tooltip title="Expandir" placement="top">
              <IconButton size="small" onClick={toggleMinimized} sx={{ bgcolor: view.bg, color: view.accent }}>
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.8 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', bgcolor: view.bg }}>
                {view.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 900, color: '#64748b', lineHeight: 1 }}>
                  {view.badge}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                  {view.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={estadoSeleccion?.estado === 'en_atencion' ? 'ACTIVO' : 'ESPERA'}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    bgcolor: view.bg,
                    color: view.accent,
                    borderRadius: 999,
                  }}
                />
                <Tooltip title="Minimizar" placement="top">
                  <IconButton size="small" onClick={toggleMinimized} sx={{ color: '#64748b' }}>
                    <ExpandLessIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600, mb: 1.25 }}>
              {view.subtitle}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 1.25,
                py: 0.9,
                borderRadius: 3,
                bgcolor: view.bg,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b', letterSpacing: 0.8 }}>
                {estadoSeleccion?.estado === 'en_atencion' ? 'CIERRA EN' : 'COMIENZA EN'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: view.accent, letterSpacing: '-0.04em' }}>
                {view.countdown}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Slide>
  );
}