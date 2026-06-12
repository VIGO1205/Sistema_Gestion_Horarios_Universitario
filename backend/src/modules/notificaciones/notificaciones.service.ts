import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion, TipoNotificacion } from '../../database/entities/notificacion.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionRepo: Repository<Notificacion>,
  ) {}

  async create(docenteId: number, titulo: string, mensaje: string, tipo: TipoNotificacion) {
    const notificacion = this.notificacionRepo.create({
      docenteId,
      titulo,
      mensaje,
      tipo,
    });
    return await this.notificacionRepo.save(notificacion);
  }

  async findAllByDocente(docenteId: number) {
    return await this.notificacionRepo.find({
      where: { docenteId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: number) {
    return await this.notificacionRepo.update(id, { leido: true });
  }

  async markAllAsRead(docenteId: number) {
    return await this.notificacionRepo.update({ docenteId, leido: false }, { leido: true });
  }

  async countUnread(docenteId: number) {
    return await this.notificacionRepo.count({
      where: { docenteId, leido: false },
    });
  }

  async remove(id: number) {
    return await this.notificacionRepo.delete(id);
  }
}
