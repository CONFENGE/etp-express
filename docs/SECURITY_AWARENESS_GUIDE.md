# Security Awareness Training Guide - ETP Express

**Version:** 1.0
**Last Updated:** 2025-11-26
**Owner:** Security Team

---

## Table of Contents

1. [Secure Coding Practices](#1-secure-coding-practices)
2. [Secret Management Best Practices](#2-secret-management-best-practices)
3. [Dependency Security](#3-dependency-security)
4. [Incident Response Playbook](#4-incident-response-playbook)
5. [Code Review Security Checklist](#5-code-review-security-checklist)
6. [LGPD/Privacy Considerations](#6-lgpdprivacy-considerations)
7. [Training Resources](#7-training-resources)

---

## 1. Secure Coding Practices

### OWASP Top 10 (2023)

#### A01: Broken Access Control

**Descrição Técnica:**
Falha em restringir o que usuários autenticados podem fazer. Atacantes podem acessar dados de outros usuários, modificar permissões, ou executar funções administrativas sem autorização.

**Exemplo de Código Vulnerável (NestJS):**

```typescript
// ❌ VULNERÁVEL - Sem verificação de autorização
@Get('etps/:id')
async getEtp(@Param('id') id: string) {
 return this.etpService.findOne(id);
 // Qualquer usuário autenticado pode acessar qualquer ETP!
}
```

**Exemplo de Código Seguro (NestJS):**

```typescript
// ✅ SEGURO - Com verificação de propriedade
@Get('etps/:id')
@UseGuards(JwtAuthGuard)
async getEtp(
 @Param('id') id: string,
 @Request() req
) {
 const etp = await this.etpService.findOne(id);

 // Verificar se usuário é dono ou tem permissão
 if (etp.userId !== req.user.id && !req.user.isAdmin) {
 throw new ForbiddenException('Acesso negado');
 }

 return etp;
}
```

**Como Testar:**

```typescript
// Teste de autorização
it('should deny access to ETP from different user', async () => {
 const user1 = await createUser('user1@example.com');
 const user2 = await createUser('user2@example.com');

 const etp = await createEtp(user1.id);

 // Tentar acessar ETP do user1 como user2
 await expect(
 request(app.getHttpServer())
 .get(`/etps/${etp.id}`)
 .set('Authorization', `Bearer ${user2Token}`),
 ).rejects.toThrow(ForbiddenException);
});
```

---

#### A02: Cryptographic Failures

**Descrição Técnica:**
Falha em proteger dados sensíveis usando criptografia adequada. Inclui senhas em texto plano, algoritmos fracos, ou transmissão de dados sem HTTPS.

**Exemplo de Código Vulnerável (NestJS):**

```typescript
// ❌ VULNERÁVEL - Senha em texto plano
async createUser(email: string, password: string) {
 return this.userRepository.save({
 email,
 password, // Armazenando senha em texto plano!
 });
}
```

**Exemplo de Código Seguro (NestJS):**

```typescript
// ✅ SEGURO - Hash bcrypt com salt
import * as bcrypt from 'bcrypt';

async createUser(email: string, password: string) {
 const salt = await bcrypt.genSalt(10);
 const hashedPassword = await bcrypt.hash(password, salt);

 return this.userRepository.save({
 email,
 password: hashedPassword, // Senha hasheada
 });
}

async validatePassword(plainPassword: string, hashedPassword: string) {
 return bcrypt.compare(plainPassword, hashedPassword);
}
```

**Como Testar:**

```typescript
it('should hash passwords before storing', async () => {
 const password = 'MySecurePassword123!';
 const user = await authService.createUser('test@example.com', password);

 // Password no DB nunca deve ser igual ao plaintext
 expect(user.password).not.toBe(password);
 expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash pattern
});
```

**Configuração HTTPS (Railway):**

```typescript
// backend/src/main.ts
async function bootstrap() {
 const app = await NestFactory.create(AppModule);

 // Forçar HTTPS em produção
 if (process.env.NODE_ENV === 'production') {
 app.use((req, res, next) => {
 if (req.headers['x-forwarded-proto'] !== 'https') {
 return res.redirect(`https://${req.headers.host}${req.url}`);
 }
 next();
 });
 }
}
```

---

#### A03: Injection

**Descrição Técnica:**
Dados não validados são enviados para interpretadores (SQL, OS, LDAP). Atacantes podem injetar comandos maliciosos que alteram ou destroem dados.

**Exemplo de Código Vulnerável (SQL Injection):**

```typescript
// ❌ VULNERÁVEL - Query string concatenada
async findUserByEmail(email: string) {
 const query = `SELECT * FROM users WHERE email = '${email}'`;
 return this.db.raw(query);
 // Vulnerável a SQL injection: email = "' OR '1'='1"
}
```

**Exemplo de Código Seguro (TypeORM Prepared Statements):**

```typescript
// ✅ SEGURO - Prepared statements (parameterized query)
async findUserByEmail(email: string) {
 return this.userRepository.findOne({
 where: { email }, // TypeORM usa prepared statements automaticamente
 });
}

// ✅ SEGURO - Query builder com parâmetros
async searchUsers(searchTerm: string) {
 return this.userRepository
 .createQueryBuilder('user')
 .where('user.email LIKE :search', { search: `%${searchTerm}%` })
 .getMany();
}
```

**Exemplo XSS (Cross-Site Scripting - React):**

```tsx
// ❌ VULNERÁVEL - dangerouslySetInnerHTML sem sanitização
function UserProfile({ userBio }) {
 return <div dangerouslySetInnerHTML={{ __html: userBio }} />;
 // Se userBio = "<script>alert('XSS')</script>", executa!
}

// ✅ SEGURO - Renderização escaped automaticamente
function UserProfile({ userBio }) {
 return <div>{userBio}</div>; // React escapa automaticamente
}

// ✅ SEGURO - Sanitização com DOMPurify
import DOMPurify from 'dompurify';

function UserProfile({ userBio }) {
 const sanitizedBio = DOMPurify.sanitize(userBio);
 return <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />;
}
```

**Como Testar:**

```typescript
it('should prevent SQL injection', async () => {
 const maliciousEmail = "' OR '1'='1 --";
 const result = await authService.findUserByEmail(maliciousEmail);

 // Deve retornar null (nenhum usuário encontrado)
 // NÃO deve retornar todos os usuários
 expect(result).toBeNull();
});
```

---

#### A04: Insecure Design

**Descrição Técnica:**
Falhas de design arquitetural que não podem ser corrigidas apenas com implementação. Requer threat modeling e secure design patterns desde o início.

**Exemplo de Design Vulnerável:**

```typescript
// ❌ VULNERÁVEL - Password reset sem token expiration
interface PasswordResetToken {
 userId: string;
 token: string;
 // Sem campo de expiração!
}

async resetPassword(token: string, newPassword: string) {
 const resetToken = await this.findResetToken(token);
 if (!resetToken) throw new UnauthorizedException();

 // Token nunca expira - pode ser usado indefinidamente!
 await this.updatePassword(resetToken.userId, newPassword);
}
```

**Exemplo de Design Seguro:**

```typescript
// ✅ SEGURO - Token com expiração + limite de tentativas
interface PasswordResetToken {
 userId: string;
 token: string;
 expiresAt: Date; // ✅ Expiração em 1 hora
 attempts: number; // ✅ Contador de tentativas
 used: boolean; // ✅ Single-use token
}

async resetPassword(token: string, newPassword: string) {
 const resetToken = await this.findResetToken(token);

 if (!resetToken) throw new UnauthorizedException('Token inválido');
 if (resetToken.used) throw new UnauthorizedException('Token já utilizado');
 if (resetToken.expiresAt < new Date()) throw new UnauthorizedException('Token expirado');
 if (resetToken.attempts >= 3) throw new UnauthorizedException('Tentativas excedidas');

 // Marcar token como usado (single-use)
 await this.markTokenAsUsed(resetToken.id);
 await this.updatePassword(resetToken.userId, newPassword);
}
```

**Threat Modeling - Exemplo:**

```
Threat: Atacante tenta brute force de password reset tokens
Mitigation:
- ✅ Tokens devem ser UUIDs v4 (não sequenciais)
- ✅ Tokens expiram em 1 hora
- ✅ Tokens são single-use (marcados após uso)
- ✅ Rate limiting em endpoint de reset (5 req/min)
- ✅ Email notification ao usuário quando reset é solicitado
```

---

#### A05: Security Misconfiguration

**Descrição Técnica:**
Configurações inseguras de framework, servidor, banco de dados, ou serviços em nuvem. Inclui CORS permissivo, stack traces expostos, defaults inseguros.

**Exemplo de Configuração Vulnerável:**

```typescript
// ❌ VULNERÁVEL - CORS aberto para qualquer origem
app.enableCors({
 origin: '*', // Permite qualquer domínio!
 credentials: true,
});

// ❌ VULNERÁVEL - Sem rate limiting
// Atacante pode fazer 1000 req/s
```

**Exemplo de Configuração Segura:**

```typescript
// ✅ SEGURO - CORS restrito + Helmet.js + Rate Limiting
import helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';

async function bootstrap() {
 const app = await NestFactory.create(AppModule);

 // Helmet.js - Security headers
 app.use(
 helmet({
 contentSecurityPolicy: {
 directives: {
 defaultSrc: ["'self'"],
 scriptSrc: ["'self'", "'unsafe-inline'"],
 },
 },
 hsts: {
 maxAge: 31536000,
 includeSubDomains: true,
 preload: true,
 },
 }),
 );

 // CORS restrito
 app.enableCors({
 origin: process.env.FRONTEND_URL, // Apenas frontend autorizado
 credentials: true,
 methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
 });

 // Rate Limiting global
 app.use(
 rateLimit({
 windowMs: 15 * 60 * 1000, // 15 minutos
 max: 100, // 100 requisições por IP
 message: 'Muitas requisições. Tente novamente em 15 minutos.',
 }),
 );

 // Desabilitar stack traces em produção
 if (process.env.NODE_ENV === 'production') {
 app.useGlobalFilters(new ProductionExceptionFilter());
 }
}
```

**Como Testar:**

```bash
# Testar headers de segurança
curl -I https://etp-express.railway.app

# Deve retornar:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
```

---

#### A06: Vulnerable and Outdated Components

**Descrição Técnica:**
Uso de bibliotecas, frameworks ou dependências com vulnerabilidades conhecidas (CVEs). Falta de atualizações regulares.

**Exemplo Vulnerável:**

```json
// ❌ VULNERÁVEL - Dependências desatualizadas
{
 "dependencies": {
 "express": "4.16.0", // CVE-2022-24999 (vulnerável)
 "jsonwebtoken": "8.5.0" // CVE-2022-23529 (vulnerável)
 }
}
```

**Exemplo Seguro:**

```json
// ✅ SEGURO - Dependências atualizadas
{
 "dependencies": {
 "express": "^4.19.0", // Versão segura
 "jsonwebtoken": "^9.0.2" // Versão segura
 }
}
```

**Processo de Auditoria (npm audit):**

```bash
# 1. Executar npm audit
npm audit

# 2. Revisar vulnerabilidades
npm audit --json | jq '.vulnerabilities'

# 3. Aplicar fixes automáticos (MINOR/PATCH)
npm audit fix

# 4. Revisar breaking changes (MAJOR)
npm audit fix --force # Cuidado! Pode quebrar código

# 5. Auditar manualmente
npm outdated
```

**Dependabot Configuration (`.github/dependabot.yml`):**

```yaml
version: 2
updates:
 - package-ecosystem: 'npm'
 directory: '/backend'
 schedule:
 interval: 'weekly'
 open-pull-requests-limit: 5
 # Auto-merge security patches
 labels:
 - 'dependencies'
 - 'security'
```

---

#### A07: Identification and Authentication Failures

**Descrição Técnica:**
Falhas em autenticação e gerenciamento de sessão. Inclui senhas fracas, credential stuffing, session fixation.

**Exemplo Vulnerável:**

```typescript
// ❌ VULNERÁVEL - Sem validação de senha forte
async register(email: string, password: string) {
 // Aceita senhas como "123" ou "password"
 return this.authService.createUser(email, password);
}

// ❌ VULNERÁVEL - JWT sem expiração
const token = this.jwtService.sign({ userId: user.id });
// Token válido para sempre!
```

**Exemplo Seguro:**

```typescript
// ✅ SEGURO - Validação de senha forte
import { IsStrongPassword } from 'class-validator';

class RegisterDto {
 @IsEmail()
 email: string;

 @IsStrongPassword(
 {
 minLength: 8,
 minLowercase: 1,
 minUppercase: 1,
 minNumbers: 1,
 minSymbols: 1,
 },
 {
 message:
 'Senha deve ter 8+ caracteres, maiúsculas, minúsculas, números e símbolos',
 },
 )
 password: string;
}

// ✅ SEGURO - JWT com expiração
const accessToken = this.jwtService.sign(
 { userId: user.id },
 { expiresIn: '15m' }, // Expira em 15 minutos
);

const refreshToken = this.jwtService.sign(
 { userId: user.id, type: 'refresh' },
 { expiresIn: '7d' }, // Expira em 7 dias
);
```

**Proteção contra Brute Force:**

```typescript
// ✅ Rate limiting específico para login
import * as rateLimit from 'express-rate-limit';

const loginRateLimiter = rateLimit({
 windowMs: 15 * 60 * 1000, // 15 minutos
 max: 5, // 5 tentativas de login
 skipSuccessfulRequests: true, // Não conta logins bem-sucedidos
 message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
});

@Post('login')
@UseGuards(loginRateLimiter)
async login(@Body() loginDto: LoginDto) {
 return this.authService.login(loginDto);
}
```

---

#### A08: Software and Data Integrity Failures

**Descrição Técnica:**
Falha em verificar integridade de software, dados ou CI/CD pipeline. Inclui supply chain attacks, unsigned updates, insecure deserialization.

**Exemplo Vulnerável:**

```typescript
// ❌ VULNERÁVEL - Desserialização insegura
async processWebhook(payload: string) {
 const data = JSON.parse(payload);
 // Se payload contém __proto__, pode poluir prototype!
 Object.assign({}, data);
}
```

**Exemplo Seguro:**

```typescript
// ✅ SEGURO - Validação de payload com class-validator
import { validate } from 'class-validator';

class WebhookPayloadDto {
 @IsString()
 eventType: string;

 @IsObject()
 data: Record<string, any>;
}

async processWebhook(payload: string) {
 const parsed = JSON.parse(payload);

 // Validar estrutura
 const dto = Object.assign(new WebhookPayloadDto(), parsed);
 const errors = await validate(dto);

 if (errors.length > 0) {
 throw new BadRequestException('Payload inválido');
 }

 // Processar apenas campos conhecidos (whitelist)
 const { eventType, data } = dto;
 return this.handleEvent(eventType, data);
}
```

**Subresource Integrity (SRI) - Frontend:**

```html
<!-- ✅ SEGURO - Verificar integridade de CDN -->
<script
 src="https://cdn.example.com/library.js"
 integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxVD3E0JvdYrpDMHc9JuQXsWPCkZGvZ"
 crossorigin="anonymous"
></script>
```

**CI/CD Pipeline Security:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
 push:
 branches: [main]

jobs:
 deploy:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v3

 # ✅ Verificar lock file (prevenir dependency confusion)
 - name: Validate package-lock.json
 run: |
 npm ci --prefer-offline
 git diff --exit-code package-lock.json

 # ✅ Auditar vulnerabilidades antes de deploy
 - name: Security audit
 run: npm audit --audit-level=high
```

---

#### A09: Security Logging and Monitoring Failures

**Descrição Técnica:**
Falta de logging adequado de eventos de segurança. Dificulta detecção de breaches, investigação de incidentes, e compliance.

**Exemplo Vulnerável:**

```typescript
// ❌ VULNERÁVEL - Sem logging de tentativas de login
@Post('login')
async login(@Body() loginDto: LoginDto) {
 const user = await this.authService.validateUser(loginDto);
 if (!user) throw new UnauthorizedException();
 return this.authService.generateToken(user);
 // Nenhum log! Não sabemos quem tentou logar
}
```

**Exemplo Seguro:**

```typescript
// ✅ SEGURO - Structured logging com contexto
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
 private readonly logger = new Logger(AuthService.name);

 async login(loginDto: LoginDto, ipAddress: string) {
 const user = await this.validateUser(loginDto);

 if (!user) {
 // ✅ Log de falha de autenticação
 this.logger.warn({
 message: 'Login failed - Invalid credentials',
 email: loginDto.email,
 ipAddress,
 timestamp: new Date().toISOString(),
 });
 throw new UnauthorizedException();
 }

 // ✅ Log de sucesso
 this.logger.log({
 message: 'Login successful',
 userId: user.id,
 email: user.email,
 ipAddress,
 timestamp: new Date().toISOString(),
 });

 return this.generateToken(user);
 }
}
```

**Eventos que DEVEM ser logados:**

```typescript
// Security Events to Log
const SECURITY_EVENTS = {
 // Authentication
 LOGIN_SUCCESS: 'login.success',
 LOGIN_FAILED: 'login.failed',
 LOGOUT: 'logout',
 PASSWORD_RESET_REQUEST: 'password.reset.request',
 PASSWORD_CHANGED: 'password.changed',

 // Authorization
 ACCESS_DENIED: 'access.denied',
 PRIVILEGE_ESCALATION_ATTEMPT: 'privilege.escalation.attempt',

 // Data Access
 SENSITIVE_DATA_ACCESS: 'data.sensitive.access',
 BULK_DATA_EXPORT: 'data.bulk.export',

 // Administrative
 USER_CREATED: 'user.created',
 USER_DELETED: 'user.deleted',
 PERMISSION_CHANGED: 'permission.changed',
};
```

**NUNCA logar:**

```typescript
// ❌ NÃO LOGAR - Dados sensíveis
this.logger.log({
 message: 'User login',
 password: loginDto.password, // NUNCA!
 creditCard: user.creditCard, // NUNCA!
 ssn: user.ssn, // NUNCA!
});

// ✅ LOGAR - Apenas metadados
this.logger.log({
 message: 'User login',
 userId: user.id,
 timestamp: new Date().toISOString(),
});
```

---

#### A10: Server-Side Request Forgery (SSRF)

**Descrição Técnica:**
Aplicação busca recurso remoto sem validar URL fornecida pelo usuário. Atacante pode fazer servidor acessar recursos internos (AWS metadata, Redis, etc).

**Exemplo Vulnerável:**

```typescript
// ❌ VULNERÁVEL - Fetch sem validação de URL
@Post('fetch-url')
async fetchUrl(@Body('url') url: string) {
 const response = await fetch(url);
 // Atacante pode usar: http://169.254.169.254/latest/meta-data/iam/security-credentials/
 // Vazamento de AWS credentials!
 return response.json();
}
```

**Exemplo Seguro:**

```typescript
// ✅ SEGURO - Whitelist de domínios + validação
import { URL } from 'url';

const ALLOWED_DOMAINS = [
 'api.perplexity.ai',
 'api.openai.com',
];

@Post('fetch-url')
async fetchUrl(@Body('url') url: string) {
 let parsedUrl: URL;

 try {
 parsedUrl = new URL(url);
 } catch {
 throw new BadRequestException('URL inválida');
 }

 // ✅ Validar protocolo (apenas HTTPS)
 if (parsedUrl.protocol !== 'https:') {
 throw new BadRequestException('Apenas HTTPS permitido');
 }

 // ✅ Validar domínio (whitelist)
 if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
 throw new BadRequestException('Domínio não autorizado');
 }

 // ✅ Bloquear IPs privados
 const ipPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/;
 if (ipPattern.test(parsedUrl.hostname)) {
 throw new BadRequestException('Acesso a IP privado negado');
 }

 const response = await fetch(parsedUrl.toString());
 return response.json();
}
```

---

## 2. Secret Management Best Practices

### Nunca Commitar Secrets

**❌ O QUE NUNCA FAZER:**

```bash
# ❌ NUNCA commitar .env
git add .env

# ❌ NUNCA hardcoded secrets
const API_KEY = 'sk-1234567890abcdef';
const DATABASE_PASSWORD = 'MyS3cr3tP@ssw0rd';
```

**✅ O QUE FAZER:**

```bash
# ✅ Adicionar .env ao .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# ✅ Usar variáveis de ambiente
const API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;
```

### Railway Environment Variables

**✅ Configurar secrets no Railway:**

```bash
# 1. Acessar Railway Dashboard
# 2. Selecionar projeto > Settings > Variables
# 3. Adicionar variáveis:
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
JWT_SECRET=random-32-byte-string
```

**✅ Usar secrets em código:**

```typescript
// backend/src/config/configuration.ts
export default () => ({
 database: {
 url: process.env.DATABASE_URL,
 },
 openai: {
 apiKey: process.env.OPENAI_API_KEY,
 },
 jwt: {
 secret: process.env.JWT_SECRET,
 expiresIn: '15m',
 },
});
```

### Rotação de Secrets

**Guideline:**

- **API Keys**: Rotacionar a cada 90 dias
- **JWT Secrets**: Rotacionar a cada 180 dias
- **Database Passwords**: Rotacionar a cada 6 meses
- **Em caso de breach**: Rotacionar IMEDIATAMENTE

**Processo de rotação:**

```bash
# 1. Gerar novo secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Adicionar como JWT_SECRET_NEW no Railway
# 3. Atualizar código para aceitar ambos (graceful transition)
# 4. Deploy
# 5. Após 7 dias, remover JWT_SECRET antigo
```

### Secret Scanning (Gitleaks)

**✅ Pre-commit hook já implementado (#154):**

```yaml
# .pre-commit-config.yaml
repos:
 - repo: https://github.com/gitleaks/gitleaks
 rev: v8.18.0
 hooks:
 - id: gitleaks
```

**✅ CI/CD secret scanning (GitHub Actions):**

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
 gitleaks:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v3
 with:
 fetch-depth: 0
 - uses: gitleaks/gitleaks-action@v2
 env:
 GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Dual-Key Strategy (Implemented #158)

**✅ Usar dual-key para zero-downtime rotation:**

```typescript
// Aceitar tanto chave antiga quanto nova durante transição
const validApiKeys = [
 process.env.OPENAI_API_KEY, // Chave atual
 process.env.OPENAI_API_KEY_NEW, // Chave nova (se existir)
].filter(Boolean);

function validateApiKey(key: string): boolean {
 return validApiKeys.includes(key);
}
```

---

## 3. Dependency Security

### Executar `npm audit` Regularmente

**Weekly audit:**

```bash
# 1. Auditar vulnerabilidades
npm audit

# Exemplo de output:
# found 3 vulnerabilities (1 moderate, 2 high)
# run `npm audit fix` to fix them
```

**Severity Levels:**

- **CRITICAL (CVSS 9.0-10.0)**: Fix IMMEDIATELY (P0)
- **HIGH (CVSS 7.0-8.9)**: Fix within 7 days (P1)
- **MODERATE (CVSS 4.0-6.9)**: Fix within 30 days (P2)
- **LOW (CVSS 0.1-3.9)**: Fix within 90 days (P3)

### Revisar Dependabot PRs

**Checklist para revisar Dependabot PR:**

- [ ] Verificar CHANGELOG da biblioteca
- [ ] Avaliar breaking changes (MAJOR version bump)
- [ ] Executar testes localmente
- [ ] Verificar CVE severity (se security patch)
- [ ] Validar compatibilidade com outras dependências

**Exemplo de review:**

```bash
# 1. Checkout do PR do Dependabot
gh pr checkout 123

# 2. Instalar dependências
npm ci

# 3. Executar testes
npm test

# 4. Executar lint
npm run lint

# 5. Build
npm run build

# 6. Se tudo passar → Merge
gh pr merge 123 --squash
```

### Política de Updates

**Prioridade de merge:**

1. **P0 (Security patches - CRITICAL)**: Merge IMEDIATAMENTE
2. **P1 (Security patches - HIGH)**: Merge dentro de 7 dias
3. **P2 (Feature updates - MINOR)**: Merge dentro de 30 dias
4. **P3 (Patch updates)**: Merge dentro de 90 dias

**Exemples:**

```json
// P0 - Merge imediatamente
{
 "package": "jsonwebtoken",
 "current": "8.5.1",
 "latest": "9.0.0",
 "severity": "CRITICAL",
 "cve": "CVE-2022-23529"
}

// P3 - Merge quando possível
{
 "package": "typescript",
 "current": "5.0.0",
 "latest": "5.0.1",
 "severity": "LOW",
 "cve": null
}
```

---

## 4. Incident Response Playbook

### Breach Response (5 Passos)

#### 1. Containment (Isolamento)

**Objetivo:** Parar o ataque e isolar sistemas comprometidos.

**Ações:**

- [ ] Desconectar sistema comprometido da rede (se viável)
- [ ] Revogar credenciais suspeitas (API keys, tokens, senhas)
- [ ] Bloquear IPs maliciosos no Railway (se possível)
- [ ] Ativar modo de manutenção (maintenance mode)

**Exemplo:**

```bash
# Revogar API keys comprometidas
railway variables set OPENAI_API_KEY=REVOKED
railway variables set PERPLEXITY_API_KEY=REVOKED

# Ativar modo de manutenção
railway variables set MAINTENANCE_MODE=true
```

---

#### 2. Assessment (Avaliação)

**Objetivo:** Identificar escopo do breach (quais dados vazaram, quantos usuários afetados).

**Ações:**

- [ ] Revisar logs de acesso (quem acessou o quê?)
- [ ] Identificar data/hora do breach
- [ ] Determinar quais dados foram comprometidos
- [ ] Estimar número de usuários afetados

**Queries de investigação:**

```sql
-- Acessos suspeitos nas últimas 24h
SELECT * FROM audit_logs
WHERE event_type = 'data.access'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Logins de IPs desconhecidos
SELECT user_id, ip_address, COUNT(*) as attempts
FROM auth_logs
WHERE success = true
AND ip_address NOT IN (SELECT known_ip FROM user_trusted_ips)
GROUP BY user_id, ip_address
ORDER BY attempts DESC;
```

---

#### 3. Eradication (Erradicação)

**Objetivo:** Remover vulnerabilidade e atacante do sistema.

**Ações:**

- [ ] Aplicar patch de segurança (fix da vulnerabilidade)
- [ ] Remover backdoors instalados pelo atacante
- [ ] Resetar todas as senhas de usuários afetados
- [ ] Rotacionar todos os secrets (API keys, JWT secret, DB password)

**Exemplo:**

```bash
# Aplicar fix via Git
git pull origin security-patch
npm ci
npm run build
railway up

# Rotacionar secrets
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set DATABASE_PASSWORD=$(openssl rand -base64 24)
```

---

#### 4. Recovery (Recuperação)

**Objetivo:** Restaurar sistema para operação normal.

**Ações:**

- [ ] Restaurar backup (se dados foram corrompidos)
- [ ] Reativar sistema
- [ ] Monitorar tráfego anômalo por 48h
- [ ] Notificar usuários afetados (LGPD Art. 48)

**Exemplo de notificação (LGPD):**

```
Assunto: [URGENTE] Incidente de Segurança - ETP Express

Prezado(a) usuário(a),

Detectamos um incidente de segurança em [DATA]. Os seguintes dados podem ter sido comprometidos:
- Emails de usuários
- ETPs criados entre [DATA1] e [DATA2]

Ações tomadas:
- Vulnerabilidade corrigida
- Senhas resetadas (você receberá email de reset)
- Monitoramento reforçado

Recomendamos:
- Trocar sua senha imediatamente
- Habilitar autenticação de dois fatores (se disponível)
- Monitorar atividade suspeita na sua conta

Para mais informações: security@confenge.com.br

Atenciosamente,
Equipe de Segurança - ETP Express
```

---

#### 5. Lessons Learned (Lições Aprendidas)

**Objetivo:** Documentar incidente e prevenir recorrência.

**Ações:**

- [ ] Realizar post-mortem meeting (blame-free)
- [ ] Documentar timeline do incidente
- [ ] Identificar root cause (causa raiz)
- [ ] Implementar controles preventivos
- [ ] Atualizar runbooks de segurança

**Template de Post-Mortem:**

```markdown
# Post-Mortem: [TÍTULO DO INCIDENTE]

**Data do Incidente:** 2025-11-26
**Severidade:** HIGH
**Duração:** 2h 30min

## Timeline

- 10:00 - Alerta de tráfego anômalo
- 10:15 - Confirmação de breach (SQL injection)
- 10:30 - Containment (maintenance mode ativado)
- 11:00 - Patch aplicado (prepared statements)
- 12:30 - Sistema restaurado

## Root Cause

Query SQL concatenada em `/api/users/search` (falta de prepared statements)

## Impact

- 50 usuários afetados
- Emails vazados (nenhuma senha comprometida - bcrypt)

## What Went Well

- Detecção rápida (alertas de logging)
- Resposta em < 3 horas

## What Went Wrong

- Code review não detectou SQL injection
- Sem testes de segurança automatizados

## Action Items

- [ ] Implementar SAST (Semgrep) no CI/CD
- [ ] Adicionar security checklist ao PR template
- [ ] Treinar time em OWASP Top 10 (#300 - este documento)
```

---

### Security Incident Examples

#### Exemplo 1: Exposed API Key

**Cenário:** API key do OpenAI commitada no GitHub.

**Response:**

```bash
# 1. Containment
# Revogar API key IMEDIATAMENTE no dashboard da OpenAI
# Remover do GitHub
git filter-branch --force --index-filter \
 "git rm --cached --ignore-unmatch .env" \
 --prune-empty --tag-name-filter cat -- --all

# 2. Assessment
# Verificar logs da OpenAI (usage)
# Determinar se houve uso não autorizado

# 3. Eradication
# Gerar nova API key
# Adicionar ao Railway (variável de ambiente)

# 4. Recovery
# Deploy com nova key
railway up

# 5. Lessons Learned
# ✅ Gitleaks pre-commit hook (#154) previne isso!
```

---

#### Exemplo 2: SQL Injection Detected

**Cenário:** WAF detectou tentativa de SQL injection.

**Response:**

```bash
# 1. Containment
# Bloquear IP do atacante
# Ativar rate limiting mais agressivo

# 2. Assessment
# Revisar logs (query foi bem-sucedida?)
SELECT * FROM audit_logs WHERE event_type = 'sql.error';

# 3. Eradication
# Aplicar fix (usar prepared statements - TypeORM)
# Exemplo já mostrado em A03: Injection

# 4. Recovery
# Deploy do fix
# Monitorar por 48h

# 5. Lessons Learned
# Implementar SAST (Semgrep) para detectar SQL injection no CI
```

---

#### Exemplo 3: DDoS Attack

**Cenário:** 10,000 req/s de IPs diferentes.

**Response:**

```bash
# 1. Containment
# Ativar Cloudflare DDoS protection (se disponível)
# Rate limiting mais agressivo (1 req/s)

# 2. Assessment
# Identificar padrão de ataque (User-Agent, origem geográfica)

# 3. Eradication
# Challenge (CAPTCHA) em endpoints públicos
# IP blocklist (ASNs maliciosos)

# 4. Recovery
# Gradualmente relaxar rate limiting
# Monitorar tráfego

# 5. Lessons Learned
# Considerar Railway rate limiting nativo
# Implementar CAPTCHA em formulários públicos
```

---

## 5. Code Review Security Checklist

**Checklist para PRs (Security-Focused):**

### Input Validation

- [ ] **Inputs são validados?** (class-validator, Joi, Zod)
- [ ] **Sanitização de HTML/XSS?** (DOMPurify para dangerouslySetInnerHTML)
- [ ] **Type safety?** (TypeScript strict mode, no `any`)
- [ ] **File uploads validados?** (MIME type, tamanho, extension whitelist)

### Database Security

- [ ] **Queries usam prepared statements?** (TypeORM QueryBuilder, não raw queries)
- [ ] **Transactions para operações críticas?** (ACID compliance)
- [ ] **Indexes em campos sensíveis?** (performance + brute force mitigation)

### Authentication & Authorization

- [ ] **Autenticação implementada?** (`@UseGuards(JwtAuthGuard)`)
- [ ] **Autorização verificada?** (user ownership, RBAC)
- [ ] **Tokens com expiração?** (JWT expiresIn: '15m')
- [ ] **Rate limiting em endpoints sensíveis?** (login, password reset)

### Secrets & Configuration

- [ ] **Secrets hardcoded?** (RED FLAG - REJECT PR)
- [ ] **Variáveis de ambiente usadas?** (`process.env.API_KEY`)
- [ ] **.env no .gitignore?** (verificar)

### Logging & Monitoring

- [ ] **Logs não expõem dados sensíveis?** (passwords, tokens, PII)
- [ ] **Logs estruturados?** (JSON format para parsing)
- [ ] **Security events logados?** (login, access denied, etc)

### HTTPS/TLS

- [ ] **HTTPS forçado em produção?** (redirect HTTP → HTTPS)
- [ ] **Cookies com Secure flag?** (`sameSite: 'strict', secure: true`)
- [ ] **HSTS header ativado?** (Strict-Transport-Security)

### Rate Limiting & DDoS

- [ ] **Rate limiting aplicado?** (global + per-endpoint)
- [ ] **Request size limits?** (body-parser limit)

### LGPD/Privacy

- [ ] **Consentimento explícito?** (checkbox LGPD)
- [ ] **Minimização de dados?** (coletar apenas necessário)
- [ ] **Soft delete implementado?** (direito de exclusão)

### Dependencies

- [ ] **npm audit passou?** (sem HIGH/CRITICAL)
- [ ] **Dependências atualizadas?** (npm outdated)

---

## 6. LGPD/Privacy Considerations

### Minimização de Dados (Art. 6º, III)

**Princípio:** Coletar apenas dados necessários para a finalidade.

**❌ Não fazer:**

```typescript
// Coletar dados desnecessários
interface User {
 email: string;
 password: string;
 cpf: string; // ❌ Necessário?
 motherName: string; // ❌ Necessário?
 birthDate: Date; // ❌ Necessário?
}
```

**✅ Fazer:**

```typescript
// Coletar apenas essencial
interface User {
 email: string;
 password: string;
 organizationId: string; // Necessário para multitenancy
}
```

---

### Consentimento Explícito (Art. 7º, I)

**Requerimento:** Usuário deve consentir explicitamente com coleta de dados.

**✅ Implementação:**

```tsx
// frontend/src/components/Auth/RegisterForm.tsx
function RegisterForm() {
 const [acceptedLGPD, setAcceptedLGPD] = useState(false);

 return (
 <form onSubmit={handleSubmit}>
 <input type="email" name="email" required />
 <input type="password" name="password" required />

 {/* ✅ Checkbox de consentimento LGPD */}
 <label>
 <input
 type="checkbox"
 checked={acceptedLGPD}
 onChange={(e) => setAcceptedLGPD(e.target.checked)}
 required
 />
 Li e concordo com a{' '}
 <a href="/privacy-policy" target="_blank">
 Política de Privacidade
 </a>{' '}
 e com o tratamento dos meus dados conforme LGPD.
 </label>

 <button type="submit" disabled={!acceptedLGPD}>
 Cadastrar
 </button>
 </form>
 );
}
```

---

### Direito de Exclusão (Art. 18, VI)

**Requerimento:** Titular pode solicitar exclusão de dados pessoais.

**✅ Soft Delete (Recomendado):**

```typescript
// Soft delete permite rollback e compliance (retenção mínima)
@Entity()
export class User {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 @Column()
 email: string;

 @DeleteDateColumn() // ✅ Soft delete (nullable timestamp)
 deletedAt?: Date;
}

// Marcar usuário como deletado
async deleteUser(userId: string) {
 await this.userRepository.softDelete(userId);

 // Log de auditoria (LGPD Art. 37)
 this.logger.log({
 event: 'user.deleted',
 userId,
 requestedBy: userId,
 timestamp: new Date().toISOString(),
 });
}

// Hard delete após 30 dias (período de graça)
@Cron('0 0 * * *') // Daily
async purgeDeletedUsers() {
 const thirtyDaysAgo = new Date();
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

 await this.userRepository
 .createQueryBuilder()
 .delete()
 .where('deletedAt < :date', { date: thirtyDaysAgo })
 .execute();
}
```

---

### Transferência Internacional (Art. 33)

**Requerimento:** Informar titular sobre transferência internacional de dados.

**Contexto ETP Express:**

- **OpenAI API:** Dados enviados para USA (servidores OpenAI)
- **Perplexity API:** Dados enviados para USA (servidores Perplexity)
- **Railway PaaS:** Dados hospedados em USA (se região US-West)

**✅ Disclosure na Política de Privacidade:**

```markdown
## Transferência Internacional de Dados

A ETP Express utiliza serviços de terceiros localizados nos Estados Unidos:

- **OpenAI**: Geração de conteúdo via GPT-4
- **Perplexity**: Validação de informações
- **Railway**: Hospedagem de infraestrutura

Ao usar nosso serviço, você consente com a transferência de seus dados para estes provedores,
que estão sujeitos às leis de proteção de dados dos EUA (CCPA, SOC 2).

Implementamos medidas de segurança (criptografia TLS, pseudonimização) para proteger seus dados.
```

---

### Referências LGPD

**Documentação já implementada:**

- ✅ `docs/LGPD_COMPLIANCE_CHECKLIST.md` (#266)
- ✅ `docs/LGPD_DATA_PROTECTION_POLICY.md` (#267)
- ✅ `docs/LGPD_PRIVACY_POLICY.md` (#268)
- ✅ `docs/LGPD_CONSENT_MANAGEMENT.md` (#269)

**Guias de implementação:**

- ✅ Data Export: #233-#239 (7 sub-issues)
- ✅ LGPD Audit v2: #261-#269 (9 sub-issues)

---

## 7. Training Resources

### OWASP Resources

**OWASP Top 10 (2023):**

- https://owasp.org/Top10/

**OWASP Cheat Sheets:**

- https://cheatsheetseries.owasp.org/
- SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

**OWASP Testing Guide:**

- https://owasp.org/www-project-web-security-testing-guide/

---

### PortSwigger Web Security Academy

**Free interactive labs:**

- https://portswigger.net/web-security
- SQL Injection labs: https://portswigger.net/web-security/sql-injection
- XSS labs: https://portswigger.net/web-security/cross-site-scripting
- Authentication labs: https://portswigger.net/web-security/authentication

---

### HackerOne Hacker101

**Free video courses:**

- https://www.hacker101.com/
- Introduction to Web Hacking
- SQL Injection
- XSS and Authorization

---

### NIST Cybersecurity Framework

**Incident Response Guide (SP 800-61):**

- https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final

**Secure Software Development Framework (SSDF):**

- https://csrc.nist.gov/publications/detail/sp/800-218/final

---

### Books & Further Reading

**Recommended Books:**

1. **"The Web Application Hacker's Handbook"** - Dafydd Stuttard (Bible of web security)
2. **"Bulletproof SSL and TLS"** - Ivan Ristić
3. **"Security Engineering"** - Ross Anderson (free online)

**LGPD Resources:**

- Lei 14.133/2021 (Lei de Licitações): https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm
- ANPD (Autoridade Nacional de Proteção de Dados): https://www.gov.br/anpd/pt-br

---

### Internal Training

**Quarterly Security Reviews:**

- Q1: OWASP Top 10 Deep Dive
- Q2: Incident Response Drill (tabletop exercise)
- Q3: Secure Coding Patterns (NestJS/React específico)
- Q4: LGPD Compliance & Privacy

**Security Champions Program:**

- Designar 1 "security champion" por squad
- Champions revisam PRs com foco em segurança
- Champions participam de treinamentos avançados

---

## Changelog

| Version | Date | Changes |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0 | 2025-11-26 | Initial release - OWASP Top 10 (2023), Secret Management, Dependency Security, Incident Response, Code Review Checklist, LGPD, Training Resources |

---

## Contact

**Security Questions:**
security@confenge.com.br

**Report Vulnerabilities:**
See `SECURITY.md` (Vulnerability Disclosure Policy)

---

** Remember: Security is not a feature, it's a mindset. Code defensively, validate everything, trust no one.**
