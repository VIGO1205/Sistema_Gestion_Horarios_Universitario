import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lugar } from '../../database/entities/lugar.entity';
import { CreateLugarDto } from './dto/create-lugar.dto';
import { UpdateLugarDto } from './dto/update-lugar.dto';

@Injectable()
export class LugaresService {
  constructor(
    @InjectRepository(Lugar)
    private lugaresRepository: Repository<Lugar>,
  ) {}

  async create(createLugarDto: CreateLugarDto): Promise<Lugar> {
    const lugar = this.lugaresRepository.create(createLugarDto as unknown as Partial<Lugar>);
    return await this.lugaresRepository.save(lugar);
  }

  async findAll(): Promise<Lugar[]> {
    return await this.lugaresRepository.find({
      order: { codigo: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Lugar> {
    const lugar = await this.lugaresRepository.findOne({ where: { id } });
    if (!lugar) {
      throw new NotFoundException(`Lugar con id ${id} no encontrado`);
    }
    return lugar;
  }

  async findByCodigo(codigo: string): Promise<Lugar | null> {
    return await this.lugaresRepository.findOne({ where: { codigo } });
  }

  async update(id: number, updateLugarDto: UpdateLugarDto): Promise<Lugar> {
    const lugar = await this.findOne(id);
    Object.assign(lugar, updateLugarDto);
    return await this.lugaresRepository.save(lugar);
  }

  async remove(id: number): Promise<void> {
    const lugar = await this.findOne(id);
    await this.lugaresRepository.remove(lugar);
  }
}
