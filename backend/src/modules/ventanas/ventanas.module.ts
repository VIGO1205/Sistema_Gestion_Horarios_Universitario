import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentanasService } from './ventanas.service';
import { VentanasController } from './ventanas.controller';
import { VentanasGateway } from './ventanas.gateway';
import { VentanaAtencion } from '../../database/entities/ventana-atencion.entity';
import { Docente } from '../../database/entities/docente.entity';
import { CargaAcademica } from '../../database/entities/carga-academica.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ReportesModule } from '../reportes/reportes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VentanaAtencion, Docente, CargaAcademica]),
    NotificacionesModule,
    ReportesModule,
  ],
  controllers: [VentanasController],
  providers: [VentanasService, VentanasGateway],
  exports: [VentanasService, VentanasGateway],
})
export class VentanasModule {}
