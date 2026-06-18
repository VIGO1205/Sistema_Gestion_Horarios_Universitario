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
  Tooltip,
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
  TablePagination,
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
  Assignment as AssignmentIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import FormularioCargaNoLectiva from './FormularioCargaNoLectiva';

interface ValidacionCargaNoLectivaProps {
  cicloId: number;
}

export default function ValidacionCargaNoLectiva({ cicloId: initialCicloId }: ValidacionCargaNoLectivaProps) {
  const [loading, setLoading] = useState(true);
  const [cargas, setCargas] = useState<any[]>([]);
  const [filteredCargas, setFilteredCargas] = useState<any[]>([]);
  const [selectedCarga, setSelectedCarga] = useState<any>(null);
  const [openReview, setOpenReview] = useState(false);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [selectedCicloId, setSelectedCicloId] = useState<number>(initialCicloId);
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

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCicloId) {
      fetchCargas();
      fetchCicloData();
    }
  }, [selectedCicloId]);

  useEffect(() => {
    applyFilters();
    setPage(0); // Resetear a primera página al filtrar
  }, [cargas, filtros]);

  const fetchInitialData = async () => {
    try {
      const res = await api.get('/ciclos');
      setCiclos(res.data || []);
    } catch (error) {
      console.error('Error fetching ciclos:', error);
    }
  };

  const fetchCargas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/carga-no-lectiva', { params: { cicloId: selectedCicloId } });
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
      const res = await api.get(`/ciclos/${selectedCicloId}`);
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
        params: { cicloId: selectedCicloId },
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

  const getStatusChipColor = (estado: string) => {
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

  const formatEnumText = (text: string | null | undefined): string => {
    if (!text) return 'Sin especificar';
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLimitesCargaDocente = (docente: any) => {
    let minHoras = 0;
    let maxHoras = 0;
    const dedicacion = (docente?.dedicacion || '').toUpperCase();

    // 1. Determinar límites por dedicación
    if (dedicacion.includes('EXCLUSIVA') || dedicacion.includes('40') || dedicacion.includes('TIEMPO COMPLETO')) {
      maxHoras = 22;
      minHoras = 16;
    } else if (dedicacion.includes('20') || dedicacion.includes('TP1')) {
      maxHoras = 20;
      minHoras = 12;
    } else if (dedicacion.includes('10') || dedicacion.includes('TP2')) {
      maxHoras = 10;
      minHoras = 8;
    } else if (dedicacion.includes('8') || dedicacion.includes('TP3')) {
      maxHoras = 8;
      minHoras = 8;
    }

    // 2. Ajustar por cargos administrativos
    const cargo = (docente?.cargoAdministrativo || docente?.cargo || '').toUpperCase();
    if (cargo.includes('RECTOR') || cargo.includes('VICERRECTOR')) {
      minHoras = 0;
      maxHoras = 0;
    } else if (cargo.includes('DECANO') || cargo.includes('DIRECTOR DE POSTGRADO')) {
      minHoras = 6;
    } else if (cargo.includes('DIRECTOR DE ESCUELA') || cargo.includes('DIRECTOR DE DEPARTAMENTO')) {
      minHoras = 10;
    } else if (cargo.includes('DIRECTOR DE FILIAL')) {
      minHoras = 8;
    }

    return {
      min: minHoras,
      max: maxHoras,
      topeDiario: 8
    };
  };

  const getStatusChip = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'validado':
        return <Chip size="small" icon={<ValidatedIcon />} label="VALIDADO" color="success" sx={{ fontWeight: 800 }} />;
      case 'finalizado':
        return <Chip size="small" icon={<ValidatedIcon />} label="FINALIZADO" color="primary" sx={{ fontWeight: 800, bgcolor: '#003366' }} />;
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

  // Calcular KPIs
  const stats = {
    total: cargas.length,
    pendientes: cargas.filter(c => c.estado === 'pendiente').length,
    validados: cargas.filter(c => c.estado === 'validado').length,
    finalizados: cargas.filter(c => c.estado === 'finalizado').length,
    borradores: cargas.filter(c => c.estado === 'borrador' || !c.estado).length,
  };

  const progresoGlobal = stats.total > 0 ? Math.round((stats.finalizados / stats.total) * 100) : 0;

  const KPICard = ({ title, value, icon, color, bg, subtitle }: any) => (
    <Paper elevation={0} sx={{ 
      p: 2.5, 
      borderRadius: 4, 
      border: `1px solid ${color}20`,
      bgcolor: bg || 'white',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: '100%',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 10px 20px ${color}15`
      }
    }}>
      <Box sx={{ 
        p: 1.5, 
        borderRadius: 3, 
        bgcolor: `${color}15`, 
        color: color,
        display: 'flex'
      }}>
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: color }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box>
      {/* KPIs Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard 
            title="Total Cargas" 
            value={stats.total} 
            icon={<AssignmentIcon fontSize="large" />} 
            color="#003366"
            bg="#f8fafc"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard 
            title="Borradores" 
            value={stats.borradores} 
            icon={<DraftIcon fontSize="large" />} 
            color="#64748b"
            bg="#f8fafc"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard 
            title="Pendientes" 
            value={stats.pendientes} 
            icon={<PendingIcon fontSize="large" />} 
            color="#ca8a04"
            bg="#fefce8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard 
            title="Validados" 
            value={stats.validados} 
            icon={<ValidatedIcon fontSize="large" />} 
            color="#16a34a"
            bg="#f0fdf4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard 
            title="Progreso" 
            value={`${progresoGlobal}%`} 
            subtitle={`${stats.finalizados} Finalizados`}
            icon={<ValidatedIcon fontSize="large" />} 
            color="#003366"
            bg="#e0f2fe"
          />
        </Grid>
      </Grid>

      {/* Filtros Estilo CRUD Docentes */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Periodo</InputLabel>
              <Select
                value={selectedCicloId}
                label="Periodo"
                onChange={(e) => setSelectedCicloId(Number(e.target.value))}
                sx={{ borderRadius: 2 }}
              >
                {ciclos.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              <InputLabel>Estado de la Carga Académica</InputLabel>
              <Select
                value={filtros.estado}
                label="Estado de la Carga Académica"
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              >
                <MenuItem value="todos">Todos los estados</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="validado">Validado</MenuItem>
                <MenuItem value="finalizado">Finalizado</MenuItem>
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

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', overflow: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: { xs: 600, md: 800 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>DOCENTE</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>DEDICACIÓN</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>HORAS LECTIVAS</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>HORAS NO LECTIVAS</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>HORAS TOTALES</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>ESTADO</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: 'white', whiteSpace: 'nowrap' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCargas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="textSecondary">No se han encontrado declaraciones con los filtros aplicados.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCargas
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((carga) => {
                const totalNoLectiva = Number(carga.horasPreparacion || 0) + 
                               Number(carga.horasTutoria || 0) + 
                               Number(carga.horasInvestigacion || 0) + 
                               Number(carga.horasCapacitacion || 0) + 
                               Number(carga.horasGobierno || 0) + 
                               Number(carga.horasAdministracion || 0) + 
                               Number(carga.horasAsesoria || 0) + 
                               Number(carga.horasResponsabilidadSocial || 0) + 
                               Number(carga.horasComites || 0);

                const totalLectiva = (carga.docente?.asignaciones || [])
                  .reduce((sum: number, a: any) => sum + Number(a.horasSemanales || 0), 0);
                const totalGeneral = totalNoLectiva + totalLectiva;

                return (
                  <TableRow key={carga.id || `virtual-${carga.docenteId}`} hover sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 250 }}>
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
                      <Chip label={carga.docente?.dedicacion || 'N/A'} size="small" variant="outlined" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} />
                    </TableCell>
                    <TableCell align="center">
                      {(() => {
                        const limites = getLimitesCargaDocente(carga.docente);
                        const valido = totalLectiva <= limites.max && totalLectiva >= limites.min;
                        return (
                          <Typography 
                            sx={{ fontWeight: 800, color: valido ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}
                          >
                            {Math.round(totalLectiva)} H
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 800, color: '#0369a1', cursor: 'help', whiteSpace: 'nowrap' }}>
                        {Math.round(totalNoLectiva)} H
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 800, color: '#0369a1', cursor: 'help', whiteSpace: 'nowrap' }}>
                        {Math.round(totalGeneral)} H
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {getStatusChip(carga.estado)}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => handleReview(carga)}
                        sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap' }}
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
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCargas.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={window.innerWidth < 600 ? "" : "Filas por página"}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{
            '.MuiTablePagination-selectLabel': { display: { xs: 'none', sm: 'block' } },
            '.MuiTablePagination-input': { display: { xs: 'none', sm: 'flex' } }
          }}
        />
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
            Revisión de la Carga Académica: {selectedCarga?.docente?.nombreCompleto}
          </Typography>
          <IconButton onClick={() => setOpenReview(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#f1f5f9' }}>
          {loadingReview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : selectedCarga && (
            <Box sx={{ p: 4 }}>
              <Grid container spacing={4}>
                {/* Datos Situación Profesor */}
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
                              <Typography sx={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{selectedCarga.docente?.facultad || 'INGENIERÍA'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 140 }}>DPTO. ACADÉMICO:</Typography>
                              <Typography sx={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{selectedCarga.docente?.departamento || 'INGENIERÍA DE SISTEMAS'}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 100, textAlign: 'right' }}>CONDICIÓN:</Typography>
                              <Chip 
                                label={((selectedCarga.docente?.condicion || selectedCarga.docente?.tipoContrato) ?? 'NOMBRADO').toString().toUpperCase()} 
                                size="small" 
                                sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, borderRadius: 1, minWidth: 100 }} 
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 100, textAlign: 'right' }}>CATEGORÍA:</Typography>
                              <Chip 
                                label={(selectedCarga.docente?.categoria || 'PRINCIPAL').toUpperCase()} 
                                size="small" 
                                sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, borderRadius: 1, minWidth: 100 }} 
                              />
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase' }}>Nombre Completo</Typography>
                                <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{selectedCarga.docente?.nombreCompleto?.toUpperCase()}</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase' }}>Modalidad de Dedicación</Typography>
                                <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{selectedCarga.docente?.dedicacion?.toUpperCase() || 'TIEMPO COMPLETO 40 H'}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase' }}>Periodo Académico</Typography>
                              <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{cicloData?.nombre || '---'}</Typography>
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
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        bgcolor: getStatusChipColor(selectedCarga.estado).bg, 
                        px: 2, 
                        py: 0.5, 
                        borderRadius: 2, 
                        border: `1px solid ${getStatusChipColor(selectedCarga.estado).color}40` 
                      }}>
                        <Typography sx={{ fontWeight: 900, color: getStatusChipColor(selectedCarga.estado).color, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          {getStatusChipColor(selectedCarga.estado).label}
                        </Typography>
                      </Box>
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
                            {lectivaData.agrupada.length > 0 ? (
                              lectivaData.agrupada.map((item, idx) => (
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
                                        h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{Math.round(item.horasT)}</Box>) 
                                        x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposT}</Box>)
                                      </Box>
                                    ) : '---'}
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                                    {item.horasP > 0 ? (
                                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                        h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{Math.round(item.horasP)}</Box>) 
                                        x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposP}</Box>)
                                      </Box>
                                    ) : '---'}
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontSize: '0.75rem' }}>
                                    {item.horasL > 0 ? (
                                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                        h.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{Math.round(item.horasL)}</Box>) 
                                        x g.(<Box component="span" sx={{ fontWeight: 800, color: '#003366' }}>{item.gruposL}</Box>)
                                      </Box>
                                    ) : '---'}
                                  </TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', fontSize: '0.9rem' }}>
                                    {Math.round(item.totalHoras)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                  <Typography variant="body2" color="textSecondary">Sin carga lectiva asignada</Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* 2. CARGA NO LECTIVA (Componente Integrado) */}
                      <FormularioCargaNoLectiva
                        docenteId={selectedCarga.docenteId}
                        cicloId={selectedCicloId}
                        dedicacionTotal={getDedicacionHoras(selectedCarga.docente?.dedicacion)}
                        horasLectivas={lectivaData.total}
                        docenteData={{
                          ...selectedCarga.docente,
                          facultad: selectedCarga.docente?.facultad || 'INGENIERÍA',
                          departamento: selectedCarga.docente?.departamento || 'INGENIERÍA DE SISTEMAS',
                          condicion: ((selectedCarga.docente?.condicion || selectedCarga.docente?.tipoContrato) ?? 'NOMBRADO').toString().toUpperCase(),
                          categoria: (selectedCarga.docente?.categoria || 'PRINCIPAL').toUpperCase(),
                          modalidad: selectedCarga.docente?.dedicacion?.toUpperCase() || 'TIEMPO COMPLETO 40 H',
                          nombreCompleto: selectedCarga.docente?.nombreCompleto
                        }}
                        cicloData={cicloData}
                        cargaLectivaAgrupada={lectivaData.agrupada}
                        readOnly={true}
                        onStatusChange={() => {
                          fetchCargas();
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
