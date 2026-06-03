import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { CargaNoLectivaService } from './carga-no-lectiva.service';
import { CargaNoLectivaController } from './carga-no-lectiva.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CargaNoLectiva])],
  providers: [CargaNoLectivaService],
  controllers: [CargaNoLectivaController],
  exports: [CargaNoLectivaService],
})
export class CargaNoLectivaModule {}
