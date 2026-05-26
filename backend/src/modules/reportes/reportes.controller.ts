import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
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
