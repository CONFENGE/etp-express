## Descrição

Prevenir erros similares ao crash do deploy #374, adicionando tipos explícitos em colunas nullable da entidade AnalyticsEvent.

## Problema

Os seguintes campos em `backend/src/entities/analytics-event.entity.ts` não especificam explicitamente o tipo da coluna:

- Linha 22: `userId: string`
- Linha 26: `sessionId: string`
- Linha 40: `referrer: string`
- Linha 43: `deviceType: string`
- Linha 46: `browser: string`
- Linha 49: `os: string`

## Solução

Adicionar o tipo explícito ao decorador:

```typescript
// Antes
@Column({ nullable: true })
userId: string;

// Depois
@Column({ type: 'varchar', nullable: true })
userId: string;
```

## Arquivos Afetados

- `backend/src/entities/analytics-event.entity.ts` (linhas 22, 26, 40, 43, 46, 49)

## Prioridade

🟡 **ALTA** - Prevenir futuros crashes em deploy
