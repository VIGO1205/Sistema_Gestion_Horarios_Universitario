import { PartialType } from '@nestjs/mapped-types';
import { CreateLugarDto } from './create-lugar.dto';

export class UpdateLugarDto extends PartialType(CreateLugarDto) {}
