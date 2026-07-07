import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { CargaNoLectivaService } from './carga-no-lectiva.service';
import { CreateCargaNoLectivaDto } from './dto/create-carga-no-lectiva.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EstadoCargaAcademica } from '../../entities/carga-academica.entity';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('carga-no-lectiva')
@UseGuards(JwtAuthGuard)
export class CargaNoLectivaController {
  constructor(private readonly service: CargaNoLectivaService) {}

  @Get()
  async get(@Query('docenteId') docenteId: string, @Query('cicloId') cicloId: string) {
    if (docenteId) {
      return await this.service.findByDocenteAndCiclo(+docenteId, +cicloId);
    }
    return await this.service.findAllByCiclo(+cicloId);
  }

  @Post()
  async save(@Body() dto: CreateCargaNoLectivaDto) {
    return await this.service.save(dto);
  }

  @Patch(':id/estado')
  async updateEstado(@Param('id') id: string, @Body('estado') estado: EstadoCargaAcademica, @Body('motivoRechazo') motivoRechazo?: string) {
    return await this.service.updateEstado(+id, estado, motivoRechazo);
  }

  @Post('generar-reportes-validados')
  @Roles(RolUsuario.ADMIN)
  @UseGuards(RolesGuard)
  async generarReportesParaValidados() {
    return await this.service.generarReportesParaValidados();
  }
}
