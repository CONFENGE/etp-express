---
name: Secret Rotation
about: Scheduled or emergency rotation of system secrets
title: '[SEC] Rotate SECRET_NAME - MONTH YEAR'
labels: security, ops
assignees: ''
---

## Secret to Rotate

Select the secret(s) to be rotated:

- [ ] JWT_SECRET (Monthly)
- [ ] SESSION_SECRET (Monthly)
- [ ] OPENAI_API_KEY (Quarterly)
- [ ] PERPLEXITY_API_KEY (Quarterly)
- [ ] DATABASE_URL (On-demand)

## Rotation Type

- [ ] Scheduled rotation (monthly/quarterly)
- [ ] Emergency rotation (potential compromise)

---

## Pre-Rotation Checklist

### Preparation

- [ ] Backup current secret value (stored securely)
- [ ] Access to Railway Dashboard confirmed
- [ ] Low-traffic period verified (if applicable)
- [ ] Reviewed procedure in `docs/SECRET_ROTATION_PROCEDURES.md`

### For API Keys Only

- [ ] Access to provider dashboard (OpenAI/Perplexity) confirmed

### For DATABASE_URL Only

- [ ] Database backup completed
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled

---

## Rotation Steps

Follow: `docs/SECRET_ROTATION_PROCEDURES.md`

### 1. Generate New Secret

- [ ] Generated new value using `./scripts/rotate-secret.sh`
- [ ] Or: Created new API key in provider dashboard
- [ ] Copied new value securely

### 2. Update in Railway

- [ ] Navigated to Railway Dashboard > Project > Backend Service > Variables
- [ ] Updated secret with new value
- [ ] Saved changes (triggered auto-redeploy)

### 3. Verify Deployment

- [ ] Railway deployment completed successfully
- [ ] No errors in deployment logs

---

## Post-Rotation Validation

### For JWT_SECRET / SESSION_SECRET

- [ ] Application starts without errors
- [ ] Login functionality works
- [ ] No 401 Unauthorized errors in logs
- [ ] Active sessions handled gracefully

### For OPENAI_API_KEY

- [ ] Section generation works
- [ ] No API errors in logs
- [ ] Response quality verified

### For PERPLEXITY_API_KEY

- [ ] Context queries work
- [ ] No API errors in logs

### For DATABASE_URL

- [ ] Database connection successful
- [ ] CRUD operations work
- [ ] No connection timeout errors

---

## Cleanup

### API Keys Only

- [ ] Old API key revoked in provider dashboard
- [ ] Revocation confirmed

### Documentation

- [ ] Updated `docs/SECRET_ROTATION_PROCEDURES.md` with new dates
- [ ] Updated "Last Rotated" column
- [ ] Updated "Next Rotation" column

---

## Notes

<!-- Add any relevant notes about this rotation -->

### Issues Encountered

<!-- Describe any problems and how they were resolved -->

### Rollback Required?

- [ ] No - Rotation successful
- [ ] Yes - Describe reason:

---

## Completion

- [ ] All validation checks passed
- [ ] Documentation updated
- [ ] Old credentials secured/revoked
- [ ] Issue ready to close

**Rotation completed by:** @username
**Completion date:** YYYY-MM-DD
