import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class CreateProgramacionDto {
  @IsInt()
  cursoId: number;

  @IsInt()
  cicloId: number;

  @IsInt()
  @Min(0)
  horasTeoria: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  numGruposTeoria?: number;

  @IsInt()
  @Min(0)
  horasPractica: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  numGruposPractica?: number;

  @IsInt()
  @Min(0)
  horasLaboratorio: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  numGruposLaboratorio?: number;

  @IsInt()
  @Min(0)
  numeroGrupos: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
