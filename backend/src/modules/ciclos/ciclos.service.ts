import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CicloAcademico } from './entities/ciclo.entity';

@Injectable()
export class CiclosService implements OnModuleInit {
  private readonly logger = new Logger(CiclosService.name);

  constructor(
    @InjectRepository(CicloAcademico)
    private readonly cicloRepo: Repository<CicloAcademico>,
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
      await this.cicloRepo.save(ciclo);
    } else if (!ciclo.esActual) {
      this.logger.log(`Activando ciclo académico existente: ${nombreCiclo}`);
      await this.cicloRepo.update({ esActual: true }, { esActual: false });
      ciclo.esActual = true;
      await this.cicloRepo.save(ciclo);
    }

    return ciclo;
  }

  async getCicloActual(): Promise<CicloAcademico> {
    const ciclo = await this.cicloRepo.findOne({ where: { esActual: true } });
    if (!ciclo) return this.asegurarCicloActual();
    return ciclo;
  }

  async findAll(): Promise<CicloAcademico[]> {
    return this.cicloRepo.find({ order: { fechaInicio: 'DESC' } });
  }
}
