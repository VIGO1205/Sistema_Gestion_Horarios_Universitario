import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

const DIA_MAP: Record<string, number> = {
  'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4,
  'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
};

interface UseHorariosDataProps {
  filtros: any;
  usuario: any;
  esDocente: boolean;
}

export const useHorariosData = ({ filtros, usuario, esDocente }: UseHorariosDataProps) => {
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [todosLosHorarios, setTodosLosHorarios] = useState<any[]>([]);
  const [mapaOcupacion, setMapaOcupacion] = useState<any>({});
  const [misAsignaciones, setMisAsignaciones] = useState<any[]>([]);
  const [cargaNoLectivaDocente, setCargaNoLectivaDocente] = useState<any>(null);
  const [cargaAdicional, setCargaAdicional] = useState<any>(null);
  
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);

  const cargarCiclos = useCallback(async () => {
    try {
      const [ciclosRes, actualRes] = await Promise.all([
        api.get('/ciclos'),
        api.get('/ciclos/actual')
      ]);
      setCiclos(ciclosRes.data);
      return actualRes.data;
    } catch (error) {
      console.error('Error cargando ciclos:', error);
      return null;
    }
  }, []);

  const cargarCarreras = useCallback(async () => {
    try {
      const res = await api.get('/carreras');
      setCarreras(res.data || []);
      return res.data?.find((c: any) => c.nombre.toLowerCase().includes('sistemas'));
    } catch (error) {
      console.error('Error cargando carreras:', error);
      return null;
    }
  }, []);

  const fetchData = useCallback(async (isInitial = true) => {
    console.log('📡 fetchData ejecutándose con ciclo:', filtros.ciclo, '| isInitial:', isInitial);
    
    if (isInitial) setLoading(true); 
    else setFetching(true);

    try {
      if (!filtros.ciclo) {
        console.log('⚠️ fetchData: ciclo vacío, saltando fetch');
        return;
      }
      const docenteParams: any = {};
      if (filtros.carrera?.id) docenteParams.carreraId = filtros.carrera.id;
      
      const [docentesRes, aulasRes, ocupacionRes] = await Promise.all([
        api.get('/docentes', { params: docenteParams }),
        api.get('/aulas'),
        api.get('/horarios/mapa-ocupacion', { params: { cicloId: filtros.ciclo } })
      ]);
      
      setDocentes(docentesRes.data || []);
      setAulas(aulasRes.data || []);
      setMapaOcupacion(ocupacionRes.data || {});

      let cargaAdicionalData = null;

      if (esDocente && usuario?.docenteId) {
        const [asigRes, noLectivaRes, filialRes] = await Promise.all([
          api.get(`/docentes/${usuario.docenteId}/cursos`, { params: { cicloId: filtros.ciclo } }),
          api.get('/carga-no-lectiva', { params: { docenteId: usuario.docenteId, cicloId: filtros.ciclo } }),
          api.get('/asignacion-filial', { params: { docenteId: usuario.docenteId, cicloId: filtros.ciclo } }).catch(() => ({ data: null }))
        ]);
        setMisAsignaciones(asigRes.data || []);
        setCargaNoLectivaDocente(noLectivaRes.data || null);
        cargaAdicionalData = filialRes.data || null;
        setCargaAdicional(cargaAdicionalData);
      }

      const params: any = { cicloId: filtros.ciclo };
      if (filtros.carrera?.id) params.carreraId = filtros.carrera.id;
      
      if (esDocente && usuario?.docenteId) {
        params.docenteId = usuario.docenteId;
      } else if (filtros.docente) {
        params.docenteId = filtros.docente.id;
      }
      
      if (filtros.aula !== 'todos') params.aulaId = filtros.aula;

      const [response, todosHorariosResponse] = await Promise.all([
        api.get('/horarios', { params }),
        api.get('/horarios', { params: { cicloId: filtros.ciclo } })
      ]);

      setTodosLosHorarios(todosHorariosResponse.data || []);
      
      let data = response.data || [];
      
      // Transformar carga adicional (filial) a eventos tipo horario
      const filialEvents: any[] = [];
      if (esDocente && cargaAdicionalData?.cursos) {
        for (const curso of cargaAdicionalData.cursos) {
          if (!curso.horarioSemanal) continue;
          for (let idx = 0; idx < curso.horarioSemanal.length; idx++) {
            const slot = curso.horarioSemanal[idx];
            const diaNum = DIA_MAP[slot.dia];
            if (!diaNum) continue;
            filialEvents.push({
              id: `filial_${curso.id}_${idx}`,
              tipoClase: 'filial',
              horaInicio: slot.horaInicio,
              horaFin: slot.horaFin,
              diaSemana: diaNum,
              curso: { nombre: curso.nombre },
              docente: cargaAdicionalData.docente || { nombreCompleto: '' },
              aula: { nombre: curso.dependencia || 'FILIAL' },
              actividadNoLectiva: curso.dependencia || 'CARGA ADICIONAL',
              docenteId: cargaAdicionalData.docenteId,
              esFilial: true,
            });
          }
        }
      }
      
      // Filtrar por tipo de carga y ciclo de estudio
      if (filtros.tipoCarga === 'LECTIVA') {
        data = data.filter((h: any) => h.tipoClase !== 'no_lectiva' && h.tipoClase !== 'filial');
      } else if (filtros.tipoCarga === 'NO_LECTIVA') {
        data = data.filter((h: any) => h.tipoClase === 'no_lectiva');
      }
      // 'TODAS' → incluye lectiva, no lectiva y filial
      
      if (filtros.cicloEstudio && filtros.cicloEstudio !== 'todos') {
        data = data.filter((h: any) => 
          h.tipoClase === 'no_lectiva' || h.tipoClase === 'filial' ||
          String(h.curso?.cicloAcademico || '').trim() === String(filtros.cicloEstudio)
        );
      }
      
      // Fusionar eventos filiales solo en vista TODAS
      if (!filtros.tipoCarga || filtros.tipoCarga === 'TODAS') {
        data = [...data, ...filialEvents];
      }
      
      setHorarios(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setHorarios([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [filtros.ciclo, filtros.cicloEstudio, filtros.carrera, filtros.docente, filtros.aula, filtros.tipoCarga, esDocente, usuario?.docenteId]);

  const cicloInicializado = useRef(false);

  useEffect(() => {
    if (!filtros.ciclo) return;
    if (!cicloInicializado.current) {
      cicloInicializado.current = true;
      fetchData(true);
    } else {
      fetchData(false);
    }
  }, [filtros.ciclo, fetchData]);

  return {
    loading,
    fetching,
    horarios,
    todosLosHorarios,
    mapaOcupacion,
    misAsignaciones,
    cargaNoLectivaDocente,
    cargaAdicional,
    ciclos,
    docentes,
    aulas,
    carreras,
    cargarCiclos,
    cargarCarreras,
    fetchData
  };
};
