import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { IAService } from './ia.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IAController {
  constructor(private readonly iaService: IAService) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() body: { message: string; history?: any[]; context?: any }) {
    // Validar que el usuario sea DOCENTE
    if (req.user.rol !== 'docente') {
      throw new ForbiddenException('El ChatBot HORUS solo está disponible para docentes.');
    }
    return await this.iaService.chat(body.message, body.history, body.context);
  }
}
