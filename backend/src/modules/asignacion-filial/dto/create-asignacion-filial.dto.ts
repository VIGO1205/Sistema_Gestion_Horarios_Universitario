import { IsString, IsNumber, IsArray, IsOptional, Min, Max, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class HorarioSemanalItem {
  @IsString()
  dia: string;

  @IsString()
  horaInicio: string;

  @IsString()
  horaFin: string;
}

export class CursoFilialDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  nombre: string;

  @IsString()
  dependencia: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioSemanalItem)
  horarioSemanal: HorarioSemanalItem[];

  @IsString()
  turno: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  totalHorasSemanales: number;
}

export class CreateAsignacionFilialDto {
  @IsNumber()
  docenteId: number;

  @IsNumber()
  cicloId: number;

  @IsString()
  facultad: string;

  @IsString()
  departamentoAcademico: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CursoFilialDto)
  cursos: CursoFilialDto[];
}
