/**
 * aing-browse — Public API
 *
 * Re-exports the wrapper, evidence, snapshot, and command modules
 * for use by scripts/ and review pipelines.
 *
 * @module browse/src/index
 */

// Wrapper — programmatic API over the browse daemon
export {
  BrowseWrapper,
  createBrowse,
  buildSnapshotArgs,
  parseRefsFromTree,
} from './browse-wrapper.js';

export type {
  Result,
  BrowseResult,
  BrowseError,
  PageState,
  RefEntry,
  DaemonState,
  SnapshotFlags,
  AssertionResult,
  ConsoleEntry,
  NetworkEntry,
} from './browse-wrapper.js';

// Evidence — screenshot/snapshot evidence collection
export {
  EvidenceCollector,
  diffSnapshots,
} from './evidence.js';

export type {
  EvidenceCapture,
  EvidenceComparison,
  SnapshotDiff,
  EvidenceReport,
} from './evidence.js';

// Commands — command registry (used by daemon, exposed for reference)
export {
  COMMANDS,
  getCommand,
  isReadCommand,
  isWriteCommand,
} from './commands.js';

export type { CommandDef } from './commands.js';

// Types — shared daemon types
export type {
  BrowseState,
  CommandResult,
  SnapshotOptions,
  CommandCategory,
} from './types.js';

// Server — production-grade browse daemon
export { BrowseServer, startServer } from './server.js';
export type { ServerConfig } from './server.js';

// Activity — pub/sub activity tracking
export { ActivityTracker } from './activity.js';
export type { ActivityEvent, ActivityType, ActivitySubscription } from './activity.js';

// Buffers — flushable circular buffers
export { FlushableBuffer, createBufferSet } from './buffers.js';
export type { BufferSet, LogFormatter } from './buffers.js';
