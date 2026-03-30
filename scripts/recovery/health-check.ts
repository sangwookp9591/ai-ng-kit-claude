/**
 * aing Health Check (Innovation #5 — Self-Healing Engine)
 * Validates integrity of state files and detects corruption.
 * @module scripts/recovery/health-check
 */

import { readState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const log = createLogger('health-check');

interface FileCheck {
  file: string;
  status: 'ok' | 'not_found' | 'corrupted';
  error?: string;
}

interface HealthCheckResult {
  healthy: boolean;
  checks: FileCheck[];
}

/**
 * Run health check on all aing state files.
 */
export function runHealthCheck(projectDir?: string): HealthCheckResult {
  const dir = projectDir || process.cwd();
  const checks: FileCheck[] = [];

  // Check PDCA state file
  checks.push(checkJsonFile(join(dir, '.aing', 'state', 'pdca-status.json'), 'pdca-status'));

  // Check project memory
  checks.push(checkJsonFile(join(dir, '.aing', 'project-memory.json'), 'project-memory'));

  // Check routing history
  checks.push(checkJsonFile(join(dir, '.aing', 'routing-history.json'), 'routing-history'));

  // Check circuit breaker state
  checks.push(checkJsonFile(join(dir, '.aing', 'state', 'circuit-breaker.json'), 'circuit-breaker'));

  const healthy = checks.every(c => c.status === 'ok' || c.status === 'not_found');

  if (!healthy) {
    const corrupted = checks.filter(c => c.status === 'corrupted');
    log.error('Health check failed', { corrupted: corrupted.map(c => c.file) });
  }

  return { healthy, checks };
}

function checkJsonFile(filePath: string, label: string): FileCheck {
  if (!existsSync(filePath)) {
    return { file: label, status: 'not_found' };
  }

  const result = readState(filePath);
  if (result.ok) {
    return { file: label, status: 'ok' };
  }

  return { file: label, status: 'corrupted', error: result.error };
}
