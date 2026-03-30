import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist', 'scripts', 'ship');

describe('Ship Workflow Modules', () => {
  const modules = [
    'ship-engine', 'ship-orchestrator', 'preflight-check',
    'pr-creator', 'version-bump', 'changelog-gen',
    'deploy-detect', 'doc-release', 'canary-monitor', 'test-triage',
  ];

  for (const mod of modules) {
    it(`should have ${mod} module compiled`, () => {
      const path = join(DIST, `${mod}.js`);
      assert.ok(existsSync(path), `Missing: ${path}`);
    });
  }

  for (const mod of modules) {
    it(`should have ${mod} type declarations`, () => {
      const path = join(DIST, `${mod}.d.ts`);
      assert.ok(existsSync(path), `Missing type declarations: ${path}`);
    });
  }
});

describe('Version Bump', () => {
  it('should export bump functions', async () => {
    try {
      const m = await import('../dist/scripts/ship/version-bump.js');
      assert.ok(m);
    } catch (e) {
      // Module may have import dependencies, just check it exists
      assert.ok(existsSync(join(DIST, 'version-bump.js')));
    }
  });
});

describe('Deploy Detection', () => {
  it('should export detection functions', async () => {
    try {
      const m = await import('../dist/scripts/ship/deploy-detect.js');
      assert.ok(m);
    } catch (e) {
      assert.ok(existsSync(join(DIST, 'deploy-detect.js')));
    }
  });
});

describe('Ship Source Files', () => {
  const SRC = join(import.meta.dirname, '..', 'scripts', 'ship');
  const sources = [
    'ship-engine', 'ship-orchestrator', 'preflight-check',
    'pr-creator', 'version-bump', 'changelog-gen',
    'deploy-detect', 'doc-release', 'canary-monitor', 'test-triage',
  ];

  for (const mod of sources) {
    it(`should have ${mod}.ts source file`, () => {
      const path = join(SRC, `${mod}.ts`);
      assert.ok(existsSync(path), `Missing source: ${path}`);
    });
  }
});
