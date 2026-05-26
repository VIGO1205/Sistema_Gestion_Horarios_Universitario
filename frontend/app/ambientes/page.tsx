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
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Room as RoomIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
  People as PeopleIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm, Controller } from 'react-hook-form';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function AmbientesPage() {
  const [loading, setLoading] = useState(true);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    search: '',
    tipo: 'todos',
  });

  // Estado para la paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estado para el CRUD
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAmbiente, setSelectedAmbiente] = useState<any>(null);

  const tiposAula = [
    { id: 'teoría', nombre: 'Teoría' },
    { id: 'práctica', nombre: 'Práctica' },
    { id: 'laboratorio', nombre: 'Laboratorio' }
  ];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      tipo: 'teoría',
      capacidad: 40,
      disponible: true,
    }
  });

  useEffect(() => {
    fetchAmbientes();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.tipo]);

  const fetchAmbientes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/aulas');
      setAmbientes(response.data);
    } catch (error) {
      console.error('Error fetching ambientes:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los ambientes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const ambientesFiltrados = useMemo(() => {
    return ambientes.filter((ambiente: any) => {
      const coincideBusqueda =
        !filtros.search ||
        String(ambiente.nombre || '').toLowerCase().includes(filtros.search.toLowerCase());
      const coincideTipo = filtros.tipo === 'todos' || ambiente.tipo === filtros.tipo;
      return coincideBusqueda && coincideTipo;
    });
  }, [ambientes, filtros]);

  const handleOpenDialog = (ambiente: any = null) => {
    if (ambiente) {
      setSelectedAmbiente(ambiente);
      reset(ambiente);
    } else {
      setSelectedAmbiente(null);
      reset({
        nombre: '',
        tipo: 'teoría',
        capacidad: 40,
        disponible: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAmbiente(null);
  };

  const onSubmit = async (data: any) => {
    try {
      // Limpiar el payload para enviar solo lo que el DTO espera
      const { id, createdAt, updatedAt, ...payload } = data;

      if (selectedAmbiente) {
        await api.patch(`/aulas/${selectedAmbiente.id}`, payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Ambiente actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await api.post('/aulas', payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Creado!',
          text: 'Ambiente creado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
      }
      handleCloseDialog();
      fetchAmbientes();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar ambiente'
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/aulas/${id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Ambiente eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        fetchAmbientes();
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al eliminar ambiente'
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
            Gestión de Ambientes
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra las aulas, laboratorios y auditorios disponibles.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchAmbientes} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nuevo Ambiente
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
              label="Buscar Ambiente por Nombre"
              placeholder="Escribe el nombre del aula o laboratorio..."
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RoomIcon fontSize="small" color="primary" />
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
                onClick={() => setFiltros({ search: '', tipo: 'todos' })}
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
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Aula</InputLabel>
                <Select
                  value={filtros.tipo}
                  label="Tipo de Aula"
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                >
                  <MenuItem value="todos">Todos los Tipos</MenuItem>
                  {tiposAula.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Tabla de Ambientes */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>AMBIENTE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>TIPO DE AULA</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CAPACIDAD</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ambientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 10, textAlign: 'center' }}>
                  <Typography color="textSecondary">No se encontraron ambientes.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              ambientesFiltrados
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((ambiente, index) => (
                <TableRow key={ambiente.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{ambiente.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={tiposAula.find(t => t.id === ambiente.tipo)?.nombre || ambiente.tipo} 
                      size="small"
                      sx={{ 
                        bgcolor: 
                          ambiente.tipo === 'teoría' ? 'rgba(102, 126, 234, 0.1)' : 
                          ambiente.tipo === 'práctica' ? 'rgba(255, 153, 0, 0.1)' : 
                          'rgba(67, 233, 123, 0.1)',
                        color: 
                          ambiente.tipo === 'teoría' ? '#667eea' : 
                          ambiente.tipo === 'práctica' ? '#ff9900' : 
                          '#43e97b',
                        fontWeight: 600 
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      {ambiente.capacidad} personas
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={ambiente.disponible ? 'Disponible' : 'Ocupado'} 
                      color={ambiente.disponible ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(ambiente)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(ambiente.id)} color="error" size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 15, 20, 25]}
          component="div"
          count={ambientesFiltrados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Diálogo CRUD */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
            {selectedAmbiente ? 'Editar Ambiente' : 'Nuevo Ambiente'}
          </DialogTitle>
          <DialogContent sx={{ pt: 4, overflowY: 'visible' }}>
            <Grid container spacing={3} sx={{ pt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="nombre"
                  control={control}
                  rules={{ required: 'El nombre es obligatorio' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Nombre del Ambiente"
                      variant="outlined"
                      error={!!errors.nombre}
                      helperText={errors.nombre?.message as string}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <RoomIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Aula</InputLabel>
                      <Select {...field} label="Tipo de Aula">
                        {tiposAula.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="capacidad"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Capacidad"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PeopleIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 600 }}>
              {selectedAmbiente ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
