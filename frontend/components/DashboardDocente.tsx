'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
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
  Tooltip,
  IconButton,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Person as PersonIcon,
  Book as BookIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as WaitIcon,
  PauseCircleFilled as PauseIcon,
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import api from '@/lib/api';

const rotateHourglass = keyframes`
  0% { transform: rotate(0deg); }
  45% { transform: rotate(0deg); }
  55% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
`;

const AnimatedWaitIcon = styled(WaitIcon)`
  animation: ${rotateHourglass} 3s infinite ease-in-out;
`;

interface DashboardDocenteProps {
  docente: any;
  estadoSeleccion: any;
  onEnterGrilla: (modoLectura: boolean) => void;
  ciclos: any[];
}

export default function DashboardDocente({
  docente: docenteProp,
  estadoSeleccion,
  onEnterGrilla,
  ciclos,
}: DashboardDocenteProps) {
  const [docente, setDocente] = useState(docenteProp);
  const [selectedCiclo, setSelectedCiclo] = useState<number | string>(
    ciclos.find((c) => c.esActual)?.id || ''
  );
  const [cargaLectiva, setCargaLectiva] = useState<any[]>([]);
  const [loadingCarga, setLoadingCarga] = useState(false);

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
      fetchCargaLectiva(id);
    }
  }, [selectedCiclo, docente?.id, docenteProp?.id]);

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
    const horasBase = Number(item.horasSemanales || 0);
    const numGrupos = item.grupos?.length || 1; // Si no hay grupos definidos, asumimos al menos 1
    return sum + (horasBase * numGrupos);
  }, 0);
  
  // Extraer el número de la dedicación (ej: "40 H" -> 40)
  const dedicacionTotalHoras = parseInt((docente?.dedicacion || docenteProp?.dedicacion || '40').match(/\d+/)?.[0] || '40');
  const porcentajeLectiva = Math.min(100, (totalHorasLectivas / dedicacionTotalHoras) * 100);

  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const getStatusInfo = () => {
    const estado = estadoSeleccion?.estado;
    const ventanaEstado = estadoSeleccion?.ventanaEstado;

    if (ventanaEstado === 'pausada') {
      return {
        icon: <PauseIcon sx={{ fontSize: 60, color: '#ed6c02' }} />,
        title: 'PROCESO PAUSADO',
        color: '#ed6c02',
        bg: '#fff7ed',
        msg: 'El administrador ha pausado el registro de horarios temporalmente.',
        canRegister: false,
      };
    }

    switch (estado) {
      case 'en_atencion':
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 60, color: '#166534' }} />,
          title: 'TU TURNO ESTÁ ACTIVO',
          color: '#166534',
          bg: '#f0fdf4',
          msg: 'Ya puedes registrar tu disponibilidad de horarios para este ciclo.',
          canRegister: true,
        };
      case 'en_espera':
        return {
          icon: <AnimatedWaitIcon sx={{ fontSize: 60, color: '#003366' }} />,
          title: 'EN ESPERA DE TURNO',
          color: '#003366',
          bg: '#f0f4f8',
          msg: 'Tu ventana de atención aún no inicia. Por favor, espera a que el cronómetro llegue a cero.',
          canRegister: false,
        };
      case 'finalizado':
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 60, color: '#64748b' }} />,
          title: 'REGISTRO COMPLETADO',
          color: '#64748b',
          bg: '#f8fafc',
          msg: 'Ya has finalizado tu proceso de registro para este periodo.',
          canRegister: false,
        };
      default:
        return {
          icon: <ErrorIcon sx={{ fontSize: 60, color: '#94a3b8' }} />,
          title: 'SIN VENTANA ASIGNADA',
          color: '#64748b',
          bg: '#f1f5f9',
          msg: 'Aún no se ha programado tu turno de atención para este ciclo.',
          canRegister: false,
        };
    }
  };

  const status = getStatusInfo();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Título Institucional */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: '#003366',
          mb: 4,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Carga Horaria - Declaración de Carga Horaria Asignada
      </Typography>

      <Grid container spacing={4} alignItems="stretch">
        {/* Columna Izquierda: Perfil y Estado */}
        <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 3, order: { xs: 1, md: 1 } }}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', flexGrow: 0 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: '#003366', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {nombreMostrar}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {contratoMostrar?.toUpperCase()} - {categoriaMostrar?.toUpperCase()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748b' }}>DEDICACIÓN:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#003366' }}>
                    {docente?.dedicacion || docenteProp?.dedicacion || 'TIEMPO COMPLETO 40 H'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748b' }}>DPTO. ACADÉMICO:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>Ingeniería de Sistemas</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748b' }}>FACULTAD:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>Ingeniería</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Panel de Estado y Ventana */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              bgcolor: status.bg,
              border: `1px solid ${status.color}20`,
              textAlign: 'center',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              order: { xs: 3, md: 2 }
            }}
          >
            <Box sx={{ mb: 2 }}>{status.icon}</Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: status.color, mb: 1 }}>
              {status.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 3, fontWeight: 500 }}>
              {status.msg}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={!status.canRegister}
                onClick={() => onEnterGrilla(false)}
                sx={{
                  bgcolor: status.color,
                  '&:hover': { bgcolor: status.color },
                  borderRadius: 3,
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Iniciar Registro de Horarios
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => onEnterGrilla(true)}
                sx={{
                  borderColor: '#003366',
                  color: '#003366',
                  '&:hover': { borderColor: '#002244', bgcolor: '#f0f4f8' },
                  borderRadius: 3,
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Ver Mis Horarios Existentes
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Columna Derecha: Trabajo Lectivo */}
        <Grid item xs={12} md={7} sx={{ display: 'flex', order: { xs: 2, md: 3 } }}>
          <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BookIcon sx={{ color: '#003366' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  TRABAJO LECTIVO - Detalle de Cursos Asignados
                </Typography>
              </Box>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Periodo</InputLabel>
                <Select
                  value={selectedCiclo}
                  label="Periodo"
                  onChange={(e) => setSelectedCiclo(e.target.value)}
                >
                  {ciclos.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ p: 3, flexGrow: 1 }}>
              {/* Barra de Progreso de Dedicación */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
                    CUMPLIMIENTO DE CARGA LECTIVA ({totalHorasLectivas}H de {dedicacionTotalHoras}H totales)
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366' }}>
                    {Math.round(porcentajeLectiva)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={porcentajeLectiva}
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#003366' } }}
                />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>CÓDIGO</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>CURSO</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569' }}>TIPO</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>GRUPO</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>TOTAL HRS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCarga ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : cargaLectiva.length > 0 ? (
                      cargaLectiva.map((item, idx) => {
                        const numGrupos = item.grupos?.length || 1;
                        const totalHorasItem = Number(item.horasSemanales || 0) * numGrupos;
                        
                        return (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{item.curso?.codigo || '---'}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{item.curso?.nombre}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.tipoClase?.toUpperCase()}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.65rem',
                                  bgcolor: item.tipoClase === 'teoria' ? '#eff6ff' : item.tipoClase === 'practica' ? '#fffbeb' : '#f0fdf4',
                                  color: item.tipoClase === 'teoria' ? '#1e40af' : item.tipoClase === 'practica' ? '#92400e' : '#166534',
                                }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                              {item.grupos && item.grupos.length > 0 
                                ? item.grupos.map((g: any) => numberToLetter(g.numeroGrupo)).join(', ')
                                : 'A'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#003366' }}>
                              {totalHorasItem}H
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
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

              <Box sx={{ mt: 'auto', pt: 3 }}>
                <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fef3c7' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                    Nota: La carga lectiva es asignada por el coordinador. La carga no lectiva deberá completarse según su plan de trabajo anual.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
