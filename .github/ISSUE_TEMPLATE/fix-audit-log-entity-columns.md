## Descrição

Prevenir erros similares ao crash do deploy #374, adicionando tipos explícitos em colunas nullable da entidade AuditLog.

## Problema

Os seguintes campos em `backend/src/entities/audit-log.entity.ts` não especificam explicitamente o tipo da coluna:

- Linha 51: `entityId: string`
- Linha 64: `ipAddress: string`
- Linha 67: `userAgent: string`
- Linha 81: `etpId` (foreign key)

Quando você usa union types ou campos nullable sem especificar o tipo explícito, o TypeORM pode falhar ao inferir o tipo correto.

## Solução

Adicionar o tipo explícito ao decorador:

```typescript
// Antes
@Column({ nullable: true })
entityId: string;

// Depois
@Column({ type: 'varchar', nullable: true })
entityId: string;
```

## Arquivos Afetados

- `backend/src/entities/audit-log.entity.ts` (linhas 51, 64, 67, 81)

## Prioridade

 **ALTA** - Prevenir futuros crashes em deploy
