/**
 * aing Deploy Platform Detector
 * Absorbed from gstack's /setup-deploy platform detection.
 *
 * Auto-detects deployment platform from project files.
 * Priority: Fly.io -> Render -> Vercel -> Netlify -> GitHub Actions -> Manual
 *
 * @module scripts/ship/deploy-detect
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';

const log = createLogger('deploy-detect');

export interface PlatformConfig {
  appName: string | null;
  url: string | null;
  deployCmd: string;
  healthCheck: string;
}

export interface Platform {
  id: string;
  name: string;
  detect: (dir: string) => boolean;
  getConfig: (dir: string) => PlatformConfig;
}

export interface DetectResult {
  platform: Platform | null;
  config: PlatformConfig | null;
}

export interface HealthCheckResult {
  healthy: boolean;
  statusCode: number | null;
  error?: string;
}

/**
 * Supported platforms with detection heuristics.
 */
export const PLATFORMS: Platform[] = [
  {
    id: 'fly',
    name: 'Fly.io',
    detect: (dir: string): boolean => existsSync(join(dir, 'fly.toml')),
    getConfig: (dir: string): PlatformConfig => {
      const content = readFileSync(join(dir, 'fly.toml'), 'utf-8');
      const appMatch = content.match(/^app\s*=\s*"?([^"\n]+)"?/m);
      return {
        appName: appMatch?.[1]?.trim() ?? null,
        url: appMatch ? `https://${appMatch[1].trim()}.fly.dev` : null,
        deployCmd: 'fly deploy',
        healthCheck: 'curl -sf',
      };
    },
  },
  {
    id: 'render',
    name: 'Render',
    detect: (dir: string): boolean => existsSync(join(dir, 'render.yaml')),
    getConfig: (dir: string): PlatformConfig => {
      const content = readFileSync(join(dir, 'render.yaml'), 'utf-8');
      const nameMatch = content.match(/name:\s*(.+)/);
      return {
        appName: nameMatch?.[1]?.trim() ?? null,
        url: nameMatch ? `https://${nameMatch[1].trim()}.onrender.com` : null,
        deployCmd: 'auto on push',
        healthCheck: 'curl -sf',
      };
    },
  },
  {
    id: 'vercel',
    name: 'Vercel',
    detect: (dir: string): boolean => existsSync(join(dir, 'vercel.json')) || existsSync(join(dir, '.vercel')),
    getConfig: (): PlatformConfig => ({
      appName: null,
      url: null,
      deployCmd: 'vercel deploy',
      healthCheck: 'vercel inspect',
    }),
  },
  {
    id: 'netlify',
    name: 'Netlify',
    detect: (dir: string): boolean => existsSync(join(dir, 'netlify.toml')),
    getConfig: (): PlatformConfig => ({
      appName: null,
      url: null,
      deployCmd: 'auto on push',
      healthCheck: 'curl -sf',
    }),
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    detect: (dir: string): boolean => existsSync(join(dir, '.github', 'workflows')),
    getConfig: (dir: string): PlatformConfig => {
      let workflows: string[] = [];
      try {
        workflows = readdirSync(join(dir, '.github', 'workflows'))
          .filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));
      } catch {}
      return {
        appName: null,
        url: null,
        deployCmd: `GitHub Actions (${workflows.length} workflows)`,
        healthCheck: 'gh run view',
      };
    },
  },
];

/**
 * Detect deployment platform.
 */
export function detectPlatform(projectDir?: string): DetectResult {
  const dir = projectDir || process.cwd();

  for (const platform of PLATFORMS) {
    if (platform.detect(dir)) {
      const config = platform.getConfig(dir);
      log.info(`Platform detected: ${platform.name}`);
      return { platform, config };
    }
  }

  log.info('No deployment platform detected');
  return { platform: null, config: null };
}

/**
 * Format deploy config for CLAUDE.md or display.
 */
export function formatDeployConfig(result: DetectResult): string {
  if (!result.platform) {
    return 'Deploy: No platform detected. Manual configuration required.';
  }

  const { platform, config } = result;
  const lines: string[] = [
    `## Deploy Configuration`,
    `- Platform: ${platform.name}`,
    `- App: ${config!.appName || 'unknown'}`,
    `- URL: ${config!.url || 'unknown'}`,
    `- Deploy: ${config!.deployCmd}`,
    `- Health check: ${config!.healthCheck}`,
  ];

  return lines.join('\n');
}

/**
 * Run health check against deployed URL.
 * Note: Uses execSync with curl (fixed command template, URL from config not user input).
 */
export function healthCheck(url: string): HealthCheckResult {
  if (!url) return { healthy: false, statusCode: null, error: 'No URL provided' };

  try {
    const result = execSync(
      `curl -sf "${url}" -o /dev/null -w "%{http_code}" 2>/dev/null`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    const code = parseInt(result);
    return { healthy: code >= 200 && code < 400, statusCode: code };
  } catch {
    return { healthy: false, statusCode: null, error: 'Unreachable' };
  }
}
