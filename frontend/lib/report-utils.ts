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

  doc.save(`(FORMATO # 1) Carga Horaria Asignada (Sede Central).pdf`);
};

export const generateFormato1Excel = async (data: ReportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Formato N° 1');
  const AZUL_UNT_HEX = '003366';
  const BLANCO_HEX = 'FFFFFF';
  const GRIS_CLARO_HEX = 'F8FAFC';

  // Configuración de columnas
  worksheet.columns = [
    { width: 15 }, { width: 45 }, { width: 8 }, { width: 20 }, { width: 8 }, 
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }
  ];

  // --- CABECERA INSTITUCIONAL ---
  worksheet.mergeCells('A1:K1');
  const inst1 = worksheet.getCell('A1');
  inst1.value = 'UNIVERSIDAD NACIONAL DE TRUJILLO';
  inst1.font = { bold: true, size: 16, color: { argb: BLANCO_HEX } };
  inst1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
  inst1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:K2');
  const inst2 = worksheet.getCell('A2');
  inst2.value = 'Sistema de Gestión de Horarios Académicos';
  inst2.font = { bold: true, size: 11, color: { argb: BLANCO_HEX } };
  inst2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_UNT_HEX } };
  inst2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Títulos del Formato
  worksheet.addRow([]);
  worksheet.mergeCells('A4:K4');
  const title1 = worksheet.getCell('A4');
  title1.value = 'FORMATO N° 1';
  title1.alignment = { horizontal: 'center' };
  title1.font = { bold: true, size: 12 };

  worksheet.mergeCells('A5:K5');
  const title2 = worksheet.getCell('A5');
  title2.value = 'DECLARACION DE CARGA HORARIA ASIGNADA';
  title2.alignment = { horizontal: 'center' };
  title2.font = { bold: true, size: 12 };

  // Datos Profesor
  worksheet.addRow([]);
  worksheet.addRow(['I. DATOS SOBRE LA SITUACION DEL PROFESOR:']);
  worksheet.getCell(`A${worksheet.lastRow?.number}`).font = { bold: true };

  worksheet.addRow(['FACULTAD:', (data.docente.facultad || 'INGENIERÍA').toUpperCase()]);
  worksheet.addRow(['DPTO. ACADEMICO:', (data.docente.departamento || 'INGENIERÍA DE SISTEMAS').toUpperCase()]);

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['NOMBRE COMPLETO', '', '', 'CONDICION', '', 'CATEGORIA', '', 'MODALIDAD']);
  worksheet.mergeCells(`A${headerRow.number}:C${headerRow.number}`);
  worksheet.mergeCells(`D${headerRow.number}:E${headerRow.number}`);
  worksheet.mergeCells(`F${headerRow.number}:G${headerRow.number}`);
  worksheet.mergeCells(`H${headerRow.number}:K${headerRow.number}`);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const dataRow = worksheet.addRow([data.docente.nombreCompleto.toUpperCase(), '', '', data.docente.condicion.toUpperCase(), '', data.docente.categoria.toUpperCase(), '', data.docente.modalidad.toUpperCase()]);
  worksheet.mergeCells(`A${dataRow.number}:C${dataRow.number}`);
  worksheet.mergeCells(`D${dataRow.number}:E${dataRow.number}`);
  worksheet.mergeCells(`F${dataRow.number}:G${dataRow.number}`);
  worksheet.mergeCells(`H${dataRow.number}:K${dataRow.number}`);
  dataRow.eachCell(cell => {
    cell.alignment = { horizontal: 'center' };
    cell.font = { size: 9 };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Ciclo y Fechas
  worksheet.addRow([]);
  const infoRow = worksheet.addRow([
    'AÑO ACADEMICO:', data.ciclo.nombre.split('-')[0], 
    'CICLO(SEM):', data.ciclo.nombre.split('-')[1], 
    '', '', '', '', '', 
    `INICIO: ${data.ciclo.fechaInicio}`, `FINAL: ${data.ciclo.fechaFinal}`
  ]);
  infoRow.font = { size: 9 };
  infoRow.getCell(1).font = { bold: true };
  infoRow.getCell(3).font = { bold: true };

  // Tabla Lectiva
  worksheet.addRow([]);
  const tableHeader = worksheet.addRow(['1. TRABAJO LECTIVO.- Datos completos y con claridad']);
  worksheet.mergeCells(`A${tableHeader.number}:K${tableHeader.number}`);
  tableHeader.getCell(1).font = { bold: true, size: 10 };
  tableHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

  const subHeader = worksheet.addRow(['CODIGO', 'NOMBRE DEL CURSO', 'CUR.', 'ESCUELA PROF.', 'CIC.', 'SEC.', 'N° AL.', 'H.T.', 'H.P.', 'H.L.', 'Total']);
  subHeader.eachCell(cell => {
    cell.font = { bold: true, size: 8 };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  if (data.cargaLectiva.length > 0) {
    data.cargaLectiva.forEach(curso => {
      const row = worksheet.addRow([
        curso.codigo || '-', curso.nombre, 'OB', 'SISTEMAS', curso.ciclo || '-', 'A', '50',
        `${curso.horasT}x${curso.gruposT}`, `${curso.horasP}x${curso.gruposP}`, `${curso.horasL}x${curso.gruposL}`, curso.totalHoras
      ]);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center' };
        cell.font = { size: 8 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      row.getCell(2).alignment = { horizontal: 'left' };
    });
  } else {
    const row = worksheet.addRow(['-', 'SIN CARGA LECTIVA ASIGNADA', '-', '-', '-', '-', '-', '0', '0', '0', '0']);
    worksheet.mergeCells(`B${row.number}:G${row.number}`);
    row.eachCell(cell => {
      cell.alignment = { horizontal: 'center' };
      cell.font = { size: 8 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  }

  // Carga No Lectiva
  const sections = [
    { l: '2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', h: data.cargaNoLectiva.horasPreparacion, d: data.cargaNoLectiva.detallePreparacion },
    { l: '3. CONSEJERIA Y TUTORIA', h: data.cargaNoLectiva.horasTutoria, d: data.cargaNoLectiva.detalleTutoria },
    { l: '4. INVESTIGACIÓN', h: data.cargaNoLectiva.horasInvestigacion, d: data.cargaNoLectiva.detalleInvestigacion },
    { l: '5. CAPACITACIÓN', h: data.cargaNoLectiva.horasCapacitacion, d: data.cargaNoLectiva.detalleCapacitacion },
    { l: '6. ACTIVIDADES DE GOBIERNO', h: data.cargaNoLectiva.horasGobierno, d: data.cargaNoLectiva.detalleGobierno },
    { l: '7. ACTIVIDADES DE ADMINISTRACION', h: data.cargaNoLectiva.horasAdministracion, d: data.cargaNoLectiva.detalleAdministracion },
    { l: '8. ASESORIA DE TESIS...', h: data.cargaNoLectiva.horasAsesoria, d: data.cargaNoLectiva.detalleAsesoria },
    { l: '9. RESPONSABILIDAD SOCIAL', h: data.cargaNoLectiva.horasResponsabilidadSocial, d: data.cargaNoLectiva.detalleResponsabilidadSocial },
    { l: '10. COMITES TECNICOS', h: data.cargaNoLectiva.horasComites, d: data.cargaNoLectiva.detalleComites },
  ];

  sections.forEach(sec => {
    const row = worksheet.addRow([sec.l, '', '', sec.d, '', '', '', '', '', '', Math.round(sec.h)]);
    worksheet.mergeCells(`A${row.number}:C${row.number}`);
    worksheet.mergeCells(`D${row.number}:J${row.number}`);
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
      cell.font = { size: 8 };
    });
    row.getCell(1).font = { bold: true, size: 8 };
    row.getCell(11).alignment = { horizontal: 'center' };
  });

  // Total
  const totalRow = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'TOTAL SEMANAL', Math.round(data.totalHoras)]);
  totalRow.getCell(10).font = { bold: true, size: 9 };
  totalRow.getCell(11).font = { bold: true, size: 10 };
  totalRow.getCell(11).alignment = { horizontal: 'center' };
  totalRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  totalRow.getCell(11).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

  // Firmas
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  const firmaRow = worksheet.addRow(['', '__________________________', '', '', '', '__________________________', '', '', '', '__________________________']);
  firmaRow.alignment = { horizontal: 'center' };
  const labelRow = worksheet.addRow(['', 'Firma del Profesor', '', '', '', 'Firma del Director', '', '', '', 'V° B° Decano']);
  labelRow.alignment = { horizontal: 'center' };
  labelRow.font = { size: 8, italic: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `(FORMATO # 1) Carga Horaria Asignada (Sede Central).xlsx`);
};
