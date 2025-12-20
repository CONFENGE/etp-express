## Context

<!-- Por que esta mudanca e necessaria? Qual problema resolve? -->

## Changes

<!-- Lista das principais mudancas realizadas -->

-

## Testing

<!-- Descreva como as mudancas foram testadas -->

- [ ] Testes unitarios adicionados/atualizados
- [ ] Testes de integracao passando
- [ ] Teste manual realizado localmente
- [ ] Coverage nao diminuiu

## Pre-Deploy Checklist

<!-- Marque os itens verificados. Ref: docs/PRE_DEPLOY_CHECKLIST.md -->

### Obrigatorio

- [ ] `npm test` passa no backend
- [ ] `npm test` passa no frontend
- [ ] `npm run build` completa sem erros
- [ ] `npm run lint` sem erros criticos
- [ ] `npm audit --audit-level=high` sem vulnerabilidades

### Se aplicavel

- [ ] Migrations testadas localmente (se houver)
- [ ] Variaveis de ambiente documentadas (se novas)
- [ ] Breaking changes documentados
- [ ] Documentacao atualizada

## Risks

<!-- Riscos tecnicos ou impactos potenciais desta mudanca -->

## Rollback Plan

<!-- Como reverter se necessario? -->

## Related

<!-- Issues relacionadas -->

Closes #

---

**Pre-deploy checklist completo:** [docs/PRE_DEPLOY_CHECKLIST.md](../docs/PRE_DEPLOY_CHECKLIST.md)
