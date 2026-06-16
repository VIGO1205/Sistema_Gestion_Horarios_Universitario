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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Avatar,
  Autocomplete,
  TextField,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  OutlinedInput,
  Tabs,
  Tab,
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
  Biotech as BiotechIcon,
  Settings as SettingsIcon,
  Science as ScienceIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/components/providers/AuthProvider';
import CargaAcademicaDocente from '@/components/CargaAcademicaDocente';
import ValidacionCargaNoLectiva from '@/components/ValidacionCargaNoLectiva';

const MySwal = withReactContent(Swal);

export default function CargaAcademicaPage() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'docente';
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [todosCursos, setTodosCursos] = useState<any[]>([]);
  const [filtros, setFiltros] = useState({
    cicloId: '',
    carreraId: '',
    cicloAcademico: '1',
  });

  const [cargaAcademica, setCargaAcademica] = useState<any[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingCarga, setFetchingCarga] = useState(false);
  const [soloIncompletos, setSoloIncompletos] = useState(false);

  // Estado para Programación Masiva
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [selectedBulkIds, setSelectedBulkIds] = useState<number[]>([]);

  // Estado para Programación Individual (se mantiene para la tuerquita)
  const [openProgDialog, setOpenProgDialog] = useState(false);
  const [progLoading, setProgLoading] = useState(false);
  const [progData, setProgData] = useState({
    cursoId: '',
    horasTeoria: 0,
    numGruposTeoria: 0,
    horasPractica: 0,
    numGruposPractica: 0,
    horasLaboratorio: 0,
    numGruposLaboratorio: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ciclosRes, carrerasRes, docentesRes, cursosRes] = await Promise.all([
        api.get('/ciclos'),
        api.get('/carreras'),
        api.get('/docentes/active'),
        api.get('/cursos'),
      ]);
      setCiclos(ciclosRes.data);
      setCarreras(carrerasRes.data);
      setDocentes(docentesRes.data);
      setTodosCursos(cursosRes.data);

      // Set default cycle "2026-I" and career "Ingeniería de Sistemas"
      const defaultCiclo = Array.isArray(ciclosRes.data) ? ciclosRes.data.find((c: any) => c.nombre.includes('2026-I')) : null;
      const defaultCarrera = Array.isArray(carrerasRes.data) ? carrerasRes.data.find((c: any) => c.nombre.toLowerCase().includes('sistemas')) : null;

      setFiltros({
        cicloId: defaultCiclo ? String(defaultCiclo.id) : '',
        carreraId: defaultCarrera ? String(defaultCarrera.id) : '',
        cicloAcademico: '1',
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProgDialog = (curso: any = null) => {
    if (curso) {
      // Editar programación existente
      setProgData({
        cursoId: curso.cursoId || curso.id,
        horasTeoria: curso.horasTeoria || 0,
        numGruposTeoria: curso.numGruposTeoria || 0,
        horasPractica: curso.horasPractica || 0,
        numGruposPractica: curso.numGruposPractica || 0,
        horasLaboratorio: curso.horasLaboratorio || 0,
        numGruposLaboratorio: curso.numGruposLaboratorio || 0,
      });
      setOpenProgDialog(true);
    } else {
      // Programación Masiva
      handleOpenBulkDialog();
    }
  };

  const handleOpenBulkDialog = () => {
    // Preparar datos masivos basados en los cursos filtrados
    const cursosParaProgramar = todosCursos
      .filter(c => filtros.carreraId === '' || Number(c.carreraId) === Number(filtros.carreraId))
      .filter(c => filtros.cicloAcademico === '' || Number(c.cicloAcademico) === Number(filtros.cicloAcademico))
      .map(curso => {
        const enCarga = cargaAcademica.find(ca => ca.cursoId === curso.id);
        return {
          id: curso.id,
          nombre: curso.nombre,
          codigo: curso.codigo,
          creditos: curso.creditos,
          horasTeoria: enCarga?.horasTeoria || 0,
          numGruposTeoria: enCarga?.numGruposTeoria || (enCarga?.horasTeoria > 0 ? 1 : 0),
          horasPractica: enCarga?.horasPractica || 0,
          numGruposPractica: enCarga?.numGruposPractica || (enCarga?.horasPractica > 0 ? 1 : 0),
          horasLaboratorio: enCarga?.horasLaboratorio || 0,
          numGruposLaboratorio: enCarga?.numGruposLaboratorio || (enCarga?.horasLaboratorio > 0 ? 1 : 0),
          modificado: false
        };
      });
    
    setBulkData(cursosParaProgramar);
    setSelectedBulkIds([]);
    setOpenBulkDialog(true);
  };

  const handleBulkChange = (index: number, field: string, value: any) => {
    const newData = [...bulkData];
    newData[index] = { ...newData[index], [field]: value, modificado: true };
    setBulkData(newData);
  };

  const handleSaveBulk = async () => {
    const itemsToSave = bulkData.filter(d => d.modificado).map(d => ({
      cursoId: d.id,
      cicloId: Number(filtros.cicloId),
      horasTeoria: Number(d.horasTeoria),
      numGruposTeoria: Number(d.numGruposTeoria),
      horasPractica: Number(d.horasPractica),
      numGruposPractica: Number(d.numGruposPractica),
      horasLaboratorio: Number(d.horasLaboratorio),
      numGruposLaboratorio: Number(d.numGruposLaboratorio),
      numeroGrupos: Number(d.numGruposLaboratorio),
    }));

    if (itemsToSave.length === 0) {
      setOpenBulkDialog(false);
      return;
    }

    setBulkLoading(true);
    try {
      await api.post('/programacion-curso-ciclo/bulk', itemsToSave);
      MySwal.fire({
        icon: 'success',
        title: 'Programación Masiva Guardada',
        text: `Se procesaron ${itemsToSave.length} cursos correctamente.`,
        timer: 2000,
        showConfirmButton: false,
      });
      setOpenBulkDialog(false);
      fetchCargaAcademica();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error en la programación masiva';
      const errors = error.response?.data?.errors;
      
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: typeof msg === 'string' ? msg : 'Error al guardar algunos cursos. Revisa los créditos.',
        footer: errors ? `<div style="text-align:left max-height: 200px overflow-y: auto">${errors.map((e: any) => `<li>${e.message}</li>`).join('')}</div>` : ''
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSaveProg = async () => {
    if (!progData.cursoId) {
      MySwal.fire({ icon: 'warning', title: 'Curso requerido', text: 'Selecciona un curso.' });
      return;
    }

    setProgLoading(true);
    try {
      const payload = {
        cursoId: Number(progData.cursoId),
        cicloId: Number(filtros.cicloId),
        horasTeoria: Number(progData.horasTeoria),
        numGruposTeoria: Number(progData.numGruposTeoria),
        horasPractica: Number(progData.horasPractica),
        numGruposPractica: Number(progData.numGruposPractica),
        horasLaboratorio: Number(progData.horasLaboratorio),
        numGruposLaboratorio: Number(progData.numGruposLaboratorio),
        numeroGrupos: Number(progData.numGruposLaboratorio),
      };

      // Check if it already exists to use PUT or POST
      const existing = cargaAcademica.find(c => c.cursoId === payload.cursoId);
      
      if (existing) {
        await api.put(`/programacion-curso-ciclo/${existing.id}`, payload);
      } else {
        await api.post('/programacion-curso-ciclo', payload);
      }

      MySwal.fire({
        icon: 'success',
        title: 'Programación guardada',
        text: 'Las horas y grupos han sido configurados.',
        timer: 1500,
        showConfirmButton: false,
      });
      setOpenProgDialog(false);
      fetchCargaAcademica();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar la programación',
      });
    } finally {
      setProgLoading(false);
    }
  };

  useEffect(() => {
    if (filtros.cicloId) {
      fetchCargaAcademica();
    }
  }, [filtros.cicloId, filtros.carreraId, filtros.cicloAcademico]);

  const fetchCargaAcademica = async () => {
    setFetchingCarga(true);
    try {
      const params = new URLSearchParams();
      if (filtros.carreraId) params.append('carreraId', filtros.carreraId);
      if (filtros.cicloAcademico) params.append('cicloAcademico', filtros.cicloAcademico);
      
      const url = `/programacion-curso-ciclo/carga-academica/${filtros.cicloId}?${params.toString()}`;
      const response = await api.get(url);
      
      const dataMapped = response.data.map((curso: any) => {
        // Transformar asignaciones del backend
        const asignacionesTransformadas = curso.asignaciones.map((asig: any) => ({
          ...asig,
          grupos: asig.grupos.map((g: any) => ({ numeroGrupo: g.numeroGrupo }))
        }));

        const cursoConAsig = { 
          ...curso, 
          asignaciones: asignacionesTransformadas 
        };
        
        return {
          ...cursoConAsig,
          creditosAsignados: calcularCreditosLocales(cursoConAsig)
        };
      });

      setCargaAcademica(dataMapped);
      
      // Sincronizar el curso seleccionado con los nuevos datos
      if (selectedCurso) {
        const updated = dataMapped.find((c: any) => c.id === selectedCurso.id);
        if (updated) setSelectedCurso(updated);
      }
    } catch (error) {
      console.error('Error fetching carga academica:', error);
    } finally {
      setFetchingCarga(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCurso) return;

    setSaving(true);
    try {
      const payload = {
        cursoId: selectedCurso.cursoId || selectedCurso.id,
        cicloId: Number(filtros.cicloId),
        asignaciones: selectedCurso.asignaciones.map((a: any) => ({
          docenteId: a.docenteId,
          tipoClase: a.tipoClase,
          horasSemanales: a.horasSemanales,
          grupos: a.grupos.map((g: any) => g.numeroGrupo),
        })),
      };

      await api.post('/programacion-curso-ciclo/carga-academica', payload);
      MySwal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Carga académica actualizada correctamente',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCargaAcademica();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar la carga académica',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAsignacion = (tipo: string) => {
    if (!selectedCurso) return;

    // Determinar qué grupos ya están ocupados para este tipo de clase
    const gruposOcupados = selectedCurso.asignaciones
      .filter((a: any) => a.tipoClase === tipo)
      .flatMap((a: any) => a.grupos.map((g: any) => g.numeroGrupo));

    // Determinar el límite de grupos programados
    const maxGrupos = tipo === 'teoria' ? selectedCurso.numGruposTeoria : 
                     tipo === 'practica' ? selectedCurso.numGruposPractica : 
                     selectedCurso.numGruposLaboratorio;

    // Buscar el primer grupo libre
    let primerGrupoLibre = 1;
    for (let i = 1; i <= maxGrupos; i++) {
      if (!gruposOcupados.includes(i)) {
        primerGrupoLibre = i;
        break;
      }
    }

    const newAsignacion = {
      docenteId: '',
      docente: null,
      tipoClase: tipo,
      horasSemanales: tipo === 'teoria' ? selectedCurso.horasTeoria : 
                      tipo === 'practica' ? selectedCurso.horasPractica : 
                      selectedCurso.horasLaboratorio,
      grupos: [{ numeroGrupo: primerGrupoLibre }],
    };

    const updatedCurso = {
      ...selectedCurso,
      asignaciones: [...selectedCurso.asignaciones, newAsignacion],
    };
    updatedCurso.creditosAsignados = calcularCreditosLocales(updatedCurso);
    setSelectedCurso(updatedCurso);
    setCargaAcademica(prev => prev.map(c => c.id === updatedCurso.id ? updatedCurso : c));
  };

  const handleRemoveAsignacion = (index: number) => {
    const newAsignaciones = [...selectedCurso.asignaciones];
    newAsignaciones.splice(index, 1);
    
    const updatedCurso = { ...selectedCurso, asignaciones: newAsignaciones };
    updatedCurso.creditosAsignados = calcularCreditosLocales(updatedCurso);
    setSelectedCurso(updatedCurso);
    setCargaAcademica(prev => prev.map(c => c.id === updatedCurso.id ? updatedCurso : c));
  };

  const handleAsignacionChange = (index: number, field: string, value: any) => {
    const newAsignaciones = [...selectedCurso.asignaciones];
    let finalValue = value;

    // Validación de límites de horas
    if (field === 'horasSemanales') {
      const tipo = newAsignaciones[index].tipoClase;
      const maxHoras = tipo === 'teoria' ? selectedCurso.horasTeoria : 
                       tipo === 'practica' ? selectedCurso.horasPractica : 
                       selectedCurso.horasLaboratorio;
      
      finalValue = Math.max(1, Math.min(maxHoras, Number(value)));
    }

    newAsignaciones[index] = { ...newAsignaciones[index], [field]: finalValue };
    
    if (field === 'docente') {
      newAsignaciones[index].docenteId = value?.id || '';
    }

    const updatedCurso = { ...selectedCurso, asignaciones: newAsignaciones };
    updatedCurso.creditosAsignados = calcularCreditosLocales(updatedCurso);
    setSelectedCurso(updatedCurso);
    setCargaAcademica(prev => prev.map(c => c.id === updatedCurso.id ? updatedCurso : c));
  };

  const handleGruposChange = (asignacionIndex: number, selectedGrupos: number[]) => {
    const newAsignaciones = [...selectedCurso.asignaciones];
    const tipoActual = newAsignaciones[asignacionIndex].tipoClase;

    // Validación: Verificar si algún grupo ya está seleccionado por otro docente en el mismo tipo de clase
    const otrosGruposMismoTipo = newAsignaciones
      .filter((a, idx) => a.tipoClase === tipoActual && idx !== asignacionIndex)
      .flatMap(a => a.grupos.map((g: any) => g.numeroGrupo));

    const duplicado = selectedGrupos.find(g => otrosGruposMismoTipo.includes(g));
    if (duplicado) {
      MySwal.fire({
        icon: 'warning',
        title: 'Grupo duplicado',
        text: `El Grupo ${numberToLetter(duplicado)} ya ha sido asignado a otro docente en ${tipoActual}.`,
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }

    newAsignaciones[asignacionIndex].grupos = selectedGrupos.map(gNum => ({ numeroGrupo: gNum }));
    
    const updatedCurso = { ...selectedCurso, asignaciones: newAsignaciones };
    updatedCurso.creditosAsignados = calcularCreditosLocales(updatedCurso);
    setSelectedCurso(updatedCurso);
    setCargaAcademica(prev => prev.map(c => c.id === updatedCurso.id ? updatedCurso : c));
  };

  const navigateCourse = (direction: 'prev' | 'next') => {
    if (!selectedCurso || cargaAcademica.length === 0) return;
    
    const currentIndex = cargaAcademica.findIndex(c => c.id === selectedCurso.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Ciclar al inicio o final
    if (nextIndex >= cargaAcademica.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = cargaAcademica.length - 1;

    setSelectedCurso(cargaAcademica[nextIndex]);
  };

  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const calcularCreditosLocales = (curso: any) => {
    const horasL = Number(curso.horasLaboratorio || 0);

    let totalPuntosT = 0;
    let totalPuntosP = 0;
    let totalPuntosL = 0;
    
    // Solo sumamos si hay asignaciones reales y con docente seleccionado
    if (!curso.asignaciones || curso.asignaciones.length === 0) return 0;

    curso.asignaciones.forEach((asig: any) => {
      // SOLO sumamos al progreso si hay un docente seleccionado
      if (!asig.docenteId) return;

      const horasAsig = Number(asig.horasSemanales || 0);
      const numGrupos = asig.grupos?.length || 0;
      const tipo = String(asig.tipoClase || '').toLowerCase();

      if (tipo === 'teoria') {
        totalPuntosT += horasAsig * numGrupos;
      } else if (tipo === 'practica') {
        totalPuntosP += (horasAsig * numGrupos) / 2;
      } else if (tipo === 'laboratorio') {
        // En laboratorio, los grupos NO multiplican créditos.
        // Si el docente tiene grupos, sumamos horasAsig / 2.
        if (numGrupos > 0) {
          totalPuntosL += horasAsig / 2;
        }
      }
    });

    // Ajuste final para Laboratorio: El crédito de L no debe exceder HorasL / 2
    const creditosLMax = horasL / 2;
    const creditosL = Math.min(creditosLMax, totalPuntosL);

    return totalPuntosT + totalPuntosP + creditosL;
  };

  const getStatusColor = (curso: any) => {
    const creditos = curso.creditosAsignados || 0;
    const meta = curso.curso?.creditos || 0;
    const diff = Math.abs(creditos - meta);
    if (diff < 0.01) return 'success';
    if (creditos > meta) return 'error';
    return 'warning';
  };

  if (loading) return <LoadingSpinner />;

  if (esDocente) {
    return <CargaAcademicaDocente docente={usuario} ciclos={ciclos} />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssignmentIcon sx={{ fontSize: 40 }} /> Gestión de la Carga Académica
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Administra la asignación de docentes y grupos por curso.
      </Typography>

      {!esDocente && (
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Gestión de Carga Lectiva" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Validación de la Carga Académica" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      )}

      {activeTab === 0 ? (
        <>
          {/* Filtros */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Periodo Académico</InputLabel>
              <Select
                value={filtros.cicloId}
                label="Periodo Académico"
                onChange={(e) => setFiltros({ ...filtros, cicloId: e.target.value })}
              >
                {ciclos.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre} {c.nombre.includes('2026-I') ? '(Actual)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Carrera Profesional</InputLabel>
              <Select
                value={filtros.carreraId}
                label="Carrera Profesional"
                onChange={(e) => setFiltros({ ...filtros, carreraId: e.target.value })}
              >
                <MenuItem value="">Todas las Carreras</MenuItem>
                {carreras.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Ciclo Académico</InputLabel>
              <Select
                value={filtros.cicloAcademico}
                label="Ciclo Académico"
                onChange={(e) => setFiltros({ ...filtros, cicloAcademico: e.target.value })}
              >
                <MenuItem value="">Todos los Ciclos</MenuItem>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(c => (
                  <MenuItem key={c} value={String(c)}>{c}° CICLO</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Lista de Cursos */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6', overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>
                  Cursos ({cargaAcademica.filter(c => !soloIncompletos || getStatusColor(c) !== 'success').length})
                </Typography>
                <Tooltip title={soloIncompletos ? "Mostrar todos" : "Ver solo incompletos"}>
                  <IconButton 
                    size="small" 
                    onClick={() => setSoloIncompletos(!soloIncompletos)}
                    color={soloIncompletos ? "primary" : "default"}
                  >
                    <InfoIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Tooltip title="Programar nuevo curso para este ciclo">
                <IconButton size="small" color="primary" onClick={() => handleOpenProgDialog()}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {fetchingCarga ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
              ) : cargaAcademica.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 600 }}>
                    Debe programar cursos para poder comenzar con la asignación de la carga lectiva.
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Use el botón + arriba para programar cursos.
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {cargaAcademica
                    .filter(curso => !soloIncompletos || getStatusColor(curso) !== 'success')
                    .map((curso) => {
                    const status = getStatusColor(curso);
                    const isSelected = selectedCurso?.id === curso.id;
                    return (
                      <ListItem
                        key={curso.id}
                        disablePadding
                        divider
                      >
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => setSelectedCurso(curso)}
                          sx={{
                            py: 2,
                            borderLeft: isSelected ? '4px solid #003366' : '4px solid transparent',
                            '&.Mui-selected': { bgcolor: '#f0f4f8' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{curso.curso?.nombre}</Typography>
                                <Chip
                                  size="small"
                                  label={`${curso.creditosAsignados || 0}/${curso.curso?.creditos} C`}
                                  color={status}
                                  sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                Código: {curso.curso?.codigo} | Ciclo: {curso.curso?.cicloAcademico}°
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Detalle de Asignación */}
        <Grid item xs={12} md={8}>
          {selectedCurso ? (
            <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#003366', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedCurso.curso?.nombre}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                      <BookIcon fontSize="inherit" /> {selectedCurso.curso?.creditos} Créditos totales
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <AccessTimeIcon fontSize="inherit" /> 
                      T: {selectedCurso.horasTeoria}h ({selectedCurso.numGruposTeoria} G) | 
                      P: {selectedCurso.horasPractica}h ({selectedCurso.numGruposPractica} G) | 
                      L: {selectedCurso.horasLaboratorio}h ({selectedCurso.numGruposLaboratorio} G)
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', bgcolor: '#f0f4f8', borderRadius: 2, p: 0.5, mr: 1 }}>
                    <Tooltip title="Curso Anterior">
                      <IconButton size="small" onClick={() => navigateCourse('prev')} sx={{ color: '#003366' }}>
                        <ChevronLeftIcon />
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Tooltip title="Siguiente Curso">
                      <IconButton size="small" onClick={() => navigateCourse('next')} sx={{ color: '#003366' }}>
                        <ChevronRightIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Tooltip title="Programación">
                    <IconButton
                      onClick={() => handleOpenProgDialog(selectedCurso)}
                      sx={{ 
                        borderRadius: 2, 
                        color: '#003366', 
                        border: '1px solid rgba(0, 51, 102, 0.5)',
                        width: 40,
                        height: 40,
                        '&:hover': { bgcolor: 'rgba(0, 51, 102, 0.04)', borderColor: '#003366' }
                      }}
                    >
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ 
                      bgcolor: '#003366', 
                      borderRadius: 2, 
                      px: 3,
                      height: 40,
                      minWidth: 110,
                      fontWeight: 700,
                      textTransform: 'none'
                    }}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                {/* Resumen de Créditos */}
                <Card variant="outlined" sx={{ mb: 4, bgcolor: '#f8fafc', borderStyle: 'dashed' }}>
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Progreso de Carga Académica</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {selectedCurso.creditosAsignados || 0} / {selectedCurso.curso?.creditos} Créditos
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(100, ((selectedCurso.creditosAsignados || 0) / selectedCurso.curso?.creditos) * 100)} 
                      color={getStatusColor(selectedCurso)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>

                {/* Secciones de Asignación */}
                {['teoria', 'practica', 'laboratorio'].map((tipo) => {
                  // Solo mostrar la sección si tiene horas programadas
                  const horasProgramadas = tipo === 'teoria' ? selectedCurso.horasTeoria : 
                                         tipo === 'practica' ? selectedCurso.horasPractica : 
                                         selectedCurso.horasLaboratorio;
                  
                  if (horasProgramadas === 0) return null;

                  return (
                    <Box key={tipo} sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 1 }}>
                          {tipo === 'teoria' ? <SchoolIcon color="primary" /> : tipo === 'practica' ? <GroupsIcon color="secondary" /> : <BiotechIcon color="info" />}
                          {tipo}
                        </Typography>
                        <Button 
                          size="small" 
                          startIcon={<AddIcon />} 
                          onClick={() => handleAddAsignacion(tipo)}
                        >
                          Asignar Docente
                        </Button>
                      </Box>

                      <Grid container spacing={2}>
                        {selectedCurso.asignaciones.filter((a: any) => a.tipoClase === tipo).map((asig: any, idx: number) => {
                          const originalIndex = selectedCurso.asignaciones.indexOf(asig);
                          return (
                            <Grid item xs={12} key={originalIndex}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', '&:hover': { borderColor: '#003366', bgcolor: '#fcfdfe' } }}>
                                <Grid container spacing={1} alignItems="center">
                                  <Grid item xs={12} md={5}>
                                    <Autocomplete
                                      size="small"
                                      options={docentes}
                                      getOptionLabel={(option) => option.nombreCompleto || ''}
                                      value={docentes.find(d => d.id === asig.docenteId) || null}
                                      onChange={(_, newValue) => handleAsignacionChange(originalIndex, 'docente', newValue)}
                                      renderInput={(params) => <TextField {...params} label="Docente" />}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <TextField
                                      size="small"
                                      type="number"
                                      label="Hrs"
                                      value={asig.horasSemanales}
                                      onChange={(e) => handleAsignacionChange(originalIndex, 'horasSemanales', Number(e.target.value))}
                                      inputProps={{ 
                                        min: 1, 
                                        max: horasProgramadas 
                                      }}
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel id={`grupos-label-${originalIndex}`}>Grupo</InputLabel>
                                      <Select
                                        labelId={`grupos-label-${originalIndex}`}
                                        multiple
                                        value={asig.grupos.map((g: any) => g.numeroGrupo)}
                                        onChange={(e) => handleGruposChange(originalIndex, e.target.value as number[])}
                                        input={<OutlinedInput label="Grupo" />}
                                        renderValue={(selected) => (selected as number[]).sort((a, b) => a - b).map(v => numberToLetter(v)).join(', ')}
                                      >
                                        {Array.from({ length: 
                                          tipo === 'teoria' ? selectedCurso.numGruposTeoria : 
                                          tipo === 'practica' ? selectedCurso.numGruposPractica : 
                                          selectedCurso.numGruposLaboratorio 
                                        }, (_, i) => i + 1).map((gNum) => (
                                          <MenuItem key={gNum} value={gNum}>
                                            {numberToLetter(gNum)}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <TextField
                                      size="small"
                                      label="T. Horas"
                                      value={`${asig.horasSemanales * asig.grupos.length}h`}
                                      InputProps={{ readOnly: true }}
                                      fullWidth
                                      sx={{ bgcolor: '#f8fafc' }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleRemoveAsignacion(originalIndex)}
                                      sx={{ color: 'error.main' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                      {selectedCurso.asignaciones.filter((a: any) => a.tipoClase === tipo).length === 0 && (
                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                          Sin docentes asignados para {tipo}.
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 4, border: '1px solid #eef2f6', bgcolor: '#f8fafc' }}>
              <InfoIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">Selecciona un curso para gestionar su carga</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
      </>
      ) : (
        <ValidacionCargaNoLectiva cicloId={Number(filtros.cicloId)} />
      )}

      {/* Diálogo de Programación */}
      <Dialog
        open={openProgDialog}
        onClose={() => !progLoading && setOpenProgDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon /> Configurar Programación del Curso
        </DialogTitle>
        <DialogContent sx={{ pt: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Curso a Programar</InputLabel>
                <Select
                  value={progData.cursoId}
                  label="Curso a Programar"
                  onChange={(e) => setProgData({ ...progData, cursoId: e.target.value })}
                  disabled={progLoading || !!progData.cursoId}
                >
                  {todosCursos
                    .filter(c => filtros.carreraId === '' || Number(c.carreraId) === Number(filtros.carreraId))
                    .filter(c => filtros.cicloAcademico === '' || Number(c.cicloAcademico) === Number(filtros.cicloAcademico))
                    .filter(c => {
                      // No mostrar cursos que ya están completos en la carga académica actual
                      const enCarga = cargaAcademica.find(ca => ca.cursoId === c.id);
                      if (enCarga) {
                        const esCompleto = Math.abs(enCarga.creditosAsignados - (enCarga.curso?.creditos || 0)) < 0.01;
                        return !esCompleto; // Solo mostrar si NO está completo
                      }
                      return true; // Si no está en carga, está vacío, así que se muestra
                    })
                    .map(curso => (
                    <MenuItem key={curso.id} value={curso.id}>
                      {curso.nombre} ({curso.codigo})
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Solo se muestran cursos de la carrera seleccionada en los filtros.
                </Typography>
              </FormControl>
            </Grid>

            {/* Tarjetas de T, P, L */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#166534' }}>
                  <SchoolIcon fontSize="small" /> TEORÍA
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Horas"
                  type="number"
                  value={progData.horasTeoria}
                  onChange={(e) => setProgData({ ...progData, horasTeoria: Math.max(0, Number(e.target.value)) })}
                  sx={{ mb: 2, bgcolor: 'white' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="N° Grupos"
                  type="number"
                  value={progData.numGruposTeoria}
                  onChange={(e) => setProgData({ ...progData, numGruposTeoria: Math.max(0, Number(e.target.value)) })}
                  sx={{ bgcolor: 'white' }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fffbeb', borderColor: '#fef3c7' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#92400e' }}>
                  <GroupsIcon fontSize="small" /> PRÁCTICA
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Horas"
                  type="number"
                  value={progData.horasPractica}
                  onChange={(e) => setProgData({ ...progData, horasPractica: Math.max(0, Number(e.target.value)) })}
                  sx={{ mb: 2, bgcolor: 'white' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="N° Grupos"
                  type="number"
                  value={progData.numGruposPractica}
                  onChange={(e) => setProgData({ ...progData, numGruposPractica: Math.max(0, Number(e.target.value)) })}
                  sx={{ bgcolor: 'white' }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#eff6ff', borderColor: '#dbeafe' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#1e40af' }}>
                  <ScienceIcon fontSize="small" /> LABORATORIO
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Horas"
                  type="number"
                  value={progData.horasLaboratorio}
                  onChange={(e) => setProgData({ ...progData, horasLaboratorio: Math.max(0, Number(e.target.value)) })}
                  sx={{ mb: 2, bgcolor: 'white' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="N° Grupos"
                  type="number"
                  value={progData.numGruposLaboratorio}
                  onChange={(e) => setProgData({ ...progData, numGruposLaboratorio: Math.max(0, Number(e.target.value)) })}
                  sx={{ bgcolor: 'white' }}
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenProgDialog(false)} color="inherit">Cancelar</Button>
          <Button 
            onClick={handleSaveProg} 
            variant="contained" 
            disabled={progLoading}
            sx={{ bgcolor: '#003366', fontWeight: 700, px: 4 }}
          >
            {progLoading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Programación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Programación Masiva */}
      <Dialog
        open={openBulkDialog}
        onClose={() => !bulkLoading && setOpenBulkDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, height: '90vh' } }}
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon /> Programación Masiva de Cursos
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eef2f6' }}>
            <Autocomplete
              multiple
              disableCloseOnSelect
              limitTags={3}
              options={bulkData.filter(c => {
                // Solo mostrar cursos incompletos o vacíos
                const enCarga = cargaAcademica.find(ca => ca.cursoId === c.id);
                if (enCarga) {
                  const esCompleto = Math.abs(enCarga.creditosAsignados - (enCarga.creditos || 0)) < 0.01;
                  return !esCompleto;
                }
                return true;
              })}
              getOptionLabel={(option) => `${option.nombre} (${option.codigo})`}
              value={bulkData.filter(d => selectedBulkIds.includes(d.id))}
              onChange={(_, newValue) => {
                setSelectedBulkIds(newValue.map(v => v.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar Cursos para Programar"
                  placeholder="Busca y selecciona los cursos..."
                  size="small"
                  sx={{
                    '& .MuiAutocomplete-inputRoot': {
                      flexWrap: 'wrap',
                      minHeight: '56px',
                      maxHeight: '90px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                      '& .MuiAutocomplete-tag': {
                        margin: '2px',
                      },
                    },
                  }}
                />
              )}
              sx={{
                bgcolor: 'white',
              }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white', width: 50 }}>N°</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white', width: '30%' }}>Curso</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white' }}>Teoría (H | G)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white' }}>Práctica (H | G)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white' }}>Lab (H | G)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#003366', color: 'white' }}>Créditos</TableCell>
                  </TableRow>
                </TableHead>
              <TableBody>
                {selectedBulkIds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Typography variant="body2" color="textSecondary">
                        No hay cursos seleccionados para mostrar en la tabla.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bulkData
                    .filter(d => selectedBulkIds.includes(d.id))
                    .map((row, idx) => {
                      const actualIndex = bulkData.findIndex(d => d.id === row.id);
                      const calcCreds = (Number(row.horasTeoria) * Math.max(1, Number(row.numGruposTeoria))) + 
                                       (Number(row.horasPractica) * Math.max(1, Number(row.numGruposPractica))) / 2 + 
                                       Number(row.horasLaboratorio) / 2;
                      const isError = Math.abs(calcCreds - row.creditos) > 0.01;

                      return (
                        <TableRow key={row.id} sx={{ '&:hover': { bgcolor: '#f1f5f9' }, bgcolor: row.modificado ? '#fffdf0' : 'inherit' }}>
                          <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.nombre}</Typography>
                          </TableCell>
                          
                          {/* Teoría */}
                          <TableCell align="center" sx={{ bgcolor: '#f0fdf4' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.horasTeoria}
                                onChange={(e) => handleBulkChange(actualIndex, 'horasTeoria', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                value={row.numGruposTeoria}
                                onChange={(e) => handleBulkChange(actualIndex, 'numGruposTeoria', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                            </Box>
                          </TableCell>

                          {/* Práctica */}
                          <TableCell align="center" sx={{ bgcolor: '#fffbeb' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.horasPractica}
                                onChange={(e) => handleBulkChange(actualIndex, 'horasPractica', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                value={row.numGruposPractica}
                                onChange={(e) => handleBulkChange(actualIndex, 'numGruposPractica', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                            </Box>
                          </TableCell>

                          {/* Laboratorio */}
                          <TableCell align="center" sx={{ bgcolor: '#eff6ff' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.horasLaboratorio}
                                onChange={(e) => handleBulkChange(actualIndex, 'horasLaboratorio', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                value={row.numGruposLaboratorio}
                                onChange={(e) => handleBulkChange(actualIndex, 'numGruposLaboratorio', e.target.value)}
                                sx={{ width: 60, bgcolor: 'white' }}
                                inputProps={{ style: { textAlign: 'center', padding: '4px' } }}
                              />
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={`${calcCreds} / ${row.creditos}`} 
                              color={isError ? 'error' : 'success'}
                              sx={{ fontWeight: 800 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #eef2f6' }}>
        <Typography variant="caption" sx={{ flexGrow: 1, ml: 2, color: 'textSecondary' }}>
          * Los cambios se resaltan en amarillo. Los créditos deben coincidir exactamente.
        </Typography>
        <Button onClick={() => setOpenBulkDialog(false)} color="inherit">Cancelar</Button>
        <Button 
          onClick={handleSaveBulk} 
          variant="contained" 
          disabled={bulkLoading}
          sx={{ bgcolor: '#003366', fontWeight: 700, px: 4 }}
        >
          {bulkLoading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Todos los Cambios'}
        </Button>
      </DialogActions>
      </Dialog>
    </Box>
  );
}
