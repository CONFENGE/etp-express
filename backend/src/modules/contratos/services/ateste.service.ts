import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ateste, AtesteResultado } from '../../../entities/ateste.entity';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';
import { CreateAtesteDto } from '../dto/create-ateste.dto';
import { UpdateAtesteDto } from '../dto/update-ateste.dto';

/**
 * Service responsável pela gestão de Atestes de Medições.
 *
 * Implementa o workflow de aprovação/rejeição de medições pelo fiscal:
 * 1. Fiscal cria ateste referenciando medição
 * 2. Se REJEITADO → medição volta para status 'pendente'
 * 3. Se APROVADO → medição atualiza para 'aprovada' + data ateste
 * 4. Se APROVADO_COM_RESSALVAS → registra valor atestado diferente
 *
 * **Validações Implementadas:**
 * - Apenas fiscal responsável pode atestar
 * - Justificativa obrigatória para rejeição/ressalvas
 * - Valor atestado não pode exceder valor medido
 * - Medição já atestada não pode ser reatestada
 *
 * **Issue #1643** - [FISC-1286c] Create Ateste entity and approval workflow
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 140 - Atesto de execução
 */
@Injectable()
export class AtesteService {
  constructor(
    @InjectRepository(Ateste)
    private readonly atesteRepo: Repository<Ateste>,
    @InjectRepository(Medicao)
    private readonly medicaoRepo: Repository<Medicao>,
  ) {}

  /**
   * Cria um ateste para uma medição.
   *
   * **Workflow:**
   * - Valida medição existe e não está atestada
   * - Valida usuário é fiscal responsável
   * - Valida valor atestado (se aplicável)
   * - Cria ateste
   * - Atualiza status da medição conforme resultado
   *
   * @param medicaoId - UUID da medição a ser atestada
   * @param createDto - Dados do ateste
   * @param userId - UUID do usuário (fiscal)
   * @returns {Promise<Ateste>} Ateste criado
   * @throws {NotFoundException} Se medição não existe
   * @throws {ForbiddenException} Se usuário não é fiscal
   * @throws {BadRequestException} Se validações falham
   */
  async create(
    medicaoId: string,
    createDto: CreateAtesteDto,
    userId: string,
  ): Promise<Ateste> {
    // Validar medição existe
    const medicao = await this.medicaoRepo.findOne({
      where: { id: medicaoId },
    });

    if (!medicao) {
      throw new NotFoundException(`Medição ${medicaoId} não encontrada`);
    }

    // Validar usuário é fiscal responsável
    if (medicao.fiscalResponsavelId !== userId) {
      throw new ForbiddenException(
        'Apenas o fiscal responsável pode atestar medições',
      );
    }

    // Validar medição não está já atestada
    const atesteExistente = await this.atesteRepo.findOne({
      where: { medicaoId },
    });

    if (atesteExistente) {
      throw new BadRequestException(
        'Esta medição já possui ateste. Não é possível atestar novamente.',
      );
    }

    // Validar valor atestado (se aplicável)
    if (createDto.resultado === AtesteResultado.APROVADO_COM_RESSALVAS) {
      await this.validateValorAtestado(
        medicao.valorMedido,
        createDto.valorAtestado,
      );
    }

    // Validar justificativa está presente quando obrigatória
    if (
      (createDto.resultado === AtesteResultado.REJEITADO ||
        createDto.resultado === AtesteResultado.APROVADO_COM_RESSALVAS) &&
      !createDto.justificativa
    ) {
      throw new BadRequestException(
        'Justificativa é obrigatória para rejeição ou aprovação com ressalvas',
      );
    }

    // Criar ateste
    const ateste = this.atesteRepo.create({
      medicaoId,
      fiscalId: userId,
      resultado: createDto.resultado,
      justificativa: createDto.justificativa,
      valorAtestado: createDto.valorAtestado,
      dataAteste: createDto.dataAteste,
      observacoes: createDto.observacoes,
    });

    const savedAteste = await this.atesteRepo.save(ateste);

    // Atualizar status da medição conforme resultado do ateste
    await this.updateMedicaoStatus(medicao, createDto.resultado, createDto.dataAteste);

    return savedAteste;
  }

  /**
   * Busca um ateste por ID.
   *
   * @param id - UUID do ateste
   * @returns {Promise<Ateste>} Ateste encontrado
   * @throws {NotFoundException} Se ateste não existe
   */
  async findOne(id: string): Promise<Ateste> {
    const ateste = await this.atesteRepo.findOne({
      where: { id },
    });

    if (!ateste) {
      throw new NotFoundException(`Ateste ${id} não encontrado`);
    }

    return ateste;
  }

  /**
   * Busca ateste de uma medição específica.
   *
   * @param medicaoId - UUID da medição
   * @returns {Promise<Ateste | null>} Ateste encontrado ou null
   */
  async findByMedicao(medicaoId: string): Promise<Ateste | null> {
    return this.atesteRepo.findOne({
      where: { medicaoId },
    });
  }

  /**
   * Atualiza um ateste existente.
   *
   * **Restrições:**
   * - Ateste já finalizado não pode ser alterado (regra de negócio)
   * - Não pode alterar a medição associada
   *
   * @param id - UUID do ateste
   * @param updateDto - Dados para atualização
   * @param userId - UUID do usuário
   * @returns {Promise<Ateste>} Ateste atualizado
   * @throws {NotFoundException} Se ateste não existe
   * @throws {ForbiddenException} Se usuário não tem permissão
   */
  async update(
    id: string,
    updateDto: UpdateAtesteDto,
    userId: string,
  ): Promise<Ateste> {
    const ateste = await this.findOne(id);

    // Validar usuário é fiscal responsável
    if (ateste.fiscalId !== userId) {
      throw new ForbiddenException(
        'Apenas o fiscal responsável pode editar atestes',
      );
    }

    // Validar valor atestado se foi alterado
    if (
      updateDto.valorAtestado &&
      updateDto.resultado === AtesteResultado.APROVADO_COM_RESSALVAS
    ) {
      const medicao = await this.medicaoRepo.findOne({
        where: { id: ateste.medicaoId },
      });

      if (medicao) {
        await this.validateValorAtestado(
          medicao.valorMedido,
          updateDto.valorAtestado,
        );
      }
    }

    // Atualizar campos
    Object.assign(ateste, updateDto);

    const updatedAteste = await this.atesteRepo.save(ateste);

    // Se resultado mudou, atualizar status da medição
    if (updateDto.resultado) {
      const medicao = await this.medicaoRepo.findOne({
        where: { id: ateste.medicaoId },
      });

      if (medicao) {
        await this.updateMedicaoStatus(
          medicao,
          updateDto.resultado,
          updateDto.dataAteste || ateste.dataAteste,
        );
      }
    }

    return updatedAteste;
  }

  /**
   * Valida se o valor atestado não excede o valor medido.
   *
   * **Regra:** valorAtestado ≤ valorMedido
   *
   * @param valorMedido - Valor medido original
   * @param valorAtestado - Valor atestado proposto
   * @throws {BadRequestException} Se valor atestado excede valor medido
   */
  private async validateValorAtestado(
    valorMedido: string,
    valorAtestado?: string,
  ): Promise<void> {
    if (!valorAtestado) {
      throw new BadRequestException(
        'Valor atestado é obrigatório para aprovação com ressalvas',
      );
    }

    const medido = parseFloat(valorMedido);
    const atestado = parseFloat(valorAtestado);

    if (atestado > medido) {
      throw new BadRequestException(
        `Valor atestado (R$ ${atestado.toFixed(2)}) não pode exceder valor medido (R$ ${medido.toFixed(2)})`,
      );
    }

    if (atestado <= 0) {
      throw new BadRequestException(
        'Valor atestado deve ser maior que zero',
      );
    }
  }

  /**
   * Atualiza o status da medição conforme resultado do ateste.
   *
   * **Workflow:**
   * - APROVADO → status = 'aprovada' + dataAteste
   * - APROVADO_COM_RESSALVAS → status = 'aprovada' + dataAteste
   * - REJEITADO → status = 'pendente' (volta para correção)
   *
   * @param medicao - Medição a ser atualizada
   * @param resultado - Resultado do ateste
   * @param dataAteste - Data do ateste
   */
  private async updateMedicaoStatus(
    medicao: Medicao,
    resultado: AtesteResultado,
    dataAteste: Date,
  ): Promise<void> {
    switch (resultado) {
      case AtesteResultado.APROVADO:
      case AtesteResultado.APROVADO_COM_RESSALVAS:
        medicao.status = MedicaoStatus.APROVADA;
        medicao.dataAteste = dataAteste;
        break;

      case AtesteResultado.REJEITADO:
        medicao.status = MedicaoStatus.REJEITADA;
        medicao.dataAteste = null;
        break;
    }

    await this.medicaoRepo.save(medicao);
  }
}
