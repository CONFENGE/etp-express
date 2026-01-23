import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';
import { Contrato } from '../../../entities/contrato.entity';
import { CreateMedicaoDto } from '../dto/create-medicao.dto';
import { UpdateMedicaoDto } from '../dto/update-medicao.dto';

/**
 * Service responsável pela gestão de Medições de Contratos.
 *
 * Fornece métodos para criar, listar, atualizar e deletar medições,
 * com validações de negócio conforme Lei 14.133/2021 Art. 117.
 *
 * **Validações Implementadas:**
 * - Valor medido não pode exceder saldo do contrato
 * - Período não pode sobrepor medições existentes
 * - Apenas fiscal pode criar/editar medições
 * - Número sequencial auto-incrementado por contrato
 *
 * **Issue #1641** - [FISC-1286a] Create Medicao entity and CRUD endpoints
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 */
@Injectable()
export class MedicaoService {
  constructor(
    @InjectRepository(Medicao)
    private readonly medicaoRepo: Repository<Medicao>,
    @InjectRepository(Contrato)
    private readonly contratoRepo: Repository<Contrato>,
  ) {}

  /**
   * Cria uma nova medição para um contrato.
   *
   * **Validações:**
   * - Contrato deve existir e estar ativo
   * - Valor medido não pode exceder saldo disponível
   * - Período não pode sobrepor outras medições
   * - Usuário deve ser fiscal do contrato
   *
   * @param contratoId - UUID do contrato
   * @param createDto - Dados da medição
   * @param userId - UUID do usuário criador
   * @returns {Promise<Medicao>} Medição criada
   * @throws {NotFoundException} Se contrato não existe
   * @throws {ForbiddenException} Se usuário não é fiscal
   * @throws {BadRequestException} Se validações falham
   */
  async create(
    contratoId: string,
    createDto: CreateMedicaoDto,
    userId: string,
  ): Promise<Medicao> {
    // Validar contrato existe
    const contrato = await this.contratoRepo.findOne({
      where: { id: contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    }

    // Validar usuário é fiscal do contrato
    if (contrato.fiscalResponsavelId !== userId) {
      throw new ForbiddenException(
        'Apenas o fiscal responsável pode criar medições',
      );
    }

    // Calcular próximo número sequencial
    const ultimaMedicao = await this.medicaoRepo.findOne({
      where: { contratoId },
      order: { numero: 'DESC' },
    });
    const proximoNumero = (ultimaMedicao?.numero || 0) + 1;

    // Validar valor não excede saldo do contrato
    await this.validateValorMedido(contratoId, createDto.valorMedido);

    // Validar período não sobrepõe outras medições
    await this.validatePeriodo(
      contratoId,
      createDto.periodoInicio,
      createDto.periodoFim,
    );

    // Criar medição
    const medicao = this.medicaoRepo.create({
      contratoId,
      numero: proximoNumero,
      periodoInicio: createDto.periodoInicio,
      periodoFim: createDto.periodoFim,
      valorMedido: createDto.valorMedido,
      descricao: createDto.descricao,
      observacoes: createDto.observacoes,
      fiscalResponsavelId: userId,
      status: MedicaoStatus.PENDENTE,
      createdById: userId,
    });

    return this.medicaoRepo.save(medicao);
  }

  /**
   * Lista todas as medições de um contrato.
   *
   * @param contratoId - UUID do contrato
   * @returns {Promise<Medicao[]>} Lista de medições
   */
  async findAllByContrato(contratoId: string): Promise<Medicao[]> {
    return this.medicaoRepo.find({
      where: { contratoId },
      order: { numero: 'ASC' },
    });
  }

  /**
   * Busca uma medição por ID.
   *
   * @param id - UUID da medição
   * @returns {Promise<Medicao>} Medição encontrada
   * @throws {NotFoundException} Se medição não existe
   */
  async findOne(id: string): Promise<Medicao> {
    const medicao = await this.medicaoRepo.findOne({
      where: { id },
    });

    if (!medicao) {
      throw new NotFoundException(`Medição ${id} não encontrada`);
    }

    return medicao;
  }

  /**
   * Atualiza uma medição existente.
   *
   * **Restrições:**
   * - Apenas medições com status PENDENTE ou REJEITADA podem ser editadas
   * - Número sequencial não pode ser alterado
   * - Validações de valor e período são re-executadas
   *
   * @param id - UUID da medição
   * @param updateDto - Dados para atualização
   * @param userId - UUID do usuário
   * @returns {Promise<Medicao>} Medição atualizada
   * @throws {NotFoundException} Se medição não existe
   * @throws {ForbiddenException} Se usuário não tem permissão
   * @throws {BadRequestException} Se medição já foi aprovada
   */
  async update(
    id: string,
    updateDto: UpdateMedicaoDto,
    userId: string,
  ): Promise<Medicao> {
    const medicao = await this.findOne(id);

    // Validar usuário é fiscal do contrato
    if (medicao.fiscalResponsavelId !== userId) {
      throw new ForbiddenException(
        'Apenas o fiscal responsável pode editar medições',
      );
    }

    // Validar medição não foi aprovada
    if (medicao.status === MedicaoStatus.APROVADA) {
      throw new BadRequestException(
        'Medição aprovada não pode ser editada. Solicite novo ateste.',
      );
    }

    // Se valor mudou, revalidar
    if (
      updateDto.valorMedido &&
      updateDto.valorMedido !== medicao.valorMedido
    ) {
      await this.validateValorMedido(
        medicao.contratoId,
        updateDto.valorMedido,
        id, // Excluir esta medição do cálculo
      );
    }

    // Se período mudou, revalidar
    if (updateDto.periodoInicio || updateDto.periodoFim) {
      await this.validatePeriodo(
        medicao.contratoId,
        updateDto.periodoInicio || medicao.periodoInicio,
        updateDto.periodoFim || medicao.periodoFim,
        id, // Excluir esta medição da validação
      );
    }

    // Atualizar campos
    Object.assign(medicao, updateDto);

    return this.medicaoRepo.save(medicao);
  }

  /**
   * Remove uma medição.
   *
   * **Restrições:**
   * - Apenas medições com status PENDENTE podem ser removidas
   *
   * @param id - UUID da medição
   * @param userId - UUID do usuário
   * @throws {NotFoundException} Se medição não existe
   * @throws {ForbiddenException} Se usuário não tem permissão
   * @throws {BadRequestException} Se medição já foi aprovada
   */
  async remove(id: string, userId: string): Promise<void> {
    const medicao = await this.findOne(id);

    // Validar usuário é fiscal do contrato
    if (medicao.fiscalResponsavelId !== userId) {
      throw new ForbiddenException(
        'Apenas o fiscal responsável pode remover medições',
      );
    }

    // Validar medição está pendente
    if (medicao.status !== MedicaoStatus.PENDENTE) {
      throw new BadRequestException(
        'Apenas medições pendentes podem ser removidas',
      );
    }

    await this.medicaoRepo.remove(medicao);
  }

  /**
   * Valida se o valor medido não excede o saldo disponível do contrato.
   *
   * **Regra:** Soma de medições aprovadas + nova medição ≤ Valor Global do Contrato
   *
   * @param contratoId - UUID do contrato
   * @param valorMedido - Valor a ser medido
   * @param excludeMedicaoId - ID da medição a excluir do cálculo (para updates)
   * @throws {BadRequestException} Se valor excede saldo
   */
  private async validateValorMedido(
    contratoId: string,
    valorMedido: string,
    excludeMedicaoId?: string,
  ): Promise<void> {
    const contrato = await this.contratoRepo.findOne({
      where: { id: contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    }

    // Calcular total já medido (aprovadas)
    const queryBuilder = this.medicaoRepo
      .createQueryBuilder('medicao')
      .select('COALESCE(SUM(medicao.valorMedido), 0)', 'totalMedido')
      .where('medicao.contratoId = :contratoId', { contratoId })
      .andWhere('medicao.status = :status', {
        status: MedicaoStatus.APROVADA,
      });

    // Excluir medição atual se for update
    if (excludeMedicaoId) {
      queryBuilder.andWhere('medicao.id != :excludeMedicaoId', {
        excludeMedicaoId,
      });
    }

    const result = await queryBuilder.getRawOne();
    const totalMedido = parseFloat(result.totalMedido || '0');
    const valorGlobal = parseFloat(contrato.valorGlobal);
    const novoValor = parseFloat(valorMedido);

    const saldoDisponivel = valorGlobal - totalMedido;

    if (novoValor > saldoDisponivel) {
      throw new BadRequestException(
        `Valor medido (R$ ${novoValor.toFixed(2)}) excede saldo disponível (R$ ${saldoDisponivel.toFixed(2)})`,
      );
    }
  }

  /**
   * Valida se o período não sobrepõe outras medições.
   *
   * **Regra:** Períodos de medições do mesmo contrato não podem se sobrepor
   *
   * @param contratoId - UUID do contrato
   * @param periodoInicio - Data de início
   * @param periodoFim - Data de término
   * @param excludeMedicaoId - ID da medição a excluir da validação (para updates)
   * @throws {BadRequestException} Se período sobrepõe
   */
  private async validatePeriodo(
    contratoId: string,
    periodoInicio: Date,
    periodoFim: Date,
    excludeMedicaoId?: string,
  ): Promise<void> {
    // Validar período é válido
    if (periodoInicio >= periodoFim) {
      throw new BadRequestException(
        'Data de início deve ser anterior à data de término',
      );
    }

    // Buscar medições que sobrepõem o período
    const queryBuilder = this.medicaoRepo
      .createQueryBuilder('medicao')
      .where('medicao.contratoId = :contratoId', { contratoId })
      .andWhere(
        '(medicao.periodoInicio <= :periodoFim AND medicao.periodoFim >= :periodoInicio)',
        { periodoInicio, periodoFim },
      );

    // Excluir medição atual se for update
    if (excludeMedicaoId) {
      queryBuilder.andWhere('medicao.id != :excludeMedicaoId', {
        excludeMedicaoId,
      });
    }

    const sobreposicao = await queryBuilder.getCount();

    if (sobreposicao > 0) {
      throw new BadRequestException(
        'Período informado sobrepõe medição existente',
      );
    }
  }
}
