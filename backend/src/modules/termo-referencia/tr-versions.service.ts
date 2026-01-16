import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TermoReferenciaVersion,
  TrVersionSnapshot,
} from '../../entities/termo-referencia-version.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Service para gerenciamento de versoes de Termos de Referencia.
 *
 * Funcionalidades:
 * - Criar snapshot de versao em cada save significativo
 * - Listar historico de versoes
 * - Comparar duas versoes (diff)
 * - Restaurar versao anterior
 *
 * Issue #1253 - [TR-f] Versionamento e historico de TR
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Injectable()
export class TrVersionsService {
  private readonly logger = new Logger(TrVersionsService.name);

  constructor(
    @InjectRepository(TermoReferenciaVersion)
    private versionsRepository: Repository<TermoReferenciaVersion>,
    @InjectRepository(TermoReferencia)
    private termoReferenciaRepository: Repository<TermoReferencia>,
  ) {}

  /**
   * Cria uma nova versao (snapshot) do Termo de Referencia.
   *
   * @param termoReferenciaId ID do TR
   * @param changeLog Descricao das alteracoes (opcional)
   * @param userId ID do usuario (opcional)
   * @returns Versao criada
   */
  async createVersion(
    termoReferenciaId: string,
    changeLog?: string,
    _userId?: string,
  ): Promise<TermoReferenciaVersion> {
    this.logger.log(`Creating version for TR ${termoReferenciaId}`);

    // Get TR with createdBy relation
    const tr = await this.termoReferenciaRepository.findOne({
      where: { id: termoReferenciaId },
      relations: ['createdBy'],
    });

    if (!tr) {
      throw new NotFoundException(
        `Termo de Referencia ${termoReferenciaId} nao encontrado`,
      );
    }

    // Get current version number
    const latestVersion = await this.versionsRepository.findOne({
      where: { termoReferenciaId },
      order: { versionNumber: 'DESC' },
    });

    const newVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    // Create snapshot
    const snapshot: TrVersionSnapshot = {
      objeto: tr.objeto,
      fundamentacaoLegal: tr.fundamentacaoLegal,
      descricaoSolucao: tr.descricaoSolucao,
      requisitosContratacao: tr.requisitosContratacao,
      modeloExecucao: tr.modeloExecucao,
      modeloGestao: tr.modeloGestao,
      criteriosSelecao: tr.criteriosSelecao,
      valorEstimado: tr.valorEstimado,
      dotacaoOrcamentaria: tr.dotacaoOrcamentaria,
      prazoVigencia: tr.prazoVigencia,
      obrigacoesContratante: tr.obrigacoesContratante,
      obrigacoesContratada: tr.obrigacoesContratada,
      sancoesPenalidades: tr.sancoesPenalidades,
      cronograma: tr.cronograma,
      especificacoesTecnicas: tr.especificacoesTecnicas,
      localExecucao: tr.localExecucao,
      garantiaContratual: tr.garantiaContratual,
      condicoesPagamento: tr.condicoesPagamento,
      subcontratacao: tr.subcontratacao,
      status: tr.status,
    };

    // Create version
    const version = this.versionsRepository.create({
      termoReferenciaId,
      versionNumber: newVersionNumber,
      snapshot,
      changeLog: changeLog || 'Snapshot automatico',
      createdByName: tr.createdBy?.name || 'Sistema',
    });

    const savedVersion = await this.versionsRepository.save(version);

    // Update TR current version
    tr.currentVersion = newVersionNumber;
    await this.termoReferenciaRepository.save(tr);

    this.logger.log(
      `Version ${newVersionNumber} created for TR ${termoReferenciaId}`,
    );

    return savedVersion;
  }

  /**
   * Lista todas as versoes de um TR.
   *
   * @param termoReferenciaId ID do TR
   * @returns Lista de versoes ordenadas por numero (desc)
   */
  async getVersions(
    termoReferenciaId: string,
  ): Promise<TermoReferenciaVersion[]> {
    return this.versionsRepository.find({
      where: { termoReferenciaId },
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Busca uma versao especifica por ID.
   *
   * @param versionId ID da versao
   * @returns Versao encontrada
   */
  async getVersion(versionId: string): Promise<TermoReferenciaVersion> {
    const version = await this.versionsRepository.findOne({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Versao ${versionId} nao encontrada`);
    }

    return version;
  }

  /**
   * Compara duas versoes e retorna as diferencas.
   *
   * @param versionId1 ID da primeira versao
   * @param versionId2 ID da segunda versao
   * @param organizationId ID da organizacao para validacao
   * @returns Objeto com diferencas entre as versoes
   */
  async compareVersions(
    versionId1: string,
    versionId2: string,
    organizationId?: string,
  ) {
    const [version1, version2] = await Promise.all([
      this.versionsRepository.findOne({
        where: { id: versionId1 },
        relations: ['termoReferencia'],
      }),
      this.versionsRepository.findOne({
        where: { id: versionId2 },
        relations: ['termoReferencia'],
      }),
    ]);

    if (!version1) {
      throw new NotFoundException(`Versao ${versionId1} nao encontrada`);
    }
    if (!version2) {
      throw new NotFoundException(`Versao ${versionId2} nao encontrada`);
    }

    // Validate organizationId for the second version (first is validated by guard)
    if (
      organizationId &&
      version2.termoReferencia.organizationId !== organizationId
    ) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to compare TR Version ${versionId2} from organization ${version2.termoReferencia.organizationId}`,
      );
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar esta versao',
      );
    }

    const differences = this.compareSnapshots(
      version1.snapshot,
      version2.snapshot,
    );

    return {
      version1: {
        id: version1.id,
        versionNumber: version1.versionNumber,
        createdAt: version1.createdAt,
      },
      version2: {
        id: version2.id,
        versionNumber: version2.versionNumber,
        createdAt: version2.createdAt,
      },
      differences,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Restaura um TR para o estado de uma versao anterior.
   *
   * @param versionId ID da versao a restaurar
   * @param userId ID do usuario que esta restaurando
   * @returns TR restaurado
   */
  async restoreVersion(
    versionId: string,
    _userId: string,
  ): Promise<TermoReferencia> {
    this.logger.log(`Restoring TR version ${versionId}`);

    const version = await this.getVersion(versionId);

    const tr = await this.termoReferenciaRepository.findOne({
      where: { id: version.termoReferenciaId },
    });

    if (!tr) {
      throw new NotFoundException(
        `Termo de Referencia ${version.termoReferenciaId} nao encontrado`,
      );
    }

    // Create a new version before restoring (backup current state)
    await this.createVersion(
      tr.id,
      `Backup antes de restaurar versao ${version.versionNumber}`,
      _userId,
    );

    const snapshot = version.snapshot;

    // Restore TR data
    Object.assign(tr, {
      objeto: snapshot.objeto,
      fundamentacaoLegal: snapshot.fundamentacaoLegal,
      descricaoSolucao: snapshot.descricaoSolucao,
      requisitosContratacao: snapshot.requisitosContratacao,
      modeloExecucao: snapshot.modeloExecucao,
      modeloGestao: snapshot.modeloGestao,
      criteriosSelecao: snapshot.criteriosSelecao,
      valorEstimado: snapshot.valorEstimado,
      dotacaoOrcamentaria: snapshot.dotacaoOrcamentaria,
      prazoVigencia: snapshot.prazoVigencia,
      obrigacoesContratante: snapshot.obrigacoesContratante,
      obrigacoesContratada: snapshot.obrigacoesContratada,
      sancoesPenalidades: snapshot.sancoesPenalidades,
      cronograma: snapshot.cronograma,
      especificacoesTecnicas: snapshot.especificacoesTecnicas,
      localExecucao: snapshot.localExecucao,
      garantiaContratual: snapshot.garantiaContratual,
      condicoesPagamento: snapshot.condicoesPagamento,
      subcontratacao: snapshot.subcontratacao,
    });

    const savedTr = await this.termoReferenciaRepository.save(tr);

    this.logger.log(
      `Version ${version.versionNumber} restored for TR ${tr.id}`,
    );

    return savedTr;
  }

  /**
   * Compara dois snapshots e retorna as diferencas.
   */
  private compareSnapshots(snap1: TrVersionSnapshot, snap2: TrVersionSnapshot) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    const fieldsToCompare: (keyof TrVersionSnapshot)[] = [
      'objeto',
      'fundamentacaoLegal',
      'descricaoSolucao',
      'requisitosContratacao',
      'modeloExecucao',
      'modeloGestao',
      'criteriosSelecao',
      'valorEstimado',
      'dotacaoOrcamentaria',
      'prazoVigencia',
      'obrigacoesContratante',
      'obrigacoesContratada',
      'sancoesPenalidades',
      'localExecucao',
      'garantiaContratual',
      'condicoesPagamento',
      'subcontratacao',
      'status',
    ];

    for (const field of fieldsToCompare) {
      if (snap1[field] !== snap2[field]) {
        changes[field] = { old: snap1[field], new: snap2[field] };
      }
    }

    // Compare JSONB fields separately
    if (JSON.stringify(snap1.cronograma) !== JSON.stringify(snap2.cronograma)) {
      changes.cronograma = { old: snap1.cronograma, new: snap2.cronograma };
    }

    if (
      JSON.stringify(snap1.especificacoesTecnicas) !==
      JSON.stringify(snap2.especificacoesTecnicas)
    ) {
      changes.especificacoesTecnicas = {
        old: snap1.especificacoesTecnicas,
        new: snap2.especificacoesTecnicas,
      };
    }

    return changes;
  }
}
