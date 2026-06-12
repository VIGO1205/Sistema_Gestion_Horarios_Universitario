'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Timer as TimerIcon,
  NotificationsActive as AlertIcon,
  Group as GroupIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarIcon,
  SkipNext as SkipIcon,
  MoreTime as MoreTimeIcon,
  Delete as DeleteIcon,
  StopCircle as StopIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  KeyboardDoubleArrowRight as ArrowRightIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { Edit as EditIcon } from '@mui/icons-material';
import PauseIcon from '@mui/icons-material/Pause';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import { format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';

export default function VentanasPage() {
  const { usuario, isValidating } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ventanas, setVentanas] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVentana, setSelectedVentana] = useState<any>(null);
  const [cola, setCola] = useState<any[]>([]);
  const [docenteEnAtencion, setDocenteEnAtencion] = useState<any>(null);
  const [docenteVisible, setDocenteVisible] = useState<any>(null);
  const [isFadingMonitor, setIsFadingMonitor] = useState(false);
  const [docentesCount, setDocentesCount] = useState<number>(0);
  const [nowMs, setNowMs] = useState(Date.now());

  // Estados para filtros
  const [cicloFiltroId, setCicloFiltroId] = useState<number | string>('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState('');

  // Estado para la paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isGestionAllowed = usuario?.rol === 'admin' || usuario?.rol === 'coordinador';
  const isAdmin = usuario?.rol === 'admin';

  const getProximaHoraValida = () => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0, 0, 0);

    // Ajustar al rango permitido: 07:00 - 13:00
    if (date.getHours() < 7) {
      date.setHours(7, 0, 0, 0);
    } else if (date.getHours() >= 13) {
      date.setDate(date.getDate() + 1);
      date.setHours(7, 0, 0, 0);
    }

    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const getDuracionTotalFormateada = () => {
    const totalMinutos = (docentesCount || 0) * formData.duracionMinutos;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h:${minutos < 10 ? '0' : ''}${minutos}min`;
  };

  const [formData, setFormData] = useState({
    cicloId: '',
    categoriaDocente: 'todos', // Ahora es global por defecto
    fechaHoraInicio: getProximaHoraValida(),
    fechaHoraFin: getProximaHoraValida(),
    duracionMinutos: 15, // Por defecto 15 minutos según requerimiento
  });

  const [editingVentana, setEditingVentana] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (openDialog) {
      updateDocenteCount(formData.categoriaDocente);
    }
  }, [formData.categoriaDocente, openDialog]);

  useEffect(() => {
    if (formData.fechaHoraInicio && formData.duracionMinutos) {
      calcularFinAutomatico();
    }
  }, [docentesCount, formData.fechaHoraInicio, formData.duracionMinutos]);

  useEffect(() => {
    if (!selectedVentana) return;

    // Refresco en tiempo real del monitor para transicionar al siguiente docente.
    const intervalId = setInterval(() => {
      fetchCola(selectedVentana);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [selectedVentana?.id]);

  useEffect(() => {
    const siguienteId = docenteEnAtencion?.id ?? null;
    const actualId = docenteVisible?.id ?? null;

    if (siguienteId === actualId) {
      if (docenteEnAtencion) {
        setDocenteVisible(docenteEnAtencion);
      }
      return;
    }

    if (!docenteVisible) {
      setDocenteVisible(docenteEnAtencion);
      return;
    }

    setIsFadingMonitor(true);
    const timeoutId = setTimeout(() => {
      setDocenteVisible(docenteEnAtencion);
      setIsFadingMonitor(false);
    }, 280);

    return () => clearTimeout(timeoutId);
  }, [docenteEnAtencion, docenteVisible]);

  useEffect(() => {
    if (!docenteEnAtencion?.finAtencion) {
      return;
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [docenteEnAtencion?.finAtencion]);

  const getTiempoRestante = (finAtencion: string | Date, pausadoEn?: string | Date | null) => {
    const fin = new Date(finAtencion).getTime();
    const ahora = pausadoEn ? new Date(pausadoEn).getTime() : nowMs;
    
    // Calculamos la diferencia exacta en milisegundos
    const diffMs = fin - ahora;
    
    // Usamos floor para mostrar los segundos completos, pero la base es de alta precisión (ms)
    const restanteSeg = Math.max(0, Math.floor(diffMs / 1000));

    const horas = Math.floor(restanteSeg / 3600);
    const minutos = Math.floor((restanteSeg % 3600) / 60);
    const segundos = restanteSeg % 60;

    const hh = String(horas).padStart(2, '0');
    const mm = String(minutos).padStart(2, '0');
    const ss = String(segundos).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  };

  const updateDocenteCount = async (categoria: string) => {
    try {
      const cicloIdParam = formData.cicloId ? `&cicloId=${formData.cicloId}` : '';
      const res = await api.get(`/ventanas/count-docentes?categoria=${categoria}${cicloIdParam}`);
      setDocentesCount(res.data.count || 0);
    } catch (error) {
      console.error('Error fetching docente count:', error);
      setDocentesCount(0);
    }
  };

  const calcularFinAutomatico = () => {
    try {
      const inicio = new Date(formData.fechaHoraInicio);
      if (isNaN(inicio.getTime())) return;

      const totalMinutos = (docentesCount || 0) * formData.duracionMinutos;
      const fin = new Date(inicio.getTime() + totalMinutos * 60000);

      const formattedFin = format(fin, "yyyy-MM-dd'T'HH:mm");
      if (formattedFin !== formData.fechaHoraFin) {
        setFormData(prev => ({
          ...prev,
          fechaHoraFin: formattedFin
        }));
      }
    } catch (error) {
      console.error('Error calculando fin:', error);
    }
  };

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [ciclosRes, ventanasRes] = await Promise.all([
        api.get('/ciclos'),
        api.get('/ventanas')
      ]);

      setCiclos(ciclosRes.data);
      setVentanas(ventanasRes.data);
      
      const actualCiclo = ciclosRes.data.find((c: any) => c.esActual) || ciclosRes.data[0];
      if (actualCiclo) {
        if (!formData.cicloId) setFormData(prev => ({ ...prev, cicloId: actualCiclo.id }));
        if (cicloFiltroId === '') setCicloFiltroId(actualCiclo.id);
      }

      // No resetear la selección si ya existe una válida
      if (selectedVentana) {
        const stillExists = ventanasRes.data.find((v: any) => v.id === selectedVentana.id);
        if (!stillExists) {
          setSelectedVentana(null);
          setCola([]);
          setDocenteEnAtencion(null);
          setDocenteVisible(null);
        } else {
          setSelectedVentana(stillExists);
        }
      }

      const actual = ciclosRes.data.find((c: any) => c.esActual) || ciclosRes.data[0];
      if (actual && !formData.cicloId) {
        setFormData(prev => ({ ...prev, cicloId: actual.id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchCola = async (ventana: any) => {
    try {
      const params = new URLSearchParams();
      if (ventana?.id) {
        params.set('ventanaId', ventana.id);
      } else {
        if (ventana?.tipoContrato && ventana.tipoContrato !== 'todos') {
          params.set('tipoContrato', ventana.tipoContrato);
        }
        if (ventana?.categoriaDocente && ventana.categoriaDocente !== 'todos') {
          params.set('categoria', ventana.categoriaDocente);
        }
      }

      const query = params.toString();
      const [colaRes, atencionRes] = await Promise.all([
        api.get(`/ventanas/cola${query ? `?${query}` : ''}`),
        api.get(`/ventanas/en-atencion${query ? `?${query}` : ''}`),
      ]);
      setCola(colaRes.data);
      setDocenteEnAtencion(atencionRes.data);
    } catch (error) {
      console.error('Error fetching cola:', error);
    }
  };

  const handleCreateVentana = async () => {
    if (docentesCount === 0) {
      Swal.fire('Atención', 'No hay docentes pendientes en la cola para programar.', 'warning');
      return;
    }

    if (formData.duracionMinutos < 5 || formData.duracionMinutos > 60) {
      Swal.fire('Atención', 'La duración por docente debe estar entre 5 y 60 minutos.', 'warning');
      return;
    }

    const ahora = new Date();
    const fechaInicio = new Date(formData.fechaHoraInicio);
    
    // Validación principal: Solo permitir fechas futuras (mínimo 1 minuto después de ahora)
    if (fechaInicio <= ahora) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha Inválida',
        text: 'La fecha de inicio debe ser posterior a la fecha y hora actual.',
        confirmButtonColor: '#003366',
      });
      return;
    }

    const hour = fechaInicio.getHours();
    if (hour < 7 || hour >= 13) {
      Swal.fire({
        icon: 'warning',
        title: 'Horario No Permitido',
        text: 'Las ventanas solo pueden programarse dentro del rango de atención institucional: 07:00 AM a 01:00 PM (13:00).',
        confirmButtonColor: '#003366',
      });
      return;
    }

    try {
      const payload = {
        cicloId: Number(formData.cicloId),
        fechaHoraInicio: formData.fechaHoraInicio,
        fechaHoraFin: formData.fechaHoraFin,
        duracionMinutos: Number(formData.duracionMinutos),
      };
      const res = await api.post('/ventanas', payload);
      setOpenDialog(false);
      setEditingVentana(null);
      fetchData();
      Swal.fire({
        icon: 'success',
        title: 'Ventana Creada',
        text: res.data?.message || 'La ventana de atención se ha programado correctamente.',
        confirmButtonColor: '#003366',
      });
    } catch (error) {
      console.error('Error creating ventana:', error);
      const message = (error as any)?.response?.data?.message || 'No se pudo crear la ventana';
      Swal.fire('Error', message, 'error');
    }
  };

  const openEditDialog = (ventana: any) => {
    setEditingVentana(ventana);
    setFormData({
      cicloId: ventana.ciclo?.id || ventana.cicloId || '',
      categoriaDocente: ventana.categoriaDocente || 'todos',
      fechaHoraInicio: format(new Date(ventana.fechaHoraInicio), "yyyy-MM-dd'T'HH:mm"),
      fechaHoraFin: format(new Date(ventana.fechaHoraFin), "yyyy-MM-dd'T'HH:mm"),
      duracionMinutos: ventana.duracionMinutos || 15,
    });
    setOpenDialog(true);
  };

  const handleUpdateVentana = async () => {
    if (!editingVentana) return;
    
    const ahora = new Date();
    const fechaInicio = new Date(formData.fechaHoraInicio);

    // Validación principal: Solo permitir fechas futuras
    if (isNaN(fechaInicio.getTime()) || fechaInicio <= ahora) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Fecha Inválida', 
        text: 'La fecha de inicio debe ser posterior a la fecha y hora actual.', 
        confirmButtonColor: '#003366' 
      });
      return;
    }

    const hour = fechaInicio.getHours();
    if (hour < 7 || hour >= 13) {
      Swal.fire({
        icon: 'warning',
        title: 'Horario No Permitido',
        text: 'Las ventanas solo pueden programarse dentro del rango de atención institucional: 07:00 AM a 01:00 PM (13:00).',
        confirmButtonColor: '#003366',
      });
      return;
    }

    try {
      const payload: any = {
        fechaHoraInicio: formData.fechaHoraInicio,
      };
      const res = await api.patch(`/ventanas/${editingVentana.id}`, payload);
      setOpenDialog(false);
      setEditingVentana(null);
      fetchData();
      Swal.fire({ icon: 'success', title: 'Ventana Actualizada', text: res.data?.message || 'La ventana fue actualizada.', confirmButtonColor: '#003366' });
    } catch (error: any) {
      console.error('Error actualizando ventana:', error);
      const message = error?.response?.data?.message || 'No se pudo actualizar la ventana';
      Swal.fire('Error', message, 'error');
    }
  };

  const handleLlamarSiguiente = async (ventanaId: number, docenteId?: number) => {
    try {
      const url = docenteId 
        ? `/ventanas/${ventanaId}/llamar-siguiente?docenteId=${docenteId}`
        : `/ventanas/${ventanaId}/llamar-siguiente`;
      await api.post(url);
      fetchData();
      if (selectedVentana?.id === ventanaId) {
        fetchCola(selectedVentana);
      }
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'No se pudo llamar al siguiente docente', 'error');
    }
  };

  const handleSaltar = async (docenteId: number) => {
    const result = await Swal.fire({
      title: '¿Saltar docente?',
      text: 'El docente será marcado como FINALIZADO y se llamará al siguiente automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#666',
      confirmButtonText: 'Sí, saltar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/ventanas/saltar/${docenteId}`);
        Swal.fire('Saltado', 'Se ha pasado al siguiente docente.', 'success');
        if (selectedVentana) fetchCola(selectedVentana);
        fetchData(true); // Actualización silenciosa para no perder selección
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo saltar al docente', 'error');
      }
    }
  };

  const handleExtender = async (docenteId: number) => {
    const { value: minutos } = await Swal.fire({
      title: 'Extender Tiempo',
      input: 'number',
      inputLabel: 'Minutos adicionales',
      inputValue: 10,
      showCancelButton: true,
      confirmButtonColor: '#003366',
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return 'Debes ingresar un número válido de minutos';
        }
      }
    });

    if (minutos) {
      try {
        await api.post(`/ventanas/extender/${docenteId}`, { minutos: parseInt(minutos) });
        Swal.fire('Extendido', `Se han añadido ${minutos} minutos al turno actual.`, 'success');
        if (selectedVentana) fetchCola(selectedVentana);
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo extender el tiempo', 'error');
      }
    }
  };

  const handleDeleteVentana = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar ventana?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#666',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/ventanas/${id}`);
        Swal.fire('Eliminada', 'La ventana ha sido eliminada.', 'success');
        fetchData();
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo eliminar la ventana', 'error');
      }
    }
  };

  const handleDetenerVentana = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Detener ventana?',
      text: 'La ventana se marcará como FINALIZADA y el docente actual será liberado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#666',
      confirmButtonText: 'Sí, detener',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.patch(`/ventanas/${id}/detener`);
        const updatedVentana = res.data;
        
        setVentanas((prev: any[]) => prev.map(v => v.id === id ? { ...v, ...updatedVentana } : v));
      
      if (selectedVentana?.id === id) {
        setSelectedVentana((prev: any) => ({ ...prev, ...updatedVentana }));
        fetchCola(updatedVentana);
      }
        
        Swal.fire('Detenida', 'La ventana ha sido finalizada forzosamente.', 'success');
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo detener la ventana', 'error');
      }
    }
  };

  const handleTogglePausa = async (id: number) => {
    try {
      const res = await api.patch(`/ventanas/${id}/toggle-pausa`);
      const { ventana: updatedVentana, docente: updatedDocente, serverTime } = res.data;
      
      // Sincronizar el reloj local con el del servidor para evitar saltos de 1s
      if (serverTime) {
        setNowMs(new Date(serverTime).getTime());
      }

      setVentanas((prev: any[]) => prev.map(v => v.id === id ? { ...v, ...updatedVentana } : v));
      
      if (selectedVentana?.id === id) {
        setSelectedVentana((prev: any) => ({ ...prev, ...updatedVentana }));
        
        if (updatedDocente) {
          setDocenteEnAtencion(updatedDocente);
          setDocenteVisible(updatedDocente);
        } else {
          fetchCola(updatedVentana);
        }
      }
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'No se pudo cambiar el estado de pausa', 'error');
    }
  };

  const handleLimpiarFiltros = () => {
    const cicloActual = ciclos.find(c => c.esActual) || ciclos[0];
    setCicloFiltroId(cicloActual?.id || '');
    setBusqueda('');
    setEstadoFiltro('todos');
    setFechaInicioFiltro('');
    setFechaFinFiltro('');
  };

  const ventanasFiltradas = ventanas.filter(v => {
    // Filtro por Ciclo
    if (cicloFiltroId && v.ciclo?.id !== cicloFiltroId) return false;

    // Filtro por Búsqueda (Categoría o Tipo de Contrato)
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      const categoria = (v.categoriaDocente || '').toLowerCase().replace(/_/g, ' ');
      const tipoContrato = (v.tipoContrato || '').toLowerCase();
      if (!categoria.includes(searchLower) && !tipoContrato.includes(searchLower)) return false;
    }

    // Filtro por Estado
    if (estadoFiltro !== 'todos' && v.estado !== estadoFiltro) return false;

    // Filtro por Rango de Fechas
    if (fechaInicioFiltro || fechaFinFiltro) {
      const inicioVentana = new Date(v.fechaHoraInicio);
      const finVentana = new Date(v.fechaHoraFin);
      
      if (fechaInicioFiltro) {
        const fInicio = new Date(fechaInicioFiltro);
        if (inicioVentana < fInicio) return false;
      }
      
      if (fechaFinFiltro) {
        const fFin = new Date(fechaFinFiltro);
        if (finVentana > fFin) return false;
      }
    }

    return true;
  });

  const getEstadoChip = (estado: string) => {
    switch (estado) {
      case 'programada':
        return <Chip label="Programada" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 800 }} />;
      case 'en_curso':
        return <Chip label="En Curso" icon={<PlayIcon sx={{ color: 'inherit !important' }} />} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 800 }} />;
      case 'pausada':
        return <Chip label="Pausada" icon={<PauseIcon sx={{ color: 'inherit !important' }} />} size="small" sx={{ bgcolor: '#fff3e0', color: '#ed6c02', fontWeight: 800 }} />;
      case 'finalizada':
        return <Chip label="Finalizada" icon={<CheckCircleIcon sx={{ color: 'inherit !important' }} />} size="small" sx={{ bgcolor: '#f5f5f5', color: '#616161', fontWeight: 800 }} />;
      case 'vencida':
        return <Chip label="Vencida" icon={<AlertIcon sx={{ color: 'inherit !important' }} />} size="small" sx={{ bgcolor: '#fff3e0', color: '#ef6c00', fontWeight: 800 }} />;
      default:
        return <Chip label={estado} size="small" />;
    }
  };

  if (isValidating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f4f6f8' }}>
        <CircularProgress sx={{ color: '#003366' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#003366', letterSpacing: -0.5 }}>
            SISTEMA DE VENTANAS
          </Typography>
          <Typography variant="body1" sx={{ color: '#666', fontWeight: 500 }}>
            Gestión de turnos y selección de horarios secuencial - UNT
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              bgcolor: '#003366',
              fontWeight: 800,
              borderRadius: 2,
              py: 1.5,
              px: 4,
              boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
              '&:hover': { bgcolor: '#002244', transform: 'translateY(-2px)' },
              transition: 'all 0.2s'
            }}
          >
            PROGRAMAR VENTANA
          </Button>
        )}
      </Box>

      {/* Sección de Filtros Estilo Reportes */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2.5, 
          mb: 4, 
          borderRadius: 4, 
          border: '1px solid #e2e8f0',
          bgcolor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Filtro Principal: Periodo */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="select-ciclo-filtro-label">Periodo</InputLabel>
              <Select
                labelId="select-ciclo-filtro-label"
                value={cicloFiltroId}
                label="Periodo"
                onChange={(e) => setCicloFiltroId(e.target.value)}
                sx={{ borderRadius: 2.5 }}
              >
                {ciclos.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre} {c.esActual ? '(Actual)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro Principal: Búsqueda */}
          <Grid item xs={12} sm={6} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Escribe la categoría o tipo de contrato..."
              label="Buscar por Categoría o Tipo de Contrato"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#003366' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2.5 }
              }}
            />
          </Grid>

          {/* Botones de Acción */}
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleLimpiarFiltros}
              sx={{ 
                borderRadius: 2.5, 
                color: '#64748b', 
                borderColor: '#e2e8f0',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
              }}
            >
              LIMPIAR
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<FilterIcon />}
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              sx={{ 
                borderRadius: 2.5, 
                bgcolor: '#003366',
                '&:hover': { bgcolor: '#002244' }
              }}
            >
              FILTROS
            </Button>
          </Grid>

          {/* Filtros Secundarios Colapsables */}
          {mostrarFiltros && (
            <Grid item xs={12}>
              <Box sx={{ pt: 2, mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="select-estado-filtro-label">Estado</InputLabel>
                      <Select
                        labelId="select-estado-filtro-label"
                        value={estadoFiltro}
                        label="Estado"
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        sx={{ borderRadius: 2.5 }}
                      >
                        <MenuItem value="todos">Todos los Estados</MenuItem>
                        <MenuItem value="programada">Programada</MenuItem>
                        <MenuItem value="en_curso">En Curso</MenuItem>
                        <MenuItem value="pausada">Pausada</MenuItem>
                        <MenuItem value="finalizada">Finalizada</MenuItem>
                        <MenuItem value="vencida">Vencida</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="Rango Inicio (Desde)"
                      value={fechaInicioFiltro}
                      onChange={(e) => setFechaInicioFiltro(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ borderRadius: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="Rango Fin (Hasta)"
                      value={fechaFinFiltro}
                      onChange={(e) => setFechaFinFiltro(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ borderRadius: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress sx={{ color: '#003366' }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ borderRadius: 4, border: '2px solid #e0e4e8', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#003366' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>N°</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>CICLO</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>CATEGORÍA</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>HORARIO</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>ESTADO</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#fff', py: 2.5 }}>ACCIONES</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventanasFiltradas.length > 0 ? (
                      ventanasFiltradas
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((v, index) => (
                          <TableRow
                            key={v.id}
                            hover
                            selected={selectedVentana?.id === v.id}
                            onClick={() => {
                              setSelectedVentana(v);
                              fetchCola(v);
                            }}
                            sx={{
                              cursor: 'pointer',
                              '&.Mui-selected': { bgcolor: 'rgba(0, 51, 102, 0.08)' },
                              '&:hover': { bgcolor: 'rgba(0, 51, 102, 0.04)' },
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <TableCell sx={{ fontWeight: 900, color: '#003366' }}>
                              {page * rowsPerPage + index + 1}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarIcon sx={{ mr: 1, color: '#003366', fontSize: 22 }} />
                                <Typography sx={{ fontWeight: 800, color: '#333' }}>{v.ciclo?.nombre}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', textAlign: 'center' }}>
                                <Chip
                                  label={v.tipoContrato?.toUpperCase() || 'GLOBAL'}
                                  size="small"
                                  sx={{
                                    fontWeight: 900,
                                    fontSize: '0.65rem',
                                    bgcolor: v.tipoContrato?.toLowerCase() === 'nombrado'
                                      ? '#e8f5e9'
                                      : v.tipoContrato?.toLowerCase() === 'contratado'
                                        ? '#fff3e0'
                                        : '#f0f0f0',
                                    color: v.tipoContrato?.toLowerCase() === 'nombrado'
                                      ? '#2e7d32'
                                      : v.tipoContrato?.toLowerCase() === 'contratado'
                                        ? '#ed6c02'
                                        : '#666',
                                    borderRadius: 1,
                                    height: 20,
                                    px: 1.2
                                  }}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366' }}>
                                  {v.categoriaDocente
                                    ? String(v.categoriaDocente).replace(/_/g, ' ').toUpperCase()
                                    : (v.tipoContrato ? v.tipoContrato.toUpperCase() : 'GLOBAL')}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#003366' }}>
                                  {format(new Date(v.fechaHoraInicio), 'dd MMM, HH:mm', { locale: es })}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#666' }}>
                                  Hasta {format(new Date(v.fechaHoraFin), 'HH:mm', { locale: es })}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{getEstadoChip(v.estado)}</TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                {(v.estado === 'programada' || v.estado === 'finalizada' || v.estado === 'vencida') && isGestionAllowed && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => { e.stopPropagation(); openEditDialog(v); }}
                                    title="Editar Programación"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {isGestionAllowed && v.estado !== 'en_curso' && v.estado !== 'pausada' && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteVentana(v.id); }}
                                    title="Eliminar Programación"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                                { (v.estado === 'en_curso' || v.estado === 'pausada') && isGestionAllowed && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    {v.estado === 'en_curso' && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<PauseIcon />}
                                        onClick={(e) => { e.stopPropagation(); handleTogglePausa(v.id); }}
                                        sx={{ fontWeight: 800, borderRadius: 2, fontSize: '0.65rem' }}
                                      >
                                        PAUSAR
                                      </Button>
                                    )}
                                    {v.estado === 'pausada' && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<PlayIcon />}
                                        onClick={(e) => { e.stopPropagation(); handleTogglePausa(v.id); }}
                                        sx={{ 
                                          fontWeight: 800, 
                                          borderRadius: 2, 
                                          fontSize: '0.65rem',
                                          bgcolor: 'transparent',
                                          borderWidth: 2,
                                          '&:hover': { borderWidth: 2 }
                                        }}
                                      >
                                        REANUDAR
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={<StopIcon />}
                                      onClick={(e) => { e.stopPropagation(); handleDetenerVentana(v.id); }}
                                      sx={{ 
                                        fontWeight: 800, 
                                        borderRadius: 2, 
                                        fontSize: '0.65rem',
                                        bgcolor: 'transparent',
                                        borderWidth: 2,
                                        '&:hover': { borderWidth: 2 }
                                      }}
                                    >
                                      DETENER
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 12 }}>
                          <AccessTimeIcon sx={{ fontSize: 64, color: '#e0e4e8', mb: 2 }} />
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#999' }}>No hay ventanas programadas</Typography>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>Usa el botón superior para programar la primera.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={ventanasFiltradas.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
                sx={{ borderTop: '1px solid #e0e4e8' }}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '2px solid #e0e4e8', minHeight: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#003366', mb: 3, display: 'flex', alignItems: 'center' }}>
                <GroupIcon sx={{ mr: 1.5 }} />
                MONITOR DE TURNOS
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {selectedVentana ? (
                <Box>
                  <Box sx={{ mb: 4, p: 2.5, bgcolor: '#e3f2fd', borderRadius: 3, border: '2px solid #90caf9' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#003366', mb: 2, letterSpacing: 0.5 }}>
                      EN ATENCIÓN AHORA
                    </Typography>
                    {docenteVisible ? (
                      <Box sx={{ opacity: isFadingMonitor ? 0.2 : 1, transition: 'opacity 280ms ease-in-out' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ bgcolor: '#003366', mr: 2, width: 48, height: 48, border: '2px solid #fff' }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: '#003366' }}>{docenteVisible.nombreCompleto}</Typography>
                            {selectedVentana?.estado === 'pausada' ? (
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: '#ed6c02', fontWeight: 900 }}>
                                <PauseIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                Restante: {getTiempoRestante(docenteVisible.finAtencion, selectedVentana.pausadoEn)}
                              </Typography>
                            ) : (
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: '#1976d2', fontWeight: 700 }}>
                                <TimerIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                Restante: {getTiempoRestante(docenteVisible.finAtencion)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {isGestionAllowed && (
                            <>
                              <Button
                                fullWidth
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<ArrowRightIcon />}
                                onClick={() => handleSaltar(docenteVisible.id)}
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                              >
                                SIGUIENTE
                              </Button>
                              <Button
                                fullWidth
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<MoreTimeIcon />}
                                onClick={() => handleExtender(docenteVisible.id)}
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                              >
                                EXTENDER
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#666', mb: isGestionAllowed && selectedVentana?.estado === 'en_curso' ? 2 : 0 }}>
                          Ningún docente en atención
                        </Typography>
                        {isGestionAllowed && selectedVentana?.estado === 'en_curso' && (
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<PlayIcon />}
                            onClick={() => handleLlamarSiguiente(selectedVentana.id)}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            LLAMAR SIGUIENTE
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#333', mb: 2, display: 'flex', alignItems: 'center' }}>
                    COLA DE ESPERA
                    <Chip label={cola.length} size="small" sx={{ ml: 1, fontWeight: 800, bgcolor: '#003366', color: '#fff' }} />
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                    <List disablePadding>
                      {cola.map((doc, idx) => (
                        <ListItem
                          key={doc.id}
                          divider={idx !== cola.length - 1}
                          sx={{
                            px: 1.5,
                            py: 2,
                            borderRadius: 2,
                            mb: 1,
                            border: '1px solid transparent',
                            '&:hover': { bgcolor: '#f8f9fa', borderColor: '#e0e4e8' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 45 }}>
                            <Badge
                              badgeContent={idx + 1}
                              color="primary"
                              sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}
                            >
                              <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0e4e8', color: '#666' }}>
                                <PersonIcon fontSize="small" />
                              </Avatar>
                            </Badge>
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography sx={{ fontWeight: 700, color: '#333' }}>{doc.nombreCompleto}</Typography>}
                            secondary={
                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#666' }}>
                                {doc.tipoContrato.toUpperCase()} • {doc.antiguedadAnios} años antig.
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                      {cola.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#999' }}>
                            No hay más docentes en cola
                          </Typography>
                        </Box>
                      )}
                    </List>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 350 }}>
                  <AccessTimeIcon sx={{ fontSize: 64, color: '#e0e4e8', mb: 2 }} />
                  <Typography sx={{ fontWeight: 700, color: '#999', textAlign: 'center' }}>
                    Selecciona una ventana para ver el monitor
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Dialogo Programar Ventana Global (Compacto) */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4, 
            overflow: 'hidden', 
            maxWidth: 720,
            maxHeight: '90vh', // Limitar altura máxima
            display: 'flex',
            flexDirection: 'column'
          } 
        }}
      >
        <DialogTitle sx={{
          fontWeight: 900,
          color: '#fff',
          bgcolor: '#003366',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1.5,
          flexShrink: 0 // Evitar que el título se encoja
        }}>
          <CalendarIcon fontSize="medium" />
          {editingVentana ? (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontWeight: 900 }}>
                EDITAR VENTANA
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                {editingVentana.ciclo?.nombre || ''} — {editingVentana.categoriaDocente ? String(editingVentana.categoriaDocente).replace(/_/g, ' ').toUpperCase() : (editingVentana.tipoContrato || '').toUpperCase()}
              </Typography>
            </Box>
          ) : (
            'PROGRAMAR NUEVA VENTANA GLOBAL'
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflowY: 'auto', flexGrow: 1 }}>
          <Grid container>
            {/* Panel Izquierdo: Configuración */}
            <Grid item xs={12} md={editingVentana ? 12 : 7} sx={{ p: 3, borderRight: { md: editingVentana ? 'none' : '1px solid #e0e4e8' } }}>
              <Typography variant="caption" sx={{ fontWeight: 900, color: '#003366', mb: 3, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                <InfoIcon sx={{ fontSize: 16 }} /> {editingVentana ? 'EDITAR PROGRAMACIÓN' : 'CONFIGURACIÓN BÁSICA'}
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel sx={{ fontWeight: 700 }}>Ciclo Académico</InputLabel>
                    <Select
                      value={formData.cicloId}
                      label="Ciclo Académico"
                      disabled={!!editingVentana}
                      onChange={(e) => setFormData({ ...formData, cicloId: e.target.value })}
                      sx={{ borderRadius: 2, fontWeight: 700, bgcolor: editingVentana ? '#f8f9fa' : 'transparent' }}
                      startAdornment={
                        <InputAdornment position="start">
                          <SchoolIcon sx={{ color: '#003366', ml: 1 }} />
                        </InputAdornment>
                      }
                    >
                      {ciclos.map((c) => (
                        <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 700 }}>{c.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Inicio de Ventana"
                    type="datetime-local"
                    value={formData.fechaHoraInicio}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, fechaHoraInicio: e.target.value }))}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      sx: { borderRadius: 2, fontWeight: 700 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon sx={{ color: '#003366' }} />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Rango permitido: 07:00 AM - 01:00 PM"
                  />
                </Grid>

                {!editingVentana && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Duración por Docente (minutos)"
                        type="number"
                        value={formData.duracionMinutos}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, duracionMinutos: Number(e.target.value) }))}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          sx: { borderRadius: 2, fontWeight: 700 },
                          startAdornment: (
                            <InputAdornment position="start">
                              <TimerIcon sx={{ color: '#003366' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Fecha Fin Estimada"
                        value={formData.fechaHoraFin ? format(new Date(formData.fechaHoraFin), "dd/MM/yyyy HH:mm") : ''}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          readOnly: true,
                          sx: { borderRadius: 2, fontWeight: 700, bgcolor: '#f8f9fa' },
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTimeIcon sx={{ color: '#003366' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography sx={{ color: '#d32f2f', fontWeight: 800, fontSize: '0.85rem' }}>
                                ({getDuracionTotalFormateada()})
                              </Typography>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </>
                )}

                {!editingVentana && (
                  <Grid item xs={12}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #dce7f3',
                      bgcolor: '#f5faff',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#003366', width: 32, height: 32 }}>
                          <GroupsIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#003366', fontWeight: 900, letterSpacing: 0.5, display: 'block' }}>
                            DOCENTES EN COLA
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#5a6b7d', fontWeight: 600 }}>
                            Total docentes pendientes
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={docentesCount}
                        sx={{ bgcolor: '#003366', color: '#fff', fontWeight: 900, fontSize: '1rem', height: 32 }}
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/* Panel Derecho: Jerarquía (Sólo en creación) */}
            {!editingVentana && (
              <Grid item xs={12} md={5} sx={{ bgcolor: '#f8f9fa', p: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#003366', mb: 3, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                  <TrendingUpIcon sx={{ fontSize: 16 }} /> ORDEN DE JERARQUÍA
                </Typography>

                <Box sx={{ position: 'relative' }}>
                  {[
                    { label: 'Nombrados: Principal', color: '#2e7d32' },
                    { label: 'Nombrados: Asociado', color: '#2e7d32' },
                    { label: 'Nombrados: Auxiliar', color: '#2e7d32' },
                    { label: 'Nombrados: J. Práctica', color: '#2e7d32' },
                    { label: 'Contratados: Principal', color: '#ed6c02' },
                    { label: 'Contratados: Asociado', color: '#ed6c02' },
                    { label: 'Contratados: Auxiliar', color: '#ed6c02' },
                    { label: 'Contratados: J. Práctica', color: '#ed6c02' },
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, position: 'relative' }}>
                      <Box sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: item.color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 900,
                        mr: 1.5,
                        zIndex: 2
                      }}>
                        {idx + 1}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#444' }}>
                        {item.label}
                      </Typography>
                      {idx < 7 && (
                        <Box sx={{
                          position: 'absolute',
                          left: 11,
                          top: 24,
                          width: 2,
                          height: 16,
                          bgcolor: '#e0e4e8',
                          zIndex: 1
                        }} />
                      )}
                    </Box>
                  ))}
                </Box>

                <Box sx={{ mt: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e4e8' }}>
                  <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic', display: 'block' }}>
                    * El sistema ordena automáticamente a los docentes por su categoría y antigüedad dentro de cada grupo.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #e0e4e8', justifyContent: 'space-between', flexShrink: 0 }}>
          <Button onClick={() => setOpenDialog(false)} size="small" sx={{ fontWeight: 800, color: '#666' }}>
            CANCELAR
          </Button>
          <Button
            variant="contained"
            onClick={editingVentana ? handleUpdateVentana : handleCreateVentana}
            startIcon={editingVentana ? <EditIcon /> : <PlayIcon />}
            size="small"
            sx={{
              bgcolor: '#003366',
              fontWeight: 800,
              borderRadius: 2,
              px: 3,
              py: 1,
              '&:hover': { bgcolor: '#002244' }
            }}
          >
            {editingVentana ? 'GUARDAR CAMBIOS' : 'GUARDAR Y ACTIVAR'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
