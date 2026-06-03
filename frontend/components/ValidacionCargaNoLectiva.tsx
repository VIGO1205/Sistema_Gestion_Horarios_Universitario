'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Avatar,
  IconButton,
  TextField as MuiTextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Collapse,
  Grid,
  Divider,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ValidatedIcon,
  Pending as PendingIcon,
  EditNote as DraftIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Tune as FilterIcon,
  DeleteSweep as ResetIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  School as SchoolIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import FormularioCargaNoLectiva from './FormularioCargaNoLectiva';

interface ValidacionCargaNoLectivaProps {
  cicloId: number;
}

export default function ValidacionCargaNoLectiva({ cicloId }: ValidacionCargaNoLectivaProps) {
  const [loading, setLoading] = useState(true);
  const [cargas, setCargas] = useState<any[]>([]);
  const [filteredCargas, setFilteredCargas] = useState<any[]>([]);
  const [selectedCarga, setSelectedCarga] = useState<any>(null);
  const [openReview, setOpenReview] = useState(false);
  const [cicloData, setCicloData] = useState<any>(null);
  const [lectivaData, setLectivaData] = useState<{ agrupada: any[], total: number }>({ agrupada: [], total: 0 });
  const [loadingReview, setLoadingReview] = useState(false);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    nombre: '',
    estado: 'todos',
    dedicacion: 'todos',
  });

  useEffect(() => {
    if (cicloId) {
      fetchCargas();
      fetchCicloData();
    }
  }, [cicloId]);

  useEffect(() => {
    applyFilters();
  }, [cargas, filtros]);

  const fetchCargas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/carga-no-lectiva', { params: { cicloId } });
      setCargas(res.data || []);
    } catch (error) {
      console.error('Error fetching cargas no lectivas:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...cargas];
    
    if (filtros.nombre) {
      result = result.filter(c => 
        c.docente?.nombreCompleto.toLowerCase().includes(filtros.nombre.toLowerCase())
      );
    }
    
    if (filtros.estado !== 'todos') {
      result = result.filter(c => c.estado === filtros.estado);
    }
    
    if (filtros.dedicacion !== 'todos') {
      result = result.filter(c => c.docente?.dedicacion === filtros.dedicacion);
    }
    
    setFilteredCargas(result);
  };

  const resetFilters = () => {
    setFiltros({
      nombre: '',
      estado: 'todos',
      dedicacion: 'todos',
    });
  };

  const fetchCicloData = async () => {
    try {
      const res = await api.get(`/ciclos/${cicloId}`);
      setCicloData(res.data);
    } catch (error) {
      console.error('Error fetching ciclo data:', error);
    }
  };

  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const handleReview = async (carga: any) => {
    setSelectedCarga(carga);
    setOpenReview(true);
    setLoadingReview(true);
    
    try {
      const res = await api.get(`/docentes/${carga.docenteId}/cursos`, {
        params: { cicloId },
      });
      const lectiva = res.data || [];
      
      // Agrupar igual que en CargaAcademicaDocente
      const grupos: Record<string, any> = {};
      lectiva.forEach((item: any) => {
        const key = item.cursoId.toString();
        if (!grupos[key]) {
          grupos[key] = {
            codigo: item.curso?.codigo,
            nombre: item.curso?.nombre,
            ciclo: item.curso?.cicloAcademico,
            seccion: item.grupos?.[0]?.nombre || 'A',
            horasT: 0, gruposT: 0, horasP: 0, gruposP: 0, horasL: 0, gruposL: 0, totalHoras: 0,
          };
        }
        const horas = Number(item.horasSemanales || 0);
        const numGrupos = (item.grupos || []).length;
        const tipo = item.tipoClase?.toLowerCase();
        const horasUnitarias = numGrupos > 0 ? horas / numGrupos : horas;

        if (tipo === 'teoria') { grupos[key].horasT = horasUnitarias; grupos[key].gruposT += numGrupos; }
        else if (tipo === 'practica') { grupos[key].horasP = horasUnitarias; grupos[key].gruposP += numGrupos; }
        else if (tipo === 'laboratorio') { grupos[key].horasL = horasUnitarias; grupos[key].gruposL += numGrupos; }
        grupos[key].totalHoras += horas;
      });

      const totalH = lectiva.reduce((sum: number, item: any) => sum + Number(item.horasSemanales || 0), 0);
      setLectivaData({ agrupada: Object.values(grupos), total: totalH });
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoadingReview(false);
    }
  };

  const getDedicacionHoras = (dedicacion: string) => {
    if (!dedicacion) return 0;
    const match = dedicacion.match(/\d+/);
    if (match) return parseInt(match[0]);
    if (dedicacion.toUpperCase().includes('EXCLUSIVA')) return 40;
    return 0;
  };

  const getStatusChip = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'validado':
        return <Chip size="small" icon={<ValidatedIcon />} label="VALIDADO" color="success" sx={{ fontWeight: 800 }} />;
      case 'pendiente':
        return <Chip size="small" icon={<PendingIcon />} label="PENDIENTE" color="warning" sx={{ fontWeight: 800 }} />;
      default:
        return <Chip size="small" icon={<DraftIcon />} label="BORRADOR" sx={{ fontWeight: 800 }} />;
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      {/* Filtros Estilo CRUD Docentes */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <MuiTextField
              fullWidth
              size="small"
              label="Buscar Docente por Nombre"
              placeholder="Escribe el nombre del docente..."
              value={filtros.nombre}
              onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={resetFilters}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  color: '#666',
                  borderColor: '#ddd',
                  textTransform: 'none'
                }}
              >
                Limpiar
              </Button>
              <Button
                fullWidth
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  bgcolor: showFilters ? '#003366' : 'transparent',
                  color: showFilters ? 'white' : '#003366',
                  borderColor: '#003366',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: showFilters ? '#002244' : 'rgba(0, 51, 102, 0.04)',
                    borderColor: '#003366'
                  }
                }}
              >
                Filtros
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Collapse in={showFilters}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado de Declaración</InputLabel>
                    <Select
                      value={filtros.estado}
                      label="Estado de Declaración"
                      onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                    >
                      <MenuItem value="todos">Todos los estados</MenuItem>
                      <MenuItem value="borrador">Borrador</MenuItem>
                      <MenuItem value="pendiente">Pendiente</MenuItem>
                      <MenuItem value="validado">Validado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Dedicación</InputLabel>
                    <Select
                      value={filtros.dedicacion}
                      label="Dedicación"
                      onChange={(e) => setFiltros({ ...filtros, dedicacion: e.target.value })}
                    >
                      <MenuItem value="todos">Todas las dedicaciones</MenuItem>
                      <MenuItem value="TIEMPO COMPLETO 40 H">Tiempo Completo 40H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 20 H">Tiempo Parcial 20H</MenuItem>
                      <MenuItem value="DEDICACION EXCLUSIVA">Dedicación Exclusiva</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 800, color: '#003366' }}>DOCENTE</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#003366' }}>DEDICACIÓN</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#003366' }}>H. NO LECTIVAS</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#003366' }}>ESTADO</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#003366' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCargas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography color="textSecondary">No se han encontrado declaraciones con los filtros aplicados.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCargas.map((carga) => {
                const totalH = Number(carga.horasPreparacion || 0) + 
                               Number(carga.horasTutoria || 0) + 
                               Number(carga.horasInvestigacion || 0) + 
                               Number(carga.horasCapacitacion || 0) + 
                               Number(carga.horasGobierno || 0) + 
                               Number(carga.horasAdministracion || 0) + 
                               Number(carga.horasAsesoria || 0) + 
                               Number(carga.horasResponsabilidadSocial || 0) + 
                               Number(carga.horasComites || 0);

                return (
                  <TableRow key={carga.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#003366', width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{carga.docente?.nombreCompleto}</Typography>
                          <Typography variant="caption" color="textSecondary">{carga.docente?.departamento}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={carga.docente?.dedicacion || 'N/A'} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 800, color: '#0369a1' }}>{Math.round(totalH)} H</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(carga.estado)}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => handleReview(carga)}
                        sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de Revisión */}
      <Dialog
        open={openReview}
        onClose={() => setOpenReview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#003366', 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Revisión de Carga Académica: {selectedCarga?.docente?.nombreCompleto}
          </Typography>
          <IconButton onClick={() => setOpenReview(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          {loadingReview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : selectedCarga && (
            <Box sx={{ p: 4 }}>
              <Grid container spacing={3}>
                {/* Datos Situación Profesor */}
                <Grid item xs={12}>
                  <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <Box sx={{ p: 2, bgcolor: '#003366', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        Datos sobre la situación del profesor
                      </Typography>
                    </Box>
                    <Box sx={{ p: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>FACULTAD</Typography>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>{selectedCarga.docente?.facultad || 'INGENIERÍA'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>DPTO. ACADÉMICO</Typography>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>{selectedCarga.docente?.departamento || 'INGENIERÍA DE SISTEMAS'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>NOMBRE COMPLETO</Typography>
                          <Typography sx={{ fontWeight: 800, color: '#003366' }}>{selectedCarga.docente?.nombreCompleto?.toUpperCase()}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>CONDICIÓN / CATEGORÍA</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={((selectedCarga.docente?.condicion || selectedCarga.docente?.tipoContrato) ?? 'SIN CONDICIÓN').toString().toUpperCase()} 
                              size="small" 
                              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }} 
                            />
                            <Chip 
                              label={selectedCarga.docente?.categoria || 'SIN CATEGORÍA'} 
                              size="small" 
                              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }} 
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>DEDICACIÓN</Typography>
                          <Typography sx={{ fontWeight: 800, color: '#003366' }}>{selectedCarga.docente?.dedicacion?.toUpperCase() || '---'}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>

                {/* Tabla de Trabajo Lectivo (Igual que el docente) */}
                <Grid item xs={12}>
                  <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <Box sx={{ p: 2, bgcolor: '#003366', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                        1. TRABAJO LECTIVO.- Datos completos y con claridad
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>CÓDIGO</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>CURSO</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>SECC.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>H.T.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>H.P.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>H.L.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.7rem' }}>TOTAL</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {lectivaData.agrupada.length > 0 ? lectivaData.agrupada.map((item, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.codigo || '---'}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.nombre || '---'}</TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.seccion || 'A'}</TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.7rem' }}>{item.horasT > 0 ? `${Math.round(item.horasT)}x${item.gruposT}` : '-'}</TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.7rem' }}>{item.horasP > 0 ? `${Math.round(item.horasP)}x${item.gruposP}` : '-'}</TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.7rem' }}>{item.horasL > 0 ? `${Math.round(item.horasL)}x${item.gruposL}` : '-'}</TableCell>
                              <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#003366' }}>{Math.round(item.totalHoras)}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={7} align="center" sx={{ py: 2 }}>
                                <Typography variant="caption" color="textSecondary">Sin carga lectiva asignada</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

                {/* Formulario Carga No Lectiva (En modo ReadOnly) */}
                <Grid item xs={12}>
                  <FormularioCargaNoLectiva
                    docenteId={selectedCarga.docenteId}
                    cicloId={cicloId}
                    dedicacionTotal={getDedicacionHoras(selectedCarga.docente?.dedicacion)}
                    horasLectivas={lectivaData.total}
                    docenteData={selectedCarga.docente}
                    cicloData={cicloData}
                    cargaLectivaAgrupada={lectivaData.agrupada}
                    readOnly={true}
                    onStatusChange={() => {
                      fetchCargas();
                      setOpenReview(false);
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
