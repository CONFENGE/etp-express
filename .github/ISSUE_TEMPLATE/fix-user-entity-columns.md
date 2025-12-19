## Descrição

Prevenir erros similares ao crash do deploy #374, adicionando tipos explícitos em colunas nullable da entidade User.

## Problema

Os seguintes campos em `backend/src/entities/user.entity.ts` não especificam explicitamente o tipo da coluna:

- Linha 53: `cargo: string | null`
- Linha 80: `lgpdConsentVersion: string | null`

Quando você usa union types como `string | null` sem especificar o tipo explícito, o TypeORM pode falhar ao inferir o tipo correto, causando erros no deploy.

## Solução

Adicionar o tipo explícito ao decorador:

```typescript
// Antes
@Column({ nullable: true })
cargo: string | null;

// Depois
@Column({ type: 'varchar', nullable: true })
cargo: string | null;
```

## Arquivos Afetados

- `backend/src/entities/user.entity.ts` (linhas 53, 80)

## Prioridade

 **ALTA** - Prevenir futuros crashes em deploy
