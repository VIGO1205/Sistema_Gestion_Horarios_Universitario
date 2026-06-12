import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Docente } from '../../entities/docente.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { Horario } from '../../entities/horario.entity';
import { CargaAcademica } from '../../entities/carga-academica.entity';
import { DocentesService } from './docentes.service';
import { DocentesController } from './docentes.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Docente,
      DocenteCarrera,
      Carrera,
      AsignacionDocenteCurso,
      Horario,
      CargaAcademica,
    ]),
    UsuariosModule,
  ],
  controllers: [DocentesController],
  providers: [DocentesService],
  exports: [DocentesService],
})
export class DocentesModule {}
