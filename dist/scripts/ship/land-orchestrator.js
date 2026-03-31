/**
 * aing Land & Deploy Orchestrator — Post-PR merge + deploy + canary pipeline
 * Bridges the gap between /ship (creates PR) and production.
 * Note: Uses execSync with git/gh CLI (controlled inputs, not user-supplied).
 *
 * Flow: PR check → merge → wait for deploy → canary → report
 *
 * @module scripts/ship/land-orchestrator
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
import { detectPlatform, healthCheck as platformHealthCheck } from './deploy-detect.js';
import { runCanaryLoop, formatCanaryResult } from './canary-monitor.js';
import { addEvidence } from '../evidence/evidence-chain.js';
import { logSkillUsage } from '../telemetry/telemetry-engine.js';
const log = createLogger('land-orchestrator');
function ghExec(args, dir, timeoutMs = 15000) {
    return execSync(`gh ${args}`, { cwd: dir, encoding: 'utf-8', timeout: timeoutMs }).trim();
}
function gitExec(args, dir, timeoutMs = 30000) {
    return execSync(`git ${args}`, { cwd: dir, encoding: 'utf-8', timeout: timeoutMs }).trim();
}
function getPrInfo(prNumber, dir) {
    try {
        const raw = ghExec(`pr view ${prNumber} --json reviewDecision,mergeable,baseRefName,headRefName,url,title`, dir);
        const data = JSON.parse(raw);
        let checksStatus = 'UNKNOWN';
        try {
            const checksRaw = ghExec(`pr checks ${prNumber} --json bucket`, dir);
            const checks = JSON.parse(checksRaw);
            const failing = checks.filter((c) => c.bucket === 'fail');
            checksStatus = failing.length === 0 ? 'PASS' : `FAIL (${failing.length} checks)`;
        }
        catch {
            checksStatus = 'UNKNOWN';
        }
        return { ...data, checksStatus };
    }
    catch (err) {
        log.error(`Failed to get PR info: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}
function runPreMergeChecks(prNumber, dir) {
    const start = Date.now();
    const pr = getPrInfo(prNumber, dir);
    if (!pr) {
        return {
            name: 'pre-merge-checks',
            status: 'fail',
            duration_ms: Date.now() - start,
            details: { error: 'Could not fetch PR info. Is gh CLI authenticated?' },
        };
    }
    const issues = [];
    if (pr.reviewDecision !== 'APPROVED' && pr.reviewDecision !== '') {
        issues.push(`Review: ${pr.reviewDecision || 'NO_REVIEW'} (expected APPROVED)`);
    }
    if (pr.mergeable === 'CONFLICTING') {
        issues.push('PR has merge conflicts');
    }
    if (pr.checksStatus.startsWith('FAIL')) {
        issues.push(`CI: ${pr.checksStatus}`);
    }
    return {
        name: 'pre-merge-checks',
        status: issues.length === 0 ? 'pass' : 'fail',
        duration_ms: Date.now() - start,
        details: {
            reviewDecision: pr.reviewDecision,
            mergeable: pr.mergeable,
            checksStatus: pr.checksStatus,
            title: pr.title,
            url: pr.url,
            issues,
        },
    };
}
function runMerge(prNumber, strategy, dryRun, dir) {
    const start = Date.now();
    if (dryRun) {
        return {
            name: 'merge',
            status: 'skip',
            duration_ms: Date.now() - start,
            details: { dryRun: true, strategy },
        };
    }
    try {
        const strategyFlag = strategy === 'squash' ? '--squash' : strategy === 'rebase' ? '--rebase' : '--merge';
        ghExec(`pr merge ${prNumber} ${strategyFlag} --delete-branch`, dir, 30000);
        // Switch to base branch
        try {
            const baseBranch = ghExec(`pr view ${prNumber} --json baseRefName --jq .baseRefName`, dir, 10000) || 'main';
            gitExec(`checkout ${baseBranch}`, dir);
            gitExec(`pull origin ${baseBranch}`, dir);
        }
        catch { }
        return {
            name: 'merge',
            status: 'pass',
            duration_ms: Date.now() - start,
            details: { strategy, prNumber },
        };
    }
    catch (err) {
        return {
            name: 'merge',
            status: 'fail',
            duration_ms: Date.now() - start,
            details: { error: err instanceof Error ? err.message : String(err) },
        };
    }
}
function waitForDeploy(url, timeoutMs, dir) {
    const start = Date.now();
    if (!url) {
        const detected = detectPlatform(dir);
        if (detected.config?.url) {
            url = detected.config.url;
        }
    }
    if (!url) {
        return {
            name: 'wait-for-deploy',
            status: 'skip',
            duration_ms: Date.now() - start,
            details: { reason: 'No deploy URL detected. Provide canaryUrl or configure deploy platform.' },
        };
    }
    const pollIntervalS = 10;
    const maxAttempts = Math.ceil(timeoutMs / (pollIntervalS * 1000));
    let lastError = '';
    for (let i = 0; i < maxAttempts; i++) {
        const check = platformHealthCheck(url);
        if (check.healthy) {
            return {
                name: 'wait-for-deploy',
                status: 'pass',
                duration_ms: Date.now() - start,
                details: { url, attempts: i + 1, statusCode: check.statusCode },
            };
        }
        lastError = check.error || `HTTP ${check.statusCode}`;
        log.info(`Deploy check ${i + 1}/${maxAttempts}: not ready (${lastError})`);
        if (i < maxAttempts - 1) {
            execSync(`sleep ${pollIntervalS}`, { timeout: (pollIntervalS + 5) * 1000 });
        }
    }
    return {
        name: 'wait-for-deploy',
        status: 'fail',
        duration_ms: Date.now() - start,
        details: { url, timeout: true, lastError },
    };
}
function runCanary(url, feature, checks, dir) {
    const start = Date.now();
    if (!url) {
        return {
            name: 'canary',
            status: 'skip',
            duration_ms: Date.now() - start,
            details: { reason: 'No URL for canary checks' },
        };
    }
    const result = runCanaryLoop({ url, feature, checks, projectDir: dir });
    return {
        name: 'canary',
        status: result.passed ? 'pass' : 'fail',
        duration_ms: Date.now() - start,
        details: {
            url,
            passed: result.passed,
            totalChecks: result.checks.length,
            alertCount: result.alerts.length,
            summary: formatCanaryResult(result),
        },
    };
}
// -- Main orchestrator --
export async function executeLandPipeline(options) {
    const { prNumber, feature, mergeStrategy = 'squash', canaryUrl, canaryChecks = 5, deployTimeoutMs = 300000, dryRun = false, projectDir, } = options;
    const dir = projectDir || process.cwd();
    const steps = [];
    const startTime = Date.now();
    let deployUrl = canaryUrl ?? null;
    log.info(`Land pipeline started: PR #${prNumber} (${feature})`);
    try {
        // Step 1: Pre-merge checks
        const prCheck = runPreMergeChecks(prNumber, dir);
        steps.push(prCheck);
        if (prCheck.status === 'fail') {
            return { success: false, steps, deployUrl, error: `Pre-merge failed: ${JSON.stringify(prCheck.details.issues)}` };
        }
        // Step 2: Merge
        const merge = runMerge(prNumber, mergeStrategy, dryRun, dir);
        steps.push(merge);
        if (merge.status === 'fail') {
            return { success: false, steps, deployUrl, error: `Merge failed: ${merge.details.error}` };
        }
        // Step 3: Wait for deploy
        const deploy = waitForDeploy(deployUrl, deployTimeoutMs, dir);
        steps.push(deploy);
        if (deploy.details.url)
            deployUrl = deploy.details.url;
        // Step 4: Canary
        const canary = runCanary(deployUrl, feature, canaryChecks, dir);
        steps.push(canary);
        // Record evidence
        addEvidence(feature, {
            type: 'deploy',
            result: canary.status === 'pass' ? 'pass' : canary.status === 'skip' ? 'skip' : 'fail',
            source: 'land-orchestrator',
            details: { prNumber, mergeStrategy, deployUrl, canaryPassed: canary.details.passed },
        }, dir);
        const durationS = Math.round((Date.now() - startTime) / 1000);
        logSkillUsage({ skill: 'land-and-deploy', duration_s: durationS, outcome: 'success' }, dir);
        const overallSuccess = steps.every(s => s.status !== 'fail');
        return { success: overallSuccess, steps, deployUrl };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(`Land pipeline failed: ${message}`);
        const durationS = Math.round((Date.now() - startTime) / 1000);
        logSkillUsage({ skill: 'land-and-deploy', duration_s: durationS, outcome: 'error' }, dir);
        return { success: false, steps, deployUrl, error: message };
    }
}
// -- Report formatter --
export function formatLandReport(result, prNumber) {
    const lines = [
        `## Deployment Report`,
        '',
        `**PR:** #${prNumber}`,
        `**Deploy URL:** ${result.deployUrl || 'N/A'}`,
        `**Status:** ${result.success ? 'HEALTHY' : 'ISSUES'}`,
        '',
        '### Pipeline Steps',
        '',
        '| Step | Status | Duration |',
        '|------|--------|----------|',
    ];
    for (const step of result.steps) {
        const icon = step.status === 'pass' ? 'PASS' : step.status === 'skip' ? 'SKIP' : 'FAIL';
        const dur = step.duration_ms < 1000 ? `${step.duration_ms}ms` : `${(step.duration_ms / 1000).toFixed(1)}s`;
        lines.push(`| ${step.name} | ${icon} | ${dur} |`);
    }
    if (result.error) {
        lines.push('', `### Error`, '', result.error);
    }
    return lines.join('\n');
}
//# sourceMappingURL=land-orchestrator.js.map