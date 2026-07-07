import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignacionFilial } from '../../entities/asignacion-filial.entity';
import { CursoFilial } from '../../entities/curso-filial.entity';
import { Horario } from '../../entities/horario.entity';
import { CreateAsignacionFilialDto } from './dto/create-asignacion-filial.dto';

@Injectable()
export class AsignacionFilialService {
  constructor(
    @InjectRepository(AsignacionFilial)
    private readonly asignacionRepo: Repository<AsignacionFilial>,
    @InjectRepository(CursoFilial)
    private readonly cursoRepo: Repository<CursoFilial>,
    @InjectRepository(Horario)
    private readonly horarioRepo: Repository<Horario>,
  ) {}

  private diaToNumber(dia: string): number {
    const map: Record<string, number> = {
      'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4,
      'Viernes': 5, 'Sábado': 6, 'Domingo': 7,
    };
    return map[dia] || 0;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = (time || '').split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private async validateNoConflicts(dto: CreateAsignacionFilialDto) {
    const horarios = await this.horarioRepo.find({
      where: { docenteId: dto.docenteId, cicloId: dto.cicloId },
      relations: ['curso'],
    });
    const conflictos: string[] = [];

    for (const curso of dto.cursos) {
      if (!curso.horarioSemanal) continue;
      for (const slot of curso.horarioSemanal) {
        const diaNum = this.diaToNumber(slot.dia);
        if (!diaNum) continue;
        const sA = this.timeToMinutes(slot.horaInicio);
        const eA = this.timeToMinutes(slot.horaFin);
        if (eA <= sA) continue;

        // Buscar horarios existentes del docente en el mismo día
        conflictos.push(...horarios
          .filter(h => h.diaSemana === diaNum)
          .filter(h => {
            const hInicio = this.timeToMinutes(h.horaInicio.substring(0, 5));
            const hFin = this.timeToMinutes(h.horaFin.substring(0, 5));
            return sA < hFin && hInicio < eA;
          })
          .map(h => {
            const tipo = h.tipoClase === 'no_lectiva'
              ? `actividad "${h.actividadNoLectiva || 'No Lectiva'}"`
              : `clase de "${h.curso?.nombre || 'Curso'}"`;
            return `El curso "${curso.nombre}" (${slot.dia} ${slot.horaInicio}-${slot.horaFin}) se cruza con ${tipo} (${slot.dia} ${h.horaInicio.substring(0, 5)}-${h.horaFin.substring(0, 5)})`;
          }));
      }
    }

    if (conflictos.length > 0) {
      throw new ConflictException(conflictos.join('; '));
    }
  }

  async findByDocenteAndCiclo(docenteId: number, cicloId: number) {
    const asignacion = await this.asignacionRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['cursos', 'docente', 'ciclo'],
    });
    return asignacion || null;
  }

  async save(dto: CreateAsignacionFilialDto) {
    // Validar cruces antes de guardar
    await this.validateNoConflicts(dto);

    let asignacion = await this.asignacionRepo.findOne({
      where: { docenteId: dto.docenteId, cicloId: dto.cicloId },
      relations: ['cursos'],
    });

    if (asignacion) {
      if (asignacion.cursos?.length) {
        await this.cursoRepo.remove(asignacion.cursos);
        asignacion.cursos = [];
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
