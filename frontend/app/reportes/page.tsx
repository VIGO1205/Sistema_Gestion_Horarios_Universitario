 'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  IconButton,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  PictureAsPdf as PdfIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  MeetingRoom as RoomIcon,
  School as SchoolIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
  DeleteOutline as DeleteIcon,
  Refresh as RefreshIcon,
  Draw as SignIcon,
  AccessTime as WaitIcon,
  CheckCircle as SuccessIcon,
  Search as SearchIcon,
  GetApp as DownloadIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/components/providers/AuthProvider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

// Tipos de reportes
const REPORTES_OPERACIONALES = [
  { id: 'horario_docente_lectiva', nombre: 'Horario por Docente - Carga Lectiva', icon: <PersonIcon />, desc: 'Detalle semanal de carga horaria lectiva por cada docente.' },
  { id: 'horario_docente_no_lectiva', nombre: 'Horario por Docente - Carga No Lectiva', icon: <PersonIcon />, desc: 'Detalle semanal de carga horaria no lectiva por cada docente.' },
  { id: 'horario_aula', nombre: 'Uso de Ambientes', icon: <RoomIcon />, desc: 'Ocupación de aulas y laboratorios por bloque horario.' },
  { id: 'horario_carrera', nombre: 'Horario por Carrera', icon: <SchoolIcon />, desc: 'Programación completa de cursos por carrera y ciclo.' },
  { id: 'disponibilidad_docente', nombre: 'Disponibilidad Docente', icon: <HistoryIcon />, desc: 'Resumen de horas libres y asignadas por docente.' },
  { id: 'alertas_cruces', nombre: 'Reporte de Cruces', icon: <WarningIcon />, desc: 'Identificación de conflictos de horario y aulas.' },
];

const REPORTES_GESTION = [
  { id: 'carga_academica', nombre: 'Resumen de Carga Académica', icon: <AssignmentIcon />, desc: 'Estadísticas de horas dictadas vs requeridas.' },
  { id: 'eficiencia_aulas', nombre: 'Eficiencia de Espacios', icon: <AssessmentIcon />, desc: 'Porcentaje de uso y optimización de ambientes.' },
  { id: 'cumplimiento_ciclo', nombre: 'Cumplimiento del Ciclo', icon: <DescriptionIcon />, desc: 'Estado de avance de la programación académica.' },
];

// Orden de reportes oficiales
const ORDEN_REPORTES_OFICIALES = [
  'DECLARACION DE LA CARGA ACADEMICA DOCENTE (F01-CAD)',
  'DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL (F02-CAD)',
  'HORARIO SEMANAL DE LA CARGA ACADEMICA DOCENTE (F03-CAD)',
  'DECLARACION DE CARGA HORARIA LECTIVA ASIGNADA EN FILIALES, POSTGRADO, SEGUNDAS ESPECIALIDADES Y CENTROS DE PRODUCCION Y EXTENSION UNIVERSITARIA (F04-CAD)',
];

const DIAS_MAP: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const HORAS_LIST = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const DIAS_LIST = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
];

export default function ReportesPage() {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cargandoPagina, setCargandoPagina] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  
  const [filtros, setFiltros] = useState({
    cicloId: '',
    cicloEstudio: '',
    docente: null as any,
    carreraId: '',
    ambienteId: '',
  });

  const [misHorarios, setMisHorarios] = useState<any[]>([]);
  const [cargandoHorario, setCargandoHorario] = useState(false);

  // --- ESTADOS PARA CRUD DOCENTE ---
  const [reportes, setReportes] = useState<any[]>([]);
  const [reportesSearch, setReportesSearch] = useState('');
  const [reportesPage, setReportesPage] = useState(0);
  const [reportesRowsPerPage, setReportesRowsPerPage] = useState(10);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [mostrarFiltrosSecundarios, setMostrarFiltrosSecundarios] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; blob: Blob; fileName: string } | null>(null);
  const [filtrosCRUD, setFiltrosCRUD] = useState({
    sede: 'Todas las Sedes',
    estado: 'Todos los Estados',
  });

  const fetchReportes = async () => {
    if (!usuario?.docenteId || !filtros.cicloId) return;
    setLoadingReportes(true);
    try {
      const res = await api.get('/reportes', { 
        params: { 
          docenteId: usuario.docenteId,
          cicloId: filtros.cicloId 
        } 
      });
      setReportes(res.data);
    } catch (error) {
      console.error('Error fetching reportes:', error);
    } finally {
      setLoadingReportes(false);
    }
  };

  useEffect(() => {
    if (usuario?.rol === 'docente') {
      fetchReportes();
    }
  }, [usuario, filtros.cicloId]);

  const handleFirmar = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Firmar documento?',
      text: 'Esta acción aplicará tu firma digital al formato seleccionado.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, firmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b3a75',
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/reportes/${id}/firmar`);
        Swal.fire('¡Firmado!', 'El reporte ha sido firmado exitosamente.', 'success');
        fetchReportes();
      } catch (error: any) {
        Swal.fire('Error', error.response?.data?.message || 'No se pudo firmar', 'error');
      }
    }
  };

  const handleDescargarReporteOficial = async (id: number, nombre: string) => {
    try {
      const res = await api.get(`/reportes/descargar/${id}`, { responseType: 'arraybuffer' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, blob, fileName: nombre });
    } catch (error) {
      Swal.fire('Error', 'No se pudo obtener el PDF', 'error');
    }
  };

  const handleDescargarReporteOficialExcel = async (id: number, nombre: string) => {
    try {
      const res = await api.get(`/reportes/descargar-excel/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombre);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      Swal.fire('Error', 'No se pudo descargar el archivo Excel', 'error');
    }
  };

  const filteredReportes = useMemo(() => {
    let filtered = reportes.filter(r => 
      r.formato.toLowerCase().includes(reportesSearch.toLowerCase())
    );

    // Filtros secundarios
    if (filtrosCRUD.sede && filtrosCRUD.sede !== 'Todas las Sedes') {
      filtered = filtered.filter(r => r.sede === filtrosCRUD.sede);
    }
    if (filtrosCRUD.estado && filtrosCRUD.estado !== 'Todos los Estados') {
      filtered = filtered.filter(r => r.estado === filtrosCRUD.estado);
    }
    
    // Ordenar según el orden específico de reportes oficiales
    return filtered.sort((a, b) => {
      const indexA = ORDEN_REPORTES_OFICIALES.indexOf(a.formato);
      const indexB = ORDEN_REPORTES_OFICIALES.indexOf(b.formato);
      
      // Si ambos están en el orden oficial, usar ese orden
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Si solo uno está en el orden oficial, ponerlo primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Si ninguno está en el orden oficial, mantener el orden original (createdAt DESC)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reportes, reportesSearch, filtrosCRUD]);

  const getCarreraIngenieriaSistemas = (listaCarreras: any[]) => {
    return listaCarreras.find((carrera) => {
      const texto = `${carrera.nombre || ''} ${carrera.codigo || ''}`.toLowerCase();
      return texto.includes('ing. sistemas') || texto.includes('ingenieria de sistemas') || texto.includes('ingeniería de sistemas') || texto.includes('sistemas');
    }) || null;
  };

  // Filtrar docentes por carrera seleccionada
  const docentesFiltrados = filtros.carreraId 
    ? docentes.filter(d => {
        // Verificamos si el docente pertenece a la carrera seleccionada
        // La estructura puede variar según el backend (carreras: [{carreraId: X}, ...] o carreras: [{id: X}, ...])
        return d.carreras?.some((dc: any) => 
          dc.carreraId === parseInt(filtros.carreraId) || 
          dc.carrera?.id === parseInt(filtros.carreraId) ||
          dc.id === parseInt(filtros.carreraId)
        );
      })
    : docentes;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargandoPagina(true);
        const [ciclosRes, docentesRes, carrerasRes, ambientesRes] = await Promise.all([
          api.get('/ciclos').catch(() => ({ data: [] })),
          api.get('/docentes').catch(() => ({ data: [] })),
          api.get('/carreras').catch(() => ({ data: [] })),
          api.get('/aulas').catch(() => ({ data: [] })),
        ]);
        
        const listaCiclos = ciclosRes.data || [];
        setCiclos(listaCiclos);
        setDocentes(docentesRes.data || []);
        setCarreras(carrerasRes.data || []);
        setAmbientes(ambientesRes.data || []);
        
        const actual = listaCiclos.find((c: any) => c.esActual) || 
                       listaCiclos.find((c: any) => c.nombre?.includes('2026'));
        const carreraDefault = getCarreraIngenieriaSistemas(carrerasRes.data || []);
        
        setFiltros(f => ({
          ...f,
          cicloId: actual?.id ? String(actual.id) : f.cicloId,
          cicloEstudio: f.cicloEstudio || '',
          carreraId: carreraDefault?.id ? String(carreraDefault.id) : f.carreraId,
        }));
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setCargandoPagina(false);
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    if (usuario?.rol === 'docente' && usuario?.docenteId) {
      const fetchMiHorario = async () => {
        try {
          setCargandoHorario(true);
          const cicloActual = ciclos.find(c => c.actual) || ciclos[0];
          const res = await api.get('/horarios', { 
            params: { cicloId: cicloActual?.id, docenteId: usuario.docenteId } 
          });
          setMisHorarios(res.data);
        } catch (err) {
          console.error('Error cargando horario visual:', err);
        } finally {
          setCargandoHorario(false);
        }
      };
      fetchMiHorario();
    }
  }, [usuario, ciclos]);

  if (cargandoPagina) {
    return <LoadingSpinner />;
  }

  const handleLimpiarFiltros = () => {
    const actual = ciclos.find((c: any) => c.actual) || 
                   ciclos.find((c: any) => c.nombre?.includes('2026'));
    const carreraDefault = getCarreraIngenieriaSistemas(carreras);
    setFiltros({
      cicloId: actual?.id ? String(actual.id) : '',
      cicloEstudio: '',
      docente: null,
      carreraId: carreraDefault?.id ? String(carreraDefault.id) : '',
      ambienteId: '',
    });
  };

  const generatePDF = async (reporteId: string) => {
    setLoading(true);
    try {
      const doc = (reporteId === 'horario_docente_lectiva' || reporteId === 'horario_docente_no_lectiva')
        ? new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as any
        : new jsPDF() as any;

      const loadAndRegisterFont = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          const buffer = await res.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
          (doc as any).addFileToVFS(`${name}.ttf`, b64);
          (doc as any).addFont(`${name}.ttf`, name, 'normal');
        } catch (e) {
          console.warn(`Fallo al cargar fuente ${name} desde ${url}`, e);
        }
      };

      await loadAndRegisterFont('/fonts/trebuc.ttf', 'Trebuchet');
      await loadAndRegisterFont('/fonts/trebucbd.ttf', 'Trebuchet-Bold');
      const cicloNombre = ciclos.find(c => c.id === filtros.cicloId)?.nombre || '2026-I';
      const carreraSeleccionada = carreras.find(c => String(c.id) === String(filtros.carreraId)) || getCarreraIngenieriaSistemas(carreras);
      
      const AZUL_UNT: [number, number, number] = [0, 51, 102];
      const CELESTE: [number, number, number] = [59, 130, 246];
      const VERDE: [number, number, number] = [16, 185, 129];
      const AMARILLO: [number, number, number] = [245, 158, 11];
      const ROJO: [number, number, number] = [239, 68, 68];
      const MORADO: [number, number, number] = [139, 92, 246];
      const GRIS: [number, number, number] = [100, 116, 139];
      
      const reporte = [...REPORTES_OPERACIONALES, ...REPORTES_GESTION].find(r => r.id === reporteId);

      // --- CABECERA AZUL INSTITUCIONAL (Para todos los reportes) ---
      const isLandscape = (reporteId === 'horario_docente_lectiva' || reporteId === 'horario_docente_no_lectiva');
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerHeight = isLandscape ? 30 : 40; // Altura reducida para el reporte de docente
      
      doc.setFillColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(isLandscape ? 18 : 22);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD NACIONAL DE TRUJILLO', pageWidth / 2, headerHeight * 0.5, { align: 'center' });
      doc.setFontSize(isLandscape ? 11 : 14);
      doc.text('Sistema de Gestión de Horarios Académicos', pageWidth / 2, headerHeight * 0.75, { align: 'center' });
      
      if (reporteId !== 'horario_docente_lectiva' && reporteId !== 'horario_docente_no_lectiva') {
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(16);
        doc.text(reporte?.nombre.toUpperCase() || 'REPORTE', 20, headerHeight + 15);
        
        doc.setFontSize(10);
        doc.text(`Ciclo Académico: ${cicloNombre}`, 20, headerHeight + 25);
        if (filtros.cicloEstudio) {
          doc.text(`Ciclo de Estudios: ${filtros.cicloEstudio}°`, 20, headerHeight + 30);
        }
        doc.text(`Carrera: ${carreraSeleccionada?.nombre || 'TODAS LAS CARRERAS'}`, 20, headerHeight + (filtros.cicloEstudio ? 35 : 30));
        doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 20, headerHeight + (filtros.cicloEstudio ? 40 : 35));
        doc.text(`Emitido por: Sistema de Horarios UNT`, 20, headerHeight + (filtros.cicloEstudio ? 45 : 40));
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, headerHeight + (filtros.cicloEstudio ? 50 : 45), pageWidth - 20, headerHeight + (filtros.cicloEstudio ? 50 : 45));
      }

      const params: any = { cicloId: filtros.cicloId };
      
      if (filtros.docente && filtros.docente.id) {
        params.docenteId = filtros.docente.id;
      }
      
      if (filtros.ambienteId && filtros.ambienteId !== '') {
        params.aulaId = filtros.ambienteId;
      }
      
      if (filtros.carreraId && filtros.carreraId !== '') {
        params.carreraId = filtros.carreraId;
      }

      const response = await api.get('/horarios', { params });
      const horariosBase = response.data || [];
      
      // Aplicar filtro de Ciclo de Estudios (1°-10°) para todos los reportes operacionales
      const esReporteOperacional = REPORTES_OPERACIONALES.some(r => r.id === reporteId);
      const horarios = (esReporteOperacional && filtros.cicloEstudio)
          ? horariosBase.filter(
              (h: any) => String(h.curso?.cicloAcademico || '').trim() === String(filtros.cicloEstudio),
            )
          : horariosBase;

      if (reporteId === 'horario_docente_lectiva') {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 5;
        
        // --- CASO SIN DATOS ELEGANTE ---
        if (horarios.length === 0) {
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE DE HORARIOS POR DOCENTE', pageWidth / 2, headerHeight + 30, { align: 'center' });
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text('No se encontraron horarios programados para los filtros seleccionados.', pageWidth / 2, headerHeight + 45, { align: 'center' });
          doc.text('Por favor, verifique el Periodo Académico, Carrera o Docente e intente nuevamente.', pageWidth / 2, headerHeight + 52, { align: 'center' });
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin * 4, headerHeight + 65, pageWidth - margin * 4, headerHeight + 65);
          
          const blob0 = doc.output('blob');
          const url0 = URL.createObjectURL(blob0);
          setPdfPreview({ url: url0, blob: blob0, fileName: `${reporteId}_${cicloNombre}.pdf` });
          setLoading(false);
          return;
        }

        // --- CASO CON DATOS: 3 GRILLAS EN UNA HOJA ---
        const headerH = 30; // Altura de la cabecera azul ya dibujada
        const leftWidth = pageWidth * (2.8 / 8) - margin; 
        const rightX = leftWidth + margin + 4; 
        const topBoxY = headerH + 4;
        const topBoxHeight = 62; // Reducido para que quepa todo
        const bottomGridY = topBoxY + topBoxHeight + 5;

        const cicloActual = ciclos.find((c: any) => String(c.id) === String(filtros.cicloId));
        
        // Función para formatear fecha sin desfase horario
        const formatDateWithoutTZ = (dateStr: any) => {
          if (!dateStr) return 'NO REGISTRADO';
          const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        const cicloInicio = formatDateWithoutTZ(cicloActual?.fechaInicio);
        const cicloFin = formatDateWithoutTZ(cicloActual?.fechaFin);
        const cicloPartes = String(cicloNombre).split('-');
        const anioAcademicoDefault = cicloPartes[0] || cicloNombre;
        const semestreDefault = cicloPartes[1] || 'I';

        const ciclosEstudioConHorario = Array.from(
          new Set(
            horarios
              .map((h: any) => String(h.curso?.cicloAcademico || '').trim())
              .filter((c: string) => c !== ''),
          ),
        ).sort((a, b) => Number(a) - Number(b));

        const periodosConHorario = Array.from(
          new Set(
            horarios
              .map((h: any) => String(h.ciclo?.nombre || '').trim())
              .filter((p: string) => p !== ''),
          ),
        );

        const periodosBase = periodosConHorario.length > 0 ? periodosConHorario : [String(cicloNombre)];
        const aniosConHorario = Array.from(
          new Set(periodosBase.map((p) => String(p).split('-')[0]).filter(Boolean)),
        );
        const semestresConHorario = Array.from(
          new Set(periodosBase.map((p) => String(p).split('-')[1]).filter(Boolean)),
        );

        const anioAcademico = aniosConHorario.length > 0 ? aniosConHorario.join(', ') : anioAcademicoDefault;
        const semestre = semestresConHorario.length > 0 ? semestresConHorario.join(', ') : semestreDefault;

        const cicloEstudioSeleccionado = filtros.cicloEstudio
          ? `${filtros.cicloEstudio}°`
          : (ciclosEstudioConHorario.length > 0
              ? ciclosEstudioConHorario.map((c) => `${c}°`).join(', ')
              : 'SIN DATOS');
        const escuela = (carreraSeleccionada?.nombre || 'INGENIERIA DE SISTEMAS').toUpperCase();
        const seccion = 'A';

        const formatType = (tipo: string) => {
          if (tipo === 'teoria') return 'Teoría';
          if (tipo === 'practica') return 'Práctica';
          if (tipo === 'laboratorio') return 'Lab.';
          return tipo || 'N/A';
        };

        const palette: [number, number, number][] = [
          [147, 197, 253],
          [252, 165, 165],
          [250, 204, 21],
          [110, 231, 183],
          [196, 181, 253],
          [129, 140, 248],
          [251, 146, 60],
          [74, 222, 128],
          [103, 232, 249],
          [168, 85, 247],
        ];

        const asignacionesMap = new Map<string, any>();
        const horariosValidos = horarios.filter((h: any) => h.curso && h.curso.nombre);
        
        horariosValidos.forEach((h: any) => {
          const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
          const cursoNombre = h.curso.nombre.trim();
          const departamento = h.curso?.departamento || 'General';
          const key = `${docenteNombre}__${cursoNombre}`;
          const horas = Math.max(
            parseInt(h.horaFin?.substring(0, 2) || '0', 10) - parseInt(h.horaInicio?.substring(0, 2) || '0', 10),
            1,
          );

          if (!asignacionesMap.has(key)) {
            asignacionesMap.set(key, {
              key,
              docente: docenteNombre,
              curso: cursoNombre,
              departamento: departamento,
              ciclos: new Set<string>(),
              teoria: 0,
              practica: 0,
              laboratorio: 0,
              labGroups: new Set<number>(),
              total: 0,
              horarios: [],
            });
          }

          const item = asignacionesMap.get(key);
          const cicloCurso = String(h.curso?.cicloAcademico || '').trim();
          if (cicloCurso) item.ciclos.add(cicloCurso);
          item.total += horas;
          item.horarios.push(h);
          if (h.tipoClase === 'teoria') item.teoria += horas;
          if (h.tipoClase === 'practica') item.practica += horas;
          if (h.tipoClase === 'laboratorio') {
            item.laboratorio += horas;
            if (h.grupo?.id) item.labGroups.add(h.grupo.id);
          }
        });

        const asignaciones = Array.from(asignacionesMap.values())
          .sort((a: any, b: any) => {
            // Primero ordenar por Departamento alfabético
            const depCompare = a.departamento.localeCompare(b.departamento);
            if (depCompare !== 0) return depCompare;
            // Luego por Profesor
            const docCompare = a.docente.localeCompare(b.docente);
            if (docCompare !== 0) return docCompare;
            // Por último por Asignatura
            return a.curso.localeCompare(b.curso);
          })
          .map((item: any, index: number) => {
            const numGrupos = item.labGroups.size;
            return {
              ...item,
              numero: index + 1,
              ciclosTexto: Array.from(item.ciclos as Set<string>).sort((a, b) => Number(a) - Number(b)).map(c => `${c}°`).join(', ') || '-',
              color: palette[index % palette.length],
              displayL: numGrupos > 0 ? (item.laboratorio / numGrupos) : item.laboratorio,
              displayG: numGrupos > 0 ? String(numGrupos) : '-',
            };
          });

        const asignacionLookup = new Map<string, { numero: number; color: [number, number, number] }>();
        asignaciones.forEach((item: any) => {
          asignacionLookup.set(item.key, { numero: item.numero, color: item.color });
        });

        const AZUL_UNT: [number, number, number] = [0, 51, 102];

        try {
          doc.setFont('Trebuchet');
        } catch (e) {
        }
        doc.setFontSize(8.5);

        // --- CABECERA DIVIDIDA CON ESTILO AZUL ---
        doc.setDrawColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.setLineWidth(0.4);
        doc.rect(margin, topBoxY, pageWidth - margin * 2, topBoxHeight);
        doc.line(rightX - 2, topBoxY, rightX - 2, topBoxY + topBoxHeight);

        try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
        doc.setFontSize(9);
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.text('FACULTAD DE INGENIERIA', margin + leftWidth / 2, topBoxY + 6, { align: 'center' });
        doc.text('ESCUELA DE INGENIERIA DE SISTEMAS', margin + leftWidth / 2, topBoxY + 11, { align: 'center' });

        doc.setFont('Trebuchet');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text('CICLO:', margin + 3, topBoxY + 22);
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.text(cicloEstudioSeleccionado, margin + 24, topBoxY + 22);

        doc.setTextColor(0, 0, 0);
        doc.text('SECCION:', margin + 38, topBoxY + 22);
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.text(seccion, margin + 55, topBoxY + 22);

        doc.setTextColor(0, 0, 0);
        doc.text('AÑO ACADÉMICO:', margin + 3, topBoxY + 32);
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.text(anioAcademico, margin + 34, topBoxY + 32);

        doc.setTextColor(0, 0, 0);
        doc.text('SEMESTRE:', margin + 55, topBoxY + 32);
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.text(semestre, margin + 75, topBoxY + 32);

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('INICIO:', margin + 15, topBoxY + 45, { align: 'left' });
        
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        const anchoInicio = (doc as any).getTextWidth('INICIO:');
        doc.text(cicloInicio, margin + 15 + anchoInicio + 1, topBoxY + 45, { align: 'left' });
        
        doc.setTextColor(0, 0, 0);
        const anchoFechaInicio = (doc as any).getTextWidth(cicloInicio);
        doc.text('   -   TÉRMINO:', margin + 15 + anchoInicio + anchoFechaInicio + 2, topBoxY + 45, { align: 'left' });
        
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        const anchoTermino = (doc as any).getTextWidth('   -   TÉRMINO:');
        doc.text(cicloFin, margin + 15 + anchoInicio + anchoFechaInicio + anchoTermino + 3, topBoxY + 45, { align: 'left' });

        autoTable(doc, {
          startY: topBoxY,
          margin: { left: rightX - 2, right: margin },
          tableWidth: pageWidth - (rightX - 2) - margin,
          theme: 'grid',
          head: [['N°', 'PROFESOR', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T. HORAS', 'DEPARTAMENTO']],
          body: asignaciones.map((item: any) => [
            String(item.numero),
            item.docente,
            item.curso,
            item.teoria > 0 ? String(item.teoria) : '0',
            item.practica > 0 ? String(item.practica) : '0',
            item.displayL > 0 ? String(item.displayL) : '0',
            item.displayG,
            String(item.total),
            item.departamento,
          ]),
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 6.5,
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            cellPadding: 0.8,
          },
          bodyStyles: {
            fontSize: 6.5,
            cellPadding: 0.5,
            valign: 'middle',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
          },
          columnStyles: {
            0: { cellWidth: 5, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 'auto' }, // Asignatura ocupará el resto
            3: { cellWidth: 5, halign: 'center' },
            4: { cellWidth: 5, halign: 'center' },
            5: { cellWidth: 5, halign: 'center' },
            6: { cellWidth: 5, halign: 'center' },
            7: { cellWidth: 8, halign: 'center' },
            8: { cellWidth: 35 }, // Departamento al final
          },
          didParseCell: (data: any) => {
            if (data.section === 'body') {
              const rowIndex = data.row.index;
              const fill = asignaciones[rowIndex]?.color || [245, 245, 245];
              data.cell.styles.fillColor = fill;
              data.cell.styles.textColor = [0, 0, 0];
              data.cell.styles.fontSize = 6.5;
            }
          },
        });

        // --- DIBUJAR CUADRÍCULA SOLO SI HAY HORARIOS ---
        if (horarios.length > 0) {
          const dayLabels = [
            { id: 1, label: 'LUNES' },
            { id: 2, label: 'MARTES' },
            { id: 3, label: 'MIERCOLES' },
            { id: 4, label: 'JUEVES' },
            { id: 5, label: 'VIERNES' },
            { id: 6, label: 'SABADO' },
          ];

          const timeLabels = ['7-8', '8-9', '9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8'];
          const slotHeight = 6.2; // Altura optimizada
          const hourColWidth = 10;
          const gridWidth = pageWidth - margin * 2;
          const dayColWidth = (gridWidth - hourColWidth * 2) / 6;
          const gridY = bottomGridY;
          const headerHeightGrid = 6;
          const almuerzoRowIndex = timeLabels.indexOf('1-2');
          const almuerzoFill: [number, number, number] = [255, 255, 0];

          const gridStartX = margin;
          const totalGridHeight = headerHeightGrid + timeLabels.length * slotHeight;

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(gridStartX, gridY, gridWidth, totalGridHeight);

          try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
          doc.text('HORA', gridStartX + hourColWidth / 2, gridY + 4, { align: 'center' });
          dayLabels.forEach((day, index) => {
            const x = gridStartX + hourColWidth + index * dayColWidth;
            doc.line(x, gridY, x, gridY + totalGridHeight);
            try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
            doc.text(day.label, x + dayColWidth / 2, gridY + 4, { align: 'center' });
          });
          doc.line(gridStartX + hourColWidth + 6 * dayColWidth, gridY, gridStartX + hourColWidth + 6 * dayColWidth, gridY + totalGridHeight);
          doc.text('HORA', gridStartX + hourColWidth + 6 * dayColWidth + hourColWidth / 2, gridY + 4, { align: 'center' });

          const hourYs = timeLabels.map((_, index) => gridY + headerHeightGrid + index * slotHeight);
          hourYs.forEach((yPos) => {
            doc.line(gridStartX, yPos, gridStartX + gridWidth, yPos);
          });

          const occupied = new Set<string>();
          const blockBySlot = new Map<string, any>();

          horariosValidos.forEach((h: any) => {
            const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
            const cursoNombre = h.curso?.nombre || 'N/A';
            const key = `${docenteNombre}__${cursoNombre}`;
            const asignacion = asignacionLookup.get(key);
            if (!asignacion) return;

            const startHour = parseInt(h.horaInicio?.substring(0, 2) || '0', 10);
            const endHour = parseInt(h.horaFin?.substring(0, 2) || '0', 10);
            const startIndex = startHour - 7;
            const span = Math.max(endHour - startHour, 1);
            if (startIndex < 0 || startIndex >= timeLabels.length) return;

            const blockKey = `${h.diaSemana}_${startIndex}`;
            blockBySlot.set(blockKey, {
              numero: asignacion.numero,
              color: asignacion.color,
              tipo: formatType(h.tipoClase),
              grupo: h.grupo?.numeroGrupo || null,
              aula: h.aula?.nombre || 'SIN AULA',
              span: Math.min(span, timeLabels.length - startIndex),
            });
          });

          timeLabels.forEach((label, rowIndex) => {
            const yPos = gridY + headerHeightGrid + rowIndex * slotHeight;
            const centerY = yPos + slotHeight / 2 + 0.5;

            if (rowIndex === almuerzoRowIndex) {
              doc.setFillColor(almuerzoFill[0], almuerzoFill[1], almuerzoFill[2]);
              doc.rect(gridStartX, yPos, gridWidth, slotHeight, 'F');
            }

            try { doc.setFont('Trebuchet'); } catch (e) {}
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text(label, gridStartX + hourColWidth / 2, centerY, { align: 'center' });
            doc.text(label, gridStartX + hourColWidth + 6 * dayColWidth + hourColWidth / 2, centerY, { align: 'center' });

            dayLabels.forEach((day, dayIndex) => {
              const x = gridStartX + hourColWidth + dayIndex * dayColWidth;
              const slotKey = `${day.id}_${rowIndex}`;
              const block = blockBySlot.get(slotKey);

              if (occupied.has(slotKey)) {
                return;
              }

              if (block) {
                const blockHeight = block.span * slotHeight;
                const fillColor = block.color;
                doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                doc.rect(x, yPos, dayColWidth, blockHeight, 'FD');
                try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
                doc.setFontSize(6.5);
                doc.setTextColor(0, 0, 0);
                const grupoText = block.grupo ? ` G${block.grupo}` : '';
                const detailText = `${block.tipo}${grupoText} (${block.aula})`;
                
                if (block.span === 1) {
                  doc.text(`${block.numero} ${detailText}`, x + dayColWidth / 2, yPos + (blockHeight / 2) + 1, { align: 'center' });
                } else {
                  const blockLines = [String(block.numero), detailText];
                  const totalTextHeight = blockLines.length * 3;
                  const startTextY = yPos + (blockHeight / 2) - (totalTextHeight / 2) + 2.5;
                  doc.text(blockLines, x + dayColWidth / 2, startTextY, { align: 'center' });
                }

                for (let i = 0; i < block.span; i++) {
                  occupied.add(`${day.id}_${rowIndex + i}`);
                }
              } else if (!occupied.has(slotKey)) {
                doc.rect(x, yPos, dayColWidth, slotHeight);
              }
            });
          });
        } else {
          // Ya manejamos el caso sin horarios arriba, pero por seguridad:
          doc.setFontSize(12);
          doc.text('No hay datos disponibles', pageWidth / 2, bottomGridY + 20, { align: 'center' });
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          try { doc.setFont('Trebuchet'); } catch (e) {}
          doc.setFontSize(8.5);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${i} de ${pageCount} - Generado automáticamente por el Sistema de Horarios UNT`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }

        const blob1 = doc.output('blob');
        const url1 = URL.createObjectURL(blob1);
        setPdfPreview({ url: url1, blob: blob1, fileName: `${reporteId}_${cicloNombre}.pdf` });
        setLoading(false);
        return;
      } else if (reporteId === 'horario_docente_no_lectiva') {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 5;
        
        // Filtrar solo horarios no lectivos
        const horariosNoLectivos = horarios.filter((h: any) => h.tipoClase === 'no_lectiva');
        
        // --- CASO SIN DATOS ELEGANTE ---
        if (horariosNoLectivos.length === 0) {
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('REPORTE DE CARGA NO LECTIVA', pageWidth / 2, headerHeight + 30, { align: 'center' });
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text('No se encontraron cargas no lectivas programadas para los filtros seleccionados.', pageWidth / 2, headerHeight + 45, { align: 'center' });
          doc.text('Por favor, verifique el Periodo Académico, Carrera o Docente e intente nuevamente.', pageWidth / 2, headerHeight + 52, { align: 'center' });
          
          doc.setDrawColor(226, 232, 240);
          doc.line(margin * 4, headerHeight + 65, pageWidth - margin * 4, headerHeight + 65);
          
          const blob2 = doc.output('blob');
          const url2 = URL.createObjectURL(blob2);
          setPdfPreview({ url: url2, blob: blob2, fileName: `${reporteId}_${cicloNombre}.pdf` });
          setLoading(false);
          return;
        }

        // --- CASO CON DATOS ---
        const headerH = 30;
        let currentY = headerH + 10;
        
        // --- OBTENER DATOS DEL CICLO ---
        const cicloActual = ciclos.find((c: any) => String(c.id) === String(filtros.cicloId));
        const formatDateWithoutTZ = (dateStr: any) => {
          if (!dateStr) return 'NO REGISTRADO';
          const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        const cicloInicio = formatDateWithoutTZ(cicloActual?.fechaInicio);
        const cicloFin = formatDateWithoutTZ(cicloActual?.fechaFin);
        const escuela = (carreraSeleccionada?.nombre || 'INGENIERIA DE SISTEMAS').toUpperCase();

        // --- TÍTULO PRINCIPAL ---
        doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE CARGA NO LECTIVA', pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;

        // --- DATOS DEL REPORTE (INICIO, FIN, CARRERA) ---
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const infoTexto = `Periodo Académico: ${cicloNombre}  |  Inicio: ${cicloInicio}  |  Término: ${cicloFin}  |  Carrera: ${escuela}`;
        doc.text(infoTexto, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // --- AGRUPAR HORARIOS POR DOCENTE Y ACTIVIDAD ---
        // Lista de todas las actividades posibles
        const TODAS_ACTIVIDADES = [
          'PREPARACIÓN Y EVALUACIÓN',
          'TUTORÍA Y ORIENTACIÓN',
          'INVESTIGACIÓN',
          'CAPACITACIÓN',
          'GOBIERNO UNIVERSITARIO',
          'ADMINISTRACIÓN ACADÉMICA',
          'ASESORÍA A ESTUDIANTES',
          'RESPONSABILIDAD SOCIAL',
          'COMITÉS TÉCNICOS'
        ];

        const docentesMap = new Map<string, any>();
        horariosNoLectivos.forEach((h: any) => {
          const docenteId = String(h.docente?.id || 'sin-docente');
          const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
          // Obtener actividad y asegurarse de que sea un string
          let actividad: string;
          if (typeof h.actividadNoLectiva === 'string') {
            actividad = h.actividadNoLectiva;
          } else if (h.actividadNoLectiva && typeof h.actividadNoLectiva === 'object') {
            // Si es un objeto, buscar una propiedad que tenga el nombre
            actividad = (h.actividadNoLectiva as any).nombre || (h.actividadNoLectiva as any).name || JSON.stringify(h.actividadNoLectiva);
          } else {
            actividad = 'ACTIVIDAD NO DEFINIDA';
          }
          const horas = Math.max(parseInt(h.horaFin?.substring(0, 2) || '0', 10) - parseInt(h.horaInicio?.substring(0, 2) || '0', 10), 1);

          if (!docentesMap.has(docenteId)) {
            docentesMap.set(docenteId, {
              nombre: docenteNombre,
              actividades: new Map<string, any>(),
              totalHoras: 0
            });
          }
          
          const docenteData = docentesMap.get(docenteId);
          const keyActividad = actividad;
          
          if (!docenteData.actividades.has(keyActividad)) {
            docenteData.actividades.set(keyActividad, {
              nombre: actividad,
              dias: new Set<string>(),
              horarios: [],
              aulas: new Set<string>(),
              totalHoras: 0
            });
          }
          
          const actividadData = docenteData.actividades.get(keyActividad);
          actividadData.dias.add(DIAS_MAP[h.diaSemana] || 'DÍA');
          actividadData.horarios.push(`${h.horaInicio.substring(0,5)}-${h.horaFin.substring(0,5)}`);
          actividadData.aulas.add(h.aula?.nombre || 'SIN AULA');
          actividadData.totalHoras += horas;
          docenteData.totalHoras += horas;
        });

        // --- ORDENAR DOCENTES ---
        const docentesOrdenados = Array.from(docentesMap.values()).sort((a: any, b: any) => 
          a.nombre.localeCompare(b.nombre)
        );

        // --- GENERAR TABLA PARA CADA DOCENTE ---
        let numDocente = 1;
        
        for (const docente of docentesOrdenados) {
          // --- TÍTULO DEL DOCENTE ---
          doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${numDocente}. DOCENTE: ${docente.nombre.toUpperCase()}`, margin, currentY);
          currentY += 8;

          // --- PREPARAR DATOS DE LA TABLA (todas las actividades, primero las que tienen datos) ---
          const actividadesExistentes = new Set(docente.actividades.keys());
          
          const actividadesFinales: any[] = [];
          
          // 1. Agregar actividades existentes (ordenadas)
          const existentesOrdenadas = Array.from(docente.actividades.values()).sort((a: any, b: any) => 
            a.nombre.localeCompare(b.nombre)
          );
          actividadesFinales.push(...existentesOrdenadas);
          
          // 2. Agregar actividades vacías (que no están en el map)
          for (const actNombre of TODAS_ACTIVIDADES) {
            if (!actividadesExistentes.has(actNombre)) {
              actividadesFinales.push({
                nombre: actNombre,
                dias: new Set(),
                horarios: [],
                aulas: new Set(),
                totalHoras: 0
              });
            }
          }
          
          const tableData = actividadesFinales.map((actividad: any, index: number) => [
            index + 1,
            actividad.nombre,
            Array.from(actividad.dias).join(', '),
            Array.from(actividad.horarios).join(', '),
            Array.from(actividad.aulas).join(', '),
            actividad.totalHoras
          ]);

          // Agregar fila TOTAL HORAS
          tableData.push([
            '',
            'TOTAL HORAS',
            '',
            '',
            '',
            docente.totalHoras
          ]);

          // --- DIBUJAR TABLA ---
          (autoTable as any)(doc, {
            startY: currentY,
            margin: { left: margin, right: margin, top: margin, bottom: 10 },
            head: [['N°', 'CARGA NO LECTIVA', 'DÍA(S)', 'HORARIO', 'AULA', 'HORAS']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: AZUL_UNT,
              textColor: 255,
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 7,
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 'auto', halign: 'left' },
              2: { cellWidth: 35, halign: 'center' },
              3: { cellWidth: 30, halign: 'center' },
              4: { cellWidth: 25, halign: 'center' },
              5: { cellWidth: 15, halign: 'center' }
            },
            didParseCell: (data: any) => {
              // Estilo para la fila TOTAL HORAS
              if (data.section === 'body' && data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [230, 230, 230];
              }
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 12;
          numDocente++;

          // --- NUEVA PÁGINA SI ES NECESARIO ---
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = 15;
          }
        }

        // --- PIE DE PÁGINA ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          try { doc.setFont('Trebuchet'); } catch (e) {}
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${i} de ${pageCount} - Generado por el Sistema de Horarios UNT`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }

        const blob3 = doc.output('blob');
        const url3 = URL.createObjectURL(blob3);
        setPdfPreview({ url: url3, blob: blob3, fileName: `${reporteId}_${cicloNombre}.pdf` });
        setLoading(false);
        return;
      }

      // Estructura según el reporte
      let tableData = [];
      let tableHeaders = [];

      if (reporteId === 'horario_aula') {
        tableHeaders = [['AULA', 'TIPO', 'CURSO', 'DOCENTE', 'DÍA', 'HORARIO']];
        tableData = horarios.map((h: any) => [
          h.aula?.nombre || 'N/A',
          h.aula?.tipo?.toUpperCase() || 'N/A',
          h.curso?.nombre || 'N/A',
          h.docente?.nombreCompleto || 'N/A',
          DIAS_MAP[h.diaSemana] || h.dia || 'N/A',
          `${h.horaInicio?.substring(0, 5) || 'N/A'} - ${h.horaFin?.substring(0, 5) || 'N/A'}`
        ]);
        if (tableData.length === 0) {
          tableData = [['-', 'No se registró actividad en los ambientes para el periodo y filtros aplicados.', '-', '-', '-', '-']];
        }
      } else if (reporteId === 'horario_carrera') {
        tableHeaders = [['CARRERA', 'CICLO CURSO', 'CURSO', 'DOCENTE', 'DÍA', 'HORARIO', 'AULA']];
        tableData = horarios.map((h: any) => [
          h.curso?.carrera?.nombre || 'N/A',
          h.curso?.cicloAcademico || 'N/A',
          h.curso?.nombre || 'N/A',
          h.docente?.nombreCompleto || 'N/A',
          DIAS_MAP[h.diaSemana] || h.dia || 'N/A',
          `${h.horaInicio?.substring(0, 5) || 'N/A'} - ${h.horaFin?.substring(0, 5) || 'N/A'}`,
          h.aula?.nombre || 'N/A'
        ]);
        if (tableData.length === 0) {
          tableData = [['-', '-', 'No hay programación de cursos registrada para la carrera y ciclo seleccionados.', '-', '-', '-', '-']];
        }
      } else if (reporteId === 'disponibilidad_docente') {
        tableHeaders = [['DOCENTE', 'CATEGORÍA', 'CARRERA', 'HORAS ASIGNADAS', 'ESTADO']];
        
        tableData = docentesFiltrados.map((doc: any) => {
          const horariosDocente = horarios.filter((h: any) => h.docenteId === doc.id);
          const horasAsignadas = horariosDocente.reduce((acc: number, curr: any) => {
            const hInicio = parseInt(curr.horaInicio.split(':')[0]);
            const hFin = parseInt(curr.horaFin.split(':')[0]);
            return acc + (hFin - hInicio);
          }, 0);

          let estado = 'DISPONIBLE';
          if (horasAsignadas > 0) {
            estado = horasAsignadas >= 18 ? 'CARGA COMPLETA' : 'CARGA PARCIAL';
          }

          return [
            doc.nombreCompleto || 'N/A',
            doc.categoria || 'N/A',
            doc.carreras?.[0]?.carrera?.nombre || 'SISTEMAS',
            `${horasAsignadas} horas`,
            estado
          ];
        });

        if (tableData.length === 0) {
          tableData = [['-', 'No se encontraron docentes registrados para los filtros aplicados.', '-', '-', '-']];
        }
      } else if (reporteId === 'alertas_cruces') {
        tableHeaders = [['TIPO ALERTA', 'DESCRIPCIÓN', 'DÍA', 'HORARIO', 'AFECTADO']];
        tableData = horarios.filter((h: any) => h.tieneConflicto).map((h: any) => [
          'CRUCE',
          `Conflicto en curso ${h.curso?.nombre}`,
          DIAS_MAP[h.diaSemana],
          `${h.horaInicio.substring(0,5)}-${h.horaFin.substring(0,5)}`,
          h.docente?.nombreCompleto
        ]);
        if (tableData.length === 0) {
          tableData = [['SIN ALERTAS', 'Excelente: No se detectaron conflictos ni cruces de horarios en la programación actual.', '-', '-', '-']];
        }
      } else if (reporteId === 'carga_academica') {
        tableHeaders = [['DOCENTE', 'CURSO', 'TIPO', 'HORAS ASIGNADAS']];
        tableData = horarios.map((h: any) => [
          h.docente?.nombreCompleto || 'N/A',
          h.curso?.nombre || 'N/A',
          h.tipoClase?.toUpperCase() || 'N/A',
          `${parseInt(h.horaFin) - parseInt(h.horaInicio)}h`
        ]);
        if (tableData.length === 0) {
          tableData = [['-', 'No hay datos de carga académica procesados para el ciclo seleccionado.', '-', '-']];
        }
      } else {
        tableHeaders = [['FECHA/HORA', 'ACTIVIDAD', 'RESPONSABLE', 'AMBIENTE']];
        tableData = horarios.map((h: any) => [
          `${DIAS_MAP[h.diaSemana]} ${h.horaInicio.substring(0,5)}`,
          h.curso?.nombre || 'N/A',
          h.docente?.nombreCompleto || 'N/A',
          h.aula?.nombre || 'N/A'
        ]);
        if (tableData.length === 0) {
          tableData = [['-', 'No se encontraron registros que coincidan con los filtros de búsqueda.', '-', '-']];
        }
      }

      autoTable(doc, {
        startY: 85,
        head: tableHeaders,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: AZUL_UNT, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 248, 250] as [number, number, number] }
      });

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount} - Generado automáticamente por el Sistema de Horarios UNT`, 105, 285, { align: 'center' });
      }

      const blob4 = doc.output('blob');
      const url4 = URL.createObjectURL(blob4);
      setPdfPreview({ url: url4, blob: blob4, fileName: `${reporteId}_${cicloNombre}.pdf` });
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = async (reporteId: string) => {
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte');
      const AZUL_UNT_HEX = '003366';
      const BLANCO_HEX = 'FFFFFF';

      const cicloNombre = ciclos.find(c => c.id === filtros.cicloId)?.nombre || '2026-I';
      const carreraSeleccionada = carreras.find(c => String(c.id) === String(filtros.carreraId)) || getCarreraIngenieriaSistemas(carreras);
      const reporte = [...REPORTES_OPERACIONALES, ...REPORTES_GESTION].find(r => r.id === reporteId);

      // --- CABECERA INSTITUCIONAL ---
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'UNIVERSIDAD NACIONAL DE TRUJILLO';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: BLANCO_HEX } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.mergeCells('A2:G2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = 'Sistema de Gestión de Horarios Académicos';
      subtitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: BLANCO_HEX } };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.addRow([]); // Espacio

      // --- INFO REPORTE ---
      worksheet.addRow([`Reporte: ${reporte?.nombre.toUpperCase()}`]).font = { bold: true, size: 14 };
      worksheet.addRow([`Ciclo Académico: ${cicloNombre}`]);
      if (filtros.cicloEstudio) worksheet.addRow([`Ciclo de Estudios: ${filtros.cicloEstudio}°`]);
      worksheet.addRow([`Carrera: ${carreraSeleccionada?.nombre || 'TODAS LAS CARRERAS'}`]);
      worksheet.addRow([`Fecha de Emisión: ${new Date().toLocaleString()}`]);
      worksheet.addRow([`Emitido por: Sistema de Horarios UNT`]);
      worksheet.addRow([]); // Espacio

      // --- OBTENER DATOS ---
      const params: any = { cicloId: filtros.cicloId };
      if (filtros.docente?.id) params.docenteId = filtros.docente.id;
      if (filtros.ambienteId) params.aulaId = filtros.ambienteId;
      if (filtros.carreraId) params.carreraId = filtros.carreraId;

      const response = await api.get('/horarios', { params });
      const horariosBase = response.data || [];
      const esReporteOperacional = REPORTES_OPERACIONALES.some(r => r.id === reporteId);
      const horarios = (esReporteOperacional && filtros.cicloEstudio)
          ? horariosBase.filter((h: any) => String(h.curso?.cicloAcademico || '').trim() === String(filtros.cicloEstudio))
          : horariosBase;

      // --- ESTRUCTURA DE TABLA ---
      let headers: string[] = [];
      let rows: any[] = [];

      if (reporteId === 'horario_docente_lectiva') {
        const palette = [
          [190, 240, 190],
          [240, 200, 200],
          [200, 220, 240],
          [240, 230, 180],
          [220, 200, 240],
          [180, 240, 230],
        ];

        const DIAS_MAP: Record<number, string> = {
          1: 'LUNES', 2: 'MARTES', 3: 'MIÉRCOLES', 4: 'JUEVES',
          5: 'VIERNES', 6: 'SÁBADO', 7: 'DOMINGO'
        };

        const timeLabels = [
          '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
          '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00',
        ];

        const dayLabels = [
          { id: 1, label: 'LUNES' },
          { id: 2, label: 'MARTES' },
          { id: 3, label: 'MIÉRCOLES' },
          { id: 4, label: 'JUEVES' },
          { id: 5, label: 'VIERNES' },
          { id: 6, label: 'SÁBADO' }
        ];

        const formatType = (tipo: string) => {
          switch (tipo) {
            case 'teoria': return 'T';
            case 'practica': return 'P';
            case 'laboratorio': return 'L';
            default: return tipo;
          }
        };

        // Agrupar horarios por CICLO (del curso)
        const horariosPorCiclo = new Map<string, any[]>();
        const horariosValidos = horarios.filter((h: any) => h.curso && h.curso.nombre && h.curso.cicloAcademico);

        horariosValidos.forEach((h: any) => {
          const ciclo = String(h.curso.cicloAcademico);
          if (!horariosPorCiclo.has(ciclo)) {
            horariosPorCiclo.set(ciclo, []);
          }
          horariosPorCiclo.get(ciclo)!.push(h);
        });

        // Ordenar ciclos del 1° al 10°
        const ciclosOrdenados = Array.from(horariosPorCiclo.keys()).sort((a, b) => Number(a) - Number(b));

        let filaActual = worksheet.rowCount + 1;

        for (const ciclo of ciclosOrdenados) {
          const horariosCiclo = horariosPorCiclo.get(ciclo)!;

          // TÍTULO DEL CICLO
          const filaTituloCiclo = worksheet.getRow(filaActual);
          const celdaTituloCiclo = filaTituloCiclo.getCell(1);
          celdaTituloCiclo.value = `${ciclo}° CICLO`;
          celdaTituloCiclo.font = { bold: true, size: 12, color: { argb: AZUL_UNT_HEX } };
          worksheet.mergeCells(filaActual, 1, filaActual, 8);
          filaActual++;

          // Ahora, para este ciclo, creamos la lista de asignaciones y la tabla grid
          const asignacionesMap = new Map<string, any>();
          horariosCiclo.forEach((h: any) => {
            const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
            const cursoNombre = h.curso.nombre;
            const departamento = h.curso?.departamento || 'General';
            const key = `${docenteNombre}__${cursoNombre}`;
            const horas = Math.max(parseInt(h.horaFin?.substring(0, 2)) - parseInt(h.horaInicio?.substring(0, 2)), 1);
            if (!asignacionesMap.has(key)) {
              asignacionesMap.set(key, { docente: docenteNombre, curso: cursoNombre, t: 0, p: 0, l: 0, g: new Set(), total: 0, dep: departamento });
            }
            const item = asignacionesMap.get(key);
            item.total += horas;
            if (h.tipoClase === 'teoria') item.t += horas;
            if (h.tipoClase === 'practica') item.p += horas;
            if (h.tipoClase === 'laboratorio') { item.l += horas; if (h.grupo?.id) item.g.add(h.grupo.id); }
          });

          const asignaciones = Array.from(asignacionesMap.values())
            .sort((a: any, b: any) => {
              const depCompare = a.dep.localeCompare(b.dep);
              if (depCompare !== 0) return depCompare;
              const docCompare = a.docente.localeCompare(b.docente);
              if (docCompare !== 0) return docCompare;
              return a.curso.localeCompare(b.curso);
            })
            .map((item: any, index: number) => {
              const numGrupos = item.g.size;
              return {
                key: `${item.docente}__${item.curso}`,
                ...item,
                numero: index + 1,
                color: palette[index % palette.length],
                displayL: numGrupos > 0 ? (item.l / numGrupos) : item.l,
                displayG: numGrupos > 0 ? String(numGrupos) : '-',
              };
            });

          const asignacionLookup = new Map<string, { numero: number; color: [number, number, number] }>();
          asignaciones.forEach((item: any) => {
            asignacionLookup.set(item.key, { numero: item.numero, color: item.color });
          });

          // ---------------------------
          // SECCIÓN 1: TABLA DE ASIGNACIONES
          // ---------------------------
          // Ajustar tamaños de columnas primero (para la sección 1)
          worksheet.getColumn(1).width = 6; // N°
          worksheet.getColumn(2).width = 30; // PROFESOR
          worksheet.getColumn(3).width = 30; // ASIGNATURA
          worksheet.getColumn(4).width = 6; // T
          worksheet.getColumn(5).width = 6; // P
          worksheet.getColumn(6).width = 6; // L
          worksheet.getColumn(7).width = 6; // G
          worksheet.getColumn(8).width = 10; // T. HORAS
          worksheet.getColumn(9).width = 20; // DEPARTAMENTO

          // Header de la tabla
          const headerAsignaciones = worksheet.addRow(['N°', 'PROFESOR', 'ASIGNATURA', 'T', 'P', 'L', 'G', 'T. HORAS', 'DEPARTAMENTO']);
          headerAsignaciones.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });

          // Filas de datos de asignaciones
          asignaciones.forEach((item: any) => {
            const row = worksheet.addRow([
              String(item.numero),
              item.docente,
              item.curso,
              item.t > 0 ? String(item.t) : '0',
              item.p > 0 ? String(item.p) : '0',
              item.displayL > 0 ? String(item.displayL) : '0',
              item.displayG,
              String(item.total),
              item.dep,
            ]);
            row.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              if (colNumber !== 2 && colNumber !== 3) { // centrar todas excepto profesor y asignatura
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              } else {
                cell.alignment = { vertical: 'middle' };
              }
            });
          });

          // ---------------------------
          // SECCIÓN 2: GRID DE HORARIOS
          // ---------------------------
          // Añadir 2 filas vacías entre la sección 1 y el grid
          worksheet.addRow([]);
          worksheet.addRow([]);

          // Ajustar tamaños de columnas para el grid
          worksheet.getColumn(1).width = 14; // HORA
          worksheet.getColumn(2).width = 20; // LUNES
          worksheet.getColumn(3).width = 20; // MARTES
          worksheet.getColumn(4).width = 20; // MIÉRCOLES
          worksheet.getColumn(5).width = 20; // JUEVES
          worksheet.getColumn(6).width = 20; // VIERNES
          worksheet.getColumn(7).width = 20; // SÁBADO
          worksheet.getColumn(8).width = 14; // HORA

          // Header del grid
          const gridHeaders = ['HORA', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'HORA'];
          const rowGridHeaders = worksheet.addRow(gridHeaders);
          rowGridHeaders.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: '000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E0E0' } };
          });

          // Preparar bloques para el grid
          const blockBySlot = new Map<string, any>();
          horariosCiclo.forEach((h: any) => {
            const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
            const cursoNombre = h.curso?.nombre || 'N/A';
            const key = `${docenteNombre}__${cursoNombre}`;
            const asignacion = asignacionLookup.get(key);
            if (!asignacion) return;

            // Obtener horas de inicio y fin (formato "HH:MM")
            const startHour = parseInt(h.horaInicio?.substring(0, 2) || '0', 10);
            const endHour = parseInt(h.horaFin?.substring(0, 2) || '0', 10);
            const startIndex = startHour - 7;
            
            // Calcular el span: el número de filas que ocupará (cada fila es 1 hora)
            let span = endHour - startHour;
            // Asegurar que el span sea al menos 1 y no salga del array
            span = Math.max(span, 1);
            span = Math.min(span, timeLabels.length - startIndex);

            if (startIndex < 0 || startIndex >= timeLabels.length) return;

            const blockKey = `${h.diaSemana}_${startIndex}`;
            blockBySlot.set(blockKey, {
              numero: asignacion.numero,
              color: asignacion.color,
              tipo: formatType(h.tipoClase),
              grupo: h.grupo?.numeroGrupo || null,
              aula: h.aula?.nombre || 'SIN AULA',
              span: span,
              startIndex: startIndex,
            });
          });

          // Paso 1: Crear todo el grid primero y guardar referencias a las filas
          const gridRows: any[] = []; // Para acceder a las filas después
          const gridStartRow = worksheet.rowCount + 1; // Fila donde empieza el grid
          const occupied = new Set<string>();
          for (let rowIndex = 0; rowIndex < timeLabels.length; rowIndex++) {
            const timeLabel = timeLabels[rowIndex];
            const rowData: any[] = [timeLabel, '', '', '', '', '', '', timeLabel];
            const rowExcel = worksheet.addRow(rowData);
            gridRows.push(rowExcel); // Guardamos la fila

            rowExcel.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              if (colNumber === 1 || colNumber === 8) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            });

            // Si es la fila del almuerzo
            if (rowIndex === 6) {
              const rowNumber = gridStartRow + rowIndex;
              worksheet.mergeCells(rowNumber, 2, rowNumber, 7); // Fusionar LUNES a SÁBADO
              const celdaAlmuerzo = rowExcel.getCell(2);
              celdaAlmuerzo.value = 'ALMUERZO';
              celdaAlmuerzo.font = { bold: true };
              celdaAlmuerzo.alignment = { horizontal: 'center', vertical: 'middle' };
              // Poner color a todas las celdas fusionadas
              for (let col = 2; col <= 7; col++) {
                rowExcel.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
              }
            }

          }

          // Paso 2: Ahora aplicamos los bloques de horarios al grid
          for (let rowIndex = 0; rowIndex < timeLabels.length; rowIndex++) {
            for (let dayIndex = 0; dayIndex < dayLabels.length; dayIndex++) {
              const day = dayLabels[dayIndex];
              const slotKey = `${day.id}_${rowIndex}`;
              const block = blockBySlot.get(slotKey);

              if (occupied.has(slotKey) || !block) continue;

              const colIndex = dayIndex + 2; // Columna correspondiente al día
              const hexR = block.color[0].toString(16).padStart(2, '0');
              const hexG = block.color[1].toString(16).padStart(2, '0');
              const hexB = block.color[2].toString(16).padStart(2, '0');
              const argbColor = `FF${hexR}${hexG}${hexB}`;

              // Aplicar color a todas las celdas del bloque
              for (let i = 0; i < block.span; i++) {
                const targetRow = gridRows[rowIndex + i];
                const cell = targetRow.getCell(colIndex);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.font = { bold: true };
                // Solo la primera celda del bloque tiene texto
                if (i === 0) {
                  const grupoText = block.grupo ? ` G${block.grupo}` : '';
                  const detailText = `${block.tipo}${grupoText} (${block.aula})`;
                  cell.value = `${block.numero}\n${detailText}`;
                }
              }

              // Fusionar celdas verticalmente si hay más de 1 hora
              if (block.span > 1) {
                const startRow = gridStartRow + rowIndex;
                const endRow = gridStartRow + rowIndex + block.span - 1;
                worksheet.mergeCells(startRow, colIndex, endRow, colIndex);
              }

              // Marcar como ocupadas todas las filas del bloque
              for (let i = 0; i < block.span; i++) {
                occupied.add(`${day.id}_${rowIndex + i}`);
              }
            }
          }

          // Añadir espacio entre ciclos
          worksheet.addRow([]);
        }
      } else if (reporteId === 'horario_docente_no_lectiva') {
        // --- LISTA DE TODAS LAS ACTIVIDADES ---
        const TODAS_ACTIVIDADES_EXCEL = [
          'PREPARACIÓN Y EVALUACIÓN',
          'TUTORÍA Y ORIENTACIÓN',
          'INVESTIGACIÓN',
          'CAPACITACIÓN',
          'GOBIERNO UNIVERSITARIO',
          'ADMINISTRACIÓN ACADÉMICA',
          'ASESORÍA A ESTUDIANTES',
          'RESPONSABILIDAD SOCIAL',
          'COMITÉS TÉCNICOS'
        ];

        // --- FILTRAR HORARIOS NO LECTIVOS ---
        const horariosNoLectivos = horarios.filter((h: any) => h.tipoClase === 'no_lectiva');

        // --- AGRUPAR POR DOCENTE Y ACTIVIDAD ---
        const cnlMap = new Map<string, any>();
        horariosNoLectivos.forEach((h: any) => {
          const docenteNombre = h.docente?.nombreCompleto || 'DOCENTE SIN NOMBRE';
          let actividad: string;
          if (typeof h.actividadNoLectiva === 'string') {
            actividad = h.actividadNoLectiva;
          } else if (h.actividadNoLectiva && typeof h.actividadNoLectiva === 'object') {
            actividad = (h.actividadNoLectiva as any).nombre || (h.actividadNoLectiva as any).name || JSON.stringify(h.actividadNoLectiva);
          } else {
            actividad = 'ACTIVIDAD NO DEFINIDA';
          }
          const key = `${docenteNombre}__${actividad}`;
          const horas = Math.max(parseInt(h.horaFin?.substring(0, 2)) - parseInt(h.horaInicio?.substring(0, 2)), 1);

          if (!cnlMap.has(key)) {
            cnlMap.set(key, {
              docente: docenteNombre,
              actividad,
              dias: new Set<string>(),
              horarios: [],
              aulas: new Set<string>(),
              totalHoras: 0
            });
          }
          const item = cnlMap.get(key);
          item.dias.add(DIAS_MAP[h.diaSemana] || 'DÍA');
          item.horarios.push(`${h.horaInicio.substring(0,5)}-${h.horaFin.substring(0,5)}`);
          item.aulas.add(h.aula?.nombre || 'SIN AULA');
          item.totalHoras += horas;
        });

        // --- AGRUPAR POR DOCENTE ---
        const porDocente = new Map<string, any[]>();
        cnlMap.forEach((item: any) => {
          if (!porDocente.has(item.docente)) {
            porDocente.set(item.docente, []);
          }
          porDocente.get(item.docente)!.push(item);
        });

        // --- ORDENAR DOCENTES ALFABÉTICAMENTE ---
        const docentesOrdenadosExcel = Array.from(porDocente.keys()).sort((a: string, b: string) => a.localeCompare(b));

        // --- AGREGAR TABLAS POR CADA DOCENTE ---
        let filaActual = worksheet.rowCount + 1;
        const headersLocal = ['N°', 'CARGA NO LECTIVA', 'DÍA(S)', 'HORARIO', 'AULA', 'HORAS'];

        for (const docenteNombre of docentesOrdenadosExcel) {
          // TÍTULO DEL DOCENTE
          const filaTitulo = worksheet.getRow(filaActual);
          filaActual++;
          const celdaTitulo = filaTitulo.getCell(1);
          celdaTitulo.value = `${docenteNombre.toUpperCase()}`;
          celdaTitulo.font = { bold: true, color: { argb: AZUL_UNT_HEX }, size: 12 };
          worksheet.mergeCells(filaActual - 1, 1, filaActual - 1, 6); // Fusionar A:F

          // HEADER DE LA TABLA
          const headerRow = worksheet.addRow(headersLocal);
          headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, color: { argb: BLANCO_HEX } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
            // Centrar todas las columnas excepto CARGA NO LECTIVA (col 2)
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
          filaActual++;

          // DATOS DEL DOCENTE
          const itemsDocente = porDocente.get(docenteNombre)!;
          const actividadesExistentes = new Set(itemsDocente.map(i => i.actividad));
          const totalHorasDocente = itemsDocente.reduce((sum, i) => sum + i.totalHoras, 0);
          let num = 1;

          // 1. Actividades existentes
          const itemsOrdenados = itemsDocente.sort((a: any, b: any) => a.actividad.localeCompare(b.actividad));
          for (const item of itemsOrdenados) {
            const fila = worksheet.addRow([
              num++,
              item.actividad,
              Array.from(item.dias).join(', '),
              Array.from(item.horarios).join(', '),
              Array.from(item.aulas).join(', '),
              item.totalHoras
            ]);
            fila.eachCell((cell, colNumber) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              // Centrar columnas 1,3,4,5 y 6
              if (colNumber !== 2) {
                cell.alignment = { horizontal: 'center' };
              }
            });
            filaActual++;
          }

          // 2. Actividades vacías
          for (const actNombre of TODAS_ACTIVIDADES_EXCEL) {
            if (!actividadesExistentes.has(actNombre)) {
              const fila = worksheet.addRow([
                num++,
                actNombre,
                '',
                '',
                '',
                0
              ]);
              fila.eachCell((cell, colNumber) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                // Centrar columnas 1,3,4,5 y 6
                if (colNumber !== 2) {
                  cell.alignment = { horizontal: 'center' };
                }
              });
              filaActual++;
            }
          }

          // 3. Fila TOTAL HORAS
          const filaTotal = worksheet.addRow(['', 'TOTAL HORAS', '', '', '', totalHorasDocente]);
          filaTotal.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };
            if (colNumber !== 2) {
              cell.alignment = { horizontal: 'center' };
            }
          });
          filaActual++;
          filaActual++; // Espacio entre docentes
        }

        // --- AJUSTAR TAMAÑOS DE LAS COLUMNAS ---
        worksheet.getColumn(1).width = 5;     // N°
        worksheet.getColumn(2).width = 35;    // CARGA NO LECTIVA
        worksheet.getColumn(3).width = 14;    // DÍA(S)
        worksheet.getColumn(4).width = 17;    // HORARIO
        worksheet.getColumn(5).width = 14;    // AULA
        worksheet.getColumn(6).width = 12;    // HORAS
      } else if (reporteId === 'horario_aula') {
        headers = ['AULA', 'TIPO', 'CURSO', 'DOCENTE', 'DÍA', 'HORARIO'];
        rows = horarios.map((h: any) => [h.aula?.nombre, h.aula?.tipo?.toUpperCase(), h.curso?.nombre, h.docente?.nombreCompleto, DIAS_MAP[h.diaSemana], `${h.horaInicio.substring(0,5)} - ${h.horaFin.substring(0,5)}`]);
      } else if (reporteId === 'horario_carrera') {
        headers = ['CARRERA', 'CICLO CURSO', 'CURSO', 'DOCENTE', 'DÍA', 'HORARIO', 'AULA'];
        rows = horarios.map((h: any) => [h.curso?.carrera?.nombre, h.curso?.cicloAcademico, h.curso?.nombre, h.docente?.nombreCompleto, DIAS_MAP[h.diaSemana], `${h.horaInicio.substring(0,5)} - ${h.horaFin.substring(0,5)}`, h.aula?.nombre]);
      } else if (reporteId === 'disponibilidad_docente') {
        headers = ['DOCENTE', 'CATEGORÍA', 'CARRERA', 'HORAS ASIGNADAS', 'ESTADO'];
        rows = docentesFiltrados.map((doc: any) => {
          const hDoc = horarios.filter((h: any) => h.docenteId === doc.id);
          const total = hDoc.reduce((acc: number, curr: any) => acc + (parseInt(curr.horaFin) - parseInt(curr.horaInicio)), 0);
          return [doc.nombreCompleto, doc.categoria, doc.carreras?.[0]?.carrera?.nombre || 'SISTEMAS', `${total} horas`, total >= 18 ? 'CARGA COMPLETA' : total > 0 ? 'CARGA PARCIAL' : 'DISPONIBLE'];
        });
      } else if (reporteId === 'alertas_cruces') {
        headers = ['TIPO ALERTA', 'DESCRIPCIÓN', 'DÍA', 'HORARIO', 'AFECTADO'];
        rows = horarios.filter((h: any) => h.tieneConflicto).map((h: any) => ['CRUCE', `Conflicto en curso ${h.curso?.nombre}`, DIAS_MAP[h.diaSemana], `${h.horaInicio.substring(0,5)}-${h.horaFin.substring(0,5)}`, h.docente?.nombreCompleto]);
      } else if (reporteId === 'carga_academica') {
        headers = ['DOCENTE', 'CURSO', 'TIPO', 'HORAS ASIGNADAS'];
        rows = horarios.map((h: any) => [h.docente?.nombreCompleto, h.curso?.nombre, h.tipoClase?.toUpperCase(), `${parseInt(h.horaFin) - parseInt(h.horaInicio)}h`]);
      } else {
        headers = ['DÍA', 'HORA', 'CURSO', 'DOCENTE', 'AULA'];
        rows = horarios.map((h: any) => [DIAS_MAP[h.diaSemana], h.horaInicio.substring(0,5), h.curso?.nombre, h.docente?.nombreCompleto, h.aula?.nombre]);
      }

      // --- AGREGAR TABLA SOLO SI NO ES EL REPORTE DE CARGA NO LECTIVA ---
      if (reporteId !== 'horario_docente_no_lectiva') {
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: BLANCO_HEX } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
          cell.alignment = { horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        rows.forEach(row => {
          const r = worksheet.addRow(row);
          const esFilaTotal = row[2] === 'TOTAL HORAS';
          r.eachCell((cell) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (esFilaTotal) {
              cell.font = { bold: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6E6E6' } };
            }
          });
        });

        // Ajustar columnas
        worksheet.columns.forEach(column => {
          let maxLen = 0;
          if (column && column.eachCell) {
            column.eachCell({ includeEmpty: true }, (cell) => {
              const len = cell.value ? cell.value.toString().length : 0;
              if (len > maxLen) maxLen = len;
            });
          }
          column.width = maxLen < 10 ? 10 : maxLen + 2;
        });
      }

      // --- DESCARGAR ---
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${reporteId}_${cicloNombre}.xlsx`);

    } catch (err) {
      console.error('Error generando Excel:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateHorarioPersonalPDF = async () => {
    if (!usuario?.docenteId) return;
    setLoading(true);
    try {
      // Usar Landscape como el reporte operacional
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as any;
      
      const loadAndRegisterFont = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          const buffer = await res.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
          (doc as any).addFileToVFS(`${name}.ttf`, b64);
          (doc as any).addFont(`${name}.ttf`, name, 'normal');
        } catch (e) {
          console.warn(`Fallo al cargar fuente ${name} desde ${url}`, e);
        }
      };

      await loadAndRegisterFont('/fonts/trebuc.ttf', 'Trebuchet');
      await loadAndRegisterFont('/fonts/trebucbd.ttf', 'Trebuchet-Bold');

      const cicloActual = ciclos.find(c => c.id === filtros.cicloId) || ciclos.find(c => c.actual);
      const cicloNombre = cicloActual?.nombre || '2026-I';
      const AZUL_UNT: [number, number, number] = [0, 51, 102];
      const margin = 5;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const headerHeight = 30;

      // --- CABECERA AZUL INSTITUCIONAL ---
      doc.setFillColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD NACIONAL DE TRUJILLO', pageWidth / 2, headerHeight * 0.5, { align: 'center' });
      doc.setFontSize(11);
      doc.text('Sistema de Gestión de Horarios Académicos - Reporte Personal', pageWidth / 2, headerHeight * 0.75, { align: 'center' });

      // Obtener horarios del docente
      const response = await api.get('/horarios', { 
        params: { cicloId: filtros.cicloId, docenteId: usuario.docenteId } 
      });
      const horarios = response.data || [];

      if (horarios.length === 0) {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(14);
        doc.text('NO SE ENCONTRARON HORARIOS PROGRAMADOS', pageWidth / 2, headerHeight + 30, { align: 'center' });
        doc.save(`Horario_Personal_${usuario.nombre?.replace(/ /g, '_')}_${cicloNombre}.pdf`);
        setLoading(false);
        return;
      }

      // --- DATOS DE CABECERA (Igual al operacional) ---
      const leftWidth = pageWidth * (2.8 / 8) - margin; 
      const rightX = leftWidth + margin + 4; 
      const topBoxY = headerHeight + 4;
      const topBoxHeight = 62;
      const bottomGridY = topBoxY + topBoxHeight + 5;

      const cicloInicio = cicloActual?.fechaInicio ? new Date(cicloActual.fechaInicio).toLocaleDateString('es-PE') : 'NO REGISTRADO';
      const cicloFin = cicloActual?.fechaFin ? new Date(cicloActual.fechaFin).toLocaleDateString('es-PE') : 'NO REGISTRADO';
      const cicloPartes = String(cicloNombre).split('-');
      const anioAcademico = cicloPartes[0] || '2026';
      const semestre = cicloPartes[1] || 'I';

      doc.setDrawColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.setLineWidth(0.4);
      doc.rect(margin, topBoxY, pageWidth - margin * 2, topBoxHeight);
      doc.line(rightX - 2, topBoxY, rightX - 2, topBoxY + topBoxHeight);

      try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
      doc.setFontSize(9);
      doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.text('FACULTAD DE INGENIERIA', margin + leftWidth / 2, topBoxY + 6, { align: 'center' });
      doc.text('ESCUELA DE INGENIERIA DE SISTEMAS', margin + leftWidth / 2, topBoxY + 11, { align: 'center' });

      doc.setFont('Trebuchet');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('DOCENTE:', margin + 3, topBoxY + 22);
      doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.text(usuario.nombre?.toUpperCase() || 'N/A', margin + 24, topBoxY + 22);

      doc.setTextColor(0, 0, 0);
      doc.text('AÑO ACADÉMICO:', margin + 3, topBoxY + 32);
      doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.text(anioAcademico, margin + 34, topBoxY + 32);

      doc.setTextColor(0, 0, 0);
      doc.text('SEMESTRE:', margin + 55, topBoxY + 32);
      doc.setTextColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
      doc.text(semestre, margin + 75, topBoxY + 32);

      doc.setTextColor(0, 0, 0);
      doc.text('Inicio:', margin + 15, topBoxY + 45, { align: 'left' });
      doc.text(`Término: ${cicloFin}`, margin + 15, topBoxY + 52, { align: 'left' });
      doc.text(cicloInicio, margin + 30, topBoxY + 45);

      // --- TABLA DE ASIGNACIONES (Sin columna PROFESOR, enfocada en CURSO) ---
      const asignacionesMap = new Map<string, any>();
      horarios.forEach((h: any) => {
        const cursoNombre = h.curso?.nombre || 'N/A';
        const key = cursoNombre;
        const horas = Math.max(
          parseInt(h.horaFin?.substring(0, 2) || '0', 10) - parseInt(h.horaInicio?.substring(0, 2) || '0', 10),
          1,
        );

        if (!asignacionesMap.has(key)) {
          asignacionesMap.set(key, {
            curso: cursoNombre,
            ciclos: new Set<string>(),
            teoria: 0,
            practica: 0,
            laboratorio: 0,
            labGroups: new Set<number>(),
            total: 0,
            departamento: h.curso?.carrera?.nombre || 'Ing. de Sistemas',
          });
        }

        const item = asignacionesMap.get(key);
        const cicloCurso = String(h.curso?.cicloAcademico || '').trim();
        if (cicloCurso) item.ciclos.add(cicloCurso);
        item.total += horas;
        if (h.tipoClase === 'teoria') item.teoria += horas;
        if (h.tipoClase === 'practica') item.practica += horas;
        if (h.tipoClase === 'laboratorio') {
          item.laboratorio += horas;
          if (h.grupo?.id) item.labGroups.add(h.grupo.id);
        }
      });

      const palette: [number, number, number][] = [
        [147, 197, 253], [252, 165, 165], [250, 204, 21], [110, 231, 183], [196, 181, 253]
      ];

      const asignaciones = Array.from(asignacionesMap.values())
        .sort((a, b) => a.curso.localeCompare(b.curso))
        .map((item, index) => ({
          ...item,
          numero: index + 1,
          color: palette[index % palette.length],
          displayL: item.labGroups.size > 0 ? (item.laboratorio / item.labGroups.size) : item.laboratorio,
          displayG: item.labGroups.size > 0 ? String(item.labGroups.size) : '-',
          ciclosTexto: Array.from(item.ciclos).sort((a, b) => Number(a) - Number(b)).map(c => `${c}°`).join(', ')
        }));

      const asignacionLookup = new Map<string, { numero: number; color: [number, number, number] }>();
      asignaciones.forEach(item => asignacionLookup.set(item.curso, { numero: item.numero, color: item.color }));

      autoTable(doc, {
        startY: topBoxY,
        margin: { left: rightX - 2, right: margin },
        tableWidth: pageWidth - (rightX - 2) - margin,
        theme: 'grid',
        head: [['N°', 'ASIGNATURA / CURSO', 'CICLO', 'T', 'P', 'L', 'G', 'T. HORAS', 'DEPARTAMENTO']],
        body: asignaciones.map(item => [
          String(item.numero),
          item.curso,
          item.ciclosTexto,
          String(item.teoria),
          String(item.practica),
          String(item.displayL),
          item.displayG,
          String(item.total),
          item.departamento,
        ]),
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 6.5, halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0], cellPadding: 0.8 },
        bodyStyles: { fontSize: 6.5, cellPadding: 0.5, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 5, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 10, halign: 'center' }, 3: { cellWidth: 5, halign: 'center' }, 4: { cellWidth: 5, halign: 'center' }, 5: { cellWidth: 5, halign: 'center' }, 6: { cellWidth: 5, halign: 'center' }, 7: { cellWidth: 8, halign: 'center' }, 8: { cellWidth: 35 } },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            data.cell.styles.fillColor = asignaciones[data.row.index]?.color;
          }
        }
      });

      // --- GRILLA VISUAL (Mapa de Calor) ---
      const dayLabels = [{ id: 1, label: 'LUNES' }, { id: 2, label: 'MARTES' }, { id: 3, label: 'MIERCOLES' }, { id: 4, label: 'JUEVES' }, { id: 5, label: 'VIERNES' }, { id: 6, label: 'SABADO' }];
      const timeLabels = ['7-8', '8-9', '9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8'];
      const slotHeight = 6.2;
      const hourColWidth = 10;
      const gridWidth = pageWidth - margin * 2;
      const dayColWidth = (gridWidth - hourColWidth * 2) / 6;
      const gridY = bottomGridY;
      const headerHeightGrid = 6;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, gridY, gridWidth, headerHeightGrid + timeLabels.length * slotHeight);

      try { doc.setFont('Trebuchet-Bold'); } catch (e) {}
      doc.setFontSize(7);
      doc.text('HORA', margin + hourColWidth / 2, gridY + 4, { align: 'center' });
      dayLabels.forEach((day, index) => {
        const x = margin + hourColWidth + index * dayColWidth;
        doc.line(x, gridY, x, gridY + headerHeightGrid + timeLabels.length * slotHeight);
        doc.text(day.label, x + dayColWidth / 2, gridY + 4, { align: 'center' });
      });
      doc.line(margin + hourColWidth + 6 * dayColWidth, gridY, margin + hourColWidth + 6 * dayColWidth, gridY + headerHeightGrid + timeLabels.length * slotHeight);
      doc.text('HORA', margin + hourColWidth + 6 * dayColWidth + hourColWidth / 2, gridY + 4, { align: 'center' });

      const occupied = new Set<string>();
      const blockBySlot = new Map<string, any>();
      horarios.forEach((h: any) => {
        const asignacion = asignacionLookup.get(h.curso?.nombre);
        if (!asignacion) return;
        const start = parseInt(h.horaInicio.substring(0, 2)) - 7;
        const span = parseInt(h.horaFin.substring(0, 2)) - parseInt(h.horaInicio.substring(0, 2));
        blockBySlot.set(`${h.diaSemana}_${start}`, { ...asignacion, span, tipo: h.tipoClase, aula: h.aula?.nombre || 'S/A' });
      });

      timeLabels.forEach((label, rowIndex) => {
        const yPos = gridY + headerHeightGrid + rowIndex * slotHeight;
        if (rowIndex === 6) { // Almuerzo 1-2
          doc.setFillColor(255, 255, 0);
          doc.rect(margin, yPos, gridWidth, slotHeight, 'F');
        }
        doc.line(margin, yPos, margin + gridWidth, yPos);
        doc.setFontSize(7);
        doc.text(label, margin + hourColWidth / 2, yPos + slotHeight / 2 + 1, { align: 'center' });
        doc.text(label, margin + hourColWidth + 6 * dayColWidth + hourColWidth / 2, yPos + slotHeight / 2 + 1, { align: 'center' });

        dayLabels.forEach((day, dayIndex) => {
          const x = margin + hourColWidth + dayIndex * dayColWidth;
          const key = `${day.id}_${rowIndex}`;
          if (occupied.has(key)) return;
          const block = blockBySlot.get(key);
          if (block) {
            doc.setFillColor(block.color[0], block.color[1], block.color[2]);
            doc.rect(x, yPos, dayColWidth, block.span * slotHeight, 'FD');
            doc.setFontSize(6);
            doc.text([String(block.numero), `(${block.aula})`], x + dayColWidth / 2, yPos + (block.span * slotHeight / 2) + 1, { align: 'center' });
            for (let i = 0; i < block.span; i++) occupied.add(`${day.id}_${rowIndex + i}`);
          } else {
            doc.rect(x, yPos, dayColWidth, slotHeight);
          }
        });
      });

      doc.save(`Horario_Personal_${usuario.nombre?.replace(/ /g, '_')}_${cicloNombre}.pdf`);
    } catch (err) {
      console.error('Error generando PDF Personal:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateHorarioPersonalExcel = async () => {
    if (!usuario?.docenteId) return;
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mi Horario');
      const AZUL_UNT_HEX = '003366';
      const BLANCO_HEX = 'FFFFFF';

      const cicloActual = ciclos.find(c => c.id === filtros.cicloId) || ciclos.find(c => c.actual);
      const cicloNombre = cicloActual?.nombre || '2026-I';

      // Estilo de cabecera formal
      worksheet.mergeCells('A1:I1');
      worksheet.getCell('A1').value = 'UNIVERSIDAD NACIONAL DE TRUJILLO';
      worksheet.mergeCells('A2:I2');
      worksheet.getCell('A2').value = 'REPORTE OFICIAL DE CARGA HORARIA DOCENTE';
      
      ['A1', 'A2'].forEach(cell => {
        worksheet.getCell(cell).font = { size: 14, bold: true, color: { argb: BLANCO_HEX } };
        worksheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
        worksheet.getCell(cell).alignment = { horizontal: 'center' };
      });

      worksheet.addRow([]);
      worksheet.addRow(['DATOS DEL DOCENTE']).font = { bold: true };
      worksheet.addRow(['Nombre:', usuario.nombre?.toUpperCase()]);
      worksheet.addRow(['Ciclo:', cicloNombre]);
      worksheet.addRow(['Fecha:', new Date().toLocaleString()]);
      worksheet.addRow([]);

      const response = await api.get('/horarios', { params: { cicloId: filtros.cicloId, docenteId: usuario.docenteId } });
      const horarios = response.data || [];

      // Tabla de resumen de carga (Igual al PDF)
      const headers = ['N°', 'ASIGNATURA / CURSO', 'CICLO', 'T', 'P', 'L', 'G', 'T. HORAS', 'DEPARTAMENTO'];
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: BLANCO_HEX } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
        cell.alignment = { horizontal: 'center' };
      });

      // Lógica de agrupación para Excel
      const summary = new Map();
      horarios.forEach((h: any) => {
        const key = h.curso?.nombre;
        if (!summary.has(key)) {
          summary.set(key, { curso: key, ciclo: h.curso?.cicloAcademico, t: 0, p: 0, l: 0, g: new Set(), total: 0, dep: h.curso?.carrera?.nombre });
        }
        const item = summary.get(key);
        const hours = parseInt(h.horaFin.substring(0, 2)) - parseInt(h.horaInicio.substring(0, 2));
        item.total += hours;
        if (h.tipoClase === 'teoria') item.t += hours;
        else if (h.tipoClase === 'practica') item.p += hours;
        else if (h.tipoClase === 'laboratorio') { item.l += hours; if (h.grupo?.id) item.g.add(h.grupo.id); }
      });

      Array.from(summary.values()).forEach((item, idx) => {
        worksheet.addRow([
          idx + 1, item.curso, `${item.ciclo}°`, item.t, item.p, item.g.size > 0 ? (item.l / item.g.size) : item.l, item.g.size || '-', item.total, item.dep
        ]);
      });

      worksheet.addRow([]);
      worksheet.addRow(['DETALLE DE HORARIOS POR DÍA']).font = { bold: true };
      const detailHeaders = ['DÍA', 'INICIO', 'FIN', 'CURSO', 'TIPO', 'AULA'];
      const detailRow = worksheet.addRow(detailHeaders);
      detailRow.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } }; });

      horarios.sort((a: any, b: any) => (a.diaSemana - b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio)).forEach((h: any) => {
        worksheet.addRow([DIAS_MAP[h.diaSemana], h.horaInicio.substring(0, 5), h.horaFin.substring(0, 5), h.curso?.nombre, h.tipoClase, h.aula?.nombre]);
      });

      worksheet.columns.forEach(col => { col.width = 20; });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Horario_Docente_${usuario.nombre?.replace(/ /g, '_')}.xlsx`);
    } catch (err) {
      console.error('Error generando Excel Personal:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventForSlot = (dia: number, hora: string) => {
    return misHorarios.find(h => {
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      const currentH = parseInt(hora.split(':')[0]);
      return h.diaSemana === dia && currentH >= hInicio && currentH < hFin;
    });
  };

  const isStartTime = (hInicio: string, currentH: string) => {
    return hInicio.substring(0, 5) === currentH.substring(0, 5);
  };

  const getColorByCiclo = (ciclo: number) => {
    const colors = [
      'rgba(0, 51, 102, 0.08)',
      'rgba(99, 102, 241, 0.08)',
      'rgba(16, 185, 129, 0.08)',
      'rgba(245, 158, 11, 0.08)',
      'rgba(239, 68, 68, 0.08)',
    ];
    return colors[ciclo % colors.length];
  };

  const getColorBorderByCiclo = (ciclo: number) => {
    const colors = ['#003366', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];
    return colors[ciclo % colors.length];
  };

  if (usuario?.rol === 'docente') {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0b3a75', mb: 1 }}>
              Mis Reportes Oficiales
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
              Gestión de formatos oficiales, declaraciones juradas y firma digital.
            </Typography>
          </Box>
          <IconButton 
            onClick={fetchReportes} 
            sx={{ 
              bgcolor: 'white', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: '#f1f5f9' }
            }}
          >
            <RefreshIcon sx={{ color: '#64748b' }} />
          </IconButton>
        </Box>

        {/* Panel de Filtros Estilo Gestión de Docentes */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2.5, 
            mb: 4, 
            borderRadius: 4, 
            border: '1px solid #eef2f6', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            bgcolor: 'white'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Filtro Periodo Académico (Izquierda) */}
            <Grid item xs={12} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Periodo</InputLabel>
                <Select
                  value={filtros.cicloId}
                  label="Periodo"
                  onChange={(e) => setFiltros({ ...filtros, cicloId: e.target.value })}
                  sx={{ borderRadius: 2 }}
                >
                  {ciclos.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.nombre} {c.actual ? '(Actual)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Buscador con Label y Icono */}
            <Grid item xs={12} md={6.5}>
              <TextField
                fullWidth
                size="small"
                label="Buscar Formato por Nombre"
                placeholder="Escribe el nombre del formato..."
                value={reportesSearch}
                onChange={(e) => setReportesSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#0b3a75', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>

            {/* Botón Limpiar */}
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setReportesSearch('');
                  setFiltrosCRUD({ sede: 'Todas las Sedes', estado: 'Todos los Estados' });
                }}
                sx={{ 
                  borderRadius: 2, 
                  height: 40,
                  fontWeight: 700, 
                  color: '#64748b', 
                  borderColor: '#e2e8f0',
                  textTransform: 'uppercase',
                  '&:hover': {
                    borderColor: '#cbd5e1',
                    bgcolor: '#f8fafc'
                  }
                }}
              >
                Limpiar
              </Button>
            </Grid>

            {/* Botón Filtros */}
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant={mostrarFiltrosSecundarios ? 'contained' : 'outlined'}
                startIcon={<FilterIcon />}
                onClick={() => setMostrarFiltrosSecundarios(!mostrarFiltrosSecundarios)}
                sx={{ 
                  borderRadius: 2, 
                  height: 40,
                  fontWeight: 700,
                  bgcolor: mostrarFiltrosSecundarios ? '#0b3a75' : 'transparent',
                  borderColor: '#0b3a75',
                  color: mostrarFiltrosSecundarios ? 'white' : '#0b3a75',
                  textTransform: 'uppercase',
                  '&:hover': {
                    bgcolor: mostrarFiltrosSecundarios ? '#082d5a' : 'rgba(11, 58, 117, 0.04)',
                    borderColor: '#0b3a75',
                  }
                }}
              >
                Filtros
              </Button>
            </Grid>

            {/* Filtros Secundarios (Se muestran en la misma caja abajo) */}
            {mostrarFiltrosSecundarios && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Sede</InputLabel>
                      <Select
                        value={filtrosCRUD.sede}
                        label="Tipo de Sede"
                        onChange={(e) => setFiltrosCRUD({ ...filtrosCRUD, sede: e.target.value })}
                      >
                        <MenuItem value="Todas las Sedes">Todas las Sedes</MenuItem>
                        <MenuItem value="Sede Central">Sede Central</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={filtrosCRUD.estado}
                        label="Estado"
                        onChange={(e) => setFiltrosCRUD({ ...filtrosCRUD, estado: e.target.value })}
                      >
                        <MenuItem value="Todos los Estados">Todos los Estados</MenuItem>
                        <MenuItem value="pendiente">Pendiente</MenuItem>
                        <MenuItem value="firmado">Firmado</MenuItem>
                      </Select>
                    </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0b3a75' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 700, width: 60 }}>N°</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>FORMATO</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>SEDE</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>ESTADO</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingReportes ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : filteredReportes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10, color: '#64748b' }}>
                      No se encontraron reportes generados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReportes
                    .slice(reportesPage * reportesRowsPerPage, reportesPage * reportesRowsPerPage + reportesRowsPerPage)
                    .map((reporte, index) => (
                      <TableRow key={reporte.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{reportesPage * reportesRowsPerPage + index + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{reporte.formato}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{reporte.sede}</TableCell>
                        <TableCell>
                          <Chip 
                            label={reporte.estado.toUpperCase()} 
                            size="small"
                            icon={reporte.estado === 'firmado' ? <SuccessIcon /> : <WaitIcon />}
                            sx={{ 
                              fontWeight: 800,
                              bgcolor: reporte.estado === 'firmado' ? '#dcfce7' : '#fff7ed',
                              color: reporte.estado === 'firmado' ? '#166534' : '#9a3412',
                              borderRadius: 2,
                              px: 1
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="Firmar Documento">
                              <span>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleFirmar(reporte.id)}
                                  disabled={reporte.estado === 'firmado'}
                                  sx={{ bgcolor: 'rgba(11, 58, 117, 0.05)', '&:hover': { bgcolor: 'rgba(11, 58, 117, 0.1)' } }}
                                >
                                  <SignIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            
                            <Tooltip title="Descargar PDF">
                              <span>
                                <IconButton 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => handleDescargarReporteOficial(reporte.id, `${reporte.formato}.pdf`)}
                                  sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)', '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.1)' } }}
                                >
                                  <PdfIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Descargar Excel">
                              <span>
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleDescargarReporteOficialExcel(reporte.id, `${reporte.formato}.xlsx`)}
                                  sx={{ bgcolor: 'rgba(22, 163, 74, 0.05)', '&:hover': { bgcolor: 'rgba(22, 163, 74, 0.1)' } }}
                                >
                                  <ExcelIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredReportes.length}
            rowsPerPage={reportesRowsPerPage}
            page={reportesPage}
            onPageChange={(_, newPage) => setReportesPage(newPage)}
            onRowsPerPageChange={(e) => {
              setReportesRowsPerPage(parseInt(e.target.value, 10));
              setReportesPage(0);
            }}
            labelRowsPerPage="Filas por página"
          />
        </Paper>

        {/* Modal de previsualización PDF (docente) */}
        <Dialog
          open={!!pdfPreview}
          fullWidth
          maxWidth="lg"
          onClose={() => {
            if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview(null);
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#003366' }}>
            Vista Previa del Reporte
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '75vh', display: 'flex', flexDirection: 'column' }}>
            {pdfPreview && (
              <embed
                src={pdfPreview.url}
                type="application/pdf"
                style={{ width: '100%', height: '100%', flex: 1 }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
                setPdfPreview(null);
              }}
            >
              Cerrar
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => {
                if (pdfPreview) {
                  saveAs(pdfPreview.blob, pdfPreview.fileName);
                }
              }}
              sx={{ bgcolor: '#003366', fontWeight: 700, textTransform: 'none' }}
            >
              Descargar PDF
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>Centro de Reportes</Typography>
        <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
          Genera documentos oficiales y de gestión académica en formato PDF.
        </Typography>
      </Box>

      {/* Panel de Filtros Globales Estilo Horarios */}
      <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Periodo Académico</InputLabel>
              <Select
                value={filtros.cicloId}
                label="Periodo Académico"
                onChange={(e) => setFiltros({ ...filtros, cicloId: e.target.value })}
                startAdornment={<InputAdornment position="start"><CalendarIcon fontSize="small" color="primary" /></InputAdornment>}
              >
                {ciclos.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre} {c.actual ? '(Actual)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ciclo</InputLabel>
              <Select
                value={filtros.cicloEstudio}
                label="Ciclo"
                onChange={(e) => setFiltros({ ...filtros, cicloEstudio: e.target.value })}
                startAdornment={<InputAdornment position="start"><SchoolIcon fontSize="small" color="primary" /></InputAdornment>}
                displayEmpty
              >
                <MenuItem value="">Todos los ciclos</MenuItem>
                <MenuItem value="1">1° Ciclo</MenuItem>
                <MenuItem value="2">2° Ciclo</MenuItem>
                <MenuItem value="3">3° Ciclo</MenuItem>
                <MenuItem value="4">4° Ciclo</MenuItem>
                <MenuItem value="5">5° Ciclo</MenuItem>
                <MenuItem value="6">6° Ciclo</MenuItem>
                <MenuItem value="7">7° Ciclo</MenuItem>
                <MenuItem value="8">8° Ciclo</MenuItem>
                <MenuItem value="9">9° Ciclo</MenuItem>
                <MenuItem value="10">10° Ciclo</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Carrera</InputLabel>
              <Select
                value={filtros.carreraId}
                label="Carrera"
                onChange={(e) => {
                  const newCarreraId = e.target.value;
                  // Si cambiamos de carrera, limpiamos el docente seleccionado para evitar inconsistencias
                  setFiltros({ ...filtros, carreraId: newCarreraId, docente: null });
                }}
                startAdornment={<InputAdornment position="start"><SchoolIcon fontSize="small" color="primary" /></InputAdornment>}
              >
                {carreras.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={docentesFiltrados}
              getOptionLabel={(option) => option.nombreCompleto || ''}
              value={filtros.docente}
              onChange={(_, newValue) => setFiltros({ ...filtros, docente: newValue })}
              noOptionsText="No hay docentes para esta carrera"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar Docente por Nombre"
                  placeholder={filtros.carreraId ? "Docentes de la carrera..." : "Escribe el nombre del docente..."}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ambiente</InputLabel>
              <Select
                value={filtros.ambienteId}
                label="Ambiente"
                onChange={(e) => setFiltros({ ...filtros, ambienteId: e.target.value })}
                startAdornment={<InputAdornment position="start"><RoomIcon fontSize="small" color="primary" /></InputAdornment>}
                displayEmpty
              >
                <MenuItem value="">Todos los Ambientes</MenuItem>
                {ambientes.map(a => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleLimpiarFiltros}
              sx={{ 
                borderRadius: 3, 
                textTransform: 'none', 
                fontWeight: 800, 
                borderColor: '#cbd5e1', 
                color: '#475569', 
                height: 40,
                borderWidth: 1.5,
                '&:hover': {
                  borderColor: '#94a3b8',
                  bgcolor: '#f1f5f9',
                  borderWidth: 1.5
                }
              }}
            >
                LIMPIAR
              </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs para separar tipos de reportes */}
      <Box sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { fontWeight: 800, fontSize: '1rem', py: 2 },
            '& .Mui-selected': { color: '#003366 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#003366', height: 3 }
          }}
        >
          <Tab 
            icon={<AssignmentIcon />} 
            iconPosition="start" 
            label="Reportes Operacionales" 
          />
          <Tab 
            icon={<AssessmentIcon />} 
            iconPosition="start" 
            label="Reportes de Gestión" 
          />
        </Tabs>
      </Box>

      {/* Contenido según el Tab seleccionado */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: 48, height: 48 }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>Operatividad Académica</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Documentos detallados para el control diario de clases y ambientes.</Typography>
            </Box>
          </Box>
          <Grid container spacing={3}>
            {REPORTES_OPERACIONALES.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <Card sx={{ 
                  borderRadius: 5, 
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    transform: 'translateY(-4px)',
                    borderColor: '#003366'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  <CardContent sx={{ p: 3, flexGrow: 1 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 51, 102, 0.05)', borderRadius: 3, color: '#003366', display: 'inline-block', mb: 2 }}>
                      {React.cloneElement(r.icon as React.ReactElement, { sx: { fontSize: 28 } })}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>{r.nombre}</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 3, minHeight: 40 }}>{r.desc}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />}
                        onClick={() => generatePDF(r.id)}
                        disabled={loading}
                        sx={{ 
                          bgcolor: '#003366', 
                          borderRadius: 3,
                          py: 1.2,
                          textTransform: 'none',
                          fontWeight: 700,
                          '&:hover': { bgcolor: '#002244' }
                        }}
                      >
                        PDF
                      </Button>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        color="success"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AssessmentIcon />}
                        onClick={() => generateExcel(r.id)}
                        disabled={loading}
                        sx={{ 
                          borderRadius: 3,
                          py: 1.2,
                          textTransform: 'none',
                          fontWeight: 700,
                          borderWidth: 2,
                          '&:hover': { borderWidth: 2 }
                        }}
                      >
                        Excel
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: 48, height: 48 }}>
              <AssessmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>Análisis y Estrategia</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Reportes consolidados para la evaluación de metas y optimización de recursos.</Typography>
            </Box>
          </Box>
          <Grid container spacing={3}>
            {REPORTES_GESTION.map((r) => (
              <Grid item xs={12} sm={6} key={r.id}>
                <Card sx={{ 
                  borderRadius: 5, 
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  '&:hover': { 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    transform: 'translateY(-4px)',
                    borderColor: '#10b981'
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent sx={{ p: 3, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 4, color: '#10b981' }}>
                        {React.cloneElement(r.icon as React.ReactElement, { sx: { fontSize: 32 } })}
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>{r.nombre}</Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>{r.desc}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />}
                        onClick={() => generatePDF(r.id)}
                        disabled={loading}
                        sx={{ 
                          borderRadius: 3, 
                          borderWidth: 2,
                          px: 3,
                          py: 1.2,
                          fontWeight: 800,
                          textTransform: 'none',
                          '&:hover': { borderWidth: 2 }
                        }}
                      >
                        PDF
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="success"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AssessmentIcon />}
                        onClick={() => generateExcel(r.id)}
                        disabled={loading}
                        sx={{ 
                          borderRadius: 3, 
                          borderWidth: 2,
                          px: 3,
                          py: 1.2,
                          fontWeight: 800,
                          textTransform: 'none',
                          '&:hover': { borderWidth: 2 }
                        }}
                      >
                        Excel
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Alert severity="info" icon={<DescriptionIcon />} sx={{ mt: 4, borderRadius: 4, fontWeight: 500 }}>
            Los reportes de gestión procesan datos de todo el ciclo académico para generar indicadores de eficiencia.
          </Alert>
        </Box>
      )}

      {/* Modal de previsualización PDF */}
      <Dialog
        open={!!pdfPreview}
        fullWidth
        maxWidth="lg"
        onClose={() => {
          if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
          setPdfPreview(null);
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#003366' }}>
          Vista Previa del Reporte
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '75vh', display: 'flex', flexDirection: 'column' }}>
          {pdfPreview && (
            <embed
              src={pdfPreview.url}
              type="application/pdf"
              style={{ width: '100%', height: '100%', flex: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
              setPdfPreview(null);
            }}
          >
            Cerrar
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (pdfPreview) {
                saveAs(pdfPreview.blob, pdfPreview.fileName);
              }
            }}
            sx={{ bgcolor: '#003366', fontWeight: 700, textTransform: 'none' }}
          >
            Descargar PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
