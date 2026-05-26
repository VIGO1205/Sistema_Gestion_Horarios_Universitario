import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { CreateAulaDto } from './dto/create-aula.dto';
import { UpdateAulaDto } from './dto/update-aula.dto';

@Injectable()
export class AulasService {
  constructor(
    @InjectRepository(Aula)
    private aulasRepository: Repository<Aula>,
  ) {}

  async create(createAulaDto: CreateAulaDto): Promise<Aula> {
    const aula = this.aulasRepository.create(createAulaDto as unknown as Partial<Aula>);
    return await this.aulasRepository.save(aula);
  }

  async findAll(): Promise<Aula[]> {
    return await this.aulasRepository.find({
      order: { tipo: 'ASC' },
    });
  }

  async findByTipo(tipo: string): Promise<Aula[]> {
    return await this.aulasRepository.find({
      where: { tipo: tipo as any },
    });
  }

  async findOne(id: number): Promise<Aula> {
    const aula = await this.aulasRepository.findOne({ where: { id } });
    if (!aula) {
      throw new NotFoundException(`Aula con id ${id} no encontrada`);
    }
    return aula;
  }

  async update(id: number, updateAulaDto: UpdateAulaDto): Promise<Aula> {
    const aula = await this.findOne(id);
    Object.assign(aula, updateAulaDto);
    return await this.aulasRepository.save(aula);
  }

  async remove(id: number): Promise<void> {
    const aula = await this.findOne(id);
    await this.aulasRepository.remove(aula);
  }

  async toggleDisponibilidad(id: number): Promise<Aula> {
    const aula = await this.findOne(id);
    aula.disponible = !aula.disponible;
    return await this.aulasRepository.save(aula);
  }
}
