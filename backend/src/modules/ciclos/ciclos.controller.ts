import { Controller, Get, UseGuards } from '@nestjs/common';
import { CiclosService } from './ciclos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ciclos')
@UseGuards(JwtAuthGuard)
export class CiclosController {
  constructor(private readonly ciclosService: CiclosService) {}

  @Get()
  findAll() {
    return this.ciclosService.findAll();
  }

  @Get('actual')
  getActual() {
    return this.ciclosService.getCicloActual();
  }
}
