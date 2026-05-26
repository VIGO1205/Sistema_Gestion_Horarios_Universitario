import { IsString, IsEnum, IsNumber, Min, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateAulaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(['teoría', 'práctica', 'laboratorio'])
  tipo: 'teoría' | 'práctica' | 'laboratorio';

  @IsNumber()
  @Min(1)
  capacidad: number;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
