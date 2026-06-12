import { Module } from '@nestjs/common';
import { IAService } from './ia.service';
import { IAController } from './ia.controller';
import { ConfigModule } from '@nestjs/config';

import { HorariosModule } from '../horarios/horarios.module';
import { DocentesModule } from '../docentes/docentes.module';
import { AulasModule } from '../aulas/aulas.module';
import { CiclosModule } from '../ciclos/ciclos.module';
import { ProgramacionesModule } from '../programaciones/programaciones.module';
import { CargaNoLectivaModule } from '../carga-no-lectiva/carga-no-lectiva.module';

@Module({
  imports: [ConfigModule, HorariosModule, DocentesModule, AulasModule, CiclosModule, ProgramacionesModule, CargaNoLectivaModule],
  controllers: [IAController],
  providers: [IAService],
  exports: [IAService],
})
export class IAModule {}
