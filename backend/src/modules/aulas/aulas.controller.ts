import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('aulas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  create(@Body() createAulaDto: CreateAulaDto) {
    return this.aulasService.create(createAulaDto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll(@Query('tipo') tipo?: string) {
    if (tipo) {
      return this.aulasService.findByTipo(tipo);
    }
    return this.aulasService.findAll();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.aulasService.findOne(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  update(@Param('id') id: string, @Body() updateAulaDto: UpdateAulaDto) {
    return this.aulasService.update(+id, updateAulaDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.aulasService.remove(+id);
  }

  @Patch(':id/toggle-disponibilidad')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  toggleDisponibilidad(@Param('id') id: string) {
    return this.aulasService.toggleDisponibilidad(+id);
  }
}
