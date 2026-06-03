import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CargaNoLectiva, EstadoCargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { CreateCargaNoLectivaDto } from './dto/create-carga-no-lectiva.dto';

@Injectable()
export class CargaNoLectivaService {
  constructor(
    @InjectRepository(CargaNoLectiva)
    private readonly cargaRepo: Repository<CargaNoLectiva>,
  ) {}

  async findByDocenteAndCiclo(docenteId: number, cicloId: number) {
    return await this.cargaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['docente', 'ciclo'],
    });
  }

  async findAllByCiclo(cicloId: number) {
    return await this.cargaRepo.find({
      where: { cicloId },
      relations: ['docente'],
    });
  }

  async save(dto: CreateCargaNoLectivaDto) {
    const existing = await this.findByDocenteAndCiclo(dto.docenteId, dto.cicloId);

    if (existing) {
      // Si el docente está guardando, por defecto pasa a PENDIENTE si no se especifica lo contrario
      // a menos que ya esté VALIDADO, en cuyo caso solo el admin/coordinador debería cambiarlo.
      if (!dto.estado && existing.estado !== EstadoCargaNoLectiva.VALIDADO) {
        dto.estado = EstadoCargaNoLectiva.PENDIENTE;
      }
      
      const updated = this.cargaRepo.merge(existing, dto);
      return await this.cargaRepo.save(updated);
    }

    const created = this.cargaRepo.create({
      ...dto,
      estado: dto.estado || EstadoCargaNoLectiva.PENDIENTE,
    });
    return await this.cargaRepo.save(created);
  }

  async updateEstado(id: number, estado: EstadoCargaNoLectiva) {
    const carga = await this.cargaRepo.findOne({ where: { id } });
    if (!carga) throw new NotFoundException('Carga no lectiva no encontrada');
    
    carga.estado = estado;
    return await this.cargaRepo.save(carga);
  }
}
