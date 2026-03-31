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
/**
 * Supported platforms with detection heuristics.
 */
export const PLATFORMS = [
    {
        id: 'fly',
        name: 'Fly.io',
        detect: (dir) => existsSync(join(dir, 'fly.toml')),
        getConfig: (dir) => {
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
        detect: (dir) => existsSync(join(dir, 'render.yaml')),
        getConfig: (dir) => {
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
        detect: (dir) => existsSync(join(dir, 'vercel.json')) || existsSync(join(dir, '.vercel')),
        getConfig: () => ({
            appName: null,
            url: null,
            deployCmd: 'vercel deploy',
            healthCheck: 'vercel inspect',
        }),
    },
    {
        id: 'netlify',
        name: 'Netlify',
        detect: (dir) => existsSync(join(dir, 'netlify.toml')),
        getConfig: () => ({
            appName: null,
            url: null,
            deployCmd: 'auto on push',
            healthCheck: 'curl -sf',
        }),
    },
    {
        id: 'github-actions',
        name: 'GitHub Actions',
        detect: (dir) => existsSync(join(dir, '.github', 'workflows')),
        getConfig: (dir) => {
            let workflows = [];
            try {
                workflows = readdirSync(join(dir, '.github', 'workflows'))
                    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
            }
            catch { }
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
export function detectPlatform(projectDir) {
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
export function formatDeployConfig(result) {
    if (!result.platform) {
        return 'Deploy: No platform detected. Manual configuration required.';
    }
    const { platform, config } = result;
    const lines = [
        `## Deploy Configuration`,
        `- Platform: ${platform.name}`,
        `- App: ${config.appName || 'unknown'}`,
        `- URL: ${config.url || 'unknown'}`,
        `- Deploy: ${config.deployCmd}`,
        `- Health check: ${config.healthCheck}`,
    ];
    return lines.join('\n');
}
/**
 * Run health check against deployed URL.
 * Note: Uses execSync with curl (fixed command template, URL from config not user input).
 */
export function healthCheck(url) {
    if (!url)
        return { healthy: false, statusCode: null, error: 'No URL provided' };
    try {
        const result = execSync(`curl -sf "${url}" -o /dev/null -w "%{http_code}" 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 }).trim();
        const code = parseInt(result);
        return { healthy: code >= 200 && code < 400, statusCode: code };
    }
    catch {
        return { healthy: false, statusCode: null, error: 'Unreachable' };
    }
}
//# sourceMappingURL=deploy-detect.js.map