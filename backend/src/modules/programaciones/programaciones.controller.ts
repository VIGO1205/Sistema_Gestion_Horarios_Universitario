import { Controller, Get, Post, Body, Param, Put, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ProgramacionesService } from './programaciones.service';
import { CreateProgramacionDto } from './dto/create-programacion.dto';
import { UpdateProgramacionDto } from './dto/update-programacion.dto';

@Controller('programacion-curso-ciclo')
export class ProgramacionesController {
  constructor(private service: ProgramacionesService) {}

  @Get()
  findAll(@Query('cursoId') cursoId?: string) {
    if (cursoId) return this.service.findByCurso(Number(cursoId));
    return this.service.findAll();
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
