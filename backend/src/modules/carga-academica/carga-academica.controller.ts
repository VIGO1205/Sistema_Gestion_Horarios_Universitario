import { Controller, Patch, Get, Body, Query, UseGuards } from '@nestjs/common';
import { CargaAcademicaService } from './carga-academica.service';
import { UpdateDeclaracionDto } from './dto/update-declaracion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('carga-academica')
@UseGuards(JwtAuthGuard)
export class CargaAcademicaController {
  constructor(private readonly service: CargaAcademicaService) {}

  @Patch('declaracion')
  async updateDeclaracion(@Body() dto: UpdateDeclaracionDto) {
    return await this.service.updateDeclaracion(dto);
  }

  @Get('declaracion')
  async getDeclaracion(
    @Query('docenteId') docenteId: string,
    @Query('cicloId') cicloId: string,
  ) {
    return await this.service.getDeclaracion(+docenteId, +cicloId);
  }
}
