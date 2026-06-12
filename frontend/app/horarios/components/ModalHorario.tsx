import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Chip, Button, 
  Divider, Grid, Autocomplete, TextField, InputAdornment, CircularProgress, MenuItem, Typography 
} from '@mui/material';
import { 
  School as SchoolIcon, 
  AssignmentLate as NoLectivaIcon, 
  Person as PersonIcon, 
  Tune as TuneIcon, 
  Room as RoomIcon, 
  FilterList as FilterIcon, 
  CalendarMonth as CalendarIcon, 
  AccessTime as AccessTimeIcon, 
  Close as CloseIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Add as AddIcon 
} from '@mui/icons-material';

interface ModalHorarioProps {
  open: boolean;
  onClose: () => void;
  selectedHorario: any;
  horarioForm: any;
  setHorarioForm: (form: any) => void;
  docentes: any[];
  cursosDocente: any[];
  cargaNoLectivaDocente: any;
  aulasModalFiltradas: any[];
  grupos: any[];
  aulasOcupadasEnHorario: number[];
  esDocente: boolean;
  docentePuedeGestionar: boolean;
  usuario: any;
  savingHorario: boolean;
  loadingCursosDocente: boolean;
  loadingGrupos: boolean;
  onSave: () => void;
  onDelete: (horario: any) => void;
  selectionSummary: any;
  ACTIVIDADES_NO_LECTIVAS_LABELS: Record<string, string>;
  DIAS: any[];
  HORAS: string[];
  mapaOcupacion: any;
  onRecalcularHoraFin: (horaInicio: string, cursoId: string | number, asignaciones: any[], tipoClasePreferida?: string, duracionSugerida?: number) => any;
  onRecalcularHoraFinNoLectiva: (horaInicio: string, actividadKey: string, duracionSugerida?: number) => string;
  configGrilla: any;
  assignedNoLectivaHours?: Record<string, number>;
  originalDuration?: number;
}

const ModalHorario: React.FC<ModalHorarioProps> = ({
  open,
  onClose,
  selectedHorario,
  horarioForm,
  setHorarioForm,
  docentes,
  cursosDocente,
  cargaNoLectivaDocente,
  aulasModalFiltradas,
  grupos,
  aulasOcupadasEnHorario,
  esDocente,
  docentePuedeGestionar,
  usuario,
  savingHorario,
  loadingCursosDocente,
  loadingGrupos,
  onSave,
  onDelete,
  selectionSummary,
  ACTIVIDADES_NO_LECTIVAS_LABELS,
  DIAS,
  HORAS,
  mapaOcupacion,
  onRecalcularHoraFin,
  onRecalcularHoraFinNoLectiva,
  configGrilla,
  assignedNoLectivaHours,
  originalDuration = 0
}) => {
  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const diasFiltrados = React.useMemo(() => {
    return DIAS.filter(d => configGrilla.diasActivos.includes(d.id));
  }, [configGrilla.diasActivos, DIAS]);

  const horasInicioFiltradas = React.useMemo(() => {
    const filtradas = HORAS.filter(h => h >= configGrilla.horaInicio && h < configGrilla.horaFin);
    // Asegurarse de que la hora actual del formulario esté en la lista (para edición)
    if (horarioForm.horaInicio && !filtradas.includes(horarioForm.horaInicio)) {
      filtradas.push(horarioForm.horaInicio);
      filtradas.sort();
    }
    return filtradas;
  }, [configGrilla.horaInicio, configGrilla.horaFin, HORAS, horarioForm.horaInicio]);

  const horasFinFiltradas = React.useMemo(() => {
    const filtradas = HORAS.filter(h => h > horarioForm.horaInicio && h <= configGrilla.horaFin);
    // Asegurarse de que la hora actual del formulario esté en la lista (para edición)
    if (horarioForm.horaFin && !filtradas.includes(horarioForm.horaFin)) {
      filtradas.push(horarioForm.horaFin);
      filtradas.sort();
    }
    return filtradas;
  }, [horarioForm.horaInicio, configGrilla.horaFin, HORAS, horarioForm.horaFin]);

  // Auto-selección cuando solo queda una opción
  React.useEffect(() => {
    if (open && !selectedHorario && !loadingCursosDocente && horarioForm.docenteId) {
      // Intentamos usar la duración original del drag como objetivo
      const targetDuration = originalDuration;

      if (horarioForm.tipoCarga === 'LECTIVA') {
        const disponibles = cursosDocente.filter(asig => asig.horasAsignadas < asig.horasSemanales);
        if (disponibles.length === 1) {
          const asig = disponibles[0];
          if (horarioForm.cursoId !== asig.cursoId || horarioForm.tipoClase !== asig.tipoClase) {
            const res = onRecalcularHoraFin(horarioForm.horaInicio, asig.cursoId, cursosDocente, asig.tipoClase, targetDuration);
            setHorarioForm({ 
              ...horarioForm, 
              cursoId: asig.cursoId, 
              tipoClase: asig.tipoClase,
              horaFin: res.horaFin 
            });
          } else {
            const res = onRecalcularHoraFin(horarioForm.horaInicio, asig.cursoId, cursosDocente, asig.tipoClase, targetDuration);
            if (res.horaFin !== horarioForm.horaFin) {
              setHorarioForm({ ...horarioForm, horaFin: res.horaFin });
            }
          }
        }
      } else if (horarioForm.tipoCarga === 'NO_LECTIVA') {
        const actividadesDisponibles = Object.entries(ACTIVIDADES_NO_LECTIVAS_LABELS).filter(([key, label]) => {
          const horasDecl = Number(cargaNoLectivaDocente?.[key] || 0);
          const horasAsig = Number(assignedNoLectivaHours?.[key] || 0);
          return horasDecl > 0 && horasAsig < horasDecl;
        });

        if (actividadesDisponibles.length === 1) {
          const [key, label] = actividadesDisponibles[0];
          const hFin = onRecalcularHoraFinNoLectiva(horarioForm.horaInicio, label, targetDuration);
          if (horarioForm.actividadNoLectiva !== label || hFin !== horarioForm.horaFin) {
            setHorarioForm({ ...horarioForm, actividadNoLectiva: label, horaFin: hFin });
          }
        }
      }
    }
  }, [open, selectedHorario, loadingCursosDocente, horarioForm.tipoCarga, cursosDocente, cargaNoLectivaDocente, assignedNoLectivaHours, horarioForm.horaInicio, onRecalcularHoraFin, onRecalcularHoraFinNoLectiva, setHorarioForm, horarioForm.docenteId, originalDuration]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <DialogContent sx={{ pb: 4 }}>
        <Box sx={{ mt: 7 }}>
          <Grid container spacing={3}>
          {/* Formulario principal */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              size="small"
              fullWidth
              disabled={esDocente}
              options={docentes}
              getOptionLabel={(option: any) => option.nombreCompleto || ''}
              value={docentes.find((d: any) => d.id === horarioForm.docenteId) || null}
              onChange={(_, newValue) => {
                 const dId = newValue?.id || '';
                 
                 // Al cambiar de docente, siempre reseteamos el curso/actividad y grupo
                 // para evitar inconsistencias de datos entre diferentes docentes
                 setHorarioForm({ 
                   ...horarioForm, 
                   docenteId: dId, 
                   cursoId: '', 
                   grupoId: '',
                   actividadNoLectiva: ''
                 });
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
            {horarioForm.tipoCarga === 'LECTIVA' ? (
              <TextField
                select
                fullWidth
                size="small"
                label="Curso"
                disabled={!docentePuedeGestionar || !horarioForm.docenteId || loadingCursosDocente}
                value={horarioForm.cursoId && horarioForm.tipoClase ? `${horarioForm.cursoId}-${horarioForm.tipoClase}` : ''}
                onChange={(e) => {
                  const [cId, tClase] = e.target.value.split('-');
                  const res = onRecalcularHoraFin(horarioForm.horaInicio, cId, cursosDocente, tClase, originalDuration);
                  setHorarioForm({ ...horarioForm, cursoId: cId, tipoClase: tClase, grupoId: '', horaFin: res.horaFin });
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
                {cursosDocente
                  .filter((asig: any) => {
                    const completado = asig.horasAsignadas >= asig.horasSemanales;
                    const esElMismoDeEdicion = selectedHorario && 
                                            Number(selectedHorario.cursoId) === Number(asig.cursoId) && 
                                            selectedHorario.tipoClase.toLowerCase() === asig.tipoClase.toLowerCase();
                    return !completado || esElMismoDeEdicion;
                  })
                  .map((asig: any) => {
                    const completado = asig.horasAsignadas >= asig.horasSemanales;
                    const keyOcupacion = `${horarioForm.diaSemana}_${parseInt(horarioForm.horaInicio.split(':')[0])}`;
                    const ocupacionesSlot = mapaOcupacion[keyOcupacion] || [];
                    
                    // Lógica de cruce de grupos inteligente:
                    // 1. Bloqueo Total por mismo curso: Si el mismo curso ya se dicta en este slot, se bloquea (Regla solicitada).
                    // 2. Si el curso tiene solo 1 grupo, se bloquea si el ciclo/carrera ya tiene OTRA actividad en ese slot.
                    // 3. Si el curso tiene múltiples grupos, se bloquea solo si TODOS sus grupos específicos están ocupados.
                    let tieneCruceGrupo = false;
                    const numGruposCurso = Array.isArray(asig.grupos) ? asig.grupos.length : 0;
                    
                    // 1. Validar si el mismo curso ya está en este slot (sin importar docente o grupo)
                    const cursoYaEnSlot = ocupacionesSlot.some((o: any) => 
                      Number(o.cursoId) === Number(asig.cursoId) &&
                      (!selectedHorario || Number(o.id) !== Number(selectedHorario.id))
                    );

                    if (cursoYaEnSlot) {
                      tieneCruceGrupo = true;
                    } else if (numGruposCurso <= 1) {
                      // 2. Bloqueo por ciclo/carrera ocupado (para cursos de 1 solo grupo)
                      tieneCruceGrupo = ocupacionesSlot.some((o: any) => 
                        (!selectedHorario || Number(o.id) !== Number(selectedHorario.id)) && 
                        Number(o.carreraId) === Number(asig.curso?.carreraId) && 
                        String(o.cicloAcademico).trim() === String(asig.curso?.cicloAcademico).trim()
                      );
                    } else {
                      // 3. Bloqueo por grupos agotados (para cursos con múltiples grupos)
                      const idsMisGrupos = asig.grupos.map((g: any) => Number(g.id));
                      const ocupacionesDeMisGrupos = ocupacionesSlot.filter((o: any) => 
                        idsMisGrupos.includes(Number(o.grupoId)) &&
                        (!selectedHorario || Number(o.id) !== Number(selectedHorario.id))
                      );
                      
                      if (ocupacionesDeMisGrupos.length >= numGruposCurso && numGruposCurso > 0) {
                        tieneCruceGrupo = true;
                      }
                    }

                    return (
                      <MenuItem 
                        key={`${asig.cursoId}-${asig.tipoClase}`} 
                        value={`${asig.cursoId}-${asig.tipoClase}`}
                        disabled={tieneCruceGrupo}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {asig.curso?.nombre || 'Curso'}
                            </Typography>
                            {completado ? (
                              <Chip 
                                label="COMPLETADO" 
                                size="small" 
                                color="success"
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.65rem', 
                                  fontWeight: 800,
                                  bgcolor: '#4cd137',
                                  color: 'white'
                                }} 
                              />
                            ) : tieneCruceGrupo ? (
                              <Chip 
                                label="SIN GRUPOS" 
                                size="small" 
                                color="error" 
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} 
                              />
                            ) : null}
                          </Box>
                          <Typography variant="caption" color={tieneCruceGrupo ? "error" : "textSecondary"}>
                            {asig.tipoClase?.toUpperCase()} | {asig.horasAsignadas}h de {asig.horasSemanales}h Semanales asignadas
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
              </TextField>
            ) : (
              <TextField
                select
                fullWidth
                size="small"
                label="Actividad No Lectiva"
                disabled={!docentePuedeGestionar || !horarioForm.docenteId || loadingCursosDocente}
                value={horarioForm.actividadNoLectiva || ''}
                onChange={(e) => {
                  const actKey = e.target.value;
                  const hFin = onRecalcularHoraFinNoLectiva(horarioForm.horaInicio, actKey, originalDuration);
                  setHorarioForm({ ...horarioForm, actividadNoLectiva: actKey, horaFin: hFin });
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {loadingCursosDocente ? (
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                      ) : (
                        <NoLectivaIcon fontSize="small" sx={{ color: '#7c3aed' }} />
                      )}
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar actividad...</MenuItem>
                {Object.entries(ACTIVIDADES_NO_LECTIVAS_LABELS).map(([key, label]) => {
                  const horasDecl = Number(cargaNoLectivaDocente?.[key] || 0);
                  const horasAsig = Number(assignedNoLectivaHours?.[key] || 0);
                  
                  if (horasDecl <= 0) return null;
                  
                  const completado = horasAsig >= horasDecl;
                  const esElMismoDeEdicion = selectedHorario && 
                                           selectedHorario.tipoClase === 'no_lectiva' && 
                                           selectedHorario.actividadNoLectiva === label;

                  // Si ya está completado y NO es la actividad seleccionada para edición, la ocultamos
                  if (completado && !esElMismoDeEdicion) return null;

                  return (
                    <MenuItem key={key} value={label}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {label}
                          </Typography>
                          {completado ? (
                            <Chip 
                              label="COMPLETADO" 
                              size="small" 
                              color="success"
                              sx={{ 
                                height: 20, 
                                fontSize: '0.65rem', 
                                fontWeight: 800,
                                bgcolor: '#4cd137',
                                color: 'white'
                              }} 
                            />
                          ) : null}
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {horasAsig}h de {horasDecl}h declaradas
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            )}
          </Grid>

          {/* Fila 2: Tipo de Clase, Aula y Grupo */}
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo de Clase / Ambiente"
              disabled
              value={horarioForm.tipoCarga === 'NO_LECTIVA' ? 'no_lectiva' : horarioForm.tipoClase}
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
              <MenuItem value="no_lectiva">No Lectiva (Administrativa/Inv.)</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Aula / Ambiente"
              disabled={!docentePuedeGestionar || (horarioForm.tipoCarga === 'LECTIVA' && !horarioForm.tipoClase)}
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
              <MenuItem value="">{horarioForm.tipoCarga === 'NO_LECTIVA' ? 'Sin aula específica' : 'Seleccionar...'}</MenuItem>
              {aulasModalFiltradas.map((a: any) => {
                const isOcupada = aulasOcupadasEnHorario.includes(a.id);
                const isAulaActual = selectedHorario && selectedHorario.aulaId === a.id;
                return (
                  <MenuItem
                    key={a.id}
                    value={a.id}
                    disabled={isOcupada && !isAulaActual}
                  >
                    {a.nombre} {isOcupada && !isAulaActual ? '(Ocupada)' : ''}
                  </MenuItem>
                );
              })}
            </TextField>
          </Grid>

          {horarioForm.tipoCarga === 'LECTIVA' && (
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="N° Grupo"
                disabled={!docentePuedeGestionar || loadingGrupos || grupos.length === 0}
                value={horarioForm.grupoId || ''}
                onChange={(e) => setHorarioForm({ ...horarioForm, grupoId: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Seleccionar grupo...</MenuItem>
                {grupos.map((g: any) => (
                  <MenuItem key={g.id} value={g.id}>
                    Grupo {numberToLetter(g.numeroGrupo)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

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
              {diasFiltrados.map((d) => (
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
                const cursoActual = horarioForm.cursoId;
                
                if (horarioForm.tipoCarga === 'LECTIVA' && cursoActual) {
                  const res = onRecalcularHoraFin(hInicioStr, cursoActual, cursosDocente, horarioForm.tipoClase, originalDuration);
                  setHorarioForm({ ...horarioForm, horaInicio: hInicioStr, horaFin: res.horaFin });
                } else if (horarioForm.tipoCarga === 'NO_LECTIVA' && horarioForm.actividadNoLectiva) {
                  const hFin = onRecalcularHoraFinNoLectiva(hInicioStr, horarioForm.actividadNoLectiva, originalDuration);
                  setHorarioForm({ ...horarioForm, horaInicio: hInicioStr, horaFin: hFin });
                } else {
                  setHorarioForm({ ...horarioForm, horaInicio: hInicioStr });
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
              {horasInicioFiltradas.map((hora) => (
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
              onChange={(e) => setHorarioForm({ ...horarioForm, horaFin: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTimeIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              }}
            >
              {horasFinFiltradas.map((hora) => (
                <MenuItem key={hora} value={hora}>
                  {hora}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>
    </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
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
            {selectedHorario && (!esDocente || Number(selectedHorario.docenteId) === Number(usuario?.docenteId)) && (
              <Button
                onClick={() => onDelete(selectedHorario)}
                color="error"
                disabled={savingHorario}
                variant="outlined"
                startIcon={<DeleteIcon />}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Eliminar
              </Button>
            )}
            {(!selectedHorario || !esDocente || Number(selectedHorario.docenteId) === Number(usuario?.docenteId)) && (
              <Button
                onClick={onSave}
                variant="contained"
                disabled={savingHorario}
                sx={{ 
                  bgcolor: '#003366', 
                  fontWeight: 600, 
                  borderRadius: 2, 
                  '&:hover': { bgcolor: '#002244' },
                  '&.Mui-disabled': { bgcolor: 'rgba(0, 0, 0, 0.12)' }
                }}
                startIcon={savingHorario ? <CircularProgress size={18} color="inherit" /> : selectedHorario ? <EditIcon /> : <AddIcon />}
              >
                {savingHorario ? 'Guardando...' : selectedHorario ? 'Actualizar' : 'Crear'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ModalHorario;
