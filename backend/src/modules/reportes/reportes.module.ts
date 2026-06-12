import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { Horario } from '../../entities/horario.entity';
import { Docente } from '../../entities/docente.entity';
import { Reporte } from '../../entities/reporte.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { CargaAcademica } from '../../entities/carga-academica.entity';
import { CicloAcademico } from '../../entities/ciclo-academico.entity';
import { CiclosModule } from '../ciclos/ciclos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Horario, 
      Docente, 
      Reporte, 
      AsignacionDocenteCurso, 
      CargaNoLectiva, 
      DocenteCarrera, 
      Carrera, 
      CargaAcademica,
      CicloAcademico
    ]), 
    CiclosModule
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
