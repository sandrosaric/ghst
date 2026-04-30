import { test } from 'node:test';
import assert from 'node:assert';
import { formatOutput, type ScanResult } from './formatter.js';

test('formatOutput', async t => {
  await t.test('formats BLOCK results correctly', () => {
    const results: ScanResult[] = [
      {
        path: '.env',
        severity: 'BLOCK',
        reason: 'Environment file with potential secrets',
        ruleName: 'detect-env-file',
        staged: true,
      },
    ];

    const output = formatOutput(results);

    assert.ok(output.includes('❌ BLOCK: .env'), 'Should have BLOCK icon');
    assert.ok(output.includes('(staged)'), 'Should indicate staged');
    assert.ok(output.includes('Environment file with potential secrets'), 'Should include reason');
    assert.ok(output.includes('Delete or unstage this file'), 'Should include action');
    assert.ok(output.includes('Push blocked'), 'Should have blocking message');
  });

  await t.test('formats WARN results correctly', () => {
    const results: ScanResult[] = [
      {
        path: '.cursor/rules',
        severity: 'WARN',
        reason: 'Cursor workspace context folder detected',
        ruleName: 'detect-cursor-workspace',
        staged: false,
      },
    ];

    const output = formatOutput(results);

    assert.ok(output.includes('⚠️ WARN: .cursor/rules'), 'Should have WARN icon');
    assert.ok(output.includes('(unstaged)'), 'Should indicate unstaged');
    assert.ok(output.includes('Cursor workspace context folder detected'), 'Should include reason');
    assert.ok(output.includes('Add .cursor/ to .gitignore'), 'Should include action');
    assert.ok(output.includes('1 warning detected. You will be asked to confirm'), 'Should have warning message');
  });

  await t.test('formats mixed BLOCK and WARN results', () => {
    const results: ScanResult[] = [
      {
        path: '.env',
        severity: 'BLOCK',
        reason: 'Environment file with potential secrets',
        ruleName: 'detect-env-file',
        staged: true,
      },
      {
        path: '.cursor/rules',
        severity: 'WARN',
        reason: 'Cursor workspace context folder detected',
        ruleName: 'detect-cursor-workspace',
        staged: null,
      },
    ];

    const output = formatOutput(results);

    assert.ok(output.includes('Push blocked: 1 BLOCK, 1 WARN'), 'Should count blocks and warns');
  });

  await t.test('formats clean pass', () => {
    const results: ScanResult[] = [];
    const output = formatOutput(results);

    assert.ok(output.includes('✅ PASS: All files are clean'), 'Should show pass message');
  });

  await t.test('includes all required AC fields', () => {
    const results: ScanResult[] = [
      {
        path: '.claude.md',
        severity: 'BLOCK',
        reason: 'Agent memory file with internal architecture details',
        ruleName: 'detect-claude-memory',
        staged: true,
      },
    ];

    const output = formatOutput(results);

    // AC: file path ✓
    assert.ok(output.includes('.claude.md'), 'Should include file path');

    // AC: risk reason ✓
    assert.ok(output.includes('Agent memory file'), 'Should include risk reason');

    // AC: staged/unstaged ✓
    assert.ok(output.includes('staged'), 'Should indicate staged status');

    // AC: corrective action ✓
    assert.ok(output.includes('Delete or unstage'), 'Should include corrective action');

    // AC: summary ✓
    assert.ok(output.includes('Push blocked'), 'Should include summary');
  });

  await t.test('handles multiple files with different rules', () => {
    const results: ScanResult[] = [
      {
        path: '.env',
        severity: 'BLOCK',
        reason: 'Environment file with potential secrets',
        ruleName: 'detect-env-file',
        staged: true,
      },
      {
        path: 'config.js',
        severity: 'BLOCK',
        reason: 'API token detected',
        ruleName: 'detect-api-tokens',
        staged: false,
      },
      {
        path: '.cursor/settings.json',
        severity: 'WARN',
        reason: 'Cursor workspace context folder detected',
        ruleName: 'detect-cursor-workspace',
        staged: null,
      },
    ];

    const output = formatOutput(results);

    assert.ok(output.includes('.env'), 'Should include .env');
    assert.ok(output.includes('config.js'), 'Should include config.js');
    assert.ok(output.includes('.cursor/settings.json'), 'Should include .cursor/settings.json');
    assert.ok(output.includes('Push blocked: 2 BLOCKs, 1 WARN'), 'Should count correctly');
  });

  await t.test('uses custom context string', () => {
    const results: ScanResult[] = [];
    const output = formatOutput(results, 'Scanning ./src');

    assert.ok(output.includes('Scanning ./src...'), 'Should use custom context');
  });
});
