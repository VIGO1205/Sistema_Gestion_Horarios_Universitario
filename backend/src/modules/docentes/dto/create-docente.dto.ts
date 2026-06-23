import { IsString, IsEnum, IsNumber, Min, Max, IsBoolean, IsOptional, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoContrato, Categoria, Facultad, DepartamentoAcademico, TipoInvestigacion } from '../../../database/entities/docente.entity';

export class CreateDocenteDto {
  @IsString({ message: 'El nombre completo debe ser un texto válido' })
  @Matches(/^[\p{L}\s]+$/u, { message: 'El nombre solo puede contener letras y espacios' })
  nombreCompleto: string;

  @IsString({ message: 'El DNI debe ser un texto válido' })
  @IsOptional()
  dni?: string;

  @IsEnum(TipoContrato, { message: 'La condición debe ser nombrado, contratado o extraordinario' })
  condicion: TipoContrato;

  @IsEnum(Categoria, { message: 'La categoría seleccionada no es válida' })
  categoria: Categoria;

  @IsOptional()
  @IsEnum(Facultad, { message: 'La facultad seleccionada no es válida' })
  facultad?: Facultad;

  @IsOptional()
  @IsEnum(DepartamentoAcademico, { message: 'El departamento académico seleccionado no es válido' })
  departamentoAcademico?: DepartamentoAcademico;

  @IsOptional()
  @IsString()
  cargoGobierno?: string;

  @IsOptional()
  @IsString()
  cargoGestionInstitucional?: string;

  @IsOptional()
  @IsBoolean()
  esBecario?: boolean;

  @IsOptional()
  @IsEnum(TipoInvestigacion, { message: 'El tipo de investigación no es válido' })
  investigacion?: TipoInvestigacion;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencias?: string[];

  @IsOptional()
  @IsString({ message: 'La fecha de ingreso debe ser un texto válido' })
  fechaIngreso?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'El email personal debe ser un texto válido' })
  emailPersonal?: string;

  @IsOptional()
  @IsString({ message: 'La dedicación debe ser un texto válido' })
  dedicacion?: string;

  @IsOptional()
  @IsString({ message: 'El código IBM debe ser un texto válido' })
  codigoIBM?: string;

  @IsOptional()
  @IsString({ message: 'El Telegram ID debe ser un texto válido' })
  telegramId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La antigüedad debe ser un número válido' })
  @Min(0, { message: 'La antigüedad no puede ser menor que 0' })
  @Max(50, { message: 'La antigüedad no puede ser mayor que 50' })
  antiguedadAnios?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsArray()
  @IsOptional()
  carreraIds?: number[];
}
