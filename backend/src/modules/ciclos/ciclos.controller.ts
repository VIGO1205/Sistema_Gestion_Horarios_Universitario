import { Controller, Get, Param, Put, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { CiclosService } from './ciclos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('ciclos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CiclosController {
  constructor(private readonly ciclosService: CiclosService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll() {
    return this.ciclosService.findAll();
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  create(@Body() data: any) {
    return this.ciclosService.create(data);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  update(@Param('id') id: string, @Body() data: any) {
    return this.ciclosService.update(+id, data);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  remove(@Param('id') id: string) {
    return this.ciclosService.remove(+id);
  }

  @Get('actual')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  getCicloActual() {
    return this.ciclosService.getCicloActual();
  }

  @Get(':id/configuracion')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  getConfiguracion(@Param('id') id: string) {
    return this.ciclosService.getConfiguracion(+id);
  }

  @Put(':id/configuracion')
  @Roles(RolUsuario.ADMIN)
  updateConfiguracion(@Param('id') id: string, @Body() data: any) {
    return this.ciclosService.updateConfiguracion(+id, data);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.ciclosService.findOne(+id);
  }
}
