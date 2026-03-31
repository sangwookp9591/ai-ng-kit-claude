/**
 * aing CSO 14-Phase Security Audit
 * Integrates with Milla agent for comprehensive security assessment.
 *
 * @module scripts/review/cso-audit
 */
import { addEvidence } from '../evidence/evidence-chain.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('cso-audit');

export interface CSOPhase {
  id: number;
  name: string;
  description: string;
}

export interface SeverityInfo {
  label: string;
  requirement: string;
}

export interface OWASPCheck {
  patterns: string[];
  description: string;
}

export interface STRIDEDimension {
  name: string;
  question: string;
}

export interface FPRule {
  pattern: string;
  maxSeverity: string | null;
  reason: string;
}

export interface SecretPattern {
  pattern: string;
  name: string;
  severity: string;
}

export interface AuditPromptContext {
  phases?: number[];
  stack?: string;
}

export interface AuditFinding {
  title: string;
  severity: string;
  category: string;
  file: string;
  line: number;
  description: string;
  remediation: string;
  confidence: string;
  phase: number;
}

/**
 * 14-phase security audit structure.
 */
export const CSO_PHASES: CSOPhase[] = [
  { id: 0, name: 'stack-detection', description: 'Architecture mental model + stack detection' },
  { id: 1, name: 'attack-surface', description: 'Attack surface census (endpoints, auth, integrations)' },
  { id: 2, name: 'secrets-archaeology', description: 'Git history scan for leaked secrets (AKIA, sk-, ghp_, xoxb-)' },
  { id: 3, name: 'dependency-supply-chain', description: 'CVE audit + install script check + lockfile validation' },
  { id: 4, name: 'cicd-security', description: 'CI/CD pipeline (pull_request_target, unpinned actions, script injection)' },
  { id: 5, name: 'infrastructure', description: 'Docker, K8s, DB credentials, IAM permissions' },
  { id: 6, name: 'webhook-integration', description: 'Webhook signature verification, TLS, OAuth scope' },
  { id: 7, name: 'llm-security', description: 'Prompt injection, unsanitized output, tool validation' },
  { id: 8, name: 'skill-supply-chain', description: 'Credential exfiltration in skill files' },
  { id: 9, name: 'owasp-top10', description: 'OWASP A01-A10 targeted analysis' },
  { id: 10, name: 'stride-model', description: 'STRIDE threat model per component' },
  { id: 11, name: 'data-classification', description: 'Data sensitivity classification' },
  { id: 12, name: 'fp-filtering', description: 'False positive filtering + active verification' },
  { id: 13, name: 'findings-report', description: 'Structured findings with severity + remediation' },
];

/**
 * Severity levels with exploitation requirement.
 */
export const SEVERITY: Record<string, SeverityInfo> = {
  CRITICAL: { label: 'CRITICAL', requirement: 'Realistic exploitation scenario required' },
  HIGH: { label: 'HIGH', requirement: 'Demonstrated impact path' },
  MEDIUM: { label: 'MEDIUM', requirement: 'Potential risk with mitigating factors' },
};

/**
 * OWASP Top 10 categories with specific check patterns.
 */
export const OWASP_CHECKS: Record<string, OWASPCheck> = {
  'A01-broken-access-control': {
    patterns: ['skip_before_action', 'skip_authorization', 'public', 'no_auth', 'params[:id]', 'req.params.id'],
    description: 'Missing auth, direct object reference, privilege escalation',
  },
  'A02-cryptographic-failures': {
    patterns: ['MD5', 'SHA1', 'DES', 'ECB', 'hardcoded.*secret', 'password.*=.*"'],
    description: 'Weak crypto, hardcoded secrets, unencrypted sensitive data',
  },
  'A03-injection': {
    patterns: ['raw.*query', 'string.*interpolat.*sql', 'system(', 'exec(', 'html_safe', '.raw('],
    description: 'SQL, command, template, prompt injection',
  },
  'A04-insecure-design': {
    patterns: ['rate.*limit', 'lockout', 'max.*attempt'],
    description: 'Missing rate limits, no lockout, no server-side validation',
  },
  'A05-security-misconfiguration': {
    patterns: ['cors.*\\*', 'Access-Control.*\\*', 'debug.*true', 'verbose.*error'],
    description: 'CORS wildcard, missing CSP, debug in production',
  },
  'A06-vulnerable-components': {
    patterns: [],
    description: 'See Phase 3 (dependency supply chain)',
  },
  'A07-auth-failures': {
    patterns: ['session', 'jwt.*expir', 'refresh.*token', 'password.*policy'],
    description: 'Session management, JWT, password policy, MFA',
  },
  'A08-integrity-failures': {
    patterns: ['deserializ', 'JSON.parse.*user', 'pickle.load', 'Marshal.load'],
    description: 'Deserialization, CI/CD integrity, external data',
  },
  'A09-logging-monitoring': {
    patterns: ['audit.*log', 'security.*event', 'auth.*log'],
    description: 'Auth event logging, admin audit trail',
  },
  'A10-ssrf': {
    patterns: ['fetch.*user', 'request.*url.*param', 'http.*get.*input'],
    description: 'URL from user input, internal service exposure',
  },
};

/**
 * STRIDE threat model dimensions.
 */
export const STRIDE: Record<string, STRIDEDimension> = {
  S: { name: 'Spoofing', question: 'Can attacker impersonate user/service?' },
  T: { name: 'Tampering', question: 'Can data be modified in transit/at rest?' },
  R: { name: 'Repudiation', question: 'Can actions be denied? Audit trail?' },
  I: { name: 'Information Disclosure', question: 'Can sensitive data leak?' },
  D: { name: 'Denial of Service', question: 'Can component be overwhelmed?' },
  E: { name: 'Elevation of Privilege', question: 'Can user gain unauthorized access?' },
};

/**
 * False positive rules — known safe patterns.
 */
export const FP_RULES: FPRule[] = [
  { pattern: 'devDependency CVE', maxSeverity: 'MEDIUM', reason: 'Not in production bundle' },
  { pattern: 'node-gyp install script', maxSeverity: 'MEDIUM', reason: 'Expected native compilation' },
  { pattern: 'no-fix-available without exploit', maxSeverity: null, reason: 'Excluded' },
  { pattern: 'first-party actions unpinned', maxSeverity: 'MEDIUM', reason: 'Trusted source' },
  { pattern: 'pull_request_target without PR checkout', maxSeverity: null, reason: 'Safe pattern' },
  { pattern: 'secrets in with: blocks', maxSeverity: null, reason: 'Handled by runtime' },
  { pattern: 'placeholder values in .env.example', maxSeverity: null, reason: 'Not real secrets' },
  { pattern: 'test fixture secrets', maxSeverity: null, reason: 'Not real secrets' },
];

/**
 * Secret patterns to scan in git history.
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  { pattern: 'AKIA[0-9A-Z]{16}', name: 'AWS Access Key', severity: 'CRITICAL' },
  { pattern: 'sk_live_[a-zA-Z0-9]+', name: 'Stripe Secret Key', severity: 'CRITICAL' },
  { pattern: 'ghp_[a-zA-Z0-9]{36}', name: 'GitHub PAT', severity: 'CRITICAL' },
  { pattern: 'gho_[a-zA-Z0-9]{36}', name: 'GitHub OAuth Token', severity: 'CRITICAL' },
  { pattern: 'xoxb-[a-zA-Z0-9-]+', name: 'Slack Bot Token', severity: 'CRITICAL' },
  { pattern: 'xoxp-[a-zA-Z0-9-]+', name: 'Slack User Token', severity: 'CRITICAL' },
  { pattern: 'sk-[a-zA-Z0-9]{48}', name: 'OpenAI API Key', severity: 'CRITICAL' },
];

/**
 * Build CSO audit prompt for Milla agent.
 */
export function buildAuditPrompt(context: AuditPromptContext): string {
  const phases = context.phases || CSO_PHASES.map(p => p.id);
  const selectedPhases = CSO_PHASES.filter(p => phases.includes(p.id));

  const lines = [
    '# CSO Security Audit',
    '',
    `Tech Stack: ${context.stack || 'auto-detect'}`,
    '',
    '## Phases to Execute',
    '',
  ];

  for (const phase of selectedPhases) {
    lines.push(`### Phase ${phase.id}: ${phase.name}`);
    lines.push(phase.description);
    lines.push('');
  }

  lines.push('## Severity Rules');
  lines.push('- CRITICAL: realistic exploitation scenario required');
  lines.push('- HIGH: demonstrated impact path');
  lines.push('- MEDIUM: potential risk with mitigating factors');
  lines.push('');
  lines.push('## False Positive Rules');
  for (const rule of FP_RULES) {
    if (rule.maxSeverity) {
      lines.push(`- ${rule.pattern} → max ${rule.maxSeverity} (${rule.reason})`);
    } else {
      lines.push(`- ${rule.pattern} → EXCLUDED (${rule.reason})`);
    }
  }

  lines.push('');
  lines.push('## Output Format (per finding)');
  lines.push('```');
  lines.push('[Title] — [File:Line]');
  lines.push('Severity: CRITICAL | HIGH | MEDIUM');
  lines.push('Category: Secrets | Supply Chain | CI/CD | Infrastructure | OWASP A01-A10');
  lines.push('Description: What is wrong');
  lines.push('Evidence: Code snippet or config');
  lines.push('Exploitation: How attacker would exploit');
  lines.push('Remediation: How to fix');
  lines.push('Confidence: VERIFIED | LIKELY | UNCERTAIN');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Record CSO audit finding as evidence.
 */
export function recordFinding(feature: string, finding: AuditFinding, projectDir?: string): void {
  addEvidence(feature, {
    type: 'security-audit',
    result: finding.severity === 'CRITICAL' ? 'fail' : 'not_available',
    source: `cso-phase-${finding.phase}`,
    details: {
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      file: finding.file,
      line: finding.line,
      description: finding.description,
      remediation: finding.remediation,
      confidence: finding.confidence,
    },
  }, projectDir);

  log.info(`CSO finding: [${finding.severity}] ${finding.title} at ${finding.file}:${finding.line}`);
}

/**
 * Format audit summary.
 */
export function formatAuditSummary(findings: AuditFinding[]): string {
  const critical = findings.filter(f => f.severity === 'CRITICAL').length;
  const high = findings.filter(f => f.severity === 'HIGH').length;
  const medium = findings.filter(f => f.severity === 'MEDIUM').length;

  const lines = [
    `CSO Audit: ${findings.length} findings`,
    `  CRITICAL: ${critical}`,
    `  HIGH: ${high}`,
    `  MEDIUM: ${medium}`,
    '',
  ];

  if (critical > 0) {
    lines.push('Critical Findings:');
    for (const f of findings.filter(f => f.severity === 'CRITICAL')) {
      lines.push(`  ✗ ${f.title} — ${f.file}:${f.line}`);
    }
  }

  return lines.join('\n');
}
