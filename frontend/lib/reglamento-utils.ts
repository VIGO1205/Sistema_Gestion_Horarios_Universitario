export interface LimitesDocente {
  chl: { min: number; max: number | null };
  chnlpe: { max: number }; // hora fija o valor especial calculado
  chnlcRubros: Record<string, { max: number; omitirAcreditacion?: boolean }>;
  chnla: { max: number };
  totalJornada: number;
}

// ---- Sección 2: Ordinarios por Dedicación ----
const ORDINARIO_POR_DEDICACION: Record<string, { chl: [number, number]; chnlpe: number | '50%'; total: number }> = {
  'DEDICACION EXCLUSIVA': { chl: [16, 22], chnlpe: '50%', total: 40 },
  'TIEMPO COMPLETO':      { chl: [16, 22], chnlpe: '50%', total: 40 },
  'TIEMPO PARCIAL 20 H':  { chl: [12, 20], chnlpe: 4, total: 20 },
  'TIEMPO PARCIAL 10 H':  { chl: [8, 8], chnlpe: 2, total: 10 },
  'TIEMPO PARCIAL 08 H':  { chl: [8, 8], chnlpe: 0, total: 8 },
  'TIEMPO PARCIAL 04 H':  { chl: [4, 4], chnlpe: 0, total: 4 },
  'TIEMPO PARCIAL 16 H':  { chl: [13, 13], chnlpe: 3, total: 16 }, // valor deducido
};

// ---- Sección 6: CHNLC máxima por rubro según Dedicación ----
const CHNLC_RUBROS_POR_DEDICACION: Record<string, Record<string, number>> = {
  'DEDICACION EXCLUSIVA': { tutoria: 2, investigacion: 6, rsu: 2, asesoria: 2, capacitacion: 2, acreditacion: 2 },
  'TIEMPO COMPLETO':      { tutoria: 2, investigacion: 6, rsu: 2, asesoria: 2, capacitacion: 2, acreditacion: 2 },
  'TIEMPO PARCIAL 20 H':  { tutoria: 2, rsu: 2 },
  'TIEMPO PARCIAL 10 H':  { tutoria: 1 },
  'TIEMPO PARCIAL 08 H':  { tutoria: 1 },
  'DOCENTE INVESTIGADOR': { tutoria: 3, investigacion: 23, rsu: 3, asesoria: 2, capacitacion: 2, acreditacion: 2 },
};

// ---- Sección 3: Contratados por Categoría ----
interface ContratadoLimite {
  chl: [number, number];
  chnlpe: number;
  chnlc: { tutoria: number; rsu: number; asesoria: number };
  total: number;
}

const CONTRATADO_POR_CATEGORIA: Record<string, ContratadoLimite> = {
  tipo_a1: { chl: [20, 20], chnlpe: 6, chnlc: { tutoria: 3, rsu: 2, asesoria: 1 }, total: 32 },
  tipo_b1: { chl: [20, 20], chnlpe: 6, chnlc: { tutoria: 3, rsu: 2, asesoria: 1 }, total: 32 },
  tipo_a2: { chl: [12, 12], chnlpe: 2, chnlc: { tutoria: 1, rsu: 1, asesoria: 0 }, total: 16 },
  tipo_b2: { chl: [12, 12], chnlpe: 2, chnlc: { tutoria: 1, rsu: 1, asesoria: 0 }, total: 16 },
  tipo_a3: { chl: [8, 8], chnlpe: 0, chnlc: { tutoria: 0, rsu: 0, asesoria: 0 }, total: 8 },
  tipo_b3: { chl: [8, 8], chnlpe: 0, chnlc: { tutoria: 0, rsu: 0, asesoria: 0 }, total: 8 },
};

// ---- Sección 5: Jefe de Práctica por Dedicación ----
const JP_POR_DEDICACION: Record<string, { chl: [number, number]; chnlcPrep: number; tutoria: number; rsu: number; total: number }> = {
  'TIEMPO COMPLETO':     { chl: [20, 20], chnlcPrep: 10, tutoria: 6, rsu: 4, total: 40 },
  'TIEMPO PARCIAL 20 H': { chl: [12, 12], chnlcPrep: 6, tutoria: 2, rsu: 0, total: 20 },
  'TIEMPO PARCIAL 12 H': { chl: [10, 10], chnlcPrep: 2, tutoria: 0, rsu: 0, total: 12 },
  'TIEMPO PARCIAL 10 H': { chl: [8, 8], chnlcPrep: 2, tutoria: 0, rsu: 0, total: 10 },
};

// ---- Sección 7: Cargo de Gobierno ----
const CARGO_GOBIERNO: Record<string, { chlMin: number; chnlpeMax: number; chnlaMax: number }> = {
  'Rector':                              { chlMin: 0, chnlpeMax: 0, chnlaMax: 40 },
  'Vicerrector Académico':               { chlMin: 0, chnlpeMax: 0, chnlaMax: 40 },
  'Vicerrector de Investigación':         { chlMin: 0, chnlpeMax: 0, chnlaMax: 40 },
  'Decano':                              { chlMin: 6, chnlpeMax: 3, chnlaMax: 20 },
  'Director de la Escuela de Posgrado':  { chlMin: 6, chnlpeMax: 3, chnlaMax: 20 },
  'Integrante de Asamblea Universitaria': { chlMin: 14, chnlpeMax: 7, chnlaMax: 2 },
  'Integrante de Consejo de Facultad':   { chlMin: 14, chnlpeMax: 7, chnlaMax: 3 },
};

// ---- Sección 8: Cargo de Gestión Institucional ----
const CARGO_GESTION_INSTITUCIONAL: Record<string, { chlMin: number; chnlpeMax: number; chnlaMax: number }> = {
  'Director de la Unidad de Posgrado':                                         { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Segunda Especialidad':                                          { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Filial':                                                        { chlMin: 8, chnlpeMax: 4, chnlaMax: 15 },
  'Director de Escuela Profesional':                                           { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Departamento Académico':                                        { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Jefe de la Oficina de Gestión de la Calidad':                              { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Responsabilidad Social Universitaria':                         { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Servicios Educativos de Extensión':                            { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Jefe de la Oficina de Relaciones Nacionales e Internacionales':            { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Centro de Arbitraje y Administración de Junta de Resolución de Disputas': { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Admisión':                                                      { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Procesos Académicos':                                           { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Bienestar Universitario':                                       { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Investigación y Ética':                                        { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Innovación y Transferencia Tecnológica':                       { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Institutos de Investigación y Desarrollo':                     { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Director de Producción de Bienes y Servicios':                             { chlMin: 10, chnlpeMax: 5, chnlaMax: 10 },
  'Miembro de la Comisión Permanente de Fiscalización':                       { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Defensor Universitario':                                                    { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Miembro del Tribunal de Honor':                                             { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Miembro del Comité Electoral':                                              { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Directivo de CEPUNT':                                                       { chlMin: 8, chnlpeMax: 4, chnlaMax: 15 },
  'Directivo de CIDUNT':                                                       { chlMin: 8, chnlpeMax: 4, chnlaMax: 15 },
  'Directivos del Centro Educativo Experimental "Rafael Narváez Cadenillas"':  { chlMin: 8, chnlpeMax: 4, chnlaMax: 15 },
  'Presidente de Comité de Calidad de Facultad o Programa':                   { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Presidente de Comité de Currículo de Facultad o Programa':                 { chlMin: 12, chnlpeMax: 6, chnlaMax: 10 },
  'Integrante de Comisión Académica o Administrativa Especial':               { chlMin: 12, chnlpeMax: 6, chnlaMax: 6 }, // configurable por RCU
};

export const CARGOS_SIN_FORMATO = ['Rector', 'Vicerrector Académico', 'Vicerrector de Investigación'];

export function getLimitesReglamento(docente: {
  condicion: string;
  categoria: string;
  dedicacion: string;
  cargoGobierno?: string | null;
  cargoGestionInstitucional?: string | null;
}): LimitesDocente {
  const dedKey = docente.dedicacion?.toUpperCase().trim() || '';
  const cat = docente.categoria?.toLowerCase().trim() || '';
  const cond = docente.condicion?.toLowerCase().trim() || '';
  const cargoGob = docente.cargoGobierno?.trim() || '';
  const cargoGes = docente.cargoGestionInstitucional?.trim() || '';

  let chl: [number, number] = [0, 0];
  let chnlpeMax = 0;
  let chnlcRubrosLimites: Record<string, { max: number; omitirAcreditacion?: boolean }> = {};
  let chnlaMax = 0;
  let totalJornada = 0;

  // ---- JEFE DE PRÁCTICA (prioridad sobre el resto) ----
  if (cat === 'jefe_practica') {
    const jp = JP_POR_DEDICACION[dedKey];
    if (jp) {
      chl = jp.chl;
      chnlpeMax = jp.chnlcPrep;
      chnlcRubrosLimites = {
        preparacion: { max: jp.chnlcPrep },
        tutoria: { max: jp.tutoria },
        rsu: { max: jp.rsu },
      };
      totalJornada = jp.total;
      return { chl: { min: chl[0], max: chl[1] }, chnlpe: { max: chnlpeMax }, chnlcRubros: chnlcRubrosLimites, chnla: { max: 0 }, totalJornada };
    }
  }

  // ---- CARGO DE GOBIERNO (sobrescribe CHLM-/CHNLPE+) ----
  if (cargoGob && CARGO_GOBIERNO[cargoGob]) {
    const cg = CARGO_GOBIERNO[cargoGob];
    chl = [cg.chlMin, 22]; // CHL max siempre 22 para DE/TC
    chnlpeMax = cg.chnlpeMax;
    chnlaMax = cg.chnlaMax;
    totalJornada = 40;

    const chnlcBase = CHNLC_RUBROS_POR_DEDICACION['DEDICACION EXCLUSIVA'] || {};
    for (const [rubro, max] of Object.entries(chnlcBase)) {
      chnlcRubrosLimites[rubro] = { max };
    }
    return { chl: { min: chl[0], max: chl[1] || null }, chnlpe: { max: chnlpeMax }, chnlcRubros: chnlcRubrosLimites, chnla: { max: chnlaMax }, totalJornada };
  }

  // ---- CARGO DE GESTIÓN INSTITUCIONAL (sobrescribe CHLM-/CHNLPE+) ----
  if (cargoGes && CARGO_GESTION_INSTITUCIONAL[cargoGes]) {
    const cg = CARGO_GESTION_INSTITUCIONAL[cargoGes];
    chl = [cg.chlMin, 22];
    chnlpeMax = cg.chnlpeMax;
    chnlaMax = cg.chnlaMax;
    totalJornada = 40;

    const chnlcBase = CHNLC_RUBROS_POR_DEDICACION['DEDICACION EXCLUSIVA'] || {};
    for (const [rubro, max] of Object.entries(chnlcBase)) {
      chnlcRubrosLimites[rubro] = { max };
    }
    return { chl: { min: chl[0], max: chl[1] || null }, chnlpe: { max: chnlpeMax }, chnlcRubros: chnlcRubrosLimites, chnla: { max: chnlaMax }, totalJornada };
  }

  // ---- CONTRATADO ----
  if (cond === 'contratado') {
    const ct = CONTRATADO_POR_CATEGORIA[cat];
    if (ct) {
      chl = ct.chl;
      chnlpeMax = ct.chnlpe;
      chnlcRubrosLimites = {
        tutoria: { max: ct.chnlc.tutoria },
        rsu: { max: ct.chnlc.rsu },
        asesoria: { max: ct.chnlc.asesoria },
      };
      totalJornada = ct.total;
      return { chl: { min: chl[0], max: chl[1] || null }, chnlpe: { max: chnlpeMax }, chnlcRubros: chnlcRubrosLimites, chnla: { max: 0 }, totalJornada };
    }
  }

  // ---- EXTRAORDINARIO (pendiente) ----
  if (cond === 'extraordinario') {
    return {
      chl: { min: 0, max: null },
      chnlpe: { max: 0 },
      chnlcRubros: {},
      chnla: { max: 0 },
      totalJornada: 0,
    };
  }

  // ---- ORDINARIO (Nombrado) ----
  // DI usa sus propios límites de CHNLC pero base DE/TC para CHL y CHNLPE
  const isDI = dedKey === 'DOCENTE INVESTIGADOR';
  const dedBaseKey = isDI ? 'DEDICACION EXCLUSIVA' : dedKey;
  const ord = ORDINARIO_POR_DEDICACION[dedBaseKey];

  if (ord) {
    chl = ord.chl;
    chnlpeMax = ord.chnlpe === '50%' ? -1 : ord.chnlpe; // -1 = se calcula como porcentaje
    totalJornada = ord.total;

    const chnlcKey = isDI ? 'DOCENTE INVESTIGADOR' : dedKey;
    const chnlcBase = CHNLC_RUBROS_POR_DEDICACION[chnlcKey] || {};
    for (const [rubro, max] of Object.entries(chnlcBase)) {
      chnlcRubrosLimites[rubro] = { max };
    }

    // TP 10 H y TP 04 H: sin no lectiva
    if (dedKey === 'TIEMPO PARCIAL 10 H' || dedKey === 'TIEMPO PARCIAL 04 H' || dedKey === 'TIEMPO PARCIAL 08 H') {
      chnlcRubrosLimites = {};
    }
  }

  return {
    chl: { min: chl[0], max: chl[1] || null },
    chnlpe: { max: chnlpeMax },
    chnlcRubros: chnlcRubrosLimites,
    chnla: { max: chnlaMax },
    totalJornada,
  };
}
