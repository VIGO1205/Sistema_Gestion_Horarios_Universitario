import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, MoreThan, LessThanOrEqual, Not, IsNull, In } from 'typeorm';
import { VentanaAtencion, EstadoVentana, TipoContratoVentana, CategoriaVentana } from '../../database/entities/ventana-atencion.entity';
import { Docente, EstadoSeleccion, TipoContrato, Categoria } from '../../database/entities/docente.entity';
import { CreateVentanaDto } from './dto/create-ventana.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { TipoNotificacion } from '../../database/entities/notificacion.entity';
import { VentanasGateway } from './ventanas.gateway';
import { ReportesService } from '../reportes/reportes.service';
import { CargaAcademica, EstadoCargaAcademica } from '../../database/entities/carga-academica.entity';

@Injectable()
export class VentanasService implements OnModuleInit {
  private readonly logger = new Logger(VentanasService.name);
  private readonly docentesNotificados = new Set<number>();
  private ventanasGateway: VentanasGateway;
  private notificacionesGateway: NotificacionesGateway;

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
    @InjectRepository(CargaAcademica)
    private cargaAcademicaRepo: Repository<CargaAcademica>,
    private notificacionesService: NotificacionesService,
    private reportesService: ReportesService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.ventanasGateway = this.moduleRef.get(VentanasGateway, { strict: false });
    this.notificacionesGateway = this.moduleRef.get(NotificacionesGateway, { strict: false });
  }

  private async crearNotificacionRealTime(docenteId: number, titulo: string, mensaje: string, tipo: TipoNotificacion) {
    try {
      await this.notificacionesService.create(docenteId, titulo, mensaje, tipo);
      if (this.notificacionesGateway?.server) {
        this.notificacionesGateway.notifyStatusChange(docenteId, { 
          titulo, 
          mensaje, 
          tipo,
          refresh: true 
        });
      }
    } catch (error) {
      this.logger.error(`Error al enviar notificación real-time a docente ${docenteId}: ${error.message}`);
    }
  }

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
      // CORRECCIÓN: Solo docentes con carga académica VALIDADA del mismo ciclo
      const docentesGrupo = await this.docenteRepo
        .createQueryBuilder('docente')
        .innerJoin(
          'carga_academica',
          'carga',
          'carga.docente_id = docente.id AND carga.ciclo_id = :cicloId AND carga.estado = :estadoValidado',
          { cicloId, estadoValidado: EstadoCargaAcademica.VALIDADO }
        )
        .where({
          condicion: nivel.tipo,
          categoria: nivel.categoria,
          activo: true,
          ventanaId: IsNull(),
          estadoSeleccion: EstadoSeleccion.EN_ESPERA,
        })
        .orderBy('docente.antiguedadAnios', 'DESC')
        .getMany();

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

    // CORRECCIÓN: Validar si se crearon ventanas, si no, dar mensaje claro
    if (ventanasCreadas.length === 0) {
      throw new BadRequestException(
        'No se encontraron docentes con carga académica VALIDADA del ciclo seleccionado. ' +
        'Por favor, valide que los docentes tengan su carga académica en estado VALIDADO para este ciclo antes de crear ventanas de atención.'
      );
    }

    return {
      message: `${ventanasCreadas.length} ventanas generadas para docentes con carga académica VALIDADA.`,
      ventanas: ventanasCreadas,
    };
  }

  async update(ventanaId: number, updateDto: Partial<CreateVentanaDto>): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) throw new NotFoundException('Ventana no encontrada');

    // Permitir edición si está programada, finalizada o vencida
    const estadoNormalizado = ventana.estado.toLowerCase();
    if (estadoNormalizado !== EstadoVentana.PROGRAMADA && 
        estadoNormalizado !== EstadoVentana.FINALIZADA && 
        estadoNormalizado !== EstadoVentana.VENCIDA) {
      throw new BadRequestException('Sólo se pueden editar ventanas en estado programada, finalizada o vencida');
    }

    const anteriorEstado = ventana.estado;

    if (updateDto.fechaHoraInicio) {
      ventana.fechaHoraInicio = this.parseVentanaDate(updateDto.fechaHoraInicio as any);
    }
    if (updateDto.fechaHoraFin) {
      ventana.fechaHoraFin = this.parseVentanaDate(updateDto.fechaHoraFin as any);
    }
    if (updateDto.duracionMinutos) {
      ventana.duracionMinutos = updateDto.duracionMinutos as number;
    }

    // Si la ventana estaba finalizada o vencida y se reprograma a una fecha futura,
    // volvemos su estado a PROGRAMADA y reseteamos a los docentes asociados
    const ahora = new Date();
    if ((estadoNormalizado === EstadoVentana.FINALIZADA || estadoNormalizado === EstadoVentana.VENCIDA) && 
        ventana.fechaHoraInicio > ahora) {
      ventana.estado = EstadoVentana.PROGRAMADA;
      
      // Liberar docentes asociados para que puedan volver a ser llamados
      await this.docenteRepo.update(
        { ventanaId: ventanaId, activo: true },
        { estadoSeleccion: EstadoSeleccion.EN_ESPERA, inicioAtencion: undefined as any, finAtencion: undefined as any }
      );
      
      this.logger.log(`Ventana ${ventanaId} reprogramada: regresando a estado PROGRAMADA y liberando docentes.`);
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

    const ahora = new Date();

    if (!siguienteDocente) {
      // Si no hay más docentes, finalizamos la ventana
      ventana.estado = EstadoVentana.FINALIZADA;
      ventana.fechaHoraFin = ahora; // La ventana termina AHORA
      await this.ventanaRepo.save(ventana);
      
      // Efecto Dominó: Reprogramar ventanas futuras
      await this.reprogramarVentanasFuturas(ventana);

      this.logger.log(`Ventana ${ventana.id} finalizada automáticamente por falta de docentes`);
      return null;
    }

    // Actualizar estado de ventana a EN_CURSO si estaba programada
    if (ventana.estado === EstadoVentana.PROGRAMADA) {
      ventana.estado = EstadoVentana.EN_CURSO;
      ventana.fechaHoraInicio = ahora; // La ventana empieza AHORA
      await this.ventanaRepo.save(ventana);
    }

    // Activar el turno del docente
    const fin = new Date(ahora.getTime() + ventana.duracionMinutos * 60000);

    siguienteDocente.estadoSeleccion = EstadoSeleccion.EN_ATENCION;
    siguienteDocente.inicioAtencion = ahora;
    siguienteDocente.finAtencion = fin;
    this.docentesNotificados.add(siguienteDocente.id);

    // Guardar docente antes de notificar para asegurar consistencia
    const savedDocente = await this.docenteRepo.save(siguienteDocente);

    // Notificar por socket si el gateway está disponible
    if (this.ventanasGateway?.server) {
      const miEstado = await this.getMiEstado(savedDocente.id);
      this.ventanasGateway.server.emit('ventanas:mi-estado', { 
        ...miEstado, 
        docenteId: savedDocente.id 
      });
    }

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

    // Notificar al docente que fue saltado
    await this.crearNotificacionRealTime(
      docente.id,
      'Turno Finalizado (Saltado)',
      'Un administrador ha finalizado tu turno. Si crees que esto es un error, contacta con coordinación.',
      TipoNotificacion.MENSAJE_SISTEMA
    );

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
    const saved = await this.docenteRepo.save(docente);

    // Notificar al docente la extensión de tiempo
    await this.crearNotificacionRealTime(
      docente.id,
      'Tiempo Extendido',
      `Un administrador ha extendido tu tiempo de atención por ${minutos} minutos más.`,
      TipoNotificacion.TURNO_ACTIVO
    );

    return saved;
  }

  async detenerVentana(ventanaId: number): Promise<VentanaAtencion> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId } });
    if (!ventana) {
      throw new NotFoundException('Ventana no encontrada');
    }

    const ahora = new Date();
    ventana.estado = EstadoVentana.FINALIZADA;
    ventana.fechaHoraFin = ahora; // La ventana termina AHORA al ser detenida
    await this.ventanaRepo.save(ventana);

    // Efecto Dominó: Reprogramar ventanas futuras para que empiecen AHORA
    await this.reprogramarVentanasFuturas(ventana);

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

      // Notificar al docente que la ventana fue detenida
      await this.crearNotificacionRealTime(
        docenteEnAtencion.id,
        'Proceso Detenido',
        'La ventana de atención ha sido finalizada por un administrador. Tu turno ha terminado.',
        TipoNotificacion.MENSAJE_SISTEMA
      );
    }

    return ventana;
  }

  async togglePausa(ventanaId: number): Promise<{ ventana: VentanaAtencion; docente?: Docente; serverTime: Date }> {
    const ventana = await this.ventanaRepo.findOne({ where: { id: ventanaId, activo: true } });
    if (!ventana) throw new NotFoundException('Ventana no encontrada');

    const ahora = new Date();
    let docenteActual: Docente | undefined;

    if (ventana.estado === EstadoVentana.EN_CURSO) {
      ventana.estado = EstadoVentana.PAUSADA;
      ventana.pausadoEn = ahora;
      this.logger.log(`Ventana ${ventanaId} PAUSADA.`);
      
      docenteActual = await this.docenteRepo.findOne({
        where: { ventanaId: ventanaId, estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true }
      }) || undefined;

      if (docenteActual) {
        await this.crearNotificacionRealTime(
          docenteActual.id,
          'Atención Pausada',
          'El proceso de atención ha sido pausado temporalmente por el administrador. El tiempo no seguirá corriendo.',
          TipoNotificacion.MENSAJE_SISTEMA
        );
      }
      
    } else if (ventana.estado === EstadoVentana.PAUSADA) {
      docenteActual = await this.docenteRepo.findOne({
        where: { ventanaId: ventanaId, estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true }
      }) || undefined;

      if (ventana.pausadoEn) {
        // Calcular tiempo restante de pausa (desde el último tick del cron o desde la pausa inicial)
        const msPausados = ahora.getTime() - ventana.pausadoEn.getTime();
        
        // 1. Compensar al docente actual (el remanente)
        if (docenteActual && docenteActual.finAtencion) {
          docenteActual.finAtencion = new Date(docenteActual.finAtencion.getTime() + msPausados);
          await this.docenteRepo.save(docenteActual);

          await this.crearNotificacionRealTime(
            docenteActual.id,
            'Atención Reanudada',
            `El proceso se ha reanudado. Se han compensado los minutos pausados en tu turno.`,
            TipoNotificacion.TURNO_ACTIVO
          );
        }

        // 2. Expandir la ventana actual (el remanente)
        ventana.fechaHoraFin = new Date(ventana.fechaHoraFin.getTime() + msPausados);

        // CORRECCIÓN: Validar que la ventana no pase las 13:00 (horario institucional)
        const peruFin = this.getPeruDate(ventana.fechaHoraFin);
        const hFin = peruFin.getUTCHours();

        if (hFin >= 13) {
          // Limitar a las 13:00 Perú
          ventana.fechaHoraFin.setHours(13 + 5, 0, 0, 0); // 13:00 Perú = 18:00 UTC
          this.logger.warn(`Ventana ${ventanaId} limitada a 13:00 por pausa excesiva`);
        }

        await this.ventanaRepo.save(ventana);

        // 3. Efecto Dominó Final
        await this.reprogramarVentanasFuturas(ventana);

        this.logger.log(`Reanudando Ventana ${ventanaId}: Compensados últimos ${Math.round(msPausados / 1000)}s.`);
      }

      ventana.estado = EstadoVentana.EN_CURSO;
      ventana.pausadoEn = null;
    } else if (ventana.estado === EstadoVentana.PROGRAMADA) {
      ventana.estado = EstadoVentana.PAUSADA;
      ventana.pausadoEn = ahora;
      this.logger.log(`Ventana ${ventanaId} PAUSADA.`);
    } else {
      throw new BadRequestException('Solo se pueden pausar/reanudar ventanas en curso, programadas o pausadas');
    }

    const ventanaGuardada = await this.ventanaRepo.save(ventana);

    // Notificar al docente por socket si existe para sincronizar su UI al instante
    if (docenteActual && this.ventanasGateway?.server) {
      const miEstado = await this.getMiEstado(docenteActual.id);
      this.ventanasGateway.server.emit('ventanas:mi-estado', { 
        ...miEstado, 
        docenteId: docenteActual.id 
      });
    }

    return { ventana: ventanaGuardada, docente: docenteActual, serverTime: ahora };
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

  async validarPermisoRegistro(docenteId: number): Promise<{ permitido: boolean; mensaje?: string; finAtencion?: Date }> {
    const docente = await this.docenteRepo.findOne({ 
      where: { id: docenteId },
      relations: ['ventana']
    });
    
    if (!docente) {
      return { permitido: false, mensaje: 'Docente no encontrado' };
    }

    if (docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      return { permitido: false, mensaje: 'Aún no es tu turno o tu ventana de selección ha finalizado' };
    }

    // Verificar si la ventana está pausada
    if (docente.ventana?.estado === EstadoVentana.PAUSADA) {
      return { permitido: false, mensaje: 'El proceso de registro está pausado temporalmente por el administrador.' };
    }

    // Solo permitir si la ventana está en curso
    if (docente.ventana?.estado !== EstadoVentana.EN_CURSO) {
      return { permitido: false, mensaje: 'Tu ventana de atención no está activa en este momento.' };
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
        { estado: EstadoVentana.PAUSADA, activo: true },
      ],
    });

    if (ventanasDisponibles === 0 && docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      return { estado: 'sin_ventana' };
    }
    
    if (docente.estadoSeleccion === EstadoSeleccion.EN_ATENCION) {
      const ventana = docente.ventanaId
        ? await this.ventanaRepo.findOne({ where: { id: docente.ventanaId } })
        : null;

      if (docente.finAtencion && ahora > docente.finAtencion && ventana?.estado !== EstadoVentana.PAUSADA) {
        docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
        await this.docenteRepo.save(docente);
      } else {
        // Si está pausada, calculamos los segundos restantes basándonos en el momento de la pausa, NO en el ahora.
        const referencia = (ventana?.estado === EstadoVentana.PAUSADA && ventana.pausadoEn) 
          ? ventana.pausadoEn 
          : ahora;

        return {
          estado: docente.estadoSeleccion,
          finAtencion: docente.finAtencion,
          ventanaEstado: ventana?.estado,
          pausadoEn: ventana?.pausadoEn,
          segundosRestantes: docente.finAtencion ? Math.max(0, Math.floor((docente.finAtencion.getTime() - referencia.getTime()) / 1000)) : 0
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
          condicion: 'ASC',
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

  async getCola(condicion?: string, categoria?: string, ventanaId?: number): Promise<Docente[]> {
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
    } else if (condicion && condicion !== 'todos') {
      where.condicion = condicion;
    }

    if (!ventanaId && categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }

    return await this.docenteRepo.find({
      where,
      order: {
        condicion: 'ASC',
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

  async getEnAtencion(condicion?: string, categoria?: string, ventanaId?: number): Promise<Docente | null> {
    const where: any = {
      estadoSeleccion: EstadoSeleccion.EN_ATENCION,
      activo: true,
    };

    if (ventanaId) {
      where.ventanaId = ventanaId;
      return await this.docenteRepo.findOne({ where });
    } else if (condicion && condicion !== 'todos') {
      where.condicion = condicion;
    }

    if (!ventanaId && categoria && categoria !== 'todos') {
      where.categoria = categoria;
    }

    return await this.docenteRepo.findOne({ where });
  }

  async countDocentesPorCategoria(categoria: string, cicloId?: number): Promise<{ count: number }> {
    if (!cicloId) {
      const where: any = { activo: true, estadoSeleccion: EstadoSeleccion.EN_ESPERA };
      if (categoria && categoria !== 'todos') {
        where.categoria = categoria;
      }
      const count = await this.docenteRepo.count({ where });
      return { count };
    }

    // CORRECCIÓN: Solo contar docentes con carga académica VALIDADA del ciclo
    const qb = this.docenteRepo
      .createQueryBuilder('docente')
      .innerJoin(
        'carga_academica',
        'carga',
        'carga.docente_id = docente.id AND carga.ciclo_id = :cicloId AND carga.estado = :estadoValidado',
        { cicloId, estadoValidado: EstadoCargaAcademica.VALIDADO }
      )
      .where({
        activo: true,
        estadoSeleccion: EstadoSeleccion.EN_ESPERA,
      });

    if (categoria && categoria !== 'todos') {
      qb.andWhere('docente.categoria = :categoria', { categoria });
    }

    const count = await qb.getCount();
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
          this.docenteRepo.count({ where: { condicion: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.FINALIZADO, activo: true } }),
          this.docenteRepo.count({ where: { condicion: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true } }),
          this.docenteRepo.count({ where: { condicion: tipo as any, categoria: catBase as any, estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true } }),
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

  private getPeruDate(date: Date): Date {
    return new Date(date.getTime() - (5 * 60 * 60 * 1000));
  }

  /**
   * Efecto Dominó: Reprograma todas las ventanas futuras para que sean consecutivas
   * y respeten el horario institucional (07:00 - 13:00).
   */
  private async reprogramarVentanasFuturas(ventanaReferencia: VentanaAtencion, manager?: any) {
    const repo = manager ? manager.getRepository(VentanaAtencion) : this.ventanaRepo;
    
    const ventanasFuturas = await repo.find({
      where: {
        activo: true,
        estado: In([EstadoVentana.PROGRAMADA, EstadoVentana.EN_CURSO]),
        id: Not(ventanaReferencia.id),
        cicloId: ventanaReferencia.cicloId,
        fechaHoraInicio: MoreThan(ventanaReferencia.fechaHoraInicio)
      },
      order: { fechaHoraInicio: 'ASC' }
    });

    const HORA_INICIO = 7;
    const HORA_FIN = 13;

    let referencia = new Date(ventanaReferencia.fechaHoraFin.getTime());

    for (const v of ventanasFuturas) {
      const duracionMs = v.fechaHoraFin.getTime() - v.fechaHoraInicio.getTime();
      
      let nuevoInicio = new Date(referencia.getTime());
      
      // Validar franja institucional (Perú)
      const pInicio = this.getPeruDate(nuevoInicio);
      const hInicio = pInicio.getUTCHours();

      if (hInicio >= HORA_FIN) {
        nuevoInicio.setDate(nuevoInicio.getDate() + 1);
        nuevoInicio.setHours(HORA_INICIO + 5, 0, 0, 0); // +5 para compensar el transformer si el server es UTC
      } else if (hInicio < HORA_INICIO) {
        nuevoInicio.setHours(HORA_INICIO + 5, 0, 0, 0);
      }

      let nuevoFin = new Date(nuevoInicio.getTime() + duracionMs);
      const pFin = this.getPeruDate(nuevoFin);
      const hFin = pFin.getUTCHours();
      const mFin = pFin.getUTCMinutes();

      if (hFin >= HORA_FIN || (hFin === HORA_FIN && mFin > 0)) {
        nuevoInicio.setDate(nuevoInicio.getDate() + 1);
        nuevoInicio.setHours(HORA_INICIO + 5, 0, 0, 0);
        nuevoFin = new Date(nuevoInicio.getTime() + duracionMs);
      }

      v.fechaHoraInicio = nuevoInicio;
      v.fechaHoraFin = nuevoFin;
      await repo.save(v);

      referencia = new Date(v.fechaHoraFin.getTime());
    }
  }

  /**
   * Cron Job que se ejecuta cada minuto para gestionar la automatización total
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoGestion() {
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];
    
    // 0. GESTIÓN DE PAUSAS EN TIEMPO REAL
    // Si una ventana está pausada, incrementamos su fecha de fin cada minuto
    // para que las ventanas futuras se desplacen automáticamente (Efecto Dominó)
    const ventanasPausadas = await this.ventanaRepo.find({
      where: { estado: EstadoVentana.PAUSADA, activo: true },
    });

    for (const ventana of ventanasPausadas) {
      if (!ventana.pausadoEn) {
        ventana.pausadoEn = ahora;
        await this.ventanaRepo.save(ventana);
        continue;
      }

      // Calcular ms desde el último tick o desde que se pausó
      const msTranscurridos = ahora.getTime() - ventana.pausadoEn.getTime();
      
      if (msTranscurridos >= 60000) {
        // Incrementar fin de ventana
        ventana.fechaHoraFin = new Date(ventana.fechaHoraFin.getTime() + msTranscurridos);
        ventana.pausadoEn = ahora; // Actualizar para el siguiente tick
        await this.ventanaRepo.save(ventana);
        
        // Desplazar ventanas futuras para mantener la consecutividad
        await this.reprogramarVentanasFuturas(ventana);
        
        // También compensar al docente en atención de esa ventana
        const docenteActual = await this.docenteRepo.findOne({
          where: { ventanaId: ventana.id, estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true }
        });

        if (docenteActual && docenteActual.finAtencion) {
          docenteActual.finAtencion = new Date(docenteActual.finAtencion.getTime() + msTranscurridos);
          await this.docenteRepo.save(docenteActual);
        }

        this.logger.log(`Ventana ${ventana.id} PAUSADA: Desplazando tiempos +${Math.round(msTranscurridos/1000)}s`);
      }
    }

    // 1. AUTO-FINALIZAR TURNOS EXPIRADOS Y LLAMAR SIGUIENTE
    const docentesEnAtencion = await this.docenteRepo.find({
      where: { estadoSeleccion: EstadoSeleccion.EN_ATENCION, activo: true },
    });

    for (const docente of docentesEnAtencion) {
      const ventanaDocente = docente.ventanaId
        ? await this.ventanaRepo.findOne({ where: { id: docente.ventanaId } })
        : null;

      // Si la ventana está pausada, el tiempo del docente NO corre
      if (ventanaDocente?.estado === EstadoVentana.PAUSADA) {
        // Compensamos el fin de atención del docente también en tiempo real
        if (docente.finAtencion) {
          docente.finAtencion = new Date(docente.finAtencion.getTime() + 60000);
          await this.docenteRepo.save(docente);
        }
        continue;
      }

      if (docente.finAtencion && ahora >= docente.finAtencion) {
        this.logger.log(`Turno expirado para ${docente.nombreCompleto}. Auto-finalizando...`);
        docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
        await this.docenteRepo.save(docente);

        // Finalizar Carga Académica y Generar reportes automáticos al expirar el tiempo
        if (ventanaDocente?.cicloId) {
          try {
            // 1. Marcar Carga Académica como FINALIZADO
            await this.cargaAcademicaRepo.update(
              { docenteId: docente.id, cicloId: ventanaDocente.cicloId },
              { 
                estado: EstadoCargaAcademica.FINALIZADO,
                fechaFinalizacion: new Date()
              }
            );
            this.logger.log(`Carga Académica auto-finalizada por expiración para docente ${docente.id}`);

            // 2. Crear reportes
            await this.reportesService.crearReportesAutomaticos(docente.id, ventanaDocente.cicloId);
            this.logger.log(`Reportes automáticos creados por expiración para docente ${docente.id}`);
          } catch (err) {
            this.logger.error(`Error auto-finalizando proceso para docente ${docente.id}: ${err.message}`);
          }
        }

        // Notificar por socket el cambio de estado a finalizado
        if (this.ventanasGateway?.server) {
          this.ventanasGateway.server.emit('ventanas:mi-estado', {
            estado: 'finalizado',
            docenteId: docente.id,
            motivo: 'tiempo_expirado'
          });
        }

        // Llamar al siguiente docente automáticamente al expirar el tiempo
        if (ventanaDocente?.id) {
          await this.llamarSiguiente(ventanaDocente.id);
          this.logger.log(`Llamado automático al siguiente docente tras expiración de turno de ${docente.id}`);
        }
      }
    }

    // 2. GESTIÓN DE VENTANAS PROGRAMADAS Y VENCIDAS
    const ventanasProximas = await this.ventanaRepo.find({
      where: { estado: EstadoVentana.PROGRAMADA, activo: true },
    });

    for (const ventana of ventanasProximas) {
      const fechaVentana = ventana.fechaHoraInicio.toISOString().split('T')[0];
      const diffMs = ventana.fechaHoraInicio.getTime() - ahora.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      // SEGURIDAD CRON: Si la ventana es de un día pasado, marcarla como VENCIDA
      if (fechaVentana < hoy) {
        this.logger.warn(`Ventana ${ventana.id} del día ${fechaVentana} marcada como VENCIDA por el Cron.`);
        ventana.estado = EstadoVentana.VENCIDA;
        await this.ventanaRepo.save(ventana);
        continue;
      }

      // Solo procesar ventanas de HOY
      if (fechaVentana === hoy) {
        // Notificar 15 min antes
        if (diffMins <= 15 && diffMins > 14) {
          const primero = await this.docenteRepo.findOne({
            where: { estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true, ventanaId: ventana.id },
            order: { 
              antiguedadAnios: 'DESC' 
            }
          });

          if (primero && !this.docentesNotificados.has(primero.id)) {
            this.logger.log(`NOTIFICACIÓN: Hola ${primero.nombreCompleto}, tu ventana inicia en 15 min.`);
            try {
              await this.notificacionesService.create(
                primero.id,
                'Tu turno se acerca',
                `Hola ${primero.nombreCompleto}, el proceso de selección para tu categoría inicia en aproximadamente 15 minutos.`,
                TipoNotificacion.RECORDATORIO_15MIN
              );
              this.docentesNotificados.add(primero.id);
            } catch (err) {
              this.logger.error(`Error al crear notificación para docente ${primero.id}: ${err.message}`);
            }
          }
        }

        // Si ya debe iniciar (llegó la hora), llamarlo
        if (diffMins <= 0) {
          // Si ya pasaron más de 120 min de la hora de inicio de HOY y sigue programada,
          // es posible que el sistema haya estado caído. La marcamos como vencida por seguridad.
          if (diffMins < -120) {
            this.logger.warn(`Ventana ${ventana.id} de hoy marcada como VENCIDA por retraso excesivo (>2h).`);
            ventana.estado = EstadoVentana.VENCIDA;
            await this.ventanaRepo.save(ventana);
          } else {
            // CORRECCIÓN: Verificar si hay una ventana anterior activa (EN_CURSO o PAUSADA)
            const ventanaAnterior = await this.ventanaRepo.findOne({
              where: {
                cicloId: ventana.cicloId,
                estado: In([EstadoVentana.EN_CURSO, EstadoVentana.PAUSADA]),
                fechaHoraFin: LessThanOrEqual(ventana.fechaHoraInicio),
                activo: true,
                id: Not(ventana.id),
              },
              order: { fechaHoraFin: 'DESC' }
            });

            // Solo llamar si no hay ventana anterior activa
            if (!ventanaAnterior) {
              try {
                await this.llamarSiguiente(ventana.id);
              } catch (err) {
                this.logger.error(`Error al llamar siguiente en ventana ${ventana.id}: ${err.message}`);
              }
            } else {
              this.logger.log(`Ventana ${ventana.id} espera porque ventana ${ventanaAnterior.id} está ${ventanaAnterior.estado}`);
            }
          }
        }
      }
    }

    // 3. NOTIFICAR AL SIGUIENTE MIENTRAS UNO ESTÁ EN ATENCIÓN (Cola Global)
    for (const docente of docentesEnAtencion) {
      const ventanaDocente = docente.ventanaId
        ? await this.ventanaRepo.findOne({ where: { id: docente.ventanaId } })
        : null;

      if (ventanaDocente?.estado === EstadoVentana.PAUSADA) {
        continue;
      }

      if (docente.finAtencion) {
        const diffMs = docente.finAtencion.getTime() - ahora.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        // Si al docente actual le quedan 5 min, notificar al siguiente de la cola global
        if (diffMins <= 5 && diffMins > 4) {
          const siguiente = await this.docenteRepo.findOne({
            where: docente.ventanaId
              ? { estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true, ventanaId: docente.ventanaId }
              : { estadoSeleccion: EstadoSeleccion.EN_ESPERA, activo: true },
            order: { 
              antiguedadAnios: 'DESC' 
            }
          });

          if (siguiente && !this.docentesNotificados.has(siguiente.id)) {
            this.logger.log(`NOTIFICACIÓN: Hola ${siguiente.nombreCompleto}, prepárate. Tu turno inicia pronto.`);
            try {
              await this.notificacionesService.create(
                siguiente.id,
                'Prepárate para tu turno',
                `Hola ${siguiente.nombreCompleto}, el docente actual está por terminar. Tu turno iniciará en aproximadamente 5 minutos.`,
                TipoNotificacion.RECORDATORIO_15MIN
              );
              this.docentesNotificados.add(siguiente.id);
            } catch (err) {
              this.logger.error(`Error al crear notificación para docente ${siguiente.id}: ${err.message}`);
            }
          }
        }
      }
    }
  }

  async finalizarTurno(docenteId: number): Promise<void> {
    const docente = await this.docenteRepo.findOne({ 
      where: { id: docenteId },
      relations: ['ventana']
    });
    
    if (!docente) throw new NotFoundException('Docente no encontrado');
    if (docente.estadoSeleccion !== EstadoSeleccion.EN_ATENCION) {
      throw new BadRequestException('El docente no está en atención actualmente');
    }

    this.logger.log(`Docente ${docente.nombreCompleto} finalizó su turno voluntariamente.`);
    docente.estadoSeleccion = EstadoSeleccion.FINALIZADO;
    docente.finAtencion = new Date();
    await this.docenteRepo.save(docente);

    // Finalizar Carga Académica y Crear reportes automáticos
    if (docente.ventana?.cicloId) {
      try {
        // 1. Marcar Carga Académica como FINALIZADO
        await this.cargaAcademicaRepo.update(
          { docenteId: docente.id, cicloId: docente.ventana.cicloId },
          { 
            estado: EstadoCargaAcademica.FINALIZADO,
            fechaFinalizacion: new Date()
          }
        );
        this.logger.log(`Carga Académica finalizada para docente ${docente.id}`);

        // 2. Crear reportes
        await this.reportesService.crearReportesAutomaticos(docente.id, docente.ventana.cicloId);
        this.logger.log(`Reportes automáticos creados para docente ${docente.id}`);
      } catch (err) {
        this.logger.error(`Error finalizando proceso para docente ${docente.id}: ${err.message}`);
      }
    }

    // Notificar por socket si el gateway está disponible
    if (this.ventanasGateway?.server) {
      this.ventanasGateway.server.emit('ventanas:mi-estado', {
        estado: 'finalizado', 
        docenteId: docente.id 
      });
    }

    // Llamar al siguiente de inmediato automáticamente tras finalizar turno
    if (docente.ventanaId) {
      await this.llamarSiguiente(docente.ventanaId);
      this.logger.log(`Llamado automático al siguiente docente tras finalizar turno de ${docente.id}`);
    }
  }
}
