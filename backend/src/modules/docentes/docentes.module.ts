import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Docente } from '../../entities/docente.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { Curso } from '../../entities/curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { ProgramacionCursoCiclo } from '../../database/entities/programacion-curso-ciclo.entity';
import { Horario } from '../../entities/horario.entity';
import { DocentesService } from './docentes.service';
import { DocentesController } from './docentes.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Docente,
      AsignacionDocenteCurso,
      DocenteCarrera,
      Carrera,
      Curso,
      GrupoDocenteAsignacion,
      ProgramacionCursoCiclo,
      Horario,
    ]),
    UsuariosModule,
  ],
  controllers: [DocentesController],
  providers: [DocentesService],
  exports: [DocentesService],
})
export class DocentesModule {}
