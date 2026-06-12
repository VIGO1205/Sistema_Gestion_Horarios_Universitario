import { Controller, Get, Param, Res, UseGuards, Patch, Query } from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get()
  async getReportes(
    @Query('docenteId') docenteId?: string,
    @Query('cicloId') cicloId?: string,
  ) {
    return this.reportesService.findAll(
      docenteId ? +docenteId : undefined,
      cicloId ? +cicloId : undefined
    );
  }

  @Patch(':id/firmar')
  async firmarReporte(@Param('id') id: string) {
    return this.reportesService.firmar(+id);
  }

  @Get('descargar/:id')
  async descargarReporte(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.reportesService.generarPDFReporte(+id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(pdf);
  }

  @Get('descargar-excel/:id')
  async descargarReporteExcel(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { excel, filename } = await this.reportesService.generarExcelReporte(+id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(excel);
  }

  @Get('operacional/:cicloId/:tipo')
  async generarOperacional(
    @Param('cicloId') cicloId: string,
    @Param('tipo') tipo: 'aula' | 'laboratorio',
    @Res() res: Response,
  ) {
    const pdf = await this.reportesService.generarReporteOperacional(+cicloId, tipo);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${tipo}-${cicloId}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('gestion/:cicloId')
  async generarGestion(
    @Param('cicloId') cicloId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.reportesService.generarReporteGestion(+cicloId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-gestion-${cicloId}.pdf"`,
    });
    res.send(pdf);
  }
}
