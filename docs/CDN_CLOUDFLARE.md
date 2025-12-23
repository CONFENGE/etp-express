# CDN Cloudflare - Guia de Configuracao

Este documento detalha a configuracao do Cloudflare CDN para o frontend do ETP Express, otimizando performance de assets estaticos para usuarios no Brasil.

---

## Visao Geral

| Componente         | Configuracao                                             |
| ------------------ | -------------------------------------------------------- |
| **Provedor CDN**   | Cloudflare (Free Plan)                                   |
| **Origem**         | Railway (etp-express-frontend-production.up.railway.app) |
| **Edge Locations** | Sao Paulo, Rio de Janeiro, + globais                     |
| **Objetivo**       | TTFB < 100ms para usuarios BR                            |

---

## 1. Configuracao Inicial do Cloudflare

### 1.1 Criar Conta e Adicionar Dominio

1. Acesse https://dash.cloudflare.com/sign-up
2. Crie uma conta com email corporativo
3. Clique em **"Add a Site"**
4. Digite o dominio do frontend (ex: `app.etpexpress.com.br`)
5. Selecione **Free Plan**
6. Cloudflare fara scan automatico dos registros DNS

### 1.2 Atualizar Nameservers

Apos adicionar o site, Cloudflare fornecera 2 nameservers:

```
ns1.cloudflare.com
ns2.cloudflare.com
```

Atualize os nameservers no seu registrador de dominio (Registro.br, GoDaddy, etc).

**Tempo de propagacao:** 24-48h (geralmente < 1h)

### 1.3 Verificar Ativacao

```bash
# Verificar nameservers
dig NS seudominio.com.br +short

# Deve retornar nameservers do Cloudflare
```

---

## 2. Configuracao DNS

### 2.1 Registros Obrigatorios

No Cloudflare Dashboard -> **DNS** -> **Records**:

| Tipo  | Nome | Conteudo                                       | Proxy                   |
| ----- | ---- | ---------------------------------------------- | ----------------------- |
| CNAME | @    | etp-express-frontend-production.up.railway.app | Proxied (nuvem laranja) |
| CNAME | www  | etp-express-frontend-production.up.railway.app | Proxied (nuvem laranja) |

**IMPORTANTE:** O status "Proxied" (nuvem laranja) e OBRIGATORIO para que o CDN funcione.

### 2.2 Verificar Configuracao

```bash
# Verificar que esta passando pelo Cloudflare
curl -I https://seudominio.com.br

# Headers esperados:
# cf-ray: xxxxxxxxx-GRU  (GRU = Sao Paulo)
# server: cloudflare
```

---

## 3. Configuracao SSL/TLS

### 3.1 Modo de Criptografia

No Cloudflare Dashboard -> **SSL/TLS** -> **Overview**:

| Modo              | Quando Usar                                  |
| ----------------- | -------------------------------------------- |
| **Full (strict)** | Recomendado - Railway tem certificado valido |
| Full              | Se tiver problemas com strict                |
| Flexible          | NUNCA usar - inseguro                        |

Selecione: **Full (strict)**

### 3.2 Certificado Edge

Cloudflare gera automaticamente um certificado para seu dominio.

Verificar em **SSL/TLS** -> **Edge Certificates**:

- Status: **Active**
- Tipo: **Universal**

### 3.3 Configuracoes Adicionais

| Configuracao             | Valor   | Local                        |
| ------------------------ | ------- | ---------------------------- |
| Always Use HTTPS         | ON      | SSL/TLS -> Edge Certificates |
| Automatic HTTPS Rewrites | ON      | SSL/TLS -> Edge Certificates |
| Minimum TLS Version      | TLS 1.2 | SSL/TLS -> Edge Certificates |

---

## 4. Configuracao de Cache (CRITICO)

### 4.1 Cache Rules

No Cloudflare Dashboard -> **Caching** -> **Cache Rules** -> **Create rule**:

#### Regra 1: Assets Estaticos (1 ano)

```
Nome: Cache Assets 1 Year
Quando: URI Path starts with "/assets/"
Entao:
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 1 year
  - Browser TTL: Override - 1 year
```

#### Regra 2: Fontes (1 ano)

```
Nome: Cache Fonts 1 Year
Quando: URI Path ends with ".woff2" OR ".woff" OR ".ttf"
Entao:
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 1 year
  - Browser TTL: Override - 1 year
```

#### Regra 3: HTML (5 minutos)

```
Nome: Cache HTML 5min
Quando: URI Path equals "/" OR URI Path ends with ".html"
Entao:
  - Cache eligibility: Eligible for cache
  - Edge TTL: Override - 5 minutes
  - Browser TTL: Override - 0 seconds
```

### 4.2 Browser Cache TTL

Em **Caching** -> **Configuration**:

- **Browser Cache TTL:** Respect Existing Headers

### 4.3 Verificar Cache

```bash
# Primeira requisicao (MISS)
curl -I https://seudominio.com.br/assets/vendor-react-xxxxx.js
# cf-cache-status: MISS

# Segunda requisicao (HIT)
curl -I https://seudominio.com.br/assets/vendor-react-xxxxx.js
# cf-cache-status: HIT
```

---

## 5. Performance Adicional

### 5.1 Speed Optimizations

Em **Speed** -> **Optimization**:

| Configuracao                | Valor           |
| --------------------------- | --------------- |
| Auto Minify (JS, CSS, HTML) | ON              |
| Brotli                      | ON              |
| Early Hints                 | ON              |
| HTTP/2                      | ON (automatico) |
| HTTP/3 (QUIC)               | ON              |

### 5.2 Rocket Loader

**NAO HABILITAR** - pode causar problemas com React/SPA.

### 5.3 Polish (Pro/Business)

Nao disponivel no Free Plan, mas desnecessario para este projeto.

---

## 6. Security Settings

### 6.1 Configuracoes Basicas

Em **Security** -> **Settings**:

| Configuracao            | Valor      |
| ----------------------- | ---------- |
| Security Level          | Medium     |
| Challenge Passage       | 30 minutes |
| Browser Integrity Check | ON         |

### 6.2 WAF (Web Application Firewall)

Em **Security** -> **WAF**:

O Free Plan inclui regras basicas de WAF.

Para regras customizadas:

```
Bloquear bots maliciosos:
Quando: User Agent contains "bot" AND NOT Known Bots
Entao: Block
```

---

## 7. Configuracao no Railway

### 7.1 Dominio Customizado

No Railway Dashboard -> Frontend service -> **Settings** -> **Networking**:

1. Clique em **"Custom Domain"**
2. Adicione: `seudominio.com.br`
3. Railway gerara um certificado automaticamente (pode demorar alguns minutos)

### 7.2 Verificar Integracao

```bash
# Deve retornar 200 via Cloudflare
curl -sI https://seudominio.com.br | head -10

# Verificar headers CDN
curl -sI https://seudominio.com.br/assets/index-xxxxx.js | grep -i "cf-\|cache"
```

---

## 8. Metricas e Monitoramento

### 8.1 Analytics Cloudflare

Em **Analytics & Logs** -> **Traffic**:

| Metrica         | Objetivo              |
| --------------- | --------------------- |
| Cache Hit Ratio | > 90%                 |
| Bandwidth Saved | > 70%                 |
| Requests        | Baseline para alertas |

### 8.2 Ferramentas Externas

**WebPageTest.org:**

```
URL: https://seudominio.com.br
Location: Sao Paulo, Brazil
```

Metricas alvo:

- TTFB: < 100ms
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s

**Lighthouse:**

```bash
npx lighthouse https://seudominio.com.br --view
```

Performance score alvo: > 90

---

## 9. Troubleshooting

### 9.1 Assets nao estao em cache

**Problema:** `cf-cache-status: DYNAMIC` ou `MISS` persistente

**Solucao:**

1. Verificar Cache Rules (Secao 4.1)
2. Verificar que asset path comeca com `/assets/`
3. Limpar cache: **Caching** -> **Configuration** -> **Purge Everything**

### 9.2 SSL/TLS Errors

**Problema:** ERR_SSL_PROTOCOL_ERROR

**Solucao:**

1. Verificar modo SSL/TLS (deve ser Full strict)
2. Aguardar propagacao do certificado Edge (15-30min)
3. Verificar certificado Railway esta ativo

### 9.3 Too Many Redirects

**Problema:** ERR_TOO_MANY_REDIRECTS

**Solucao:**

1. Modo SSL/TLS deve ser **Full** ou **Full (strict)**, NUNCA Flexible
2. Verificar regras de redirect no Railway

### 9.4 CORS Errors

**Problema:** Requisicoes bloqueadas por CORS

**Solucao:**

1. Verificar CORS_ORIGINS no backend inclui dominio CDN
2. Em **Transform Rules**, adicionar header se necessario

---

## 10. Operacoes de Manutencao

### 10.1 Limpar Cache

**Via Dashboard:**

1. **Caching** -> **Configuration** -> **Purge Everything**

**Via API:**

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 10.2 Limpar Cache Seletivo

```bash
# Limpar apenas assets JS
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://seudominio.com.br/assets/index-xxxxx.js"]}'
```

### 10.3 Desabilitar CDN Temporariamente

Se precisar fazer bypass do CDN:

1. **DNS** -> Alterar registro para "DNS only" (nuvem cinza)
2. Trafego ira direto para Railway
3. Para reativar, voltar para "Proxied" (nuvem laranja)

---

## 11. Custos

| Recurso            | Free Plan | Pro Plan ($20/mes) |
| ------------------ | --------- | ------------------ |
| CDN                | Ilimitado | Ilimitado          |
| SSL                | Universal | Universal + Custom |
| WAF Rules          | 5         | 25                 |
| Page Rules         | 3         | 20                 |
| Analytics          | Basico    | Avancado           |
| Image Optimization | Nao       | Sim                |

**Recomendacao:** Free Plan e suficiente para o ETP Express.

---

## 12. Checklist de Configuracao

- [ ] Conta Cloudflare criada
- [ ] Dominio adicionado ao Cloudflare
- [ ] Nameservers atualizados no registrador
- [ ] DNS propagado (verificar com dig)
- [ ] Registros CNAME configurados com Proxy ON
- [ ] SSL/TLS em modo Full (strict)
- [ ] Cache Rules criadas (assets 1y, HTML 5min)
- [ ] Speed optimizations habilitadas (Brotli, Early Hints)
- [ ] Dominio customizado configurado no Railway
- [ ] TTFB < 100ms verificado via WebPageTest
- [ ] Cache Hit Ratio > 90% apos warmup
- [ ] Lighthouse Performance > 90

---

## Referencias

- Cloudflare Documentation: https://developers.cloudflare.com/
- Railway Custom Domains: https://docs.railway.app/deploy/exposing-your-app
- Cloudflare Free Plan: https://www.cloudflare.com/plans/free/
- WebPageTest: https://www.webpagetest.org/

---

**Ultima atualizacao:** 2025-12-22
**Issue relacionada:** #812
