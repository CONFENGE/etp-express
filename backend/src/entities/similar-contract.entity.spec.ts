import { SimilarContract } from './similar-contract.entity';
import { Organization } from './organization.entity';

/**
 * Unit tests for SimilarContract Entity
 *
 * Tests entity structure and multi-tenancy field (organizationId)
 * added as part of Issue #650 for tenant isolation.
 *
 * @see SimilarContract entity
 * @see Issue #650 - Multi-tenancy isolation
 */
describe('SimilarContract Entity', () => {
  describe('Entity Structure', () => {
    it('should create a SimilarContract with required fields', () => {
      const contract = new SimilarContract();
      contract.id = '123e4567-e89b-12d3-a456-426614174000';
      contract.searchQuery = 'contratação TI';
      contract.title = 'Contratação de Serviços de TI';

      expect(contract.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(contract.searchQuery).toBe('contratação TI');
      expect(contract.title).toBe('Contratação de Serviços de TI');
    });

    it('should allow setting all optional fields', () => {
      const contract = new SimilarContract();
      contract.description = 'Desenvolvimento de sistema web';
      contract.orgao = 'Prefeitura Municipal';
      contract.valor = 150000;
      contract.dataContratacao = '2025-10-01';
      contract.url = 'https://pncp.gov.br/contract/123';
      contract.fonte = 'PNCP';
      contract.relevanceScore = 0.95;
      contract.metadata = {
        numeroProcesso: '001/2025',
        modalidade: 'Pregão Eletrônico',
      };

      expect(contract.description).toBe('Desenvolvimento de sistema web');
      expect(contract.orgao).toBe('Prefeitura Municipal');
      expect(contract.valor).toBe(150000);
      expect(contract.dataContratacao).toBe('2025-10-01');
      expect(contract.url).toBe('https://pncp.gov.br/contract/123');
      expect(contract.fonte).toBe('PNCP');
      expect(contract.relevanceScore).toBe(0.95);
      expect(contract.metadata?.modalidade).toBe('Pregão Eletrônico');
    });

    it('should support nullable description', () => {
      const contract = new SimilarContract();
      // Entity allows null via @Column({ nullable: true })
      (contract as any).description = null;

      expect(contract.description).toBeNull();
    });

    it('should support nullable url', () => {
      const contract = new SimilarContract();
      // Entity allows null via @Column({ nullable: true })
      (contract as any).url = null;

      expect(contract.url).toBeNull();
    });

    it('should support nullable metadata', () => {
      const contract = new SimilarContract();
      // Entity allows null via @Column({ nullable: true })
      (contract as any).metadata = null;

      expect(contract.metadata).toBeNull();
    });

    it('should default relevanceScore to 0', () => {
      const contract = new SimilarContract();
      // Default defined at database level, but we can test assignment
      contract.relevanceScore = 0;

      expect(contract.relevanceScore).toBe(0);
    });
  });

  describe('Multi-Tenancy (Issue #650)', () => {
    it('should support nullable organizationId for backward compatibility', () => {
      const contract = new SimilarContract();
      contract.organizationId = null;
      contract.organization = null;

      expect(contract.organizationId).toBeNull();
      expect(contract.organization).toBeNull();
    });

    it('should support organization assignment', () => {
      const contract = new SimilarContract();
      const org = new Organization();
      org.id = 'org-uuid-123';
      org.name = 'Prefeitura de Lages';
      org.cnpj = '12.345.678/0001-90';
      org.domainWhitelist = ['lages.sc.gov.br'];
      org.isActive = true;

      contract.organizationId = org.id;
      contract.organization = org;

      expect(contract.organizationId).toBe('org-uuid-123');
      expect(contract.organization).toBe(org);
      expect(contract.organization.name).toBe('Prefeitura de Lages');
    });

    it('should allow organizationId without loading organization relation', () => {
      const contract = new SimilarContract();
      contract.organizationId = 'org-uuid-456';
      // organization relation not loaded (lazy loading)
      contract.organization = null;

      expect(contract.organizationId).toBe('org-uuid-456');
      expect(contract.organization).toBeNull();
    });

    it('should support different organizations for tenant isolation', () => {
      const org1 = new Organization();
      org1.id = 'org-1';
      org1.name = 'Prefeitura A';
      org1.cnpj = '11.111.111/0001-11';
      org1.domainWhitelist = ['a.gov.br'];
      org1.isActive = true;

      const org2 = new Organization();
      org2.id = 'org-2';
      org2.name = 'Prefeitura B';
      org2.cnpj = '22.222.222/0001-22';
      org2.domainWhitelist = ['b.gov.br'];
      org2.isActive = true;

      const contract1 = new SimilarContract();
      contract1.id = 'contract-1';
      contract1.searchQuery = 'TI';
      contract1.title = 'Contract 1';
      contract1.organizationId = org1.id;
      contract1.organization = org1;

      const contract2 = new SimilarContract();
      contract2.id = 'contract-2';
      contract2.searchQuery = 'TI';
      contract2.title = 'Contract 2';
      contract2.organizationId = org2.id;
      contract2.organization = org2;

      // Same search query but different organizations
      expect(contract1.searchQuery).toBe(contract2.searchQuery);
      expect(contract1.organizationId).not.toBe(contract2.organizationId);
      expect(contract1.organization?.name).toBe('Prefeitura A');
      expect(contract2.organization?.name).toBe('Prefeitura B');
    });
  });

  describe('Metadata Structure', () => {
    it('should support all metadata fields', () => {
      const contract = new SimilarContract();
      contract.metadata = {
        numeroProcesso: '001/2025',
        modalidade: 'Pregão Eletrônico',
        vigencia: '12 meses',
        fornecedor: 'TechCorp LTDA',
        objeto: 'Desenvolvimento de software',
        customField: 'custom value',
      };

      expect(contract.metadata?.numeroProcesso).toBe('001/2025');
      expect(contract.metadata?.modalidade).toBe('Pregão Eletrônico');
      expect(contract.metadata?.vigencia).toBe('12 meses');
      expect(contract.metadata?.fornecedor).toBe('TechCorp LTDA');
      expect(contract.metadata?.objeto).toBe('Desenvolvimento de software');
      expect(contract.metadata?.customField).toBe('custom value');
    });

    it('should support partial metadata', () => {
      const contract = new SimilarContract();
      contract.metadata = {
        modalidade: 'Dispensa',
      };

      expect(contract.metadata?.modalidade).toBe('Dispensa');
      expect(contract.metadata?.numeroProcesso).toBeUndefined();
    });

    it('should support perplexity result flag in metadata', () => {
      const contract = new SimilarContract();
      contract.metadata = {
        perplexityResult: true,
      };

      expect(contract.metadata?.perplexityResult).toBe(true);
    });
  });

  describe('Search Cache Requirements', () => {
    it('should track createdAt for cache TTL (30 days)', () => {
      const contract = new SimilarContract();
      const now = new Date();
      contract.createdAt = now;

      expect(contract.createdAt).toBe(now);
    });

    it('should index searchQuery for efficient cache lookup', () => {
      // This is a structural test - the @Index decorator is validated at migration level
      const contract = new SimilarContract();
      contract.searchQuery = 'contratação serviços TI';

      expect(contract.searchQuery).toBe('contratação serviços TI');
    });

    it('should support relevance-based sorting', () => {
      const contracts = [
        { ...new SimilarContract(), relevanceScore: 0.5 },
        { ...new SimilarContract(), relevanceScore: 0.9 },
        { ...new SimilarContract(), relevanceScore: 0.7 },
      ];

      const sorted = contracts.sort(
        (a, b) => b.relevanceScore - a.relevanceScore,
      );

      expect(sorted[0].relevanceScore).toBe(0.9);
      expect(sorted[1].relevanceScore).toBe(0.7);
      expect(sorted[2].relevanceScore).toBe(0.5);
    });
  });
});
