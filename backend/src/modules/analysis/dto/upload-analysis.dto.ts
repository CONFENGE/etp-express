import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for document upload and analysis.
 */
export class UploadAnalysisResponseDto {
 @ApiProperty({
 description: 'Unique identifier for this analysis (UUID)',
 example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 })
 analysisId: string;

 @ApiProperty({
 description: 'Original filename of the uploaded document',
 example: 'ETP_Contratacao_TI.pdf',
 })
 originalFilename: string;

 @ApiProperty({
 description: 'MIME type of the uploaded file',
 example: 'application/pdf',
 })
 mimeType: string;

 @ApiProperty({
 description: 'Overall quality score (0-100)',
 example: 78,
 })
 overallScore: number;

 @ApiProperty({
 description: 'Whether the document meets minimum quality threshold (>= 70)',
 example: true,
 })
 meetsMinimumQuality: boolean;

 @ApiProperty({
 description: 'Final verdict based on analysis',
 enum: ['Aprovado', 'Aprovado com ressalvas', 'Reprovado'],
 example: 'Aprovado com ressalvas',
 })
 verdict: 'Aprovado' | 'Aprovado com ressalvas' | 'Reprovado';

 @ApiProperty({
 description: 'Document metadata',
 example: { wordCount: 1500, sectionCount: 8 },
 })
 documentInfo: {
 wordCount: number;
 sectionCount: number;
 };

 @ApiProperty({
 description: 'Summary of issues by severity',
 example: { critical: 1, important: 3, suggestion: 5 },
 })
 issueSummary: {
 critical: number;
 important: number;
 suggestion: number;
 };

 @ApiProperty({
 description: 'Dimension scores breakdown',
 example: [
 { dimension: 'legal', score: 75, passed: true },
 { dimension: 'clareza', score: 82, passed: true },
 { dimension: 'fundamentacao', score: 70, passed: true },
 ],
 })
 dimensions: Array<{
 dimension: string;
 score: number;
 passed: boolean;
 }>;

 @ApiProperty({
 description: 'Success message',
 example:
 'Documento analisado com sucesso. Use o analysisId para obter o relatório completo.',
 })
 message: string;
}
