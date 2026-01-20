import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO para geração automática de Edital a partir de ETP+TR+PesquisaPrecos.
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Milestone: M14 - Geração de Edital
 */
export class GenerateEditalDto {
  /**
   * ID do ETP aprovado como base para o Edital.
   * Obrigatório.
   */
  @IsUUID()
  @IsNotEmpty()
  etpId: string;

  /**
   * ID do Termo de Referência vinculado (opcional).
   * Se fornecido, será usado para preencher especificações técnicas.
   */
  @IsOptional()
  @IsUUID()
  termoReferenciaId?: string;

  /**
   * ID da Pesquisa de Preços vinculada (opcional).
   * Se fornecido, será usado para preencher valorEstimado e fundamentar orçamento.
   */
  @IsOptional()
  @IsUUID()
  pesquisaPrecosId?: string;

  /**
   * Número do edital (opcional).
   * Se não fornecido, será gerado automaticamente no formato "XXX/YYYY-MODALIDADE".
   */
  @IsOptional()
  @IsString()
  numero?: string;
}

/**
 * DTO de resposta da geração automática de Edital.
 * Inclui metadados de IA e latência.
 */
export class GenerateEditalResponseDto {
  id: string;
  numero: string;
  objeto: string;
  modalidade: string | null;
  tipoContratacaoDireta: string | null;
  valorEstimado: string | null;
  status: string;
  createdAt: Date;

  // Metadados da geração
  metadata: {
    /** Se o conteúdo foi enriquecido com IA */
    aiEnhanced: boolean;
    /** Latência total da geração em ms */
    latencyMs: number;
    /** Tokens consumidos pela IA (se aplicável) */
    tokens?: number;
    /** Modelo de IA usado (se aplicável) */
    model?: string;
  };
}
