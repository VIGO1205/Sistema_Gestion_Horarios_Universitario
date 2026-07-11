import { Controller, Post, Body, Get, Param, Query, UseGuards, Put, Delete, Req } from '@nestjs/common';
import { HorariosService } from './horarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('horarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorariosController {
  constructor(private horariosService: HorariosService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll(
    @Query('cicloId') cicloId?: string,
    @Query('docenteId') docenteId?: string,
    @Query('aulaId') aulaId?: string,
    @Query('carreraId') carreraId?: string,
  ) {
    return this.horariosService.findAll({
      cicloId: cicloId ? +cicloId : undefined,
      docenteId: docenteId ? +docenteId : undefined,
      aulaId: aulaId ? +aulaId : undefined,
      carreraId: carreraId ? +carreraId : undefined,
    });
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async create(
    @Req() req: any,
    @Body()
    data: {
      docenteId: number;
      cursoId: number;
      aulaId: number;
      cicloId: number;
      tipoClase: string;
      diaSemana: number;
      horaInicio: string;
      horaFin: string;
      grupoId?: number;
    },
  ) {
    return this.horariosService.create(data, req.user);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    data: {
      docenteId?: number;
      cursoId?: number;
      aulaId?: number;
      cicloId?: number;
      tipoClase?: string;
      diaSemana?: number;
      horaInicio?: string;
      horaFin?: string;
      grupoId?: number;
    },
  ) {
    return this.horariosService.update(+id, data, req.user);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.horariosService.delete(+id, req.user);
  }

  @Post('generar')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  async generarHorarios(@Query('cicloId') cicloId?: string) {
    return this.horariosService.generarHorariosAutomaticos(cicloId ? +cicloId : undefined);
  }

  @Get('estadisticas')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async obtenerEstadisticas(@Query('cicloId') cicloId: string) {
    return this.horariosService.obtenerEstadisticas(+cicloId);
  }

  @Get('mapa-ocupacion')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async getMapaOcupacion(
    @Query('cicloId') cicloId: string,
    @Query('aulaId') aulaId?: string,
  ) {
    return this.horariosService.getMapaOcupacion(+cicloId, aulaId ? +aulaId : undefined);
  }

  @Post('validar-cruces')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  async validarCruces(
    @Body()
    validacionDto: {
      docenteId: number;
      aulaId: number;
      diaSemana: number;
      horaInicio: string;
      horaFin: string;
      cicloId: number;
    },
  ) {
    return this.horariosService.validarSinCruces(
      validacionDto.docenteId,
      validacionDto.aulaId,
      validacionDto.diaSemana,
      validacionDto.horaInicio,
      validacionDto.horaFin,
      +validacionDto.cicloId,
    );
  }
}
