import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Horario, TipoClaseHorario, ActividadNoLectiva } from '../../entities/horario.entity';
import { Docente } from '../../entities/docente.entity';
import { Reporte, EstadoReporte, TipoFormato } from '../../entities/reporte.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { CargaAcademica } from '../../entities/carga-academica.entity';
import { CicloAcademico } from '../../entities/ciclo-academico.entity';
import { CiclosService } from '../ciclos/ciclos.service';

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Reporte)
    private reporteRepo: Repository<Reporte>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    @InjectRepository(CargaNoLectiva)
    private cargaNoLectivaRepo: Repository<CargaNoLectiva>,
    @InjectRepository(DocenteCarrera)
    private docenteCarreraRepo: Repository<DocenteCarrera>,
    @InjectRepository(Carrera)
    private carreraRepo: Repository<Carrera>,
    @InjectRepository(CargaAcademica)
    private cargaAcademicaRepo: Repository<CargaAcademica>,
    @InjectRepository(CicloAcademico)
    private cicloRepo: Repository<CicloAcademico>,
    private ciclosService: CiclosService,
  ) {}

  async crearReportesAutomaticos(docenteId: number, cicloId: number): Promise<void> {
    const formatos = [
      { formato: TipoFormato.FORMATO_1_CARGA_CENTRAL, sede: 'Sede Central' },
      { formato: TipoFormato.FORMATO_2_DJ_CENTRAL, sede: 'Sede Central' },
      { formato: TipoFormato.FORMATO_1_CARGA_DESCONCENTRADA, sede: 'Sedes Desconcentradas', estado: EstadoReporte.STANDBY },
      { formato: TipoFormato.FORMATO_2_DJ_DESCONCENTRADA, sede: 'Sedes Desconcentradas' },
      { formato: TipoFormato.FORMATO_3_HORARIO, sede: 'Sede Central' },
    ];

    for (const f of formatos) {
      const reporte = this.reporteRepo.create({
        docenteId,
        cicloId,
        formato: f.formato,
        sede: f.sede,
        estado: f.estado || EstadoReporte.PENDIENTE,
      });
      await this.reporteRepo.save(reporte);
    }
  }

  async findAll(docenteId?: number, cicloId?: number): Promise<Reporte[]> {
    const where: any = {};
    if (docenteId) where.docenteId = docenteId;
    if (cicloId) where.cicloId = cicloId;
    
    const reportes = await this.reporteRepo.find({
      where,
      relations: ['docente', 'ciclo'],
      order: { createdAt: 'DESC' },
    });

    // Sincronizar estado con la Carga Académica (la fuente de verdad de la firma)
    for (const reporte of reportes) {
      const ca = await this.cargaAcademicaRepo.findOne({
        where: { docenteId: reporte.docenteId, cicloId: reporte.cicloId }
      });

      // Si no hay carga académica o no está finalizada (con firma), el reporte debe estar PENDIENTE
      // Esto corrige reportes que quedaron como "firmados" por error antes de la nueva lógica
      if (!ca || (ca.estado !== 'finalizado' && ca.estado !== 'validado')) {
        if (reporte.estado === EstadoReporte.FIRMADO) {
          reporte.estado = EstadoReporte.PENDIENTE;
          await this.reporteRepo.save(reporte);
        }
      }
    }

    return reportes;
  }

  async firmar(id: number): Promise<Reporte> {
    const reporte = await this.reporteRepo.findOne({ 
      where: { id },
      relations: ['docente']
    });
    if (!reporte) throw new BadRequestException('Reporte no encontrado');
    if (reporte.estado === EstadoReporte.STANDBY) throw new BadRequestException('Este reporte está en standby');

    // Verificar si el docente tiene una firma guardada en su perfil
    if (!reporte.docente?.firmaBase64) {
      throw new BadRequestException('Debe configurar su firma digital en la sección de Carga Académica antes de firmar reportes.');
    }

    reporte.estado = EstadoReporte.FIRMADO;
    reporte.fechaFirma = new Date();
    return this.reporteRepo.save(reporte);
  }

  async generarPDFReporte(id: number): Promise<{ pdf: Buffer; filename: string }> {
    const reporte = await this.reporteRepo.findOne({ 
      where: { id },
      relations: ['docente', 'ciclo']
    });
    if (!reporte) throw new BadRequestException('Reporte no encontrado');

    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Delegar según el formato
    if (reporte.formato === TipoFormato.FORMATO_2_DJ_CENTRAL) {
      await this.generarFormato2DJCentral(doc, reporte);
    } else if (reporte.formato === TipoFormato.FORMATO_2_DJ_DESCONCENTRADA) {
      await this.generarFormato2DJDesconcentrada(doc, reporte);
    } else if (reporte.formato === TipoFormato.FORMATO_3_HORARIO) {
      await this.generarFormato3Horario(doc, reporte);
    } else {
      // Por defecto el Formato 1 (o mientras implementamos el resto)
      await this.generarFormato1Carga(doc, reporte);
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `${reporte.formato} - ${reporte.docente.nombreCompleto}.pdf`;

    return { pdf: pdfBuffer, filename };
  }

  private async generarFormato1Carga(doc: any, reporte: Reporte) {
    // Obtener datos del docente
    const docenteId = reporte.docenteId;
    const cicloId = reporte.cicloId;

    // Obtener carga lectiva
    const cargaLectiva = await this.asignacionRepo.find({ 
      where: { docenteId },
      relations: ['curso']
    });

    // Obtener horarios para calcular horas
    const horarios = await this.horarioRepo.find({ where: { docenteId } });

    // Agrupar carga lectiva
    const cargaLectivaAgrupada = this.agruparCargaLectiva(cargaLectiva, horarios);

    // Obtener carga académica con su carga no lectiva y firma
    const cargaAcademica = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['cargaNoLectiva', 'docente']
    });
    
    const cargaNoLectiva = cargaAcademica?.cargaNoLectiva;
    const firma = (reporte.estado === EstadoReporte.FIRMADO) ? (cargaAcademica?.docente?.firmaBase64 || null) : null;
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });

    const docenteCarrera = await this.docenteCarreraRepo.findOne({
      where: { docente: { id: docenteId } },
      relations: ['carrera']
    });
    const facultad = docenteCarrera?.carrera?.facultad || 'INGENIERÍA';
    const departamento = docenteCarrera?.carrera?.nombre || 'INGENIERÍA DE SISTEMAS';

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // --- TÍTULOS ---
    let currentY = 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('FORMATO N° 1', pageWidth / 2, currentY, { align: 'center' });
    doc.text('DECLARACION DE CARGA HORARIA ASIGNADA', pageWidth / 2, currentY + 6, { align: 'center' });

    // --- SECCIÓN I: DATOS DEL PROFESOR ---
    currentY += 15;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('I. DATOS SOBRE LA SITUACION DEL PROFESOR:', margin, currentY);
    currentY += 4;
    
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    
    // Fila Facultad
    doc.text('FACULTAD:', margin, currentY + 4);
    doc.setFillColor(242, 242, 242);
    doc.rect(margin + 35, currentY, contentWidth - 35, 6, 'F');
    doc.text((facultad || 'Ingeniería'), margin + 35 + (contentWidth - 35)/2, currentY + 4, { align: 'center' });
    currentY += 7;

    // Fila Departamento
    doc.text('DPTO. ACADEMICO:', margin, currentY + 4);
    doc.setFillColor(242, 242, 242); 
    doc.rect(margin + 35, currentY, contentWidth - 35, 6, 'F');
    doc.text((departamento || 'Dpto. de Ingeniería de Sistemas'), margin + 35 + (contentWidth - 35)/2, currentY + 4, { align: 'center' });
    
    currentY += 10;

    // Tabla de datos del docente
    const teacherDataY = currentY;
    const teacherCols = [75, 30, 35, 40];
    let xOffset = margin;
    
    const teacherHeaders = ['NOMBRE COMPLETO', 'CONDICION', 'CATEGORIA', 'MODALIDAD'];
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setDrawColor(0);
    
    teacherHeaders.forEach((h, i) => {
      doc.rect(xOffset, teacherDataY, teacherCols[i], 6);
      doc.text(h, xOffset + teacherCols[i]/2, teacherDataY + 4, { align: 'center' });
      xOffset += teacherCols[i];
    });

    xOffset = margin;
    const teacherValues = [
      (docente?.nombreCompleto || '').toUpperCase(),
      (docente?.tipoContrato || '').toUpperCase(),
      (docente?.categoria || '').toUpperCase(),
      (docente?.dedicacion || '').toUpperCase()
    ];
    
    teacherValues.forEach((v, i) => {
      doc.rect(xOffset, teacherDataY + 6, teacherCols[i], 8);
      const textWidth = doc.getTextWidth(v);
      doc.text(v, xOffset + (teacherCols[i] - textWidth) / 2, teacherDataY + 11);
      xOffset += teacherCols[i];
    });

    currentY += 14;

    doc.rect(margin, currentY, contentWidth, 7);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const cicloNombre = reporte.ciclo.nombre || '';
    doc.text('AÑO ACADEMICO:  ' + (cicloNombre.split('-')[0] || ''), margin + 2, currentY + 5);
    doc.text('CICLO(SEM):  ' + (cicloNombre.split('-')[1] || ''), margin + 45, currentY + 5);

    const formatDatePDF = (date: any) => {
      if (!date) return '-';
      const d = new Date(date);
      // Para columnas tipo 'date' en Postgres, TypeORM devuelve objetos Date en medianoche UTC
      // Usamos los métodos UTC para evitar desfases de zona horaria local del servidor
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    const fechaInicioStr = formatDatePDF(reporte.ciclo.fechaInicio);
    const fechaFinStr = formatDatePDF(reporte.ciclo.fechaFin);
    
    doc.setFont('times', 'bold');
    doc.text(`INICIO: ${fechaInicioStr}  -  FINAL: ${fechaFinStr}`, pageWidth - margin - 2, currentY + 5, { align: 'right' });
    doc.setFont('times', 'normal');

    currentY += 12;

    // --- 1. TRABAJO LECTIVO ---
    doc.setFontSize(9);
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, currentY, contentWidth, 6, 'FD');
    doc.text('1. TRABAJO LECTIVO.- Datos completos y con claridad', margin + 2, currentY + 4.5);
    currentY += 6;

    const headers = ['CODIGO', 'NOMBRE DEL CURSO', 'CUR.', 'ESCUELA PROF.', 'CIC.', 'SEC.', 'N° AL.', 'H.T.', 'H.P.', 'H.L.', 'Total'];
    const colWidths = [15, 55, 10, 25, 8, 8, 10, 14, 14, 14, 7];
    
    let xPos = margin;
    doc.setFontSize(7.5);
    headers.forEach((header, i) => {
      doc.rect(xPos, currentY, colWidths[i], 8);
      doc.text(header, xPos + colWidths[i]/2, currentY + 5, { align: 'center' });
      xPos += colWidths[i];
    });
    
    currentY += 8;
    
    if (cargaLectivaAgrupada.length > 0) {
      cargaLectivaAgrupada.forEach(curso => {
        xPos = margin;
        const rowData = [
          curso.codigo || '-',
          curso.nombre || '-',
          'OB',
          'Ing. Sistemas',
          String(curso.ciclo || '-'),
          'A',
          '50',
          `${Math.round(curso.horasT || 0)} x ${Math.round(curso.gruposT || 0)}`,
          `${Math.round(curso.horasP || 0)} x ${Math.round(curso.gruposP || 0)}`,
          `${Math.round(curso.horasL || 0)} x ${Math.round(curso.gruposL || 0)}`,
          String(Math.round(curso.totalHoras || 0))
        ];
        
        const lines = doc.splitTextToSize(String(curso.nombre), colWidths[1] - 4);
        const rowHeight = Math.max(7, lines.length * 3.5 + 2);

        rowData.forEach((data, i) => {
          doc.rect(xPos, currentY, colWidths[i], rowHeight);
          const splitText = doc.splitTextToSize(String(data), colWidths[i] - 2);
          const textHeight = splitText.length * 3;
          const yPos = currentY + (rowHeight - textHeight) / 2 + 2.5;
          doc.text(splitText, xPos + 2, yPos);
          xPos += colWidths[i];
        });
        currentY += rowHeight;
      });
    }

    currentY += 5;

    const noLectivaData = [
      { id: '2.', label: 'PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', h: Number(cargaNoLectiva?.horasPreparacion) || 0, d: cargaNoLectiva?.detallePreparacion || '' },
      { id: '3.', label: 'CONSEJERIA: Señalar número de alumnos y el ciclo académico con los que se desarrolla. (Como mínimo una 01 hora semanal).', h: Number(cargaNoLectiva?.horasTutoria) || 0, d: cargaNoLectiva?.detalleTutoria || '' },
      { id: '4.', label: 'INVESTIGACION: Consignar el N° de inscripción, código, nombre y duración del proyecto. (Como mínimo 04 y 05 horas semanales, según modalidad de trabajo de docentes ordinarios).', h: Number(cargaNoLectiva?.horasInvestigacion) || 0, d: cargaNoLectiva?.detalleInvestigacion || '' },
      { id: '5.', label: 'CAPACITACION: Señale lo referente a este rubro en el marco de los planes de cada Facultad (como máximo 05 semanales).', h: Number(cargaNoLectiva?.horasCapacitacion) || 0, d: cargaNoLectiva?.detalleCapacitacion || '' },
      { id: '6.', label: 'ACTIVIDADES DE GOBIERNO: Si desempeña cargo indique.', h: Number(cargaNoLectiva?.horasGobierno) || 0, d: cargaNoLectiva?.detalleGobierno || '' },
      { id: '7.', label: 'ACTIVIDADES DE ADMINISTRACION: Si desempeña cargo indique.', h: Number(cargaNoLectiva?.horasAdministracion) || 0, d: cargaNoLectiva?.detalleAdministracion || '' },
      { id: '8.', label: 'ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL: Indicar el número de Resolución Decanal, precisando el nombre y duración de la actividad programada.', h: Number(cargaNoLectiva?.horasAsesoria) || 0, d: cargaNoLectiva?.detalleAsesoria || '' },
      { id: '9.', label: 'RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto programa a ejecutarse n beneficio de la comunidad local o regional. (Como máximo 02 horas semanales)', h: Number(cargaNoLectiva?.horasResponsabilidadSocial) || 0, d: cargaNoLectiva?.detalleResponsabilidadSocial || '' },
      { id: '10.', label: 'COMITES TECNICOS Y COMISIONES: Consignar el número de Resolución autoritativa indicando el lapso de vigencia.', h: Number(cargaNoLectiva?.horasComites) || 0, d: cargaNoLectiva?.detalleComites || '' },
    ];

    noLectivaData.forEach(row => {
      const col1 = 75;
      const col2 = 97;
      const col3 = 8;
      
      const labelLines = doc.splitTextToSize(`${row.id} ${row.label}`, col1 - 4);
      const detailLines = doc.splitTextToSize(row.d || '', col2 - 4);
      const rowHeight = Math.max(9, Math.max(labelLines.length, detailLines.length) * 3.5 + 2);

      doc.setFillColor(242, 242, 242);
      doc.rect(margin, currentY, col1, rowHeight, 'FD');
      doc.rect(margin + col1, currentY, col2, rowHeight);
      doc.rect(margin + col1 + col2, currentY, col3, rowHeight);
      
      doc.setFontSize(7);
      doc.text(labelLines, margin + 2, currentY + 4);
      doc.text(detailLines, margin + col1 + 2, currentY + 4);
      doc.text(String(Math.round(row.h)), margin + col1 + col2 + col3/2, currentY + rowHeight/2 + 1, { align: 'center' });
      
      currentY += rowHeight;
    });

    const totalHorasLectivas = cargaLectivaAgrupada.reduce((sum, c) => sum + (Number(c.totalHoras) || 0), 0);
    const totalHorasNoLectivas = noLectivaData.reduce((sum, row) => sum + (Number(row.h) || 0), 0);
    const totalHoras = Math.round(totalHorasLectivas + totalHorasNoLectivas);
    
    doc.setFont('times', 'bold');
    doc.text('TOTAL', margin + 172 - 2, currentY + 5, { align: 'right' });
    doc.rect(margin + 172, currentY, 8, 7);
    doc.text(String(totalHoras), margin + 176, currentY + 5, { align: 'center' });
    
    currentY += 12;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    const fechaActual = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Trujillo, ${fechaActual}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 15;
    const firmaLineLength = 55;
    
    doc.line(margin + 10, currentY, margin + 10 + firmaLineLength, currentY);
    doc.text('Firma del Profesor', margin + 10 + firmaLineLength / 2, currentY + 4, { align: 'center' });
    if (firma) {
      try { doc.addImage(firma, 'PNG', margin + 15, currentY - 18, 45, 15); } catch (e) {}
    }

    currentY += 25; 
    doc.line(margin + 10, currentY, margin + 10 + firmaLineLength, currentY);
    doc.text('Firma del Director de Dpto.', margin + 10 + firmaLineLength / 2, currentY + 4, { align: 'center' });

    doc.line(pageWidth - margin - 10 - firmaLineLength, currentY, pageWidth - margin - 10, currentY);
    doc.text('V° B° DECANO FAC.', pageWidth - margin - 10 - firmaLineLength / 2, currentY + 4, { align: 'center' });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount} - Generado por Sistema de Horarios UNT`, pageWidth / 2, 290, { align: 'center' });
    }
  }

  private async generarFormato2DJCentral(doc: any, reporte: Reporte) {
    const docenteId = reporte.docenteId;
    const cicloId = reporte.cicloId;

    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const docenteCarrera = await this.docenteCarreraRepo.findOne({
      where: { docente: { id: docenteId } },
      relations: ['carrera']
    });
    const facultad = docenteCarrera?.carrera?.facultad || 'INGENIERÍA';
    const departamento = docenteCarrera?.carrera?.nombre || 'INGENIERÍA DE SISTEMAS';

    const cargaAcademica = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['docente']
    });
    const firma = (reporte.estado === EstadoReporte.FIRMADO) ? (cargaAcademica?.docente?.firmaBase64 || null) : null;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20; 
    const contentWidth = pageWidth - 2 * margin;
    const sangria = 12.5; // 1.25cm = 12.5mm

    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);

    // Helper para dibujar texto con justificación manual (estirando espacios entre palabras)
    const justifyLine = (text: string, x: number, y: number, width: number) => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length <= 1) {
        doc.text(text, x, y);
        return;
      }
      
      const totalWordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
      const totalSpaceWidth = width - totalWordsWidth;
      const spaceBetweenWords = totalSpaceWidth / (words.length - 1);
      
      let currentX = x;
      words.forEach((word, i) => {
        doc.text(word, currentX, y);
        currentX += doc.getTextWidth(word) + spaceBetweenWords;
      });
    };

    // Helper para dibujar párrafos con sangría de primera línea y justificación completa
    const drawParagraph = (text: string, y: number) => {
      const firstLineIndent = sangria;
      
      // 1. Obtener líneas según el ancho
      const firstLineText = doc.splitTextToSize(text, contentWidth - firstLineIndent)[0];
      justifyLine(firstLineText, margin + firstLineIndent, y, contentWidth - firstLineIndent);
      y += 6;

      const remainingText = text.substring(firstLineText.length).trim();
      if (remainingText) {
        const otherLines = doc.splitTextToSize(remainingText, contentWidth);
        otherLines.forEach((line: string, index: number) => {
          // Si es la última línea del párrafo, alinear a la izquierda (comportamiento Word)
          if (index === otherLines.length - 1) {
            doc.text(line, margin, y, { align: 'left' });
          } else {
            justifyLine(line, margin, y, contentWidth);
          }
          y += 6;
        });
      }
      return y + 6; // Espacio entre párrafos
    };

    // --- ENCABEZADO ---
    let currentY = 35;
    doc.setFontSize(12);
    doc.text('FORMATO Nº 2', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFont('times', 'normal');
    const title = 'DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL';
    const splitTitle = doc.splitTextToSize(title, contentWidth - 40); 
    doc.text(splitTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += (splitTitle.length * 6) + 15;

    // --- CUERPO ---
    doc.setFontSize(11);
    const nombreDocente = (docente?.nombreCompleto || '').toUpperCase();
    const dni = docente?.dni || '________';
    const codigoIbm = docente?.codigoIBM || '0000'; 

    // Párrafos 1 al 3 con sangría de primera línea
    const p1 = `Yo, ${nombreDocente}, identificado con DNI. Nro ${dni} con Código IBM Nro ${codigoIbm} del Departamento Académico Dpto. de ${departamento} Facultad de ${facultad}; en el marco del programa de Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:`;
    currentY = drawParagraph(p1, currentY);

    const p2 = 'NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capitulo VII de las Incompatibilidades e Impedimentos, del Titulo VI: Los Profesores, del Estatuto Institucional vigente.';
    currentY = drawParagraph(p2, currentY);

    const condicion = (docente?.tipoContrato || 'Nombrado').charAt(0).toUpperCase() + (docente?.tipoContrato || 'Nombrado').slice(1).toLowerCase();
    const dedicacion = docente?.dedicacion || 'Tiempo Completo 40 H';
    const p3 = `Soy docente ${condicion}, a ${dedicacion} y NO desempeño cargo público o privado en horas que coincidan con el horario establecido en la Universidad Nacional de Trujillo (De conformidad con los articulos 270ro y 277ro del Estatuto Institucional vigente).`;
    currentY = drawParagraph(p3, currentY);

    // Párrafo 4 (Parte 1: Normal con Sangría de primera línea)
    const p4_1 = 'EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME INCURSO EN SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO,';
    
    const firstLineP4 = doc.splitTextToSize(p4_1, contentWidth - sangria)[0];
    justifyLine(firstLineP4, margin + sangria, currentY, contentWidth - sangria);
    currentY += 6;
    const remainingP4 = p4_1.substring(firstLineP4.length).trim();
    if (remainingP4) {
      const otherLinesP4 = doc.splitTextToSize(remainingP4, contentWidth);
      otherLinesP4.forEach((line: string) => {
        justifyLine(line, margin, currentY, contentWidth);
        currentY += 6;
      });
    }

    // Párrafo 4 (Parte 2: Negrita, Cursiva, Mayúscula, SIN sangría y SIN espacio extra)
    doc.setFont('times', 'bolditalic');
    const p4_2 = 'Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO ILEGALMENTE.';
    const linesP4_2 = doc.splitTextToSize(p4_2, contentWidth);
    linesP4_2.forEach((line: string, index: number) => {
      if (index === linesP4_2.length - 1) {
        doc.text(line.toUpperCase(), margin, currentY, { align: 'left' });
      } else {
        justifyLine(line.toUpperCase(), margin, currentY, contentWidth);
      }
      currentY += 6;
    });

    // --- FECHA ---
    currentY += 15;
    doc.setFont('times', 'normal');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const d = new Date();
    const fechaTexto = `Trujillo, ${d.getDate()} de ${meses[d.getMonth()]} del ${d.getFullYear()}`;
    doc.text(fechaTexto, pageWidth - margin, currentY, { align: 'right' });
    
    // --- FIRMA AL LADO DERECHO ---
    currentY += 40;
    const rightX = pageWidth - margin - 40; // Posición hacia la derecha
    doc.line(rightX - 35, currentY, rightX + 35, currentY);
    currentY += 5;
    doc.setFont('times', 'bold');
    doc.text('FIRMA DEL DECLARANTE', rightX, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`DNI: ${dni}`, rightX, currentY, { align: 'center' });

    if (firma) {
      try { doc.addImage(firma, 'PNG', rightX - 25, currentY - 35, 50, 20); } catch (e) {}
    }

    // --- NOTA AL PIE (CENTRADA Y EN 2 LÍNEAS) ---
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    const nota = 'Nota: Los docentes deben suscribir de forma obligatoria el presente formato en cada Semestre Académico, en el reverso de la Declaracion de Carga Horaria Asignada';
    const splitNota = doc.splitTextToSize(nota, contentWidth - 30); 
    doc.text(splitNota, pageWidth / 2, 275, { align: 'center' });
  }

  private async generarFormato2DJDesconcentrada(doc: any, reporte: Reporte) {
    const docenteId = reporte.docenteId;
    const cicloId = reporte.cicloId;

    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const docenteCarrera = await this.docenteCarreraRepo.findOne({
      where: { docente: { id: docenteId } },
      relations: ['carrera']
    });
    const facultad = docenteCarrera?.carrera?.facultad || 'INGENIERÍA';
    const departamento = docenteCarrera?.carrera?.nombre || 'INGENIERÍA DE SISTEMAS';

    const cargaAcademica = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['docente']
    });
    const firma = (reporte.estado === EstadoReporte.FIRMADO) ? (cargaAcademica?.docente?.firmaBase64 || null) : null;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);

    // Helper para justificar líneas sin sangría
    const justifyLine = (text: string, x: number, y: number, width: number) => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length <= 1) {
        doc.text(text, x, y);
        return;
      }
      const totalWordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
      const spaceBetweenWords = (width - totalWordsWidth) / (words.length - 1);
      let currentX = x;
      words.forEach((word, i) => {
        doc.text(word, currentX, y);
        currentX += doc.getTextWidth(word) + spaceBetweenWords;
      });
    };

    const drawJustifiedParagraph = (text: string, y: number) => {
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach((line: string, index: number) => {
        if (index === lines.length - 1) {
          doc.text(line, margin, y, { align: 'left' });
        } else {
          justifyLine(line, margin, y, contentWidth);
        }
        y += 6;
      });
      return y + 4; // Separación entre párrafos
    };

    // --- ENCABEZADO ---
    let currentY = 10; 
    doc.setFontSize(10); // Bajado de 10.7 a 10
    const headerTitle = 'DECLARACION JURADA DE LOS DOCENTES QUE PRESTAN SERVICIOS EN SEDES DESCENTRALIZADAS';
    const splitHeader = doc.splitTextToSize(headerTitle, contentWidth - 40);
    doc.text(splitHeader, pageWidth / 2, currentY, { align: 'center' });
    
    // Separación título-texto: 10mm desde la última línea del título
    currentY = 10 + (splitHeader.length * 5) + 10; 

    // --- CUERPO ---
    doc.setFontSize(10); // Asegurar 10px para el cuerpo
    const nombreDocente = (docente?.nombreCompleto || '').toUpperCase();
    const dni = docente?.dni || '________';
    const codigoIbm = docente?.codigoIBM || '0000';

    // Párrafo 1
    const p1 = `Yo, ${nombreDocente} identificado con DNI. Nro ${dni} con Código IBM Nro ${codigoIbm} del Departamento Académico Dpto. de ${departamento} Facultad de ${facultad}; en el marco del reglamento de funcionamiento de Sedes Descentralizadas (RCU Nro 072 CU-COG-2005/UNT) y la Directiva Nro 01-2007-VAC/UNT sobre Racionalización Académica del Personal Docentes que labora en las Sedes descentralizadas (R.C.U. Nro 576-2007/UNT) DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD QUE:`;
    currentY = drawJustifiedParagraph(p1, currentY);

    // Párrafo 2: Forzar a 2 líneas
    const p2 = 'EN MI PRESTACION DE SERVICIOS EN SEDES DESCENTRALIZADAS NO ESTOY INCURSO EN INCOMPATIBILIDAD HORARIA NI CONTRAVENGO LA SIGUIENTE NORMATIVIDAD INSTITUCIONAL:';
    const linesP2 = doc.splitTextToSize(p2, contentWidth); 
    linesP2.forEach((line: string, index: number) => {
      if (index === 0) {
        justifyLine(line, margin, currentY, contentWidth);
      } else {
        doc.text(line, margin, currentY, { align: 'left' });
      }
      currentY += 5;
    });
    currentY += 4;

    // Párrafos de Normativa (1 al 5)
    const normativa = [
      'Los docentes ordinarios a Dedicación Exclusiva y Tiempo Completo solo pueden tener carga horaria máxima de diez (10) horas semanales (num. 1 de la Directiva).',
      'Los docentes que ejercen cargos académicos y administrativos de: Jefe de Departamento Académico, Director de Escuela Académico Profesional, Director de Sección de Postgrado, Profesor Secretario de Facultad. Jefe de Oficina General, o cargos Directivos en Centros de Producción o líneas de Rentabilidad pueden asumir carga máxima de 05 horas semanales, siempre que sea en forma excepcional y por no contar con docente de la especialidad habilitada para asumir dicha carga. (num. 2 y 3 de la Directiva RCU Nro 005-2009/UNT y art.23 del Reglamento).',
      'Los docentes que ejercen cargo de Decano o Director de Postgrado y aquellos que prestan servicios en Centros de Producción y línea de Rentabilidad no pueden asumir carga horaria en Sedes Descentralizadas. (num. 3 de la Directiva ya art 23 del Reglamento).',
      'Los docentes beneficiados con becas de estudio de maestria o doctorado o Segunda especialidad solo pueden tener carga horaria máxima de tres (03) horas semanales. (num. 4 de la Directiva).',
      'El desarrollo de la carga en sede descentralizada no puede inferir con la carga lectiva y no lectiva asignada en la Sede Central; salvo el caso de las Sedes de Cascas, Huamachuco, Tayabamba y Santiago de Chuco en que se debe contar con Licencia por comisión de servicios y carta de compromiso del docente que asumiría la carga horaria en la Sede Central (num. 5 y 7 de la Directiva y art. 23 del Reglamento).'
    ];

    normativa.forEach(text => {
      currentY = drawJustifiedParagraph(text, currentY);
    });

    // Normativa 6: Forzar a 2 líneas
    const norm6 = 'Los docentes que asumen carga horaria en las Sedes de Huamachuco, Cascas, Santiago de Chuco y Tayabamba no pueden asumir labores labores durante el mismo periodo en otra Sede (num. 6 de la Directiva).';
    const linesNorm6 = doc.splitTextToSize(norm6, contentWidth);
    linesNorm6.forEach((line: string, index: number) => {
      if (index === 0) {
        justifyLine(line, margin, currentY, contentWidth);
      } else {
        doc.text(line, margin, currentY, { align: 'left' });
      }
      currentY += 6;
    });
    currentY += 4;

    // Párrafo final (Combinado): Forzado EXACTO como la imagen
    const pf1 = 'En caso de faltar a la verdad así como de incurrir en incompatibilidad horaria contraviniendo los dispositivos pre-citados me avengo a las sanciones que correspondan,';
    const pf2 = 'y autorizo al funcionario competente disponga el descuento del pago por mis servicios en Sedes Descentralizadas, conforme al monto que la unidad de remuneraciones liquide como pago indebido por el periodo ilegalmente laborado.';
    
    // Obtener todas las líneas del bloque completo para controlar el estilo por línea
    const fullFinalText = pf1 + ' ' + pf2;
    const allFinalLines = doc.splitTextToSize(fullFinalText, contentWidth);
    
    allFinalLines.forEach((line: string, index: number) => {
      // Estilo normal para las primeras 2 líneas, cursiva y negrita para la 3ra y 4ta
      if (index >= 2) {
        doc.setFont('times', 'bolditalic');
      } else {
        doc.setFont('times', 'normal');
      }

      if (index === allFinalLines.length - 1) {
        doc.text(line, margin, currentY, { align: 'left' });
      } else {
        justifyLine(line, margin, currentY, contentWidth);
      }
      currentY += 6;
    });

    // --- FECHA ---
    currentY += 4; // Separación igual a la de los párrafos (4mm)
    doc.setFont('times', 'normal');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const d = new Date();
    const fechaTexto = `Trujillo, ${d.getDate()} de ${meses[d.getMonth()]} del ${d.getFullYear()}`;
    doc.text(fechaTexto, pageWidth - margin, currentY, { align: 'right' });

    // --- FIRMA ---
    currentY += 20; 
    const rightX = pageWidth - margin - 40;
    doc.line(rightX - 35, currentY, rightX + 35, currentY);
    currentY += 6; // Aumentado de 2.5 a 6 para dar espacio real
    doc.setFont('times', 'bold');
    doc.text('FIRMA DEL DECLARANTE', rightX, currentY, { align: 'center' });
    currentY += 5; // Aumentado de 2.5 a 5
    doc.text(`DNI: ${dni}`, rightX, currentY, { align: 'center' });

    if (firma) {
      try { doc.addImage(firma, 'PNG', rightX - 25, currentY - 25, 50, 15); } catch (e) {}
    }

    // --- NOTA AL PIE (Y=287, 10mm desde el borde inferior) ---
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    const nota = 'Nota: Los docentes deben suscribir de forma obligatoria el presente formato para prestar servicios en cada Sede Descentralizada, al reverso de la Declaración de la Carga Horaria';
    const splitNota = doc.splitTextToSize(nota, contentWidth - 30);
    doc.text(splitNota, pageWidth / 2, 287, { align: 'center' });
  }

  private agruparCargaLectiva(cargaLectiva: any[], horarios: any[]) {
    const grupos: Record<string, any> = {};
    
    cargaLectiva.forEach((item) => {
      const key = item.cursoId.toString();

      if (!grupos[key]) {
        grupos[key] = {
          codigo: item.curso?.codigo,
          nombre: item.curso?.nombre,
          ciclo: item.curso?.cicloAcademico,
          horasT: 0,
          gruposT: 0,
          horasP: 0,
          gruposP: 0,
          horasL: 0,
          gruposL: 0,
          totalHoras: 0,
        };
      }
      
      const horas = Number(item.horasSemanales || 0);
      const numGrupos = (item.grupos || []).length;
      const tipo = item.tipoClase?.toLowerCase();
      
      const horasUnitarias = numGrupos > 0 ? horas / numGrupos : horas;

      if (tipo === 'teoria') {
        grupos[key].horasT = horasUnitarias;
        grupos[key].gruposT += numGrupos;
      } else if (tipo === 'practica') {
        grupos[key].horasP = horasUnitarias;
        grupos[key].gruposP += numGrupos;
      } else if (tipo === 'laboratorio') {
        grupos[key].horasL = horasUnitarias;
        grupos[key].gruposL += numGrupos;
      }
      
      grupos[key].totalHoras += horas;
    });
    
    return Object.values(grupos);
  }

  private async generarFormato3Horario(doc: any, reporte: Reporte) {
    const docenteId = reporte.docenteId;
    const cicloId = reporte.cicloId;

    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const ciclo = await this.cicloRepo.findOne({ where: { id: cicloId } });
    
    const horarios = await this.horarioRepo.find({ 
      where: { docenteId, cicloId },
      relations: ['curso', 'aula', 'grupo']
    });

    const docenteCarrera = await this.docenteCarreraRepo.findOne({
      where: { docente: { id: docenteId } },
      relations: ['carrera']
    });
    const facultad = docenteCarrera?.carrera?.facultad || 'INGENIERÍA';
    const departamento = docenteCarrera?.carrera?.nombre || 'INGENIERÍA DE SISTEMAS';

    const cargaAcademica = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['docente']
    });
    const firma = (reporte.estado === EstadoReporte.FIRMADO) ? (cargaAcademica?.docente?.firmaBase64 || null) : null;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;

    // --- TÍTULO ---
    let currentY = 20;
    doc.setFont('times', 'bold');
    doc.setFontSize(10); 
    doc.text('HORARIO SEMANAL DE LA CARGA ACADÉMICA DOCENTE (F03-CAD)', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFontSize(9);
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    
    // --- CABECERA TABLA ---
    // Fila 1: Facultad y Departamento
    doc.rect(margin, currentY, contentWidth * 0.6, 8);
    doc.text(`Facultad / Filial: ${facultad}`, margin + 2, currentY + 5);
    doc.rect(margin + contentWidth * 0.6, currentY, contentWidth * 0.4, 8);
    doc.text(`Dpto. Académico: ${departamento}`, margin + contentWidth * 0.6 + 2, currentY + 5);
    
    currentY += 8;
    // Fila 2: DNI, Docente y Categoría
    doc.rect(margin, currentY, 15, 8);
    doc.text('DNI', margin + 7.5, currentY + 5, { align: 'center' });
    doc.rect(margin + 15, currentY, 25, 8);
    doc.text(docente?.dni || '', margin + 15 + 12.5, currentY + 5, { align: 'center' });
    
    doc.rect(margin + 40, currentY, contentWidth - 40 - 50, 8);
    doc.text(`Docente: ${docente?.nombreCompleto || ''}`, margin + 42, currentY + 5);
    
    doc.rect(pageWidth - margin - 50, currentY, 50, 8);
    doc.setFontSize(8);
    const catDed = `${docente?.categoria || ''}\n${docente?.dedicacion || ''}`;
    doc.text(catDed.toUpperCase(), pageWidth - margin - 25, currentY + 3.5, { align: 'center' });
    doc.setFontSize(9);

    currentY += 8;
    // Fila 3: Año, Ciclo, Inicio y Fin
    doc.rect(margin, currentY, contentWidth, 8);
    const cicloNombre = ciclo?.nombre || '';
    const anio = cicloNombre.split('-')[0] || '';
    const semestre = cicloNombre.split('-')[1] || '';
    
    const formatDate = (date: any) => {
      if (!date) return '-';
      const d = new Date(date);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    const fechaInicio = formatDate(ciclo?.fechaInicio);
    const fechaFin = formatDate(ciclo?.fechaFin);
    
    const headerRow3 = `AÑO ACADEMICO: ${anio}   SEMESTRE: ${semestre}     Fecha de Inicio: ${fechaInicio}   Fecha de término: ${fechaFin}`;
    doc.text(headerRow3, pageWidth / 2, currentY + 5, { align: 'center' });

    currentY += 8;

    // --- TABLA CARGA LECTIVA ---
    const colWidths = [45, 95, 15, 25, 10]; 
    const headers = ['HORARIO', 'CARGA HORARIA LECTIVA (CHL)', 'LUGAR', 'AULA', 'TOTAL'];
    
    let xPos = margin;
    doc.setFont('times', 'bold');
    headers.forEach((h, i) => {
      doc.setFillColor(220, 235, 250); // Forzar celeste claro en cada celda del header
      doc.rect(xPos, currentY, colWidths[i], 8, 'FD');
      doc.text(h, xPos + colWidths[i] / 2, currentY + 5, { align: 'center' });
      xPos += colWidths[i];
    });
    
    currentY += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(8);

    // Agrupar horarios por curso
    const lectivos = horarios.filter(h => h.tipoClase !== TipoClaseHorario.NO_LECTIVA);
    const lectivosPorCurso: Record<string, any> = {};
    
    lectivos.forEach(h => {
      const key = h.cursoId?.toString() || 'sin-curso';
      if (!lectivosPorCurso[key]) {
        lectivosPorCurso[key] = {
          nombre: h.curso?.nombre || 'SIN NOMBRE',
          codigo: h.curso?.codigo || '',
          ciclo: h.curso?.cicloAcademico || '',
          horarios: []
        };
      }
      lectivosPorCurso[key].horarios.push(h);
    });

    const formatTime = (time: string) => time.substring(0, 5);
    const getDiaNom = (dia: number) => ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'][dia - 1];

    const getHorarioStr = (horariosCurso: any[]) => {
      const grouped: Record<string, string[]> = {}; // T, P, L
      horariosCurso.forEach(h => {
        let t = 'T';
        if (h.tipoClase === TipoClaseHorario.PRACTICA) t = 'P';
        if (h.tipoClase === TipoClaseHorario.LABORATORIO) t = 'L';
        
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(`${getDiaNom(h.diaSemana)}(${formatTime(h.horaInicio)}-${formatTime(h.horaFin)})`);
      });

      return Object.entries(grouped)
        .map(([tipo, list]) => `${tipo}: ${list.join(', ')}`)
        .join('\n');
    };

    let totalHorasLectivas = 0;

    Object.values(lectivosPorCurso).forEach(c => {
      const horarioStr = getHorarioStr(c.horarios);
      const cargaStr = `${c.nombre}\n${c.ciclo}-C Ingeniería de Sistemas A`; 
      const aulas = [...new Set(c.horarios.map(h => h.aula?.nombre || ''))].join(', ');
      const lugar = 'F11'; 
      const horas = c.horarios.reduce((sum, h) => {
        const start = h.horaInicio.split(':').map(Number);
        const end = h.horaFin.split(':').map(Number);
        return sum + (end[0] - start[0]) + (end[1] - start[1]) / 60;
      }, 0);
      totalHorasLectivas += horas;

      const linesH = doc.splitTextToSize(horarioStr, colWidths[0] - 2);
      const linesC = doc.splitTextToSize(cargaStr, colWidths[1] - 2);
      const linesA = doc.splitTextToSize(aulas, colWidths[3] - 2);
      const rowHeight = Math.max(10, linesH.length * 4, linesC.length * 4, linesA.length * 4);

      doc.setFillColor(255, 255, 255); // Asegurar fondo blanco para el cuerpo
      xPos = margin;
      doc.rect(xPos, currentY, colWidths[0], rowHeight);
      doc.text(linesH, xPos + 2, currentY + 4);
      xPos += colWidths[0];
      
      doc.rect(xPos, currentY, colWidths[1], rowHeight);
      doc.text(linesC, xPos + 2, currentY + 4);
      xPos += colWidths[1];
      
      doc.rect(xPos, currentY, colWidths[2], rowHeight);
      doc.text(lugar, xPos + colWidths[2] / 2, currentY + rowHeight / 2 + 1, { align: 'center' });
      xPos += colWidths[2];
      
      doc.rect(xPos, currentY, colWidths[3], rowHeight);
      doc.text(linesA, xPos + colWidths[3] / 2, currentY + 4, { align: 'center' }); 
      xPos += colWidths[3];
      
      doc.rect(xPos, currentY, colWidths[4], rowHeight);
      doc.text(String(Math.round(horas)), xPos + colWidths[4] / 2, currentY + rowHeight / 2 + 1, { align: 'center' });
      
      currentY += rowHeight;
    });

    // Fila vacía para espacio si es necesario
    if (Object.keys(lectivosPorCurso).length < 1) { 
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, currentY, colWidths[0], 8);
      doc.rect(margin + colWidths[0], currentY, colWidths[1], 8);
      doc.rect(margin + colWidths[0] + colWidths[1], currentY, colWidths[2], 8);
      doc.rect(margin + colWidths[0] + colWidths[1] + colWidths[2], currentY, colWidths[3], 8);
      doc.rect(margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY, colWidths[4], 8);
      currentY += 8;
    }

    // --- TABLA CARGA NO LECTIVA ---
    currentY += 4; 
    xPos = margin;
    doc.setFont('times', 'bold');
    const headersNoLectiva = ['HORARIO', 'CARGA HORARIA NO LECTIVA (CHNL)', 'LUGAR', 'AULA', 'TOTAL'];
    headersNoLectiva.forEach((h, i) => {
      doc.setFillColor(220, 235, 250); // Forzar celeste claro en cada celda del header
      doc.rect(xPos, currentY, colWidths[i], 8, 'FD');
      doc.text(h, xPos + colWidths[i] / 2, currentY + 5, { align: 'center' });
      xPos += colWidths[i];
    });
    
    currentY += 8;
    doc.setFont('times', 'normal');

    const noLectivos = horarios.filter(h => h.tipoClase === TipoClaseHorario.NO_LECTIVA);
    const noLectivosPorAct: Record<string, any> = {};
    
    noLectivos.forEach(h => {
      const key = h.actividadNoLectiva || 'OTRA';
      if (!noLectivosPorAct[key]) {
        noLectivosPorAct[key] = {
          nombre: key,
          horarios: []
        };
      }
      noLectivosPorAct[key].horarios.push(h);
    });

    let totalHorasNoLectivas = 0;

    const mappingNoLectiva: Record<string, string> = {
      [ActividadNoLectiva.PREPARACION]: 'PREPARACION Y EVALUACION',
      [ActividadNoLectiva.TUTORIA]: 'TUTORIA Y CONSEJERIA',
      [ActividadNoLectiva.INVESTIGACION]: 'INVESTIGACION',
      [ActividadNoLectiva.RESPONSABILIDAD_SOCIAL]: 'RESPONSABILIDAD SOCIAL UNIVERSITARIA',
      [ActividadNoLectiva.ASESORIA]: 'ASESORÍA DE TESIS Y EXAMENES PROFESIONALES',
      [ActividadNoLectiva.CAPACITACION]: 'FORMACION ACADÉMICA Y CAPACITACIÓN',
      'AUTOEVALUACION': 'AUTOEVALUACIÓN Y/O ACREDITACIÓN DE LA ESCUELA PROFESIONAL',
      [ActividadNoLectiva.COMITES]: 'COMITES O COMISIONES ESPECIALES',
      [ActividadNoLectiva.GOBIERNO]: 'ACTIVIDADES DE GOBIERNO O AUTORIDAD',
      [ActividadNoLectiva.ADMINISTRACION]: 'ACTIVIDADES DE GESTIÓN INSTITUCIONAL',
    };

    const filasNoLectiva = [
      ActividadNoLectiva.PREPARACION,
      ActividadNoLectiva.TUTORIA,
      ActividadNoLectiva.INVESTIGACION,
      ActividadNoLectiva.RESPONSABILIDAD_SOCIAL,
      ActividadNoLectiva.ASESORIA,
      ActividadNoLectiva.CAPACITACION,
      'AUTOEVALUACION',
      ActividadNoLectiva.COMITES,
      ActividadNoLectiva.GOBIERNO,
      ActividadNoLectiva.ADMINISTRACION,
    ];
    
    filasNoLectiva.forEach(actKey => {
      const data = noLectivosPorAct[actKey];
      const horarioStr = data ? data.horarios.map((h: any) => `${getDiaNom(h.diaSemana)}(${formatTime(h.horaInicio)}-${formatTime(h.horaFin)})`).join(',\n') : ''; 
      const cargaStr = mappingNoLectiva[actKey] || actKey;
      const lugar = data ? 'F11' : '';
      const aula = data ? [...new Set(data.horarios.map((h: any) => h.aula?.nombre || 'CUBÍCULO'))].join(', ') : '';
      const horas = data ? data.horarios.reduce((sum: number, h: any) => {
        const start = h.horaInicio.split(':').map(Number);
        const end = h.horaFin.split(':').map(Number);
        return sum + (end[0] - start[0]) + (end[1] - start[1]) / 60;
      }, 0) : 0;
      totalHorasNoLectivas += horas;

      if (!data && !cargaStr) return; 

      const linesH = doc.splitTextToSize(horarioStr, colWidths[0] - 2);
      const linesC = doc.splitTextToSize(cargaStr, colWidths[1] - 2);
      const linesA = doc.splitTextToSize(aula, colWidths[3] - 2);
      const rowHeight = Math.max(8, linesH.length * 4, linesC.length * 4, linesA.length * 4);

      doc.setFillColor(255, 255, 255);
      xPos = margin;
      doc.rect(xPos, currentY, colWidths[0], rowHeight);
      doc.text(linesH, xPos + 2, currentY + 4);
      xPos += colWidths[0];
      
      doc.rect(xPos, currentY, colWidths[1], rowHeight);
      doc.text(linesC, xPos + 2, currentY + 4);
      xPos += colWidths[1];
      
      doc.rect(xPos, currentY, colWidths[2], rowHeight);
      doc.text(lugar, xPos + colWidths[2] / 2, currentY + rowHeight / 2 + 1, { align: 'center' });
      xPos += colWidths[2];
      
      doc.rect(xPos, currentY, colWidths[3], rowHeight);
      doc.text(linesA, xPos + colWidths[3] / 2, currentY + 4, { align: 'center' });
      xPos += colWidths[3];
      
      doc.rect(xPos, currentY, colWidths[4], rowHeight);
      doc.text(horas > 0 ? String(Math.round(horas)) : '', xPos + colWidths[4] / 2, currentY + rowHeight / 2 + 1, { align: 'center' });
      
      currentY += rowHeight;
    });

    // --- TOTAL HORAS ---
    doc.setFillColor(220, 235, 250);
    doc.setFont('times', 'bold');
    doc.rect(margin, currentY, contentWidth - colWidths[4], 8, 'FD');
    doc.text('TOTAL HORAS CARGA ACADÉMICA', margin + (contentWidth - colWidths[4]) / 2, currentY + 5, { align: 'center' });
    
    doc.setFillColor(220, 235, 250); // Forzar celeste claro en la celda del total
    doc.rect(pageWidth - margin - colWidths[4], currentY, colWidths[4], 8, 'FD');
    doc.text(String(Math.round(totalHorasLectivas + totalHorasNoLectivas)), pageWidth - margin - colWidths[4] / 2, currentY + 5, { align: 'center' });
    
    currentY += 10;
    doc.setFontSize(7);
    doc.setFont('times', 'normal');
    doc.text('T: TEORIA - P: PRACTICA', margin, currentY);
    currentY += 3.5;
    doc.text('LU (LUNES); MA (MARTES); MI (MIERCOLES); JU (JUEVES); VI (VIERNES); TIEMPO EN FORMATO DE 24 HORAS.', margin, currentY);
    
    currentY += 6;
    const lugarLegend = 'LUGAR: (F01: "CC. Agropecuarias", F02: "CC. Biológicas", F03: "CC. Económicas", F04: "CC. Físicas y Matemáticas", F05: "CC. Sociales", F06: "Derecho y Ciencias Políticas", F07: "Educación y Comunicación", F08: "Enfermería", F09: "Estomatología", F10: "Farmacia y Bioquímica", F11: "Ingeniería", F12: "Ingeniería Química", F13: "Medicina", F14: "Filial Valle Jequetepeque", F15: "Filial Huamachuco", F16: "Filial Santiago de Chuco", OA: "Oficina Administrativa", SC: "Salida de Campo")';
    const splitLugar = doc.splitTextToSize(lugarLegend, contentWidth);
    doc.text(splitLugar, margin, currentY);

    // --- FIRMAS ---
    currentY += 35; // Bajado de 25 a 35 para más espacio
    const firmaWidth = 50;
    const spacing = (contentWidth - 3 * firmaWidth) / 2;
    
    // Firma Docente
    let xFirma = margin;
    doc.line(xFirma, currentY, xFirma + firmaWidth, currentY);
    doc.setFontSize(8);
    doc.setFont('times', 'bold');
    doc.text('FIRMA DEL DOCENTE', xFirma + firmaWidth / 2, currentY + 4, { align: 'center' });
    if (firma) {
      try { doc.addImage(firma, 'PNG', xFirma + 5, currentY - 20, 40, 15); } catch (e) {}
    }

    // Firma Director
    xFirma += firmaWidth + spacing;
    doc.line(xFirma, currentY, xFirma + firmaWidth, currentY);
    doc.text('FIRMA DEL DIRECTOR DE DPTO. ACADEMICO', xFirma + firmaWidth / 2, currentY + 4, { align: 'center' });

    // Firma Decano
    xFirma += firmaWidth + spacing;
    doc.line(xFirma, currentY, xFirma + firmaWidth, currentY);
    doc.text('V°B° DECANO', xFirma + firmaWidth / 2, currentY + 4, { align: 'center' });

    // Fecha de Registro (en blanco por solicitud)
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`EMAIL: ${docente?.emailPersonal || ''}`, margin, 285);
  }

  async generarExcelReporte(id: number): Promise<{ excel: Buffer; filename: string }> {
    const reporte = await this.reporteRepo.findOne({ 
      where: { id },
      relations: ['docente', 'ciclo']
    });
    if (!reporte) throw new BadRequestException('Reporte no encontrado');

    const docenteId = reporte.docenteId;
    const cicloId = reporte.cicloId;

    // Obtener datos necesarios
    const cargaLectiva = await this.asignacionRepo.find({ 
      where: { docenteId },
      relations: ['curso']
    });
    const horarios = await this.horarioRepo.find({ where: { docenteId } });
    const cargaLectivaAgrupada = this.agruparCargaLectiva(cargaLectiva, horarios);
    
    // Obtener carga académica con su carga no lectiva y firma (FORMA MÁS SEGURA)
    const cargaAcademica = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['cargaNoLectiva', 'docente']
    });
    
    const cargaNoLectiva = cargaAcademica?.cargaNoLectiva;
    
    // La firma se incluye si el REPORTE específico está en estado FIRMADO
    const firma = (reporte.estado === EstadoReporte.FIRMADO) 
      ? (cargaAcademica?.docente?.firmaBase64 || null) 
      : null;
    
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    const docenteCarrera = await this.docenteCarreraRepo.findOne({
      where: { docente: { id: docenteId } },
      relations: ['carrera']
    });
    const facultad = docenteCarrera?.carrera?.facultad || 'INGENIERÍA';
    const departamento = docenteCarrera?.carrera?.nombre || 'INGENIERÍA DE SISTEMAS';

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FORMATO N° 1');

    // Configuración de columnas (A-K para cubrir el formato)
    worksheet.columns = [
      { width: 12 }, { width: 45 }, { width: 8 }, { width: 20 }, { width: 8 }, 
      { width: 8 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }
    ];

    const CELESTE_MUY_CLARO = 'FFF2F2F2'; // Gris muy claro como el PDF
    const FONT_TIMES = 'Times New Roman';

    // --- TÍTULOS ---
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'FORMATO N° 1';
    worksheet.getCell('A1').font = { name: FONT_TIMES, size: 12 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = 'DECLARACION DE CARGA HORARIA ASIGNADA';
    worksheet.getCell('A2').font = { name: FONT_TIMES, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // --- SECCIÓN I ---
    worksheet.mergeCells('A4:K4');
    worksheet.getCell('A4').value = 'I. DATOS SOBRE LA SITUACION DEL PROFESOR:';
    worksheet.getCell('A4').font = { name: FONT_TIMES, bold: true, size: 10 };

    // Fila Facultad
    worksheet.getCell('A5').value = 'FACULTAD:';
    worksheet.getCell('A5').font = { name: FONT_TIMES, size: 9 };
    worksheet.mergeCells('C5:K5');
    worksheet.getCell('C5').value = (facultad || 'INGENIERÍA');
    worksheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_MUY_CLARO } };
    worksheet.getCell('C5').font = { name: FONT_TIMES, size: 9 };
    worksheet.getCell('C5').alignment = { horizontal: 'center' };

    // Fila Departamento
    worksheet.getCell('A6').value = 'DPTO. ACADEMICO:';
    worksheet.getCell('A6').font = { name: FONT_TIMES, size: 9 };
    worksheet.mergeCells('C6:K6');
    worksheet.getCell('C6').value = (departamento || 'INGENIERÍA DE SISTEMAS');
    worksheet.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_MUY_CLARO } };
    worksheet.getCell('C6').font = { name: FONT_TIMES, size: 9 };
    worksheet.getCell('C6').alignment = { horizontal: 'center' };

    // Tabla Docente
    const teacherHeaders = ['NOMBRE COMPLETO', 'CONDICION', 'CATEGORIA', 'MODALIDAD'];
    const teacherRanges = ['A8:E8', 'F8:G8', 'H8:I8', 'J8:K8'];
    const teacherValueRanges = ['A9:E9', 'F9:G9', 'H9:I9', 'J9:K9'];

    teacherHeaders.forEach((h, i) => {
      worksheet.mergeCells(teacherRanges[i]);
      const cell = worksheet.getCell(teacherRanges[i].split(':')[0]);
      cell.value = h;
      cell.font = { name: FONT_TIMES, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const teacherValues = [
      (docente?.nombreCompleto || '').toUpperCase(),
      (docente?.tipoContrato || '').toUpperCase(),
      (docente?.categoria || '').toUpperCase(),
      (docente?.dedicacion || '').toUpperCase()
    ];

    teacherValues.forEach((v, i) => {
      worksheet.mergeCells(teacherValueRanges[i]);
      const cell = worksheet.getCell(teacherValueRanges[i].split(':')[0]);
      cell.value = v;
      cell.font = { name: FONT_TIMES, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Ciclo y Fechas
    worksheet.mergeCells('A11:K11');
    const cicloCell = worksheet.getCell('A11');
    const cicloNombre = reporte.ciclo.nombre || '';
    const fechaInicio = reporte.ciclo.fechaInicio ? new Date(reporte.ciclo.fechaInicio).toLocaleDateString('es-PE') : '-';
    const fechaFin = reporte.ciclo.fechaFin ? new Date(reporte.ciclo.fechaFin).toLocaleDateString('es-PE') : '-';
    cicloCell.value = `AÑO ACADEMICO: ${cicloNombre.split('-')[0] || ''}    CICLO(SEM): ${cicloNombre.split('-')[1] || ''}    INICIO: ${fechaInicio}  -  FINAL: ${fechaFin}`;
    cicloCell.font = { name: FONT_TIMES, size: 8.5 };
    cicloCell.alignment = { horizontal: 'left', vertical: 'middle' };
    cicloCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // --- 1. TRABAJO LECTIVO ---
    worksheet.mergeCells('A13:K13');
    const lectivoTitleCell = worksheet.getCell('A13');
    lectivoTitleCell.value = '1. TRABAJO LECTIVO.- Datos completos y con claridad';
    lectivoTitleCell.font = { name: FONT_TIMES, size: 9 };
    lectivoTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_MUY_CLARO } };
    lectivoTitleCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const lectivoHeaders = ['CODIGO', 'NOMBRE DEL CURSO', 'CUR.', 'ESCUELA PROF.', 'CIC.', 'SEC.', 'N° AL.', 'H.T.', 'H.P.', 'H.L.', 'Total'];
    const lectivoRow = 14;
    lectivoHeaders.forEach((h, i) => {
      const cell = worksheet.getCell(lectivoRow, i + 1);
      cell.value = h;
      cell.font = { name: FONT_TIMES, size: 7.5 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let currentRow = 15;
    if (cargaLectivaAgrupada.length > 0) {
      cargaLectivaAgrupada.forEach(curso => {
        const rowData = [
          curso.codigo, curso.nombre, 'OB', 'SISTEMAS', curso.ciclo, 'A', '50',
          `${Math.round(curso.horasT || 0)} x ${Math.round(curso.gruposT || 0)}`,
          `${Math.round(curso.horasP || 0)} x ${Math.round(curso.gruposP || 0)}`,
          `${Math.round(curso.horasL || 0)} x ${Math.round(curso.gruposL || 0)}`,
          Math.round(curso.totalHoras || 0)
        ];
        rowData.forEach((val, i) => {
          const cell = worksheet.getCell(currentRow, i + 1);
          cell.value = val;
          cell.font = { name: FONT_TIMES, size: 7 };
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        currentRow++;
      });
    }

    currentRow++; // Espacio

    // --- 2. CARGA NO LECTIVA ---
    const noLectivaData = [
      { id: '2.', label: 'PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', h: Number(cargaNoLectiva?.horasPreparacion) || 0, d: cargaNoLectiva?.detallePreparacion || '' },
      { id: '3.', label: 'CONSEJERIA: Señalar número de alumnos y el ciclo académico con los que se desarrolla.', h: Number(cargaNoLectiva?.horasTutoria) || 0, d: cargaNoLectiva?.detalleTutoria || '' },
      { id: '4.', label: 'INVESTIGACION: Consignar el N° de inscripción, código, nombre y duración del proyecto.', h: Number(cargaNoLectiva?.horasInvestigacion) || 0, d: cargaNoLectiva?.detalleInvestigacion || '' },
      { id: '5.', label: 'CAPACITACION: Señale lo referente a este rubro en el marco de los planes de cada Facultad.', h: Number(cargaNoLectiva?.horasCapacitacion) || 0, d: cargaNoLectiva?.detalleCapacitacion || '' },
      { id: '6.', label: 'ACTIVIDADES DE GOBIERNO', h: Number(cargaNoLectiva?.horasGobierno) || 0, d: cargaNoLectiva?.detalleGobierno || '' },
      { id: '7.', label: 'ACTIVIDADES DE ADMINISTRACION', h: Number(cargaNoLectiva?.horasAdministracion) || 0, d: cargaNoLectiva?.detalleAdministracion || '' },
      { id: '8.', label: 'ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL', h: Number(cargaNoLectiva?.horasAsesoria) || 0, d: cargaNoLectiva?.detalleAsesoria || '' },
      { id: '9.', label: 'RESPONSABILIDAD SOCIAL UNIVERSITARIA', h: Number(cargaNoLectiva?.horasResponsabilidadSocial) || 0, d: cargaNoLectiva?.detalleResponsabilidadSocial || '' },
      { id: '10.', label: 'COMITES TECNICOS Y COMISIONES', h: Number(cargaNoLectiva?.horasComites) || 0, d: cargaNoLectiva?.detalleComites || '' },
    ];

    noLectivaData.forEach(row => {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const labelCell = worksheet.getCell(`A${currentRow}`);
      labelCell.value = `${row.id} ${row.label}`;
      labelCell.font = { name: FONT_TIMES, size: 7 };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_MUY_CLARO } };
      labelCell.alignment = { wrapText: true, vertical: 'middle' };
      labelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      worksheet.mergeCells(`F${currentRow}:J${currentRow}`);
      const detailCell = worksheet.getCell(`F${currentRow}`);
      detailCell.value = row.d;
      detailCell.font = { name: FONT_TIMES, size: 7 };
      detailCell.alignment = { wrapText: true, vertical: 'middle' };
      detailCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      const hourCell = worksheet.getCell(`K${currentRow}`);
      hourCell.value = Math.round(row.h);
      hourCell.font = { name: FONT_TIMES, size: 8 };
      hourCell.alignment = { horizontal: 'center', vertical: 'middle' };
      hourCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      currentRow++;
    });

    // TOTAL
    worksheet.getCell(`J${currentRow}`).value = 'TOTAL';
    worksheet.getCell(`J${currentRow}`).font = { name: FONT_TIMES, bold: true, size: 8 };
    worksheet.getCell(`J${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    const totalHorasLectivas = cargaLectivaAgrupada.reduce((sum, c) => sum + (Number(c.totalHoras) || 0), 0);
    const totalHorasNoLectivas = noLectivaData.reduce((sum, row) => sum + (Number(row.h) || 0), 0);
    
    const totalHoras = Math.round(totalHorasLectivas + totalHorasNoLectivas);
    const totalValue = worksheet.getCell(`K${currentRow}`);
    totalValue.value = totalHoras;
    totalValue.font = { name: FONT_TIMES, bold: true, size: 8 };
    totalValue.alignment = { horizontal: 'center', vertical: 'middle' };
    totalValue.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    currentRow += 2;

    // FECHA
    worksheet.mergeCells(`I${currentRow}:K${currentRow}`);
    const fechaActual = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    worksheet.getCell(`I${currentRow}`).value = `Trujillo, ${fechaActual}`;
    worksheet.getCell(`I${currentRow}`).font = { name: FONT_TIMES, size: 9 };
    worksheet.getCell(`I${currentRow}`).alignment = { horizontal: 'right' };

    currentRow += 2;

    // FIRMAS
    // Firma Profesor
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).border = { top: { style: 'thin' } };
    worksheet.getCell(`A${currentRow}`).value = 'Firma del Profesor';
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_TIMES, size: 8 };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'top' };

    currentRow += 3;

    // Firma Director
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).border = { top: { style: 'thin' } };
    worksheet.getCell(`A${currentRow}`).value = 'Firma del Director de Dpto.';
    worksheet.getCell(`A${currentRow}`).font = { name: FONT_TIMES, size: 8 };
    worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'top' };

    // Firma Decano (Misma fila que Director)
    worksheet.mergeCells(`H${currentRow}:K${currentRow}`);
    worksheet.getCell(`H${currentRow}`).border = { top: { style: 'thin' } };
    worksheet.getCell(`H${currentRow}`).value = 'V° B° DECANO FAC.';
    worksheet.getCell(`H${currentRow}`).font = { name: FONT_TIMES, size: 8 };
    worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center', vertical: 'top' };

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const filename = `(${reporte.formato}) - ${reporte.docente.nombreCompleto}.xlsx`;

    return { excel: Buffer.from(excelBuffer), filename };
  }

  async generarReporteOperacional(cicloId: number, tipo: 'aula' | 'laboratorio'): Promise<Buffer> {
    try {
      this.logger.log(`Generando reporte operacional - Ciclo ID: ${cicloId}, Tipo: ${tipo}`);

      const ciclos = await this.ciclosService.findAll();
      const ciclo = ciclos.find(c => c.id === cicloId);

      if (!ciclo) {
        throw new BadRequestException('El ciclo académico no existe');
      }

      const horarios = await this.horarioRepo.find({
        where: { cicloId },
        relations: ['docente', 'curso', 'aula'],
        order: { diaSemana: 'ASC', horaInicio: 'ASC' },
      });

      if (!horarios || horarios.length === 0) {
        throw new BadRequestException('No hay horarios para este ciclo');
      }

      // Filtrar por tipo de aula
      const filtrados = horarios.filter((h) => {
        if (tipo === 'aula') {
          return ['aula_teoria', 'aula_especial'].includes(h.aula.tipo);
        } else {
          return ['laboratorio_redes', 'laboratorio_software'].includes(
            h.aula.tipo,
          );
        }
      });

      // Agrupar por aula
      const porAula = new Map<number, { aula: any; horarios: Horario[] }>();
      filtrados.forEach((h) => {
        if (!porAula.has(h.aula.id)) {
          porAula.set(h.aula.id, {
            aula: h.aula,
            horarios: [],
          });
        }
        porAula.get(h.aula.id)!.horarios.push(h);
      });

      // Renderizar template
      const html = this.renderTemplateOperacional({
        titulo: `Reporte Operacional - ${tipo === 'aula' ? 'Aulas' : 'Laboratorios'}`,
        ciclo: ciclo.nombre,
        fecha: new Date().toLocaleDateString('es-PE'),
        aulas: Array.from(porAula.values()),
      });

      // Generar PDF
      return await this.generarPDF(html, true);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generando reporte operacional: ${msg}`);
      throw error;
    }
  }

  async generarReporteGestion(cicloId: number): Promise<Buffer> {
    try {
      this.logger.log(`Generando reporte de gestión - Ciclo ID: ${cicloId}`);

      const ciclos = await this.ciclosService.findAll();
      const ciclo = ciclos.find(c => c.id === cicloId);

      if (!ciclo) {
        throw new BadRequestException('El ciclo académico no existe');
      }

      // Obtener estadísticas
      const totalDocentes = await this.docenteRepo.count({
        where: { activo: true },
      });

      const totalHorarios = await this.horarioRepo.count({
        where: { cicloId },
      });

      // Carga por categoría
      const cargaPorCategoria = await this.horarioRepo
        .createQueryBuilder('h')
        .leftJoin('h.docente', 'd')
        .select('d.categoria', 'categoria')
        .addSelect('COUNT(h.id)', 'totalHoras')
        .where('h.cicloId = :cicloId', { cicloId })
        .groupBy('d.categoria')
        .getRawMany();

      // Uso de aulas
      const usoAulas = await this.horarioRepo
        .createQueryBuilder('h')
        .leftJoin('h.aula', 'a')
        .select('a.tipo', 'tipo')
        .addSelect('COUNT(*)', 'total')
        .where('h.cicloId = :cicloId', { cicloId })
        .groupBy('a.tipo')
        .getRawMany();

      // Verificar cumplimiento jerárquico
      const violaciones = await this.verificarCumplimientoJerarquico(cicloId);

      // Renderizar template
      const html = this.renderTemplateGestion({
        titulo: 'Reporte de Gestión',
        ciclo: ciclo.nombre,
        fecha: new Date().toLocaleDateString('es-PE'),
        metricas: {
          totalDocentes,
          totalHorarios,
          promedioHorasPorDocente: (totalHorarios / (totalDocentes || 1)).toFixed(
            2,
          ),
        },
        cargaPorCategoria,
        usoAulas,
        cumplimientoJerarquico: violaciones.porcentajeCumplimiento,
      });

      return await this.generarPDF(html, false);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error generando reporte de gestión: ${msg}`);
      throw error;
    }
  }

  private async verificarCumplimientoJerarquico(
    cicloId: number,
  ): Promise<{ porcentajeCumplimiento: number }> {
    const resultado = await this.horarioRepo
      .createQueryBuilder('h')
      .leftJoin('h.docente', 'd')
      .select('COUNT(*)', 'total')
      .where('h.cicloId = :cicloId', { cicloId })
      .getRawOne();

    const total = parseInt(resultado.total);
    return { porcentajeCumplimiento: 100 };
  }

  private async generarPDF(
    html: string,
    landscape: boolean = false,
  ): Promise<Buffer> {
    throw new BadRequestException('La generación de PDF en el servidor está desactivada. Use la descarga desde el frontend.');
    /*
    let browser;
    try {
      browser = await (puppeteer as any).launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      // ... rest of the code
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    */
  }

  private renderTemplateOperacional(data: any): string {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #004080;
            padding-bottom: 20px;
          }
          h1 {
            color: #004080;
            margin: 10px 0;
          }
          .fecha {
            color: #666;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #004080;
            color: white;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .section-title {
            background-color: #f0f0f0;
            font-weight: bold;
            padding: 10px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.titulo}</h1>
          <p>Universidad Nacional de Trujillo</p>
          <p class="fecha">Ciclo: ${data.ciclo} | Fecha: ${data.fecha}</p>
        </div>

        ${data.aulas
          .map(
            (aul: any) => `
          <div class="section-title">
            ${aul.aula.nombre} (${aul.aula.tipo})
          </div>
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Hora Inicio</th>
                <th>Hora Fin</th>
                <th>Docente</th>
                <th>Curso</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${aul.horarios
                .map(
                  (h: any) => `
                <tr>
                  <td>${this.getDiaName(h.diaSemana)}</td>
                  <td>${h.horaInicio}</td>
                  <td>${h.horaFin}</td>
                  <td>${h.docente.nombreCompleto}</td>
                  <td>${h.curso.nombre} (${h.curso.codigo})</td>
                  <td>${h.tipoClase}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `,
          )
          .join('')}

        <div class="footer">
          <p>Reporte generado automáticamente por el Sistema de Gestión de Horarios UNT</p>
        </div>
      </body>
      </html>
    `;

    return template;
  }

  private renderTemplateGestion(data: any): string {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #004080;
            padding-bottom: 20px;
          }
          h1 {
            color: #004080;
          }
          .metricas {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .card {
            background: #f0f4f8;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #004080;
          }
          .card-value {
            font-size: 28px;
            font-weight: bold;
            color: #004080;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #004080;
            color: white;
          }
          h3 {
            color: #004080;
            margin-top: 30px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.titulo}</h1>
          <p>Universidad Nacional de Trujillo - Sistema de Horarios</p>
          <p>Ciclo: ${data.ciclo} | Fecha: ${data.fecha}</p>
        </div>

        <div class="metricas">
          <div class="card">
            <div class="card-value">${data.metricas.totalDocentes}</div>
            <div>Docentes</div>
          </div>
          <div class="card">
            <div class="card-value">${data.metricas.totalHorarios}</div>
            <div>Horas Asignadas</div>
          </div>
          <div class="card">
            <div class="card-value">${data.metricas.promedioHorasPorDocente}</div>
            <div>Promedio/Docente</div>
          </div>
          <div class="card">
            <div class="card-value">${data.cumplimientoJerarquico}%</div>
            <div>Cumplimiento</div>
          </div>
        </div>

        <h3>Carga Horaria por Categoría</h3>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Total Horas</th>
            </tr>
          </thead>
          <tbody>
            ${data.cargaPorCategoria
              .map(
                (c: any) => `
              <tr>
                <td>${c.categoria}</td>
                <td>${c.totalHoras}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <h3>Uso de Aulas</h3>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Horas Utilizadas</th>
            </tr>
          </thead>
          <tbody>
            ${data.usoAulas
              .map(
                (a: any) => `
              <tr>
                <td>${a.tipo}</td>
                <td>${a.total}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Reporte generado automáticamente por el Sistema de Gestión de Horarios UNT</p>
        </div>
      </body>
      </html>
    `;

    return template;
  }

  private getDiaName(dia: number): string {
    const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return dias[dia] || '';
  }
}
