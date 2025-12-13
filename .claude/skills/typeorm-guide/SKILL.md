# TypeORM Guide Skill

## Activation

Esta skill e ativada automaticamente quando voce edita arquivos em `backend/src/entities/` ou trabalha com migrations.

---

## Configuracao do Projeto

- **TypeORM 0.3.19**
- **PostgreSQL 15+**
- **pgvector** (para RAG/embeddings)

---

## Entidades

### Entidade Basica

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;
}
```

### Relacoes

#### One-to-Many / Many-to-One

```typescript
// Organization (One)
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}

// User (Many)
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Organization, (org) => org.users, { nullable: false })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  organizationId: string;
}
```

#### Many-to-Many

```typescript
@Entity('etps')
export class Etp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Tag, (tag) => tag.etps)
  @JoinTable({
    name: 'etp_tags',
    joinColumn: { name: 'etpId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToMany(() => Etp, (etp) => etp.tags)
  etps: Etp[];
}
```

---

## Queries

### Repository Pattern

```typescript
@Injectable()
export class EtpService {
  constructor(
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  // Find com relations
  async findWithSections(id: string): Promise<Etp> {
    return this.etpRepository.findOne({
      where: { id },
      relations: ['sections', 'createdBy', 'organization'],
    });
  }

  // Query Builder
  async findByOrganization(orgId: string): Promise<Etp[]> {
    return this.etpRepository
      .createQueryBuilder('etp')
      .leftJoinAndSelect('etp.sections', 'sections')
      .where('etp.organizationId = :orgId', { orgId })
      .andWhere('etp.deletedAt IS NULL')
      .orderBy('etp.createdAt', 'DESC')
      .getMany();
  }

  // Pagination
  async findPaginated(
    page: number,
    limit: number,
    orgId: string,
  ): Promise<[Etp[], number]> {
    return this.etpRepository.findAndCount({
      where: { organizationId: orgId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Transactions

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class EtpService {
  constructor(private readonly dataSource: DataSource) {}

  async createWithSections(dto: CreateEtpDto): Promise<Etp> {
    return this.dataSource.transaction(async (manager) => {
      // Criar ETP
      const etp = manager.create(Etp, { title: dto.title });
      await manager.save(etp);

      // Criar Sections
      const sections = dto.sections.map((s) =>
        manager.create(Section, { ...s, etpId: etp.id }),
      );
      await manager.save(sections);

      return etp;
    });
  }
}
```

---

## Migrations

### Gerar Migration

```bash
npm run typeorm migration:generate -- -n NomeDaMigration
```

### Estrutura de Migration

```typescript
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEtpsTable1705312800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'etps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'etps',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'etps',
      new TableIndex({
        name: 'IDX_etps_organizationId',
        columnNames: ['organizationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('etps');
  }
}
```

---

## pgvector (Embeddings)

```typescript
@Entity('document_embeddings')
export class DocumentEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'vector', length: 1536 }) // OpenAI ada-002
  embedding: number[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
}

// Query de similaridade
async findSimilar(embedding: number[], limit = 5): Promise<DocumentEmbedding[]> {
  return this.repository.query(
    `SELECT *, embedding <=> $1 as distance
     FROM document_embeddings
     ORDER BY distance
     LIMIT $2`,
    [JSON.stringify(embedding), limit],
  );
}
```

---

## Indices

```typescript
@Entity('etps')
@Index(['organizationId', 'createdAt']) // Indice composto
@Index(['title'], { fulltext: true }) // Full-text search
export class Etp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // Indice simples
  @Column()
  title: string;

  @Column({ type: 'uuid' })
  organizationId: string;
}
```

---

## Regras do Projeto

1. **Sempre use UUID** - Nunca auto-increment
2. **Sempre soft delete** - Use DeleteDateColumn
3. **Sempre timestamps** - createdAt e updatedAt
4. **Sempre indices** - Para foreign keys e campos de busca
5. **Sempre implemente down()** - Migrations reversiveis
6. **Nunca use sync em prod** - Apenas migrations
