import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Contrato } from '../../entities/contrato.entity';
import { Edital } from '../../entities/edital.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { Medicao } from '../../entities/medicao.entity';
import { ContractChainService } from './services/contract-chain.service';
import { ContractAlertService } from './services/contract-alert.service';
import { MedicaoService } from './services/medicao.service';
import { ContratosController } from './controllers/contratos.controller';
import { MedicaoController } from './controllers/medicao.controller';
import { ContractAlertJob } from './jobs/contract-alert.job';
import { EmailModule } from '../email/email.module';

/**
 * Módulo de Gestão de Contratos.
 *
 * Responsável por:
 * - CRUD de contratos públicos
 * - Rastreabilidade completa (ETP → TR → Edital → Contrato)
 * - Gestão de ciclo de vida (minuta → encerrado)
 * - Fiscalização e acompanhamento
 * - Alertas automáticos de prazos e vencimentos
 *
 * **Issues:**
 * - #1285 - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 * - #1287 - [Contratos-d] Alertas de vencimento e aditivos
 *
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 * @see Lei 14.133/2021 Art. 117 - Gestão de contratos
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Contrato, Edital, TermoReferencia, Etp, Medicao]),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [ContratosController, MedicaoController],
  providers: [
    ContractChainService,
    ContractAlertService,
    MedicaoService,
    ContractAlertJob,
  ],
  exports: [ContractChainService, ContractAlertService, MedicaoService],
})
export class ContratosModule {}
