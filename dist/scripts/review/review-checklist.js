/**
 * aing Review Checklist — 18-Category Code Review Engine
 *
 * Pass 1 (CRITICAL): SQL, Race, LLM, Enum, Auth, Data Exposure
 * Pass 2 (INFORMATIONAL): Async, Magic, Dead, N+1, Stale, Error, Type, Crypto, Time, View, Perf, Distribution
 *
 * NOTE: This file contains security-sensitive regex patterns used for CODE REVIEW DETECTION,
 * not for execution. The patterns match dangerous code patterns in diffs being reviewed.
 *
 * @module scripts/review/review-checklist
 */
// Detection patterns for unsanitized HTML rendering (used in code review, not execution)
const UNSAFE_HTML_PATTERN = /dangerouslySetInnerHTML|v-html|innerHTML\s*=/gi;
const UNSAFE_EVAL_PATTERN = /system.*prompt.*\$\{.*user/gi;
// Detects bare eval() calls which can execute arbitrary code
const UNSAFE_EVAL_CALL_PATTERN = /\beval\s*\(/gi;
/**
 * 18 review categories with detection patterns.
 */
export const CATEGORIES = {
    // ── Pass 1: CRITICAL (blocks ship) ──
    'sql-safety': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'SQL & Data Safety',
        patterns: [
            { regex: /\$\{[^}]*\}.*(?:query|sql|SELECT|INSERT|UPDATE|DELETE)/gi, desc: 'String interpolation in SQL' },
            { regex: /(?:query|raw)\s*\(\s*['"`].*\+/gi, desc: 'String concatenation in query' },
            { regex: /\.where\(\s*['"`].*\$\{/gi, desc: 'Template literal in where clause' },
        ],
    },
    'race-conditions': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'Race Conditions',
        patterns: [
            { regex: /find.*[Oo]r[Cc]reate|upsert|getOrCreate/g, desc: 'Find-or-create pattern (TOCTOU risk)' },
            { regex: /if\s*\(.*exists.*\)\s*\{[^}]*create/gi, desc: 'Check-then-act pattern' },
        ],
    },
    'llm-trust-boundary': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'LLM Output Trust Boundary',
        patterns: [
            { regex: UNSAFE_HTML_PATTERN, desc: 'Unsanitized HTML rendering' },
            { regex: UNSAFE_EVAL_PATTERN, desc: 'User input in system prompt' },
            { regex: UNSAFE_EVAL_CALL_PATTERN, desc: 'eval() call (may execute LLM output)' },
        ],
    },
    'enum-completeness': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'Enum & Value Completeness',
        patterns: [
            { regex: /switch\s*\([^)]+\)\s*\{(?:(?!default).)*\}$/gms, desc: 'Switch without default case' },
        ],
    },
    'auth-bypass': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'Authentication & Authorization',
        patterns: [
            { regex: /skip_(?:before_action|auth|authorization)|no_auth|public\s+(?:def|function)/gi, desc: 'Auth skip pattern' },
            { regex: /(?:req|request)\.(?:params|query|body)\[?['"]id['"]\]?\s*(?:===?|==)/gi, desc: 'Direct object reference (IDOR)' },
        ],
    },
    'data-exposure': {
        pass: 1,
        severity: 'CRITICAL',
        name: 'Data Exposure',
        patterns: [
            { regex: /console\.log\s*\(.*(?:password|secret|token|key|credential)/gi, desc: 'Sensitive data in console.log' },
            { regex: /JSON\.stringify\s*\(.*(?:user|session|auth)/gi, desc: 'Full object serialization (may leak fields)' },
        ],
    },
    // ── Pass 2: INFORMATIONAL (quality improvement) ──
    'conditional-side-effects': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'Conditional Side Effects',
        patterns: [
            { regex: /if\s*\([^)]+\)\s*\{[^}]*(?:save|write|send|delete|update)\b/gi, desc: 'Side effect in only one branch' },
        ],
    },
    'magic-numbers': {
        pass: 2,
        severity: 'LOW',
        name: 'Magic Numbers & String Coupling',
        patterns: [
            { regex: /(?:setTimeout|setInterval|delay|sleep)\s*\(\s*\d{4,}/g, desc: 'Hardcoded timeout value' },
            { regex: /===?\s*(?:200|201|204|301|302|400|401|403|404|500)\b/g, desc: 'Hardcoded HTTP status code' },
        ],
    },
    'dead-code': {
        pass: 2,
        severity: 'LOW',
        name: 'Dead Code & Consistency',
        patterns: [
            { regex: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK|\/\/\s*XXX/gi, desc: 'TODO/FIXME comment' },
            { regex: /return\s*;?\s*\n\s*[^\s}]/gm, desc: 'Code after return statement' },
        ],
    },
    'n-plus-one': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'N+1 Queries',
        patterns: [
            { regex: /for\s*\([^)]*\)\s*\{[^}]*(?:await|\.find|\.query|\.get|fetch\()/gi, desc: 'Query inside loop' },
            { regex: /\.map\(\s*async/gi, desc: 'Async map (potential N+1)' },
        ],
    },
    'stale-comments': {
        pass: 2,
        severity: 'LOW',
        name: 'Stale Comments',
        patterns: [
            { regex: /\/\/.*(?:old|legacy|deprecated|removed|temporary|temp)\b/gi, desc: 'Potentially stale comment' },
        ],
    },
    'missing-error-handling': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'Missing Error Handling',
        patterns: [
            { regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, desc: 'Empty catch block' },
            { regex: /\.then\([^)]+\)(?!\.catch)/g, desc: 'Promise without .catch()' },
        ],
    },
    'async-sync-mixing': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'Async/Sync Mixing',
        patterns: [
            { regex: /(?:readFileSync|writeFileSync)\s*\(/g, desc: 'Sync I/O in potentially async context' },
        ],
    },
    'crypto-entropy': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'Crypto & Entropy',
        patterns: [
            { regex: /Math\.random\(\)/g, desc: 'Math.random() (not cryptographically secure)' },
            { regex: /md5|sha1(?![\w-])/gi, desc: 'Weak hash algorithm' },
        ],
    },
    'time-window': {
        pass: 2,
        severity: 'LOW',
        name: 'Time Window Safety',
        patterns: [
            { regex: /new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/g, desc: 'Date key without timezone consideration' },
        ],
    },
    'type-coercion': {
        pass: 2,
        severity: 'MEDIUM',
        name: 'Type Coercion at Boundaries',
        patterns: [
            { regex: /==\s*(?:null|undefined|0|''|"")/g, desc: 'Loose equality (use ===)' },
            { regex: /JSON\.parse\s*\(.*(?:req|request|body|input|param)/gi, desc: 'JSON parse of user input without validation' },
        ],
    },
    'view-frontend': {
        pass: 2,
        severity: 'LOW',
        name: 'View / Frontend Performance',
        patterns: [
            { regex: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*fetch/g, desc: 'Fetch in useEffect without cleanup' },
            { regex: /key\s*=\s*\{?\s*(?:index|i)\s*\}?/g, desc: 'Array index as React key' },
        ],
    },
    'performance-bundle': {
        pass: 2,
        severity: 'LOW',
        name: 'Performance & Bundle Impact',
        patterns: [
            { regex: /import\s+.*from\s+['"]lodash['"]/g, desc: 'Full lodash import (use lodash-es or lodash/*)' },
            { regex: /import\s+.*from\s+['"]moment['"]/g, desc: 'moment.js (use date-fns or dayjs)' },
        ],
    },
};
/**
 * Run all checklist categories against diff content.
 */
export function runChecklist(diffContent) {
    if (!diffContent)
        return [];
    const results = [];
    const addedLines = extractAddedLines(diffContent);
    const addedContent = addedLines.join('\n');
    for (const [key, cat] of Object.entries(CATEGORIES)) {
        const findings = [];
        for (const pattern of cat.patterns) {
            const matches = addedContent.match(pattern.regex);
            if (matches && matches.length > 0) {
                // Find which lines contain the match
                const matchLines = addedLines.filter(line => pattern.regex.test(line)).slice(0, 3);
                pattern.regex.lastIndex = 0; // Reset regex state
                findings.push({
                    desc: pattern.desc,
                    matches: matches.length,
                    lines: matchLines.map(l => l.trim().slice(0, 100)),
                });
            }
            pattern.regex.lastIndex = 0; // Reset for next run
        }
        if (findings.length > 0) {
            results.push({
                category: key,
                name: cat.name,
                severity: cat.severity,
                pass: cat.pass,
                findings,
            });
        }
    }
    // Sort: CRITICAL first, then MEDIUM, then LOW
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    results.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
    return results;
}
/**
 * Extract only added lines from a unified diff.
 */
function extractAddedLines(diff) {
    return diff.split('\n')
        .filter(line => line.startsWith('+') && !line.startsWith('+++'))
        .map(line => line.slice(1));
}
/**
 * Classify results using Fix-First heuristic.
 */
export function classifyResults(results) {
    const autoFixCategories = new Set([
        'dead-code', 'stale-comments', 'magic-numbers', 'n-plus-one',
        'missing-error-handling', 'performance-bundle',
    ]);
    const autoFix = [];
    const needsAsk = [];
    for (const r of results) {
        if (r.severity === 'CRITICAL') {
            needsAsk.push(r);
        }
        else if (autoFixCategories.has(r.category)) {
            autoFix.push(r);
        }
        else {
            needsAsk.push(r);
        }
    }
    return {
        autoFix,
        needsAsk,
        summary: {
            total: results.length,
            critical: results.filter(r => r.severity === 'CRITICAL').length,
            autoFixable: autoFix.length,
            needsDecision: needsAsk.length,
        },
    };
}
/**
 * Format checklist results for display.
 */
export function formatChecklistResults(results, classified) {
    const { summary } = classified;
    const lines = [
        `Review Checklist: ${summary.total} categories flagged (${summary.critical} critical, ${summary.autoFixable} auto-fixable, ${summary.needsDecision} need decision)`,
        '',
    ];
    // Pass 1: CRITICAL
    const pass1 = results.filter(r => r.pass === 1);
    if (pass1.length > 0) {
        lines.push('Pass 1 — CRITICAL (blocks ship):');
        for (const r of pass1) {
            lines.push(`  ✗ [${r.severity}] ${r.name}`);
            for (const f of r.findings) {
                lines.push(`    ${f.desc} (${f.matches}x)`);
                for (const l of f.lines) {
                    lines.push(`      > ${l}`);
                }
            }
        }
        lines.push('');
    }
    // Pass 2: INFORMATIONAL
    const pass2 = results.filter(r => r.pass === 2);
    if (pass2.length > 0) {
        lines.push('Pass 2 — INFORMATIONAL:');
        for (const r of pass2) {
            const icon = classified.autoFix.includes(r) ? '[AUTO-FIX]' : '[ASK]';
            lines.push(`  ${icon} [${r.severity}] ${r.name}`);
            for (const f of r.findings) {
                lines.push(`    ${f.desc} (${f.matches}x)`);
            }
        }
        lines.push('');
    }
    if (results.length === 0) {
        lines.push('All 18 categories checked. No issues found.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=review-checklist.js.map