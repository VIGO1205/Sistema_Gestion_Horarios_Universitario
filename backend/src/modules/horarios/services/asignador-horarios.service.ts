import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Docente, TipoContrato, Categoria } from '../../../entities/docente.entity';
import { Curso } from '../../../entities/curso.entity';
import { Horario } from '../../../entities/horario.entity';
import { Aula, TipoAula } from '../../../entities/aula.entity';
import { AsignacionDocenteCurso } from '../../../entities/asignacion-docente-curso.entity';
import { ValidacionCrucesService } from './validacion-cruces.service';
import { CiclosService } from '../../ciclos/ciclos.service';

interface BloqueHorario {
  aula_id: number;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}

@Injectable()
export class AsignadorHorariosService {
  private readonly logger = new Logger(AsignadorHorariosService.name);
  private readonly franjas_horarias = [
    { inicio: '08:00', fin: '09:00' },
    { inicio: '09:00', fin: '10:00' },
    { inicio: '10:00', fin: '11:00' },
    { inicio: '11:00', fin: '12:00' },
    { inicio: '12:00', fin: '13:00' },
    { inicio: '13:00', fin: '14:00' },
    { inicio: '14:00', fin: '15:00' },
    { inicio: '15:00', fin: '16:00' },
    { inicio: '16:00', fin: '17:00' },
    { inicio: '17:00', fin: '18:00' },
  ];

  constructor(
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Curso)
    private cursoRepo: Repository<Curso>,
    @InjectRepository(Horario)
    private horarioRepo: Repository<Horario>,
    @InjectRepository(Aula)
    private aulaRepo: Repository<Aula>,
    @InjectRepository(AsignacionDocenteCurso)
    private asignacionRepo: Repository<AsignacionDocenteCurso>,
    private validacionService: ValidacionCrucesService,
    private ciclosService: CiclosService,
  ) {}

  /**
   * Algoritmo principal de asignación jerárquica
   * Ordena docentes por: condicion -> categoría -> antigüedad
   * Luego asigna horarios respetando la jerarquía
   */
  async generarHorariosAutomaticos(cicloNombre: string): Promise<any> {
    const ciclo = await this.ciclosService.asegurarCicloActual();
    const cicloId = ciclo.id;

    try {
      // Paso 1: Obtener todos los docentes ordenados por jerarquía
      const docentes = await this.obtenerDocentesOrdenados();

      const horariosGenerados: Horario[] = [];
      const ocupacionAulas = new Map<string, boolean>();
      const ocupacionDocentes = new Map<string, boolean>();

      // Limpiar horarios automáticos previos para este ciclo para evitar duplicados
      await this.horarioRepo.delete({ cicloId, esAutomatico: true });

      for (const docente of docentes) {
        this.logger.debug(`Procesando docente: ${docente.nombreCompleto} (${docente.categoria})`);

        // Obtener asignaciones de carga académica para este docente en este ciclo
        const asignaciones = await this.asignacionRepo.find({
          where: { docenteId: docente.id, cicloId },
          relations: ['curso'],
        });

        for (const asignacion of asignaciones) {
          const curso = asignacion.curso;
          const horasRestantes = asignacion.horasSemanales;
          
          this.logger.debug(`  Asignando ${horasRestantes}h de ${asignacion.tipoClase} para ${curso.nombre}`);

          // Intentar asignar en bloques (máximo 4h por bloque para no cansar)
          let horasAsignadas = 0;
          while (horasAsignadas < horasRestantes) {
            // Regla de Oro: Máximo 8 horas diarias por docente
            const duracionBloque = Math.min(horasRestantes - horasAsignadas, 2); 
            
            const bloque = await this.buscarBloqueOptimo(
              docente,
              curso,
              asignacion.tipoClase,
              duracionBloque,
              ocupacionAulas,
              ocupacionDocentes,
              cicloId,
              horariosGenerados, // Pasar horarios actuales para validar límite diario
            );

            if (bloque) {
              const nuevoHorario = this.horarioRepo.create({
                docenteId: docente.id,
                cursoId: curso.id,
                aulaId: bloque.aula_id,
                cicloId,
                tipoClase: asignacion.tipoClase as any,
                diaSemana: bloque.dia,
                horaInicio: bloque.hora_inicio,
                horaFin: bloque.hora_fin,
                esAutomatico: true,
              });

              const guardado = await this.horarioRepo.save(nuevoHorario);
              horariosGenerados.push(guardado);
              this.actualizarOcupacion(ocupacionAulas, ocupacionDocentes, guardado);
              
              horasAsignadas += duracionBloque;
            } else {
              this.logger.warn(`No se pudo encontrar bloque para ${curso.nombre} (${asignacion.tipoClase})`);
              break; // No hay más espacio para este curso/tipo
            }
          }
        }
      }

      this.logger.log(`Asignación completada. Total horarios generados: ${horariosGenerados.length}`);

      return {
        exito: true,
        mensaje: `Se generaron ${horariosGenerados.length} horarios basados en la carga académica`,
        horarios: horariosGenerados,
      };
    } catch (error) {
      this.logger.error(`Error en asignación de horarios: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene docentes ordenados por jerarquía estricta
   * Orden: Nombrado (principal > asociado > auxiliar > jefe_práctica) > Contratado (idem)
   * Desempate: antigüedad (descendente)
   */
  private async obtenerDocentesOrdenados(): Promise<Docente[]> {
    return this.docenteRepo
      .createQueryBuilder('d')
      .where('d.activo = :activo', { activo: true })
      .orderBy(
        `CASE d.condicion WHEN '${TipoContrato.NOMBRADO}' THEN 1 WHEN '${TipoContrato.CONTRATADO}' THEN 2 END`,
        'ASC',
      )
      .addOrderBy(
        `CASE d.categoria 
          WHEN '${Categoria.PRINCIPAL}' THEN 1 
          WHEN '${Categoria.ASOCIADO}' THEN 2 
          WHEN '${Categoria.AUXILIAR}' THEN 3 
          WHEN '${Categoria.JEFE_PRACTICA}' THEN 4 
        END`,
        'ASC',
      )
      .addOrderBy('d.antiguedadAnios', 'DESC')
      .getMany();
  }

  /**
   * Busca el mejor bloque horario disponible
   * Realiza búsqueda exhaustiva considerando disponibilidad de aulas y sin cruces
   */
  private async buscarBloqueOptimo(
    docente: Docente,
    curso: Curso,
    tipoClase: string,
    duracionHoras: number,
    ocupacionAulas: Map<string, boolean>,
    ocupacionDocentes: Map<string, boolean>,
    cicloId: number,
    horariosActuales: Horario[] = [],
  ): Promise<BloqueHorario | null> {
    // Determinar tipo de aula según tipo de clase
    let tiposAula: TipoAula[] = [];
    if (tipoClase === 'teoria') {
      tiposAula = [TipoAula.TEORIA];
    } else if (tipoClase === 'practica') {
      tiposAula = [TipoAula.PRACTICA, TipoAula.TEORIA]; // Práctica puede ser en aula o lab
    } else {
      tiposAula = [TipoAula.LABORATORIO];
    }

    const aulas = await this.aulaRepo.find({
      where: { tipo: In(tiposAula), disponible: true },
    });

    if (aulas.length === 0) {
      this.logger.warn(`No hay aulas disponibles para tipo ${tipoClase}`);
      return null;
    }

    // Iterar sobre días de la semana (Lunes a Sábado)
    for (let dia = 1; dia <= 6; dia++) {
      // Regla de Oro: Máximo 8 horas diarias por docente
      const horasHoy = horariosActuales
        .filter(h => h.docenteId === docente.id && h.diaSemana === dia)
        .reduce((total, h) => {
          const inicio = parseInt(h.horaInicio.split(':')[0]);
          const fin = parseInt(h.horaFin.split(':')[0]);
          return total + (fin - inicio);
        }, 0);

      if (horasHoy + duracionHoras > 8) {
        continue; // Excede límite diario, buscar otro día
      }

      // Buscar bloques continuos
      for (let i = 0; i <= this.franjas_horarias.length - duracionHoras; i++) {
        const inicio = this.franjas_horarias[i].inicio;
        const fin = this.franjas_horarias[i + duracionHoras - 1].fin;

        for (const aula of aulas) {
          // Validar sin cruces para el bloque completo
          const validacion = await this.validacionService.validarSinCruces(
            docente.id,
            aula.id,
            dia,
            inicio,
            fin,
            cicloId,
          );

          if (validacion.valido) {
            return {
              aula_id: aula.id,
              dia,
              hora_inicio: inicio,
              hora_fin: fin,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Actualiza los mapas de ocupación tras asignar un horario
   */
  private actualizarOcupacion(
    ocupacionAulas: Map<string, boolean>,
    ocupacionDocentes: Map<string, boolean>,
    horario: Horario,
  ): void {
    const claveAula = `${horario.aulaId}-${horario.diaSemana}-${horario.horaInicio}-${horario.horaFin}`;
    const claveDocente = `${horario.docenteId}-${horario.diaSemana}-${horario.horaInicio}-${horario.horaFin}`;

    ocupacionAulas.set(claveAula, true);
    ocupacionDocentes.set(claveDocente, true);
  }

  /**
   * Obtiene estadísticas de la asignación actual
   */
  async obtenerEstadisticas(cicloId: number): Promise<any> {
    const totalHorarios = await this.horarioRepo.count({
      where: { cicloId },
    });

    const totalDocentes = await this.horarioRepo
      .createQueryBuilder('h')
      .distinct(true)
      .select('COUNT(DISTINCT h.docenteId)', 'count')
      .where('h.cicloId = :cicloId', { cicloId })
      .getRawOne();

    const totalCursos = await this.horarioRepo
      .createQueryBuilder('h')
      .distinct(true)
      .select('COUNT(DISTINCT h.cursoId)', 'count')
      .where('h.cicloId = :cicloId', { cicloId })
      .getRawOne();

    return {
      totalHorarios,
      totalDocentes: totalDocentes?.count || 0,
      totalCursos: totalCursos?.count || 0,
    };
  }
}
