# Security Policy

## Reporting a Vulnerability

We take the security of ETP Express seriously. If you discover a security vulnerability, please report it to us responsibly.

### How to Report

**Email:** security@confenge.com.br

**Please include:**

- **Description**: Clear description of the vulnerability
- **Steps to Reproduce**: Detailed step-by-step instructions to reproduce the issue
- **Proof of Concept**: PoC code, screenshots, or HTTP requests demonstrating the vulnerability
- **Impact Assessment**: Your evaluation of the potential impact (data exposure, privilege escalation, etc.)
- **Affected Components**: Which parts of the system are affected (frontend, backend, API, database)
- **Your Contact Information**: For acknowledgment and follow-up questions

### Vulnerability Report Template

```markdown
**Summary:**
[Brief one-line description]

**Vulnerability Type:**
[e.g., SQL Injection, XSS, CSRF, Authentication Bypass]

**Affected Component:**
[e.g., /api/etps/:id endpoint, Login form, etc.]

**Steps to Reproduce:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Proof of Concept:**
[Code snippet, HTTP request, or screenshot]

**Impact:**
[What can an attacker achieve? Data breach, account takeover, DoS?]

**Suggested Fix:**
[Optional: Your recommendation for remediation]

**Your Name/Handle:**
[For acknowledgment in Hall of Fame]
```

---

## Response Timeline

We are committed to responding to security reports promptly:

| Stage                  | Timeline                                                  |
| ---------------------- | --------------------------------------------------------- |
| **Acknowledgment**     | Within **48 hours** of report submission                  |
| **Initial Assessment** | Within **7 days** (CVSS scoring, severity classification) |
| **Status Updates**     | Every **7 days** until resolution                         |
| **Fix Implementation** | Based on severity (see SLA table below)                   |

### Fix SLA by Severity

| Severity     | CVSS Score | Time to Fix     | Time to Patch Release | Examples                                                                                 |
| ------------ | ---------- | --------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| **CRITICAL** | 9.0 - 10.0 | **7 days**      | **24 hours**          | Remote Code Execution (RCE), SQL Injection with data exfiltration, Authentication bypass |
| **HIGH**     | 7.0 - 8.9  | **30 days**     | **7 days**            | Cross-Site Scripting (XSS), Authorization bypass, Sensitive data exposure                |
| **MEDIUM**   | 4.0 - 6.9  | **90 days**     | **30 days**           | Cross-Site Request Forgery (CSRF), Information disclosure, Weak cryptography             |
| **LOW**      | 0.1 - 3.9  | **Best effort** | **Best effort**       | Minor information leakage, Non-exploitable bugs                                          |

**CVSS Calculator:** https://www.first.org/cvss/calculator/3.1

---

## Safe Harbor

We support responsible security research and will not pursue legal action against researchers who:

### Allowed Activities

✅ Test vulnerabilities on your own test accounts or with explicit permission
✅ Report vulnerabilities through the designated channel (security@confenge.com.br)
✅ Provide reasonable time for us to fix the issue before public disclosure
✅ Make a good faith effort to avoid privacy violations, data destruction, and service disruption

### Prohibited Activities

❌ Access or modify other users' data without explicit authorization
❌ Perform Denial of Service (DoS) or Distributed DoS (DDoS) attacks
❌ Execute social engineering attacks (phishing, pretexting) against employees or users
❌ Violate any laws or breach any agreements
❌ Publicly disclose the vulnerability before we have issued a fix

### Our Commitment

If you follow the guidelines above, we commit to:

- Not pursue or support any legal action related to your research
- Work with you to understand and validate the issue
- Acknowledge your contribution publicly (with your permission)
- Keep you informed of our progress toward a fix

---

## Supported Versions

We provide security patches for the following versions:

| Version      | Supported | Status                                                        |
| ------------ | --------- | ------------------------------------------------------------- |
| 1.x (latest) | ✅ Yes    | **Active development** - Security patches released within SLA |
| < 1.0        | ❌ No     | **End of Life (EOL)** - No security patches                   |

### Security Update Policy

- **Production Version**: We maintain security patches for the current major version (1.x) deployed on Railway
- **End of Life**: Versions older than the current major version will not receive security patches
- **Update Recommendation**: We strongly recommend all users update to the latest version within 30 days of release
- **Critical Patches**: For CRITICAL vulnerabilities, we may backport patches to the previous minor version (e.g., 1.1.x → 1.0.x) at our discretion

---

## Hall of Fame

We publicly acknowledge security researchers who help us improve ETP Express security:

### 2025

_Awaiting first security report! Be the first to contribute._

---

### How to Get Listed

1. Report a valid security vulnerability via security@confenge.com.br
2. Follow responsible disclosure guidelines (Safe Harbor section)
3. Provide your preferred name/handle for acknowledgment
4. We will add your name here after the vulnerability is fixed and disclosed

**Note:** Hall of Fame listing is at our discretion and depends on the severity and impact of the reported vulnerability. Duplicate reports may not be listed.

---

## Additional Resources

- **OWASP Top 10 (2023):** https://owasp.org/Top10/
- **LGPD Compliance:** See `docs/LGPD_*.md` for our Brazilian data protection compliance
- **Security Awareness Guide:** See `docs/SECURITY_AWARENESS_GUIDE.md` (internal)
- **Vulnerability Triage Process:** See `docs/SECURITY_TRIAGE_PROCESS.md` (internal)

---

## Contact

- **Security Email:** security@confenge.com.br
- **General Support:** Via GitHub Issues (for non-security bugs)
- **GitHub Security Advisories:** https://github.com/tjsasakifln/etp-express/security/advisories

---

**Last Updated:** 2025-11-26
**Policy Version:** 1.0.0

---

_Thank you for helping keep ETP Express and our users safe!_
