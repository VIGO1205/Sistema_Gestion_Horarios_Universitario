import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ReportData {
  ciclo: {
    nombre: string;
    fechaInicio: string;
    fechaFinal: string;
  };
  docente: {
    nombreCompleto: string;
    facultad: string;
    departamento: string;
    condicion: string;
    categoria: string;
    modalidad: string;
  };
  cargaLectiva: any[];
  cargaNoLectiva: {
    horasPreparacion: number;
    detallePreparacion: string;
    horasTutoria: number;
    detalleTutoria: string;
    horasInvestigacion: number;
    detalleInvestigacion: string;
    horasCapacitacion: number;
    detalleCapacitacion: string;
    horasGobierno: number;
    detalleGobierno: string;
    horasAdministracion: number;
    detalleAdministracion: string;
    horasAsesoria: number;
    detalleAsesoria: string;
    horasResponsabilidadSocial: number;
    detalleResponsabilidadSocial: string;
    horasComites: number;
    detalleComites: string;
    firma?: string;
  };
  totalHoras: number;
}

export const generateFormato1PDF = async (data: ReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as any;

  // --- CARGA DE FUENTES (Estilo Institucional) ---
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
      doc.addFileToVFS(`${name}.ttf`, b64);
      doc.addFont(`${name}.ttf`, name, 'normal');
    } catch (e) {
      console.warn(`Fallo al cargar fuente ${name} desde ${url}`, e);
    }
  };

  await loadAndRegisterFont('/fonts/trebuc.ttf', 'Trebuchet');
  await loadAndRegisterFont('/fonts/trebucbd.ttf', 'Trebuchet-Bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const AZUL_UNT: [number, number, number] = [0, 51, 102];

  // --- CABECERA INSTITUCIONAL ---
  const headerHeight = 35;
  doc.setFillColor(AZUL_UNT[0], AZUL_UNT[1], AZUL_UNT[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD NACIONAL DE TRUJILLO', pageWidth / 2, headerHeight * 0.45, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Sistema de Gestión de Horarios Académicos', pageWidth / 2, headerHeight * 0.7, { align: 'center' });

  // --- TÍTULOS DEL FORMATO ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMATO N° 1', pageWidth / 2, headerHeight + 10, { align: 'center' });
  doc.text('DECLARACION DE CARGA HORARIA ASIGNADA', pageWidth / 2, headerHeight + 15, { align: 'center' });

  // --- SECCIÓN I: DATOS DEL PROFESOR ---
  doc.setFontSize(9);
  doc.text('I. DATOS SOBRE LA SITUACION DEL PROFESOR:', margin, headerHeight + 25);
  
  // Tabla de datos del profesor (Facultad y Dpto)
  autoTable(doc, {
    startY: headerHeight + 27,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
    body: [
      [
        { content: 'FACULTAD:', styles: { fontStyle: 'bold', cellWidth: 40 } },
        { content: data.docente.facultad || 'INGENIERÍA' },
      ],
      [
        { content: 'DPTO. ACADEMICO:', styles: { fontStyle: 'bold', cellWidth: 40 } },
        { content: data.docente.departamento || 'INGENIERÍA DE SISTEMAS' },
      ]
    ],
  });

  // Cuadro de Condición, Categoría, Modalidad
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 2,
    margin: { left: margin, right: margin },
    head: [['NOMBRE COMPLETO', 'CONDICION', 'CATEGORIA', 'MODALIDAD']],
    body: [[
      data.docente.nombreCompleto.toUpperCase(),
      data.docente.condicion.toUpperCase(),
      data.docente.categoria.toUpperCase(),
      data.docente.modalidad.toUpperCase()
    ]],
    theme: 'grid',
    styles: { fontSize: 7, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
  });

  const finalYHeader = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('AÑO ACADEMICO:', margin, finalYHeader + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ciclo.nombre.split('-')[0] || '', margin + 30, finalYHeader + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('CICLO(SEM):', margin + 50, finalYHeader + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ciclo.nombre.split('-')[1] || '', margin + 70, finalYHeader + 6);

  doc.text(`INICIO: ${data.ciclo.fechaInicio}  -  FINAL: ${data.ciclo.fechaFinal}`, pageWidth - margin, finalYHeader + 6, { align: 'right' });

  // --- 1. TRABAJO LECTIVO ---
  autoTable(doc, {
    startY: finalYHeader + 10,
    margin: { left: margin, right: margin },
    head: [[
      { content: '1. TRABAJO LECTIVO.- Datos completos y con claridad', colSpan: 11, styles: { halign: 'left', fillColor: [240, 240, 240], fontStyle: 'bold' } }
    ], [
      'CODIGO', 'NOMBRE DEL CURSO', 'CUR.', 'ESCUELA PROF.', 'CIC.', 'SEC.', 'N° AL.', 'H.T.', 'H.P.', 'H.L.', 'Total'
    ]],
    body: data.cargaLectiva.length > 0 ? data.cargaLectiva.map(curso => [
      curso.codigo || '-',
      curso.nombre,
      'OB',
      'SISTEMAS',
      curso.ciclo || '-',
      'A',
      '50',
      `${curso.horasT}x${curso.gruposT}`,
      `${curso.horasP}x${curso.gruposP}`,
      `${curso.horasL}x${curso.gruposL}`,
      curso.totalHoras
    ]) : [['-', 'SIN CARGA LECTIVA ASIGNADA', '-', '-', '-', '-', '-', '0', '0', '0', '0']],
    theme: 'grid',
    styles: { fontSize: 6, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
    columnStyles: {
      1: { halign: 'left', cellWidth: 'auto' },
    }
  });

  // --- SECCIONES 2-10 (Carga No Lectiva) ---
  const noLectivaRows = [
    { label: '2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', h: data.cargaNoLectiva.horasPreparacion, d: data.cargaNoLectiva.detallePreparacion },
    { label: '3. CONSEJERIA Y TUTORIA: señalar número de alumnos y el ciclo academico con los que se desarrolla. (Como minimo una 01 hora semanal).', h: data.cargaNoLectiva.horasTutoria, d: data.cargaNoLectiva.detalleTutoria },
    { label: '4. INVESTIGACIÓN: Consignar el nro de inscripción, código, nombre y duración del proyecto. (Como mínimo 04 y 05 horas semanales, según modalidad de trabajo de docentes ordinarios).', h: data.cargaNoLectiva.horasInvestigacion, d: data.cargaNoLectiva.detalleInvestigacion },
    { label: '5. CAPACITACIÓN: Señale lo referente a este rubro en el marco de los planes de cada Facultad (como máximo 05 semanales)', h: data.cargaNoLectiva.horasCapacitacion, d: data.cargaNoLectiva.detalleCapacitacion },
    { label: '6. ACTIVIDADES DE GOBIERNO: Se desempeña cargo indique', h: data.cargaNoLectiva.horasGobierno, d: data.cargaNoLectiva.detalleGobierno },
    { label: '7. ACTIVIDADES DE ADMINISTRACION: Si desempeña cargo indique.', h: data.cargaNoLectiva.horasAdministracion, d: data.cargaNoLectiva.detalleAdministracion },
    { label: '8. ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL: Indicar el numero de Resolución Decanal, precisando el nombre y duración de la actividad programada.', h: data.cargaNoLectiva.horasAsesoria, d: data.cargaNoLectiva.detalleAsesoria },
    { label: '9. RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto programa a ejecutarse en beneficio de la comunidad local o regional. (Como máximo 02 horas semanales)', h: data.cargaNoLectiva.horasResponsabilidadSocial, d: data.cargaNoLectiva.detalleResponsabilidadSocial },
    { label: '10. COMITES TECNICOS Y COMISIONES: Consignar el numero de Resolución autoritativa indicando el lapso de vigencia', h: data.cargaNoLectiva.horasComites, d: data.cargaNoLectiva.detalleComites },
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY,
    margin: { left: margin, right: margin },
    body: noLectivaRows.map(row => [
      { content: row.label, styles: { cellWidth: 90 } },
      { content: row.d || '', styles: { cellWidth: 70 } },
      { content: row.h ? Math.round(row.h).toString() : '0', styles: { halign: 'center', cellWidth: 20 } }
    ]),
    theme: 'grid',
    styles: { fontSize: 6, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 2, valign: 'middle' },
    columnStyles: {
      0: { fontStyle: 'bold' },
    }
  });

  // --- TOTAL ---
  const finalYTotal = (doc as any).lastAutoTable.finalY;
  autoTable(doc, {
    startY: finalYTotal,
    margin: { left: margin, right: margin },
    body: [[
      { content: 'TOTAL DE HORAS SEMANALES', styles: { halign: 'right', fontStyle: 'bold', cellWidth: 160 } },
      { content: Math.round(data.totalHoras).toString(), styles: { halign: 'center', fontStyle: 'bold', cellWidth: 20, fillColor: [240, 240, 240] } }
    ]],
    theme: 'grid',
    styles: { fontSize: 7, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 2 },
  });

  // --- PIE DE PÁGINA Y FIRMAS ---
  const footerY = (doc as any).lastAutoTable.finalY + 10;
  const fechaActual = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Trujillo, ${fechaActual}`, pageWidth - margin, footerY, { align: 'right' });

  const firmaWidth = 50;
  const firmaY = footerY + 25;

  // --- INSERTAR FIRMA SI EXISTE ---
  if (data.cargaNoLectiva.firma) {
    try {
      // La firma se guarda como DataURL (base64)
      doc.addImage(data.cargaNoLectiva.firma, 'PNG', margin, firmaY - 20, firmaWidth, 20);
    } catch (e) {
      console.error('Error al insertar firma en PDF:', e);
    }
  }

  // Línea Firma Profesor
  doc.setLineWidth(0.2);
  doc.line(margin, firmaY, margin + firmaWidth, firmaY);
  doc.text('Firma del Profesor', margin + firmaWidth / 2, firmaY + 4, { align: 'center' });

  // Línea Firma Director
  doc.line(margin, firmaY + 20, margin + firmaWidth, firmaY + 20);
  doc.text('Firma del Director de Dpto.', margin + firmaWidth / 2, firmaY + 24, { align: 'center' });

  // Línea Firma Decano
  doc.line(pageWidth - margin - firmaWidth, firmaY + 20, pageWidth - margin, firmaY + 20);
  doc.text('V° B° DECANO FAC.', pageWidth - margin - firmaWidth / 2, firmaY + 24, { align: 'center' });

  // --- NÚMERO DE PÁGINA ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - Generado por Sistema de Horarios UNT`, pageWidth / 2, 290, { align: 'center' });
  }

  const blob = doc.output('blob');
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `(FORMATO # 1) Carga Horaria Asignada - ${data.docente.nombreCompleto}.pdf`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const generateFormato1Excel = async (data: ReportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Formato N° 1');
  const AZUL_UNT_HEX = '003366';
  const BLANCO_HEX = 'FFFFFF';
  const GRIS_BORDE = 'E2E8F0';

  // Configuración de columnas con anchos optimizados
  worksheet.columns = [
    { width: 12 }, // CODIGO
    { width: 45 }, // NOMBRE CURSO
    { width: 8 },  // CUR
    { width: 15 }, // ESCUELA
    { width: 6 },  // CIC
    { width: 6 },  // SEC
    { width: 8 },  // N AL
    { width: 10 }, // HT
    { width: 10 }, // HP
    { width: 10 }, // HL
    { width: 12 }  // TOTAL
  ];

  // --- CABECERA INSTITUCIONAL ESTILO WEB ---
  worksheet.mergeCells('A1:K1');
  const headerRow1 = worksheet.getCell('A1');
  headerRow1.value = 'UNIVERSIDAD NACIONAL DE TRUJILLO';
  headerRow1.font = { bold: true, size: 16, color: { argb: BLANCO_HEX }, name: 'Arial' };
  headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
  headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('A2:K2');
  const headerRow2 = worksheet.getCell('A2');
  headerRow2.value = 'Sistema de Gestión de Horarios Académicos - Facultad de Ingeniería';
  headerRow2.font = { bold: true, size: 10, color: { argb: BLANCO_HEX }, name: 'Arial' };
  headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
  headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // --- TÍTULOS ---
  worksheet.addRow([]);
  worksheet.mergeCells('A4:K4');
  const t1 = worksheet.getCell('A4');
  t1.value = 'FORMATO N° 1';
  t1.font = { bold: true, size: 12, color: { argb: AZUL_UNT_HEX } };
  t1.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A5:K5');
  const t2 = worksheet.getCell('A5');
  t2.value = 'DECLARACION DE CARGA HORARIA ASIGNADA';
  t2.font = { bold: true, size: 13, color: { argb: AZUL_UNT_HEX } };
  t2.alignment = { horizontal: 'center' };
  worksheet.addRow([]);

  // --- I. DATOS DEL PROFESOR (Estilo Cards) ---
  const subTitle = worksheet.addRow(['I. DATOS SOBRE LA SITUACIÓN DEL PROFESOR:']);
  subTitle.getCell(1).font = { bold: true, size: 10, color: { argb: AZUL_UNT_HEX } };
  worksheet.addRow([]);

  const rowFac = worksheet.addRow(['FACULTAD:', data.docente.facultad?.toUpperCase() || 'INGENIERÍA']);
  rowFac.getCell(1).font = { bold: true, size: 9 };
  const rowDpto = worksheet.addRow(['DPTO. ACADÉMICO:', data.docente.departamento?.toUpperCase() || 'INGENIERÍA DE SISTEMAS']);
  rowDpto.getCell(1).font = { bold: true, size: 9 };
  worksheet.addRow([]);

  // Header de Datos Docente (Azul)
  const docHeader = worksheet.addRow(['NOMBRE COMPLETO', '', '', 'CONDICIÓN', '', 'CATEGORÍA', '', 'MODALIDAD']);
  worksheet.mergeCells(`A${docHeader.number}:C${docHeader.number}`);
  worksheet.mergeCells(`D${docHeader.number}:E${docHeader.number}`);
  worksheet.mergeCells(`F${docHeader.number}:G${docHeader.number}`);
  worksheet.mergeCells(`H${docHeader.number}:K${docHeader.number}`);
  docHeader.eachCell(cell => {
    cell.font = { bold: true, size: 9, color: { argb: BLANCO_HEX } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const docData = worksheet.addRow([data.docente.nombreCompleto.toUpperCase(), '', '', data.docente.condicion.toUpperCase(), '', data.docente.categoria.toUpperCase(), '', data.docente.modalidad.toUpperCase()]);
  worksheet.mergeCells(`A${docData.number}:C${docData.number}`);
  worksheet.mergeCells(`D${docData.number}:E${docData.number}`);
  worksheet.mergeCells(`F${docData.number}:G${docData.number}`);
  worksheet.mergeCells(`H${docData.number}:K${docData.number}`);
  docData.eachCell(cell => {
    cell.font = { size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  worksheet.getRow(docData.number).height = 25;

  // Ciclo y Fechas
  worksheet.addRow([]);
  const cicloRow = worksheet.addRow([
    'AÑO ACADÉMICO:', data.ciclo.nombre.split('-')[0], 
    'CICLO:', data.ciclo.nombre.split('-')[1], 
    '', '', '', 
    `INICIO: ${data.ciclo.fechaInicio}`, '', '', `FINAL: ${data.ciclo.fechaFinal}`
  ]);
  cicloRow.eachCell(c => c.font = { size: 9 });
  cicloRow.getCell(1).font = { bold: true };
  cicloRow.getCell(3).font = { bold: true };

  // --- 1. TRABAJO LECTIVO ---
  worksheet.addRow([]);
  const lectivaHeader = worksheet.addRow(['1. TRABAJO LECTIVO.- Datos completos y con claridad']);
  worksheet.mergeCells(`A${lectivaHeader.number}:K${lectivaHeader.number}`);
  lectivaHeader.getCell(1).font = { bold: true, size: 10, color: { argb: BLANCO_HEX } };
  lectivaHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };

  const lectivaCols = worksheet.addRow(['CÓDIGO', 'NOMBRE DEL CURSO', 'CUR.', 'ESCUELA', 'CIC.', 'SEC.', 'N° AL.', 'H.T.', 'H.P.', 'H.L.', 'TOTAL']);
  lectivaCols.eachCell(cell => {
    cell.font = { bold: true, size: 8, color: { argb: AZUL_UNT_HEX } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  if (data.cargaLectiva.length > 0) {
    data.cargaLectiva.forEach(curso => {
      const row = worksheet.addRow([
        curso.codigo || '-', curso.nombre, 'OB', 'SISTEMAS', curso.ciclo || '-', 'A', '50',
        `${curso.horasT}x${curso.gruposT}`, `${curso.horasP}x${curso.gruposP}`, `${curso.horasL}x${curso.gruposL}`, curso.totalHoras
      ]);
      row.eachCell(cell => {
        cell.font = { size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
    });
  }

  // --- CARGA NO LECTIVA (Con ajuste de texto) ---
  worksheet.addRow([]);
  const noLectivaHeader = worksheet.addRow(['2. CARGA NO LECTIVA - DECLARACIÓN DE ACTIVIDADES']);
  worksheet.mergeCells(`A${noLectivaHeader.number}:K${noLectivaHeader.number}`);
  noLectivaHeader.getCell(1).font = { bold: true, size: 10, color: { argb: BLANCO_HEX } };
  noLectivaHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };

  const sections = [
    { l: '2. PREPARACIÓN Y EVALUACIÓN (Max 50% de Trabajo Lectivo)', h: data.cargaNoLectiva.horasPreparacion, d: data.cargaNoLectiva.detallePreparacion },
    { l: '3. CONSEJERÍA Y TUTORÍA (Mínimo 01 hora semanal)', h: data.cargaNoLectiva.horasTutoria, d: data.cargaNoLectiva.detalleTutoria },
    { l: '4. INVESTIGACIÓN (Mínimo 04-05 horas semanales)', h: data.cargaNoLectiva.horasInvestigacion, d: data.cargaNoLectiva.detalleInvestigacion },
    { l: '5. CAPACITACIÓN (Máximo 05 semanales)', h: data.cargaNoLectiva.horasCapacitacion, d: data.cargaNoLectiva.detalleCapacitacion },
    { l: '6. ACTIVIDADES DE GOBIERNO', h: data.cargaNoLectiva.horasGobierno, d: data.cargaNoLectiva.detalleGobierno },
    { l: '7. ACTIVIDADES DE ADMINISTRACIÓN', h: data.cargaNoLectiva.horasAdministracion, d: data.cargaNoLectiva.detalleAdministracion },
    { l: '8. ASESORÍA DE TESIS Y EXÁMENES PROFESIONALES', h: data.cargaNoLectiva.horasAsesoria, d: data.cargaNoLectiva.detalleAsesoria },
    { l: '9. RESPONSABILIDAD SOCIAL UNIVERSITARIA', h: data.cargaNoLectiva.horasResponsabilidadSocial, d: data.cargaNoLectiva.detalleResponsabilidadSocial },
    { l: '10. COMITÉS TÉCNICOS Y COMISIONES', h: data.cargaNoLectiva.horasComites, d: data.cargaNoLectiva.detalleComites },
  ];

  sections.forEach(sec => {
    const row = worksheet.addRow([sec.l, '', '', '', sec.d, '', '', '', '', '', Math.round(sec.h)]);
    worksheet.mergeCells(`A${row.number}:D${row.number}`);
    worksheet.mergeCells(`E${row.number}:J${row.number}`);
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
      cell.font = { size: 8.5 };
    });
    row.getCell(1).font = { bold: true, size: 8.5, color: { argb: AZUL_UNT_HEX } };
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 35; // Altura para que el texto respire
  });

  // Total Final
  const totalRow = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'TOTAL GENERAL', Math.round(data.totalHoras)]);
  totalRow.getCell(10).font = { bold: true, size: 10, color: { argb: AZUL_UNT_HEX } };
  totalRow.getCell(11).font = { bold: true, size: 11, color: { argb: BLANCO_HEX } };
  totalRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
  totalRow.getCell(11).alignment = { horizontal: 'center' };
  totalRow.getCell(11).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  worksheet.getRow(totalRow.number).height = 20;

  // Firmas Estilizadas
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  const firmaRow = worksheet.addRow(['', '__________________________', '', '', '', '__________________________', '', '', '', '__________________________']);
  firmaRow.alignment = { horizontal: 'center' };
  const labelRow = worksheet.addRow(['', 'Firma del Profesor', '', '', '', 'Firma del Director', '', '', '', 'V° B° Decano']);
  labelRow.alignment = { horizontal: 'center' };
  labelRow.font = { size: 9, italic: true, bold: true };

  // --- INSERTAR FIRMA EN EXCEL ---
  if (data.cargaNoLectiva.firma) {
    try {
      const imageId = workbook.addImage({
        base64: data.cargaNoLectiva.firma,
        extension: 'png',
      });
      
      // Posicionar sobre la línea de firma del profesor (Columna B)
      worksheet.addImage(imageId, {
        tl: { col: 1, row: labelRow.number - 3 },
        ext: { width: 150, height: 60 }
      });
    } catch (e) {
      console.error('Error al insertar firma en Excel:', e);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `(FORMATO # 1) Carga Horaria Asignada - ${data.docente.nombreCompleto}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
