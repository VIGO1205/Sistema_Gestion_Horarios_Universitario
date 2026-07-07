'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, FormControl, InputLabel, Select, MenuItem, TextField,
  CircularProgress, IconButton, Card, CardContent, LinearProgress,
  InputAdornment, Chip,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon, School as SchoolIcon,
  Room as RoomIcon, Person as PersonIcon,
  Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon, Groups as GroupsIcon, Biotech as BiotechIcon,
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import api from '@/lib/api';
import { DIAS } from '@/app/horarios/constantes';

const MySwal = withReactContent(Swal);

const HORA_ALTURA_FILA = 48;
const HORA_SPACER_HEIGHT = 24;

const numberToLetter = (num: number) => String.fromCharCode(64 + num);

const tipoColor: Record<string, string> = {
  teoria: '#166534',
  practica: '#92400e',
  laboratorio: '#1e40af',
};

const tipoBg: Record<string, string> = {
  teoria: 'rgba(22, 101, 52, 0.08)',
  practica: 'rgba(146, 64, 14, 0.08)',
  laboratorio: 'rgba(30, 64, 175, 0.08)',
};

interface CalendarioCargaDocenteProps {
  docente: any;
  cursosAsignados: any[];
  cicloId: string;
  usuario: any;
  onHorariosChange: (stats: { totalRequerido: number; totalProgramado: number; completo: boolean }) => void;
}

export default function CalendarioCargaDocente({
  docente,
  cursosAsignados,
  cicloId,
  usuario,
  onHorariosChange,
}: CalendarioCargaDocenteProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aulas, setAulas] = useState<any[]>([]);
  const [mapaOcupacion, setMapaOcupacion] = useState<any>({});

  const [configGrilla, setConfigGrilla] = useState<any>({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6],
  });

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [editHorario, setEditHorario] = useState<any>(null);
  interface FormData {
    cursoId: string;
    tipoClase: string;
    aulaId: string;
    grupoId: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  }
  const [formData, setFormData] = useState<FormData>({
    cursoId: '', tipoClase: '', aulaId: '', grupoId: '',
    diaSemana: 0, horaInicio: '', horaFin: '',
  });
  const [selectionSummary, setSelectionSummary] = useState<any>(null);

  // Drag & drop state
  const tableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ day: number; startIdx: number; endIdx: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ day: number; startIdx: number; endIdx: number } | null>(null);

  // Cargar config
  useEffect(() => {
    if (!cicloId) return;
    api.get(`/ciclos/${cicloId}/configuracion`).then(res => {
      if (res.data) {
        setConfigGrilla({
          horaInicio: res.data.horaInicio?.substring(0, 5) || '07:00',
          horaFin: res.data.horaFin?.substring(0, 5) || '22:00',
          almuerzoInicio: res.data.almuerzoInicio?.substring(0, 5) || '13:00',
          almuerzoFin: res.data.almuerzoFin?.substring(0, 5) || '14:00',
          diasActivos: typeof res.data.diasActivos === 'string'
            ? res.data.diasActivos.split(',').map(Number)
            : Array.isArray(res.data.diasActivos)
              ? res.data.diasActivos.map(Number)
              : [1, 2, 3, 4, 5, 6],
        });
      }
    }).catch(() => {});
  }, [cicloId]);

  // Cargar aulas
  useEffect(() => {
    api.get('/aulas').then(res => {
      setAulas(res.data || []);
    }).catch(() => setAulas([]));
  }, []);

  // Cargar mapa de ocupación
  useEffect(() => {
    if (!cicloId) return;
    api.get('/horarios/mapa-ocupacion', { params: { cicloId } }).then(res => {
      setMapaOcupacion(res.data || {});
    }).catch(() => {});
  }, [cicloId]);

  // Cargar horarios del docente
  const fetchHorarios = useCallback(async () => {
    if (!cicloId || !docente?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/horarios', {
        params: { cicloId, docenteId: docente.id }
      });
      setHorarios(res.data || []);
    } catch {
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  }, [cicloId, docente?.id]);

  useEffect(() => {
    fetchHorarios();
  }, [fetchHorarios]);

  // Stats
  const totalRequerido = useMemo(() =>
    cursosAsignados.reduce((sum: number, ce: any) =>
      sum + ce.asignaciones.reduce((s: number, a: any) =>
        s + Number(a.horasSemanales) * a.grupos.length, 0), 0),
  [cursosAsignados]);

  const totalProgramado = useMemo(() =>
    horarios.reduce((sum: number, h: any) =>
      sum + (parseInt(h.horaFin?.split(':')[0] || '0') - parseInt(h.horaInicio?.split(':')[0] || '0')), 0),
  [horarios]);

  const completo = totalRequerido > 0 && totalProgramado >= totalRequerido;
  const completionPercent = totalRequerido > 0 ? Math.min(100, (totalProgramado / totalRequerido) * 100) : 0;

  useEffect(() => {
    onHorariosChange({ totalRequerido, totalProgramado, completo });
  }, [totalRequerido, totalProgramado, completo, onHorariosChange]);

  // Grid helpers
  const diasFiltrados = useMemo(() =>
    DIAS.filter(d => configGrilla.diasActivos.includes(d.id)),
  [configGrilla.diasActivos]);

  const horasFiltradas = useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    return Array.from({ length: end - start }, (_, i) =>
      `${String(start + i).padStart(2, '0')}:00`);
  }, [configGrilla.horaInicio, configGrilla.horaFin]);

  const numSlots = horasFiltradas.length;

  const getEventForSlot = useCallback((dia: number, hora: string) => {
    const hActual = parseInt(hora.split(':')[0]);
    const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
    const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);
    if (hActual >= hAlmInicio && hActual < hAlmFin) {
      return hActual === hAlmInicio ? { isLunch: true } : null;
    }
    const matching = horarios.filter((h: any) => {
      if (h.diaSemana !== dia) return false;
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      return hActual >= hInicio && hActual < hFin;
    });
    if (matching.length === 0) return null;
    return matching.length === 1 ? matching[0] : matching;
  }, [horarios, configGrilla]);

  const isStartTime = useCallback((start: string, grid: string) =>
    start?.substring(0, 5) === grid, []);

  // Drag & drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, dia: number, slotIdx: number) => {
    e.preventDefault();
    dragRef.current = { day: dia, startIdx: slotIdx, endIdx: slotIdx };
    setDragOver({ day: dia, startIdx: slotIdx, endIdx: slotIdx });

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !tableRef.current) return;
      const rect = tableRef.current.getBoundingClientRect();
      const scrollTop = tableRef.current.scrollTop;
      const relY = e.clientY - rect.top + scrollTop;
      const offset = HORA_SPACER_HEIGHT + 48;
      const idx = Math.max(0, Math.min(numSlots - 1, Math.floor((relY - offset) / HORA_ALTURA_FILA)));
      dragRef.current = { ...dragRef.current, endIdx: idx };
      setDragOver({ ...dragRef.current, endIdx: idx });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      const sel = dragRef.current;
      dragRef.current = null;
      setDragOver(null);
      if (sel) {
        const minIdx = Math.min(sel.startIdx, sel.endIdx);
        const maxIdx = Math.max(sel.startIdx, sel.endIdx);
        const hInicio = horasFiltradas[minIdx];
        const hFin = maxIdx === horasFiltradas.length - 1 ? configGrilla.horaFin : horasFiltradas[maxIdx + 1];
        openCreateModal(sel.day, hInicio, hFin);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [horasFiltradas, numSlots, configGrilla.horaFin]);

  // Modal open/close
  const openCreateModal = useCallback((dia: number, hInicio: string, hFin: string) => {
    setEditHorario(null);
    setFormData({ cursoId: '', tipoClase: '', aulaId: '', grupoId: '', diaSemana: dia, horaInicio: hInicio, horaFin: hFin });
    setSelectionSummary({ dia: DIAS.find(d => d.id === dia)?.nombre || '', horaInicio: hInicio, horaFin: hFin });
    setOpenModal(true);
  }, []);

  const openEditModal = useCallback((horario: any) => {
    setEditHorario(horario);
    setFormData({
      cursoId: String(horario.cursoId || ''),
      tipoClase: horario.tipoClase || '',
      aulaId: String(horario.aulaId || ''),
      grupoId: String(horario.grupoId || ''),
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio?.substring(0, 5),
      horaFin: horario.horaFin?.substring(0, 5),
    });
    setSelectionSummary({
      dia: DIAS.find(d => d.id === horario.diaSemana)?.nombre || '',
      horaInicio: horario.horaInicio?.substring(0, 5),
      horaFin: horario.horaFin?.substring(0, 5),
    });
    setOpenModal(true);
  }, []);

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditHorario(null);
    setSelectionSummary(null);
  };

  // Save
  const handleSave = async () => {
    if (!formData.cursoId || !formData.tipoClase || !formData.aulaId || !formData.horaInicio || !formData.horaFin) return;
    setSaving(true);
    try {
      const payload = {
        docenteId: docente.id,
        cicloId: Number(cicloId),
        diaSemana: formData.diaSemana,
        horaInicio: formData.horaInicio + ':00',
        horaFin: formData.horaFin + ':00',
        tipoClase: formData.tipoClase,
        cursoId: Number(formData.cursoId),
        aulaId: Number(formData.aulaId),
        grupoId: formData.grupoId ? Number(formData.grupoId) : undefined,
      };
      if (editHorario) {
        await api.put(`/horarios/${editHorario.id}`, payload);
      } else {
        await api.post('/horarios', payload);
      }
      handleCloseModal();
      await fetchHorarios();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar horario';
      MySwal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (horario: any) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/horarios/${horario.id}`);
        await fetchHorarios();
        MySwal.fire('Eliminado', 'El horario ha sido eliminado.', 'success');
      } catch (error: any) {
        MySwal.fire({ icon: 'error', title: 'Error', text: error?.response?.data?.message || 'Error al eliminar horario' });
      }
    }
  };

  // Opciones curso+tipo
  const opcionesCursoTipo = useMemo(() => {
    const opciones: any[] = [];
    cursosAsignados.forEach((ce: any) => {
      ce.asignaciones.forEach((a: any) => {
        opciones.push({
          curso: ce.cursoProgramacion?.curso || {},
          tipoClase: a.tipoClase,
          horasSemanales: a.horasSemanales,
          grupos: a.grupos,
          key: `${ce.cursoProgramacion?.curso?.id || ce.cursoProgramacion?.id}-${a.tipoClase}`,
        });
      });
    });
    return opciones;
  }, [cursosAsignados]);

  const horasFinDisponibles = useMemo(() => {
    const idx = horasFiltradas.indexOf(formData.horaInicio);
    if (idx === -1) return [];
    const base = horasFiltradas.slice(idx + 1);
    if (base[base.length - 1] !== configGrilla.horaFin) {
      base.push(configGrilla.horaFin);
    }
    return base;
  }, [horasFiltradas, formData.horaInicio, configGrilla.horaFin]);

  const aulasFiltradas = useMemo(() => {
    if (!formData.tipoClase) return aulas;
    const map: Record<string, string> = { teoria: 'teoría', practica: 'práctica', laboratorio: 'laboratorio' };
    const t = map[formData.tipoClase] || formData.tipoClase;
    return aulas.filter((a: any) => a.tipo?.toLowerCase() === t.toLowerCase());
  }, [aulas, formData.tipoClase]);

  const aulasOcupadasEnHorario = useMemo(() => {
    if (!formData.diaSemana || !formData.horaInicio || !formData.horaFin) return [];
    const hInicio = parseInt(formData.horaInicio.split(':')[0]);
    const hFin = parseInt(formData.horaFin.split(':')[0]);
    const ocupadas: number[] = [];
    for (let h = hInicio; h < hFin; h++) {
      const key = `${formData.diaSemana}_${h}`;
      const ocupaciones = mapaOcupacion[key] || [];
      ocupaciones.forEach((o: any) => {
        if (o.aulaId) ocupadas.push(Number(o.aulaId));
      });
    }
    return [...new Set(ocupadas)];
  }, [formData.diaSemana, formData.horaInicio, formData.horaFin, mapaOcupacion]);

  useEffect(() => {
    if (formData.cursoId && formData.tipoClase) {
      const op = opcionesCursoTipo.find(o => o.key === `${formData.cursoId}-${formData.tipoClase}`);
      if (op) {
        const dur = Number(op.horasSemanales) || 1;
        const i = horasFiltradas.indexOf(formData.horaInicio);
        if (i >= 0) {
          const target = i + dur;
          setFormData(prev => ({ ...prev, horaFin: target >= horasFiltradas.length ? configGrilla.horaFin : horasFiltradas[target] }));
        }
        // Auto-select first grupo if not yet selected
        if (op.grupos?.length > 0 && (!formData.grupoId || editHorario)) {
          setFormData(prev => ({ ...prev, grupoId: String(op.grupos[0].id || op.grupos[0]) }));
        }
      }
    }
  }, [formData.cursoId, formData.tipoClase, formData.horaInicio, configGrilla.horaFin, configGrilla.horaInicio]);

  const numColumnas = diasFiltrados.length;
  const colWidth = `calc((100% - 120px) / ${numColumnas})`;

  const isCellSelected = useCallback((dia: number, slotIdx: number) => {
    if (!dragOver || dragOver.day !== dia) return false;
    const minIdx = Math.min(dragOver.startIdx, dragOver.endIdx);
    const maxIdx = Math.max(dragOver.startIdx, dragOver.endIdx);
    return slotIdx >= minIdx && slotIdx <= maxIdx;
  }, [dragOver]);

  // Grupos únicos (carreraId + cicloAcademico) del docente actual
  const gruposDocente = useMemo(() => {
    const grupos = cursosAsignados
      .map((ce: any) => ({
        carreraId: ce.cursoProgramacion?.curso?.carreraId,
        cicloAcademico: ce.cursoProgramacion?.curso?.cicloAcademico,
      }))
      .filter((g: any) => g.carreraId && g.cicloAcademico);
    return grupos.filter((v: any, i: number, a: any[]) =>
      a.findIndex((t: any) => t.carreraId === v.carreraId && t.cicloAcademico === v.cicloAcademico) === i
    );
  }, [cursosAsignados]);

  const getDisponibilidadSlot = useCallback((dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    const key = `${dia}_${hora}`;
    const ocupaciones = mapaOcupacion[key] || [];

    if (horaStr === configGrilla.almuerzoInicio) return 'rojo';

    // Aula occupancy check: if all aulas are occupied in this slot
    if (aulas.length > 0) {
      const aulasOcupadas = new Set(
        ocupaciones.filter((o: any) => o.aulaId).map((o: any) => Number(o.aulaId))
      );
      if (aulasOcupadas.size >= aulas.length) {
        return 'rojo';
      }
    }

    const targetDocenteId = docente?.id;
    if (!targetDocenteId) return 'verde';

    if (ocupaciones.some((o: any) => Number(o.docenteId) === Number(targetDocenteId))) {
      return 'rojo';
    }

    const ocupacionesLectivas = ocupaciones.filter((o: any) => o.tipoClase !== 'no_lectiva');
    const gruposOcupados = gruposDocente.filter((mg: any) =>
      ocupacionesLectivas.some((o: any) =>
        Number(o.carreraId) === Number(mg.carreraId) &&
        String(o.cicloAcademico) === String(mg.cicloAcademico) &&
        Number(o.docenteId) !== Number(targetDocenteId)
      )
    );

    if (gruposOcupados.length === gruposDocente.length && gruposDocente.length > 0) return 'rojo';
    if (gruposOcupados.length > 0) return 'amarillo';

    // Partial aula occupancy: some aulas are occupied but not all
    if (aulas.length > 0) {
      const aulasOcupadas = new Set(
        ocupaciones.filter((o: any) => o.aulaId).map((o: any) => Number(o.aulaId))
      );
      if (aulasOcupadas.size > aulas.length / 2) {
        return 'amarillo';
      }
    }

    return 'verde';
  }, [mapaOcupacion, configGrilla, docente?.id, gruposDocente, aulas]);

  const getColorByDisponibilidad = useCallback((disponibilidad: string) => {
    if (disponibilidad === 'rojo') return 'rgba(239, 68, 68, 0.12)';
    if (disponibilidad === 'amarillo') return 'rgba(245, 158, 11, 0.12)';
    if (disponibilidad === 'verde') return 'rgba(34, 197, 94, 0.08)';
    return 'transparent';
  }, []);

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f8fafc', borderStyle: 'dashed' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Progreso de Horarios
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {Math.round(completionPercent)}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={completionPercent}
            color={completionPercent >= 100 ? 'success' : completionPercent > 0 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }} />
        </CardContent>
      </Card>

      {/* Leyenda de disponibilidad */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#5f6368', fontSize: '0.7rem', mb: 0.5, letterSpacing: 1 }}>
          LEYENDA
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.3, bgcolor: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', fontSize: '0.65rem' }}>DISPONIBLE</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.3, bgcolor: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#9a3412', fontSize: '0.65rem' }}>PARCIALMENTE OCUPADO</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.3, bgcolor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.65rem' }}>NO DISPONIBLE / CRUCE</Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={32} sx={{ color: '#003366' }} />
        </Box>
      ) : (
        <TableContainer
          ref={tableRef}
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3, border: '1px solid #eef2f6',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            overflowX: 'auto', overflowY: 'auto', maxHeight: '55vh',
            userSelect: 'none',
            '&::-webkit-scrollbar': { height: 10, width: 10 },
            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 51, 102, 0.05)', borderRadius: 5 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#003366', borderRadius: 5,
              border: '2px solid rgba(0, 51, 102, 0.05)',
              '&:hover': { bgcolor: '#002244' }
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#003366 rgba(0, 51, 102, 0.05)',
          }}
        >
          <Table stickyHeader sx={{
            width: '100%', minWidth: 650,
            tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0,
            backgroundColor: '#fff',
          }}>
            <colgroup>
              <col style={{ width: 56 }} />
              {diasFiltrados.map(d => <col key={d.id} style={{ width: colWidth }} />)}
              <col style={{ width: 56 }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                  border: 'none', bgcolor: '#003366', height: 48,
                  verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10,
                  fontSize: '0.7rem',
                }}>HORA</TableCell>
                {diasFiltrados.map(dia => (
                  <TableCell key={dia.id} sx={{
                    color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                    border: '1px solid rgba(255,255,255,0.25)', bgcolor: '#003366',
                    position: 'sticky', top: 0, zIndex: 10, fontSize: '0.7rem',
                  }}>
                    {dia.nombre.toUpperCase()}
                  </TableCell>
                ))}
                <TableCell sx={{
                  color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                  border: 'none', bgcolor: '#003366', height: 48,
                  verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10,
                  fontSize: '0.7rem',
                }}>HORA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ height: HORA_SPACER_HEIGHT }}>
                <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
                {diasFiltrados.map(dia => (
                  <TableCell key={dia.id} sx={{ border: 'none', bgcolor: 'transparent', p: 0 }} />
                ))}
                <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
              </TableRow>

              {[...horasFiltradas, configGrilla.horaFin].map((hora, idx) => {
                const isLastLabel = idx === horasFiltradas.length;
                return (
                  <TableRow key={idx} sx={{
                    height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                    '&:nth-of-type(even)': { bgcolor: isLastLabel ? 'transparent' : '#fcfdfe' },
                  }}>
                    <TableCell sx={{
                      fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0,
                      bgcolor: 'white', verticalAlign: 'middle',
                      height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                      position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem',
                    }}>
                      <Box sx={{
                        position: 'absolute', left: 0, right: 0, top: 0,
                        transform: 'translateY(-50%)', zIndex: 4,
                        display: 'flex', justifyContent: 'center',
                      }}>
                        <Typography sx={{
                          fontWeight: 700, color: '#5f6368',
                          fontSize: '0.65rem', p: 0, m: 0,
                        }}>{hora.substring(0, 5)}</Typography>
                      </Box>
                      <Box sx={{
                        position: 'absolute', top: 0, right: 0, height: '1px',
                        width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none',
                      }} />
                    </TableCell>
                    {isLastLabel ? (
                      <TableCell colSpan={numColumnas} sx={{ border: 'none', borderTop: '1px solid #dfe1e5', p: 0 }} />
                    ) : (
                      diasFiltrados.map(dia => {
                        const event = getEventForSlot(dia.id, hora);
                        const isMultipleEvents = Array.isArray(event);
                        const eventsArray = isMultipleEvents ? event : [event];
                        const firstEvent = eventsArray[0];

                        if (firstEvent) {
                          if (firstEvent.isLunch) {
                            const hActual = parseInt(hora.split(':')[0]);
                            const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
                            const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);
                            if (hActual === hAlmInicio) {
                              const d = hAlmFin - hAlmInicio;
                              return (
                                <TableCell key={dia.id} rowSpan={d} sx={{
                                  p: 0, border: '1px solid #dfe1e5', verticalAlign: 'middle',
                                  bgcolor: 'rgba(251, 191, 36, 0.2)', textAlign: 'center',
                                  height: `${d * HORA_ALTURA_FILA}px`,
                                }}>
                                  <Typography sx={{
                                    fontWeight: 800, color: '#b45309', textTransform: 'uppercase',
                                    fontSize: '0.55rem', letterSpacing: 0.5,
                                  }}>ALMUERZO</Typography>
                                </TableCell>
                              );
                            }
                            return null;
                          }

                          const eventsStartingHere = eventsArray.filter(e => isStartTime(e.horaInicio, hora));
                          if (eventsStartingHere.length > 0) {
                            const maxDuration = Math.max(...eventsStartingHere.map(e =>
                              parseInt(e.horaFin.split(':')[0]) - parseInt(e.horaInicio.split(':')[0])));
                            return (
                              <TableCell key={dia.id} rowSpan={maxDuration} sx={{
                                p: 0, border: '1px solid #dfe1e5', verticalAlign: 'top',
                                height: '1px', position: 'relative',
                              }}>
                                <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
                                  {eventsStartingHere.map((evt: any, evtIdx: number) => {
                                    const curso = evt.curso || {};
                                    const t = evt.tipoClase || '';
                                    return (
                                      <Box key={evt.id || evtIdx} sx={{
                                        flex: 1,
                                        height: `${(parseInt(evt.horaFin.split(':')[0]) - parseInt(evt.horaInicio.split(':')[0])) * HORA_ALTURA_FILA}px`,
                                        bgcolor: tipoBg[t] || 'rgba(0,51,102,0.08)',
                                        borderLeft: `3px solid ${tipoColor[t] || '#003366'}`,
                                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                                        p: 0.3, display: 'flex', flexDirection: 'column',
                                        cursor: 'grab', position: 'relative', overflow: 'hidden',
                                        '&:hover': { opacity: 0.9, '& .evt-actions': { opacity: 1 } },
                                      }}
                                        onClick={() => openEditModal(evt)}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Typography sx={{
                                            fontWeight: 800, color: tipoColor[t] || '#003366',
                                            textTransform: 'uppercase', fontSize: '0.45rem', lineHeight: 1,
                                          }}>
                                            {t?.substring(0, 4).toUpperCase() || 'CLASE'}
                                          </Typography>
                                          <Box className="evt-actions" sx={{
                                            display: 'flex', opacity: 0, transition: 'opacity 0.2s', zIndex: 10,
                                          }}>
                                            <IconButton size="small"
                                              onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                                              sx={{ p: 0.1, color: 'inherit' }}>
                                              <EditIcon sx={{ fontSize: '0.6rem' }} />
                                            </IconButton>
                                            <IconButton size="small"
                                              onClick={(e) => { e.stopPropagation(); handleDelete(evt); }}
                                              sx={{ p: 0.1, color: '#d32f2f' }}>
                                              <DeleteIcon sx={{ fontSize: '0.6rem' }} />
                                            </IconButton>
                                          </Box>
                                        </Box>
                                        <Typography sx={{
                                          fontWeight: 700, color: '#333', lineHeight: 1,
                                          fontSize: '0.55rem', mt: 0.1,
                                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                          {curso.nombre || 'S.C.'}
                                        </Typography>
                                        <Typography sx={{
                                          fontSize: '0.5rem', color: '#666', fontWeight: 600, mt: 'auto',
                                          display: 'flex', alignItems: 'center', gap: 0.2,
                                        }}>
                                          <RoomIcon sx={{ fontSize: '0.5rem' }} />
                                          {evt.aula?.nombre || 'S.A.'}
                                          {evt.grupo && ` | ${numberToLetter(evt.grupo.numeroGrupo)}`}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </TableCell>
                            );
                          }
                          return null;
                        }

                        // Celda vacía
                        const slotIdx = idx;
                        const selected = isCellSelected(dia.id, slotIdx);
                        const disponibilidad = getDisponibilidadSlot(dia.id, hora);
                        const colorDisponibilidad = getColorByDisponibilidad(disponibilidad);
                        const isRed = disponibilidad === 'rojo';
                        return (
                          <TableCell key={dia.id} sx={{
                            border: '1px solid #dfe1e5', p: 0,
                            cursor: isRed ? 'not-allowed' : 'crosshair',
                            bgcolor: selected ? 'rgba(0,51,102,0.12)' : colorDisponibilidad,
                            outline: selected ? '2px dashed #003366' : undefined,
                            outlineOffset: selected ? '-1px' : undefined,
                            '&:hover': { bgcolor: selected ? 'rgba(0,51,102,0.18)' : (isRed ? colorDisponibilidad : '#f0f7ff') },
                            height: HORA_ALTURA_FILA,
                          }}
                            onMouseDown={(e) => {
                              if (isRed) return;
                              handleMouseDown(e, dia.id, slotIdx);
                            }}
                          />
                        );
                      })
                    )}
                    <TableCell sx={{
                      fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0,
                      bgcolor: 'white', verticalAlign: 'middle',
                      height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                      position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem',
                    }}>
                      <Box sx={{
                        position: 'absolute', left: 0, right: 0, top: 0,
                        transform: 'translateY(-50%)', zIndex: 4,
                        display: 'flex', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: '0.65rem', p: 0, m: 0 }}>
                          {hora.substring(0, 5)}
                        </Typography>
                      </Box>
                      <Box sx={{
                        position: 'absolute', top: 0, left: 0, height: '1px',
                        width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none',
                      }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.9rem' }}>
            {editHorario ? <EditIcon /> : <AccessTimeIcon />}
            {editHorario ? 'Editar Horario' : 'Asignar Horario'}
          </Box>
          {selectionSummary && (
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 1, px: 1.5, py: 0.3, fontSize: '0.75rem', fontWeight: 600,
            }}>
              {selectionSummary.dia} | {selectionSummary.horaInicio} - {selectionSummary.horaFin}
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="Docente"
                value={docente?.nombreCompleto || ''}
                InputProps={{ readOnly: true, startAdornment: <PersonIcon sx={{ fontSize: '1rem', mr: 0.5, color: '#003366' }} /> }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="Curso"
                value={formData.cursoId && formData.tipoClase ? `${formData.cursoId}-${formData.tipoClase}` : ''}
                onChange={(e) => {
                  const [cId, tClase] = e.target.value.split('-');
                  setFormData(prev => ({ ...prev, cursoId: cId, tipoClase: tClase, grupoId: '', aulaId: '' }));
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SchoolIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar curso...</MenuItem>
                {opcionesCursoTipo
                  .map((op) => {
                    const horasNecesarias = Number(op.horasSemanales) * (op.grupos?.length || 1);
                    const horasHechas = horarios
                      .filter((h: any) => Number(h.cursoId) === Number(op.curso?.id) && h.tipoClase === op.tipoClase)
                      .reduce((sum: number, h: any) => sum + (parseInt(h.horaFin?.split(':')[0] || '0') - parseInt(h.horaInicio?.split(':')[0] || '0')), 0);
                    const completado = horasNecesarias > 0 && horasHechas >= horasNecesarias;
                    const esElMismoDeEdicion = editHorario &&
                      Number(editHorario.cursoId) === Number(op.curso?.id) &&
                      editHorario.tipoClase === op.tipoClase;
                    if (completado && !esElMismoDeEdicion) return null;
                    return { op, horasHechas, horasNecesarias, completado };
                  })
                  .filter(Boolean)
                  .map((item: any) => {
                    const { op, horasHechas, horasNecesarias, completado } = item;
                    return (
                      <MenuItem key={op.key} value={op.key}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {op.curso?.nombre || 'Curso'}
                            </Typography>
                            {completado ? (
                              <Chip label="COMPLETADO" size="small" color="success"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#4cd137', color: 'white' }} />
                            ) : null}
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            {op.tipoClase?.toUpperCase()} | {horasHechas}h de {horasNecesarias}h Semanales asignadas
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Grupo</InputLabel>
                <Select value={formData.grupoId} label="Grupo"
                  onChange={(e) => setFormData(prev => ({ ...prev, grupoId: e.target.value }))}
                  disabled={(() => {
                    const op = opcionesCursoTipo.find(o => o.key === `${formData.cursoId}-${formData.tipoClase}`);
                    return (op?.grupos?.length || 0) <= 1;
                  })()}
                  sx={{
                    '&.Mui-disabled': { bgcolor: 'white !important', color: '#000 !important' },
                    '&.Mui-disabled .MuiInputLabel-root': { color: '#000 !important' },
                    '& .MuiSelect-select.Mui-disabled': { bgcolor: 'white !important', color: '#000 !important', WebkitTextFillColor: '#000 !important' },
                  }}>
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {(() => {
                    const op = opcionesCursoTipo.find(o => o.key === `${formData.cursoId}-${formData.tipoClase}`);
                    return (op?.grupos || []).map((g: any, i: number) => (
                      <MenuItem key={g.id || i} value={g.id || g}>Grupo {numberToLetter(g.numeroGrupo || g)}</MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Aula</InputLabel>
                <Select value={formData.aulaId} label="Aula"
                  onChange={(e) => setFormData(prev => ({ ...prev, aulaId: e.target.value }))}>
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {aulasFiltradas.map((aula: any) => {
                    const isOcupada = aulasOcupadasEnHorario.includes(aula.id);
                    const isAulaActual = editHorario && Number(editHorario.aulaId) === Number(aula.id);
                    return (
                      <MenuItem key={aula.id} value={aula.id}
                        disabled={isOcupada && !isAulaActual}>
                        {aula.nombre} ({aula.tipo}) {isOcupada && !isAulaActual ? '(Ocupada)' : ''}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Hora Fin</InputLabel>
                <Select value={formData.horaFin} label="Hora Fin"
                  onChange={(e) => setFormData(prev => ({ ...prev, horaFin: e.target.value }))}>
                  {horasFinDisponibles.map(h => (
                    <MenuItem key={h} value={h}>{h.substring(0, 5)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eef2f6' }}>
          <Button onClick={handleCloseModal} color="inherit" size="small">Cancelar</Button>
          <Button variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !formData.cursoId || !formData.aulaId || !formData.horaFin}
            sx={{ bgcolor: '#003366', fontWeight: 700, px: 3, fontSize: '0.8rem' }}>
            {saving ? 'Guardando...' : 'Guardar Horario'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
