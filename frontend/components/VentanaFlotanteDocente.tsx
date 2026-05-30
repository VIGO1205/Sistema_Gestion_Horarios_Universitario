'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Chip, Slide, IconButton, Tooltip, Button } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayIcon from '@mui/icons-material/PlayArrow';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseIcon from '@mui/icons-material/Pause';
import api from '@/lib/api';
import { useAuth } from './providers/AuthProvider';
import { getVentanasSocket } from '@/lib/socket';
import Swal from 'sweetalert2';

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

    const fetchEstado = async () => {
      try {
        const estadoRes = await api.get('/ventanas/mi-estado');
        if (mounted) {
          setEstadoSeleccion(estadoRes.data);
          setEstadoSincronizadoMs(Date.now());
        }
      } catch (e) {
        console.error('Error fetching estado for VentanaFlotante', e);
      }
    };

    const initializeSocket = async () => {
      try {
        const s = await getVentanasSocket();
        if (!mounted) return;

        const handler = (payload: any) => {
          if (!mounted) return;
          if (payload.docenteId && Number(payload.docenteId) !== Number(docenteId)) return;
          setEstadoSeleccion(payload);
          setEstadoSincronizadoMs(Date.now());
          console.log('[VentanaFlotante] socket update', payload);
        };

        s.on('ventanas:mi-estado', handler);
        detachSocket = () => {
          s.off('ventanas:mi-estado', handler);
        };

        // Initial fetch
        await fetchEstado();
      } catch (err) {
        console.error('Error connecting VentanaFlotante to socket', err);
        // Fallback to initial fetch if socket fails
        await fetchEstado();
      }
    };

    initializeSocket();

    // Polling de seguridad cada 5 segundos para mantener sincronización
    const pollInterval = setInterval(fetchEstado, 5000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      if (detachSocket) {
        detachSocket();
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

  const handleLlamarSiguiente = async () => {
    try {
      await api.patch(`/ventanas/llamar-siguiente/${docenteId}`);
      Swal.fire({
        title: 'Siguiente docente llamado',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'No se pudo llamar al siguiente docente', 'error');
    }
  };

  const handleFinalizarTurno = async () => {
    const result = await Swal.fire({
      title: '¿Finalizar tu turno?',
      text: 'Confirma que has terminado de registrar tus horarios. Una vez finalizado, ya no podrás realizar cambios.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, he terminado',
      cancelButtonText: 'Continuar editando'
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/ventanas/finalizar-turno/${docenteId}`);
        Swal.fire({
          title: 'Turno Finalizado',
          text: 'Gracias por completar tu registro. Se llamará al siguiente docente.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
        // El socket o el refresco de la página se encargará de ocultar la ventana
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo finalizar el turno', 'error');
      }
    }
  };

  const view = useMemo(() => {
    const estadoActual = estadoSeleccion?.estado ?? null;
    const isPausada = estadoSeleccion?.ventanaEstado === 'pausada';
    // Segundos transcurridos desde que recibimos/ sincronizamos el estado del servidor
    const segundosTranscurridos = Math.max(0, Math.round((nowMs - estadoSincronizadoMs) / 1000));

    if (estadoActual === 'en_atencion') {
      const fin = new Date(estadoSeleccion?.finAtencion).getTime();
      
      // Lógica de congelación real:
      // Si el servidor nos envía los segundosRestantes (ya congelados en el backend), los usamos directamente.
      // Si no está pausado, calculamos normalmente usando nowMs.
      const segundosRestantes = isPausada 
        ? (estadoSeleccion.segundosRestantes ?? Math.max(0, Math.round((fin - new Date(estadoSeleccion.pausadoEn || estadoSincronizadoMs).getTime()) / 1000)))
        : Math.max(0, Math.round((fin - nowMs) / 1000));

      if (segundosRestantes <= 0 && !isPausada) {
        return { visible: false };
      }

      return {
        visible: true,
        title: isPausada ? 'Registro pausado' : 'Registro activo',
        subtitle: isPausada ? 'El administrador ha pausado el tiempo.' : 'Tu turno ya comenzó.',
        countdown: formatCountdown(segundosRestantes),
        badge: isPausada ? 'PAUSADO' : 'ACTIVO',
        icon: isPausada ? <PauseIcon sx={{ color: '#ed6c02' }} /> : <TimerIcon sx={{ color: '#166534' }} />,
        accent: isPausada ? '#ed6c02' : '#166534',
        bg: isPausada ? '#fff7ed' : 'rgba(22, 101, 52, 0.08)',
        border: isPausada ? '#ed6c02' : '#bbf7d0',
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
          border: `2px solid ${view.border}`, // Borde un poco más grueso
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
          bgcolor: estadoSeleccion?.ventanaEstado === 'pausada' ? '#fff7ed' : '#ffffff', // Fondo naranja muy claro si está pausado
          overflow: 'hidden',
          transition: 'all 0.3s ease', // Transición suave de colores
        }}
      >
        {isMinimized ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, pr: 0.5 }}>
            {estadoSeleccion?.ventanaEstado === 'pausada' && (
              <PauseIcon sx={{ color: '#ed6c02', fontSize: 20 }} />
            )}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: view.accent,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                minWidth: estadoSeleccion?.ventanaEstado === 'pausada' ? 'auto' : 116,
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

            {estadoSeleccion?.estado === 'en_atencion' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<PlayIcon />}
                  onClick={handleLlamarSiguiente}
                  disabled={estadoSeleccion?.ventanaEstado === 'pausada'}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 900,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)',
                  }}
                >
                  Siguiente
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleFinalizarTurno}
                  disabled={estadoSeleccion?.ventanaEstado === 'pausada'}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 900,
                    bgcolor: '#166534',
                    '&:hover': { bgcolor: '#14532d' },
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(22, 101, 52, 0.2)',
                  }}
                >
                  Finalizar
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Slide>
  );
}