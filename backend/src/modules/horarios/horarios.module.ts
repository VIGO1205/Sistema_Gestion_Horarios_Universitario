import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorariosService } from './horarios.service';
import { HorariosController } from './horarios.controller';
import { ValidacionCrucesService } from './services/validacion-cruces.service';
import { HorariosGateway } from './horarios.gateway';
import { CiclosModule } from '../ciclos/ciclos.module';
import { VentanasModule } from '../ventanas/ventanas.module';
import { Horario } from '../../entities/horario.entity';
import { Docente } from '../../entities/docente.entity';
import { Aula } from '../../entities/aula.entity';
import { Curso } from '../../entities/curso.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { AsignacionFilial } from '../../database/entities/asignacion-filial.entity';
import { CursoFilial } from '../../database/entities/curso-filial.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Horario,
      Docente,
      Aula,
      Curso,
      AsignacionDocenteCurso,
      GrupoDocenteAsignacion,
      CargaNoLectiva,
      AsignacionFilial,
      CursoFilial,
    ]),
    CiclosModule,
    VentanasModule,
  ],
  controllers: [HorariosController],
  providers: [HorariosService, ValidacionCrucesService, HorariosGateway],
  exports: [HorariosService, ValidacionCrucesService, HorariosGateway],
})
export class HorariosModule {}
