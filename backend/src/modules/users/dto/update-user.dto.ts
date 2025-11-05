import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João da Silva Junior' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Ministério da Economia' })
  @IsOptional()
  @IsString()
  orgao?: string;

  @ApiPropertyOptional({ example: 'Coordenador de Contratos' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
