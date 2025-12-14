import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OpenAIService } from './llm/openai.service';
import { LegalAgent } from './agents/legal.agent';
import { FundamentacaoAgent } from './agents/fundamentacao.agent';
import { ClarezaAgent } from './agents/clareza.agent';
import { SimplificacaoAgent } from './agents/simplificacao.agent';
import { AntiHallucinationAgent } from './agents/anti-hallucination.agent';
import { PrivacyModule } from '../privacy/privacy.module';
import { RAGModule } from '../rag/rag.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PrivacyModule, RAGModule, SearchModule],
  providers: [
    OrchestratorService,
    OpenAIService,
    LegalAgent,
    FundamentacaoAgent,
    ClarezaAgent,
    SimplificacaoAgent,
    AntiHallucinationAgent,
  ],
  exports: [
    OrchestratorService,
    OpenAIService,
    LegalAgent,
    FundamentacaoAgent,
    ClarezaAgent,
  ],
})
export class OrchestratorModule {}
