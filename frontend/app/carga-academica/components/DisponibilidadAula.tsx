'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Room as RoomIcon, Person as PersonIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import { DIAS } from '@/app/horarios/constantes';

const HORA_ALTURA_FILA = 48;
const HORA_SPACER_HEIGHT = 24;

const numberToLetter = (num: number) => String.fromCharCode(64 + num);

const tipoColor: Record<string, string> = {
  teoria: '#166534',
  practica: '#92400e',
  laboratorio: '#1e40af',
};

const tipoBg: Record<string, string> = {
  teoria: 'rgba(22, 101, 52, 0.08)',
  practica: 'rgba(146, 64, 14, 0.08)',
  laboratorio: 'rgba(30, 64, 175, 0.08)',
};

interface DisponibilidadAulaProps {
  aula: any;
  cicloId: string;
}

export default function DisponibilidadAula({
  aula,
  cicloId,
}: DisponibilidadAulaProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [configGrilla, setConfigGrilla] = useState<any>({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6],
  });

  useEffect(() => {
    if (!cicloId) return;
    api.get(`/ciclos/${cicloId}/configuracion`).then(res => {
      if (res.data) {
        setConfigGrilla({
          horaInicio: res.data.horaInicio?.substring(0, 5) || '07:00',
          horaFin: res.data.horaFin?.substring(0, 5) || '22:00',
          almuerzoInicio: res.data.almuerzoInicio?.substring(0, 5) || '13:00',
          almuerzoFin: res.data.almuerzoFin?.substring(0, 5) || '14:00',
          diasActivos: typeof res.data.diasActivos === 'string'
            ? res.data.diasActivos.split(',').map(Number)
            : Array.isArray(res.data.diasActivos)
              ? res.data.diasActivos.map(Number)
              : [1, 2, 3, 4, 5, 6],
        });
      }
    }).catch(() => {});
  }, [cicloId]);

  const fetchHorarios = useCallback(async () => {
    if (!cicloId || !aula?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/horarios', {
        params: { cicloId, aulaId: aula.id }
      });
      setHorarios(res.data || []);
    } catch {
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  }, [cicloId, aula?.id]);

  useEffect(() => {
    fetchHorarios();
  }, [fetchHorarios]);

  const diasFiltrados = useMemo(() =>
    DIAS.filter(d => configGrilla.diasActivos.includes(d.id)),
  [configGrilla.diasActivos]);

  const horasFiltradas = useMemo(() => {
    const start = parseInt(configGrilla.horaInicio.split(':')[0]);
    const end = parseInt(configGrilla.horaFin.split(':')[0]);
    return Array.from({ length: end - start }, (_, i) =>
      `${String(start + i).padStart(2, '0')}:00`);
  }, [configGrilla.horaInicio, configGrilla.horaFin]);

  const numSlots = horasFiltradas.length;
  const numColumnas = diasFiltrados.length;
  const colWidth = `calc((100% - 120px) / ${numColumnas})`;

  const getEventForSlot = useCallback((dia: number, hora: string) => {
    const hActual = parseInt(hora.split(':')[0]);
    const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
    const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);
    if (hActual >= hAlmInicio && hActual < hAlmFin) {
      return hActual === hAlmInicio ? { isLunch: true } : null;
    }
    const matching = horarios.filter((h: any) => {
      if (h.diaSemana !== dia) return false;
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      return hActual >= hInicio && hActual < hFin;
    });
    if (matching.length === 0) return null;
    return matching.length === 1 ? matching[0] : matching;
  }, [horarios, configGrilla]);

  const isStartTime = useCallback((start: string, grid: string) =>
    start?.substring(0, 5) === grid, []);

  const getDisponibilidad = useCallback((dia: number, hora: string) => {
    const event = getEventForSlot(dia, hora);
    if (!event) return 'libre';
    if (Array.isArray(event)) return 'ocupado';
    if (event.isLunch) return 'almuerzo';
    const hActual = parseInt(hora.split(':')[0]);
    const hInicio = parseInt(event.horaInicio.split(':')[0]);
    return hActual === hInicio ? 'ocupado' : null;
  }, [getEventForSlot]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Leyenda */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', px: 3, pt: 2.5, pb: 2, justifyContent: 'center', flexShrink: 0, borderBottom: '1px solid #eef2f6' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.3, bgcolor: 'rgba(34, 197, 94, 0.25)', border: '1px solid #22c55e' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', fontSize: '0.7rem' }}>LIBRE</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.3, bgcolor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.7rem' }}>OCUPADO</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.3, bgcolor: 'rgba(251, 191, 36, 0.2)', border: '1px solid #fbbf24' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', fontSize: '0.7rem' }}>ALMUERZO</Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={32} sx={{ color: '#003366' }} />
        </Box>
      ) : horarios.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: 1 }}>
          <SchoolIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
          <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 600 }}>
            No hay horarios asignados a este ambiente
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Los horarios ocupados aparecerán en rojo y los libres en verde
          </Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            flex: 1, borderRadius: 3, border: '1px solid #eef2f6',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            overflowX: 'auto', overflowY: 'auto',
            '&::-webkit-scrollbar': { height: 10, width: 10 },
            '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 51, 102, 0.05)', borderRadius: 5 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#003366', borderRadius: 5,
              border: '2px solid rgba(0, 51, 102, 0.05)',
              '&:hover': { bgcolor: '#002244' }
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#003366 rgba(0, 51, 102, 0.05)',
          }}
        >
          <Table stickyHeader sx={{
            width: '100%', minWidth: 650,
            tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0,
            backgroundColor: '#fff',
          }}>
            <colgroup>
              <col style={{ width: 56 }} />
              {diasFiltrados.map(d => <col key={d.id} style={{ width: colWidth }} />)}
              <col style={{ width: 56 }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                  border: 'none', bgcolor: '#003366', height: 48,
                  verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10,
                  fontSize: '0.7rem',
                }}>HORA</TableCell>
                {diasFiltrados.map(dia => (
                  <TableCell key={dia.id} sx={{
                    color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                    border: '1px solid rgba(255,255,255,0.25)', bgcolor: '#003366',
                    position: 'sticky', top: 0, zIndex: 10, fontSize: '0.7rem',
                  }}>
                    {dia.nombre.toUpperCase()}
                  </TableCell>
                ))}
                <TableCell sx={{
                  color: '#fff', fontWeight: 700, textAlign: 'center', px: 0.5,
                  border: 'none', bgcolor: '#003366', height: 48,
                  verticalAlign: 'middle', position: 'sticky', top: 0, zIndex: 10,
                  fontSize: '0.7rem',
                }}>HORA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ height: HORA_SPACER_HEIGHT }}>
                <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
                {diasFiltrados.map(dia => (
                  <TableCell key={dia.id} sx={{ border: 'none', bgcolor: 'transparent', p: 0 }} />
                ))}
                <TableCell sx={{ border: 'none', bgcolor: 'white', p: 0 }} />
              </TableRow>

              {[...horasFiltradas, configGrilla.horaFin].map((hora, idx) => {
                const isLastLabel = idx === horasFiltradas.length;
                return (
                  <TableRow key={idx} sx={{
                    height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                    '&:nth-of-type(even)': { bgcolor: isLastLabel ? 'transparent' : '#fcfdfe' },
                  }}>
                    <TableCell sx={{
                      fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0,
                      bgcolor: 'white', verticalAlign: 'middle',
                      height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                      position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem',
                    }}>
                      <Box sx={{
                        position: 'absolute', left: 0, right: 0, top: 0,
                        transform: 'translateY(-50%)', zIndex: 4,
                        display: 'flex', justifyContent: 'center',
                      }}>
                        <Typography sx={{
                          fontWeight: 700, color: '#5f6368',
                          fontSize: '0.65rem', p: 0, m: 0,
                        }}>{hora.substring(0, 5)}</Typography>
                      </Box>
                      <Box sx={{
                        position: 'absolute', top: 0, right: 0, height: '1px',
                        width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none',
                      }} />
                    </TableCell>
                    {isLastLabel ? (
                      <TableCell colSpan={numColumnas} sx={{ border: 'none', borderTop: '1px solid #dfe1e5', p: 0 }} />
                    ) : (
                      diasFiltrados.map(dia => {
                        const event = getEventForSlot(dia.id, hora);
                        const isMultipleEvents = Array.isArray(event);
                        const eventsArray = isMultipleEvents ? event : [event];
                        const firstEvent = eventsArray[0];

                        if (firstEvent) {
                          if (firstEvent.isLunch) {
                            const hActual = parseInt(hora.split(':')[0]);
                            const hAlmInicio = parseInt(configGrilla.almuerzoInicio.split(':')[0]);
                            const hAlmFin = parseInt(configGrilla.almuerzoFin.split(':')[0]);
                            if (hActual === hAlmInicio) {
                              const d = hAlmFin - hAlmInicio;
                              return (
                                <TableCell key={dia.id} rowSpan={d} sx={{
                                  p: 0, border: '1px solid #dfe1e5', verticalAlign: 'middle',
                                  bgcolor: 'rgba(251, 191, 36, 0.2)', textAlign: 'center',
                                  height: `${d * HORA_ALTURA_FILA}px`,
                                }}>
                                  <Typography sx={{
                                    fontWeight: 800, color: '#b45309', textTransform: 'uppercase',
                                    fontSize: '0.55rem', letterSpacing: 0.5,
                                  }}>ALMUERZO</Typography>
                                </TableCell>
                              );
                            }
                            return null;
                          }

                          const eventsStartingHere = eventsArray.filter(e => isStartTime(e.horaInicio, hora));
                          if (eventsStartingHere.length > 0) {
                            const maxDuration = Math.max(...eventsStartingHere.map(e =>
                              parseInt(e.horaFin.split(':')[0]) - parseInt(e.horaInicio.split(':')[0])));
                            return (
                              <TableCell key={dia.id} rowSpan={maxDuration} sx={{
                                p: 0, border: '1px solid #dfe1e5', verticalAlign: 'top',
                                height: '1px', position: 'relative',
                              }}>
                                <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
                                  {eventsStartingHere.map((evt: any, evtIdx: number) => {
                                    const curso = evt.curso || {};
                                    const t = evt.tipoClase || '';
                                    const tooltipContent = (
                                      <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <SchoolIcon sx={{ fontSize: '0.65rem' }} /> {curso.nombre || 'S.C.'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <PersonIcon sx={{ fontSize: '0.65rem' }} /> {evt.docente?.nombreCompleto || evt.docente?.nombre || 'S.D.'}
                                        </Typography>
                                        {evt.grupo && (
                                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            Grupo {numberToLetter(evt.grupo.numeroGrupo)}
                                          </Typography>
                                        )}
                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          {t.toUpperCase()} | {evt.horaInicio?.substring(0, 5)} - {evt.horaFin?.substring(0, 5)}
                                        </Typography>
                                      </Box>
                                    );
                                    return (
                                      <Tooltip key={evt.id || evtIdx} title={tooltipContent} arrow placement="top">
                                        <Box sx={{
                                          flex: 1,
                                          height: `${(parseInt(evt.horaFin.split(':')[0]) - parseInt(evt.horaInicio.split(':')[0])) * HORA_ALTURA_FILA}px`,
                                          bgcolor: tipoBg[t] || 'rgba(239, 68, 68, 0.2)',
                                          borderLeft: `3px solid ${tipoColor[t] || '#ef4444'}`,
                                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                                          p: 0.3, display: 'flex', flexDirection: 'column',
                                          cursor: 'pointer', position: 'relative', overflow: 'hidden',
                                        }}>
                                          <Typography sx={{
                                            fontWeight: 800, color: tipoColor[t] || '#991b1b',
                                            textTransform: 'uppercase', fontSize: '0.45rem', lineHeight: 1,
                                          }}>
                                            {t?.substring(0, 4).toUpperCase() || 'CLASE'}
                                          </Typography>
                                          <Typography sx={{
                                            fontWeight: 700, color: '#333', lineHeight: 1,
                                            fontSize: '0.55rem', mt: 0.1,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                          }}>
                                            {curso.nombre || 'S.C.'}
                                          </Typography>
                                          <Typography sx={{
                                            fontSize: '0.5rem', color: '#666', fontWeight: 600, mt: 'auto',
                                            display: 'flex', alignItems: 'center', gap: 0.2,
                                          }}>
                                            <PersonIcon sx={{ fontSize: '0.5rem' }} />
                                            {evt.docente?.nombreCompleto || evt.docente?.nombre || 'S.D.'}
                                            {evt.grupo && ` | ${numberToLetter(evt.grupo.numeroGrupo)}`}
                                          </Typography>
                                        </Box>
                                      </Tooltip>
                                    );
                                  })}
                                </Box>
                              </TableCell>
                            );
                          }
                          return null;
                        }

                        return (
                          <TableCell key={dia.id} sx={{
                            border: '1px solid #dfe1e5', p: 0,
                            bgcolor: 'rgba(34, 197, 94, 0.08)',
                            height: HORA_ALTURA_FILA,
                          }} />
                        );
                      })
                    )}
                    <TableCell sx={{
                      fontWeight: 700, color: '#5f6368', textAlign: 'center', p: 0,
                      bgcolor: 'white', verticalAlign: 'middle',
                      height: isLastLabel ? HORA_SPACER_HEIGHT : HORA_ALTURA_FILA,
                      position: 'relative', border: 'none', zIndex: 3, fontSize: '0.65rem',
                    }}>
                      <Box sx={{
                        position: 'absolute', left: 0, right: 0, top: 0,
                        transform: 'translateY(-50%)', zIndex: 4,
                        display: 'flex', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontWeight: 700, color: '#5f6368', fontSize: '0.65rem', p: 0, m: 0 }}>
                          {hora.substring(0, 5)}
                        </Typography>
                      </Box>
                      <Box sx={{
                        position: 'absolute', top: 0, left: 0, height: '1px',
                        width: 12, bgcolor: '#dfe1e5', zIndex: 5, pointerEvents: 'none',
                      }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
