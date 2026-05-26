import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { Horario } from '../../entities/horario.entity';
import { Docente } from '../../entities/docente.entity';
import { CiclosModule } from '../ciclos/ciclos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Horario, Docente]), CiclosModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
