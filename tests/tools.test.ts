import { describe, it, expect } from 'vitest';
import { viewTool } from '../src/tools/view.js';
import { editTool } from '../src/tools/edit.js';
import { writeTool } from '../src/tools/write.js';
import { grepTool } from '../src/tools/grep.js';
import { globTool } from '../src/tools/glob.js';
import { bashTool } from '../src/tools/bash.js';

describe('Tools', () => {
  describe('ViewTool', () => {
    it('should read file contents', async () => {
      const result = await viewTool.execute('package.json');
      expect(result.success).toBe(true);
      expect(result.output).toContain('codetyper-cli');
    });

    it('should check if file exists', async () => {
      const exists = await viewTool.exists('package.json');
      expect(exists).toBe(true);
    });
  });

  describe('GlobTool', () => {
    it('should find TypeScript files', async () => {
      const result = await globTool.execute('src/**/*.ts');
      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files!.length).toBeGreaterThan(0);
    });

    it('should find files by extension', async () => {
      const files = await globTool.findByExtension('ts', 'src');
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('BashTool', () => {
    it('should execute simple command', async () => {
      const result = await bashTool.execute('echo "Hello World"');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
    });

    it('should check if command exists', async () => {
      const exists = await bashTool.commandExists('node');
      expect(exists).toBe(true);
    });
  });
});
