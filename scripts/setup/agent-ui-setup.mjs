#!/usr/bin/env node
/**
 * sw-kit agent-ui Auto Setup v1.0.0
 *
 * Automatically configures 3D office connection:
 * 1. Auto-detect sw-world-agents-view path
 * 2. Set environment variables in ~/.claude/settings.json
 * 3. Register session-connect + tool-reporter hooks
 * 4. Verify setup
 *
 * Usage: node agent-ui-setup.mjs [--office-url URL] [--team-id ID] [--agent-name NAME] [--uninstall]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const HOME = homedir();
const SETTINGS_PATH = join(HOME, '.claude', 'settings.json');
const CLOUD_URL = 'https://office.sw-world.site';

// ── Parse CLI args ──
const args = process.argv.slice(2);
const isUninstall = args.includes('--uninstall');
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

// ── Find sw-world-agents-view ──
function findOfficeDir() {
  // 1. Direct path
  const direct = join(HOME, 'sw-world-agents-view');
  if (existsSync(join(direct, 'bin', 'agent-ui.mjs'))) return direct;

  // 2. Search in ~/Project
  const projectDir = join(HOME, 'Project');
  if (existsSync(projectDir)) {
    try {
      for (const entry of readdirSync(projectDir)) {
        const candidate = join(projectDir, entry);
        if (statSync(candidate).isDirectory()) {
          if (entry === 'sw-world-agents-view' || entry === 'swkit-office') {
            if (existsSync(join(candidate, 'bin', 'agent-ui.mjs'))) return candidate;
          }
          // One level deeper
          try {
            for (const sub of readdirSync(candidate)) {
              if (sub === 'sw-world-agents-view' || sub === 'swkit-office') {
                const subPath = join(candidate, sub);
                if (existsSync(join(subPath, 'bin', 'agent-ui.mjs'))) return subPath;
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return null;
}

// ── Read/write settings.json ──
function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

// ── Install ──
function install() {
  console.log('━━━ sw-kit agent-ui Setup ━━━');
  console.log('');

  // 1. Find office directory
  const officeDir = findOfficeDir();
  if (officeDir) {
    console.log(`✅ sw-world-agents-view: ${officeDir}`);
  } else {
    console.log('⚠️  sw-world-agents-view 미설치 — 클라우드 모드로 설정합니다.');
    console.log(`   설치하려면: git clone https://github.com/sangwookp9591/sw-world-agents-view.git ~/sw-world-agents-view`);
  }
  console.log('');

  // 2. Determine env values
  const officeUrl = getArg('--office-url') || (officeDir ? `http://localhost:5173` : CLOUD_URL);
  const teamId = getArg('--team-id') || 'default';
  const agentName = getArg('--agent-name') || process.env.USER || 'agent';

  console.log(`   SWKIT_OFFICE_URL:  ${officeUrl}`);
  console.log(`   SWKIT_TEAM_ID:     ${teamId}`);
  console.log(`   SWKIT_AGENT_NAME:  ${agentName}`);
  console.log('');

  // 3. Update settings.json
  const settings = readSettings();

  // Set env vars
  if (!settings.env) settings.env = {};
  settings.env.SWKIT_OFFICE_URL = officeUrl;
  settings.env.SWKIT_TEAM_ID = teamId;
  settings.env.SWKIT_AGENT_NAME = agentName;

  // Add hooks (only if office dir exists for local hooks)
  if (officeDir) {
    if (!settings.hooks) settings.hooks = {};

    const hookScripts = {
      SessionStart: {
        matcher: 'startup',
        script: join(officeDir, 'scripts', 'hooks', 'session-connect.mjs')
      },
      PreToolUse: {
        matcher: '',
        script: join(officeDir, 'scripts', 'hooks', 'tool-reporter.mjs')
      },
      PostToolUse: {
        matcher: '',
        script: join(officeDir, 'scripts', 'hooks', 'tool-done-reporter.mjs')
      }
    };

    for (const [event, config] of Object.entries(hookScripts)) {
      if (!settings.hooks[event]) settings.hooks[event] = [];

      // Check if already registered
      const alreadyExists = settings.hooks[event].some(entry =>
        entry.hooks?.some(h => h.command?.includes(config.script))
      );

      if (!alreadyExists) {
        const hookEntry = {
          hooks: [{
            type: 'command',
            command: `node "${config.script}"`,
            timeout: 5000
          }]
        };
        if (config.matcher) hookEntry.matcher = config.matcher;
        settings.hooks[event].push(hookEntry);
        console.log(`✅ Hook 등록: ${event} → ${config.script.split('/').pop()}`);
      } else {
        console.log(`✅ Hook 이미 등록됨: ${event}`);
      }
    }
  } else {
    console.log('ℹ️  로컬 hook 등록 생략 (sw-world-agents-view 미설치)');
    console.log('   클라우드 모드는 hook 없이 브라우저에서 직접 접속합니다.');
  }

  console.log('');

  // 4. Write settings
  writeSettings(settings);
  console.log(`✅ 설정 저장: ${SETTINGS_PATH}`);
  console.log('');

  // 5. Summary
  console.log('━━━ Setup Complete ━━━');
  console.log('');
  if (officeDir) {
    console.log('  다음 세션부터 3D 오피스에 자동 연결됩니다.');
    console.log('  /swkit agent-ui          — 브라우저에서 확인');
    console.log('  /swkit agent-ui --status — 연결 상태 진단');
  } else {
    console.log('  클라우드 모드로 설정되었습니다.');
    console.log(`  브라우저에서 ${CLOUD_URL} 접속하세요.`);
  }
  console.log('');
}

// ── Uninstall ──
function uninstall() {
  console.log('━━━ sw-kit agent-ui Uninstall ━━━');
  console.log('');

  const settings = readSettings();

  // Remove env vars
  if (settings.env) {
    delete settings.env.SWKIT_OFFICE_URL;
    delete settings.env.SWKIT_TEAM_ID;
    delete settings.env.SWKIT_AGENT_NAME;
    if (Object.keys(settings.env).length === 0) delete settings.env;
    console.log('✅ 환경변수 제거');
  }

  // Remove hooks containing agent-ui related scripts
  if (settings.hooks) {
    for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse']) {
      if (settings.hooks[event]) {
        const before = settings.hooks[event].length;
        settings.hooks[event] = settings.hooks[event].filter(entry =>
          !entry.hooks?.some(h =>
            h.command?.includes('session-connect.mjs') ||
            h.command?.includes('tool-reporter.mjs') ||
            h.command?.includes('tool-done-reporter.mjs')
          )
        );
        const removed = before - settings.hooks[event].length;
        if (removed > 0) console.log(`✅ Hook 제거: ${event} (${removed}개)`);
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  writeSettings(settings);
  console.log(`✅ 설정 저장: ${SETTINGS_PATH}`);
  console.log('');
  console.log('3D 오피스 연결이 해제되었습니다.');
  console.log('');
}

// ── Main ──
if (isUninstall) {
  uninstall();
} else {
  install();
}
