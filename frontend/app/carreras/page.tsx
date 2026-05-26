'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Tooltip,
  InputAdornment,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useForm, Controller } from 'react-hook-form';

const MySwal = withReactContent(Swal);

interface Carrera {
  id: number;
  nombre: string;
  facultad: string;
  codigo: string;
}

export default function CarrerasPage() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    search: '',
    facultad: 'todas',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [selectedCarrera, setSelectedCarrera] = useState<Carrera | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchCarreras = async () => {
    setLoading(true);
    try {
      const response = await api.get('/carreras');
      setCarreras(response.data);
    } catch (error) {
      console.error('Error fetching carreras:', error);
      MySwal.fire('Error', 'No se pudieron cargar las carreras', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarreras();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.facultad]);

  const facultades = useMemo(() => {
    return Array.from(new Set(carreras.map((carrera) => carrera.facultad).filter(Boolean))).sort();
  }, [carreras]);

  const carrerasFiltradas = useMemo(() => {
    return carreras.filter((carrera) => {
      const texto = `${carrera.codigo} ${carrera.nombre} ${carrera.facultad}`.toLowerCase();
      const coincideBusqueda =
        !filtros.search || texto.includes(filtros.search.toLowerCase());
      const coincideFacultad =
        filtros.facultad === 'todas' || carrera.facultad === filtros.facultad;

      return coincideBusqueda && coincideFacultad;
    });
  }, [carreras, filtros]);

  const carrerasPaginadas = useMemo(() => {
    return carrerasFiltradas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [carrerasFiltradas, page, rowsPerPage]);

  const handleOpenDialog = (carrera: Carrera | null = null) => {
    setSelectedCarrera(carrera);
    if (carrera) {
      reset(carrera);
    } else {
      reset({ nombre: '', facultad: '', codigo: '' });
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setSelectedCarrera(null);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const onSubmit = async (data: any) => {
    try {
      const { id, createdAt, updatedAt, ...payload } = data;
      if (selectedCarrera) {
        await api.patch(`/carreras/${selectedCarrera.id}`, payload);
        MySwal.fire('¡Actualizado!', 'Carrera actualizada exitosamente', 'success');
      } else {
        await api.post('/carreras', payload);
        MySwal.fire('¡Creado!', 'Carrera creada exitosamente', 'success');
      }
      handleCloseDialog();
      fetchCarreras();
    } catch (error) {
      MySwal.fire('Error', 'No se pudo guardar la carrera', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/carreras/${id}`);
        MySwal.fire('Eliminado', 'La carrera ha sido eliminada', 'success');
        fetchCarreras();
      } catch (error) {
        MySwal.fire('Error', 'No se pudo eliminar la carrera', 'error');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
            Gestión de Carreras
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra las carreras profesionales, sus códigos y facultades.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchCarreras} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nueva Carrera
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              size="small"
              label="Buscar Carrera por Nombre, Código o Facultad"
              placeholder="Escribe el nombre, código o facultad..."
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="primary" />
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
                onClick={() => setFiltros({ search: '', facultad: 'todas' })}
                sx={{ borderRadius: 2, fontWeight: 600, color: '#666', borderColor: '#ddd' }}
              >
                Limpiar
              </Button>
              <Button
                fullWidth
                variant={showAdvancedFilters ? 'contained' : 'outlined'}
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por Facultad</InputLabel>
                <Select
                  value={filtros.facultad}
                  label="Filtrar por Facultad"
                  onChange={(e) => setFiltros({ ...filtros, facultad: e.target.value })}
                >
                  <MenuItem value="todas">Todas las Facultades</MenuItem>
                  {facultades.map((facultad) => (
                    <MenuItem key={facultad} value={facultad}>
                      {facultad}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CARRERA</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CÓDIGO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>FACULTAD</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carrerasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 10, textAlign: 'center' }}>
                  <Typography color="textSecondary">No se encontraron carreras.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              carrerasPaginadas.map((carrera, index) => (
                <TableRow key={carrera.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{carrera.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={carrera.codigo || 'N/A'} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{carrera.facultad}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(carrera)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(carrera.id)} color="error" size="small">
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
          count={carrerasFiltradas.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
            {selectedCarrera ? 'Editar Carrera' : 'Nueva Carrera'}
          </DialogTitle>
          <DialogContent sx={{ pt: 4, overflowY: 'visible' }}>
            <Grid container spacing={3} sx={{ pt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Código"
                  {...register('codigo')}
                  placeholder="Ej: SIST"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Nombre de la Carrera"
                  {...register('nombre', { required: 'El nombre es requerido' })}
                  error={!!errors.nombre}
                  helperText={errors.nombre?.message as string}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Facultad"
                  {...register('facultad', { required: 'La facultad es requerida' })}
                  error={!!errors.facultad}
                  helperText={errors.facultad?.message as string}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 600 }}>
              {selectedCarrera ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
