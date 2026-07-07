'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Verified as ValidatedIcon,
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface HorarioRow {
  dia: string;
  horaInicio: string;
  horaFin: string;
  turno: string;
}

interface CursoForm {
  tempId: number;
  nombre: string;
  dependencia: string;
  horario: HorarioRow[];
}

interface FormularioAsignacionFilialProps {
  docenteData: any;
  cicloId: number;
  onBack: () => void;
  onSubmit: () => void;
  onHorasAdicionalesChange?: (horas: number) => void;
  horasLectivas?: number;
  horasNoLectivas?: number;
  dedicacionTotal?: number;
  externalEstado?: string;
  onStatusChange?: (estado: string) => void;
  onFinalSubmit?: () => Promise<boolean>;
  readOnly?: boolean;
  formDisabled?: boolean;
  onRegisterSaveFilial?: (saveFn: () => Promise<boolean>) => void;
}

const defaultRow = (): HorarioRow => ({
  dia: 'Lunes',
  horaInicio: '08:00',
  horaFin: '10:00',
  turno: 'MAÑANA',
});

const calcTotalHorasCurso = (horario: HorarioRow[]): number => {
  return horario.reduce((sum, row) => {
    const [hIni, mIni] = row.horaInicio.split(':').map(Number);
    const [hFin, mFin] = row.horaFin.split(':').map(Number);
    const diff = (hFin * 60 + mFin - hIni * 60 - mIni) / 60;
    return sum + (diff > 0 ? diff : 0);
  }, 0);
};

let nextTempId = 1;

const toMinutes = (t: string) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const hasTimeConflict = (horario: HorarioRow[], idx: number): boolean => {
  const row = horario[idx];
  if (!row.horaInicio || !row.horaFin) return false;
  return horario.some((other, i) => {
    if (i === idx) return false;
    if (other.dia !== row.dia || other.turno !== row.turno) return false;
    if (!other.horaInicio || !other.horaFin) return false;
    const sA = toMinutes(row.horaInicio);
    const eA = toMinutes(row.horaFin);
    const sB = toMinutes(other.horaInicio);
    const eB = toMinutes(other.horaFin);
    return sA < eB && sB < eA;
  });
};

const hasInvalidTime = (row: HorarioRow): boolean => {
  if (!row.horaInicio || !row.horaFin) return true;
  return toMinutes(row.horaFin) <= toMinutes(row.horaInicio);
};

const DIA_MAP: Record<string, number> = {
  'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4,
  'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
};

const hasCrossConflict = (
  curso: CursoForm, idx: number,
  todosCursos: CursoForm[], horariosExistentes: any[],
): boolean => {
  const row = curso.horario[idx];
  if (!row.horaInicio || !row.horaFin) return false;
  const diaNum = DIA_MAP[row.dia];
  if (!diaNum) return false;
  const sA = toMinutes(row.horaInicio);
  const eA = toMinutes(row.horaFin);
  // Contra horarios lectivos y no lectivos
  const conflictConBackend = horariosExistentes.some(h => {
    if (h.diaSemana !== diaNum) return false;
    const hInicio = toMinutes(h.horaInicio.substring(0, 5));
    const hFin = toMinutes(h.horaFin.substring(0, 5));
    return sA < hFin && hInicio < eA;
  });
  if (conflictConBackend) return true;
  // Contra otros cursos filiales
  return todosCursos.some(otherCurso => {
    if (otherCurso.tempId === curso.tempId) return false;
    return otherCurso.horario.some(otherRow => {
      if (otherRow.dia !== row.dia || otherRow.turno !== row.turno) return false;
      if (!otherRow.horaInicio || !otherRow.horaFin) return false;
      const sB = toMinutes(otherRow.horaInicio);
      const eB = toMinutes(otherRow.horaFin);
      return sA < eB && sB < eA;
    });
  });
};

export default function FormularioAsignacionFilial({
  docenteData,
  cicloId,
  onBack,
  onSubmit,
  onHorasAdicionalesChange,
  horasLectivas = 0,
  horasNoLectivas = 0,
  dedicacionTotal = 40,
  externalEstado,
  onStatusChange,
  onFinalSubmit,
  readOnly = false,
  formDisabled = false,
  onRegisterSaveFilial,
}: FormularioAsignacionFilialProps) {
  const [cursos, setCursos] = useState<CursoForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [openSignature, setOpenSignature] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [cargandoFirma, setCargandoFirma] = useState(false);
  const [loadingFilial, setLoadingFilial] = useState(false);
  const [horariosExistentes, setHorariosExistentes] = useState<any[]>([]);

  const docenteId = docenteData?.id || docenteData?.docenteId;
  const draftKey = docenteId && cicloId ? `carga-filial-draft-${docenteId}-${cicloId}` : null;

  const clearDraft = useCallback(() => {
    if (draftKey && typeof window !== 'undefined') {
      try { sessionStorage.removeItem(draftKey); } catch {}
    }
  }, [draftKey]);

  const persistCursos = useCallback((data: CursoForm[]) => {
    if (draftKey && typeof window !== 'undefined') {
      try { sessionStorage.setItem(draftKey, JSON.stringify(data)); } catch {}
    }
  }, [draftKey]);
  const isValidado = externalEstado === 'validado';
  const isFinalizado = externalEstado === 'finalizado';
  const isPendiente = externalEstado === 'pendiente';
  const isFullyLocked = readOnly || formDisabled || isValidado || isFinalizado || isPendiente;

  const getStatusConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'validado':
        return { label: 'VALIDADO', color: '#16a34a', bg: '#f0fdf4' };
      case 'finalizado':
        return { label: 'FIRMADO Y FINALIZADO', color: '#003366', bg: '#e0f2fe' };
      case 'pendiente':
        return { label: 'PENDIENTE DE VALIDACIÓN', color: '#ca8a04', bg: '#fefce8' };
      default:
        return { label: 'BORRADOR', color: '#64748b', bg: '#f8fafc' };
    }
  };

  const statusDisplay = useMemo(() => {
    if (!externalEstado) return null;
    const config = getStatusConfig(externalEstado);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: config.bg, px: 2, py: 0.5, borderRadius: 2, border: `1px solid ${config.color}40` }}>
        <Typography sx={{ fontWeight: 900, color: config.color, fontSize: '0.75rem', textTransform: 'uppercase' }}>
          {config.label}
        </Typography>
      </Box>
    );
  }, [externalEstado]);

  const dependenciasDocente = useMemo(() => {
    return (docenteData?.dependencias || []).filter((d: string) => d !== 'Ninguno');
  }, [docenteData]);

  const opcionesDependencia = useMemo(() => {
    return dependenciasDocente.filter((d: string) => d !== 'Otro Centro de Producción');
  }, [dependenciasDocente]);

  const totalHoras = useMemo(() => {
    return cursos.reduce((sum, curso) => sum + calcTotalHorasCurso(curso.horario), 0);
  }, [cursos]);

  const horasAdicionalesEnteras = Math.round(totalHoras);

  useEffect(() => {
    if (onHorasAdicionalesChange) {
      onHorasAdicionalesChange(horasAdicionalesEnteras);
    }
  }, [horasAdicionalesEnteras, onHorasAdicionalesChange]);

  // Persistir horas adicionales en sessionStorage para la ventana flotante
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('filial-horas-adicionales', String(horasAdicionalesEnteras));
    }
  }, [horasAdicionalesEnteras]);

  // Cargar datos existentes al montar el componente (prioriza draft local)
  useEffect(() => {
    if (!docenteId || !cicloId) return;
    const loadFromDraft = () => {
      if (!draftKey) return null;
      try {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return null;
    };
    const fetchExisting = async () => {
      setLoadingFilial(true);
      try {
        // Siempre fetch horarios existentes (lectiva + no lectiva) para validar cruces
        const horariosRes = await api.get('/horarios', {
          params: { docenteId, cicloId },
        });
        // Combinar con horarios del grid no lectivo desde sessionStorage
        let combined = horariosRes.data || [];
        try {
          const noLectivaGridKey = `carga-no-lectiva-grid-${docenteId}-${cicloId}`;
          const saved = sessionStorage.getItem(noLectivaGridKey);
          if (saved) {
            const grid = JSON.parse(saved);
            if (Array.isArray(grid)) {
              const normalized = grid
                .filter((h: any) => h.dia && h.horaInicio && h.horaFin)
                .map((h: any) => ({
                  diaSemana: DIA_MAP[h.dia] || 0,
                  horaInicio: h.horaInicio,
                  horaFin: h.horaFin,
                }))
                .filter((h: any) => h.diaSemana > 0);
              combined = [...combined, ...normalized];
            }
          }
        } catch {}
        setHorariosExistentes(combined);

        // Priorizar draft local (evita pérdida de datos al volver desde Atrás)
        const draft = loadFromDraft();
        if (draft) {
          setCursos(draft);
          setLoadingFilial(false);
          return;
        }
        const res = await api.get('/asignacion-filial', {
          params: { docenteId, cicloId },
        });
        const filial = res.data;
        if (filial?.cursos?.length > 0) {
          const mapped = filial.cursos.map((curso: any) => ({
            tempId: nextTempId++,
            nombre: curso.nombre || '',
            dependencia: curso.dependencia || '',
            horario: (curso.horarioSemanal || []).map((h: any) => ({
              dia: h.dia,
              horaInicio: h.horaInicio,
              horaFin: h.horaFin,
              turno: curso.turno || 'MAÑANA',
            })),
          }));
          setCursos(mapped);
        }
      } catch (err) {
        console.error('Error fetching existing filial data:', err);
      } finally {
        setLoadingFilial(false);
      }
    };
    fetchExisting();
  }, [docenteId, cicloId, draftKey]);

  // Auto-asignar dependencia cuando solo hay una opción disponible
  useEffect(() => {
    if (opcionesDependencia.length === 1) {
      setCursos(prev => prev.map(c => ({
        ...c,
        dependencia: c.dependencia || opcionesDependencia[0],
      })));
    }
  }, [opcionesDependencia, cursos.length]);

  // Persistir cursos a sessionStorage en cada cambio
  useEffect(() => {
    if (draftKey && cursos.length > 0) {
      persistCursos(cursos);
    }
  }, [cursos, draftKey, persistCursos]);

  const updateCurso = (tempId: number, field: keyof CursoForm, value: any) => {
    setCursos(prev => prev.map(c => c.tempId === tempId ? { ...c, [field]: value } : c));
  };

  const addCurso = () => {
    setCursos(prev => [...prev, {
      tempId: nextTempId++, nombre: '', dependencia: '', horario: [defaultRow()],
    }]);
  };

  const removeCurso = (tempId: number) => {
    if (cursos.length > 1) {
      setCursos(prev => prev.filter(c => c.tempId !== tempId));
    }
  };

  const addRow = (tempId: number) => {
    setCursos(prev => prev.map(c =>
      c.tempId === tempId ? { ...c, horario: [...c.horario, defaultRow()] } : c
    ));
  };

  const removeRow = (tempId: number, idx: number) => {
    setCursos(prev => prev.map(c =>
      c.tempId === tempId
        ? { ...c, horario: c.horario.length > 1 ? c.horario.filter((_, i) => i !== idx) : c.horario }
        : c
    ));
  };

  const resetRow = (tempId: number, idx: number) => {
    setCursos(prev => prev.map(c =>
      c.tempId === tempId
        ? { ...c, horario: c.horario.map((row, i) => i === idx ? defaultRow() : row) }
        : c
    ));
  };

  const updateRow = (tempId: number, idx: number, field: keyof HorarioRow, value: string) => {
    setCursos(prev => prev.map(c =>
      c.tempId === tempId
        ? { ...c, horario: c.horario.map((row, i) => i === idx ? { ...row, [field]: value } : row) }
        : c
    ));
  };

  const calcHorasDiarias = (row: HorarioRow) => {
    const [hIni, mIni] = row.horaInicio.split(':').map(Number);
    const [hFin, mFin] = row.horaFin.split(':').map(Number);
    const diff = (hFin * 60 + mFin - hIni * 60 - mIni) / 60;
    return diff > 0 ? diff : 0;
  };

  const handleSaveFirma = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      MySwal.fire('Error', 'Por favor realice su firma primero', 'error');
      return;
    }

    const canvas = sigCanvas.current.getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let pixelesTrazo = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha > 50) {
          pixelesTrazo++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const anchoTrazo = maxX - minX;
    const altoTrazo = maxY - minY;

    if (pixelesTrazo < 100) {
      MySwal.fire('Firma No Válida', 'La firma está vacía o es demasiado pequeña (posible punto).', 'error');
      return;
    }

    if (anchoTrazo < 50 || altoTrazo < 20) {
      MySwal.fire({ icon: 'error', title: 'Trazo no válido', text: 'El trazo no cumple con las dimensiones de una firma válida (muy corto o muy plano).' });
      return;
    }

    setCargandoFirma(true);
    const firmaBase64 = canvas.toDataURL('image/png');

    try {
      await api.patch(`/docentes/${docenteId}`, { firma: firmaBase64 });
      setOpenSignature(false);
      MySwal.fire({ icon: 'success', title: 'Firma Capturada', text: 'La firma ha sido guardada en su perfil.', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Error saving signature:', error);
      MySwal.fire('Error', 'No se pudo guardar la firma', 'error');
    } finally {
      setCargandoFirma(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;

        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
        let pixelesTrazo = 0;

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const index = (y * img.width + x) * 4;
            const r = pixels[index], g = pixels[index+1], b = pixels[index+2], a = pixels[index+3];
            if (a > 50 && (r + g + b < 600)) {
              pixelesTrazo++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        const ancho = maxX - minX;
        const alto = maxY - minY;

        if (pixelesTrazo < 100 || ancho < 50 || alto < 20) {
          MySwal.fire('Imagen No Válida', 'La imagen subida no parece contener una firma válida.', 'error');
          return;
        }

        setCargandoFirma(true);
        const firmaBase64 = e.target?.result as string;

        try {
          await api.patch(`/docentes/${docenteId}`, { firma: firmaBase64 });
          setOpenSignature(false);
          MySwal.fire('Firma cargada', 'La imagen ha sido validada y guardada en su perfil.', 'success');
        } catch (error) {
          console.error('Error saving uploaded signature:', error);
          MySwal.fire('Error', 'No se pudo guardar la firma', 'error');
        } finally {
          setCargandoFirma(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const readOnlyInputSx = {
    '& .MuiInputBase-root': { bgcolor: '#ffffff' },
    '& .MuiInputBase-root.Mui-disabled': { bgcolor: '#ffffff' },
    '& .MuiInputBase-input.Mui-readOnly, & .MuiInputBase-input.Mui-disabled': {
      opacity: 1,
      WebkitTextFillColor: '#1e293b',
      cursor: 'default',
    },
    '& .MuiInputBase-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
      borderColor: '#e2e8f0',
    },
    '& .MuiSelect-select.Mui-disabled': {
      opacity: 1,
      WebkitTextFillColor: '#1e293b',
    },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
    '& .MuiAutocomplete-popupIndicator.Mui-disabled': {
      display: 'none',
    },
  };

  const handleSave = async () => {
    const cursosValidos = cursos.filter(c => c.nombre.trim());
    if (cursosValidos.length === 0) return;
    setSaving(true);
    try {
      const ok = await onFinalSubmit?.();
      if (ok === false) {
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo completar el envío. Verifica tus datos e intenta de nuevo.',
        });
        return;
      }
      clearDraft();
      setCursos([]);
      MySwal.fire({
        icon: 'success',
        title: 'Carga Académica Enviada',
        text: 'Su declaración ha sido enviada correctamente al coordinador para su revisión.',
        timer: 2500,
        showConfirmButton: false,
      });
      onSubmit();
    } catch (error: any) {
      console.error('Error al enviar:', error);
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al enviar la carga académica',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFilialSilent = useCallback(async () => {
    const cursosValidos = cursos.filter(c => c.nombre.trim());
    if (cursosValidos.length === 0) return true;
    setSaving(true);
    try {
      await api.post('/asignacion-filial', {
        docenteId: docenteData?.id || docenteData?.docenteId,
        cicloId,
        facultad: docenteData?.facultad || '',
        departamentoAcademico: docenteData?.departamentoAcademico || '',
        fechaInicio: docenteData?.fechaInicio ? new Date(docenteData.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fechaFin: docenteData?.fechaFin ? new Date(docenteData.fechaFin).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        cursos: cursosValidos.map(c => ({
          nombre: c.nombre,
          dependencia: c.dependencia,
          horarioSemanal: c.horario.map(h => ({ dia: h.dia, horaInicio: h.horaInicio, horaFin: h.horaFin })),
          turno: c.horario[0]?.turno || 'MAÑANA',
          totalHorasSemanales: Math.round(calcTotalHorasCurso(c.horario)),
        })),
      });
      clearDraft();
      setCursos([]);
      // Actualizar horas adicionales en sessionStorage
      const totalHoras = cursosValidos.reduce((sum, c) => sum + Math.round(calcTotalHorasCurso(c.horario)), 0);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('filial-horas-adicionales', String(totalHoras));
      }
      if (onHorasAdicionalesChange) onHorasAdicionalesChange(totalHoras);
      return true;
    } catch (error: any) {
      console.error('Error guardando filial:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [cursos, docenteData, cicloId, onHorasAdicionalesChange]);

  useEffect(() => {
    if (onRegisterSaveFilial) onRegisterSaveFilial(handleSaveFilialSilent);
  }, [onRegisterSaveFilial, handleSaveFilialSilent]);

  const buttonStyle = {
    borderRadius: 2,
    fontWeight: 700,
    fontSize: '0.85rem',
    textTransform: 'none' as const,
    px: 4,
    py: 1.5,
  };

  return (
    <Paper sx={{
      borderRadius: 4,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      bgcolor: '#ffffff'
    }}>
      <Box sx={{
        p: 3,
        bgcolor: '#003366',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <SchoolIcon sx={{ color: '#FFD700', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          ASIGNACIÓN DE CARGA HORARIA LECTIVA EN FILIALES, POSTGRADO, SEGUNDAS ESPECIALIDADES Y CENTROS DE PRODUCCIÓN Y EXTENSIÓN UNIVERSITARIA
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {statusDisplay}
      </Box>

      <Box sx={{ p: 4 }}>
        {loadingFilial ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
        <>
        {/* Indicador de total horas */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: 1.5,
          mb: 3,
          borderRadius: 2,
          bgcolor: totalHoras > 10 ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${totalHoras > 10 ? '#fecaca' : '#bbf7d0'}`,
        }}>
          <Typography variant="caption" sx={{
            fontWeight: 700,
            color: totalHoras > 10 ? '#dc2626' : '#16a34a',
          }}>
            {totalHoras > 10
              ? `⚠ Excede el máximo: ${totalHoras.toFixed(1)}h de 10h permitidas`
              : `Total horas: ${totalHoras.toFixed(1)}h de 10h disponibles`}
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addCurso}
            variant="outlined"
            disabled={totalHoras >= 10 || isFullyLocked}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3, py: 1, fontSize: '0.9rem' }}
          >
            Asignar Curso
          </Button>
        </Box>

        {/* Lista de cursos */}
        {cursos.map((curso, cursoIdx) => {
          const horasCurso = calcTotalHorasCurso(curso.horario);

          return (
            <Box key={curso.tempId} sx={{
              mb: 4,
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#fafbfc',
            }}>
              {/* Encabezado del curso */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#003366', textTransform: 'uppercase' }}>
                  Curso #{cursoIdx + 1}
                </Typography>
                {cursos.length > 1 && (
                  <IconButton size="small" onClick={() => removeCurso(curso.tempId)} disabled={isFullyLocked} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nombre del Curso"
                    value={curso.nombre}
                    onChange={(e) => updateCurso(curso.tempId, 'nombre', e.target.value)}
                    InputProps={{ readOnly: isFullyLocked ? true : undefined }}
                    InputLabelProps={{ shrink: true }}
                    sx={isFullyLocked ? readOnlyInputSx : undefined}
                    disabled={isFullyLocked}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  {isFullyLocked || opcionesDependencia.length <= 1 ? (
                    <TextField
                      fullWidth
                      size="small"
                      label="Dependencia"
                      value={curso.dependencia}
                      InputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: true }}
                      sx={readOnlyInputSx}
                      placeholder={!curso.dependencia ? 'Sin dependencias asignadas' : undefined}
                    />
                  ) : (
                    <Autocomplete
                      freeSolo
                      options={opcionesDependencia}
                      value={curso.dependencia}
                      onInputChange={(_, newValue) => {
                        updateCurso(curso.tempId, 'dependencia', newValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Dependencia"
                          size="small"
                          placeholder={opcionesDependencia.length === 0 ? 'Escriba el nombre del centro de producción' : undefined}
                        />
                      )}
                    />
                  )}
                </Grid>
              </Grid>

              {/* Horario Semanal del curso */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                  pb: 1,
                  borderBottom: '2px solid #f1f5f9',
                }}>
                  <SchoolIcon sx={{ color: '#003366', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                    Horario Semanal
                  </Typography>
                </Box>

                {/* Encabezados */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: '120px 140px 1fr 1fr 110px 40px 40px',
                  gap: 1.5,
                  mb: 1,
                  px: 1,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>TURNO</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>DÍA</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>HORA INICIO</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>HORA FIN</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>HORAS DIARIAS</Typography>
                  <Box />
                  <Box />
                </Box>

                {curso.horario.map((row, idx) => {
                  const timeError = hasInvalidTime(row);
                  const conflictError = hasTimeConflict(curso.horario, idx);
                  const crossConflictError = hasCrossConflict(curso, idx, cursos, horariosExistentes);
                  const rowError = timeError || conflictError || crossConflictError;
                  return (
                  <Box key={idx} sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 140px 1fr 1fr 110px 40px 40px',
                    gap: 1.5,
                    mb: 1.5,
                    alignItems: 'center',
                  }}>
                    <FormControl size="small" fullWidth disabled={isFullyLocked} sx={isFullyLocked ? readOnlyInputSx : undefined}>
                      <Select
                        value={row.turno}
                        onChange={(e) => updateRow(curso.tempId, idx, 'turno', e.target.value)}
                        disabled={isFullyLocked}
                      >
                        <MenuItem value="MAÑANA">Mañana</MenuItem>
                        <MenuItem value="TARDE">Tarde</MenuItem>
                        <MenuItem value="NOCHE">Noche</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth disabled={isFullyLocked} sx={isFullyLocked ? readOnlyInputSx : undefined}>
                      <Select
                        value={row.dia}
                        onChange={(e) => updateRow(curso.tempId, idx, 'dia', e.target.value)}
                        disabled={isFullyLocked}
                      >
                        {DIAS.map((d) => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="time"
                      value={row.horaInicio}
                      onChange={(e) => updateRow(curso.tempId, idx, 'horaInicio', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ readOnly: isFullyLocked ? true : undefined }}
                      inputProps={{ step: 60 }}
                      sx={isFullyLocked ? readOnlyInputSx : undefined}
                      disabled={isFullyLocked}
                      error={rowError}
                    />
                    <TextField
                      size="small"
                      type="time"
                      value={row.horaFin}
                      onChange={(e) => updateRow(curso.tempId, idx, 'horaFin', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ readOnly: isFullyLocked ? true : undefined }}
                      inputProps={{ step: 60 }}
                      sx={isFullyLocked ? readOnlyInputSx : undefined}
                      disabled={isFullyLocked}
                      error={rowError}
                    />
                    <TextField
                      size="small"
                      value={`${calcHorasDiarias(row)} H/Dia`}
                      InputProps={{ readOnly: true }}
                      sx={readOnlyInputSx}
                    />
                    <Tooltip title="Eliminar fila">
                      <IconButton
                        size="small"
                        onClick={() => removeRow(curso.tempId, idx)}
                        disabled={curso.horario.length <= 1 || isFullyLocked}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Restablecer fila">
                      <IconButton
                        size="small"
                        onClick={() => resetRow(curso.tempId, idx)}
                        disabled={isFullyLocked}
                        sx={{ color: '#003366' }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {rowError && (
                      <Typography variant="caption" sx={{ gridColumn: '1 / -1', color: '#ef4444', fontWeight: 600 }}>
                        {timeError ? 'La hora de inicio debe ser menor a la hora fin'
                          : crossConflictError ? 'Conflicto de horario con clases o actividades ya asignadas'
                          : 'Conflicto de horario con otra fila (mismo día y turno)'}
                      </Typography>
                    )}
                  </Box>
                );})}

                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr 1fr 110px 40px 40px', gap: 1.5, mt: 2, alignItems: 'center' }}>
                  <Box />
                  <Box />
                  <Box />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#003366', textAlign: 'right', fontSize: '1rem' }}>
                    TOTAL HORAS SEMANALES
                  </Typography>
                  <TextField
                    size="small"
                    value={`${horasCurso} H/Sem`}
                    InputProps={{ readOnly: true }}
                    sx={{
                      ...readOnlyInputSx,
                      '& .MuiInputBase-input.Mui-readOnly, & .MuiInputBase-input.Mui-disabled': {
                        ...(readOnlyInputSx as any)['& .MuiInputBase-input.Mui-readOnly, & .MuiInputBase-input.Mui-disabled'],
                        color: totalHoras > 10 ? '#dc2626' : '#003366',
                      } as any,
                    }}
                  />
                  <Box />
                  <Box />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => addRow(curso.tempId)}
                    variant="outlined"
                    size="small"
                    disabled={totalHoras >= 10 || isFullyLocked}
                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                  >
                    Agregar día
                  </Button>
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Barra de progreso general */}
        <Box sx={{
          bgcolor: '#f8fafc',
          p: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          mt: 4
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Lectivas</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#003366' }}>{Math.round(horasLectivas)} H</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas No Lectivas</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0369a1' }}>{Math.round(horasNoLectivas)} H</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Adicionales</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#d97706' }}>{horasAdicionalesEnteras} H</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Total General</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#1e293b' }}>{Math.round(horasLectivas) + Math.round(horasNoLectivas) + horasAdicionalesEnteras} / {dedicacionTotal} H</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#003366' }}>
                {Math.min(100, Math.round(((Math.round(horasLectivas) + Math.round(horasNoLectivas) + horasAdicionalesEnteras) / dedicacionTotal) * 100))}%
              </Typography>
            </Box>
          </Box>

          {/* Barra 1: Jornada (Lectiva + No Lectiva) */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{
              width: '100%',
              height: 16,
              bgcolor: '#e2e8f0',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Box sx={{
                width: `${Math.min((Math.round(horasLectivas) / dedicacionTotal) * 100, 100)}%`,
                height: '100%',
                bgcolor: '#003366',
                transition: 'width 0.5s ease-in-out'
              }} />
              <Box sx={{
                width: `${Math.min((Math.round(horasNoLectivas) / dedicacionTotal) * 100, Math.max(0, 100 - (Math.round(horasLectivas) / dedicacionTotal) * 100))}%`,
                height: '100%',
                bgcolor: '#0369a1',
                transition: 'width 0.5s ease-in-out'
              }} />
            </Box>
          </Box>

          {/* Barra 2: Horas Adicionales (máx 10h) */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: horasAdicionalesEnteras > 10 ? '#dc2626' : '#d97706' }}>
                {Math.min(100, Math.round((horasAdicionalesEnteras / 10) * 100))}%
              </Typography>
            </Box>
            <Box sx={{
              width: '100%',
              height: 16,
              bgcolor: 'rgba(217, 119, 6, 0.1)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Box sx={{
                width: `${Math.min((horasAdicionalesEnteras / 10) * 100, 100)}%`,
                height: '100%',
                bgcolor: horasAdicionalesEnteras > 10 ? '#dc2626' : '#d97706',
                transition: 'width 0.5s ease-in-out',
                borderRadius: 8,
              }} />
            </Box>
          </Box>

          {/* Leyenda consolidada */}
          <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#003366', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga Lectiva</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#0369a1', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga No Lectiva</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: '#d97706', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Horas Adicionales</Typography>
            </Box>
          </Box>
        </Box>

        {/* Botones */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{
              ...buttonStyle,
              borderColor: '#003366',
              color: '#003366',
            }}
          >
            Atrás
          </Button>
          {isFinalizado ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1.5, bgcolor: '#dcfce7', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <ValidatedIcon sx={{ color: '#16a34a' }} />
              <Typography sx={{ fontWeight: 700, color: '#16a34a' }}>DECLARACIÓN FINALIZADA</Typography>
            </Box>
          ) : !isPendiente && (
            <Button
              variant="contained"
              endIcon={saving ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
              onClick={handleSave}
              disabled={
                isFullyLocked ||
                saving ||
                cursos.filter(c => c.nombre.trim()).length === 0 ||
                totalHoras > 10 ||
                totalHoras <= 0 ||
                cursos.some(c => c.horario.some((_, i) =>
                  hasTimeConflict(c.horario, i) ||
                  hasInvalidTime(c.horario[i]) ||
                  hasCrossConflict(c, i, cursos, horariosExistentes)
                ))
              }
              sx={{
                ...buttonStyle,
                bgcolor: '#003366',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                '&:hover': { bgcolor: '#002244', boxShadow: '0 6px 16px rgba(0,51,102,0.3)' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
              }}
            >
              {saving ? 'Guardando...' : 'Enviar Carga Académica'}
            </Button>
          )}
        </Box>
        </>)}
      </Box>

      {/* Firma Modal */}
      <Dialog open={openSignature} onClose={() => setOpenSignature(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#003366', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          FIRMAR DECLARACIÓN
          <IconButton onClick={() => setOpenSignature(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Por favor, firme en el recuadro inferior para validar su declaración jurada.
            </Typography>
            <Box sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 2,
              bgcolor: '#ffffff',
              '& canvas': { width: '100% !important', height: '200px !important' },
            }}>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#003366"
                canvasProps={{
                  style: { width: '100%', height: 200, borderRadius: 8 }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => sigCanvas.current?.clear()}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Limpiar
              </Button>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Subir Imagen
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setOpenSignature(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveFirma}
            disabled={cargandoFirma}
            startIcon={cargandoFirma ? <CircularProgress size={20} color="inherit" /> : undefined}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#003366',
              '&:hover': { bgcolor: '#002244' },
            }}
          >
            {cargandoFirma ? 'Guardando...' : 'Guardar Firma'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
