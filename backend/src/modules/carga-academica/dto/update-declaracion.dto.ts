import { IsNumber, Min, Max } from 'class-validator';

export class UpdateDeclaracionDto {
  @IsNumber()
  docenteId: number;

  @IsNumber()
  cicloId: number;

  @IsNumber()
  @Min(1)
  @Max(8)
  opcion: number;
}
