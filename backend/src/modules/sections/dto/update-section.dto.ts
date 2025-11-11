import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { SectionStatus } from "../../../entities/etp-section.entity";

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: "Título atualizado da seção" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Conteúdo atualizado da seção..." })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: "Input do usuário atualizado..." })
  @IsOptional()
  @IsString()
  userInput?: string;

  @ApiPropertyOptional({ enum: SectionStatus })
  @IsOptional()
  @IsEnum(SectionStatus)
  status?: SectionStatus;
}
