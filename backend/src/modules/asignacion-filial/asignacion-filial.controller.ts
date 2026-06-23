import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../entities/usuario.entity';
import { AsignacionFilialService } from './asignacion-filial.service';
import { CreateAsignacionFilialDto } from './dto/create-asignacion-filial.dto';

@Controller('asignacion-filial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionFilialController {
  constructor(private readonly service: AsignacionFilialService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async get(
    @Query('docenteId', ParseIntPipe) docenteId: number,
    @Query('cicloId', ParseIntPipe) cicloId: number,
  ) {
    return this.service.findByDocenteAndCiclo(docenteId, cicloId);
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async save(@Body() dto: CreateAsignacionFilialDto) {
    return this.service.save(dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
