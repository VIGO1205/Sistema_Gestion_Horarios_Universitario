import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateVentanaDto {
  @IsOptional()
  @IsDateString()
  fechaHoraInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaHoraFin?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMinutos?: number;
}
