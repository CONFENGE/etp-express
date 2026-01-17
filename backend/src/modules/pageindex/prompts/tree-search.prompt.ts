/**
 * Prompts for tree search operations with LLM reasoning.
 *
 * These prompts guide the LLM to navigate a hierarchical document tree
 * by making reasoning-based decisions at each level, similar to how a
 * human expert would navigate a table of contents.
 *
 * @see Issue #1553 - [PI-1538d] Implementar TreeSearchService com LLM reasoning
 * @see https://github.com/VectifyAI/PageIndex
 */

/**
 * System prompt for tree search navigation.
 * Establishes the LLM's role as a document navigator.
 */
export const TREE_SEARCH_SYSTEM_PROMPT = `Você é um especialista em navegação de documentos jurídicos e técnicos brasileiros.

Sua tarefa é navegar por uma estrutura hierárquica de documento (como um índice) para encontrar as seções mais relevantes para responder a uma pergunta do usuário.

## Regras de Navegação

1. **Análise Sistemática**: Analise cada nó disponível antes de decidir.
2. **Decisão Fundamentada**: Explique brevemente o raciocínio para cada escolha.
3. **Precisão**: Prefira encontrar a seção exata a retornar resultados vagos.
4. **Eficiência**: Não explore caminhos claramente irrelevantes.
5. **Múltiplos Resultados**: Se houver múltiplas seções relevantes, explore todas.

## Formato de Resposta

Responda SEMPRE em JSON válido no seguinte formato:
{
  "decision": "EXPLORE" | "FOUND" | "NOT_FOUND",
  "selectedNodes": ["id1", "id2"],
  "reasoning": "Explicação do raciocínio...",
  "confidence": 0.0 a 1.0
}

- **EXPLORE**: Preciso descer para os filhos dos nós selecionados
- **FOUND**: Encontrei a(s) seção(ões) relevante(s)
- **NOT_FOUND**: A informação não está neste caminho

## Tipos de Documentos Conhecidos

- **Legislação**: Leis, decretos, portarias (estrutura: Títulos > Capítulos > Seções > Artigos)
- **Contratos**: Cláusulas, anexos, especificações técnicas
- **Editais**: Objeto, requisitos, critérios, anexos
- **Termos de Referência**: Descrição, justificativa, requisitos, cronograma
- **ETPs**: Estudos técnicos preliminares com seções padronizadas`;

/**
 * User prompt template for tree navigation.
 *
 * @param query - User's search query
 * @param currentLevel - Current depth in the tree
 * @param nodes - Array of nodes at current level (title and summary)
 * @param path - Path traversed so far
 */
export function buildTreeNavigationPrompt(
  query: string,
  currentLevel: number,
  nodes: Array<{ id: string; title: string; summary?: string }>,
  path: string[],
): string {
  const pathDisplay =
    path.length > 0 ? `\nCaminho atual: ${path.join(' > ')}` : '';

  const nodeList = nodes
    .map((node, index) => {
      const summary = node.summary ? ` - ${node.summary}` : '';
      return `${index + 1}. [${node.id}] ${node.title}${summary}`;
    })
    .join('\n');

  return `## Pergunta do Usuário
"${query}"
${pathDisplay}

## Nível Atual: ${currentLevel}

## Nós Disponíveis para Navegação
${nodeList}

## Instrução
Analise os nós acima e decida:
1. Se algum nó contém ou pode levar à resposta, use EXPLORE ou FOUND
2. Se nenhum nó é relevante, use NOT_FOUND
3. Selecione até 3 nós mais promissores se for EXPLORE

Responda em JSON:`;
}

/**
 * Prompt for extracting final answer from found nodes.
 *
 * @param query - User's search query
 * @param nodes - Relevant nodes with their content
 * @param path - Path traversed to reach these nodes
 */
export function buildExtractionPrompt(
  query: string,
  nodes: Array<{ id: string; title: string; content?: string }>,
  path: string[],
): string {
  const nodeContents = nodes
    .map((node) => {
      const content = node.content || '(sem conteúdo detalhado)';
      return `### ${node.title}\n${content}`;
    })
    .join('\n\n');

  return `## Pergunta
"${query}"

## Seções Encontradas (via: ${path.join(' > ')})
${nodeContents}

## Instrução
Com base nas seções encontradas, forneça uma resposta direta e concisa à pergunta.
Se a informação não estiver nas seções, diga claramente.

Responda em JSON:
{
  "answer": "Resposta direta à pergunta",
  "citedSections": ["id1", "id2"],
  "confidence": 0.0 a 1.0,
  "needsMoreContext": true/false
}`;
}

/**
 * Default options for tree search operations.
 */
export const DEFAULT_TREE_SEARCH_OPTIONS = {
  maxDepth: 6,
  maxResults: 5,
  minConfidence: 0.5,
  includeContent: false,
  maxIterations: 10,
  temperatureLow: 0.1,
  temperatureHigh: 0.3,
};
