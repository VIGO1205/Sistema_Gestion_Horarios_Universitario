'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Snackbar, Alert, Typography } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/components/providers/AuthProvider';
import { getHorariosSocket } from '@/lib/socket';

// Importar constantes y utilidades
import { 
  DIAS, 
  HORAS, 
  ACTIVIDADES_NO_LECTIVAS_LABELS 
} from './constantes';
import { 
  timeToSlotIndex, 
  slotIndexToEndTime 
} from './utils/utilidades-tiempo';

// Importar componentes modulares
import CabeceraHorario from './components/CabeceraHorario';
import FiltrosHorario from './components/FiltrosHorario';
import LeyendaDisponibilidad from './components/LeyendaDisponibilidad';
import GrillaHorario from './components/GrillaHorario';
import ModalHorario from './components/ModalHorario';
import PopoverEventos from './components/PopoverEventos';
import ModalConfiguracionGrilla from './components/ModalConfiguracionGrilla';

// Importar hooks personalizados
import { useConfiguracionGrilla } from './hooks/useConfiguracionGrilla';
import { useHorariosData } from './hooks/useHorariosData';
import { useDisponibilidad } from './hooks/useDisponibilidad';
import { useHorarioValidations } from './hooks/useHorarioValidations';
import { useHorarioModal } from './hooks/useHorarioModal';
import { useDragSelection } from './hooks/useDragSelection';
import { useVentanaAtencion } from './hooks/useVentanaAtencion';

const MySwal = withReactContent(Swal);

export default function HorariosPage() {
  const { usuario } = useAuth();
  const esDocente = usuario?.rol === 'docente';
  const esAdmin = usuario?.rol === 'admin';
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverEvents, setPopoverEvents] = useState<any[]>([]);
  const [selectionSummary, setSelectionSummary] = useState<{ dia: string; horaInicio: string; horaFin: string } | null>(null);
  const [showSelectionToast, setShowSelectionToast] = useState(false);
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const [filtros, setFiltros] = useState({
    ciclo: '',
    cicloEstudio: esDocente ? 'todos' : '1',
    carrera: null as any,
    docente: null as any,
    aula: 'todos',
    tipoAula: 'todos',
    tipoCarga: 'TODAS'
  });

  // 1. Hook de datos principales
  const {
    loading,
    fetching,
    horarios,
    todosLosHorarios,
    mapaOcupacion,
    misAsignaciones,
    cargaNoLectivaDocente,
    ciclos,
    docentes,
    aulas,
    carreras,
    cargarCiclos,
    cargarCarreras,
    fetchData
  } = useHorariosData({ filtros, usuario, esDocente });

  // 2. Hook de configuración de grilla
  const {
    configGrilla,
    updateConfig
  } = useConfiguracionGrilla(filtros.ciclo);

  // Memos para listas filtradas
  const aulasFiltradas = useMemo(() => {
    return filtros.tipoAula === 'todos' ? aulas : aulas.filter((a: any) => a.tipo === filtros.tipoAula);
  }, [filtros.tipoAula, aulas]);

  const docentesFiltrados = useMemo(() => {
    return docentes; // Podrías añadir más lógica de filtrado aquí si es necesario
  }, [docentes]);

  // 3. Hook de modal de horario
  const {
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
    cargaNoLectivaDocente: cargaNoLectivaModal,
    originalDuration
  } = useHorarioModal({ 
    esDocente, 
    usuario, 
    cicloId: filtros.ciclo,
    tipoCargaFiltro: filtros.tipoCarga,
    docenteFiltro: filtros.docente
  });

  // 4. Hook de disponibilidad y colores
  const {
    getEventForSlot,
    getDisponibilidadSlot,
    getColorByDisponibilidad,
    getColorByDocente,
    getColorByCurso
  } = useDisponibilidad({
    horarios,
    mapaOcupacion,
    configGrilla,
    esDocente,
    usuario,
    misAsignaciones,
    filtros
  });

  // 5. Hook de validaciones
  const {
    aulasModalFiltradas,
    aulasOcupadasEnHorario,
    docenteHasHoursAvailable,
    recalcularHoraFin,
    recalcularHoraFinNoLectiva,
    getSelectionValidation,
    assignedNoLectivaHours
  } = useHorarioValidations({
    horarios,
    todosLosHorarios,
    horarioForm,
    aulas,
    esDocente,
    usuario,
    misAsignaciones,
    cargaNoLectivaDocente: esDocente ? cargaNoLectivaDocente : cargaNoLectivaModal,
    configGrilla,
    cursosDocente,
    selectedHorario,
    originalDuration
  });

  // 6. Hook de selección por arrastre
  const {
    dragSelection,
    startDrag
  } = useDragSelection({
    configGrilla,
    tableContainerRef,
    onSelectionComplete: (selection) => {
      const validation = getSelectionValidation(selection);
      if (!validation.valido) {
        MySwal.fire({ icon: 'warning', title: 'Cruce detectado', text: validation.conflictos[0] });
        return;
      }
      
      const horaInicio = validation.horaInicio;
      let horaFin = validation.horaFin;
      const duracionSugerida = (selection.endIndex - selection.startIndex) + 1;

      if (horarioForm.tipoCarga === 'NO_LECTIVA') {
        horaFin = recalcularHoraFinNoLectiva(horaInicio, selection.event?.actividadNoLectiva || '', duracionSugerida);
      } else {
        const res = recalcularHoraFin(horaInicio, selection.event?.cursoId || '', cursosDocente, selection.event?.tipoClase, duracionSugerida);
        horaFin = res.horaFin;
      }

      const diaNombre = DIAS.find(d => d.id === selection.day)?.nombre || '';
      setSelectionSummary({ dia: diaNombre, horaInicio, horaFin });
      setShowSelectionToast(true);
      
      if (selection.mode === 'edit') {
        openForEdit(selection.event);
      } else {
        openForCreate(selection.day, horaInicio, horaFin);
      }
    }
  });

  // 7. Hook de ventana de atención (para docentes)
  const {
    estadoSeleccion,
    docentePuedeGestionar
  } = useVentanaAtencion(usuario, esDocente);

  // Carga inicial de ciclos y carreras
  useEffect(() => {
    const init = async () => {
      const actualCiclo = await cargarCiclos();
      if (actualCiclo) setFiltros(prev => ({ ...prev, ciclo: actualCiclo.id }));
      
      const sistemas = await cargarCarreras();
      if (sistemas) setFiltros(prev => ({ ...prev, carrera: sistemas }));
    };
    init();
  }, [cargarCiclos, cargarCarreras, esDocente]);

  // Sockets para actualizaciones en tiempo real
  useEffect(() => {
    let socket: any = null;
    const initSocket = async () => {
      socket = await getHorariosSocket();
      socket.emit('horarios:subscribe', { cicloId: filtros.ciclo });
      
      const handleHorariosUpdate = (data: any) => {
        if (!filtros.ciclo || Number(data.cicloId) === Number(filtros.ciclo)) {
          fetchData(false);
        }
      };

      socket.on('horarios:update', handleHorariosUpdate);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.off('horarios:update');
      }
    };
  }, [filtros.ciclo, fetchData]);

  const handleSaveHorario = async () => {
    // Validación: NO permitir cruce del mismo curso en carga lectiva
    if (horarioForm.tipoCarga === 'LECTIVA' && horarioForm.cursoId) {
      const cursoId = parseInt(horarioForm.cursoId as string);
      const hInicio = parseInt(horarioForm.horaInicio.split(':')[0]);
      const hFin = parseInt(horarioForm.horaFin.split(':')[0]);

      // Buscar si el mismo curso ya está programado en ese horario
      const cursoOcupado = todosLosHorarios.some((h: any) => {
        // Ignorar el horario que se está editando
        if (selectedHorario && h.id === selectedHorario.id) return false;

        // Solo carga lectiva
        if (h.tipoClase === 'no_lectiva') return false;

        // Mismo curso
        if (Number(h.cursoId) !== cursoId) return false;

        // Mismo día
        if (h.diaSemana !== horarioForm.diaSemana) return false;

        // Verificar superposición de horarios
        const hInicioOcupado = parseInt(h.horaInicio.split(':')[0]);
        const hFinOcupado = parseInt(h.horaFin.split(':')[0]);
        const seSuperpone = (hInicio < hFinOcupado && hFin > hInicioOcupado);

        return seSuperpone;
      });

      if (cursoOcupado) {
        MySwal.fire({
          icon: 'error',
          title: 'Cruce de Curso',
          text: 'El mismo curso ya está programado en este horario. No se permite cruce del mismo curso en carga lectiva.',
          confirmButtonColor: '#d33'
        });
        return;
      }
    }

    setSavingHorario(true);
    try {
      const payload = {
        docenteId: parseInt(horarioForm.docenteId as string),
        cicloId: parseInt(filtros.ciclo),
        diaSemana: horarioForm.diaSemana,
        horaInicio: horarioForm.horaInicio,
        horaFin: horarioForm.horaFin,
        tipoClase: horarioForm.tipoCarga === 'NO_LECTIVA' ? 'no_lectiva' : horarioForm.tipoClase,
        actividadNoLectiva: horarioForm.tipoCarga === 'NO_LECTIVA' ? horarioForm.actividadNoLectiva : undefined,
        cursoId: horarioForm.tipoCarga === 'LECTIVA' ? parseInt(horarioForm.cursoId as string) : undefined,
        aulaId: horarioForm.aulaId ? parseInt(horarioForm.aulaId as string) : undefined,
        grupoId: (horarioForm.tipoCarga === 'LECTIVA' && horarioForm.grupoId) ? parseInt(horarioForm.grupoId as string) : undefined,
      };

      if (selectedHorario) await api.put(`/horarios/${selectedHorario.id}`, payload);
      else await api.post('/horarios', payload);

      setOpenHorarioModal(false);
      fetchData(false);
    } catch (error: any) {
      MySwal.fire('Error', error.response?.data?.message || 'Error al guardar horario', 'error');
    } finally {
      setSavingHorario(false);
    }
  };

  const handleDeleteHorario = async (horario: any) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/horarios/${horario.id}`);
        fetchData(false);
        MySwal.fire('Eliminado', 'El horario ha sido eliminado.', 'success');
      } catch (e) {
        console.error(e);
        MySwal.fire('Error', 'No se pudo eliminar el horario.', 'error');
      }
    }
  };

  const handleSaveConfigGrilla = async (newConfig: any) => {
    try {
      await updateConfig(newConfig);
      setOpenConfigModal(false);
      MySwal.fire({
        icon: 'success',
        title: 'Configuración guardada',
        text: 'Los ajustes se han persistido para este periodo académico.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      MySwal.fire('Error', 'No se pudo guardar la configuración.', 'error');
    }
  };

  const cicloActual = ciclos?.find((c: any) => c.esActual);
  const cicloEsActual = cicloActual && filtros.ciclo === cicloActual.id;

  if (loading) return <LoadingSpinner />;

  const obtenerMensajeHorario = () => {
    if (!cicloEsActual) return null;
    if (!estadoSeleccion || !esDocente) return null;
    if (estadoSeleccion.estado === 'en_atencion' || estadoSeleccion.estado === 'finalizado') return null;
    if (estadoSeleccion.estado === 'en_espera') return {
      icon: <AccessTimeIcon sx={{ fontSize: 48, color: '#f59e0b', mb: 1.5 }} />,
      title: 'Fuera de Turno — Esperando en cola',
      body: (
        <>
          <Typography variant="body2" sx={{ color: '#78350f', mb: 1, fontWeight: 600 }}>
            Posición en cola: {estadoSeleccion.posicion} de {estadoSeleccion.totalEnEspera}
            {estadoSeleccion.minutosHastaTurno ? ` — Tiempo estimado: ${estadoSeleccion.minutosHastaTurno} min` : ''}
          </Typography>
          <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 500 }}>
            Podrá gestionar sus horarios cuando sea su turno.
          </Typography>
        </>
      ),
    };
    if (estadoSeleccion.estado === 'sin_ventana') return {
      icon: <AccessTimeIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />,
      title: 'Ventanas de atención no disponibles',
      body: (
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Las ventanas de atención aún no han sido programadas por el administrador.
        </Typography>
      ),
    };
    if (estadoSeleccion.estado === 'no_programado') return {
      icon: <AccessTimeIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />,
      title: 'Sin ventana de atención asignada',
      body: (
        <>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
            Usted aún no ha sido asignado a una ventana de atención.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
            Asegúrese de tener su carga lectiva y horarios completos.
          </Typography>
        </>
      ),
    };
    return null;
  };

  const mensajeHorario = obtenerMensajeHorario();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CabeceraHorario 
        onRefrescar={() => fetchData(false)} 
        onExportar={() => {}} 
        esAdmin={esAdmin}
        onConfigurar={() => setOpenConfigModal(true)}
      />

      <FiltrosHorario 
        filtros={filtros}
        setFiltros={setFiltros}
        ciclos={ciclos}
        carreras={carreras}
        docentesFiltrados={docentesFiltrados}
        aulasFiltradas={aulasFiltradas}
        esDocente={esDocente}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        onLimpiar={() => setFiltros(prev => ({ ...prev, ciclo: '', cicloEstudio: esDocente ? 'todos' : '1', docente: null, aula: 'todos', tipoAula: 'todos', tipoCarga: 'TODAS' }))}
        tiposAula={[{ id: 'teoría', nombre: 'Teoría' }, { id: 'práctica', nombre: 'Práctica' }, { id: 'laboratorio', nombre: 'Laboratorio' }]}
      />

      <LeyendaDisponibilidad 
        tipoCarga={filtros.tipoCarga}
        setTipoCarga={(tipo) => setFiltros({ ...filtros, tipoCarga: tipo })}
      />

      {mensajeHorario ? (
        <Box sx={{
          textAlign: 'center', py: 12, px: 4,
          bgcolor: '#fff8f0', borderRadius: 4,
          border: '2px dashed #f59e0b', my: 2
        }}>
          {mensajeHorario.icon}
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400e', mb: 1 }}>
            {mensajeHorario.title}
          </Typography>
          {mensajeHorario.body}
        </Box>
      ) : (
      <GrillaHorario 
        horarios={horarios}
        fetching={fetching}
        configGrilla={configGrilla}
        onCellClick={(dia, hora) => {
          if (esDocente && cicloEsActual && !docentePuedeGestionar) return;
          const hFin = slotIndexToEndTime(timeToSlotIndex(hora, configGrilla.horaInicio), configGrilla.horaInicio);
          openForCreate(dia, hora, hFin);
        }}
        onEditHorario={(h) => {
          if (esDocente && !docentePuedeGestionar) return;
          openForEdit(h);
        }}
        onDeleteHorario={handleDeleteHorario}
        getEventForSlot={getEventForSlot}
        getDisponibilidadSlot={getDisponibilidadSlot}
        getColorByDisponibilidad={getColorByDisponibilidad}
        getColorByDocente={getColorByDocente}
        getColorBorderByDocente={(id) => getColorByDocente(id).replace('0.15', '1').replace('0.1', '1')}
        getColorByCurso={getColorByCurso}
        getColorBorderByCurso={(h) => getColorByCurso(h).replace('0.15', '1').replace('0.1', '1')}
        isStartTime={(start, grid) => start?.substring(0, 5) === grid}
        dragSelection={dragSelection}
        selectionInfo={getSelectionValidation(dragSelection)}
        startDragSelection={(day, idx, evt) => {
          if (esDocente && !docentePuedeGestionar) return;
          startDrag(day, idx, evt ? 'edit' : 'create', evt);
        }}
        esDocente={esDocente}
        docentePuedeGestionar={docentePuedeGestionar}
        usuario={usuario}
        setPopoverAnchor={setPopoverAnchor}
        setPopoverEvents={setPopoverEvents}
        tableContainerRef={tableContainerRef}
        docenteHasHoursAvailable={docenteHasHoursAvailable}
      />
      )}

      <ModalHorario 
        open={openHorarioModal}
        onClose={() => setOpenHorarioModal(false)}
        selectedHorario={selectedHorario}
        horarioForm={horarioForm}
        setHorarioForm={setHorarioForm}
        docentes={docentes}
        cursosDocente={cursosDocente}
        cargaNoLectivaDocente={esDocente ? cargaNoLectivaDocente : cargaNoLectivaModal}
        aulasModalFiltradas={aulasModalFiltradas}
        grupos={grupos}
        aulasOcupadasEnHorario={aulasOcupadasEnHorario}
        esDocente={esDocente}
        docentePuedeGestionar={docentePuedeGestionar}
        savingHorario={savingHorario}
        loadingCursosDocente={loadingCursosDocente}
        loadingGrupos={loadingGrupos}
        onSave={handleSaveHorario}
        onDelete={handleDeleteHorario}
        selectionSummary={selectionSummary}
        ACTIVIDADES_NO_LECTIVAS_LABELS={ACTIVIDADES_NO_LECTIVAS_LABELS}
        DIAS={DIAS}
        HORAS={HORAS}
        mapaOcupacion={mapaOcupacion}
        onRecalcularHoraFin={recalcularHoraFin}
        onRecalcularHoraFinNoLectiva={recalcularHoraFinNoLectiva}
        configGrilla={configGrilla}
        usuario={usuario}
        assignedNoLectivaHours={assignedNoLectivaHours}
        originalDuration={originalDuration}
      />

      <PopoverEventos 
        anchor={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        eventos={popoverEvents}
      />

      <ModalConfiguracionGrilla
        open={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
        config={configGrilla}
        onSave={handleSaveConfigGrilla}
      />

      <Snackbar open={showSelectionToast} autoHideDuration={3000} onClose={() => setShowSelectionToast(false)}>
        <Alert severity="success">Horario listo: {selectionSummary?.dia} {selectionSummary?.horaInicio} - {selectionSummary?.horaFin}</Alert>
      </Snackbar>
    </Box>
  );
}
