'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import {
  Book as BookIcon,
  HourglassEmpty as WaitIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getNotificacionesSocket } from '@/lib/socket';
import FormularioCargaNoLectiva from './FormularioCargaNoLectiva';

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
  const [cargaLectiva, setCargaLectiva] = useState<any[]>([]);
  const [loadingCarga, setLoadingCarga] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<any>(null);

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
    if (!currentStatus) return null;
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
      fetchCargaLectiva(id);
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

  const nombreMostrar = docente?.nombreCompleto || docenteProp?.nombre || '---';
  const contratoMostrar = docente?.tipoContrato || '---';
  const categoriaMostrar = docente?.categoria || '---';

  const totalHorasLectivas = cargaLectiva.reduce((sum, item) => {
    return sum + Number(item.horasSemanales || 0);
  }, 0);
  
  const dedicacionTotalHoras = parseInt((docente?.dedicacion || docenteProp?.dedicacion || '40').match(/\d+/)?.[0] || '40');
  const porcentajeLectiva = Math.min(100, (totalHorasLectivas / dedicacionTotalHoras) * 100);
  const facultadMostrar = docente?.facultad || docenteProp?.facultad || 'Ingeniería';
  const departamentoMostrar = docente?.departamento || docenteProp?.departamento || 'Dpto. de Ingeniería de Sistemas';
  const condicionMostrar = (docente?.tipoContrato || docenteProp?.tipoContrato || 'NOMBRADO').toUpperCase();
  const categoriaMostrarUpper = (docente?.categoria || docenteProp?.categoria || 'ASOCIADO').toUpperCase();
  const modalidadMostrar = (docente?.dedicacion || docenteProp?.dedicacion || 'TIEMPO COMPLETO 40 H').toUpperCase();
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

  const totalHorasNoLectivas = Math.round(
    Number(
      (docente?.horasNoLectivas ?? docenteProp?.horasNoLectivas ?? 0) || 0
    )
  );

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
              <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
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
            
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>FACULTAD:</Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{facultadMostrar}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>DPTO. ACADÉMICO:</Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{departamentoMostrar}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 100, textAlign: 'right' }}>CONDICIÓN:</Typography>
                    <Chip label={condicionMostrar} size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, borderRadius: 1, minWidth: 100 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 100, textAlign: 'right' }}>CATEGORÍA:</Typography>
                    <Chip label={categoriaMostrarUpper} size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, borderRadius: 1, minWidth: 100 }} />
                  </Box>
                </Box>
              </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase' }}>Nombre Completo</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{nombreCompletoMostrar.toUpperCase()}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase' }}>Modalidad de Dedicación</Typography>
                      <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{modalidadMostrar}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* SECCIÓN UNIFICADA: CARGA HORARIA */}
        <Grid item xs={12}>
          <Paper sx={{ 
            borderRadius: 4, 
            overflow: 'hidden', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff'
          }}>
            {/* Cabecera Principal Unificada */}
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
                  Declaración de Carga Horaria Asignada
                </Typography>
              </Box>
              {statusDisplay}
            </Box>

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
                    {loadingCarga ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : cargaLectivaAgrupada.length > 0 ? (
                      cargaLectivaAgrupada.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.codigo || '---'}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.nombre}</TableCell>
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
              <FormularioCargaNoLectiva 
                docenteId={docente?.id || docenteProp?.docenteId || docenteProp?.id}
                cicloId={Number(selectedCiclo)}
                dedicacionTotal={dedicacionTotalHoras}
                horasLectivas={totalHorasLectivas}
                docenteData={{
                  ...docente,
                  facultad: facultadMostrar,
                  departamento: departamentoMostrar,
                  condicion: condicionMostrar,
                  categoria: categoriaMostrarUpper,
                  modalidad: modalidadMostrar,
                  nombreCompleto: nombreCompletoMostrar
                }}
                cicloData={ciclos.find(c => c.id === Number(selectedCiclo))}
                cargaLectivaAgrupada={cargaLectivaAgrupada}
                onStatusChange={(status) => setCurrentStatus(status)}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
