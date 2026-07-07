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
  Tabs,
  Tab,
  Tooltip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
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
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
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
  const [cargaNoLectiva, setCargaNoLectiva] = useState<any>(null);
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);
  const [ventanaActiva, setVentanaActiva] = useState<any>(null);
  const [docenteEnAtencion, setDocenteEnAtencion] = useState<any>(null);
  const [cicloActual, setCicloActual] = useState<{ id: number; nombre: string } | null>(null);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [cicloSeleccionadoId, setCicloSeleccionadoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCarga, setFiltroCarga] = useState('todos');
  const [cargaAdicional, setCargaAdicional] = useState<any>(null);
  const [pageFilial, setPageFilial] = useState(0);
  const rowsPerPageFilial = 5;

  // Sockets y Toasts
  const prevEstadoRef = useRef<string | null>(null);
  const avisoToastRef = useRef<string | null>(null);

  // Mensaje de Bienvenida Elegante tras Login (Estilo Banner Lineal)
  useEffect(() => {
    if (typeof window === 'undefined' || !usuario) return;

    const shouldShow = sessionStorage.getItem('showWelcome') === 'true';
    
    if (shouldShow) {
      sessionStorage.removeItem('showWelcome');
      
      // Delay mínimo para asegurar que el DOM esté listo
      setTimeout(() => {
        MySwal.fire({
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 6000,
          timerProgressBar: true,
          background: '#ffffff',
          color: '#1e293b',
          width: 'auto',
          html: `
            <div class="welcome-container">
              <div class="welcome-logo">
                <span class="logo-text">SGH</span>
                <span class="logo-subtext">UNT</span>
              </div>
              <div class="welcome-content">
                <div class="welcome-title">¡Bienvenido!</div>
                <div class="welcome-user">${usuario.nombre || usuario.email.split('@')[0]}</div>
              </div>
              <div class="welcome-badge">
                ${usuario.rol.toUpperCase()}
              </div>
            </div>
          `,
          customClass: {
            popup: 'banner-welcome-premium',
            timerProgressBar: 'banner-timer-premium'
          },
          didOpen: (toast) => {
            toast.style.marginTop = '15px';
            const style = document.createElement('style');
            style.innerHTML = `
              .banner-welcome-premium {
                border-radius: 16px !important;
                box-shadow: 0 10px 25px -3px rgba(0,0,0,0.1) !important;
                border: 1px solid rgba(0, 51, 102, 0.1) !important;
                padding: 12px 20px !important;
                max-width: 95vw !important;
                animation: slideDownFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .welcome-container {
                display: flex;
                align-items: center;
                gap: 16px;
                font-family: 'Inter', sans-serif;
              }
              .welcome-logo {
                background: #003366;
                color: white;
                padding: 8px;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 50px;
              }
              .logo-text { font-weight: 900; font-size: 14px; line-height: 1; }
              .logo-subtext { font-weight: 700; font-size: 10px; color: #FFD700; }
              
              .welcome-content {
                text-align: left;
                flex-grow: 1;
              }
              .welcome-title {
                font-size: 0.8rem;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1;
              }
              .welcome-user {
                font-size: 1.1rem;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.2;
              }
              .welcome-badge {
                background: rgba(0, 51, 102, 0.05);
                color: #003366;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.7rem;
                font-weight: 800;
                border: 1px solid rgba(0, 51, 102, 0.1);
                white-space: nowrap;
              }
              .banner-timer-premium {
                background: #FFD700 !important;
                height: 3px !important;
              }

              @media (max-width: 600px) {
                .banner-welcome-premium {
                  padding: 8px 12px !important;
                }
                .welcome-container { gap: 10px; }
                .welcome-logo { min-width: 40px; padding: 6px; }
                .logo-text { font-size: 11px; }
                .logo-subtext { font-size: 8px; }
                .welcome-user { font-size: 0.95rem; }
                .welcome-badge { display: none; }
                .welcome-title { font-size: 0.7rem; }
              }

              @keyframes slideDownFade {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `;
            document.head.appendChild(style);
          }
        });
      }, 500);
    }
  }, [usuario]);

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
    const fetchCiclos = async () => {
      try {
        const [ciclosRes, cicloActualRes] = await Promise.all([
          api.get('/ciclos'),
          api.get('/ciclos/actual')
        ]);
        setCiclos(ciclosRes.data);
        setCicloActual(cicloActualRes.data);
        if (!cicloSeleccionadoId) {
          setCicloSeleccionadoId(cicloActualRes.data.id);
        }
      } catch (err) {
        console.error('Error al cargar ciclos:', err);
      }
    };
    fetchCiclos();
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!usuario || !cicloSeleccionadoId) return;

      try {
        setCargando(true);
        
        const targetCicloId = cicloSeleccionadoId;

        if (usuario?.rol === 'docente') {
          if (!usuario.docenteId) {
            throw new Error('No se encontró información de docente vinculada a este usuario.');
          }

          // Datos específicos para el docente
          const [horariosRes, cursosRes, estadoRes, noLectivaRes] = await Promise.all([
            api.get('/horarios', { params: { cicloId: targetCicloId, docenteId: usuario.docenteId } }),
            api.get(`/docentes/${usuario.docenteId}/cursos`),
            api.get('/ventanas/mi-estado'),
            api.get('/carga-no-lectiva', { params: { docenteId: usuario.docenteId, cicloId: targetCicloId } })
          ]);
          setMisHorarios(horariosRes.data);
          try {
            const filialRes = await api.get('/asignacion-filial', { params: { docenteId: usuario.docenteId, cicloId: targetCicloId } });
            setCargaAdicional(filialRes.data);
          } catch {
            setCargaAdicional(null);
          }
          const cursosNormalizados = (cursosRes.data || []).map((asignacion: any) => ({
            id: asignacion.curso?.id ?? asignacion.id,
            nombre: asignacion.curso?.nombre ?? 'Curso',
            codigo: asignacion.curso?.codigo ?? '-',
            ciclo: asignacion.curso?.cicloAcademico ? `${asignacion.curso.cicloAcademico} Ciclo` : (asignacion.ciclo?.nombre ?? '-'),
            tipoClase: asignacion.tipoClase,
            horasSemanales: asignacion.horasSemanales || 0,
          }));
          setMisCursos(cursosNormalizados);
          setEstadoSeleccion(estadoRes.data);
          setCargaNoLectiva(noLectivaRes.data);
          setEstadisticas(estadisticasVacias);
        } else {
          // Estadísticas generales para admin/coordinador
          const [statsRes, ventanaRes, atencionRes] = await Promise.all([
            api.get('/horarios/estadisticas', { params: { cicloId: targetCicloId } }),
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
  }, [usuario, cicloSeleccionadoId]);

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
    // Cálculos de horas para KPIs y Barras de Progreso
    const totalHorasProgramadas = misHorarios.reduce((acc, h) => {
      const start = parseInt(h.horaInicio.split(':')[0]);
      const end = parseInt(h.horaFin.split(':')[0]);
      return acc + (end - start);
    }, 0);

    const horasLectivasProgramadas = misHorarios
      .filter(h => h.tipoClase !== 'no_lectiva')
      .reduce((acc, h) => acc + (parseInt(h.horaFin.split(':')[0]) - parseInt(h.horaInicio.split(':')[0])), 0);

    const horasNoLectivasProgramadas = misHorarios
      .filter(h => h.tipoClase === 'no_lectiva')
      .reduce((acc, h) => acc + (parseInt(h.horaFin.split(':')[0]) - parseInt(h.horaInicio.split(':')[0])), 0);

    const horasLectivasAsignadas = misCursos.reduce((acc, c) => acc + (c.horasSemanales || 0), 0);
    
    // Calcular total de horas no lectivas asignadas desde el objeto cargaNoLectiva
    const horasNoLectivasAsignadas = cargaNoLectiva 
      ? (Number(cargaNoLectiva.horasPreparacion || 0) +
         Number(cargaNoLectiva.horasTutoria || 0) +
         Number(cargaNoLectiva.horasInvestigacion || 0) +
         Number(cargaNoLectiva.horasCapacitacion || 0) +
         Number(cargaNoLectiva.horasGobierno || 0) +
         Number(cargaNoLectiva.horasAdministracion || 0) +
         Number(cargaNoLectiva.horasAsesoria || 0) +
         Number(cargaNoLectiva.horasResponsabilidadSocial || 0) +
         Number(cargaNoLectiva.horasComites || 0))
      : 0;

    const porcentajeLectiva = horasLectivasAsignadas > 0 ? Math.min(100, (horasLectivasProgramadas / horasLectivasAsignadas) * 100) : 0;
    const porcentajeNoLectiva = horasNoLectivasAsignadas > 0 ? Math.min(100, (horasNoLectivasProgramadas / horasNoLectivasAsignadas) * 100) : 0;

    const proximasClases = misHorarios.length;
    const ambientesDistintos = new Set(misHorarios.map(h => h.aula?.nombre)).size;

    // Lógica para "Próxima Clase" (Hoy)
    const hoyIdx = new Date().getDay(); // 0=Dom, 1=Lun...
    const diaSemanaActual = hoyIdx === 0 ? 7 : hoyIdx;
    const horaActualStr = new Date().toLocaleTimeString('es-PE', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const proximaClaseHoy = misHorarios
      .filter(h => h.diaSemana === diaSemanaActual && h.horaInicio > horaActualStr)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0];

    // Datos para los gráficos
    const dataCargaDistribucion = [
      { name: 'Lectiva', value: horasLectivasProgramadas, color: '#003366' },
      { name: 'No Lectiva', value: horasNoLectivasProgramadas, color: '#7c3aed' },
      { name: 'Pendiente', value: Math.max(0, (horasLectivasAsignadas + horasNoLectivasAsignadas) - totalHorasProgramadas), color: '#e2e8f0' }
    ];

    const dataHorasPorDia = Object.entries(DIAS_MAP).map(([id, nombre]) => {
      const horasDia = misHorarios
        .filter(h => h.diaSemana === Number(id))
        .reduce((acc, h) => acc + (parseInt(h.horaFin.split(':')[0]) - parseInt(h.horaInicio.split(':')[0])), 0);
      return { name: nombre.substring(0, 3), fullDay: nombre, horas: horasDia };
    }).filter(d => d.horas > 0 || ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'].includes(d.name));

    const diaMasCargado = [...dataHorasPorDia].sort((a, b) => b.horas - a.horas)[0];
    const totalHorasSemana = dataHorasPorDia.reduce((acc, d) => acc + d.horas, 0);
    const promedioHorasDia = totalHorasSemana / (dataHorasPorDia.filter(d => d.horas > 0).length || 1);

    // Convertir carga adicional a eventos tipo horario
    const DIA_REVERSE: Record<string, number> = {
      'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4,
      'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
    };
    const filialEvents: any[] = [];
    if (cargaAdicional?.cursos) {
      for (const curso of cargaAdicional.cursos) {
        if (!curso.horarioSemanal) continue;
        for (let idx = 0; idx < curso.horarioSemanal.length; idx++) {
          const slot = curso.horarioSemanal[idx];
          const diaNum = DIA_REVERSE[slot.dia];
          if (!diaNum) continue;
          filialEvents.push({
            id: `filial_${curso.id}_${idx}`,
            tipoClase: 'filial',
            horaInicio: slot.horaInicio,
            horaFin: slot.horaFin,
            diaSemana: diaNum,
            curso: { nombre: curso.nombre },
            aula: { nombre: curso.dependencia || 'FILIAL' },
          });
        }
      }
    }

    // Filtrar horarios según el tab seleccionado
    const horariosBase = (filtroCarga === 'todos' || filtroCarga === 'filial')
      ? [...misHorarios, ...filialEvents]
      : misHorarios;
    const horariosFiltradosRaw = horariosBase.filter(h => {
      if (filtroCarga === 'todos') return true;
      if (filtroCarga === 'lectiva') return h.tipoClase !== 'no_lectiva' && h.tipoClase !== 'filial';
      if (filtroCarga === 'no_lectiva') return h.tipoClase === 'no_lectiva';
      if (filtroCarga === 'filial') return h.tipoClase === 'filial';
      return true;
    });
    const totalPages = Math.ceil(horariosFiltradosRaw.length / rowsPerPageFilial);
    const currentPage = Math.min(pageFilial, Math.max(0, totalPages - 1));
    const horariosFiltrados = horariosFiltradosRaw.slice(currentPage * rowsPerPageFilial, (currentPage + 1) * rowsPerPageFilial);

    // Agrupar cursos para la sección lateral
    const misCursosAgrupados = misCursos.reduce((acc: any[], current: any) => {
      const existing = acc.find(c => c.id === current.id);
      if (existing) {
        // Si el curso ya existe, solo nos aseguramos de no duplicar tipos si los estuviéramos guardando
        return acc;
      }
      return [...acc, current];
    }, []);

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { 
              label: 'Mis Cursos', 
              value: misCursosAgrupados.length, 
              icon: <BookIcon />, 
              color: '#6366f1', 
              bg: 'rgba(99, 102, 241, 0.05)', 
              borderColor: 'rgba(99, 102, 241, 0.4)', 
              shadowColor: '99, 102, 241',
              trend: 'Ciclo Actual',
              cardBg: 'rgba(99, 102, 241, 0.18)'
            },
            { 
              label: 'Horas Semanales', 
              value: totalHorasProgramadas, 
              icon: <CalendarIcon />, 
              color: '#f59e0b', 
              bg: 'rgba(245, 158, 11, 0.05)', 
              borderColor: 'rgba(245, 158, 11, 0.4)', 
              shadowColor: '245, 158, 11',
              trend: 'Carga Total',
              cardBg: 'rgba(245, 158, 11, 0.18)'
            },
            { 
              label: 'Clases Programadas', 
              value: proximasClases, 
              icon: <ChartIcon />, 
              color: '#3b82f6', 
              bg: 'rgba(59, 130, 246, 0.05)', 
              borderColor: 'rgba(59, 130, 246, 0.4)', 
              shadowColor: '59, 130, 246',
              trend: 'Total Semanal',
              cardBg: 'rgba(59, 130, 246, 0.18)'
            },
            { 
              label: 'Ambientes / Aulas', 
              value: ambientesDistintos, 
              icon: <MeetingRoomIcon />, 
              color: '#10b981', 
              bg: 'rgba(16, 185, 129, 0.05)', 
              borderColor: 'rgba(16, 185, 129, 0.4)', 
              shadowColor: '16, 185, 129',
              trend: 'Ubicaciones',
              cardBg: 'rgba(16, 185, 129, 0.18)'
            },
          ].map((kpi, i) => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={i}>
              <Card 
                sx={{ 
                  borderRadius: 5, 
                  border: `2px solid ${kpi.borderColor}`, 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  bgcolor: kpi.cardBg,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.01)',
                    boxShadow: `0 15px 30px -5px rgba(${kpi.shadowColor}, 0.2)`,
                    '& .kpi-avatar': {
                      transform: 'rotate(15deg) scale(1.15)',
                      boxShadow: `0 12px 28px rgba(${kpi.shadowColor}, 0.35)`,
                    },
                    '& .kpi-number': {
                      transform: 'scale(1.08) translateY(-2px)',
                    },
                  },
                }}
              >
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Avatar 
                      className="kpi-avatar"
                      sx={{ 
                        bgcolor: kpi.bg, 
                        color: kpi.color, 
                        borderRadius: 3, 
                        width: 60, 
                        height: 60,
                        border: `2px solid ${kpi.borderColor}`,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 4px 12px rgba(${kpi.shadowColor}, 0.15)`,
                      }}
                    >
                      {kpi.icon}
                    </Avatar>
                  </Box>
                  <Box sx={{ mt: 2.5 }}>
                    <Typography 
                      className="kpi-number"
                      variant="h3" 
                      sx={{ 
                        fontWeight: 900, 
                        color: kpi.color,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {kpi.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', fontWeight: 700, mt: 0.8, fontSize: '0.9rem' }}>
                      {kpi.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: kpi.color, fontWeight: 800, mt: 2, display: 'block', fontSize: '0.78rem' }}>
                    {kpi.trend}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4} sx={{ mb: 5 }}>
          {/* Columna de Estado y Progreso */}
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" /> Resumen de Cumplimiento de Carga
                </Typography>
                
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>Carga Lectiva (Cursos)</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#003366' }}>
                          {horasLectivasProgramadas}h / {horasLectivasAsignadas}h
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={porcentajeLectiva} 
                        sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#003366' } }} 
                      />
                      <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                        {porcentajeLectiva === 100 ? '¡Carga lectiva completada!' : `Faltan ${Math.max(0, horasLectivasAsignadas - horasLectivasProgramadas)} horas`}
                      </Typography>
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>Carga No Lectiva</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#7c3aed' }}>
                          {horasNoLectivasProgramadas}h / {horasNoLectivasAsignadas}h
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={porcentajeNoLectiva} 
                        sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#7c3aed' } }} 
                      />
                      <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                        {porcentajeNoLectiva === 100 ? '¡Carga no lectiva completada!' : `Faltan ${Math.max(0, horasNoLectivasAsignadas - horasNoLectivasProgramadas)} horas`}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Gráfico de Distribución (Pie Chart) */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ height: 160, width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dataCargaDistribucion}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {dataCargaDistribucion.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Columna de Próxima Clase y Estado de Registro */}
          <Grid item xs={12} md={5}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0', bgcolor: proximaClaseHoy ? '#f0f9ff' : '#fff' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon color="info" /> Próxima Clase
                    </Typography>
                    {proximaClaseHoy ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ bgcolor: '#003366', color: 'white', p: 1.5, borderRadius: 3, textAlign: 'center', minWidth: 80 }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{proximaClaseHoy.horaInicio}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>INICIO</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', lineHeight: 1.2 }}>
                            {(proximaClaseHoy.curso?.nombre || proximaClaseHoy.actividadNoLectiva || 'Clase').toUpperCase()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                            Aula: {proximaClaseHoy.aula?.nombre || 'S.A.'} • {proximaClaseHoy.tipoClase.replace('_', ' ').toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                          Sin clases pendientes hoy.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ 
                  borderRadius: 5, 
                  border: '1px solid',
                  borderColor: estadoSeleccion?.estado === 'en_atencion' ? '#bbf7d0' : '#e2e8f0',
                  bgcolor: estadoSeleccion?.estado === 'en_atencion' ? '#f0fdf4' : '#fff'
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon color={estadoSeleccion?.estado === 'en_atencion' ? 'success' : 'disabled'} /> Registro
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, display: 'block' }}>
                          {estadoSeleccion?.estado === 'en_atencion' 
                            ? 'TURNO ACTIVO' 
                            : estadoSeleccion?.estado === 'finalizado' 
                              ? 'REGISTRO FINALIZADO' 
                              : 'EN ESPERA'}
                        </Typography>
                      </Box>
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => router.push(estadoSeleccion?.estado === 'finalizado' ? '/reportes' : '/horarios')}
                        sx={{ 
                          borderRadius: 2, 
                          textTransform: 'none', 
                          fontWeight: 700,
                          bgcolor: estadoSeleccion?.estado === 'en_atencion' ? '#166534' : '#003366',
                          fontSize: '0.75rem'
                        }}
                      >
                        {estadoSeleccion?.estado === 'finalizado' ? 'Reportes' : 'Ir a Horarios'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Gráfico de Barras: Horas por Día */}
        <Grid container sx={{ mb: 5 }}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 5, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" /> Intensidad de Horas por Día
                </Typography>
                
                <Grid container spacing={4} alignItems="center">
                  {/* Interpretación (1/3) */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: 4, border: '1px solid #f1f5f9' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon fontSize="small" /> ANÁLISIS DE CARGA
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                            DÍA DE MAYOR ACTIVIDAD
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {diaMasCargado?.horas > 0 ? diaMasCargado.fullDay : 'Sin datos'}
                          </Typography>
                          {diaMasCargado?.horas > 0 && (
                            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>
                              {diaMasCargado.horas} horas programadas
                            </Typography>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                            PROMEDIO DIARIO
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {promedioHorasDia.toFixed(1)} Horas / día
                          </Typography>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4 }}>
                          {diaMasCargado?.horas > 8 
                            ? `Se observa una alta concentración de actividades el día ${diaMasCargado.fullDay}. Asegúrate de tomar descansos adecuados.`
                            : 'Tu distribución horaria se mantiene equilibrada durante la semana.'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Gráfica (2/3) */}
                  <Grid item xs={12} md={8}>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataHorasPorDia}>
                          <defs>
                            <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#003366" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 700, fill: '#64748b' }} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                          <Area type="monotone" dataKey="horas" stroke="#003366" strokeWidth={3} fillOpacity={1} fill="url(#colorHoras)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>Mi Horario Semanal</Typography>
                <Tabs 
                  value={filtroCarga} 
                  onChange={(_, val) => setFiltroCarga(val)}
                  sx={{ 
                    minHeight: 40,
                    '& .MuiTab-root': { 
                      minHeight: 40, 
                      textTransform: 'none', 
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      borderRadius: 2,
                      px: 2
                    }
                  }}
                >
                  <Tab label="Todos" value="todos" />
                  <Tab label="Carga Lectiva" value="lectiva" />
                  <Tab label="No Lectiva" value="no_lectiva" />
                  {cargaAdicional?.cursos?.length > 0 && (
                    <Tab 
                      label={`Carga Adicional (${cargaAdicional.cursos.length})`} 
                      value="filial" 
                      onClick={() => setPageFilial(0)}
                    />
                  )}
                </Tabs>
              </Box>
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Día</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Hora</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Curso / Actividad</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Aula</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {horariosFiltrados.length > 0 ? (
                      horariosFiltrados
                        .sort((a, b) => (a.diaSemana - b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio))
                        .map((h, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{DIAS_MAP[h.diaSemana]}</TableCell>
                            <TableCell>{h.horaInicio.substring(0,5)} - {h.horaFin.substring(0,5)}</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: h.tipoClase === 'no_lectiva' ? '#7c3aed' : h.tipoClase === 'filial' ? '#d97706' : '#003366' }}>
                              {h.tipoClase === 'no_lectiva' 
                                ? (h.actividadNoLectiva || 'ACTIVIDAD NO LECTIVA').toUpperCase()
                                : h.tipoClase === 'filial'
                                  ? (h.curso?.nombre || 'CARGA ADICIONAL').toUpperCase()
                                  : (h.curso?.nombre || 'S.C.').toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ 
                                px: 1.5, py: 0.5, borderRadius: 2, display: 'inline-block',
                                bgcolor: h.tipoClase === 'no_lectiva' 
                                  ? 'rgba(124, 58, 237, 0.1)' 
                                  : h.tipoClase === 'filial'
                                    ? 'rgba(217, 119, 6, 0.1)'
                                    : h.tipoClase === 'teoria' 
                                      ? 'rgba(99, 102, 241, 0.1)' 
                                      : 'rgba(245, 158, 11, 0.1)',
                                color: h.tipoClase === 'no_lectiva' 
                                  ? '#7c3aed' 
                                  : h.tipoClase === 'filial'
                                    ? '#d97706'
                                    : h.tipoClase === 'teoria' 
                                      ? '#6366f1' 
                                      : '#f59e0b',
                                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                              }}>
                                {h.tipoClase === 'filial' ? 'ADICIONAL' : h.tipoClase.replace('_', ' ')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{h.aula?.nombre || '-'}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="Gestionar en Horarios">
                                <IconButton 
                                  size="small" 
                                  onClick={() => router.push('/horarios')}
                                  sx={{ color: '#003366', bgcolor: 'rgba(0, 51, 102, 0.05)', '&:hover': { bgcolor: 'rgba(0, 51, 102, 0.1)' } }}
                                >
                                  <CalendarIcon sx={{ fontSize: '1.2rem' }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                          No se encontraron horarios para este filtro.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {horariosFiltradosRaw.length > rowsPerPageFilial && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => setPageFilial(p => p - 1)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Anterior
                  </Button>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                    {currentPage + 1} de {totalPages}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={(currentPage + 1) * rowsPerPageFilial >= horariosFiltradosRaw.length}
                    onClick={() => setPageFilial(p => p + 1)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                  >
                    Siguiente
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#1e293b' }}>Mis Cursos Asignados</Typography>
              <List sx={{ p: 0 }}>
                {misCursosAgrupados.map((curso, i) => {
                  // Obtener tipos de clase para este curso específico
                  const tipos = (misCursos || [])
                    .filter(c => c.id === curso.id)
                    .map(c => c.tipoClase?.charAt(0).toUpperCase())
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <React.Fragment key={curso.id}>
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: 'rgba(0, 51, 102, 0.1)', color: '#003366', borderRadius: 2 }}>
                            <BookIcon />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText 
                          primary={curso.nombre} 
                          secondary={
                            <Box component="span" sx={{ display: 'block' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block' }}>
                                {curso.codigo} • {curso.ciclo}
                              </Typography>
                              {tipos && (
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366', mt: 0.5, display: 'block' }}>
                                  Tipos: {tipos}
                                </Typography>
                              )}
                            </Box>
                          }
                          primaryTypographyProps={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}
                        />
                      </ListItem>
                      {i < misCursosAgrupados.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                    </React.Fragment>
                  );
                })}
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
              Visualizando: {ciclos.find(c => c.id === cicloSeleccionadoId)?.nombre || cicloActual?.nombre}
            </Typography>
            {cicloSeleccionadoId === cicloActual?.id && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: '#e2e8f0', borderRadius: 1, fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                ACTUAL
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pl: 1.5,
              pr: 0.5,
              py: 0.25,
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
              bgcolor: 'white',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': {
                borderColor: '#cbd5e1',
                boxShadow: '0 2px 8px rgba(0, 51, 102, 0.06)',
              },
              '&:focus-within': {
                borderColor: '#003366',
                boxShadow: '0 0 0 3px rgba(0, 51, 102, 0.08)',
              },
            }}
          >
            <CalendarIcon sx={{ fontSize: 20, color: '#003366', flexShrink: 0 }} />
            <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 168 } }}>
              <Select
                value={cicloSeleccionadoId || ''}
                onChange={(e) => setCicloSeleccionadoId(Number(e.target.value))}
                variant="standard"
                disableUnderline
                sx={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  color: '#334155',
                  '& .MuiSelect-select': {
                    py: 0.85,
                    pr: '28px !important',
                    fontWeight: 500,
                  },
                  '& .MuiSelect-icon': { color: '#94a3b8', right: 4 },
                }}
              >
                {ciclos.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {c.nombre}{c.id === cicloActual?.id ? ' (Actual)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

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
