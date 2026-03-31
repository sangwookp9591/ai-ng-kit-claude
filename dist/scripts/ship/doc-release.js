/**
 * aing Document Release — Post-Ship Documentation Update
 * Cross-references diff against docs, updates stale sections.
 *
 * @module scripts/ship/doc-release
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
/**
 * Documents to check for staleness after shipping.
 */
export const DOC_FILES = [
    { file: 'README.md', focus: 'features, setup, usage' },
    { file: 'ARCHITECTURE.md', focus: 'system structure, component boundaries' },
    { file: 'CONTRIBUTING.md', focus: 'dev process, conventions' },
    { file: 'CLAUDE.md', focus: 'project context, agent instructions' },
    { file: 'CHANGELOG.md', focus: 'version history, release notes' },
    { file: 'TODOS.md', focus: 'backlog, completed items' },
];
/**
 * Find which docs may be stale based on changed files.
 */
export function findStaleDocs(changedFiles, projectDir) {
    const dir = projectDir || process.cwd();
    const stale = [];
    for (const doc of DOC_FILES) {
        const exists = existsSync(join(dir, doc.file));
        let reason = null;
        // Check if changed files relate to this doc
        if (doc.file === 'README.md') {
            const hasNewEndpoints = changedFiles.some(f => f.includes('route') || f.includes('api/'));
            const hasNewFeatures = changedFiles.some(f => f.match(/feat/));
            if (hasNewEndpoints || hasNewFeatures)
                reason = 'New features/endpoints may need documentation';
        }
        if (doc.file === 'ARCHITECTURE.md') {
            const hasStructureChange = changedFiles.some(f => f.includes('scripts/') || f.includes('hooks-handlers/') || changedFiles.length > 10);
            if (hasStructureChange)
                reason = 'Structural changes may affect architecture docs';
        }
        if (doc.file === 'CLAUDE.md') {
            const hasAgentChange = changedFiles.some(f => f.includes('agents/') || f.includes('skills/'));
            if (hasAgentChange)
                reason = 'Agent/skill changes may need project context update';
        }
        if (doc.file === 'TODOS.md') {
            reason = 'Check for completed items to mark done';
        }
        if (reason) {
            stale.push({ file: doc.file, focus: doc.focus, exists, reason });
        }
    }
    return stale;
}
/**
 * Get changed files from diff against base branch.
 * Note: Uses execSync with git commands (no user input in command string), safe from injection.
 */
export function getChangedFiles(baseBranch, projectDir) {
    const dir = projectDir || process.cwd();
    try {
        const raw = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 10000 }).trim();
        return raw ? raw.split('\n') : [];
    }
    catch {
        return [];
    }
}
/**
 * Build doc update prompt for agents.
 */
export function buildDocUpdatePrompt(staleDocs, changedFiles) {
    if (staleDocs.length === 0)
        return 'No documentation updates needed.';
    const lines = [
        '# Post-Ship Documentation Update',
        '',
        `Changed files: ${changedFiles.length}`,
        '',
        '## Documents to Review:',
        '',
    ];
    for (const doc of staleDocs) {
        const status = doc.exists ? 'exists' : 'MISSING';
        lines.push(`### ${doc.file} (${status})`);
        lines.push(`Focus: ${doc.focus}`);
        lines.push(`Reason: ${doc.reason}`);
        lines.push('');
    }
    lines.push('## Instructions:');
    lines.push('1. Read each document');
    lines.push('2. Cross-reference with changed files');
    lines.push('3. Update stale sections to match current code');
    lines.push('4. Mark completed TODOS items');
    lines.push('5. Do NOT add information not supported by the diff');
    return lines.join('\n');
}
/**
 * Format doc release summary.
 */
export function formatDocReleaseSummary(staleDocs) {
    if (staleDocs.length === 0)
        return 'All docs up to date.';
    const lines = [`Doc Release: ${staleDocs.length} docs may need updates`];
    for (const doc of staleDocs) {
        const icon = doc.exists ? '△' : '✗';
        lines.push(`  ${icon} ${doc.file} — ${doc.reason}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=doc-release.js.map