/**
 * aing → norch bridge (built-in)
 *
 * Sends events to norch if it's running (/tmp/norch.sock exists).
 * All calls are fire-and-forget — never blocks, never throws.
 * Zero overhead when norch is not installed.
 */
import { connect } from 'node:net';
import { existsSync } from 'node:fs';

const SOCK = '/tmp/norch.sock';

function send(event) {
  if (!existsSync(SOCK)) return; // norch not running — skip

  try {
    const socket = connect(SOCK, () => {
      socket.write(JSON.stringify({ ...event, timestamp: Date.now() }) + '\n', () => socket.end());
    });
    socket.on('error', () => {});
    setTimeout(() => socket.destroy(), 200);
  } catch {
    // silent
  }
}

const AGENT_MAP = {
  sam: { name: 'Sam', role: 'CTO', model: 'opus' },
  able: { name: 'Able', role: '기획', model: 'sonnet' },
  klay: { name: 'Klay', role: '설계', model: 'opus' },
  jay: { name: 'Jay', role: 'API', model: 'sonnet' },
  jerry: { name: 'Jerry', role: 'DB', model: 'sonnet' },
  milla: { name: 'Milla', role: '보안', model: 'sonnet' },
  jun: { name: 'Jun', role: '성능', model: 'sonnet' },
  willji: { name: 'Willji', role: '디자인', model: 'sonnet' },
  iron: { name: 'Iron', role: '화면', model: 'sonnet' },
  rowan: { name: 'Rowan', role: '모션', model: 'sonnet' },
  derek: { name: 'Derek', role: '모바일', model: 'sonnet' },
  simon: { name: 'Simon', role: '코드분석', model: 'sonnet' },
};

function resolveAgent(nameOrType) {
  if (!nameOrType) return null;
  const key = nameOrType.toLowerCase().replace(/^aing:/, '');
  return AGENT_MAP[key] ?? null;
}

export function norchSessionStart(sessionId) {
  send({ type: 'session-start', sessionId: sessionId ?? 'unknown' });
}

export function norchSessionEnd(sessionId) {
  send({ type: 'session-end', sessionId: sessionId ?? 'unknown' });
}

export function norchAgentSpawn(sessionId, agentKey, message) {
  const agent = resolveAgent(agentKey);
  if (agent) send({ type: 'agent-spawn', sessionId, agent, message });
}

export function norchAgentDone(sessionId, agentKey, message) {
  const agent = resolveAgent(agentKey);
  if (agent) send({ type: 'agent-done', sessionId, agent, message });
}

export function norchToolUse(sessionId, toolName, target, agentKey) {
  send({ type: 'tool-use', sessionId, agent: resolveAgent(agentKey), tool: { name: toolName, target } });
}

export function norchError(sessionId, agentKey, message) {
  send({ type: 'error', sessionId, agent: resolveAgent(agentKey), message });
}

export function norchPdcaChange(sessionId, phase, step) {
  send({ type: 'pdca-change', sessionId, pdca: { phase, step } });
}
