import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CarrerasService } from './carreras.service';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('carreras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CarrerasController {
  constructor(private readonly carrerasService: CarrerasService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  create(@Body() createCarreraDto: CreateCarreraDto) {
    return this.carrerasService.create(createCarreraDto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll() {
    return this.carrerasService.findAll();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.carrerasService.findOne(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  update(@Param('id') id: string, @Body() updateCarreraDto: UpdateCarreraDto) {
    return this.carrerasService.update(+id, updateCarreraDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.carrerasService.remove(+id);
  }
}
