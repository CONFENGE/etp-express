import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentoFiscalizacaoService } from './documento-fiscalizacao.service';
import {
  DocumentoFiscalizacao,
  DocumentoFiscalizacaoTipo,
} from '../../../entities/documento-fiscalizacao.entity';
import { CreateDocumentoFiscalizacaoDto } from '../dto/create-documento-fiscalizacao.dto';

describe('DocumentoFiscalizacaoService', () => {
  let service: DocumentoFiscalizacaoService;
  let repository: Repository<DocumentoFiscalizacao>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentoFiscalizacaoService,
        {
          provide: getRepositoryToken(DocumentoFiscalizacao),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentoFiscalizacaoService>(
      DocumentoFiscalizacaoService,
    );
    repository = module.get<Repository<DocumentoFiscalizacao>>(
      getRepositoryToken(DocumentoFiscalizacao),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDto: CreateDocumentoFiscalizacaoDto = {
      tipoEntidade: DocumentoFiscalizacaoTipo.MEDICAO,
      entidadeId: '123e4567-e89b-12d3-a456-426614174000',
      nomeArquivo: 'boletim-medicao.pdf',
      caminhoArquivo: 'contracts/uuid/fiscalizacao/medicao/uuid/boletim.pdf',
      tamanho: 2048576, // 2MB
      mimeType: 'application/pdf',
      uploadedById: '123e4567-e89b-12d3-a456-426614174001',
    };

    it('should create documento successfully', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(validDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...validDto });

      const result = await service.create(validDto);

      expect(result).toHaveProperty('id');
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          tipoEntidade: validDto.tipoEntidade,
          entidadeId: validDto.entidadeId,
        },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(validDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid MIME type', async () => {
      const invalidDto = { ...validDto, mimeType: 'application/exe' };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        /Tipo de arquivo não permitido/,
      );
    });

    it('should reject file exceeding max size (10MB)', async () => {
      const invalidDto = { ...validDto, tamanho: 11 * 1024 * 1024 }; // 11MB

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        /Arquivo excede o tamanho máximo/,
      );
    });

    it('should reject when max files limit reached (5)', async () => {
      mockRepository.count.mockResolvedValue(5);

      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        /Limite de 5 arquivos por entidade atingido/,
      );
    });

    it('should accept PDF files', async () => {
      const pdfDto = { ...validDto, mimeType: 'application/pdf' };
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(pdfDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...pdfDto });

      await expect(service.create(pdfDto)).resolves.not.toThrow();
    });

    it('should accept JPEG files', async () => {
      const jpegDto = { ...validDto, mimeType: 'image/jpeg' };
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(jpegDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...jpegDto });

      await expect(service.create(jpegDto)).resolves.not.toThrow();
    });

    it('should accept PNG files', async () => {
      const pngDto = { ...validDto, mimeType: 'image/png' };
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(pngDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...pngDto });

      await expect(service.create(pngDto)).resolves.not.toThrow();
    });

    it('should accept DOCX files', async () => {
      const docxDto = {
        ...validDto,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(docxDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...docxDto });

      await expect(service.create(docxDto)).resolves.not.toThrow();
    });

    it('should accept XLSX files', async () => {
      const xlsxDto = {
        ...validDto,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(xlsxDto);
      mockRepository.save.mockResolvedValue({ id: 'doc-uuid', ...xlsxDto });

      await expect(service.create(xlsxDto)).resolves.not.toThrow();
    });
  });

  describe('findByEntidade', () => {
    it('should return documents for an entity', async () => {
      const mockDocuments = [
        { id: 'doc-1', nomeArquivo: 'file1.pdf' },
        { id: 'doc-2', nomeArquivo: 'file2.pdf' },
      ];
      mockRepository.find.mockResolvedValue(mockDocuments);

      const result = await service.findByEntidade('medicao', 'entity-uuid');

      expect(result).toEqual(mockDocuments);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          tipoEntidade: 'medicao',
          entidadeId: 'entity-uuid',
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });

    it('should return empty array when no documents found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByEntidade('medicao', 'entity-uuid');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return documento when found', async () => {
      const mockDocumento = { id: 'doc-uuid', nomeArquivo: 'file.pdf' };
      mockRepository.findOne.mockResolvedValue(mockDocumento);

      const result = await service.findOne('doc-uuid');

      expect(result).toEqual(mockDocumento);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        /Documento .* não encontrado/,
      );
    });
  });

  describe('remove', () => {
    it('should remove documento successfully', async () => {
      const mockDocumento = {
        id: 'doc-uuid',
        uploadedById: 'user-uuid',
        caminhoArquivo: 'path/to/file.pdf',
      };
      mockRepository.findOne.mockResolvedValue(mockDocumento);
      mockRepository.remove.mockResolvedValue(mockDocumento);

      // Mock deleteFile to not fail
      jest.spyOn(service as any, 'deleteFile').mockResolvedValue(undefined);

      await service.remove('doc-uuid', 'user-uuid');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockDocumento);
    });

    it('should throw ForbiddenException when user is not uploader', async () => {
      const mockDocumento = {
        id: 'doc-uuid',
        uploadedById: 'other-user-uuid',
        caminhoArquivo: 'path/to/file.pdf',
      };
      mockRepository.findOne.mockResolvedValue(mockDocumento);

      await expect(service.remove('doc-uuid', 'user-uuid')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove('doc-uuid', 'user-uuid')).rejects.toThrow(
        /Apenas o usuário que fez upload pode remover/,
      );
    });

    it('should remove document even if file deletion fails', async () => {
      const mockDocumento = {
        id: 'doc-uuid',
        uploadedById: 'user-uuid',
        caminhoArquivo: 'path/to/file.pdf',
      };
      mockRepository.findOne.mockResolvedValue(mockDocumento);
      mockRepository.remove.mockResolvedValue(mockDocumento);

      // Mock deleteFile to fail
      jest
        .spyOn(service as any, 'deleteFile')
        .mockRejectedValue(new Error('File not found'));

      await expect(
        service.remove('doc-uuid', 'user-uuid'),
      ).resolves.not.toThrow();
      expect(mockRepository.remove).toHaveBeenCalledWith(mockDocumento);
    });
  });

  describe('generateStoragePath', () => {
    it('should generate correct storage path', () => {
      const path = service.generateStoragePath(
        'contrato-uuid',
        'medicao',
        'entidade-uuid',
        'file.pdf',
      );

      expect(path).toContain('contracts');
      expect(path).toContain('contrato-uuid');
      expect(path).toContain('fiscalizacao');
      expect(path).toContain('medicao');
      expect(path).toContain('entidade-uuid');
      expect(path).toContain('file.pdf');
    });
  });
});
