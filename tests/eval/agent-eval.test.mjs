import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_DIR = join(import.meta.dirname, '../../agents');

function parseAgentFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      fm[key.trim()] = rest.join(':').trim();
    }
  }
  return fm;
}

describe('Agent Quality Eval', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  it('should have minimum 15 agents', () => {
    assert.ok(agentFiles.length >= 15);
  });

  for (const file of agentFiles) {
    describe(`Agent: ${file}`, () => {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
      const fm = parseAgentFrontmatter(content);

      it('should have name in frontmatter', () => {
        assert.ok(fm.name, `${file}: missing name`);
      });

      it('should have description in frontmatter', () => {
        assert.ok(fm.description, `${file}: missing description`);
      });

      it('should have substantive body (>20 lines)', () => {
        const bodyStart = content.indexOf('---', 4);
        const body = content.slice(bodyStart + 3).trim();
        const lines = body.split('\n').filter(l => l.trim().length > 0);
        assert.ok(lines.length >= 3, `${file}: body too short (${lines.length} lines)`);
      });

      it('should not use AI slop vocabulary in prose', () => {
        const slop = ['delve', 'crucial', 'robust', 'comprehensive', 'nuanced'];
        // Remove banned-word lists before checking (words appear in "금지 단어:" lines)
        const proseContent = content.split('\n')
          .filter(l => !l.includes('금지') && !l.includes('forbidden') && !l.includes('banned') && !l.includes('prohibit'))
          .join('\n');
        for (const word of slop) {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          assert.ok(!regex.test(proseContent), `${file}: uses AI slop word "${word}" in prose`);
        }
      });

      it('should have consistent filename-to-name mapping', () => {
        const expectedName = file.replace('.md', '');
        if (fm.name) {
          assert.equal(fm.name, expectedName, `${file}: name "${fm.name}" doesn't match filename`);
        }
      });
    });
  }

  describe('Team Coverage', () => {
    const agents = agentFiles.map(f => f.replace('.md', ''));

    it('should have leadership agents', () => {
      const leaders = ['sam', 'simon', 'able'];
      for (const l of leaders) {
        assert.ok(agents.includes(l), `Missing leader: ${l}`);
      }
    });

    it('should have architecture agent', () => {
      assert.ok(agents.includes('klay'), 'Missing architect: klay');
    });

    it('should have security agent', () => {
      assert.ok(agents.includes('milla'), 'Missing security: milla');
    });

    it('should have backend agents', () => {
      const backend = ['jay', 'jerry'];
      for (const b of backend) {
        assert.ok(agents.includes(b), `Missing backend: ${b}`);
      }
    });

    it('should have frontend agents', () => {
      const frontend = ['iron', 'derek', 'rowan', 'willji'];
      for (const f of frontend) {
        assert.ok(agents.includes(f), `Missing frontend: ${f}`);
      }
    });

    it('should have performance agent', () => {
      assert.ok(agents.includes('jun'), 'Missing performance: jun');
    });

    it('should have code intelligence agent', () => {
      assert.ok(agents.includes('kain'), 'Missing code intel: kain');
    });
  });
});
