import { Test, TestingModule } from '@nestjs/testing';
import { LegalAgent, LegalValidationResult } from './legal.agent';

describe('LegalAgent', () => {
 let agent: LegalAgent;

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [LegalAgent],
 }).compile();

 agent = module.get<LegalAgent>(LegalAgent);
 });

 it('should be defined', () => {
 expect(agent).toBeDefined();
 });

 describe('validate()', () => {
 it('should detect reference to Lei 14.133/2021', async () => {
 // Arrange
 const contentWithLegalReference = `
 Este ETP está fundamentado na Lei 14.133/2021, artigo 18.
 A justificativa da contratação é garantir a modernização dos sistemas.
 O objeto da contratação é o desenvolvimento de software.
 A necessidade surge da obsolescência dos sistemas atuais.
 O valor estimado é de R$ 100.000,00.
 `;

 // Act
 const result: LegalValidationResult = await agent.validate(
 contentWithLegalReference,
 );

 // Assert
 expect(result).toBeDefined();
 expect(result.score).toBeGreaterThan(0);
 expect(result.issues).not.toContain(
 'Falta referência explícita à Lei 14.133/2021',
 );
 expect(result.references).toContain(
 'Lei 14.133/2021 - Nova Lei de Licitações',
 );
 });

 it('should return score > 70 for text with adequate legal foundation', async () => {
 // Arrange
 const completeContent = `
 Conforme previsto na Lei 14.133/2021, especialmente no artigo 18,
 apresenta-se a justificativa para esta contratação.

 O objeto da contratação consiste no desenvolvimento de sistema integrado.
 A necessidade surge da modernização tecnológica requerida pelo órgão.
 O valor estimado, baseado em pesquisa de mercado, é de R$ 150.000,00.

 A contratação visa atender aos requisitos técnicos estabelecidos pela
 IN SEGES/ME nº 40/2020, garantindo conformidade legal.
 `;

 // Act
 const result: LegalValidationResult =
 await agent.validate(completeContent);

 // Assert
 expect(result.score).toBeGreaterThan(70);
 expect(result.isCompliant).toBe(true);
 expect(result.issues).toHaveLength(0);
 expect(result.recommendations).toHaveLength(0);
 });

 it('should return score < 50 for text without legal foundation', async () => {
 // Arrange
 const incompleteContent = `
 Precisamos de um sistema novo.
 O sistema atual está desatualizado.
 `;

 // Act
 const result: LegalValidationResult =
 await agent.validate(incompleteContent);

 // Assert
 expect(result.score).toBeLessThanOrEqual(50);
 expect(result.isCompliant).toBe(false);
 expect(result.issues.length).toBeGreaterThanOrEqual(5);
 expect(result.issues).toContain(
 'Falta referência explícita à Lei 14.133/2021',
 );
 expect(result.issues).toContain(
 'Seção de justificativa pode estar ausente ou incompleta',
 );
 expect(result.issues).toContain(
 'Elemento possivelmente ausente: Descrição do objeto da contratação',
 );
 });

 it('should handle empty text', async () => {
 // Arrange
 const emptyContent = '';

 // Act
 const result: LegalValidationResult = await agent.validate(emptyContent);

 // Assert
 expect(result).toBeDefined();
 expect(result.score).toBeLessThanOrEqual(50);
 expect(result.isCompliant).toBe(false);
 expect(result.issues.length).toBeGreaterThanOrEqual(5);
 expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
 });

 it('should handle very long text', async () => {
 // Arrange
 const veryLongContent = `
 Lei 14.133/2021 estabelece as diretrizes para licitações.
 ${'A justificativa da contratação é fundamental. '.repeat(1000)}
 O objeto da contratação precisa ser bem definido.
 A necessidade da contratação deve ser demonstrada.
 O valor estimado deve seguir pesquisa de mercado.
 `;

 // Act
 const result: LegalValidationResult =
 await agent.validate(veryLongContent);

 // Assert
 expect(result).toBeDefined();
 expect(result.score).toBeGreaterThanOrEqual(0);
 expect(result.score).toBeLessThanOrEqual(100);
 expect(typeof result.isCompliant).toBe('boolean');
 });

 it('should add technical requirements recommendation for requisitos context', async () => {
 // Arrange
 const contentWithRequirements = `
 Lei 14.133/2021 orienta este documento.
 Justificativa: necessidade de modernização.
 O objeto é a aquisição de software.
 Requisitos funcionais devem ser especificados.
 Valor estimado: R$ 50.000,00.
 `;
 const context = { type: 'requisitos' };

 // Act
 const result: LegalValidationResult = await agent.validate(
 contentWithRequirements,
 context,
 );

 // Assert
 expect(result.recommendations).toContain(
 'Especifique requisitos técnicos conforme IN SEGES/ME nº 40/2020',
 );
 expect(result.references).toContain('IN SEGES/ME nº 40/2020 - ETP');
 });
 });

 describe('enrichWithLegalContext()', () => {
 it('should return enriched prompt with legal context', async () => {
 // Arrange
 const userPrompt = 'Gere a justificativa para contratação de software';
 const sectionType = 'justificativa';

 // Act
 const enrichedPrompt: string = await agent.enrichWithLegalContext(
 userPrompt,
 sectionType,
 );

 // Assert
 expect(enrichedPrompt).toContain(userPrompt);
 expect(enrichedPrompt).toContain('[CONTEXTO LEGAL]');
 expect(enrichedPrompt).toContain('Art. 18 da Lei 14.133/2021');
 expect(enrichedPrompt).toContain('A necessidade da contratação');
 expect(enrichedPrompt).toContain('O interesse público');
 });

 it('should return enriched prompt for requisitos section', async () => {
 // Arrange
 const userPrompt = 'Defina os requisitos técnicos';
 const sectionType = 'requisitos';

 // Act
 const enrichedPrompt: string = await agent.enrichWithLegalContext(
 userPrompt,
 sectionType,
 );

 // Assert
 expect(enrichedPrompt).toContain(userPrompt);
 expect(enrichedPrompt).toContain('IN SEGES/ME nº 40/2020');
 expect(enrichedPrompt).toContain('objetivos e mensuráveis');
 });

 it('should return enriched prompt for estimativa_valor section', async () => {
 // Arrange
 const userPrompt = 'Calcule a estimativa de valor';
 const sectionType = 'estimativa_valor';

 // Act
 const enrichedPrompt: string = await agent.enrichWithLegalContext(
 userPrompt,
 sectionType,
 );

 // Assert
 expect(enrichedPrompt).toContain(userPrompt);
 expect(enrichedPrompt).toContain('Art. 23 da Lei 14.133/2021');
 expect(enrichedPrompt).toContain('pesquisa de mercado');
 });

 it('should return default legal context for unknown section', async () => {
 // Arrange
 const userPrompt = 'Gere conteúdo genérico';
 const sectionType = 'secao_desconhecida';

 // Act
 const enrichedPrompt: string = await agent.enrichWithLegalContext(
 userPrompt,
 sectionType,
 );

 // Assert
 expect(enrichedPrompt).toContain(userPrompt);
 expect(enrichedPrompt).toContain('Base legal: Lei 14.133/2021');
 });
 });

 describe('getSystemPrompt()', () => {
 it('should return system prompt with legal guidelines', () => {
 // Act
 const systemPrompt: string = agent.getSystemPrompt();

 // Assert
 expect(systemPrompt).toContain('conformidade legal');
 expect(systemPrompt).toContain('Lei 14.133/2021');
 expect(systemPrompt).toContain('IN SEGES/ME nº 40/2020');
 expect(systemPrompt).toContain('IN SEGES/ME nº 65/2021');
 expect(systemPrompt).toContain('validação jurídica');
 expect(systemPrompt).toContain(
 '⚠ Este conteúdo requer validação jurídica antes do uso oficial.',
 );
 });
 });
});
