import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignacionFilial } from '../../entities/asignacion-filial.entity';
import { CursoFilial } from '../../entities/curso-filial.entity';
import { CreateAsignacionFilialDto } from './dto/create-asignacion-filial.dto';

@Injectable()
export class AsignacionFilialService {
  constructor(
    @InjectRepository(AsignacionFilial)
    private readonly asignacionRepo: Repository<AsignacionFilial>,
    @InjectRepository(CursoFilial)
    private readonly cursoRepo: Repository<CursoFilial>,
  ) {}

  async findByDocenteAndCiclo(docenteId: number, cicloId: number) {
    const asignacion = await this.asignacionRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['cursos', 'docente', 'ciclo'],
    });
    return asignacion || null;
  }

  async save(dto: CreateAsignacionFilialDto) {
    let asignacion = await this.asignacionRepo.findOne({
      where: { docenteId: dto.docenteId, cicloId: dto.cicloId },
      relations: ['cursos'],
    });

    if (asignacion) {
      if (asignacion.cursos?.length) {
        await this.cursoRepo.remove(asignacion.cursos);
      }
      Object.assign(asignacion, {
        facultad: dto.facultad,
        departamentoAcademico: dto.departamentoAcademico,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
      });
    } else {
      asignacion = this.asignacionRepo.create({
        docenteId: dto.docenteId,
        cicloId: dto.cicloId,
        facultad: dto.facultad,
        departamentoAcademico: dto.departamentoAcademico,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
      });
    }

    asignacion = await this.asignacionRepo.save(asignacion);

    const cursos = dto.cursos.map((curso) =>
      this.cursoRepo.create({
        asignacionFilialId: asignacion.id,
        nombre: curso.nombre,
        dependencia: curso.dependencia,
        horarioSemanal: curso.horarioSemanal,
        turno: curso.turno,
        totalHorasSemanales: curso.totalHorasSemanales,
      }),
    );

    await this.cursoRepo.save(cursos);

    return this.findByDocenteAndCiclo(dto.docenteId, dto.cicloId);
  }

  async remove(id: number) {
    const asignacion = await this.asignacionRepo.findOne({ where: { id } });
    if (!asignacion) {
      throw new NotFoundException(`Asignación filial ${id} no encontrada`);
    }
    await this.asignacionRepo.remove(asignacion);
  }
}
