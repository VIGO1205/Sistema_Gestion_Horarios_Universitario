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

    if (!usuario) {
      console.log(`Usuario no encontrado: ${email}`);
      throw new UnauthorizedException('Credenciales Inválidas');
    }

    // Verificar si la cuenta está bloqueada temporalmente
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil((usuario.bloqueadoHasta.getTime() - new Date().getTime()) / 60000);
      throw new UnauthorizedException(`Cuenta bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`);
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      throw new UnauthorizedException('Tu cuenta ha sido desactivada. Contacta al administrador.');
    }

    const isMatch = await bcrypt.compare(password, usuario.passwordHash);
    
    if (!isMatch) {
      // Incrementar intentos fallidos
      usuario.intentosFallidos += 1;
      
      if (usuario.intentosFallidos >= 5) {
        const bloqueo = new Date();
        bloqueo.setMinutes(bloqueo.getMinutes() + 15); // Bloqueo por 15 min
        usuario.bloqueadoHasta = bloqueo;
        usuario.intentosFallidos = 0; // Reiniciar contador tras bloqueo
        await this.usuarioRepository.save(usuario);
        throw new UnauthorizedException('Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.');
      }

      await this.usuarioRepository.save(usuario);
      console.log(`Password incorrecto para: ${email}. Intento: ${usuario.intentosFallidos}`);
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Verificar si tiene docente asociado si el rol lo requiere
    if ((usuario.rol === 'docente' || usuario.rol === 'coordinador') && !usuario.docente) {
      throw new UnauthorizedException('Usuario sin perfil de docente asociado. Contacta al administrador.');
    }

    // Login exitoso: Reiniciar intentos fallidos y bloqueo
    if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
      await this.usuarioRepository.save(usuario);
    }

    const { passwordHash, ...result } = usuario;
    return result;
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
