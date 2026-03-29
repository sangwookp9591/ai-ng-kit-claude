/**
 * Smart Rebuild Check
 *
 * Compares source file mtimes vs generated file mtimes to skip unnecessary rebuilds.
 * Used by build scripts to avoid redundant work when sources haven't changed.
 *
 * @module scripts/build/smart-rebuild
 */

import { statSync, existsSync } from 'node:fs';

/**
 * Check if any source file is newer than the target file.
 * @param {string[]} sources - Source file paths
 * @param {string} target - Target file path
 * @returns {boolean} true if rebuild needed
 */
export function needsRebuild(sources, target) {
  if (!existsSync(target)) return true;

  let targetMtime;
  try {
    targetMtime = statSync(target).mtimeMs;
  } catch {
    return true; // can't stat target = rebuild
  }

  return sources.some(src => {
    try {
      return statSync(src).mtimeMs > targetMtime;
    } catch {
      return true; // source doesn't exist or unreadable = rebuild
    }
  });
}

/**
 * Check if rebuild is needed for multiple source-target pairs.
 * Returns the list of targets that need rebuilding.
 * @param {Array<{ sources: string[], target: string }>} pairs
 * @returns {string[]} targets that need rebuild
 */
export function staleTargets(pairs) {
  return pairs
    .filter(({ sources, target }) => needsRebuild(sources, target))
    .map(({ target }) => target);
}
