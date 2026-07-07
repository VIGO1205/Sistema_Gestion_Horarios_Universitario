'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Chip, Slide, IconButton, Tooltip, Button, useMediaQuery, useTheme, LinearProgress } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayIcon from '@mui/icons-material/PlayArrow';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseIcon from '@mui/icons-material/Pause';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import api from '@/lib/api';
import { useAuth } from './providers/AuthProvider';
import { getVentanasSocket } from '@/lib/socket';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

const formatCountdown = (segundos: number) => {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export default function VentanaFlotanteDocente() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { usuario, isAuthenticated, isValidating } = useAuth();
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isMinimized, setIsMinimized] = useState(false);
  const [estadoSincronizadoMs, setEstadoSincronizadoMs] = useState(Date.now());
  const [cargaValidada, setCargaValidada] = useState(false);
  const [progreso, setProgreso] = useState<any>(null);
  const [modalMostrado, setModalMostrado] = useState(false);
  const [esFilial, setEsFilial] = useState(false);
  const [horasAdicionalesLocal, setHorasAdicionalesLocal] = useState(0);
  const [horasNoLectivasLocal, setHorasNoLectivasLocal] = useState(0);
  const [finalizando, setFinalizando] = useState(false);

  // Estados para Draggability
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const docenteId = usuario?.docenteId;
  const storageKey = `ventana-flotante-minimizada:${docenteId ?? 'docente'}`;

  // Manejadores de Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Evitar drag si se hace clic en botones o chips
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.MuiChip-root')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Evitar que el evento se propague o cause comportamientos extraños
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef) return;
      
      // Calcular nueva posición potencial
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Límites de la pantalla (Constraints)
      const rect = containerRef.getBoundingClientRect();
      const margin = 10; // Margen de seguridad para que no choque exacto con el borde

      // El elemento tiene position: fixed con right y bottom iniciales.
      // Necesitamos calcular los límites basados en el tamaño de la ventana.
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Límites para X (horizontal)
      // El componente inicia en la derecha. Moverlo a la izquierda es X negativo.
      const minX = -(windowWidth - rect.width - (isMobile ? 12 : 24) - margin);
      const maxX = (isMobile ? 12 : 24); // Permitir moverlo un poco más a la derecha del original

      // Límites para Y (vertical)
      // El componente inicia en el fondo. Moverlo hacia arriba es Y negativo.
      const minY = -(windowHeight - rect.height - (isMobile ? 12 : 24) - margin);
      const maxY = (isMobile ? 12 : 24); // Permitir moverlo un poco más abajo del original
      
      setPosition({ 
        x: Math.max(minX, Math.min(maxX, newX)), 
        y: Math.max(minY, Math.min(maxY, newY)) 
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      // Usar capture: true para asegurar que atrapamos el movimiento incluso sobre otros elementos
      window.addEventListener('mousemove', handleMouseMove, { capture: true });
      window.addEventListener('mouseup', handleMouseUp, { capture: true });
      
      // Desactivar puntero en el body para que no haya interferencias
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
  }, [isDragging, dragOffset]);

  // Efecto para detectar fin de turno por tiempo
  useEffect(() => {
    if (estadoSeleccion?.estado === 'en_atencion' && !estadoSeleccion?.ventanaEstado?.includes('pausada')) {
      const fin = new Date(estadoSeleccion.finAtencion).getTime();
      if (nowMs >= fin && !finalizando) {
        setFinalizando(true);
        // Intentar guardar datos antes de que expire
        window.dispatchEvent(new CustomEvent('ventana:finalizar-registro', {
          detail: { docenteId, cicloId: estadoSeleccion.cicloId }
        }));
        // Dar tiempo para que se guarde
        setTimeout(() => {
          Swal.fire({
            title: 'Tiempo agotado',
            text: 'Tu tiempo ha terminado. Se ha enviado tu registro para validación.',
            icon: 'info',
            confirmButtonText: 'Ir a Carga Académica',
            allowOutsideClick: false,
          }).then(() => {
            router.push('/carga-academica');
          });
          setEstadoSeleccion(null);
          setFinalizando(false);
        }, 3000);
      }
    }
  }, [nowMs, estadoSeleccion, router, docenteId, finalizando]);

  useEffect(() => {
    const verificarCargaCompleta = async () => {
      if (!docenteId || estadoSeleccion?.estado !== 'en_atencion') return;
      try {
        const res = await api.get(`/docentes/${docenteId}/validar-carga`, { params: { cicloId: estadoSeleccion?.cicloId } });
        const { completa, progreso: p } = res.data;
        setProgreso(p);

        // Leer valores en tiempo real desde sessionStorage
        let horasAdicLocal = 0;
        let horasNoLectLocal = 0;
        if (typeof window !== 'undefined') {
          horasAdicLocal = Number(sessionStorage.getItem('filial-horas-adicionales') || '0');
          horasNoLectLocal = Number(sessionStorage.getItem('no-lectiva-total') || '0');
          setHorasAdicionalesLocal(horasAdicLocal);
          setHorasNoLectivasLocal(horasNoLectLocal);
        }

        // Calcular progreso local como lo hace FormularioCargaNoLectiva
        const lectivaH = p.lectiva?.requeridas || 0;
        const noLectivaH = Math.max(horasNoLectLocal, p.noLectiva?.requeridas || 0);
        const adicH = Math.max(horasAdicLocal, p.adicionales?.asignadas || 0);
        const totalLocal = lectivaH + noLectivaH + adicH;
        const requeridas = p.combinado?.requeridas || 1;
        const completada = totalLocal >= requeridas;
        setCargaValidada(completada);

        // Si se completó el 100% y no hemos mostrado el modal
        if (completa && !modalMostrado) {
          setModalMostrado(true);
          setIsMinimized(false); // Expandir automáticamente
          setPosition({ x: 0, y: 0 }); // Regresar a su lugar por defecto (esquina inferior derecha)
          
          Swal.fire({
            title: '¡Carga Completada!',
            text: 'Has registrado el 100% de tus horas (Lectivas y No Lectivas). Ya puedes finalizar tu turno.',
            icon: 'success',
            confirmButtonText: '¡Excelente!',
            confirmButtonColor: '#166534',
            timer: 5000
          });
        }
      } catch (error) {
        console.error('Error validando carga:', error);
      }
    };
    
    const interval = setInterval(verificarCargaCompleta, 5000); // Cada 5s para mayor fluidez
    verificarCargaCompleta();
    return () => clearInterval(interval);
  }, [docenteId, estadoSeleccion?.estado, modalMostrado]);

  // Determinar si el docente es filial para mostrar barra adicional
  useEffect(() => {
    if (!docenteId || estadoSeleccion?.estado !== 'en_atencion') return;
    const FILIALES = ['Filial Valle Jequetepeque', 'Filial Huamachuco', 'Filial Santiago de Chuco'];
    api.get(`/docentes/${docenteId}`).then(res => {
      const deps = res.data.dependencias || [];
      setEsFilial(deps.some((d: string) => FILIALES.includes(d)));
    }).catch(() => setEsFilial(false));
  }, [docenteId, estadoSeleccion?.estado]);

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
          
          if (payload.estado === 'finalizado') {
            setEstadoSeleccion(null);
            if (payload.motivo === 'tiempo_expirado') {
              Swal.fire({
                title: 'Tiempo agotado',
                text: 'Tu tiempo ha terminado. Se ha enviado tu registro para validación.',
                icon: 'info',
                confirmButtonText: 'Ir a Carga Académica',
                allowOutsideClick: false
              }).then(() => {
                router.push('/carga-academica');
              });
            }
            return;
          }

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
      setFinalizando(true);
      try {
        // 1. Disparar evento para guardar datos (carga no lectiva + filial)
        window.dispatchEvent(new CustomEvent('ventana:finalizar-registro', {
          detail: { docenteId, cicloId: estadoSeleccion?.cicloId }
        }));

        // 2. Esperar que los formularios guarden (máx 5s)
        await new Promise<void>((resolve) => {
          const completado = () => { resolve(); };
          window.addEventListener('ventana:finalizar-registro-completado', completado, { once: true });
          setTimeout(resolve, 5000); // fallback por si no llega el evento
        });

        // 3. Llamar al backend
        await api.patch(`/ventanas/finalizar-turno/${docenteId}`);
        Swal.fire({
          title: 'Carga Enviada',
          text: 'Tu carga ha sido enviada para validación.',
          icon: 'success',
          confirmButtonText: 'Ir a Carga Académica',
          allowOutsideClick: false
        }).then(() => {
          router.push('/carga-academica');
        });
        setEstadoSeleccion(null);
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo finalizar el turno', 'error');
      } finally {
        setFinalizando(false);
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
    <Box
      ref={setContainerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 24 },
        bottom: { xs: 12, md: 24 },
        zIndex: 1400,
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease, right 0.3s ease, bottom 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <Slide direction="left" in mountOnEnter unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            width: isMinimized ? 'auto' : { xs: 'calc(100vw - 24px)', sm: 320 },
            maxWidth: 'calc(100vw - 24px)',
            p: isMinimized ? 1 : 2.5,
            borderRadius: isMinimized ? 999 : 5,
            border: `2px solid ${view.border}`,
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
            bgcolor: estadoSeleccion?.ventanaEstado === 'pausada' ? '#fff7ed' : '#ffffff',
            overflow: 'hidden',
            userSelect: 'none',
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
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
                <Tooltip title="Minimizar" placement="top">
                  <IconButton size="small" onClick={toggleMinimized} sx={{ color: '#64748b' }}>
                    <ExpandLessIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2,
                py: 1.2,
                borderRadius: 4,
                bgcolor: view.bg,
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b', letterSpacing: 0.8 }}>
                {estadoSeleccion?.estado === 'en_atencion' ? 'CIERRA EN' : 'COMIENZA EN'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: view.accent, letterSpacing: '-0.04em' }}>
                {view.countdown}
              </Typography>
            </Box>

            {/* Barras de Progreso */}
            {estadoSeleccion?.estado === 'en_atencion' && progreso && (() => {
              const lectivaH = progreso.lectiva?.requeridas || 0;
              const noLectivaH = Math.max(horasNoLectivasLocal, progreso.noLectiva?.requeridas || 0);
              const adicH = Math.max(horasAdicionalesLocal, progreso.adicionales?.asignadas || 0);
              const total = lectivaH + noLectivaH + adicH;
              const requeridas = progreso.combinado?.requeridas || 1;
              const pct = Math.min(100, Math.round((total / requeridas) * 100));

              return (
              <Box sx={{ mb: 2.5, px: 0.5 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SchoolIcon sx={{ fontSize: 14 }} /> CARGA ACADÉMICA
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#003366' }}>
                      {total}/{requeridas}H ({pct}%)
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={pct} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: 'rgba(0, 51, 102, 0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#003366', borderRadius: 4 }
                    }} 
                  />
                </Box>

                {(progreso.adicionales || esFilial) && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AssignmentIcon sx={{ fontSize: 14 }} /> CARGA ADICIONAL
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: '#d97706' }}>
                        {Math.max(horasAdicionalesLocal, progreso.adicionales?.asignadas || 0)}/10H ({Math.min(100, Math.round((Math.max(horasAdicionalesLocal, progreso.adicionales?.asignadas || 0) / 10) * 100))}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(100, Math.round((Math.max(horasAdicionalesLocal, progreso.adicionales?.asignadas || 0) / 10) * 100))} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        bgcolor: 'rgba(217, 119, 6, 0.1)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#d97706', borderRadius: 4 }
                      }} 
                    />
                  </Box>
                )}
              </Box>
              );
            })()}

            {estadoSeleccion?.estado === 'en_atencion' && (
              <Box>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleFinalizarTurno}
                  disabled={estadoSeleccion?.ventanaEstado === 'pausada' || finalizando}
                  sx={{
                    borderRadius: 4,
                    fontWeight: 900,
                    bgcolor: cargaValidada ? '#166534' : '#64748b',
                    color: '#fff',
                    '&:hover': { bgcolor: cargaValidada ? '#14532d' : '#475569' },
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    py: 1.2,
                    boxShadow: cargaValidada ? '0 0 0 4px rgba(22, 101, 52, 0.2)' : 'none',
                    border: cargaValidada ? '2px solid #ffffff' : 'none',
                    animation: cargaValidada ? 'pulse-border 2s infinite' : 'none',
                    '@keyframes pulse-border': {
                      '0%': { boxShadow: '0 0 0 0px rgba(22, 101, 52, 0.4)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(22, 101, 52, 0)' },
                      '100%': { boxShadow: '0 0 0 0px rgba(22, 101, 52, 0)' },
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {finalizando ? 'ENVIANDO...' : cargaValidada ? '¡LISTO! FINALIZAR REGISTRO' : 'FINALIZAR REGISTRO'}
                </Button>
                {!cargaValidada && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: '#64748b', fontWeight: 600 }}>
                    Completa tus horas para habilitar este botón
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Slide>
  </Box>
);
}