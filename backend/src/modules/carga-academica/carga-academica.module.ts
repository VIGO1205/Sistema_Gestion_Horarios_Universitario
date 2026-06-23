import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaAcademica } from '../../entities/carga-academica.entity';
import { CargaAcademicaService } from './carga-academica.service';
import { CargaAcademicaController } from './carga-academica.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CargaAcademica])],
  providers: [CargaAcademicaService],
  controllers: [CargaAcademicaController],
  exports: [CargaAcademicaService],
})
export class CargaAcademicaModule {}
