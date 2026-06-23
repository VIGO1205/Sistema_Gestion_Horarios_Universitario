import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { CurriculasService } from './curriculas.service';
import { CreateCurriculaDto } from './dto/create-curricula.dto';
import { UpdateCurriculaDto } from './dto/update-curricula.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

@Controller('curriculas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculasController {
  constructor(private readonly curriculasService: CurriculasService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @UseInterceptors(FileInterceptor('pdfArchivo', { storage }))
  create(
    @Body() body: any,
    @UploadedFile() pdfArchivo?: Express.Multer.File,
  ) {
    return this.curriculasService.create({
      nombre: body.nombre,
      anio: +body.anio,
      descripcion: body.descripcion,
      carreraId: +body.carreraId,
      pdfArchivo: pdfArchivo ? pdfArchivo.filename : undefined,
    });
  }

  @Post('importar-pdf')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async importFromPDF(
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
    @Body('anio') anio: string,
    @Body('descripcion') descripcion: string,
    @Body('carreraId') carreraId: string,
  ) {
    if (!file) {
      throw new Error('Debes subir un archivo PDF');
    }
    return this.curriculasService.importCurriculaFromPDF(readFileSync(file.path), {
      nombre,
      anio: +anio,
      descripcion,
      carreraId: +carreraId,
      pdfArchivo: file.filename,
    });
  }

  @Post(':id/previsualizar-cursos-pdf')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async previewCursosFromPDF(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.curriculasService.previewCursosFromPDF(+id, file);
  }

  @Post(':id/confirmar-cursos-pdf')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  async confirmImportCursosFromPreview(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.curriculasService.confirmImportCursosFromPreview(+id, body.cursos);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findAll(@Query('carreraId') carreraId?: string) {
    return this.curriculasService.findAll(carreraId ? +carreraId : undefined);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR, RolUsuario.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.curriculasService.findOne(+id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  @UseInterceptors(FileInterceptor('pdfArchivo', { storage }))
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() pdfArchivo?: Express.Multer.File,
  ) {
    const updateData: any = { ...body };
    if (pdfArchivo) {
      updateData.pdfArchivo = pdfArchivo.filename;
    }
    return this.curriculasService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.COORDINADOR)
  remove(@Param('id') id: string) {
    return this.curriculasService.remove(+id);
  }
}
