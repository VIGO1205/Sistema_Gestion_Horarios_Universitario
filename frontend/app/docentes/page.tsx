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
  Checkbox,
  FormControlLabel,
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
    dedicacion: 'todos',
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

  const tiposContrato = [
    { id: 'nombrado', nombre: 'Nombrado' },
    { id: 'contratado', nombre: 'Contratado' },
    { id: 'extraordinario', nombre: 'Extraordinario' },
  ];

  const categoriasDocente = {
    ordinario: [
      { id: 'principal', nombre: 'Principal' },
      { id: 'asociado', nombre: 'Asociado' },
      { id: 'auxiliar', nombre: 'Auxiliar' },
    ],
    contratado: [
      { id: 'tipo_a1', nombre: 'Tipo A1' },
      { id: 'tipo_a2', nombre: 'Tipo A2' },
      { id: 'tipo_a3', nombre: 'Tipo A3' },
      { id: 'tipo_b1', nombre: 'Tipo B1' },
      { id: 'tipo_b2', nombre: 'Tipo B2' },
      { id: 'tipo_b3', nombre: 'Tipo B3' },
      { id: 'jefe_practica', nombre: 'Jefe de Práctica' },
    ],
    extraordinario: [
      { id: 'principal', nombre: 'Principal' },
      { id: 'asociado', nombre: 'Asociado' },
      { id: 'auxiliar', nombre: 'Auxiliar' },
      { id: 'tipo_a1', nombre: 'Tipo A1' },
      { id: 'tipo_a2', nombre: 'Tipo A2' },
      { id: 'tipo_a3', nombre: 'Tipo A3' },
      { id: 'tipo_b1', nombre: 'Tipo B1' },
      { id: 'tipo_b2', nombre: 'Tipo B2' },
      { id: 'tipo_b3', nombre: 'Tipo B3' },
      { id: 'jefe_practica', nombre: 'Jefe de Práctica' },
    ],
  };

  const facultades = [
    { id: 'ciencias_agropecuarias', nombre: 'Ciencias Agropecuarias' },
    { id: 'ciencias_biologicas', nombre: 'Ciencias Biológicas' },
    { id: 'ciencias_economicas', nombre: 'Ciencias Económicas' },
    { id: 'ciencias_fisicas_y_matematicas', nombre: 'Ciencias Físicas y Matemáticas' },
    { id: 'ciencias_sociales', nombre: 'Ciencias Sociales' },
    { id: 'educacion_y_ciencias_de_la_comunicacion', nombre: 'Educación y Ciencias de la Comunicación' },
    { id: 'derecho_y_ciencias_politicas', nombre: 'Derecho y Ciencias Políticas' },
    { id: 'enfermeria', nombre: 'Enfermería' },
    { id: 'estomatologia', nombre: 'Estomatología' },
    { id: 'farmacia_y_bioquimica', nombre: 'Farmacia y Bioquímica' },
    { id: 'ingenieria', nombre: 'Ingeniería' },
    { id: 'ingenieria_quimica', nombre: 'Ingeniería Química' },
    { id: 'medicina', nombre: 'Medicina' },
    { id: 'valle_jequetepeque', nombre: 'Valle Jequetepeque' },
    { id: 'huamachuco', nombre: 'Huamachuco' },
    { id: 'santiago_de_chuco', nombre: 'Santiago de Chuco' },
  ];

  const departamentosAcademicos = [
    { id: 'administracion', nombre: 'Administración' },
    { id: 'agronomia_y_zootecnia', nombre: 'Agronomía y Zootecnia' },
    { id: 'arqueologia_y_antropologia', nombre: 'Arqueología y Antropología' },
    { id: 'bioquimica', nombre: 'Bioquímica' },
    { id: 'ciencias_agroindustriales', nombre: 'Ciencias Agroindustriales' },
    { id: 'ciencias_basicas_medicas', nombre: 'Ciencias Básicas Médicas' },
    { id: 'ciencias_biologicas', nombre: 'Ciencias Biológicas' },
    { id: 'ciencias_de_la_educacion', nombre: 'Ciencias de la Educación' },
    { id: 'ciencias_psicologicas', nombre: 'Ciencias Psicológicas' },
    { id: 'ciencias_sociales', nombre: 'Ciencias Sociales' },
    { id: 'cirugia', nombre: 'Cirugía' },
    { id: 'comunicacion_social', nombre: 'Comunicación Social' },
    { id: 'contabilidad_y_finanzas', nombre: 'Contabilidad y Finanzas' },
    { id: 'enfermeria_de_la_mujer_nino_y_adolescente', nombre: 'Enfermería de la Mujer, Niño y Adolescente' },
    { id: 'derecho', nombre: 'Derecho' },
    { id: 'economia', nombre: 'Economía' },
    { id: 'estadistica', nombre: 'Estadística' },
    { id: 'estomatologia', nombre: 'Estomatología' },
    { id: 'farmacologia', nombre: 'Farmacología' },
    { id: 'farmacotecnia', nombre: 'Farmacotecnia' },
    { id: 'filosofia_y_arte', nombre: 'Filosofía y Arte' },
    { id: 'fisica', nombre: 'Física' },
    { id: 'fisiologia_humana', nombre: 'Fisiología Humana' },
    { id: 'ginecologia_y_obstetricia', nombre: 'Ginecología y Obstetricia' },
    { id: 'historia_y_geografia', nombre: 'Historia y Geografía' },
    { id: 'idiomas_y_linguistica', nombre: 'Idiomas y Lingüística' },
    { id: 'informatica', nombre: 'Informática' },
    { id: 'ingenieria_ambiental', nombre: 'Ingeniería Ambiental' },
    { id: 'ingenieria_civil_arquitectura_y_urbanismo', nombre: 'Ingeniería Civil, Arquitectura y Urbanismo' },
    { id: 'ingenieria_de_materiales', nombre: 'Ingeniería de Materiales' },
    { id: 'ingenieria_de_minas', nombre: 'Ingeniería de Minas' },
    { id: 'ingenieria_de_sistemas', nombre: 'Ingeniería de Sistemas' },
    { id: 'ingenieria_industrial', nombre: 'Ingeniería Industrial' },
    { id: 'ingenieria_mecatronica', nombre: 'Ingeniería Mecatrónica' },
    { id: 'ingenieria_metalurgica', nombre: 'Ingeniería Metalúrgica' },
    { id: 'ingenieria_quimica', nombre: 'Ingeniería Química' },
    { id: 'lengua_nacional_y_literatura', nombre: 'Lengua Nacional y Literatura' },
    { id: 'matematicas', nombre: 'Matemáticas' },
    { id: 'mecanica_y_energia', nombre: 'Mecánica y Energía' },
    { id: 'medicina', nombre: 'Medicina' },
    { id: 'medicina_preventiva_y_salud_publica', nombre: 'Medicina Preventiva y Salud Pública' },
    { id: 'microbiologia_y_parasitologia', nombre: 'Microbiología y Parasitología' },
    { id: 'morfologia_humana', nombre: 'Morfología Humana' },
    { id: 'pediatria', nombre: 'Pediatría' },
    { id: 'pesqueria', nombre: 'Pesquería' },
    { id: 'quimica', nombre: 'Química' },
    { id: 'quimica_biologica_y_fisiologia_animal', nombre: 'Química Biológica y Fisiología Animal' },
    { id: 'salud_del_adulto_y_salud_familiar_y_comunitaria', nombre: 'Salud del Adulto y Salud Familiar y Comunitaria' },
  ];

  const cargosAdministrativos = [
    { id: 'ninguno', nombre: 'Ninguno' },
    { id: 'rector_vicerrector', nombre: 'Rector/Vicerrector' },
    { id: 'decano_director_postgrado', nombre: 'Decano/Director de Postgrado' },
    { id: 'director_escuela_departamento', nombre: 'Director de Escuela/Departamento' },
    { id: 'director_filial', nombre: 'Director de Filial' },
  ];

  const dedicacionesDocente = {
    ordinario: [
      'DOCENTE INVESTIGADOR',
      'DEDICACION EXCLUSIVA',
      'TIEMPO COMPLETO 40 H',
      'TIEMPO PARCIAL 20 H',
      'TIEMPO PARCIAL 12 H',
      'TIEMPO PARCIAL 10 H',
      'TIEMPO PARCIAL 4 H',
    ],
    extraordinario: [
      'DEDICACION EXCLUSIVA',
      'TIEMPO COMPLETO 40 H',
      'TIEMPO PARCIAL 20 H',
      'TIEMPO PARCIAL 12 H',
      'TIEMPO PARCIAL 10 H',
    ],
    contratado: [
      'TIEMPO COMPLETO A1/B1',
      'TIEMPO PARCIAL A2/B2 16 H',
      'TIEMPO PARCIAL A3/B3 8 H',
    ],
  };

  const normalizeDedicacion = (val: string, tipoContrato: string = 'ordinario') => {
    const disponibles = (dedicacionesDocente as any)[tipoContrato] || dedicacionesDocente.ordinario;
    if (!val) return disponibles[0] || 'TIEMPO COMPLETO 40 H';
    const normalized = val.toUpperCase().trim();

    const match = disponibles.find((d: string) => d === normalized);
    if (match) return match;

    const flexibleMatch = disponibles.find((d: string) => d.replace(/\s/g, '') === normalized.replace(/\s/g, ''));
    return flexibleMatch || disponibles[0] || 'TIEMPO COMPLETO 40 H';
  };

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nombreCompleto: '',
      dni: '',
      tipoContrato: 'nombrado',
      categoria: 'principal',
      facultad: '',
      departamentoAcademico: '',
      cargoAdministrativo: 'ninguno',
      esBecario: false,
      dedicacion: 'TIEMPO COMPLETO 40 H',
      fechaIngreso: '',
      telefono: '',
      emailPersonal: '',
      telegramId: '',
      codigoIBM: '0000',
      antiguedadAnios: 0,
      activo: true,
      carreraIds: [] as number[],
    },
  });

  // Watch tipoContrato para actualizar categorías y dedicaciones disponibles
  const watchedTipoContrato = watch('tipoContrato');

  // Obtener categorías y dedicaciones según el tipo de contrato seleccionado
  const getCategoriasDisponibles = () => (categoriasDocente as any)[watchedTipoContrato] || categoriasDocente.ordinario;
  const getDedicacionesDisponibles = () => (dedicacionesDocente as any)[watchedTipoContrato] || dedicacionesDocente.ordinario;

  useEffect(() => {
    fetchDocentes();
    fetchCarreras();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.tipoContrato, filtros.categoria, filtros.carreraId, filtros.dedicacion]);

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
      const coincideDedicacion = filtros.dedicacion === 'todos' || docente.dedicacion === filtros.dedicacion;

      const coincideCarrera =
        filtros.carreraId === 'todos' ||
        (Array.isArray(docente.carreras) &&
          docente.carreras.some((rel: any) => Number(rel?.carrera?.id) === Number(filtros.carreraId)));

      return coincideBusqueda && coincideTipo && coincideCategoria && coincideCarrera && coincideDedicacion;
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

        const tipoContrato = docenteRes.data?.tipoContrato ?? docente.tipoContrato ?? 'nombrado';
        const key = tipoContrato === 'nombrado' ? 'ordinario' : tipoContrato;
        const categoriasDisponibles = (categoriasDocente as any)[key] || categoriasDocente.ordinario;
        let categoria = docenteRes.data?.categoria ?? docente.categoria ?? 'principal';
        if (!categoriasDisponibles.some((c: any) => c.id === categoria)) {
          categoria = categoriasDisponibles[0]?.id || 'principal';
        }

        reset({
          nombreCompleto: docenteRes.data?.nombreCompleto ?? docente.nombreCompleto ?? '',
          dni: docenteRes.data?.dni ?? docente.dni ?? '',
          tipoContrato,
          categoria,
          facultad: docenteRes.data?.facultad ?? docente.facultad ?? '',
          departamentoAcademico: docenteRes.data?.departamentoAcademico ?? docente.departamentoAcademico ?? '',
          cargoAdministrativo: docenteRes.data?.cargoAdministrativo ?? docente.cargoAdministrativo ?? 'ninguno',
          esBecario: docenteRes.data?.esBecario ?? docente.esBecario ?? false,
          dedicacion: normalizeDedicacion(docenteRes.data?.dedicacion || docente.dedicacion, key),
          fechaIngreso: docenteRes.data?.fechaIngreso ? new Date(docenteRes.data.fechaIngreso).toISOString().split('T')[0] : '',
          telefono: docenteRes.data?.telefono ?? '',
          emailPersonal: docenteRes.data?.emailPersonal ?? '',
          telegramId: docenteRes.data?.telegramId ?? '',
          codigoIBM: docenteRes.data?.codigoIBM ?? '0000',
          antiguedadAnios: docenteRes.data?.antiguedadAnios ?? docente.antiguedadAnios ?? 0,
          activo: docenteRes.data?.activo ?? docente.activo ?? true,
          carreraIds,
        });
      } catch (error) {
        const tipoContrato = docente.tipoContrato ?? 'nombrado';
        const key = tipoContrato === 'nombrado' ? 'ordinario' : tipoContrato;
        const categoriasDisponibles = (categoriasDocente as any)[key] || categoriasDocente.ordinario;
        let categoria = docente.categoria ?? 'principal';
        if (!categoriasDisponibles.some((c: any) => c.id === categoria)) {
          categoria = categoriasDisponibles[0]?.id || 'principal';
        }

        reset({
          nombreCompleto: docente.nombreCompleto ?? '',
          dni: docente.dni ?? '',
          tipoContrato,
          categoria,
          facultad: docente.facultad ?? '',
          departamentoAcademico: docente.departamentoAcademico ?? '',
          cargoAdministrativo: docente.cargoAdministrativo ?? 'ninguno',
          esBecario: docente.esBecario ?? false,
          dedicacion: normalizeDedicacion(docente.dedicacion, key),
          fechaIngreso: docente.fechaIngreso ? new Date(docente.fechaIngreso).toISOString().split('T')[0] : '',
          telefono: docente.telefono ?? '',
          emailPersonal: docente.emailPersonal ?? '',
          telegramId: docente.telegramId ?? '',
          codigoIBM: docente.codigoIBM ?? '0000',
          antiguedadAnios: docente.antiguedadAnios ?? 0,
          activo: docente.activo ?? true,
          carreraIds: docente.carreras?.map((rel: any) => rel.carrera?.id).filter(Boolean) || [],
        });
      }
    } else {
      setSelectedDocente(null);
      const categoriasDisponibles = categoriasDocente.ordinario;
      const dedicacionesDisponibles = dedicacionesDocente.ordinario;

      reset({
        nombreCompleto: '',
        dni: '',
        tipoContrato: 'nombrado',
        categoria: categoriasDisponibles[0]?.id || 'principal',
        facultad: '',
        departamentoAcademico: '',
        cargoAdministrativo: 'ninguno',
        esBecario: false,
        dedicacion: dedicacionesDisponibles[0] || 'TIEMPO COMPLETO 40 H',
        fechaIngreso: '',
        telefono: '',
        emailPersonal: '',
        telegramId: '',
        codigoIBM: '0000',
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
                    carreraId: 'todos',
                    dedicacion: 'todos'
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={filtros.categoria}
                    label="Categoría"
                    onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                  >
                    <MenuItem value="todos">Todas las Categorías</MenuItem>
                    {Object.values(categoriasDocente).flat().map((cat: any) => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Dedicación</InputLabel>
                  <Select
                    value={filtros.dedicacion}
                    label="Dedicación"
                    onChange={(e) => setFiltros({ ...filtros, dedicacion: e.target.value })}
                  >
                    <MenuItem value="todos">Todas las Dedicaciones</MenuItem>
                    {Object.values(dedicacionesDocente).flat().map((ded: string) => (
                      <MenuItem key={ded} value={ded}>{ded}</MenuItem>
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
                        label={Object.values(categoriasDocente).flat().find(c => c.id === docente.categoria?.toLowerCase())?.nombre || docente.categoria}
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
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth 
        scroll="paper"
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          } 
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <DialogTitle sx={{ bgcolor: '#003366', color: '#fff', fontWeight: 800, py: 2, flexShrink: 0 }}>
            {selectedDocente ? 'Editar Docente' : 'Nuevo Docente'}
          </DialogTitle>
          <DialogContent sx={{ pt: 4, overflowY: 'auto', flexGrow: 1, overflowX: 'hidden' }}>
            <Box sx={{ mt: 1.5 }}>
              {/* Sección 1: Datos Personales */}
              <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#003366' }}>
                  Datos Personales
                </Typography>
                <Grid container spacing={2}>
                  {/* Fila 1: Nombre Completo y Fecha de Ingreso */}
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

                  {/* Fila 3: Telegram y Código IBM */}
                  <Grid item xs={12} md={6}>
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
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="codigoIBM"
                      control={control}
                      rules={{
                        pattern: {
                          value: /^[0-9]{4}$/,
                          message: 'El Código IBM debe tener 4 dígitos'
                        }
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Código IBM"
                          placeholder="0000"
                          error={!!errors.codigoIBM}
                          helperText={errors.codigoIBM?.message as string}
                          inputProps={{ maxLength: 4 }}
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
                </Grid>
              </Paper>

              {/* Sección 2: Datos Laborales */}
              <Paper elevation={1} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#003366' }}>
                  Datos Laborales
                </Typography>
                <Grid container spacing={2}>
                  {/* Fila 1: Tipo de Contrato, Categoría y Dedicación (cascada) */}
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="tipoContrato"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel shrink>Tipo de Contrato</InputLabel>
                          <Select
                            {...field}
                            label="Tipo de Contrato"
                            onChange={(e) => {
                              field.onChange(e);
                              // Cuando cambia el tipo de contrato, actualizamos categoría y dedicación
                              const nuevoTipo = e.target.value;
                              const nuevasCategorias = (categoriasDocente as any)[nuevoTipo] || categoriasDocente.ordinario;
                              const nuevasDedicaciones = (dedicacionesDocente as any)[nuevoTipo] || dedicacionesDocente.ordinario;
                              setValue('categoria', nuevasCategorias[0]?.id || 'principal');
                              setValue('dedicacion', nuevasDedicaciones[0] || 'TIEMPO COMPLETO 40 H');
                            }}
                          >
                            {tiposContrato.map(tipo => (
                              <MenuItem key={tipo.id} value={tipo.id}>{tipo.nombre}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="categoria"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel shrink>Categoría</InputLabel>
                          <Select {...field} label="Categoría">
                            {getCategoriasDisponibles().map((cat: any) => (
                              <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="dedicacion"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel shrink>Dedicación</InputLabel>
                          <Select {...field} label="Dedicación">
                            {getDedicacionesDisponibles().map((ded: string) => (
                              <MenuItem key={ded} value={ded}>{ded}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  {/* Fila 2: Facultad y Departamento Académico */}
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="facultad"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Facultad</InputLabel>
                          <Select {...field} label="Facultad">
                            {facultades.map(fac => (
                              <MenuItem key={fac.id} value={fac.id}>{fac.nombre}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="departamentoAcademico"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Departamento Académico</InputLabel>
                          <Select {...field} label="Departamento Académico">
                            {departamentosAcademicos.map(depto => (
                              <MenuItem key={depto.id} value={depto.id}>{depto.nombre}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  {/* Fila 3: Cargo Administrativo y Es Becario */}
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="cargoAdministrativo"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Cargo Administrativo</InputLabel>
                          <Select {...field} label="Cargo Administrativo">
                            {cargosAdministrativos.map(cargo => (
                              <MenuItem key={cargo.id} value={cargo.id}>{cargo.nombre}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="esBecario"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <FormControlLabel
                            control={<Checkbox {...field} checked={field.value} />}
                            label="Es Becario"
                          />
                        </FormControl>
                      )}
                    />
                  </Grid>

                  {/* Fila 4: Carreras que enseña */}
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
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, flexShrink: 0 }}>
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
