import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CargaNoLectiva } from '../../entities/carga-no-lectiva.entity';
import { CargaAcademica, EstadoCargaAcademica } from '../../entities/carga-academica.entity';
import { Docente } from '../../entities/docente.entity';
import { CreateCargaNoLectivaDto } from './dto/create-carga-no-lectiva.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../../database/entities/notificacion.entity';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { DocentesService } from '../docentes/docentes.service';

@Injectable()
export class CargaNoLectivaService {
  constructor(
    @InjectRepository(CargaNoLectiva)
    private readonly cargaNoLectivaRepo: Repository<CargaNoLectiva>,
    @InjectRepository(CargaAcademica)
    private readonly cargaAcademicaRepo: Repository<CargaAcademica>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    private readonly notificacionesService: NotificacionesService,
    private readonly notificacionesGateway: NotificacionesGateway,
    private readonly docentesService: DocentesService,
    private readonly dataSource: DataSource,
  ) {}

  async findByDocenteAndCiclo(docenteId: number, cicloId: number) {
    let ca = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['docente', 'ciclo', 'cargaNoLectiva'],
    });

    // Si no existe la carga académica para este ciclo, la creamos o al menos devolvemos los datos del docente
    if (!ca) {
      // CORRECCIÓN: Buscar docente directamente del repositorio para evitar excepción 404
      const docente = await this.docenteRepo.findOne({
        where: { id: docenteId },
      });
      return {
        docenteId,
        cicloId,
        estado: EstadoCargaAcademica.BORRADOR,
        firma: docente?.firmaBase64 || null,
        incluirFirmaReportes: false,
        docente,
      };
    }

    // Para mantener compatibilidad con el frontend actual, aplanamos el objeto
    const result = {
      ...ca.cargaNoLectiva,
      id: ca.id,
      cargaNoLectivaId: ca.cargaNoLectiva?.id,
      docenteId: ca.docenteId,
      cicloId: ca.cicloId,
      estado: ca.estado,
      firma: ca.firmaDocente || ca.docente?.firmaBase64,
      incluirFirmaReportes: ca.incluirFirmaReportes,
      observaciones: ca.observaciones,
      docente: ca.docente,
      ciclo: ca.ciclo,
    };

    return result;
  }

  async findAllByCiclo(cicloId: number) {
    // 1. Obtener todas las Cargas Académicas existentes para el ciclo (solo las que existen físicamente)
    const declaracionesMaestras = await this.cargaAcademicaRepo.find({
      where: { cicloId },
      relations: ['docente', 'cargaNoLectiva'],
    });

    // 2. Obtener todas las asignaciones lectivas del ciclo para los docentes que tienen declaración
    const docenteIds = declaracionesMaestras.map(ca => ca.docenteId);
    
    if (docenteIds.length === 0) return [];

    const todasAsignaciones = await this.dataSource.getRepository('asignacion_docente_curso').find({
      where: { cicloId, docenteId: In(docenteIds) },
    });

    // 3. Mapear la lista final (Solo los que tienen registro en CargaAcademica)
    return declaracionesMaestras.map(ca => {
      const asignacionesDocente = todasAsignaciones.filter(a => a['docenteId'] === ca.docenteId);
      const totalHorasLectivas = asignacionesDocente.reduce((sum, a) => sum + Number(a['horasSemanales'] || 0), 0);
      
      ca.docente.asignaciones = asignacionesDocente as any;
      
      // Aplanamos para el frontend
      return {
        ...ca.cargaNoLectiva,
        id: ca.id,
        docenteId: ca.docenteId,
        cicloId: ca.cicloId,
        estado: ca.estado,
      firma: ca.firmaDocente,
      incluirFirmaReportes: ca.incluirFirmaReportes,
      observaciones: ca.observaciones,
        docente: ca.docente,
        totalHorasLectivas: totalHorasLectivas,
      };
    });
  }

  async save(dto: CreateCargaNoLectivaDto) {
    const { docenteId, cicloId, firma, estado, incluirFirmaReportes, ...noLectivaData } = dto;

    // 1. Buscar o crear CargaAcademica
    let ca = await this.cargaAcademicaRepo.findOne({
      where: { docenteId, cicloId },
      relations: ['cargaNoLectiva'],
    });

    if (!ca) {
      ca = this.cargaAcademicaRepo.create({
        docenteId,
        cicloId,
        estado: (estado as EstadoCargaAcademica) || EstadoCargaAcademica.BORRADOR,
        firmaDocente: firma,
        incluirFirmaReportes: incluirFirmaReportes || false,
      });
    } else {
      // Lógica de transición: si el estado entrante es FINALIZADO (vía DTO casted)
      const nuevoEstado = estado as EstadoCargaAcademica;
      
      if (nuevoEstado === EstadoCargaAcademica.FINALIZADO) {
        ca.estado = EstadoCargaAcademica.FINALIZADO;
        if (!ca.fechaFinalizacion) ca.fechaFinalizacion = new Date();
      } else if (nuevoEstado) {
        ca.estado = nuevoEstado;
      }
      
      if (firma) ca.firmaDocente = firma;
      if (incluirFirmaReportes !== undefined) ca.incluirFirmaReportes = incluirFirmaReportes;
      if (dto.observaciones !== undefined) ca.observaciones = dto.observaciones;
    }

    // Guardar firma en el perfil del docente para que sea "solo 1 vez"
    if (firma) {
      await this.dataSource.getRepository('docentes').update(docenteId, { firmaBase64: firma });
    }

    // Calcular horas no lectivas totales
    const totalNoLectivas = Object.entries(noLectivaData)
      .filter(([key]) => key.startsWith('horas'))
      .reduce((sum, [_, val]) => sum + Number(val || 0), 0);
    
    ca.totalHorasNoLectivas = totalNoLectivas;

    // Calcular horas lectivas (opcional aquí, o se puede hacer dinámico)
    const asignaciones = await this.dataSource.getRepository('asignacion_docente_curso').find({
      where: { docenteId, cicloId },
    });
    ca.totalHorasLectivas = asignaciones.reduce((sum, a) => sum + Number(a['horasSemanales'] || 0), 0);

    const caSaved = await this.cargaAcademicaRepo.save(ca);

    // 2. Buscar o crear CargaNoLectiva
    let cnl = ca.cargaNoLectiva;
    if (!cnl) {
      cnl = this.cargaNoLectivaRepo.create({
        ...noLectivaData,
        cargaAcademicaId: caSaved.id,
        docenteId,
        cicloId,
      });
    } else {
      Object.assign(cnl, noLectivaData);
    }

    await this.cargaNoLectivaRepo.save(cnl);

    return this.findByDocenteAndCiclo(docenteId, cicloId);
  }

  async updateEstado(id: number, estado: EstadoCargaAcademica) {
    const ca = await this.cargaAcademicaRepo.findOne({ 
      where: { id }, 
      relations: ['ciclo', 'cargaNoLectiva'] 
    });
    if (!ca) throw new NotFoundException('Carga Académica no encontrada');
    
    const estadoAnterior = ca.estado;
    ca.estado = estado;
    
    if (estado === EstadoCargaAcademica.FINALIZADO && !ca.fechaFinalizacion) {
      ca.fechaFinalizacion = new Date();
    }

    const saved = await this.cargaAcademicaRepo.save(ca);

    // Enviar notificación si el estado cambió
    if (estadoAnterior !== estado) {
      let titulo = 'Actualización de Carga Académica';
      let mensaje = '';
      const cicloNombre = ca.ciclo?.nombre || '';

      if (estado === EstadoCargaAcademica.VALIDADO) {
        titulo = 'Carga Académica Validada';
        mensaje = `Su carga académica para el ciclo ${cicloNombre} ha sido validada correctamente por el coordinador.`;
      } else if (estado === EstadoCargaAcademica.BORRADOR) {
        titulo = 'Carga Académica Observada';
        mensaje = `Su carga académica para el ciclo ${cicloNombre} ha sido devuelta a borrador para correcciones. Por favor, revise sus horas.`;
      }

      if (mensaje) {
        await this.notificacionesService.create(
          ca.docenteId,
          titulo,
          mensaje,
          TipoNotificacion.MENSAJE_SISTEMA
        );

        // Emitir evento por WebSocket
        this.notificacionesGateway.notifyStatusChange(ca.docenteId, {
          estado: saved.estado,
          cicloId: saved.cicloId,
          mensaje
        });
      }
    }

    return saved;
  }
}
