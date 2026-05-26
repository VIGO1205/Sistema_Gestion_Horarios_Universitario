import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../../entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log(`Intentando validar usuario: ${email}`);
    const usuario = await this.usuarioRepository.findOne({
      where: { email },
      relations: ['docente'],
    });

    if (usuario) {
      const isMatch = await bcrypt.compare(password, usuario.passwordHash);
      console.log(`Usuario encontrado. ¿Password coincide?: ${isMatch}`);
      if (isMatch) {
        const { passwordHash, ...result } = usuario;
        return result;
      }
    }
    console.log(`Validación fallida para: ${email}`);
    return null;
  }

  async login(usuario: any) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      docenteId: usuario.docente?.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.docente?.nombreCompleto,
        docenteId: usuario.docente?.id,
      },
    };
  }

  async validateJwt(payload: any): Promise<any> {
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      docenteId: payload.docenteId,
    };
  }
}
