'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, FormControl, InputLabel, Select, MenuItem, TextField,
  CircularProgress, IconButton,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon, School as SchoolIcon,
  Room as RoomIcon, Person as PersonIcon,
  Edit as EditIcon, Delete as DeleteIcon,
  Save as SaveIcon,
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

interface CalendarioPorAulaProps {
  aula: any;
  cicloId: string;
  usuario: any;
  docentes: any[];
  cargaAcademica: any[];
  horariosCiclo?: any[];
  dragDataRef?: React.MutableRefObject<{ docenteId: string; cursoId: string; tipoClase: string; horasSemanales: number }>;
  onHorarioCreated?: () => void;
}

export default function CalendarioPorAula({
  aula,
  cicloId,
  usuario,
  docentes,
  cargaAcademica,
  horariosCiclo,
  dragDataRef,
  onHorarioCreated,
}: CalendarioPorAulaProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapaOcupacion, setMapaOcupacion] = useState<any>({});

  useEffect(() => {
    const handler = () => setDropTarget(null);
    window.addEventListener('dragend', handler);
    return () => window.removeEventListener('dragend', handler);
  }, []);

  const [configGrilla, setConfigGrilla] = useState<any>({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6],
  });

  const [openModal, setOpenModal] = useState(false);
  const [editHorario, setEditHorario] = useState<any>(null);
  interface FormData {
    docenteId: string;
    cursoId: string;
    tipoClase: string;
    grupoId: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  }
  const [formData, setFormData] = useState<FormData>({
    docenteId: '', cursoId: '', tipoClase: '', grupoId: '',
    diaSemana: 0, horaInicio: '', horaFin: '',
  });
  const [selectionSummary, setSelectionSummary] = useState<any>(null);

  const [dropTarget, setDropTarget] = useState<{ day: number; hour: string; duracion: number } | null>(null);

  const getGrupoNombre = useCallback((evt: any) => {
    if (evt.grupo) return numberToLetter(evt.grupo.numeroGrupo);
    if (!evt.grupoId) return null;
    for (const ce of cargaAcademica) {
      for (const asig of (ce.asignaciones || [])) {
        if (String(asig.docenteId) === String(evt.docenteId) &&
            String(ce.curso?.id) === String(evt.cursoId) &&
            asig.tipoClase === evt.tipoClase) {
          const g = (asig.grupos || []).find((g: any) => String(g.id) === String(evt.grupoId));
          if (g) return numberToLetter(g.numeroGrupo);
        }
      }
    }
    return null;
  }, [cargaAcademica]);

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

  useEffect(() => {
    if (!cicloId) return;
    api.get('/horarios/mapa-ocupacion', { params: { cicloId } }).then(res => {
      setMapaOcupacion(res.data || {});
    }).catch(() => {});
  }, [cicloId]);

  const fetchHorarios = useCallback(async () => {
    if (!cicloId || !aula?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/horarios', {
        params: { cicloId, aulaId: aula.id }
      });
      setHorarios(res.data || []);
    } catch {
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  }, [cicloId, aula?.id]);

  useEffect(() => {
    fetchHorarios();
  }, [fetchHorarios]);

  const diasFiltrados = useMemo(() =>
    DIAS.filter(d => configGrilla.diasActivos.includes(d.id)),
  [configGrilla.diasActivos]);

  const horasFiltradas = useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    return Array.from({ length: end - start }, (_, i) =>
      `${String(start + i).padStart(2, '0')}:00`);
  }, [configGrilla.horaInicio, configGrilla.horaFin]);

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

  const openCreateModal = useCallback((dia: number, hInicio: string, hFin: string, prefilled?: { docenteId?: string; cursoId?: string; tipoClase?: string }) => {
    setEditHorario(null);
    setFormData({
      docenteId: prefilled?.docenteId || '',
      cursoId: prefilled?.cursoId || '',
      tipoClase: prefilled?.tipoClase || '',
      grupoId: '',
      diaSemana: dia,
      horaInicio: hInicio,
      horaFin: hFin,
    });
    setSelectionSummary({ dia: DIAS.find(d => d.id === dia)?.nombre || '', horaInicio: hInicio, horaFin: hFin });
    setOpenModal(true);
  }, []);

  const openEditModal = useCallback((horario: any) => {
    setEditHorario(horario);
    setFormData({
      docenteId: String(horario.docenteId || ''),
      cursoId: String(horario.cursoId || ''),
      tipoClase: horario.tipoClase || '',
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

  const handleSave = async () => {
    if (!formData.docenteId || !formData.cursoId || !formData.tipoClase || !formData.horaInicio || !formData.horaFin) return;
    setSaving(true);
    try {
      const payload = {
        docenteId: Number(formData.docenteId),
        cicloId: Number(cicloId),
        diaSemana: formData.diaSemana,
        horaInicio: formData.horaInicio + ':00',
        horaFin: formData.horaFin + ':00',
        tipoClase: formData.tipoClase,
        cursoId: Number(formData.cursoId),
        aulaId: aula.id,
        grupoId: formData.grupoId ? Number(formData.grupoId) : undefined,
      };
      if (editHorario) {
        await api.put(`/horarios/${editHorario.id}`, payload);
      } else {
        await api.post('/horarios', payload);
      }
      handleCloseModal();
      await fetchHorarios();
      onHorarioCreated?.();
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
        onHorarioCreated?.();
        MySwal.fire('Eliminado', 'El horario ha sido eliminado.', 'success');
      } catch (error: any) {
        MySwal.fire({ icon: 'error', title: 'Error', text: error?.response?.data?.message || 'Error al eliminar horario' });
      }
    }
  };

  const opcionesCursoTipo = useMemo(() => {
    if (!formData.docenteId) return [];
    const opciones: any[] = [];
    const docenteId = Number(formData.docenteId);
    cargaAcademica.forEach((ce: any) => {
      ce.asignaciones.forEach((a: any) => {
        if (Number(a.docenteId) !== docenteId) return;
        opciones.push({
          curso: ce.curso || {},
          tipoClase: a.tipoClase,
          horasSemanales: a.horasSemanales,
          grupos: a.grupos,
          key: `${ce.curso?.id || ce.id}-${a.tipoClase}`,
          docenteId: a.docenteId,
        });
      });
    });
    return opciones;
  }, [cargaAcademica, formData.docenteId]);

  const horasFinDisponibles = useMemo(() => {
    const idx = horasFiltradas.indexOf(formData.horaInicio);
    if (idx === -1) return [];
    const base = horasFiltradas.slice(idx + 1);
    if (base[base.length - 1] !== configGrilla.horaFin) {
      base.push(configGrilla.horaFin);
    }
    return base;
  }, [horasFiltradas, formData.horaInicio, configGrilla.horaFin]);

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
        if (op.grupos?.length > 0 && (!formData.grupoId || editHorario)) {
          setFormData(prev => ({ ...prev, grupoId: String(op.grupos[0].id || op.grupos[0]) }));
        }
      }
    }
  }, [formData.cursoId, formData.tipoClase, formData.horaInicio, configGrilla.horaFin, configGrilla.horaInicio]);

  const numColumnas = diasFiltrados.length;
  const colWidth = `calc((100% - 120px) / ${numColumnas})`;

  const isSlotOcupado = useCallback((dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    const key = `${dia}_${hora}`;
    const ocupaciones = mapaOcupacion[key] || [];
    return ocupaciones.some((o: any) => Number(o.aulaId) === Number(aula.id));
  }, [mapaOcupacion, aula.id]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <TableContainer
          component={Paper}
          elevation={0}
          onDragLeave={() => setDropTarget(null)}
          sx={{
            flex: 1, borderRadius: 3, border: '1px solid #eef2f6',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            overflowX: 'auto', overflowY: 'auto',
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
                                      {(() => {
                                        const gn = getGrupoNombre(evt);
                                        return gn ? (
                                          <Typography sx={{
                                            fontWeight: 600, color: '#555', lineHeight: 1,
                                            fontSize: '0.5rem', mt: 0.1,
                                          }}>
                                            Grupo {gn}
                                          </Typography>
                                        ) : null;
                                      })()}
                                      <Typography sx={{
                                        fontSize: '0.5rem', color: '#666', fontWeight: 600, mt: 'auto',
                                        display: 'flex', alignItems: 'center', gap: 0.2,
                                      }}>
                                        <PersonIcon sx={{ fontSize: '0.5rem' }} />
                                        {evt.docente?.nombreCompleto || evt.docente?.nombre || 'S.D.'}
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

                      const slotIdx = idx;
                      const isDropTarget = (() => {
                        if (!dropTarget || dropTarget.day !== dia.id) return false;
                        const startIdx = horasFiltradas.indexOf(dropTarget.hour);
                        if (startIdx < 0) return false;
                        return slotIdx >= startIdx && slotIdx < startIdx + dropTarget.duracion;
                      })();
                      const ocupado = isSlotOcupado(dia.id, hora);
                      return (
                        <TableCell key={dia.id} sx={{
                          border: '1px solid #dfe1e5', p: 0,
                          cursor: ocupado ? 'not-allowed' : 'pointer',
                          bgcolor: isDropTarget ? 'rgba(0,51,102,0.12)' : (ocupado ? 'rgba(239, 68, 68, 0.12)' : 'transparent'),
                          outline: isDropTarget ? '2px dashed #003366' : undefined,
                          outlineOffset: isDropTarget ? '-1px' : undefined,
                          '&:hover': { bgcolor: isDropTarget ? 'rgba(0,51,102,0.18)' : (ocupado ? 'rgba(239, 68, 68, 0.12)' : '#f0f7ff') },
                          height: HORA_ALTURA_FILA,
                        }}
                          onDragOver={(e) => {
                            if (ocupado) return;
                            e.preventDefault();
                            const duracion = parseInt(e.dataTransfer.getData('horasSemanales') || '') || dragDataRef?.current?.horasSemanales || 1;
                            setDropTarget({ day: dia.id, hour: hora, duracion });
                          }}
                          onDragLeave={() => {}}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setDropTarget(null);
                            if (ocupado) return;
                            const docenteId = e.dataTransfer.getData('docenteId') || dragDataRef?.current?.docenteId || '';
                            const cursoId = e.dataTransfer.getData('cursoId') || dragDataRef?.current?.cursoId || '';
                            const tipoClase = e.dataTransfer.getData('tipoClase') || dragDataRef?.current?.tipoClase || '';
                            const horasSemanales = parseInt(e.dataTransfer.getData('horasSemanales') || '') || dragDataRef?.current?.horasSemanales || 1;
                            if (!docenteId || !cursoId || !tipoClase) return;
                            const targetIdx = slotIdx + horasSemanales;
                            const hFin = targetIdx >= horasFiltradas.length ? configGrilla.horaFin : horasFiltradas[targetIdx];
                            // Buscar todos los grupos de esta asignación en cargaAcademica
                            let todosGrupos: any[] = [];
                            for (const ce of cargaAcademica) {
                              if (String(ce.curso?.id) === cursoId) {
                                for (const asig of (ce.asignaciones || [])) {
                                  if (asig.tipoClase === tipoClase && String(asig.docenteId) === docenteId) {
                                    todosGrupos = asig.grupos || [];
                                  }
                                }
                              }
                            }
                            if (todosGrupos.length === 0) return;
                            // Grupos ya asignados en cualquier aula (desde horariosCiclo)
                            const assigned = new Set(
                              (horariosCiclo || []).filter((h: any) =>
                                String(h.docenteId) === docenteId &&
                                String(h.cursoId) === cursoId &&
                                h.tipoClase === tipoClase &&
                                h.grupoId
                              ).map((h: any) => String(h.grupoId))
                            );
                            const restantes = todosGrupos.filter((g: any) => !assigned.has(String(g.id || g))).sort((a: any, b: any) => a.numeroGrupo - b.numeroGrupo);
                            if (restantes.length === 0) return;
                            const grupoFinal = restantes[0];
                            // Auto-crear si solo queda 1 grupo
                            if (restantes.length === 1) {
                              setSaving(true);
                              try {
                                await api.post('/horarios', {
                                  docenteId: Number(docenteId),
                                  cicloId: Number(cicloId),
                                  diaSemana: dia.id,
                                  horaInicio: hora + ':00',
                                  horaFin: hFin + ':00',
                                  tipoClase,
                                  cursoId: Number(cursoId),
                                  aulaId: aula.id,
                                  grupoId: Number(grupoFinal.id || grupoFinal) || undefined,
                                });
                                await fetchHorarios();
                                onHorarioCreated?.();
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Error al crear horario';
                                MySwal.fire({ icon: 'error', title: 'Error', text: msg });
                              } finally {
                                setSaving(false);
                              }
                            } else {
                              openCreateModal(dia.id, hora, hFin, { docenteId, cursoId, tipoClase });
                            }
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
              {selectionSummary.dia} | {selectionSummary.horaInicio} - {selectionSummary.horaFin} | {aula.nombre}
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Docente</InputLabel>
                <Select value={formData.docenteId} label="Docente"
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, docenteId: e.target.value, cursoId: '', tipoClase: '', grupoId: '' }));
                  }}
                >
                  <MenuItem value="">Seleccionar docente...</MenuItem>
                  {docentes.map((d: any) => (
                    <MenuItem key={d.id} value={String(d.id)}>{d.nombreCompleto || d.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="Curso"
                value={formData.cursoId && formData.tipoClase ? `${formData.cursoId}-${formData.tipoClase}` : ''}
                onChange={(e) => {
                  const [cId, tClase] = e.target.value.split('-');
                  setFormData(prev => ({ ...prev, cursoId: cId, tipoClase: tClase, grupoId: '' }));
                }}
                disabled={!formData.docenteId}
              >
                <MenuItem value="">Seleccionar curso...</MenuItem>
                {opcionesCursoTipo
                  .filter(Boolean)
                  .map((op: any, i: number) => (
                    <MenuItem key={op.key || i} value={op.key}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {op.curso?.nombre || 'Curso'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {op.tipoClase?.toUpperCase()} | {Number(op.horasSemanales) * (op.grupos?.length || 1)}h Semanales
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Aula"
                value={aula?.nombre || ''}
                InputProps={{
                  readOnly: true,
                  startAdornment: <RoomIcon sx={{ fontSize: '1rem', mr: 0.5, color: '#003366' }} />,
                }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Grupo</InputLabel>
                <Select value={formData.grupoId} label="Grupo"
                  onChange={(e) => setFormData(prev => ({ ...prev, grupoId: e.target.value }))}
                  sx={{
                    '&.Mui-disabled': { bgcolor: 'white !important', color: '#000 !important' },
                    '&.Mui-disabled .MuiInputLabel-root': { color: '#000 !important' },
                    '& .MuiSelect-select.Mui-disabled': { bgcolor: 'white !important', color: '#000 !important', WebkitTextFillColor: '#000 !important' },
                  }}>
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {(() => {
                    const op = opcionesCursoTipo.find(o => o.key === `${formData.cursoId}-${formData.tipoClase}`);
                    if (!op) return null;
                    // En edición mostrar todos; en creación filtrar los ya asignados
                    const assigned = editHorario ? new Map() : new Map(
                      (horariosCiclo || [])
                        .filter((h: any) =>
                          String(h.docenteId) === formData.docenteId &&
                          String(h.cursoId) === formData.cursoId &&
                          h.tipoClase === formData.tipoClase &&
                          h.grupoId
                        )
                        .map((h: any) => [String(h.grupoId), true])
                    );
                    return (op.grupos || []).filter((g: any) => editHorario || !assigned.has(String(g.id || g))).sort((a: any, b: any) => a.numeroGrupo - b.numeroGrupo).map((g: any, i: number) => (
                      <MenuItem key={g.id || i} value={String(g.id || g)}>Grupo {numberToLetter(g.numeroGrupo || g)}</MenuItem>
                    ));
                  })()}
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
            disabled={saving || !formData.docenteId || !formData.cursoId || !formData.horaFin}
            sx={{ bgcolor: '#003366', fontWeight: 700, px: 3, fontSize: '0.8rem' }}>
            {saving ? 'Guardando...' : 'Guardar Horario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
