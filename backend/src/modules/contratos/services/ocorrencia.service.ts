import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Ocorrencia,
  OcorrenciaGravidade,
} from '../../../entities/ocorrencia.entity';
import { Contrato } from '../../../entities/contrato.entity';
import { CreateOcorrenciaDto } from '../dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from '../dto/update-ocorrencia.dto';

/**
 * Service responsável pela gestão de Ocorrências de Contratos.
 *
 * Fornece métodos para criar, listar, atualizar e deletar ocorrências,
 * com validações de negócio conforme Lei 14.133/2021 Art. 117 e 156.
 *
 * **Validações Implementadas:**
 * - Descrição obrigatória com mínimo 20 caracteres
 * - Gravidade CRÍTICA requer ação corretiva obrigatória
 * - Apenas fiscal/gestor pode registrar ocorrências
 * - Validação de existência do contrato
 *
 * **Issue #1642** - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 156 - Sanções administrativas
 */
@Injectable()
export class OcorrenciaService {
  constructor(
    @InjectRepository(Ocorrencia)
    private readonly ocorrenciaRepo: Repository<Ocorrencia>,
    @InjectRepository(Contrato)
    private readonly contratoRepo: Repository<Contrato>,
  ) {}

  /**
   * Cria uma nova ocorrência para um contrato.
   *
   * **Validações:**
   * - Contrato deve existir
   * - Descrição deve ter no mínimo 20 caracteres
   * - Gravidade CRÍTICA requer ação corretiva obrigatória
   * - Usuário deve ser fiscal ou gestor do contrato
   *
   * @param contratoId - UUID do contrato
   * @param createDto - Dados da ocorrência
   * @param userId - UUID do usuário criador
   * @returns {Promise<Ocorrencia>} Ocorrência criada
   * @throws {NotFoundException} Se contrato não existe
   * @throws {ForbiddenException} Se usuário não é fiscal/gestor
   * @throws {BadRequestException} Se validações falham
   */
  async create(
    contratoId: string,
    createDto: CreateOcorrenciaDto,
    userId: string,
  ): Promise<Ocorrencia> {
    // Validar contrato existe
    const contrato = await this.contratoRepo.findOne({
      where: { id: contratoId },
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    }

    // Validar usuário é fiscal ou gestor do contrato
    if (
      contrato.fiscalResponsavelId !== userId &&
      contrato.gestorResponsavelId !== userId
    ) {
      throw new ForbiddenException(
        'Apenas o fiscal ou gestor responsável pode registrar ocorrências',
      );
    }

    // Validar gravidade CRÍTICA requer ação corretiva
    if (
      createDto.gravidade === OcorrenciaGravidade.CRITICA &&
      !createDto.acaoCorretiva
    ) {
      throw new BadRequestException(
        'Ocorrências de gravidade CRÍTICA requerem ação corretiva obrigatória',
      );
    }

    // Criar ocorrência
    const ocorrencia = this.ocorrenciaRepo.create({
      contratoId,
      tipo: createDto.tipo,
      gravidade: createDto.gravidade,
      dataOcorrencia: createDto.dataOcorrencia,
      descricao: createDto.descricao,
      acaoCorretiva: createDto.acaoCorretiva,
      prazoResolucao: createDto.prazoResolucao,
      registradoPorId: userId,
    });

    return this.ocorrenciaRepo.save(ocorrencia);
  }

  /**
   * Lista todas as ocorrências de um contrato.
   *
   * @param contratoId - UUID do contrato
   * @returns {Promise<Ocorrencia[]>} Lista de ocorrências
   */
  async findAllByContrato(contratoId: string): Promise<Ocorrencia[]> {
    return this.ocorrenciaRepo.find({
      where: { contratoId },
      order: { dataOcorrencia: 'DESC' },
    });
  }

  /**
   * Busca uma ocorrência por ID.
   *
   * @param id - UUID da ocorrência
   * @returns {Promise<Ocorrencia>} Ocorrência encontrada
   * @throws {NotFoundException} Se ocorrência não existe
   */
  async findOne(id: string): Promise<Ocorrencia> {
    const ocorrencia = await this.ocorrenciaRepo.findOne({
      where: { id },
    });

    if (!ocorrencia) {
      throw new NotFoundException(`Ocorrência ${id} não encontrada`);
    }

    return ocorrencia;
  }

  /**
   * Atualiza uma ocorrência existente.
   *
   * **Restrições:**
   * - Se alterar para gravidade CRÍTICA, ação corretiva é obrigatória
   * - Validação de permissões (fiscal/gestor)
   *
   * @param id - UUID da ocorrência
   * @param updateDto - Dados para atualização
   * @param userId - UUID do usuário
   * @returns {Promise<Ocorrencia>} Ocorrência atualizada
   * @throws {NotFoundException} Se ocorrência não existe
   * @throws {ForbiddenException} Se usuário não tem permissão
   * @throws {BadRequestException} Se gravidade CRÍTICA sem ação corretiva
   */
  async update(
    id: string,
    updateDto: UpdateOcorrenciaDto,
    userId: string,
  ): Promise<Ocorrencia> {
    const ocorrencia = await this.findOne(id);

    // Validar usuário é fiscal ou gestor do contrato
    const contrato = ocorrencia.contrato;
    if (
      contrato.fiscalResponsavelId !== userId &&
      contrato.gestorResponsavelId !== userId
    ) {
      throw new ForbiddenException(
        'Apenas o fiscal ou gestor responsável pode editar ocorrências',
      );
    }

    // Validar gravidade CRÍTICA requer ação corretiva
    const novaGravidade = updateDto.gravidade || ocorrencia.gravidade;
    const novaAcaoCorretiva =
      updateDto.acaoCorretiva !== undefined
        ? updateDto.acaoCorretiva
        : ocorrencia.acaoCorretiva;

    if (novaGravidade === OcorrenciaGravidade.CRITICA && !novaAcaoCorretiva) {
      throw new BadRequestException(
        'Ocorrências de gravidade CRÍTICA requerem ação corretiva obrigatória',
      );
    }

    // Atualizar campos
    Object.assign(ocorrencia, updateDto);

    return this.ocorrenciaRepo.save(ocorrencia);
  }

  /**
   * Remove uma ocorrência.
   *
   * **Restrições:**
   * - Apenas fiscal/gestor pode remover
   *
   * @param id - UUID da ocorrência
   * @param userId - UUID do usuário
   * @throws {NotFoundException} Se ocorrência não existe
   * @throws {ForbiddenException} Se usuário não tem permissão
   */
  async remove(id: string, userId: string): Promise<void> {
    const ocorrencia = await this.findOne(id);

    // Validar usuário é fiscal ou gestor do contrato
    const contrato = ocorrencia.contrato;
    if (
      contrato.fiscalResponsavelId !== userId &&
      contrato.gestorResponsavelId !== userId
    ) {
      throw new ForbiddenException(
        'Apenas o fiscal ou gestor responsável pode remover ocorrências',
      );
    }

    await this.ocorrenciaRepo.remove(ocorrencia);
  }
}
