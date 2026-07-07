'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, TextField, MenuItem, Grid, Typography,
  CircularProgress, InputAdornment, Chip
} from '@mui/material';
import {
  AssignmentLate as NoLectivaIcon,
  Room as RoomIcon,
  AccessTime as AccessTimeIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { DIAS, ACTIVIDADES_NO_LECTIVAS_LABELS, HORAS } from '@/app/horarios/constantes';

interface NoLectivaHorario {
  tempId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  actividadNoLectiva: string;
  aulaId?: number;
  aulaNombre?: string;
}

interface SelectRange {
  dia: string;
  horaInicio: string;
  horaFin: string;
}

interface ConfigGrilla {
  horaInicio: string;
  horaFin: string;
  almuerzoInicio: string;
  almuerzoFin: string;
  diasActivos: number[];
}

interface ActividadInfo {
  field: string;
  label: string;
  horasDeclaradas: number;
}

interface ModalAsignarNoLectivaProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { tempId?: string; actividadNoLectiva: string; aulaId: number; aulaNombre?: string; dia: number; horaInicio: string; horaFin: string }) => void;
  selectRange: SelectRange | null;
  docenteId: number;
  cicloId: number;
  actividades: ActividadInfo[];
  horariosTemp: NoLectivaHorario[];
  configGrilla: ConfigGrilla;
  editHorario?: NoLectivaHorario | null;
  readOnly?: boolean;
}

export default function ModalAsignarNoLectiva({
  open, onClose, onSave, selectRange, docenteId, cicloId, actividades, horariosTemp, configGrilla, editHorario, readOnly = false,
}: ModalAsignarNoLectivaProps) {
  const [actividadNoLectiva, setActividadNoLectiva] = useState('');
  const [aulaId, setAulaId] = useState<string | number>('');
  const [dia, setDia] = useState(1);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const labelToKey = useMemo(() => {
    const map: Record<string, string> = {};
    actividades.forEach(a => { map[a.label] = a.field; });
    Object.entries(ACTIVIDADES_NO_LECTIVAS_LABELS).forEach(([k, v]) => { map[v] = k; });
    return map;
  }, [actividades]);

  const declaredHoursMap = useMemo(() => {
    const map: Record<string, number> = {};
    actividades.forEach(a => { map[a.field] = a.horasDeclaradas; });
    return map;
  }, [actividades]);

  const assignedNoLectivaHours = useMemo(() => {
    const result: Record<string, number> = {};
    horariosTemp.forEach(h => {
      const key = labelToKey[h.actividadNoLectiva] || h.actividadNoLectiva;
      const hi = parseInt(h.horaInicio.split(':')[0]);
      const hf = parseInt(h.horaFin.split(':')[0]);
      result[key] = (result[key] || 0) + (hf - hi);
    });
    return result;
  }, [horariosTemp, labelToKey]);

  useEffect(() => {
    if (open) {
      if (editHorario) {
        const storedLabel = editHorario.actividadNoLectiva;
        const fieldKey = labelToKey[storedLabel] || storedLabel;
        const match = actividades.find(a => a.field === fieldKey);
        setActividadNoLectiva(match ? match.label : storedLabel);
        setAulaId(editHorario.aulaId ?? '');
        const diaObj = DIAS.find(d => d.nombre === editHorario.dia);
        setDia(diaObj?.id || 1);
        setHoraInicio(editHorario.horaInicio);
        setHoraFin(editHorario.horaFin);
        setSaving(false);
        fetchData();
      } else if (selectRange) {
        const diaObj = DIAS.find(d => d.nombre === selectRange.dia);
        setActividadNoLectiva('');
        setAulaId('');
        setDia(diaObj?.id || 1);
        setHoraInicio(selectRange.horaInicio);
        setHoraFin(selectRange.horaFin);
        setSaving(false);
        fetchData();
      }
    }
  }, [open, selectRange, editHorario]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const aulasRes = await api.get('/aulas');
      setAulas(aulasRes.data || []);
    } catch (err) {
      console.error('Error loading aulas:', err);
    } finally {
      setLoading(false);
    }
  };

  const recalcularHoraFin = (actividadLabel: string, hInicio: string) => {
    if (!actividadLabel) return horaFin;
    const hiNum = parseInt(hInicio.split(':')[0]);
    const internalKey = labelToKey[actividadLabel] || actividadLabel;
    const horasDecl = declaredHoursMap[internalKey] || 0;
    const horasAsig = assignedNoLectivaHours[internalKey] || 0;
    const dragDuration = parseInt((selectRange?.horaFin || '08:00').split(':')[0]) - hiNum;
    const horasDisponibles = Math.max(1, Math.ceil(horasDecl - horasAsig));
    const duracion = Math.max(1, Math.min(dragDuration > 0 ? dragDuration : 2, horasDisponibles));
    const hFinNum = Math.min(parseInt(configGrilla.horaFin.split(':')[0]), hiNum + duracion);
    return `${String(hFinNum).padStart(2, '0')}:00`;
  };

  const horasInicioFiltradas = useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    const base = HORAS.filter(h => {
      const hn = parseInt(h);
      return hn >= start && hn < end;
    });
    if (horaInicio && !base.includes(horaInicio)) {
      base.push(horaInicio);
      base.sort();
    }
    return base;
  }, [configGrilla, horaInicio]);

  const horasFinFiltradas = useMemo(() => {
    if (!horaInicio) return [];
    const hiNum = parseInt(horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    const base = HORAS.filter(h => {
      const hn = parseInt(h);
      return hn > hiNum && hn <= end;
    });
    if (horaFin && !base.includes(horaFin)) {
      base.push(horaFin);
      base.sort();
    }
    return base;
  }, [horaInicio, configGrilla, horaFin]);

  const handleSave = () => {
    setSaving(true);
    const aula = aulas.find(a => a.id === Number(aulaId));
    onSave({
      tempId: editHorario?.tempId,
      actividadNoLectiva,
      aulaId: Number(aulaId),
      aulaNombre: aula?.nombre || '',
      dia,
      horaInicio,
      horaFin,
    });
  };

  const isEditing = !!editHorario;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      disableEnforceFocus
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{isEditing ? 'Editar Actividad No Lectiva' : 'Asignar Actividad No Lectiva'}</span>
          {selectRange && !editHorario && (
            <Chip
              label={`${selectRange.dia} | ${horaInicio} - ${horaFin}`}
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            />
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 5, pb: 3, px: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, pt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                size="small"
                disabled={readOnly}
                SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }}
                label="Actividad No Lectiva"
                value={actividadNoLectiva}
                onChange={(e) => {
                  const val = e.target.value;
                  const hFin = recalcularHoraFin(val, horaInicio);
                  setActividadNoLectiva(val);
                  setHoraFin(hFin);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <NoLectivaIcon fontSize="small" sx={{ color: '#7c3aed' }} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar actividad...</MenuItem>
                {actividades.map(a => {
                  const horasDecl = a.horasDeclaradas || 0;
                  const horasAsig = assignedNoLectivaHours[a.field] || 0;
                  const activLabel = a.label;
                  const oldLabel = ACTIVIDADES_NO_LECTIVAS_LABELS[a.field];
                  const isEditingThis = editHorario?.actividadNoLectiva === activLabel || (oldLabel && editHorario?.actividadNoLectiva === oldLabel);
                  if (!isEditingThis && horasDecl <= 0) return null;
                  if (!isEditingThis && horasAsig >= horasDecl) return null;
                  return (
                    <MenuItem key={a.field} value={activLabel}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {activLabel}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {horasAsig}h de {horasDecl}h declaradas
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                disabled={readOnly}
                SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }}
                label="Aula / Ambiente *"
                value={aulaId}
                onChange={(e) => setAulaId(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <RoomIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar aula...</MenuItem>
                {aulas.map((a: any) => (
                  <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                disabled={readOnly}
                SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }}
                label="Hora Inicio"
                value={horaInicio}
                onChange={(e) => {
                  const nuevaHoraInicio = e.target.value;
                  let nuevaHoraFin = horaFin;
                  if (actividadNoLectiva) {
                    nuevaHoraFin = recalcularHoraFin(actividadNoLectiva, nuevaHoraInicio);
                  }
                  setHoraInicio(nuevaHoraInicio);
                  setHoraFin(nuevaHoraFin);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                {horasInicioFiltradas.map(h => (
                  <MenuItem key={h} value={h}>{h}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                size="small"
                disabled={readOnly}
                SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }}
                label="Hora Fin"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                {horasFinFiltradas.map(h => (
                  <MenuItem key={h} value={h}>{h}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} color="inherit" variant="outlined" startIcon={<CloseIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={readOnly || !actividadNoLectiva || !aulaId || saving}
          sx={{ bgcolor: '#003366', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#002244' } }}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : (isEditing ? <EditIcon /> : <AddIcon />)}
        >
          {isEditing ? 'Guardar' : 'Asignar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
