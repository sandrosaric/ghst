import { test } from 'node:test';
import assert from 'node:assert';
import { scanFiles, type FileToScan } from './scanner.js';

test('scanFiles', async t => {
  await t.test('detects environment files', () => {
    const files: FileToScan[] = [
      { path: '.env', content: 'SECRET=value', staged: true },
    ];

    const results = scanFiles(files);

    assert.ok(results.length > 0, 'Should detect .env file');
    assert.ok(results.some(r => r.ruleName === 'detect-env-file'), 'Should match env file rule');
  });

  await t.test('detects AWS credentials', () => {
    const files: FileToScan[] = [
      { path: 'config.js', content: 'const key = "AKIAIOSFODNN7EXAMPLE";', staged: true },
    ];

    const results = scanFiles(files);

    assert.ok(results.length > 0, 'Should detect AWS credentials');
    assert.ok(results.some(r => r.ruleName === 'detect-aws-keys'), 'Should match AWS rule');
  });

  await t.test('detects API tokens', () => {
    const files: FileToScan[] = [
      { path: 'api.js', content: 'token = "sk-proj-1234567890abcdefghijklmn"', staged: false },
    ];

    const results = scanFiles(files);

    assert.ok(results.length > 0, 'Should detect API token');
    assert.ok(results.some(r => r.ruleName === 'detect-api-tokens'), 'Should match API token rule');
  });

  await t.test('detects Cursor workspace files', () => {
    const files: FileToScan[] = [
      { path: '.cursor/rules', content: 'rules', staged: true },
    ];

    const results = scanFiles(files);

    assert.ok(results.some(r => r.ruleName === 'detect-cursor-workspace'), 'Should detect Cursor workspace');
  });

  await t.test('detects Claude memory files', () => {
    const files: FileToScan[] = [
      { path: 'CLAUDE.md', content: '# Agent Memory', staged: true },
    ];

    const results = scanFiles(files);

    assert.ok(results.some(r => r.ruleName === 'detect-claude-memory'), 'Should detect Claude memory');
  });

  await t.test('returns empty array for clean files', () => {
    const files: FileToScan[] = [
      { path: 'src/index.ts', content: 'console.log("hello");', staged: true },
    ];

    const results = scanFiles(files);

    assert.strictEqual(results.length, 0, 'Should not detect issues in clean file');
  });

  await t.test('preserves staged status in results', () => {
    const files: FileToScan[] = [
      { path: '.env', content: 'SECRET=value', staged: true },
      { path: 'config.js', content: 'AKIAIOSFODNN7EXAMPLE', staged: false },
    ];

    const results = scanFiles(files);

    const envResult = results.find(r => r.path === '.env');
    const configResult = results.find(r => r.path === 'config.js');

    assert.strictEqual(envResult?.staged, true, '.env should be marked as staged');
    assert.strictEqual(configResult?.staged, false, 'config.js should be marked as unstaged');
  });

  await t.test('handles multiple matches in single file', () => {
    const files: FileToScan[] = [
      {
        path: 'config.js',
        content: 'token=sk-1234567890abcdefghijklmn\nkey=AKIAIOSFODNN7EXAMPLE',
        staged: true,
      },
    ];

    const results = scanFiles(files);

    // Should have separate results for each matching rule
    assert.ok(results.length >= 2, 'Should have multiple results for multiple matches');
    const ruleNames = results.map(r => r.ruleName);
    assert.ok(ruleNames.includes('detect-api-tokens'), 'Should include API token match');
    assert.ok(ruleNames.includes('detect-aws-keys'), 'Should include AWS match');
  });

  await t.test('includes all ScanResult fields', () => {
    const files: FileToScan[] = [
      { path: '.env', content: 'SECRET=value', staged: true },
    ];

    const results = scanFiles(files);

    assert.ok(results.length > 0, 'Should have results');
    const result = results[0];
    assert.ok('path' in result && result.path === '.env', 'Should have path');
    assert.ok('severity' in result && (result.severity === 'BLOCK' || result.severity === 'WARN'), 'Should have severity');
    assert.ok('reason' in result && result.reason.length > 0, 'Should have reason');
    assert.ok('ruleName' in result && result.ruleName.length > 0, 'Should have ruleName');
    assert.strictEqual('staged' in result && result.staged, true, 'Should have staged status');
  });

  await t.test('handles directory scan (staged: null)', () => {
    const files: FileToScan[] = [
      { path: '.cursor/rules', content: 'rules', staged: null },
    ];

    const results = scanFiles(files);

    assert.ok(results.length > 0, 'Should detect file');
    const result = results[0];
    assert.strictEqual(result.staged, null, 'Should preserve null staged value');
  });
});
