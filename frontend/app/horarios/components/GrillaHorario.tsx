import React from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, Tooltip, IconButton 
} from '@mui/material';
import { 
  Person as PersonIcon, 
  Room as RoomIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { DIAS, HORAS, LUNCH_CONFIG, HORA_ALTURA_FILA, HORA_SPACER_HEIGHT } from '../constantes';

interface GrillaHorarioProps {
  horarios: any[];
  fetching: boolean;
  configGrilla: any;
  onCellClick: (dia: number, horaStr: string) => void;
  onEditHorario: (horario: any) => void;
  onDeleteHorario: (horario: any) => void;
  getEventForSlot: (dia: number, horaStr: string) => any;
  getDisponibilidadSlot: (dia: number, horaStr: string) => string;
  getColorByDisponibilidad: (disponibilidad: string) => string;
  getColorByDocente: (docenteId: number | string) => string;
  getColorBorderByDocente: (docenteId: number | string) => string;
  isStartTime: (eventHoraInicio: string, gridHora: string) => boolean;
  dragSelection: any;
  selectionInfo: any;
  startDragSelection: (day: number, hourIndex: number, event?: any) => void;
  esDocente: boolean;
  docentePuedeGestionar: boolean;
  usuario: any;
  setPopoverAnchor: (anchor: HTMLElement | null) => void;
  setPopoverEvents: (events: any[]) => void;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  docenteHasHoursAvailable: boolean;
}

// Helper para abreviar tipos de clase y actividades no lectivas
const shortLabel = (label: string, isNoLectiva = false) => {
  if (!label) return '';
  const l = label.toLowerCase();
  
  if (!isNoLectiva) {
    if (l === 'teoria') return 'TEO.';
    if (l === 'practica') return 'PRÁC.';
    if (l === 'laboratorio') return 'LAB.';
    if (l === 'no_lectiva') return 'N. LECT.';
    return label.toUpperCase();
  }

  // Mapeo para actividades no lectivas
  const noLectivaMap: Record<string, string> = {
    'preparación y evaluación': 'PREP. Y EVAL.',
    'tutoría y orientación': 'TUT. Y ORIENT.',
    'investigación': 'INVEST.',
    'capacitación': 'CAPACIT.',
    'gobierno universitario': 'GOB. UNIV.',
    'administración académica': 'ADM. ACAD.',
    'asesoría a estudiantes': 'ASES. EST.',
    'responsabilidad social': 'RESP. SOC.',
    'comités técnicos': 'COMITÉS',
  };

  return noLectivaMap[l] || label.toUpperCase();
};

const GrillaHorario: React.FC<GrillaHorarioProps> = ({
  horarios,
  fetching,
  configGrilla,
  onCellClick,
  onEditHorario,
  onDeleteHorario,
  getEventForSlot,
  getDisponibilidadSlot,
  getColorByDisponibilidad,
  getColorByDocente,
  getColorBorderByDocente,
  isStartTime,
  dragSelection,
  selectionInfo,
  startDragSelection,
  esDocente,
  docentePuedeGestionar,
  usuario,
  setPopoverAnchor,
  setPopoverEvents,
  tableContainerRef,
  docenteHasHoursAvailable
}) => {
  const numberToLetter = (num: number) => String.fromCharCode(64 + num);

  const normalizeSlotRange = (startIndex: number, endIndex: number) => ({
    startIndex: Math.min(startIndex, endIndex),
    endIndex: Math.max(startIndex, endIndex),
  });

  const diasFiltrados = React.useMemo(() => {
    return DIAS.filter(d => configGrilla.diasActivos.includes(d.id));
  }, [configGrilla.diasActivos]);

  const horasFiltradas = React.useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(`${String(i).padStart(2, '0')}:00`);
    }
    return result;
  }, [configGrilla.horaInicio, configGrilla.horaFin]);

  const numColumnas = diasFiltrados.length;
  const colWidth = `calc((100% - 200px) / ${numColumnas})`;

  return (
    <Box sx={{ position: 'relative' }}>
      {fetching && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 8,
          }}
        >
          <CircularProgress size={40} sx={{ color: '#003366' }} />
        </Box>
      )}

      <TableContainer
        ref={tableContainerRef}
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxHeight: '75vh',
          '&::-webkit-scrollbar': { height: 10, width: 10 },
          '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 51, 102, 0.05)', borderRadius: 5 },
          '&::-webkit-scrollbar-thumb': { 
            bgcolor: '#003366', 
            borderRadius: 5,
            border: '2px solid rgba(0, 51, 102, 0.05)',
            '&:hover': { bgcolor: '#002244' }
          },
          scrollbarWidth: 'thin',
          scrollbarColor: '#003366 rgba(0, 51, 102, 0.05)',
        }}
      >
        <Table stickyHeader sx={{ width: '100%', minWidth: { xs: 860, sm: 1000 }, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, backgroundColor: '#fff' }}>
          <colgroup>
            <col style={{ width: 100 }} />
            {diasFiltrados.map(d => (
              <col key={d.id} style={{ width: colWidth }} />
            ))}
            <col style={{ width: 100 }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: { xs: 1, sm: 2 }, border: 'none', bgcolor: '#003366', height: { xs: 68, sm: 80 }, verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10 }}>HORA</TableCell>
              {diasFiltrados.map(dia => (
                <TableCell key={dia.id} sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: { xs: 1, sm: 2 }, border: '1px solid rgba(255, 255, 255, 0.25)', bgcolor: '#003366', position: 'sticky', top: 0, zIndex: 10 }}>
                  {dia.nombre.toUpperCase()}
                </TableCell>
              ))}
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', px: { xs: 1, sm: 2 }, border: 'none', bgcolor: '#003366', height: { xs: 68, sm: 80 }, verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10 }}>HORA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ height: HORA_SPACER_HEIGHT }}>
              <TableCell sx={{ border: 'none', bgcolor: 'white' }} />
              {diasFiltrados.map(dia => (
                <TableCell key={dia.id} sx={{ border: 'none', bgcolor: 'transparent' }} />
              ))}
              <TableCell sx={{ border: 'none', bgcolor: 'white' }} />
            </TableRow>

            {[...horasFiltradas, configGrilla.horaFin].map((hora, idx) => {
              const isLastLabel = idx === horasFiltradas.length;
              return (
                <TableRow 
                  key={idx} 
                  sx={{ 
                    height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, 
                    '&:nth-of-type(even)': { bgcolor: isLastLabel ? 'transparent' : '#fcfdfe' }
                  }}
                >
                  <TableCell sx={{ fontWeight: 600, color: '#5f6368', textAlign: 'center', p: 0, whiteSpace: 'nowrap', bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA, position: 'relative', border: 'none', zIndex: 3 }}>
                    <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                      <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: { xs: '0.78rem', sm: '0.9rem' }, background: 'transparent', p: 0, m: 0 }}>{hora.substring(0, 5)}</Typography>
                    </Box>
                    <Box sx={{ position: 'absolute', top: 0, right: 0, height: '1px', width: 20, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }}/>
                  </TableCell>
                  {isLastLabel ? (
                    <TableCell colSpan={numColumnas} sx={{ border: 'none', borderTop: '1px solid #dfe1e5' }} />
                  ) : (
                    diasFiltrados.map(dia => {
                      const event = getEventForSlot(dia.id, hora);
                      const isMultipleEvents = Array.isArray(event);
                      const eventsArray = isMultipleEvents ? event : [event];
                      const firstEvent = eventsArray[0];
                      const isStart = firstEvent && isStartTime(firstEvent.horaInicio, hora);
                      const selectionRange = dragSelection ? normalizeSlotRange(dragSelection.startIndex, dragSelection.endIndex) : null;
                      const isSelectedCell = !!selectionRange && dragSelection?.day === dia.id && idx >= selectionRange.startIndex && idx <= selectionRange.endIndex;
                      const isSelectedEvent = !!firstEvent && !!selectionRange && dragSelection?.day === dia.id && (
                        (dragSelection?.mode === 'edit' && dragSelection.event?.id === firstEvent.id) ||
                        (idx >= selectionRange.startIndex && idx <= selectionRange.endIndex)
                      );

                      if (firstEvent) {
                        if (firstEvent.isLunch) {
                          const hActual = parseInt(hora.split(':')[0]);
                          const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
                          const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);

                          if (hActual === hAlmInicio) {
                            const lunchDuration = hAlmFin - hAlmInicio;
                            return (
                              <TableCell 
                                key={dia.id} 
                                rowSpan={lunchDuration}
                                sx={{ 
                                  p: 0,
                                  border: '1px solid #dfe1e5',
                                  verticalAlign: 'middle',
                                  bgcolor: 'rgba(251, 191, 36, 0.25)', 
                                  textAlign: 'center',
                                  height: `${lunchDuration * HORA_ALTURA_FILA}px`
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#b45309', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>
                                  FRANJA ALMUERZO
                                </Typography>
                              </TableCell>
                            );
                          }
                          if (hActual > hAlmInicio && hActual < hAlmFin) return null;
                        }

                        const eventsStartingHere = eventsArray.filter(e => isStartTime(e.horaInicio, hora));
                        
                        if (eventsStartingHere.length > 0) {
                          const durations = eventsStartingHere.map(e => 
                            parseInt(e.horaFin.split(':')[0]) - parseInt(e.horaInicio.split(':')[0])
                          );
                          const maxDuration = Math.max(...durations);

                          return (
                            <TableCell
                              key={dia.id}
                              rowSpan={maxDuration}
                              sx={{
                                p: 0,
                                border: '1px solid #dfe1e5',
                                verticalAlign: 'top',
                                height: '1px',
                                position: 'relative',
                                outline: isSelectedEvent ? '2px dashed #003366 !important' : 'none',
                                outlineOffset: '-2px',
                                zIndex: isSelectedEvent ? 5 : 1,
                                '&:hover .add-button-cell': { opacity: 1 }
                              }}
                            >
                              <Box sx={{
                                display: 'flex',
                                height: '100%',
                                width: '100%',
                                position: 'relative'
                              }}>
                                {eventsStartingHere.map((evt, evtIdx) => (
                                  <Box 
                                    key={evt.id || evtIdx}
                                    onMouseDown={(e) => {
                                      if (e.button !== 0) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startDragSelection(dia.id, idx, evt);
                                    }}
                                    sx={{
                                      flex: 1,
                                      height: `${(parseInt(evt.horaFin.split(':')[0]) - parseInt(evt.horaInicio.split(':')[0])) * HORA_ALTURA_FILA}px`,
                                      bgcolor: evt.tipoClase === 'no_lectiva' ? 'rgba(124, 58, 237, 0.1)' : getColorByDocente(evt.docenteId),
                                      borderLeft: evtIdx === 0 ? `5px solid ${evt.tipoClase === 'no_lectiva' ? '#7c3aed' : getColorBorderByDocente(evt.docenteId)}` : 'none',
                                      borderRight: evtIdx < eventsStartingHere.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                                      p: 1,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.5,
                                      cursor: 'grab',
                                      position: 'relative',
                                      overflow: 'hidden',
                                      '&:hover': { opacity: 0.9 },
                                      '&:hover .action-buttons': { opacity: 1 },
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <Typography variant="caption" sx={{
                                        fontWeight: 800,
                                        color: evt.tipoClase === 'no_lectiva' ? '#7c3aed' : getColorBorderByDocente(evt.docenteId),
                                        textTransform: 'uppercase',
                                        fontSize: '0.6rem',
                                        lineHeight: 1.1
                                      }}>
                                        {shortLabel(evt.tipoClase)}
                                      </Typography>
                                      
                                      {(!esDocente || docentePuedeGestionar) && (!esDocente || evt.docenteId === usuario?.docenteId) && (
                                        <Box className="action-buttons" sx={{ 
                                          display: 'flex', 
                                          opacity: 0,
                                          transition: 'opacity 0.2s',
                                          zIndex: 10
                                        }}>
                                          <IconButton 
                                            size="small" 
                                            onClick={(e) => { e.stopPropagation(); onEditHorario(evt); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            sx={{ p: 0.2, color: 'inherit' }}
                                          >
                                            <EditIcon sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                          <IconButton 
                                            size="small" 
                                            onClick={(e) => { e.stopPropagation(); onDeleteHorario(evt); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            sx={{ p: 0.2, color: '#d32f2f' }}
                                          >
                                            <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                        </Box>
                                      )}
                                    </Box>

                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 700,
                                        color: '#333',
                                        lineHeight: 1.1,
                                        fontSize: '0.75rem',
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                      }}
                                    >
                                      {evt.tipoClase === 'no_lectiva'
                                        ? (evt.actividadNoLectiva || 'ACTIVIDAD NO LECTIVA').toUpperCase()
                                        : (evt.curso?.nombre || 'S.C.').toUpperCase()}
                                    </Typography>

                                    {evt.tipoClase !== 'no_lectiva' && evt.grupo && (
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontSize: '0.7rem', 
                                          color: '#003366', 
                                          fontWeight: 800,
                                          mt: 0.2,
                                          display: 'block'
                                        }}
                                      >
                                        GRUPO {numberToLetter(evt.grupo.numeroGrupo)}
                                      </Typography>
                                    )}

                                    {evt.tipoClase === 'no_lectiva' && (
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontSize: '0.7rem', 
                                          color: '#7c3aed', 
                                          fontWeight: 700,
                                          mt: 0.5,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5
                                        }}
                                      >
                                        <TimerIcon sx={{ fontSize: '0.8rem' }} />
                                        {evt.horaInicio.substring(0, 5)} - {evt.horaFin.substring(0, 5)}
                                      </Typography>
                                    )}

                                    <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <PersonIcon sx={{ fontSize: '0.7rem', color: '#666' }} />
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#666', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                                          {evt.docente?.nombreCompleto || 'Docente'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <RoomIcon sx={{ fontSize: '0.7rem', color: '#666' }} />
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>
                                          {evt.aula?.nombre || 'S.A.'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}

                                {/* Botón "+" para agregar otro horario en este mismo slot (Solo Admin/Coord) */}
                                  {(!esDocente || (esDocente && docentePuedeGestionar && docenteHasHoursAvailable)) && (
                                    <Tooltip title="Agregar otro horario en este bloque">
                                      <IconButton
                                        className="add-button-cell"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onCellClick(dia.id, hora);
                                        }}
                                        sx={{
                                          position: 'absolute',
                                          bottom: 2,
                                          right: 2,
                                          bgcolor: '#1976d2', // Azul no tan oscuro (MUI Primary)
                                          color: 'white',
                                          p: 0.2,
                                          opacity: 0,
                                          transition: 'opacity 0.2s',
                                          zIndex: 20,
                                          '&:hover': { 
                                            bgcolor: '#1565c0', 
                                            opacity: 1 
                                          }
                                        }}
                                      >
                                        <AddIcon sx={{ fontSize: '0.9rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                              </Box>
                            </TableCell>
                          );
                        }

                        return null;
                      }
                      const disponibilidad = getDisponibilidadSlot(dia.id, hora);
                      const colorDisponibilidad = getColorByDisponibilidad(disponibilidad);
                      
                      let tooltipText = 'Disponible para todos tus cursos';
                      const hActual = parseInt(hora.split(':')[0]);
                      const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
                      const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);

                      if (hActual >= hAlmInicio && hActual < hAlmFin) {
                        tooltipText = 'Franja de Almuerzo (Bloqueado)';
                      } else if (!docenteHasHoursAvailable) {
                        tooltipText = 'No tienes más horas disponibles (Lectiva/No Lectiva) para asignar';
                      } else if (disponibilidad === 'amarillo') {
                        tooltipText = 'Disponible para algunos cursos (otros tienen cruce de alumnos)';
                      } else if (disponibilidad === 'rojo') {
                        const keyOcupacion = `${dia.id}_${parseInt(hora.split(':')[0])}`;
                        // Nota: Aquí se asume que mapaOcupacion está disponible o se maneja la lógica de ocupación
                        tooltipText = 'No disponible (Cruce total de grupos de alumnos)';
                      }

                      return (
                        <Tooltip key={dia.id} title={esDocente ? tooltipText : ""} arrow placement="top">
                          <TableCell 
                            sx={{ 
                              border: '1px solid #dfe1e5', 
                              p: 0,
                              cursor: disponibilidad === 'rojo' && esDocente ? 'not-allowed' : 'crosshair',
                              bgcolor: isSelectedCell
                                ? (selectionInfo?.valido ? 'rgba(0, 51, 102, 0.12)' : 'rgba(211, 47, 47, 0.12)')
                                : (esDocente ? colorDisponibilidad : 'transparent'),
                              '&:hover': { bgcolor: isSelectedCell ? undefined : (esDocente && disponibilidad === 'rojo' ? colorDisponibilidad : '#f0f7ff') },
                              minHeight: { xs: 68, sm: 80 },
                            }}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              if (esDocente && disponibilidad === 'rojo') return;
                              e.preventDefault();
                              startDragSelection(dia.id, idx);
                            }}
                          />
                        </Tooltip>
                      );
                    })
                  )}
                  <TableCell sx={{ fontWeight: 600, color: '#5f6368', textAlign: 'center', p: 0, whiteSpace: 'nowrap', bgcolor: 'white', verticalAlign: 'middle', height: isLastLabel ? 30 : { xs: 68, sm: 80 }, position: 'relative', border: 'none', zIndex: 3 }}>
                    <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, transform: 'translateY(-50%)', zIndex: 4, display: 'flex', justifyContent: 'center' }}>
                      <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: { xs: '0.78rem', sm: '0.9rem' }, background: 'transparent', p: 0, m: 0 }}>{hora.substring(0, 5)}</Typography>
                    </Box>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, height: '1px', width: 20, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none' }}/>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default GrillaHorario;
