import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

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
    if (!filtros.ciclo) return;
    
    if (isInitial) setLoading(true); 
    else setFetching(true);

    try {
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

      if (esDocente && usuario?.docenteId) {
        const [asigRes, noLectivaRes] = await Promise.all([
          api.get(`/docentes/${usuario.docenteId}/cursos`, { params: { cicloId: filtros.ciclo } }),
          api.get('/carga-no-lectiva', { params: { docenteId: usuario.docenteId, cicloId: filtros.ciclo } })
        ]);
        setMisAsignaciones(asigRes.data || []);
        setCargaNoLectivaDocente(noLectivaRes.data || null);
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
      
      // Filtrar por tipo de carga y ciclo de estudio
      data = data.filter((h: any) => 
        filtros.tipoCarga === 'LECTIVA' ? h.tipoClase !== 'no_lectiva' : h.tipoClase === 'no_lectiva'
      );
      
      if (filtros.cicloEstudio) {
        data = data.filter((h: any) => 
          h.tipoClase === 'no_lectiva' || String(h.curso?.cicloAcademico || '').trim() === String(filtros.cicloEstudio)
        );
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

  useEffect(() => {
    if (filtros.ciclo) fetchData(false);
  }, [fetchData]);

  return {
    loading,
    fetching,
    horarios,
    setHorarios,
    todosLosHorarios,
    setTodosLosHorarios,
    mapaOcupacion,
    setMapaOcupacion,
    misAsignaciones,
    cargaNoLectivaDocente,
    ciclos,
    docentes,
    aulas,
    carreras,
    cargarCiclos,
    cargarCarreras,
    fetchData
  };
};
