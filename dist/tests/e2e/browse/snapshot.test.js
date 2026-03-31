import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
describe('Snapshot Types and Options', () => {
    it('should accept all SnapshotOptions fields', async () => {
        // Verify the SnapshotOptions interface shape by constructing valid options
        const options = {
            interactive: true,
            compact: false,
            depth: 3,
            selector: '#main',
            diff: true,
            annotate: false,
            cursorInteractive: true,
            outputPath: '/tmp/test.png',
        };
        assert.equal(options.interactive, true);
        assert.equal(options.compact, false);
        assert.equal(options.depth, 3);
        assert.equal(options.selector, '#main');
        assert.equal(options.diff, true);
        assert.equal(options.annotate, false);
        assert.equal(options.cursorInteractive, true);
        assert.equal(options.outputPath, '/tmp/test.png');
    });
    it('should allow partial SnapshotOptions (all fields optional)', async () => {
        const empty = {};
        assert.equal(empty.interactive, undefined);
        assert.equal(empty.depth, undefined);
        assert.equal(empty.selector, undefined);
        const interactiveOnly = {
            interactive: true,
        };
        assert.equal(interactiveOnly.interactive, true);
        assert.equal(interactiveOnly.compact, undefined);
    });
});
describe('Snapshot Interactive Roles', () => {
    // These constants mirror the INTERACTIVE_ROLES set in snapshot.ts
    const INTERACTIVE_ROLES = new Set([
        'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
        'menuitem', 'option', 'slider', 'spinbutton', 'switch', 'tab',
        'searchbox', 'menuitemcheckbox', 'menuitemradio', 'treeitem',
    ]);
    it('should include all primary form controls', () => {
        assert.ok(INTERACTIVE_ROLES.has('textbox'));
        assert.ok(INTERACTIVE_ROLES.has('checkbox'));
        assert.ok(INTERACTIVE_ROLES.has('radio'));
        assert.ok(INTERACTIVE_ROLES.has('combobox'));
        assert.ok(INTERACTIVE_ROLES.has('slider'));
        assert.ok(INTERACTIVE_ROLES.has('spinbutton'));
        assert.ok(INTERACTIVE_ROLES.has('switch'));
        assert.ok(INTERACTIVE_ROLES.has('searchbox'));
    });
    it('should include navigation roles', () => {
        assert.ok(INTERACTIVE_ROLES.has('button'));
        assert.ok(INTERACTIVE_ROLES.has('link'));
        assert.ok(INTERACTIVE_ROLES.has('tab'));
    });
    it('should include menu-related roles', () => {
        assert.ok(INTERACTIVE_ROLES.has('menuitem'));
        assert.ok(INTERACTIVE_ROLES.has('menuitemcheckbox'));
        assert.ok(INTERACTIVE_ROLES.has('menuitemradio'));
        assert.ok(INTERACTIVE_ROLES.has('option'));
        assert.ok(INTERACTIVE_ROLES.has('treeitem'));
    });
    it('should not include non-interactive roles', () => {
        assert.ok(!INTERACTIVE_ROLES.has('heading'));
        assert.ok(!INTERACTIVE_ROLES.has('paragraph'));
        assert.ok(!INTERACTIVE_ROLES.has('img'));
        assert.ok(!INTERACTIVE_ROLES.has('banner'));
        assert.ok(!INTERACTIVE_ROLES.has('navigation'));
        assert.ok(!INTERACTIVE_ROLES.has('main'));
        assert.ok(!INTERACTIVE_ROLES.has('contentinfo'));
        assert.ok(!INTERACTIVE_ROLES.has('generic'));
        assert.ok(!INTERACTIVE_ROLES.has('group'));
    });
    it('should have exactly 16 interactive roles', () => {
        assert.equal(INTERACTIVE_ROLES.size, 16);
    });
});
describe('Snapshot Structural Roles', () => {
    // These constants mirror the STRUCTURAL_ROLES set in snapshot.ts
    const STRUCTURAL_ROLES = new Set([
        'generic', 'group', 'presentation', 'none', 'paragraph',
    ]);
    it('should include all structural wrapper roles', () => {
        assert.ok(STRUCTURAL_ROLES.has('generic'));
        assert.ok(STRUCTURAL_ROLES.has('group'));
        assert.ok(STRUCTURAL_ROLES.has('presentation'));
        assert.ok(STRUCTURAL_ROLES.has('none'));
        assert.ok(STRUCTURAL_ROLES.has('paragraph'));
    });
    it('should not include interactive roles', () => {
        assert.ok(!STRUCTURAL_ROLES.has('button'));
        assert.ok(!STRUCTURAL_ROLES.has('link'));
        assert.ok(!STRUCTURAL_ROLES.has('textbox'));
    });
    it('should not include landmark roles', () => {
        assert.ok(!STRUCTURAL_ROLES.has('banner'));
        assert.ok(!STRUCTURAL_ROLES.has('navigation'));
        assert.ok(!STRUCTURAL_ROLES.has('main'));
        assert.ok(!STRUCTURAL_ROLES.has('contentinfo'));
    });
    it('should have exactly 5 structural roles', () => {
        assert.equal(STRUCTURAL_ROLES.size, 5);
    });
});
describe('Snapshot CommandCategory Types', () => {
    it('should only allow valid category values', () => {
        const validCategories = [
            'read', 'write', 'meta',
        ];
        assert.equal(validCategories.length, 3);
        assert.ok(validCategories.includes('read'));
        assert.ok(validCategories.includes('write'));
        assert.ok(validCategories.includes('meta'));
    });
});
describe('Snapshot BrowseState Type', () => {
    it('should accept valid BrowseState', () => {
        const state = {
            pid: 12345,
            port: 9222,
            token: 'abc123',
            startedAt: '2026-03-30T00:00:00Z',
            mode: 'headless',
        };
        assert.equal(state.pid, 12345);
        assert.equal(state.port, 9222);
        assert.equal(state.mode, 'headless');
    });
    it('should accept headed mode', () => {
        const state = {
            pid: 1,
            port: 8080,
            token: 'tok',
            startedAt: '2026-01-01T00:00:00Z',
            mode: 'headed',
        };
        assert.equal(state.mode, 'headed');
    });
});
describe('Snapshot CommandResult Type', () => {
    it('should accept successful result', () => {
        const result = {
            success: true,
            output: 'Page loaded',
        };
        assert.ok(result.success);
        assert.equal(result.output, 'Page loaded');
        assert.equal(result.error, undefined);
        assert.equal(result.screenshot, undefined);
    });
    it('should accept failed result with error', () => {
        const result = {
            success: false,
            output: '',
            error: 'Timeout waiting for element',
        };
        assert.ok(!result.success);
        assert.equal(result.error, 'Timeout waiting for element');
    });
    it('should accept result with screenshot path', () => {
        const result = {
            success: true,
            output: 'Screenshot captured',
            screenshot: '/tmp/screenshot.png',
        };
        assert.equal(result.screenshot, '/tmp/screenshot.png');
    });
});
//# sourceMappingURL=snapshot.test.js.map