import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrera } from './entities/carrera.entity';
import { CreateCarreraDto } from './dto/create-carrera.dto';
import { UpdateCarreraDto } from './dto/update-carrera.dto';

@Injectable()
export class CarrerasService {
  constructor(
    @InjectRepository(Carrera)
    private readonly carreraRepo: Repository<Carrera>,
  ) {}

  async create(createCarreraDto: CreateCarreraDto): Promise<Carrera> {
    const carrera = this.carreraRepo.create(createCarreraDto);
    return await this.carreraRepo.save(carrera);
  }

  async findAll(): Promise<Carrera[]> {
    return await this.carreraRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Carrera> {
    const carrera = await this.carreraRepo.findOne({ where: { id } });
    if (!carrera) {
      throw new NotFoundException(`Carrera con ID ${id} no encontrada`);
    }
    return carrera;
  }

  async update(id: number, updateCarreraDto: UpdateCarreraDto): Promise<Carrera> {
    const carrera = await this.findOne(id);
    Object.assign(carrera, updateCarreraDto);
    return await this.carreraRepo.save(carrera);
  }

  async remove(id: number): Promise<void> {
    const carrera = await this.findOne(id);
    await this.carreraRepo.remove(carrera);
  }
}
