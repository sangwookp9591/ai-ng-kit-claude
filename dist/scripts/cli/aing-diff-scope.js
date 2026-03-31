/**
 * aing Diff Scope — Detect change categories from git diff
 * Absorbed from gstack's gstack-diff-scope.
 * @module scripts/cli/aing-diff-scope
 */
import { execSync } from 'node:child_process';
const SCOPE_PATTERNS = {
    frontend: [/\.css$/, /\.scss$/, /\.tsx$/, /\.jsx$/, /\.html$/, /\.vue$/, /\.svelte$/, /tailwind\.config/, /components\//, /app\/views\//],
    backend: [/\.ts$/, /\.js$/, /\.py$/, /\.go$/, /\.rs$/, /\.java$/, /\.rb$/, /\.php$/],
    prompts: [/prompt/, /system.*prompt/, /generation.*service/, /evaluator/],
    tests: [/\.test\./, /\.spec\./, /test\//, /tests\//, /spec\//, /__tests__\//, /e2e\//],
    docs: [/\.md$/],
    config: [/package\.json$/, /\.yml$/, /\.yaml$/, /\.github\//, /requirements\.txt$/, /pyproject\.toml$/, /go\.mod$/],
};
/**
 * Detect scope categories from changed files.
 */
export function detectScope(baseBranch, projectDir) {
    const dir = projectDir || process.cwd();
    let files = [];
    try {
        const raw = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 10000 }).trim();
        files = raw ? raw.split('\n') : [];
    }
    catch {
        try {
            const raw = execSync('git diff --name-only HEAD~5...HEAD', { cwd: dir, encoding: 'utf-8', timeout: 10000 }).trim();
            files = raw ? raw.split('\n') : [];
        }
        catch { }
    }
    const scope = {};
    for (const [category, patterns] of Object.entries(SCOPE_PATTERNS)) {
        scope[category] = files.some((f) => patterns.some((p) => p.test(f)));
    }
    return { ...scope, files };
}
/**
 * Format scope for display.
 */
export function formatScope(scope) {
    const active = Object.entries(scope)
        .filter(([k, v]) => k !== 'files' && v === true)
        .map(([k]) => k);
    if (active.length === 0)
        return 'Scope: no changes detected';
    return `Scope: ${active.join(', ')} (${scope.files?.length || 0} files)`;
}
//# sourceMappingURL=aing-diff-scope.js.map