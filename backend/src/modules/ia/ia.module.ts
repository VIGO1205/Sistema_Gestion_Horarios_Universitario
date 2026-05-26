import { Module } from '@nestjs/common';
import { IAService } from './ia.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [IAService],
  exports: [IAService],
})
export class IAModule {}
