import { IsInt, IsArray, ValidateNested, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoClase } from '../../../database/entities/asignacion-docente-curso.entity';

class AsignacionItemDto {
  @IsInt()
  docenteId: number;

  @IsEnum(TipoClase)
  tipoClase: TipoClase;

  @IsInt()
  @Min(1)
  horasSemanales: number;

  @IsArray()
  @IsInt({ each: true })
  grupos: number[];
}

export class UpdateCargaAcademicaDto {
  @IsInt()
  cursoId: number;

  @IsInt()
  cicloId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignacionItemDto)
  asignaciones: AsignacionItemDto[];
}
