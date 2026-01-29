/**
 * @file file-picker.test.ts
 * @description Unit tests for file-picker.ts constants
 */

import { IGNORED_PATTERNS, BINARY_EXTENSIONS, FILE_PICKER_DEFAULTS, BinaryExtension, IgnoredPattern } from '../src/constants/file-picker';

describe('file-picker constants', () => {
  describe('IGNORED_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(IGNORED_PATTERNS)).toBe(true);
      IGNORED_PATTERNS.forEach(pattern => {
        expect(typeof pattern).toBe('string');
      });
    });

    it('should contain common ignored patterns', () => {
      expect(IGNORED_PATTERNS).toContain('.git');
      expect(IGNORED_PATTERNS).toContain('node_modules');
      expect(IGNORED_PATTERNS).toContain('.DS_Store');
    });
  });

  describe('BINARY_EXTENSIONS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(BINARY_EXTENSIONS)).toBe(true);
      BINARY_EXTENSIONS.forEach(ext => {
        expect(typeof ext).toBe('string');
      });
    });

    it('should contain common binary file extensions', () => {
      expect(BINARY_EXTENSIONS).toContain('.exe');
      expect(BINARY_EXTENSIONS).toContain('.png');
      expect(BINARY_EXTENSIONS).toContain('.mp3');
      expect(BINARY_EXTENSIONS).toContain('.zip');
      expect(BINARY_EXTENSIONS).toContain('.pdf');
    });
  });

  describe('FILE_PICKER_DEFAULTS', () => {
    it('should have correct default values', () => {
      expect(FILE_PICKER_DEFAULTS.MAX_DEPTH).toBe(2);
      expect(FILE_PICKER_DEFAULTS.MAX_RESULTS).toBe(15);
      expect(FILE_PICKER_DEFAULTS.INITIAL_DEPTH).toBe(0);
    });
  });

  describe('Type Definitions', () => {
    it('BinaryExtension should include specific extensions', () => {
      const binaryExtension: BinaryExtension = '.exe';
      expect(BINARY_EXTENSIONS).toContain(binaryExtension);
    });

    it('IgnoredPattern should include specific patterns', () => {
      const ignoredPattern: IgnoredPattern = '.git';
      expect(IGNORED_PATTERNS).toContain(ignoredPattern);
    });
  });
});