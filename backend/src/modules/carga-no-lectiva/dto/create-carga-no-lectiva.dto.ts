import { IsNumber, IsOptional, IsString, Min, IsEnum, IsArray } from 'class-validator';
import { EstadoCargaAcademica } from '../../../entities/carga-academica.entity';

export class CreateCargaNoLectivaDto {
  @IsNumber()
  docenteId: number;

  @IsNumber()
  cicloId: number;

  @IsEnum(EstadoCargaAcademica)
  @IsOptional()
  estado?: EstadoCargaAcademica;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasPreparacion?: number;

  @IsString()
  @IsOptional()
  detallePreparacion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasTutoria?: number;

  @IsString()
  @IsOptional()
  detalleTutoria?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasInvestigacion?: number;

  @IsString()
  @IsOptional()
  detalleInvestigacion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasCapacitacion?: number;

  @IsString()
  @IsOptional()
  detalleCapacitacion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasGobierno?: number;

  @IsString()
  @IsOptional()
  detalleGobierno?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasAdministracion?: number;

  @IsString()
  @IsOptional()
  detalleAdministracion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasAsesoria?: number;

  @IsString()
  @IsOptional()
  detalleAsesoria?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasResponsabilidadSocial?: number;

  @IsString()
  @IsOptional()
  detalleResponsabilidadSocial?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasComites?: number;

  @IsString()
  @IsOptional()
  detalleComites?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasAaep?: number;

  @IsString()
  @IsOptional()
  detalleAaep?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horasAaai?: number;

  @IsString()
  @IsOptional()
  detalleAaai?: string;

  @IsString()
  @IsOptional()
  firma?: string;

  @IsOptional()
  incluirFirmaReportes?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @IsOptional()
  horarios?: Array<{
    dia: string;
    horaInicio: string;
    horaFin: string;
    actividadNoLectiva: string;
    aulaId?: number;
  }>;
}
