import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CiclosService } from './ciclos.service';
import { CiclosController } from './ciclos.controller';
import { CicloAcademico } from './entities/ciclo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CicloAcademico])],
  controllers: [CiclosController],
  providers: [CiclosService],
  exports: [CiclosService],
})
export class CiclosModule {}
