import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentanasService } from './ventanas.service';
import { VentanasController } from './ventanas.controller';
import { VentanasGateway } from './ventanas.gateway';
import { VentanaAtencion } from '../../database/entities/ventana-atencion.entity';
import { Docente } from '../../database/entities/docente.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VentanaAtencion, Docente]),
    NotificacionesModule,
  ],
  controllers: [VentanasController],
  providers: [VentanasService, VentanasGateway],
  exports: [VentanasService, VentanasGateway],
})
export class VentanasModule {}
