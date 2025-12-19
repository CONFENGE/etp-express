import { SimplificacaoAgent, SimplificacaoResult } from './simplificacao.agent';

describe('SimplificacaoAgent', () => {
  let agent: SimplificacaoAgent;

  beforeEach(() => {
    agent = new SimplificacaoAgent();
  });

  describe('analyze()', () => {
    it('should detect complex phrases and suggest simplifications', async () => {
      const text = 'Tendo em vista que faz-se necessário proceder à análise';
      const result: SimplificacaoResult = await agent.analyze(text);

      expect(result.complexPhrases.length).toBeGreaterThan(0);
      expect(result.complexPhrases).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phrase: expect.stringMatching(/tendo em vista que/i),
          }),
        ]),
      );
      expect(result.simplifiedSuggestions.length).toBeGreaterThan(0);
    });

    it('should detect redundancies', async () => {
      const text =
        'Vamos planejar antecipadamente a conclusão final do elo de ligação';
      const result: SimplificacaoResult = await agent.analyze(text);

      expect(result.redundancies.length).toBe(3);
      expect(result.redundancies).toContain('planejar antecipadamente');
      expect(result.redundancies).toContain('conclusão final');
      expect(result.redundancies).toContain('elo de ligação');
    });

    it('should calculate score inversely proportional to issues found', async () => {
      const cleanText = 'Texto simples e direto sem problemas';
      const problematicText =
        'Tendo em vista que faz-se necessário proceder à planejar antecipadamente';

      const cleanResult: SimplificacaoResult = await agent.analyze(cleanText);
      const problematicResult: SimplificacaoResult =
        await agent.analyze(problematicText);

      expect(cleanResult.score).toBeGreaterThan(problematicResult.score);

      // Formula: score = max(0, 100 - totalIssues * 5)
      const totalIssues =
        problematicResult.complexPhrases.length +
        problematicResult.redundancies.length;
      const expectedScore = Math.max(0, 100 - totalIssues * 5);
      expect(problematicResult.score).toBe(expectedScore);
    });

    it('should detect excessive use of "que"', async () => {
      const text =
        'Eu acho que ele disse que ela falou que nós pensamos que eles acham que';
      const result: SimplificacaoResult = await agent.analyze(text);

      expect(result.simplifiedSuggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/uso excessivo.*"que"/i),
        ]),
      );
    });

    describe('Edge cases', () => {
      it('should handle text with no issues', async () => {
        const perfectText =
          'Texto perfeito sem qualquer problema de simplicidade';
        const result: SimplificacaoResult = await agent.analyze(perfectText);

        expect(result.complexPhrases.length).toBe(0);
        expect(result.redundancies.length).toBe(0);
        expect(result.score).toBe(100);
      });

      it('should handle completely problematic text', async () => {
        const awfulText =
          'Tendo em vista que faz-se necessário proceder à planejar antecipadamente a conclusão final no sentido de';
        const result: SimplificacaoResult = await agent.analyze(awfulText);

        expect(result.complexPhrases.length).toBeGreaterThanOrEqual(4);
        expect(result.redundancies.length).toBeGreaterThanOrEqual(2);
        // Score formula: 100 - (complexPhrases + redundancies) * 5
        // Expected: 6 issues = 100 - 30 = 70
        expect(result.score).toBeLessThanOrEqual(70);
      });

      it('should handle empty string', async () => {
        const result: SimplificacaoResult = await agent.analyze('');
        expect(result.score).toBe(100);
        expect(result.originalLength).toBe(0);
      });
    });
  });

  describe('simplify()', () => {
    it('should apply automatic simplifications', async () => {
      const text =
        'Tendo em vista que faz-se necessário planejar antecipadamente';
      const simplified: string = await agent.simplify(text);

      expect(simplified).not.toContain('Tendo em vista que');
      expect(simplified).toContain('porque');
      expect(simplified).not.toContain('faz-se necessário');
      expect(simplified).toContain('é necessário');
      expect(simplified).not.toContain('planejar antecipadamente');
      expect(simplified).toContain('planejar');
    });

    it('should handle text with no simplifications needed', async () => {
      const text = 'Texto já simples e direto';
      const simplified: string = await agent.simplify(text);

      expect(simplified).toBe(text);
    });

    it('should apply multiple simplifications in sequence', async () => {
      const text =
        'Tendo em vista que no sentido de proceder à realização da conclusão final';
      const simplified: string = await agent.simplify(text);

      expect(simplified).not.toContain('Tendo em vista que');
      expect(simplified).not.toContain('no sentido de');
      expect(simplified).not.toContain('proceder à');
      expect(simplified).not.toContain('conclusão final');
      expect(simplified).toContain('porque');
      expect(simplified).toContain('para');
      expect(simplified).toContain('fazer');
      expect(simplified).toContain('conclusão');
    });
  });

  describe('getSystemPrompt()', () => {
    it('should return a system prompt with simplification guidelines', () => {
      const prompt: string = agent.getSystemPrompt();

      expect(prompt).toContain('simplificação');
      expect(prompt.toUpperCase()).toContain('PALAVRAS SIMPLES');
      expect(prompt.toUpperCase()).toContain('REDUNDÂNCIAS');
      expect(prompt.toUpperCase()).toContain('VOZ ATIVA');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });
});
