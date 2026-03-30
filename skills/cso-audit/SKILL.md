---
name: cso-audit
description: |
  Chief Security Officer audit. 14-phase security review covering
  OWASP Top 10, STRIDE model, secrets archaeology, dependency supply
  chain, and CI/CD security. Uses Milla agent. Use when asked to
  "security audit", "check security", or "CSO review".
---

# /aing cso-audit — Security Audit

## 14-Phase Audit

### Phase 0: Stack Detection
- Identify frameworks, languages, databases
- Map the technology stack

### Phase 1: Attack Surface Census
- List all entry points (API routes, webhooks, forms)
- Map authentication boundaries
- Identify public vs protected endpoints

### Phase 2: Secrets Archaeology
```bash
# Scan git history for leaked secrets
git log --all --diff-filter=D -- '*.env' '*.key' '*.pem'
grep -rn "password\|secret\|api.key\|token" --include='*.ts' --include='*.js' .
```

### Phase 3: Dependency Supply Chain
- Check for known CVEs: `npm audit`
- Check for deprecated packages
- Check for packages with <100 weekly downloads

### Phase 4: CI/CD Security
- Check for unpinned GitHub Actions
- Check for script injection in CI
- Check for leaked env vars in logs

### Phase 5: Infrastructure Security
- Check TLS configuration
- Verify CSP headers
- Check CORS policy

### Phase 6: Authentication Review
- Verify token expiry and rotation
- Check password hashing (bcrypt/argon2)
- Review session management

### Phase 7: Authorization Review
- Check RBAC/ABAC implementation
- Verify endpoint-level authorization
- Test for IDOR vulnerabilities

### Phase 8: Input Validation
- Check for SQL injection vectors
- Check for XSS vulnerabilities
- Verify file upload restrictions

### Phase 9: LLM Trust Boundaries
- Check prompt injection vectors
- Verify output sanitization
- Review tool-use permissions

### Phase 10: Data Classification
- Identify PII handling
- Check encryption at rest
- Verify data retention policies

### Phase 11: Webhook Security
- Verify signature validation
- Check replay protection
- Review webhook endpoint exposure

### Phase 12: OWASP Top 10 Sweep
- Systematic check against current OWASP Top 10
- Map findings to OWASP categories

### Phase 13: STRIDE Model Analysis
- Spoofing, Tampering, Repudiation
- Information Disclosure, Denial of Service, Elevation of Privilege

### Phase 14: Findings Report

## Severity Levels
- **CRITICAL**: Exploitable now, data loss possible
- **HIGH**: Exploitable with effort, significant impact
- **MEDIUM**: Requires specific conditions
- **LOW**: Defense in depth, best practice

## False Positive Filtering
Each finding must include:
- Reproduction steps
- Affected code path
- Confidence level (HIGH/MEDIUM/LOW)

## Output
Write to `.aing/reviews/cso-audit-{date}.md`
