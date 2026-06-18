import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportedCursoDto {
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
}

export class ConfirmImportCursosDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  carreraId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  curriculaId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportedCursoDto)
  cursos: ImportedCursoDto[];
}
