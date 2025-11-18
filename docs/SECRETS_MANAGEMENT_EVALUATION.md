# Secrets Management Strategy for ETP Express

**Date:** November 18, 2025
**Evaluator:** Engineering Team
**Status:** DECISION - Railway Secrets + Manual Rotation

---

## Executive Summary

**Decision: Use Railway native secrets management with documented manual rotation procedures.**

Given that ETP Express is **deployed exclusively on Railway**, adding external secrets management (AWS, Vault) introduces unnecessary operational complexity. Railway's built-in secrets infrastructure meets current needs with proper documentation and rotation procedures.

---

## Context

- ✅ Project deploys exclusively to Railway platform
- ✅ Railway provides sealed environment variables (not visible in UI)
- ✅ Secrets currently managed through Railway dashboard
- ⚠️ Need: Clear rotation procedures for compliance
- ❌ No need: Multi-platform secrets management (not relevant for MVP)

---

## Why NOT External Solutions?

### ❌ AWS Secrets Manager
**Problem:** Over-engineered for Railway-only deployment
- Adds AWS account management overhead
- Requires bootstrap credentials in Railway (defeats purpose)
- Increases operational burden (~$2/month isn't cost issue, **complexity is**)
- Creates fragmented secrets across two platforms
- **Verdict:** Only justified if scaling to multiple platforms

### ❌ HashiCorp Vault
**Problem:** Far too complex for current scale
- Requires running additional infrastructure
- Steep learning curve
- Enterprise-grade features not needed
- **Verdict:** Appropriate only for Fortune 500 multi-cloud scenarios

### ✅ Railway Secrets (Current)
**Advantages:**
- ✅ Already integrated with deployment pipeline
- ✅ Sealed variables prevent accidental exposure
- ✅ Zero additional infrastructure
- ✅ Simple UI for management
- ✅ No cost

**Limitations (acceptable for MVP):**
- ⚠️ Manual rotation (not automatic)
- ⚠️ No native audit trail
- ⚠️ No programmatic API for rotation

**Mitigation:**
- Document clear rotation procedures
- Create rotation scripts for automation
- Audit trail via Git + issue tracking
- Enforce rotation discipline through procedures

---

## Implementation Strategy

### Secrets to Manage

| Secret | Frequency | Rotation Method |
|--------|-----------|-----------------|
| JWT_SECRET | Monthly | Manual (documented procedure) |
| SESSION_SECRET | Monthly | Manual (documented procedure) |
| OPENAI_API_KEY | Quarterly | Manual (provider-managed) |
| PERPLEXITY_API_KEY | Quarterly | Manual (provider-managed) |
| DATABASE_URL | On-demand | Manual (PostgreSQL password change) |

### Manual Rotation Procedure

**Process for rotating any secret:**

```bash
# 1. Generate new secret value
openssl rand -base64 32  # for symmetric keys
# or use provider's API (OpenAI, Perplexity)

# 2. Update in Railway dashboard
# - Login to Railway
# - Select service → Variables
# - Update secret value
# - Save changes (triggers auto-redeploy)

# 3. Create GitHub issue for tracking
# - Title: "[SEC] Rotate SECRET_NAME"
# - Document: old value location (if needed for rollback)
# - Close issue when rotation complete

# 4. Validate
# - Check application logs for errors
# - Test affected functionality
# - Verify no 401/403 errors
```

### Rotation Schedule

Create calendar reminders:
- **Day 25 of each month:** Rotate JWT_SECRET + SESSION_SECRET
- **Quarterly dates:** Rotate OPENAI_API_KEY + PERPLEXITY_API_KEY
- **After each login:** Validate DATABASE_URL access

### Audit Trail (GitHub-based)

Track rotations via:
1. **GitHub Issues** - One issue per rotation cycle
   - Label: `security`, `maintenance`
   - Title: `[SEC] Rotate JWT_SECRET - Nov 2025`
   - Body: date, who rotated, validation results

2. **Git commits** - Any code changes for rotation automation
   - Signed commits with GPG
   - Conventional commit format: `chore(security): rotate secrets for Nov 2025`

3. **Railway deployment logs** - Auto-captured when variable changes

---

## Acceptance Criteria for M3 Milestone

Instead of external secrets system, M3 focuses on:

1. **Documentation** (Issue #156 - rename from #109d)
   - Rotation procedures documented in `docs/SECRETS_ROTATION_PROCEDURES.md`
   - Scripts created for assisted rotation
   - GitHub issue template for rotation tracking

2. **Process** (Issue #157 - rename from #109e)
   - Establish monthly rotation schedule
   - Create alert/reminder system (GitHub Actions or calendar)
   - Train team on procedures

3. **Monitoring** (Issue #158 - rename from #109f)
   - Monitor logs for authentication failures after rotation
   - Alert on unusual patterns (e.g., JWT validation errors)
   - Document recovery procedures if rotation breaks app

4. **Rollback Plan** (Issue #154 - new, adapted from #109b)
   - For each secret: document how to quickly revert
   - Test rollback procedure in staging
   - Keep old secret available for 24h after rotation

---

## Why This Approach is Better for MVP

| Aspect | External Solution | Railway + Manual |
|--------|------------------|-----------------|
| **Setup time** | 2-3 hours | 30 minutes |
| **Operational burden** | Medium (manage AWS account) | Low (procedures only) |
| **Cost** | $2/month + AWS account | $0 |
| **Learning curve** | High (AWS concepts) | Low (bash + GitHub) |
| **Complexity** | High (new platform) | Low (existing tools) |
| **Appropriate for MVP?** | ❌ No | ✅ Yes |
| **Future migration path** | N/A | Easy to migrate later if needed |

---

## When to Revisit This Decision

Re-evaluate for external secrets if:
- ✅ Deploying to multiple platforms (AWS, GCP, Azure, etc.)
- ✅ LGPD audit trail becomes regulatory requirement (not just "nice to have")
- ✅ Team grows and manual procedures become bottleneck
- ✅ API key rotation needs full automation

**For MVP (M1-M3):** Railway native secrets are sufficient.

---

## Next Steps (M3 Milestone)

| Issue | Focus | Effort |
|-------|-------|--------|
| #156 | Document rotation procedures | 2h |
| #157 | Create rotation scripts + schedule | 2h |
| #158 | Setup monitoring + alerts | 2h |
| #154 | Establish rollback procedures | 1h |
| **Total** | **Documentation + Process** | **7 hours** |

No code changes needed. Pure operational excellence.

---

## Conclusion

**Railway secrets + documented procedures is the pragmatic choice for ETP Express MVP.**

This decision:
- ✅ Reduces complexity from ~14h (external solution) to ~7h (procedures)
- ✅ Eliminates operational overhead
- ✅ Maintains path to upgrade later if needed
- ✅ Lets engineering focus on features, not infrastructure

If requirements change (multi-platform, regulatory audit trail), re-evaluate with fresh decision matrix.

---

**Decision made:** November 18, 2025
**Approved by:** Engineering Team
**Target completion:** End of M3 Milestone (Dec 4, 2025)
