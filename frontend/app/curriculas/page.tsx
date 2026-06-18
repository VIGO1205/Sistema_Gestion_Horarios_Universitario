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
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Autocomplete,
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  AutoAwesome as AutoAwesomeIcon,
  UploadFile as UploadFileIcon,
  AddCircle as AddCircleIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  Science as ScienceIcon,
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
}

interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  cicloAcademico: string;
  departamento: string;
  curriculaId?: number;
}

interface Curricula {
  id: number;
  nombre: string;
  anio: number;
  descripcion: string;
  pdfArchivo?: string;
  carreraId: number;
  carrera: Carrera;
  cursos: Curso[];
  totalCreditos?: number;
  createdAt: string;
}

export default function CurriculasPage() {
  const [curriculas, setCurriculas] = useState<Curricula[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    search: '',
    carreraId: 'todas',
    anio: 'todos',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCurricula, setSelectedCurricula] = useState<Curricula | null>(null);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formSelectedFile, setFormSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importIsDragOver, setImportIsDragOver] = useState(false);
  const [openVerCursosDialog, setOpenVerCursosDialog] = useState(false);
  const [curriculaParaVerCursos, setCurriculaParaVerCursos] = useState<Curricula | null>(null);
  const [openCrearCursoDialog, setOpenCrearCursoDialog] = useState(false);
  const [openAsignarCursosDialog, setOpenAsignarCursosDialog] = useState(false);
  const [openImportarCursosDialog, setOpenImportarCursosDialog] = useState(false);
  const [importandoCursosConIA, setImportandoCursosConIA] = useState(false);
  const [fileImportarCursos, setFileImportarCursos] = useState<File | null>(null);
  const [importarCursosDragOver, setImportarCursosDragOver] = useState(false);
  const [cursosDisponibles, setCursosDisponibles] = useState<any[]>([]);
  const [cursosSeleccionadosParaAsignar, setCursosSeleccionadosParaAsignar] = useState<number[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  
  // Estados para editar y programar cursos
  const [openEditarCursoDialog, setOpenEditarCursoDialog] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const [openProgDialog, setOpenProgDialog] = useState(false);
  const [programaciones, setProgramaciones] = useState<any[]>([]);
  const [progLoading, setProgLoading] = useState(false);
  const [currentCursoProg, setCurrentCursoProg] = useState<any>(null);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [currentCicloId, setCurrentCicloId] = useState<number | null>(null);
  const [editingProgId, setEditingProgId] = useState<number | null>(null);
  const [newProg, setNewProg] = useState({
    cicloId: '',
    horasTeoria: 0,
    numGruposTeoria: 0,
    horasPractica: 0,
    numGruposPractica: 0,
    horasLaboratorio: 0,
    numGruposLaboratorio: 0,
    numeroGrupos: 0
  });

  const { register, handleSubmit, reset, formState: { errors }, control, watch, setValue } = useForm();
  const { register: registerCurso, handleSubmit: handleSubmitCurso, reset: resetCurso, formState: { errors: errorsCurso }, control: controlCurso } = useForm();
  
  const [pageCursosModal, setPageCursosModal] = useState(0);
  const [rowsPerPageCursosModal, setRowsPerPageCursosModal] = useState(10);

  const watchAnio = watch('anio');

  useEffect(() => {
    if (watchAnio && !selectedCurricula) {
      setValue('nombre', `MALLA CURRICULAR UNT - ${watchAnio}`);
    }
  }, [watchAnio, setValue, selectedCurricula]);

  const fetchCurriculas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/curriculas');
      setCurriculas(response.data);
    } catch (error) {
      console.error('Error fetching curriculas:', error);
      MySwal.fire('Error', 'No se pudieron cargar las mallas curriculares', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCarreras = async () => {
    try {
      const response = await api.get('/carreras');
      setCarreras(response.data);
    } catch (error) {
      console.error('Error fetching carreras:', error);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const response = await api.get('/cursos/departamentos');
      setDepartamentos(response.data);
    } catch (error) {
      console.error('Error fetching departamentos:', error);
    }
  };

  const fetchCiclos = async () => {
    try {
      const res = await api.get('/ciclos');
      setCiclos(res.data || []);
      const cur = await api.get('/ciclos/actual');
      if (cur?.data?.id) {
        setCurrentCicloId(cur.data.id);
        setNewProg((p) => ({ ...p, cicloId: String(cur.data.id) }));
      }
    } catch (err) {
      console.error('Error fetching ciclos:', err);
    }
  };

  useEffect(() => {
    fetchCarreras();
    fetchCurriculas();
    fetchDepartamentos();
    fetchCiclos();
  }, []);

  // Obtener años únicos de las curriculas
  const aniosDisponibles = useMemo(() => {
    const anios = [...new Set(curriculas.map(c => c.anio))];
    return anios.sort((a, b) => a - b);
  }, [curriculas]);

  useEffect(() => {
    setPage(0);
  }, [filtros.search, filtros.carreraId, filtros.anio]);

  const curriculasFiltradas = useMemo(() => {
    return curriculas.filter((curricula) => {
      const texto = `${curricula.nombre} ${curricula.anio} ${curricula.carrera?.nombre} ${curricula.descripcion}`.toLowerCase();
      const coincideBusqueda =
        !filtros.search || texto.includes(filtros.search.toLowerCase());
      const coincideCarrera =
        filtros.carreraId === 'todas' || String(curricula.carreraId) === filtros.carreraId;
      const coincideAnio =
        filtros.anio === 'todos' || String(curricula.anio) === filtros.anio;

      return coincideBusqueda && coincideCarrera && coincideAnio;
    });
  }, [curriculas, filtros]);

  const curriculasPaginadas = useMemo(() => {
    return curriculasFiltradas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [curriculasFiltradas, page, rowsPerPage]);

  const handleOpenDialog = (curricula: Curricula | null = null) => {
    setSelectedCurricula(curricula);
    setFormSelectedFile(null);
    if (curricula) {
      reset({ 
        nombre: curricula.nombre, 
        anio: curricula.anio, 
        descripcion: curricula.descripcion, 
        carreraId: curricula.carreraId 
      });
    } else {
      reset({ nombre: '', anio: new Date().getFullYear(), descripcion: '', carreraId: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCurricula(null);
    setFormSelectedFile(null);
  };

  const handleOpenImportDialog = () => {
    setOpenImportDialog(true);
    setSelectedFile(null);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
    setSelectedFile(null);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const processCursosWithIA = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setImportandoCursosConIA(true);
      await api.post(`/curriculas/${id}/extraer-cursos-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      MySwal.fire('¡Éxito!', 'Los cursos se han extraído y asignado correctamente', 'success');
      fetchCurriculas();
      setOpenImportarCursosDialog(false);
      setFileImportarCursos(null);
    } catch (error) {
      MySwal.fire('Error', 'No se pudieron extraer los cursos del PDF', 'error');
    } finally {
      setImportandoCursosConIA(false);
    }
  };

  const handleImportarCursosConIA = async () => {
    if (!curriculaParaVerCursos) return;
    if (!fileImportarCursos && !curriculaParaVerCursos.pdfArchivo) {
      MySwal.fire('Error', 'Debes seleccionar un PDF o usar el PDF guardado', 'error');
      return;
    }

    try {
      setImportandoCursosConIA(true);
      const formData = new FormData();
      if (fileImportarCursos) {
        formData.append('file', fileImportarCursos);
      }
      
      await api.post(`/curriculas/${curriculaParaVerCursos.id}/extraer-cursos-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      MySwal.fire('¡Éxito!', 'Los cursos se han extraído y asignado correctamente', 'success');
      fetchCurriculas();
      setOpenImportarCursosDialog(false);
      setFileImportarCursos(null);
    } catch (error) {
      MySwal.fire('Error', 'No se pudieron extraer los cursos del PDF', 'error');
    } finally {
      setImportandoCursosConIA(false);
    }
  };

  const handleVerCursos = (curricula: Curricula) => {
    setCurriculaParaVerCursos(curricula);
    setPageCursosModal(0); // Resetear paginación al abrir el modal
    setOpenVerCursosDialog(true);
  };

  const handleOpenCrearCursoDialog = () => {
    resetCurso({
      nombre: '',
      codigo: '',
      cicloAcademico: '1',
      creditos: 4,
      departamento: '',
      carreraId: curriculaParaVerCursos?.carreraId,
    });
    setOpenCrearCursoDialog(true);
  };

  const handleCloseCrearCursoDialog = () => {
    setOpenCrearCursoDialog(false);
  };

  const handleCrearCurso = async (data: any) => {
    if (!curriculaParaVerCursos) return;

    try {
      const payload = {
        ...data,
        carreraId: curriculaParaVerCursos.carreraId,
        curriculaId: curriculaParaVerCursos.id,
      };
      await api.post('/cursos', payload);
      MySwal.fire('¡Creado!', 'Curso creado y asignado a la malla curricular', 'success');
      handleCloseCrearCursoDialog();
      fetchCurriculas();
    } catch (error) {
      MySwal.fire('Error', 'No se pudo crear el curso', 'error');
    }
  };

  const handleOpenAsignarCursosDialog = async () => {
    if (!curriculaParaVerCursos) return;
    try {
      const params = new URLSearchParams();
      params.append('carreraId', String(curriculaParaVerCursos.carreraId));
      const response = await api.get(`/cursos?${params.toString()}`);
      // Mostrar solo cursos sin ninguna malla asignada
      const cursosSinMalla = response.data.filter((c: any) => c.curriculaId === null);
      setCursosDisponibles(cursosSinMalla);
      setCursosSeleccionadosParaAsignar([]);
      setOpenAsignarCursosDialog(true);
    } catch (error) {
      MySwal.fire('Error', 'No se pudieron cargar los cursos', 'error');
    }
  };

  const handleCloseAsignarCursosDialog = () => {
    setOpenAsignarCursosDialog(false);
  };

  const handleToggleCursoSeleccionado = (id: number) => {
    setCursosSeleccionadosParaAsignar(prev => {
      if (prev.includes(id)) {
        return prev.filter(cid => cid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleConfirmarAsignacionCursos = async () => {
    if (!curriculaParaVerCursos || cursosSeleccionadosParaAsignar.length === 0) return;

    try {
      await api.patch('/cursos/batch-asignar', {
        ids: cursosSeleccionadosParaAsignar,
        curriculaId: curriculaParaVerCursos.id,
      });
      MySwal.fire('¡Asignados!', 'Cursos asignados a la malla curricular', 'success');
      handleCloseAsignarCursosDialog();
      fetchCurriculas();
    } catch (error) {
      MySwal.fire('Error', 'No se pudieron asignar los cursos', 'error');
    }
  };

  const onSubmit = async (data: any) => {
    if (!selectedCurricula && !formSelectedFile) {
      MySwal.fire('Error', 'Debes seleccionar un PDF de la malla curricular', 'error');
      return;
    }

    try {
      const { id, createdAt, updatedAt, carrera, cursos, ...payload } = data;
      let savedCurricula;
      
      if (selectedCurricula) {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('anio', String(data.anio));
        formData.append('carreraId', String(data.carreraId));
        if (data.descripcion) {
          formData.append('descripcion', data.descripcion);
        }
        if (formSelectedFile) {
          formData.append('pdfArchivo', formSelectedFile);
        }

        await api.patch(`/curriculas/${selectedCurricula.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        MySwal.fire('¡Actualizado!', 'Malla curricular actualizada exitosamente', 'success');
        savedCurricula = { ...selectedCurricula, ...payload };
      } else {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('anio', String(data.anio));
        formData.append('carreraId', String(data.carreraId));
        if (data.descripcion) {
          formData.append('descripcion', data.descripcion);
        }
        if (formSelectedFile) {
          formData.append('pdfArchivo', formSelectedFile);
        }

        const response = await api.post('/curriculas', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        savedCurricula = response.data;
        MySwal.fire('¡Creado!', 'Malla curricular creada exitosamente', 'success');
      }

      handleCloseDialog();
      fetchCurriculas();

      if (formSelectedFile) {
        const result = await MySwal.fire({
          title: '¿Deseas analizar el PDF con IA?',
          text: '¿Quieres analizar el PDF con IA para extraer y asignar los cursos de manera masiva? Si eliges NO, podrás agregar los cursos manualmente después.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#003366',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'SÍ, analizar con IA',
          cancelButtonText: 'NO, agregar manualmente'
        });

        if (result.isConfirmed) {
          await processCursosWithIA(savedCurricula.id, formSelectedFile);
        }
      }
    } catch (error) {
      MySwal.fire('Error', 'No se pudo guardar la malla curricular', 'error');
    }
  };

  const handleImport = async (data: any) => {
    if (!selectedFile) {
      MySwal.fire('Error', 'Debes seleccionar un archivo PDF', 'error');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nombre', data.nombre);
      formData.append('anio', data.anio);
      formData.append('descripcion', data.descripcion);
      formData.append('carreraId', String(data.carreraId));

      const response = await api.post('/curriculas/importar-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      MySwal.fire(
        '¡Importado!',
        `Malla curricular "${data.nombre}" creada con ${response.data.cursos.length} cursos.`,
        'success'
      );
      
      handleCloseImportDialog();
      fetchCurriculas();
    } catch (error) {
      MySwal.fire('Error', 'No se pudo importar la malla curricular', 'error');
    } finally {
      setImporting(false);
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
        await api.delete(`/curriculas/${id}`);
        MySwal.fire('Eliminado', 'La malla curricular ha sido eliminada', 'success');
        fetchCurriculas();
      } catch (error) {
        MySwal.fire('Error', 'No se pudo eliminar la malla curricular', 'error');
      }
    }
  };

  // Funciones para editar curso
  const handleOpenEditarCursoDialog = (curso: any) => {
    setSelectedCurso(curso);
    resetCurso({
      nombre: curso.nombre,
      codigo: curso.codigo,
      cicloAcademico: curso.cicloAcademico,
      creditos: curso.creditos,
      departamento: curso.departamento,
      carreraId: curriculaParaVerCursos?.carreraId,
    });
    setOpenEditarCursoDialog(true);
  };

  const handleCloseEditarCursoDialog = () => {
    setOpenEditarCursoDialog(false);
    setSelectedCurso(null);
  };

  const handleEditarCurso = async (data: any) => {
    if (!selectedCurso) return;

    try {
      await api.patch(`/cursos/${selectedCurso.id}`, data);
      MySwal.fire('¡Actualizado!', 'Curso actualizado exitosamente', 'success');
      handleCloseEditarCursoDialog();
      fetchCurriculas();
    } catch (error) {
      MySwal.fire('Error', 'No se pudo actualizar el curso', 'error');
    }
  };

  // Funciones para eliminar curso de la malla
  const handleEliminarCursoDeMalla = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: '¿Quieres eliminar este curso de la malla curricular?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Eliminar la relación con la malla curricular (no eliminar el curso completo)
        await api.patch(`/cursos/${id}`, { curriculaId: null });
        await fetchCurriculas();
        // Refrescar curriculaParaVerCursos para actualizar el modal y el paginador
        if (curriculaParaVerCursos) {
          const refreshed = await api.get(`/curriculas/${curriculaParaVerCursos.id}`);
          setCurriculaParaVerCursos(refreshed.data);
          // Ajustar página si la actual se queda sin elementos
          const newLength = refreshed.data.cursos?.length || 0;
          if (pageCursosModal > 0 && pageCursosModal * rowsPerPageCursosModal >= newLength) {
            setPageCursosModal(Math.max(0, pageCursosModal - 1));
          }
        }
        MySwal.fire('Eliminado', 'Curso eliminado de la malla curricular', 'success');
      } catch (error) {
        MySwal.fire('Error', 'No se pudo eliminar el curso de la malla', 'error');
      }
    }
  };

  // Funciones para programar curso
  const handleOpenProgDialog = async (curso: any) => {
    setCurrentCursoProg(curso);
    setOpenProgDialog(true);
    await fetchProgramaciones(curso.id);
  };

  const handleCloseProgDialog = () => {
    setOpenProgDialog(false);
    setProgramaciones([]);
    setCurrentCursoProg(null);
    setEditingProgId(null);
    setNewProg({
      cicloId: currentCicloId ? String(currentCicloId) : '',
      horasTeoria: 0,
      numGruposTeoria: 0,
      horasPractica: 0,
      numGruposPractica: 0,
      horasLaboratorio: 0,
      numGruposLaboratorio: 0,
      numeroGrupos: 0
    });
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
      if (currentCursoProg) await fetchProgramaciones(currentCursoProg.id);
      MySwal.fire({ icon: 'success', title: 'Creado', text: 'Programación creada exitosamente.' });
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
  };

  // Ordenar cursos por ciclo y código
  const getCursosOrdenados = (cursos: Curso[]) => {
    return [...cursos].sort((a, b) => {
      // Primero ordenar por ciclo
      const cicloA = parseInt(a.cicloAcademico.replace('° CICLO', ''));
      const cicloB = parseInt(b.cicloAcademico.replace('° CICLO', ''));
      if (cicloA !== cicloB) return cicloA - cicloB;
      // Luego por código
      return a.codigo.localeCompare(b.codigo);
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
            Gestión de Curriculas
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Administra las curriculas, sus años y cursos asociados.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchCurriculas} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Nueva Curricula
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Filtro de Año */}
          <Grid item xs={12} md={1.5}>
            <FormControl fullWidth size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Año</InputLabel>
              <Select
                value={filtros.anio}
                label="Año"
                onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
              >
                <MenuItem value="todos">TODOS</MenuItem>
                {aniosDisponibles.map((anio) => (
                  <MenuItem key={anio} value={String(anio)}>
                    {anio}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro de Carrera */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por Carrera</InputLabel>
              <Select
                value={filtros.carreraId}
                label="Filtrar por Carrera"
                onChange={(e) => setFiltros({ ...filtros, carreraId: e.target.value })}
              >
                <MenuItem value="todas">Todas las Carreras</MenuItem>
                {carreras.map((carrera) => (
                  <MenuItem key={carrera.id} value={String(carrera.id)}>
                    {carrera.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5.5}>
            <TextField
              fullWidth
              size="small"
              label="Buscar Curricula por Nombre, Año o Carrera"
              placeholder="Escribe el nombre, año o carrera..."
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

          {/* Botón Limpiar */}
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setFiltros({ search: '', carreraId: 'todas', anio: 'todos' })}
              sx={{ borderRadius: 2, fontWeight: 600, color: '#666', borderColor: '#ddd' }}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Curricula</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Año</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Carrera</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Cursos</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Créditos Totales</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {curriculasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 10, textAlign: 'center' }}>
                  <Typography color="textSecondary">No se encontraron curriculas.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              curriculasPaginadas.map((curricula, index) => (
                <TableRow key={curricula.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{curricula.nombre}</Typography>
                      {curricula.descripcion && (
                        <Typography variant="caption" color="textSecondary">
                          {curricula.descripcion}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={curricula.anio} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{curricula.carrera?.nombre || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${curricula.cursos?.length || 0} cursos`}
                      size="small"
                      sx={{ bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${curricula.totalCreditos || 0} créditos`}
                      size="small"
                      sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Cursos">
                      <IconButton onClick={() => handleVerCursos(curricula)} color="info" size="small">
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {curricula.pdfArchivo && (
                      <Tooltip title="Ver PDF">
                        <IconButton 
                          onClick={() => window.open(`http://localhost:3001/public/uploads/${curricula.pdfArchivo}`, '_blank')} 
                          color="secondary" 
                          size="small"
                        >
                          <PdfIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(curricula)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton onClick={() => handleDelete(curricula.id)} color="error" size="small">
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
          count={curriculasFiltradas.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Diálogo para crear/editar malla */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, py: 2.5 }}>
            {selectedCurricula ? 'Editar Curricula' : 'Nueva Curricula'}
          </DialogTitle>
          <DialogContent sx={{ overflowY: 'visible' }}>
            <Box sx={{ pt: 4, pb: 1, px: 0 }}>
              <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Año"
                  {...register('anio', { required: 'El año es requerido' })}
                  error={!!errors.anio}
                  helperText={errors.anio?.message as string}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="carrera-label">Carrera</InputLabel>
                  <Controller
                    name="carreraId"
                    control={control}
                    rules={{ required: 'La carrera es requerida' }}
                    render={({ field, fieldState }) => (
                      <Select
                        {...field}
                        labelId="carrera-label"
                        label="Carrera"
                        error={!!fieldState.error}
                      >
                        {carreras.map((carrera) => (
                          <MenuItem key={carrera.id} value={carrera.id}>
                            {carrera.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de la Curricula"
                  {...register('nombre', { required: 'El nombre es requerido' })}
                  error={!!errors.nombre}
                  helperText={errors.nombre?.message as string}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderStyle: 'dashed', 
                    bgcolor: isDragOver ? '#e3f2fd' : formSelectedFile ? '#e3f2fd' : '#f8fafc',
                    borderColor: isDragOver ? '#003366' : formSelectedFile ? '#003366' : undefined,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: isDragOver ? '#e3f2fd' : formSelectedFile ? '#e3f2fd' : '#f1f5f9' }
                  }}
                  onClick={() => document.getElementById('pdf-upload-form')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDragOver) setIsDragOver(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDragOver) setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type === 'application/pdf') {
                      setFormSelectedFile(files[0]);
                    } else if (files.length > 0) {
                      MySwal.fire({
                        icon: 'error',
                        title: 'Archivo no válido',
                        text: 'Por favor, selecciona un archivo PDF'
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="pdf-upload-form"
                    hidden
                    accept=".pdf"
                    onChange={(e) => setFormSelectedFile(e.target.files?.[0] || null)}
                  />
                  <PdfIcon sx={{ fontSize: 48, color: '#003366', mb: 1, opacity: 0.7 }} />
                  <Typography variant="h6" sx={{ color: '#003366', mb: 0.5 }}>
                    {formSelectedFile ? formSelectedFile.name : 'Selecciona o arrastra el PDF'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Solo archivos .pdf (Máx. 10MB)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  {...register('descripcion')}
                  multiline
                  rows={3}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
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
              {selectedCurricula ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo para importar PDF */}
      <Dialog open={openImportDialog} onClose={handleCloseImportDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(handleImport)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
            Importar PDF de Curricula
          </DialogTitle>
          <DialogContent sx={{ overflowY: 'visible' }}>
            <Box sx={{ pt: 4, pb: 1, px: 0 }}>
              <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Año"
                  {...register('anio', { required: 'El año es requerido' })}
                  error={!!errors.anio}
                  helperText={errors.anio?.message as string}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="carrera-import-label">Carrera</InputLabel>
                  <Controller
                    name="carreraId"
                    control={control}
                    rules={{ required: 'La carrera es requerida' }}
                    render={({ field, fieldState }) => (
                      <Select
                        {...field}
                        labelId="carrera-import-label"
                        label="Carrera"
                        error={!!fieldState.error}
                      >
                        {carreras.map((carrera) => (
                          <MenuItem key={carrera.id} value={carrera.id}>
                            {carrera.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de la Curricula"
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
                  label="Descripción"
                  {...register('descripcion')}
                  multiline
                  rows={3}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderStyle: 'dashed', 
                    bgcolor: importIsDragOver ? '#e3f2fd' : selectedFile ? '#e3f2fd' : '#f8fafc',
                    borderColor: importIsDragOver ? '#003366' : selectedFile ? '#003366' : undefined,
                    cursor: importing ? 'default' : 'pointer',
                    '&:hover': { bgcolor: importing ? '#f8fafc' : importIsDragOver ? '#e3f2fd' : selectedFile ? '#e3f2fd' : '#f1f5f9' }
                  }}
                  onClick={() => !importing && document.getElementById('pdf-upload-import')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!importing && !importIsDragOver) setImportIsDragOver(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!importing && !importIsDragOver) setImportIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setImportIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setImportIsDragOver(false);
                    
                    if (importing) return;
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type === 'application/pdf') {
                      setSelectedFile(files[0]);
                    } else if (files.length > 0) {
                      MySwal.fire({
                        icon: 'error',
                        title: 'Archivo no válido',
                        text: 'Por favor, selecciona un archivo PDF'
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="pdf-upload-import"
                    hidden
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={importing}
                  />
                  <PdfIcon sx={{ fontSize: 48, color: '#003366', mb: 1, opacity: 0.7 }} />
                  <Typography variant="h6" sx={{ color: '#003366', mb: 0.5 }}>
                    {selectedFile ? selectedFile.name : 'Selecciona o arrastra el PDF'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Solo archivos .pdf (Máx. 10MB)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseImportDialog} color="inherit" sx={{ fontWeight: 600 }} disabled={importing}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={importing || !selectedFile} sx={{ bgcolor: '#003366', fontWeight: 600 }}>
              {importing ? <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} /> : null}
              Importar Curricula
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo para ver cursos de la malla */}
      <Dialog open={openVerCursosDialog} onClose={() => setOpenVerCursosDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {curriculaParaVerCursos ? `Cursos de ${curriculaParaVerCursos.nombre}` : 'Cursos de la Malla Curricular'}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<AddCircleIcon />}
              onClick={handleOpenCrearCursoDialog}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Crear Curso
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<AddIcon />}
              onClick={handleOpenAsignarCursosDialog}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Asignar Cursos
            </Button>
            <Button
                      variant="contained"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={() => setOpenImportarCursosDialog(true)}
                      sx={{ bgcolor: 'white', color: '#003366', '&:hover': { bgcolor: '#f0f0f0' } }}
                    >
                      Importar con IA
                    </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 6, mt: 0 }}>
          {curriculaParaVerCursos && curriculaParaVerCursos.cursos?.length > 0 ? (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ mt: 2, borderRadius: 2, border: '1px solid #eef2f6' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#003366' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, width: '50px' }}>N°</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Código</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Ciclo</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Departamento</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Créditos</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getCursosOrdenados(curriculaParaVerCursos.cursos)
                      .slice(pageCursosModal * rowsPerPageCursosModal, pageCursosModal * rowsPerPageCursosModal + rowsPerPageCursosModal)
                      .map((curso, index) => (
                        <TableRow key={curso.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                          <TableCell sx={{ fontWeight: 600 }}>{pageCursosModal * rowsPerPageCursosModal + index + 1}</TableCell>
                          <TableCell>
                            <Chip label={curso.codigo} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>{curso.cicloAcademico}° CICLO</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>{curso.nombre}</Typography>
                          </TableCell>
                          <TableCell>{curso.departamento}</TableCell>
                          <TableCell>{curso.creditos} créditos</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Editar">
                              <IconButton onClick={() => handleOpenEditarCursoDialog(curso)} color="primary" size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Programación">
                              <IconButton onClick={() => handleOpenProgDialog(curso)} color="secondary" size="small">
                                <TuneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar de la malla">
                              <IconButton onClick={() => handleEliminarCursoDeMalla(curso.id)} color="error" size="small">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10]}
                component="div"
                count={curriculaParaVerCursos.cursos?.length || 0}
                rowsPerPage={rowsPerPageCursosModal}
                page={pageCursosModal}
                onPageChange={(_, newPage) => setPageCursosModal(newPage)}
                onRowsPerPageChange={(event) => setRowsPerPageCursosModal(parseInt(event.target.value, 10))}
                labelRowsPerPage="Cursos por página"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          ) : (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography color="textSecondary">No hay cursos asignados a esta malla curricular.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenVerCursosDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para crear curso */}
      <Dialog open={openCrearCursoDialog} onClose={handleCloseCrearCursoDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmitCurso(handleCrearCurso)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DescriptionIcon sx={{ fontSize: 28 }} />
            Crear Curso
          </DialogTitle>
          <DialogContent sx={{ pt: 5, pb: 3, px: 4 }}>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                {/* Primera fila: Código y Nombre */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Código"
                    {...registerCurso('codigo', { required: 'El código es requerido' })}
                    error={!!errorsCurso.codigo}
                    helperText={errorsCurso.codigo?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Nombre del Curso"
                    {...registerCurso('nombre', { required: 'El nombre es requerido' })}
                    error={!!errorsCurso.nombre}
                    helperText={errorsCurso.nombre?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Segunda fila: Ciclo, Créditos y Departamento */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="ciclo-label">Ciclo Académico</InputLabel>
                    <Controller
                      name="cicloAcademico"
                      control={controlCurso}
                      rules={{ required: 'El ciclo es requerido' }}
                      render={({ field, fieldState }) => (
                        <Select
                          {...field}
                          labelId="ciclo-label"
                          label="Ciclo Académico"
                          error={!!fieldState.error}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <MenuItem key={num} value={`${num}`}>
                              {num}° CICLO
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Créditos"
                    {...registerCurso('creditos', { required: 'Los créditos son requeridos', min: { value: 1, message: 'Los créditos deben ser al menos 1' } })}
                    error={!!errorsCurso.creditos}
                    helperText={errorsCurso.creditos?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="departamento"
                    control={controlCurso}
                    rules={{ required: 'El departamento es requerido' }}
                    render={({ field }) => (
                      <Autocomplete
                        options={departamentos}
                        freeSolo
                        value={field.value || ''}
                        onChange={(_, value) => field.onChange(value)}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Departamento"
                            variant="outlined"
                            error={!!errorsCurso.departamento}
                            helperText={errorsCurso.departamento?.message as string}
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
            <Button onClick={handleCloseCrearCursoDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 600 }}>
              Crear Curso
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo para editar curso */}
      <Dialog open={openEditarCursoDialog} onClose={handleCloseEditarCursoDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmitCurso(handleEditarCurso)}>
          <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DescriptionIcon sx={{ fontSize: 28 }} />
            Editar Curso
          </DialogTitle>
          <DialogContent sx={{ pt: 5, pb: 3, px: 4 }}>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                {/* Primera fila: Código y Nombre */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Código"
                    {...registerCurso('codigo', { required: 'El código es requerido' })}
                    error={!!errorsCurso.codigo}
                    helperText={errorsCurso.codigo?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Nombre del Curso"
                    {...registerCurso('nombre', { required: 'El nombre es requerido' })}
                    error={!!errorsCurso.nombre}
                    helperText={errorsCurso.nombre?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Segunda fila: Ciclo, Créditos y Departamento */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="ciclo-editar-label">Ciclo Académico</InputLabel>
                    <Controller
                      name="cicloAcademico"
                      control={controlCurso}
                      rules={{ required: 'El ciclo es requerido' }}
                      render={({ field, fieldState }) => (
                        <Select
                          {...field}
                          labelId="ciclo-editar-label"
                          label="Ciclo Académico"
                          error={!!fieldState.error}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <MenuItem key={num} value={`${num}`}>
                              {num}° CICLO
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Créditos"
                    {...registerCurso('creditos', { required: 'Los créditos son requeridos', min: { value: 1, message: 'Los créditos deben ser al menos 1' } })}
                    error={!!errorsCurso.creditos}
                    helperText={errorsCurso.creditos?.message as string}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="departamento"
                    control={controlCurso}
                    rules={{ required: 'El departamento es requerido' }}
                    render={({ field }) => (
                      <Autocomplete
                        options={departamentos}
                        freeSolo
                        value={field.value || ''}
                        onChange={(_, value) => field.onChange(value)}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Departamento"
                            variant="outlined"
                            error={!!errorsCurso.departamento}
                            helperText={errorsCurso.departamento?.message as string}
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
            <Button onClick={handleCloseEditarCursoDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 600 }}>
              Guardar Cambios
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo de Programaciones por Ciclo */}
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
                      programaciones.map((prog) => (
                        <TableRow key={prog.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#003366' }}>
                              {prog.ciclo?.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Chip size="small" label={prog.horasTeoria} variant="outlined" title="Teoría" sx={{ height: 20, fontSize: '0.7rem' }} />
                              <Chip size="small" label={prog.horasPractica} variant="outlined" title="Práctica" sx={{ height: 20, fontSize: '0.7rem' }} />
                              <Chip size="small" label={prog.horasLaboratorio} variant="outlined" title="Laboratorio" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Chip size="small" label={prog.numGruposTeoria || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#e0f2f1', color: '#00695c' }} />
                              <Chip size="small" label={prog.numGruposPractica || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100' }} />
                              <Chip size="small" label={prog.numGruposLaboratorio || prog.numeroGrupos || 0} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#0d47a1' }} />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => handleEditProg(prog)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteProg(prog.id)}>
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

      {/* Diálogo para asignar cursos */}
      <Dialog open={openAsignarCursosDialog} onClose={handleCloseAsignarCursosDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
          Asignar Cursos a la Malla
        </DialogTitle>
        <DialogContent sx={{ pt: 6, mt: 0 }}>
          {cursosDisponibles.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography color="textSecondary">No hay cursos disponibles para asignar.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ mt: 2, borderRadius: 2, border: '1px solid #eef2f6' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#003366' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'white', width: 50 }}>
                      <Checkbox
                        checked={cursosSeleccionadosParaAsignar.length === cursosDisponibles.length}
                        onChange={() => {
                          if (cursosSeleccionadosParaAsignar.length === cursosDisponibles.length) {
                            setCursosSeleccionadosParaAsignar([]);
                          } else {
                            setCursosSeleccionadosParaAsignar(cursosDisponibles.map((c) => c.id));
                          }
                        }}
                        sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>N°</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>Ciclo</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>Departamento</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'white' }}>Créditos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cursosDisponibles.map((curso, index) => (
                    <TableRow key={curso.id} sx={{ '&:hover': { bgcolor: '#fcfdfe' } }}>
                      <TableCell>
                        <Checkbox
                          checked={cursosSeleccionadosParaAsignar.includes(curso.id)}
                          onChange={() => handleToggleCursoSeleccionado(curso.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{curso.codigo}</TableCell>
                      <TableCell>{curso.cicloAcademico}° CICLO</TableCell>
                      <TableCell>{curso.nombre}</TableCell>
                      <TableCell>{curso.departamento}</TableCell>
                      <TableCell>{curso.creditos} créditos</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseAsignarCursosDialog} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmarAsignacionCursos}
            disabled={cursosSeleccionadosParaAsignar.length === 0}
            sx={{ bgcolor: '#003366', fontWeight: 600 }}
          >
            Asignar {cursosSeleccionadosParaAsignar.length} Curso{cursosSeleccionadosParaAsignar.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para importar cursos con IA */}
      <Dialog open={openImportarCursosDialog} onClose={() => setOpenImportarCursosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
          Importar Cursos con IA
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ py: 2 }}>
            {curriculaParaVerCursos?.pdfArchivo && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #bbdefb' }}>
                <Typography sx={{ fontWeight: 600, color: '#0d47a1' }}>PDF guardado en la currícula:</Typography>
                <Typography variant="caption" sx={{ color: '#424242' }}>{curriculaParaVerCursos.pdfArchivo}</Typography>
              </Box>
            )}

            <Typography sx={{ mb: 2, fontWeight: 600 }}>O selecciona un nuevo PDF:</Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                borderStyle: 'dashed', 
                bgcolor: importarCursosDragOver ? '#e3f2fd' : fileImportarCursos ? '#e3f2fd' : '#f8fafc',
                borderColor: importarCursosDragOver ? '#003366' : fileImportarCursos ? '#003366' : undefined,
                cursor: 'pointer',
                '&:hover': { bgcolor: importandoCursosConIA ? '#f8fafc' : importarCursosDragOver ? '#e3f2fd' : fileImportarCursos ? '#e3f2fd' : '#f1f5f9' }
              }}
              onClick={() => !importandoCursosConIA && document.getElementById('pdf-upload-import-cursos')?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!importandoCursosConIA && !importarCursosDragOver) setImportarCursosDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!importandoCursosConIA && !importarCursosDragOver) setImportarCursosDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImportarCursosDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImportarCursosDragOver(false);
                
                if (importandoCursosConIA) return;
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type === 'application/pdf') {
                  setFileImportarCursos(files[0]);
                } else if (files.length > 0) {
                  MySwal.fire({
                    icon: 'error',
                    title: 'Archivo no válido',
                    text: 'Por favor, selecciona un archivo PDF'
                  });
                }
              }}
            >
              <input
                type="file"
                id="pdf-upload-import-cursos"
                hidden
                accept=".pdf"
                onChange={(e) => setFileImportarCursos(e.target.files?.[0] || null)}
                disabled={importandoCursosConIA}
              />
              <PdfIcon sx={{ fontSize: 48, color: '#003366', mb: 1, opacity: 0.7 }} />
              <Typography variant="h6" sx={{ color: '#003366', mb: 0.5 }}>
                {fileImportarCursos ? fileImportarCursos.name : 'Selecciona o arrastra el PDF'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Solo archivos .pdf (Máx. 10MB)
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenImportarCursosDialog(false)} color="inherit" sx={{ fontWeight: 600 }} disabled={importandoCursosConIA}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleImportarCursosConIA} 
            disabled={importandoCursosConIA || (!fileImportarCursos && !curriculaParaVerCursos?.pdfArchivo)} 
            sx={{ bgcolor: '#003366', fontWeight: 600 }}
          >
            {importandoCursosConIA ? <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} /> : null}
            Importar Cursos
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}