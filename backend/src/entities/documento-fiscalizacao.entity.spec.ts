import { DocumentoFiscalizacao, DocumentoFiscalizacaoTipo } from './documento-fiscalizacao.entity';

/**
 * Unit tests for DocumentoFiscalizacao entity helper methods
 *
 * Tests verify backward compatibility with polymorphic API while using
 * explicit FK columns internally.
 *
 * Issue: #1723 - TD-008: Database schema improvements & LGPD compliance
 */
describe('DocumentoFiscalizacao Entity', () => {
  let documento: DocumentoFiscalizacao;

  beforeEach(() => {
    documento = new DocumentoFiscalizacao();
    documento.id = 'test-doc-001';
    documento.organizationId = 'org-001';
    documento.nomeArquivo = 'test-document.pdf';
    documento.caminhoArquivo = 'contracts/123/fiscalizacao/test.pdf';
    documento.tamanho = 1024 * 100; // 100KB
    documento.mimeType = 'application/pdf';
    documento.uploadedById = 'user-001';
  });

  describe('tipoEntidade getter', () => {
    it('should return MEDICAO when medicaoId is set', () => {
      documento.medicaoId = 'medicao-001';
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      expect(documento.tipoEntidade).toBe(DocumentoFiscalizacaoTipo.MEDICAO);
    });

    it('should return OCORRENCIA when ocorrenciaId is set', () => {
      documento.medicaoId = null;
      documento.ocorrenciaId = 'ocorrencia-001';
      documento.atesteId = null;

      expect(documento.tipoEntidade).toBe(
        DocumentoFiscalizacaoTipo.OCORRENCIA,
      );
    });

    it('should return ATESTE when atesteId is set', () => {
      documento.medicaoId = null;
      documento.ocorrenciaId = null;
      documento.atesteId = 'ateste-001';

      expect(documento.tipoEntidade).toBe(DocumentoFiscalizacaoTipo.ATESTE);
    });

    it('should throw error if no FK is set', () => {
      documento.medicaoId = null;
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      expect(() => {
        documento.tipoEntidade;
      }).toThrow('DocumentoFiscalizacao must have exactly one FK set');
    });

    it('should throw error if multiple FKs are set', () => {
      documento.medicaoId = 'medicao-001';
      documento.ocorrenciaId = 'ocorrencia-001';
      documento.atesteId = null;

      // This should ideally be prevented by CHECK constraint in DB
      // but at entity level, tipoEntidade should handle it gracefully
      expect(() => {
        documento.tipoEntidade;
      }).toThrow('DocumentoFiscalizacao must have exactly one FK set');
    });
  });

  describe('entidadeId getter', () => {
    it('should return medicaoId when set', () => {
      const medicaoId = 'medicao-001';
      documento.medicaoId = medicaoId;
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      expect(documento.entidadeId).toBe(medicaoId);
    });

    it('should return ocorrenciaId when set', () => {
      const ocorrenciaId = 'ocorrencia-001';
      documento.medicaoId = null;
      documento.ocorrenciaId = ocorrenciaId;
      documento.atesteId = null;

      expect(documento.entidadeId).toBe(ocorrenciaId);
    });

    it('should return atesteId when set', () => {
      const atesteId = 'ateste-001';
      documento.medicaoId = null;
      documento.ocorrenciaId = null;
      documento.atesteId = atesteId;

      expect(documento.entidadeId).toBe(atesteId);
    });

    it('should return empty string if no FK is set', () => {
      documento.medicaoId = null;
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      expect(documento.entidadeId).toBe('');
    });
  });

  describe('setEntidade() method', () => {
    it('should set medicaoId when type is MEDICAO', () => {
      const medicaoId = 'medicao-123';
      documento.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, medicaoId);

      expect(documento.medicaoId).toBe(medicaoId);
      expect(documento.ocorrenciaId).toBeNull();
      expect(documento.atesteId).toBeNull();
    });

    it('should set ocorrenciaId when type is OCORRENCIA', () => {
      const ocorrenciaId = 'ocorrencia-456';
      documento.setEntidade(DocumentoFiscalizacaoTipo.OCORRENCIA, ocorrenciaId);

      expect(documento.medicaoId).toBeNull();
      expect(documento.ocorrenciaId).toBe(ocorrenciaId);
      expect(documento.atesteId).toBeNull();
    });

    it('should set atesteId when type is ATESTE', () => {
      const atesteId = 'ateste-789';
      documento.setEntidade(DocumentoFiscalizacaoTipo.ATESTE, atesteId);

      expect(documento.medicaoId).toBeNull();
      expect(documento.ocorrenciaId).toBeNull();
      expect(documento.atesteId).toBe(atesteId);
    });

    it('should clear previous FK when setting new one', () => {
      // Set initial FK
      documento.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, 'medicao-001');
      expect(documento.medicaoId).toBe('medicao-001');

      // Switch to different entity type
      documento.setEntidade(DocumentoFiscalizacaoTipo.OCORRENCIA, 'ocorrencia-001');

      expect(documento.medicaoId).toBeNull();
      expect(documento.ocorrenciaId).toBe('ocorrencia-001');
      expect(documento.atesteId).toBeNull();
    });

    it('should maintain valid state after setEntidade', () => {
      documento.setEntidade(DocumentoFiscalizacaoTipo.ATESTE, 'ateste-001');

      // After setEntidade, getter should work correctly
      expect(documento.tipoEntidade).toBe(DocumentoFiscalizacaoTipo.ATESTE);
      expect(documento.entidadeId).toBe('ateste-001');
    });
  });

  describe('backward compatibility', () => {
    it('should support old polymorphic API pattern', () => {
      // Old code pattern: create with polymorphic values
      const tipo = DocumentoFiscalizacaoTipo.MEDICAO;
      const entidadeId = 'medicao-001';

      documento.setEntidade(tipo, entidadeId);

      // Should be able to read back
      expect(documento.tipoEntidade).toBe(tipo);
      expect(documento.entidadeId).toBe(entidadeId);
    });

    it('should support mixed FK/polymorphic access', () => {
      // Set via explicit FK
      documento.medicaoId = 'medicao-001';
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      // Read via polymorphic getter
      expect(documento.tipoEntidade).toBe(DocumentoFiscalizacaoTipo.MEDICAO);
      expect(documento.entidadeId).toBe('medicao-001');
    });

    it('should roundtrip through setEntidade and tipoEntidade', () => {
      const originalTipo = DocumentoFiscalizacaoTipo.OCORRENCIA;
      const originalId = 'ocorrencia-999';

      documento.setEntidade(originalTipo, originalId);

      expect(documento.tipoEntidade).toBe(originalTipo);
      expect(documento.entidadeId).toBe(originalId);
    });
  });

  describe('data validation', () => {
    it('should have all required fields', () => {
      expect(documento.id).toBeDefined();
      expect(documento.organizationId).toBeDefined();
      expect(documento.nomeArquivo).toBeDefined();
      expect(documento.caminhoArquivo).toBeDefined();
      expect(documento.tamanho).toBeDefined();
      expect(documento.mimeType).toBeDefined();
      expect(documento.uploadedById).toBeDefined();
    });

    it('should support all valid entity types', () => {
      const tipos = [
        DocumentoFiscalizacaoTipo.MEDICAO,
        DocumentoFiscalizacaoTipo.OCORRENCIA,
        DocumentoFiscalizacaoTipo.ATESTE,
      ];

      tipos.forEach((tipo, index) => {
        documento.setEntidade(tipo, `entity-${index}`);
        expect(documento.tipoEntidade).toBe(tipo);
      });
    });

    it('should have nullable relationship fields for lazy loading', () => {
      // Relationships should be optional (lazy loaded)
      expect(documento.medicao).toBeUndefined();
      expect(documento.ocorrencia).toBeUndefined();
      expect(documento.ateste).toBeUndefined();
      expect(documento.organization).toBeUndefined();
      expect(documento.uploadedBy).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string entidadeId', () => {
      documento.medicaoId = null;
      documento.ocorrenciaId = null;
      documento.atesteId = null;

      expect(documento.entidadeId).toBe('');
    });

    it('should handle null FK columns initially', () => {
      const newDoc = new DocumentoFiscalizacao();
      expect(newDoc.medicaoId).toBeUndefined();
      expect(newDoc.ocorrenciaId).toBeUndefined();
      expect(newDoc.atesteId).toBeUndefined();
    });

    it('should not mutate unrelated properties when setting FK', () => {
      const originalTamanho = documento.tamanho;
      const originalMimeType = documento.mimeType;

      documento.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, 'medicao-001');

      expect(documento.tamanho).toBe(originalTamanho);
      expect(documento.mimeType).toBe(originalMimeType);
    });
  });

  describe('LGPD compliance', () => {
    it('should support multi-tenancy via organizationId', () => {
      const org1 = 'org-001';
      const org2 = 'org-002';

      const doc1 = new DocumentoFiscalizacao();
      doc1.organizationId = org1;
      doc1.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, 'medicao-001');

      const doc2 = new DocumentoFiscalizacao();
      doc2.organizationId = org2;
      doc2.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, 'medicao-001');

      // Both documents can have same medicaoId but different organizations
      expect(doc1.organizationId).not.toBe(doc2.organizationId);
      expect(doc1.medicaoId).toBe(doc2.medicaoId);
    });

    it('should maintain audit trail via createdAt', () => {
      expect(documento.createdAt).toBeDefined();
      // createdAt is set by @CreateDateColumn()
    });

    it('should support user attribution via uploadedById', () => {
      expect(documento.uploadedById).toBe('user-001');
      expect(documento.uploadedBy).toBeDefined(); // Relationship
    });
  });
});
