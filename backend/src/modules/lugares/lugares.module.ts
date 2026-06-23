import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lugar } from '../../database/entities/lugar.entity';
import { LugaresService } from './lugares.service';
import { LugaresController } from './lugares.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lugar])],
  controllers: [LugaresController],
  providers: [LugaresService],
  exports: [LugaresService],
})
export class LugaresModule {}
