import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contrato } from '../../entities/contrato.entity';
import { Edital } from '../../entities/edital.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { ContractChainService } from './services/contract-chain.service';
import { ContratosController } from './controllers/contratos.controller';

/**
 * Módulo de Gestão de Contratos.
 *
 * Responsável por:
 * - CRUD de contratos públicos
 * - Rastreabilidade completa (ETP → TR → Edital → Contrato)
 * - Gestão de ciclo de vida (minuta → encerrado)
 * - Fiscalização e acompanhamento
 *
 * **Issue #1285** - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 *
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Contrato, Edital, TermoReferencia, Etp]),
  ],
  controllers: [ContratosController],
  providers: [ContractChainService],
  exports: [ContractChainService],
})
export class ContratosModule {}
