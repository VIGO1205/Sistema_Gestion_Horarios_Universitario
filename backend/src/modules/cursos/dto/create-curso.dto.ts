import { IsString, IsNumber, Min, IsNotEmpty, IsOptional, Allow, IsEnum } from 'class-validator';

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

  @IsOptional()
  @IsEnum(['ES', 'EL', 'OB', 'OP'])
  tipoCurso?: 'ES' | 'EL' | 'OB' | 'OP';

  @IsNumber()
  @IsOptional()
  carreraId?: number;

  @IsNumber()
  @IsOptional()
  @Allow()
  curriculaId?: number | null;
}
