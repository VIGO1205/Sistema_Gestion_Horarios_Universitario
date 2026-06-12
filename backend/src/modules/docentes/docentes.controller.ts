import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('docentes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  create(@Body() createDocenteDto: CreateDocenteDto) {
    return this.docentesService.create(createDocenteDto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll(
    @Query('search') search?: string,
    @Query('tipoContrato') tipoContrato?: string,
    @Query('categoria') categoria?: string,
    @Query('carreraId') carreraId?: string,
  ) {
    return this.docentesService.findAll({ search, tipoContrato, categoria, carreraId: carreraId ? +carreraId : undefined });
  }

  @Get('active')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findActive() {
    return this.docentesService.findActive();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.docentesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  update(@Param('id') id: string, @Body() updateDocenteDto: UpdateDocenteDto) {
    return this.docentesService.update(+id, updateDocenteDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.docentesService.remove(+id);
  }

  @Patch(':id/toggle-active')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  toggleActive(@Param('id') id: string) {
    return this.docentesService.toggleActive(+id);
  }

  @Get(':id/cursos')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  getCourses(
    @Param('id') id: string,
    @Query('cicloId') cicloId?: string,
  ) {
    return this.docentesService.findCourses(+id, cicloId ? +cicloId : undefined);
  }

  @Get(':id/validar-carga')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  validarCarga(@Param('id') id: string) {
    return this.docentesService.validarCargaCompleta(+id);
  }
}
