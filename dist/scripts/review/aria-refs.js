/**
 * aing ARIA Ref System
 *
 * Instead of CSS selectors or DOM injection (which break under CSP),
 * use Playwright's accessibility tree to build stable element refs.
 *
 * Pattern:
 *   1. browser_snapshot → ARIA tree text
 *   2. Parse tree → assign @e1, @e2, @e3... to interactive elements
 *   3. Map refs → Playwright selectors (getByRole + nth)
 *   4. Use refs for click/fill/verify actions
 *   5. Stale detection: re-snapshot if element count changes
 *
 * Usage with MCP Playwright:
 *   const snapshot = await mcp__playwright__browser_snapshot();
 *   const refs = parseAriaSnapshot(snapshot);
 *   // refs['@e1'] = { role: 'button', name: 'Submit', selector: 'button:has-text("Submit")' }
 *
 * @module scripts/review/aria-refs
 */
import { createLogger } from '../core/logger.js';
const log = createLogger('aria-refs');
/**
 * Interactive ARIA roles that get refs assigned.
 */
const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio',
    'combobox', 'listbox', 'option', 'menuitem', 'tab',
    'switch', 'slider', 'spinbutton', 'searchbox',
    'treeitem', 'gridcell',
]);
/**
 * Parse an ARIA snapshot and assign refs to interactive elements.
 */
export function parseAriaSnapshot(snapshotText) {
    if (!snapshotText)
        return new Map();
    const refs = new Map();
    const lines = snapshotText.split('\n');
    let refCounter = 1;
    // Track seen role+name combos for nth() disambiguation
    const seenCombos = new Map();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        // Parse ARIA tree format: "- role name" or "  - role \"name\""
        const match = line.match(/^-?\s*(\w+)\s+(?:"([^"]+)"|(.+))$/);
        if (!match)
            continue;
        const role = match[1].toLowerCase();
        const name = (match[2] || match[3] || '').trim();
        if (!INTERACTIVE_ROLES.has(role))
            continue;
        // Build combo key for nth() disambiguation
        const comboKey = `${role}:${name}`;
        const seenCount = seenCombos.get(comboKey) || 0;
        seenCombos.set(comboKey, seenCount + 1);
        // Build selector
        let selector;
        if (name) {
            selector = seenCount > 0
                ? `getByRole('${role}', { name: '${escapeName(name)}' }).nth(${seenCount})`
                : `getByRole('${role}', { name: '${escapeName(name)}' })`;
        }
        else {
            selector = `getByRole('${role}').nth(${seenCount})`;
        }
        const ref = `@e${refCounter}`;
        refs.set(ref, { role, name, selector, line: i + 1 });
        refCounter++;
    }
    log.info(`Parsed ${refs.size} interactive refs from ARIA snapshot`);
    return refs;
}
/**
 * Format refs for display to agents.
 */
export function formatRefs(refs) {
    if (refs.size === 0)
        return 'No interactive elements found in snapshot.';
    const lines = ['ARIA Refs:'];
    for (const [ref, entry] of refs) {
        lines.push(`  ${ref} → ${entry.role} "${entry.name}" (${entry.selector})`);
    }
    lines.push(`  Total: ${refs.size} interactive elements`);
    return lines.join('\n');
}
/**
 * Find a ref by partial name match.
 */
export function findRefs(refs, query) {
    const q = query.toLowerCase();
    return [...refs.entries()].filter(([_, entry]) => entry.name.toLowerCase().includes(q) ||
        entry.role.toLowerCase().includes(q));
}
/**
 * Check if refs are likely stale (element count changed).
 */
export function checkStale(oldRefs, newRefs) {
    const oldSize = oldRefs.size;
    const newSize = newRefs.size;
    const diff = Math.abs(newSize - oldSize);
    return {
        stale: diff > 0,
        added: Math.max(0, newSize - oldSize),
        removed: Math.max(0, oldSize - newSize),
    };
}
/**
 * Build a QA action from ref.
 * Returns the MCP Playwright command to execute.
 */
export function buildAction(ref, action, refs, value) {
    const entry = refs.get(ref);
    if (!entry) {
        log.warn(`Ref ${ref} not found. Run snapshot for fresh refs.`);
        return null;
    }
    switch (action) {
        case 'click':
            return {
                tool: 'mcp__playwright__browser_click',
                params: { element: entry.name, ref: entry.selector },
            };
        case 'fill':
            return {
                tool: 'mcp__playwright__browser_fill_form',
                params: { element: entry.name, value: value || '' },
            };
        case 'hover':
            return {
                tool: 'mcp__playwright__browser_hover',
                params: { element: entry.name },
            };
        default:
            return null;
    }
}
function escapeName(name) {
    return name.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}
//# sourceMappingURL=aria-refs.js.map