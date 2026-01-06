import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add cost estimation fields to ETPs table.
 *
 * @description
 * Adds fields required for cost estimation in ETP forms:
 * - valorUnitario: Unit price for cost calculation
 * - fontePesquisaPrecos: Source of price research (SINAPI, SICRO, etc.)
 * - dotacaoOrcamentaria: Budget allocation code
 *
 * @see Issue #1226 - [ETP-1158d] Campos de Estimativa de Custos
 */
export class AddEstimativaCustosFields1736175600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if valorUnitario column already exists
    const valorUnitarioExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'etps'
      AND column_name = 'valorUnitario'
    `);

    if (valorUnitarioExists.length === 0) {
      await queryRunner.addColumn(
        'etps',
        new TableColumn({
          name: 'valorUnitario',
          type: 'decimal',
          precision: 15,
          scale: 2,
          isNullable: true,
          comment: 'Unit price for cost calculation',
        }),
      );
    }

    // Check if fontePesquisaPrecos column already exists
    const fontePesquisaPrecosExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'etps'
      AND column_name = 'fontePesquisaPrecos'
    `);

    if (fontePesquisaPrecosExists.length === 0) {
      await queryRunner.addColumn(
        'etps',
        new TableColumn({
          name: 'fontePesquisaPrecos',
          type: 'text',
          isNullable: true,
          comment: 'Source of price research (SINAPI, SICRO, Painel de Preços)',
        }),
      );
    }

    // Check if dotacaoOrcamentaria column already exists
    const dotacaoOrcamentariaExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'etps'
      AND column_name = 'dotacaoOrcamentaria'
    `);

    if (dotacaoOrcamentariaExists.length === 0) {
      await queryRunner.addColumn(
        'etps',
        new TableColumn({
          name: 'dotacaoOrcamentaria',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment: 'Budget allocation code',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('etps', 'dotacaoOrcamentaria');
    await queryRunner.dropColumn('etps', 'fontePesquisaPrecos');
    await queryRunner.dropColumn('etps', 'valorUnitario');
  }
}
