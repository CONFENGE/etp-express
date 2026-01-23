# Government APIs Integration Tests

Testes de integração com APIs governamentais reais (PNCP, Compras.gov.br, SINAPI).

## 📋 Visão Geral

Esta suite de testes valida a integração com APIs governamentais brasileiras através de chamadas HTTP reais. Diferente dos testes unitários que usam mocks, estes testes verificam:

- ✅ Parsing correto de respostas reais das APIs
- ✅ Tratamento de erros com comportamento real da API
- ✅ Estabilidade dos contratos de dados ao longo do tempo
- ✅ Rate limiting e timeouts em cenários reais
- ✅ Circuit breaker behavior com APIs instáveis

## 🎯 Propósito

### Por que testes de integração são necessários?

1. **Validação de Parsing Real**: Mocks não capturam nuances de dados reais
2. **Detecção de Breaking Changes**: APIs governamentais podem mudar sem aviso
3. **Validação de Resiliência**: Timeouts e erros reais testam circuit breakers
4. **Garantia de Qualidade**: Sistema em produção LIVE precisa de alta confiança

### Quando executar?

- ✅ Antes de deploy em produção
- ✅ Após mudanças em services de APIs governamentais
- ✅ Semanalmente em ambiente de staging
- ❌ **NÃO** em CI/CD normal de PRs (usa rate limiting das APIs)

## 🚀 Execução Local

### Pré-requisitos

1. **Redis rodando localmente ou remotamente:**
   ```bash
   # Docker
   docker run -d -p 6379:6379 redis:7-alpine

   # Ou via Railway/Cloud
   export REDIS_HOST=your-redis-host.railway.app
   export REDIS_PORT=6379
   ```

2. **Credenciais SINAPI (opcional):**
   ```bash
   # Em .env ou export
   export SINAPI_API_KEY=your_key_here
   export SINAPI_API_SECRET=your_secret_here
   ```

   > Obter em: https://orcamentador.com.br/api/docs
   >
   > **Nota:** Testes SINAPI são pulados se credenciais não configuradas

### Executar Todos os Testes

```bash
cd backend
npm run test:integration:gov-api
```

### Executar Teste Específico

```bash
# PNCP apenas
npx jest --config ./test/jest-integration.json pncp.integration-spec.ts

# Compras.gov.br apenas
npx jest --config ./test/jest-integration.json compras-gov.integration-spec.ts

# SINAPI apenas (requer credenciais)
npx jest --config ./test/jest-integration.json sinapi.integration-spec.ts
```

### Executar com Verbosidade

```bash
npm run test:integration:gov-api -- --verbose
```

### Executar Teste Específico por Nome

```bash
# Exemplo: testar apenas health checks
npm run test:integration:gov-api -- --testNamePattern="Health Check"
```

## 📊 Estrutura dos Testes

### 1. PNCP (Portal Nacional de Contratações Públicas)

**Arquivo:** `pncp.integration-spec.ts`

**Endpoints Testados:**
- `/v1/contratacoes` - Busca de licitações
- `/v1/contratos` - Busca de contratos
- `/v1/atas` - Atas de Registro de Preços

**Cenários Cobertos:**
- ✅ Search com filtros (data, UF, modalidade)
- ✅ Parsing de valores monetários
- ✅ Parsing de datas
- ✅ Paginação
- ✅ Rate limiting graceful degradation
- ✅ Health check

**Duração Esperada:** ~5 minutos

### 2. Compras.gov.br (SIASG)

**Arquivo:** `compras-gov.integration-spec.ts`

**Endpoints Testados:**
- `/licitacoes` - Licitações federais
- `/contratos` - Contratos federais
- `/materiais` - Catálogo CATMAT
- `/servicos` - Catálogo CATSER

**Cenários Cobertos:**
- ✅ Busca por palavra-chave
- ✅ Filtros por modalidade
- ✅ Parsing de CATMAT/CATSER
- ✅ Itens de pregão
- ✅ Cache behavior
- ✅ Circuit breaker

**Duração Esperada:** ~6 minutos

### 3. SINAPI API (via Orcamentador)

**Arquivo:** `sinapi.integration-spec.ts`

**Endpoints Testados:**
- `/auth` - Autenticação
- `/insumos` - Busca de insumos
- `/composicoes` - Composições de serviço
- `/historico` - Histórico de preços
- `/estados` - Estados disponíveis
- `/encargos` - Encargos sociais
- `/indicadores` - BDI e outros indicadores

**Cenários Cobertos:**
- ✅ Autenticação OAuth
- ✅ Busca de insumos por UF
- ✅ Detalhamento de composições
- ✅ Histórico de preços por período
- ✅ Validação de cache (24h TTL)
- ✅ Rate limit handling
- ✅ Error handling (404, 401, 429, 500)

**Duração Esperada:** ~8 minutos (ou skip se sem credenciais)

## 📈 Análise de Resultados

### Resultado Esperado (Sucesso)

```
 PASS  test/pncp.integration-spec.ts (45.2 s)
 PASS  test/compras-gov.integration-spec.ts (52.8 s)
 PASS  test/sinapi.integration-spec.ts (67.1 s)

Test Suites: 3 passed, 3 total
Tests:       47 passed, 47 total
Snapshots:   0 total
Time:        165.123 s
```

### Resultado Esperado (SINAPI sem credenciais)

```
 PASS  test/pncp.integration-spec.ts
 PASS  test/compras-gov.integration-spec.ts
 SKIP  test/sinapi.integration-spec.ts (credentials not configured)

⚠️  SINAPI API credentials not configured. Set SINAPI_API_KEY and SINAPI_API_SECRET in .env
```

### Falhas Comuns e Soluções

#### ❌ Timeout Errors

```
FAIL test/pncp.integration-spec.ts
● PNCP Search Endpoint › should successfully fetch contratacoes
  Timeout - Async callback was not invoked within 60000ms
```

**Causa:** API governamental lenta ou indisponível
**Solução:**
1. Verificar status da API: https://status.pncp.gov.br (se existir)
2. Re-executar após alguns minutos
3. Aumentar timeout no teste se persistir

#### ❌ Rate Limit Exceeded

```
FAIL test/compras-gov.integration-spec.ts
● Compras.gov.br Rate Limiting
  HTTP 429 Too Many Requests
```

**Causa:** Limite de requisições da API excedido
**Solução:**
1. Aguardar janela de rate limit (geralmente 1 minuto)
2. Executar testes com menos paralelismo: `--runInBand`
3. Verificar se não há outros processos consumindo a API

#### ❌ Redis Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Causa:** Redis não está rodando
**Solução:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

#### ❌ SINAPI Authentication Failed

```
SinapiApiAuthError: Authentication failed - Invalid credentials
```

**Causa:** Credenciais SINAPI inválidas ou expiradas
**Solução:**
1. Verificar se `SINAPI_API_KEY` e `SINAPI_API_SECRET` estão corretos
2. Renovar credenciais em https://orcamentador.com.br
3. Verificar se a conta não está suspensa por uso excessivo

## 🔧 Configuração de CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests - Gov APIs

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Mondays at 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    env:
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      SINAPI_API_KEY: ${{ secrets.SINAPI_API_KEY }}
      SINAPI_API_SECRET: ${{ secrets.SINAPI_API_SECRET }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run Integration Tests
        run: |
          cd backend
          npm run test:integration:gov-api

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: backend/test-results/
```

### Railway Environment

```bash
# Em Railway Dashboard → Variables
REDIS_HOST=your-redis.railway.internal
REDIS_PORT=6379
SINAPI_API_KEY=your_key_here
SINAPI_API_SECRET=your_secret_here

# Executar via Railway CLI
railway run npm run test:integration:gov-api
```

## 📝 Adicionando Novos Testes

### Template de Teste

```typescript
describe('New API Integration (@integration)', () => {
  let service: YourService;

  beforeAll(async () => {
    // Setup module with real dependencies
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, CacheModule.registerAsync({ /* redis */ })],
      providers: [YourService, GovApiCache, ConfigService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should test real API behavior', async () => {
    // Arrange
    const params = { /* real params */ };

    // Act
    const result = await service.callRealApi(params);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveProperty('expectedField');
  }, 60000); // Timeout de 60s
});
```

### Boas Práticas

1. **Use timeouts generosos**: APIs governamentais são lentas (60s padrão)
2. **Teste cenários reais**: Queries que fariam sentido em produção
3. **Valide estruturas de dados**: Não apenas status 200
4. **Teste error handling**: 404, 429, 500, timeouts
5. **Use cache inteligentemente**: Testes devem funcionar com ou sem cache
6. **Skip gracefully**: Se API estiver down, skip ao invés de fail

## 🐛 Debug

### Ativar Logs Detalhados

```bash
# Modo debug do Jest
npm run test:integration:gov-api -- --verbose --detectOpenHandles

# Logs do NestJS
export LOG_LEVEL=debug
npm run test:integration:gov-api
```

### Inspecionar Requisições HTTP

```typescript
// Adicionar temporariamente no teste
import { HttpService } from '@nestjs/axios';

it('should debug request', async () => {
  const httpService = module.get<HttpService>(HttpService);

  httpService.axiosRef.interceptors.request.use(config => {
    console.log('Request:', config.method, config.url, config.params);
    return config;
  });

  httpService.axiosRef.interceptors.response.use(response => {
    console.log('Response:', response.status, response.data);
    return response;
  });

  // Run test...
});
```

### Verificar Cache do Redis

```bash
# Conectar ao Redis
redis-cli

# Verificar chaves relacionadas
KEYS gov-api:*

# Ver valor de chave específica
GET gov-api:pncp:search:12345

# Limpar cache
FLUSHDB
```

## 📚 Referências

- [PNCP API Docs](https://pncp.gov.br/api/consulta/swagger-ui/index.html)
- [Compras.gov.br API Docs](https://compras.dados.gov.br/docs/)
- [SINAPI API Docs (Orcamentador)](https://orcamentador.com.br/api/docs)
- [Issue #1073 - Criar testes de integração](https://github.com/CONFENGE/etp-express/issues/1073)

## ✅ Checklist de Verificação

Antes de considerar os testes de integração completos:

- [ ] Todos os testes PNCP passando
- [ ] Todos os testes Compras.gov.br passando
- [ ] Todos os testes SINAPI passando (ou skip se sem credenciais)
- [ ] Script NPM `test:integration:gov-api` criado
- [ ] Documentação atualizada (este arquivo)
- [ ] CI/CD configurado para execução semanal (opcional)
- [ ] Rate limiting testado e handling validado
- [ ] Timeouts testados com queries grandes
- [ ] Cache behavior validado
- [ ] Error scenarios cobertos (404, 429, 500, timeout)

## 🤝 Contribuindo

Ao adicionar novos testes de integração:

1. Seguir o padrão dos testes existentes
2. Adicionar documentação no README-INTEGRATION.md
3. Validar localmente antes de commit
4. Marcar com tag `@integration` no describe
5. Adicionar timeout apropriado (min 60s)

---

🤖 **Automated Integration Testing** | ETP Express v1.0.0
