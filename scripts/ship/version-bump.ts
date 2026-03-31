/**
 * aing Version Bump — Semantic Version Auto-Detection
 * Reads VERSION file, determines bump type from diff, writes new version.
 * @module scripts/ship/version-bump
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('version-bump');

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export type BumpType = 'major' | 'minor' | 'patch';

export interface BumpSignals {
  filesChanged?: number;
  hasBreaking: boolean;
  hasNewFeature: boolean;
  hasBugFix?: boolean;
}

export interface BumpResult {
  oldVersion: string;
  newVersion: string;
  bumpType: string;
}

/**
 * Parse semantic version string.
 */
export function parseVersion(version: string): SemVer {
  const clean = version.replace(/^v/, '').trim();
  const [major, minor, patch] = clean.split('.').map(Number);
  return { major: major || 0, minor: minor || 0, patch: patch || 0 };
}

/**
 * Determine bump type from change signals.
 */
export function determineBumpType(signals: BumpSignals): BumpType {
  if (signals.hasBreaking) return 'major';
  if (signals.hasNewFeature) return 'minor';
  return 'patch';
}

/**
 * Bump version and write to VERSION file.
 */
export function bumpVersion(bumpType: BumpType, projectDir?: string): BumpResult {
  const dir = projectDir || process.cwd();

  // Try VERSION file, then package.json
  const versionFile = join(dir, 'VERSION');
  const pkgFile = join(dir, 'package.json');
  let oldVersion = '0.0.0';
  let source: 'VERSION' | 'package.json' = 'VERSION';

  if (existsSync(versionFile)) {
    oldVersion = readFileSync(versionFile, 'utf-8').trim();
  } else if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    oldVersion = pkg.version || '0.0.0';
    source = 'package.json';
  }

  const parsed = parseVersion(oldVersion);

  switch (bumpType) {
    case 'major':
      parsed.major++;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor++;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch++;
      break;
  }

  const newVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;

  // Write back
  if (source === 'VERSION') {
    writeFileSync(versionFile, newVersion + '\n');
  }
  // Note: package.json version bump is left to npm version or manual

  log.info(`Version bumped: ${oldVersion} → ${newVersion} (${bumpType})`);
  return { oldVersion, newVersion, bumpType };
}

/**
 * Read current version without modifying.
 */
export function readVersion(projectDir?: string): string {
  const dir = projectDir || process.cwd();
  const versionFile = join(dir, 'VERSION');
  const pkgFile = join(dir, 'package.json');

  if (existsSync(versionFile)) {
    return readFileSync(versionFile, 'utf-8').trim();
  }
  if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));
    return pkg.version || '0.0.0';
  }
  return '0.0.0';
}
