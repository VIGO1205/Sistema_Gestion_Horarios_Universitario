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
} from '@mui/material';
import { Save as SaveIcon, AssignmentLate as NoLectivaIcon, PictureAsPdf as PdfIcon, Assessment as ExcelIcon, Verified as ValidatedIcon, Pending as PendingIcon, EditNote as DraftIcon } from '@mui/icons-material';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { generateFormato1PDF, generateFormato1Excel } from '@/lib/report-utils';

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
  const [data, setData] = useState<any>({
    estado: 'borrador',
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

  // El docente solo puede editar si el estado es 'borrador'
  // Si es readOnly (Admin), se ignora esta restricción para los campos (pero el Admin tiene sus propios botones)
  const isLocked = !readOnly && data.estado !== 'borrador' && data.estado !== undefined;

  const handleSave = async () => {
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
      const payload = {
        ...data,
        docenteId,
        cicloId,
        // Al enviar, pasa a pendiente
        estado: 'pendiente'
      };

      await api.post('/carga-no-lectiva', payload);
      setData((prev: any) => ({ ...prev, estado: 'pendiente' }));

      // Generar Reportes Automáticos
      const reportData = {
        ciclo: {
          nombre: cicloData?.nombre || '2026-I',
          fechaInicio: cicloData?.fechaInicio ? new Date(cicloData.fechaInicio).toLocaleDateString('es-PE') : '-',
          fechaFinal: cicloData?.fechaFin ? new Date(cicloData.fechaFin).toLocaleDateString('es-PE') : '-',
        },
        docente: {
          nombreCompleto: docenteData?.nombreCompleto || 'DOCENTE',
          facultad: docenteData?.facultad || 'INGENIERÍA',
          departamento: docenteData?.departamento || 'INGENIERÍA DE SISTEMAS',
          condicion: docenteData?.condicion || '-',
          categoria: docenteData?.categoria || '-',
          modalidad: docenteData?.dedicacion || '-',
        },
        cargaLectiva: cargaLectivaAgrupada,
        cargaNoLectiva: payload,
        totalHoras: totalGeneralEntero,
      };

      await MySwal.fire({
        icon: 'success',
        title: 'Declaración Enviada',
        text: 'Se ha generado el Formato N° 1 automáticamente.',
        timer: 2000,
        showConfirmButton: false,
      });

      // Descargar reportes
      await generateFormato1PDF(reportData);
      await generateFormato1Excel(reportData);

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
      {/* Título interno para No Lectiva con Estado integrado */}
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

        {/* Badge de Estado en el lado derecho */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: status.bg, 
          px: 2, 
          py: 0.5, 
          borderRadius: 2, 
          border: `1px solid ${status.color}40` 
        }}>
          <Box sx={{ color: status.color, display: 'flex', transform: 'scale(0.8)' }}>{status.icon}</Box>
          <Typography sx={{ fontWeight: 900, color: status.color, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            {status.label}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rows.map((row) => (
            <Box key={row.id}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                    {row.label}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    multiline={row.id !== 'Preparacion'}
                    rows={row.id === 'Preparacion' ? 1 : 5}
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
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        handleInputChange(row.h, isNaN(val) ? 0 : val);
                      }}
                      inputProps={{ 
                        min: 0, 
                        step: 1,
                        style: { textAlign: 'center', fontWeight: 800, color: '#003366' } 
                      }}
                      sx={{ 
                        width: 70,
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: (readOnly || isLocked) ? '#f8fafc' : '#fff',
                          '& fieldset': { borderColor: '#cbd5e1' }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ mt: 2, borderStyle: 'dashed', opacity: 0.6 }} />
            </Box>
          ))}
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
        {/* Botones de Descarga siempre visibles pero al lado de la acción principal */}
        <Box sx={{ display: 'flex', gap: 1, mr: 'auto' }}>
          <Button
            size="medium"
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => {
              const reportData = {
                ciclo: {
                  nombre: cicloData?.nombre || '2026-I',
                  fechaInicio: cicloData?.fechaInicio ? new Date(cicloData.fechaInicio).toLocaleDateString('es-PE') : '-',
                  fechaFinal: cicloData?.fechaFin ? new Date(cicloData.fechaFin).toLocaleDateString('es-PE') : '-',
                },
                docente: {
                  nombreCompleto: docenteData?.nombreCompleto || 'DOCENTE',
                  facultad: docenteData?.facultad || 'INGENIERÍA',
                  departamento: docenteData?.departamento || 'INGENIERÍA DE SISTEMAS',
                  condicion: docenteData?.condicion || '-',
                  categoria: docenteData?.categoria || '-',
                  modalidad: docenteData?.dedicacion || '-',
                },
                cargaLectiva: cargaLectivaAgrupada,
                cargaNoLectiva: data,
                totalHoras: totalGeneralEntero,
              };
              generateFormato1PDF(reportData);
            }}
            sx={{ color: '#ef4444', borderColor: '#ef4444', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#ef444410', borderColor: '#b91c1c' } }}
          >
            Descargar PDF
          </Button>
          <Button
            size="medium"
            variant="outlined"
            startIcon={<ExcelIcon />}
            onClick={() => {
              const reportData = {
                ciclo: {
                  nombre: cicloData?.nombre || '2026-I',
                  fechaInicio: cicloData?.fechaInicio ? new Date(cicloData.fechaInicio).toLocaleDateString('es-PE') : '-',
                  fechaFinal: cicloData?.fechaFin ? new Date(cicloData.fechaFin).toLocaleDateString('es-PE') : '-',
                },
                docente: {
                  nombreCompleto: docenteData?.nombreCompleto || 'DOCENTE',
                  facultad: docenteData?.facultad || 'INGENIERÍA',
                  departamento: docenteData?.departamento || 'INGENIERÍA DE SISTEMAS',
                  condicion: docenteData?.condicion || '-',
                  categoria: docenteData?.categoria || '-',
                  modalidad: docenteData?.dedicacion || '-',
                },
                cargaLectiva: cargaLectivaAgrupada,
                cargaNoLectiva: data,
                totalHoras: totalGeneralEntero,
              };
              generateFormato1Excel(reportData);
            }}
            sx={{ color: '#16a34a', borderColor: '#16a34a', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#16a34a10', borderColor: '#15803d' } }}
          >
            Descargar EXCEL
          </Button>
        </Box>

        {readOnly ? (
          <>
            {data.estado !== 'validado' && (
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
                Observar / Devolver
              </Button>
            )}
          </>
        ) : (
          !isLocked && (
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ 
                borderRadius: 2, 
                px: 5, 
                py: 1.5,
                fontWeight: 900, 
                bgcolor: '#003366', 
                color: '#fff',
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(0,51,102,0.2)',
                '&:hover': { bgcolor: '#002244', boxShadow: '0 6px 16px rgba(0,51,102,0.3)' }
              }}
            >
              {saving ? 'Enviando...' : 'Enviar Declaración'}
            </Button>
          )
        )}
      </Box>
    </Box>
  );
}
