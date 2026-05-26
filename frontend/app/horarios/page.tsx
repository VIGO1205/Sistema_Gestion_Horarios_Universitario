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
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Room as RoomIcon,
  Tune as TuneIcon,
  DeleteSweep as DeleteSweepIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/components/providers/AuthProvider';

const MySwal = withReactContent(Swal);

const LUNCH_CONFIG = {
  START: '13:00',
  END: '14:00',
  LABEL: 'ALMUERZO (FRANJA INSTITUCIONAL)',
  MESSAGE: 'No se permite programar clases entre las 13:00 y 14:00 (Franja Institucional).'
};

const DIAS = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
];

const HORAS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
  '19:00', '20:00', '21:00', '22:00'
];

const HORA_INICIO_TABLA = 7;
const HORA_ALTURA_FILA = 80;
const HORA_ALTURA_HEADER = 0;
const HORA_SPACER_HEIGHT = 40;

const timeToSlotIndex = (time: string) => parseInt(time.split(':')[0]) - HORA_INICIO_TABLA;

const slotIndexToTime = (index: number) => `${String(HORA_INICIO_TABLA + index).padStart(2, '0')}:00`;

const slotIndexToEndTime = (index: number) => `${String(HORA_INICIO_TABLA + index + 1).padStart(2, '0')}:00`;

const normalizeSlotRange = (startIndex: number, endIndex: number) => ({
  startIndex: Math.min(startIndex, endIndex),
  endIndex: Math.max(startIndex, endIndex),
});

export default function HorariosPage() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'docente';
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [mapaOcupacion, setMapaOcupacion] = useState<any>({});
  const [misAsignaciones, setMisAsignaciones] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);
  const prevEstadoSeleccionRef = useRef<string | null>(null);
  const docentePuedeGestionar = esDocente
    ? estadoSeleccion?.estado === 'en_atencion'
    : true;
  const [filtros, setFiltros] = useState({
    ciclo: '',
    cicloEstudio: '1',
    carrera: null as any,
    docente: null as any,
    aula: 'todos',
    tipoAula: 'todos',
    tipoContrato: 'todos',
    categoria: 'todos'
  });

  const [ciclos, setCiclos] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [aulasFiltradas, setAulasFiltradas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [docentesFiltrados, setDocentesFiltrados] = useState<any[]>([]);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const dragSelectionRef = useRef<{
    active: boolean;
    mode: 'create' | 'edit';
    day: number;
    startIndex: number;
    endIndex: number;
    event?: any;
  } | null>(null);
  const [dragSelection, setDragSelection] = useState<{
    active: boolean;
    mode: 'create' | 'edit';
    day: number;
    startIndex: number;
    endIndex: number;
    event?: any;
  } | null>(null);

  // Estados para el modal de crear/editar horarios
  const [openHorarioModal, setOpenHorarioModal] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<any>(null);
  const [horarioForm, setHorarioForm] = useState({
    docenteId: '' as string | number,
    cursoId: '' as string | number,
    aulaId: '' as string | number,
    tipoClase: 'teoria',
    diaSemana: 1,
    horaInicio: '07:00',
    horaFin: '08:00',
    grupoId: '' as string | number,
  });
  const [savingHorario, setSavingHorario] = useState(false);
  const [cursosDocente, setCursosDocente] = useState<any[]>([]);
  const [loadingCursosDocente, setLoadingCursosDocente] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  // Estado para el resumen de selección y notificaciones
  const [selectionSummary, setSelectionSummary] = useState<{ dia: string; horaInicio: string; horaFin: string } | null>(null);
  const [showSelectionToast, setShowSelectionToast] = useState(false);

  // Opciones para los filtros rápidos
  const categoriasDocente = ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE DE PRACTICA'];
  const tiposContrato = ['NOMBRADO', 'CONTRATADO'];
  const tiposAula = [
    { id: 'teoría', nombre: 'Teoría' },
    { id: 'práctica', nombre: 'Práctica' },
    { id: 'laboratorio', nombre: 'Laboratorio' }
  ];

  const recalcularHoraFin = (
    horaInicio: string,
    cursoId: string | number,
    asignaciones = cursosDocente,
    tipoClasePreferida?: string,
    duracionSugerida?: number // Duración que viene del drag
  ) => {
    const hInicio = parseInt(horaInicio.split(':')[0]);
    const cIdNormalizado = Number(cursoId);
    const prefLower = tipoClasePreferida?.toLowerCase();
    
    const asig = asignaciones.find((a: any) => {
      const coincideCurso = Number(a.cursoId) === cIdNormalizado;
      const coincideTipo = !prefLower || a.tipoClase.toLowerCase() === prefLower;
      return coincideCurso && coincideTipo;
    }) || asignaciones.find((a: any) => Number(a.cursoId) === cIdNormalizado);
    
    // Calcular horas que le quedan disponibles
    const horasMaximas = Number(asig?.horasSemanales ?? 2);
    const horasYaAsignadas = Number(asig?.horasAsignadas ?? 0);
    const horasDisponibles = Math.max(0, horasMaximas - horasYaAsignadas);

    // Lógica inteligente: 
    // Si no hay duracionSugerida (cambio manual en modal), usamos el máximo disponible.
    // Si hay duracionSugerida (drag), usamos el menor entre lo que arrastró y lo que tiene disponible.
    let duracionAFijar = horasDisponibles;
    if (duracionSugerida !== undefined) {
      duracionAFijar = Math.min(duracionSugerida, horasDisponibles);
    }
    
    // Si por alguna razón sale 0 (ej. ya no tiene horas), al menos poner 1 hora para que no rompa el input
    if (duracionAFijar <= 0) duracionAFijar = 1;

    const hFin = String(Math.min(22, hInicio + duracionAFijar)).padStart(2, '0') + ':00';

    return {
      cursoId: asig?.cursoId ?? cursoId,
      tipoClase: asig?.tipoClase || horarioForm.tipoClase,
      horaFin: hFin,
    };
  };

  const aplicarRecalculoHoraFin = (
    horaInicio: string,
    cursoId: string | number,
    asignaciones = cursosDocente,
    tipoClasePreferida?: string,
  ) => {
    // Si es un drag, queremos mantener la duración que el usuario arrastró (la info de "arriba")
    let duracionSugerida = undefined;
    if (isDragAction && selectionSummary) {
      const hInicio = parseInt(selectionSummary.horaInicio.split(':')[0]);
      const hFin = parseInt(selectionSummary.horaFin.split(':')[0]);
      duracionSugerida = hFin - hInicio;
    }

    const recalculo = recalcularHoraFin(horaInicio, cursoId, asignaciones, tipoClasePreferida, duracionSugerida);

    setHorarioForm(prev => {
      if (
        prev.horaFin === recalculo.horaFin &&
        prev.cursoId === String(recalculo.cursoId) &&
        prev.tipoClase === recalculo.tipoClase
      ) {
        return prev;
      }

      return {
        ...prev,
        cursoId: String(recalculo.cursoId),
        tipoClase: recalculo.tipoClase,
        horaFin: recalculo.horaFin,
      };
    });
  };

  const getSelectionValidation = (selection: typeof dragSelection) => {
    if (!selection) {
      return { valido: true, conflictos: [] as string[], horaInicio: '', horaFin: '' };
    }

    const { startIndex, endIndex } = normalizeSlotRange(selection.startIndex, selection.endIndex);
    const horaInicio = slotIndexToTime(startIndex);
    const horaFin = slotIndexToEndTime(endIndex);

    const conflictos = [];

    // Validar Franja de Almuerzo
     for (let i = startIndex; i <= endIndex; i++) {
       if (HORAS[i] === LUNCH_CONFIG.START) {
         conflictos.push(`La selección incluye la franja de almuerzo (${LUNCH_CONFIG.START} - ${LUNCH_CONFIG.END})`);
         break;
       }
     }

    horarios.reduce((acc: string[], horario: any) => {
      if (selection.mode === 'edit' && selection.event?.id === horario.id) {
        return acc;
      }

      if (horario.diaSemana !== selection.day) {
        return acc;
      }

      const horarioInicioIndex = timeToSlotIndex(horario.horaInicio);
      const horarioFinIndex = timeToSlotIndex(horario.horaFin);
      const haySolapamiento = startIndex < horarioFinIndex && endIndex >= horarioInicioIndex;

      if (haySolapamiento) {
        acc.push(`${horario.curso?.nombre || 'Horario'} (${horario.horaInicio.substring(0, 5)}-${horario.horaFin.substring(0, 5)})`);
      }

      return acc;
    }, []);

    return { valido: conflictos.length === 0, conflictos, horaInicio, horaFin };
  };

  const clearDragSelection = () => {
    dragSelectionRef.current = null;
    setDragSelection(null);
  };

  const startDragSelection = (day: number, hourIndex: number, event?: any) => {
    // El docente solo puede usar drag en su ventana activa.
    if (esDocente && !docentePuedeGestionar) {
      MySwal.fire({
        icon: 'info',
        title: 'Acceso Restringido',
        text: 'Aún no es tu turno según la jerarquía institucional.',
        confirmButtonColor: '#003366',
      });
      return;
    }
    
    const hourLabel = HORAS[hourIndex];
     if (hourLabel === LUNCH_CONFIG.START) return; // No iniciar drag en almuerzo

    if (esDocente && event && event.docenteId !== usuario?.docenteId) return;

    const nextSelection = event
      ? {
          active: true as const,
          mode: 'edit' as const,
          day,
          startIndex: timeToSlotIndex(event.horaInicio),
          endIndex: timeToSlotIndex(event.horaFin) - 1,
          event,
        }
      : {
          active: true as const,
          mode: 'create' as const,
          day,
          startIndex: hourIndex,
          endIndex: hourIndex,
        };

    dragSelectionRef.current = nextSelection;
    setDragSelection(nextSelection);
  };

  const updateDragSelectionFromPointer = (clientY: number) => {
    const selection = dragSelectionRef.current;
    if (!selection || !tableContainerRef.current) {
      return;
    }

    const rect = tableContainerRef.current.getBoundingClientRect();
    const scrollTop = tableContainerRef.current.scrollTop;
    // Ajustamos restando el padding superior y la fila de espacio inicial (30px)
    const relativeY = clientY - rect.top + scrollTop - HORA_SPACER_HEIGHT;
    
    // Calculamos el índice basándonos en la altura real de las celdas de hora (80px)
    const slotIndex = Math.max(0, Math.min(HORAS.length - 1, Math.floor(relativeY / HORA_ALTURA_FILA)));

    const nextSelection = { ...selection, endIndex: slotIndex };
    dragSelectionRef.current = nextSelection;
    setDragSelection(nextSelection);
  };

  const [isDragAction, setIsDragAction] = useState(false);

  const openHorarioFromSelection = (selection: NonNullable<typeof dragSelection>) => {
    const validation = getSelectionValidation(selection);

    if (!validation.valido) {
      MySwal.fire({
        icon: 'warning',
        title: 'Cruce detectado',
        text: validation.conflictos[0] || 'La selección cruza con otro horario existente.',
      });
      return;
    }

    const { startIndex, endIndex } = normalizeSlotRange(selection.startIndex, selection.endIndex);
    const eventBase = selection.event || null;
    const horaInicio = slotIndexToTime(startIndex);
    const duracionSeleccionada = (endIndex - startIndex) + 1;
    
    // Marcar que esto viene de un drag
    setIsDragAction(true);
    
    // Si hay un curso ya seleccionado (ej: por drag sobre un bloque o pre-seleccionado)
    const resCalc = recalcularHoraFin(
      horaInicio, 
      eventBase?.cursoId || '', 
      cursosDocente, 
      eventBase?.tipoClase, 
      duracionSeleccionada
    );
    
    const horaFin = resCalc.horaFin;
    const diaNombre = DIAS.find(d => d.id === selection.day)?.nombre || 'Día desconocido';

    // Guardar el resumen de la selección
    setSelectionSummary({ dia: diaNombre, horaInicio, horaFin });
    setShowSelectionToast(true);

    setSelectedHorario(eventBase);
    setHorarioForm({
      docenteId: eventBase?.docenteId || (esDocente ? (usuario?.docenteId || '') : ''),
      cursoId: eventBase?.cursoId || '',
      aulaId: eventBase?.aulaId || '',
      tipoClase: eventBase?.tipoClase || 'teoria',
      diaSemana: selection.day,
      horaInicio,
      horaFin,
      grupoId: eventBase?.grupoId || '',
    });
    setOpenHorarioModal(true);
  };

  // Efecto para cargar cursos del docente seleccionado en el modal
  useEffect(() => {
    const cargarCursosDocente = async () => {
      if (horarioForm.docenteId) {
        setLoadingCursosDocente(true);
        try {
          const res = await api.get(`/docentes/${horarioForm.docenteId}/cursos`, {
            params: { cicloId: filtros.ciclo }
          });
          const asignaciones = res.data || [];
          setCursosDocente(asignaciones);

          // Lógica de auto-selección inteligente
          if (asignaciones.length > 0 && !selectedHorario) {
            // Filtrar solo los que NO tienen carga completa
            const disponibles = asignaciones.filter((a: any) => a.horasAsignadas < a.horasSemanales);
            
            if (disponibles.length === 1) {
              // Si solo hay UNO disponible, lo seleccionamos automáticamente
              const asig = disponibles[0];
              const cId = String(asig.cursoId);
              const tClase = asig.tipoClase;
              
              setHorarioForm(prev => {
                // Si ya tenemos una horaFin por drag, RESPETARLA SIEMPRE
                if (isDragAction) {
                  return { ...prev, cursoId: cId, tipoClase: tClase };
                }

                const resCalc = recalcularHoraFin(prev.horaInicio, cId, asignaciones, tClase);
                return { 
                  ...prev, 
                  cursoId: cId, 
                  tipoClase: tClase,
                  horaFin: resCalc.horaFin 
                };
              });
            } else {
              // Si hay varios disponibles, el docente debe elegir
              // pero NO reseteamos la horaFin si viene de un drag
              setHorarioForm(prev => ({ 
                ...prev, 
                cursoId: '', 
                tipoClase: '' 
              }));
            }
          } else if (selectedHorario) {
            // Si estamos editando, mantenemos lo que tiene el horario seleccionado
            const resCalc = recalcularHoraFin(horarioForm.horaInicio, horarioForm.cursoId, asignaciones, horarioForm.tipoClase);
            setHorarioForm(prev => ({ ...prev, horaFin: resCalc.horaFin }));
          }
        } catch (error) {
          console.error('Error cargando cursos del docente:', error);
          setCursosDocente([]);
        } finally {
          setLoadingCursosDocente(false);
        }
      } else {
        setCursosDocente([]);
      }
    };
    cargarCursosDocente();
  }, [horarioForm.docenteId, selectedHorario]);

  useEffect(() => {
    if (!horarioForm.docenteId || loadingCursosDocente || cursosDocente.length === 0 || selectedHorario) return;

    // Si no hay curso seleccionado y ya cargaron las asignaciones, no forzar la primera
    if (!horarioForm.cursoId) return;
    
    const cursoActual = horarioForm.cursoId;
    aplicarRecalculoHoraFin(horarioForm.horaInicio, cursoActual, cursosDocente, horarioForm.tipoClase);
  }, [horarioForm.docenteId, horarioForm.cursoId, horarioForm.horaInicio, loadingCursosDocente, cursosDocente, selectedHorario]);

  // Efecto para cargar grupos si es laboratorio
  useEffect(() => {
    const tClase = horarioForm.tipoClase?.toLowerCase();
    const cursoId = Number(horarioForm.cursoId);
    if (tClase === 'laboratorio' && cursoId && cursosDocente.length > 0) {
      const asig = cursosDocente.find(a => 
        Number(a.cursoId) === cursoId && 
        a.tipoClase.toLowerCase() === 'laboratorio'
      );
      
      if (asig && asig.grupos) {
        // Filtrar grupos que ya están ocupados (usando la info que viene del backend)
        // Pero permitimos el grupo que ya tiene el horario que estamos editando
        const gruposDisponibles = asig.grupos.filter((g: any) => 
          !g.ocupado || (selectedHorario && g.id === selectedHorario.grupoId)
        );
        
        setGrupos(gruposDisponibles);
        
        // Si hay grupos disponibles y el actual no es válido, seleccionar el primero disponible
        if (gruposDisponibles.length > 0) {
          const grupoActualValido = gruposDisponibles.some((g: any) => g.id === horarioForm.grupoId);
          if (!grupoActualValido) {
            setHorarioForm(prev => ({ ...prev, grupoId: gruposDisponibles[0].id }));
          }
        }
      } else {
        setGrupos([]);
      }
    } else {
      setGrupos([]);
    }
  }, [horarioForm.tipoClase, horarioForm.cursoId, cursosDocente, selectedHorario]);

  // Aulas filtradas para el modal según tipo de clase
   const aulasModalFiltradas = useMemo(() => {
     if (!horarioForm.tipoClase) return aulas;
     
     // Mapeo de tipo de clase del formulario a tipo de aula en la DB (con tildes)
     const mapping: Record<string, string> = {
       'teoria': 'teoría',
       'practica': 'práctica',
       'laboratorio': 'laboratorio'
     };
     
     const tipoBuscado = mapping[horarioForm.tipoClase] || horarioForm.tipoClase;
     return aulas.filter((a: any) => a.tipo.toLowerCase() === tipoBuscado.toLowerCase());
   }, [horarioForm.tipoClase, aulas]);

  // Cargar ciclos al inicio
  useEffect(() => {
    const cargarCiclos = async () => {
      setLoading(true);
      try {
        const [ciclosRes, actualRes] = await Promise.all([
          api.get('/ciclos'),
          api.get('/ciclos/actual')
        ]);
        setCiclos(ciclosRes.data);
        if (actualRes.data) {
          setFiltros(prev => ({ ...prev, ciclo: actualRes.data.id }));
        }
      } catch (error) {
        console.error('Error al cargar ciclos:', error);
      } finally {
        setLoading(false);
      }
    };
    cargarCiclos();
  }, []);

  useEffect(() => {
    if (filtros.ciclo) {
      fetchData(false); // No es carga inicial de la página
    }
  }, [
    filtros.ciclo,
    filtros.cicloEstudio,
    filtros.carrera,
    filtros.docente,
    filtros.aula,
    filtros.tipoContrato,
    filtros.categoria,
  ]);

  // Efecto para cargar cursos
  useEffect(() => {
    const cargarCursos = async () => {
      try {
        const res = await api.get('/cursos');
        setCursos(res.data);
      } catch (error) {
        console.error('Error al cargar cursos:', error);
      }
    };
    cargarCursos();
  }, []);

  // Efecto para cargar carreras
  useEffect(() => {
    const cargarCarreras = async () => {
      try {
        const res = await api.get('/carreras');
        const listaCarreras = res.data || [];
        setCarreras(listaCarreras);
        
        // Buscar Ingeniería de Sistemas por defecto
        const sistemas = listaCarreras.find((c: any) => 
          c.nombre.toLowerCase().includes('sistemas') || 
          c.nombre.toLowerCase().includes('ingeniería de sistemas')
        );
        
        if (sistemas) {
          setFiltros(prev => ({ ...prev, carrera: sistemas }));
        }
      } catch (error) {
        console.error('Error al cargar carreras:', error);
      }
    };
    cargarCarreras();
  }, []);

  // Efecto para filtrar aulas según tipo seleccionado
  useEffect(() => {
    if (filtros.tipoAula === 'todos') {
      setAulasFiltradas(aulas);
    } else {
      setAulasFiltradas(aulas.filter((a: any) => a.tipo === filtros.tipoAula));
    }
  }, [filtros.tipoAula, aulas]);

  // Efecto para mantener la lista de docentes disponible en el Autocomplete
  useEffect(() => {
    setDocentesFiltrados(docentes);

    if (
      filtros.docente &&
      !docentes.some((d: any) => d.id === filtros.docente.id)
    ) {
      setFiltros((prev) => ({ ...prev, docente: null }));
    }
  }, [docentes]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragSelectionRef.current) {
        return;
      }

      updateDragSelectionFromPointer(event.clientY);
    };

    const handleMouseUp = () => {
      const selection = dragSelectionRef.current;
      if (!selection) {
        return;
      }

      openHorarioFromSelection(selection);
      clearDragSelection();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [horarios]);

  const selectionInfo = useMemo(() => {
    if (!dragSelection) {
      return null;
    }

    const validation = getSelectionValidation(dragSelection);
    const { startIndex, endIndex } = normalizeSlotRange(dragSelection.startIndex, dragSelection.endIndex);
    const dia = DIAS.find((item) => item.id === dragSelection.day);

    return {
      ...validation,
      diaNombre: dia?.nombre || 'Día',
      rango: `${slotIndexToTime(startIndex)} - ${slotIndexToEndTime(endIndex)}`,
    };
  }, [dragSelection, horarios]);

  const fetchData = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setFetching(true);
    try {
      // 1. Cargar Docentes, Aulas y Mapa de Ocupación
      const docenteParams: any = {};
      if (filtros.tipoContrato !== 'todos') docenteParams.tipoContrato = filtros.tipoContrato;
      if (filtros.categoria !== 'todos') docenteParams.categoria = filtros.categoria;
      if (filtros.carrera?.id) docenteParams.carreraId = filtros.carrera.id;

      const [docentesRes, aulasRes, ocupacionRes] = await Promise.all([
        api.get('/docentes', { params: docenteParams }),
        api.get('/aulas'),
        api.get('/horarios/mapa-ocupacion', { params: { cicloId: filtros.ciclo } })
      ]);
      
      setDocentes(docentesRes.data);
      setAulas(aulasRes.data);
      setMapaOcupacion(ocupacionRes.data || {});

      // 1.1 Cargar mis asignaciones si soy docente para el mapa de calor
      if (esDocente && usuario?.docenteId) {
        try {
          const asigRes = await api.get(`/docentes/${usuario.docenteId}/asignaciones`, {
            params: { cicloId: filtros.ciclo }
          });
          setMisAsignaciones(asigRes.data || []);
        } catch (e) {
          console.error('Error cargando mis asignaciones:', e);
        }
      }

      // 2. Cargar Horarios con los filtros aplicados
      const params: any = { cicloId: filtros.ciclo };
      if (filtros.carrera?.id) params.carreraId = filtros.carrera.id;
      if (esDocente && usuario?.docenteId) {
        params.docenteId = usuario.docenteId;
      } else if (filtros.docente) {
        params.docenteId = filtros.docente.id;
      }
      if (filtros.aula !== 'todos') params.aulaId = filtros.aula;

      const response = await api.get('/horarios', { params });
      
      // Filtrado por Ciclo de Estudios (1°-10°) en el Frontend
      let data = response.data || [];
      if (filtros.cicloEstudio) {
        data = data.filter((h: any) => 
          String(h.curso?.cicloAcademico || '').trim() === String(filtros.cicloEstudio)
        );
      }
      
      setHorarios(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setHorarios([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const getEventForSlot = (dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    
    // Nueva Regla: Franja de Almuerzo (Configurable)
    if (horaStr === LUNCH_CONFIG.START) {
      return { 
        id: 'lunch', 
        isLunch: true, 
        horaInicio: LUNCH_CONFIG.START, 
        horaFin: LUNCH_CONFIG.END, 
        curso: { nombre: LUNCH_CONFIG.LABEL } 
      };
    }

    return horarios.find((h: any) => {
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      return h.diaSemana === dia && hora >= hInicio && hora < hFin;
    });
  };

  const getDisponibilidadSlot = (dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    const key = `${dia}_${hora}`;
    const ocupaciones = mapaOcupacion[key] || [];

    // 1. Bloqueo Rojo: Almuerzo o el docente ya tiene clase
    if (horaStr === LUNCH_CONFIG.START) return 'rojo';
    if (esDocente && usuario?.docenteId) {
      const docenteOcupado = ocupaciones.some((o: any) => o.docenteId === usuario.docenteId);
      if (docenteOcupado) return 'rojo';
    }

    // Si no soy docente, no mostramos semáforo por defecto
    if (!esDocente || misAsignaciones.length === 0) return 'verde';

    // 2. Analizar grupos (Carrera + Ciclo) de las asignaciones del docente
    const misGrupos = misAsignaciones.map(a => ({
      carreraId: a.curso?.carreraId,
      ciclo: a.curso?.cicloAcademico
    }));

    // Filtrar duplicados de grupos (un docente puede tener varios cursos en un mismo ciclo/carrera)
    const gruposUnicos = misGrupos.filter((v, i, a) => 
      a.findIndex(t => t.carreraId === v.carreraId && t.ciclo === v.ciclo) === i
    );

    const gruposOcupados = ocupaciones.filter((o: any) => 
      gruposUnicos.some(mg => mg.carreraId === o.carreraId && mg.ciclo === o.cicloAcademico)
    );

    if (gruposOcupados.length === 0) return 'verde';
    
    // Si todos mis grupos únicos están ocupados -> rojo
    // Si solo algunos están ocupados -> amarillo
    const cantGruposOcupados = gruposUnicos.filter(mg => 
      ocupaciones.some((o: any) => o.carreraId === mg.carreraId && o.ciclo === mg.ciclo)
    ).length;

    if (cantGruposOcupados >= gruposUnicos.length) return 'rojo';
    return 'amarillo';
  };

  const getColorByDisponibilidad = (disponibilidad: string) => {
    switch (disponibilidad) {
      case 'rojo': return 'rgba(239, 68, 68, 0.12)'; // Rojo muy suave
      case 'amarillo': return 'rgba(245, 158, 11, 0.12)'; // Ámbar muy suave
      case 'verde': return 'rgba(34, 197, 94, 0.08)'; // Verde muy suave
      default: return 'transparent';
    }
  };

  const isStartTime = (eventHoraInicio: string, gridHora: string) => {
    return eventHoraInicio.substring(0, 5) === gridHora;
  };

  // Función para obtener color según el Docente (para diferenciar en la grilla)
  const getColorByDocente = (docenteId: number) => {
    if (esDocente && docenteId !== usuario?.docenteId) {
      return 'rgba(211, 47, 47, 0.1)'; // Rojo suave para slots ocupados por otros (Jerarquía)
    }
    if (!docenteId) return 'rgba(102, 126, 234, 0.1)';
    
    const colors = [
      'rgba(102, 126, 234, 0.15)', // Azul
      'rgba(76, 209, 55, 0.15)',    // Verde
      'rgba(255, 153, 0, 0.15)',    // Naranja
      'rgba(255, 0, 127, 0.15)',    // Rosa
      'rgba(0, 187, 211, 0.15)',    // Cyan
      'rgba(156, 39, 176, 0.15)',   // Púrpura
      'rgba(255, 87, 34, 0.15)',    // Rojo
      'rgba(63, 81, 181, 0.15)',    // Índigo
      'rgba(233, 30, 99, 0.15)',    // Magenta
      'rgba(0, 128, 0, 0.15)',      // Verde oscuro
      'rgba(255, 193, 7, 0.15)',    // Ámbar
      'rgba(121, 85, 72, 0.15)',    // Marrón
      'rgba(96, 125, 139, 0.15)',   // Blue Grey
      'rgba(205, 220, 57, 0.15)',   // Lime
      'rgba(0, 150, 136, 0.15)',    // Teal
    ];
    // Usar el ID del docente para elegir un color consistente
    return colors[docenteId % colors.length];
  };

  const getColorBorderByDocente = (docenteId: number) => {
    if (esDocente && docenteId !== usuario?.docenteId) {
      return '#d32f2f'; // Borde rojo para jerarquía
    }
    if (!docenteId) return '#667eea';
    
    const colors = [
      '#667eea', // Azul
      '#4cd137', // Verde
      '#ff9900', // Naranja
      '#ff007f', // Rosa
      '#00bbd3', // Cyan
      '#9c27b0', // Púrpura
      '#ff5722', // Rojo
      '#3f51b5', // Índigo
      '#e91e63', // Magenta
      '#008000', // Verde oscuro
      '#ffc107', // Ámbar
      '#795548', // Marrón
      '#607d8b', // Blue Grey
      '#cddc39', // Lime
      '#009688', // Teal
    ];
    return colors[docenteId % colors.length];
  };

  // Función para manejar clicks en celdas vacías
  const handleCellClick = (dia: number, horaStr: string) => {
    if (esDocente && !docentePuedeGestionar) {
      MySwal.fire({
        icon: 'info',
        title: 'Acceso Restringido',
        text: 'Aún no es tu turno según la jerarquía institucional. Por favor, espera a que se abra tu ventana de atención.',
        confirmButtonColor: '#003366',
      });
      return;
    }

    const event = getEventForSlot(dia, horaStr);
    
    if (event?.isLunch) {
       MySwal.fire({
         icon: 'warning',
         title: 'Franja de Almuerzo',
         text: LUNCH_CONFIG.MESSAGE,
         confirmButtonColor: '#003366',
       });
       return;
     }

    // Lógica de Mapa de Calor para Docentes
    if (esDocente) {
      const disponibilidad = getDisponibilidadSlot(dia, horaStr);
      if (disponibilidad === 'rojo' && !event) {
        MySwal.fire({
          icon: 'error',
          title: 'Slot No Disponible',
          text: 'Este horario está bloqueado debido a cruces de tus grupos de alumnos o porque tú ya tienes una clase asignada.',
          confirmButtonColor: '#003366',
        });
        return;
      }
    }

    if (esDocente && event && event.docenteId !== usuario?.docenteId) return;
    if (!event) {
      // Celda vacía: abrir modal para crear
      setSelectedHorario(null);
    setIsDragAction(false);
    setHorarioForm({
      docenteId: esDocente ? (usuario?.docenteId || '') : '',
      cursoId: '',
      aulaId: '',
      tipoClase: 'teoria',
      diaSemana: dia,
      horaInicio: horaStr,
      horaFin: String(parseInt(horaStr.split(':')[0]) + 1).padStart(2, '0') + ':00',
      grupoId: '',
    });
    setOpenHorarioModal(true);
    }
  };

  // Función para editar un horario existente
  const handleEditHorario = (horario: any) => {
    if (esDocente) {
      if (!docentePuedeGestionar) return;
      if (horario.docenteId !== usuario?.docenteId) return;
    }

    setSelectedHorario(horario);
    setIsDragAction(false);
    setHorarioForm({
      docenteId: horario.docenteId,
      cursoId: horario.cursoId,
      aulaId: horario.aulaId,
      tipoClase: horario.tipoClase,
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      grupoId: horario.grupoId || '',
    });
    setOpenHorarioModal(true);
  };

  // Función para eliminar un horario
  const handleDeleteHorario = async (horario: any) => {
    if (esDocente) {
      if (!docentePuedeGestionar) return;
      if (horario.docenteId !== usuario?.docenteId) return;
    }

    const result = await MySwal.fire({
      title: '¿Eliminar horario?',
      text: `¿Estás seguro de que quieres eliminar este horario de ${horario.curso.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/horarios/${horario.id}`);
        MySwal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'Horario eliminado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
        fetchData(false);
      } catch (error: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'No se pudo eliminar el horario',
        });
      }
    }
  };

  // Función para guardar/actualizar horario
  const handleSaveHorario = async () => {
    // Validaciones básicas
    if (!horarioForm.docenteId || !horarioForm.cursoId || !horarioForm.aulaId) {
      MySwal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos.',
      });
      return;
    }

    setSavingHorario(true);
    try {
      if (selectedHorario) {
        // Actualizar
        await api.put(`/horarios/${selectedHorario.id}`, {
          docenteId: parseInt(horarioForm.docenteId as string),
          cursoId: parseInt(horarioForm.cursoId as string),
          aulaId: parseInt(horarioForm.aulaId as string),
          cicloId: parseInt(filtros.ciclo),
          tipoClase: horarioForm.tipoClase,
          diaSemana: horarioForm.diaSemana,
          horaInicio: horarioForm.horaInicio,
          horaFin: horarioForm.horaFin,
          grupoId: horarioForm.grupoId ? parseInt(horarioForm.grupoId as string) : undefined,
        });
        MySwal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'Horario actualizado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        // Crear
        await api.post('/horarios', {
          docenteId: parseInt(horarioForm.docenteId as string),
          cursoId: parseInt(horarioForm.cursoId as string),
          aulaId: parseInt(horarioForm.aulaId as string),
          cicloId: parseInt(filtros.ciclo),
          tipoClase: horarioForm.tipoClase,
          diaSemana: horarioForm.diaSemana,
          horaInicio: horarioForm.horaInicio,
          horaFin: horarioForm.horaFin,
          grupoId: horarioForm.grupoId ? parseInt(horarioForm.grupoId as string) : undefined,
        });
        MySwal.fire({
          icon: 'success',
          title: 'Creado',
          text: 'Horario creado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      setOpenHorarioModal(false);
      fetchData(false);
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo guardar el horario',
      });
    } finally {
      setSavingHorario(false);
    }
  };

  // Obtener estado de selección del docente (si es docente)
  useEffect(() => {
    if (usuario?.rol !== 'docente') return;

    let mounted = true;
    const fetchEstadoSeleccion = async () => {
      try {
        const res = await api.get('/ventanas/mi-estado');
        if (!mounted) return;

        const estadoActual = res.data?.estado ?? null;
        const estadoPrevio = prevEstadoSeleccionRef.current;
        const posicion = String(res.data?.posicion ?? 0).padStart(2, '0');
        const minutosEnCola = Math.max(1, Number(res.data?.tiempoDisponibleMinutos ?? 0));
        const minutosTurno = Math.max(1, Math.ceil(Number(res.data?.segundosRestantes ?? 0) / 60));

        if (estadoPrevio && estadoPrevio !== 'en_espera' && estadoActual === 'en_espera' && res.data?.hayVentanaAtencion) {
          MySwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `Docente N.${posicion} en cola`,
            html: `<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#0b3a75;color:#ffffff;font-weight:700;display:inline-block;">${minutosEnCola} min para registrar</div>`,
            timer: 5000,
            showConfirmButton: false,
          });
        }

        if (estadoPrevio && estadoPrevio !== 'en_atencion' && estadoActual === 'en_atencion') {
          MySwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Es tu turno',
            html: `<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#166534;color:#ffffff;font-weight:700;display:inline-block;">${minutosTurno} min para registrar</div>`,
            timer: 5000,
            showConfirmButton: false,
          });
        }

        prevEstadoSeleccionRef.current = estadoActual;
        setEstadoSeleccion(res.data);

      } catch (error) {
        console.error('Error fetching estado selección:', error);
      }
    };

    fetchEstadoSeleccion();
    const intervalId = setInterval(fetchEstadoSeleccion, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [usuario?.rol]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Cabecera */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
            Visualización de Horarios
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Consulta la programación académica detallada por ciclo, docente o ambiente.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={() => fetchData(false)} sx={{ bgcolor: 'white', border: '1px solid #eef2f6' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
          >
            Exportar PDF
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Fila 1: Filtros Principales y Botones de Acción */}
          <Grid item xs={12} md={esDocente ? 3 : 2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ciclo Académico</InputLabel>
              <Select
                value={filtros.ciclo}
                label="Ciclo Académico"
                onChange={(e) => setFiltros({ ...filtros, ciclo: e.target.value })}
                startAdornment={<InputAdornment position="start"><CalendarIcon fontSize="small" color="primary" /></InputAdornment>}
              >
                {ciclos.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre} {c.esActual ? '(Actual)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={esDocente ? 3 : 2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ciclo de Estudios</InputLabel>
              <Select
                value={filtros.cicloEstudio}
                 label="Ciclo de Estudios"
                 onChange={(e) => setFiltros({ ...filtros, cicloEstudio: e.target.value })}
                 startAdornment={<InputAdornment position="start"><FilterIcon fontSize="small" color="primary" /></InputAdornment>}
               >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                  <MenuItem key={c} value={String(c)}>
                    {c}° CICLO
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={esDocente ? 4 : 2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Carrera</InputLabel>
              <Select
                value={filtros.carrera?.id || ''}
                label="Carrera"
                onChange={(e) => {
                  const carrera = carreras.find(c => c.id === e.target.value);
                  setFiltros({ ...filtros, carrera: carrera || null });
                }}
                startAdornment={<InputAdornment position="start"><SchoolIcon fontSize="small" color="primary" /></InputAdornment>}
              >
                {carreras.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {!esDocente && (
            <Grid item xs={12} md={3.5}>
              <Autocomplete
                size="small"
                options={docentesFiltrados}
                getOptionLabel={(option) => option.nombreCompleto || option.nombre || ''}
                filterOptions={(options, state) => {
                  const displayOptions = options.filter((option: any) =>
                    (option.nombreCompleto || '').toLowerCase().includes(state.inputValue.toLowerCase())
                  );
                  return displayOptions.slice(0, 15);
                }}
                value={filtros.docente}
                onChange={(_, newValue) => setFiltros({ ...filtros, docente: newValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar Docente por Nombre"
                    placeholder="Escribe el nombre del docente..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon fontSize="small" color="primary" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          )}

          <Grid item xs={12} md={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<DeleteSweepIcon />}
              onClick={() => {
                const sistemas = carreras.find((c: any) => 
                  c.nombre.toLowerCase().includes('sistemas') || 
                  c.nombre.toLowerCase().includes('ingeniería de sistemas')
                );
                setFiltros({
                  ...filtros,
                  cicloEstudio: '1',
                  carrera: sistemas || null,
                  docente: null,
                  aula: 'todos',
                  tipoAula: 'todos',
                  tipoContrato: 'todos',
                  categoria: 'todos'
                });
                fetchData(false);
              }}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 800, 
                color: '#666', 
                borderColor: '#ddd', 
                minWidth: 0, 
                whiteSpace: 'nowrap',
                borderWidth: 1.5,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                height: 40
              }}
            >
              Limpiar
            </Button>
          </Grid>

          {/* Fila 2: Botón Filtros y Filtros Avanzados */}
          <Grid item xs={12} md={2}>
            <Button 
              fullWidth
              variant={showAdvancedFilters ? "contained" : "outlined"}
              startIcon={<TuneIcon />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 800,
                bgcolor: showAdvancedFilters ? '#003366' : 'transparent',
                color: showAdvancedFilters ? 'white' : '#003366',
                borderColor: '#003366',
                borderWidth: 1.5,
                minWidth: 0,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                height: 40,
                '&:hover': {
                  bgcolor: showAdvancedFilters ? '#002244' : 'rgba(0, 51, 102, 0.04)',
                  borderColor: '#003366',
                  borderWidth: 1.5
                }
              }}
            >
              Filtros
            </Button>
          </Grid>

          {showAdvancedFilters && (
            <Grid item xs={12} md={10}>
              <Grid container spacing={2}>
                {usuario?.rol !== 'docente' && (
                  <>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Categoría Docente</InputLabel>
                        <Select
                          value={filtros.categoria}
                          label="Categoría Docente"
                          onChange={(e) => {
                            setFiltros({ ...filtros, categoria: e.target.value, docente: null });
                          }}
                        >
                          <MenuItem value="todos">Todas las Categorías</MenuItem>
                          {categoriasDocente.map(cat => (
                            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
                          onChange={(e) => {
                            setFiltros({ ...filtros, tipoContrato: e.target.value, docente: null });
                          }}
                        >
                          <MenuItem value="todos">Todos los Contratos</MenuItem>
                          {tiposContrato.map(tipo => (
                            <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} md={usuario?.rol === 'docente' ? 6 : 3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Aula</InputLabel>
                    <Select
                      value={filtros.tipoAula}
                      label="Tipo de Aula"
                      onChange={(e) => setFiltros({ ...filtros, tipoAula: e.target.value, aula: 'todos' })}
                    >
                      <MenuItem value="todos">Todos los Tipos</MenuItem>
                      {tiposAula.map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={usuario?.rol === 'docente' ? 6 : 3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Aula / Ambiente</InputLabel>
                    <Select
                      value={filtros.aula}
                      label="Aula / Ambiente"
                      onChange={(e) => setFiltros({ ...filtros, aula: e.target.value })}
                      startAdornment={<InputAdornment position="start"><RoomIcon fontSize="small" color="primary" /></InputAdornment>}
                    >
                      <MenuItem value="todos">Todas las Aulas</MenuItem>
                      {aulasFiltradas.map((a: any) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Leyenda de Disponibilidad Integrada (Solo para Docentes) */}
          {esDocente && (
            <Grid item xs={12}>
              <Box sx={{ 
                mt: 1, 
                pt: 2, 
                borderTop: '1px dashed #e0e0e0', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: { xs: 2, md: 4 },
                flexWrap: 'wrap',
                bgcolor: 'rgba(0, 51, 102, 0.02)',
                borderRadius: 2,
                py: 1.5
              }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366', display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                  <TuneIcon sx={{ fontSize: 16 }} /> LEYENDA DE DISPONIBILIDAD:
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', fontSize: '0.7rem' }}>DISPONIBLE</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#9a3412', fontSize: '0.7rem' }}>PARCIALMENTE OCUPADO</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.7rem' }}>NO DISPONIBLE / CRUCE</Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Cabecera separada (fuera de la tabla) para que quede realmente separada del cuerpo */}
      <Paper elevation={0} sx={{ borderRadius: '8px 8px 0 0', border: '1px solid #eef2f6', borderBottom: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 1, overflow: 'hidden' }}>
        <Table sx={{ width: '100%', minWidth: { xs: 860, sm: 1000 }, tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: 0, backgroundColor: '#fff' }}>
          <colgroup>
            <col style={{ width: 100 }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <TableHead sx={{ bgcolor: '#003366' }}>
            <TableRow sx={{ bgcolor: '#003366' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', width: { xs: 72, sm: 100 }, px: { xs: 1, sm: 2 }, border: 'none', bgcolor: '#003366', height: { xs: 68, sm: 80 }, verticalAlign: 'middle' }}>HORA</TableCell>
              {DIAS.map(dia => (
                <TableCell key={dia.id} sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: { xs: 1, sm: 2 }, border: '1px solid rgba(255, 255, 255, 0.25)', bgcolor: '#003366' }}>
                  {dia.nombre.toUpperCase()}
                </TableCell>
              ))}
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', width: { xs: 72, sm: 100 }, px: { xs: 1, sm: 2 }, border: 'none', bgcolor: '#003366', height: { xs: 68, sm: 80 }, verticalAlign: 'middle' }}>HORA</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </Paper>

      {/* Grilla de Horarios (solo cuerpo, scroll independiente) */}
      <Box sx={{ position: 'relative' }}>
        {fetching && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '0 0 8px 8px',
            }}
          >
            <CircularProgress size={40} sx={{ color: '#003366' }} />
          </Box>
        )}
        <TableContainer
          ref={tableContainerRef}
          component={Paper}
        elevation={0}
        sx={{
          borderRadius: '0 0 8px 8px',
          border: '1px solid #eef2f6',
          borderTop: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxHeight: '75vh',
          pt: `${HORA_ALTURA_HEADER}px`,
          scrollbarWidth: 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Table sx={{ width: '100%', minWidth: { xs: 860, sm: 1000 }, tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: 0, backgroundColor: '#fff' }}>
          <colgroup>
            <col style={{ width: 100 }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 'calc((100% - 200px) / 6)' }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <TableBody>
            {/* Espacio inicial (40px) para separar del borde superior */}
            <TableRow sx={{ height: HORA_SPACER_HEIGHT }}>
              <TableCell sx={{ border: 'none', bgcolor: 'white' }} />
              {DIAS.map(dia => (
                <TableCell key={dia.id} sx={{ border: 'none', bgcolor: 'transparent' }} />
              ))}
              <TableCell sx={{ border: 'none', bgcolor: 'white' }} />
            </TableRow>

            {[...HORAS, '21:00'].map((hora, idx) => {
                  const isLastLabel = idx === HORAS.length;
                  return (
                    <TableRow 
                      key={idx} 
                      sx={{ 
                        height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, 
                        '&:nth-of-type(even)': { bgcolor: isLastLabel ? 'transparent' : '#fcfdfe' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#5f6368', textAlign: 'center', p: 0, whiteSpace: 'nowrap', bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, position: 'relative', border: 'none', zIndex: 3 }}>
                        {/* hour label aligned with horizontal line */}
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                          <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: { xs: '0.78rem', sm: '0.9rem' }, background: 'transparent', p: 0, m: 0 }}>{hora}</Typography>
                        </Box>
                        {/* small tick line pointing toward the hour label */}
                        <Box sx={{ position: 'absolute', top: 0, right: 0, height: '1px', width: 20, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }}/>
                      </TableCell>
                      {isLastLabel ? (
                        <TableCell colSpan={6} sx={{ border: 'none', borderTop: '1px solid #dfe1e5' }} />
                      ) : (
                        DIAS.map(dia => {
                          const event = getEventForSlot(dia.id, hora);
                          const isStart = event && isStartTime(event.horaInicio, hora);
                          const selectionRange = dragSelection ? normalizeSlotRange(dragSelection.startIndex, dragSelection.endIndex) : null;
                          const isSelectedCell = !!selectionRange && dragSelection?.day === dia.id && idx >= selectionRange.startIndex && idx <= selectionRange.endIndex;
                          const isSelectedEvent = !!event && !!selectionRange && dragSelection?.day === dia.id && (
                            (dragSelection?.mode === 'edit' && dragSelection.event?.id === event.id) ||
                            (idx >= selectionRange.startIndex && idx <= selectionRange.endIndex)
                          );
                          
                          if (event) {
                            if (event.isLunch) {
                              if (isStart) {
                                return (
                                  <TableCell 
                                    key={dia.id} 
                                    rowSpan={1}
                                    sx={{ 
                                      p: 0,
                                      border: '1px solid #dfe1e5',
                                      verticalAlign: 'middle',
                                      bgcolor: '#f1f3f4', // Gris suave para almuerzo
                                      height: '1px',
                                      textAlign: 'center'
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#5f6368', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                      FRANJA ALMUERZO
                                    </Typography>
                                  </TableCell>
                                );
                              }
                              return null;
                            }
                            if (isStart) {
                              const duration = parseInt(event.horaFin.split(':')[0]) - parseInt(event.horaInicio.split(':')[0]);
                              return (
                                <TableCell 
                                  key={dia.id} 
                                  rowSpan={duration}
                                  sx={{ 
                                    p: 0,
                                    border: '1px solid #dfe1e5',
                                    verticalAlign: 'top',
                                    height: '1px',
                                    cursor: 'grab',
                                    '&:hover': { opacity: 0.88 },
                                    outline: isSelectedEvent ? '2px dashed #003366' : 'none',
                                    outlineOffset: '-2px',
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    e.preventDefault();
                                    startDragSelection(dia.id, idx, event);
                                  }}
                                >
                                    <Box sx={{ 
                                      height: '100%', 
                                      maxHeight: `${duration * HORA_ALTURA_FILA}px`,
                                      width: '100%',
                                      bgcolor: getColorByDocente(event.docenteId),
                                      borderLeft: `4px solid ${getColorBorderByDocente(event.docenteId)}`,
                                      border: isSelectedEvent ? '2px dashed #003366' : '1px solid transparent',
                                      p: { xs: 1, sm: 1.5 },
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: { xs: 0.25, sm: 0.5 },
                                      boxSizing: 'border-box',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      '&:hover .action-buttons': { opacity: 1 },
                                    }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="caption" sx={{ 
                                            fontWeight: 800, 
                                            color: getColorBorderByDocente(event.docenteId),
                                            textTransform: 'uppercase', 
                                            fontSize: { xs: '0.58rem', sm: '0.65rem' },
                                            lineHeight: 1.1,
                                          }}>
                                            {event.tipoClase}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              fontWeight: 700,
                                              color: '#333',
                                              lineHeight: 1.1,
                                              fontSize: { xs: '0.72rem', sm: '0.875rem' },
                                              overflow: 'hidden',
                                              display: '-webkit-box',
                                              WebkitLineClamp: { xs: 2, sm: 3 },
                                              WebkitBoxOrient: 'vertical',
                                              wordBreak: 'break-word',
                                            }}
                                          >
                                            {event.curso.nombre} {event.grupo ? `(G${event.grupo.numeroGrupo})` : ''}
                                          </Typography>
                                        </Box>
                                        {(!esDocente || docentePuedeGestionar) && (!esDocente || event.docenteId === usuario?.docenteId) && (
                                          <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}>
                                            <Tooltip title="Editar">
                                              <IconButton size="small" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEditHorario(event); }}>
                                                <EditIcon sx={{ fontSize: 14 }} />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar">
                                              <IconButton size="small" color="error" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteHorario(event); }}>
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        )}
                                      </Box>
                                    <Typography variant="caption" noWrap sx={{ color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.64rem', sm: '0.75rem' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <PersonIcon sx={{ fontSize: 12 }} /> {event.docente.nombreCompleto}
                                    </Typography>
                                    <Typography variant="caption" noWrap sx={{ color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.64rem', sm: '0.75rem' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <RoomIcon sx={{ fontSize: 12 }} /> {event.aula.nombre}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              );
                            }
                            return null;
                          }
                          const disponibilidad = getDisponibilidadSlot(dia.id, hora);
                          const colorDisponibilidad = getColorByDisponibilidad(disponibilidad);
                          const tooltipText = disponibilidad === 'verde' 
                            ? 'Disponible para todos tus cursos' 
                            : disponibilidad === 'amarillo' 
                            ? 'Disponible para algunos cursos (otros tienen cruce)' 
                            : 'No disponible (cruce total o almuerzo)';

                          return (
                            <Tooltip key={dia.id} title={esDocente ? tooltipText : ""} arrow placement="top">
                              <TableCell 
                                sx={{ 
                                  border: '1px solid #dfe1e5', 
                                  p: 0,
                                  cursor: disponibilidad === 'rojo' && esDocente ? 'not-allowed' : 'crosshair',
                                  bgcolor: isSelectedCell
                                    ? (selectionInfo?.valido ? 'rgba(0, 51, 102, 0.12)' : 'rgba(211, 47, 47, 0.12)')
                                    : (esDocente ? colorDisponibilidad : 'transparent'),
                                  '&:hover': { bgcolor: isSelectedCell ? undefined : (esDocente && disponibilidad === 'rojo' ? colorDisponibilidad : '#f0f7ff') },
                                  minHeight: { xs: 68, sm: 80 },
                                }}
                                onMouseDown={(e) => {
                                  if (e.button !== 0) return;
                                  if (esDocente && disponibilidad === 'rojo') return;
                                  e.preventDefault();
                                  startDragSelection(dia.id, idx);
                                }}
                              />
                            </Tooltip>
                          );
                        })
                      )}
                      <TableCell sx={{ fontWeight: 600, color: '#5f6368', textAlign: 'center', p: 0, whiteSpace: 'nowrap', bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? 30 : { xs: 68, sm: 80 }, position: 'relative', border: 'none', zIndex: 3 }}>
                        {/* hour label aligned with horizontal line */}
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                          <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: { xs: '0.78rem', sm: '0.9rem' }, background: 'transparent', p: 0, m: 0 }}>{hora}</Typography>
                        </Box>
                        {/* small tick line pointing toward the hour label from the left */}
                        <Box sx={{ position: 'absolute', top: 0, left: 0, height: '1px', width: 20, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }}/>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Modal para Crear/Editar Horario */}
      <Dialog
        open={openHorarioModal}
        onClose={() => setOpenHorarioModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, minHeight: '400px' } }}
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{esDocente && !docentePuedeGestionar ? 'Detalle de Horario' : (selectedHorario ? 'Editar Horario' : 'Crear Horario')}</span>
            {selectionSummary && (
              <Chip
                label={`${selectionSummary.dia} | ${selectionSummary.horaInicio} - ${selectionSummary.horaFin}`}
                variant="outlined"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 10, pb: 4 }}>
          <Grid container spacing={3} sx={{ pt: 3 }}>
            {/* Fila 1: Docente y Curso */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                size="small"
                fullWidth
                disabled={esDocente}
                options={docentes}
                getOptionLabel={(option: any) => option.nombreCompleto || ''}
                value={docentes.find((d: any) => d.id === horarioForm.docenteId) || null}
                onChange={(_, newValue) => {
                  setHorarioForm({ ...horarioForm, docenteId: newValue?.id || '', cursoId: '', horaFin: '08:00' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Docente"
                    placeholder="Buscar docente..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon fontSize="small" color="primary" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Curso"
                disabled={!docentePuedeGestionar || !horarioForm.docenteId || loadingCursosDocente}
                value={horarioForm.cursoId && horarioForm.tipoClase ? `${horarioForm.cursoId}-${horarioForm.tipoClase}` : ''}
                onChange={(e) => {
                  const [cId, tClase] = e.target.value.split('-');
                  setHorarioForm(prev => ({ ...prev, cursoId: cId, tipoClase: tClase }));
                  aplicarRecalculoHoraFin(horarioForm.horaInicio, cId, cursosDocente, tClase);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {loadingCursosDocente ? (
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                      ) : (
                        <SchoolIcon fontSize="small" color="primary" />
                      )}
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  {!horarioForm.docenteId 
                    ? 'Seleccione un docente primero' 
                    : loadingCursosDocente 
                      ? 'Cargando...' 
                      : cursosDocente.length === 0 
                        ? 'Sin cursos' 
                        : 'Seleccionar curso...'}
                </MenuItem>
                {cursosDocente.map((asig: any) => {
                  const isFull = asig.horasAsignadas >= asig.horasSemanales;
                  const isEditingCurrent = selectedHorario && 
                                          Number(selectedHorario.cursoId) === Number(asig.cursoId) && 
                                          selectedHorario.tipoClase.toLowerCase() === asig.tipoClase.toLowerCase();
                  
                  // Validación de Mapa de Calor: Ver si este curso específico tiene cruce en el slot seleccionado
                  const keyOcupacion = `${horarioForm.diaSemana}_${parseInt(horarioForm.horaInicio.split(':')[0])}`;
                  const ocupacionesSlot = mapaOcupacion[keyOcupacion] || [];
                  const tieneCruceGrupo = ocupacionesSlot.some((o: any) => 
                    o.carreraId === asig.curso?.carreraId && o.cicloAcademico === asig.curso?.cicloAcademico
                  );

                  return (
                    <MenuItem 
                      key={`${asig.cursoId}-${asig.tipoClase}`} 
                      value={`${asig.cursoId}-${asig.tipoClase}`}
                      disabled={(isFull && !isEditingCurrent) || tieneCruceGrupo}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {asig.curso?.nombre || 'Curso'} {tieneCruceGrupo ? '(CRUCE DE GRUPO)' : ''}
                          </Typography>
                          {(isFull && !isEditingCurrent) || tieneCruceGrupo ? (
                            <Chip 
                              label={tieneCruceGrupo ? "CRUCE DE ALUMNOS" : "CARGA COMPLETA"} 
                              size="small" 
                              color="error" 
                              variant="filled"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} 
                            />
                          ) : null}
                        </Box>
                        <Typography variant="caption" color={(isFull && !isEditingCurrent) || tieneCruceGrupo ? "error" : "textSecondary"}>
                          {asig.tipoClase?.toUpperCase()} | {asig.horasAsignadas}h de {asig.horasSemanales}h Semanales asignadas
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

            {/* Fila 2: Tipo de Clase, Aula y Grupo */}
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de Clase / Ambiente"
                disabled // Bloqueado: Se deriva de la carga académica
                value={horarioForm.tipoClase}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TuneIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="teoria">Teoría (Aula)</MenuItem>
                <MenuItem value="practica">Práctica (Taller/Aula)</MenuItem>
                <MenuItem value="laboratorio">Laboratorio</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Aula / Ambiente"
                disabled={!docentePuedeGestionar || !horarioForm.tipoClase}
                value={horarioForm.aulaId}
                onChange={(e) => setHorarioForm({ ...horarioForm, aulaId: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <RoomIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar...</MenuItem>
                {aulasModalFiltradas.map((a: any) => (
                  <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              {horarioForm.tipoClase?.toLowerCase() === 'laboratorio' ? (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="N° Grupo"
                  disabled={!docentePuedeGestionar || loadingGrupos}
                  value={horarioForm.grupoId}
                  onChange={(e) => setHorarioForm({ ...horarioForm, grupoId: e.target.value })}
                  helperText={grupos.length === 1 ? "Grupo único asignado automáticamente" : ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterIcon fontSize="small" color="primary" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {grupos.map((g: any) => (
                    <MenuItem key={g.id} value={g.id}>
                      Grupo {g.numeroGrupo}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Box sx={{ width: '100%', height: '40px' }} /> // Placeholder para mantener el layout estable
              )}
            </Grid>

            {/* Fila 3: Día y Horas */}
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Día"
                disabled={!docentePuedeGestionar}
                value={horarioForm.diaSemana}
                onChange={(e) => setHorarioForm({ ...horarioForm, diaSemana: e.target.value as any })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                {DIAS.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Hora Inicio"
                disabled={!docentePuedeGestionar}
                value={horarioForm.horaInicio}
                onChange={(e) => {
                  const hInicioStr = e.target.value;
                  setHorarioForm(prev => ({ ...prev, horaInicio: hInicioStr }));
                  const cursoActual = horarioForm.cursoId;
                  if (cursoActual) {
                    const res = recalcularHoraFin(hInicioStr, cursoActual, cursosDocente, horarioForm.tipoClase);
                    setHorarioForm(prev => ({ ...prev, horaFin: res.horaFin }));
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                {HORAS.filter(h => h !== '22:00').map((hora) => (
                  <MenuItem key={hora} value={hora}>
                    {hora}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Hora Fin"
                disabled={!docentePuedeGestionar}
                value={horarioForm.horaFin}
                onChange={(e) => setHorarioForm(prev => ({ ...prev, horaFin: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                {HORAS.filter(h => h > horarioForm.horaInicio).map((hora) => (
                  <MenuItem key={hora} value={hora}>
                    {hora}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setOpenHorarioModal(false)}
            color="inherit"
            disabled={savingHorario}
            variant="outlined"
            startIcon={<CloseIcon />}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {esDocente && !docentePuedeGestionar ? 'Cerrar' : 'Cancelar'}
          </Button>
          {(!esDocente || docentePuedeGestionar) && (
            <>
              {selectedHorario && (!esDocente || selectedHorario.docenteId === usuario?.docenteId) && (
                <Button
                  onClick={() => {
                    handleDeleteHorario(selectedHorario);
                    setOpenHorarioModal(false);
                  }}
                  color="error"
                  disabled={savingHorario}
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Eliminar
                </Button>
              )}
              <Button
                onClick={handleSaveHorario}
                variant="contained"
                disabled={savingHorario}
                sx={{ bgcolor: '#003366', fontWeight: 600, borderRadius: 2 }}
                startIcon={savingHorario ? <CircularProgress size={18} color="inherit" /> : selectedHorario ? <EditIcon /> : <AddIcon />}
              >
                {savingHorario ? 'Guardando...' : selectedHorario ? 'Actualizar' : 'Crear'}
              </Button>
            </>
          )}
        </DialogActions>

      </Dialog>

      {/* Toast de confirmación de selección */}
      <Snackbar
        open={showSelectionToast}
        autoHideDuration={3000}
        onClose={() => setShowSelectionToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSelectionToast(false)} severity="success" sx={{ width: '100%' }}>
          Horario listo: {selectionSummary?.dia} {selectionSummary?.horaInicio} - {selectionSummary?.horaFin}
        </Alert>
      </Snackbar>
    </Box>
  );
}
