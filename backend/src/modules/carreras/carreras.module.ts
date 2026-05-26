import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrerasService } from './carreras.service';
import { CarrerasController } from './carreras.controller';
import { Carrera } from './entities/carrera.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carrera])],
  controllers: [CarrerasController],
  providers: [CarrerasService],
  exports: [CarrerasService],
})
export class CarrerasModule {}
