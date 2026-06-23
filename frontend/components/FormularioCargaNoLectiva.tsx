'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  Alert,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  AssignmentLate as NoLectivaIcon, 
  Verified as ValidatedIcon, 
  Pending as PendingIcon, 
  EditNote as DraftIcon,
  Draw as DrawIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SignatureCanvas from 'react-signature-canvas';

import { getLimitesReglamento, CARGOS_SIN_FORMATO } from '@/lib/reglamento-utils';

const MySwal = withReactContent(Swal);

const ChlcRow = React.memo(({ row, value, hoursValue, disabled, onDetailChange }: {
  row: any; value: string; hoursValue: number; disabled: boolean; onDetailChange: (field: string, value: any) => void;
}) => (
  <Box>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={5}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
          {row.num}. {row.label}
        </Typography>
      </Grid>
      <Grid item xs={12} md={5}>
        <TextField
          fullWidth multiline minRows={3} variant="outlined"
          disabled={disabled} placeholder="Detalle de la actividad..."
          value={value} onChange={(e) => onDetailChange(row.d, e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: disabled ? '#f8fafc' : '#ffffff', fontSize: '0.85rem', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#003366' } } }}
        />
      </Grid>
      <Grid item xs={12} md={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569' }}>Horas:</Typography>
          <TextField type="number" size="small" disabled={disabled}
            value={hoursValue === undefined ? 0 : Math.round(hoursValue)}
            onChange={(e) => {
              let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
              if (isNaN(val)) val = 0;
              if (row.max !== undefined) val = Math.min(val, row.max);
              onDetailChange(row.h, val);
            }}
            inputProps={{ min: 0, max: row.max, step: 1, style: { textAlign: 'center', fontWeight: 800, color: '#003366' } }}
            sx={{ width: 70, '& .MuiOutlinedInput-root': { bgcolor: disabled ? '#f8fafc' : '#fff', '& fieldset': { borderColor: '#cbd5e1' } } }}
          />
        </Box>
      </Grid>
    </Grid>
    <Divider sx={{ mt: 2, borderStyle: 'dashed', opacity: 0.6 }} />
  </Box>
));

const ChnlaRow = React.memo(({ row, value, hoursValue, disabled, onDetailChange, singleLine }: {
  row: any; value: string; hoursValue: number; disabled: boolean; onDetailChange: (field: string, value: any) => void; singleLine?: boolean;
}) => (
  <Box>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={5}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
          {row.num}. {row.label}
        </Typography>
      </Grid>
      <Grid item xs={12} md={5}>
        {singleLine ? (
          <TextField fullWidth variant="outlined" size="small"
            value={value}
            InputProps={{ readOnly: true }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', fontSize: '0.85rem', color: '#000000', '& fieldset': { borderColor: '#e2e8f0' } } }}
          />
        ) : (
          <TextField fullWidth multiline minRows={3} variant="outlined" disabled={disabled}
            placeholder="Detalle de la actividad..." value={value}
            onChange={(e) => onDetailChange(row.d, e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: disabled ? '#f8fafc' : '#ffffff', fontSize: '0.85rem', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#003366' } } }}
          />
        )}
      </Grid>
      <Grid item xs={12} md={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569' }}>Horas:</Typography>
          <TextField type="number" size="small" disabled={disabled}
            value={hoursValue === undefined ? 0 : Math.round(hoursValue)}
            onChange={(e) => {
              let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
              if (isNaN(val)) val = 0;
              if (row.max !== undefined) val = Math.min(val, row.max);
              onDetailChange(row.h, val);
            }}
            inputProps={{ min: 0, max: row.max, step: 1, style: { textAlign: 'center', fontWeight: 800, color: '#003366' } }}
            sx={{ width: 70, '& .MuiOutlinedInput-root': { bgcolor: disabled ? '#f8fafc' : '#fff', '& fieldset': { borderColor: '#cbd5e1' } } }}
          />
        </Box>
      </Grid>
    </Grid>
    <Divider sx={{ mt: 2, borderStyle: 'dashed', opacity: 0.6 }} />
  </Box>
));

interface FormularioCargaNoLectivaProps {
  docenteId: number;
  cicloId: number;
  dedicacionTotal: number;
  horasLectivas: number;
  docenteData: any;
  cicloData: any;
  cargaLectivaAgrupada: any[];
  readOnly?: boolean;
  externalEstado?: string;
  onStatusChange?: (newStatus: string) => void;
  hideEnviarButton?: boolean;
  horasAdicionales?: number;
  onHorasNoLectivasChange?: (horas: number) => void;
  esFilial?: boolean;
  hideAdminActions?: boolean;
}

export default function FormularioCargaNoLectiva({
  docenteId,
  cicloId,
  dedicacionTotal,
  horasLectivas,
  docenteData,
  cicloData,
  cargaLectivaAgrupada,
  readOnly = false,
  externalEstado,
  onStatusChange,
  hideEnviarButton = false,
  horasAdicionales = 0,
  onHorasNoLectivasChange,
  esFilial = false,
  hideAdminActions = false,
}: FormularioCargaNoLectivaProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSignature, setOpenReviewSignature] = useState(false);
  const sigCanvas = React.useRef<SignatureCanvas>(null);
  const [data, setData] = useState<any>({
    estado: 'borrador',
    firma: '',
    incluirFirmaReportes: false,
    horasPreparacion: 0,
    detallePreparacion: 'Preparación y evaluación de clases',
    horasTutoria: 0,
    detalleTutoria: '',
    horasInvestigacion: 0,
    detalleInvestigacion: '',
    horasCapacitacion: 0,
    detalleCapacitacion: '',
    horasGobierno: 0,
    detalleGobierno: '',
    horasAdministracion: 0,
    detalleAdministracion: '',
    horasAsesoria: 0,
    detalleAsesoria: '',
    horasResponsabilidadSocial: 0,
    detalleResponsabilidadSocial: '',
    horasComites: 0,
    detalleComites: '',
    horasAaai: 0,
    detalleAaai: '',
  });

  const [declaracionOpcion, setDeclaracionOpcion] = useState<number | null>(null);
  const [showDeclaracionModal, setShowDeclaracionModal] = useState(false);
  const [selectedOpcionDeclaracion, setSelectedOpcionDeclaracion] = useState<number | null>(null);
  const [submittingDeclaracion, setSubmittingDeclaracion] = useState(false);

  const DECLARACION_OPTIONS = [
    { id: 1, label: 'Dedicación Exclusiva (Ordinario)', text: 'Soy docente, ordinario a Dedicación Exclusiva y NO EJERZO cualquier otra actividad o cargo remunerado en otra universidad, entidad pública o privada, fuera de la Universidad Nacional de Trujillo (De conformidad con el Artículo 225° del Estatuto Institucional vigente).', match: (tc: string, cat: string, ded: string) => tc === 'nombrado' && ded === 'DEDICACION EXCLUSIVA' },
    { id: 2, label: 'Tiempo Completo (Ordinario)', text: 'Soy docente, ordinario a Tiempo Completo y NO EJERZO la misma modalidad en otra entidad pública o privada, así mismo, no tengo otra responsabilidad remunerada en alguna institución pública o privada más de diez (10 horas) semanales, excepto ley expresa que lo permita.', match: (tc: string, cat: string, ded: string) => tc === 'nombrado' && ded === 'TIEMPO COMPLETO' },
    { id: 3, label: 'Tiempo Parcial (Ordinario)', text: 'Soy docente, ordinario a Tiempo Parcial y NO TENGO incompatibilidad horaria con mi carga académica en la Universidad Nacional de Trujillo y otra institución donde laboro.', match: (tc: string, cat: string, ded: string) => tc === 'nombrado' && ded.startsWith('TIEMPO PARCIAL') },
    { id: 4, label: 'Investigador - Dedicación Exclusiva', text: 'Soy docente, Investigador de la UNT a Dedicación Exclusiva acreditado con Resolución Vicerrectoral y NO ejerzo cualquier otra actividad o cargo remunerado en otra universidad, entidad pública o privada, fuera de la Universidad Nacional de Trujillo (De conformidad con el Artículo 225° del Estatuto Institucional vigente), así mismo en caso de incumplimiento, me someto a las sanciones dispuestas en el Reglamento del Docente Investigador y Promoción de la Investigación, aprobado por R.C.U. N°281-2021/UNT', match: (tc: string, cat: string, ded: string) => ded === 'DOCENTE INVESTIGADOR' && cat.startsWith('tipo_a') },
    { id: 5, label: 'Investigador - Tiempo Completo', text: 'Soy docente, Investigador de la UNT a Tiempo Completo acreditado con Resolución Vicerrectoral y NO ejerzo cualquier otra actividad o cargo remunerado en otra universidad, entidad pública o privada, fuera de la Universidad Nacional de Trujillo (De conformidad con el Artículo 225° del Estatuto Institucional vigente), así mismo en caso de incumplimiento, me someto a las sanciones dispuestas en el Reglamento del Docente Investigador y Promoción de la Investigación, aprobado por R.C.U. N°281-2021/UNT', match: (tc: string, cat: string, ded: string) => ded === 'DOCENTE INVESTIGADOR' && cat.startsWith('tipo_b') },
    { id: 6, label: 'Contratado - Tiempo Completo', text: 'Soy docente, contratado a Tiempo Completo y NO EJERZO la misma modalidad en otra entidad pública o privada, así mismo, no tengo otra responsabilidad remunerada en alguna institución pública o privada más de diez (10 horas) semanales, excepto ley expresa que lo permita.', match: (tc: string, cat: string, ded: string) => tc === 'contratado' && ded.startsWith('TIEMPO COMPLETO') },
    { id: 7, label: 'Contratado - Tiempo Parcial', text: 'Soy docente, contratado a Tiempo Parcial y NO TENGO incompatibilidad horaria con mi carga académica en la Universidad Nacional de Trujillo y otra institución donde laboro.', match: (tc: string, cat: string, ded: string) => tc === 'contratado' && ded.startsWith('TIEMPO PARCIAL') },
    { id: 8, label: 'Extraordinario Cesante', text: 'Soy docente, extraordinario cesante, NO ejerzo cualquier otra actividad o cargo remunerado en otra universidad, entidad pública o privada, fuera de la Universidad Nacional de Trujillo.', match: (tc: string, cat: string, ded: string) => tc === 'extraordinario' },
  ];

  const getFilteredOptions = () => {
    const tc = (docenteData?.condicion || '').toLowerCase();
    const cat = (docenteData?.categoria || '').toLowerCase();
    const ded = (docenteData?.dedicacion || '').toUpperCase();
    return DECLARACION_OPTIONS.filter(o => o.match(tc, cat, ded));
  };

  useEffect(() => {
    if (docenteId && cicloId) {
      // Resetear datos al estado inicial antes de cargar los nuevos del ciclo
      setData({
        estado: 'borrador',
        firma: '',
        incluirFirmaReportes: false,
        horasPreparacion: 0,
        detallePreparacion: 'Preparación y evaluación de clases',
        horasTutoria: 0,
        detalleTutoria: '',
        horasInvestigacion: 0,
        detalleInvestigacion: '',
        horasCapacitacion: 0,
        detalleCapacitacion: '',
        horasGobierno: 0,
        detalleGobierno: '',
        horasAdministracion: 0,
        detalleAdministracion: '',
        horasAsesoria: 0,
        detalleAsesoria: '',
        horasResponsabilidadSocial: 0,
        detalleResponsabilidadSocial: '',
        horasComites: 0,
        detalleComites: '',
        horasAaai: 0,
        detalleAaai: '',
      });
      fetchCargaNoLectiva();
    }
  }, [docenteId, cicloId]);

  useEffect(() => {
    if (externalEstado && data.estado && externalEstado !== data.estado) {
      setData((prev: any) => ({ ...prev, estado: externalEstado }));
    }
  }, [externalEstado]);

  const fetchDeclaracion = async () => {
    try {
      const res = await api.get('/carga-academica/declaracion', {
        params: { docenteId, cicloId },
      });
      setDeclaracionOpcion(res.data.declaracionOpcion);
    } catch {
      setDeclaracionOpcion(null);
    }
  };

  const fetchCargaNoLectiva = async () => {
    setLoading(true);
    try {
      const res = await api.get('/carga-no-lectiva', {
        params: { docenteId, cicloId },
      });
      if (res.data) {
        setData({
          ...res.data,
          detalleGobierno: res.data.detalleGobierno || docenteData?.cargoGobierno || '',
          detalleAaai: res.data.detalleAaai || docenteData?.cargoGestionInstitucional || '',
        });
        if (!readOnly && onStatusChange) onStatusChange(res.data.estado);
      }
      fetchDeclaracion();
    } catch (error) {
      console.error('Error fetching carga no lectiva:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleToggleFirmaReportes = async (checked: boolean) => {
    // Actualizar localmente primero para feedback instantáneo
    setData((prev: any) => ({ ...prev, incluirFirmaReportes: checked }));

    try {
      // Guardar preferencia inmediatamente en la BD para que los reportes se enteren
      await api.post('/carga-no-lectiva', {
        docenteId,
        cicloId,
        incluirFirmaReportes: checked,
        // Mandamos el estado actual para no resetearlo
        estado: data.estado || 'borrador'
      });
    } catch (error) {
      console.error('Error saving signature preference:', error);
      // Opcional: revertir si falla
      // setData((prev: any) => ({ ...prev, incluirFirmaReportes: !checked }));
    }
  };

  const limites = getLimitesReglamento(docenteData || {});
  const totalJornada = limites.totalJornada || dedicacionTotal;
  const esExento = CARGOS_SIN_FORMATO.includes(docenteData?.cargoGobierno || '');

  // CHNLPE max: 50% de CHL real (valor especial -1) o fijo de tabla
  const chnlpeMaxReal = limites.chnlpe.max === -1 ? Math.round(Number(horasLectivas) / 2) : limites.chnlpe.max;

  // Máximos para cada actividad (desde reglamento)
  const maxHorasPreparacion = chnlpeMaxReal;
  const maxHorasResponsabilidadSocial = limites.chnlcRubros['rsu']?.max ?? 2;
  const maxHorasCapacitacion = limites.chnlcRubros['capacitacion']?.max ?? 5;
  const maxHorasTutoria = limites.chnlcRubros['tutoria']?.max ?? 100;
  const maxHorasInvestigacion = limites.chnlcRubros['investigacion']?.max ?? 100;
  const maxHorasAsesoria = limites.chnlcRubros['asesoria']?.max ?? 100;
  const maxHorasGobierno = limites.chnla.max ?? 100;
  const maxHorasAaai = limites.chnla.max ?? 100;
  const maxHorasComites = 100;
  const maxHorasAaep = limites.chnlcRubros['acreditacion']?.max ?? 100;

  const tieneNoLectiva = maxHorasPreparacion > 0 || maxHorasTutoria > 0 || maxHorasInvestigacion > 0 || maxHorasResponsabilidadSocial > 0 || maxHorasAsesoria > 0 || maxHorasCapacitacion > 0 || maxHorasAaep > 0 || maxHorasGobierno > 0;
  const tieneCHNLC = maxHorasTutoria > 0 || maxHorasInvestigacion > 0 || maxHorasResponsabilidadSocial > 0 || maxHorasAsesoria > 0 || maxHorasCapacitacion > 0 || maxHorasAaep > 0;
  const tieneCHNLA = maxHorasGobierno > 0;
  
  const totalHorasNoLectivas = 
    Number(data.horasPreparacion || 0) +
    Number(data.horasTutoria || 0) +
    Number(data.horasInvestigacion || 0) +
    Number(data.horasCapacitacion || 0) +
    Number(data.horasGobierno || 0) +
    Number(data.horasAdministracion || 0) +
    Number(data.horasAsesoria || 0) +
    Number(data.horasResponsabilidadSocial || 0) +
    Number(data.horasComites || 0) +
    Number(data.horasAaep || 0) +
    Number(data.horasAaai || 0);

  const totalHorasNoLectivasEnteras = Math.round(totalHorasNoLectivas);
  const horasLectivasEnteras = Math.round(horasLectivas);
  const horasAdicionalesEnteras = Math.round(horasAdicionales);
  const totalGeneralEntero = horasLectivasEnteras + totalHorasNoLectivasEnteras + horasAdicionalesEnteras;

  useEffect(() => {
    if (onHorasNoLectivasChange) {
      onHorasNoLectivasChange(totalHorasNoLectivasEnteras);
    }
  }, [totalHorasNoLectivasEnteras, onHorasNoLectivasChange]);
  
  // Botón habilitado si totalGeneralEntero >= totalJornada (o si es exento)
  const puedeEnviar = esExento || totalGeneralEntero >= totalJornada;

  // El docente solo puede editar si el estado es 'borrador'
  // Si es finalizado, se bloquea todo permanentemente
  const isFinalizado = data.estado === 'finalizado';
  const isLocked = !readOnly && (data.estado !== 'borrador' && data.estado !== undefined);
  const isFullyLocked = !readOnly && (isLocked || isFinalizado);

  const handleSaveFirma = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      MySwal.fire('Error', 'Por favor realice su firma primero', 'error');
      return;
    }

    // --- LÓGICA DE VALIDACIÓN GEOMÉTRICA (Estilo OpenCV) ---
    const canvas = sigCanvas.current.getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let pixelesTrazo = 0;

    // 1. Analizar píxeles para encontrar el área ocupada (Bounding Box)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const alpha = pixels[index + 3]; // Opacidad (tinta)
        
        if (alpha > 50) { // Si hay trazo
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

    // VALIDACIÓN 1: ¿Está vacío o es un punto minúsculo? (Equivalente a pixeles_trazo < 100)
    if (pixelesTrazo < 100) {
      MySwal.fire('Firma No Válida', 'La firma está vacía o es demasiado pequeña (posible punto).', 'error');
      return;
    }

    // VALIDACIÓN 2: ¿Es un trazo real o solo una línea simple? (Heurística de dimensiones)
    // Una firma real suele tener un área mínima y no ser solo una línea perfecta
    if (anchoTrazo < 50 || altoTrazo < 20) {
      MySwal.fire({
        icon: 'error',
        title: 'Trazo no válido',
        text: 'El trazo no cumple con las dimensiones de una firma válida (muy corto o muy plano).',
      });
      return;
    }

    // Si pasa las validaciones geométricas
    const firmaBase64 = canvas.toDataURL('image/png');
    setData((prev: any) => ({ ...prev, firma: firmaBase64 }));
    
    // Auto-guardar la firma en el perfil del docente inmediatamente
    try {
      await api.post('/carga-no-lectiva', {
        docenteId,
        cicloId,
        firma: firmaBase64,
        estado: data.estado || 'borrador'
      });
    } catch (e) {
      console.error('Error auto-saving signature:', e);
    }

    setOpenReviewSignature(false);
    MySwal.fire({
      icon: 'success',
      title: 'Firma Capturada',
      text: 'La firma ha sido guardada en su perfil.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          // Crear un canvas temporal para validar la imagen subida
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
              // En imágenes subidas, validamos si no es blanco (r+g+b < 600) y tiene opacidad
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

          const firmaBase64 = e.target?.result as string;
          setData((prev: any) => ({ ...prev, firma: firmaBase64 }));

          // Auto-guardar la firma en el perfil del docente inmediatamente
          try {
            await api.post('/carga-no-lectiva', {
              docenteId,
              cicloId,
              firma: firmaBase64,
              estado: data.estado || 'borrador'
            });
          } catch (err) {
            console.error('Error auto-saving uploaded signature:', err);
          }

          setOpenReviewSignature(false);
          MySwal.fire('Firma cargada', 'La imagen ha sido validada y guardada en su perfil.', 'success');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (skipDeclaration = false) => {
    // Bloquear inmediatamente para evitar doble clic
    if (saving) return;

    // Validación de horas totales vs dedicación
    if (totalGeneralEntero > totalJornada) {
      await MySwal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: `La carga total (${totalGeneralEntero}H) no puede exceder su total de jornada de ${totalJornada}H.`,
      });
      return;
    }

    // Si aún no ha realizado la declaración jurada, mostrar el modal primero
    if (!skipDeclaration && declaracionOpcion === null) {
      setSelectedOpcionDeclaracion(null);
      setShowDeclaracionModal(true);
      return;
    }

    const result = await MySwal.fire({
      title: '¿Enviar Declaración?',
      text: 'Una vez enviada, ya no podrá realizar cambios hasta que sea revisada por el coordinador.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Enviar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setSaving(true);
    try {
      // Limpiar el objeto de propiedades prohibidas antes de enviar
      const { id, cargaAcademicaId, cargaNoLectivaId, observaciones, createdAt, updatedAt, docente, ciclo, ...cleanData } = data;

      const payload = {
        ...cleanData,
        docenteId,
        cicloId,
        // Al enviar, siempre pasa a estado PENDIENTE para revisión del coordinador
        estado: 'pendiente'
      };

      await api.post('/carga-no-lectiva', payload);
      const nuevoEstado = 'pendiente';
      setData((prev: any) => ({ ...prev, estado: nuevoEstado }));
      if (onStatusChange) onStatusChange(nuevoEstado);

      await MySwal.fire({
        icon: 'success',
        title: 'Declaración Enviada',
        text: 'Su declaración ha sido enviada correctamente al coordinador para su revisión.',
        timer: 2500,
        showConfirmButton: false,
      });

    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al enviar la carga no lectiva',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeclaracionSubmit = async () => {
    if (!selectedOpcionDeclaracion) return;
    setSubmittingDeclaracion(true);
    try {
      await api.patch('/carga-academica/declaracion', {
        docenteId,
        cicloId,
        opcion: selectedOpcionDeclaracion,
      });
      setDeclaracionOpcion(selectedOpcionDeclaracion);
      setShowDeclaracionModal(false);
      setSelectedOpcionDeclaracion(null);
      handleSave(true);
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Error al enviar la declaración jurada',
      });
    } finally {
      setSubmittingDeclaracion(false);
    }
  };

  const getStatusConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'validado':
        return { label: 'VALIDADO', color: '#16a34a', icon: <ValidatedIcon />, bg: '#f0fdf4' };
      case 'finalizado':
        return { label: 'FIRMADO Y FINALIZADO', color: '#003366', icon: <ValidatedIcon />, bg: '#e0f2fe' };
      case 'pendiente':
        return { label: 'PENDIENTE DE VALIDACIÓN', color: '#ca8a04', icon: <PendingIcon />, bg: '#fefce8' };
      default:
        return { label: 'BORRADOR', color: '#64748b', icon: <DraftIcon />, bg: '#f8fafc' };
    }
  };

  const status = getStatusConfig(data.estado);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setSaving(true);
      await api.patch(`/carga-no-lectiva/${data.id}/estado`, { estado: newStatus });
      setData((prev: any) => ({ ...prev, estado: newStatus }));
      if (onStatusChange) onStatusChange(newStatus);
      
      MySwal.fire({
        icon: 'success',
        title: 'Estado Actualizado',
        text: `La declaración ha sido marcada como ${newStatus.toUpperCase()}`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado',
      });
    } finally {
      setSaving(false);
    }
  };

  const buttonStyle = {
    borderRadius: 2,
    px: 3,
    height: 48, // Altura fija para todos los botones
    fontWeight: 800,
    textTransform: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 1
  };

  if (loading) return <CircularProgress size={24} sx={{ m: 2 }} />;

  return (
    <Box>
      {/* Título interno para No Lectiva */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4, 
        pb: 1, 
        borderBottom: '2px solid #f1f5f9' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <NoLectivaIcon sx={{ color: '#003366', fontSize: 24 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
            2. CARGA NO LECTIVA - Declaración de Actividades
          </Typography>
        </Box>
      </Box>

      {/* Sección 1: CHNLC */}
      {tieneCHNLC && (
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366', mb: 2, mt: 3 }}>
          2.1. Carga Horaria No Lectiva Complementaria (CHNLC)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { num: 1, id: 'PE', label: 'Preparación y Evaluación (PE) (Max 50% de Trabajo Lectivo)', h: 'horasPreparacion', d: 'detallePreparacion', max: maxHorasPreparacion },
            { num: 2, id: 'TC', label: 'Tutoría y Consejería (TC)', h: 'horasTutoria', d: 'detalleTutoria', max: maxHorasTutoria },
            { num: 3, id: 'INV', label: 'Investigación (INV)', h: 'horasInvestigacion', d: 'detalleInvestigacion', max: maxHorasInvestigacion },
            { num: 4, id: 'AAEP', label: 'Autoevaluación y/o Acreditación de la Escuela Profesional (AAEP)', h: 'horasAaep', d: 'detalleAaep', max: maxHorasAaep },
            { num: 5, id: 'FAC', label: 'Formación Académica y Capacitación (FAC) (Max 5 H)', h: 'horasCapacitacion', d: 'detalleCapacitacion', max: maxHorasCapacitacion },
            { num: 6, id: 'RSU', label: 'Responsabilidad Social Universitaria (RSU) (Max 2 H)', h: 'horasResponsabilidadSocial', d: 'detalleResponsabilidadSocial', max: maxHorasResponsabilidadSocial },
            { num: 7, id: 'ATEP', label: 'Asesoría de Tesis y Exámenes Profesionales (ATEP)', h: 'horasAsesoria', d: 'detalleAsesoria', max: maxHorasAsesoria },
          ].map((row) => (
            <ChlcRow
              key={row.id}
              row={row}
              value={data[row.d] || ''}
              hoursValue={data[row.h]}
              disabled={readOnly || isLocked}
              onDetailChange={handleInputChange}
            />
          ))}
        </Box>
      </Box>
      )}

      {/* Sección 2: CHNLA */}
      {tieneCHNLA && (
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366', mb: 2, mt: 4 }}>
          2.2. Carga Horaria No Lectiva Administrativa (CHNLA)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { num: 8, id: 'CC', label: 'Comités y Comisiones Especiales (CC)', h: 'horasComites', d: 'detalleComites', max: maxHorasComites },
            { num: 9, id: 'AGA', label: 'Actividades de Gobierno o de Autoridad (AGA)', h: 'horasGobierno', d: 'detalleGobierno', max: maxHorasGobierno },
            { num: 10, id: 'AAAI', label: 'Actividades de Gestión Institucional (AAAI)', h: 'horasAaai', d: 'detalleAaai', max: maxHorasAaai },
          ].map((row) => {
          if (row.id === 'AGA') {
            return (
              <ChnlaRow
                key={row.id}
                row={row}
                value={docenteData?.cargoGobierno || 'Ninguno'}
                hoursValue={data[row.h]}
                disabled={readOnly || isLocked}
                onDetailChange={handleInputChange}
                singleLine
              />
            );
          }
          if (row.id === 'AAAI') {
            return (
              <ChnlaRow
                key={row.id}
                row={row}
                value={docenteData?.cargoGestionInstitucional || 'Ninguno'}
                hoursValue={data[row.h]}
                disabled={readOnly || isLocked}
                onDetailChange={handleInputChange}
                singleLine
              />
            );
          }
          return (
            <ChnlaRow
              key={row.id}
              row={row}
              value={data[row.d] || ''}
              hoursValue={data[row.h]}
              disabled={readOnly || isLocked}
              onDetailChange={handleInputChange}
            />
          );
        })}
        </Box>
      </Box>
      )}

        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ 
            bgcolor: '#f8fafc', 
            p: 3, 
            borderRadius: 3, 
            border: '1px solid #e2e8f0' 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Lectivas</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#003366' }}>{horasLectivasEnteras} H</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas No Lectivas</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0369a1' }}>{totalHorasNoLectivasEnteras} H</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Horas Adicionales</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#d97706' }}>{horasAdicionalesEnteras} H</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Total General</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#1e293b' }}>{totalGeneralEntero} / {totalJornada} H</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#003366' }}>
                  {Math.min(100, Math.round((totalGeneralEntero / totalJornada) * 100))}%
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
                  width: `${Math.min((horasLectivasEnteras / totalJornada) * 100, 100)}%`, 
                  height: '100%', 
                  bgcolor: '#003366',
                  transition: 'width 0.5s ease-in-out'
                }} />
                <Box sx={{ 
                  width: `${Math.min((totalHorasNoLectivasEnteras / totalJornada) * 100, Math.max(0, 100 - (horasLectivasEnteras / totalJornada) * 100))}%`, 
                  height: '100%', 
                  bgcolor: '#0369a1',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </Box>
            </Box>

            {/* Barra 2: Horas Adicionales (máx 10h) — solo si es filial */}
            {esFilial && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: horasAdicionalesEnteras > 10 ? '#dc2626' : '#d97706' }}>
                  {Math.min(100, Math.round((horasAdicionalesEnteras / 10) * 100))}%
                </Typography>
              </Box>
              <Box sx={{ 
                width: '100%', 
                height: 16, 
                bgcolor: '#e2e8f0', 
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
            )}

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
              {esFilial && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#d97706', borderRadius: '50%' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Horas Adicionales</Typography>
              </Box>
              )}
            </Box>
          </Box>
        </Box>

      {!hideAdminActions && (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        {readOnly ? (
          <>
            {data.estado !== 'validado' && data.estado !== 'finalizado' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<ValidatedIcon />}
                onClick={() => handleStatusChange('validado')}
                disabled={saving}
                sx={{ borderRadius: 2, px: 4, fontWeight: 800, textTransform: 'none' }}
              >
                Validar Carga
              </Button>
            )}
            {data.estado !== 'borrador' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DraftIcon />}
                onClick={() => handleStatusChange('borrador')}
                disabled={saving}
                sx={{ borderRadius: 2, px: 4, fontWeight: 800, textTransform: 'none' }}
              >
                {data.estado === 'finalizado' ? 'Anular Firma / Devolver' : 'Observar / Devolver'}
              </Button>
            )}
          </>
        ) : (
          !isFinalizado && (!isLocked || data.estado === 'validado') && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {data.estado === 'validado' && (
                 <Button
                   variant="outlined"
                   startIcon={data.firma ? <ValidatedIcon /> : <DrawIcon />}
                   onClick={() => setOpenReviewSignature(true)}
                   color={data.firma ? "success" : "primary"}
                   sx={buttonStyle}
                 >
                   {data.firma ? "Actualizar Firma" : "Firmar Declaración"}
                 </Button>
               )}
                {!hideEnviarButton && data.estado !== 'validado' && (
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={() => handleSave()}
                    disabled={saving || isLocked || !puedeEnviar}
                    sx={{ 
                      ...buttonStyle,
                      bgcolor: '#003366', 
                      color: '#fff',
                      fontSize: '0.8rem',
                      lineHeight: 1.2,
                      boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                      '&:hover': { bgcolor: '#002244', boxShadow: '0 6px 16px rgba(0,51,102,0.3)' },
                      '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
                    }}
                  >
                    {saving ? 'Enviando...' : 'Enviar Declaración'}
                  </Button>
                )}
            </Box>
          )
        )}
      </Box>
      )}

      {isFinalizado && !readOnly && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f9ff', border: '1px solid #00336620', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#003366', fontWeight: 800 }}>
            ✓ DECLARACIÓN FINALIZADA: El documento ha sido firmado digitalmente y se encuentra cerrado.
          </Typography>
        </Box>
      )}

      {/* Diálogo de Firma Digital */}
      <Dialog open={openSignature} onClose={() => setOpenReviewSignature(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Firma de Declaración Jurada
          <IconButton onClick={() => setOpenReviewSignature(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4, pt: 5 }}>
              <Typography variant="body1" sx={{ color: '#475569', mb: 4, fontWeight: 500 }}>
                Usted puede realizar su firma directamente en el recuadro o subir una imagen de su firma escaneada.
              </Typography>
              
              <Box sx={{ 
                border: '2px dashed #00336640', 
                borderRadius: 2, 
                bgcolor: '#f8fafc', 
                mb: 4, 
                position: 'relative',
                overflow: 'hidden',
                '& .sigCanvas': {
                  cursor: 'url("https://cdn-icons-png.flaticon.com/32/1250/1250615.png") 0 32, crosshair',
                }
              }}>
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="#000000"
                  canvasProps={{ 
                    width: 550, 
                    height: 200, 
                    className: 'sigCanvas',
                  }}
                />
                <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    startIcon={<DeleteIcon />} 
                    onClick={() => sigCanvas.current?.clear()} 
                    sx={{ 
                      bgcolor: '#fee2e2', 
                      color: '#ef4444',
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#fecaca' },
                      boxShadow: 'none'
                    }}
                  >
                    Limpiar
                  </Button>
                </Box>
              </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ValidatedIcon />}
              onClick={handleSaveFirma}
              sx={{ bgcolor: '#003366', py: 1.5, fontWeight: 700 }}
            >
              Confirmar Firma Dibujada
            </Button>
            
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="upload-firma"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="upload-firma" style={{ width: '100%' }}>
              <Button
                fullWidth
                component="span"
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ py: 1.5, fontWeight: 700, borderColor: '#003366', color: '#003366' }}
              >
                Subir Imagen de Firma
              </Button>
            </label>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Modal Declaración Jurada */}
      <Dialog
        open={showDeclaracionModal}
        onClose={() => setShowDeclaracionModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 800, fontSize: '1rem' }}>
          DECLARACIÓN JURADA DE NO ESTAR INCURSO EN CAUSALES DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 3, fontWeight: 500, fontSize: '0.85rem' }}>
            En el marco de la Ley Universitaria 30220, D.S. N° 418-2017-EF, Estatuto Reformado 2021 y el reglamento de asignación de la Carga Académica de los Docentes de la UNT, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:
          </Alert>

          <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: '#1e293b', bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el Capítulo VIII de las Incompatibilidades, Impedimentos y sanciones, del Título XII: de los docentes, del Estatuto Institucional vigente, según la especificación siguiente:
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: '#003366' }}>
            DECLARO:
          </Typography>

          <FormControl component="fieldset" fullWidth>
            <RadioGroup value={selectedOpcionDeclaracion} onChange={(e) => setSelectedOpcionDeclaracion(Number(e.target.value))}>
              {getFilteredOptions().map((opt) => (
                <FormControlLabel
                  key={opt.id}
                  value={opt.id}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1565c0' }}>
                        {opt.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                        {opt.text}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 2, '& .MuiFormControlLabel-label': { width: '100%' } }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setShowDeclaracionModal(false)} variant="outlined" color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleDeclaracionSubmit}
            variant="contained"
            disabled={!selectedOpcionDeclaracion || submittingDeclaracion}
            sx={{ bgcolor: '#003366' }}
          >
            {submittingDeclaracion ? 'Enviando...' : 'Enviar Declaración'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
