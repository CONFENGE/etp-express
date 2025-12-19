import {
 ComprasGovModalidade,
 ComprasGovSituacao,
 ComprasGovLicitacaoRaw,
 transformLicitacaoToContract,
 buildCacheKey,
} from './compras-gov.types';

describe('ComprasGov Types', () => {
 describe('ComprasGovModalidade enum', () => {
 it('should have correct values for all modalidades', () => {
 expect(ComprasGovModalidade.CONCORRENCIA).toBe(1);
 expect(ComprasGovModalidade.TOMADA_PRECOS).toBe(2);
 expect(ComprasGovModalidade.CONVITE).toBe(3);
 expect(ComprasGovModalidade.CONCURSO).toBe(4);
 expect(ComprasGovModalidade.LEILAO).toBe(5);
 expect(ComprasGovModalidade.DISPENSA).toBe(6);
 expect(ComprasGovModalidade.INEXIGIBILIDADE).toBe(7);
 expect(ComprasGovModalidade.PREGAO).toBe(8);
 expect(ComprasGovModalidade.RDC).toBe(9);
 });
 });

 describe('ComprasGovSituacao enum', () => {
 it('should have correct values for all situacoes', () => {
 expect(ComprasGovSituacao.PUBLICADO).toBe('Publicado');
 expect(ComprasGovSituacao.ABERTO).toBe('Aberto');
 expect(ComprasGovSituacao.ENCERRADO).toBe('Encerrado');
 expect(ComprasGovSituacao.HOMOLOGADO).toBe('Homologado');
 expect(ComprasGovSituacao.CANCELADO).toBe('Cancelado');
 expect(ComprasGovSituacao.ANULADO).toBe('Anulado');
 expect(ComprasGovSituacao.REVOGADO).toBe('Revogado');
 expect(ComprasGovSituacao.DESERTO).toBe('Deserto');
 expect(ComprasGovSituacao.FRACASSADO).toBe('Fracassado');
 });
 });

 describe('transformLicitacaoToContract()', () => {
 const mockLicitacao: ComprasGovLicitacaoRaw = {
 identificador: 'PREGAO-12345-2024',
 numero_aviso: 12345,
 objeto: 'Aquisicao de licencas de software para gestao publica',
 modalidade: ComprasGovModalidade.PREGAO,
 modalidade_descricao: 'Pregao',
 data_publicacao: '2024-06-15T00:00:00Z',
 data_abertura_proposta: '2024-06-30T10:00:00Z',
 uasg: 170001,
 uasg_nome: 'MINISTERIO DA FAZENDA',
 uf_uasg: 'DF',
 situacao_aviso: 'Publicado',
 valor_estimado_total: 500000,
 pregao_eletronico: true,
 link_licitacao: 'https://compras.gov.br/licitacao/12345',
 };

 it('should transform basic fields correctly', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.id).toBe('PREGAO-12345-2024');
 expect(result.description).toBe(
 'Aquisicao de licencas de software para gestao publica',
 );
 expect(result.source).toBe('comprasgov');
 expect(result.relevance).toBe(1.0);
 });

 it('should generate title with modalidade and numero_aviso', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.title).toContain('Licitacao');
 expect(result.title).toContain('12345');
 expect(result.title).toContain('Pregao');
 });

 it('should use link_licitacao as URL if provided', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.url).toBe('https://compras.gov.br/licitacao/12345');
 });

 it('should generate URL if link_licitacao is not provided', () => {
 const licitacaoWithoutLink = {
 ...mockLicitacao,
 link_licitacao: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutLink);

 expect(result.url).toContain('compras.dados.gov.br');
 expect(result.url).toContain('PREGAO-12345-2024');
 });

 it('should transform GovApiContract fields', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.numero).toBe('12345');
 expect(result.ano).toBe(2024);
 expect(result.objeto).toBe(
 'Aquisicao de licencas de software para gestao publica',
 );
 expect(result.valorTotal).toBe(500000);
 expect(result.modalidade).toBe('Pregao');
 expect(result.status).toBe('Publicado');
 });

 it('should transform orgaoContratante from UASG info', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.orgaoContratante).toEqual({
 cnpj: '',
 nome: 'MINISTERIO DA FAZENDA',
 uf: 'DF',
 });
 });

 it('should use UASG code as nome if uasg_nome is not provided', () => {
 const licitacaoWithoutUasgNome = {
 ...mockLicitacao,
 uasg_nome: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutUasgNome);

 expect(result.orgaoContratante.nome).toBe('UASG 170001');
 });

 it('should transform dates correctly', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.dataPublicacao).toEqual(new Date('2024-06-15T00:00:00Z'));
 expect(result.dataAbertura).toEqual(new Date('2024-06-30T10:00:00Z'));
 });

 it('should handle missing optional date', () => {
 const licitacaoWithoutAbertura = {
 ...mockLicitacao,
 data_abertura_proposta: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutAbertura);

 expect(result.dataAbertura).toBeUndefined();
 });

 it('should transform ComprasGov-specific fields', () => {
 const result = transformLicitacaoToContract(mockLicitacao);

 expect(result.uasg).toBe(170001);
 expect(result.numeroAviso).toBe(12345);
 expect(result.pregaoEletronico).toBe(true);
 expect(result.valorEstimado).toBe(500000);
 });

 it('should handle missing pregao_eletronico', () => {
 const licitacaoWithoutPregao = {
 ...mockLicitacao,
 pregao_eletronico: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutPregao);

 expect(result.pregaoEletronico).toBe(false);
 });

 it('should handle missing valor_estimado_total', () => {
 const licitacaoWithoutValor = {
 ...mockLicitacao,
 valor_estimado_total: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutValor);

 expect(result.valorTotal).toBe(0);
 expect(result.valorEstimado).toBeUndefined();
 });

 it('should use modalidade code to generate description if modalidade_descricao is missing', () => {
 const licitacaoWithoutDescricao = {
 ...mockLicitacao,
 modalidade_descricao: undefined,
 modalidade: ComprasGovModalidade.CONCORRENCIA,
 };
 const result = transformLicitacaoToContract(licitacaoWithoutDescricao);

 expect(result.title).toContain('Concorrencia');
 expect(result.modalidade).toBe('Concorrencia');
 });

 it('should handle all modalidade codes', () => {
 const modalidades = [
 { code: 1, expected: 'Concorrencia' },
 { code: 2, expected: 'Tomada de Precos' },
 { code: 3, expected: 'Convite' },
 { code: 4, expected: 'Concurso' },
 { code: 5, expected: 'Leilao' },
 { code: 6, expected: 'Dispensa de Licitacao' },
 { code: 7, expected: 'Inexigibilidade' },
 { code: 8, expected: 'Pregao' },
 { code: 9, expected: 'RDC' },
 ];

 modalidades.forEach(({ code, expected }) => {
 const licitacao = {
 ...mockLicitacao,
 modalidade: code,
 modalidade_descricao: undefined,
 };
 const result = transformLicitacaoToContract(licitacao);
 expect(result.modalidade).toBe(expected);
 });
 });

 it('should handle unknown modalidade code', () => {
 const licitacaoWithUnknown = {
 ...mockLicitacao,
 modalidade: 99,
 modalidade_descricao: undefined,
 };
 const result = transformLicitacaoToContract(licitacaoWithUnknown);

 expect(result.modalidade).toBe('Modalidade 99');
 });

 it('should set fetchedAt to current date', () => {
 const before = new Date();
 const result = transformLicitacaoToContract(mockLicitacao);
 const after = new Date();

 expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(
 before.getTime(),
 );
 expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
 });

 it('should handle empty uf_uasg', () => {
 const licitacaoWithoutUf = { ...mockLicitacao, uf_uasg: undefined };
 const result = transformLicitacaoToContract(licitacaoWithoutUf);

 expect(result.orgaoContratante.uf).toBe('');
 });
 });

 describe('buildCacheKey()', () => {
 it('should build cache key from endpoint and filters', () => {
 const key = buildCacheKey('licitacoes', {
 objeto: 'software',
 uf_uasg: 'DF',
 });

 expect(key).toContain('licitacoes');
 });

 it('should produce same key for same filters regardless of order', () => {
 const key1 = buildCacheKey('licitacoes', {
 objeto: 'software',
 uf_uasg: 'DF',
 modalidade: ComprasGovModalidade.PREGAO,
 });

 const key2 = buildCacheKey('licitacoes', {
 modalidade: ComprasGovModalidade.PREGAO,
 objeto: 'software',
 uf_uasg: 'DF',
 });

 expect(key1).toBe(key2);
 });

 it('should exclude undefined values from key', () => {
 const key1 = buildCacheKey('licitacoes', {
 objeto: 'software',
 uf_uasg: undefined,
 });

 const key2 = buildCacheKey('licitacoes', {
 objeto: 'software',
 });

 expect(key1).toBe(key2);
 });

 it('should exclude null values from key', () => {
 const key1 = buildCacheKey('licitacoes', {
 objeto: 'software',
 uf_uasg: null as unknown as string,
 });

 const key2 = buildCacheKey('licitacoes', {
 objeto: 'software',
 });

 expect(key1).toBe(key2);
 });

 it('should produce different keys for different endpoints', () => {
 const key1 = buildCacheKey('licitacoes', { objeto: 'software' });
 const key2 = buildCacheKey('contratos', { objeto: 'software' });

 expect(key1).not.toBe(key2);
 });

 it('should produce different keys for different filters', () => {
 const key1 = buildCacheKey('licitacoes', { objeto: 'software' });
 const key2 = buildCacheKey('licitacoes', { objeto: 'hardware' });

 expect(key1).not.toBe(key2);
 });

 it('should handle empty filters', () => {
 const key = buildCacheKey('licitacoes', {});

 expect(key).toContain('licitacoes');
 expect(key).toBe('licitacoes:');
 });

 it('should handle numeric filter values', () => {
 const key = buildCacheKey('licitacoes', {
 modalidade: ComprasGovModalidade.PREGAO,
 offset: 100,
 });

 expect(key).toContain('modalidade=8');
 expect(key).toContain('offset=100');
 });

 it('should handle boolean filter values', () => {
 const key = buildCacheKey('licitacoes', {
 pregao_eletronico: true,
 });

 expect(key).toContain('pregao_eletronico=true');
 });
 });
});
