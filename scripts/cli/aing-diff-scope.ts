/**
 * aing Diff Scope — Detect change categories from git diff
 * @module scripts/cli/aing-diff-scope
 */
import { execSync } from 'node:child_process';

const SCOPE_PATTERNS: Record<string, RegExp[]> = {
  frontend: [/\.css$/, /\.scss$/, /\.tsx$/, /\.jsx$/, /\.html$/, /\.vue$/, /\.svelte$/, /tailwind\.config/, /components\//, /app\/views\//],
  backend: [/\.ts$/, /\.js$/, /\.py$/, /\.go$/, /\.rs$/, /\.java$/, /\.rb$/, /\.php$/],
  prompts: [/prompt/, /system.*prompt/, /generation.*service/, /evaluator/],
  tests: [/\.test\./, /\.spec\./, /test\//, /tests\//, /spec\//, /__tests__\//, /e2e\//],
  docs: [/\.md$/],
  config: [/package\.json$/, /\.yml$/, /\.yaml$/, /\.github\//, /requirements\.txt$/, /pyproject\.toml$/, /go\.mod$/],
};

interface ScopeResult {
  frontend: boolean;
  backend: boolean;
  prompts: boolean;
  tests: boolean;
  docs: boolean;
  config: boolean;
  files: string[];
  [key: string]: boolean | string[];
}

/**
 * Detect scope categories from changed files.
 */
export function detectScope(baseBranch: string, projectDir?: string): ScopeResult {
  const dir = projectDir || process.cwd();
  let files: string[] = [];

  try {
    const raw = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 10000 }).trim();
    files = raw ? raw.split('\n') : [];
  } catch {
    try {
      const raw = execSync('git diff --name-only HEAD~5...HEAD', { cwd: dir, encoding: 'utf-8', timeout: 10000 }).trim();
      files = raw ? raw.split('\n') : [];
    } catch {}
  }

  const scope: Record<string, boolean> = {};
  for (const [category, patterns] of Object.entries(SCOPE_PATTERNS)) {
    scope[category] = files.some((f: string) => patterns.some((p: RegExp) => p.test(f)));
  }

  return { ...scope, files } as ScopeResult;
}

/**
 * Format scope for display.
 */
export function formatScope(scope: ScopeResult): string {
  const active = Object.entries(scope)
    .filter(([k, v]) => k !== 'files' && v === true)
    .map(([k]) => k);

  if (active.length === 0) return 'Scope: no changes detected';
  return `Scope: ${active.join(', ')} (${(scope.files as string[])?.length || 0} files)`;
}
