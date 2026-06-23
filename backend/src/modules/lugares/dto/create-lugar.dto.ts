import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateLugarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
