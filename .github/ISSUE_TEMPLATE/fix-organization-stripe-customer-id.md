## Descrição

O deploy no Railway está crashando devido a um erro do TypeORM:

```
DataTypeNotSupportedError: Data type "Object" in "Organization.stripeCustomerId" is not supported by "postgres" database.
```

## Causa Raiz

Em `backend/src/entities/organization.entity.ts:74`, o campo `stripeCustomerId` não especifica explicitamente o tipo da coluna:

```typescript
@Column({ nullable: true })
stripeCustomerId: string | null;
```

Quando você usa union types como `string | null` sem especificar o tipo explícito, o TypeORM pode falhar ao inferir o tipo correto.

## Solução

Adicionar o tipo explícito ao decorador:

```typescript
@Column({ type: 'varchar', nullable: true })
stripeCustomerId: string | null;
```

## Arquivo Afetado

- `backend/src/entities/organization.entity.ts` (linha 74)

## Prioridade

 **CRÍTICA** - Bloqueia deploy em produção
