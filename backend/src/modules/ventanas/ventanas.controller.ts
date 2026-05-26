import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req, Delete } from '@nestjs/common';
import { VentanasService } from './ventanas.service';
import { CreateVentanaDto } from './dto/create-ventana.dto';
import { UpdateVentanaDto } from './dto/update-ventana.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('ventanas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VentanasController {
  constructor(private readonly ventanasService: VentanasService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  create(@Body() createVentanaDto: CreateVentanaDto) {
    return this.ventanasService.create(createVentanaDto);
  }

  @Get('mi-estado')
  @Roles(RolUsuario.DOCENTE)
  getMiEstado(@Req() req: any) {
    if (!req.user.docenteId) {
      return { estado: 'error', mensaje: 'Usuario no tiene docente asociado' };
    }
    return this.ventanasService.getMiEstado(req.user.docenteId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll() {
    return this.ventanasService.findAll();
  }

  @Get('activa')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findActive() {
    return this.ventanasService.findActive();
  }

  @Post(':id/llamar-siguiente')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  llamarSiguiente(@Param('id') id: string) {
    return this.ventanasService.llamarSiguiente(+id);
  }

  @Post('saltar/:docenteId')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  saltarDocente(@Param('docenteId') docenteId: string) {
    return this.ventanasService.saltarDocente(+docenteId);
  }

  @Post('extender/:docenteId')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  extenderTiempo(@Param('docenteId') docenteId: string, @Body('minutos') minutos: number) {
    return this.ventanasService.extenderTiempo(+docenteId, +minutos);
  }

  @Patch(':id/detener')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  detenerVentana(@Param('id') id: string) {
    return this.ventanasService.detenerVentana(+id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.ventanasService.remove(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  update(@Param('id') id: string, @Body() updateDto: UpdateVentanaDto) {
    return this.ventanasService.update(+id, updateDto);
  }

  @Patch('finalizar-turno/:docenteId')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  finalizarTurno(@Param('docenteId') docenteId: string) {
    return this.ventanasService.finalizarTurno(+docenteId);
  }

  @Get('validar-permiso/:docenteId')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  validarPermiso(@Param('docenteId') docenteId: string) {
    return this.ventanasService.validarPermisoRegistro(+docenteId);
  }

  @Get('cola')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  getCola(
    @Query('tipoContrato') tipoContrato?: string,
    @Query('categoria') categoria?: string,
    @Query('ventanaId') ventanaId?: string,
  ) {
    return this.ventanasService.getCola(tipoContrato, categoria, ventanaId ? +ventanaId : undefined);
  }

  @Get('atendidos')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  getAtendidos() {
    return this.ventanasService.getAtendidos();
  }

  @Get('en-atencion')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  getEnAtencion(
    @Query('tipoContrato') tipoContrato?: string,
    @Query('categoria') categoria?: string,
    @Query('ventanaId') ventanaId?: string,
  ) {
    return this.ventanasService.getEnAtencion(tipoContrato, categoria, ventanaId ? +ventanaId : undefined);
  }

  @Get('count-docentes')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  countDocentes(@Query('categoria') categoria: string) {
    return this.ventanasService.countDocentesPorCategoria(categoria);
  }

  @Get('stats')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  getStats() {
    return this.ventanasService.getStats();
  }
}
