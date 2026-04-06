/**
 * aing Evidence Collector Lite (Phase 2 — basic interface)
 * Collects basic evidence from tool outputs.
 * Full version expands in Phase 4.
 * @module scripts/evidence/evidence-collector-lite
 */
/**
 * Collect basic evidence from a tool execution.
 * Note: tsc, eslint, etc. produce EMPTY output on success (exit 0).
 * Use collectEvidenceWithExitCode() when exit code is available.
 */
export function collectBasicEvidence(toolName, output) {
    if (!output)
        return null;
    // Exit code pattern: "EXIT=0" or "EXIT=1" appended by `; echo "EXIT=$?"`
    const exitMatch = output.match(/EXIT=(\d+)/);
    if (exitMatch) {
        const exitCode = parseInt(exitMatch[1]);
        const cleanOutput = output.replace(/EXIT=\d+\s*$/, '').trim();
        // Empty output + exit 0 = success (common for tsc --noEmit, eslint with no errors)
        if (!cleanOutput && exitCode === 0) {
            return {
                type: 'build',
                timestamp: new Date().toISOString(),
                result: 'pass',
                source: toolName,
                details: { note: 'empty output with exit code 0 — no errors' }
            };
        }
        if (!cleanOutput && exitCode !== 0) {
            return {
                type: 'build',
                timestamp: new Date().toISOString(),
                result: 'fail',
                source: toolName,
                details: { note: `exit code ${exitCode} with no output` }
            };
        }
    }
    const lower = output.toLowerCase();
    // Test results
    if ((lower.includes('test') || lower.includes('pass') || lower.includes('fail')) && (lower.includes('pass') || lower.includes('fail'))) {
        const passed = (lower.match(/(\d+)\s*pass/i) || [])[1];
        const failed = (lower.match(/(\d+)\s*fail/i) || [])[1];
        return {
            type: 'test',
            timestamp: new Date().toISOString(),
            result: failed && parseInt(failed) > 0 ? 'fail' : 'pass',
            source: toolName,
            details: { passed: passed || '?', failed: failed || '0' }
        };
    }
    // Build results (check after test to avoid overlap)
    if (lower.includes('build') || lower.includes('compile')) {
        const isSuccess = lower.includes('success') || lower.includes('completed') || lower.includes('built');
        const isFail = /\berror[s]?\b/i.test(output) && !/0 error/i.test(output);
        const hasExplicitFail = lower.includes('build failed') || lower.includes('compilation failed');
        if (isSuccess || isFail || hasExplicitFail) {
            return {
                type: 'build',
                timestamp: new Date().toISOString(),
                result: (isFail || hasExplicitFail) ? 'fail' : 'pass',
                source: toolName
            };
        }
    }
    // Lint results
    if (lower.includes('lint') || lower.includes('eslint')) {
        const errors = (lower.match(/(\d+)\s*error/i) || [])[1];
        const warnings = (lower.match(/(\d+)\s*warning/i) || [])[1];
        return {
            type: 'lint',
            timestamp: new Date().toISOString(),
            result: errors && parseInt(errors) > 0 ? 'fail' : 'pass',
            source: toolName,
            details: { errors: errors || '0', warnings: warnings || '0' }
        };
    }
    return null;
}
//# sourceMappingURL=evidence-collector-lite.js.map