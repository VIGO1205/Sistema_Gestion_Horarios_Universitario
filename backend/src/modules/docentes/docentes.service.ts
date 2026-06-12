import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Docente } from '../../entities/docente.entity';
import { DocenteCarrera } from '../../entities/docente-carrera.entity';
import { Carrera } from '../../entities/carrera.entity';
import { CreateDocenteDto } from './dto/create-docente.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RolUsuario } from '../../entities/usuario.entity';
import { AsignacionDocenteCurso } from '../../entities/asignacion-docente-curso.entity';
import { Horario } from '../../entities/horario.entity';
import { CargaAcademica } from '../../entities/carga-academica.entity';

@Injectable()
export class DocentesService {
  constructor(
    @InjectRepository(Docente)
    private docentesRepository: Repository<Docente>,
    @InjectRepository(DocenteCarrera)
    private docenteCarreraRepository: Repository<DocenteCarrera>,
    @InjectRepository(Carrera)
    private carreraRepository: Repository<Carrera>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(CargaAcademica)
    private cargaAcademicaRepo: Repository<CargaAcademica>,
    private usuariosService?: UsuariosService,
  ) {}

  async create(createDocenteDto: CreateDocenteDto): Promise<Docente> {
    const { carreraIds, ...docenteData } = createDocenteDto;

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
    const { carreraIds, ...docenteData } = updateDocenteDto;
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
      this.samePrimitive(docente.codigoIBM ?? '0000', camposNuevos.codigoIBM ?? docente.codigoIBM ?? '0000') &&
      this.samePrimitive(Number(docente.antiguedadAnios), Number(camposNuevos.antiguedadAnios ?? docente.antiguedadAnios)) &&
      this.samePrimitive(Boolean(docente.activo), camposNuevos.activo ?? docente.activo) &&
      (carrerasNuevas === undefined || this.sameArray(carrerasActuales, carrerasNuevas));

    if (docenteSinCambios) {
      return await this.findOne(id);
    }

    Object.assign(docente, camposNuevos);
    await this.docentesRepository.save(docente);

    await this.syncCarreras(id, carreraIds);

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

  async findCourses(id: number, cicloId?: number) {
    const qb = this.asignacionRepo.createQueryBuilder('asig')
      .leftJoinAndSelect('asig.curso', 'curso')
      .leftJoinAndSelect('asig.grupos', 'grupos')
      .leftJoinAndSelect('asig.ciclo', 'ciclo')
      .where('asig.docenteId = :id', { id });

    if (cicloId) {
      qb.andWhere('asig.cicloId = :cicloId', { cicloId });
    }

    const asignaciones = await qb.getMany();

    // Calcular horas ya asignadas en el horario para cada curso/tipoClase
    const result = await Promise.all(asignaciones.map(async (asig) => {
      const horarios = await this.horarioRepo.find({
        where: {
          docenteId: id,
          cursoId: asig.cursoId,
          cicloId: asig.cicloId,
        }
      });

      const horariosFiltrados = horarios.filter(h => String(h.tipoClase) === String(asig.tipoClase));

      const minutosAsignados = horariosFiltrados.reduce((total, h) => {
        const [h1, m1] = h.horaInicio.split(':').map(Number);
        const [h2, m2] = h.horaFin.split(':').map(Number);
        return total + ((h2 * 60 + m2) - (h1 * 60 + m1));
      }, 0);

      const gruposConEstado = (asig.grupos || []).map(g => ({
        ...g,
        ocupado: horariosFiltrados.some(h => Number(h.grupoId) === Number(g.id))
      }));

      return {
        ...asig,
        grupos: gruposConEstado,
        horasAsignadas: minutosAsignados / 60,
      };
    }));

    return result;
  }

  async validarCargaCompleta(id: number): Promise<{ completa: boolean; faltantes: any; progreso: any }> {
    const asignaciones = await this.asignacionRepo.find({ where: { docenteId: id } });
    const horarios = await this.horarioRepo.find({ where: { docenteId: id } });

    let completa = true;
    const faltantes: any[] = [];
    
    let totalRequeridasLectivas = 0;
    let totalAsignadasLectivas = 0;

    // Validar carga lectiva
    for (const asig of asignaciones) {
      const horasAsignadas = horarios
        .filter(h => h.cursoId === asig.cursoId && String(h.tipoClase) === String(asig.tipoClase))
        .reduce((sum, h) => {
          const [h1, m1] = h.horaInicio.split(':').map(Number);
          const [h2, m2] = h.horaFin.split(':').map(Number);
          return sum + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        }, 0);

      totalRequeridasLectivas += Number(asig.horasSemanales);
      totalAsignadasLectivas += horasAsignadas;

      if (horasAsignadas < asig.horasSemanales) {
        completa = false;
        faltantes.push({
          cursoId: asig.cursoId,
          tipoClase: asig.tipoClase,
          asignadas: horasAsignadas,
          requeridas: asig.horasSemanales,
        });
      }
    }

    // Validar carga no lectiva
    const horariosNoLectivos = horarios.filter(h => h.tipoClase === 'no_lectiva');
    const horasNoLectivasAsignadas = horariosNoLectivos.reduce((sum, h) => {
      const [h1, m1] = h.horaInicio.split(':').map(Number);
      const [h2, m2] = h.horaFin.split(':').map(Number);
      return sum + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
    }, 0);

    // Obtener la carga académica del docente para ver los requisitos de carga no lectiva
    const cargaAcademica = await this.cargaAcademicaRepo.findOne({ 
      where: { docenteId: id },
      relations: ['cargaNoLectiva']
    });

    const totalRequeridasNoLectivas = cargaAcademica?.totalHorasNoLectivas || 0;

    if (totalRequeridasNoLectivas > 0) {
      if (horasNoLectivasAsignadas < totalRequeridasNoLectivas) {
        completa = false;
        faltantes.push({
          tipo: 'carga_no_lectiva',
          asignadas: horasNoLectivasAsignadas,
          requeridas: totalRequeridasNoLectivas,
        });
      }
    }

    return { 
      completa, 
      faltantes,
      progreso: {
        lectiva: {
          asignadas: totalAsignadasLectivas,
          requeridas: totalRequeridasLectivas,
          porcentaje: totalRequeridasLectivas > 0 ? Math.min(100, Math.round((totalAsignadasLectivas / totalRequeridasLectivas) * 100)) : 100
        },
        noLectiva: {
          asignadas: horasNoLectivasAsignadas,
          requeridas: totalRequeridasNoLectivas,
          porcentaje: totalRequeridasNoLectivas > 0 ? Math.min(100, Math.round((horasNoLectivasAsignadas / totalRequeridasNoLectivas) * 100)) : 100
        }
      }
    };
  }
}
