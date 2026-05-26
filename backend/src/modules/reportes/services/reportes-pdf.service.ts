import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
// import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { Horario } from '../../../entities/horario.entity';
import { Docente, TipoContrato, Categoria } from '../../../entities/docente.entity';
import { Aula, TipoAula } from '../../../entities/aula.entity';

@Injectable()
export class ReportesPDFService {
  constructor(
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Aula)
    private aulaRepo: Repository<Aula>,
    private entityManager: EntityManager,
  ) {}

  async generarReporteOperacional(
    cicloId: number,
    tipo: 'aula' | 'laboratorio',
  ): Promise<Buffer> {
    const data = await this.obtenerDatosHorarios(cicloId, tipo);

    const templateHtml = this.getTemplateOperacional();
    const template = handlebars.compile(templateHtml);

    // Obtener nombre del ciclo para mostrar en el template
    const cicloRow = await this.entityManager.query(
      `SELECT nombre FROM ciclos_academicos WHERE id = $1`,
      [cicloId],
    );
    const cicloNombre = cicloRow[0]?.nombre || String(cicloId);

    const html = template({
      ciclo: cicloNombre,
      tipo: tipo === 'aula' ? 'Aulas de Teoría' : 'Laboratorios',
      horarios: data,
      fecha: new Date().toLocaleDateString('es-ES'),
      totalClases: data.length,
    });

    /*
    const browser = await (puppeteer as any).launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', landscape: true, margin: { top: 20, bottom: 20, left: 20, right: 20 } });
    await browser.close();

    return pdf;
    */
    throw new Error('Generación de PDF desactivada en el servidor.');
  }

  async generarReporteGestion(cicloId: number): Promise<Buffer> {
    /*
    const metricas = {
      // ...
    };

    const templateHtml = this.getTemplateGestion();
    const template = handlebars.compile(templateHtml);
    const html = template(metricas);

    const browser = await (puppeteer as any).launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: 20, bottom: 20, left: 20, right: 20 } });
    await browser.close();

    return pdf;
    */
    throw new Error('Generación de PDF desactivada en el servidor.');
  }

  private async obtenerDatosHorarios(cicloId: number, tipo: string): Promise<any[]> {
    let tiposAula: TipoAula[] = [];

    if (tipo === 'aula') {
      tiposAula = [TipoAula.TEORIA, TipoAula.PRACTICA];
    } else {
      tiposAula = [TipoAula.LABORATORIO];
    }

    return this.horarioRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.docente', 'docente')
      .leftJoinAndSelect('h.aula', 'aula')
      .leftJoinAndSelect('h.curso', 'curso')
      .where('h.cicloId = :cicloId', { cicloId })
      .andWhere('aula.tipo IN (:...tiposAula)', { tiposAula })
      .orderBy('h.diaSemana', 'ASC')
      .addOrderBy('h.horaInicio', 'ASC')
      .getMany();
  }

  private async getCargaPorCategoria(cicloId: number): Promise<any[]> {
    return this.entityManager.query(
      `
      SELECT 
        d.categoria,
        COUNT(h.id) as total_horas,
        AVG(EXTRACT(HOUR FROM (h.hora_fin - h.hora_inicio))) as promedio_horas
      FROM horarios h
      JOIN docentes d ON h.docente_id = d.id
      WHERE h.ciclo_id = $1
      GROUP BY d.categoria
      ORDER BY d.categoria
      `,
      [cicloId],
    );
  }

  private async getPorcentajeUsoAulas(cicloId: number): Promise<any[]> {
    return this.entityManager.query(
      `
      SELECT 
        a.tipo,
        COUNT(h.id) as bloques_usados,
        COUNT(DISTINCT a.id) as total_aulas,
        ROUND(COUNT(h.id) * 100.0 / (COUNT(DISTINCT a.id) * 5 * 12), 2) as porcentaje_uso
      FROM horarios h
      RIGHT JOIN aulas a ON h.aula_id = a.id
      WHERE h.ciclo_id = $1 OR h.ciclo_id IS NULL
      GROUP BY a.tipo
      `,
      [cicloId],
    );
  }

  private async verificarCumplimientoJerarquico(cicloId: number): Promise<any> {
    const resultado = await this.entityManager.query(
      `
      WITH asignaciones AS (
        SELECT 
          h.id,
          d.tipo_contrato,
          d.categoria,
          d.antiguedad_anios,
          ROW_NUMBER() OVER (PARTITION BY h.dia_semana ORDER BY 
            CASE d.tipo_contrato WHEN 'nombrado' THEN 1 ELSE 2 END,
            CASE d.categoria 
              WHEN 'principal' THEN 1 WHEN 'asociado' THEN 2 
              WHEN 'auxiliar' THEN 3 WHEN 'jefe_practica' THEN 4 
            END,
            d.antiguedad_anios DESC
          ) as orden
        FROM horarios h
        JOIN docentes d ON h.docente_id = d.id
        WHERE h.ciclo_id = $1
      )
      SELECT 
        COUNT(*) as total_asignaciones,
        COUNT(*) FILTER (WHERE tipo_contrato = 'contratado' AND orden = 1) as violaciones
      FROM asignaciones
      `,
      [cicloId],
    );

    const total = resultado[0]?.total_asignaciones || 1;
    const violaciones = resultado[0]?.violaciones || 0;

    return {
      porcentajeCumplimiento: ((total - violaciones) / total * 100).toFixed(2),
      violacionesDetectadas: violaciones,
    };
  }

  private async getEstadisticasCruces(cicloId: number): Promise<any> {
    const resultado = await this.entityManager.query(
      `
      SELECT 
        COUNT(*) as total_horarios,
        SUM(CASE WHEN es_automatico = true THEN 1 ELSE 0 END) as generados_automaticos,
        SUM(CASE WHEN es_automatico = false THEN 1 ELSE 0 END) as ajustes_manuales
      FROM horarios
      WHERE ciclo_id = $1
      `,
      [cicloId],
    );

    return resultado[0] || { total_horarios: 0, generados_automaticos: 0, ajustes_manuales: 0 };
  }

  private async getTotalDocentes(cicloId: number): Promise<number> {
    const resultado = await this.entityManager.query(
      `
      SELECT COUNT(DISTINCT docente_id) as total
      FROM horarios
      WHERE ciclo_id = $1
      `,
      [cicloId],
    );

    return resultado[0]?.total || 0;
  }

  private async getTotalCursos(cicloId: number): Promise<number> {
    const resultado = await this.entityManager.query(
      `
      SELECT COUNT(DISTINCT curso_id) as total
      FROM horarios
      WHERE ciclo_id = $1
      `,
      [cicloId],
    );

    return resultado[0]?.total || 0;
  }

  private getTemplateOperacional(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          .section-title { background-color: #f0f0f0; font-weight: bold; padding: 10px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte Operacional de Horarios</h1>
          <p>Ciclo Académico: {{ciclo}}</p>
          <p>Tipo: {{tipo}}</p>
          <p>Fecha de Generación: {{fecha}}</p>
        </div>

        <div class="section-title">Resumen de Clases Programadas (Total: {{totalClases}})</div>
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Docente</th>
              <th>Curso</th>
              <th>Aula/Laboratorio</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {{#each horarios}}
            <tr>
              <td>{{diaSemana}}</td>
              <td>{{horaInicio}}</td>
              <td>{{horaFin}}</td>
              <td>{{docente.nombreCompleto}}</td>
              <td>{{curso.nombre}} ({{curso.codigo}})</td>
              <td>{{ambiente.nombre}}</td>
              <td>{{tipoClase}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="footer">
          <p>Este documento fue generado automáticamente por el Sistema de Gestión de Horarios UNT</p>
        </div>
      </body>
      </html>
    `;
  }

  private getTemplateGestion(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4CAF50; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .metric-card { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; }
          .metric-value { font-size: 24px; font-weight: bold; color: #4CAF50; }
          .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .section-title { background-color: #4CAF50; color: white; padding: 15px; margin-top: 30px; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Gestión de Horarios</h1>
          <p>Ciclo Académico: {{ciclo}}</p>
          <p>Fecha: {{fecha}}</p>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-value">{{totalDocentes}}</div>
            <div class="metric-label">Docentes Asignados</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{totalCursos}}</div>
            <div class="metric-label">Cursos Programados</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{cumplimientoJerarquia.porcentajeCumplimiento}}%</div>
            <div class="metric-label">Cumplimiento Jerárquico</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{estadisticasCruces.generados_automaticos}}</div>
            <div class="metric-label">Generaciones Automáticas</div>
          </div>
        </div>

        <div class="section-title">Carga Horaria por Categoría</div>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Total de Horas</th>
              <th>Promedio de Horas/Bloque</th>
            </tr>
          </thead>
          <tbody>
            {{#each cargaPorCategoria}}
            <tr>
              <td>{{categoria}}</td>
              <td>{{total_horas}}</td>
              <td>{{promedio_horas}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="footer">
          <p>Reporte generado automáticamente por el Sistema de Gestión de Horarios</p>
          <p>UNT - Ingeniería de Software I</p>
        </div>
      </body>
      </html>
    `;
  }
}
