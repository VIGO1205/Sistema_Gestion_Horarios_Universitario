import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IAService } from './ia.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IAController {
  constructor(private readonly iaService: IAService) {}

  @Post('chat')
  async chat(@Body() body: { message: string; history?: any[]; context?: any }) {
    return await this.iaService.chat(body.message, body.history, body.context);
  }
}
