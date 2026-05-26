import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, MoreThan, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { VentanaAtencion, EstadoVentana, TipoContratoVentana, CategoriaVentana } from '../../database/entities/ventana-atencion.entity';
import { Docente, EstadoSeleccion, TipoContrato, Categoria } from '../../database/entities/docente.entity';
import { CreateVentanaDto } from './dto/create-ventana.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../../database/entities/notificacion.entity';

@Injectable()
export class VentanasService {
  private readonly logger = new Logger(VentanasService.name);
  private readonly docentesNotificados = new Set<number>();

  private parseVentanaDate(value: string): Date {
    // Si no viene zona horaria (datetime-local), asumimos hora local de Peru (UTC-5).
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
    if (hasTimezone) {
      return new Date(value);
    }

    return new Date(`${value}:00-05:00`);
  }

  constructor(
    @InjectRepository(VentanaAtencion)
    private ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    private notificacionesService: NotificacionesService,
  ) {}

  async create(createVentanaDto: CreateVentanaDto): Promise<{ message: string; ventanas: VentanaAtencion[] }> {
    const { cicloId, fechaHoraInicio, duracionMinutos } = createVentanaDto;

    // 1. Definir la jerarquía estricta
    const jerarquia = [
      { tipo: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL },
      { tipo: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO },
      { tipo: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR },
      { tipo: TipoContrato.NOMBRADO, categoria: Categoria.JEFE_PRACTICA },
      { tipo: TipoContrato.CONTRATADO, categoria: Categoria.PRINCIPAL },
      { tipo: TipoContrato.CONTRATADO, categoria: Categoria.ASOCIADO },
      { tipo: TipoContrato.CONTRATADO, categoria: Categoria.AUXILIAR },
      { tipo: TipoContrato.CONTRATADO, categoria: Categoria.JEFE_PRACTICA },
    ];

    // Buscar todos los docentes sin ventana para validar si hay algo que hacer
    const totalSinVentana = await this.docenteRepo.count({
      where: { activo: true, ventanaId: IsNull(), estadoSeleccion: EstadoSeleccion.EN_ESPERA },
    });

    if (totalSinVentana === 0) {
      throw new BadRequestException('Todos los docentes activos ya tienen una ventana de atención asignada.');
    }

    let currentStartTime = this.parseVentanaDate(fechaHoraInicio);
    const ventanasCreadas: VentanaAtencion[] = [];

    const HORA_INICIO = 7;
    const HORA_FIN = 13;

    // Normalizar inicio si es antes de las 7 AM (Hora Perú)
    // 7 AM Perú = 12:00 UTC
    if (currentStartTime.getUTCHours() < HORA_INICIO + 5) {
      currentStartTime.setUTCHours(HORA_INICIO + 5, 0, 0, 0);
    }

    for (const nivel of jerarquia) {
      // 2. Buscar docentes de este grupo específico
      const docentesGrupo = await this.docenteRepo.find({
        where: {
          tipoContrato: nivel.tipo,
          categoria: nivel.categoria,
          activo: true,
          ventanaId: IsNull(),
          estadoSeleccion: EstadoSeleccion.EN_ESPERA,
        },
        order: { antiguedadAnios: 'DESC' },
      });

      if (docentesGrupo.length === 0) continue;

      let docentesRestantes = [...docentesGrupo];

      while (docentesRestantes.length > 0) {
        // Verificar si ya nos pasamos de las 13:00 o estamos muy cerca (Hora Perú)
        // 13:00 Perú = 18:00 UTC
        const horaActualPeru = currentStartTime.getUTCHours() - 5;
        const minutosActuales = currentStartTime.getUTCMinutes();

        if (horaActualPeru >= HORA_FIN || (horaActualPeru === HORA_FIN - 1 && minutosActuales + duracionMinutos > 60)) {
          // Saltar al día siguiente a las 07:00 AM Perú
          currentStartTime.setUTCDate(currentStartTime.getUTCDate() + 1);
          currentStartTime.setUTCHours(HORA_INICIO + 5, 0, 0, 0);
        }

        // Calcular cuántos minutos quedan hoy hasta las 13:00 Perú
        const hoyLimitePeru = new Date(currentStartTime);
        hoyLimitePeru.setUTCHours(HORA_FIN + 5, 0, 0, 0);
        
        const minutosDisponibles = Math.floor((hoyLimitePeru.getTime() - currentStartTime.getTime()) / 60000);
        const capacidadDocentes = Math.floor(minutosDisponibles / duracionMinutos);

        if (capacidadDocentes <= 0) {
          // Si no entra ni uno, forzar salto de día
          currentStartTime.setUTCDate(currentStartTime.getUTCDate() + 1);
          currentStartTime.setUTCHours(HORA_INICIO + 5, 0, 0, 0);
          continue;
        }

        // Tomar los docentes que entran en este bloque
        const cantidadATomar = Math.min(docentesRestantes.length, capacidadDocentes);
        const docentesBloque = docentesRestantes.slice(0, cantidadATomar);
        docentesRestantes = docentesRestantes.slice(cantidadATomar);

        const duracionBloque = cantidadATomar * duracionMinutos;
        const finBloque = new Date(currentStartTime.getTime() + duracionBloque * 60000);

        // 3. Crear la ventana para este bloque (fragmento)
        const nuevaVentana = this.ventanaRepo.create({
          cicloId,
          tipoContrato: nivel.tipo as any,
          categoriaDocente: nivel.categoria as any,
          fechaHoraInicio: new Date(currentStartTime),
          fechaHoraFin: new Date(finBloque),
          duracionMinutos, // Mantenemos la duración por docente para la lógica de la cola
          estado: EstadoVentana.PROGRAMADA,
        });

        const guardada = await this.ventanaRepo.save(nuevaVentana);
        ventanasCreadas.push(guardada);

        // 4. Asignar la misma ventana a todos los docentes del bloque
        const ids = docentesBloque.map(d => d.id);
        await this.docenteRepo.update(ids, { ventanaId: guardada.id });

        // El siguiente bloque empieza donde termina este
        currentStartTime = new Date(finBloque);
      }
    }

    return {
      message: `${ventanasCreadas.length} ventanas generadas para ${totalSinVentana} docentes.`,
      ventanas: ventanasCreadas,
    };
  }

  async update(ventanaId: number, updateDto: Partial<CreateVentanaDto>): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException('Ventana no encontrada');

    // Sólo permitir edición si está programada
    if (ventana.estado !== EstadoVentana.PROGRAMADA) {
      throw new BadRequestException('Sólo se pueden editar ventanas en estado programada');
    }

    if (updateDto.fechaHoraInicio) {
      ventana.fechaHoraInicio = this.parseVentanaDate(updateDto.fechaHoraInicio as any);
    }
    if (updateDto.fechaHoraFin) {
      ventana.fechaHoraFin = this.parseVentanaDate(updateDto.fechaHoraFin as any);
    }
    if (updateDto.duracionMinutos) {
      ventana.duracionMinutos = updateDto.duracionMinutos as number;
    }

    return await this.ventanaRepo.save(ventana);
  }

  async findAll(): Promise<VentanaAtencion[]> {
    return await this.ventanaRepo.find({
      where: { activo: true },
      relations: ['ciclo'],
      order: { fechaHoraInicio: 'ASC' },
    });
  }

  async findActive(): Promise<VentanaAtencion | null> {
    const now = new Date();
    try {
      return await this.ventanaRepo.findOne({
        where: {
          estado: EstadoVentana.EN_CURSO,
          fechaHoraInicio: LessThanOrEqual(now),
          fechaHoraFin: MoreThan(now),
          activo: true,
        },
        relations: ['ciclo'],
      });
    } catch (error) {
      console.error('Error finding active window:', error);
      return null;
    }
  }

  async llamarSiguiente(ventanaId: number): Promise<Docente | null> {
    const ventana = await this.ventanaRepo.findOne({
      where: { id: ventanaId },
      relations: ['ciclo'],
    });

    if (!ventana) {
      throw new NotFoundException('Ventana no encontrada');
    }

    // Buscar el siguiente docente en espera STRICTLY en esta ventana:
    const siguienteDocente = await this.docenteRepo.findOne({
      where: {
        estadoSeleccion: EstadoSeleccion.EN_ESPERA,
        activo: true,
        ventanaId: ventanaId,
      },
      order: {
        antiguedadAnios: 'DESC',
      },
    });

    if (!siguienteDocente) {
      // Si no hay más docentes, finalizamos la ventana
      ventana.estado = EstadoVentana.FINALIZADA;
      await this.ventanaRepo.save(ventana);
      this.logger.log(`Ventana ${ventana.id} finalizada automáticamente por falta de docentes`);
      return null;
    }

    // Actualizar estado de ventana a EN_CURSO si estaba programada
    if (ventana.estado === EstadoVentana.PROGRAMADA) {
      ventana.estado = EstadoVentana.EN_CURSO;
      await this.ventanaRepo.save(ventana);
    }

    // Activar el turno del docente
    const ahora = new Date();
    const fin = new Date(ahora.getTime() + ventana.duracionMinutos * 60000);

    siguienteDocente.estadoSeleccion = EstadoSeleccion.EN_ATENCION;
    siguienteDocente.inicioAtencion = ahora;
    siguienteDocente.finAtencion = fin;
    this.docentesNotificados.add(siguienteDocente.id);

    // Guardar docente antes de notificar para asegurar consistencia
    const savedDocente = await this.docenteRepo.save(siguienteDocente);

    // Generar notificación interna
    await this.notificacionesService.create(
      savedDocente.id,
      '¡Es tu turno!',
      `Hola ${savedDocente.nombreCompleto}, tu ventana de atención ya comenzó. Tienes hasta las ${fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} para registrar tus horarios.`,
      TipoNotificacion.TURNO_ACTIVO
    );

    return savedDocente;
  }

  async saltarDocente(docenteId: number): Promise<void> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) throw new NotFoundException('Docente no encontrado');

    this.logger.log(`Admin saltó al docente ${docente.nombreCompleto}`);
    docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
    await this.docenteRepo.save(docente);

    // Al saltar, el cron job llamará al siguiente en el próximo minuto, 
    // o podemos forzarlo aquí si queremos inmediatez.
    const ventanaActiva = await this.findActive();
    if (ventanaActiva) {
      await this.llamarSiguiente(ventanaActiva.id);
    }
  }

  async extenderTiempo(docenteId: number, minutos: number): Promise<Docente> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) throw new NotFoundException('Docente no encontrado');
    if (docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      throw new BadRequestException('El docente no está en atención actualmente');
    }

    const nuevoFin = new Date(docente.finAtencion.getTime() + minutos * 60000);
    docente.finAtencion = nuevoFin;
    this.logger.log(`Tiempo extendido para ${docente.nombreCompleto} por ${minutos} min`);
    return await this.docenteRepo.save(docente);
  }

  async detenerVentana(ventanaId: number): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) {
      throw new NotFoundException('Ventana no encontrada');
    }

    ventana.estado = EstadoVentana.FINALIZADA;
    await this.ventanaRepo.save(ventana);

    // Liberar cualquier docente en atención (en la cola global)
    const docenteEnAtencion = await this.docenteRepo.findOne({
      where: {
        estadoSeleccion: EstadoSeleccion.EN_ATENCION,
        activo: true,
      },
    });

    if (docenteEnAtencion) {
      docenteEnAtencion.estadoSeleccion = EstadoSeleccion.FINALIZADO;
      docenteEnAtencion.finAtencion = new Date();
      await this.docenteRepo.save(docenteEnAtencion);
    }

    return ventana;
  }

  async remove(ventanaId: number): Promise<{ message: string }> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) {
      throw new NotFoundException('Ventana no encontrada');
    }

    if (ventana.estado !== EstadoVentana.PROGRAMADA) {
      throw new BadRequestException('Solo se pueden eliminar ventanas en estado programada');
    }

    // 1. Liberar a los docentes asociados a esta ventana específica
    await this.docenteRepo.update(
      { ventanaId: ventanaId },
      { ventanaId: null }
    );

    // 2. Marcar la ventana como inactiva (eliminación lógica)
    ventana.activo = false;
    ventana.estado = EstadoVentana.FINALIZADA;
    await this.ventanaRepo.save(ventana);
    
    return { message: 'Ventana eliminada y docentes liberados correctamente' };
  }

  async finalizarTurno(docenteId: number): Promise<Docente> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) {
      throw new NotFoundException('Docente no encontrado');
    }

    docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
    return await this.docenteRepo.save(docente);
  }

  async validarPermisoRegistro(docenteId: number): Promise<{ permitido: boolean; mensaje?: string; finAtencion?: Date }> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    
    if (!docente) {
      return { permitido: false, mensaje: 'Docente no encontrado' };
    }

    if (docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      return { permitido: false, mensaje: 'Aún no es tu turno o tu ventana de selección ha finalizado' };
    }

    const ahora = new Date();
    if (docente.finAtencion && ahora > docente.finAtencion) {
      docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
      await this.docenteRepo.save(docente);
      return { permitido: false, mensaje: 'Tu tiempo de registro ha expirado' };
    }

    return { 
      permitido: true, 
      finAtencion: docente.finAtencion,
      mensaje: 'Tienes permiso para registrar tus horarios' 
    };
  }

  async getMiEstado(docenteId: number): Promise<any> {
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) {
      throw new NotFoundException('Docente no encontrado');
    }

    const ahora = new Date();

    const ventanasDisponibles = await this.ventanaRepo.count({
      where: [
        { estado: EstadoVentana.PROGRAMADA, activo: true },
        { estado: EstadoVentana.EN_CURSO, activo: true },
      ],
    });

    if (ventanasDisponibles === 0 && docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      return { estado: 'sin_ventana' };
    }
    
    if (docente.estadoSeleccion === EstadoSeleccion.EN_ATENCION) {
      if (docente.finAtencion && ahora > docente.finAtencion) {
        docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
        await this.docenteRepo.save(docente);
      } else {
        return {
          estado: docente.estadoSeleccion,
          finAtencion: docente.finAtencion,
          segundosRestantes: docente.finAtencion ? Math.max(0, Math.floor((docente.finAtencion.getTime() - ahora.getTime()) / 1000)) : 0
        };
      }
    }

    if (docente.estadoSeleccion === EstadoSeleccion.EN_ESPERA) {
      // Si el docente no tiene ventana asignada, no debe "colarse" ni ver posición
      if (!docente.ventanaId) {
        return { 
          estado: 'no_programado',
          mensaje: 'Aún no has sido asignado a una ventana de atención para este ciclo.'
        };
      }

      const cola = await this.docenteRepo.find({
        where: {
          estadoSeleccion: EstadoSeleccion.EN_ESPERA,
          activo: true,
          ventanaId: Not(IsNull()), // Solo los que ya tienen ventana asignada
        },
        order: {
          tipoContrato: 'ASC',
          categoria: 'ASC',
          antiguedadAnios: 'DESC',
        },
      });

      const posicion = cola.findIndex(d => d.id === docente.id) + 1;

      const ventanaActiva = await this.ventanaRepo.findOne({
        where: { estado: EstadoVentana.EN_CURSO, activo: true },
      });

      const ventanaProgramada = !ventanaActiva
        ? await this.ventanaRepo.findOne({
            where: { estado: EstadoVentana.PROGRAMADA, activo: true },
            order: { fechaHoraInicio: 'ASC' },
          })
        : null;

      const ventanaVigente = ventanaActiva || ventanaProgramada;
      const duracionTurnoSegundos = Math.max(1, Number(ventanaVigente?.duracionMinutos || 0)) * 60;

      let segundosHastaTurno = 0;
      if (ventanaActiva) {
        const docenteEnAtencion = await this.docenteRepo.findOne({
          where: { estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true },
        });

        const segundosTurnoActual = docenteEnAtencion?.finAtencion
          ? Math.max(0, Math.floor((docenteEnAtencion.finAtencion.getTime() - ahora.getTime()) / 1000))
          : duracionTurnoSegundos;

        segundosHastaTurno = segundosTurnoActual + Math.max(0, posicion - 1) * duracionTurnoSegundos;
      } else if (ventanaProgramada) {
        segundosHastaTurno = Math.max(0, Math.floor((ventanaProgramada.fechaHoraInicio.getTime() - ahora.getTime()) / 1000))
          + Math.max(0, posicion - 1) * duracionTurnoSegundos;
      }

      return {
        estado: docente.estadoSeleccion,
        posicion,
        totalEnEspera: cola.length,
        hayVentanaAtencion: !!ventanaVigente,
        tiempoDisponibleMinutos: ventanaVigente?.duracionMinutos || 0,
        segundosHastaTurno,
        minutosHastaTurno: Math.max(1, Math.ceil(segundosHastaTurno / 60)),
      };
    }

    return { estado: docente.estadoSeleccion };
  }

  async getCola(tipoContrato?: string, categoria?: string, ventanaId?: number): Promise<Docente[]> {
    const where: any = {
      estadoSeleccion: EstadoSeleccion.EN_ESPERA,
      activo: true,
    };

    if (ventanaId) {
      where.ventanaId = ventanaId;
      return await this.docenteRepo.find({
        where,
        order: {
          antiguedadAnios: 'DESC',
        },
      });
    } else if (tipoContrato && tipoContrato !== 'todos') {
      where.tipoContrato = tipoContrato;
    }

    if (!ventanaId && categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }

    return await this.docenteRepo.find({
      where,
      order: {
        tipoContrato: 'ASC',
        categoria: 'ASC',
        antiguedadAnios: 'DESC',
      },
    });
  }

  async getAtendidos(): Promise<Docente[]> {
    return await this.docenteRepo.find({
      where: {
        estadoSeleccion: EstadoSeleccion.FINALIZADO,
        activo: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async getEnAtencion(tipoContrato?: string, categoria?: string, ventanaId?: number): Promise<Docente | null> {
    const where: any = {
      estadoSeleccion: EstadoSeleccion.EN_ATENCION,
      activo: true,
    };

    if (ventanaId) {
      where.ventanaId = ventanaId;
      return await this.docenteRepo.findOne({ where });
    } else if (tipoContrato && tipoContrato !== 'todos') {
      where.tipoContrato = tipoContrato;
    }

    if (!ventanaId && categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }

    return await this.docenteRepo.findOne({ where });
  }

  async countDocentesPorCategoria(categoria: string): Promise<{ count: number }> {
    const where: any = { activo: true, estadoSeleccion: EstadoSeleccion.EN_ESPERA };
    if (categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }
    const count = await this.docenteRepo.count({ where });
    return { count };
  }

  async getStats(): Promise<any> {
    const ahora = new Date();
    const hoyInicio = new Date(ahora);
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date(ahora);
    hoyFin.setHours(23, 59, 59, 999);

    const [totalHoy, enCurso, docentesEspera, atendidosHoy] = await Promise.all([
      this.ventanaRepo.count({
        where: {
          fechaHoraInicio: LessThanOrEqual(hoyFin),
          fechaHoraFin: MoreThan(hoyInicio),
          activo: true,
        },
      }),
      this.ventanaRepo.count({
        where: {
          estado: EstadoVentana.EN_CURSO,
          activo: true,
        },
      }),
      this.docenteRepo.count({
        where: {
          estadoSeleccion: EstadoSeleccion.EN_ESPERA,
          activo: true,
        },
      }),
      this.docenteRepo.count({
        where: {
          estadoSeleccion: EstadoSeleccion.FINALIZADO,
          activo: true,
        },
      }),
    ]);

    // Desglose por categoría para el Monitor de Seguimiento (Considerando Jerarquía Global)
    // 1. Nombrados: Principal, Asociado, Auxiliar, JP
    // 2. Contratados: Principal, Asociado, Auxiliar, JP
    const categoriasBase = ['principal', 'asociado', 'auxiliar', 'jefe_practica'];
    const tiposContrato = ['nombrado', 'contratado'];

    const monitoreoCategorias: any[] = [];

    for (const tipo of tiposContrato) {
      for (const catBase of categoriasBase) {
        const [atendidos, pendientes, enAtencion] = await Promise.all([
          this.docenteRepo.count({ where: { tipoContrato: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.FINALIZADO, activo: true } }),
          this.docenteRepo.count({ where: { tipoContrato: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true } }),
          this.docenteRepo.count({ where: { tipoContrato: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true } }),
        ]);

        const total = atendidos + pendientes + enAtencion;
        if (total === 0) continue; // No mostrar si no hay docentes en esta subcategoría

        let estado = 'pendiente';
        if (enAtencion > 0) estado = 'en_curso';
        else if (pendientes === 0 && atendidos > 0) estado = 'completado';

        monitoreoCategorias.push({
          categoria: `${catBase} ${tipo}`,
          atendidos,
          pendientes,
          total,
          estado
        } as any);
      }
    }

    return {
      totalHoy,
      enCurso,
      docentesEspera,
      atendidosHoy,
      monitoreoCategorias,
    };
  }

  /**
   * Cron Job que se ejecuta cada minuto para gestionar la automatización total
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoGestion() {
    const ahora = new Date();
    
    // 1. AUTO-FINALIZAR TURNOS EXPIRADOS Y LLAMAR SIGUIENTE
    const docentesEnAtencion = await this.docenteRepo.find({
      where: { estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true },
    });

    for (const docente of docentesEnAtencion) {
      if (docente.finAtencion && ahora >= docente.finAtencion) {
        this.logger.log(`Turno expirado para ${docente.nombreCompleto}. Auto-finalizando...`);
        docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
        await this.docenteRepo.save(docente);

        // Intentar llamar al siguiente para la ventana activa (cola global)
        const ventanaActiva = await this.ventanaRepo.findOne({
          where: { estado: EstadoVentana.EN_CURSO, activo: true }
        });
        if (ventanaActiva) {
          await this.llamarSiguiente(ventanaActiva.id);
        }
      }
    }

    // 2. NOTIFICAR 15 MIN ANTES (Próxima Ventana o Próximo Turno)
    const ventanasProximas = await this.ventanaRepo.find({
      where: { estado: EstadoVentana.PROGRAMADA, activo: true },
    });

    for (const ventana of ventanasProximas) {
      const diffMs = ventana.fechaHoraInicio.getTime() - ahora.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      // Si faltan 15 min para que inicie la ventana, notificar al primer docente de la cola global
      if (diffMins <= 15 && diffMins > 14) {
        const primero = await this.docenteRepo.findOne({
          where: { estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true },
          order: { 
            tipoContrato: 'ASC', 
            categoria: 'ASC',
            antiguedadAnios: 'DESC' 
          }
        });

        if (primero && !this.docentesNotificados.has(primero.id)) {
          this.logger.log(`NOTIFICACIÓN: Hola ${primero.nombreCompleto}, la ventana global de atención inicia en 15 min.`);
          await this.notificacionesService.create(
            primero.id,
            'Tu turno se acerca',
            `Hola ${primero.nombreCompleto}, el proceso de selección inicia en aproximadamente 15 minutos. Eres el primero en la cola.`,
            TipoNotificacion.RECORDATORIO_15MIN
          );
          this.docentesNotificados.add(primero.id);
        }
      }

      // Si ya debe iniciar (llegó la hora), llamarlo
      if (diffMins <= 0) {
        await this.llamarSiguiente(ventana.id);
      }
    }

    // 3. NOTIFICAR AL SIGUIENTE MIENTRAS UNO ESTÁ EN ATENCIÓN (Cola Global)
    for (const docente of docentesEnAtencion) {
      if (docente.finAtencion) {
        const diffMs = docente.finAtencion.getTime() - ahora.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        // Si al docente actual le quedan 15 min, notificar al siguiente de la cola global
        if (diffMins <= 15 && diffMins > 14) {
          const siguiente = await this.docenteRepo.findOne({
            where: { estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true },
            order: { 
              tipoContrato: 'ASC', 
              categoria: 'ASC',
              antiguedadAnios: 'DESC' 
            }
          });

          if (siguiente && !this.docentesNotificados.has(siguiente.id)) {
            this.logger.log(`NOTIFICACIÓN: Hola ${siguiente.nombreCompleto}, prepárate. Tu turno inicia pronto.`);
            await this.notificacionesService.create(
              siguiente.id,
              'Prepárate para tu turno',
              `Hola ${siguiente.nombreCompleto}, el docente actual está por terminar. Tu turno iniciará en aproximadamente 15 minutos.`,
              TipoNotificacion.RECORDATORIO_15MIN
            );
            this.docentesNotificados.add(siguiente.id);
          }
        }
      }
    }
  }
}
