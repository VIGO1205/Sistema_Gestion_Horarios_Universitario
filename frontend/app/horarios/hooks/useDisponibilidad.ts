import { useMemo } from 'react';

interface UseDisponibilidadProps {
  horarios: any[];
  mapaOcupacion: any;
  configGrilla: any;
  esDocente: boolean;
  usuario: any;
  misAsignaciones: any[];
  filtros: any;
}

export const useDisponibilidad = ({
  horarios,
  mapaOcupacion,
  configGrilla,
  esDocente,
  usuario,
  misAsignaciones,
  filtros
}: UseDisponibilidadProps) => {

  const getEventForSlot = (dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    
    // Normalizar horas de almuerzo para comparación numérica
    const almInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
    const almFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);
    
    if (hora >= almInicio && hora < almFin) {
      return { 
        id: 'lunch', 
        isLunch: true, 
        horaInicio: `${String(almInicio).padStart(2, '0')}:00`,
        horaFin: `${String(almFin).padStart(2, '0')}:00`,
        curso: { nombre: 'ALMUERZO' } 
      };
    }

    const events = horarios.filter((h: any) => {
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      return h.diaSemana === dia && hora >= hInicio && hora < hFin;
    });

    if (events.length > 1) return events;
    return events[0] || null;
  };

  const getDisponibilidadSlot = (dia: number, horaStr: string) => {
    const hora = parseInt(horaStr.split(':')[0]);
    const key = `${dia}_${hora}`;
    const ocupaciones = mapaOcupacion[key] || [];

    if (horaStr === configGrilla.almuerzoInicio) return 'rojo';

    // Identificar el docente sobre el cual validar (el logueado o el seleccionado en filtro)
    const targetDocenteId = esDocente ? usuario?.docenteId : filtros.docente?.id;

    if (targetDocenteId) {
      // Si el docente objetivo ya tiene algo en este slot
      if (ocupaciones.some((o: any) => Number(o.docenteId) === Number(targetDocenteId))) {
        return 'rojo';
      }

      if (filtros.tipoCarga === 'NO_LECTIVA') return 'verde';

      // Lógica de cruce de grupos (ciclo/carrera) para carga lectiva
      // Solo aplica si tenemos las asignaciones del docente (misAsignaciones para docente, o cursosDocente para admin)
      // Pero por ahora, para Admin, priorizamos la disponibilidad del docente individual.
      
      if (esDocente) {
        const misGrupos = misAsignaciones.map(a => ({ 
          carreraId: a.curso?.carreraId, 
          cicloAcademico: a.curso?.cicloAcademico 
        }));
        
        const gruposUnicos = misGrupos.filter((v, i, a) => 
          a.findIndex(t => t.carreraId === v.carreraId && t.cicloAcademico === v.cicloAcademico) === i
        );

        const ocupacionesLectivas = ocupaciones.filter((o: any) => o.tipoClase !== 'no_lectiva');
        
        const gruposOcupados = gruposUnicos.filter(mg => 
          ocupacionesLectivas.some((o: any) => 
            Number(o.carreraId) === Number(mg.carreraId) && 
            String(o.cicloAcademico) === String(mg.cicloAcademico) && 
            Number(o.docenteId) !== Number(targetDocenteId)
          )
        );

        if (gruposOcupados.length === gruposUnicos.length && gruposUnicos.length > 0) return 'rojo';
        if (gruposOcupados.length > 0) return 'amarillo';
      }
    }

    return 'verde';
  };

  const getColorByDisponibilidad = (disponibilidad: string) => {
    if (disponibilidad === 'rojo') return 'rgba(239, 68, 68, 0.12)';
    if (disponibilidad === 'amarillo') return 'rgba(245, 158, 11, 0.12)';
    if (disponibilidad === 'verde') return 'rgba(34, 197, 94, 0.08)';
    return 'transparent';
  };

  const getColorByDocente = (docenteId: number | string) => {
    const id = Number(docenteId);
    
    // Si es modo docente y el ID no es el del usuario, usar un color de "ocupado" (rojo tenue)
    if (esDocente && id !== Number(usuario?.docenteId)) return 'rgba(211, 47, 47, 0.1)';
    
    // Paleta de colores vibrantes y distintos para Admin/Coordinador
    const colors = [
      'rgba(37, 99, 235, 0.15)',   // Azul intenso
      'rgba(22, 163, 74, 0.15)',   // Verde bosque
      'rgba(217, 70, 239, 0.15)',  // Fucsia
      'rgba(249, 115, 22, 0.15)',  // Naranja
      'rgba(14, 165, 233, 0.15)',  // Sky Blue
      'rgba(168, 85, 247, 0.15)',  // Violeta
      'rgba(244, 63, 94, 0.15)',   // Rosa/Rojo
      'rgba(20, 184, 166, 0.15)',  // Teal
      'rgba(234, 179, 8, 0.15)',   // Dorado/Amarillo
      'rgba(71, 85, 105, 0.15)',   // Slate/Gris azulado
      'rgba(190, 18, 60, 0.15)',   // Carmesí
      'rgba(3, 105, 161, 0.15)',   // Azul cobalto
    ];
    
    // Función de hash para distribuir IDs y generar colores únicos
    // Usamos una combinación de multiplicación y XOR para asegurar que IDs cercanos (como 1 y 2)
    // resulten en índices muy distantes en el array de colores.
    const hash = ((id ^ (id >>> 16)) * 0x45d9f3b) >>> 0;
    const finalHash = ((hash ^ (hash >>> 16)) * 0x45d9f3b) >>> 0;
    
    return colors[finalHash % colors.length];
  };

  return {
    getEventForSlot,
    getDisponibilidadSlot,
    getColorByDisponibilidad,
    getColorByDocente
  };
};
