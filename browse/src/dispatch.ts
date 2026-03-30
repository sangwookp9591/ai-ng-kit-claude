import type { BrowserManager } from './browser-manager.js';
import type { CommandResult } from './types.js';
import { getCommand } from './commands.js';
import { handleReadCommand } from './read-commands.js';
import { handleWriteCommand } from './write-commands.js';
import { handleMetaCommand } from './meta-commands.js';

export async function dispatchCommand(
  cmd: string,
  args: string[],
  bm: BrowserManager,
  shutdown: () => void,
): Promise<CommandResult> {
  const def = getCommand(cmd);
  if (!def) {
    return {
      success: false,
      output: '',
      error: `Unknown command: ${cmd}. Run 'status' for available commands.`,
    };
  }

  switch (def.category) {
    case 'read':
      return handleReadCommand(cmd, args, bm);
    case 'write':
      return handleWriteCommand(cmd, args, bm);
    case 'meta':
      return handleMetaCommand(cmd, args, bm, shutdown);
    default:
      return { success: false, output: '', error: `Unknown category for command: ${cmd}` };
  }
}
