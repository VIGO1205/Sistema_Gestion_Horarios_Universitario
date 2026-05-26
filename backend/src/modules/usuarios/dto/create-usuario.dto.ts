import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean, IsNumber } from 'class-validator';
import { RolUsuario } from '../../../entities/usuario.entity';

export class CreateUsuarioDto {
  @IsEmail({}, { message: 'Email no válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(RolUsuario, { message: 'Rol no válido' })
  rol: RolUsuario;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsNumber()
  docenteId?: number;
}
