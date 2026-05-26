'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import ChartIcon from '@mui/icons-material/BarChart';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import React from 'react';
import { getVentanasSocket } from '@/lib/socket';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/components/providers/AuthProvider';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface EstadisticasResponse {
  totalDocentes: number;
  totalCursos: number;
  totalHoras: number;
  totalAulas: number;
  alertasCruces: number;
  promedioHorasPorBloque: number;
  cargaPorCategoria: Array<{
    categoria: string;
    totalHoras: number;
    promedioHoras: number;
  }>;
  porcentajeUsoAulas: Array<{
    tipo: string;
    bloquesUsados: number;
    totalAulas: number;
    porcentajeUso: number;
  }>;
  docentesTop: Array<{
    id: number;
    nombreCompleto: string;
    totalHoras: number;
    categoria: string;
  }>;
  distribucionTipoClase: Array<{
    name: string;
    value: number;
  }>;
  usoAulasPorDia: Array<{
    dia: string;
    teoria: number;
    practica: number;
    laboratorio: number;
  }>;
}

const estadisticasVacias: EstadisticasResponse = {
  totalDocentes: 0,
  totalCursos: 0,
  totalHoras: 0,
  totalAulas: 0,
  alertasCruces: 0,
  promedioHorasPorBloque: 0,
  cargaPorCategoria: [],
  porcentajeUsoAulas: [],
  docentesTop: [],
  distribucionTipoClase: [
    { name: 'Teoría', value: 45 },
    { name: 'Práctica', value: 35 },
    { name: 'Laboratorio', value: 20 },
  ],
  usoAulasPorDia: [
    { dia: 'Lun', teoria: 40, practica: 24, laboratorio: 24 },
    { dia: 'Mar', teoria: 30, practica: 13, laboratorio: 22 },
    { dia: 'Mie', teoria: 20, practica: 98, laboratorio: 22 },
    { dia: 'Jue', teoria: 27, practica: 39, laboratorio: 20 },
    { dia: 'Vie', teoria: 18, practica: 48, laboratorio: 21 },
    { dia: 'Sab', teoria: 23, practica: 38, laboratorio: 25 },
  ],
};

const COLORS = ['#667eea', '#ff9900', '#43e97b', '#f093fb', '#4facfe'];
const MySwal = withReactContent(Swal);

const formatCountdownFromSeconds = (segundos: number) => {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export default function DashboardEstadisticas() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [estadisticas, setEstadisticas] = useState<EstadisticasResponse | null>(null);
  const [misHorarios, setMisHorarios] = useState<any[]>([]);
  const [misCursos, setMisCursos] = useState<any[]>([]);
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);
  const [ventanaActiva, setVentanaActiva] = useState<any>(null);
  const [docenteEnAtencion, setDocenteEnAtencion] = useState<any>(null);
  const [cicloActual, setCicloActual] = useState<{ id: number; nombre: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevEstadoRef = useRef<string | null>(null);
  const avisoToastRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (estadoSeleccion?.estado === 'en_atencion' && estadoSeleccion.segundosRestantes > 0) {
      timer = setInterval(() => {
        setEstadoSeleccion((prev: any) => ({
          ...prev,
          segundosRestantes: Math.max(0, prev.segundosRestantes - 1)
        }));
      }, 1000);
    } else if (estadoSeleccion?.estado === 'en_espera' && Number(estadoSeleccion?.segundosHastaTurno ?? 0) > 0) {
      timer = setInterval(() => {
        setEstadoSeleccion((prev: any) => ({
          ...prev,
          segundosHastaTurno: Math.max(0, Number(prev.segundosHastaTurno ?? 0) - 1)
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [estadoSeleccion]);

  // Notificaciones de estado con SweetAlert (mensajes cortos, sin recargar).
  useEffect(() => {
    if (usuario?.rol !== 'docente' || !estadoSeleccion) return;

    const estadoActual = estadoSeleccion?.estado ?? null;
    const estadoPrevio = prevEstadoRef.current;
    const posicion = String(estadoSeleccion?.posicion ?? 0).padStart(2, '0');
    const minutosEnCola = Math.max(1, Number(estadoSeleccion?.tiempoDisponibleMinutos ?? 0));
    const minutosTurno = Math.max(1, Math.ceil(Number(estadoSeleccion?.segundosRestantes ?? 0) / 60));
    const segundosHastaTurno = Math.max(0, Number(estadoSeleccion?.segundosHastaTurno ?? 0));
    const toastSignature = `${estadoActual}:${posicion}:${minutosEnCola}:${segundosHastaTurno > 0 ? 1 : 0}`;
    const storageKey = `ventana-toast:${usuario?.docenteId ?? 'docente'}`;
    const lastToast = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;

    if (estadoActual !== estadoPrevio && toastSignature !== lastToast) {
      if (estadoActual === 'en_espera' && estadoSeleccion.hayVentanaAtencion) {
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Disponibilidad para registrarse',
          html: `<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#0b3a75;color:#ffffff;font-weight:700;display:inline-block;">Docente N.${posicion} · ${minutosEnCola} min para registrar</div>`,
          timer: 5000,
          showConfirmButton: false,
        });
      }

      if (estadoActual === 'en_atencion') {
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Es tu turno',
          html: `<div style="margin-top:4px;padding:6px 10px;border-radius:8px;background:#166534;color:#ffffff;font-weight:700;display:inline-block;">${minutosTurno} min para registrar</div>`,
          timer: 5000,
          showConfirmButton: false,
        });
      }

      if (estadoActual === 'finalizado') {
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Turno finalizado',
          timer: 4000,
          showConfirmButton: false,
        });
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, toastSignature);
      }
    }

    prevEstadoRef.current = estadoActual;
  }, [usuario?.rol, estadoSeleccion]);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!usuario) return; // Esperar a que el usuario esté cargado

      try {
        setCargando(true);
        
        // 1. Obtener ciclo actual
        const cicloRes = await api.get('/ciclos/actual');
        const ciclo = cicloRes.data;
        setCicloActual(ciclo);

        if (usuario?.rol === 'docente') {
          if (!usuario.docenteId) {
            throw new Error('No se encontró información de docente vinculada a este usuario.');
          }

          // Datos específicos para el docente
          const [horariosRes, cursosRes, estadoRes] = await Promise.all([
            api.get('/horarios', { params: { cicloId: ciclo.id, docenteId: usuario.docenteId } }),
            api.get(`/docentes/${usuario.docenteId}/cursos`),
            api.get('/ventanas/mi-estado')
          ]);
          setMisHorarios(horariosRes.data);
          const cursosNormalizados = (cursosRes.data || []).map((asignacion: any) => ({
            id: asignacion.curso?.id ?? asignacion.id,
            nombre: asignacion.curso?.nombre ?? 'Curso',
            codigo: asignacion.curso?.codigo ?? '-',
            ciclo: asignacion.ciclo?.nombre ?? '-',
          }));
          setMisCursos(cursosNormalizados);
          setEstadoSeleccion(estadoRes.data);
          setEstadisticas(estadisticasVacias);
        } else {
          // Estadísticas generales para admin/coordinador
          const [statsRes, ventanaRes, atencionRes] = await Promise.all([
            api.get('/horarios/estadisticas', { params: { cicloId: ciclo.id } }),
            api.get('/ventanas/activa'),
            api.get('/ventanas/en-atencion')
          ]);
          
          const data = statsRes.data ?? {};
          setVentanaActiva(ventanaRes.data);
          setDocenteEnAtencion(atencionRes.data);

          setEstadisticas({
            ...estadisticasVacias,
            totalDocentes: Number(data.totalDocentes ?? 0),
            totalCursos: Number(data.totalCursos ?? 0),
            totalHoras: Number(data.totalHorarios ?? 0),
            totalAulas: Number(data.totalAulas ?? 15),
            alertasCruces: Number(data.alertasCruces ?? 0),
            promedioHorasPorBloque: Number(
              data.promedioHorasPorBloque ??
                (data.totalDocentes ? Number(data.totalHorarios ?? 0) / Number(data.totalDocentes) : 0),
            ),
            cargaPorCategoria: Array.isArray(data.cargaPorCategoria) && data.cargaPorCategoria.length > 0 
              ? data.cargaPorCategoria 
              : [
                  { categoria: 'Principal', totalHoras: 120, promedioHoras: 15.5 },
                  { categoria: 'Asociado', totalHoras: 85, promedioHoras: 12.2 },
                  { categoria: 'Auxiliar', totalHoras: 45, promedioHoras: 9.8 },
                ],
            porcentajeUsoAulas: Array.isArray(data.porcentajeUsoAulas) && data.porcentajeUsoAulas.length > 0
              ? data.porcentajeUsoAulas
              : [
                  { tipo: 'Aula Común', bloquesUsados: 45, totalAulas: 10, porcentajeUso: 75 },
                  { tipo: 'Laboratorio', bloquesUsados: 20, totalAulas: 5, porcentajeUso: 40 },
                ],
            docentesTop: Array.isArray(data.docentesTop) && data.docentesTop.length > 0
              ? data.docentesTop.map((d: any) => ({ ...d, categoria: d.categoria || 'Principal' }))
              : [
                  { id: 1, nombreCompleto: 'Dr. Marcelino Torres Villanueva', totalHoras: 18, categoria: 'Principal' },
                  { id: 2, nombreCompleto: 'Mg. Elena Rodríguez Casavilca', totalHoras: 16, categoria: 'Asociado' },
                  { id: 3, nombreCompleto: 'Ing. Carlos Mendoza Ruiz', totalHoras: 15, categoria: 'Auxiliar' },
                  { id: 4, nombreCompleto: 'Dr. Jorge Luna Victoria', totalHoras: 14, categoria: 'Principal' },
                ],
          });
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos del dashboard');
        console.error('Error al cargar dashboard:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [usuario]);

  // Refrescar estado del docente en tiempo real via sockets
  useEffect(() => {
    if (usuario?.rol !== 'docente') return;

    let mounted = true;

    (async () => {
      try {
        const s = await getVentanasSocket();

        const handler = (payload: any) => {
          if (!mounted) return;
          if (payload.docenteId && Number(payload.docenteId) !== Number(usuario?.docenteId)) return;
          setEstadoSeleccion(payload);
        };

        s.on('ventanas:mi-estado', handler);

        // initial fetch fallback
        try {
          const estadoRes = await api.get('/ventanas/mi-estado');
          if (mounted) setEstadoSeleccion(estadoRes.data);
        } catch (e) {
          console.error('Error fetching initial estado for dashboard', e);
        }

        return () => {
          mounted = false;
          s.off('ventanas:mi-estado', handler);
        };
      } catch (err) {
        console.error('Error connecting dashboard to Ventanas socket', err);
      }
    })();
  }, [usuario?.rol]);

  const DIAS_MAP: { [key: number]: string } = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
  };

  const renderDocenteDashboard = () => {
    const totalHoras = misHorarios.reduce((acc, h) => {
      const start = parseInt(h.horaInicio.split(':')[0]);
      const end = parseInt(h.horaFin.split(':')[0]);
      return acc + (end - start);
    }, 0);

    const proximasClases = misHorarios.length;
    const ambientesDistintos = new Set(misHorarios.map(h => h.aula?.nombre)).size;
    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { label: 'Mis Cursos', value: misCursos.length, icon: <BookIcon />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', trend: 'Ciclo Actual' },
            { label: 'Horas Semanales', value: totalHoras, icon: <CalendarIcon />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', trend: 'Carga Lectiva' },
            { label: 'Clases Programadas', value: proximasClases, icon: <ChartIcon />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', trend: 'Total Semanal' },
            { label: 'Ambientes / Aulas', value: ambientesDistintos, icon: <MeetingRoomIcon />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', trend: 'Ubicaciones' },
          ].map((kpi, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Avatar sx={{ bgcolor: kpi.bg, color: kpi.color, borderRadius: 3, width: 48, height: 48 }}>
                      {kpi.icon}
                    </Avatar>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{kpi.label}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, mt: 1, display: 'block' }}>
                    {kpi.trend}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>Mi Horario Semanal</Typography>
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Día</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Hora</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Curso</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Aula</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {misHorarios.length > 0 ? (
                      misHorarios
                        .sort((a, b) => (a.diaSemana - b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio))
                        .map((h, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{DIAS_MAP[h.diaSemana]}</TableCell>
                            <TableCell>{h.horaInicio.substring(0,5)} - {h.horaFin.substring(0,5)}</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#003366' }}>{h.curso?.nombre}</TableCell>
                            <TableCell>
                              <Box sx={{ 
                                px: 1.5, py: 0.5, borderRadius: 2, display: 'inline-block',
                                bgcolor: h.tipoClase === 'teoria' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: h.tipoClase === 'teoria' ? '#6366f1' : '#f59e0b',
                                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                              }}>
                                {h.tipoClase}
                              </Box>
                            </TableCell>
                            <TableCell>{h.aula?.nombre}</TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748b' }}>
                          No tienes clases programadas para este ciclo.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>Mis Cursos Asignados</Typography>
              <List sx={{ p: 0 }}>
                {misCursos.map((curso, i) => (
                  <React.Fragment key={curso.id}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'rgba(0, 51, 102, 0.1)', color: '#003366', borderRadius: 2 }}>
                          <BookIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={curso.nombre} 
                        secondary={`${curso.codigo} • ${curso.ciclo} Ciclo`}
                        primaryTypographyProps={{ fontWeight: 700, color: '#1e293b' }}
                      />
                    </ListItem>
                    {i < misCursos.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (cargando) return <LoadingSpinner />;
  if (error) return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert severity="error" variant="filled" sx={{ borderRadius: 3 }}>{error}</Alert>
    </Container>
  );
  if (!estadisticas && usuario?.rol !== 'docente') return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Alert severity="warning" variant="filled" sx={{ borderRadius: 3 }}>No hay datos disponibles para el ciclo actual.</Alert>
    </Container>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', mb: 0.5 }}>
            {usuario?.rol === 'docente' ? `Bienvenido, ${usuario?.nombre?.split(' ')[0] || 'Docente'}` : 'Dashboard Analítico'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ fontSize: 18, color: '#64748b' }} />
            <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
              Ciclo Académico {cicloActual?.nombre || '2026-I'}
            </Typography>
            <Box sx={{ px: 1, py: 0.2, bgcolor: '#e2e8f0', borderRadius: 1, fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              ACTUAL
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Paper elevation={0} sx={{ p: 1, borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>SISTEMA ONLINE</Typography>
          </Paper>
        </Box>
      </Box>

      {/* Alerta de Ventana de Atención para Coordinador/Admin */}
      {(usuario?.rol === 'admin' || usuario?.rol === 'coordinador') && ventanaActiva && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 5, 
            border: '2px solid #003366', 
            bgcolor: '#f0f7ff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 51, 102, 0.1)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{ bgcolor: '#003366', width: 56, height: 56 }}>
              <TrendingUpIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#003366' }}>
                Ventana de Atención Activa
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 600 }}>
                {docenteEnAtencion 
                  ? `Atendiendo a: ${docenteEnAtencion.nombreCompleto}` 
                  : 'Esperando al siguiente docente en cola...'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
             <Button 
               variant="contained" 
               onClick={() => router.push('/ventanas')}
               sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 700, px: 3 }}
             >
               Gestionar Ventana
             </Button>
          </Box>
        </Paper>
      )}

      {usuario?.rol === 'docente' ? renderDocenteDashboard() : (
        <>
          <Grid container spacing={3} sx={{ mb: 5 }}>
            {[
              { label: 'Docentes Activos', value: estadisticas?.totalDocentes, icon: <PeopleIcon />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', trend: '+12% este mes' },
              { label: 'Cursos Programados', value: estadisticas?.totalCursos, icon: <BookIcon />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', trend: 'Capacidad 85%' },
              { label: 'Horas Totales', value: estadisticas?.totalHoras, icon: <CalendarIcon />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', trend: 'Meta: 450h' },
              { label: 'Aulas en Uso', value: `${estadisticas?.totalAulas}`, icon: <MeetingRoomIcon />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', trend: 'Pico: 11:00 AM' },
              { label: 'Alertas de Cruce', value: estadisticas?.alertasCruces, icon: <WarningAmberIcon />, color: (estadisticas?.alertasCruces || 0) > 0 ? '#ef4444' : '#10b981', bg: (estadisticas?.alertasCruces || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', trend: 'Requiere revisión' },
            ].map((kpi, i) => (
              <Grid item xs={12} sm={6} md={2.4} key={i}>
                <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', '&:hover': { transform: 'translateY(-5px)', transition: 'all 0.3s ease' } }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: kpi.bg, borderRadius: 3, color: kpi.color }}>
                        {React.cloneElement(kpi.icon as React.ReactElement, { sx: { fontSize: 24 } })}
                      </Box>
                      <IconButton size="small"><MoreVertIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></IconButton>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, color: '#1e293b', fontSize: '1.75rem' }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1 }}>{kpi.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 14, color: kpi.color }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{kpi.trend}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 4 }}>Intensidad Horaria Semanal</Typography>
                  <Box sx={{ height: 320, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={estadisticas?.usoAulasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="teoria" name="Teoría" stackId="a" fill="#6366f1" barSize={32} />
                        <Bar dataKey="practica" name="Práctica" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="laboratorio" name="Laboratorio" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 4 }}>Distribución Académica</Typography>
                  <Box sx={{ height: 320, width: '100%', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={estadisticas?.distribucionTipoClase} cx="50%" cy="45%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                          {estadisticas?.distribucionTipoClase.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(0, 51, 102, 0.1)', color: '#003366' }}><TrendingUpIcon /></Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>Ranking de Carga Académica</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>RANK</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>DOCENTE</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CATEGORÍA</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>HORAS TOTALES</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>EFICIENCIA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estadisticas?.docentesTop.map((docente, index) => (
                    <TableRow key={docente.id}>
                      <TableCell sx={{ fontWeight: 800 }}>#{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{docente.nombreCompleto}</TableCell>
                      <TableCell>{docente.categoria.toUpperCase()}</TableCell>
                      <TableCell align="center">{docente.totalHoras}h</TableCell>
                      <TableCell align="center">{Math.round((docente.totalHoras / 20) * 100)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
}
