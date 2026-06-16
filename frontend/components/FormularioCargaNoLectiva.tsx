'use client';

import React, { useState, useEffect } from 'react';
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

const MySwal = withReactContent(Swal);

interface FormularioCargaNoLectivaProps {
  docenteId: number;
  cicloId: number;
  dedicacionTotal: number;
  horasLectivas: number;
  docenteData: any;
  cicloData: any;
  cargaLectivaAgrupada: any[];
  readOnly?: boolean;
  onStatusChange?: (newStatus: string) => void;
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
  onStatusChange,
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
  });

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
      });
      fetchCargaNoLectiva();
    }
  }, [docenteId, cicloId]);

  const fetchCargaNoLectiva = async () => {
    setLoading(true);
    try {
      const res = await api.get('/carga-no-lectiva', {
        params: { docenteId, cicloId },
      });
      if (res.data) {
        setData(res.data);
        if (!readOnly && onStatusChange) onStatusChange(res.data.estado);
      }
    } catch (error) {
      console.error('Error fetching carga no lectiva:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

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

  // Máximo de horas para Preparación y Evaluación: 50% de la carga lectiva
  const maxHorasPreparacion = Math.round(horasLectivas / 2);
  
  const totalHorasNoLectivas = 
    Number(data.horasPreparacion || 0) +
    Number(data.horasTutoria || 0) +
    Number(data.horasInvestigacion || 0) +
    Number(data.horasCapacitacion || 0) +
    Number(data.horasGobierno || 0) +
    Number(data.horasAdministracion || 0) +
    Number(data.horasAsesoria || 0) +
    Number(data.horasResponsabilidadSocial || 0) +
    Number(data.horasComites || 0);

  const totalHorasNoLectivasEnteras = Math.round(totalHorasNoLectivas);
  const horasLectivasEnteras = Math.round(horasLectivas);
  const totalGeneralEntero = horasLectivasEnteras + totalHorasNoLectivasEnteras;
  
  // Validación: horasPreparacion no excede el 50% de horasLectivas
  const excedeHorasPreparacion = Number(data.horasPreparacion || 0) > maxHorasPreparacion;
  
  // Botón habilitado solo si totalGeneralEntero >= dedicacionTotal
  const puedeEnviar = totalGeneralEntero >= dedicacionTotal && !excedeHorasPreparacion;

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

  const handleSave = async () => {
    // Bloquear inmediatamente para evitar doble clic
    if (saving) return;

    // Validación de horas totales vs dedicación
    if (totalGeneralEntero > dedicacionTotal) {
      MySwal.fire({
        icon: 'error',
        title: 'Exceso de Horas',
        text: `La carga total (${totalGeneralEntero}H) no puede exceder su dedicación de ${dedicacionTotal}H.`,
      });
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

  const rows = [
    { id: 'Preparacion', label: '2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', h: 'horasPreparacion', d: 'detallePreparacion' },
    { id: 'Tutoria', label: '3. CONSEJERIA Y TUTORIA: señalar número de alumnos y el ciclo academico con los que se desarrolla. (Como minimo una 01 hora semanal).', h: 'horasTutoria', d: 'detalleTutoria' },
    { id: 'Investigacion', label: '4. INVESTIGACIÓN: Consignar el nro de inscripción, código, nombre y duración del proyecto. (Como mínimo 04 y 05 horas semanales, según modalidad de trabajo de docentes ordinarios).', h: 'horasInvestigacion', d: 'detalleInvestigacion' },
    { id: 'Capacitacion', label: '5. CAPACITACIÓN: Señale lo referente a este rubro en el marco de los planes de cada Facultad (como máximo 05 semanales)', h: 'horasCapacitacion', d: 'detalleCapacitacion' },
    { id: 'Gobierno', label: '6. ACTIVIDADES DE GOBIERNO: Se desempeña cargo indique', h: 'horasGobierno', d: 'detalleGobierno' },
    { id: 'Administracion', label: '7. ACTIVIDADES DE ADMINISTRACION: Si desempeña cargo indique.', h: 'horasAdministracion', d: 'detalleAdministracion' },
    { id: 'Asesoria', label: '8. ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL: Indicar el numero de Resolución Decanal, precisando el nombre y duración de la actividad programada.', h: 'horasAsesoria', d: 'detalleAsesoria' },
    { id: 'Responsabilidad', label: '9. RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto programa a ejecutarse en beneficio de la comunidad local o regional. (Como máximo 02 horas semanales)', h: 'horasResponsabilidadSocial', d: 'detalleResponsabilidadSocial' },
    { id: 'Comites', label: '10. COMITES TECNICOS Y COMISIONES: Consignar el numero de Resolución autoritativa indicando el lapso de vigencia', h: 'horasComites', d: 'detalleComites' },
  ];

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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rows.map((row) => {
            const isPreparacion = row.id === 'Preparacion';
            const errorPreparacion = isPreparacion && excedeHorasPreparacion;
            
            return (
              <Box key={row.id}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                      {isPreparacion 
                        ? `2. PREPARACION Y EVALUACION (Max ${maxHorasPreparacion} H - 50% de Trabajo Lectivo)` 
                        : row.label}
                    </Typography>
                    {errorPreparacion && (
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block', mt: 0.5 }}>
                        ⚠️ Excede el máximo permitido ({maxHorasPreparacion} H)
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      multiline={!isPreparacion}
                      rows={isPreparacion ? 1 : 5}
                      variant="outlined"
                      disabled={readOnly || isLocked}
                      placeholder="Detalle de la actividad..."
                      value={data[row.d] || ''}
                      onChange={(e) => handleInputChange(row.d, e.target.value)}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: (readOnly || isLocked) ? '#f8fafc' : '#ffffff',
                          fontSize: '0.85rem',
                          '& fieldset': { borderColor: '#e2e8f0' },
                          '&:hover fieldset': { borderColor: '#003366' },
                        } 
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569' }}>Horas:</Typography>
                      <TextField
                        type="number"
                        size="small"
                        disabled={readOnly || isLocked}
                        value={data[row.h] === undefined ? 0 : Math.round(data[row.h])}
                        onChange={(e) => {
                          let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          if (isNaN(val)) val = 0;
                          
                          // Limitar el valor para preparación
                          if (isPreparacion) {
                            val = Math.min(val, maxHorasPreparacion);
                          }
                          
                          handleInputChange(row.h, val);
                        }}
                        error={errorPreparacion}
                        inputProps={{ 
                          min: 0, 
                          max: isPreparacion ? maxHorasPreparacion : undefined,
                          step: 1,
                          style: { textAlign: 'center', fontWeight: 800, color: '#003366' } 
                        }}
                        sx={{ 
                          width: 70,
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: (readOnly || isLocked) ? '#f8fafc' : '#fff',
                            '& fieldset': { borderColor: errorPreparacion ? 'error.main' : '#cbd5e1' }
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
                <Divider sx={{ mt: 2, borderStyle: 'dashed', opacity: 0.6 }} />
              </Box>
            );
          })}
        </Box>

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
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Total General</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#1e293b' }}>{totalGeneralEntero} / {dedicacionTotal} H</Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#003366' }}>
                  {Math.min(100, Math.round((totalGeneralEntero / dedicacionTotal) * 100))}%
                </Typography>
              </Box>
            </Box>

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
                width: `${Math.min((horasLectivasEnteras / dedicacionTotal) * 100, 100)}%`, 
                height: '100%', 
                bgcolor: '#003366',
                transition: 'width 0.5s ease-in-out'
              }} />
              <Box sx={{ 
                width: `${Math.min((totalHorasNoLectivasEnteras / dedicacionTotal) * 100, 100 - (horasLectivasEnteras / dedicacionTotal) * 100)}%`, 
                height: '100%', 
                bgcolor: '#0369a1',
                transition: 'width 0.5s ease-in-out'
              }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#003366', borderRadius: '50%' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga Lectiva</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#0369a1', borderRadius: '50%' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>Carga No Lectiva</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

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
               {data.estado !== 'validado' && (
                 <Button
                   variant="contained"
                   startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                   onClick={handleSave}
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
    </Box>
  );
}
