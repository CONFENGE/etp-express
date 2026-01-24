import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Contrato } from '../../entities/contrato.entity';
import { Edital } from '../../entities/edital.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { Medicao } from '../../entities/medicao.entity';
import { Ocorrencia } from '../../entities/ocorrencia.entity';
import { Ateste } from '../../entities/ateste.entity';
import { DocumentoFiscalizacao } from '../../entities/documento-fiscalizacao.entity';
import { ContractChainService } from './services/contract-chain.service';
import { ContractAlertService } from './services/contract-alert.service';
import { ContratosKpiService } from './services/contratos-kpi.service';
import { MedicaoService } from './services/medicao.service';
import { OcorrenciaService } from './services/ocorrencia.service';
import { AtesteService } from './services/ateste.service';
import { DocumentoFiscalizacaoService } from './services/documento-fiscalizacao.service';
import { ContratosController } from './controllers/contratos.controller';
import { MedicaoController } from './controllers/medicao.controller';
import { OcorrenciaController } from './controllers/ocorrencia.controller';
import { AtesteController } from './controllers/ateste.controller';
import { DocumentoFiscalizacaoController } from './controllers/documento-fiscalizacao.controller';
import { ContractAlertJob } from './jobs/contract-alert.job';
import { FiscalizacaoNotificationJob } from './jobs/fiscalizacao-notification.job';
import { FiscalizacaoNotificationService } from './services/fiscalizacao-notification.service';
import { EmailModule } from '../email/email.module';

/**
 * Módulo de Gestão de Contratos.
 *
 * Responsável por:
 * - CRUD de contratos públicos
 * - Rastreabilidade completa (ETP → TR → Edital → Contrato)
 * - Gestão de ciclo de vida (minuta → encerrado)
 * - Fiscalização e acompanhamento (medições e ocorrências)
 * - Alertas automáticos de prazos e vencimentos
 *
 * **Issues:**
 * - #1285 - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 * - #1287 - [Contratos-d] Alertas de vencimento e aditivos
 * - #1641 - [FISC-1286a] Create Medicao entity and CRUD endpoints
 * - #1642 - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 * - #1643 - [FISC-1286c] Create Ateste entity and approval workflow
 * - #1644 - [FISC-1286d] Add document upload to fiscalização entities
 * - #1647 - [FISC-1286g] Add notification system for fiscalização events
 *
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 * @see Lei 14.133/2021 Art. 117 - Gestão de contratos
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      Edital,
      TermoReferencia,
      Etp,
      Medicao,
      Ocorrencia,
      Ateste,
      DocumentoFiscalizacao,
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [
    ContratosController,
    MedicaoController,
    OcorrenciaController,
    AtesteController,
    DocumentoFiscalizacaoController,
  ],
  providers: [
    ContractChainService,
    ContractAlertService,
    ContratosKpiService,
    MedicaoService,
    OcorrenciaService,
    AtesteService,
    DocumentoFiscalizacaoService,
    FiscalizacaoNotificationService,
    ContractAlertJob,
    FiscalizacaoNotificationJob,
  ],
  exports: [
    ContractChainService,
    ContractAlertService,
    MedicaoService,
    OcorrenciaService,
    AtesteService,
    DocumentoFiscalizacaoService,
    FiscalizacaoNotificationService,
  ],
})
export class ContratosModule {}
