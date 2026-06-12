import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CicloAcademico } from './entities/ciclo.entity';
import { ConfiguracionGrilla } from '../../database/entities/configuracion-grilla.entity';

@Injectable()
export class CiclosService implements OnModuleInit {
  private readonly logger = new Logger(CiclosService.name);

  constructor(
    @InjectRepository(CicloAcademico)
    private readonly cicloRepo: Repository<CicloAcademico>,
    @InjectRepository(ConfiguracionGrilla)
    private readonly configRepo: Repository<ConfiguracionGrilla>,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Iniciando verificación automática de ciclos académicos...');
      await this.asegurarCicloActual();
    } catch (error) {
      this.logger.warn('No se pudo verificar el ciclo actual en el inicio. Es posible que las tablas aún no existan. Reintentando en el primer acceso...');
      this.logger.error(error.message);
    }
  }

  async asegurarCicloActual(): Promise<CicloAcademico> {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // 1-12

    // Lógica UNT: 
    // Ciclo I: Abril - Agosto
    // Ciclo II: Septiembre - Enero
    // Verano: Febrero - Marzo
    
    let nombreCiclo = '';
    let fechaInicio: Date;
    let fechaFin: Date;

    if (mes >= 4 && mes <= 8) {
      nombreCiclo = `${anio}-I`;
      fechaInicio = new Date(anio, 3, 1); // 1 de Abril
      fechaFin = new Date(anio, 7, 31);   // 31 de Agosto
    } else if (mes >= 9 || mes <= 1) {
      const anioCiclo = mes <= 1 ? anio - 1 : anio;
      nombreCiclo = `${anioCiclo}-II`;
      fechaInicio = new Date(anioCiclo, 8, 1); // 1 de Septiembre
      fechaFin = new Date(anioCiclo + 1, 0, 31); // 31 de Enero
    } else {
      nombreCiclo = `${anio}-Verano`;
      fechaInicio = new Date(anio, 1, 1);  // 1 de Febrero
      fechaFin = new Date(anio, 2, 31);   // 31 de Marzo
    }

    let ciclo = await this.cicloRepo.findOne({ where: { nombre: nombreCiclo } });

    if (!ciclo) {
      this.logger.log(`Creando nuevo ciclo académico automático: ${nombreCiclo}`);
      
      // Desmarcar ciclos anteriores como actuales
      await this.cicloRepo.update({ esActual: true }, { esActual: false });

      ciclo = this.cicloRepo.create({
        nombre: nombreCiclo,
        fechaInicio,
        fechaFin,
        esActual: true,
      });
      ciclo = await this.cicloRepo.save(ciclo);
      
      // Crear configuración por defecto para el nuevo ciclo
      await this.crearConfiguracionDefecto(ciclo.id);
    } else if (!ciclo.esActual) {
      this.logger.log(`Activando ciclo académico existente: ${nombreCiclo}`);
      await this.cicloRepo.update({ esActual: true }, { esActual: false });
      ciclo.esActual = true;
      await this.cicloRepo.save(ciclo);
    }

    return ciclo;
  }

  private async crearConfiguracionDefecto(cicloId: number) {
    const config = this.configRepo.create({
      cicloId,
      horaInicio: '07:00',
      horaFin: '22:00',
      almuerzoInicio: '13:00',
      almuerzoFin: '14:00',
      diasActivos: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
    });
    return this.configRepo.save(config);
  }

  async getConfiguracion(cicloId: number): Promise<ConfiguracionGrilla> {
    let config = await this.configRepo.findOne({ where: { cicloId } });
    if (!config) {
      config = await this.crearConfiguracionDefecto(cicloId);
    }
    return config;
  }

  async updateConfiguracion(cicloId: number, data: Partial<ConfiguracionGrilla>): Promise<ConfiguracionGrilla> {
    let config = await this.configRepo.findOne({ where: { cicloId } });
    if (!config) {
      config = this.configRepo.create({ ...data, cicloId });
    } else {
      Object.assign(config, data);
    }
    return this.configRepo.save(config);
  }

  async getCicloActual(): Promise<CicloAcademico> {
    const ciclo = await this.cicloRepo.findOne({ where: { esActual: true } });
    if (!ciclo) return this.asegurarCicloActual();
    return ciclo;
  }

  async findAll(): Promise<CicloAcademico[]> {
    return this.cicloRepo.find({ order: { fechaInicio: 'DESC' } });
  }

  async findOne(id: number): Promise<CicloAcademico> {
    const ciclo = await this.cicloRepo.findOne({ where: { id } });
    if (!ciclo) {
      throw new NotFoundException(`Ciclo con ID ${id} no encontrado`);
    }
    return ciclo;
  }

  async create(data: Partial<CicloAcademico>): Promise<CicloAcademico> {
    if (data.esActual) {
      await this.cicloRepo.update({ esActual: true }, { esActual: false });
    }
    const ciclo = this.cicloRepo.create(data);
    const saved = await this.cicloRepo.save(ciclo);
    await this.crearConfiguracionDefecto(saved.id);
    return saved;
  }

  async update(id: number, data: Partial<CicloAcademico>): Promise<CicloAcademico> {
    const ciclo = await this.findOne(id);
    
    if (data.esActual && !ciclo.esActual) {
      await this.cicloRepo.update({ esActual: true }, { esActual: false });
    }

    Object.assign(ciclo, data);
    return this.cicloRepo.save(ciclo);
  }

  async remove(id: number): Promise<void> {
    const ciclo = await this.findOne(id);
    if (ciclo.esActual) {
      throw new Error('No se puede eliminar el ciclo académico actual');
    }
    await this.cicloRepo.remove(ciclo);
  }
}
