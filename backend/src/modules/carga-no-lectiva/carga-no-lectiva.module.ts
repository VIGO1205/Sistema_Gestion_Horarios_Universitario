import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { CargaAcademica } from '../../entities/carga-academica.entity';
import { Docente } from '../../entities/docente.entity';
import { CargaNoLectivaService } from './carga-no-lectiva.service';
import { CargaNoLectivaController } from './carga-no-lectiva.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { DocentesModule } from '../docentes/docentes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CargaNoLectiva, CargaAcademica, Docente]),
    NotificacionesModule,
    DocentesModule,
  ],
  providers: [CargaNoLectivaService],
  controllers: [CargaNoLectivaController],
  exports: [CargaNoLectivaService],
})
export class CargaNoLectivaModule {}
