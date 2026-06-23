import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ProgramacionCursoCiclo } from '../../database/entities/programacion-curso-ciclo.entity';
import { CreateProgramacionDto } from './dto/create-programacion.dto';
import { UpdateProgramacionDto } from './dto/update-programacion.dto';
import { UpdateCargaAcademicaDto } from './dto/update-carga-academica.dto';
import { AsignacionDocenteCurso, TipoClase } from '../../entities/asignacion-docente-curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { Horario } from '../../database/entities/horario.entity';
import { Curso } from '../../database/entities/curso.entity';

@Injectable()
export class ProgramacionesService {
  constructor(
    @InjectRepository(ProgramacionCursoCiclo)
    private programacionRepo: Repository<ProgramacionCursoCiclo>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    @InjectRepository(GrupoDocenteAsignacion)
    private grupoRepo: Repository<GrupoDocenteAsignacion>,
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
    private dataSource: DataSource,
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

  private calcularCreditos(p: Partial<ProgramacionCursoCiclo>): number {
    const horasT = Number(p.horasTeoria || 0);
    const horasP = Number(p.horasPractica || 0);
    const horasL = Number(p.horasLaboratorio || 0);

    // Fórmula UNT: T + P/2 + L/2 (los grupos no afectan los créditos)
    return horasT + (horasP / 2) + (horasL / 2);
  }

  async create(dto: CreateProgramacionDto): Promise<ProgramacionCursoCiclo> {
    // basic validation handled by DTO; ensure unique constraint handled by DB
    const exists = await this.programacionRepo.findOne({ where: { cursoId: dto.cursoId, cicloId: dto.cicloId } });
    if (exists) {
      throw new BadRequestException('Ya existe una programación para este curso y ciclo.');
    }

    const curso = await this.cursoRepo.findOne({ where: { id: dto.cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    // Default values for new group fields if not provided
    const data: Partial<ProgramacionCursoCiclo> = {
      ...dto,
      numGruposTeoria: dto.numGruposTeoria ?? (dto.horasTeoria > 0 ? 1 : 0),
      numGruposPractica: dto.numGruposPractica ?? (dto.horasPractica > 0 ? 1 : 0),
      numGruposLaboratorio: dto.numGruposLaboratorio ?? dto.numeroGrupos,
    };

    const creditosCalculados = this.calcularCreditos(data);
    if (creditosCalculados !== Number(curso.creditos)) {
      throw new BadRequestException(
        `La programación no coincide con los créditos del curso (${curso.creditos}). ` +
        `Calculado: ${creditosCalculados} (T:${data.horasTeoria}h, P:${data.horasPractica}h, L:${data.horasLaboratorio}h).`
      );
    }

    const entity = this.programacionRepo.create(data as Partial<ProgramacionCursoCiclo>);
    return await this.programacionRepo.save(entity as any);
  }

  async update(id: number, dto: UpdateProgramacionDto): Promise<ProgramacionCursoCiclo> {
    const prog = await this.programacionRepo.findOne({ where: { id }, relations: ['curso'] });
    if (!prog) throw new NotFoundException('Programación no encontrada');

    // If reducing numGruposLaboratorio, ensure current groups do not exceed new limit
    const newNumGruposLab = dto.numGruposLaboratorio ?? dto.numeroGrupos;
    if (newNumGruposLab !== undefined && newNumGruposLab >= 0) {
      const asignLab = await this.asignacionRepo.find({ where: { cursoId: prog.cursoId, cicloId: prog.cicloId, tipoClase: TipoClase.LABORATORIO } });
      if (asignLab.length > 0) {
        const asignIds = asignLab.map(a => a.id);
        const gruposCount = await this.grupoRepo.count({ where: { asignacionId: In(asignIds) } });
        if (gruposCount > Number(newNumGruposLab)) {
          throw new BadRequestException('Hay más grupos asignados que el nuevo número de grupos permitido. Ajusta o elimina grupos/asignaciones antes.');
        }
      }
    }

    // Validar créditos con los nuevos valores
    const updatedData = { ...prog, ...dto };
    const creditosCalculados = this.calcularCreditos(updatedData);
    if (prog.curso && creditosCalculados !== Number(prog.curso.creditos)) {
      throw new BadRequestException(
        `La actualización no coincide con los créditos del curso (${prog.curso.creditos}). ` +
        `Calculado: ${creditosCalculados}.`
      );
    }

    // Keep fields in sync during transition
    if (dto.numGruposLaboratorio !== undefined && dto.numeroGrupos === undefined) {
      (dto as any).numeroGrupos = dto.numGruposLaboratorio;
    } else if (dto.numeroGrupos !== undefined && dto.numGruposLaboratorio === undefined) {
      (dto as any).numGruposLaboratorio = dto.numeroGrupos;
    }

    Object.assign(prog, dto as any);
    return await this.programacionRepo.save(prog);
  }

  async findAssignmentsByDocente(docenteId: number, cicloId: number): Promise<AsignacionDocenteCurso[]> {
    return await this.asignacionRepo.find({
      where: { docenteId, cicloId },
      relations: ['curso', 'grupos', 'grupos.horarios', 'grupos.horarios.aula'],
    });
  }

  async bulkCreateOrUpdate(items: any[]): Promise<any> {
    const results: ProgramacionCursoCiclo[] = [];
    const errors: Array<{ cursoId: number; message: string }> = [];

    for (const item of items) {
      try {
        const { cursoId, cicloId } = item;
        const exists = await this.programacionRepo.findOne({ where: { cursoId, cicloId }, relations: ['curso'] });

        if (exists) {
          // Actualizar
          const updated = await this.update(exists.id, item);
          results.push(updated);
        } else {
          // Crear
          const created = await this.create(item);
          results.push(created);
        }
      } catch (error: any) {
        errors.push({
          cursoId: item.cursoId,
          message: error.message || 'Error desconocido',
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException({
        message: 'No se pudo procesar ninguna programación.',
        errors,
      });
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
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

  async getCargaAcademica(cicloId: number, carreraId?: number, cicloAcademico?: number, curriculaId?: number, cursoId?: number) {
    // Obtener todas las programaciones para el ciclo
    const query = this.programacionRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.curso', 'curso')
      .leftJoinAndSelect('p.ciclo', 'ciclo')
      .where('p.cicloId = :cicloId', { cicloId });

    if (carreraId) {
      query.andWhere('curso.carreraId = :carreraId', { carreraId });
    }

    if (cicloAcademico) {
      query.andWhere('curso.cicloAcademico = :cicloAcademico', { cicloAcademico });
    }

    if (curriculaId) {
      query.andWhere('curso.curriculaId = :curriculaId', { curriculaId });
    }

    if (cursoId) {
      query.andWhere('p.cursoId = :cursoId', { cursoId });
    }

    const programaciones = await query.getMany();

    // Para cada programación, obtener sus asignaciones y docentes
    const result = await Promise.all(programaciones.map(async (p) => {
      const asignaciones = await this.asignacionRepo.find({
        where: { cursoId: p.cursoId, cicloId: p.cicloId },
        relations: ['docente', 'grupos'],
      });

      // Asegurar que numGrupos sea al menos 1 si hay horas (Sanación de datos)
      if (p.horasTeoria > 0 && p.numGruposTeoria === 0) p.numGruposTeoria = 1;
      if (p.horasPractica > 0 && p.numGruposPractica === 0) p.numGruposPractica = 1;
      if (p.horasLaboratorio > 0 && p.numGruposLaboratorio === 0) p.numGruposLaboratorio = 1;

      return {
        ...p,
        asignaciones,
        creditosCalculados: this.calcularCreditos(p),
      };
    }));

    return result;
  }

  async updateCargaAcademica(dto: UpdateCargaAcademicaDto) {
    const { cursoId, cicloId, asignaciones } = dto;

    const prog = await this.programacionRepo.findOne({ where: { cursoId, cicloId } });
    if (!prog) {
      throw new BadRequestException('No existe programación para este curso y ciclo. Créala primero.');
    }

    // Sanación de datos: Asegurar que numGrupos sea al menos 1 si hay horas programadas
    if (prog.horasTeoria > 0 && prog.numGruposTeoria === 0) prog.numGruposTeoria = 1;
    if (prog.horasPractica > 0 && prog.numGruposPractica === 0) prog.numGruposPractica = 1;
    if (prog.horasLaboratorio > 0 && prog.numGruposLaboratorio === 0) prog.numGruposLaboratorio = 1;

    // Validaciones de horas y grupos
    const totalHorasT = asignaciones
      .filter(a => a.tipoClase === TipoClase.TEORIA)
      .reduce((sum, a) => sum + a.horasSemanales * a.grupos.length, 0);

    const totalHorasP = asignaciones
      .filter(a => a.tipoClase === TipoClase.PRACTICA)
      .reduce((sum, a) => sum + a.horasSemanales * a.grupos.length, 0);

    const totalHorasL = asignaciones
      .filter(a => a.tipoClase === TipoClase.LABORATORIO)
      .reduce((sum, a) => sum + a.horasSemanales * a.grupos.length, 0);

    // En teoría y práctica, el total de horas asignadas debe coincidir con horas * grupos programados
    if (totalHorasT > prog.horasTeoria * prog.numGruposTeoria) {
      throw new BadRequestException(`Carga de Teoría excedida. Máximo: ${prog.horasTeoria * prog.numGruposTeoria}h.`);
    }
    if (totalHorasP > prog.horasPractica * prog.numGruposPractica) {
      throw new BadRequestException(`Carga de Práctica excedida. Máximo: ${prog.horasPractica * prog.numGruposPractica}h.`);
    }

    // Validar duplicidad de grupos por tipo
    const gruposT = new Set();
    const gruposP = new Set();
    const gruposL = new Set();

    for (const asig of asignaciones) {
      for (const gNum of asig.grupos) {
        if (asig.tipoClase === TipoClase.TEORIA) {
          if (gruposT.has(gNum)) throw new BadRequestException(`Grupo ${gNum} de Teoría duplicado.`);
          const maxG = Math.max(1, prog.numGruposTeoria);
          if (gNum > maxG) throw new BadRequestException(`Grupo ${gNum} de Teoría no está programado.`);
          gruposT.add(gNum);
        }
        if (asig.tipoClase === TipoClase.PRACTICA) {
          if (gruposP.has(gNum)) throw new BadRequestException(`Grupo ${gNum} de Práctica duplicado.`);
          const maxG = Math.max(1, prog.numGruposPractica);
          if (gNum > maxG) throw new BadRequestException(`Grupo ${gNum} de Práctica no está programado.`);
          gruposP.add(gNum);
        }
        if (asig.tipoClase === TipoClase.LABORATORIO) {
          if (gruposL.has(gNum)) throw new BadRequestException(`Grupo ${gNum} de Laboratorio duplicado.`);
          const maxG = Math.max(1, prog.numGruposLaboratorio);
          if (gNum > maxG) throw new BadRequestException(`Grupo ${gNum} de Laboratorio no está programado.`);
          gruposL.add(gNum);
        }
      }
    }

    // Ejecutar actualización en transacción
    await this.dataSource.transaction(async (tm) => {
      // 0. Desvincular horarios que referencian los grupos antes de eliminar
      const actuales = await tm.find(AsignacionDocenteCurso, { where: { cursoId, cicloId } });
      if (actuales.length > 0) {
        const ids = actuales.map(a => a.id);
        const grupos = await tm.find(GrupoDocenteAsignacion, { where: { asignacionId: In(ids) } });
        if (grupos.length > 0) {
          const grupoIds = grupos.map(g => g.id);
          await tm.createQueryBuilder()
            .update(Horario)
            .set({ grupoId: null })
            .where('grupoId IN (:...grupoIds)', { grupoIds })
            .execute();
        }
        await tm.remove(actuales);
      }

      // 2. Crear nuevas asignaciones
      for (const asigDto of asignaciones) {
        const nuevaAsig = tm.create(AsignacionDocenteCurso, {
          docenteId: asigDto.docenteId,
          cursoId,
          cicloId,
          tipoClase: asigDto.tipoClase,
          // La carga lectiva es el total de horas frente a alumnos
          horasSemanales: asigDto.horasSemanales * asigDto.grupos.length,
        });
        const savedAsig = await tm.save(nuevaAsig);

        // 3. Crear grupos para esta asignación
        for (const gNum of asigDto.grupos) {
          const nuevoGrupo = tm.create(GrupoDocenteAsignacion, {
            asignacionId: savedAsig.id,
            numeroGrupo: gNum,
          });
          await tm.save(nuevoGrupo);
        }
      }
    });

    return { message: 'Carga académica actualizada correctamente.' };
  }
}
