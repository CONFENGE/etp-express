import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEtpDto, ResponsavelTecnicoDto } from './create-etp.dto';

describe('CreateEtpDto', () => {
  const validData = {
    title: 'ETP - Contratação de Serviços de TI',
    objeto:
      'Contratação de empresa especializada em desenvolvimento de sistemas web',
  };

  describe('basic field validation', () => {
    it('should accept valid minimal data (title + objeto)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing title', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        title: undefined,
      });
      const errors = await validate(dto);
      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
    });

    it('should reject missing objeto', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        objeto: undefined,
      });
      const errors = await validate(dto);
      const objetoError = errors.find((e) => e.property === 'objeto');
      expect(objetoError).toBeDefined();
    });
  });

  // ============================================
  // Campos de Identificação (Issue #1223)
  // ============================================

  describe('orgaoEntidade field validation', () => {
    it('should accept valid orgaoEntidade', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        orgaoEntidade: 'Secretaria Municipal de Tecnologia',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject orgaoEntidade shorter than 3 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        orgaoEntidade: 'AB',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'orgaoEntidade');
      expect(error).toBeDefined();
      expect(error?.constraints?.minLength).toContain('3 caracteres');
    });

    it('should reject orgaoEntidade longer than 200 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        orgaoEntidade: 'A'.repeat(201),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'orgaoEntidade');
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('200 caracteres');
    });

    it('should allow omitting orgaoEntidade (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('uasg field validation', () => {
    it('should accept valid 6-digit UASG', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        uasg: '123456',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject UASG with less than 6 digits', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        uasg: '12345',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'uasg');
      expect(error).toBeDefined();
      expect(error?.constraints?.matches).toContain('6 dígitos numéricos');
    });

    it('should reject UASG with more than 6 digits', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        uasg: '1234567',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'uasg');
      expect(error).toBeDefined();
    });

    it('should reject UASG with non-numeric characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        uasg: '12345A',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'uasg');
      expect(error).toBeDefined();
    });

    it('should allow omitting uasg (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('unidadeDemandante field validation', () => {
    it('should accept valid unidadeDemandante', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        unidadeDemandante: 'Departamento de Infraestrutura de TI',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject unidadeDemandante longer than 200 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        unidadeDemandante: 'A'.repeat(201),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'unidadeDemandante');
      expect(error).toBeDefined();
    });

    it('should allow omitting unidadeDemandante (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('responsavelTecnico field validation', () => {
    it('should accept valid responsavelTecnico with nome only', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        responsavelTecnico: {
          nome: 'João da Silva',
        },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid responsavelTecnico with nome and matricula', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        responsavelTecnico: {
          nome: 'João da Silva',
          matricula: '12345',
        },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject responsavelTecnico with nome shorter than 3 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        responsavelTecnico: {
          nome: 'AB',
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject responsavelTecnico with matricula longer than 50 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        responsavelTecnico: {
          nome: 'João da Silva',
          matricula: 'A'.repeat(51),
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow omitting responsavelTecnico (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('dataElaboracao field validation', () => {
    it('should accept valid ISO 8601 date', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        dataElaboracao: '2024-01-15',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept full ISO 8601 datetime', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        dataElaboracao: '2024-01-15T10:30:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        dataElaboracao: '15/01/2024',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'dataElaboracao');
      expect(error).toBeDefined();
      expect(error?.constraints?.isDateString).toContain('ISO 8601');
    });

    it('should reject invalid date string', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        dataElaboracao: 'not-a-date',
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'dataElaboracao');
      expect(error).toBeDefined();
    });

    it('should allow omitting dataElaboracao (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('full ETP creation with all identification fields', () => {
    it('should accept ETP with all identification fields populated', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        description: 'Descrição detalhada do estudo',
        numeroProcesso: '2024/001234',
        valorEstimado: 500000.0,
        orgaoEntidade: 'Secretaria Municipal de Tecnologia',
        uasg: '123456',
        unidadeDemandante: 'Departamento de TI',
        responsavelTecnico: {
          nome: 'João da Silva',
          matricula: '12345',
        },
        dataElaboracao: '2024-01-15',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  // ============================================
  // Campos de Objeto e Justificativa (Issue #1224)
  // ============================================

  describe('descricaoDetalhada field validation', () => {
    it('should accept valid descricaoDetalhada', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        descricaoDetalhada:
          'Contratação de empresa especializada para desenvolvimento e manutenção de sistemas web utilizando tecnologias modernas.',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject descricaoDetalhada longer than 5000 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        descricaoDetalhada: 'A'.repeat(5001),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'descricaoDetalhada');
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('5000 caracteres');
    });

    it('should allow omitting descricaoDetalhada (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('quantidadeEstimada field validation', () => {
    it('should accept valid quantidadeEstimada', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        quantidadeEstimada: 12,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept quantidadeEstimada equal to 1 (minimum)', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        quantidadeEstimada: 1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject quantidadeEstimada less than 1', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        quantidadeEstimada: 0,
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'quantidadeEstimada');
      expect(error).toBeDefined();
      expect(error?.constraints?.min).toContain('1');
    });

    it('should allow omitting quantidadeEstimada (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('unidadeMedida field validation', () => {
    it('should accept valid unidadeMedida', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        unidadeMedida: 'mês',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject unidadeMedida longer than 50 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        unidadeMedida: 'A'.repeat(51),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'unidadeMedida');
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('50 caracteres');
    });

    it('should allow omitting unidadeMedida (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('justificativaContratacao field validation', () => {
    const validJustificativa =
      'A contratação se justifica pela necessidade de modernização dos sistemas legados da instituição, atualmente operando com tecnologias defasadas.';

    it('should accept valid justificativaContratacao (>= 50 chars)', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        justificativaContratacao: validJustificativa,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject justificativaContratacao shorter than 50 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        justificativaContratacao: 'Justificativa curta demais',
      });
      const errors = await validate(dto);
      const error = errors.find(
        (e) => e.property === 'justificativaContratacao',
      );
      expect(error).toBeDefined();
      expect(error?.constraints?.minLength).toContain('50 caracteres');
    });

    it('should reject justificativaContratacao longer than 5000 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        justificativaContratacao: 'A'.repeat(5001),
      });
      const errors = await validate(dto);
      const error = errors.find(
        (e) => e.property === 'justificativaContratacao',
      );
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('5000 caracteres');
    });

    it('should allow omitting justificativaContratacao (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('necessidadeAtendida field validation', () => {
    it('should accept valid necessidadeAtendida', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        necessidadeAtendida:
          'Atender à demanda de 10.000 usuários internos com sistema de gestão integrado.',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject necessidadeAtendida longer than 3000 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        necessidadeAtendida: 'A'.repeat(3001),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'necessidadeAtendida');
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('3000 caracteres');
    });

    it('should allow omitting necessidadeAtendida (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('beneficiosEsperados field validation', () => {
    it('should accept valid beneficiosEsperados', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        beneficiosEsperados:
          'Redução de 30% no tempo de processamento; Aumento de 50% na satisfação dos usuários.',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject beneficiosEsperados longer than 3000 characters', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        beneficiosEsperados: 'A'.repeat(3001),
      });
      const errors = await validate(dto);
      const error = errors.find((e) => e.property === 'beneficiosEsperados');
      expect(error).toBeDefined();
      expect(error?.constraints?.maxLength).toContain('3000 caracteres');
    });

    it('should allow omitting beneficiosEsperados (optional)', async () => {
      const dto = plainToInstance(CreateEtpDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('full ETP creation with all objeto/justificativa fields', () => {
    it('should accept ETP with all objeto/justificativa fields populated', async () => {
      const dto = plainToInstance(CreateEtpDto, {
        ...validData,
        descricaoDetalhada:
          'Contratação de empresa especializada para desenvolvimento e manutenção de sistemas web.',
        quantidadeEstimada: 12,
        unidadeMedida: 'mês',
        justificativaContratacao:
          'A contratação se justifica pela necessidade de modernização dos sistemas legados da instituição, atualmente operando com tecnologias defasadas.',
        necessidadeAtendida:
          'Atender à demanda de 10.000 usuários internos com sistema de gestão integrado.',
        beneficiosEsperados:
          'Redução de 30% no tempo de processamento; Aumento de 50% na satisfação dos usuários.',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('ResponsavelTecnicoDto', () => {
  it('should accept valid data with nome only', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      nome: 'João da Silva',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept valid data with nome and matricula', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      nome: 'João da Silva',
      matricula: '12345',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject missing nome', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      matricula: '12345',
    });
    const errors = await validate(dto);
    const nomeError = errors.find((e) => e.property === 'nome');
    expect(nomeError).toBeDefined();
  });

  it('should reject nome shorter than 3 characters', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      nome: 'AB',
    });
    const errors = await validate(dto);
    const nomeError = errors.find((e) => e.property === 'nome');
    expect(nomeError).toBeDefined();
    expect(nomeError?.constraints?.minLength).toContain('3 caracteres');
  });

  it('should reject nome longer than 200 characters', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      nome: 'A'.repeat(201),
    });
    const errors = await validate(dto);
    const nomeError = errors.find((e) => e.property === 'nome');
    expect(nomeError).toBeDefined();
    expect(nomeError?.constraints?.maxLength).toContain('200 caracteres');
  });

  it('should reject matricula longer than 50 characters', async () => {
    const dto = plainToInstance(ResponsavelTecnicoDto, {
      nome: 'João da Silva',
      matricula: 'A'.repeat(51),
    });
    const errors = await validate(dto);
    const matriculaError = errors.find((e) => e.property === 'matricula');
    expect(matriculaError).toBeDefined();
    expect(matriculaError?.constraints?.maxLength).toContain('50 caracteres');
  });
});
