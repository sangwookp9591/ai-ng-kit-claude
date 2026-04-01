import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeImports, detectCircularDeps } from '../dist/scripts/review/cross-file-analyzer.js';

// Create temp dir for test fixtures
const TMP = join(tmpdir(), `cross-file-test-${Date.now()}`);

before(() => {
  mkdirSync(TMP, { recursive: true });
});

after(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe('cross-file-analyzer', () => {
  describe('analyzeImports — import parsing', () => {
    it('parses named imports', () => {
      const fileA = join(TMP, 'a.ts');
      const fileB = join(TMP, 'b.ts');
      writeFileSync(fileA, `import { foo, bar } from './b.js';\n`);
      writeFileSync(fileB, `export function foo() {}\nexport function bar() {}\n`);

      const result = analyzeImports([fileA], TMP);
      assert.equal(result.imports.length, 1);
      assert.equal(result.imports[0].source, fileA);
      assert.ok(result.imports[0].specifiers.includes('foo'));
      assert.ok(result.imports[0].specifiers.includes('bar'));
    });

    it('parses default imports', () => {
      const fileC = join(TMP, 'c.ts');
      const fileD = join(TMP, 'd.ts');
      writeFileSync(fileC, `import MyDefault from './d.js';\n`);
      writeFileSync(fileD, `export default function MyDefault() {}\n`);

      const result = analyzeImports([fileC], TMP);
      assert.equal(result.imports.length, 1);
      assert.ok(result.imports[0].specifiers.includes('MyDefault'));
    });

    it('parses star imports', () => {
      const fileE = join(TMP, 'e.ts');
      const fileF = join(TMP, 'f.ts');
      writeFileSync(fileE, `import * as utils from './f.js';\n`);
      writeFileSync(fileF, `export const x = 1;\n`);

      const result = analyzeImports([fileE], TMP);
      assert.equal(result.imports.length, 1);
      assert.ok(result.imports[0].specifiers[0].startsWith('* as'));
    });

    it('skips node_modules and absolute imports', () => {
      const fileG = join(TMP, 'g.ts');
      writeFileSync(fileG, `import { readFile } from 'node:fs';\nimport React from 'react';\n`);

      const result = analyzeImports([fileG], TMP);
      assert.equal(result.imports.length, 0);
    });

    it('returns empty for empty file', () => {
      const fileH = join(TMP, 'empty.ts');
      writeFileSync(fileH, '');

      const result = analyzeImports([fileH], TMP);
      assert.equal(result.imports.length, 0);
      assert.equal(result.circularDeps.length, 0);
      assert.equal(result.unusedExports.length, 0);
    });
  });

  describe('detectCircularDeps', () => {
    it('detects simple A→B→A cycle', () => {
      const cycles = detectCircularDeps([
        { source: 'a', target: 'b', specifiers: [] },
        { source: 'b', target: 'a', specifiers: [] },
      ]);
      assert.ok(cycles.length >= 1);
      const flatCycle = cycles[0];
      assert.ok(flatCycle.includes('a'));
      assert.ok(flatCycle.includes('b'));
    });

    it('detects no cycle in linear chain', () => {
      const cycles = detectCircularDeps([
        { source: 'a', target: 'b', specifiers: [] },
        { source: 'b', target: 'c', specifiers: [] },
      ]);
      assert.equal(cycles.length, 0);
    });

    it('detects 3-node cycle A→B→C→A', () => {
      const cycles = detectCircularDeps([
        { source: 'a', target: 'b', specifiers: [] },
        { source: 'b', target: 'c', specifiers: [] },
        { source: 'c', target: 'a', specifiers: [] },
      ]);
      assert.ok(cycles.length >= 1);
    });

    it('returns empty for no imports', () => {
      const cycles = detectCircularDeps([]);
      assert.equal(cycles.length, 0);
    });
  });

  describe('analyzeImports — depth limit', () => {
    it('respects maxDepth=1 and does not traverse deeper', () => {
      const d1 = join(TMP, 'depth1.ts');
      const d2 = join(TMP, 'depth2.ts');
      const d3 = join(TMP, 'depth3.ts');
      writeFileSync(d1, `import { x } from './depth2.js';\n`);
      writeFileSync(d2, `import { y } from './depth3.js';\nexport const x = 1;\n`);
      writeFileSync(d3, `export const y = 2;\n`);

      // maxDepth=1: only d1→d2 edge, d2→d3 not explored
      const result = analyzeImports([d1], TMP, 1);
      const targets = result.imports.map(e => e.target);
      assert.ok(targets.includes(d2), 'Should include d2');
      assert.ok(!targets.includes(d3), 'Should NOT include d3 at depth>1');
    });
  });

  describe('analyzeImports — circular dep via actual files', () => {
    it('detects circular deps in file graph', () => {
      const ca = join(TMP, 'circ-a.ts');
      const cb = join(TMP, 'circ-b.ts');
      writeFileSync(ca, `import { b } from './circ-b.js';\nexport const a = 1;\n`);
      writeFileSync(cb, `import { a } from './circ-a.js';\nexport const b = 2;\n`);

      const result = analyzeImports([ca], TMP, 3);
      assert.ok(result.circularDeps.length >= 1);
    });
  });
});
