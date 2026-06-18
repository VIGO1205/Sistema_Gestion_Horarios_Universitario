import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculasService } from './curriculas.service';
import { CurriculasController } from './curriculas.controller';
import { Curricula } from './entities/curricula.entity';
import { IAModule } from '../ia/ia.module';
import { CursosModule } from '../cursos/cursos.module';
import { PublicController } from '../public/public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Curricula]), IAModule, CursosModule],
  controllers: [CurriculasController, PublicController],
  providers: [CurriculasService],
  exports: [CurriculasService]
})
export class CurriculasModule {}
