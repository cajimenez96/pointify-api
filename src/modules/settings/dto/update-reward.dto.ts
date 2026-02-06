import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardDto } from './create-reward.dto';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO para actualizar un premio existente
 */
export class UpdateRewardDto extends PartialType(CreateRewardDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Para activar/desactivar premio
}
