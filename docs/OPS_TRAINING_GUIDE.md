# Operations Training Guide - ETP Express

**Version:** 1.0.0
**Last Updated:** 2025-12-21
**Responsible:** DevOps/Operations Team
**Estimated Training Time:** 4-6 hours

---

## Overview

This guide provides a structured learning path for new team members joining the ETP Express operations team. It consolidates references to existing documentation and provides practical exercises for each module.

### Prerequisites

Before starting this training:

- [ ] Access to Railway Dashboard (etp-express project)
- [ ] Access to Sentry Dashboard
- [ ] Access to GitHub repository (CONFENGE/etp-express)
- [ ] Access to Discord server (ops channel)
- [ ] Development environment configured locally
- [ ] Read ARCHITECTURE.md (high-level overview)

### Training Structure

| Module | Topic                         | Duration | Documentation             |
| ------ | ----------------------------- | -------- | ------------------------- |
| 1      | System Architecture           | 30 min   | ARCHITECTURE.md           |
| 2      | SLA Levels and Response Times | 30 min   | docs/SLA.md               |
| 3      | Monitoring and Alerting       | 45 min   | docs/OPS_ALERTING.md      |
| 4      | Operational Procedures        | 60 min   | docs/OPS_RUNBOOK.md       |
| 5      | Troubleshooting               | 45 min   | docs/TROUBLESHOOTING.md   |
| 6      | Incident Response             | 60 min   | docs/INCIDENT_RESPONSE.md |

---

## Module 1: System Architecture

**Duration:** 30 minutes
**Documentation:** [ARCHITECTURE.md](../ARCHITECTURE.md)

### Learning Objectives

After completing this module, you should be able to:

- Describe the ETP Express system components
- Explain the data flow from user input to PDF generation
- Identify the external services and their purposes
- Understand the Railway infrastructure setup

### Key Concepts

**Stack Overview:**

```
Frontend (React/Vite) → Backend (NestJS) → PostgreSQL
                              ↓
                     External APIs
                     ├── OpenAI (LLM)
                     ├── Exa (Web Search)
                     └── Gov APIs (PNCP, SINAPI)
```

**Infrastructure (Railway):**

| Service              | Purpose             | Health Check    |
| -------------------- | ------------------- | --------------- |
| etp-express-backend  | API Server (NestJS) | /api/health     |
| etp-express-frontend | Web App (React)     | /               |
| PostgreSQL           | Database            | Connection pool |
| Redis                | Job Queue (BullMQ)  | Connection test |

### Exercise 1.1: Explore the Infrastructure

1. Access Railway Dashboard
2. Identify the 4 main services
3. Check the environment variables configured (do NOT copy values)
4. View recent deployment logs

**Validation Questions:**

- [ ] What is the maximum number of PostgreSQL connections?
- [ ] What is the purpose of BullMQ in the system?
- [ ] Which external APIs does the backend integrate with?

---

## Module 2: SLA Levels and Response Times

**Duration:** 30 minutes
**Documentation:** [docs/SLA.md](SLA.md)

### Learning Objectives

After completing this module, you should be able to:

- Classify incidents by severity (P0-P3)
- Know the response time for each severity level
- Understand the escalation process
- Apply SLOs (Service Level Objectives) to monitoring

### Severity Classification

| Level | Name     | Response Time | Example                         |
| ----- | -------- | ------------- | ------------------------------- |
| P0    | Critical | 15 min        | System completely down          |
| P1    | High     | 1 hour        | LLM generation failing          |
| P2    | Medium   | 4 hours       | Dashboard analytics not loading |
| P3    | Low      | 24 hours      | Visual bug in component         |

### Exercise 2.1: Incident Classification

Classify the following scenarios:

1. "Users cannot login - all authentication attempts fail"
   - Severity: \_\_\_
   - Justification: \_\_\_

2. "PDF export takes 30 seconds instead of 5 seconds"
   - Severity: \_\_\_
   - Justification: \_\_\_

3. "Help text has a typo"
   - Severity: \_\_\_
   - Justification: \_\_\_

4. "Database connection pool exhausted - 500 errors on all requests"
   - Severity: \_\_\_
   - Justification: \_\_\_

**Expected Answers:** P0/P1, P1/P2, P3, P0

### SLOs (Service Level Objectives)

| Metric            | Target | Measurement |
| ----------------- | ------ | ----------- |
| Uptime            | 99.5%  | Monthly     |
| API Latency (p95) | < 2s   | Per request |
| Error Rate        | < 1%   | Rolling 24h |
| LLM Generation    | < 30s  | Per section |

---

## Module 3: Monitoring and Alerting

**Duration:** 45 minutes
**Documentation:** [docs/OPS_ALERTING.md](OPS_ALERTING.md)

### Learning Objectives

After completing this module, you should be able to:

- Navigate the Sentry Dashboard
- Configure and interpret Railway metrics
- Understand Discord notification workflow
- Acknowledge and respond to alerts

### Monitoring Stack

| Tool          | Purpose                        | Access          |
| ------------- | ------------------------------ | --------------- |
| Sentry        | Error tracking and performance | sentry.io       |
| Railway       | Infrastructure metrics         | railway.app     |
| Discord       | Team notifications             | Webhook channel |
| GitHub Issues | Incident tracking              | github.com      |

### Exercise 3.1: Sentry Navigation

1. Access Sentry Dashboard
2. Filter errors by environment: `production`
3. Identify the top 3 most frequent errors
4. View error details and stack trace

**Validation Questions:**

- [ ] How do you filter errors by time range?
- [ ] How do you mark an error as "resolved"?
- [ ] What information is captured in the error context?

### Exercise 3.2: Railway Metrics

1. Access Railway Dashboard
2. View CPU and Memory usage for the last 24h
3. Check recent deployment history
4. View environment variables (names only)

**Validation Questions:**

- [ ] What is the current memory usage of the backend service?
- [ ] How many deployments occurred in the last 7 days?
- [ ] How do you trigger a manual redeploy?

### Alert Response Flow

```
Alert Triggered (Sentry/Railway)
         │
         ▼
Discord Notification Received
         │
         ▼
Acknowledge Alert (reply in thread)
         │
         ▼
Classify Severity (P0-P3)
         │
         ▼
Follow SLA Response Time
         │
         ▼
Document Resolution (GitHub Issue)
```

---

## Module 4: Operational Procedures

**Duration:** 60 minutes
**Documentation:** [docs/OPS_RUNBOOK.md](OPS_RUNBOOK.md)

### Learning Objectives

After completing this module, you should be able to:

- Execute secret rotation (dual-key strategy)
- Run database migrations safely
- Scale services on Railway
- Perform rollback of deployments

### Common Procedures

| Procedure             | Frequency | Risk Level | Time   |
| --------------------- | --------- | ---------- | ------ |
| Secret Rotation (JWT) | Monthly   | High       | 10 min |
| Database Migration    | On demand | High       | 15 min |
| Service Scaling       | On demand | Low        | 5 min  |
| Deployment Rollback   | Emergency | Medium     | 5 min  |

### Exercise 4.1: Secret Rotation Walkthrough

Read the "Secret Rotation" section in OPS_RUNBOOK.md and answer:

1. What is the dual-key strategy?
2. Why do we keep JWT_SECRET_OLD for 24-48h?
3. What command generates a new secret?

**Validation:**

```bash
# Generate new secret (practice only - do NOT apply in production)
openssl rand -base64 32
```

### Exercise 4.2: Rollback Simulation

Describe the steps to rollback a failed deployment:

1. ***
2. ***
3. ***
4. ***

**Reference:** OPS_RUNBOOK.md Section 6

### Critical Commands Reference

```bash
# View logs (real-time)
railway logs --service=etp-express-backend

# Check service status
railway status

# Trigger redeploy
railway redeploy

# View environment variables
railway variables
```

---

## Module 5: Troubleshooting

**Duration:** 45 minutes
**Documentation:** [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Learning Objectives

After completing this module, you should be able to:

- Diagnose common errors using logs
- Identify root causes of failures
- Apply documented solutions
- Know when to escalate

### Common Issues and Solutions

| Symptom                   | Probable Cause                  | Solution                       |
| ------------------------- | ------------------------------- | ------------------------------ |
| 502 Bad Gateway           | Backend crashed                 | Check logs, restart service    |
| Connection pool exhausted | Too many DB connections         | Restart backend, check leaks   |
| LLM timeout               | OpenAI API slow/down            | Retry, check status.openai.com |
| JWT invalid               | Token expired or secret rotated | User re-login, verify secret   |

### Exercise 5.1: Log Analysis

Analyze the following log excerpt and identify the problem:

```
[ERROR] 2025-12-21 10:45:32 QueryFailedError: Connection terminated unexpectedly
    at PostgresQueryRunner.query (...)
    at EtpRepository.findOne (...)
[ERROR] 2025-12-21 10:45:33 NestJS Error: Unable to connect to the database
```

**Questions:**

1. What is the probable cause?
2. What is the immediate action?
3. What is the long-term fix?

### Exercise 5.2: Troubleshooting Flowchart

```
User Reports Error
       │
       ▼
┌──────────────────┐
│ Check Sentry for │
│ recent errors    │
└────────┬─────────┘
         │
    Error found?
    ├── Yes → Analyze stack trace
    │         └── Known issue? → Apply documented fix
    │                        └── New issue → Create GitHub issue
    └── No → Check Railway logs
             └── Service healthy?
                 ├── Yes → Check user's browser console
                 └── No → Follow incident response
```

---

## Module 6: Incident Response

**Duration:** 60 minutes
**Documentation:** [docs/INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)

### Learning Objectives

After completing this module, you should be able to:

- Follow the incident response playbook
- Communicate effectively during incidents
- Document post-incident reviews
- Participate in incident simulations

### Incident Response Roles

| Role                | Responsibility                       | When Active                    |
| ------------------- | ------------------------------------ | ------------------------------ |
| First Responder     | Triage, immediate mitigation         | Always (on-call)               |
| Escalation Engineer | Complex diagnosis, hotfixes          | When First Responder escalates |
| Incident Commander  | Coordination, external communication | P0 incidents                   |

### Exercise 6.1: Incident Simulation

**Scenario:** Users report they cannot login. All authentication attempts return 500 error.

**Step 1: Triage**

- [ ] Check Sentry for errors
- [ ] Check Railway backend logs
- [ ] Verify database connectivity

**Step 2: Classification**

- Severity: \_\_\_
- Response Time: \_\_\_

**Step 3: Communication**
Draft a message for the Discord #incidents channel:

```
[INCIDENT] <title>
Severity: <P0/P1/P2/P3>
Status: Investigating
Impact: <description>
ETA: <estimated resolution time>
```

**Step 4: Resolution**

- [ ] Identify root cause
- [ ] Apply fix
- [ ] Verify resolution
- [ ] Communicate resolution

**Step 5: Post-Incident**

- [ ] Create GitHub issue for tracking
- [ ] Schedule post-mortem (for P0/P1)
- [ ] Document lessons learned

### Communication Templates

**Incident Started:**

```
[INCIDENT] Authentication system unavailable
Severity: P0
Status: Investigating
Impact: All users unable to login
ETA: Assessing
```

**Incident Resolved:**

```
[RESOLVED] Authentication system unavailable
Duration: 25 minutes
Root Cause: Database connection pool exhausted
Resolution: Restarted backend service, increased pool limits
Follow-up: GitHub issue #XXX for post-mortem
```

---

## Certification Checklist

Complete all items below to be certified for on-call duty:

### Knowledge Verification

- [ ] Can explain ETP Express architecture (Module 1)
- [ ] Can classify incidents by severity P0-P3 (Module 2)
- [ ] Can navigate Sentry and Railway dashboards (Module 3)
- [ ] Understands secret rotation procedure (Module 4)
- [ ] Can diagnose common errors from logs (Module 5)
- [ ] Knows the incident response flow (Module 6)

### Practical Skills

- [ ] Successfully completed Exercise 1.1 (Infrastructure exploration)
- [ ] Successfully completed Exercise 2.1 (Incident classification)
- [ ] Successfully completed Exercise 3.1 (Sentry navigation)
- [ ] Successfully completed Exercise 3.2 (Railway metrics)
- [ ] Successfully completed Exercise 5.1 (Log analysis)
- [ ] Successfully completed Exercise 6.1 (Incident simulation)

### Access Verification

- [ ] Railway Dashboard access confirmed
- [ ] Sentry Dashboard access confirmed
- [ ] GitHub repository access confirmed
- [ ] Discord ops channel access confirmed

### Certification Sign-off

```
Trainee Name: _______________________
Trainer Name: _______________________
Date: _______________________
Certification: [ ] Approved [ ] Needs Review
Notes: _______________________
```

---

## Additional Resources

### Documentation

| Document                                                       | Description                         |
| -------------------------------------------------------------- | ----------------------------------- |
| [ARCHITECTURE.md](../ARCHITECTURE.md)                          | System architecture overview        |
| [SLA.md](SLA.md)                                               | Service Level Agreement definitions |
| [OPS_RUNBOOK.md](OPS_RUNBOOK.md)                               | Operational procedures              |
| [OPS_ALERTING.md](OPS_ALERTING.md)                             | Alerting configuration              |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md)                       | Common issues and solutions         |
| [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)                   | Incident response playbook          |
| [SECRET_ROTATION_PROCEDURES.md](SECRET_ROTATION_PROCEDURES.md) | Detailed secret rotation            |

### External Resources

| Resource     | URL              | Purpose                         |
| ------------ | ---------------- | ------------------------------- |
| Railway Docs | docs.railway.app | Infrastructure documentation    |
| Sentry Docs  | docs.sentry.io   | Error tracking documentation    |
| NestJS Docs  | docs.nestjs.com  | Backend framework documentation |

### Contacts

| Role               | Contact                | Availability      |
| ------------------ | ---------------------- | ----------------- |
| Tech Lead          | See internal directory | Business hours    |
| DevOps             | See internal directory | On-call rotation  |
| Incident Commander | See internal directory | P0 incidents only |

---

## Revision History

| Version | Date       | Author      | Changes         |
| ------- | ---------- | ----------- | --------------- |
| 1.0.0   | 2025-12-21 | DevOps Team | Initial version |
