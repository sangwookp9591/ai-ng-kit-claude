/**
 * aing-browse — Public API
 *
 * Re-exports the wrapper, evidence, snapshot, and command modules
 * for use by scripts/ and review pipelines.
 *
 * @module browse/src/index
 */
// Wrapper — programmatic API over the browse daemon
export { BrowseWrapper, createBrowse, buildSnapshotArgs, parseRefsFromTree, } from './browse-wrapper.js';
// Evidence — screenshot/snapshot evidence collection
export { EvidenceCollector, diffSnapshots, } from './evidence.js';
// Commands — command registry (used by daemon, exposed for reference)
export { COMMANDS, getCommand, isReadCommand, isWriteCommand, } from './commands.js';
//# sourceMappingURL=index.js.map