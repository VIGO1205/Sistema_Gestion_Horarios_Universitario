import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  async findAll(): Promise<Usuario[]> {
    return await this.usuariosRepository.find({
      relations: ['docente'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByDocenteId(docenteId: number): Promise<Usuario[]> {
    return await this.usuariosRepository.find({ where: { docenteId } });
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      relations: ['docente'],
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return usuario;
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const { email, password, ...rest } = createUsuarioDto;

    // Verificar si el email ya existe
    const existe = await this.usuariosRepository.findOne({ where: { email } });
    if (existe) {
      throw new BadRequestException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevoUsuario = this.usuariosRepository.create({
      ...rest,
      email,
      passwordHash,
    });

    const guardado = await this.usuariosRepository.save(nuevoUsuario);
    const { passwordHash: _, ...result } = guardado;
    return result as Usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);
    const { password, ...rest } = updateUsuarioDto;

    if (password) {
      usuario.passwordHash = await bcrypt.hash(password, 10);
    }

    Object.assign(usuario, rest);
    const actualizado = await this.usuariosRepository.save(usuario);
    const { passwordHash: _, ...result } = actualizado;
    return result as Usuario;
  }

  async remove(id: number): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuariosRepository.remove(usuario);
  }
}
