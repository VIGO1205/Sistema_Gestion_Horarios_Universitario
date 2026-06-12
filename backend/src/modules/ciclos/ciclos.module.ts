import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CiclosService } from './ciclos.service';
import { CiclosController } from './ciclos.controller';
import { CicloAcademico } from './entities/ciclo.entity';
import { ConfiguracionGrilla } from '../../database/entities/configuracion-grilla.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CicloAcademico, ConfiguracionGrilla])],
  controllers: [CiclosController],
  providers: [CiclosService],
  exports: [CiclosService],
})
export class CiclosModule {}
