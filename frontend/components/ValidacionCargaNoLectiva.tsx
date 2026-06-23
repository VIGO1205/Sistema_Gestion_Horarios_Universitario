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
  School as SchoolIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getLimitesReglamento } from '@/lib/reglamento-utils';
import FormularioCargaNoLectiva from './FormularioCargaNoLectiva';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

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
  const [stepReview, setStepReview] = useState<'carga' | 'filial'>('carga');
  const [horasAdicionalesReview, setHorasAdicionalesReview] = useState(0);
  const [horasNoLectivasReview, setHorasNoLectivasReview] = useState(0);
  const [filialData, setFilialData] = useState<any>(null);
  const [loadingFilial, setLoadingFilial] = useState(false);
  const FILIALES = ['Filial Valle Jequetepeque', 'Filial Huamachuco', 'Filial Santiago de Chuco'];
  
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
    setStepReview('carga');
    setFilialData(null);
    setHorasAdicionalesReview(0);
    
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

      // Precargar filial data inmediatamente para las barras de progreso
      const tieneFilial = carga.docente?.dependencias?.some((d: string) => FILIALES.includes(d));
      if (tieneFilial) {
        try {
          const filialRes = await api.get('/asignacion-filial', {
            params: { docenteId: carga.docenteId, cicloId: selectedCicloId },
          });
          const filial = filialRes.data || null;
          setFilialData(filial);
          if (filial?.cursos) {
            const total = filial.cursos.reduce((sum: number, c: any) => sum + Math.round(c.totalHorasSemanales || 0), 0);
            setHorasAdicionalesReview(total);
          }
        } catch (err) {
          console.error('Error fetching filial data on review open:', err);
        }
      }
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

  const esFilialReview = selectedCarga?.docente?.dependencias?.some((d: string) => FILIALES.includes(d)) || false;

  useEffect(() => {
    if (stepReview === 'filial' && selectedCarga && esFilialReview && !filialData) {
      setLoadingFilial(true);
      api.get('/asignacion-filial', {
        params: { docenteId: selectedCarga.docenteId, cicloId: selectedCicloId },
      }).then((res) => {
        setFilialData(res.data || null);
      }).catch((err) => {
        console.error('Error fetching filial data:', err);
      }).finally(() => {
        setLoadingFilial(false);
      });
    }
  }, [stepReview, selectedCarga, selectedCicloId, esFilialReview, filialData]);

  useEffect(() => {
    if (filialData?.cursos) {
      const total = filialData.cursos.reduce((sum: number, c: any) => sum + Math.round(c.totalHorasSemanales || 0), 0);
      setHorasAdicionalesReview(total);
    }
  }, [filialData]);

  const handleAdminStatusChange = async (newStatus: string) => {
    if (!selectedCarga?.id) return;
    try {
      await api.patch(`/carga-no-lectiva/${selectedCarga.id}/estado`, { estado: newStatus });
      setSelectedCarga((prev: any) => ({ ...prev, estado: newStatus }));
      fetchCargas();
      MySwal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      MySwal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al cambiar estado' });
    }
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
    const limites = getLimitesReglamento(docente);
    return {
      min: limites.chl.min,
      max: limites.chl.max ?? 0,
      topeDiario: 8,
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
                      <MenuItem value="DOCENTE INVESTIGADOR">Docente Investigador</MenuItem>
                      <MenuItem value="DEDICACION EXCLUSIVA">Dedicación Exclusiva</MenuItem>
                      <MenuItem value="TIEMPO COMPLETO">Tiempo Completo</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 20 H">Tiempo Parcial 20H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 16 H">Tiempo Parcial 16H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 12 H">Tiempo Parcial 12H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 10 H">Tiempo Parcial 10H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 08 H">Tiempo Parcial 08H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 06 H">Tiempo Parcial 06H</MenuItem>
                      <MenuItem value="TIEMPO PARCIAL 04 H">Tiempo Parcial 04H</MenuItem>
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
                                Number(carga.horasComites || 0) +
                                Number(carga.horasAaep || 0) +
                                Number(carga.horasAaai || 0);

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
                          <Typography variant="caption" color="textSecondary">{carga.docente?.departamentoAcademico}</Typography>
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
                              <Typography sx={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{selectedCarga.docente?.departamentoAcademico || 'INGENIERÍA DE SISTEMAS'}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', minWidth: 100, textAlign: 'right' }}>CONDICIÓN:</Typography>
                              <Chip 
                                label={(selectedCarga.docente?.condicion ?? 'NOMBRADO').toString().toUpperCase()} 
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
                                <Typography sx={{ fontSize: '1rem', color: '#003366', fontWeight: 800 }}>{selectedCarga.docente?.dedicacion?.toUpperCase() || 'TIEMPO COMPLETO'}</Typography>
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
                          DECLARACION DE LA CARGA ACADEMICA DOCENTE (F01-CAD)
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

                      {/* Step content */}
                      {stepReview === 'carga' && (
                        <FormularioCargaNoLectiva
                          docenteId={selectedCarga.docenteId}
                          cicloId={selectedCicloId}
                          dedicacionTotal={getDedicacionHoras(selectedCarga.docente?.dedicacion)}
                          horasLectivas={lectivaData.total}
                          docenteData={{
                            ...selectedCarga.docente,
                            facultad: selectedCarga.docente?.facultad || 'INGENIERÍA',
                            departamentoAcademico: selectedCarga.docente?.departamentoAcademico || 'INGENIERÍA DE SISTEMAS',
                            condicion: (selectedCarga.docente?.condicion ?? 'NOMBRADO').toString().toUpperCase(),
                            categoria: (selectedCarga.docente?.categoria || 'PRINCIPAL').toUpperCase(),
                            modalidad: selectedCarga.docente?.dedicacion?.toUpperCase() || 'TIEMPO COMPLETO',
                            nombreCompleto: selectedCarga.docente?.nombreCompleto
                          }}
                          cicloData={cicloData}
                          cargaLectivaAgrupada={lectivaData.agrupada}
                          readOnly={true}
                          onStatusChange={() => { fetchCargas(); }}
                          esFilial={esFilialReview}
                          hideEnviarButton={true}
                          horasAdicionales={horasAdicionalesReview}
                          onHorasNoLectivasChange={setHorasNoLectivasReview}
                          hideAdminActions={true}
                        />
                      )}

                      {esFilialReview && stepReview === 'filial' && (
                        <Box>
                          {loadingFilial ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                          ) : filialData?.cursos?.length > 0 ? (
                            <>
                              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f1f5f9', borderRadius: 2, mb: 3 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>#</TableCell>
                                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>NOMBRE DEL CURSO</TableCell>
                                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>DEPENDENCIA</TableCell>
                                      <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>HORARIO</TableCell>
                                      <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>TOTAL HRS.</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {filialData.cursos.map((curso: any, idx: number) => {
                                      const horariosStr = (curso.horarioSemanal || []).map((h: any) => `${h.dia} ${h.horaInicio}-${h.horaFin}`).join(', ');
                                      return (
                                        <TableRow key={curso.id || idx} hover>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{idx + 1}</TableCell>
                                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{curso.nombre}</TableCell>
                                          <TableCell sx={{ fontSize: '0.8rem' }}>{curso.dependencia}</TableCell>
                                          <TableCell sx={{ fontSize: '0.8rem' }}>{horariosStr}</TableCell>
                                          <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', fontSize: '0.9rem' }}>{Math.round(curso.totalHorasSemanales)} H</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#003366' }}>
                                  Total Horas Adicionales: {filialData.cursos.reduce((sum: number, c: any) => sum + Math.round(c.totalHorasSemanales || 0), 0)} H
                                </Typography>
                              </Box>
                            </>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                              <Typography sx={{ fontWeight: 600 }}>Sin carga adicional registrada</Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Progress bars (solo en step filial para evitar duplicado) */}
                      {esFilialReview && stepReview === 'filial' && (() => {
                        const hLect = Math.round(lectivaData.total);
                        const hNoLect = Math.round(horasNoLectivasReview);
                        const hAdic = Math.round(horasAdicionalesReview);
                        const totalGral = hLect + hNoLect + hAdic;
                        const jornada = getDedicacionHoras(selectedCarga?.docente?.dedicacion);
                        return (
                        <Box sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                            <Box sx={{ display: 'flex', gap: 4 }}>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Lectivas</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#003366' }}>{hLect} H</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas No Lectivas</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0369a1' }}>{hNoLect} H</Typography>
                              </Box>
                              {esFilialReview && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Adicionales</Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#d97706' }}>{hAdic} H</Typography>
                              </Box>
                              )}
                              <Divider orientation="vertical" flexItem />
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Total General</Typography>
                                <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#1e293b' }}>{totalGral} / {jornada} H</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                              <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#003366' }}>
                                {Math.min(100, Math.round((totalGral / (jornada || 40)) * 100))}%
                              </Typography>
                            </Box>
                          </Box>
                          {/* Barra 1: Jornada */}
                          <Box sx={{ mb: 3 }}>
                            <Box sx={{ width: '100%', height: 16, bgcolor: '#e2e8f0', borderRadius: 8, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                              <Box sx={{ width: `${Math.min((hLect / (jornada || 40)) * 100, 100)}%`, height: '100%', bgcolor: '#003366', transition: 'width 0.5s ease-in-out' }} />
                              <Box sx={{ width: `${Math.min((hNoLect / (jornada || 40)) * 100, Math.max(0, 100 - (hLect / (jornada || 40)) * 100))}%`, height: '100%', bgcolor: '#0369a1', transition: 'width 0.5s ease-in-out' }} />
                            </Box>
                          </Box>
                          {/* Barra 2: Horas Adicionales */}
                          {esFilialReview && (
                          <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                              <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: hAdic > 10 ? '#dc2626' : '#d97706' }}>
                                {Math.min(100, Math.round((hAdic / 10) * 100))}%
                              </Typography>
                            </Box>
                            <Box sx={{ width: '100%', height: 16, bgcolor: '#e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                              <Box sx={{ width: `${Math.min((hAdic / 10) * 100, 100)}%`, height: '100%', bgcolor: hAdic > 10 ? '#dc2626' : '#d97706', transition: 'width 0.5s ease-in-out', borderRadius: 8 }} />
                            </Box>
                          </Box>
                          )}
                          {/* Leyenda */}
                          <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 12, height: 12, bgcolor: '#003366', borderRadius: '50%' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga Lectiva</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 12, height: 12, bgcolor: '#0369a1', borderRadius: '50%' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga No Lectiva</Typography>
                            </Box>
                            {esFilialReview && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 12, height: 12, bgcolor: '#d97706', borderRadius: '50%' }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Horas Adicionales</Typography>
                            </Box>
                            )}
                          </Box>
                        </Box>
                        );
                      })()}

                      {/* Navigation + Action buttons */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {stepReview === 'filial' && (
                            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setStepReview('carga')}
                              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3, borderColor: '#003366', color: '#003366' }}>
                              Atrás
                            </Button>
                          )}
                          {esFilialReview && stepReview === 'carga' && (
                            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => setStepReview('filial')}
                              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3, bgcolor: '#003366', color: '#fff', '&:hover': { bgcolor: '#002244' } }}>
                              Siguiente
                            </Button>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {selectedCarga?.estado !== 'validado' && selectedCarga?.estado !== 'finalizado' && (
                            <Button variant="contained" color="success" startIcon={<ValidatedIcon />}
                              onClick={() => handleAdminStatusChange('validado')}
                              sx={{ borderRadius: 2, px: 4, fontWeight: 800, textTransform: 'none' }}>
                              Validar Carga
                            </Button>
                          )}
                          {selectedCarga?.estado !== 'borrador' && (
                            <Button variant="outlined" color="error" startIcon={<DraftIcon />}
                              onClick={() => handleAdminStatusChange('borrador')}
                              sx={{ borderRadius: 2, px: 4, fontWeight: 800, textTransform: 'none' }}>
                              {selectedCarga?.estado === 'finalizado' ? 'Anular Firma / Devolver' : 'Observar / Devolver'}
                            </Button>
                          )}
                        </Box>
                      </Box>
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
