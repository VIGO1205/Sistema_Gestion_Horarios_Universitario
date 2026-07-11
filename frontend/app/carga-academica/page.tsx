'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Info as InfoIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
  Biotech as BiotechIcon,
  Science as ScienceIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Assignment as AssignmentIcon,
  VerifiedUser as VerifiedUserIcon,
  MeetingRoom as MeetingRoomIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getLimitesReglamento } from '@/lib/reglamento-utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/components/providers/AuthProvider';
import CargaAcademicaDocente from '@/components/CargaAcademicaDocente';
import ValidacionCargaNoLectiva from '@/components/ValidacionCargaNoLectiva';
import CalendarioPorAula from './components/CalendarioPorAula';
import DisponibilidadAula from './components/DisponibilidadAula';

const MySwal = withReactContent(Swal);

export default function CargaAcademicaPage() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'docente';
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [curriculas, setCurriculas] = useState<any[]>([]);
  const [filtros, setFiltros] = useState({
    cicloId: '',
    carreraId: '',
    cicloAcademico: '1',
    curriculaId: '',
  });

  const [cargaAcademica, setCargaAcademica] = useState<any[]>([]);
  const dragDataRef = useRef({ docenteId: '', cursoId: '', tipoClase: '', horasSemanales: 1 });
  const [saving, setSaving] = useState(false);
  const [fetchingCarga, setFetchingCarga] = useState(false);

  // Estados para la pestaña "Por Docente"
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [soloIncompletosDocentes, setSoloIncompletosDocentes] = useState(false);
  const [docenteCursosEdit, setDocenteCursosEdit] = useState<any[]>([]);
  const [showCursoAutocomplete, setShowCursoAutocomplete] = useState(false);

  // Estados para "Asignación de Horarios (Por Aula)"
  const [aulas, setAulas] = useState<any[]>([]);
  const [selectedAula, setSelectedAula] = useState<any>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('selectedAula') : null;
    return saved ? Number(saved) : null;
  });
  const [filtroAulaTipo, setFiltroAulaTipo] = useState('todos');
  const [showDisponibilidad, setShowDisponibilidad] = useState(false);

  const [horariosCiclo, setHorariosCiclo] = useState<any[]>([]);
  const [horariosRefreshKey, setHorariosRefreshKey] = useState(0);

  useEffect(() => {
    if (!filtros.cicloId) return;
    api.get('/horarios', { params: { cicloId: filtros.cicloId } }).then(res => {
      setHorariosCiclo(res.data || []);
    }).catch(() => setHorariosCiclo([]));
  }, [filtros.cicloId, horariosRefreshKey]);

  const pendingDocenteId = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(parseInt(tab));
    const docenteId = params.get('docenteId');
    if (docenteId) pendingDocenteId.current = parseInt(docenteId);
  }, []);

  useEffect(() => {
    if (docentes.length === 0 || !pendingDocenteId.current) return;
    const found = docentes.find((d: any) => d.id === pendingDocenteId.current);
    if (found) {
      setSelectedDocente(found);
      pendingDocenteId.current = null;
    }
  }, [docentes]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab > 0) params.set('tab', String(activeTab));
    if (selectedDocente?.id) params.set('docenteId', String(selectedDocente.id));
    const searchStr = params.toString();
    const newUrl = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [activeTab, selectedDocente]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ciclosRes, carrerasRes, docentesRes, curriculasRes, aulasRes] = await Promise.all([
        api.get('/ciclos'),
        api.get('/carreras'),
        api.get('/docentes/active'),
        api.get('/curriculas'),
        api.get('/aulas'),
      ]);
      setCiclos(ciclosRes.data);
      setCarreras(carrerasRes.data);
      setDocentes(docentesRes.data);
      setCurriculas(curriculasRes.data);
      setAulas(aulasRes.data || []);

      // Set default cycle "2026-I" and career "Ingeniería de Sistemas"
      const defaultCiclo = Array.isArray(ciclosRes.data) ? ciclosRes.data.find((c: any) => c.nombre.includes('2026-I')) : null;
      const defaultCarrera = Array.isArray(carrerasRes.data) ? carrerasRes.data.find((c: any) => c.nombre.toLowerCase().includes('sistemas')) : null;

      setFiltros({
        cicloId: defaultCiclo ? String(defaultCiclo.id) : '',
        carreraId: defaultCarrera ? String(defaultCarrera.id) : '',
    cicloAcademico: '',
        curriculaId: '',
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filtros.cicloId) {
      fetchCargaAcademica();
    }
  }, [filtros.cicloId, filtros.carreraId]);

  // Persistir aula seleccionada
  useEffect(() => {
    if (selectedAula) localStorage.setItem('selectedAula', String(selectedAula));
    else localStorage.removeItem('selectedAula');
  }, [selectedAula]);

  // Validar aula persistida al cargar aulas y auto-seleccionar si no coincide con filtro
  useEffect(() => {
    if (aulas.length === 0) return;
    if (!selectedAula || !aulas.find(a => a.id === selectedAula)) {
      const filtradas = aulas.filter(a => filtroAulaTipo === 'todos'
        ? true
        : filtroAulaTipo === 'aulas'
          ? a.tipo === 'teoría' || a.tipo === 'práctica'
          : a.tipo === 'laboratorio'
      );
      if (filtradas.length > 0) setSelectedAula(filtradas[0].id);
      return;
    }
    const aulaSel = aulas.find(a => a.id === selectedAula);
    if (!aulaSel) return;
    const coincide = filtroAulaTipo === 'todos'
      || (filtroAulaTipo === 'aulas' && (aulaSel.tipo === 'teoría' || aulaSel.tipo === 'práctica'))
      || (filtroAulaTipo === 'laboratorio' && aulaSel.tipo === 'laboratorio');
    if (coincide) return;
    const filtradas = aulas.filter(a => filtroAulaTipo === 'todos'
      ? true
      : filtroAulaTipo === 'aulas'
        ? a.tipo === 'teoría' || a.tipo === 'práctica'
        : a.tipo === 'laboratorio'
    );
    if (filtradas.length > 0) setSelectedAula(filtradas[0].id);
  }, [filtroAulaTipo, aulas, selectedAula]);

  // Poblar docenteCursosEdit cuando cambia el docente seleccionado o la carga académica
  useEffect(() => {
    if (!selectedDocente) { setDocenteCursosEdit([]); return; }
    const existing = cargaAcademica
      .filter((c: any) => c.asignaciones.some((a: any) => a.docenteId === selectedDocente.id))
      .map((c: any) => ({
        cursoProgramacion: c,
        asignaciones: c.asignaciones
          .filter((a: any) => a.docenteId === selectedDocente.id)
          .map((a: any) => {
            const tipo = a.tipoClase;
            const maxGrupos = tipo === 'teoria' ? c.numGruposTeoria : tipo === 'practica' ? c.numGruposPractica : c.numGruposLaboratorio;
            const maxHoras = tipo === 'teoria' ? c.horasTeoria : tipo === 'practica' ? c.horasPractica : c.horasLaboratorio;
            return {
              tipoClase: tipo,
              horasSemanales: a.grupos?.length ? Math.round(a.horasSemanales / a.grupos.length) : maxHoras,
              grupos: a.grupos.map((g: any) => ({ id: g.id, numeroGrupo: g.numeroGrupo })),
              maxGrupos: maxGrupos || 1,
              maxHoras: maxHoras || 1,
            };
          }),
      }));
    setDocenteCursosEdit(existing);
  }, [selectedDocente, cargaAcademica]);

  const fetchCargaAcademica = async () => {
    setFetchingCarga(true);
    try {
      const params = new URLSearchParams();
      if (filtros.carreraId) params.append('carreraId', filtros.carreraId);
      
      const url = `/programacion-curso-ciclo/carga-academica/${filtros.cicloId}?${params.toString()}`;
      const response = await api.get(url);
      
      const dataMapped = response.data.map((curso: any) => {
        const asignacionesTransformadas = curso.asignaciones.map((asig: any) => ({
          ...asig,
          horasSemanales: asig.grupos?.length
            ? Math.round(asig.horasSemanales / asig.grupos.length)
            : asig.horasSemanales,
          grupos: asig.grupos.map((g: any) => ({ id: g.id, numeroGrupo: g.numeroGrupo }))
        }));

        const cursoConAsig = { 
          ...curso, 
          asignaciones: asignacionesTransformadas 
        };
        
        return cursoConAsig;
      });

      setCargaAcademica(dataMapped);
    } catch (error) {
      console.error('Error fetching carga academica:', error);
    } finally {
      setFetchingCarga(false);
    }
  };

  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  // Funciones para la pestaña "Por Docente"
  const calcularCreditosDocente = (docenteId: number) => {
    let totalCreditos = 0;
    cargaAcademica.forEach((curso: any) => {
      curso.asignaciones.forEach((asig: any) => {
        if (asig.docenteId === docenteId && asig.docenteId) {
          const horasAsig = Number(asig.horasSemanales || 0);
          const tipo = String(asig.tipoClase || '').toLowerCase();

          if (tipo === 'teoria') {
            totalCreditos += horasAsig;
          } else if (tipo === 'practica' || tipo === 'laboratorio') {
            totalCreditos += horasAsig / 2;
          }
        }
      });
    });
    return totalCreditos;
  };

  const calcularHorasDocente = (docenteId: number) => {
    let totalHoras = 0;
    cargaAcademica.forEach((curso: any) => {
      curso.asignaciones.forEach((asig: any) => {
        if (asig.docenteId === docenteId && asig.docenteId) {
          totalHoras += Number(asig.horasSemanales || 0);
        }
      });
    });
    return totalHoras;
  };

  const getStatusColorDocente = (docente: any) => {
    const horas = calcularHorasDocente(docente.id);
    const limites = getLimitesCargaDocente(docente);
    
    if (horas > limites.max) return 'error';
    if (horas >= limites.min && horas <= limites.max) return 'success';
    return 'warning';
  };

  const formatEnumText = (text: string | null | undefined): string => {
    if (!text) return 'Sin especificar';
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLimitesCargaDocente = (docente: any) => {
    const limites = getLimitesReglamento(docente);
    return {
      min: limites.chl.min,
      max: limites.chl.max ?? 0,
      topeDiario: 8,
    };
  };

  // --- Handlers for "Asignación por Docente" tab ---
  const handleAddCursoToDocente = (event: any, newValue: any) => {
    setShowCursoAutocomplete(false);
    if (!newValue) return;

    const newAsignaciones: any[] = [];
    if (newValue.horasTeoria > 0) {
      newAsignaciones.push({
        tipoClase: 'teoria',
        horasSemanales: newValue.horasTeoria,
        grupos: [1],
        maxGrupos: newValue.numGruposTeoria,
        maxHoras: newValue.horasTeoria,
      });
    }
    if (newValue.horasPractica > 0) {
      newAsignaciones.push({
        tipoClase: 'practica',
        horasSemanales: newValue.horasPractica,
        grupos: [1],
        maxGrupos: newValue.numGruposPractica,
        maxHoras: newValue.horasPractica,
      });
    }
    if (newValue.horasLaboratorio > 0) {
      newAsignaciones.push({
        tipoClase: 'laboratorio',
        horasSemanales: newValue.horasLaboratorio,
        grupos: [1],
        maxGrupos: newValue.numGruposLaboratorio,
        maxHoras: newValue.horasLaboratorio,
      });
    }

    setDocenteCursosEdit(prev => [...prev, {
      cursoProgramacion: newValue,
      asignaciones: newAsignaciones,
    }]);
  };

  const handleDocenteAsignacionChange = (cursoIdx: number, asigIdx: number, field: string, value: any) => {
    setDocenteCursosEdit(prev => {
      const updated = [...prev];
      const asig = { ...updated[cursoIdx].asignaciones[asigIdx] };
      asig[field] = value;
      const newAsigs = [...updated[cursoIdx].asignaciones];
      newAsigs[asigIdx] = asig;
      updated[cursoIdx] = { ...updated[cursoIdx], asignaciones: newAsigs };
      return updated;
    });
  };

  const handleDocenteGruposChange = (cursoIdx: number, asigIdx: number, selected: number[]) => {
    setDocenteCursosEdit(prev => {
      const updated = [...prev];
      const asig = { ...updated[cursoIdx].asignaciones[asigIdx] };
      asig.grupos = selected;
      const newAsigs = [...updated[cursoIdx].asignaciones];
      newAsigs[asigIdx] = asig;
      updated[cursoIdx] = { ...updated[cursoIdx], asignaciones: newAsigs };
      return updated;
    });
  };

  const handleRemoveCursoEdit = (index: number) => {
    setDocenteCursosEdit(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDocenteAsignaciones = async () => {
    if (docenteCursosEdit.length === 0 || !selectedDocente) return;
    
    setSaving(true);
    try {
      for (const cursoEdit of docenteCursosEdit) {
        const cursoProg = cursoEdit.cursoProgramacion;
        const cursoId = cursoProg.cursoId || cursoProg.id;

        // Obtener asignaciones actuales del backend (data fresca)
        let existingAsignaciones: any[] = [];
        try {
          const freshRes = await api.get(`/programacion-curso-ciclo/carga-academica/${filtros.cicloId}?cursoId=${cursoId}`);
          const freshData = Array.isArray(freshRes.data) ? freshRes.data : [];
          const freshCurso = freshData.find((c: any) => c.cursoId === cursoId || c.id === cursoId);
          if (freshCurso) {
            existingAsignaciones = (freshCurso.asignaciones || [])
              .filter((a: any) => a.docenteId !== selectedDocente.id);
          }
        } catch (e) {
          // Fallback: usar data en memoria si falla la petición
          const cursoEnCarga = cargaAcademica.find((c: any) => 
            (c.cursoId === cursoId || c.id === cursoId)
          );
          existingAsignaciones = (cursoEnCarga?.asignaciones || [])
            .filter((a: any) => a.docenteId !== selectedDocente.id);
        }
        
        const existingPayload = existingAsignaciones.map((a: any) => ({
          docenteId: a.docenteId,
          tipoClase: a.tipoClase,
          horasSemanales: a.grupos?.length ? Math.round(a.horasSemanales / a.grupos.length) : a.horasSemanales,
          grupos: a.grupos.map((g: any) => g.numeroGrupo),
        }));
        
        const newPayload = cursoEdit.asignaciones.map((a: any) => ({
          docenteId: selectedDocente.id,
          tipoClase: a.tipoClase,
          horasSemanales: Number(a.horasSemanales),
          grupos: a.grupos.map((g: any) => g.numeroGrupo ?? g),
        }));
        
        const payload = {
          cursoId,
          cicloId: Number(filtros.cicloId),
          asignaciones: [...existingPayload, ...newPayload],
        };

        await api.post('/programacion-curso-ciclo/carga-academica', payload);
      }
      
      MySwal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Cambios guardados correctamente.',
        timer: 1500,
        showConfirmButton: false,
      });
      
      fetchCargaAcademica();
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al guardar.',
      });
    } finally {
      setSaving(false);
    }
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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Asignación Carga Lectiva (Por Docente)" 
            icon={<PersonIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
          <Tab 
            label="Asignación de Horarios (Por Aula)" 
            icon={<MeetingRoomIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
          <Tab 
            label="Validación de Carga Académica" 
            icon={<VerifiedUserIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
        </Tabs>
      )}
      {activeTab === 0 ? (
        <>
          {/* Filtros */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Periodo Académico</InputLabel>
                  <Select
                    value={filtros.cicloId}
                    label="Periodo Académico"
                    onChange={(e) => setFiltros({ ...filtros, cicloId: e.target.value })}
                  >
                    {ciclos.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                    {c.nombre}{c.esActual ? ' (Actual)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
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

            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {/* Lista de Docentes */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6', overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>
                      Docentes ({docentes.length})
                    </Typography>
                    <Tooltip title={soloIncompletosDocentes ? "Mostrar todos" : "Ver solo incompletos"}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSoloIncompletosDocentes(!soloIncompletosDocentes)}
                        color={soloIncompletosDocentes ? "primary" : "default"}
                      >
                        <InfoIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ p: 2, borderBottom: '1px solid #eef2f6' }}>
                  <Autocomplete
                    size="small"
                    options={docentes}
                    getOptionLabel={(option) => option.nombreCompleto || `${option.nombre} ${option.apellidoPaterno || ''} ${option.apellidoMaterno || ''}`}
                    value={selectedDocente}
                    onChange={(_, newValue) => setSelectedDocente(newValue)}
                    renderInput={(params) => <TextField {...params} label="Buscar Docente" />}
                    filterOptions={(options, state) => {
                      const filtered = options.filter(option => {
                        const label = (option.nombreCompleto || `${option.nombre} ${option.apellidoPaterno || ''} ${option.apellidoMaterno || ''}`).toLowerCase();
                        return label.includes(state.inputValue.toLowerCase());
                      });
                      return state.inputValue === '' ? filtered.slice(0, 10) : filtered;
                    }}
                  />
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  {fetchingCarga ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
                  ) : docentes.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">No hay docentes disponibles</Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {docentes
                        .filter(doc => !soloIncompletosDocentes || getStatusColorDocente(doc) !== 'success')
                        .map((docente) => {
                        const isSelected = selectedDocente?.id === docente.id;
                        return (
                          <ListItem
                            key={docente.id}
                            disablePadding
                            divider
                          >
                            <ListItemButton
                              selected={isSelected}
                              onClick={() => setSelectedDocente(docente)}
                              sx={{
                                py: 2,
                                borderLeft: isSelected ? '4px solid #003366' : '4px solid transparent',
                                '&.Mui-selected': { bgcolor: '#f0f4f8' }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                      {docente.nombreCompleto || `${docente.nombre} ${docente.apellidoPaterno || ''} ${docente.apellidoMaterno || ''}`}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${calcularHorasDocente(docente.id)}H`}
                                      color={getStatusColorDocente(docente)}
                                      sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" color="textSecondary">
                                    {formatEnumText(docente.categoria)} | {formatEnumText(docente.condicion)}
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
            {/* Detalle de Asignación por Docente */}
            <Grid item xs={12} md={8}>
              {selectedDocente ? (
                <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6' }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#003366', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedDocente.nombreCompleto || `${selectedDocente.nombre} ${selectedDocente.apellidoPaterno || ''} ${selectedDocente.apellidoMaterno || ''}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                          <PersonIcon fontSize="inherit" /> {formatEnumText(selectedDocente.categoria)} | {formatEnumText(selectedDocente.condicion)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <AccessTimeIcon fontSize="inherit" /> {calcularHorasDocente(selectedDocente.id)}H / {getLimitesCargaDocente(selectedDocente).max}H (Min: {getLimitesCargaDocente(selectedDocente).min}H)
                        </Typography>
                      </Box>
                    </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', bgcolor: '#f0f4f8', borderRadius: 2, p: 0.5, mr: 1 }}>
                        <Tooltip title="Docente Anterior">
                          <IconButton size="small" onClick={() => {
                            const currentIndex = docentes.findIndex(d => d.id === selectedDocente.id);
                            let nextIndex = currentIndex - 1;
                            if (nextIndex < 0) nextIndex = docentes.length - 1;
                            setSelectedDocente(docentes[nextIndex]);
                          }} sx={{ color: '#003366' }}>
                            <ChevronLeftIcon />
                          </IconButton>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="Siguiente Docente">
                          <IconButton size="small" onClick={() => {
                            const currentIndex = docentes.findIndex(d => d.id === selectedDocente.id);
                            let nextIndex = currentIndex + 1;
                            if (nextIndex >= docentes.length) nextIndex = 0;
                            setSelectedDocente(docentes[nextIndex]);
                          }} sx={{ color: '#003366' }}>
                            <ChevronRightIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveDocenteAsignaciones}
                        disabled={saving || docenteCursosEdit.length === 0}
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
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Progreso de Carga Lectiva</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {docenteCursosEdit.reduce((sum: number, ce: any) => 
                              sum + ce.asignaciones.reduce((s: number, a: any) => s + Number(a.horasSemanales) * a.grupos.length, 0), 0
                            )} / {getLimitesCargaDocente(selectedDocente).max} H (Mín: {getLimitesCargaDocente(selectedDocente).min}H)
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(100, (docenteCursosEdit.reduce((sum: number, ce: any) => 
                            sum + ce.asignaciones.reduce((s: number, a: any) => s + Number(a.horasSemanales) * a.grupos.length, 0), 0
                          ) / getLimitesCargaDocente(selectedDocente).max) * 100)} 
                          color={getStatusColorDocente(selectedDocente)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </CardContent>
                    </Card>

                    {/* Lista de Cursos Asignados - Editable */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BookIcon color="primary" /> Cursos Asignados
                    </Typography>

                    {docenteCursosEdit.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                        Este docente no tiene cursos asignados todavía.
                      </Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {docenteCursosEdit.map((cursoEdit: any, cursoIdx: number) => {
                          const cp = cursoEdit.cursoProgramacion;
                          return (
                            <Grid item xs={12} key={cursoIdx}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                  <Box>
                                    <Typography sx={{ fontWeight: 700 }}>
                                      {cp.curso?.nombre}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      Código: {cp.curso?.codigo} | Ciclo: {cp.curso?.cicloAcademico}°
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip 
                                      size="small" 
                                      label={`${cp.curso?.creditos} créditos`} 
                                      sx={{ fontWeight: 600, bgcolor: '#003366', color: 'white' }} 
                                    />
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleRemoveCursoEdit(cursoIdx)} 
                                      sx={{ color: 'error.main', p: 0.5 }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>

                                {['teoria', 'practica', 'laboratorio'].map((tipo) => {
                                  const asigsTipo = cursoEdit.asignaciones.filter((a: any) => a.tipoClase === tipo);
                                  if (asigsTipo.length === 0) return null;
                                  return (
                                    <Box key={tipo} sx={{ mb: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        {tipo === 'teoria' ? <SchoolIcon color="primary" fontSize="small" /> : tipo === 'practica' ? <GroupsIcon color="secondary" fontSize="small" /> : <BiotechIcon color="info" fontSize="small" />}
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                          {tipo}
                                        </Typography>
                                      </Box>
                                      {asigsTipo.map((asig: any, asigIdx: number) => {
                                        const actualIdx = cursoEdit.asignaciones.indexOf(asig);
                                        return (
                                          <Grid container spacing={1} alignItems="center" key={asigIdx}>
                                            <Grid item xs={12} md={4}>
                                              <TextField
                                                size="small"
                                                type="number"
                                                label="Horas"
                                                value={asig.horasSemanales}
                                                onChange={(e) => handleDocenteAsignacionChange(cursoIdx, actualIdx, 'horasSemanales', Math.max(1, Math.min(asig.maxHoras, Number(e.target.value))))}
                                                inputProps={{ min: 1, max: asig.maxHoras }}
                                                fullWidth
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                              <FormControl fullWidth size="small">
                                                <InputLabel id={`docente-grupos-${cursoIdx}-${actualIdx}`}>Grupo</InputLabel>
                                                <Select
                                                  labelId={`docente-grupos-${cursoIdx}-${actualIdx}`}
                                                  multiple
                                                  value={asig.grupos.map((g: any) => g.numeroGrupo ?? g)}
                                                  onChange={(e) => handleDocenteGruposChange(cursoIdx, actualIdx, e.target.value as number[])}
                                                  input={<OutlinedInput label="Grupo" />}
                                                  renderValue={(selected) => (selected as number[]).sort((a: number, b: number) => a - b).map((v: number) => numberToLetter(v)).join(', ')}
                                                >
                                                  {Array.from({ length: asig.maxGrupos || 1 }, (_, i) => i + 1).map((gNum) => (
                                                    <MenuItem key={gNum} value={gNum}>
                                                      {numberToLetter(gNum)}
                                                    </MenuItem>
                                                  ))}
                                                </Select>
                                              </FormControl>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                              <TextField
                                                size="small"
                                                label="T. Horas"
                                                value={`${Number(asig.horasSemanales) * asig.grupos.length}h`}
                                                InputProps={{ readOnly: true }}
                                                fullWidth
                                                sx={{ bgcolor: '#f8fafc' }}
                                              />
                                            </Grid>
                                          </Grid>
                                        );
                                      })}
                                    </Box>
                                  );
                                })}
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                    {/* Autocomplete para agregar nuevo curso */}
                    {showCursoAutocomplete ? (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', mt: 3, bgcolor: 'transparent' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel shrink>Currícula</InputLabel>
                              <Select
                                value={filtros.curriculaId}
                                label="Currícula"
                                displayEmpty
                                onChange={(e) => setFiltros({ ...filtros, curriculaId: e.target.value })}
                                renderValue={(selected) => {
                                  if (selected === '') return 'Todas las Curriculas';
                                  const curricula = curriculas.find(c => c.id === Number(selected));
                                  return curricula ? `MC - ${curricula.anio}` : '';
                                }}
                              >
                                <MenuItem value="">Todas las Curriculas</MenuItem>
                                {curriculas
                                  .filter(c => filtros.carreraId === '' || c.carreraId === Number(filtros.carreraId))
                                  .map(c => (
                                  <MenuItem key={c.id} value={c.id}>MC - {c.anio}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl fullWidth size="small">
                              <InputLabel shrink>Ciclo Académico</InputLabel>
                              <Select
                                value={filtros.cicloAcademico}
                                label="Ciclo Académico"
                                displayEmpty
                                onChange={(e) => setFiltros({ ...filtros, cicloAcademico: e.target.value })}
                                renderValue={(selected) => {
                                  if (selected === '') return 'Todos los Ciclos';
                                  return `${selected}° CICLO`;
                                }}
                              >
                                <MenuItem value="">Todos los Ciclos</MenuItem>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(c => (
                                  <MenuItem key={c} value={String(c)}>{c}° CICLO</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Autocomplete
                              size="small"
                              options={cargaAcademica}
                              getOptionLabel={(option) => option.curso?.nombre || ''}
                              onChange={handleAddCursoToDocente}
                              renderInput={(params) => <TextField {...params} label="Buscar curso" autoFocus />}
                              filterOptions={(options, state) => {
                                const input = state.inputValue.toLowerCase();
                                const assignedIds = new Set(docenteCursosEdit.map((c: any) => c.cursoProgramacion?.curso?.id));
                                return options.filter(o =>
                                  !assignedIds.has(o.curso?.id) &&
                                  (filtros.curriculaId === '' || Number(o.curso?.curriculaId) === Number(filtros.curriculaId)) &&
                                  (filtros.cicloAcademico === '' || String(o.curso?.cicloAcademico) === String(filtros.cicloAcademico)) &&
                                  ((o.curso?.nombre || '').toLowerCase().includes(input) ||
                                  (o.curso?.codigo || '').toLowerCase().includes(input))
                                );
                              }}
                              fullWidth
                              ListboxProps={{ style: { maxHeight: 300, overflow: 'auto' } }}
                            />
                            <Button size="small" variant="outlined" color="error" onClick={() => setShowCursoAutocomplete(false)} sx={{ minWidth: 'auto', whiteSpace: 'nowrap', height: 40, color: 'white', bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>
                              Cancelar
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    ) : (
                      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setShowCursoAutocomplete(true)}
                        >
                          Asignar Curso
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Paper>
              ) : (
                <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 4, border: '1px solid #eef2f6', bgcolor: '#f8fafc' }}>
                  <InfoIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">Selecciona un docente para gestionar su carga</Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        </>
      ) : activeTab === 1 ? (
        <>
          {/* Filtros */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Periodo Académico</InputLabel>
                  <Select
                    value={filtros.cicloId}
                    label="Periodo Académico"
                    onChange={(e) => setFiltros({ ...filtros, cicloId: e.target.value })}
                  >
                    {ciclos.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                    {c.nombre}{c.esActual ? ' (Actual)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
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
            </Grid>
          </Paper>

          {/* Cards de asignación arrastrables */}
          {cargaAcademica.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 4, border: '1px solid #eef2f6' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" /> Cursos Asignados
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControl size="small" sx={{ width: 210 }}>
                    <InputLabel shrink>Tipo de Ambiente</InputLabel>
                    <Select
                      value={filtroAulaTipo}
                      label="Tipo de Ambiente"
                      displayEmpty
                      onChange={(e) => {
                        setFiltroAulaTipo(e.target.value);
                      }}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="aulas">Aulas (Teoría / Práctica)</MenuItem>
                      <MenuItem value="laboratorio">Laboratorios</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                  variant="contained"
                  startIcon={showDisponibilidad ? <AccessTimeIcon /> : <VisibilityIcon />}
                  onClick={() => setShowDisponibilidad(!showDisponibilidad)}
                  disabled={!selectedAula}
                  sx={{
                    bgcolor: showDisponibilidad ? '#16a34a' : '#003366',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    borderRadius: 2,
                    height: 40,
                    '&:hover': { bgcolor: showDisponibilidad ? '#15803d' : '#002244' },
                  }}
                >
                  {showDisponibilidad ? 'Asignar Horarios' : 'Ver Disponibilidad'}
                </Button>
              </Box>
            </Box>
              <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
                {cargaAcademica.flatMap((ce: any) =>
                  (ce.asignaciones || []).filter((asig: any) => {
                    if (filtroAulaTipo === 'todos') return true;
                    if (filtroAulaTipo === 'aulas') return asig.tipoClase === 'teoria' || asig.tipoClase === 'practica';
                    if (filtroAulaTipo === 'laboratorio') return asig.tipoClase === 'laboratorio';
                    return true;
                  }).flatMap((asig: any, i: number) => {
                    const docente = docentes.find((d: any) => d.id === Number(asig.docenteId));
                    const tipoStyles: Record<string, string> = { teoria: '#166534', practica: '#92400e', laboratorio: '#1e40af' };
                    // Ocultar si ya está completamente asignado
                    const completados = horariosCiclo.filter((h: any) =>
                      String(h.docenteId) === String(asig.docenteId) &&
                      String(h.cursoId) === String(ce.curso?.id) &&
                      h.tipoClase === asig.tipoClase
                    ).length;
                    if (completados >= (asig.grupos?.length || 1)) return [];
                    return [
                      <Paper key={`${ce.curso?.id}-${asig.tipoClase}-${i}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('docenteId', String(asig.docenteId));
                          e.dataTransfer.setData('cursoId', String(ce.curso?.id));
                          e.dataTransfer.setData('tipoClase', asig.tipoClase);
                          e.dataTransfer.setData('horasSemanales', String(asig.horasSemanales));
                          e.dataTransfer.effectAllowed = 'copy';
                          dragDataRef.current = { docenteId: String(asig.docenteId), cursoId: String(ce.curso?.id), tipoClase: asig.tipoClase, horasSemanales: asig.horasSemanales };
                        }}
                        onDragEnd={() => {
                          dragDataRef.current = { docenteId: '', cursoId: '', tipoClase: '', horasSemanales: 1 };
                        }}
                        sx={{
                          p: 1.5, minWidth: 200, cursor: 'grab',
                          borderLeft: `4px solid ${tipoStyles[asig.tipoClase] || '#003366'}`,
                          '&:active': { cursor: 'grabbing', opacity: 0.7 },
                          bgcolor: '#fafbfc',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', color: '#003366' }}>
                          {docente?.nombreCompleto || `Docente #${asig.docenteId}`}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                          {ce.curso?.nombre || 'S.C.'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                          {asig.tipoClase?.toUpperCase()} · {asig.horasSemanales}h · {asig.grupos?.length || 0} grupo(s)
                        </Typography>
                      </Paper>
                    ];
                  })
                )}
              </Box>
            </Paper>
          )}

          <Grid container spacing={3}>
            {/* Lista de Aulas */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6', overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eef2f6' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>
                    Ambientes
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  {aulas.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">No hay ambientes disponibles</Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {aulas
                        .filter(a => filtroAulaTipo === 'todos'
                          ? true
                          : filtroAulaTipo === 'aulas'
                            ? a.tipo === 'teoría' || a.tipo === 'práctica'
                            : a.tipo === 'laboratorio'
                        )
                        .sort((a, b) => {
                          const tipoOrder: Record<string, number> = { 'teoría': 1, 'práctica': 2, 'laboratorio': 3 };
                          const diff = (tipoOrder[a.tipo] || 99) - (tipoOrder[b.tipo] || 99);
                          if (diff !== 0) return diff;
                          const nA = parseInt(a.nombre.replace(/\D/g, '')) || 0;
                          const nB = parseInt(b.nombre.replace(/\D/g, '')) || 0;
                          return nA - nB;
                        })
                        .map((aula) => {
                        const isSelected = selectedAula === aula.id;
                        return (
                          <ListItem
                            key={aula.id}
                            disablePadding
                            divider
                          >
                            <ListItemButton
                              selected={isSelected}
                              onClick={() => setSelectedAula(aula.id)}
                              sx={{
                                py: 2,
                                borderLeft: isSelected ? '4px solid #003366' : '4px solid transparent',
                                '&.Mui-selected': { bgcolor: '#f0f4f8' }
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <MeetingRoomIcon sx={{ color: isSelected ? '#003366' : '#94a3b8' }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                    {aula.nombre}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="textSecondary">
                                    {aula.tipo === 'laboratorio' ? 'LABORATORIO' : aula.tipo?.toUpperCase()} | Cap. {aula.capacidad}
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
            {/* Asignación / Disponibilidad de Aula */}
            <Grid item xs={12} md={8}>
              {selectedAula ? (
                <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #eef2f6', overflow: 'hidden' }}>
                  {showDisponibilidad ? (
                    <DisponibilidadAula
                      aula={aulas.find(a => a.id === selectedAula)}
                      cicloId={filtros.cicloId}
                    />
                  ) : (
                    <CalendarioPorAula
                      aula={aulas.find(a => a.id === selectedAula)}
                      cicloId={filtros.cicloId}
                      usuario={usuario}
                      docentes={docentes}
                      cargaAcademica={cargaAcademica}
                      horariosCiclo={horariosCiclo}
                      dragDataRef={dragDataRef}
                      onHorarioCreated={() => setHorariosRefreshKey(k => k + 1)}
                    />
                  )}
                </Paper>
              ) : (
                <Paper elevation={0} sx={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 4, border: '1px solid #eef2f6', bgcolor: '#f8fafc' }}>
                  <MeetingRoomIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">Selecciona un ambiente</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Elige un aula o laboratorio de la lista para gestionar sus horarios
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        </>
      ) : (
        <ValidacionCargaNoLectiva 
          cicloId={Number(filtros.cicloId)} 
        />
      )}
    </Box>
  );
}
