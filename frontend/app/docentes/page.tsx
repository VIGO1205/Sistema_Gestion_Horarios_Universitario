'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  TablePagination,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Button,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  History as HistoryIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Send as TelegramIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm, Controller } from 'react-hook-form';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function DocentesPage() {
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    search: '',
    tipoContrato: 'todos',
    categoria: 'todos',
    carreraId: 'todos',
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
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const categoriasDocente = [
    { id: 'principal', nombre: 'Principal' },
    { id: 'asociado', nombre: 'Asociado' },
    { id: 'auxiliar', nombre: 'Auxiliar' },
    { id: 'jefe_practica', nombre: 'Jefe de Práctica' }
  ];
  const tiposContrato = [
    { id: 'nombrado', nombre: 'Nombrado' },
    { id: 'contratado', nombre: 'Contratado' }
  ];

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      nombreCompleto: '',
      dni: '',
      tipoContrato: 'nombrado',
      categoria: 'principal',
      fechaIngreso: '',
      telefono: '',
      emailPersonal: '',
      telegramId: '',
      antiguedadAnios: 0,
      activo: true,
      carreraIds: [] as number[]
    }
  });

  useEffect(() => {
    fetchDocentes();
    fetchCarreras();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.tipoContrato, filtros.categoria, filtros.carreraId]);

  const fetchCarreras = async () => {
    try {
      const res = await api.get('/carreras');
      setCarreras(res.data);
    } catch (error) {
      console.error('Error fetching carreras:', error);
    }
  };

  const fetchDocentes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/docentes');
      setDocentes(response.data);
    } catch (error) {
      console.error('Error fetching docentes:', error);
      setSnackbar({ open: true, message: 'Error al cargar docentes', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const carrerasSeleccionadas = watch('carreraIds') || [];

  const docentesFiltrados = useMemo(() => {
    return docentes.filter((docente: any) => {
      const texto = `${docente.nombreCompleto || ''} ${docente.dni || ''}`.toLowerCase();
      const coincideBusqueda = !filtros.search || texto.includes(filtros.search.toLowerCase());
      const coincideTipo = filtros.tipoContrato === 'todos' || docente.tipoContrato === filtros.tipoContrato;
      const coincideCategoria = filtros.categoria === 'todos' || docente.categoria === filtros.categoria;

      const coincideCarrera =
        filtros.carreraId === 'todos' ||
        (Array.isArray(docente.carreras) &&
          docente.carreras.some((rel: any) => Number(rel?.carrera?.id) === Number(filtros.carreraId)));

      return coincideBusqueda && coincideTipo && coincideCategoria && coincideCarrera;
    });
  }, [docentes, filtros]);

  const handleOpenDialog = async (docente: any = null) => {
    if (docente) {
      setSelectedDocente(docente);
      try {
        const docenteRes = await api.get(`/docentes/${docente.id}`);
        
        const carreraIds = (docenteRes.data?.carreras || [])
          .map((rel: any) => rel.carrera?.id)
          .filter(Boolean);

        reset({
          nombreCompleto: docenteRes.data?.nombreCompleto ?? docente.nombreCompleto ?? '',
          dni: docenteRes.data?.dni ?? docente.dni ?? '',
          tipoContrato: docenteRes.data?.tipoContrato ?? docente.tipoContrato ?? 'nombrado',
          categoria: docenteRes.data?.categoria ?? docente.categoria ?? 'principal',
          fechaIngreso: docenteRes.data?.fechaIngreso ? new Date(docenteRes.data.fechaIngreso).toISOString().split('T')[0] : '',
          telefono: docenteRes.data?.telefono ?? '',
          emailPersonal: docenteRes.data?.emailPersonal ?? '',
          telegramId: docenteRes.data?.telegramId ?? '',
          antiguedadAnios: docenteRes.data?.antiguedadAnios ?? docente.antiguedadAnios ?? 0,
          activo: docenteRes.data?.activo ?? docente.activo ?? true,
          carreraIds,
        });
      } catch (error) {
        reset({
          nombreCompleto: docente.nombreCompleto ?? '',
          dni: docente.dni ?? '',
          tipoContrato: docente.tipoContrato ?? 'nombrado',
          categoria: docente.categoria ?? 'principal',
          fechaIngreso: docente.fechaIngreso ? new Date(docente.fechaIngreso).toISOString().split('T')[0] : '',
          telefono: docente.telefono ?? '',
          emailPersonal: docente.emailPersonal ?? '',
          telegramId: docente.telegramId ?? '',
          antiguedadAnios: docente.antiguedadAnios ?? 0,
          activo: docente.activo ?? true,
          carreraIds: docente.carreras?.map((rel: any) => rel.carrera?.id).filter(Boolean) || [],
        });
      }
    } else {
      setSelectedDocente(null);
      reset({
        nombreCompleto: '',
        dni: '',
        tipoContrato: 'nombrado',
        categoria: 'principal',
        fechaIngreso: '',
        telefono: '',
        emailPersonal: '',
        telegramId: '',
        antiguedadAnios: 0,
        activo: true,
        carreraIds: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDocente(null);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        antiguedadAnios: Number(data.antiguedadAnios),
        carreraIds: Array.isArray(data.carreraIds) ? data.carreraIds.map((value: any) => Number(value)) : [],
      };

      if (selectedDocente) {
        await api.patch(`/docentes/${selectedDocente.id}`, payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Docente actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await api.post('/docentes', payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Creado!',
          text: 'Docente creado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      handleCloseDialog();
      fetchDocentes();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar docente',
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
        await api.delete(`/docentes/${id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Docente eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        fetchDocentes();
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al eliminar docente'
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
            Gestión de Docentes
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra el catálogo de docentes, sus categorías y tipos de contrato.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchDocentes} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nuevo Docente
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
              label="Buscar Docente por Nombre"
              placeholder="Escribe el nombre del docente..."
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
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
                startIcon={<DeleteSweepIcon />}
                onClick={() => {
                  setFiltros({
                    search: '',
                    tipoContrato: 'todos',
                    categoria: 'todos',
                    carreraId: 'todos'
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
            <>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={filtros.categoria}
                    label="Categoría"
                    onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                  >
                    <MenuItem value="todos">Todas las Categorías</MenuItem>
                    {categoriasDocente.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Contrato</InputLabel>
                  <Select
                    value={filtros.tipoContrato}
                    label="Tipo de Contrato"
                    onChange={(e) => setFiltros({ ...filtros, tipoContrato: e.target.value })}
                  >
                    <MenuItem value="todos">Todos los Contratos</MenuItem>
                    {tiposContrato.map(tipo => (
                      <MenuItem key={tipo.id} value={tipo.id}>{tipo.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Carrera</InputLabel>
                  <Select
                    value={filtros.carreraId}
                    label="Carrera"
                    onChange={(e) => setFiltros({ ...filtros, carreraId: e.target.value })}
                  >
                    <MenuItem value="todos">Todas las Carreras</MenuItem>
                    {carreras.map((carrera: any) => (
                      <MenuItem key={carrera.id} value={carrera.id}>
                        {carrera.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Tabla de Docentes */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>DOCENTE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>DNI</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CATEGORÍA</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CONTRATO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ANTIGÜEDAD</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docentesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 10, textAlign: 'center' }}>
                  <Typography color="textSecondary">No se encontraron docentes.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              docentesFiltrados
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((docente, index) => (
                <TableRow key={docente.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{docente.nombreCompleto}</Typography>
                  </TableCell>
                  <TableCell>{docente.dni || '---'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={categoriasDocente.find(c => c.id === docente.categoria.toLowerCase())?.nombre || docente.categoria} 
                      size="small"
                      sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', color: '#667eea', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={tiposContrato.find(t => t.id === docente.tipoContrato.toLowerCase())?.nombre || docente.tipoContrato} 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{docente.antiguedadAnios} años</TableCell>
                  <TableCell>
                    <Chip 
                      label={docente.activo ? 'Activo' : 'Inactivo'} 
                      color={docente.activo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(docente)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(docente.id)} color="error" size="small">
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
          count={docentesFiltrados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Diálogo CRUD */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: '#fff', fontWeight: 800, py: 2 }}>
              {selectedDocente ? 'Editar Docente' : 'Nuevo Docente'}
            </DialogTitle>
            <DialogContent sx={{ pt: 4, overflowY: 'visible' }}>
              <Box sx={{ mt: 1.5 }}>
                <Grid container spacing={2}>
              {/* Fila 1: Nombre y Fecha de Ingreso */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="nombreCompleto"
                  control={control}
                  rules={{
                    required: 'El nombre completo es obligatorio',
                    pattern: { value: /^[\p{L}\s]+$/u, message: 'Solo letras y espacios permitidos' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Nombre Completo"
                      error={!!errors.nombreCompleto}
                      helperText={errors.nombreCompleto?.message as string}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ inputMode: 'text' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="fechaIngreso"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="date"
                      label="Fecha de Ingreso"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Fila 2: DNI, Teléfono y Email Personal */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="dni"
                  control={control}
                  rules={{ 
                    required: 'El DNI es obligatorio',
                    pattern: {
                      value: /^[0-9]{8}$/,
                      message: 'El DNI debe tener 8 dígitos'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="DNI"
                      error={!!errors.dni}
                      helperText={errors.dni?.message as string}
                      inputProps={{ maxLength: 8 }}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Teléfono"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="emailPersonal"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="email"
                      label="Email Personal"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Fila 3: Telegram, Categoría y Tipo de Contrato */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="telegramId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Telegram (ID o Username)"
                      placeholder="@usuario o ID numérico"
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TelegramIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="categoria"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Categoría</InputLabel>
                      <Select {...field} label="Categoría">
                        {categoriasDocente.map(cat => (
                          <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="tipoContrato"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Contrato</InputLabel>
                      <Select {...field} label="Tipo de Contrato">
                        {tiposContrato.map(tipo => (
                          <MenuItem key={tipo.id} value={tipo.id}>{tipo.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="carreraIds"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      multiple
                      options={carreras}
                      getOptionLabel={(option: any) => option.nombre || ''}
                      value={carreras.filter(carrera => value?.includes(carrera.id))}
                      onChange={(_, newValue) => {
                        onChange(newValue.map((carrera) => carrera.id));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Carreras que enseña"
                          placeholder="Seleccione una o más carreras..."
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 600 }}>
            {selectedDocente ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
