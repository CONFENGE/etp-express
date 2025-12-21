# Alerting & Notification Configuration

**Version:** 1.0
**Last Updated:** 2025-12-21
**Status:** Active
**Maintainer:** DevOps Team

---

## Overview

This document describes the alerting and notification configuration for ETP Express production environment. It complements `INCIDENT_RESPONSE.md` by providing setup and configuration details.

---

## Alerting Stack

| Component   | Purpose                   | Configuration      |
| ----------- | ------------------------- | ------------------ |
| **Sentry**  | Error tracking & alerting | Backend + Frontend |
| **Railway** | Infrastructure monitoring | Dashboard          |
| **Discord** | Team notifications        | Webhook            |
| **GitHub**  | Incident tracking         | Issue templates    |

---

## 1. Sentry Configuration

### Backend Setup

**Environment Variables (Railway):**

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=auto  # Uses git commit SHA
```

**Alert Rules:**

| Alert                   | Trigger                   | Notification      |
| ----------------------- | ------------------------- | ----------------- |
| High Error Rate         | >50 errors in 5 min       | Discord + Email   |
| Critical Error          | Fatal/Unhandled exception | Immediate Discord |
| Performance Degradation | p95 latency >5s           | Discord (warning) |

**Creating Alerts in Sentry:**

1. Go to: Settings > Alerts > Create Alert Rule
2. Select environment: `production`
3. Configure trigger conditions
4. Add Discord webhook action

### Frontend Setup

**Environment Variables (Railway/Vercel):**

```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
```

**Key Alerts:**

- Unhandled JS exceptions
- Failed network requests (API errors)
- React error boundaries triggered

---

## 2. Discord Webhook Configuration

### Setup Steps

1. **Create Discord Server** (if not exists):
   - Create channel `#alerts-production`
   - Create channel `#alerts-staging` (optional)

2. **Generate Webhook:**
   - Server Settings > Integrations > Webhooks
   - Create Webhook for `#alerts-production`
   - Copy webhook URL

3. **Configure Sentry Integration:**
   - Sentry > Settings > Integrations > Discord
   - Add webhook URL
   - Select alert rules to send

### Webhook URL Storage

**IMPORTANT:** Store webhook URL as environment variable, never in code.

```bash
# Railway environment variable
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/xxx
```

### Message Format

Sentry sends structured alerts to Discord:

```
🚨 **[P1] Error Alert**
━━━━━━━━━━━━━━━━━━━━━━
**Error:** NullPointerException in AuthService
**Environment:** production
**Count:** 47 occurrences
**First seen:** 5 minutes ago
**Link:** [View in Sentry](https://sentry.io/...)
```

---

## 3. Railway Monitoring

### Health Check Configuration

**Backend Health Endpoint:**

```
GET /api/health
GET /api/health/ready
```

**Railway Dashboard:**

- Service > Deployments > Enable health checks
- Failure threshold: 3 consecutive failures
- Check interval: 30 seconds

### Deploy Notifications

Railway can notify on deployment events:

1. Railway Dashboard > Project Settings > Webhooks
2. Add Discord webhook for deploy events:
   - `deployment.started`
   - `deployment.successful`
   - `deployment.failed`

---

## 4. GitHub Integration

### Incident Issue Template

Location: `.github/ISSUE_TEMPLATE/incident-report.yml`

Creates structured incident reports with:

- Severity level (P1-P4)
- Affected component
- Business impact
- Investigation notes

### Labels for Incidents

| Label                  | Description                | Color    |
| ---------------------- | -------------------------- | -------- |
| `incident`             | Production incident        | Red      |
| `severity/P1-critical` | Critical: Service down     | Dark Red |
| `severity/P2-high`     | High: Major feature broken | Orange   |
| `severity/P3-medium`   | Medium: Feature degraded   | Yellow   |
| `severity/P4-low`      | Low: Minor issue           | Green    |

---

## 5. Alert Response SLAs

| Severity          | Response Time | Escalation             |
| ----------------- | ------------- | ---------------------- |
| **P1 - Critical** | 15 minutes    | Immediate Discord ping |
| **P2 - High**     | 1 hour        | Discord + Email        |
| **P3 - Medium**   | 4 hours       | Email                  |
| **P4 - Low**      | 24 hours      | GitHub issue only      |

See `INCIDENT_RESPONSE.md` for detailed escalation procedures.

---

## 6. Notification Channels Summary

### Primary (Automated)

| Channel                      | Source  | Events              |
| ---------------------------- | ------- | ------------------- |
| Discord `#alerts-production` | Sentry  | Errors, performance |
| Discord `#alerts-production` | Railway | Deploy status       |
| Email                        | Sentry  | Critical alerts     |

### Secondary (Manual)

| Channel                      | When         | How             |
| ---------------------------- | ------------ | --------------- |
| Slack/Discord direct message | P1 incidents | Manual @mention |
| Phone call                   | P0 incidents | Escalation      |

---

## 7. Testing Alerts

### Verify Sentry Integration

```bash
# Trigger test error in backend (development only!)
curl -X POST http://localhost:3000/api/debug/test-sentry-error \
  -H "Authorization: Bearer <admin-token>"
```

### Verify Discord Webhook

```bash
# Send test message to Discord
curl -X POST $DISCORD_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"content": "🧪 Test alert from ETP Express alerting system"}'
```

---

## 8. Maintenance

### Monthly Tasks

- [ ] Review Sentry alert rules (adjust thresholds if needed)
- [ ] Verify Discord webhook is active
- [ ] Review false positive alerts
- [ ] Update contact list in INCIDENT_RESPONSE.md

### Quarterly Tasks

- [ ] Conduct alerting drill (simulate P2 incident)
- [ ] Review and update SLA response times
- [ ] Audit who has access to alerting dashboards

---

## Related Documentation

- `docs/INCIDENT_RESPONSE.md` - Full incident response playbook
- `docs/OPS_RUNBOOK.md` - Operational procedures
- `.github/ISSUE_TEMPLATE/incident-report.yml` - Incident issue template

---

**Document Version History:**

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0     | 2025-12-21 | Initial version |
