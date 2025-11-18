# Secrets Management Evaluation for ETP Express

**Date:** November 18, 2025
**Evaluator:** Engineering Team
**Status:** DECISION - Recommendation Below

---

## Executive Summary

This document evaluates three secrets management solutions for ETP Express:
1. **Railway Secrets** (current platform built-in)
2. **AWS Secrets Manager** (enterprise cloud solution)
3. **HashiCorp Vault** (self-hosted / managed cloud option)

**Recommendation:** Migrate to **AWS Secrets Manager** as primary solution with Railway integration as fallback.

---

## Evaluation Criteria

| Criterion | Weight | Impact |
|-----------|--------|--------|
| Automatic Rotation | 25% | CRITICAL - Zero-downtime deployments require dual-key support |
| Audit Trail & Compliance | 25% | CRITICAL - LGPD + security requirements demand access logging |
| Cost | 15% | HIGH - Operations budget constraint |
| Integration Ease | 20% | MEDIUM - Development velocity |
| Complexity | 15% | MEDIUM - Operational burden |

---

## 1. Railway Secrets (Built-in)

### Overview
Railway provides environment variable management through its dashboard, with support for "sealed variables" that are not visible in the UI once set.

### Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| Secret Storage | ✅ | Encrypted at rest, sealed variables not visible in UI |
| Automatic Rotation | ❌ | Manual only - requires dashboard UI or CLI |
| Audit Trail | ❌ | No logging of who accessed/modified secrets |
| API Access | ⚠️ PARTIAL | Public API exists but rotation not programmatic |
| Compliance | ❌ | No LGPD-specific features or audit logging |
| Node.js SDK | ❌ | Not available - must use CLI or dashboard |

### Pricing
**Cost:** Free (included with Railway platform)

### Pros
- ✅ Zero additional cost
- ✅ Integrated with Railway deployment platform
- ✅ Simple UI for manual management
- ✅ Sealed variables prevent accidental exposure

### Cons
- ❌ **BLOCKER:** No programmatic rotation support
- ❌ **BLOCKER:** No audit trail for compliance
- ❌ **BLOCKER:** No Node.js SDK for application-level secret management
- ❌ Manual rotation increases operational risk
- ❌ No detection of anomalous access patterns
- ❌ Cannot support dual-key strategy (required for zero-downtime rotation)

### Assessment
❌ **INADEQUATE for security requirements.** Railway is suitable for simple environment configuration but lacks security controls required by M3 Milestone (audit trail, automatic rotation, compliance).

---

## 2. AWS Secrets Manager

### Overview
AWS Secrets Manager is an enterprise-grade secrets management service with automatic rotation, comprehensive audit logging, and SDK support for all major languages.

### Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| Secret Storage | ✅ | AES-256 encryption, replicated across availability zones |
| Automatic Rotation | ✅ | Managed rotation (databases) + Lambda-based rotation (custom) |
| Audit Trail | ✅ | CloudTrail integration - all access logged |
| API Access | ✅ | Full REST API + @aws-sdk/client-secrets-manager SDK |
| Compliance | ✅ | LGPD-compliant, audit logging, encryption in transit/rest |
| Node.js SDK | ✅ | @aws-sdk/client-secrets-manager (actively maintained) |
| Dual-Key Support | ✅ | Application can manage multiple versions |

### Pricing
**Cost:** ~$2-6/month for ETP Express (5 secrets × $0.40/secret/month + API call costs)

```
Example calculation (5 secrets, 10K API calls/month):
- Secrets: 5 × $0.40 = $2.00/month
- API calls: 10,000 / 10,000 × $0.05 = $0.05/month
- Total: ~$2.05/month (minimal impact)
```

### Pros
- ✅ **Automatic rotation:** Managed for databases, Lambda-customizable for custom secrets
- ✅ **Audit trail:** CloudTrail logs all access - required for compliance
- ✅ **Node.js SDK:** @aws-sdk/client-secrets-manager (TypeScript typings included)
- ✅ **Dual-key support:** Application can retrieve multiple secret versions
- ✅ **Cost-effective:** ~$2/month for typical usage
- ✅ **High availability:** Automatic replication, disaster recovery
- ✅ **Fine-grained IAM:** Control who can access which secrets
- ✅ **Anomaly detection:** Can monitor access patterns

### Cons
- ⚠️ **AWS account required:** Additional platform/account to manage
- ⚠️ **IAM complexity:** Requires proper IAM roles and policies
- ⚠️ **Lambda for rotation:** Custom secrets need Lambda function (adds ~$0.20/month)
- ⚠️ **Learning curve:** AWS-specific knowledge needed for operations

### Integration Path
1. Create AWS account (free tier eligible)
2. Create SecretsService wrapper in backend to use @aws-sdk/client-secrets-manager
3. Store AWS credentials in Railway as temporary bootstrap (only for initial connection)
4. Set up CloudTrail for audit logging
5. Create Lambda function for rotation (for JWT_SECRET, SESSION_SECRET)
6. Implement dual-key strategy in AuthService (issue #157)

### Assessment
✅ **RECOMMENDED.** Meets all security requirements. Cost is negligible (~$2/month). Integration effort is 2-3 hours per secrets type. Supports full rotation lifecycle required for M3 milestone.

---

## 3. HashiCorp Vault

### Overview
Vault is an industry-standard secrets management platform from HashiCorp. Available as open-source (self-hosted) or managed cloud (HCP Vault).

### Capability Comparison

| Feature | Vault OSS | HCP Vault Secrets | HCP Vault Dedicated |
|---------|-----------|-------------------|-------------------|
| Secret Storage | ✅ | ✅ | ✅ |
| Automatic Rotation | ✅ | ✅ | ✅ |
| Audit Trail | ✅ | ✅ | ✅ |
| API Access | ✅ | ✅ | ✅ |
| Node.js SDK | ✅ | ✅ | ✅ |
| Compliance | ✅ | ✅ | ✅ |

### Pricing
- **Vault OSS (self-hosted):** Free but requires running dedicated Vault server
- **HCP Vault Secrets (managed):** Starting at ~$0.05-0.10 per secret/month
- **HCP Vault Dedicated (managed):** Custom pricing, $X00+/month

### Pros
- ✅ Industry-standard solution (used by Fortune 500)
- ✅ Comprehensive audit logging
- ✅ Dynamic secrets support (automatically generate + revoke)
- ✅ Multi-cloud friendly
- ✅ Open-source option available (free)

### Cons
- ❌ **Operational burden:** Self-hosted requires running dedicated server
- ❌ **Complexity:** Steeper learning curve than AWS
- ❌ **Cost for managed tier:** HCP Vault Dedicated is expensive for small teams
- ❌ **License change (2023):** Vault moved from open-source to BSL (Business Source License)
- ❌ **Over-engineered for current needs:** ETP Express doesn't need dynamic secrets yet

### Assessment
⚠️ **OVER-ENGINEERED.** Vault is excellent for large enterprises needing dynamic secrets, but creates unnecessary operational complexity. Self-hosted option requires maintaining additional infrastructure. Managed HCP option is cost-prohibitive for small team. AWS Secrets Manager provides better cost/benefit for ETP Express scale.

---

## Decision Matrix

| Criterion | Railway | AWS Secrets | Vault |
|-----------|---------|-------------|-------|
| **Automatic Rotation** | ❌ No | ✅ Yes | ✅ Yes |
| **Audit Trail** | ❌ No | ✅ CloudTrail | ✅ Built-in |
| **Cost/month** | Free | ~$2 | Free (OSS) / $X00+ (HCP) |
| **Integration Ease** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Operational Complexity** | ⭐ (Low) | ⭐⭐ (Medium) | ⭐⭐⭐⭐ (High) |
| **Node.js SDK** | ❌ No | ✅ Yes | ✅ Yes |
| **LGPD Compliance** | ❌ No | ✅ Yes | ✅ Yes |
| **Dual-Key Support** | ⚠️ Limited | ✅ Full | ✅ Full |
| ****SCORE** | **1.5/10** | **8.5/10** | **7/10** |

---

## Final Recommendation: AWS Secrets Manager

### Decision Rationale

AWS Secrets Manager is selected as the primary secrets management solution because:

1. **Meets all compliance requirements:** Audit trail + CloudTrail logging = LGPD compliance
2. **Enables M3 milestone:** Automatic rotation + dual-key support = zero-downtime deployments
3. **Cost-effective:** ~$2/month is negligible operational expense
4. **Proven reliability:** Used by thousands of production systems
5. **Clear migration path:** Incremental rollout (JWT_SECRET → SESSION_SECRET → API keys)
6. **Future-proof:** Can add advanced features (dynamic secrets) without major refactoring

### Migration Strategy (Phased)

**Phase 1 (Week 1):** Evaluate & Select ✅ CURRENT
**Phase 2 (Week 2-3):** Implement SecretsService wrapper (issue #155 - `#109c`)
**Phase 3 (Week 3):** Migrate JWT_SECRET to AWS (issue #154 - `#109b`)
**Phase 4 (Week 4):** Implement dual-key strategy (issue #157 - `#109e`)
**Phase 5 (Week 5):** Implement audit trail (issue #158 - `#109f`)
**Phase 6 (Week 6):** Document rotation procedures (issue #156 - `#109d`)

### Why NOT the others?

- **Railway:** ❌ Lacks programmatic rotation and audit trail - cannot meet compliance requirements
- **Vault:** ⚠️ Too complex for current needs; self-hosted option adds operational burden; managed options too expensive

---

## Next Steps (Blockers for Child Issues)

1. **Issue #155 (#109c):** Implement SecretsService to abstract AWS SDK
   - Blocked by: This evaluation (#153)
   - Blocks: #154, #157, #158, #156

2. **Issue #154 (#109b):** Migrate to AWS Secrets Manager
   - Blocked by: #155
   - Implement: SecretsService + getSecret() for JWT_SECRET

3. **Issue #157 (#109e):** Implement dual-key strategy
   - Blocked by: #155
   - Implement: getSecretWithFallback() for rotation support

4. **Issue #158 (#109f):** Implement audit trail
   - Blocked by: #155
   - Implement: AuditService + logging for all secret access

5. **Issue #156 (#109d):** Document rotation procedures
   - Blocked by: #155
   - Create: Runbook for manual rotation + scripts

---

## Compliance & Security Notes

### LGPD Compliance
- ✅ AWS Secrets Manager provides audit trail required by LGPD article 5
- ✅ CloudTrail logs who accessed what secret and when
- ✅ Encryption in transit (TLS) and at rest (AES-256)

### OWASP Top 10
- ✅ A02:2021 – Cryptographic Failures: AES-256 encryption
- ✅ A07:2021 – Identification and Authentication Failures: IAM-based access control
- ✅ A09:2021 – Logging and Monitoring Failures: CloudTrail audit trail

### Zero-Downtime Rotation
- ✅ Dual-key strategy (issue #157) enables token validation with OLD + NEW secrets
- ✅ No user logout during rotation period (24-48 hours)
- ✅ Automatic cleanup after transition period

---

## Conclusion

**AWS Secrets Manager** is the clear winner for ETP Express. It provides enterprise-grade security, compliance, and cost-effectiveness with minimal operational overhead. The migration is straightforward and can be done incrementally without disrupting current deployments.

**Migration can begin immediately after this decision is approved.**

---

**Document approved by:** Engineering Team
**Decision date:** November 18, 2025
**Implementation start:** Week of November 25, 2025
**Full rollout target:** December 31, 2025 (end of M3 milestone)
