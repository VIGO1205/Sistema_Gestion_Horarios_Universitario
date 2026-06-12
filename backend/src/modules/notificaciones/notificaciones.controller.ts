import { Controller, Get, Post, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../database/entities/usuario.entity';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mi-bandeja')
  @Roles(RolUsuario.DOCENTE)
  getMiBandeja(@Req() req: any) {
    return this.notificacionesService.findAllByDocente(req.user.docenteId);
  }

  @Get('unread-count')
  @Roles(RolUsuario.DOCENTE)
  getUnreadCount(@Req() req: any) {
    return this.notificacionesService.countUnread(req.user.docenteId);
  }

  @Patch(':id/read')
  @Roles(RolUsuario.DOCENTE)
  read(@Param('id') id: string) {
    return this.notificacionesService.markAsRead(+id);
  }

  @Patch('read-all')
  @Roles(RolUsuario.DOCENTE)
  readAll(@Req() req: any) {
    return this.notificacionesService.markAllAsRead(req.user.docenteId);
  }

  @Post('mark-all-read')
  @Roles(RolUsuario.DOCENTE)
  markAllRead(@Req() req: any) {
    return this.notificacionesService.markAllAsRead(req.user.docenteId);
  }

  @Post(':id/delete')
  @Roles(RolUsuario.DOCENTE)
  remove(@Param('id') id: string) {
    return this.notificacionesService.remove(+id);
  }
}
