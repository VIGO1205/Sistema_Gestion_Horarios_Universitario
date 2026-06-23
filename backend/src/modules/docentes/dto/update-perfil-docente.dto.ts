import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max, IsArray } from 'class-validator';
import { TipoContrato, Categoria, Facultad, DepartamentoAcademico, TipoInvestigacion } from '../../../database/entities/docente.entity';

export class UpdatePerfilDocenteDto {
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsEnum(TipoContrato)
  condicion?: TipoContrato;

  @IsOptional()
  @IsEnum(Categoria)
  categoria?: Categoria;

  @IsOptional()
  @IsEnum(Facultad)
  facultad?: Facultad;

  @IsOptional()
  @IsEnum(DepartamentoAcademico)
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
  @IsEnum(TipoInvestigacion)
  investigacion?: TipoInvestigacion;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencias?: string[];

  @IsOptional()
  @IsString()
  fechaIngreso?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  emailPersonal?: string;

  @IsOptional()
  @IsString()
  dedicacion?: string;

  @IsOptional()
  @IsString()
  codigoIBM?: string;

  @IsOptional()
  @IsString()
  telegramId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  antiguedadAnios?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
