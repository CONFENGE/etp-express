# NestJS Patterns Skill

## Activation

Esta skill e ativada automaticamente quando voce edita arquivos em `backend/src/`.

---

## Padroes do Projeto ETP Express

### Estrutura de Modulos

```
backend/src/modules/<modulo>/
├── <modulo>.module.ts # Definicao do modulo
├── <modulo>.controller.ts # Endpoints REST
├── <modulo>.service.ts # Business logic
├── dto/
│ ├── create-<modulo>.dto.ts
│ └── update-<modulo>.dto.ts
├── entities/
│ └── <modulo>.entity.ts
└── <modulo>.spec.ts # Testes unitarios
```

### Controllers

```typescript
import {
 Controller,
 Get,
 Post,
 Body,
 Param,
 UseGuards,
 HttpCode,
 HttpStatus,
} from '@nestjs/common';
import {
 ApiTags,
 ApiOperation,
 ApiResponse,
 ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('modulo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modulo')
export class ModuloController {
 constructor(private readonly service: ModuloService) {}

 @Get()
 @ApiOperation({ summary: 'Listar todos' })
 @ApiResponse({ status: 200, description: 'Lista retornada' })
 async findAll() {
 return this.service.findAll();
 }

 @Post()
 @HttpCode(HttpStatus.CREATED)
 @ApiOperation({ summary: 'Criar novo' })
 @ApiResponse({ status: 201, description: 'Criado com sucesso' })
 async create(@Body() dto: CreateModuloDto) {
 return this.service.create(dto);
 }
}
```

### Services

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ModuloService {
 private readonly logger = new Logger(ModuloService.name);

 constructor(
 @InjectRepository(ModuloEntity)
 private readonly repository: Repository<ModuloEntity>,
 ) {}

 async findAll(): Promise<ModuloEntity[]> {
 this.logger.log('Buscando todos os registros');
 return this.repository.find();
 }

 async findOne(id: string): Promise<ModuloEntity> {
 const entity = await this.repository.findOne({ where: { id } });
 if (!entity) {
 throw new NotFoundException(`Registro ${id} nao encontrado`);
 }
 return entity;
 }
}
```

### DTOs com Validacao

```typescript
import {
 IsString,
 IsNotEmpty,
 IsOptional,
 IsUUID,
 MaxLength,
 MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuloDto {
 @ApiProperty({ description: 'Nome do modulo', example: 'Modulo Exemplo' })
 @IsString()
 @IsNotEmpty()
 @MinLength(3)
 @MaxLength(100)
 name: string;

 @ApiPropertyOptional({ description: 'Descricao opcional' })
 @IsString()
 @IsOptional()
 @MaxLength(500)
 description?: string;

 @ApiProperty({ description: 'ID da organizacao' })
 @IsUUID()
 @IsNotEmpty()
 organizationId: string;
}
```

### Guards Customizados

```typescript
import {
 Injectable,
 CanActivate,
 ExecutionContext,
 ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
 canActivate(context: ExecutionContext): boolean {
 const request = context.switchToHttp().getRequest();
 const user = request.user;
 const organizationId =
 request.params.organizationId || request.body.organizationId;

 if (user.organizationId !== organizationId) {
 throw new ForbiddenException('Acesso negado a esta organizacao');
 }

 return true;
 }
}
```

### Exception Filters

```typescript
import {
 ExceptionFilter,
 Catch,
 ArgumentsHost,
 HttpException,
 Logger,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
 private readonly logger = new Logger(HttpExceptionFilter.name);

 catch(exception: HttpException, host: ArgumentsHost) {
 const ctx = host.switchToHttp();
 const response = ctx.getResponse();
 const request = ctx.getRequest();
 const status = exception.getStatus();

 this.logger.error(
 `${request.method} ${request.url} - ${status}`,
 exception.stack,
 );

 response.status(status).json({
 statusCode: status,
 timestamp: new Date().toISOString(),
 path: request.url,
 message: exception.message,
 });
 }
}
```

### Testes Unitarios

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('ModuloService', () => {
 let service: ModuloService;
 let repository: Repository<ModuloEntity>;

 const mockRepository = {
 find: jest.fn(),
 findOne: jest.fn(),
 save: jest.fn(),
 delete: jest.fn(),
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [
 ModuloService,
 {
 provide: getRepositoryToken(ModuloEntity),
 useValue: mockRepository,
 },
 ],
 }).compile();

 service = module.get<ModuloService>(ModuloService);
 repository = module.get<Repository<ModuloEntity>>(
 getRepositoryToken(ModuloEntity),
 );
 });

 it('should be defined', () => {
 expect(service).toBeDefined();
 });

 describe('findAll', () => {
 it('should return array of entities', async () => {
 const expected = [{ id: '1', name: 'Test' }];
 mockRepository.find.mockResolvedValue(expected);

 const result = await service.findAll();

 expect(result).toEqual(expected);
 expect(mockRepository.find).toHaveBeenCalled();
 });
 });
});
```

---

## Regras do Projeto

1. **Sempre use Guards** - JwtAuthGuard no minimo
2. **Sempre valide DTOs** - class-validator obrigatorio
3. **Sempre documente API** - Swagger decorators
4. **Sempre use Logger** - NestJS Logger, nao console.log
5. **Sempre trate erros** - Exceptions apropriadas
6. **Sempre escreva testes** - Coverage minimo 70%
