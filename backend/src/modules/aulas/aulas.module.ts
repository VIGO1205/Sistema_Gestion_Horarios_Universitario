import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aula } from './entities/aula.entity';
import { Lugar } from '../../database/entities/lugar.entity';
import { AulasService } from './aulas.service';
import { AulasController } from './aulas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Aula, Lugar])],
  controllers: [AulasController],
  providers: [AulasService],
  exports: [AulasService],
})
export class AulasModule {}
