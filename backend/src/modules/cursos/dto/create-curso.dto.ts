import { IsString, IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCursoDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @Min(1)
  creditos: number;

  @IsString()
  @IsNotEmpty()
  cicloAcademico: string;

  @IsString()
  @IsNotEmpty()
  departamento: string;

  @IsNumber()
  @IsOptional()
  carreraId?: number;
}
