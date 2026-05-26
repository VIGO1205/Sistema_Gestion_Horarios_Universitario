import { PartialType } from '@nestjs/mapped-types';
import { CreateProgramacionDto } from './create-programacion.dto';

export class UpdateProgramacionDto extends PartialType(CreateProgramacionDto) {}
