import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from '../../entities/curso.entity';
import { CursosService } from './cursos.service';
import { CursosController } from './cursos.controller';
import { IAModule } from '../ia/ia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Curso]),
    IAModule,
  ],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
