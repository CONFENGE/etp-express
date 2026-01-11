import { Etp, EtpStatus } from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../../entities/etp-section.entity';
import {
  buildSystemPrompt,
  extractLegislationReferences,
  SystemPromptOptions,
} from '../prompts/system-prompt.template';

describe('system-prompt.template', () => {
  const mockOrganization = {
    id: 'org-1',
    name: 'Test Organization',
  };

  const mockEtp: Partial<Etp> = {
    id: 'etp-1',
    title: 'ETP de Contratacao de Servicos de TI',
    objeto: 'Contratacao de servicos de suporte tecnico',
    organizationId: 'org-1',
    organization: mockOrganization as any,
    orgaoEntidade: 'Secretaria de Tecnologia',
    status: EtpStatus.DRAFT,
    templateType: EtpTemplateType.TI,
    completionPercentage: 45,
  };

  const mockSections: Partial<EtpSection>[] = [
    {
      id: 'section-1',
      title: 'Justificativa',
      type: SectionType.JUSTIFICATIVA,
      content:
        'A contratacao se faz necessaria para manter os sistemas em operacao.',
      status: SectionStatus.GENERATED,
      order: 1,
    },
    {
      id: 'section-2',
      title: 'Requisitos',
      type: SectionType.REQUISITOS,
      content: 'Experiencia minima de 2 anos em suporte tecnico.',
      status: SectionStatus.PENDING,
      order: 2,
    },
  ];

  describe('buildSystemPrompt', () => {
    it('should build a valid system prompt with ETP context', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include ETP metadata in the prompt', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain(mockEtp.title);
      expect(prompt).toContain(mockEtp.objeto);
      expect(prompt).toContain('Tecnologia da Informacao');
      expect(prompt).toContain('Test Organization');
      expect(prompt).toContain('45%');
    });

    it('should include section content in the prompt', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Justificativa');
      expect(prompt).toContain('contratacao se faz necessaria');
      expect(prompt).toContain('Requisitos');
    });

    it('should include context field guidance when provided', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
        contextField: 'Justificativa',
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Foco Atual');
      expect(prompt).toContain('Justificativa');
      expect(prompt).toContain('Art. 18');
    });

    it('should include guidance for estimativa field', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
        contextField: 'estimativaValor',
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Foco Atual');
      expect(prompt).toContain('SINAPI');
    });

    it('should include anti-hallucination instructions by default', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('NAO INVENTE');
      expect(prompt).toContain('NAO CITE');
      expect(prompt).toContain('verificadas antes do uso oficial');
    });

    it('should exclude anti-hallucination when disabled', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
        includeAntiHallucination: false,
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).not.toContain('NAO INVENTE');
    });

    it('should handle empty sections array', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: [],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Nenhuma secao preenchida ainda');
    });

    it('should handle ETP without template type', () => {
      const etpWithoutTemplate = { ...mockEtp };
      delete (etpWithoutTemplate as any).templateType;
      const options: SystemPromptOptions = {
        etp: etpWithoutTemplate as Etp,
        sections: [],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Geral');
    });

    it('should handle ETP with minimal data', () => {
      const minimalEtp: Partial<Etp> = {
        id: 'etp-2',
        organizationId: 'org-1',
      };
      const options: SystemPromptOptions = {
        etp: minimalEtp as Etp,
        sections: [],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toBeDefined();
      expect(prompt).toContain('Nao informado');
    });

    it('should truncate long section content', () => {
      const longContent = 'A'.repeat(1000);
      const sectionsWithLongContent: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          title: 'Long Section',
          content: longContent,
          status: SectionStatus.GENERATED,
          order: 1,
        },
      ];

      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: sectionsWithLongContent as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      // Should be truncated with ...
      expect(prompt).toContain('...');
      expect(prompt.indexOf('A'.repeat(500))).toBeGreaterThan(-1);
    });

    it('should include legal references', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Lei 14.133/2021');
      expect(prompt).toContain('IN SEGES/ME');
      expect(prompt).toContain('Decreto 10.024/2019');
    });

    it('should include behavioral instructions', () => {
      const options: SystemPromptOptions = {
        etp: mockEtp as Etp,
        sections: mockSections as EtpSection[],
      };

      const prompt = buildSystemPrompt(options);

      expect(prompt).toContain('Responda APENAS sobre ETPs');
      expect(prompt).toContain('maximo 500 palavras');
      expect(prompt).toContain('nao sei');
    });

    it('should handle different template types', () => {
      const obrasEtp = { ...mockEtp, templateType: EtpTemplateType.OBRAS };
      const servicosEtp = {
        ...mockEtp,
        templateType: EtpTemplateType.SERVICOS,
      };
      const materiaisEtp = {
        ...mockEtp,
        templateType: EtpTemplateType.MATERIAIS,
      };

      const obrasPrompt = buildSystemPrompt({
        etp: obrasEtp as Etp,
        sections: [],
      });
      const servicosPrompt = buildSystemPrompt({
        etp: servicosEtp as Etp,
        sections: [],
      });
      const materiaisPrompt = buildSystemPrompt({
        etp: materiaisEtp as Etp,
        sections: [],
      });

      expect(obrasPrompt).toContain('Obras e Engenharia');
      expect(servicosPrompt).toContain('Servicos Continuados');
      expect(materiaisPrompt).toContain('Aquisicao de Materiais');
    });
  });

  describe('extractLegislationReferences', () => {
    it('should extract Lei references', () => {
      const text = 'Conforme a Lei 14.133/2021 e Lei n 8.666/1993';
      const refs = extractLegislationReferences(text);

      expect(refs).toContain('Lei 14.133/2021');
      expect(refs).toContain('Lei 8.666/1993');
    });

    it('should extract Decreto references', () => {
      const text = 'O Decreto 10.024/2019 estabelece que...';
      const refs = extractLegislationReferences(text);

      expect(refs).toContain('Decreto 10.024/2019');
    });

    it('should extract IN references', () => {
      const text = 'A IN SEGES/ME n 40/2020 determina...';
      const refs = extractLegislationReferences(text);

      expect(refs).toContain('IN 40/2020');
    });

    it('should extract Article references', () => {
      const text = 'Conforme Art. 18 e Artigo 23 da Lei 14.133/2021';
      const refs = extractLegislationReferences(text);

      expect(refs).toContain('Art. 18');
      expect(refs).toContain('Art. 23');
    });

    it('should remove duplicates', () => {
      const text = 'Lei 14.133/2021 e novamente Lei 14.133/2021';
      const refs = extractLegislationReferences(text);

      const lei14133Count = refs.filter((r) => r === 'Lei 14.133/2021').length;
      expect(lei14133Count).toBe(1);
    });

    it('should return empty array for text without references', () => {
      const text = 'Este texto nao possui referencias legais especificas.';
      const refs = extractLegislationReferences(text);

      expect(refs).toHaveLength(0);
    });

    it('should handle multiple reference types in same text', () => {
      const text =
        'Conforme Lei 14.133/2021, Art. 18, e IN SEGES/ME n 40/2020, o Decreto 10.024/2019...';
      const refs = extractLegislationReferences(text);

      expect(refs.length).toBeGreaterThanOrEqual(3);
      expect(refs).toContain('Lei 14.133/2021');
      expect(refs).toContain('Art. 18');
    });

    it('should handle Lei with different formats', () => {
      const text = 'Lei n 14.133/2021 e Lei 8666/1993';
      const refs = extractLegislationReferences(text);

      expect(refs.length).toBe(2);
    });

    it('should handle IN from different organs', () => {
      const text = 'IN SLTI/MP n 01/2010 e IN SEGES/ME n 65/2021';
      const refs = extractLegislationReferences(text);

      expect(refs).toContain('IN 01/2010');
      expect(refs).toContain('IN 65/2021');
    });
  });
});
