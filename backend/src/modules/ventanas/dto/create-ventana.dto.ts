import { IsEnum, IsInt, IsDateString, IsOptional, Min } from 'class-validator';
import { Categoria } from '../../../database/entities/docente.entity';
import { EstadoVentana } from '../../../database/entities/ventana-atencion.entity';

export class CreateVentanaDto {
  @IsInt()
  cicloId: number;

  @IsDateString()
  fechaHoraInicio: string;

  @IsDateString()
  fechaHoraFin: string;

  @IsInt()
  @Min(1)
  duracionMinutos: number;

  @IsOptional()
  @IsEnum(EstadoVentana)
  estado?: EstadoVentana;
}
