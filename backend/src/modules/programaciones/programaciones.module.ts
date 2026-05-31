import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramacionCursoCiclo } from '../../database/entities/programacion-curso-ciclo.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { Curso } from '../../database/entities/curso.entity';
import { ProgramacionesService } from './programaciones.service';
import { ProgramacionesController } from './programaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramacionCursoCiclo, AsignacionDocenteCurso, GrupoDocenteAsignacion, Curso])],
  providers: [ProgramacionesService],
  controllers: [ProgramacionesController],
  exports: [ProgramacionesService],
})
export class ProgramacionesModule {}
