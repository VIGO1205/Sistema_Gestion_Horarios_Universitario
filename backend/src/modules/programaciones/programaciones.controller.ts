import { Controller, Get, Post, Body, Param, Put, Delete, Query, ParseIntPipe, Patch } from '@nestjs/common';
import { ProgramacionesService } from './programaciones.service';
import { CreateProgramacionDto } from './dto/create-programacion.dto';
import { UpdateProgramacionDto } from './dto/update-programacion.dto';
import { UpdateCargaAcademicaDto } from './dto/update-carga-academica.dto';

@Controller('programacion-curso-ciclo')
export class ProgramacionesController {
  constructor(private service: ProgramacionesService) {}

  @Get()
  findAll(@Query('cursoId') cursoId?: string) {
    if (cursoId) return this.service.findByCurso(Number(cursoId));
    return this.service.findAll();
  }

  @Get('carga-academica/:cicloId')
  getCargaAcademica(
    @Param('cicloId', ParseIntPipe) cicloId: number,
    @Query('carreraId') carreraId?: string,
    @Query('cicloAcademico') cicloAcademico?: string,
    @Query('curriculaId') curriculaId?: string,
  ) {
    return this.service.getCargaAcademica(
      cicloId,
      carreraId ? Number(carreraId) : undefined,
      cicloAcademico ? Number(cicloAcademico) : undefined,
      curriculaId ? Number(curriculaId) : undefined,
    );
  }

  @Post('carga-academica')
  updateCargaAcademica(@Body() dto: UpdateCargaAcademicaDto) {
    return this.service.updateCargaAcademica(dto);
  }

  @Post('bulk')
  bulkCreateOrUpdate(@Body() items: any[]) {
    return this.service.bulkCreateOrUpdate(items);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProgramacionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProgramacionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
