import { PartialType } from '@nestjs/mapped-types';
import { CreateAsignacionFilialDto } from './create-asignacion-filial.dto';

export class UpdateAsignacionFilialDto extends PartialType(CreateAsignacionFilialDto) {}
