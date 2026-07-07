'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  CircularProgress,
  Chip,
  Button,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Book as BookIcon,
  HourglassEmpty as WaitIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getNotificacionesSocket } from '@/lib/socket';
import { useVentanaAtencion } from '@/app/horarios/hooks/useVentanaAtencion';
import FormularioCargaNoLectiva from './FormularioCargaNoLectiva';
import FormularioAsignacionFilial from './FormularioAsignacionFilial';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface CargaAcademicaDocenteProps {
  docente: any;
  ciclos: any[];
}

export default function CargaAcademicaDocente({
  docente: docenteProp,
  ciclos,
}: CargaAcademicaDocenteProps) {
  const [docente, setDocente] = useState(docenteProp);
  const [selectedCiclo, setSelectedCiclo] = useState<number | string>(
    ciclos.find((c) => c.esActual)?.id || ''
  );

  useEffect(() => {
    if (ciclos.length > 0 && !selectedCiclo) {
      const actual = ciclos.find((c) => c.esActual) || ciclos[0];
      if (actual) setSelectedCiclo(actual.id);
    }
  }, [ciclos]);

  const [cargaLectiva, setCargaLectiva] = useState<any[]>([]);
  const [loadingCarga, setLoadingCarga] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string | null>(null);

  const FILIALES = ['Filial Valle Jequetepeque', 'Filial Huamachuco', 'Filial Santiago de Chuco'];
  const esFilial = (docente?.dependencias || docenteProp?.dependencias || [])?.some((d: string) => FILIALES.includes(d));
  const [step, setStep] = useState<'carga' | 'filial'>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('cargaStep') as 'carga' | 'filial') || 'carga';
    }
    return 'carga';
  });

  useEffect(() => {
    sessionStorage.setItem('cargaStep', step);
  }, [step]);
  const [horasAdicionales, setHorasAdicionales] = useState(0);
  const [horasNoLectivas, setHorasNoLectivas] = useState(0);
  const [isCargaValid, setIsCargaValid] = useState(true);

  const saveCargaNoLectivaRef = useRef<((estado?: string) => Promise<boolean>) | null>(null);
  const saveFilialRef = useRef<(() => Promise<boolean>) | null>(null);

  const handleVentanaFinalizarRegistro = useCallback(async (e: CustomEvent) => {
    // 1. Guardar carga no lectiva
    if (saveCargaNoLectivaRef.current) {
      await saveCargaNoLectivaRef.current('pendiente');
    }
    // 2. Guardar filial si aplica
    if (esFilial && saveFilialRef.current) {
      await saveFilialRef.current();
    }
    // 3. Disparar evento de completado
    window.dispatchEvent(new CustomEvent('ventana:finalizar-registro-completado'));
  }, [esFilial]);

  useEffect(() => {
    window.addEventListener('ventana:finalizar-registro', handleVentanaFinalizarRegistro as unknown as EventListener);
    return () => window.removeEventListener('ventana:finalizar-registro', handleVentanaFinalizarRegistro as unknown as EventListener);
  }, [handleVentanaFinalizarRegistro]);

  const getStatusConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'validado':
        return { label: 'VALIDADO', color: '#16a34a', bg: '#f0fdf4' };
      case 'finalizado':
        return { label: 'FIRMADO Y FINALIZADO', color: '#003366', bg: '#e0f2fe' };
      case 'pendiente':
        return { label: 'PENDIENTE DE VALIDACIÓN', color: '#ca8a04', bg: '#fefce8' };
      default:
        return { label: 'BORRADOR', color: '#64748b', bg: '#f8fafc' };
    }
  };

  const statusDisplay = useMemo(() => {
    if (!currentStatus || currentStatus === 'sin_carga') return null;
    const config = getStatusConfig(currentStatus);
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        bgcolor: config.bg, 
        px: 2, 
        py: 0.5, 
        borderRadius: 2, 
        border: `1px solid ${config.color}40` 
      }}>
        <Typography sx={{ fontWeight: 900, color: config.color, fontSize: '0.75rem', textTransform: 'uppercase' }}>
          {config.label}
        </Typography>
      </Box>
    );
  }, [currentStatus]);

  useEffect(() => {
    const fetchFullDocente = async () => {
      try {
        const id = docenteProp?.docenteId || docenteProp?.id;
        if (id) {
          const res = await api.get(`/docentes/${id}`);
          setDocente(res.data);
        }
      } catch (error) {
        console.error('Error fetching full docente data:', error);
      }
    };

    fetchFullDocente();
  }, [docenteProp]);

  useEffect(() => {
    const id = docente?.id || docenteProp?.docenteId || docenteProp?.id;
    if (selectedCiclo && id) {
      // Limpiar datos anteriores antes de cargar los nuevos
      setCargaLectiva([]);
      setCurrentStatus(null);
      setMotivoRechazo(null);
      setHorasAdicionales(0);
      fetchCargaLectiva(id);
      // Cargar horas adicionales existentes desde la BD
      api.get('/asignacion-filial', {
        params: { docenteId: id, cicloId: Number(selectedCiclo) }
      }).then(res => {
        if (res.data?.totalHorasSemanales) {
          setHorasAdicionales(Math.round(res.data.totalHorasSemanales));
        }
      }).catch(() => {});
    }
  }, [selectedCiclo, docente?.id, docenteProp?.id]);

  useEffect(() => {
    const id = docente?.id || docenteProp?.docenteId || docenteProp?.id;
    if (id) {
      let mounted = true;
      let detachSocket: (() => void) | null = null;

      const setupSocket = async () => {
        try {
          const socket = await getNotificacionesSocket();
          if (!mounted) return;

          const handler = (data: any) => {
            if (!mounted) return;
            if (Number(data.docenteId) === Number(id)) {
              if (Number(data.cicloId) === Number(selectedCiclo)) {
                setCurrentStatus(data.estado);
              }
              // Mostrar notificación visual
              console.log('[CargaAcademicaDocente] socket update', data);
            }
          };

          socket.on('notificaciones:estado-carga', handler);
          detachSocket = () => {
            socket.off('notificaciones:estado-carga', handler);
          };
        } catch (err) {
          console.error('Error connecting CargaAcademicaDocente to socket', err);
        }
      };

      setupSocket();
      return () => {
        mounted = false;
        if (detachSocket) detachSocket();
      };
    }
  }, [docente?.id, docenteProp?.id, selectedCiclo]);

  const fetchCargaLectiva = async (id: number) => {
    setLoadingCarga(true);
    try {
      const res = await api.get(`/docentes/${id}/cursos`, {
        params: { cicloId: selectedCiclo },
      });
      setCargaLectiva(res.data || []);
    } catch (error) {
      console.error('Error fetching carga lectiva:', error);
    } finally {
      setLoadingCarga(false);
    }
  };

  const handleFinalSubmit = async (): Promise<boolean> => {
    try {
      // 1. Guardar carga no lectiva (horas + detalles + horarios del grid)
      if (saveCargaNoLectivaRef.current) {
        const saved = await saveCargaNoLectivaRef.current('pendiente');
        if (!saved) return false;
        setCurrentStatus('pendiente');
      }
      // 2. Guardar carga filial (solo para filiales)
      if (esFilial && saveFilialRef.current) {
        const saved = await saveFilialRef.current();
        if (!saved) return false;
      }
      // 3. Finalizar turno del docente (backend llama al siguiente o termina la ventana)
      const docId = docente?.id || docenteProp?.docenteId || docenteProp?.id;
      if (docId) {
        await api.patch(`/ventanas/finalizar-turno/${docId}`);
      }
      return true;
    } catch (error) {
      console.error('Error al enviar:', error);
      return false;
    }
  };

  const nombreMostrar = docente?.nombreCompleto || docenteProp?.nombre || '---';
  const contratoMostrar = docente?.condicion || '---';
  const categoriaMostrar = docente?.categoria || '---';

  const dedicacionTotalHoras = parseInt((docente?.dedicacion || docenteProp?.dedicacion || '40').match(/\d+/)?.[0] || '40');
  const facultadMostrar = (docente?.facultad || docenteProp?.facultad || 'Ingeniería').toUpperCase();
  const departamentoMostrar = (docente?.departamentoAcademico || docenteProp?.departamentoAcademico || 'Dpto. de Ingeniería de Sistemas').toUpperCase();
  const condicionMostrar = (docente?.condicion || docenteProp?.condicion || 'NOMBRADO').toUpperCase();
  const categoriaMostrarUpper = (docente?.categoria || docenteProp?.categoria || 'ASOCIADO').toUpperCase();
  const modalidadMostrar = (docente?.dedicacion || docenteProp?.dedicacion || 'TIEMPO COMPLETO').toUpperCase();
  const nombreCompletoMostrar = docente?.nombreCompleto || docenteProp?.nombreCompleto || docenteProp?.nombre || '---';

  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const cargaLectivaAgrupada = useMemo(() => {
    const grupos: Record<string, any> = {};
    
    cargaLectiva.forEach((item) => {
      // Agrupamos únicamente por curso (ID del curso) para que todo aparezca en una sola fila
      const key = item.cursoId.toString();

      if (!grupos[key]) {
        grupos[key] = {
          codigo: item.curso?.codigo,
          nombre: item.curso?.nombre,
          curricula: item.curso?.curricula,
          ciclo: item.curso?.cicloAcademico,
          seccionesSet: new Set<string>(),
          horasT: 0,
          gruposT: 0,
          horasP: 0,
          gruposP: 0,
          horasL: 0,
          gruposL: 0,
          totalHoras: 0,
        };
      }
      
      const horas = Number(item.horasSemanales || 0);
      const numGrupos = (item.grupos || []).length;
      const tipo = item.tipoClase?.toLowerCase();
      
      // Agregar las secciones al Set para evitar duplicados y luego unirlas
      (item.grupos || []).forEach((g: any) => {
        grupos[key].seccionesSet.add(numberToLetter(g.numeroGrupo));
      });
      
      const horasUnitarias = numGrupos > 0 ? horas / numGrupos : horas;

      if (tipo === 'teoria') {
        grupos[key].horasT = horasUnitarias;
        grupos[key].gruposT += numGrupos;
      } else if (tipo === 'practica') {
        grupos[key].horasP = horasUnitarias;
        grupos[key].gruposP += numGrupos;
      } else if (tipo === 'laboratorio') {
        grupos[key].horasL = horasUnitarias;
        grupos[key].gruposL += numGrupos;
      }
      
      grupos[key].totalHoras += horas;
    });
    
    return Object.values(grupos).map(g => ({
      ...g,
      seccion: Array.from(g.seccionesSet).sort().join(', ') || '---'
    }));
  }, [cargaLectiva]);

  const totalHorasNoLectivas = horasNoLectivas;

  const { estadoSeleccion, docentePuedeGestionar } = useVentanaAtencion(docenteProp, true);

  const cicloActual = ciclos.find(c => c.esActual);
  const cicloEsActual = cicloActual && Number(selectedCiclo) === cicloActual.id;
  const puedeGestionar = cicloEsActual ? docentePuedeGestionar : true;

  const mostrarContenidoCarga = !cicloEsActual || (estadoSeleccion && (
    estadoSeleccion.estado === 'en_atencion' || estadoSeleccion.estado === 'finalizado'
  ));

  const totalHorasLectivas = mostrarContenidoCarga
    ? cargaLectiva.reduce((sum, item) => {
        return sum + Number(item.horasSemanales || 0);
      }, 0)
    : 0;

  const getMensajeBloqueo = () => {
    if (!cicloEsActual) return null;
    if (!estadoSeleccion) return null;
    if (estadoSeleccion.estado === 'en_espera') return (
      <TableRow>
        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
          <AccessTimeIcon sx={{ fontSize: 40, color: '#f59e0b', mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#92400e', mb: 0.5 }}>
            Fuera de Turno — Esperando en cola
          </Typography>
          <Typography variant="body2" sx={{ color: '#78350f', mb: 0.5 }}>
            Posición en cola: {estadoSeleccion.posicion} de {estadoSeleccion.totalEnEspera}
            {estadoSeleccion.minutosHastaTurno ? ` — Tiempo estimado: ${estadoSeleccion.minutosHastaTurno} min` : ''}
          </Typography>
          <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 500 }}>
            Podrá gestionar su carga académica cuando sea su turno.
          </Typography>
        </TableCell>
      </TableRow>
    );
    if (estadoSeleccion.estado === 'sin_ventana') return (
      <TableRow>
        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
          <AccessTimeIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>
            Ventanas de atención no disponibles
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Las ventanas de atención aún no han sido programadas por el administrador.
          </Typography>
        </TableCell>
      </TableRow>
    );
    if (estadoSeleccion.estado === 'no_programado') return (
      <TableRow>
        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
          <AccessTimeIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>
            Sin ventana de atención asignada
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
            Usted aún no ha sido asignado a una ventana de atención.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
            Asegúrese de tener su carga lectiva y horarios completos.
          </Typography>
        </TableCell>
      </TableRow>
    );
    return null;
  };

  const mensajeBloqueo = getMensajeBloqueo();
  const mostrarTablaCarga = mostrarContenidoCarga || (estadoSeleccion && ![ 'en_espera', 'sin_ventana', 'no_programado' ].includes(estadoSeleccion.estado));
  const esRechazada = currentStatus === 'borrador';
  const formDisabled = !puedeGestionar && !esRechazada;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#003366' }}>
          Carga Académica del Docente
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="ciclo-select-label-top">Periodo</InputLabel>
          <Select
            labelId="ciclo-select-label-top"
            value={selectedCiclo}
            label="Periodo"
            onChange={(e) => setSelectedCiclo(e.target.value as string)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {ciclos.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.nombre}{c.esActual ? ' (Actual)' : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper sx={{ 
            borderRadius: 4, 
            overflow: 'hidden', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)', 
            border: '1px solid #e2e8f0',
            background: '#ffffff'
          }}>
            <Box sx={{ 
              p: 3, 
              bgcolor: '#003366', 
              color: 'white',
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5
            }}>
              <AssignmentIcon sx={{ color: '#FFD700', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Datos sobre la situación del profesor
              </Typography>
            </Box>
            
            <Box sx={{ p: { xs: 2, '@media (min-width: 1000px)': { p: 4 } } }}>
              <Grid container spacing={3}>
                {/* Mobile: todos los 6 campos en un solo contenedor centrado */}
                <Grid item xs={12} sx={{
                  '@media (min-width: 1000px)': { display: 'none' }
                }}>
                  <Box sx={{ display: 'grid', gap: 2, width: 'fit-content', mx: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>FACULTAD:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{facultadMostrar}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>DPTO. ACADÉMICO:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{departamentoMostrar}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140, textTransform: 'uppercase' }}>Nombre Completo:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{nombreCompletoMostrar.toUpperCase()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>CONDICIÓN:</Typography>
                      <Chip label={condicionMostrar} sx={{ bgcolor: '#e0f2fe', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem' }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>CATEGORÍA:</Typography>
                      <Chip label={categoriaMostrarUpper} sx={{ bgcolor: '#fef3c7', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem' }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140, textTransform: 'uppercase' }}>Modalidad de Dedicación:</Typography>
                      <Chip label={modalidadMostrar} sx={{ bgcolor: '#bbf7d0', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem' }} />
                    </Box>
                  </Box>
                </Grid>
                {/* Desktop izquierda */}
                <Grid item xs={12} sx={{
                  display: 'none',
                  '@media (min-width: 1000px)': { display: 'block', flexBasis: '50%', maxWidth: '50%' }
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 140 }}>FACULTAD:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{facultadMostrar}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 140 }}>DPTO. ACADÉMICO:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{departamentoMostrar}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 140, textTransform: 'uppercase' }}>Nombre Completo:</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{nombreCompletoMostrar.toUpperCase()}</Typography>
                    </Box>
                  </Box>
                </Grid>
                {/* Desktop derecha */}
                <Grid item xs={12} sx={{
                  display: 'none',
                  '@media (min-width: 1000px)': { display: 'block', flexBasis: '50%', maxWidth: '50%' }
                }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: 440 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 200 }}>CONDICIÓN:</Typography>
                    <Chip label={condicionMostrar} sx={{ bgcolor: '#e0f2fe', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem', width: 220 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: 440 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 200 }}>CATEGORÍA:</Typography>
                    <Chip label={categoriaMostrarUpper} sx={{ bgcolor: '#fef3c7', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem', width: 220 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: 440 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', width: 200, textTransform: 'uppercase' }}>Modalidad de Dedicación:</Typography>
                    <Chip label={modalidadMostrar} sx={{ bgcolor: '#bbf7d0', color: '#003366', fontWeight: 800, borderRadius: 1, minWidth: 100, fontSize: '0.95rem', width: 220 }} />
                  </Box>
                </Box>
              </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* SECCIÓN: CARGA HORARIA / ASIGNACIÓN FILIAL */}
        <Grid item xs={12}>
          {/* Paso 1: Carga Lectiva + No Lectiva (siempre para filial, único paso para normal) */}
          {(!esFilial || step === 'carga') && (
            <Paper sx={{ 
              borderRadius: 4, 
              overflow: 'hidden', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff'
            }}>
              <Box sx={{ 
                p: 3, 
                bgcolor: '#003366', 
                color: 'white',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BookIcon sx={{ color: '#FFD700', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    DECLARACION DE LA CARGA ACADEMICA DOCENTE (F01-CAD)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {statusDisplay}
                </Box>
              </Box>

              {motivoRechazo && (
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mx: 4, mb: 2, mt: 1, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Observación del coordinador — Su carga académica fue devuelta para corrección:
                  </Typography>
                  <Typography variant="body2">{motivoRechazo}</Typography>
                </Alert>
              )}

              <Box sx={{ p: 4 }}>
                {/* 1. TRABAJO LECTIVO */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pb: 1, borderBottom: '2px solid #f1f5f9' }}>
                  <BookIcon sx={{ color: '#003366', fontSize: 24 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                    1. TRABAJO LECTIVO.- Datos completos y con claridad
                  </Typography>
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9', borderRadius: 2, mb: 6 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>CÓDIGO</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>NOMBRE DEL CURSO</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>SECCIÓN</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>AÑO O CICLO</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>HrsTeo/Grupos</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>HrsPra/Grupos</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>HrsLab/Grupos</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>TOTAL HRS.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mensajeBloqueo ? mensajeBloqueo : loadingCarga ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : cargaLectivaAgrupada.length > 0 ? (
                        cargaLectivaAgrupada.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.codigo || '---'}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                              {item.nombre}{' '}
                              {item.curricula ? (
                                <Typography component="span" sx={{ color: '#1565c0', fontWeight: 600, fontSize: '0.75rem' }}>
                                  (MC - {item.curricula.anio})
                                </Typography>
                              ) : ''}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                              {item.seccion}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                              {item.ciclo || '---'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                              {item.horasT > 0 ? (
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.horasT}</Box>) 
                                  x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposT}</Box>)
                                </Box>
                              ) : '---'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                              {item.horasP > 0 ? (
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.horasP}</Box>) 
                                  x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposP}</Box>)
                                </Box>
                              ) : '---'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                              {item.horasL > 0 ? (
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.horasL}</Box>) 
                                  x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposL}</Box>)
                                </Box>
                              ) : '---'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', fontSize: '0.9rem' }}>
                              {item.totalHoras}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <WaitIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                              Aún no tienes cursos lectivos asignados para este periodo académico.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* 2. CARGA NO LECTIVA (Componente Integrado) */}
                {Number(selectedCiclo) > 0 && (
                <FormularioCargaNoLectiva 
                  docenteId={docente?.id || docenteProp?.docenteId || docenteProp?.id}
                  cicloId={Number(selectedCiclo)}
                  dedicacionTotal={dedicacionTotalHoras}
                  horasLectivas={totalHorasLectivas}
                  docenteData={{
                    ...docente,
                    facultad: facultadMostrar,
                    departamentoAcademico: departamentoMostrar,
                    condicion: condicionMostrar,
                    categoria: categoriaMostrarUpper,
                    modalidad: modalidadMostrar,
                    nombreCompleto: nombreCompletoMostrar
                  }}
                  cicloData={ciclos.find(c => c.id === Number(selectedCiclo))}
                  cargaLectivaAgrupada={cargaLectivaAgrupada}
                  externalEstado={currentStatus}
                  onStatusChange={(status) => setCurrentStatus(status)}
                  hideEnviarButton={esFilial}
                  horasAdicionales={horasAdicionales}
                  onHorasNoLectivasChange={setHorasNoLectivas}
                  esFilial={esFilial}
                  formDisabled={formDisabled}
                  onMotivoRechazoChange={setMotivoRechazo}
                  onRegisterSave={(fn) => { saveCargaNoLectivaRef.current = fn; }}
                  onValidationChange={setIsCargaValid}
                />
                )}

                {/* Botón Siguiente para docentes filiales */}
                {esFilial && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                    <Tooltip title={!isCargaValid ? 'La carga lectiva + no lectiva excede la jornada. Revisa tus horas antes de continuar.' : ''}>
                      <span>
                        <Button
                          variant="contained"
                          endIcon={<ArrowForwardIcon />}
                          onClick={() => setStep('filial')}
                          disabled={!isCargaValid}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            px: 4,
                            py: 1.5,
                            bgcolor: !isCargaValid ? '#94a3b8' : '#003366',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                            '&:hover': !isCargaValid ? {} : { bgcolor: '#002244', boxShadow: '0 6px 16px rgba(0,51,102,0.3)' },
                          }}
                        >
                          Siguiente
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {/* Paso 2: Formulario Asignación Filial (solo para filiales) */}
          {esFilial && step === 'filial' && (
            <FormularioAsignacionFilial
              docenteData={docente || docenteProp}
              cicloId={Number(selectedCiclo)}
              onBack={() => setStep('carga')}
              onSubmit={() => setStep('carga')}
              onHorasAdicionalesChange={setHorasAdicionales}
              horasLectivas={totalHorasLectivas}
              horasNoLectivas={totalHorasNoLectivas}
              dedicacionTotal={dedicacionTotalHoras}
              externalEstado={currentStatus}
              onStatusChange={(status) => setCurrentStatus(status)}
              onFinalSubmit={handleFinalSubmit}
              formDisabled={formDisabled}
              onRegisterSaveFilial={(fn) => { saveFilialRef.current = fn; }}
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
