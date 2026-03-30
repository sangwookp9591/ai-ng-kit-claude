import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

describe('Hook Handlers', () => {
  it('should have all 7 hook handler files', () => {
    const handlers = [
      'session-start', 'user-prompt-submit', 'pre-tool-use',
      'post-tool-use', 'pre-compact', 'stop', 'stop-failure',
    ];
    for (const h of handlers) {
      const tsPath = join(ROOT, `hooks-handlers/${h}.ts`);
      assert.ok(existsSync(tsPath), `Missing hook handler: ${h}.ts`);
    }
  });

  it('should have hooks.json configuration', () => {
    const hooksPath = join(ROOT, 'hooks/hooks.json');
    assert.ok(existsSync(hooksPath));
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    assert.ok(hooks.hooks);
    assert.ok(hooks.hooks.SessionStart);
    assert.ok(hooks.hooks.UserPromptSubmit);
    assert.ok(hooks.hooks.PreToolUse);
    assert.ok(hooks.hooks.PostToolUse);
    assert.ok(hooks.hooks.PreCompact);
    assert.ok(hooks.hooks.Stop);
    assert.ok(hooks.hooks.StopFailure);
  });

  it('should have correct timeout values', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    // SessionStart: 5000ms
    assert.equal(hooks.hooks.SessionStart[0].hooks[0].timeout, 5000);
    // UserPromptSubmit: 3000ms
    assert.equal(hooks.hooks.UserPromptSubmit[0].hooks[0].timeout, 3000);
    // Stop: 10000ms (longest for cleanup)
    assert.equal(hooks.hooks.Stop[0].hooks[0].timeout, 10000);
  });

  it('should have correct tool matchers for PreToolUse', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    const pre = hooks.hooks.PreToolUse[0];
    assert.ok(pre.matcher.includes('Write'));
    assert.ok(pre.matcher.includes('Edit'));
    assert.ok(pre.matcher.includes('Bash'));
  });

  it('should have matching matchers for PreToolUse and PostToolUse', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    assert.equal(hooks.hooks.PreToolUse[0].matcher, hooks.hooks.PostToolUse[0].matcher);
  });

  it('should have PreCompact matcher for auto|manual', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    const preCompact = hooks.hooks.PreCompact[0];
    assert.ok(preCompact.matcher.includes('auto'));
    assert.ok(preCompact.matcher.includes('manual'));
  });

  it('should use node command type for all hooks', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    for (const [name, entries] of Object.entries(hooks.hooks)) {
      for (const entry of entries) {
        for (const hook of entry.hooks) {
          assert.equal(hook.type, 'command', `${name} hook should be type "command"`);
          assert.ok(hook.command.startsWith('node '), `${name} hook should use node`);
        }
      }
    }
  });

  it('should reference dist/ compiled JS files', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    for (const [name, entries] of Object.entries(hooks.hooks)) {
      for (const entry of entries) {
        for (const hook of entry.hooks) {
          assert.ok(
            hook.command.includes('dist/hooks-handlers/'),
            `${name} hook should reference dist/ path`,
          );
          assert.ok(
            hook.command.endsWith('.js'),
            `${name} hook should reference .js file`,
          );
        }
      }
    }
  });

  it('SessionStart should have once: true', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    assert.equal(hooks.hooks.SessionStart[0].once, true);
  });

  it('should have valid JSON schema reference', () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8'));
    assert.ok(hooks.$schema);
    assert.ok(hooks.$schema.includes('claude-code-hooks'));
  });
});
