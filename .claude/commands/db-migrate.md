---
description: Gerenciamento de migrations TypeORM
allowed-tools: Bash(npm run typeorm:*), Bash(npx typeorm:*), Read, Grep
---

# /db-migrate - Gerenciamento de Migrations TypeORM

Voce e responsavel por gerenciar migrations do banco de dados PostgreSQL usando TypeORM no projeto ETP Express.

---

## Comandos Disponiveis

| Comando    | Descricao                                        |
| ---------- | ------------------------------------------------ |
| `generate` | Gerar migration baseada em mudancas nas entities |
| `create`   | Criar migration vazia                            |
| `run`      | Executar migrations pendentes                    |
| `revert`   | Reverter ultima migration                        |
| `show`     | Mostrar migrations executadas                    |
| `sync`     | Sincronizar schema (APENAS DEV!)                 |

---

## Fluxo de Execucao

### 1. Verificar Status Atual

```bash
cd backend && npm run typeorm migration:show 2>&1
```

### 2. Baseado na Solicitacao

#### Para GERAR migration (mudancas em entities):

```bash
cd backend && npm run typeorm migration:generate -- -n <NomeDaMigration>
```

Exemplo: `npm run typeorm migration:generate -- -n AddUserRoles`

#### Para CRIAR migration vazia:

```bash
cd backend && npm run typeorm migration:create -- -n <NomeDaMigration>
```

#### Para EXECUTAR migrations pendentes:

```bash
cd backend && npm run typeorm migration:run
```

#### Para REVERTER ultima migration:

```bash
cd backend && npm run typeorm migration:revert
```

---

## Convencao de Nomes

Formato: `<timestamp>-<DescricaoPascalCase>.ts`

Exemplos:

- `1705312800000-AddUserRoles.ts`
- `1705312900000-CreateEtpVersionsTable.ts`
- `1705313000000-AddIndexToSections.ts`

Prefixos recomendados:

- `Add` - Adicionar coluna/tabela
- `Create` - Criar tabela nova
- `Remove` - Remover coluna/tabela
- `Rename` - Renomear coluna/tabela
- `Update` - Alterar tipo/constraint
- `AddIndex` - Adicionar indice

---

## Template de Migration

```typescript
import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class NomeDaMigration1705312800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mudancas para aplicar
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'varchar',
        default: "'user'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter mudancas
    await queryRunner.dropColumn('users', 'role');
  }
}
```

---

## Verificacoes Pre-Migration

Antes de executar migrations em producao:

1. **Backup do banco** - Sempre tenha backup
2. **Testar em dev** - Execute primeiro em ambiente dev
3. **Verificar downtime** - Migrations longas podem causar downtime
4. **Revisar SQL** - Verifique o SQL gerado

```bash
# Ver SQL que sera executado
cd backend && npm run typeorm migration:run -- --dry-run
```

---

## Output Esperado

### Para `show`:

```markdown
## Migrations Status

| Migration                      | Executada | Data       |
| ------------------------------ | --------- | ---------- |
| 1705312800000-CreateUsersTable | ✅        | 2025-01-15 |
| 1705312900000-CreateEtpsTable  | ✅        | 2025-01-15 |
| 1705313000000-AddUserRoles     | ⏳        | Pendente   |

**Pendentes:** 1 migration(s)
**Executadas:** 2 migration(s)
```

### Para `run`:

```markdown
## Migration Executada

✅ **1705313000000-AddUserRoles** executada com sucesso

**Mudancas aplicadas:**

- Adicionada coluna `role` na tabela `users`

**Tempo:** 0.234s

Para reverter: `npm run typeorm migration:revert`
```

### Para `generate`:

```markdown
## Migration Gerada

📝 **1705313100000-AddSectionStatus.ts** criada

**Mudancas detectadas:**

- Nova coluna `status` em `sections`
- Novo enum `SectionStatus`

**Arquivo:** `backend/src/migrations/1705313100000-AddSectionStatus.ts`

**Proximo passo:** Revisar o arquivo e executar `npm run typeorm migration:run`
```

---

## Regras de Seguranca

1. **NUNCA use sync em producao** - Pode perder dados
2. **Sempre implemente down()** - Para poder reverter
3. **Teste reverter** - Execute `revert` apos `run` em dev
4. **Migrations sao imutaveis** - Nunca edite migrations ja executadas
5. **Uma mudanca por migration** - Facilita rollback

---

## Troubleshooting

### Erro: "Migration already exists"

```bash
# Verificar se migration ja foi executada
npm run typeorm migration:show

# Se executada mas nao deveria, revert
npm run typeorm migration:revert
```

### Erro: "Cannot find entity"

```bash
# Verificar se entity esta registrada no TypeORM config
grep -r "entities:" backend/src/config
```

### Erro: "Relation does not exist"

```bash
# Verificar ordem das migrations - dependencias primeiro
npm run typeorm migration:show
```

---

## Exemplo de Uso

````
Usuario: /db-migrate generate AddOrganizationToEtp

Assistente:
Gerando migration para adicionar Organization ao ETP...

```bash
cd backend && npm run typeorm migration:generate -- -n AddOrganizationToEtp
````

## Migration Gerada

📝 **1705313200000-AddOrganizationToEtp.ts** criada

**Mudancas detectadas:**

- Nova coluna `organizationId` em `etps`
- Nova foreign key para `organizations`

**Arquivo:** `backend/src/migrations/1705313200000-AddOrganizationToEtp.ts`

Deseja revisar o arquivo gerado?

```

```
