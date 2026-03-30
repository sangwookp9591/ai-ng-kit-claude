export interface BrowseState {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
  mode: 'headless' | 'headed';
}

export interface RefEntry {
  ref: string;
  role: string;
  name: string;
  locator: string;
  level?: number;
}

export interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  depth?: number;
  selector?: string;
  diff?: boolean;
  annotate?: boolean;
  outputPath?: string;
  cursorInteractive?: boolean;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  screenshot?: string;
}

export type CommandCategory = 'read' | 'write' | 'meta';
