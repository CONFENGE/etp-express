import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * Migration para adicionar foreign keys da cadeia de rastreabilidade de contratos.
 *
 * Implementa rastreabilidade completa: ETP → TR → Edital → Contrato
 *
 * **Issue #1285** - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 *
 * Foreign Keys criadas:
 * - termos_referencia.etpId → etps.id (CASCADE)
 * - editais.termoReferenciaId → termos_referencia.id (SET NULL)
 * - contratos.editalId → editais.id (SET NULL)
 *
 * Constraints:
 * - CASCADE: Ao deletar ETP, deleta TRs associados
 * - SET NULL: Ao deletar TR/Edital, mantém documentos posteriores mas remove vínculo
 */
export class AddContractChainForeignKeys1769500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===================================================
    // FK 1: termos_referencia.etpId → etps.id
    // ===================================================

    // Verificar se a FK já existe (pode ter sido criada em migration anterior)
    const trEtpFkExists = await queryRunner
      .getTable('termos_referencia')
      .then((table) =>
        table?.foreignKeys.some((fk) => fk.columnNames.includes('etpId')),
      );

    if (!trEtpFkExists) {
      await queryRunner.createForeignKey(
        'termos_referencia',
        new TableForeignKey({
          name: 'fk_termo_referencia_etp',
          columnNames: ['etpId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'etps',
          onDelete: 'CASCADE', // Ao deletar ETP, deletar TRs associados
          onUpdate: 'CASCADE',
        }),
      );
    }

    // ===================================================
    // FK 2: editais.termoReferenciaId → termos_referencia.id
    // ===================================================

    const editalTrFkExists = await queryRunner
      .getTable('editais')
      .then((table) =>
        table?.foreignKeys.some((fk) =>
          fk.columnNames.includes('termoReferenciaId'),
        ),
      );

    if (!editalTrFkExists) {
      await queryRunner.createForeignKey(
        'editais',
        new TableForeignKey({
          name: 'fk_edital_termo_referencia',
          columnNames: ['termoReferenciaId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'termos_referencia',
          onDelete: 'SET NULL', // Ao deletar TR, manter Edital mas remover vínculo
          onUpdate: 'CASCADE',
        }),
      );
    }

    // ===================================================
    // FK 3: contratos.editalId → editais.id
    // ===================================================

    const contratoEditalFkExists = await queryRunner
      .getTable('contratos')
      .then((table) =>
        table?.foreignKeys.some((fk) => fk.columnNames.includes('editalId')),
      );

    if (!contratoEditalFkExists) {
      await queryRunner.createForeignKey(
        'contratos',
        new TableForeignKey({
          name: 'fk_contrato_edital',
          columnNames: ['editalId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'editais',
          onDelete: 'SET NULL', // Ao deletar Edital, manter Contrato mas remover vínculo
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover FKs na ordem inversa da criação

    const contratoTable = await queryRunner.getTable('contratos');
    const contratoEditalFk = contratoTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('editalId'),
    );
    if (contratoEditalFk) {
      await queryRunner.dropForeignKey('contratos', contratoEditalFk);
    }

    const editalTable = await queryRunner.getTable('editais');
    const editalTrFk = editalTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('termoReferenciaId'),
    );
    if (editalTrFk) {
      await queryRunner.dropForeignKey('editais', editalTrFk);
    }

    const trTable = await queryRunner.getTable('termos_referencia');
    const trEtpFk = trTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('etpId'),
    );
    if (trEtpFk) {
      await queryRunner.dropForeignKey('termos_referencia', trEtpFk);
    }
  }
}
