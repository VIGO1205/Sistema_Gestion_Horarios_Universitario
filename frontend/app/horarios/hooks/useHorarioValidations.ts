import { useMemo } from 'react';
import { ACTIVIDADES_NO_LECTIVAS_LABELS } from '../constantes';
import { normalizeSlotRange, slotIndexToTime, slotIndexToEndTime, timeToSlotIndex } from '../utils/utilidades-tiempo';

interface UseHorarioValidationsProps {
  horarios: any[];
  todosLosHorarios: any[];
  horarioForm: any;
  aulas: any[];
  esDocente: boolean;
  usuario: any;
  misAsignaciones: any[];
  cargaNoLectivaDocente: any;
  configGrilla: any;
  cursosDocente: any[];
  selectedHorario: any;
  originalDuration?: number;
}

export const useHorarioValidations = ({
  horarios,
  todosLosHorarios,
  horarioForm,
  aulas,
  esDocente,
  usuario,
  misAsignaciones,
  cargaNoLectivaDocente,
  configGrilla,
  cursosDocente,
  selectedHorario,
  originalDuration = 0
}: UseHorarioValidationsProps) => {

  const aulasModalFiltradas = useMemo(() => {
    if (horarioForm.tipoCarga === 'NO_LECTIVA') return aulas;
    if (!horarioForm.tipoClase) return aulas;
    const mapping: Record<string, string> = { 
      'teoria': 'teoría', 
      'practica': 'práctica', 
      'laboratorio': 'laboratorio' 
    };
    const tipoBuscado = mapping[horarioForm.tipoClase] || horarioForm.tipoClase;
    return aulas.filter((a: any) => a.tipo.toLowerCase() === tipoBuscado.toLowerCase());
  }, [horarioForm.tipoCarga, horarioForm.tipoClase, aulas]);

  const aulasOcupadasEnHorario = useMemo(() => {
    if (!horarioForm.diaSemana || !horarioForm.horaInicio || !horarioForm.horaFin) return [];
    const hInicio = parseInt(horarioForm.horaInicio.split(':')[0]);
    const hFin = parseInt(horarioForm.horaFin.split(':')[0]);
    
    return todosLosHorarios.filter((h: any) => {
      if (h.diaSemana !== horarioForm.diaSemana) return false;
      const hInicioOcupado = parseInt(h.horaInicio.split(':')[0]);
      const hFinOcupado = parseInt(h.horaFin.split(':')[0]);
      return (hInicio < hFinOcupado && hFin > hInicioOcupado);
    }).map((h: any) => h.aulaId);
  }, [horarioForm.diaSemana, horarioForm.horaInicio, horarioForm.horaFin, todosLosHorarios]);

  const assignedNoLectivaHours = useMemo(() => {
    const result: Record<string, number> = {};
    const labelToKey: Record<string, string> = {};
    Object.entries(ACTIVIDADES_NO_LECTIVAS_LABELS).forEach(([key, label]) => {
      labelToKey[label] = key;
    });

    todosLosHorarios.forEach(h => {
      // Usar el docenteId del formulario si existe (para Admin), sino el del usuario logueado
      const targetDocenteId = horarioForm.docenteId || usuario?.docenteId;
      
      if (h.tipoClase === 'no_lectiva' && h.actividadNoLectiva && Number(h.docenteId) === Number(targetDocenteId)) {
        const hInicio = parseInt(h.horaInicio.split(':')[0]);
        const hFin = parseInt(h.horaFin.split(':')[0]);
        const duracion = hFin - hInicio;
        const internalKey = labelToKey[h.actividadNoLectiva] || h.actividadNoLectiva;
        result[internalKey] = (result[internalKey] || 0) + duracion;
      }
    });
    return result;
  }, [horarios, horarioForm.docenteId, usuario?.docenteId]);

  const docenteHasHoursAvailable = useMemo(() => {
    if (!esDocente || !usuario?.docenteId) return true;
    const hasLectivaAvailable = misAsignaciones.some(a => a.horasAsignadas < a.horasSemanales);
    if (hasLectivaAvailable) return true;
    
    if (cargaNoLectivaDocente) {
      const actividades = Object.keys(ACTIVIDADES_NO_LECTIVAS_LABELS);
      const hasNoLectivaAvailable = actividades.some(act => {
        const decl = Number(cargaNoLectivaDocente[act] || 0);
        const asig = assignedNoLectivaHours[act] || 0;
        return asig < decl;
      });
      if (hasNoLectivaAvailable) return true;
    }
    return false;
  }, [esDocente, usuario?.docenteId, misAsignaciones, cargaNoLectivaDocente, assignedNoLectivaHours]);

  const recalcularHoraFin = (
    horaInicio: string,
    cursoId: string | number,
    asignaciones = cursosDocente,
    tipoClasePreferida?: string,
    duracionSugerida?: number
  ) => {
    const hInicio = parseInt(horaInicio.split(':')[0]);
    const cIdNormalizado = Number(cursoId);
    const prefLower = tipoClasePreferida?.toLowerCase();
    
    const asig = asignaciones.find((a: any) => {
      const coincideCurso = Number(a.cursoId) === cIdNormalizado;
      const coincideTipo = !prefLower || a.tipoClase.toLowerCase() === prefLower;
      return coincideCurso && coincideTipo;
    }) || asignaciones.find((a: any) => Number(a.cursoId) === cIdNormalizado);
    
    let duracionAFijar = duracionSugerida || 1;
    if (asig) {
      const horasMaximas = Number(asig.horasSemanales);
      const numGrupos = Array.isArray(asig.grupos) ? asig.grupos.length : 1;
      const horasPermitidasPorGrupo = Math.ceil(horasMaximas / (numGrupos || 1));
      
      const horasYaAsignadas = Number(asig.horasAsignadas);
      const currentEventDuration = (selectedHorario?.horaFin && selectedHorario?.horaInicio)
        ? (parseInt(selectedHorario.horaFin) - parseInt(selectedHorario.horaInicio))
        : 0;
      
      const horasDisponiblesTotal = Math.max(0, horasMaximas - (horasYaAsignadas - currentEventDuration));
      const limiteEfectivo = Math.min(horasPermitidasPorGrupo, horasDisponiblesTotal);
      
      // Priorizamos la duración original del drag si existe
      const durationToApply = duracionSugerida !== undefined ? duracionSugerida : originalDuration;
      duracionAFijar = Math.min(durationToApply || 2, limiteEfectivo);
    } else if (duracionSugerida === undefined) {
      duracionAFijar = 2;
    }
    
    if (duracionAFijar <= 0) duracionAFijar = 1;
    const hFin = String(Math.min(22, hInicio + duracionAFijar)).padStart(2, '0') + ':00';
    return {
      cursoId: asig?.cursoId ?? cursoId,
      tipoClase: asig?.tipoClase || tipoClasePreferida || horarioForm.tipoClase,
      horaFin: hFin,
    };
  };

  const recalcularHoraFinNoLectiva = (
    horaInicio: string,
    actividadKey: string,
    duracionSugerida?: number
  ) => {
    const hInicio = parseInt(horaInicio.split(':')[0]);
    let duracionAFijar = duracionSugerida || 1;
    
    if (actividadKey && cargaNoLectivaDocente) {
      const labelToKey: Record<string, string> = {};
      Object.entries(ACTIVIDADES_NO_LECTIVAS_LABELS).forEach(([key, label]) => {
        labelToKey[label] = key;
      });
      const internalKey = labelToKey[actividadKey] || actividadKey;

      // Asegurarnos de que estamos leyendo el valor numérico correctamente
      const horasDecl = Number(cargaNoLectivaDocente?.[internalKey] || 0);
      const horasAsig = assignedNoLectivaHours[internalKey] || 0;
      
      const currentEventDuration = (selectedHorario?.horaFin && selectedHorario?.horaInicio) 
        ? (parseInt(selectedHorario.horaFin) - parseInt(selectedHorario.horaInicio)) 
        : 0;
      
      // Horas que realmente quedan por programar para esta actividad
      const horasDisponibles = Math.max(0, horasDecl - (horasAsig - currentEventDuration));
      
      // El límite es lo que el usuario arrastró originalmente o lo que queda disponible
      const durationToApply = duracionSugerida !== undefined ? duracionSugerida : originalDuration;
      duracionAFijar = Math.min(durationToApply || 2, horasDisponibles);
    } else if (duracionSugerida === undefined) {
      duracionAFijar = 2;
    }
    
    if (duracionAFijar <= 0) duracionAFijar = 1;
    return String(Math.min(22, hInicio + duracionAFijar)).padStart(2, '0') + ':00';
  };

  const getSelectionValidation = (selection: any) => {
    if (!selection) return { valido: true, conflictos: [] as string[], horaInicio: '', horaFin: '' };
    
    const { startIndex, endIndex } = normalizeSlotRange(selection.startIndex, selection.endIndex);
    const horaInicio = slotIndexToTime(startIndex, configGrilla.horaInicio);
    const horaFin = slotIndexToEndTime(endIndex, configGrilla.horaInicio);
    const conflictos = [];
    
    const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
    const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);

    for (let i = startIndex; i <= endIndex; i++) {
      const currentHour = parseInt(slotIndexToTime(i, configGrilla.horaInicio).split(':')[0]);
      if (currentHour >= hAlmInicio && currentHour < hAlmFin) {
        conflictos.push(`La selección incluye la franja de almuerzo (${configGrilla.almuerzoInicio} - ${configGrilla.almuerzoFin})`);
        break;
      }
    }

    horarios.forEach((horario: any) => {
      if (selection.mode === 'edit' && selection.event?.id === horario.id) return;
      if (horario.diaSemana !== selection.day) return;
      
      const hInicioIndex = timeToSlotIndex(horario.horaInicio, configGrilla.horaInicio);
      const hFinIndex = timeToSlotIndex(horario.horaFin, configGrilla.horaInicio);
      
      if (startIndex < hFinIndex && endIndex >= hInicioIndex) {
        conflictos.push(`${horario.curso?.nombre || 'Horario'} (${horario.horaInicio.substring(0, 5)}-${horario.horaFin.substring(0, 5)})`);
      }
    });

    return { valido: conflictos.length === 0, conflictos, horaInicio, horaFin };
  };

  return {
    aulasModalFiltradas,
    aulasOcupadasEnHorario,
    assignedNoLectivaHours,
    docenteHasHoursAvailable,
    recalcularHoraFin,
    recalcularHoraFinNoLectiva,
    getSelectionValidation
  };
};
