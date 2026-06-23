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
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { getLimitesReglamento } from '@/lib/reglamento-utils';
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
  const [curriculas, setCurriculas] = useState<any[]>([]);
  const [filtros, setFiltros] = useState({
    cicloId: '',
    carreraId: '',
    cicloAcademico: '1',
    curriculaId: '',
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

  useEffect(() => {
    const tagContainer = document.querySelector('.MuiAutocomplete-tagContainer')?.firstElementChild as HTMLElement | null;
    if (tagContainer) {
      tagContainer.scrollTop = tagContainer.scrollHeight;
    }
  }, [selectedBulkIds]);

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
  
  // Estados para la pestaña "Por Docente"
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [soloIncompletosDocentes, setSoloIncompletosDocentes] = useState(false);
  const [docenteCursosEdit, setDocenteCursosEdit] = useState<any[]>([]);
  const [showCursoAutocomplete, setShowCursoAutocomplete] = useState(false);

  const pendingCursoId = useRef<number | null>(null);
  const pendingDocenteId = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(parseInt(tab));
    const cursoId = params.get('cursoProgramacionId');
    if (cursoId) pendingCursoId.current = parseInt(cursoId);
    const docenteId = params.get('docenteId');
    if (docenteId) pendingDocenteId.current = parseInt(docenteId);
  }, []);

  useEffect(() => {
    if (cargaAcademica.length === 0 || !pendingCursoId.current) return;
    const found = cargaAcademica.find((c: any) => c.id === pendingCursoId.current);
    if (found) {
      setSelectedCurso(found);
      pendingCursoId.current = null;
    }
  }, [cargaAcademica]);

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
    if (selectedCurso?.id) params.set('cursoProgramacionId', String(selectedCurso.id));
    if (selectedDocente?.id) params.set('docenteId', String(selectedDocente.id));
    const searchStr = params.toString();
    const newUrl = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [activeTab, selectedCurso, selectedDocente]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ciclosRes, carrerasRes, docentesRes, cursosRes, curriculasRes] = await Promise.all([
        api.get('/ciclos'),
        api.get('/carreras'),
        api.get('/docentes/active'),
        api.get('/cursos'),
        api.get('/curriculas'),
      ]);
      setCiclos(ciclosRes.data);
      setCarreras(carrerasRes.data);
      setDocentes(docentesRes.data);
      setTodosCursos(cursosRes.data);
      setCurriculas(curriculasRes.data);

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

  const getCurriculaLabel = (curriculaId: number | null | undefined) => {
    if (!curriculaId) return '';
    const curricula = curriculas.find(c => c.id === Number(curriculaId));
    return curricula ? <Typography component="span" sx={{ color: '#1565c0', fontWeight: 600 }}>(MC - {curricula.anio})</Typography> : '';
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
  }, [filtros.cicloId, filtros.carreraId]);

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
              grupos: a.grupos.map((g: any) => g.numeroGrupo),
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
        // Transformar asignaciones del backend
        const asignacionesTransformadas = curso.asignaciones.map((asig: any) => ({
          ...asig,
          horasSemanales: asig.grupos?.length
            ? Math.round(asig.horasSemanales / asig.grupos.length)
            : asig.horasSemanales,
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
    if (!curso.asignaciones || curso.asignaciones.length === 0) return 0;

    // Los créditos se calculan por tipo de clase del curso (lo que ve 1 estudiante)
    // no sumando por docente × grupos. Si al menos un docente cubre un tipo,
    // ese tipo aporta sus créditos completos.
    const hasTeoria = curso.asignaciones.some((a: any) => 
      a.docenteId && String(a.tipoClase || '').toLowerCase() === 'teoria'
    );
    const hasPractica = curso.asignaciones.some((a: any) => 
      a.docenteId && String(a.tipoClase || '').toLowerCase() === 'practica'
    );
    const hasLab = curso.asignaciones.some((a: any) => 
      a.docenteId && String(a.tipoClase || '').toLowerCase() === 'laboratorio'
    );

    let total = 0;
    if (hasTeoria) total += Number(curso.horasTeoria || 0);
    if (hasPractica) total += Number(curso.horasPractica || 0) / 2;
    if (hasLab) total += Number(curso.horasLaboratorio || 0) / 2;

    return total;
  };

  const getStatusColor = (curso: any) => {
    const creditos = curso.creditosAsignados || 0;
    const meta = curso.curso?.creditos || 0;
    const diff = Math.abs(creditos - meta);
    if (diff < 0.01) return 'success';
    if (creditos > meta) return 'error';
    return 'warning';
  };

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
          grupos: a.grupos,
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
            label="Asignación Carga Lectiva (Por Curso)" 
            icon={<BookIcon />}
            iconPosition="start"
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
          <Tab 
            label="Asignación Carga Lectiva (Por Docente)" 
            icon={<PersonIcon />}
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
                    {c.nombre} {c.nombre.includes('2026-I') ? '(Actual)' : ''}
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
            <Box sx={{ p: 2, borderBottom: '1px solid #eef2f6', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
              <Autocomplete
                size="small"
                options={cargaAcademica}
                getOptionLabel={(option) => option.curso?.nombre || ''}
                onChange={(_, newValue) => { if (newValue) setSelectedCurso(newValue); }}
                renderInput={(params) => <TextField {...params} label="Buscar Curso" />}
                filterOptions={(options, state) => {
                  const input = state.inputValue.toLowerCase();
                  const filtered = options.filter(o =>
                    (o.curso?.nombre || '').toLowerCase().includes(input) ||
                    (o.curso?.codigo || '').toLowerCase().includes(input)
                  );
                  return state.inputValue === '' ? filtered.slice(0, 10) : filtered;
                }}
                fullWidth
              />
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
                    .filter(curso => filtros.curriculaId === '' || Number(curso.curso?.curriculaId) === Number(filtros.curriculaId))
                    .filter(curso => filtros.cicloAcademico === '' || String(curso.curso?.cicloAcademico) === String(filtros.cicloAcademico))
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
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                  {curso.curso?.nombre} {getCurriculaLabel(curso.curso?.curriculaId)}
                                </Typography>
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
      ) : activeTab === 1 ? (
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
                                      {cp.curso?.nombre} {getCurriculaLabel(cp.curso?.curriculaId)}
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
                                                  value={asig.grupos}
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
      ) : (
        <ValidacionCargaNoLectiva 
          cicloId={Number(filtros.cicloId)} 
        />
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
                  onChange={(e) => {
                    if (progData.cursoId) return;
                    setProgData({ ...progData, cursoId: e.target.value });
                  }}
                  readOnly={!!progData.cursoId}
                  sx={progData.cursoId ? { '& .MuiSelect-select': { opacity: 1, color: '#1e293b' } } : {}}
                >
                  {todosCursos
                    .filter(c => filtros.carreraId === '' || Number(c.carreraId) === Number(filtros.carreraId))
                    .filter(c => filtros.cicloAcademico === '' || Number(c.cicloAcademico) === Number(filtros.cicloAcademico))
                    .filter(c => {
                      // En edición (cursoId ya asignado), mostrar todos
                      if (progData.cursoId) return true;
                      // Solo ocultar completos al crear nueva programación
                      const enCarga = cargaAcademica.find(ca => ca.cursoId === c.id);
                      if (enCarga) {
                        const esCompleto = Math.abs(enCarga.creditosAsignados - (enCarga.curso?.creditos || 0)) < 0.01;
                        return !esCompleto;
                      }
                      return true;
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
              renderTags={(tagValue, getTagProps) => (
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    maxHeight: '60px',
                    overflowY: 'auto',
                    gap: 0.5,
                    p: 0.5,
                  }}
                >
                  {tagValue.map((option, index) => (
                    <Chip
                      label={`${option.nombre} (${option.codigo})`}
                      {...getTagProps({ index })}
                      size="small"
                    />
                  ))}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar Cursos para Programar"
                  placeholder="Busca y selecciona los cursos..."
                  size="small"
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
                      const calcCreds = Number(row.horasTeoria) + (Number(row.horasPractica) / 2) + (Number(row.horasLaboratorio) / 2);
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
