/**
 * aing Test Triage — Classify test failures as pre-existing vs branch-new
 * Note: Uses execSync for git/test commands with controlled inputs, safe from injection.
 * @module scripts/ship/test-triage
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
const log = createLogger('test-triage');
/**
 * Run tests and triage failures.
 */
export function triageTestFailures(testCommand, baseBranch, projectDir) {
    const dir = projectDir || process.cwd();
    // Run tests on current branch
    const currentResult = runTestsSafe(testCommand, dir);
    if (currentResult.allPassed) {
        return { passed: true, total: currentResult.total, failed: 0, preExisting: [], branchNew: [] };
    }
    // Get failures on base branch for comparison
    const currentBranch = execSync('git branch --show-current', { cwd: dir, encoding: 'utf-8' }).trim();
    let baseFailures = [];
    try {
        execSync(`git stash`, { cwd: dir, encoding: 'utf-8' });
        execSync(`git checkout ${baseBranch}`, { cwd: dir, encoding: 'utf-8' });
        const baseResult = runTestsSafe(testCommand, dir);
        baseFailures = baseResult.failures;
        execSync(`git checkout ${currentBranch}`, { cwd: dir, encoding: 'utf-8' });
        try {
            execSync('git stash pop', { cwd: dir, encoding: 'utf-8' });
        }
        catch { }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn(`Could not run base branch tests: ${message}`);
        try {
            execSync(`git checkout ${currentBranch}`, { cwd: dir, encoding: 'utf-8' });
        }
        catch { }
        try {
            execSync('git stash pop', { cwd: dir, encoding: 'utf-8' });
        }
        catch { }
    }
    const baseSet = new Set(baseFailures);
    const preExisting = currentResult.failures.filter(f => baseSet.has(f));
    const branchNew = currentResult.failures.filter(f => !baseSet.has(f));
    return {
        passed: branchNew.length === 0,
        total: currentResult.total,
        failed: currentResult.failures.length,
        preExisting,
        branchNew,
    };
}
function runTestsSafe(cmd, dir) {
    try {
        const output = execSync(cmd, { cwd: dir, encoding: 'utf-8', timeout: 120000 });
        return { allPassed: true, total: countTests(output), failures: [] };
    }
    catch (err) {
        const stdout = err.stdout || '';
        const stderr = err.stderr || '';
        const output = stdout + stderr;
        return { allPassed: false, total: countTests(output), failures: extractFailures(output) };
    }
}
function countTests(output) {
    const match = output.match(/tests?\s+(\d+)/i) || output.match(/(\d+)\s+tests?/i);
    return match ? parseInt(match[1]) : 0;
}
function extractFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.match(/✖|FAIL|✗|failed/i) && line.includes('test')) {
            failures.push(line.trim().slice(0, 100));
        }
    }
    return failures;
}
/**
 * Format triage results.
 */
export function formatTriage(result) {
    if (result.passed && result.failed === 0) {
        return `Tests: ALL PASS (${result.total} tests)`;
    }
    const lines = [`Tests: ${result.failed} failures (${result.total} total)`];
    if (result.branchNew.length > 0) {
        lines.push(`\n  NEW failures (block ship):`);
        for (const f of result.branchNew)
            lines.push(`    ✗ ${f}`);
    }
    if (result.preExisting.length > 0) {
        lines.push(`\n  Pre-existing (do not block):`);
        for (const f of result.preExisting)
            lines.push(`    △ ${f}`);
    }
    lines.push(`\n  Verdict: ${result.passed ? 'PASS (new failures only pre-existing)' : 'FAIL (branch-new failures)'}`);
    return lines.join('\n');
}
//# sourceMappingURL=test-triage.js.map