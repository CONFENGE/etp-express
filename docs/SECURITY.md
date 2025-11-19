# Security Documentation - ETP Express

## Overview

This document describes the security practices and procedures for the ETP Express project, with special focus on **secrets management** and **secret scanning**.

## Table of Contents

- [Secret Scanning](#secret-scanning)
- [GitHub Secret Scanning Setup](#github-secret-scanning-setup)
- [What to Do If a Secret is Detected](#what-to-do-if-a-secret-is-detected)
- [Secret Rotation Procedures](#secret-rotation-procedures)
- [Best Practices](#best-practices)

---

## Secret Scanning

ETP Express uses multiple layers of secret detection to prevent accidental exposure of sensitive information:

### 1. Pre-Commit Hook (Local)

**Tool:** Gitleaks (via Husky)
**When:** Before every commit
**Location:** `.husky/pre-commit`

The pre-commit hook automatically scans staged files for secrets before allowing a commit. If a secret is detected, the commit is blocked.

#### Installation

Gitleaks must be installed locally for the pre-commit hook to work:

**Windows (Chocolatey):**
```bash
choco install gitleaks
```

**Windows (Scoop):**
```bash
scoop install gitleaks
```

**macOS (Homebrew):**
```bash
brew install gitleaks
```

**Linux:**
```bash
# Download from GitHub releases
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

#### Verify Installation

```bash
gitleaks version
```

#### Test Pre-Commit Hook

Try committing a file with a fake secret:

```bash
echo "API_KEY=sk-1234567890abcdef" > test-secret.txt
git add test-secret.txt
git commit -m "test"
```

Expected output:
```
❌ Secret detected! Commit blocked.
   Remove the secret and try again.
```

### 2. GitHub Secret Scanning (Remote)

**Tool:** GitHub Advanced Security
**When:** On every push to GitHub
**Location:** Repository Settings

#### Setup Instructions

1. Navigate to repository settings: `https://github.com/tjsasakifln/etp-express/settings`
2. Go to **Security > Code security and analysis**
3. Enable the following features:
   - ✅ **Secret scanning** - Detects secrets in repository
   - ✅ **Push protection** - Blocks pushes containing secrets
   - ✅ **Dependency graph** - Analyzes dependencies
   - ✅ **Dependabot alerts** - Security vulnerability alerts

#### Access Secret Alerts

If GitHub detects a secret:
1. Go to **Security > Secret scanning alerts**
2. Review the detected secret
3. Follow remediation steps below

### 3. CI/CD Workflow (Automated)

**Tool:** Gitleaks GitHub Action
**When:** On every push, PR, and daily at 3 AM UTC
**Location:** `.github/workflows/secret-scan.yml`

The CI/CD workflow performs a comprehensive scan of the entire repository history, including:
- All branches
- All commits (full history)
- All files (even deleted ones)

#### Workflow Triggers

- ✅ Every push to any branch
- ✅ Every pull request
- ✅ Daily scheduled scan (3 AM UTC)
- ✅ Manual trigger via Actions tab

#### View Scan Results

1. Go to **Actions** tab
2. Click on **Secret Scanning** workflow
3. Review the latest run
4. If secrets found, download the **gitleaks-report** artifact

---

## What to Do If a Secret is Detected

### Step 1: Identify the Secret

Review the Gitleaks output or GitHub alert to identify:
- **What** secret was detected (API key, password, token, etc.)
- **Where** it was found (file, line number, commit)
- **When** it was committed (commit hash, date)

### Step 2: Determine Severity

| Secret Type | Severity | Immediate Action |
|-------------|----------|------------------|
| Production API Key (OpenAI, Perplexity) | 🔴 **CRITICAL** | Rotate immediately |
| JWT_SECRET | 🔴 **CRITICAL** | Rotate immediately |
| DATABASE_URL (production) | 🔴 **CRITICAL** | Rotate immediately |
| Development/Test credentials | 🟡 **MEDIUM** | Rotate within 24h |
| False positive | 🟢 **LOW** | Update `.gitleaks.toml` |

### Step 3: Rotate the Secret (CRITICAL)

**If the secret is real and exposed in a public commit:**

1. **Immediately rotate the secret:**
   ```bash
   # For OpenAI API Key:
   # 1. Go to https://platform.openai.com/api-keys
   # 2. Revoke the old key
   # 3. Generate a new key
   # 4. Update Railway environment variables

   # For JWT_SECRET:
   openssl rand -base64 64
   # Update in Railway Secrets
   ```

2. **Remove the secret from code:**
   ```bash
   # Remove the file or line containing the secret
   git rm <file-with-secret>
   # OR edit the file to remove the secret
   ```

3. **Update environment variables:**
   ```bash
   # Railway dashboard:
   # Settings > Variables > Add new variable
   ```

4. **Commit the fix:**
   ```bash
   git add .
   git commit -m "security: remove leaked secret and rotate credentials"
   git push
   ```

### Step 4: Scrub Git History (If Needed)

**⚠️ WARNING: This rewrites history and should only be done if absolutely necessary**

If the secret was committed to a public repository:

```bash
# Install BFG Repo Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Create a file with secrets to remove
echo "sk-1234567890abcdef" > secrets.txt

# Scrub the secret from history
java -jar bfg-1.14.0.jar --replace-text secrets.txt

# Force push (WARNING: Coordinate with team first!)
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Alternative (safer): Create new repository**
If the secret was exposed in a public repo for an extended period, consider:
1. Creating a fresh repository
2. Migrating code without history
3. Archiving the old repository

### Step 5: Document the Incident

Create an incident report:
```markdown
# Security Incident Report

**Date:** YYYY-MM-DD
**Severity:** Critical/High/Medium/Low
**Secret Type:** API Key / Password / Token

## What Happened
- Secret <type> was committed to <file> in commit <hash>
- Detected by: Pre-commit hook / GitHub Scanning / CI/CD

## Actions Taken
- [ ] Secret rotated (old: XXX, new: YYY)
- [ ] Environment variables updated
- [ ] Git history scrubbed (if applicable)
- [ ] Team notified

## Prevention
- Lessons learned
- Improvements to scanning rules
```

---

## False Positives

If Gitleaks detects a false positive (e.g., example code, documentation):

### Update `.gitleaks.toml`

Add the file to the allowlist:

```toml
[allowlist]
paths = [
  '''docs/examples/api-key-example\.md$''',
  '''tests/fixtures/fake-secrets\.ts$''',
]
```

Or add a specific regex to ignore:

```toml
[allowlist]
regexes = [
  '''sk-example-not-a-real-key''',
]
```

---

## Secret Rotation Procedures

Procedures for rotating system secrets are fully documented in:

- **Complete Runbook:** [`docs/SECRET_ROTATION_PROCEDURES.md`](./SECRET_ROTATION_PROCEDURES.md)
- **Helper Script:** `scripts/rotate-secret.sh`
- **Issue Template:** `.github/ISSUE_TEMPLATE/rotate-secret.md`

### Rotation Schedule

| Secret | Frequency | Calendar Reminder |
|--------|-----------|-------------------|
| JWT_SECRET | Monthly | Day 25 of each month |
| SESSION_SECRET | Monthly | Day 25 of each month |
| OPENAI_API_KEY | Quarterly | Feb, May, Aug, Nov |
| PERPLEXITY_API_KEY | Quarterly | Feb, May, Aug, Nov |
| DATABASE_URL | On-demand | As needed |

### Quick Start

1. **Run the helper script:**
   ```bash
   ./scripts/rotate-secret.sh JWT_SECRET
   ```

2. **Follow the generated instructions**

3. **Update Railway Dashboard**

4. **Validate and update documentation**

For emergency rotations (compromised secrets), follow the Emergency Rotation Procedure in the runbook.

### Creating Rotation Issues

Use the GitHub issue template to create and track rotation tasks:

1. Go to **Issues > New Issue**
2. Select **"Secret Rotation"** template
3. Fill in the secret being rotated
4. Follow the checklist during rotation

---

## Best Practices

### DO ✅

- ✅ Use environment variables for ALL secrets
- ✅ Never hardcode secrets in source code
- ✅ Use Railway Secrets (env vars - sealed variables not visible in UI)
- ✅ Rotate secrets regularly (monthly for critical secrets)
- ✅ Use strong, randomly generated secrets
- ✅ Limit secret access to minimum required
- ✅ Enable MFA on accounts with secret access
- ✅ Review `.env.example` files (should have placeholder values only)
- ✅ Add `.env*` to `.gitignore`
- ✅ Use separate secrets for dev/staging/production

### DON'T ❌

- ❌ Never commit `.env` files
- ❌ Never commit API keys in code
- ❌ Never share secrets via Slack/email/tickets
- ❌ Never use production secrets in development
- ❌ Never skip secret scanning warnings
- ❌ Never disable the pre-commit hook
- ❌ Never use weak/guessable secrets (e.g., "secret123")
- ❌ Never reuse secrets across projects

---

## Environment File Templates

### `.env.example` (Safe to Commit)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/etp_express

# JWT
JWT_SECRET=your-jwt-secret-here-minimum-32-characters
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Perplexity
PERPLEXITY_API_KEY=pplx-your-perplexity-api-key-here

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### `.env` (NEVER Commit!)

```bash
# REAL VALUES - NEVER COMMIT THIS FILE
DATABASE_URL=postgresql://prod_user:x8K2mP9qL4nR@db.railway.app:5432/prod_etp
JWT_SECRET=Kj8mN2pQ5sT7vX9zA3cF6hJ8kL2nP4rS6tV8xZ1bD3fG5hJ7kM9nQ2rT4vW6yB8dF0g
OPENAI_API_KEY=sk-proj-abc123def456...
PERPLEXITY_API_KEY=pplx-xyz789uvw012...
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://etp-express.railway.app
```

---

## Configuration Files

### `.gitleaks.toml`

Custom rules for ETP Express are defined in `.gitleaks.toml`. This file contains:
- **Allowlists**: Paths/files to ignore (e.g., `docs/`, `*.md`)
- **Custom rules**: Project-specific secret patterns
- **False positive exceptions**: Known safe patterns

To update rules:
```bash
# Edit .gitleaks.toml
# Test locally
gitleaks detect --source . --verbose --config .gitleaks.toml
```

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. **DO** email the security team: security@example.com (update this)
3. **DO** include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and coordinate disclosure.

---

## Additional Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Railway Secrets Documentation](https://docs.railway.app/guides/variables)

---

**Last Updated:** 2025-11-19
**Maintained By:** ETP Express Security Team
