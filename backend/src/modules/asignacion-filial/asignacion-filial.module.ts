import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionFilial } from '../../entities/asignacion-filial.entity';
import { CursoFilial } from '../../entities/curso-filial.entity';
import { AsignacionFilialController } from './asignacion-filial.controller';
import { AsignacionFilialService } from './asignacion-filial.service';

@Module({
  imports: [TypeOrmModule.forFeature([AsignacionFilial, CursoFilial])],
  controllers: [AsignacionFilialController],
  providers: [AsignacionFilialService],
  exports: [AsignacionFilialService],
})
export class AsignacionFilialModule {}
