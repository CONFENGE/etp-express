import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for account deletion cancellation.
 *
 * @remarks
 * Contains JWT token generated during soft delete confirmation email.
 * Token is valid for 30 days and includes user ID and type='CANCEL_DELETION'.
 */
export class CancelDeletionDto {
 @ApiProperty({
 description:
 'JWT token received in deletion confirmation email (valid for 30 days)',
 example:
 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YzQwMzA2Ni0yMzNkLTRkZjQtYWI0NS1iZGFjNzY5ZWZkZDciLCJ0eXBlIjoiQ0FOQ0VMX0RFTEVUSU9OIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDI1OTIwMDB9.1234567890',
 })
 @IsString()
 @IsNotEmpty()
 token: string;
}
