import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface UseHorarioModalProps {
  esDocente: boolean;
  usuario: any;
  cicloId: number | string;
  tipoCargaFiltro?: string;
  docenteFiltro?: any;
}

interface HorarioForm {
  docenteId: string | number;
  tipoCarga: 'LECTIVA' | 'NO_LECTIVA';
  cursoId: string | number;
  actividadNoLectiva: string;
  aulaId: string | number;
  tipoClase: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  grupoId: string | number;
}

export const useHorarioModal = ({ esDocente, usuario, cicloId, tipoCargaFiltro, docenteFiltro }: UseHorarioModalProps) => {
  const [openHorarioModal, setOpenHorarioModal] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<any>(null);
  const [horarioForm, setHorarioForm] = useState<HorarioForm>({
    docenteId: '',
    tipoCarga: 'LECTIVA',
    cursoId: '',
    actividadNoLectiva: '',
    aulaId: '',
    tipoClase: 'teoria',
    diaSemana: 1,
    horaInicio: '07:00',
    horaFin: '08:00',
    grupoId: '',
  });
  const [savingHorario, setSavingHorario] = useState(false);
  const [cursosDocente, setCursosDocente] = useState<any[]>([]);
  const [loadingCursosDocente, setLoadingCursosDocente] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [cargaNoLectivaDocente, setCargaNoLectivaDocente] = useState<any>(null);
  const [originalDuration, setOriginalDuration] = useState<number>(0);

  useEffect(() => {
    const cargarDatosDocente = async () => {
      if (horarioForm.docenteId && cicloId) {
        setLoadingCursosDocente(true);
        try {
          const [resCursos, resNoLectiva] = await Promise.all([
            api.get(`/docentes/${horarioForm.docenteId}/cursos`, { 
              params: { cicloId } 
            }),
            api.get('/carga-no-lectiva', { 
              params: { docenteId: horarioForm.docenteId, cicloId } 
            })
          ]);
          setCursosDocente(resCursos.data || []);
          setCargaNoLectivaDocente(resNoLectiva.data || null);
        } catch (error) {
          console.error('Error cargando datos del docente:', error);
        } finally {
          setLoadingCursosDocente(false);
        }
      } else {
        // Limpiar datos si no hay docente seleccionado
        setCursosDocente([]);
        setCargaNoLectivaDocente(null);
        setGrupos([]);
      }
    };
    cargarDatosDocente();
  }, [horarioForm.docenteId, cicloId]);

  useEffect(() => {
    const tClase = horarioForm.tipoClase?.toLowerCase();
    const cursoId = Number(horarioForm.cursoId);
    
    if (tClase && cursoId && cursosDocente.length > 0) {
      const asig = cursosDocente.find(a => 
        Number(a.cursoId) === cursoId && a.tipoClase.toLowerCase() === tClase
      );
      
      if (asig && Array.isArray(asig.grupos)) {
        const gruposDisponibles = asig.grupos.filter((g: any) => 
          !g.ocupado || (selectedHorario && g.id === selectedHorario.grupoId)
        );
        setGrupos(gruposDisponibles);
        
        // Auto-selección de grupo si solo hay uno disponible
        if (gruposDisponibles.length === 1) {
          setHorarioForm(prev => ({ ...prev, grupoId: gruposDisponibles[0].id }));
        } else if (gruposDisponibles.length > 1) {
          const grupoActualValido = gruposDisponibles.some((g: any) => g.id === horarioForm.grupoId);
          if (!grupoActualValido) {
            setHorarioForm(prev => ({ ...prev, grupoId: '' })); // No auto-seleccionar si hay varios, dejar que el usuario elija
          }
        }
      } else {
        setGrupos([]);
      }
    } else {
      setGrupos([]);
    }
  }, [horarioForm.tipoClase, horarioForm.cursoId, cursosDocente, selectedHorario, horarioForm.grupoId]);

  const openForCreate = (dia: number, horaInicio: string, horaFin: string, extra: Partial<HorarioForm> = {}) => {
    setSelectedHorario(null);
    const duration = parseInt(horaFin.split(':')[0]) - parseInt(horaInicio.split(':')[0]);
    setOriginalDuration(duration);
    setHorarioForm({
      docenteId: esDocente ? (usuario?.docenteId || '') : (docenteFiltro?.id || ''),
      tipoCarga: (tipoCargaFiltro === 'NO_LECTIVA' ? 'NO_LECTIVA' : 'LECTIVA') as 'LECTIVA' | 'NO_LECTIVA',
      cursoId: '',
      actividadNoLectiva: '',
      aulaId: '',
      tipoClase: tipoCargaFiltro === 'NO_LECTIVA' ? 'no_lectiva' : 'teoria',
      diaSemana: dia,
      horaInicio,
      horaFin,
      grupoId: '',
      ...extra
    });
    setOpenHorarioModal(true);
  };

  const openForEdit = (horario: any) => {
    setSelectedHorario(horario);
    
    // Normalizar horas para asegurar formato HH:mm (evitar problemas con segundos de la DB)
    const normalizedInicio = horario.horaInicio?.substring(0, 5) || '07:00';
    const normalizedFin = horario.horaFin?.substring(0, 5) || '08:00';

    const duration = parseInt(normalizedFin.split(':')[0]) - parseInt(normalizedInicio.split(':')[0]);
    setOriginalDuration(duration);
    setHorarioForm({
      docenteId: horario.docenteId,
      tipoCarga: (horario.tipoClase === 'no_lectiva' ? 'NO_LECTIVA' : 'LECTIVA') as 'LECTIVA' | 'NO_LECTIVA',
      cursoId: horario.cursoId || '',
      actividadNoLectiva: horario.actividadNoLectiva || '',
      aulaId: horario.aulaId || '',
      tipoClase: horario.tipoClase,
      diaSemana: horario.diaSemana,
      horaInicio: normalizedInicio,
      horaFin: normalizedFin,
      grupoId: horario.grupoId || '',
    });
    setOpenHorarioModal(true);
  };

  return {
    openHorarioModal,
    setOpenHorarioModal,
    selectedHorario,
    setSelectedHorario,
    horarioForm,
    setHorarioForm,
    savingHorario,
    setSavingHorario,
    cursosDocente,
    loadingCursosDocente,
    grupos,
    loadingGrupos,
    openForCreate,
    openForEdit,
    cargaNoLectivaDocente,
    originalDuration
  };
};
