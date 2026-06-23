import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CargaAcademica, EstadoCargaAcademica } from '../../entities/carga-academica.entity';
import { UpdateDeclaracionDto } from './dto/update-declaracion.dto';

@Injectable()
export class CargaAcademicaService {
  constructor(
    @InjectRepository(CargaAcademica)
    private readonly cargaAcademicaRepo: Repository<CargaAcademica>,
  ) {}

  async updateDeclaracion(dto: UpdateDeclaracionDto) {
    let ca = await this.cargaAcademicaRepo.findOne({
      where: { docenteId: dto.docenteId, cicloId: dto.cicloId },
    });

    if (!ca) {
      ca = this.cargaAcademicaRepo.create({
        docenteId: dto.docenteId,
        cicloId: dto.cicloId,
        estado: EstadoCargaAcademica.BORRADOR,
      });
    }

    ca.declaracionOpcion = dto.opcion;
    ca.estado = EstadoCargaAcademica.PENDIENTE;
    return await this.cargaAcademicaRepo.save(ca);
  }

  async getDeclaracion(docenteId: number, cicloId: number) {
    const ca = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
    });
    return { declaracionOpcion: ca?.declaracionOpcion ?? null, estado: ca?.estado ?? null };
  }
}
