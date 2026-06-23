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
  IconButton,
  Tooltip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Avatar,
  TablePagination,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  DeleteSweep as DeleteSweepIcon,
  AdminPanelSettings as AdminIcon,
  SupervisedUserCircle as CoordIcon,
  Badge as DocenteIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm, Controller } from 'react-hook-form';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [usuarioFiltros, setUsuarioFiltros] = useState({
    rol: 'todos',
    estado: 'todos',
    vinculacion: 'todos',
  });
  
  // Filtros para búsqueda de docente
  const [docenteFiltros, setDocenteFiltros] = useState({
    carreraId: 'todos',
    categoria: 'todos',
    condicion: 'todos',
  });

  // Paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // CRUD Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      rol: 'docente',
      activo: true,
      docenteId: '',
    }
  });

  const rolSeleccionado = watch('rol');
  const password = watch('password');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, usuarioFiltros.rol, usuarioFiltros.estado, usuarioFiltros.vinculacion]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usuariosRes, docentesRes, carrerasRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/docentes'),
        api.get('/carreras'),
      ]);
      setUsuarios(usuariosRes.data);
      setDocentes(docentesRes.data);
      setCarreras(carrerasRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos de usuarios',
      });
    } finally {
      setLoading(false);
    }
  };

  const generarEmailSugerido = (docente: any) => {
    if (!docente || !docente.nombreCompleto) return '';
    
    // Asumiendo formato "APELLIDOS, NOMBRES" o similar. 
    // Si es "NOMBRE APELLIDO", buscamos los nombres.
    const partes = docente.nombreCompleto.trim().split(' ');
    if (partes.length < 2) return `${partes[0].toLowerCase()}@unt.edu.pe`;

    const primerNombre = partes[0].toLowerCase();
    const segundoNombre = partes[1].toLowerCase();
    
    // Lógica pedida: primer nombre completo + 2 primeras letras del segundo nombre
    const emailBase = `${primerNombre}${segundoNombre.substring(0, 2)}`;
    return `${emailBase}@unt.edu.pe`;
  };

  const handleDocenteChange = (docenteId: any) => {
    setValue('docenteId', docenteId);
    if (docenteId && !selectedUsuario) {
      const docente = docentes.find(d => d.id === docenteId);
      if (docente) {
        const emailSugerido = generarEmailSugerido(docente);
        setValue('email', emailSugerido);
      }
    }
  };

  const docentesFiltradosParaBusqueda = docentes.filter(d => {
    const cumpleCarrera = docenteFiltros.carreraId === 'todos' || 
      d.carreras?.some((dc: any) => dc.carreraId === parseInt(docenteFiltros.carreraId as string));
    const cumpleCategoria = docenteFiltros.categoria === 'todos' || d.categoria === docenteFiltros.categoria;
    const cumpleContrato = docenteFiltros.condicion === 'todos' || d.condicion === docenteFiltros.condicion;
    
    return cumpleCarrera && cumpleCategoria && cumpleContrato;
  });

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u: any) => {
      const texto = `${u.email || ''} ${u.docente?.nombreCompleto || ''}`.toLowerCase();
      const coincideBusqueda = !searchTerm || texto.includes(searchTerm.toLowerCase());
      const coincideRol = usuarioFiltros.rol === 'todos' || u.rol === usuarioFiltros.rol;
      const coincideEstado =
        usuarioFiltros.estado === 'todos' ||
        (usuarioFiltros.estado === 'activo' ? u.activo : !u.activo);
      const coincideVinculacion =
        usuarioFiltros.vinculacion === 'todos' ||
        (usuarioFiltros.vinculacion === 'vinculado' ? Boolean(u.docente) : !u.docente);

      return coincideBusqueda && coincideRol && coincideEstado && coincideVinculacion;
    });
  }, [usuarios, searchTerm, usuarioFiltros]);

  const handleOpenDialog = (usuario: any = null) => {
    if (usuario) {
      setSelectedUsuario(usuario);
      reset({
        email: usuario.email,
        password: '',
        confirmPassword: '',
        rol: usuario.rol,
        activo: usuario.activo,
        docenteId: usuario.docenteId || '',
      });
    } else {
      setSelectedUsuario(null);
      reset({
        email: '',
        password: '',
        confirmPassword: '',
        rol: 'docente',
        activo: true,
        docenteId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUsuario(null);
  };

  const onSubmit = async (data: any) => {
    try {
      const { confirmPassword, ...payload } = data;
      
      if (payload.docenteId === '') delete payload.docenteId;
      if (selectedUsuario && !payload.password) delete payload.password;

      if (selectedUsuario) {
        await api.patch(`/usuarios/${selectedUsuario.id}`, payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Usuario actualizado correctamente',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await api.post('/usuarios', payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Creado!',
          text: 'Usuario creado correctamente',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar el usuario',
      });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "Se eliminará el acceso de este usuario al sistema.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/usuarios/${id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Usuario eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        fetchData();
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al eliminar usuario'
        });
      }
    }
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'admin': return <AdminIcon sx={{ color: '#d32f2f' }} />;
      case 'coordinador': return <CoordIcon sx={{ color: '#1976d2' }} />;
      default: return <DocenteIcon sx={{ color: '#2e7d32' }} />;
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setUsuarioFiltros({ rol: 'todos', estado: 'todos', vinculacion: 'todos' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Cabecera */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
            Gestión de Usuarios
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra las cuentas de acceso, roles y permisos del sistema.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchData} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nuevo Usuario
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
              label="Buscar Usuario"
              placeholder="Escribe el email o nombre del docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
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
                onClick={handleClearFilters}
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
            <>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={usuarioFiltros.rol}
                    label="Rol"
                    onChange={(e) => setUsuarioFiltros({ ...usuarioFiltros, rol: e.target.value })}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="admin">Administrador</MenuItem>
                    <MenuItem value="coordinador">Coordinador</MenuItem>
                    <MenuItem value="docente">Docente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={usuarioFiltros.estado}
                    label="Estado"
                    onChange={(e) => setUsuarioFiltros({ ...usuarioFiltros, estado: e.target.value })}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="activo">Activos</MenuItem>
                    <MenuItem value="inactivo">Inactivos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Vinculación</InputLabel>
                  <Select
                    value={usuarioFiltros.vinculacion}
                    label="Vinculación"
                    onChange={(e) => setUsuarioFiltros({ ...usuarioFiltros, vinculacion: e.target.value })}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="vinculado">Con docente vinculado</MenuItem>
                    <MenuItem value="sin_vinculo">Sin vínculo docente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Tabla */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>USUARIO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ROL</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>VINCULADO A</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuariosFiltrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
              <TableRow key={u.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#eef2f6', color: '#003366' }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography sx={{ fontWeight: 600 }}>{u.email}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRolIcon(u.rol)}
                    <Typography sx={{ textTransform: 'capitalize', fontWeight: 500 }}>{u.rol}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {u.docente ? (
                    <Chip label={u.docente.nombreCompleto} size="small" variant="outlined" />
                  ) : (
                    <Typography variant="body2" color="textSecondary">No vinculado</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={u.activo ? 'Activo' : 'Inactivo'} 
                    color={u.activo ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenDialog(u)} color="primary" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(u.id)} color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={usuariosFiltrados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página"
        />
      </TableContainer>

      {/* Dialog CRUD */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
            {selectedUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogContent sx={{ pt: 4 }}>
            <Grid container spacing={3} sx={{ pt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="rol"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Rol del Sistema</InputLabel>
                      <Select {...field} label="Rol del Sistema">
                        <MenuItem value="admin">Administrador</MenuItem>
                        <MenuItem value="coordinador">Coordinador</MenuItem>
                        <MenuItem value="docente">Docente</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {rolSeleccionado === 'docente' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#003366' }}>
                      Búsqueda de Docente para Vinculación
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Carrera</InputLabel>
                          <Select
                            value={docenteFiltros.carreraId}
                            label="Carrera"
                            onChange={(e) => setDocenteFiltros({ ...docenteFiltros, carreraId: e.target.value })}
                          >
                            <MenuItem value="todos">Todas</MenuItem>
                            {carreras.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Categoría</InputLabel>
                          <Select
                            value={docenteFiltros.categoria}
                            label="Categoría"
                            onChange={(e) => setDocenteFiltros({ ...docenteFiltros, categoria: e.target.value })}
                          >
                            <MenuItem value="todos">Todas</MenuItem>
                            <MenuItem value="principal">Principal</MenuItem>
                            <MenuItem value="asociado">Asociado</MenuItem>
                            <MenuItem value="auxiliar">Auxiliar</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Contrato</InputLabel>
                          <Select
                            value={docenteFiltros.condicion}
                            label="Contrato"
                            onChange={(e) => setDocenteFiltros({ ...docenteFiltros, condicion: e.target.value })}
                          >
                            <MenuItem value="todos">Todos</MenuItem>
                            <MenuItem value="nombrado">Nombrado</MenuItem>
                            <MenuItem value="contratado">Contratado</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="docenteId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Seleccionar Docente</InputLabel>
                          <Select 
                            {...field} 
                            label="Seleccionar Docente"
                            onChange={(e) => handleDocenteChange(e.target.value)}
                          >
                            <MenuItem value="">Ninguno</MenuItem>
                            {docentesFiltradosParaBusqueda.map(d => (
                              <MenuItem key={d.id} value={d.id}>{d.nombreCompleto}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: 'El email es obligatorio', pattern: { value: /^\S+@\S+$/i, message: 'Email no válido' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Correo Institucional"
                      helperText="Puedes editar el correo sugerido si lo deseas."
                      error={!!errors.email}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><EmailIcon color="primary" /></InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="password"
                  control={control}
                  rules={{ 
                    required: selectedUsuario ? false : 'La contraseña es obligatoria', 
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' } 
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="password"
                      label="Contraseña"
                      placeholder={selectedUsuario ? "Dejar en blanco" : "Mínimo 6 caracteres"}
                      error={!!errors.password}
                      helperText={errors.password?.message as string}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon color="primary" /></InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  rules={{ 
                    validate: value => 
                      !password || value === password || 'Las contraseñas no coinciden'
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="password"
                      label="Confirmar Contraseña"
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message as string}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon color="primary" /></InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366' }}>
              {selectedUsuario ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
