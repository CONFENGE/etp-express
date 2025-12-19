import { Test, TestingModule } from '@nestjs/testing';
import { ClarezaAgent } from './clareza.agent';

describe('ClarezaAgent', () => {
 let agent: ClarezaAgent;

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [ClarezaAgent],
 }).compile();

 agent = module.get<ClarezaAgent>(ClarezaAgent);
 });

 it('should be defined', () => {
 expect(agent).toBeDefined();
 });

 describe('analyze()', () => {
 it('should calculate metrics correctly for simple text', async () => {
 const content = 'Texto simples. Outra frase curta.';

 const result = await agent.analyze(content);

 expect(result).toBeDefined();
 expect(result.score).toBeGreaterThanOrEqual(0);
 expect(result.score).toBeLessThanOrEqual(100);
 expect(result.readabilityIndex).toBeDefined();
 expect(result.metrics.avgSentenceLength).toBeGreaterThan(0);
 expect(result.metrics.avgWordLength).toBeGreaterThan(0);
 expect(result.issues).toBeInstanceOf(Array);
 expect(result.suggestions).toBeInstanceOf(Array);
 });

 it('should detect long sentences exceeding 25 words', async () => {
 // Frase com exatamente 30 palavras
 const longSentence =
 'Esta é uma frase extremamente longa que contém mais de vinte e cinco palavras para testar se o sistema consegue detectar corretamente frases longas demais e sugerir melhorias';

 const result = await agent.analyze(longSentence);

 expect(result.issues).toContain(
 'Frases muito longas detectadas (média > 25 palavras)',
 );
 expect(result.suggestions).toContain(
 'Divida frases longas em frases mais curtas para melhor compreensão',
 );
 });

 it('should detect excessive jargon usage', async () => {
 // Texto com 50% de jargão (threshold é 10%)
 const jargonText =
 'objeto contratação licitação requisitos especificações modalidade pregão dispensa inexigibilidade licitação';

 const result = await agent.analyze(jargonText);

 expect(result.issues).toContain('Uso excessivo de jargão técnico');
 expect(result.suggestions).toContain(
 'Considere explicar termos técnicos ou usar linguagem mais acessível',
 );
 });

 it('should detect excessive passive voice usage', async () => {
 // Texto com voz passiva em 100% das frases (threshold é 30%)
 const passiveText =
 'Foi realizado o teste. Foram analisados os dados. Será implementado o sistema.';

 const result = await agent.analyze(passiveText);

 expect(result.issues).toContain('Uso excessivo de voz passiva');
 expect(result.suggestions).toContain(
 'Prefira voz ativa para tornar o texto mais direto e claro',
 );
 });

 it('should detect complex words exceeding 20% threshold', async () => {
 // Texto com muitas palavras complexas (> 8 caracteres)
 const complexText =
 'Implementação extraordinária complexidade fundamentação especificação particularidades metodologia';

 const result = await agent.analyze(complexText);

 expect(result.issues).toContain('Muitas palavras complexas (> 20%)');
 expect(result.suggestions).toContain(
 'Simplifique vocabulário quando possível sem perder precisão',
 );
 });

 it('should detect lack of proper paragraphing', async () => {
 // Texto sem parágrafos (sem \n\n ou múltiplas linhas)
 const noParagraphText = 'Texto corrido sem parágrafo algum aqui';

 const result = await agent.analyze(noParagraphText);

 expect(result.issues).toContain('Texto sem paragrafação adequada');
 expect(result.suggestions).toContain(
 'Organize o conteúdo em parágrafos para melhor leitura',
 );
 });
 });

 describe('calculateReadability()', () => {
 it('should return valid readability index (0-100) for good text', async () => {
 // Testar com texto otimizado (frases curtas, palavras simples)
 const goodText = 'Texto claro. Frases curtas. Fácil ler.';

 const result = await agent.analyze(goodText);

 expect(result.readabilityIndex).toBeGreaterThanOrEqual(0);
 expect(result.readabilityIndex).toBeLessThanOrEqual(100);
 });

 it('should penalize complex text with lower readability score', async () => {
 const simpleText = 'Texto simples. Fácil entender.';
 const complexText =
 'Tendo em vista que a complexidade inerente aos processos administrativos governamentais requer atenção pormenorizada às especificações técnicas.';

 const simpleResult = await agent.analyze(simpleText);
 const complexResult = await agent.analyze(complexText);

 expect(simpleResult.readabilityIndex).toBeGreaterThan(
 complexResult.readabilityIndex,
 );
 });
 });

 describe('getSystemPrompt()', () => {
 it('should return clareza system prompt', () => {
 const prompt = agent.getSystemPrompt();

 expect(prompt).toBeDefined();
 expect(prompt).toContain('clareza');
 expect(prompt).toContain('VOZ ATIVA');
 expect(prompt).toContain('FRASES CURTAS');
 });
 });
});
