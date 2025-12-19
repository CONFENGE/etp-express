import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning a domain manager to an authorized domain.
 *
 * @example
 * {
 * userId: '123e4567-e89b-12d3-a456-426614174000'
 * }
 */
export class AssignManagerDto {
  @ApiProperty({
    description: 'UUID of the user to assign as domain manager',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
