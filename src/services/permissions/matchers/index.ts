/**
 * Permission Matchers Index
 *
 * Re-exports all matchers for convenient access
 */

export {
  matchesBashPattern,
  isBashAllowedByIndex,
  findMatchingBashPatterns,
  generateBashPattern,
  extractCommandPrefix,
} from "@services/permissions/matchers/bash";

export {
  matchesPathPattern,
  matchesFilePattern,
  isFileOpAllowedByIndex,
  findMatchingFilePatterns,
  generateFilePattern,
  normalizePath,
  isPathInDirectory,
} from "@services/permissions/matchers/path";
