'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tooltip,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { DIAS } from '@/app/horarios/constantes';
import ModalAsignarNoLectiva from './ModalAsignarNoLectiva';

const ACTIVIDAD_LABELS: Record<string, string> = {
  'Preparación y Evaluación (PE)': 'Preparación y Evaluación',
  'Tutoría y Consejería (TC)': 'Tutoría y Consejería',
  'Investigación (INV)': 'Investigación',
  'Formación Académica y Capacitación (FAC)': 'Formación Académica y Capacitación',
  'Actividades de Gobierno o de Autoridad (AGA)': 'Actividades de Gobierno o de Autoridad',
  'ADMINISTRACIÓN ACADÉMICA': 'Administración Académica',
  'Asesoría de Tesis y Exámenes Profesionales (ATEP)': 'Asesoría de Tesis y Exámenes Profesionales',
  'Responsabilidad Social Universitaria (RSU)': 'Responsabilidad Social Universitaria',
  'Comités y Comisiones Especiales (CC)': 'Comités y Comisiones Especiales',
  'Actividades de Gestión Institucional (AAAI)': 'Actividades de Gestión Institucional',
  'Autoevaluación/Acreditación Esc. Profesional (AAEP)': 'Autoevaluación/Acreditación',
};

const ACTIVIDAD_ABREVIATURAS: Record<string, string> = {
  'Preparación y Evaluación (PE)': 'PE',
  'Tutoría y Consejería (TC)': 'TC',
  'Investigación (INV)': 'INV',
  'Formación Académica y Capacitación (FAC)': 'FAC',
  'Actividades de Gobierno o de Autoridad (AGA)': 'AGA',
  'ADMINISTRACIÓN ACADÉMICA': 'AA',
  'Asesoría de Tesis y Exámenes Profesionales (ATEP)': 'ATEP',
  'Responsabilidad Social Universitaria (RSU)': 'RSU',
  'Comités y Comisiones Especiales (CC)': 'CC',
  'Actividades de Gestión Institucional (AAAI)': 'AAAI',
  'Autoevaluación/Acreditación Esc. Profesional (AAEP)': 'AAEP',
};

const LABEL_TO_FIELD: Record<string, string> = {};
Object.entries({
  horasPreparacion: 'Preparación y Evaluación (PE)',
  horasTutoria: 'Tutoría y Consejería (TC)',
  horasInvestigacion: 'Investigación (INV)',
  horasCapacitacion: 'Formación Académica y Capacitación (FAC)',
  horasGobierno: 'Actividades de Gobierno o de Autoridad (AGA)',
  horasAdministracion: 'ADMINISTRACIÓN ACADÉMICA',
  horasAsesoria: 'Asesoría de Tesis y Exámenes Profesionales (ATEP)',
  horasResponsabilidadSocial: 'Responsabilidad Social Universitaria (RSU)',
  horasComites: 'Comités y Comisiones Especiales (CC)',
  horasAaai: 'Actividades de Gestión Institucional (AAAI)',
  horasAaep: 'Autoevaluación/Acreditación Esc. Profesional (AAEP)',
}).forEach(([k, v]) => { LABEL_TO_FIELD[v] = k; });

const NO_LECTIVA_ACTIVITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Preparación y Evaluación (PE)': { bg: 'rgba(124, 58, 237, 0.08)', border: '#7c3aed', text: '#7c3aed' },
  'Tutoría y Consejería (TC)': { bg: 'rgba(8, 145, 178, 0.08)', border: '#0891b2', text: '#0891b2' },
  'Investigación (INV)': { bg: 'rgba(5, 150, 105, 0.08)', border: '#059669', text: '#059669' },
  'Formación Académica y Capacitación (FAC)': { bg: 'rgba(217, 119, 6, 0.08)', border: '#d97706', text: '#d97706' },
  'Actividades de Gobierno o de Autoridad (AGA)': { bg: 'rgba(220, 38, 38, 0.08)', border: '#dc2626', text: '#dc2626' },
  'ADMINISTRACIÓN ACADÉMICA': { bg: 'rgba(37, 99, 235, 0.08)', border: '#2563eb', text: '#2563eb' },
  'Asesoría de Tesis y Exámenes Profesionales (ATEP)': { bg: 'rgba(219, 39, 119, 0.08)', border: '#db2777', text: '#db2777' },
  'Responsabilidad Social Universitaria (RSU)': { bg: 'rgba(101, 163, 13, 0.08)', border: '#65a30d', text: '#65a30d' },
  'Comités y Comisiones Especiales (CC)': { bg: 'rgba(147, 51, 234, 0.08)', border: '#9333ea', text: '#9333ea' },
  'Actividades de Gestión Institucional (AAAI)': { bg: 'rgba(79, 70, 229, 0.08)', border: '#4f46e5', text: '#4f46e5' },
  'Autoevaluación/Acreditación Esc. Profesional (AAEP)': { bg: 'rgba(234, 179, 8, 0.08)', border: '#eab308', text: '#eab308' },
};

interface NoLectivaHorario {
  tempId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  actividadNoLectiva: string;
  aulaId?: number;
  aulaNombre?: string;
}

interface ActividadInfo {
  field: string;
  label: string;
  horasDeclaradas: number;
}

interface CalendarioCargaNoLectivaProps {
  open: boolean;
  onClose: () => void;
  onSave: (horarios: NoLectivaHorario[]) => void;
  docenteId: number;
  cicloId: number;
  actividades: ActividadInfo[];
  horariosActuales: NoLectivaHorario[];
  detallesMap: Record<string, string>;
  readOnly?: boolean;
}

const HORA_ALTURA_FILA = 48;
const HORA_SPACER_HEIGHT = 24;

export default function CalendarioCargaNoLectiva({
  open, onClose, onSave, docenteId, cicloId, actividades, horariosActuales, detallesMap, readOnly = false,
}: CalendarioCargaNoLectivaProps) {
  const [lectivaHorarios, setLectivaHorarios] = useState<any[]>([]);
  const [horariosTemp, setHorariosTemp] = useState<NoLectivaHorario[]>([]);
  const [editHorario, setEditHorario] = useState<NoLectivaHorario | null>(null);
  const [dragStart, setDragStart] = useState<{ day: string; idx: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: string; idx: number } | null>(null);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectRange, setSelectRange] = useState<{ dia: string; horaInicio: string; horaFin: string } | null>(null);
  const isDragging = useRef(false);
  const dragDay = useRef<string | null>(null);
  const [tempIdCounter, setTempIdCounter] = useState(0);
  const [configGrilla, setConfigGrilla] = useState({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6] as number[],
  });
  const diasFiltrados = useMemo(() => DIAS.filter(d => configGrilla.diasActivos.includes(d.id)), [configGrilla.diasActivos]);
  const horasFiltradas = useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    return Array.from({ length: end - start }, (_, i) =>
      `${String(start + i).padStart(2, '0')}:00`);
  }, [configGrilla.horaInicio, configGrilla.horaFin]);
  const isLunchHora = useCallback((hora: string) => {
    const h = parseInt(hora.split(':')[0]);
    const aI = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
    const aF = parseInt(configGrilla.almuerzoFin.split(':')[0]);
    return h >= aI && h < aF;
  }, [configGrilla.almuerzoInicio, configGrilla.almuerzoFin]);

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
    if (open) {
      setHorariosTemp(horariosActuales.map(h => ({ ...h })));
      const maxId = horariosActuales.reduce((max, h) => {
        const match = h.tempId.match(/^temp_(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      setTempIdCounter(maxId);
      setLectivaHorarios([]);
      setDragStart(null);
      setDragEnd(null);
      setSelectDialogOpen(false);
      setSelectRange(null);
      isDragging.current = false;
      dragDay.current = null;
      fetchLectivaHorarios();
    }
  }, [open]);

  const fetchLectivaHorarios = async () => {
    try {
      const res = await api.get('/horarios', {
        params: { docenteId, cicloId },
      });
      const lectiva = (res.data || []).filter(
        (h: any) => h.tipoClase !== 'no_lectiva'
      );
      setLectivaHorarios(lectiva);
    } catch {
      setLectivaHorarios([]);
    }
  };

  const isSlotOccupiedByLectiva = (dia: string, hora: string) => {
    return lectivaHorarios.some((h: any) => {
      const hDia = DIAS.find(d => d.id === h.diaSemana)?.nombre;
      if (hDia !== dia) return false;
      const hInicio = h.horaInicio.substring(0, 5);
      const hFin = h.horaFin.substring(0, 5);
      return hora >= hInicio && hora < hFin;
    });
  };

  const getNoLectivaForSlot = (dia: string, hora: string) => {
    return horariosTemp.find(h => {
      if (h.dia !== dia) return false;
      return hora >= h.horaInicio && hora < h.horaFin;
    });
  };

  const getSlotClassName = (dia: string, hora: string, idx: number) => {
    if (isSlotOccupiedByLectiva(dia, hora)) return 'ocupado-lectiva';
    if (getNoLectivaForSlot(dia, hora)) return 'ocupado-nolectiva';
    if (isLunchHora(hora)) return 'almuerzo';
    if (dragStart && dragEnd && dragStart.day === dia && dragEnd.day === dia) {
      const minI = Math.min(dragStart.idx, dragEnd.idx);
      const maxI = Math.max(dragStart.idx, dragEnd.idx);
      if (idx >= minI && idx <= maxI) return 'seleccionado';
    }
    return 'libre';
  };

  const handleMouseDown = (dia: string, idx: number) => {
    if (readOnly) return;
    const hora = horasFiltradas[idx];
    if (!hora) return;
    const cls = getSlotClassName(dia, hora, idx);
    if (cls === 'ocupado-lectiva' || cls === 'ocupado-nolectiva' || cls === 'almuerzo') return;
    isDragging.current = true;
    dragDay.current = dia;
    setDragStart({ day: dia, idx });
    setDragEnd({ day: dia, idx });
  };

  const handleMouseEnter = (dia: string, idx: number) => {
    if (!isDragging.current || dragDay.current !== dia) return;
    const hora = horasFiltradas[idx];
    if (!hora) return;
    setDragEnd({ day: dia, idx });
  };

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragStart && dragEnd && dragStart.day === dragEnd.day) {
      const minI = Math.min(dragStart.idx, dragEnd.idx);
      const maxI = Math.max(dragStart.idx, dragEnd.idx);
      const dia = dragStart.day;
      const horaInicio = horasFiltradas[minI];
      const horaFin = maxI + 1 < horasFiltradas.length ? horasFiltradas[maxI + 1] : configGrilla.horaFin;
      setSelectRange({ dia, horaInicio, horaFin });
      setDragStart(null);
      setDragEnd(null);
      const allFree = Array.from({ length: maxI - minI + 1 }, (_, i) => minI + i)
        .every(idx => {
          const h = horasFiltradas[idx];
          if (!h) return false;
          if (isSlotOccupiedByLectiva(dia, h)) return false;
          if (getNoLectivaForSlot(dia, h)) return false;
          if (isLunchHora(h)) return false;
          return true;
        });
      if (allFree) {
        setSelectDialogOpen(true);
      } else {
        setSelectRange(null);
      }
    } else {
      setDragStart(null);
      setDragEnd(null);
    }
  }, [dragStart, dragEnd]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleRemoveHorario = (tempId: string) => {
    if (readOnly) return;
    const updated = horariosTemp.filter(h => h.tempId !== tempId);
    setHorariosTemp(updated);
    onSave(updated);
  };

  const handleEditHorario = (horario: NoLectivaHorario) => {
    setEditHorario(horario);
    setSelectDialogOpen(true);
  };

  const handleAsignarActividad = (data: { tempId?: string; actividadNoLectiva: string; aulaId: number; aulaNombre?: string; dia: number; horaInicio: string; horaFin: string }) => {
    const diaNombre = DIAS.find(d => d.id === data.dia)?.nombre || '';
    if (data.tempId) {
      const updated = horariosTemp.map(h =>
        h.tempId === data.tempId
          ? { ...h, dia: diaNombre, horaInicio: data.horaInicio, horaFin: data.horaFin, actividadNoLectiva: data.actividadNoLectiva, aulaId: data.aulaId, aulaNombre: data.aulaNombre }
          : h
      );
      setHorariosTemp(updated);
      onSave(updated);
    } else {
      const newId = tempIdCounter + 1;
      setTempIdCounter(newId);
      const nuevo: NoLectivaHorario = {
        tempId: `temp_${newId}`,
        dia: diaNombre,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        actividadNoLectiva: data.actividadNoLectiva,
        aulaId: data.aulaId,
        aulaNombre: data.aulaNombre,
      };
      const updated = [...horariosTemp, nuevo];
      setHorariosTemp(updated);
      onSave(updated);
    }
    setEditHorario(null);
    setSelectDialogOpen(false);
    setSelectRange(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#003366', color: '#fff', py: 2, px: 3 }}>
          Asignar Horarios — Carga No Lectiva
        </DialogTitle>
        <DialogContent sx={{ pt: 5, pb: 3, px: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, pt: 2 }}>
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
          <TableContainer component={Paper} elevation={0} sx={{
            borderRadius: 3, border: '1px solid #eef2f6',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            overflowX: 'auto', overflowY: 'auto', maxHeight: '55vh',
            userSelect: 'none',
            '&::-webkit-scrollbar': { height: 10, width: 10 },
            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 51, 102, 0.05)', borderRadius: 5 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#003366', borderRadius: 5,
              border: '2px solid rgba(0, 51, 102, 0.05)',
              '&:hover': { bgcolor: '#002244' },
            },
            scrollbarWidth: 'thin' as const,
            scrollbarColor: '#003366 rgba(0, 51, 102, 0.05)',
          }}>
            <Table stickyHeader sx={{
              width: '100%', minWidth: 650,
              tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0,
              backgroundColor: '#fff',
            }}>
              <colgroup>
                <col style={{ width: 56 }} />
                {diasFiltrados.map(d => <col key={d.id} style={{ width: `calc((100% - 120px) / ${diasFiltrados.length})` }} />)}
                <col style={{ width: 56 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5, border: 'none', bgcolor: '#003366', height: 48, verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.7rem' }}>
                    HORA
                  </TableCell>
                  {diasFiltrados.map(d => (
                    <TableCell key={d.id} sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5, border: '1px solid rgba(255,255,255,0.25)', bgcolor: '#003366', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.7rem' }}>
                      {d.nombre.toUpperCase()}
                    </TableCell>
                  ))}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5, border: 'none', bgcolor: '#003366', height: 48, verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10, fontSize: '0.7rem' }}>
                    HORA
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ height: HORA_SPACER_HEIGHT }}>
                  <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
                  {diasFiltrados.map(d => <TableCell key={d.id} sx={{ border: 'none', bgcolor: 'transparent', p: 0 }} />)}
                  <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
                </TableRow>
                {[...horasFiltradas, configGrilla.horaFin].map((hora, idx) => {
                  const isLastLabel = idx === horasFiltradas.length;
                  return (
                    <TableRow key={idx} sx={{
                      height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                      '&:nth-of-type(even)': { bgcolor: isLastLabel ? 'transparent' : '#fcfdfe' },
                    }}>
                      <TableCell sx={{ fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0, bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem' }}>
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                          <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: '0.65rem', p: 0, m: 0 }}>
                            {hora.substring(0, 5)}
                          </Typography>
                        </Box>
                        <Box sx={{ position: 'absolute', top: 0, right: 0, height: '1px', width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }} />
                      </TableCell>
                      {isLastLabel ? (
                        <TableCell colSpan={diasFiltrados.length} sx={{ border: 'none', borderTop: '1px solid #dfe1e5', p: 0 }} />
                      ) : (
                        diasFiltrados.map(dia => {
                          if (isLunchHora(hora)) {
                            const hActual = parseInt(hora.split(':')[0]);
                            const aI = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
                            const aF = parseInt(configGrilla.almuerzoFin.split(':')[0]);
                            if (hActual === aI) {
                              const d = aF - aI;
                              return (
                                <TableCell key={dia.id} rowSpan={d} sx={{
                                  border: '1px solid #dfe1e5', p: 0, verticalAlign: 'middle',
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
                          const slotClass = getSlotClassName(dia.nombre, hora, idx);
                          const noLectiva = getNoLectivaForSlot(dia.nombre, hora);
                          const isSelected = slotClass === 'seleccionado';

                          if (slotClass === 'ocupado-nolectiva' && noLectiva && noLectiva.horaInicio === hora) {
                            const dur = parseInt(noLectiva.horaFin.split(':')[0]) - parseInt(noLectiva.horaInicio.split(':')[0]);
                            const col = NO_LECTIVA_ACTIVITY_COLORS[noLectiva.actividadNoLectiva] || NO_LECTIVA_ACTIVITY_COLORS['Preparación y Evaluación (PE)'];
                            const abrev = ACTIVIDAD_ABREVIATURAS[noLectiva.actividadNoLectiva] || '';
                            const field = LABEL_TO_FIELD[noLectiva.actividadNoLectiva] || '';
                            const detalle = detallesMap[field] || '';
                            const fullName = ACTIVIDAD_LABELS[noLectiva.actividadNoLectiva] || noLectiva.actividadNoLectiva;
                            const showDetalle = dur >= 3 && detalle.length > 0;
                            const tooltipText = `${fullName} (${abrev})\n${detalle}\n${noLectiva.aulaNombre ? noLectiva.aulaNombre + ' ' : ''}${noLectiva.horaInicio}-${noLectiva.horaFin}`;
                            return (
                              <TableCell key={dia.id} rowSpan={dur} sx={{
                                border: '1px solid #dfe1e5', p: 0, verticalAlign: 'top',
                                bgcolor: col.bg,
                                height: '1px',
                                position: 'relative',
                              }}
                                onMouseDown={() => handleMouseDown(dia.nombre, idx)}
                                onMouseEnter={() => handleMouseEnter(dia.nombre, idx)}
                              >
                                <Box
                                  onClick={() => handleEditHorario(noLectiva)}
                                  sx={{
                                    height: `${dur * HORA_ALTURA_FILA}px`,
                                    borderLeft: `3px solid ${col.border}`,
                                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                                    p: 0.3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    '&:hover': { '& .evt-actions': { opacity: 1 } },
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Tooltip title={tooltipText}>
                                      <Typography sx={{
                                        fontWeight: 700, color: col.text,
                                        fontSize: '0.6rem', lineHeight: 1.2,
                                        wordBreak: 'break-word', overflow: 'hidden',
                                      }}>
                                        {`${fullName} (${abrev})`}
                                      </Typography>
                                    </Tooltip>
                                    <Box className="evt-actions" sx={{
                                      display: 'flex', opacity: 0, transition: 'opacity 0.2s', zIndex: 10, flexShrink: 0,
                                    }}>
                                      <IconButton size="small"
                                        onClick={(e) => { e.stopPropagation(); handleEditHorario(noLectiva); }}
                                        sx={{ p: 0.1, color: col.text }}
                                      >
                                        <EditIcon sx={{ fontSize: '0.6rem' }} />
                                      </IconButton>
                                      <IconButton size="small"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveHorario(noLectiva.tempId); }}
                                        sx={{ p: 0.1, color: '#d32f2f' }}
                                      >
                                        <DeleteIcon sx={{ fontSize: '0.6rem' }} />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                  {showDetalle && (
                                    <Typography sx={{
                                      fontWeight: 500, color: '#555',
                                      fontSize: '0.5rem', lineHeight: 1.2, mt: 0.2,
                                      wordBreak: 'break-word', overflow: 'hidden',
                                    }}>
                                      {detalle}
                                    </Typography>
                                  )}
                                  {noLectiva.aulaNombre && (
                                    <Typography sx={{
                                      fontSize: '0.6rem', fontWeight: 700, color: '#333',
                                      wordBreak: 'break-word', overflow: 'hidden', mt: 0.2,
                                    }}>
                                      {noLectiva.aulaNombre}
                                    </Typography>
                                  )}
                                  <Typography sx={{
                                    fontSize: '0.5rem', color: '#666', fontWeight: 600, mt: 'auto',
                                  }}>
                                    {noLectiva.horaInicio}-{noLectiva.horaFin}
                                  </Typography>
                                </Box>
                              </TableCell>
                            );
                          }

                          if (slotClass === 'ocupado-nolectiva') return null;

                          return (
                            <TableCell key={dia.id} sx={{
                              border: '1px solid #dfe1e5', p: 0,
                              cursor: slotClass === 'ocupado-lectiva' ? 'not-allowed' : 'crosshair',
                              bgcolor: slotClass === 'ocupado-lectiva' ? 'rgba(239, 68, 68, 0.12)'
                                : isSelected ? 'rgba(0, 51, 102, 0.12)'
                                : slotClass === 'libre' ? 'rgba(34, 197, 94, 0.12)'
                                : undefined,
                              height: HORA_ALTURA_FILA,
                              outline: isSelected ? '2px dashed #003366' : undefined,
                              outlineOffset: isSelected ? '-1px' : undefined,
                              '&:hover': {
                                bgcolor: slotClass === 'libre' ? '#f0f7ff' : undefined,
                              },
                              position: 'relative',
                            }}
                              onMouseDown={() => handleMouseDown(dia.nombre, idx)}
                              onMouseEnter={() => handleMouseEnter(dia.nombre, idx)}
                            />
                          );
                        })
                      )}
                      <TableCell sx={{ fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0, bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem' }}>
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                          <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: '0.65rem', p: 0, m: 0 }}>
                            {hora.substring(0, 5)}
                          </Typography>
                        </Box>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, height: '1px', width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eef2f6' }}>
          <Button onClick={onClose} color="inherit" size="small">Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ModalAsignarNoLectiva
        open={selectDialogOpen}
        onClose={() => { setSelectDialogOpen(false); setSelectRange(null); setEditHorario(null); }}
        onSave={handleAsignarActividad}
        selectRange={selectRange}
        docenteId={docenteId}
        cicloId={cicloId}
        actividades={actividades}
        horariosTemp={horariosTemp}
        configGrilla={configGrilla}
        editHorario={editHorario}
        readOnly={readOnly}
      />
    </>
  );
}
