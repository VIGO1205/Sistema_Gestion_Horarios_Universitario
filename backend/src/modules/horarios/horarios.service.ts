import { Injectable, Logger, ConflictException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { Horario, ActividadNoLectiva } from '../../database/entities/horario.entity';
import { Aula } from '../../entities/aula.entity';
import { Curso } from '../../entities/curso.entity';
import { Docente } from '../../entities/docente.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { CargaNoLectiva } from '../../database/entities/carga-no-lectiva.entity';
import { TipoClase } from '../../entities/asignacion-docente-curso.entity';
import { ValidacionCrucesService } from './services/validacion-cruces.service';
import { CiclosService } from '../ciclos/ciclos.service';
import { VentanasService } from '../ventanas/ventanas.service';
import { RolUsuario } from '../../database/entities/usuario.entity';
import { HorariosGateway } from './horarios.gateway';
import { INSTITUCIONAL } from '../../common/constants';

@Injectable()
export class HorariosService {
  private readonly logger = new Logger(HorariosService.name);

  constructor(
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Aula)
    private aulaRepo: Repository<Aula>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    @InjectRepository(GrupoDocenteAsignacion)
    private grupoRepo: Repository<GrupoDocenteAsignacion>,
    @InjectRepository(CargaNoLectiva)
    private cargaNoLectivaRepo: Repository<CargaNoLectiva>,
    private dataSource: DataSource,
    private validacionService: ValidacionCrucesService,
    private ciclosService: CiclosService,
    private ventanasService: VentanasService,
    @Inject(HorariosGateway)
    @Optional()
    private horariosGateway?: HorariosGateway,
  ) {}

  async create(data: {
    docenteId: number;
    cursoId?: number;
    aulaId?: number;
    cicloId: number;
    tipoClase: string;
    actividadNoLectiva?: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    grupoId?: number;
  }, user?: any): Promise<Horario> {
    return (await this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Validar Permisos
      if (user?.rol === RolUsuario.DOCENTE) {
        if (!user.docenteId || Number(user.docenteId) !== Number(data.docenteId)) {
          throw new BadRequestException('No tienes permiso para registrar horarios para otro docente');
        }
        const permiso = await this.ventanasService.validarPermisoRegistro(Number(user.docenteId));
        if (!permiso.permitido) {
          throw new BadRequestException(permiso.mensaje || 'No tienes permiso para registrar horarios en este momento');
        }
      }

      // 2. Validar Cruces (GPS de Horarios)
      const validacion = await this.validacionService.validarSinCruces(
        data.docenteId,
        data.aulaId ?? null,
        data.diaSemana,
        data.horaInicio,
        data.horaFin,
        data.cicloId,
      );

      if (!validacion.valido) {
        throw new ConflictException(validacion.conflictos.join(', '));
      }

      // 3. Validar Duración
      const duracionMin = this.timeToMinutes(data.horaFin) - this.timeToMinutes(data.horaInicio);
      if (duracionMin <= 0) {
        throw new BadRequestException('La hora fin debe ser mayor que la hora inicio');
      }

      // 4. Validar y Resolver Grupos / Carga (Solo para LECTIVA)
      if (data.tipoClase !== 'no_lectiva') {
        if (!data.cursoId) throw new BadRequestException('El curso es obligatorio para carga lectiva');
        if (!data.aulaId) throw new BadRequestException('El aula es obligatoria para carga lectiva');

        const asignacion = await manager.getRepository(AsignacionDocenteCurso).findOne({
          where: {
            docenteId: data.docenteId,
            cursoId: data.cursoId,
            cicloId: data.cicloId,
            tipoClase: data.tipoClase as any,
          },
          relations: ['grupos'],
        });

        if (!asignacion) {
          throw new BadRequestException(`No existe una asignación de carga académica para este docente, curso y tipo de clase (${data.tipoClase}) en el ciclo seleccionado.`);
        }

        // Si la asignación tiene grupos definidos, es obligatorio elegir uno
        if (asignacion.grupos && asignacion.grupos.length > 0) {
          data.grupoId = await this.validarYResolverGrupo(
            asignacion,
            data.grupoId,
            undefined,
            manager
          );
        }

        await this.validarCargaHoraria(
          asignacion,
          data.horaInicio,
          data.horaFin,
          undefined,
          manager
        );
      } else {
        // Lógica para NO LECTIVA
        if (!data.actividadNoLectiva) {
          throw new BadRequestException('La actividad es obligatoria para carga no lectiva');
        }
        
        await this.validarCargaNoLectiva(
          data.docenteId,
          data.cicloId,
          data.actividadNoLectiva,
          data.horaInicio,
          data.horaFin,
          undefined,
          manager
        );
      }

      // 5. Guardar Horario
      const horarioRepo = manager.getRepository(Horario);
      const horario = horarioRepo.create({
        ...data,
        tipoClase: data.tipoClase as any,
        actividadNoLectiva: data.actividadNoLectiva as any,
        esAutomatico: false,
      } as any);

      const guardado = await horarioRepo.save(horario as any) as Horario;

      // 6. Emitir actualización
      this.emitUpdate(guardado.cicloId);

      return guardado;
    })) as Horario;
  }

  private async emitUpdate(cicloId: number) {
    try {
      this.logger.log(`Solicitando emisión de actualización para ciclo: ${cicloId}`);
      if (this.horariosGateway) {
        this.horariosGateway.emitUpdate(cicloId);
      } else {
        this.logger.warn('HorariosGateway no está disponible para emitir actualización');
      }
    } catch (e) {
      this.logger.warn(`[horarios:update emit error] ${e.message}`);
    }
  }

  private async intentarLlenadoAutomatico(horario: Horario, manager: EntityManager): Promise<void> {
    const asignacion = await manager.getRepository(AsignacionDocenteCurso).findOne({
      where: { 
        docenteId: horario.docenteId, 
        cursoId: horario.cursoId, 
        tipoClase: horario.tipoClase as any,
        cicloId: horario.cicloId 
      }
    });

    if (!asignacion) return;

    const horasOcupadas = await this.getCourseWorkload(horario.cursoId, horario.cicloId, manager);
    const horasAsignadas = horario.tipoClase === 'teoria' ? horasOcupadas.teoria : 
                          horario.tipoClase === 'practica' ? horasOcupadas.practica : 
                          horasOcupadas.laboratorio;

    let horasRestantes = asignacion.horasSemanales - horasAsignadas;

    if (horasRestantes > 0) {
      this.logger.log(`Iniciando llenado automático: ${horasRestantes}h restantes para ${horario.tipoClase}`);
      
      const duracionBloque = (this.timeToMinutes(horario.horaFin) - this.timeToMinutes(horario.horaInicio)) / 60;

      // Intentar buscar el mismo slot en otros días
      for (let dia = 1; dia <= 6; dia++) {
        if (dia === horario.diaSemana) continue;
        if (horasRestantes <= 0) break;

        const validacion = await this.validacionService.validarSinCruces(
          horario.docenteId,
          horario.aulaId,
          dia,
          horario.horaInicio,
          horario.horaFin,
          horario.cicloId,
        );

        if (validacion.valido) {
          const nuevoHorario = manager.getRepository(Horario).create({
            docenteId: horario.docenteId,
            cursoId: horario.cursoId,
            aulaId: horario.aulaId,
            cicloId: horario.cicloId,
            tipoClase: horario.tipoClase,
            diaSemana: dia,
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            esAutomatico: true,
          });
          await manager.getRepository(Horario).save(nuevoHorario);
          this.logger.log(`Llenado automático exitoso: Día ${dia} ${horario.horaInicio}-${horario.horaFin}`);
          horasRestantes -= duracionBloque;
        }
      }
    }
  }

  async findAll(filtros: {
    cicloId?: number;
    docenteId?: number;
    aulaId?: number;
    carreraId?: number;
  }): Promise<Horario[]> {
    const qb = this.horarioRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.docente', 'docente')
      .leftJoinAndSelect('docente.carreras', 'docenteCarrera')
      .leftJoinAndSelect('docenteCarrera.carrera', 'carrera')
      .leftJoinAndSelect('h.curso', 'curso')
      .leftJoinAndSelect('h.grupo', 'grupo')
      .leftJoinAndSelect('h.aula', 'aula')
      .leftJoinAndSelect('h.ciclo', 'ciclo')
      .orderBy('h.diaSemana', 'ASC')
      .addOrderBy('h.horaInicio', 'ASC')
      .distinct(true);

    if (filtros.cicloId) qb.andWhere('h.cicloId = :cicloId', { cicloId: filtros.cicloId });
    if (filtros.docenteId) qb.andWhere('h.docenteId = :docenteId', { docenteId: filtros.docenteId });
    if (filtros.aulaId) qb.andWhere('h.aulaId = :aulaId', { aulaId: filtros.aulaId });
    if (filtros.carreraId) qb.andWhere('carrera.id = :carreraId', { carreraId: filtros.carreraId });

    return await qb.getMany();
  }

  async generarHorariosAutomaticos(cicloIdInput?: number): Promise<{
    exitosos: number;
    conflictos: any[];
    horarios: Horario[];
  }> {
    let cicloId = cicloIdInput;
    if (!cicloId) {
      const cicloActual = await this.ciclosService.asegurarCicloActual();
      cicloId = cicloActual.id;
    }
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Obtener docentes ordenados jerárquicamente
      const docentesOrdenados = await this.docenteRepo
        .createQueryBuilder('d')
        .where('d.activo = :activo', { activo: true })
        .orderBy(
          `CASE d.tipoContrato WHEN 'nombrado' THEN 1 WHEN 'contratado' THEN 2 END`,
          'ASC',
        )
        .addOrderBy(
          `CASE d.categoria WHEN 'principal' THEN 1 WHEN 'asociado' THEN 2 WHEN 'auxiliar' THEN 3 WHEN 'jefe_practica' THEN 4 END`,
          'ASC',
        )
        .addOrderBy('d.antiguedadAnios', 'DESC')
        .getMany();

      const horariosGenerados: Horario[] = [];
      const conflictos: any[] = [];

      // Estado de ocupación en memoria (optimización)
      const ocupacionAulas = new Map<string, boolean>();
      const ocupacionDocentes = new Map<string, boolean>();

      // Cargar horarios existentes en memoria
      const horariosExistentes = await this.horarioRepo.find({
        where: { cicloId },
      });

      horariosExistentes.forEach((h) => {
        const hInicio = parseInt(h.horaInicio.split(':')[0]);
        const hFin = parseInt(h.horaFin.split(':')[0]);
        const duracion = hFin - hInicio;

        for (let i = 0; i < duracion; i++) {
          const slotInicio = `${(hInicio + i).toString().padStart(2, '0')}:00:00`;
          const slotFin = `${(hInicio + i + 1).toString().padStart(2, '0')}:00:00`;
          const keyAula = `${h.aulaId}_${h.diaSemana}_${slotInicio}_${slotFin}`;
          const keyDocente = `${h.docenteId}_${h.diaSemana}_${slotInicio}_${slotFin}`;
          ocupacionAulas.set(keyAula, true);
          ocupacionDocentes.set(keyDocente, true);
        }
      });

      // 2. Asignar por orden jerárquico
      for (const docente of docentesOrdenados) {
        const cursosAsignados = await queryRunner.manager
          .getRepository(AsignacionDocenteCurso)
          .find({
            where: { docenteId: docente.id },
            relations: ['curso'],
          });

        for (const asignacion of cursosAsignados) {
          const curso = asignacion.curso;
          // Por ahora omitimos la generación automática que dependía de créditos segmentados
          // El usuario prefiere validación manual en la UI de asignación
          continue;
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Generación completada: ${horariosGenerados.length} exitosos, ${conflictos.length} conflictos`,
      );

      return {
        exitosos: horariosGenerados.length,
        conflictos,
        horarios: horariosGenerados,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error generando horarios: ${error.message}`);
      throw new ConflictException('Error al generar horarios automáticamente');
    } finally {
      await queryRunner.release();
    }
  }

  private async asignarBloque(
    docente: Docente,
    curso: Curso,
    tipoClase: string,
    duracionHoras: number,
    cicloId: number,
    ocupacionAulas: Map<string, boolean>,
    ocupacionDocentes: Map<string, boolean>,
    queryRunner: any,
  ): Promise<{ exitoso: boolean; horario?: Horario; motivo?: string }> {
    // Obtener aulas disponibles según tipo de clase
    const tiposAula =
      tipoClase === 'teoria'
        ? ['aula_teoria', 'aula_especial']
        : ['laboratorio_redes', 'laboratorio_software'];

    const aulas = await this.aulaRepo.find({
      where: {
        tipo: In(tiposAula as any),
        disponible: true,
      },
    });

    if (aulas.length === 0) {
      return {
        exitoso: false,
        motivo: `No hay aulas disponibles de tipo ${tipoClase}`,
      };
    }

    // Franjas horarias (Lunes a Viernes, 7am - 8pm)
    const bloques: any[] = [];
    for (let dia = 1; dia <= 5; dia++) {
      for (let hora = 7; hora <= 20 - duracionHoras; hora++) {
        bloques.push({
          dia,
          inicio: `${hora.toString().padStart(2, '0')}:00:00`,
          fin: `${(hora + duracionHoras).toString().padStart(2, '0')}:00:00`,
        });
      }
    }

    // Buscar primer bloque libre
    for (const aula of aulas) {
      for (const bloque of bloques) {
        // Verificar solapamiento con horarios existentes en memoria para la duración completa
        let bloqueLibre = true;
        for (let h = 0; h < duracionHoras; h++) {
          const horaInicioActual = parseInt(bloque.inicio.split(':')[0]) + h;
          const horaFinActual = horaInicioActual + 1;
          const slotInicio = `${horaInicioActual.toString().padStart(2, '0')}:00:00`;
          const slotFin = `${horaFinActual.toString().padStart(2, '0')}:00:00`;
          
          const keyAula = `${aula.id}_${bloque.dia}_${slotInicio}_${slotFin}`;
          const keyDocente = `${docente.id}_${bloque.dia}_${slotInicio}_${slotFin}`;

          if (ocupacionAulas.has(keyAula) || ocupacionDocentes.has(keyDocente)) {
            bloqueLibre = false;
            break;
          }
        }

        if (bloqueLibre) {
          const horario = new Horario();
          horario.docenteId = docente.id;
          horario.cursoId = curso.id;
          horario.aulaId = aula.id;
          horario.cicloId = cicloId;
          horario.tipoClase = tipoClase as any;
          horario.diaSemana = bloque.dia;
          horario.horaInicio = bloque.inicio;
          horario.horaFin = bloque.fin;
          horario.esAutomatico = true;

          const savedHorario = await queryRunner.manager.save(horario);
          return { exitoso: true, horario: savedHorario };
        }
      }
    }

    return { exitoso: false, motivo: `No se encontró bloque de ${duracionHoras}h libre` };
  }

  async validarSinCruces(
    docenteId: number,
    aulaId: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    cicloId: number,
    excluirHorarioId?: number,
  ): Promise<{ valido: boolean; conflictos: string[] }> {
    return this.validacionService.validarSinCruces(
      docenteId,
      aulaId,
      diaSemana,
      horaInicio,
      horaFin,
      cicloId,
      excluirHorarioId,
    );
  }

  async obtenerEstadisticas(cicloId: number): Promise<any> {
    const totalHorarios = await this.horarioRepo.count({
      where: { cicloId },
    });

    const totalDocentesRaw = await this.horarioRepo
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.docenteId)', 'count')
      .where('h.cicloId = :cicloId', { cicloId })
      .getRawOne();

    const totalCursosRaw = await this.horarioRepo
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.cursoId)', 'count')
      .where('h.cicloId = :cicloId', { cicloId })
      .getRawOne();

    // Estadísticas de uso de aulas
    const usoAulas = await this.horarioRepo
      .createQueryBuilder('h')
      .leftJoin('h.aula', 'a')
      .select('a.tipo', 'tipo')
      .addSelect('COUNT(h.id)', 'bloquesUsados')
      .addSelect('COUNT(DISTINCT a.id)', 'totalAulas')
      .where('h.cicloId = :cicloId', { cicloId })
      .groupBy('a.tipo')
      .getRawMany();

    const porcentajeUsoAulas = usoAulas.map(u => ({
      tipo: u.tipo,
      bloquesUsados: parseInt(u.bloquesUsados),
      totalAulas: parseInt(u.totalAulas),
      porcentajeUso: (parseInt(u.bloquesUsados) * 100) / (parseInt(u.totalAulas) * 5 * 12) // Estimación: 5 días, 12 bloques/día
    }));

    // Top docentes
    const docentesTop = await this.horarioRepo
      .createQueryBuilder('h')
      .leftJoin('h.docente', 'd')
      .select('d.id', 'id')
      .addSelect('d.nombreCompleto', 'nombreCompleto')
      .addSelect('COUNT(h.id)', 'totalHoras')
      .where('h.cicloId = :cicloId', { cicloId })
      .groupBy('d.id')
      .orderBy('"totalHoras"', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalHorarios,
      totalDocentes: parseInt(totalDocentesRaw?.count || 0),
      totalCursos: parseInt(totalCursosRaw?.count || 0),
      porcentajeUsoAulas,
      docentesTop
    };
  }

  async getMapaOcupacion(cicloId: number): Promise<any> {
    const horarios = await this.horarioRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.curso', 'curso')
      .where('h.cicloId = :cicloId', { cicloId })
      .select([
        'h.id',
        'h.diaSemana',
        'h.horaInicio',
        'h.horaFin',
        'h.docenteId',
        'h.aulaId',
        'curso.carreraId',
        'curso.cicloAcademico'
      ])
      .getMany();

    // Estructura optimizada para el frontend:
    // { "dia_hora": [ { id, carreraId, cicloAcademico, docenteId, aulaId }, ... ] }
    const mapa = {};

    horarios.forEach(h => {
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      
      for (let hora = hInicio; hora < hFin; hora++) {
        const key = `${h.diaSemana}_${hora}`;
        if (!mapa[key]) mapa[key] = [];
        mapa[key].push({
          id: h.id,
          carreraId: h.curso?.carreraId,
          cicloAcademico: h.curso?.cicloAcademico,
          docenteId: h.docenteId,
          aulaId: h.aulaId
        });
      }
    });

    return mapa;
  }

  // Método para obtener el resumen de créditos/horas de un curso
  async getCourseWorkload(cursoId: number, cicloId: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Horario) : this.horarioRepo;
    const horarios = await repo.find({
      where: { cursoId, cicloId },
    });

    const ocupadas = { teoria: 0, practica: 0, laboratorio: 0 };
    horarios.forEach((h) => {
      const hInicio = parseInt(h.horaInicio.split(':')[0]);
      const hFin = parseInt(h.horaFin.split(':')[0]);
      const horas = hFin - hInicio;

      if (h.tipoClase === 'teoria') ocupadas.teoria += horas;
      else if (h.tipoClase === 'practica') ocupadas.practica += horas;
      else if (h.tipoClase === 'laboratorio') ocupadas.laboratorio += horas;
    });

    return ocupadas;
  }

  async update(
    id: number,
    data: {
      docenteId?: number;
      cursoId?: number;
      aulaId?: number;
      cicloId?: number;
      tipoClase?: string;
      actividadNoLectiva?: string;
      diaSemana?: number;
      horaInicio?: string;
      horaFin?: string;
      grupoId?: number;
    },
    user?: any,
  ): Promise<Horario> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const horarioRepo = manager.getRepository(Horario);
      const horario = await horarioRepo.findOne({ 
        where: { id },
        relations: ['curso', 'aula']
      });
      
      if (!horario) {
        throw new BadRequestException('Horario no encontrado');
      }

      // 1. Validar Permisos
      if (user?.rol === RolUsuario.DOCENTE) {
        if (!user.docenteId || Number(user.docenteId) !== Number(horario.docenteId)) {
          throw new BadRequestException('No tienes permiso para modificar este horario');
        }
        const permiso = await this.ventanasService.validarPermisoRegistro(Number(user.docenteId));
        if (!permiso.permitido) {
          throw new BadRequestException(permiso.mensaje || 'No tienes permiso para modificar horarios en este momento');
        }
      }

      // 2. Validar Cruces
      const vDocenteId = data.docenteId ?? horario.docenteId;
      const vAulaId = data.aulaId !== undefined ? data.aulaId : horario.aulaId;
      const vDiaSemana = data.diaSemana ?? horario.diaSemana;
      const vHoraInicio = data.horaInicio ?? horario.horaInicio;
      const vHoraFin = data.horaFin ?? horario.horaFin;
      const vCicloId = data.cicloId ?? horario.cicloId;

      const validacion = await this.validacionService.validarSinCruces(
        vDocenteId,
        vAulaId || null,
        vDiaSemana,
        vHoraInicio,
        vHoraFin,
        vCicloId,
        id,
      );

      if (!validacion.valido) {
        throw new ConflictException(validacion.conflictos.join(', '));
      }

      // 3. Validar Carga y Grupos (Solo si es LECTIVA)
      const vTipoClase = data.tipoClase ?? horario.tipoClase;
      if (vTipoClase !== 'no_lectiva') {
        const vCursoId = data.cursoId ?? horario.cursoId;
        const vAulaIdFinal = data.aulaId ?? horario.aulaId;
        
        if (!vCursoId) throw new BadRequestException('El curso es obligatorio para carga lectiva');
        if (!vAulaIdFinal) throw new BadRequestException('El aula es obligatoria para carga lectiva');

        const asignacion = await manager.getRepository(AsignacionDocenteCurso).findOne({
          where: {
            docenteId: vDocenteId,
            cursoId: vCursoId,
            cicloId: vCicloId,
            tipoClase: vTipoClase as any,
          },
          relations: ['grupos'],
        });

        if (!asignacion) {
          throw new BadRequestException(`No existe una asignación de carga académica para este docente, curso y tipo de clase (${vTipoClase}) en el ciclo seleccionado.`);
        }

        if (asignacion.grupos && asignacion.grupos.length > 0) {
          data.grupoId = await this.validarYResolverGrupo(
            asignacion,
            data.grupoId ?? horario.grupoId,
            id,
            manager
          );
        }

        await this.validarCargaHoraria(
          asignacion,
          vHoraInicio,
          vHoraFin,
          id,
          manager
        );
      } else {
        // Validación para NO LECTIVA en Update
        const vActividad = data.actividadNoLectiva ?? horario.actividadNoLectiva;
        if (!vActividad) throw new BadRequestException('La actividad es obligatoria para carga no lectiva');

        await this.validarCargaNoLectiva(
          vDocenteId,
          vCicloId,
          vActividad,
          vHoraInicio,
          vHoraFin,
          id,
          manager
        );
      }

      // 4. Actualizar
      Object.assign(horario, {
        ...data,
        tipoClase: vTipoClase as any,
      });
      
      const updated = await horarioRepo.save(horario);
      this.emitUpdate(updated.cicloId);

      return updated;
    });
  }

  async delete(id: number, user?: any): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const horarioRepo = manager.getRepository(Horario);
      const horario = await horarioRepo.findOne({ where: { id } });
      
      if (!horario) {
        throw new BadRequestException('Horario no encontrado');
      }

      if (user?.rol === RolUsuario.DOCENTE) {
        if (!user.docenteId || Number(user.docenteId) !== Number(horario.docenteId)) {
          throw new BadRequestException('No tienes permiso para eliminar este horario');
        }
        const permiso = await this.ventanasService.validarPermisoRegistro(Number(user.docenteId));
        if (!permiso.permitido) {
          throw new BadRequestException(permiso.mensaje || 'No tienes permiso para eliminar horarios en este momento');
        }
      }

      await horarioRepo.remove(horario);

      this.emitUpdate(horario.cicloId);

      return { message: 'Horario eliminado exitosamente' };
    });
  }

  private async validarCargaHoraria(
    asignacion: AsignacionDocenteCurso,
    horaInicio: string,
    horaFin: string,
    excluirHorarioId?: number,
    manager?: EntityManager,
  ): Promise<void> {
    const duracionNuevaMin = this.timeToMinutes(horaFin) - this.timeToMinutes(horaInicio);

    if (duracionNuevaMin <= 0) {
      throw new BadRequestException('La hora fin debe ser mayor que la hora inicio');
    }

    const horarioRepo = manager ? manager.getRepository(Horario) : this.horarioRepo;

    const query = horarioRepo.createQueryBuilder('h')
      .where('h.docenteId = :docenteId', { docenteId: asignacion.docenteId })
      .andWhere('h.cursoId = :cursoId', { cursoId: asignacion.cursoId })
      .andWhere('h.cicloId = :cicloId', { cicloId: asignacion.cicloId })
      .andWhere('h.tipoClase = :tipoClase', { tipoClase: asignacion.tipoClase });

    if (excluirHorarioId) {
      query.andWhere('h.id != :excluirHorarioId', { excluirHorarioId });
    }

    const horariosMismaAsignacion = await query.getMany();
    const minutosYaAsignados = horariosMismaAsignacion.reduce((total, horario) => {
      return total + (this.timeToMinutes(horario.horaFin) - this.timeToMinutes(horario.horaInicio));
    }, 0);

    const minutosMaximos = Number(asignacion.horasSemanales || 0) * 60;
    const minutosTotalesConNuevo = minutosYaAsignados + duracionNuevaMin;

    if (minutosTotalesConNuevo > minutosMaximos) {
      const horasMaximas = minutosMaximos / 60;
      const horasYaAsignadas = minutosYaAsignados / 60;
      const horasSolicitadas = duracionNuevaMin / 60;
      const horasRestantes = Math.max(0, (minutosMaximos - minutosYaAsignados) / 60);
      throw new ConflictException(
        `Carga semanal excedida para el docente. Máximo: ${horasMaximas}h, asignadas: ${horasYaAsignadas}h, intentas agregar: ${horasSolicitadas}h, disponibles: ${horasRestantes}h.`,
      );
    }
  }

  private async validarYResolverGrupo(
    asignacion: AsignacionDocenteCurso,
    grupoId?: number,
    excluirHorarioId?: number,
    manager?: EntityManager,
  ): Promise<number> {
    const grupoRepo = manager ? manager.getRepository(GrupoDocenteAsignacion) : this.grupoRepo;
    const horarioRepo = manager ? manager.getRepository(Horario) : this.horarioRepo;
    const docenteId = asignacion.docenteId;
    const cursoId = asignacion.cursoId;
    const cicloId = asignacion.cicloId;

    const grupos = asignacion.grupos || await grupoRepo.find({
      where: { asignacionId: asignacion.id },
      order: { numeroGrupo: 'ASC' },
    });

    if (!grupos.length) {
      throw new BadRequestException('No hay grupos registrados para esta asignación.');
    }

    const horariosLaboratorio = await horarioRepo.find({
      where: {
        docenteId,
        cursoId,
        cicloId,
        tipoClase: TipoClase.LABORATORIO as any,
      },
    });

    const horariosAConsiderar = excluirHorarioId
      ? horariosLaboratorio.filter((horario) => horario.id !== excluirHorarioId)
      : horariosLaboratorio;

    const gruposOcupados = new Set<number>(
      horariosAConsiderar
        .map((horario) => Number(horario.grupoId))
        .filter((value) => Number.isFinite(value) && value > 0),
    );

    if (grupoId) {
      const grupoSeleccionado = grupos.find((grupo) => Number(grupo.id) === Number(grupoId));
      if (!grupoSeleccionado) {
        throw new BadRequestException('El grupo de laboratorio no pertenece a esta asignación.');
      }

      if (gruposOcupados.has(grupoSeleccionado.id)) {
        throw new BadRequestException(`El grupo ${grupoSeleccionado.numeroGrupo} ya está ocupado para este curso y ciclo.`);
      }

      return grupoSeleccionado.id;
    }

    const grupoDisponible = grupos.find((grupo) => !gruposOcupados.has(grupo.id));
    if (!grupoDisponible) {
      throw new BadRequestException('No hay grupos de laboratorio disponibles para esta asignación.');
    }

    return grupoDisponible.id;
  }

  private async validarCargaNoLectiva(
    docenteId: number,
    cicloId: number,
    actividad: string,
    horaInicio: string,
    horaFin: string,
    excluirHorarioId?: number,
    manager?: EntityManager,
  ): Promise<void> {
    const cnlRepo = manager ? manager.getRepository(CargaNoLectiva) : this.cargaNoLectivaRepo;
    const horarioRepo = manager ? manager.getRepository(Horario) : this.horarioRepo;

    // 2. Mapear actividad a campo de la entidad
    const ACTIVIDAD_TO_FIELD = {
      [ActividadNoLectiva.PREPARACION]: 'horasPreparacion',
      [ActividadNoLectiva.TUTORIA]: 'horasTutoria',
      [ActividadNoLectiva.INVESTIGACION]: 'horasInvestigacion',
      [ActividadNoLectiva.CAPACITACION]: 'horasCapacitacion',
      [ActividadNoLectiva.GOBIERNO]: 'horasGobierno',
      [ActividadNoLectiva.ADMINISTRACION]: 'horasAdministracion',
      [ActividadNoLectiva.ASESORIA]: 'horasAsesoria',
      [ActividadNoLectiva.RESPONSABILIDAD_SOCIAL]: 'horasResponsabilidadSocial',
      [ActividadNoLectiva.COMITES]: 'horasComites',
    };

    const fieldName = ACTIVIDAD_TO_FIELD[actividad];
    if (!fieldName) {
      throw new BadRequestException(`Actividad no lectiva no reconocida: ${actividad}`);
    }

    // 3. Obtener la declaración de carga no lectiva del docente
    const cnl = await cnlRepo.findOne({
      where: { docenteId, cicloId }
    });

    if (!cnl) {
      throw new BadRequestException('El docente no tiene una declaración de carga no lectiva para este ciclo.');
    }

    // Importante: Los valores decimales de Postgres pueden venir como strings
    const horasDeclaradas = Number(cnl[fieldName] || 0);
    if (horasDeclaradas <= 0) {
      throw new ConflictException(`No tienes horas declaradas para la actividad: ${actividad}`);
    }

    // 3. Calcular horas ya programadas para esta actividad
    const query = horarioRepo.createQueryBuilder('h')
      .where('h.docenteId = :docenteId', { docenteId })
      .andWhere('h.cicloId = :cicloId', { cicloId })
      .andWhere('h.tipoClase = :tipo', { tipo: 'no_lectiva' })
      .andWhere('h.actividadNoLectiva = :actividad', { actividad });

    if (excluirHorarioId) {
      query.andWhere('h.id != :id', { id: excluirHorarioId });
    }

    const horariosExistentes = await query.getMany();
    const minutosYaAsignados = horariosExistentes.reduce((total, h) => {
      return total + (this.timeToMinutes(h.horaFin) - this.timeToMinutes(h.horaInicio));
    }, 0);

    const duracionNuevaMin = this.timeToMinutes(horaFin) - this.timeToMinutes(horaInicio);
    const minutosTotales = minutosYaAsignados + duracionNuevaMin;

    if (minutosTotales > horasDeclaradas * 60) {
      const disponibles = Math.max(0, (horasDeclaradas * 60 - minutosYaAsignados) / 60);
      throw new ConflictException(
        `Carga no lectiva excedida para '${actividad}'. Máximo declarado: ${horasDeclaradas}h, ya asignadas: ${minutosYaAsignados/60}h, disponibles: ${disponibles}h.`
      );
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
