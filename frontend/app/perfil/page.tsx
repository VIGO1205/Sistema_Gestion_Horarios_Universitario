'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  Button,
  TextField,
  MenuItem,
  Skeleton,
  Alert,
  Snackbar,
  Tooltip,
  Divider,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BookIcon from '@mui/icons-material/Book';
import BusinessIcon from '@mui/icons-material/Business';
import NumbersIcon from '@mui/icons-material/Numbers';
import CategoryIcon from '@mui/icons-material/Category';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InventoryIcon from '@mui/icons-material/Inventory';
import GavelIcon from '@mui/icons-material/Gavel';
import FlagIcon from '@mui/icons-material/Flag';
import PersonIcon from '@mui/icons-material/Person';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const MySwal = withReactContent(Swal);

const OPTIONS_CONDICION = [
  { value: 'nombrado', label: 'Nombrado' },
  { value: 'contratado', label: 'Contratado' },
  { value: 'extraordinario', label: 'Extraordinario' },
];

const CATEGORIAS_POR_CONDICION: Record<string, { value: string; label: string }[]> = {
  ordinario: [
    { value: 'principal', label: 'Principal' },
    { value: 'asociado', label: 'Asociado' },
    { value: 'auxiliar', label: 'Auxiliar' },
  ],
  contratado: [
    { value: 'tipo_a1', label: 'Tipo A1' },
    { value: 'tipo_a2', label: 'Tipo A2' },
    { value: 'tipo_a3', label: 'Tipo A3' },
    { value: 'tipo_b1', label: 'Tipo B1' },
    { value: 'tipo_b2', label: 'Tipo B2' },
    { value: 'tipo_b3', label: 'Tipo B3' },
    { value: 'jefe_practica', label: 'Jefe de Práctica' },
  ],
  extraordinario: [
    { value: 'principal', label: 'Principal' },
    { value: 'asociado', label: 'Asociado' },
    { value: 'auxiliar', label: 'Auxiliar' },
    { value: 'tipo_a1', label: 'Tipo A1' },
    { value: 'tipo_b1', label: 'Tipo B1' },
    { value: 'jefe_practica', label: 'Jefe de Práctica' },
  ],
};

const DEDICACIONES_POR_CONDICION: Record<string, string[]> = {
  ordinario: [
    'DEDICACION EXCLUSIVA',
    'TIEMPO COMPLETO',
    'TIEMPO PARCIAL 20 H',
    'TIEMPO PARCIAL 12 H',
    'TIEMPO PARCIAL 10 H',
    'TIEMPO PARCIAL 04 H',
  ],
  extraordinario: [
    'DEDICACION EXCLUSIVA',
    'TIEMPO COMPLETO',
    'TIEMPO PARCIAL 20 H',
    'TIEMPO PARCIAL 12 H',
    'TIEMPO PARCIAL 10 H',
  ],
  contratado: [
    'TIEMPO COMPLETO',
    'TIEMPO PARCIAL 16 H',
    'TIEMPO PARCIAL 04 H',
  ],
};

const OPTIONS_FACULTAD = [
  { value: 'ciencias_agropecuarias', label: 'Ciencias Agropecuarias' },
  { value: 'ciencias_biologicas', label: 'Ciencias Biológicas' },
  { value: 'ciencias_economicas', label: 'Ciencias Económicas' },
  { value: 'ciencias_fisicas_y_matematicas', label: 'Ciencias Físicas y Matemáticas' },
  { value: 'ciencias_sociales', label: 'Ciencias Sociales' },
  { value: 'educacion_y_ciencias_de_la_comunicacion', label: 'Educación y Ciencias de la Comunicación' },
  { value: 'derecho_y_ciencias_politicas', label: 'Derecho y Ciencias Políticas' },
  { value: 'enfermeria', label: 'Enfermería' },
  { value: 'estomatologia', label: 'Estomatología' },
  { value: 'farmacia_y_bioquimica', label: 'Farmacia y Bioquímica' },
  { value: 'ingenieria', label: 'Ingeniería' },
  { value: 'ingenieria_quimica', label: 'Ingeniería Química' },
  { value: 'medicina', label: 'Medicina' },
];

const OPTIONS_DEPARTAMENTO = [
  { value: 'administracion', label: 'Administración' },
  { value: 'agronomia_y_zootecnia', label: 'Agronomía y Zootecnia' },
  { value: 'arqueologia_y_antropologia', label: 'Arqueología y Antropología' },
  { value: 'bioquimica', label: 'Bioquímica' },
  { value: 'ciencias_agroindustriales', label: 'Ciencias Agroindustriales' },
  { value: 'ciencias_basicas_medicas', label: 'Ciencias Básicas Médicas' },
  { value: 'ciencias_biologicas', label: 'Ciencias Biológicas' },
  { value: 'ciencias_de_la_educacion', label: 'Ciencias de la Educación' },
  { value: 'ciencias_psicologicas', label: 'Ciencias Psicológicas' },
  { value: 'ciencias_sociales', label: 'Ciencias Sociales' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'comunicacion_social', label: 'Comunicación Social' },
  { value: 'contabilidad_y_finanzas', label: 'Contabilidad y Finanzas' },
  { value: 'derecho', label: 'Derecho' },
  { value: 'economia', label: 'Economía' },
  { value: 'enfermeria_de_la_mujer_nino_y_adolescente', label: 'Enfermería de la Mujer, Niño y Adolescente' },
  { value: 'estadistica', label: 'Estadística' },
  { value: 'estomatologia', label: 'Estomatología' },
  { value: 'farmacologia', label: 'Farmacología' },
  { value: 'farmacotecnia', label: 'Farmacotecnia' },
  { value: 'filosofia_y_arte', label: 'Filosofía y Arte' },
  { value: 'fisica', label: 'Física' },
  { value: 'fisiologia_humana', label: 'Fisiología Humana' },
  { value: 'ginecologia_y_obstetricia', label: 'Ginecología y Obstetricia' },
  { value: 'historia_y_geografia', label: 'Historia y Geografía' },
  { value: 'idiomas_y_linguistica', label: 'Idiomas y Lingüística' },
  { value: 'informatica', label: 'Informática' },
  { value: 'ingenieria_ambiental', label: 'Ingeniería Ambiental' },
  { value: 'ingenieria_civil_arquitectura_y_urbanismo', label: 'Ingeniería Civil, Arquitectura y Urbanismo' },
  { value: 'ingenieria_de_materiales', label: 'Ingeniería de Materiales' },
  { value: 'ingenieria_de_minas', label: 'Ingeniería de Minas' },
  { value: 'ingenieria_de_sistemas', label: 'Ingeniería de Sistemas' },
  { value: 'ingenieria_industrial', label: 'Ingeniería Industrial' },
  { value: 'ingenieria_mecatronica', label: 'Ingeniería Mecatrónica' },
  { value: 'ingenieria_metalurgica', label: 'Ingeniería Metalúrgica' },
  { value: 'ingenieria_quimica', label: 'Ingeniería Química' },
  { value: 'lengua_nacional_y_literatura', label: 'Lengua Nacional y Literatura' },
  { value: 'matematicas', label: 'Matemáticas' },
  { value: 'mecanica_y_energia', label: 'Mecánica y Energía' },
  { value: 'medicina', label: 'Medicina' },
  { value: 'medicina_preventiva_y_salud_publica', label: 'Medicina Preventiva y Salud Pública' },
  { value: 'microbiologia_y_parasitologia', label: 'Microbiología y Parasitología' },
  { value: 'morfologia_humana', label: 'Morfología Humana' },
  { value: 'pediatria', label: 'Pediatría' },
  { value: 'pesqueria', label: 'Pesquería' },
  { value: 'quimica', label: 'Química' },
  { value: 'quimica_biologica_y_fisiologia_animal', label: 'Química Biológica y Fisiología Animal' },
  { value: 'salud_del_adulto_y_salud_familiar_y_comunitaria', label: 'Salud del Adulto y Salud Familiar y Comunitaria' },
];

const OPTIONS_INVESTIGACION = [
  { value: 'NINGUNA', label: 'Ninguna' },
  { value: 'INVESTIGADOR', label: 'Docente Investigador (DI)' },
  { value: 'RENACYT', label: 'Docente RENACYT (DR)' },
];

const DEPENDENCIAS_OPTIONS = [
  'Ninguno',
  'Filial Valle Jequetepeque',
  'Filial Huamachuco',
  'Filial Santiago de Chuco',
  'Escuela de Posgrado',
  'Segunda Especialidad',
  'CEPUNT',
  'CIDUNT',
  'Centro Educativo Experimental "Rafael Narváez Cadenillas"',
  'Otro Centro de Producción',
];

const OPTIONS_CARGO_GOBIERNO = [
  { value: 'director_departamento', label: 'Director de Departamento' },
  { value: 'decano', label: 'Decano' },
  { value: 'vicedecano', label: 'Vicedecano' },
  { value: 'director_escuela', label: 'Director de Escuela' },
  { value: 'director_instituto', label: 'Director de Instituto' },
  { value: 'jefe_oficina', label: 'Jefe de Oficina' },
  { value: 'consejero_facultad', label: 'Consejero de Facultad' },
  { value: 'miembro_asamblea_universitaria', label: 'Miembro de Asamblea Universitaria' },
  { value: 'miembro_consejo_universitario', label: 'Miembro de Consejo Universitario' },
  { value: 'coordinador_academico', label: 'Coordinador Académico' },
];

const OPTIONS_CARGO_GESTION = [
  { value: 'jefe_admision', label: 'Jefe de Oficina Central de Admisión' },
  { value: 'jefe_registros', label: 'Jefe de Oficina Central de Registros y Matrícula' },
  { value: 'jefe_grados', label: 'Jefe de Oficina Central de Grados y Títulos' },
  { value: 'jefe_investigacion', label: 'Jefe de Oficina Central de Investigación' },
  { value: 'jefe_extension', label: 'Jefe de Oficina Central de Extensión y Proyección Social' },
  { value: 'jefe_bienestar', label: 'Jefe de Oficina Central de Bienestar Universitario' },
  { value: 'jefe_calidad', label: 'Jefe de Oficina Central de Calidad' },
  { value: 'jefe_planeamiento', label: 'Jefe de Oficina Central de Planeamiento y Presupuesto' },
  { value: 'jefe_abastecimiento', label: 'Jefe de Oficina Central de Abastecimiento' },
  { value: 'jefe_rrhh', label: 'Jefe de Oficina Central de Recursos Humanos' },
  { value: 'jefe_contabilidad', label: 'Jefe de Oficina Central de Contabilidad' },
  { value: 'jefe_tesoreria', label: 'Jefe de Oficina Central de Tesorería' },
  { value: 'jefe_infraestructura', label: 'Jefe de Oficina Central de Infraestructura' },
  { value: 'jefe_comunicaciones', label: 'Jefe de Oficina Central de Marketing y Comunicaciones' },
  { value: 'jefe_tecnologia', label: 'Jefe de Oficina Central de Tecnologías de la Información' },
  { value: 'jefe_biblioteca', label: 'Jefe de Unidad de Biblioteca Central' },
  { value: 'jefe_centro_computo', label: 'Jefe de Unidad de Centro de Cómputo' },
  { value: 'jefe_centro_produccion', label: 'Jefe de Centro de Producción' },
  { value: 'director_posgrado', label: 'Director de Escuela de Posgrado' },
  { value: 'director_sistema_biblioteca', label: 'Director del Sistema de Biblioteca' },
  { value: 'coordinador_practicas', label: 'Coordinador de Prácticas Pre Profesionales' },
  { value: 'coordinador_investigacion', label: 'Coordinador de Investigación' },
  { value: 'coordinador_extension', label: 'Coordinador de Extensión y Proyección Social' },
  { value: 'coordinador_tutoria', label: 'Coordinador de Tutoría' },
  { value: 'coordinador_egresado', label: 'Coordinador de Seguimiento al Egresado' },
  { value: 'coordinador_internacionalizacion', label: 'Coordinador de Internacionalización' },
  { value: 'coordinador_responsabilidad_social', label: 'Coordinador de Responsabilidad Social Universitaria' },
  { value: 'miembro_comite_calidad', label: 'Miembro del Comité de Calidad' },
  { value: 'miembro_comite_autoevaluacion', label: 'Miembro del Comité de Autoevaluación' },
  { value: 'miembro_comite_investigacion', label: 'Miembro del Comité de Investigación' },
  { value: 'miembro_comite_extension', label: 'Miembro del Comité de Extensión Universitaria' },
  { value: 'miembro_comite_responsabilidad_social', label: 'Miembro del Comité de Responsabilidad Social Universitaria' },
  { value: 'miembro_comite_curricula', label: 'Miembro del Comité de Currícula' },
  { value: 'responsable_laboratorio', label: 'Responsable de Laboratorio' },
  { value: 'tutor_academico', label: 'Tutor Académico' },
  { value: 'asesor_tesis', label: 'Asesor de Tesis' },
];

function InputField({ icon, label, name, value, onChange, type = 'text', select = false, options = [], readOnly = false, placeholder = '' }: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
  type?: string;
  select?: boolean;
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  placeholder?: string;
}) {
  const inputProps: Record<string, any> = {};
  if (type === 'number') {
    inputProps.min = 0;
    inputProps.max = 50;
  }
  if (readOnly) {
    inputProps.readOnly = true;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {label}
        </Typography>
      </Box>
      {select ? (
        <TextField
          select
          fullWidth
          size="small"
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected: any) => {
              if (!selected) return <span style={{ color: '#9ca3af' }}>{placeholder || `Seleccionar ${label.toLowerCase()}`}</span>;
              const opt = options.find((o) => o.value === selected);
              return opt?.label || selected;
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f9fafb', fontSize: '0.88rem', borderRadius: '8px' } }}
        >
          <MenuItem value="" sx={{ color: '#9ca3af' }}>{placeholder || `Seleccionar ${label.toLowerCase()}`}</MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          fullWidth
          size="small"
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(name, type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          inputProps={inputProps}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f9fafb',
              fontSize: '0.88rem',
              borderRadius: '8px',
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#003366' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#003366', borderWidth: 2 },
            },
          }}
        />
      )}
    </Box>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
        px: 3,
        py: 1.8,
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
      }}
    >
      {icon}
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        {title}
      </Typography>
    </Box>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [docente, setDocente] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const [original, setOriginal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol !== 'docente') {
      router.replace('/dashboard');
      return;
    }

    const fetchDocente = async () => {
      try {
        setCargando(true);
        const res = await api.get(`/docentes/${usuario.docenteId}`);
        const d = res.data;
        setDocente(d);
        const vals: Record<string, any> = {
          nombreCompleto: d.nombreCompleto || '',
          dni: d.dni || '',
          condicion: d.condicion || '',
          categoria: d.categoria || '',
          facultad: d.facultad || '',
          departamentoAcademico: d.departamentoAcademico || '',
          telefono: d.telefono || '',
          emailPersonal: d.emailPersonal || '',
          cargoGobierno: d.cargoGobierno || '',
          cargoGestionInstitucional: d.cargoGestionInstitucional || '',
          dedicacion: d.dedicacion || '',
          antiguedadAnios: d.antiguedadAnios ?? 0,
          codigoIBM: d.codigoIBM || '',
          fechaIngreso: d.fechaIngreso ? d.fechaIngreso.split('T')[0] : '',
          telegramId: d.telegramId || '',
          esBecario: d.esBecario ?? false,
          investigacion: d.investigacion || 'NINGUNA',
          dependencias: d.dependencias || ['Ninguno'],
        };
        setForm(vals);
        setOriginal({ ...vals });
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Error al cargar datos del perfil');
      } finally {
        setCargando(false);
      }
    };

    fetchDocente();
  }, [usuario, router]);

  const handleChange = (name: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'fechaIngreso' && value) {
        const ingreso = new Date(value);
        if (!isNaN(ingreso.getTime())) {
          const hoy = new Date();
          let anios = hoy.getFullYear() - ingreso.getFullYear();
          const m = hoy.getMonth() - ingreso.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anios--;
          next.antiguedadAnios = Math.max(0, anios);
        }
      }

      if (name === 'condicion') {
        const key = value === 'nombrado' ? 'ordinario' : value;
        const cats = CATEGORIAS_POR_CONDICION[key] || CATEGORIAS_POR_CONDICION.ordinario;
        if (!cats.some(c => c.value === next.categoria)) {
          next.categoria = cats[0]?.value || '';
        }
        const dedKey = value === 'nombrado' ? 'ordinario' : value;
        const depsDisponibles = DEDICACIONES_POR_CONDICION[dedKey] || DEDICACIONES_POR_CONDICION.ordinario;
        if (next.dedicacion && !depsDisponibles.includes(next.dedicacion)) {
          next.dedicacion = depsDisponibles[0] || '';
        }
      }

      if (name === 'categoria') {
        const condKey = next.condicion === 'nombrado' ? 'ordinario' : next.condicion;
        const depsDisponibles = DEDICACIONES_POR_CONDICION[condKey] || DEDICACIONES_POR_CONDICION.ordinario;
        let filtered = [...depsDisponibles];
        if (['tipo_a1', 'tipo_b1'].includes(value)) {
          filtered = ['TIEMPO COMPLETO'];
        } else if (['tipo_a2', 'tipo_b2'].includes(value)) {
          filtered = ['TIEMPO PARCIAL 16 H'];
        } else if (['tipo_a3', 'tipo_b3'].includes(value)) {
          filtered = ['TIEMPO PARCIAL 08 H'];
        } else if (['jefe_practica'].includes(value)) {
          filtered = ['TIEMPO COMPLETO', 'TIEMPO PARCIAL 20 H', 'TIEMPO PARCIAL 12 H', 'TIEMPO PARCIAL 10 H'];
        }
        if (!filtered.includes(next.dedicacion)) {
          next.dedicacion = filtered[0] || '';
        }
        const permiteTcDe = filtered.some(d => d === 'TIEMPO COMPLETO' || d === 'DEDICACION EXCLUSIVA');
        if (!permiteTcDe) {
          next.investigacion = 'NINGUNA';
          next.dependencias = ['Ninguno'];
        }
      }

      if (name === 'dedicacion') {
        if (!['TIEMPO COMPLETO', 'DEDICACION EXCLUSIVA'].includes(value)) {
          next.investigacion = 'NINGUNA';
          next.dependencias = ['Ninguno'];
        }
      }

      return next;
    });
  };

  const getCategoriasDisponibles = () => {
    const key = form.condicion === 'nombrado' ? 'ordinario' : form.condicion;
    return CATEGORIAS_POR_CONDICION[key] || CATEGORIAS_POR_CONDICION.ordinario;
  };

  const getDedicacionesDisponibles = (): { value: string; label: string }[] => {
    const mapToObjs = (arr: string[]) => arr.map(v => ({ value: v, label: v }));
    const condKey = form.condicion === 'nombrado' ? 'ordinario' : form.condicion;
    const base = DEDICACIONES_POR_CONDICION[condKey] || DEDICACIONES_POR_CONDICION.ordinario;
    if (!form.categoria) return mapToObjs(base);
    if (['tipo_a1', 'tipo_b1'].includes(form.categoria)) {
      return mapToObjs(['TIEMPO COMPLETO']);
    }
    if (['tipo_a2', 'tipo_b2'].includes(form.categoria)) {
      return mapToObjs(['TIEMPO PARCIAL 16 H']);
    }
    if (['tipo_a3', 'tipo_b3'].includes(form.categoria)) {
      return mapToObjs(['TIEMPO PARCIAL 08 H']);
    }
    if (['jefe_practica'].includes(form.categoria)) {
      return mapToObjs(['TIEMPO COMPLETO', 'TIEMPO PARCIAL 20 H', 'TIEMPO PARCIAL 12 H', 'TIEMPO PARCIAL 10 H']);
    }
    return mapToObjs(base);
  };

  const hayCambios = useMemo(() => {
    return Object.keys(form).some((key) => form[key] !== original[key]);
  }, [form, original]);

  const esTcDe = ['TIEMPO COMPLETO', 'DEDICACION EXCLUSIVA'].includes(form.dedicacion);

  const handleGuardar = async () => {
    const result = await MySwal.fire({
      title: '¿Guardar cambios?',
      text: '¿Estás seguro de que deseas guardar los cambios realizados en tu perfil?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      setGuardando(true);
      const payload: Record<string, any> = {};
      for (const key of Object.keys(form)) {
        if (form[key] !== original[key]) {
          payload[key] = form[key];
        }
      }

      await api.patch(`/docentes/${usuario!.docenteId}/perfil`, payload);
      const res = await api.get(`/docentes/${usuario!.docenteId}`);
      setDocente(res.data);
      const vals: Record<string, any> = {
        nombreCompleto: res.data.nombreCompleto || '',
        dni: res.data.dni || '',
        condicion: res.data.condicion || '',
        categoria: res.data.categoria || '',
        facultad: res.data.facultad || '',
        departamentoAcademico: res.data.departamentoAcademico || '',
        telefono: res.data.telefono || '',
        emailPersonal: res.data.emailPersonal || '',
        cargoGobierno: res.data.cargoGobierno || '',
        cargoGestionInstitucional: res.data.cargoGestionInstitucional || '',
        dedicacion: res.data.dedicacion || '',
        antiguedadAnios: res.data.antiguedadAnios ?? 0,
        codigoIBM: res.data.codigoIBM || '',
        fechaIngreso: res.data.fechaIngreso ? res.data.fechaIngreso.split('T')[0] : '',
        telegramId: res.data.telegramId || '',
        esBecario: res.data.esBecario ?? false,
        investigacion: res.data.investigacion || 'NINGUNA',
        dependencias: res.data.dependencias || ['Ninguno'],
      };
      setForm(vals);
      setOriginal({ ...vals });
      setToast({ open: true, message: 'Perfil actualizado correctamente', severity: 'success' });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.response?.data?.message || 'Error al guardar los cambios',
        severity: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
          <Skeleton variant="circular" width={100} height={100} />
          <Skeleton variant="text" width={260} height={44} sx={{ mt: 2.5 }} />
          <Skeleton variant="text" width={180} height={24} />
        </Box>
        <Grid container spacing={3.5}>
          {[0, 1].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Container>
    );
  }

  if (!docente) return null;

  const initial = (docente.nombreCompleto || usuario?.email || '?').charAt(0).toUpperCase();
  const carrerasStr = docente.carreras?.map((dc: any) => dc.carrera?.nombre).join(', ') || '—';

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: '#003366',
              fontSize: '2.8rem',
              fontWeight: 700,
              mb: 2,
              boxShadow: '0 6px 20px rgba(0,51,102,0.3)',
            }}
          >
            {initial}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
            {docente.nombreCompleto}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5 }}>
            {usuario?.email}
          </Typography>
          <Chip
            icon={<SchoolIcon />}
            label="DOCENTE"
            size="small"
            sx={{
              bgcolor: '#e8f0fe',
              color: '#003366',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '1px',
              mb: 1,
            }}
          />
        </Box>

        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.2,
            }}
          >
            <PersonIcon sx={{ color: '#fff', fontSize: '1.4rem' }} />
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Mi Perfil
            </Typography>
          </Box>

          <CardContent sx={{ px: 3, py: 2.5 }}>
            <SectionHeader icon={<BadgeIcon sx={{ color: '#fff', fontSize: '1.1rem' }} />} title="Datos Personales" />
            <Box sx={{ px: 1, pt: 2, pb: 2.5 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <InputField icon={<PersonIcon />} label="NOMBRE COMPLETO" name="nombreCompleto" value={form.nombreCompleto} onChange={handleChange} placeholder="Ej. Juan Carlos Pérez López" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<BadgeIcon />} label="DNI" name="dni" value={form.dni} onChange={handleChange} placeholder="12345678" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<PhoneIcon />} label="TELÉFONO" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+51 999 888 777" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<TelegramIcon />} label="TELEGRAM ID" name="telegramId" value={form.telegramId} onChange={handleChange} placeholder="@usuario_telegram" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<EmailIcon />} label="EMAIL INSTITUCIONAL" name="emailInstitucional" value={usuario?.email || ''} onChange={() => {}} readOnly placeholder="docente@unt.edu.pe" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<EmailIcon />} label="EMAIL PERSONAL" name="emailPersonal" value={form.emailPersonal} onChange={handleChange} placeholder="juan.perez@gmail.com" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<BusinessIcon />} label="FACULTAD" name="facultad" value={form.facultad} onChange={handleChange} select options={OPTIONS_FACULTAD} placeholder="Seleccionar facultad" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<FlagIcon />} label="DEPARTAMENTO ACADÉMICO" name="departamentoAcademico" value={form.departamentoAcademico} onChange={handleChange} select options={OPTIONS_DEPARTAMENTO} placeholder="Seleccionar departamento" />
                </Grid>
                <Grid item xs={12}>
                  <InputField icon={<BookIcon />} label="CARRERAS ASIGNADAS" name="carreras" value={carrerasStr} onChange={() => {}} readOnly placeholder="—" />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <SectionHeader icon={<WorkIcon sx={{ color: '#fff', fontSize: '1.1rem' }} />} title="Datos Laborales" />
            <Box sx={{ px: 1, pt: 2, pb: 0.5 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<CategoryIcon />} label="CONDICIÓN" name="condicion" value={form.condicion} onChange={handleChange} select options={OPTIONS_CONDICION} placeholder="Seleccionar condición" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<GavelIcon />} label="CATEGORÍA" name="categoria" value={form.categoria} onChange={handleChange} select options={getCategoriasDisponibles()} placeholder="Seleccionar categoría" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <InputField icon={<AccessTimeIcon />} label="DEDICACIÓN" name="dedicacion" value={form.dedicacion} onChange={handleChange} select options={getDedicacionesDisponibles()} placeholder="Seleccionar dedicación" />
                </Grid>
                {/* esBecario */}
                <Grid item xs={12}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.esBecario ?? false}
                          onChange={(e) => handleChange('esBecario', e.target.checked)}
                        />
                      }
                      label="¿Docente becado por la UNT?"
                      sx={{ mb: 0.5 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, ml: 4 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: '2px' }} />
                      <Typography variant="caption" color="text.secondary">
                        Un Docente solventado por la UNT NO puede tomar carga adicional en Filiales. (Art. 14.1)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                {/* Tipo de Investigación + Dependencias */}
                <Grid item xs={12} md={6}>
                  {esTcDe ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
                        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
                          <SchoolIcon />
                        </Box>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          TIPO DE INVESTIGACIÓN
                        </Typography>
                      </Box>
                      <TextField
                        select
                        fullWidth
                        value={form.investigacion}
                        onChange={(e) => handleChange('investigacion', e.target.value)}
                        SelectProps={{
                          displayEmpty: true,
                          renderValue: (selected: any) => {
                            if (!selected) return <span style={{ color: '#9ca3af' }}>Seleccionar tipo</span>;
                            const opt = OPTIONS_INVESTIGACION.find((o) => o.value === selected);
                            return opt?.label || selected;
                          },
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f9fafb', fontSize: '0.88rem', borderRadius: '8px' } }}
                      >
                        <MenuItem value="" sx={{ color: '#9ca3af' }}>Seleccionar tipo</MenuItem>
                        {OPTIONS_INVESTIGACION.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
                        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
                          <SchoolIcon />
                        </Box>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          TIPO DE INVESTIGACIÓN
                        </Typography>
                      </Box>
                      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, px: 1.75, minHeight: 56, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1, boxSizing: 'border-box' }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Solo disponible para docentes TC o DE
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {!esTcDe ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
                        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon />
                        </Box>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          DEPENDENCIAS
                        </Typography>
                      </Box>
                      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, px: 1.75, minHeight: 56, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1, boxSizing: 'border-box' }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Solo disponible para docentes TC o DE
                        </Typography>
                      </Box>
                    </Box>
                  ) : form.esBecario ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
                        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon />
                        </Box>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          DEPENDENCIAS
                        </Typography>
                      </Box>
                      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, px: 1.75, minHeight: 56, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1, boxSizing: 'border-box' }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Docentes becados no pueden registrar dependencias
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
                        <Box sx={{ color: '#003366', display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon />
                        </Box>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          DEPENDENCIAS
                        </Typography>
                      </Box>
                      <Autocomplete
                        multiple
                        options={DEPENDENCIAS_OPTIONS}
                        value={form.dependencias || ['Ninguno']}
                        onChange={(_, newValue) => {
                          if (newValue.includes('Ninguno') && newValue.length > 1) {
                            handleChange('dependencias', newValue.filter(v => v !== 'Ninguno'));
                          } else if (!newValue.includes('Ninguno') && newValue.length === 0) {
                            handleChange('dependencias', ['Ninguno']);
                          } else {
                            handleChange('dependencias', newValue);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Seleccione dependencias..."
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f9fafb', fontSize: '0.88rem', borderRadius: '8px' } }}
                          />
                        )}
                      />
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InputField icon={<CalendarMonthIcon />} label="FECHA INGRESO" name="fechaIngreso" value={form.fechaIngreso} onChange={handleChange} type="date" placeholder="yyyy-mm-dd" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InputField icon={<NumbersIcon />} label="ANTIGÜEDAD (AÑOS)" name="antiguedadAnios" value={form.antiguedadAnios} onChange={handleChange} type="number" readOnly placeholder="0" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InputField icon={<InventoryIcon />} label="CÓDIGO IBM" name="codigoIBM" value={form.codigoIBM} onChange={handleChange} placeholder="0000" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<FlagIcon />} label="CARGO DE GOBIERNO" name="cargoGobierno" value={form.cargoGobierno} onChange={handleChange} select options={OPTIONS_CARGO_GOBIERNO} placeholder="Sin Cargo" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InputField icon={<FlagIcon />} label="CARGO GESTIÓN INSTITUCIONAL" name="cargoGestionInstitucional" value={form.cargoGestionInstitucional} onChange={handleChange} select options={OPTIONS_CARGO_GESTION} placeholder="Sin Cargo" />
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Tooltip title={!hayCambios ? 'No hay cambios para guardar' : 'Guardar cambios'}>
            <span>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleGuardar}
                disabled={!hayCambios || guardando}
                size="large"
                sx={{
                  bgcolor: '#003366',
                  borderRadius: '24px',
                  px: 5,
                  py: 1.2,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.8px',
                  '&:hover': { bgcolor: '#002244' },
                  '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
                }}
              >
                {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          icon={toast.severity === 'success' ? <CheckCircleIcon /> : undefined}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            minWidth: 280,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
