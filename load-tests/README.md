# Load Testing com k6

Este diretório contém scripts de load testing usando [k6](https://k6.io/) para validar a performance do ETP Express.

## Requisitos

### Instalação do k6

**Windows (Chocolatey):**

```bash
choco install k6
```

**Windows (winget):**

```bash
winget install k6 --source winget
```

**macOS:**

```bash
brew install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Estrutura

```
load-tests/
├── config.js           # Configuração compartilhada
├── README.md           # Esta documentação
└── scripts/
    ├── helpers.js      # Funções utilitárias
    ├── smoke.js        # Smoke test (1 VU, 30s)
    ├── load.js         # Load test (100 VUs, 8min)
    └── stress.js       # Stress test (até 250 VUs)
```

## Uso

### 1. Smoke Test (Recomendado Primeiro)

Valida que o sistema está funcionando antes de testes mais intensos:

```bash
# Local
k6 run load-tests/scripts/smoke.js

# Staging/Production
k6 run --env BASE_URL=https://etp-express-backend.railway.app load-tests/scripts/smoke.js
```

### 2. Load Test (100 VUs)

Simula carga real de 100 usuários simultâneos (meta B2G):

```bash
# Local
k6 run load-tests/scripts/load.js

# Production com credenciais customizadas
k6 run \
  --env BASE_URL=https://etp-express-backend.railway.app \
  --env TEST_USER_EMAIL=test@example.com \
  --env TEST_USER_PASSWORD=TestPass123 \
  load-tests/scripts/load.js
```

### 3. Stress Test

Encontra o ponto de quebra do sistema (use com cuidado):

```bash
k6 run --env BASE_URL=https://staging.example.com load-tests/scripts/stress.js
```

## Variáveis de Ambiente

| Variável             | Padrão                    | Descrição                 |
| -------------------- | ------------------------- | ------------------------- |
| `BASE_URL`           | `http://localhost:3000`   | URL base da API           |
| `TEST_USER_EMAIL`    | `admin@etpexpress.com.br` | Email do usuário de teste |
| `TEST_USER_PASSWORD` | `Admin@123`               | Senha do usuário de teste |

## Thresholds (Critérios de Aceitação)

Os testes são configurados com os seguintes limites:

| Métrica                   | Limite   | Descrição                          |
| ------------------------- | -------- | ---------------------------------- |
| `http_req_duration p(95)` | < 3000ms | 95% das requisições em menos de 3s |
| `http_req_failed`         | < 1%     | Menos de 1% de falhas              |
| `successful_operations`   | > 95%    | Taxa de sucesso > 95%              |

## Cenários de Teste

### Load Test (load.js)

Simula um cenário B2G típico:

- **Ramp-up:** 2 minutos para 100 VUs
- **Sustentação:** 5 minutos a 100 VUs
- **Ramp-down:** 1 minuto

Comportamento por VU:

1. Login (100% dos VUs)
2. Listagem de ETPs (100% dos VUs)
3. Estatísticas (30% dos VUs)
4. Criação de ETP (20% dos VUs)
5. Validação de sessão (10% dos VUs)

### Stress Test (stress.js)

Escala progressiva para encontrar limites:

- 50 VUs → 100 VUs → 150 VUs → 200 VUs → 250 VUs
- Operações mais agressivas (50% criam ETPs)
- Sleep mínimo entre operações

## Interpretação dos Resultados

### Exemplo de Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/

     execution: local
        script: load-tests/scripts/load.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 8m30s max duration

     ✓ http_req_duration..............: avg=245ms  p(95)=1234ms
     ✓ http_req_failed................: 0.05%  ✓ 12     ✗ 23456
     ✓ successful_operations..........: 98.5%
```

### Métricas Importantes

- **http_req_duration p(95):** Deve ser < 3000ms
- **http_req_failed:** Deve ser < 1%
- **successful_operations:** Deve ser > 95%

## Troubleshooting

### Erro: "Login failed"

1. Verifique se o usuário de teste existe
2. Confirme as credenciais nas variáveis de ambiente
3. Verifique se a API está rodando

### Erro: "Health check failed"

1. Confirme que BASE_URL está correto
2. Verifique se o endpoint `/health` está acessível
3. Confira conectividade de rede

### Alta taxa de erros 429 (Too Many Requests)

O sistema tem rate limiting:

- Login: 5 req/min por IP
- Geração de seções: 5 req/min por usuário

Para load tests, considere:

- Usar diferentes usuários de teste
- Ajustar delays entre requisições

## Referências

- [k6 Documentation](https://k6.io/docs/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- Issue #676 - Load testing k6 - 100 usuários simultâneos
