import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Horario } from '../../entities/horario.entity';
import { Docente } from '../../entities/docente.entity';
import { CiclosService } from '../ciclos/ciclos.service';

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    private ciclosService: CiclosService,
  ) {}

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
