## Descrição

Prevenir erros similares ao crash do deploy #374, adicionando tipos explícitos em colunas nullable das entidades restantes.

## Problema

Os seguintes campos não especificam explicitamente o tipo da coluna:

**EtpVersion** (`backend/src/entities/etp-version.entity.ts`):

- Linha 32: campo nullable sem tipo explícito

**Etp** (`backend/src/entities/etp.entity.ts`):

- Linha 39: campo nullable sem tipo explícito

**SecretAccessLog** (`backend/src/entities/secret-access-log.entity.ts`):

- Linha 28: campo nullable sem tipo explícito
- Linha 41: campo nullable sem tipo explícito

**SimilarContract** (`backend/src/entities/similar-contract.entity.ts`):

- Linha 24: campo nullable sem tipo explícito
- Linha 30: campo nullable sem tipo explícito

## Solução

Adicionar o tipo explícito ao decorador:

```typescript
// Antes
@Column({ nullable: true })
fieldName: string;

// Depois
@Column({ type: 'varchar', nullable: true })
fieldName: string;
```

## Arquivos Afetados

- `backend/src/entities/etp-version.entity.ts`
- `backend/src/entities/etp.entity.ts`
- `backend/src/entities/secret-access-log.entity.ts`
- `backend/src/entities/similar-contract.entity.ts`

## Prioridade

🟡 **ALTA** - Prevenir futuros crashes em deploy
