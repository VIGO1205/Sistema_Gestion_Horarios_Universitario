import { ArrayMinSize, IsArray, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchAsignarCursosDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  curriculaId: number;
}
