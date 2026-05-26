import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Not } from 'typeorm';
import { Docente } from '../../entities/docente.entity';
import { AsignacionDocenteCurso, TipoClase } from '../../entities/asignacion-docente-curso.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { Curso } from '../../entities/curso.entity';
import { GrupoDocenteAsignacion } from '../../database/entities/grupo-docente-asignacion.entity';
import { ProgramacionCursoCiclo } from '../../database/entities/programacion-curso-ciclo.entity';
import { Horario } from '../../entities/horario.entity';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RolUsuario } from '../../entities/usuario.entity';

@Injectable()
export class DocentesService {
  constructor(
    @InjectRepository(Docente)
    private docentesRepository: Repository<Docente>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepository: Repository<AsignacionDocenteCurso>,
    @InjectRepository(GrupoDocenteAsignacion)
    private grupoRepository: Repository<GrupoDocenteAsignacion>,
    @InjectRepository(ProgramacionCursoCiclo)
    private programacionRepository: Repository<ProgramacionCursoCiclo>,
    @InjectRepository(DocenteCarrera)
    private docenteCarreraRepository: Repository<DocenteCarrera>,
    @InjectRepository(Carrera)
    private carreraRepository: Repository<Carrera>,
    @InjectRepository(Curso)
    private cursoRepository: Repository<Curso>,
    @InjectRepository(Horario)
    private horarioRepository: Repository<Horario>,
    private usuariosService?: UsuariosService,
  ) {}

  async create(createDocenteDto: CreateDocenteDto): Promise<Docente> {
    const { asignaciones, carreraIds, ...docenteData } = createDocenteDto;

    if (docenteData.fechaIngreso === '') docenteData.fechaIngreso = undefined;
    
    if (docenteData.fechaIngreso) {
      const ingreso = new Date(docenteData.fechaIngreso);
      if (!isNaN(ingreso.getTime())) {
        const hoy = new Date();
        let anios = hoy.getFullYear() - ingreso.getFullYear();
        const m = hoy.getMonth() - ingreso.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anios--;
        docenteData.antiguedadAnios = Math.max(0, anios);
      }
    }

    const docente = this.docentesRepository.create(docenteData as Partial<Docente>);
    const savedDocente = await this.docentesRepository.save(docente);

    // Intentar crear un usuario asociado automáticamente (determinístico)
    try {
      const baseToken = this.generateBaseToken(savedDocente.nombreCompleto, savedDocente.dni);
      let created: any = null;
      for (let attempt = 0; attempt < 100; attempt++) {
        const localToken = attempt === 0 ? baseToken : `${baseToken}${String(attempt).padStart(2, '0')}`;
        const emailCandidate = `${localToken}@unt.edu.pe`;
        try {
          if (this.usuariosService) {
            created = await this.usuariosService.create({
              email: emailCandidate,
              password: '123456',
              rol: RolUsuario.DOCENTE,
              activo: true,
              docenteId: savedDocente.id,
            });
            this.logger.log(`Usuario creado para docente ${savedDocente.id}: ${emailCandidate}`);
            break;
          }
        } catch (err) {
          // Si el email ya existe, intentar siguiente sufijo; si falla por otro motivo, registrar y salir
          const msg = err?.response?.message || err?.message || '';
          if (msg.includes('El email ya está registrado')) {
            continue;
          }
          this.logger.warn(`Error creando usuario para docente ${savedDocente.id}: ${msg}`);
          break;
        }
      }
    } catch (err) {
      this.logger.warn(`No fue posible crear usuario automático para docente ${savedDocente.id}: ${err?.message ?? err}`);
    }

    await this.syncCarreras(savedDocente.id, carreraIds);
    await this.syncAsignaciones(savedDocente.id, asignaciones, carreraIds);

    return await this.findOne(savedDocente.id);
  }

  private readonly logger = new Logger(DocentesService.name);

  private slugifyName(name: string): string {
    return (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .toLowerCase();
  }

  private generateBaseToken(nombre: string, dni?: string): string {
    const clean = this.slugifyName(nombre);
    const parts = clean.split(/\s+/).filter(Boolean);
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    const segment = (first.slice(0, 4) + last.slice(0, 2)).slice(0, 6);
    const dniDigits = dni ? String(dni).replace(/\D/g, '') : '';
    const tail = dniDigits ? dniDigits.slice(-5) : '00000';
    return `${segment}${tail}`;
  }

  async findAll(query?: { search?: string; tipoContrato?: string; categoria?: string; carreraId?: number }): Promise<Docente[]> {
    const qb = this.docentesRepository.createQueryBuilder('docente');

    qb.leftJoinAndSelect('docente.carreras', 'docenteCarrera')
      .leftJoinAndSelect('docenteCarrera.carrera', 'carrera')
      .distinct(true);

    if (query?.search) {
      qb.andWhere('docente.nombreCompleto ILIKE :search', { search: `%${query.search}%` });
    }

    if (query?.tipoContrato) {
      qb.andWhere('docente.tipoContrato = :tipoContrato', { tipoContrato: query.tipoContrato });
    }

    if (query?.categoria) {
      qb.andWhere('docente.categoria = :categoria', { categoria: query.categoria });
    }

    if (query?.carreraId) {
      qb.andWhere('carrera.id = :carreraId', { carreraId: query.carreraId });
    }

    qb.orderBy('docente.tipoContrato', 'ASC')
      .addOrderBy('docente.categoria', 'ASC')
      .addOrderBy('docente.antiguedadAnios', 'DESC');

    return await qb.getMany();
  }

  async findActive(): Promise<Docente[]> {
    return await this.docentesRepository.find({
      where: { activo: true },
      order: { tipoContrato: 'ASC', categoria: 'ASC', antiguedadAnios: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Docente> {
    const docente = await this.docentesRepository
      .createQueryBuilder('docente')
      .leftJoinAndSelect('docente.carreras', 'docenteCarrera')
      .leftJoinAndSelect('docenteCarrera.carrera', 'carrera')
      .where('docente.id = :id', { id })
      .getOne();

    if (!docente) {
      throw new NotFoundException(`Docente con id ${id} no encontrado`);
    }
    return docente;
  }

  async update(id: number, updateDocenteDto: UpdateDocenteDto): Promise<Docente> {
    const { asignaciones, carreraIds, ...docenteData } = updateDocenteDto;
    const docente = await this.findOne(id);

    // 1. Normalizar y calcular antigüedad (Evitar NaN)
    if (docenteData.fechaIngreso === '') docenteData.fechaIngreso = undefined;
    
    if (docenteData.fechaIngreso) {
      const ingreso = new Date(docenteData.fechaIngreso);
      if (!isNaN(ingreso.getTime())) {
        const hoy = new Date();
        let anios = hoy.getFullYear() - ingreso.getFullYear();
        const m = hoy.getMonth() - ingreso.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anios--;
        docenteData.antiguedadAnios = Math.max(0, anios);
      }
    }

    const carrerasActuales = (docente.carreras || [])
      .map((rel: any) => Number(rel?.carrera?.id))
      .filter((value: number) => Number.isFinite(value));
    const carrerasNuevas = carreraIds !== undefined ? this.normalizeNumericArray(carreraIds) : undefined;

    const camposNuevos = this.pickDefinedValues(docenteData);
    const docenteSinCambios =
      this.samePrimitive(docente.nombreCompleto, camposNuevos.nombreCompleto ?? docente.nombreCompleto) &&
      this.samePrimitive(docente.dni ?? null, camposNuevos.dni ?? docente.dni ?? null) &&
      this.samePrimitive(docente.tipoContrato, camposNuevos.tipoContrato ?? docente.tipoContrato) &&
      this.samePrimitive(docente.categoria, camposNuevos.categoria ?? docente.categoria) &&
      this.samePrimitive(Number(docente.antiguedadAnios), Number(camposNuevos.antiguedadAnios ?? docente.antiguedadAnios)) &&
      this.samePrimitive(Boolean(docente.activo), camposNuevos.activo ?? docente.activo) &&
      (carrerasNuevas === undefined || this.sameArray(carrerasActuales, carrerasNuevas)) &&
      (asignaciones === undefined || await this.sameAsignaciones(docente.id, asignaciones));

    if (docenteSinCambios) {
      return await this.findOne(id);
    }

    Object.assign(docente, camposNuevos);
    await this.docentesRepository.save(docente);

    await this.syncCarreras(id, carreraIds);
    await this.syncAsignaciones(id, asignaciones, carreraIds);

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const docente = await this.findOne(id);
    // Eliminar usuarios asociados al docente antes de borrar el docente (evitar FK constraint)
    try {
      if (this.usuariosService) {
        const usuarios = await this.usuariosService.findByDocenteId(id);
        for (const u of usuarios) {
          await this.usuariosService.remove(u.id);
        }
      }
    } catch (err) {
      this.logger.warn(`Error al eliminar usuarios asociados al docente ${id}: ${err?.message ?? err}`);
    }

    await this.docentesRepository.remove(docente);
  }

  async toggleActive(id: number): Promise<Docente> {
    const docente = await this.findOne(id);
    docente.activo = !docente.activo;
    return await this.docentesRepository.save(docente);
  }

  async findCourses(id: number, cicloId?: number) {
    try {
      const asignaciones = await this.asignacionRepository.find({
        where: { 
          docenteId: id,
          ...(cicloId ? { cicloId } : {})
        },
        relations: ['curso', 'ciclo', 'grupos'],
      });

      if (asignaciones.length === 0) {
        return [];
      }

      const horasAsignadasPorCursoTipo = new Map<string, number>();
      const gruposOcupadosIds: number[] = [];

      if (cicloId) {
        const horarios = await this.horarioRepository.find({
          where: { docenteId: id, cicloId },
          select: ['cursoId', 'tipoClase', 'grupoId', 'horaInicio', 'horaFin']
        });

        horarios.forEach(h => {
          const key = `${h.cursoId}-${h.tipoClase.toLowerCase()}`;
          const hInicio = parseInt(h.horaInicio.split(':')[0]);
          const hFin = parseInt(h.horaFin.split(':')[0]);
          const duracion = hFin - hInicio;
          
          horasAsignadasPorCursoTipo.set(key, (horasAsignadasPorCursoTipo.get(key) || 0) + duracion);
          
          if (h.grupoId) {
            gruposOcupadosIds.push(Number(h.grupoId));
          }
        });
      }

      return asignaciones.map((asignacion) => {
        const gruposBase = (asignacion as any).grupos || [];
        const gruposConEstado = gruposBase.map((g: any) => ({
          ...g,
          ocupado: gruposOcupadosIds.includes(Number(g.id)),
        }));

        const key = `${asignacion.cursoId}-${asignacion.tipoClase.toLowerCase()}`;
        const horasAsignadas = horasAsignadasPorCursoTipo.get(key) || 0;

        return {
          ...(asignacion as any),
          grupos: gruposConEstado,
          horasAsignadas,
          numeroGrupos: asignacion.tipoClase === 'laboratorio'
            ? (gruposConEstado.length ?? 0)
            : 0,
        };
      });
    } catch (error) {
      console.error('Error en findCourses:', error);
      return [];
    }
  }

  private pickDefinedValues<T extends Record<string, any>>(values: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private normalizeNumericArray(values?: Array<number | string>): number[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return [...new Set(values.map((value) => Number(value)).filter((value) => Number.isFinite(value)))].sort((left, right) => left - right);
  }

  private samePrimitive(left: any, right: any): boolean {
    return left === right;
  }

  private sameArray(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  private normalizeAsignacionesFromDto(asignaciones?: any[]): any[] {
    const grupos = new Map<string, any>();

    for (const asignacion of asignaciones || []) {
      const cursoId = Number(asignacion?.cursoId);
      const cicloId = Number(asignacion?.cicloId);
      const key = `${cursoId}`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          cursoId,
          cicloId,
          horasTeoria: 0,
          horasPractica: 0,
          horasLaboratorio: 0,
          numeroGrupos: 0,
        });
      }

      const grupo = grupos.get(key);
      if (asignacion?.tipoClase === 'teoria') {
        grupo.horasTeoria += Number(asignacion.horasSemanales || 0);
      }
      if (asignacion?.tipoClase === 'practica') {
        grupo.horasPractica += Number(asignacion.horasSemanales || 0);
      }
      if (asignacion?.tipoClase === 'laboratorio') {
        grupo.horasLaboratorio += Number(asignacion.horasSemanales || 0);
        grupo.numeroGrupos = Math.max(grupo.numeroGrupos, Number(asignacion.numeroGrupos ?? asignacion.numero_grupos ?? 0));
      }
    }

    return Array.from(grupos.values()).sort((left, right) => {
      if (left.cursoId !== right.cursoId) return left.cursoId - right.cursoId;
      return left.cicloId - right.cicloId;
    });
  }

  private async sameAsignaciones(docenteId: number, asignacionesDto?: any[]): Promise<boolean> {
    const actuales = await this.findCourses(docenteId);
    const actualesNormalizadas = this.normalizeAsignacionesFromDto(actuales);

    const nuevasNormalizadas = this.normalizeAsignacionesFromDto(asignacionesDto);
    return JSON.stringify(actualesNormalizadas) === JSON.stringify(nuevasNormalizadas);
  }

  private async syncCarreras(docenteId: number, carreraIds?: number[]) {
    if (carreraIds === undefined) {
      return;
    }

    await this.docenteCarreraRepository.createQueryBuilder()
      .delete()
      .where('docente_id = :docenteId', { docenteId })
      .execute();

    if (!Array.isArray(carreraIds) || carreraIds.length === 0) {
      return;
    }

    const carreras = await this.carreraRepository.find({ where: { id: In(carreraIds) } });
    if (carreras.length !== carreraIds.length) {
      throw new BadRequestException('Una o más carreras seleccionadas no existen.');
    }

    const assignments = carreras.map((carrera) =>
      this.docenteCarreraRepository.create({
        docente: { id: docenteId } as Docente,
        carrera,
      }),
    );

    await this.docenteCarreraRepository.save(assignments);
  }

  private async syncAsignaciones(docenteId: number, asignacionesDtoInput?: any[], carreraIds?: number[]) {
    if (asignacionesDtoInput === undefined) {
      return;
    }

    if (!Array.isArray(asignacionesDtoInput) || asignacionesDtoInput.length === 0) {
      await this.asignacionRepository.createQueryBuilder()
        .delete()
        .where('"docenteId" = :docenteId', { docenteId })
        .execute();
      return;
    }

    if (!Array.isArray(carreraIds) || carreraIds.length === 0) {
      throw new BadRequestException('Primero debes seleccionar al menos una carrera para poder asignar cursos.');
    }

    const asignacionesDto = Array.isArray(asignacionesDtoInput) ? asignacionesDtoInput : [];
    const seen = new Set();
    
    for (const a of asignacionesDto) {
      const key = `${a.cursoId}-${a.cicloId}-${a.tipoClase}`;
      if (seen.has(key)) {
        const curso = await this.cursoRepository.findOne({ where: { id: Number(a.cursoId) } });
        throw new BadRequestException(
          `El curso "${curso?.nombre ?? a.cursoId}" (${a.tipoClase}) ya fue agregado. No se permiten duplicados del mismo tipo para el mismo curso.`
        );
      }
      seen.add(key);
    }

    const cursoIds = asignacionesDto.map(a => a.cursoId);
    const cursos = await this.cursoRepository.find({ where: { id: In(cursoIds) } });
    
    if (cursos.length !== new Set(cursoIds).size) {
      throw new BadRequestException('Uno o más cursos seleccionados no existen.');
    }

    const carrerasPermitidas = new Set(carreraIds.map((value) => Number(value)));
    const cursosInvalidos = cursos.filter((curso) => !curso.carreraId || !carrerasPermitidas.has(Number(curso.carreraId)));

    if (cursosInvalidos.length > 0) {
      throw new BadRequestException('No puedes asignar cursos que no pertenezcan a las carreras seleccionadas.');
    }

    const nuevasAsignaciones = asignacionesDto.map((dto) =>
      this.asignacionRepository.create({
        docenteId,
        cursoId: dto.cursoId,
        cicloId: dto.cicloId,
        tipoClase: dto.tipoClase,
        horasSemanales: dto.horasSemanales,
      }),
    );

    const cursoIdsUnicos = Array.from(new Set(asignacionesDto.map((asignacion) => Number(asignacion.cursoId))));
    const programaciones = await this.programacionRepository.find({
      where: { cursoId: In(cursoIdsUnicos) },
    });

    const programacionMap = new Map<string, ProgramacionCursoCiclo>();
    for (const programacion of programaciones) {
      programacionMap.set(`${programacion.cursoId}-${programacion.cicloId}`, programacion);
    }

    const clavesValidar = new Set<string>();
    for (const asignacion of asignacionesDto) {
      clavesValidar.add(`${Number(asignacion.cursoId)}-${Number(asignacion.cicloId)}`);
    }

    const otrasAsignaciones = await this.asignacionRepository.find({
      where: {
        cursoId: In(cursoIdsUnicos),
        docenteId: Not(docenteId),
      },
    });

    const otrasAsignacionesIds = otrasAsignaciones.map((asignacion) => asignacion.id);
    const gruposExistentes = otrasAsignacionesIds.length > 0
      ? await this.grupoRepository.find({
          where: { asignacionId: In(otrasAsignacionesIds) },
        })
      : [];

    const gruposPorAsignacionId = new Map<number, number>();
    for (const grupo of gruposExistentes) {
      gruposPorAsignacionId.set(grupo.asignacionId, (gruposPorAsignacionId.get(grupo.asignacionId) ?? 0) + 1);
    }

    const otrasAsignacionesNormalizadas = otrasAsignaciones.map((asignacion) => ({
      ...asignacion,
      numeroGrupos: asignacion.tipoClase === TipoClase.LABORATORIO
        ? (gruposPorAsignacionId.get(asignacion.id) ?? 0)
        : 0,
    }));

    for (const asignacion of otrasAsignaciones) {
      clavesValidar.add(`${asignacion.cursoId}-${asignacion.cicloId}`);
    }

    for (const clave of clavesValidar) {
      const [cursoIdRaw, cicloIdRaw] = clave.split('-');
      const cursoId = Number(cursoIdRaw);
      const cicloId = Number(cicloIdRaw);
      const programacion = programacionMap.get(clave);

      if (!programacion) {
        const curso = cursos.find((c) => c.id === cursoId);
        const cursoNombre = curso ? curso.nombre : `ID ${cursoId}`;
        // try to find client index from incoming DTOs so frontend can highlight exact row
        const offendingDto = (asignacionesDto || []).find((d: any) => Number(d.cursoId) === cursoId && Number(d.cicloId) === cicloId);
        const clientIndex = offendingDto ? (Number(offendingDto.clientAsignacionIndex ?? offendingDto.clientIndex ?? -1)) : -1;
        throw new BadRequestException({
          message: `No se encontró la programación del curso "${cursoNombre}" para el ciclo ${cicloId}. Añade la programación en 'Programación por ciclo' antes de asignar docentes.`,
          cursoId,
          cicloId,
          clientIndex: clientIndex >= 0 ? clientIndex : undefined,
        });
      }

      const asignacionesCursoCiclo = [
        ...otrasAsignacionesNormalizadas.filter((asignacion) => Number(asignacion.cursoId) === cursoId && Number(asignacion.cicloId) === cicloId),
        ...asignacionesDto.filter((asignacion) => Number(asignacion.cursoId) === cursoId && Number(asignacion.cicloId) === cicloId),
      ];

      const teoriaTotal = asignacionesCursoCiclo
        .filter((asignacion) => asignacion.tipoClase === 'teoria')
        .reduce((acc, asignacion) => acc + Number(asignacion.horasSemanales || 0), 0);

      const practicaTotal = asignacionesCursoCiclo
        .filter((asignacion) => asignacion.tipoClase === 'practica')
        .reduce((acc, asignacion) => acc + Number(asignacion.horasSemanales || 0), 0);

      const laboratorios = asignacionesCursoCiclo.filter((asignacion) => asignacion.tipoClase === 'laboratorio');
      const labHorasProgramadas = Number(programacion.horasLaboratorio || 0);
      const gruposProgramados = Number(programacion.numeroGrupos || 0);

      if (teoriaTotal > Number(programacion.horasTeoria || 0)) {
        const curso = cursos.find((c) => c.id === cursoId);
        throw new BadRequestException(
          `Carga excedida para el curso "${curso?.nombre ?? cursoId}": la teoría programada es ${programacion.horasTeoria} y estás asignando ${teoriaTotal}.`
        );
      }

      if (practicaTotal > Number(programacion.horasPractica || 0)) {
        const curso = cursos.find((c) => c.id === cursoId);
        throw new BadRequestException(
          `Carga excedida para el curso "${curso?.nombre ?? cursoId}": la práctica programada es ${programacion.horasPractica} y estás asignando ${practicaTotal}.`
        );
      }

      if (laboratorios.length > 0) {
        if (labHorasProgramadas <= 0) {
          const curso = cursos.find((c) => c.id === cursoId);
          throw new BadRequestException(
            `El curso "${curso?.nombre ?? cursoId}" no tiene laboratorio programado y no admite grupos de laboratorio.`
          );
        }

        const gruposInvalidos = laboratorios.filter((asignacion) => {
          const grupos = Number(asignacion.numeroGrupos ?? asignacion.numero_grupos ?? 0);
          return grupos < 1 || grupos > 4;
        });

        if (gruposInvalidos.length > 0) {
          const curso = cursos.find((c) => c.id === cursoId);
          const offending = gruposInvalidos[0] as any;
          throw new BadRequestException(
            {
              message: `El curso "${curso?.nombre ?? cursoId}" debe asignar entre 1 y 4 grupos de laboratorio.`,
              cursoId,
              cicloId,
              tipoClase: 'laboratorio',
              numeroGrupos: Number(offending.numeroGrupos ?? offending.numero_grupos ?? 0),
              horasSemanales: Number(offending.horasSemanales || 0),
            }
          );
        }

        const horasLaboratorioInvalidas = laboratorios.filter(
          (asignacion) => Number(asignacion.horasSemanales || 0) !== labHorasProgramadas,
        );

        if (horasLaboratorioInvalidas.length > 0) {
          const curso = cursos.find((c) => c.id === cursoId);
          throw new BadRequestException(
            `El curso "${curso?.nombre ?? cursoId}" debe asignar ${labHorasProgramadas} horas de laboratorio por docente.`
          );
        }

        const gruposAsignados = laboratorios.reduce(
          (acc, asignacion) => acc + Number(asignacion.numeroGrupos ?? asignacion.numero_grupos ?? 0),
          0,
        );

        if (gruposAsignados > gruposProgramados) {
          const curso = cursos.find((c) => c.id === cursoId);
          throw new BadRequestException(
            `El curso "${curso?.nombre ?? cursoId}" tiene ${gruposProgramados} grupos de laboratorio programados y estás asignando ${gruposAsignados}.`
          );
        }
      }
    }

    // Solo cuando todas las validaciones pasaron, reemplazamos las asignaciones previas.
    await this.asignacionRepository.createQueryBuilder()
      .delete()
      .where('"docenteId" = :docenteId', { docenteId })
      .execute();

    const savedAsignaciones = await this.asignacionRepository.save(nuevasAsignaciones);

    // Crear grupos para cada asignación según numeroGrupos en el DTO
    const gruposACrear: any[] = [];
    for (let i = 0; i < asignacionesDto.length; i++) {
      const dto = asignacionesDto[i];
      const asign = savedAsignaciones[i];
      const num = dto.tipoClase === 'laboratorio'
        ? Number(dto.numeroGrupos ?? dto.numero_grupos ?? 0) || 0
        : 0;

      for (let g = 1; g <= num; g++) {
        gruposACrear.push(this.grupoRepository.create({ asignacionId: asign.id, numeroGrupo: g }));
      }
    }

    if (gruposACrear.length > 0) {
      await this.grupoRepository.save(gruposACrear);
    }
  }
}
