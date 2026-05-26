import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horario } from '../../../entities/horario.entity';
import { Aula } from '../../../entities/aula.entity';
import { INSTITUCIONAL } from '../../../common/constants';

interface ValidacionResult {
  valido: boolean;
  conflictos: string[];
}

@Injectable()
export class ValidacionCrucesService {
  constructor(
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Aula)
    private aulaRepo: Repository<Aula>,
  ) {}

  async validarSinCruces(
    docenteId: number,
    aulaId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    cicloId: number,
    excluirHorarioId?: number,
    cursoId?: number, 
  ): Promise<ValidacionResult> {
    const conflictos: string[] = [];

    // 0. Validar Franja Institucional (Almuerzo)
    if (this.haySolapamiento(INSTITUCIONAL.ALMUERZO.INICIO, INSTITUCIONAL.ALMUERZO.FIN, horaInicio, horaFin)) {
      conflictos.push(INSTITUCIONAL.ALMUERZO.MENSAJE);
    }

    const query1 = this.horarioRepo.createQueryBuilder('h')
      .leftJoinAndSelect('h.curso', 'curso')
      .where('h.docenteId = :docenteId', { docenteId })
      .andWhere('h.diaSemana = :diaSemana', { diaSemana })
      .andWhere('h.cicloId = :cicloId', { cicloId });

    if (excluirHorarioId) {
      query1.andWhere('h.id != :excluirHorarioId', { excluirHorarioId });
    }

    const crucesDocente = await query1.getMany();
    let horasHoy = 0;
    
    // Calcular horas del bloque actual
    const duracionActual = this.timeToMinutes(horaFin) - this.timeToMinutes(horaInicio);
    horasHoy += duracionActual / 60;

    for (const cruce of crucesDocente) {
      const inicio = this.timeToMinutes(cruce.horaInicio);
      const fin = this.timeToMinutes(cruce.horaFin);
      horasHoy += (fin - inicio) / 60;

      if (this.haySolapamiento(cruce.horaInicio, cruce.horaFin, horaInicio, horaFin)) {
        conflictos.push(
          `Cruce de docente: Ya tienes clase de ${cruce.curso?.nombre || 'otro curso'} (${cruce.horaInicio.substring(0, 5)}-${cruce.horaFin.substring(0, 5)})`,
        );
      }
    }

    // 2. Validar límite de horas diarias
    if (horasHoy > INSTITUCIONAL.HORARIOS.LIMITE_HORAS_DIARIAS) {
      conflictos.push(`Límite diario excedido: No puedes superar las ${INSTITUCIONAL.HORARIOS.LIMITE_HORAS_DIARIAS} horas de clase por día (Total hoy: ${horasHoy.toFixed(1)}h)`);
    }

    // 3. Validar cruce con ambiente ocupado
    const query2 = this.horarioRepo.createQueryBuilder('h')
      .leftJoinAndSelect('h.curso', 'curso')
      .where('h.aulaId = :aulaId', { aulaId })
      .andWhere('h.diaSemana = :diaSemana', { diaSemana })
      .andWhere('h.cicloId = :cicloId', { cicloId });

    if (excluirHorarioId) {
      query2.andWhere('h.id != :excluirHorarioId', { excluirHorarioId });
    }

    const crucesAula = await query2.getMany();
    for (const cruce of crucesAula) {
      if (this.haySolapamiento(cruce.horaInicio, cruce.horaFin, horaInicio, horaFin)) {
        conflictos.push(`Cruce de ambiente: El aula ya está ocupada por el curso ${cruce.curso?.nombre || ''} (${cruce.horaInicio.substring(0, 5)}-${cruce.horaFin.substring(0, 5)})`);
        break;
      }
    }

    // 4. Validar cruce de grupo de alumnos (Mismo ciclo y carrera)
    if (cursoId) {
      const cursoActual = await this.horarioRepo.manager.getRepository('Curso').findOne({ 
        where: { id: cursoId },
        relations: ['carrera']
      }) as any;

      if (cursoActual) {
        const query3 = this.horarioRepo.createQueryBuilder('h')
          .leftJoinAndSelect('h.curso', 'curso')
          .where('h.diaSemana = :diaSemana', { diaSemana })
          .andWhere('h.cicloId = :cicloId', { cicloId })
          .andWhere('curso.cicloAcademico = :cicloAcad', { cicloAcad: cursoActual.cicloAcademico })
          .andWhere('curso.carreraId = :carreraId', { carreraId: cursoActual.carreraId });

        if (excluirHorarioId) {
          query3.andWhere('h.id != :excluirHorarioId', { excluirHorarioId });
        }

        const crucesGrupo = await query3.getMany();
        for (const cruce of crucesGrupo) {
          if (this.haySolapamiento(cruce.horaInicio, cruce.horaFin, horaInicio, horaFin)) {
            conflictos.push(`Cruce de grupo: Los alumnos de ${cursoActual.cicloAcademico} ya tienen clase de ${cruce.curso?.nombre} (${cruce.horaInicio.substring(0, 5)}-${cruce.horaFin.substring(0, 5)})`);
            break;
          }
        }
      }
    }

    // 5. Validar ambiente válido (Tipo de aula vs Tipo de clase)
    // Nota: Esto se valida mejor en el servicio de horarios al recibir el tipoClase,
    // pero podemos hacer una validación básica aquí si tenemos el aulaId.
    const aula = await this.aulaRepo.findOneBy({ id: aulaId });
    if (!aula) {
      conflictos.push('Ambiente inválido: El aula seleccionada no existe');
    } else if (!aula.disponible) {
      conflictos.push('Ambiente no disponible: El aula está marcada como no disponible');
    }

    return { valido: conflictos.length === 0, conflictos };
  }

  private haySolapamiento(
    horaInicio1: string,
    horaFin1: string,
    horaInicio2: string,
    horaFin2: string,
  ): boolean {
    // Convierte strings a minutos para comparación
    const inicio1 = this.timeToMinutes(horaInicio1);
    const fin1 = this.timeToMinutes(horaFin1);
    const inicio2 = this.timeToMinutes(horaInicio2);
    const fin2 = this.timeToMinutes(horaFin2);

    return !(fin2 <= inicio1 || inicio2 >= fin1);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async obtenerConflictosEnHorario(
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    cicloId: number,
  ): Promise<any[]> {
    return this.horarioRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.docente', 'docente')
      .leftJoinAndSelect('h.aula', 'aula')
      .leftJoinAndSelect('h.curso', 'curso')
      .where('h.diaSemana = :diaSemana', { diaSemana })
      .andWhere('h.cicloId = :cicloId', { cicloId })
      .andWhere(
        `(h.horaInicio < :horaFin AND h.horaFin > :horaInicio)`,
        { horaInicio, horaFin },
      )
      .getMany();
  }
}
