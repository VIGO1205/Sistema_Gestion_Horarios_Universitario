import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { ConfirmImportCursosDto } from './dto/confirm-import-cursos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('cursos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  create(@Body() createCursoDto: CreateCursoDto) {
    return this.cursosService.create(createCursoDto);
  }

  @Post('importar-ia')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importFromIA(
    @UploadedFile() file: Express.Multer.File,
    @Body('carreraId') carreraId: string,
  ) {
    return this.cursosService.importFromIAPreview(file, +carreraId);
  }

  @Post('importar-ia/confirmar')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  async confirmImportFromIA(@Body() body: ConfirmImportCursosDto) {
    return this.cursosService.confirmImportFromIA(body.carreraId, body.cursos);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll(@Query('ciclo') ciclo?: string, @Query('carreraId') carreraId?: string, @Query('departamento') departamento?: string) {
    return this.cursosService.findAll(carreraId ? +carreraId : undefined, ciclo, departamento);
  }

  @Get('departamentos')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findDepartamentos() {
    return this.cursosService.findUniqueDepartamentos();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.cursosService.findOne(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  update(@Param('id') id: string, @Body() updateCursoDto: UpdateCursoDto) {
    return this.cursosService.update(+id, updateCursoDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.cursosService.remove(+id);
  }
}
