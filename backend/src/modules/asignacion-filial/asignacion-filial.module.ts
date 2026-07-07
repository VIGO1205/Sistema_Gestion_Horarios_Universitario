import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionFilial } from '../../entities/asignacion-filial.entity';
import { CursoFilial } from '../../entities/curso-filial.entity';
import { Horario } from '../../entities/horario.entity';
import { AsignacionFilialController } from './asignacion-filial.controller';
import { AsignacionFilialService } from './asignacion-filial.service';

@Module({
  imports: [TypeOrmModule.forFeature([AsignacionFilial, CursoFilial, Horario])],
  controllers: [AsignacionFilialController],
  providers: [AsignacionFilialService],
  exports: [AsignacionFilialService],
})
export class AsignacionFilialModule {}
