import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OpenAIService } from './llm/openai.service';
import { LegalAgent } from './agents/legal.agent';
import { FundamentacaoAgent } from './agents/fundamentacao.agent';
import { ClarezaAgent } from './agents/clareza.agent';
import { SimplificacaoAgent } from './agents/simplificacao.agent';
import { AntiHallucinationAgent } from './agents/anti-hallucination.agent';
import { OutputValidatorService } from './validators/output-validator';
import { PrivacyModule } from '../privacy/privacy.module';
import { RAGModule } from '../rag/rag.module';
import { SearchModule } from '../search/search.module';
import { GovApiModule } from '../gov-api/gov-api.module';
import { GovSearchModule } from '../gov-api/gov-search/gov-search.module';

@Module({
  imports: [
    PrivacyModule,
    RAGModule,
    SearchModule,
    GovApiModule,
    GovSearchModule,
  ],
  providers: [
    OrchestratorService,
    OpenAIService,
    LegalAgent,
    FundamentacaoAgent,
    ClarezaAgent,
    SimplificacaoAgent,
    AntiHallucinationAgent,
    OutputValidatorService,
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
