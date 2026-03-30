import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_DIR = join(import.meta.dirname, '..', 'agents');

describe('Agent Definitions', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  it('should have at least 15 agent definitions', () => {
    assert.ok(agentFiles.length >= 15, `Expected at least 15 agents, got ${agentFiles.length}`);
  });

  for (const file of agentFiles) {
    describe(file, () => {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');

      it('should have YAML frontmatter', () => {
        assert.ok(content.startsWith('---'), `${file} missing YAML frontmatter`);
        assert.ok(content.indexOf('---', 3) > 3, `${file} missing closing frontmatter`);
      });

      it('should have name field', () => {
        assert.ok(content.includes('name:'), `${file} missing name field`);
      });

      it('should have description field', () => {
        assert.ok(content.includes('description:'), `${file} missing description field`);
      });

      it('should have model field', () => {
        assert.ok(content.includes('model:'), `${file} missing model field`);
      });

      it('should have tools field', () => {
        assert.ok(content.includes('tools:'), `${file} missing tools field`);
      });

      it('should use valid model tier', () => {
        const modelMatch = content.match(/model:\s*(haiku|sonnet|opus)/);
        assert.ok(modelMatch, `${file} should use haiku, sonnet, or opus model`);
      });
    });
  }

  it('should have required core agents', () => {
    const required = ['sam', 'simon', 'able', 'klay', 'milla', 'jay', 'iron', 'willji'];
    for (const name of required) {
      assert.ok(
        agentFiles.some(f => f.includes(name)),
        `Missing required agent: ${name}`,
      );
    }
  });

  it('should have leadership agents with opus model', () => {
    const leadershipAgents = ['sam.md', 'simon.md', 'klay.md'];
    for (const file of leadershipAgents) {
      if (existsSync(join(AGENTS_DIR, file))) {
        const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
        assert.ok(content.includes('model: opus'), `${file} should use opus model`);
      }
    }
  });

  it('should have implementation agents with sonnet model', () => {
    const implAgents = ['iron.md', 'jay.md', 'derek.md', 'jerry.md'];
    for (const file of implAgents) {
      if (existsSync(join(AGENTS_DIR, file))) {
        const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
        assert.ok(content.includes('model: sonnet'), `${file} should use sonnet model`);
      }
    }
  });

  it('should have consistent agent name matching filename', () => {
    for (const file of agentFiles) {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
      const nameMatch = content.match(/name:\s*(.+)/);
      if (nameMatch) {
        const agentName = nameMatch[1].trim();
        const fileName = file.replace('.md', '');
        assert.equal(agentName, fileName, `Agent name "${agentName}" should match filename "${fileName}"`);
      }
    }
  });
});
