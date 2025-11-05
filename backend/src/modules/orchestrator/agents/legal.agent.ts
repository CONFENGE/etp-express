import { Injectable, Logger } from '@nestjs/common';

export interface LegalValidationResult {
  isCompliant: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  references: string[];
}

@Injectable()
export class LegalAgent {
  private readonly logger = new Logger(LegalAgent.name);

  private readonly legalReferences = [
    'Lei 14.133/2021 - Nova Lei de Licitações',
    'Lei 8.666/1993 - Lei de Licitações (revogada parcialmente)',
    'IN SEGES/ME nº 40/2020 - ETP',
    'IN SEGES/ME nº 65/2021 - Contratações TI',
    'Decreto 10.024/2019 - Licitações eletrônicas',
  ];

  async validate(content: string, context?: any): Promise<LegalValidationResult> {
    this.logger.log('Validating legal compliance');

    const issues: string[] = [];
    const recommendations: string[] = [];
    const relevantReferences: string[] = [];

    // Check for Lei 14.133/2021 references
    if (!content.includes('14.133') && !content.includes('Lei de Licitações')) {
      issues.push('Falta referência explícita à Lei 14.133/2021');
      recommendations.push('Inclua referência à Lei 14.133/2021 no documento');
      relevantReferences.push(this.legalReferences[0]);
    }

    // Check for justification presence
    if (!content.toLowerCase().includes('justificativa')) {
      issues.push('Seção de justificativa pode estar ausente ou incompleta');
      recommendations.push('Garanta que a justificativa esteja clara e completa conforme Art. 18 da Lei 14.133/2021');
    }

    // Check for minimum required elements
    const requiredElements = [
      { keyword: 'objeto', message: 'Descrição do objeto da contratação' },
      { keyword: 'necessidade', message: 'Necessidade da contratação' },
      { keyword: 'valor', message: 'Estimativa de valor' },
    ];

    requiredElements.forEach(({ keyword, message }) => {
      if (!content.toLowerCase().includes(keyword)) {
        issues.push(`Elemento possivelmente ausente: ${message}`);
      }
    });

    // Check for technical requirements (IN SEGES 40/2020)
    if (context?.type === 'requisitos' || content.toLowerCase().includes('requisito')) {
      if (!content.toLowerCase().includes('técnico')) {
        recommendations.push('Especifique requisitos técnicos conforme IN SEGES/ME nº 40/2020');
        relevantReferences.push(this.legalReferences[2]);
      }
    }

    // Calculate compliance score
    const totalChecks = 10;
    const passedChecks = totalChecks - issues.length;
    const score = Math.max(0, Math.min(100, (passedChecks / totalChecks) * 100));

    const isCompliant = score >= 70;

    this.logger.log(`Legal validation completed. Score: ${score}%, Compliant: ${isCompliant}`);

    return {
      isCompliant,
      score,
      issues,
      recommendations,
      references: relevantReferences.length > 0 ? relevantReferences : [this.legalReferences[0]],
    };
  }

  async enrichWithLegalContext(userPrompt: string, sectionType: string): Promise<string> {
    const legalContext = this.getLegalContextForSection(sectionType);

    return `${userPrompt}\n\n[CONTEXTO LEGAL]\n${legalContext}`;
  }

  private getLegalContextForSection(sectionType: string): string {
    const contexts: Record<string, string> = {
      justificativa: `Conforme Art. 18 da Lei 14.133/2021, a justificativa deve demonstrar:
- A necessidade da contratação
- O interesse público
- Os benefícios esperados
- Os riscos de não contratar`,

      requisitos: `Conforme IN SEGES/ME nº 40/2020:
- Requisitos devem ser objetivos e mensuráveis
- Devem evitar direcionamento
- Precisam estar alinhados com a necessidade`,

      estimativa_valor: `Conforme Art. 23 da Lei 14.133/2021:
- Estimativa deve ser baseada em pesquisa de mercado
- Considerar valores referenciais
- Incluir metodologia de cálculo`,
    };

    return contexts[sectionType] || 'Base legal: Lei 14.133/2021';
  }

  getSystemPrompt(): string {
    return `Você é um agente especializado em conformidade legal para Estudos Técnicos Preliminares (ETP).

Sua função é garantir que todo conteúdo gerado esteja em conformidade com:
- Lei 14.133/2021 (Nova Lei de Licitações)
- IN SEGES/ME nº 40/2020 (Elaboração de ETP)
- IN SEGES/ME nº 65/2021 (Contratações de TI)
- Jurisprudência do TCU

IMPORTANTE:
- Sempre cite a base legal aplicável
- Evite interpretações duvidosas
- Quando incerto, seja conservador
- Sinalize necessidade de revisão jurídica quando apropriado

Adicione ao final: "⚠️ Este conteúdo requer validação jurídica antes do uso oficial."`;
  }
}
