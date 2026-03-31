/**
 * aing Changelog Generator
 * Parses git log and groups commits by category.
 * @module scripts/ship/changelog-gen
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('changelog-gen');
const CATEGORIES = {
    feat: 'Features',
    fix: 'Bug Fixes',
    refactor: 'Refactoring',
    perf: 'Performance',
    test: 'Tests',
    docs: 'Documentation',
    chore: 'Maintenance',
    style: 'Style',
    ci: 'CI/CD',
};
/**
 * Parse conventional commit message.
 */
export function parseCommitMessage(message) {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)/);
    if (match) {
        return { type: match[1], scope: match[2] || null, description: match[3] };
    }
    return { type: 'other', scope: null, description: message };
}
/**
 * Get commits since last tag or a specific ref.
 * Note: Uses execSync with git log (no user input in command), safe from injection.
 */
export function getCommitsSince(since, projectDir) {
    const dir = projectDir || process.cwd();
    const ref = since || getLastTag(dir);
    const range = ref ? `${ref}..HEAD` : 'HEAD~20..HEAD';
    try {
        const raw = execSync(`git log ${range} --pretty=format:"%H|%s|%an|%ai"`, { cwd: dir, encoding: 'utf-8' }).trim();
        if (!raw)
            return [];
        return raw.split('\n').map((line) => {
            const parts = line.split('|');
            if (parts.length < 4)
                return null;
            const hash = parts[0]?.slice(0, 7);
            const date = parts[parts.length - 1];
            const author = parts[parts.length - 2];
            const message = parts.slice(1, -2).join('|'); // Rejoin if pipe in message
            return { hash, message, author, date };
        }).filter(Boolean);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn(`Failed to get commits: ${message}`);
        return [];
    }
}
/**
 * Generate changelog content for a version.
 */
export function generateChangelog(version, commits) {
    const date = new Date().toISOString().slice(0, 10);
    const grouped = {};
    for (const commit of commits) {
        const parsed = parseCommitMessage(commit.message);
        const category = CATEGORIES[parsed.type] || 'Other';
        if (!grouped[category])
            grouped[category] = [];
        grouped[category].push({
            ...parsed,
            hash: commit.hash,
        });
    }
    const lines = [`## ${version} (${date})`, ''];
    for (const [category, items] of Object.entries(grouped).sort()) {
        lines.push(`### ${category}`, '');
        for (const item of items) {
            const scope = item.scope ? `**${item.scope}:** ` : '';
            lines.push(`- ${scope}${item.description} (${item.hash})`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Prepend changelog section to CHANGELOG.md.
 */
export function prependChangelog(content, projectDir) {
    const dir = projectDir || process.cwd();
    const changelogPath = join(dir, 'CHANGELOG.md');
    let existing = '';
    if (existsSync(changelogPath)) {
        existing = readFileSync(changelogPath, 'utf-8');
    }
    const header = existing.startsWith('# Changelog')
        ? ''
        : '# Changelog\n\n';
    const newContent = existing.startsWith('# Changelog')
        ? existing.replace('# Changelog\n', `# Changelog\n\n${content}`)
        : `${header}${content}${existing}`;
    writeFileSync(changelogPath, newContent);
    log.info('CHANGELOG.md updated');
}
function getLastTag(dir) {
    try {
        return execSync('git describe --tags --abbrev=0 2>/dev/null', {
            cwd: dir, encoding: 'utf-8'
        }).trim();
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=changelog-gen.js.map