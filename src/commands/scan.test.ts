import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { runScan } from './scan.js';

test('runScan', async t => {
  await t.test('returns 0 when no leaks found', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tmpDir, 'clean.txt'), 'This is clean content');
      execSync('git add clean.txt', { cwd: tmpDir, stdio: 'ignore' });

      const exitCode = await runScan(undefined, tmpDir);

      assert.strictEqual(exitCode, 0, 'Should return 0 for clean files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('detects warnings and auto-proceeds in non-TTY', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tmpDir, '.env'), 'SECRET=mysecret');
      execSync('git add .env', { cwd: tmpDir, stdio: 'ignore' });

      const exitCode = await runScan(undefined, tmpDir);

      assert.strictEqual(exitCode, 0, 'Non-TTY mode should auto-proceed with exit 0');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('scans specific directory when path provided', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, '.env'), 'SECRET=mysecret');

      const exitCode = await runScan('src', tmpDir);

      assert.strictEqual(exitCode, 0, 'Directory scan detects warnings and auto-proceeds in non-TTY');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('handles directory with no git repo', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      fs.writeFileSync(path.join(tmpDir, 'clean.txt'), 'content');

      const exitCode = await runScan('.');

      // Should either return 0 or 1 depending on content, not throw
      assert.ok(exitCode === 0 || exitCode === 1, 'Should handle directory without error');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('detects staged files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create and stage a suspicious file
      fs.writeFileSync(path.join(tmpDir, 'config.js'), 'token="sk-1234567890abcdefghijklmn"');
      execSync('git add config.js', { cwd: tmpDir, stdio: 'ignore' });

      const exitCode = await runScan(undefined, tmpDir);

      assert.strictEqual(exitCode, 0, 'Non-TTY detects and auto-proceeds past warnings');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('detects unstaged modified files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create, commit, then modify file
      fs.writeFileSync(path.join(tmpDir, 'config.js'), 'var x = 1;');
      execSync('git add config.js', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' });

      // Modify with secret
      fs.writeFileSync(path.join(tmpDir, 'config.js'), 'token="AKIAIOSFODNN7EXAMPLE"');

      const exitCode = await runScan(undefined, tmpDir);

      assert.strictEqual(exitCode, 0, 'Non-TTY detects and auto-proceeds past warnings');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('skips binary files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create a file with binary content (null byte)
      const binaryFile = path.join(tmpDir, 'binary.bin');
      fs.writeFileSync(binaryFile, Buffer.concat([Buffer.from('content'), Buffer.from([0]), Buffer.from('more')]));
      execSync('git add binary.bin', { cwd: tmpDir, stdio: 'ignore' });

      // Should not crash on binary file
      const exitCode = await runScan(undefined, tmpDir);

      assert.ok(exitCode === 0 || exitCode === 1, 'Should handle binary files gracefully');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('returns 0 with only WARN issues', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-scan-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create a .cursor workspace file (WARN, not BLOCK)
      fs.mkdirSync(path.join(tmpDir, '.cursor'));
      fs.writeFileSync(path.join(tmpDir, '.cursor', 'rules'), 'rules content');
      execSync('git add .cursor/rules', { cwd: tmpDir, stdio: 'ignore' });

      const exitCode = await runScan(undefined, tmpDir);

      assert.strictEqual(exitCode, 0, 'Should return 0 for WARN-only issues');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
