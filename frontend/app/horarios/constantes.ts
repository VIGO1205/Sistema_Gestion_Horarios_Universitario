export const LUNCH_CONFIG = {
  START: '13:00',
  END: '14:00',
  LABEL: 'ALMUERZO (FRANJA INSTITUCIONAL)',
  MESSAGE: 'No se permite programar clases entre las 13:00 y 14:00 (Franja Institucional).'
};

export const DIAS = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 7, nombre: 'Domingo' },
];

export const HORAS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
  '19:00', '20:00', '21:00', '22:00'
];

export const ACTIVIDADES_NO_LECTIVAS_LABELS: Record<string, string> = {
  horasPreparacion: 'Preparación y Evaluación (PE)',
  horasTutoria: 'Tutoría y Consejería (TC)',
  horasInvestigacion: 'Investigación (INV)',
  horasCapacitacion: 'Formación Académica y Capacitación (FAC)',
  horasGobierno: 'Actividades de Gobierno o de Autoridad (AGA)',
  horasAdministracion: 'ADMINISTRACIÓN ACADÉMICA',
  horasAsesoria: 'Asesoría de Tesis y Exámenes Profesionales (ATEP)',
  horasResponsabilidadSocial: 'Responsabilidad Social Universitaria (RSU)',
  horasComites: 'Comités y Comisiones Especiales (CC)',
  horasAaai: 'Actividades de Gestión Institucional (AAAI)',
  horasAaep: 'Autoevaluación/Acreditación Esc. Profesional (AAEP)',
};

export const HORA_INICIO_TABLA = 7;
export const HORA_ALTURA_FILA = 80;
export const HORA_ALTURA_HEADER = 0;
export const HORA_SPACER_HEIGHT = 40;
