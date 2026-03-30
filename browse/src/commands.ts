import type { CommandCategory } from './types.js';

export interface CommandDef {
  name: string;
  category: CommandCategory;
  description: string;
  args: string;
  examples?: string[];
}

export const COMMANDS: Map<string, CommandDef> = new Map([
  // Navigation
  ['goto', { name: 'goto', category: 'write', description: 'Navigate to URL', args: '<url>' }],
  ['back', { name: 'back', category: 'write', description: 'History back', args: '' }],
  ['forward', { name: 'forward', category: 'write', description: 'History forward', args: '' }],
  ['reload', { name: 'reload', category: 'write', description: 'Reload page', args: '' }],
  ['url', { name: 'url', category: 'read', description: 'Print current URL', args: '' }],

  // Reading
  ['text', { name: 'text', category: 'read', description: 'Cleaned page text', args: '' }],
  ['html', { name: 'html', category: 'read', description: 'innerHTML of selector or full page', args: '[selector]' }],
  ['links', { name: 'links', category: 'read', description: 'All links as text → href', args: '' }],
  ['forms', { name: 'forms', category: 'read', description: 'Form fields as JSON', args: '' }],
  ['accessibility', { name: 'accessibility', category: 'read', description: 'Full ARIA tree', args: '' }],
  ['js', { name: 'js', category: 'read', description: 'Run JavaScript expression', args: '<expr>' }],
  ['css', { name: 'css', category: 'read', description: 'Computed CSS value', args: '<sel> <prop>' }],
  ['attrs', { name: 'attrs', category: 'read', description: 'Element attributes as JSON', args: '<sel|@ref>' }],
  ['console', { name: 'console', category: 'read', description: 'Console messages', args: '[--clear|--errors]' }],
  ['network', { name: 'network', category: 'read', description: 'Network requests', args: '[--clear]' }],
  ['cookies', { name: 'cookies', category: 'read', description: 'All cookies as JSON', args: '' }],
  ['storage', { name: 'storage', category: 'read', description: 'localStorage + sessionStorage', args: '[set k v]' }],
  ['perf', { name: 'perf', category: 'read', description: 'Page load timings', args: '' }],
  ['is', { name: 'is', category: 'read', description: 'State check', args: '<visible|hidden|enabled|disabled|checked|editable|focused> <sel>' }],

  // Interaction
  ['click', { name: 'click', category: 'write', description: 'Click element', args: '<sel>' }],
  ['fill', { name: 'fill', category: 'write', description: 'Fill input', args: '<sel> <val>' }],
  ['select', { name: 'select', category: 'write', description: 'Select dropdown option', args: '<sel> <val>' }],
  ['hover', { name: 'hover', category: 'write', description: 'Hover element', args: '<sel>' }],
  ['type', { name: 'type', category: 'write', description: 'Type into focused element', args: '<text>' }],
  ['press', { name: 'press', category: 'write', description: 'Press key', args: '<key>' }],
  ['scroll', { name: 'scroll', category: 'write', description: 'Scroll element into view', args: '[sel]' }],
  ['wait', { name: 'wait', category: 'write', description: 'Wait for element/network/load', args: '<sel|--networkidle|--load>' }],
  ['upload', { name: 'upload', category: 'write', description: 'Upload file(s)', args: '<sel> <file> [file2...]' }],
  ['viewport', { name: 'viewport', category: 'write', description: 'Set viewport size', args: '<WxH>' }],
  ['cookie', { name: 'cookie', category: 'write', description: 'Set cookie', args: '<name>=<value>' }],
  ['header', { name: 'header', category: 'write', description: 'Set custom request header', args: '<name>:<value>' }],
  ['dialog-accept', { name: 'dialog-accept', category: 'write', description: 'Accept next dialog with optional text', args: '[text]' }],
  ['dialog-dismiss', { name: 'dialog-dismiss', category: 'write', description: 'Dismiss next dialog', args: '' }],
  ['useragent', { name: 'useragent', category: 'write', description: 'Set user agent', args: '<string>' }],
  ['cookie-import', { name: 'cookie-import', category: 'write', description: 'Import cookies from JSON file', args: '<json-path>' }],
  ['cookie-import-browser', { name: 'cookie-import-browser', category: 'write', description: 'Import cookies from installed Chromium browser', args: '[browser] [--domain d]' }],
  ['frame', { name: 'frame', category: 'write', description: 'Switch to iframe context', args: '<sel|@ref|--name n|--url pattern|main>' }],

  // Reading - additional
  ['dialog', { name: 'dialog', category: 'read', description: 'Dialog messages', args: '[--clear]' }],
  ['eval', { name: 'eval', category: 'read', description: 'Run JavaScript from file', args: '<file>' }],

  // Visual
  ['screenshot', { name: 'screenshot', category: 'meta', description: 'Save screenshot', args: '[--viewport] [--clip x,y,w,h] [selector|@ref] [path]' }],
  ['pdf', { name: 'pdf', category: 'meta', description: 'Save as PDF', args: '[path]' }],
  ['responsive', { name: 'responsive', category: 'meta', description: 'Screenshots at mobile/tablet/desktop', args: '[prefix]' }],
  ['diff', { name: 'diff', category: 'meta', description: 'Text diff between pages', args: '<url1> <url2>' }],

  // Snapshot
  ['snapshot', { name: 'snapshot', category: 'meta', description: 'ARIA tree with @refs', args: '[flags]' }],

  // Tabs
  ['tabs', { name: 'tabs', category: 'meta', description: 'List open tabs', args: '' }],
  ['tab', { name: 'tab', category: 'meta', description: 'Switch to tab', args: '<id>' }],
  ['newtab', { name: 'newtab', category: 'meta', description: 'Open new tab', args: '[url]' }],
  ['closetab', { name: 'closetab', category: 'meta', description: 'Close tab', args: '[id]' }],

  // Meta
  ['chain', { name: 'chain', category: 'meta', description: 'Run commands from JSON stdin', args: '' }],
  ['status', { name: 'status', category: 'meta', description: 'Health check', args: '' }],
  ['stop', { name: 'stop', category: 'meta', description: 'Shutdown server', args: '' }],
  ['state', { name: 'state', category: 'meta', description: 'Save/load browser state', args: 'save|load <name>' }],
  ['restart', { name: 'restart', category: 'meta', description: 'Restart server', args: '' }],
  ['connect', { name: 'connect', category: 'meta', description: 'Launch headed Chrome with debugging', args: '' }],
  ['disconnect', { name: 'disconnect', category: 'meta', description: 'Disconnect headed browser', args: '' }],
  ['focus', { name: 'focus', category: 'meta', description: 'Bring Chrome to foreground', args: '[@ref]' }],
  ['handoff', { name: 'handoff', category: 'meta', description: 'Open Chrome at current page for user', args: '[message]' }],
  ['resume', { name: 'resume', category: 'meta', description: 'Re-snapshot after user takeover', args: '' }],
  ['watch', { name: 'watch', category: 'meta', description: 'Passive observation mode', args: '[stop]' }],
  ['inbox', { name: 'inbox', category: 'meta', description: 'List messages from observation', args: '[--clear]' }],
]);

export function getCommand(name: string): CommandDef | undefined {
  return COMMANDS.get(name);
}

export function isReadCommand(name: string): boolean {
  return COMMANDS.get(name)?.category === 'read';
}

export function isWriteCommand(name: string): boolean {
  return COMMANDS.get(name)?.category === 'write';
}
