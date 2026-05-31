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
  Checkbox,
} from '@mui/material';
import {
  School as SchoolIcon,
  Groups as GroupsIcon,
  Science as ScienceIcon,
  Book as BookIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
  Code as CodeIcon,
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm, Controller } from 'react-hook-form';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function CursosPage() {
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    search: '',
    ciclo: 'todos',
    creditos: 'todos',
    carreraId: 'todos',
  });

  // Opciones para filtros
  const ciclosAcademicos = Array.from({ length: 10 }, (_, i) => i + 1);
  const creditosOpciones = [1, 2, 3, 4, 5, 6];

  // Estado para la paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estado para el CRUD
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openImportPreviewDialog, setOpenImportPreviewDialog] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [importCarreraId, setImportCarreraId] = useState('');
  const [previewCursos, setPreviewCursos] = useState<any[]>([]);
  const [previewFiltroCiclo, setPreviewFiltroCiclo] = useState('todos');
  const [previewFiltroCreditos, setPreviewFiltroCreditos] = useState('todos');
  const [previewPage, setPreviewPage] = useState(0);
  const previewRowsPerPage = 10;
  // Programación por ciclo UI
  const [openProgDialog, setOpenProgDialog] = useState(false);
  const [programaciones, setProgramaciones] = useState<any[]>([]);
  const [progLoading, setProgLoading] = useState(false);
  const [currentCursoProg, setCurrentCursoProg] = useState<any>(null);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [currentCicloId, setCurrentCicloId] = useState<number | null>(null);
  const [newProg, setNewProg] = useState({ 
    cicloId: '', 
    horasTeoria: 0, 
    numGruposTeoria: 0,
    horasPractica: 0, 
    numGruposPractica: 0,
    horasLaboratorio: 0, 
    numGruposLaboratorio: 0,
    numeroGrupos: 0 // Mantener por compatibilidad si es necesario
  });
  const [editingProgId, setEditingProgId] = useState<number | null>(null);

  const filteredPreviewCursos = useMemo(() => {
    return previewCursos
      .map((curso, originalIndex) => ({ curso, originalIndex }))
      .filter(({ curso }) => {
        const cicloOk =
          previewFiltroCiclo === 'todos' ||
          String(curso.cicloAcademico || '').trim() === previewFiltroCiclo;

        const creditosOk =
          previewFiltroCreditos === 'todos' ||
          Number(curso.creditos) === Number(previewFiltroCreditos);

        return cicloOk && creditosOk;
      });
  }, [previewCursos, previewFiltroCiclo, previewFiltroCreditos]);

  const selectedPreviewCount = useMemo(
    () => previewCursos.filter((curso) => Boolean(curso.__selected)).length,
    [previewCursos],
  );

  const paginatedPreview = useMemo(() => {
    return filteredPreviewCursos.slice(previewPage * previewRowsPerPage, previewPage * previewRowsPerPage + previewRowsPerPage);
  }, [filteredPreviewCursos, previewPage]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      codigo: '',
      cicloAcademico: '1',
      creditos: 4,
      carreraId: '',
    }
  });

  useEffect(() => {
    fetchCarreras();
  }, []);

  useEffect(() => {
    fetchCursos();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.ciclo, filtros.creditos, filtros.carreraId]);

  const fetchCarreras = async () => {
    try {
      const response = await api.get('/carreras');
      setCarreras(response.data);
    } catch (error) {
      console.error('Error fetching carreras:', error);
    }
  };

  const fetchCursos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cursos');
      setCursos(response.data);
    } catch (error) {
      console.error('Error fetching cursos:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los cursos'
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

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso: any) => {
      const texto = `${curso.nombre || ''} ${curso.codigo || ''} ${curso.carrera?.nombre || ''}`.toLowerCase();
      const coincideBusqueda = !filtros.search || texto.includes(filtros.search.toLowerCase());
      const coincideCiclo = filtros.ciclo === 'todos' || String(curso.cicloAcademico) === String(filtros.ciclo);
      const coincideCreditos = filtros.creditos === 'todos' || Number(curso.creditos) === Number(filtros.creditos);
      const coincideCarrera = filtros.carreraId === 'todos' || Number(curso.carreraId) === Number(filtros.carreraId);

      return coincideBusqueda && coincideCiclo && coincideCreditos && coincideCarrera;
    });
  }, [cursos, filtros]);

  const executeImportExtraction = async () => {
    if (!pdfFile || !importCarreraId) {
      MySwal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor selecciona un archivo PDF y una carrera profesional.',
      });
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('carreraId', importCarreraId);

    try {
      const response = await api.post('/cursos/importar-ia', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setOpenImportDialog(false);

      const cursosExtraidos = Array.isArray(response.data?.cursos) ? response.data.cursos : [];
      if (cursosExtraidos.length === 0) {
        MySwal.fire({
          icon: 'warning',
          title: 'Sin resultados',
          text: 'La IA no encontró cursos en el PDF. Prueba con otro documento o ajusta el contenido.',
        });
        return;
      }

      // Marcar cursos duplicados
      const cursosConDuplicados = cursosExtraidos.map((curso: any) => {
        const esDuplicadoCodigo = cursos.some(c => 
          c.codigo.toLowerCase() === String(curso.codigo || '').toLowerCase()
        );
        const esDuplicadoNombre = cursos.some(c => 
          c.nombre.toLowerCase() === String(curso.nombre || '').toLowerCase()
        );
        
        const duplicado = esDuplicadoCodigo || esDuplicadoNombre;

        return { 
          ...curso, 
          __selected: !duplicado, // Desmarcar automáticamente si es duplicado
          __duplicado: duplicado,
          __motivoDuplicado: esDuplicadoCodigo ? 'Código ya registrado' : (esDuplicadoNombre ? 'Nombre ya registrado' : '')
        };
      });

      setPreviewCursos(cursosConDuplicados);
      setPreviewFiltroCiclo('todos');
      setPreviewFiltroCreditos('todos');
      setPreviewPage(0);
      setOpenImportPreviewDialog(true);
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al procesar el PDF con IA',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleOpenDialog = (curso: any = null) => {
    if (curso) {
      setSelectedCurso(curso);
      reset({
        nombre: curso.nombre,
        codigo: curso.codigo,
        cicloAcademico: curso.cicloAcademico,
        creditos: curso.creditos,
        carreraId: curso.carreraId || '',
      });
    } else {
      setSelectedCurso(null);
      reset({
        nombre: '',
        codigo: '',
        cicloAcademico: '1',
        creditos: 4,
        carreraId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCurso(null);
  };

  const onSubmit = async (data: any) => {
    try {
      // Limpiar payload
      const { id, createdAt, updatedAt, asignaciones, horarios, ...payload } = data;
      
      if (selectedCurso) {
        await api.patch(`/cursos/${selectedCurso.id}`, payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Curso actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await api.post('/cursos', payload);
        MySwal.fire({
          icon: 'success',
          title: '¡Creado!',
          text: 'Curso creado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
      }
      handleCloseDialog();
      fetchCursos();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar curso'
      });
    }
  };

  const handleImportSubmit = async () => {
    await executeImportExtraction();
  };

  const handleReextractFromPreview = async () => {
    const result = await MySwal.fire({
      icon: 'question',
      title: '¿Reextraer el PDF?',
      text: '¿Quieres hacer otra vez la extracción de los cursos de tu PDF usando la IA?',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, volver a extraer',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      await executeImportExtraction();
    }
  };

  const handlePreviewCursoChange = (index: number, field: string, value: string) => {
    setPreviewCursos((prev) =>
      prev.map((curso, i) => {
        if (i !== index) return curso;
        if (field === 'creditos') {
          return { ...curso, [field]: value === '' ? '' : Number(value) };
        }
        return { ...curso, [field]: value };
      }),
    );
  };

  const handlePreviewCursoSelect = (index: number, selected: boolean) => {
    setPreviewCursos((prev) =>
      prev.map((curso, i) => (i === index ? { ...curso, __selected: selected } : curso)),
    );
  };

  const handleSelectAllPreviewCursos = () => {
    setPreviewCursos((prev) => prev.map((curso) => ({ ...curso, __selected: true })));
  };

  const handleDeselectAllPreviewCursos = () => {
    setPreviewCursos((prev) => prev.map((curso) => ({ ...curso, __selected: false })));
  };

  const handleRemovePreviewCurso = async (index: number) => {
    const result = await MySwal.fire({
      title: '¿Eliminar fila?',
      text: '¿Deseas eliminar esta fila importada? Esta acción no afectará la base de datos hasta que guardes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      setPreviewCursos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveSelectedPreviewCursos = async () => {
    const selectedCount = previewCursos.filter((c) => Boolean(c.__selected)).length;
    if (selectedCount === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Nada seleccionado',
        text: 'Selecciona al menos un curso para borrar.',
      });
      return;
    }

    const result = await MySwal.fire({
      title: `Eliminar ${selectedCount} curso(s)?`,
      text: `Se eliminarán ${selectedCount} cursos de la previsualización. ¿Confirmas?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar seleccionados',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      setPreviewCursos((prev) => prev.filter((c) => !c.__selected));
      MySwal.fire({ icon: 'success', title: 'Eliminados', text: `${selectedCount} cursos eliminados.` });
    }
  };

  const handleConfirmImport = async () => {
    if (!importCarreraId) {
      MySwal.fire({
        icon: 'warning',
        title: 'Carrera no seleccionada',
        text: 'Debes seleccionar la carrera para guardar los cursos.',
      });
      return;
    }

    if (previewCursos.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Sin cursos',
        text: 'No hay cursos en la tabla para guardar.',
      });
      return;
    }

    const cursosSeleccionados = previewCursos.filter((curso) => Boolean(curso.__selected));

    if (cursosSeleccionados.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Selecciona al menos un curso para guardarlo.',
      });
      return;
    }

    const invalidIndex = cursosSeleccionados.findIndex(
      (curso) =>
        !String(curso.codigo || '').trim() ||
        !String(curso.nombre || '').trim() ||
        !String(curso.cicloAcademico || '').trim() ||
        Number(curso.creditos) < 1 ||
        Number.isNaN(Number(curso.creditos)),
    );

    if (invalidIndex >= 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: `Revisa la fila ${invalidIndex + 1}. Debe tener código, nombre, ciclo y créditos válidos (mínimo 1).`,
      });
      return;
    }

    setSavingImport(true);
    try {
      await api.post('/cursos/importar-ia/confirmar', {
        carreraId: Number(importCarreraId),
        cursos: cursosSeleccionados.map((curso) => ({
          codigo: String(curso.codigo).trim(),
          nombre: String(curso.nombre).trim(),
          cicloAcademico: String(curso.cicloAcademico).trim(),
          creditos: Number(curso.creditos),
        })),
      });

      setOpenImportPreviewDialog(false);
      setPreviewCursos([]);
      setPreviewFiltroCiclo('todos');
      setPreviewFiltroCreditos('todos');
      setImportCarreraId('');

      MySwal.fire({
        icon: 'success',
        title: '¡Importación completada!',
        text: 'Se guardaron todos los cursos después de tu validación.',
      });
      fetchCursos();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error.response?.data?.message || 'No se pudieron guardar los cursos importados.',
      });
    } finally {
      setSavingImport(false);
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
        await api.delete(`/cursos/${id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Curso eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        fetchCursos();
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al eliminar curso'
        });
      }
    }
  };

  /* Programaciones por ciclo */
  const handleOpenProgDialog = async (curso: any) => {
    setCurrentCursoProg(curso);
    setOpenProgDialog(true);
    await fetchProgramaciones(curso.id);
  };

  useEffect(() => {
    const loadCiclos = async () => {
      try {
        const res = await api.get('/ciclos');
        setCiclos(res.data || []);
        // obtener ciclo actual
        const cur = await api.get('/ciclos/actual');
        if (cur?.data?.id) {
          setCurrentCicloId(cur.data.id);
          setNewProg((p) => ({ ...p, cicloId: String(cur.data.id) }));
        }
      } catch (err) {
        console.error('Error fetching ciclos', err);
      }
    };
    loadCiclos();
  }, []);

  const handleCloseProgDialog = () => {
    setOpenProgDialog(false);
    setProgramaciones([]);
    setCurrentCursoProg(null);
  };

  const fetchProgramaciones = async (cursoId: number) => {
    setProgLoading(true);
    try {
      const res = await api.get(`/programacion-curso-ciclo?cursoId=${cursoId}`);
      setProgramaciones(res.data || []);
    } catch (error) {
      console.error('Error fetching programaciones:', error);
    } finally {
      setProgLoading(false);
    }
  };

  const handleCreateProg = async (payload: any) => {
    try {
      await api.post('/programacion-curso-ciclo', payload);
      await fetchProgramaciones(payload.cursoId);
      MySwal.fire({ icon: 'success', title: 'Creado', text: 'Programación creada.' });
    } catch (error: any) {
      MySwal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al crear programación' });
    }
  };

  const handleUpdateProg = async (id: number, payload: any) => {
    try {
      await api.put(`/programacion-curso-ciclo/${id}`, payload);
      if (currentCursoProg) await fetchProgramaciones(currentCursoProg.id);
      MySwal.fire({ icon: 'success', title: 'Actualizado', text: 'Programación actualizada.' });
    } catch (error: any) {
      MySwal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al actualizar programación' });
    }
  };

  const handleDeleteProg = async (id: number) => {
    const result = await MySwal.fire({ title: '¿Eliminar programación?', showCancelButton: true, confirmButtonText: 'Eliminar' });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/programacion-curso-ciclo/${id}`);
      if (currentCursoProg) await fetchProgramaciones(currentCursoProg.id);
      MySwal.fire({ icon: 'success', title: 'Eliminado', text: 'Programación eliminada.' });
    } catch (error: any) {
      MySwal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al eliminar programación' });
    }
  };

  const handleEditProg = (p: any) => {
    setEditingProgId(p.id);
    setNewProg({
      cicloId: p.cicloId,
      horasTeoria: p.horasTeoria ?? 0,
      numGruposTeoria: p.numGruposTeoria ?? 0,
      horasPractica: p.horasPractica ?? 0,
      numGruposPractica: p.numGruposPractica ?? 0,
      horasLaboratorio: p.horasLaboratorio ?? 0,
      numGruposLaboratorio: p.numGruposLaboratorio ?? p.numeroGrupos ?? 0,
      numeroGrupos: p.numeroGrupos ?? 0,
    });
    // focus dialog fields visually
    const sel = document.getElementById('new-cicloId');
    if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            Gestión de Cursos
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra el catálogo de asignaturas y sus códigos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchCursos} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setOpenImportDialog(true)}
            sx={{ borderRadius: 2, fontWeight: 600, color: '#003366', borderColor: '#003366' }}
          >
            Importar con IA
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nuevo Curso
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
              label="Buscar Curso por Nombre o Código"
              placeholder="Escribe el nombre o código del curso..."
              value={filtros.search}
              onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BookIcon fontSize="small" color="primary" />
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
                onClick={() => setFiltros({ search: '', ciclo: 'todos', creditos: 'todos', carreraId: 'todos' })}
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
                  <InputLabel>Filtrar por Carrera</InputLabel>
                  <Select
                    value={filtros.carreraId}
                    label="Filtrar por Carrera"
                    onChange={(e) => setFiltros({ ...filtros, carreraId: e.target.value })}
                  >
                    <MenuItem value="todos">Todas las Carreras</MenuItem>
                    {carreras.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filtrar por Ciclo</InputLabel>
                  <Select
                    value={filtros.ciclo}
                    label="Filtrar por Ciclo"
                    onChange={(e) => setFiltros({ ...filtros, ciclo: e.target.value })}
                  >
                    <MenuItem value="todos">Todos los Ciclos</MenuItem>
                    {ciclosAcademicos.map(c => (
                      <MenuItem key={c} value={c}>{c}° Ciclo</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filtrar por Créditos</InputLabel>
                  <Select
                    value={filtros.creditos}
                    label="Filtrar por Créditos"
                    onChange={(e) => setFiltros({ ...filtros, creditos: e.target.value })}
                  >
                    <MenuItem value="todos">Todos los Créditos</MenuItem>
                    {creditosOpciones.map(c => (
                      <MenuItem key={c} value={c}>{c} Créditos</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Tabla de Cursos */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CURSO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CÓDIGO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CARRERA</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CICLO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>CRÉDITOS</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cursosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 10, textAlign: 'center' }}>
                  <Typography color="textSecondary">No se encontraron cursos.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              cursosFiltrados
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((curso, index) => (
                <TableRow key={curso.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{curso.nombre}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={curso.codigo} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{curso.carrera?.nombre || 'No asignada'}</Typography>
                  </TableCell>
                  <TableCell>{curso.cicloAcademico}° Ciclo</TableCell>
                  <TableCell>{curso.creditos} créditos</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(curso)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Programación">
                      <IconButton onClick={() => handleOpenProgDialog(curso)} color="secondary" size="small">
                        <TuneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(curso.id)} color="error" size="small">
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
          count={cursosFiltrados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Diálogo Programaciones por Ciclo */}
      <Dialog
        open={openProgDialog}
        onClose={handleCloseProgDialog}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: '96vw', md: 760 },
            maxWidth: '96vw',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
          {currentCursoProg ? `Programación - ${currentCursoProg.nombre}` : 'Programación por Ciclo'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {progLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eef2f6', borderRadius: 3, mb: 4, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#003366' }}>Periodo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#003366', textAlign: 'center' }}>Horas (T|P|L)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#003366', textAlign: 'center' }}>Grupos (T|P|L)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#003366', textAlign: 'center', width: 100 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {programaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                          No hay programaciones registradas para este curso.
                        </TableCell>
                      </TableRow>
                    ) : (
                      programaciones.map((p) => (
                        <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#003366' }}>
                              {p.ciclo?.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Chip size="small" label={p.horasTeoria} variant="outlined" title="Teoría" sx={{ height: 20, fontSize: '0.7rem' }} />
                              <Chip size="small" label={p.horasPractica} variant="outlined" title="Práctica" sx={{ height: 20, fontSize: '0.7rem' }} />
                              <Chip size="small" label={p.horasLaboratorio} variant="outlined" title="Laboratorio" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Chip size="small" label={p.numGruposTeoria || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#e0f2f1', color: '#00695c' }} />
                              <Chip size="small" label={p.numGruposPractica || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100' }} />
                              <Chip size="small" label={p.numGruposLaboratorio || p.numeroGrupos || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#0d47a1' }} />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => handleEditProg(p)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteProg(p.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 4, border: '1px solid #eef2f6' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#003366', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {editingProgId ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />} {editingProgId ? 'EDITAR' : 'NUEVA'} PROGRAMACIÓN
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                      <InputLabel>Periodo Académico</InputLabel>
                      <Select
                        value={newProg.cicloId}
                        label="Periodo Académico"
                        onChange={(e) => setNewProg((p) => ({ ...p, cicloId: String(e.target.value) }))}
                      >
                        {ciclos.map((c: any) => (
                          <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={7}></Grid>

                  {/* Sección Teoría */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'white' }}>
                      <Typography variant="caption" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#00695c', letterSpacing: 1 }}>
                        <SchoolIcon sx={{ fontSize: 16 }} /> TEORÍA
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" label="Horas" type="number" value={newProg.horasTeoria} onChange={(e) => setNewProg((p) => ({ ...p, horasTeoria: Math.max(0, Number(e.target.value)) }))} />
                        <TextField fullWidth size="small" label="Grupos" type="number" value={newProg.numGruposTeoria} onChange={(e) => setNewProg((p) => ({ ...p, numGruposTeoria: Math.max(0, Number(e.target.value)) }))} />
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Sección Práctica */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'white' }}>
                      <Typography variant="caption" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#e65100', letterSpacing: 1 }}>
                        <GroupsIcon sx={{ fontSize: 16 }} /> PRÁCTICA
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" label="Horas" type="number" value={newProg.horasPractica} onChange={(e) => setNewProg((p) => ({ ...p, horasPractica: Math.max(0, Number(e.target.value)) }))} />
                        <TextField fullWidth size="small" label="Grupos" type="number" value={newProg.numGruposPractica} onChange={(e) => setNewProg((p) => ({ ...p, numGruposPractica: Math.max(0, Number(e.target.value)) }))} />
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Sección Laboratorio */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'white' }}>
                      <Typography variant="caption" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#0d47a1', letterSpacing: 1 }}>
                        <ScienceIcon sx={{ fontSize: 16 }} /> LABORATORIO
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" label="Horas" type="number" value={newProg.horasLaboratorio} onChange={(e) => setNewProg((p) => ({ ...p, horasLaboratorio: Math.max(0, Number(e.target.value)) }))} />
                        <TextField fullWidth size="small" label="Grupos" type="number" value={newProg.numGruposLaboratorio} onChange={(e) => setNewProg((p) => ({ ...p, numGruposLaboratorio: Math.max(0, Number(e.target.value)) }))} />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 4 }}>
                  {editingProgId && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingProgId(null);
                        setNewProg({ 
                          cicloId: currentCicloId ? String(currentCicloId) : '', 
                          horasTeoria: 0, numGruposTeoria: 0,
                          horasPractica: 0, numGruposPractica: 0,
                          horasLaboratorio: 0, numGruposLaboratorio: 0,
                          numeroGrupos: 0 
                        });
                      }}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!currentCursoProg) return;
                      if (!newProg.cicloId) {
                        MySwal.fire({ icon: 'warning', title: 'Ciclo requerido', text: 'Selecciona un ciclo.' });
                        return;
                      }
                      const payload: any = {
                        cursoId: currentCursoProg.id,
                        cicloId: Number(newProg.cicloId),
                        horasTeoria: Number(newProg.horasTeoria || 0),
                        numGruposTeoria: Number(newProg.numGruposTeoria || 0),
                        horasPractica: Number(newProg.horasPractica || 0),
                        numGruposPractica: Number(newProg.numGruposPractica || 0),
                        horasLaboratorio: Number(newProg.horasLaboratorio || 0),
                        numGruposLaboratorio: Number(newProg.numGruposLaboratorio || 0),
                        numeroGrupos: Number(newProg.numGruposLaboratorio || 0),
                      };
                      if (editingProgId) {
                        await handleUpdateProg(editingProgId, payload);
                        setEditingProgId(null);
                      } else {
                        await handleCreateProg(payload);
                      }
                      setNewProg({ 
                        cicloId: currentCicloId ? String(currentCicloId) : '', 
                        horasTeoria: 0, numGruposTeoria: 0,
                        horasPractica: 0, numGruposPractica: 0,
                        horasLaboratorio: 0, numGruposLaboratorio: 0,
                        numeroGrupos: 0 
                      });
                    }}
                    sx={{
                      bgcolor: '#003366',
                      borderRadius: 2,
                      fontWeight: 800,
                      textTransform: 'none',
                      px: 4,
                      boxShadow: '0 4px 14px 0 rgba(0,51,102,0.39)',
                      '&:hover': { bgcolor: '#00264d' },
                    }}
                  >
                    {editingProgId ? 'ACTUALIZAR PROGRAMACIÓN' : 'GUARDAR PROGRAMACIÓN'}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start', px: 3, pb: 2 }}>
          <Button onClick={handleCloseProgDialog} sx={{ fontWeight: 700, textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo CRUD */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
            {selectedCurso ? 'Editar Curso' : 'Nuevo Curso'}
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
                      label="Nombre del Curso"
                      variant="outlined"
                      error={!!errors.nombre}
                      helperText={errors.nombre?.message as string}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BookIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="codigo"
                  control={control}
                  rules={{ required: 'El código es obligatorio' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Código"
                      error={!!errors.codigo}
                      helperText={errors.codigo?.message as string}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CodeIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="carreraId"
                  control={control}
                  rules={{ required: 'La carrera es obligatoria' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.carreraId}>
                      <InputLabel>Carrera Profesional</InputLabel>
                      <Select {...field} label="Carrera Profesional">
                        {carreras.map(c => (
                          <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                        ))}
                      </Select>
                      {errors.carreraId && (
                        <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                          {errors.carreraId.message as string}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="cicloAcademico"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Ciclo Académico</InputLabel>
                      <Select {...field} label="Ciclo Académico">
                        {ciclosAcademicos.map(c => (
                          <MenuItem key={c} value={String(c)}>{c}° Ciclo</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="creditos"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Total Créditos"
                      InputLabelProps={{ shrink: true }}
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
              {selectedCurso ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo de Importación IA */}
      <Dialog open={openImportDialog} onClose={() => !importing && setOpenImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon /> Importación Inteligente de Cursos
        </DialogTitle>
        <DialogContent sx={{ pt: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Sube la malla curricular en formato PDF. Nuestra IA extraerá automáticamente el nombre, código, ciclo y créditos de cada curso.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Carrera a la que pertenecen los cursos</InputLabel>
                  <Select 
                    value={importCarreraId} 
                    label="Carrera a la que pertenecen los cursos"
                    onChange={(e) => setImportCarreraId(e.target.value)}
                    disabled={importing}
                  >
                    {carreras.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderStyle: 'dashed', 
                    bgcolor: '#f8fafc',
                    cursor: importing ? 'default' : 'pointer',
                    '&:hover': { bgcolor: importing ? '#f8fafc' : '#f1f5f9' }
                  }}
                  onClick={() => !importing && document.getElementById('pdf-upload')?.click()}
                >
                  <input
                    type="file"
                    id="pdf-upload"
                    hidden
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    disabled={importing}
                  />
                  <CloudUploadIcon sx={{ fontSize: 48, color: '#003366', mb: 1, opacity: 0.7 }} />
                  <Typography variant="h6" sx={{ color: '#003366', mb: 0.5 }}>
                    {pdfFile ? pdfFile.name : 'Selecciona o arrastra el PDF'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Solo archivos .pdf (Máx. 10MB)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {importing && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CircularProgress size={32} sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight={600} color="primary">
                Analizando malla curricular con IA...
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Esto puede tardar unos segundos
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenImportDialog(false)} color="inherit" disabled={importing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImportSubmit} 
            variant="contained" 
            disabled={importing || !pdfFile || !importCarreraId}
            sx={{ bgcolor: '#003366', fontWeight: 600 }}
            startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {importing ? 'Analizando...' : 'Analizar PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Previsualización Importación IA */}
      <Dialog
        open={openImportPreviewDialog}
        onClose={() => !savingImport && setOpenImportPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
          Verifica y edita antes de guardar
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            La IA extrajo los cursos. Corrige especialmente los créditos y luego guarda todo en un solo paso.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por ciclo</InputLabel>
                <Select
                  value={previewFiltroCiclo}
                  label="Filtrar por ciclo"
                  onChange={(e) => setPreviewFiltroCiclo(String(e.target.value))}
                >
                  <MenuItem value="todos">Todos los ciclos</MenuItem>
                  {ciclosAcademicos.map((ciclo) => (
                    <MenuItem key={ciclo} value={String(ciclo)}>{ciclo}° Ciclo</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filtrar por créditos</InputLabel>
                <Select
                  value={previewFiltroCreditos}
                  label="Filtrar por créditos"
                  onChange={(e) => setPreviewFiltroCreditos(String(e.target.value))}
                >
                  <MenuItem value="todos">Todos los créditos</MenuItem>
                  {creditosOpciones.map((creditos) => (
                    <MenuItem key={creditos} value={String(creditos)}>{creditos} créditos</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setPreviewFiltroCiclo('todos');
                  setPreviewFiltroCreditos('todos');
                }}
                sx={{ height: 40, borderRadius: 2, fontWeight: 600, justifyContent: 'flex-start' }}
              >
                Limpiar filtros
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Seleccionados: {selectedPreviewCount} de {previewCursos.length}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={handleSelectAllPreviewCursos} sx={{ fontWeight: 600 }}>
                    Seleccionar Todo
                  </Button>
                  <Button size="small" variant="outlined" color="inherit" onClick={handleDeselectAllPreviewCursos} sx={{ fontWeight: 600 }}>
                    Deseleccionar Todo
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={handleRemoveSelectedPreviewCursos} sx={{ fontWeight: 600 }}>
                    Borrar seleccionados
                  </Button>
                </Box>
                {previewCursos.some(c => c.__duplicado) && (
                  <Chip 
                    label="Se detectaron duplicados desmarcados por seguridad" 
                    color="warning" 
                    size="small" 
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f4f7fb' }}>
                  <TableCell sx={{ fontWeight: 700, width: 70 }}>OK</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 50 }}>N°</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Ciclo</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Créditos</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 90 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPreviewCursos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>
                      No hay cursos para mostrar con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPreview.map(({ curso, originalIndex }, index) => (
                    <TableRow 
                      key={`${curso.codigo || 'curso'}-${originalIndex}`}
                      sx={{ 
                        bgcolor: curso.__duplicado ? 'rgba(255, 153, 0, 0.05)' : 'inherit',
                        '&:hover': { bgcolor: curso.__duplicado ? 'rgba(255, 153, 0, 0.1)' : '#f8fafc' }
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={Boolean(curso.__selected)}
                          onChange={(e) => handlePreviewCursoSelect(originalIndex, e.target.checked)}
                          color={curso.__duplicado ? "warning" : "primary"}
                        />
                      </TableCell>
                      <TableCell>{previewPage * previewRowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={curso.codigo || ''}
                            onChange={(e) => handlePreviewCursoChange(originalIndex, 'codigo', e.target.value)}
                            error={curso.__duplicado && curso.__motivoDuplicado?.includes('Código')}
                          />
                          {curso.__duplicado && curso.__motivoDuplicado?.includes('Código') && (
                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                              {curso.__motivoDuplicado}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={curso.nombre || ''}
                            onChange={(e) => handlePreviewCursoChange(originalIndex, 'nombre', e.target.value)}
                            error={curso.__duplicado && curso.__motivoDuplicado?.includes('Nombre')}
                          />
                          {curso.__duplicado && curso.__motivoDuplicado?.includes('Nombre') && (
                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                              {curso.__motivoDuplicado}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={curso.cicloAcademico || ''}
                          onChange={(e) => handlePreviewCursoChange(originalIndex, 'cicloAcademico', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 1 }}
                          value={curso.creditos ?? ''}
                          onChange={(e) => handlePreviewCursoChange(originalIndex, 'creditos', e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Quitar fila">
                          <IconButton color="error" size="small" onClick={() => handleRemovePreviewCurso(originalIndex)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <TablePagination
              component="div"
              count={filteredPreviewCursos.length}
              page={previewPage}
              onPageChange={(_e, newPage) => setPreviewPage(newPage)}
              rowsPerPage={previewRowsPerPage}
              rowsPerPageOptions={[10]}
              onRowsPerPageChange={() => {}}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Button
            onClick={handleReextractFromPreview}
            variant="outlined"
            color="primary"
            disabled={importing || savingImport}
            sx={{ fontWeight: 600, borderColor: '#003366', color: '#003366' }}
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {importing ? 'Reextrayendo...' : 'Reextraer PDF'}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => {
                setOpenImportPreviewDialog(false);
                setPreviewCursos([]);
                setPreviewFiltroCiclo('todos');
                setPreviewFiltroCreditos('todos');
              }}
              color="inherit"
              disabled={savingImport}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              variant="contained"
              disabled={savingImport || selectedPreviewCount === 0}
              sx={{ bgcolor: '#003366', fontWeight: 600 }}
              startIcon={savingImport ? <CircularProgress size={18} color="inherit" /> : <HistoryIcon />}
            >
              {savingImport ? 'Guardando...' : 'Guardar Todo'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
