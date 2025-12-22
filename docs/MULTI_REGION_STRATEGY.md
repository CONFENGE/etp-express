# Multi-Region Disaster Recovery Strategy

**Documento:** MULTI_REGION_STRATEGY.md
**Versao:** 1.0
**Criado:** 2025-12-22
**Status:** Planejamento Estrategico

---

## Indice

- [Sumario Executivo](#sumario-executivo)
- [Arquitetura Atual](#arquitetura-atual)
- [Estrategias de Replicacao](#estrategias-de-replicacao)
- [Database Sync](#database-sync)
- [Failover Procedures](#failover-procedures)
- [Analise de Custos](#analise-de-custos)
- [Timeline de Implementacao](#timeline-de-implementacao)
- [Recomendacoes](#recomendacoes)

---

## Sumario Executivo

Este documento descreve a estrategia de Disaster Recovery multi-regiao para o ETP Express. O objetivo e garantir alta disponibilidade e resiliencia em cenarios de falha regional, permitindo continuidade de negocios para clientes enterprise.

### Gatilhos para Implementacao

Implementar multi-regiao quando qualquer condicao for atendida:

| Gatilho                 | Valor Atual | Threshold  |
| ----------------------- | ----------- | ---------- |
| Usuarios Concorrentes   | ~100        | >10,000    |
| Audiencia Internacional | Brasil      | Multi-pais |
| SLA Contratual          | 99%         | 99.9%+     |
| Receita Recorrente      | MVP         | >R$50k/mes |

### Metricas Alvo

| Metrica              | Valor Atual | Objetivo Multi-Region      |
| -------------------- | ----------- | -------------------------- |
| Availability         | 99%         | 99.9% (8.76h downtime/ano) |
| RTO (Recovery Time)  | 4h          | 15 min                     |
| RPO (Recovery Point) | 24h         | 5 min                      |
| Latencia Global      | 200-500ms   | <100ms                     |

---

## Arquitetura Atual

### Single-Region (Railway - US-West)

```
                    INTERNET
                        |
                        v
              +------------------+
              |  Railway LB      |
              |  (US-West)       |
              +--------+---------+
                       |
         +-------------+-------------+
         |             |             |
         v             v             v
    +--------+    +--------+    +----------+
    |Frontend|    |Backend |    |PostgreSQL|
    | (React)|    |(NestJS)|    |  (15)    |
    +--------+    +--------+    +----------+
                       |
                       v
               +--------------+
               | External APIs|
               | OpenAI, Exa  |
               +--------------+
```

### Limitacoes Atuais

1. **Single Point of Failure:** Regiao unica
2. **Latencia:** Usuarios fora US-West experimentam 200-500ms
3. **DR Manual:** Recovery requer intervencao humana
4. **Backup:** RPO 24h (backup diario)

---

## Estrategias de Replicacao

### Opcao 1: Active-Passive (Cold Standby)

**Descricao:** Regiao secundaria inativa, ativada apenas em caso de falha.

```
   PRIMARY (US-West)              STANDBY (US-East)
   +---------------+              +---------------+
   |   Railway     |              |   Railway     |
   | Active Stack  |   Backup     | Cold Stack    |
   | BE + FE + DB  |------------->| (Dormant)     |
   +---------------+   (Daily)    +---------------+
         ^                              |
         |                              | (Activate on failure)
         +------------------------------+
```

**Pros:**

- Custo mais baixo (~30% adicional)
- Simples de implementar
- Backup garantido

**Cons:**

- RTO alto (30-60 min para ativar)
- RPO 24h (backup diario)
- Requer intervencao manual

**Custo Estimado:** +$50-80/mes

---

### Opcao 2: Active-Passive (Warm Standby)

**Descricao:** Regiao secundaria com infraestrutura pronta, sincronizacao continua.

```
   PRIMARY (US-West)              STANDBY (US-East)
   +---------------+              +---------------+
   |   Railway     |   Streaming  |   Railway     |
   | Active Stack  |   Replication| Warm Stack    |
   | BE + FE + DB  |------------->| BE + FE + DB  |
   +---------------+   (5 min)    +---------------+
         ^                              |
         |                              | (Auto-failover)
         +------------------------------+
                   DNS Switch
```

**Pros:**

- RTO 5-15 min
- RPO 5 min (replicacao streaming)
- Pode ser automatizado

**Cons:**

- Custo moderado (~80% adicional)
- Complexidade de setup
- PostgreSQL logical replication

**Custo Estimado:** +$150-250/mes

---

### Opcao 3: Active-Active (Multi-Master)

**Descricao:** Ambas regioes servindo trafego, sincronizacao bi-direcional.

```
                    GLOBAL LOAD BALANCER
                    (Cloudflare/Route53)
                            |
              +-------------+-------------+
              |                           |
              v                           v
   PRIMARY (US-West)              PRIMARY (US-East)
   +---------------+              +---------------+
   |   Railway     |   Bi-Dir     |   Railway     |
   | Active Stack  |<------------>| Active Stack  |
   | BE + FE + DB  |   Sync       | BE + FE + DB  |
   +---------------+              +---------------+
```

**Pros:**

- RTO ~0 (sem failover, ambos ativos)
- RPO ~0 (sincronizacao em tempo real)
- Latencia otimizada (geo-routing)
- Capacidade dobrada

**Cons:**

- Custo alto (100%+ adicional)
- Complexidade extrema
- Conflitos de dados (write-write)
- Requer CockroachDB ou similar

**Custo Estimado:** +$400-800/mes

---

### Recomendacao: Warm Standby (Opcao 2)

**Justificativa:**

- Melhor custo-beneficio para fase atual
- RTO/RPO atendem SLA 99.9%
- Complexidade gerenciavel
- Caminho de upgrade para Active-Active

---

## Database Sync

### Estrategia 1: PostgreSQL Logical Replication

**Arquitetura:**

```
PRIMARY DB (US-West)          REPLICA DB (US-East)
+------------------+          +------------------+
| PostgreSQL 15    |  WAL     | PostgreSQL 15    |
| (Write + Read)   |--------->| (Read-only)      |
+------------------+ Streaming+------------------+
```

**Configuracao:**

```sql
-- PRIMARY: Habilitar logical replication
ALTER SYSTEM SET wal_level = logical;
ALTER SYSTEM SET max_replication_slots = 4;
ALTER SYSTEM SET max_wal_senders = 4;

-- REPLICA: Criar subscription
CREATE SUBSCRIPTION replica_sub
CONNECTION 'host=primary-db port=5432 dbname=etp_express user=replication'
PUBLICATION all_tables;
```

**Pros:**

- Nativo PostgreSQL
- Baixa latencia (segundos)
- Seletivo (tabelas especificas)

**Cons:**

- DDL nao replicado automaticamente
- Requer Railway PostgreSQL custom
- Custo de transfer de dados

**RPO:** ~5-10 segundos

---

### Estrategia 2: AWS DMS (Database Migration Service)

**Arquitetura:**

```
PRIMARY DB (Railway)          DMS Task          REPLICA DB (RDS)
+------------------+          +------+          +------------------+
| PostgreSQL 15    |--------->| CDC  |--------->| PostgreSQL 15    |
| (Railway)        |          | Task |          | (AWS US-East)    |
+------------------+          +------+          +------------------+
```

**Pros:**

- Gerenciado (zero manutencao)
- Change Data Capture (CDC) continuo
- Cross-cloud (Railway -> AWS)

**Cons:**

- Custo AWS DMS (~$100/mes)
- Latencia adicional (15-30s)
- Lock-in AWS

**RPO:** ~15-30 segundos

---

### Estrategia 3: pgBackRest + S3

**Arquitetura:**

```
PRIMARY DB (Railway)          S3 Bucket         REPLICA DB
+------------------+          +-------+         +------------------+
| PostgreSQL 15    |  WAL     | WAL   |  Restore| PostgreSQL 15    |
| + pgBackRest     |--------->|Archive|-------->| + pgBackRest     |
+------------------+  Push    +-------+  Pull   +------------------+
```

**Pros:**

- Custo baixo (S3 storage)
- Point-in-time recovery
- Resiliente (WAL em S3)

**Cons:**

- RPO maior (5-15 min)
- Recovery manual
- Complexidade de setup

**RPO:** ~5-15 minutos

---

### Recomendacao: PostgreSQL Logical Replication

**Justificativa:**

- Menor RPO (segundos)
- Nativo PostgreSQL (sem dependencias)
- Melhor custo-beneficio
- Suportado por provedores gerenciados (Supabase, Neon)

---

## Failover Procedures

### Deteccao de Falha

**Health Checks (automaticos):**

```yaml
# cloudflare-workers/health-check.js
export default {
async scheduled(event, env, ctx) {
const regions = ['us-west', 'us-east'];
for (const region of regions) {
const health = await fetch(`https://${region}.etpexpress.com/api/health`);
if (!health.ok) {
await triggerFailover(region);
}
}
}
}
```

**Alertas (PagerDuty/Opsgenie):**

```yaml
alert: RegionDown
expr: probe_success{job="etpexpress"} == 0
for: 2m
labels:
  severity: critical
annotations:
  summary: 'Regiao {{ $labels.region }} indisponivel'
  runbook: 'docs/MULTI_REGION_STRATEGY.md#failover-manual'
```

---

### Failover Automatico

**Fluxo:**

```
1. Health check falha (3x consecutivas)
           |
           v
2. Cloudflare detecta unhealthy
           |
           v
3. DNS atualizado (TTL 30s)
           |
           v
4. Trafego redirecionado para standby
           |
           v
5. Alerta enviado para equipe
           |
           v
6. Standby promovido a primary
```

**Implementacao (Cloudflare Load Balancing):**

```json
{
  "pools": [
    {
      "name": "us-west-primary",
      "origins": [{ "address": "us-west.etpexpress.com" }],
      "health_check": "/api/health"
    },
    {
      "name": "us-east-standby",
      "origins": [{ "address": "us-east.etpexpress.com" }],
      "health_check": "/api/health"
    }
  ],
  "fallback_pool": "us-east-standby",
  "steering_policy": "dynamic_latency"
}
```

---

### Failover Manual

**Runbook (10-15 min):**

```bash
# 1. Confirmar falha do primary
curl -s https://us-west.etpexpress.com/api/health || echo "PRIMARY DOWN"

# 2. Verificar saude do standby
curl -s https://us-east.etpexpress.com/api/health | jq .

# 3. Promover replica a primary (se usando logical replication)
psql -h us-east-db -U admin -d etp_express -c "
  SELECT pg_promote();
"

# 4. Atualizar DNS (Cloudflare API)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"content": "us-east.etpexpress.com"}'

# 5. Atualizar variaveis de ambiente
railway variables set DATABASE_URL="postgresql://...us-east..."

# 6. Redeploy backend
railway redeploy --service backend

# 7. Notificar equipe
curl -X POST "https://hooks.slack.com/services/..." \
  -d '{"text": "FAILOVER COMPLETO: Primary agora e US-East"}'
```

---

### Failback Procedure

**Apos restauracao do primary original:**

```bash
# 1. Sincronizar dados do novo primary para antigo
pg_dump -h us-east-db | psql -h us-west-db

# 2. Configurar replicacao reversa
# us-west agora e replica de us-east

# 3. Testar health do us-west
curl https://us-west.etpexpress.com/api/health

# 4. Gradualmente migrar trafego (canary)
# 10% -> 25% -> 50% -> 100%

# 5. Promover us-west a primary novamente

# 6. Restaurar topologia original
```

---

## Analise de Custos

### Comparativo de Opcoes

| Item                 | Single-Region | Cold Standby | Warm Standby | Active-Active |
| -------------------- | ------------- | ------------ | ------------ | ------------- |
| **Railway Backend**  | $30           | $30 + $15    | $30 + $30    | $60 + $60     |
| **Railway Frontend** | $20           | $20 + $10    | $20 + $20    | $40 + $40     |
| **PostgreSQL**       | $25           | $25 + $15    | $25 + $25    | Nao suportado |
| **Database Sync**    | $0            | $0           | $20          | $100+         |
| **Load Balancer**    | $0            | $0           | $20          | $50           |
| **DNS (Cloudflare)** | Free          | Free         | $20          | $50           |
| **Monitoring Extra** | $0            | $10          | $30          | $50           |
| **Total/mes**        | **$75**       | **$125**     | **$240**     | **$550+**     |
| **Overhead**         | -             | +67%         | +220%        | +633%         |

### Detalhamento Warm Standby (Recomendado)

| Componente          | Provider             | Custo/mes    | Notas               |
| ------------------- | -------------------- | ------------ | ------------------- |
| Primary Backend     | Railway Pro          | $30          | 1GB RAM, 1 vCPU     |
| Primary Frontend    | Railway Pro          | $20          | Static hosting      |
| Primary Database    | Railway PostgreSQL   | $25          | 5GB storage         |
| Standby Backend     | Railway Pro          | $30          | Warm (low traffic)  |
| Standby Frontend    | Railway Pro          | $20          | Static hosting      |
| Standby Database    | Supabase/Neon        | $25          | Replica             |
| Logical Replication | Bandwidth            | $20          | ~50GB/mes           |
| Cloudflare LB       | Pro Plan             | $20          | Load balancing      |
| Monitoring          | Sentry + UptimeRobot | $30          | Multi-region checks |
| **TOTAL**           |                      | **$220-260** |                     |

### ROI Analysis

**Custo de Downtime:**

```
Downtime anual (99% SLA): 3.65 dias = 87.6 horas
Downtime anual (99.9% SLA): 8.76 horas

Custo estimado por hora de downtime (B2G):
- Perda de produtividade: R$500/hora
- Penalidades contratuais: R$1,000/hora
- Dano reputacional: R$500/hora
- Total: R$2,000/hora

Economia com 99.9% vs 99%:
78.84 horas * R$2,000 = R$157,680/ano

Custo adicional multi-region:
$165/mes * 12 * R$5 = R$9,900/ano

ROI: R$157,680 / R$9,900 = 15.9x
```

**Conclusao:** Multi-region paga por si mesmo com apenas 5 horas de downtime evitado.

---

## Timeline de Implementacao

### Fase 1: Fundacao (Semana 1-2)

| Tarefa                            | Esforco | Owner   |
| --------------------------------- | ------- | ------- |
| Provisionar conta Cloudflare Pro  | 2h      | DevOps  |
| Configurar DNS multi-origin       | 4h      | DevOps  |
| Provisionar Supabase/Neon replica | 4h      | Backend |
| Documentar runbooks               | 4h      | SRE     |
| **Total**                         | **14h** |         |

### Fase 2: Replicacao (Semana 3-4)

| Tarefa                          | Esforco | Owner   |
| ------------------------------- | ------- | ------- |
| Configurar logical replication  | 8h      | DBA     |
| Testar sync em staging          | 4h      | QA      |
| Configurar monitoramento de lag | 4h      | DevOps  |
| Validar integridade de dados    | 8h      | Backend |
| **Total**                       | **24h** |         |

### Fase 3: Failover (Semana 5-6)

| Tarefa                    | Esforco | Owner   |
| ------------------------- | ------- | ------- |
| Implementar health checks | 4h      | Backend |
| Configurar Cloudflare LB  | 4h      | DevOps  |
| Criar scripts de failover | 8h      | SRE     |
| Drill de failover manual  | 4h      | Team    |
| **Total**                 | **20h** |         |

### Fase 4: Automacao (Semana 7-8)

| Tarefa                       | Esforco | Owner  |
| ---------------------------- | ------- | ------ |
| Automatizar failover         | 8h      | DevOps |
| Configurar alertas PagerDuty | 4h      | SRE    |
| Documentar SOPs              | 4h      | SRE    |
| Drill de failover automatico | 4h      | Team   |
| **Total**                    | **20h** |        |

### Resumo

| Fase       | Duracao       | Esforco Total |
| ---------- | ------------- | ------------- |
| Fundacao   | 2 semanas     | 14h           |
| Replicacao | 2 semanas     | 24h           |
| Failover   | 2 semanas     | 20h           |
| Automacao  | 2 semanas     | 20h           |
| **TOTAL**  | **8 semanas** | **78h**       |

---

## Recomendacoes

### Curto Prazo (0-3 meses)

1. **Manter single-region** ate atingir 5,000+ usuarios
2. **Melhorar backups:** Reduzir RPO para 1h (mais frequente)
3. **Documentar runbooks:** Failover manual testado
4. **Monitoramento:** Health checks multi-regiao (UptimeRobot)

### Medio Prazo (3-6 meses)

1. **Avaliar demanda:** Monitorar crescimento de usuarios
2. **POC Warm Standby:** Testar em staging
3. **Cloudflare Pro:** Preparar infraestrutura DNS
4. **Capacitacao:** Treinar equipe em DR procedures

### Longo Prazo (6-12 meses)

1. **Implementar Warm Standby** quando threshold atingido
2. **SLA 99.9%** para contratos enterprise
3. **Certificacao:** SOC 2 Type II (requer DR documentado)
4. **Active-Active:** Avaliar quando >50,000 usuarios

---

## Anexos

### A. Checklist Pre-Implementacao

- [ ] Contrato Cloudflare Pro assinado
- [ ] Conta Supabase/Neon provisionada
- [ ] Runbooks revisados por SRE
- [ ] Budget aprovado ($200+/mes adicional)
- [ ] Equipe treinada em failover
- [ ] Drill de DR executado em staging

### B. Metricas de Sucesso

| Metrica       | Baseline | Target | Como Medir          |
| ------------- | -------- | ------ | ------------------- |
| Availability  | 99%      | 99.9%  | UptimeRobot         |
| RTO           | 4h       | 15 min | Drill cronometrado  |
| RPO           | 24h      | 5 min  | pg_stat_replication |
| Failover Time | Manual   | <5 min | Cloudflare logs     |

### C. Contatos de Emergencia

| Role               | Nome | Contato                |
| ------------------ | ---- | ---------------------- |
| SRE Lead           | TBD  | +55 XX XXXXX-XXXX      |
| DBA                | TBD  | +55 XX XXXXX-XXXX      |
| DevOps             | TBD  | +55 XX XXXXX-XXXX      |
| Cloudflare Support | N/A  | support.cloudflare.com |
| Railway Support    | N/A  | railway.app/help       |

---

## Referencias

- [Railway Docs - High Availability](https://docs.railway.app/)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Cloudflare Load Balancing](https://developers.cloudflare.com/load-balancing/)
- [AWS DMS Documentation](https://docs.aws.amazon.com/dms/)
- [Supabase Replication](https://supabase.com/docs/guides/database/replication)

---

**Documento mantido por:** ETP Express DevOps Team
**Proxima revisao:** Q2 2026 (ou quando threshold atingido)
