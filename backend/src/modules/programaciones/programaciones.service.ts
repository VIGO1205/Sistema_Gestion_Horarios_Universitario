import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProgramacionCursoCiclo } from '../../database/entities/programacion-curso-ciclo.entity';
import { CreateProgramacionDto } from './dto/create-programacion.dto';
import { UpdateProgramacionDto } from './dto/update-programacion.dto';
import { AsignacionDocenteCurso, TipoClase } from '../../entities/asignacion-docente-curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';

@Injectable()
export class ProgramacionesService {
  constructor(
    @InjectRepository(ProgramacionCursoCiclo)
    private programacionRepo: Repository<ProgramacionCursoCiclo>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    @InjectRepository(GrupoDocenteAsignacion)
    private grupoRepo: Repository<GrupoDocenteAsignacion>,
  ) {}

  async findAll(): Promise<ProgramacionCursoCiclo[]> {
    return await this.programacionRepo.find({ relations: ['curso', 'ciclo'] });
  }

  async findByCurso(cursoId: number): Promise<ProgramacionCursoCiclo[]> {
    return await this.programacionRepo.find({ where: { cursoId }, relations: ['ciclo'] });
  }

  async findOne(id: number): Promise<ProgramacionCursoCiclo> {
    const p = await this.programacionRepo.findOne({ where: { id }, relations: ['curso', 'ciclo'] });
    if (!p) throw new NotFoundException('Programación no encontrada');
    return p;
  }

  async create(dto: CreateProgramacionDto): Promise<ProgramacionCursoCiclo> {
    // basic validation handled by DTO; ensure unique constraint handled by DB
    const exists = await this.programacionRepo.findOne({ where: { cursoId: dto.cursoId, cicloId: dto.cicloId } });
    if (exists) {
      throw new BadRequestException('Ya existe una programación para este curso y ciclo.');
    }
    const entity = this.programacionRepo.create(dto as Partial<ProgramacionCursoCiclo>);
    return await this.programacionRepo.save(entity as any);
  }

  async update(id: number, dto: UpdateProgramacionDto): Promise<ProgramacionCursoCiclo> {
    const prog = await this.programacionRepo.findOne({ where: { id } });
    if (!prog) throw new NotFoundException('Programación no encontrada');

    // If reducing laboratorio horas to 0, ensure no laboratorio assignments exist
    if (dto.horasLaboratorio !== undefined && dto.horasLaboratorio <= 0) {
      const asignacionesLab = await this.asignacionRepo.find({ where: { cursoId: prog.cursoId, cicloId: prog.cicloId, tipoClase: TipoClase.LABORATORIO } });
      if (asignacionesLab.length > 0) {
        throw new BadRequestException('Existen asignaciones de laboratorio asociadas; elimina/actualiza esas asignaciones antes de quitar horas de laboratorio.');
      }
    }

    // If reducing numeroGrupos, ensure current groups do not exceed new limit
    if (dto.numeroGrupos !== undefined && dto.numeroGrupos >= 0) {
      // get all asignacion ids for this curso+ciclo with laboratorio
      const asignLab = await this.asignacionRepo.find({ where: { cursoId: prog.cursoId, cicloId: prog.cicloId, tipoClase: TipoClase.LABORATORIO } });
      if (asignLab.length > 0) {
        const asignIds = asignLab.map(a => a.id);
        const gruposCount = await this.grupoRepo.count({ where: { asignacionId: In(asignIds) } });
        if (gruposCount > Number(dto.numeroGrupos)) {
          throw new BadRequestException('Hay más grupos asignados que el nuevo número de grupos permitido. Ajusta o elimina grupos/asignaciones antes.');
        }
      }
    }

    Object.assign(prog, dto as any);
    return await this.programacionRepo.save(prog);
  }

  async remove(id: number): Promise<void> {
    const prog = await this.programacionRepo.findOne({ where: { id } });
    if (!prog) throw new NotFoundException('Programación no encontrada');

    const asignaciones = await this.asignacionRepo.find({ where: { cursoId: prog.cursoId, cicloId: prog.cicloId } });
    if (asignaciones.length > 0) {
      throw new BadRequestException('No se puede eliminar la programación porque existen asignaciones que dependen de ella.');
    }

    await this.programacionRepo.delete(id);
  }
}
