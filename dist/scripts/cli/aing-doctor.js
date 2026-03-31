/**
 * aing Doctor — Installation health check
 * @module scripts/cli/aing-doctor
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Run installation health check.
 */
export function runHealthCheck(projectDir) {
    const dir = projectDir || process.cwd();
    const checks = [];
    // Hooks
    checks.push({
        name: 'Hook handlers',
        status: existsSync(join(dir, 'hooks-handlers')) ? 'OK' : 'MISSING',
        detail: existsSync(join(dir, 'hooks-handlers')) ? `${readdirSync(join(dir, 'hooks-handlers')).length} handlers` : 'hooks-handlers/ not found',
    });
    // Agents
    const agentsDir = join(dir, 'agents');
    const agentCount = existsSync(agentsDir) ? readdirSync(agentsDir).filter((f) => f.endsWith('.md')).length : 0;
    checks.push({
        name: 'Agents',
        status: agentCount >= 10 ? 'OK' : agentCount > 0 ? 'PARTIAL' : 'MISSING',
        detail: `${agentCount} agents found`,
    });
    // Skills
    const skillsDir = join(dir, 'skills');
    const skillCount = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length : 0;
    checks.push({
        name: 'Skills',
        status: skillCount >= 20 ? 'OK' : skillCount > 0 ? 'PARTIAL' : 'MISSING',
        detail: `${skillCount} skills found`,
    });
    // Scripts
    const scriptsDir = join(dir, 'scripts');
    checks.push({
        name: 'Scripts',
        status: existsSync(scriptsDir) ? 'OK' : 'MISSING',
    });
    // .aing runtime
    checks.push({
        name: 'Runtime (.aing/)',
        status: existsSync(join(dir, '.aing')) ? 'OK' : 'NOT INITIALIZED',
        detail: 'Run /aing init to initialize',
    });
    // Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1));
    checks.push({
        name: 'Node.js',
        status: major >= 18 ? 'OK' : 'OUTDATED',
        detail: nodeVersion,
    });
    const healthy = checks.every((c) => c.status === 'OK' || c.status === 'NOT INITIALIZED');
    return { healthy, checks };
}
/**
 * Format health check results.
 */
export function formatHealthCheck(result) {
    const lines = [`aing Doctor: ${result.healthy ? 'HEALTHY' : 'ISSUES FOUND'}`, ''];
    for (const c of result.checks) {
        const icon = c.status === 'OK' ? '\u2713' : c.status === 'NOT INITIALIZED' ? '\u25CB' : '\u2717';
        lines.push(`  ${icon} ${c.name}: ${c.status}${c.detail ? ` (${c.detail})` : ''}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=aing-doctor.js.map