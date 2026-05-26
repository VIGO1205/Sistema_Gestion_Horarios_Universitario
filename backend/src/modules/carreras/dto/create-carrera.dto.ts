import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCarreraDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  facultad: string;

  @IsString()
  @IsOptional()
  codigo?: string;
}
