'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TablePagination,
  IconButton,
  Tooltip,
  InputAdornment,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm, Controller } from 'react-hook-form';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

const MySwal = withReactContent(Swal);

// Función auxiliar para formatear fecha sin problemas de zona horaria
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, 'dd/MM/yyyy', { locale: es });
};

const formatDateInput = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

export default function PeriodosPage() {
  const [loading, setLoading] = useState(true);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: 'todos',
  });

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

  // Estado para el CRUD
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      fechaInicio: '',
      fechaFin: '',
      esActual: false,
    }
  });

  useEffect(() => {
    fetchPeriodos();
  }, []);

  const fetchPeriodos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ciclos');
      setPeriodos(response.data);
    } catch (error) {
      console.error('Error fetching periodos:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los periodos académicos',
      });
    } finally {
      setLoading(false);
    }
  };

  const periodosFiltrados = useMemo(() => {
    return periodos.filter((p: any) => {
      const texto = `${p.nombre || ''}`.toLowerCase();
      const coincideBusqueda = !filtros.search || texto.includes(filtros.search.toLowerCase());
      const coincideEstado = filtros.estado === 'todos' || 
                            (filtros.estado === 'actual' && p.esActual) || 
                            (filtros.estado === 'pasado' && !p.esActual);
      return coincideBusqueda && coincideEstado;
    });
  }, [periodos, filtros]);

  const handleOpenDialog = (periodo: any = null) => {
    if (periodo) {
      setSelectedPeriodo(periodo);
      reset({
        nombre: periodo.nombre || '',
        fechaInicio: formatDateInput(periodo.fechaInicio),
        fechaFin: formatDateInput(periodo.fechaFin),
        esActual: periodo.esActual || false,
      });
    } else {
      setSelectedPeriodo(null);
      reset({
        nombre: '',
        fechaInicio: '',
        fechaFin: '',
        esActual: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPeriodo(null);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedPeriodo) {
        await api.patch(`/ciclos/${selectedPeriodo.id}`, data);
        MySwal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Periodo académico actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await api.post('/ciclos', data);
        MySwal.fire({
          icon: 'success',
          title: '¡Creado!',
          text: 'Periodo académico creado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      handleCloseDialog();
      fetchPeriodos();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar el periodo académico',
      });
    }
  };

  const handleDelete = async (id: number) => {
    const periodo = periodos.find(p => p.id === id);
    if (periodo?.esActual) {
      MySwal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'No puedes eliminar el periodo académico actual.',
      });
      return;
    }

    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará el periodo y toda su configuración asociada. ¡No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/ciclos/${id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Periodo académico eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        fetchPeriodos();
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al eliminar el periodo'
        });
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Cabecera */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
            Gestión de Periodos Académicos
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra los ciclos, fechas de inicio y término del calendario académico.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchPeriodos} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nuevo Periodo
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              label="Buscar Periodo"
              placeholder="Ej: 2024-I"
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HistoryIcon fontSize="small" color="primary" />
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
                startIcon={<DeleteSweepIcon />}
                onClick={() => {
                  setFiltros({
                    search: '',
                    estado: 'todos',
                  });
                }}
                sx={{ borderRadius: 2, fontWeight: 600, color: '#666', borderColor: '#ddd' }}
              >
                Limpiar
              </Button>
              <Button 
                fullWidth 
                variant={showAdvancedFilters ? "contained" : "outlined"}
                startIcon={<TuneIcon />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 600,
                  bgcolor: showAdvancedFilters ? '#003366' : 'transparent',
                  color: showAdvancedFilters ? 'white' : '#003366',
                  borderColor: '#003366',
                }}
              >
                Filtros
              </Button>
            </Box>
          </Grid>

          {showAdvancedFilters && (
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Estado"
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="todos">Todos los Estados</option>
                <option value="actual">Actual</option>
                <option value="pasado">Pasado</option>
              </TextField>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Tabla de Periodos */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>NOMBRE DEL PERIODO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>FECHA INICIO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>FECHA TÉRMINO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periodosFiltrados
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((p, index) => (
                <TableRow key={p.id} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CalendarIcon sx={{ color: '#003366' }} />
                      <Typography sx={{ fontWeight: 600 }}>{p.nombre}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {formatDateDisplay(p.fechaInicio)}
                  </TableCell>
                  <TableCell>
                    {formatDateDisplay(p.fechaFin)}
                  </TableCell>
                  <TableCell>
                    {p.esActual ? (
                      <Chip 
                        label="ACTUAL" 
                        color="success" 
                        size="small" 
                        icon={<CheckCircleIcon />}
                        sx={{ fontWeight: 700, borderRadius: 1 }}
                      />
                    ) : (
                      <Chip 
                        label="PASADO" 
                        variant="outlined"
                        size="small" 
                        icon={<UncheckedIcon />}
                        sx={{ fontWeight: 600, borderRadius: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="Editar">
                        <IconButton 
                          onClick={() => handleOpenDialog(p)}
                          sx={{ color: '#003366', bgcolor: '#eef2f6', '&:hover': { bgcolor: '#003366', color: 'white' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton 
                          onClick={() => handleDelete(p.id)}
                          disabled={p.esActual}
                          sx={{ color: '#d32f2f', bgcolor: '#fdecea', '&:hover': { bgcolor: '#d32f2f', color: 'white' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            {periodosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  No se encontraron periodos académicos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={periodosFiltrados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
        />
      </TableContainer>

      {/* Dialogo CRUD */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 600 }}>
          {selectedPeriodo ? 'Editar Periodo Académico' : 'Nuevo Periodo Académico'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="nombre"
                  control={control}
                  rules={{ required: 'El nombre es obligatorio' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Nombre del Periodo (Ej: 2024-I)"
                      error={!!errors.nombre}
                      helperText={errors.nombre?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fechaInicio"
                  control={control}
                  rules={{ required: 'La fecha de inicio es obligatoria' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="date"
                      label="Fecha de Inicio"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.fechaInicio}
                      helperText={errors.fechaInicio?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fechaFin"
                  control={control}
                  rules={{ required: 'La fecha de término es obligatoria' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="date"
                      label="Fecha de Término"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.fechaFin}
                      helperText={errors.fechaFin?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="esActual"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Establecer como periodo académico actual"
                    />
                  )}
                />
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', ml: 1 }}>
                  * Al activar esta opción, los demás periodos se marcarán como inactivos automáticamente.
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366' }}>
              {selectedPeriodo ? 'Guardar Cambios' : 'Crear Periodo'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
