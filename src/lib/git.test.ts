import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { getStagedFiles, getUnstagedFiles } from './git.js';

test('Git integration', async t => {
  await t.test('getStagedFiles returns staged files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      // Initialize git repo
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create and stage files
      fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'content2');

      execSync('git add file1.txt file2.txt', { cwd: tmpDir, stdio: 'ignore' });

      const staged = getStagedFiles(tmpDir);

      assert.ok(staged.includes('file1.txt'), 'file1.txt should be in staged files');
      assert.ok(staged.includes('file2.txt'), 'file2.txt should be in staged files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('getUnstagedFiles returns modified files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      // Initialize git repo and commit a file
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tmpDir, 'tracked.txt'), 'original content');
      execSync('git add tracked.txt', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' });

      // Modify file without staging
      fs.writeFileSync(path.join(tmpDir, 'tracked.txt'), 'modified content');

      const unstaged = getUnstagedFiles(tmpDir);

      assert.ok(unstaged.includes('tracked.txt'), 'Modified file should be in unstaged files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('returns empty array when no files changed', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      const staged = getStagedFiles(tmpDir);
      const unstaged = getUnstagedFiles(tmpDir);

      assert.strictEqual(staged.length, 0, 'No staged files');
      assert.strictEqual(unstaged.length, 0, 'No unstaged files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('getUnstagedFiles returns untracked files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      // Initialize git repo
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      // Create untracked files
      fs.writeFileSync(path.join(tmpDir, 'untracked.txt'), 'untracked content');

      const unstaged = getUnstagedFiles(tmpDir);

      assert.ok(unstaged.includes('untracked.txt'), 'Untracked file should be in unstaged files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('getUnstagedFiles returns both modified and untracked files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      // Initialize git repo and commit a file
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

      fs.writeFileSync(path.join(tmpDir, 'tracked.txt'), 'original content');
      execSync('git add tracked.txt', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' });

      // Modify tracked file without staging
      fs.writeFileSync(path.join(tmpDir, 'tracked.txt'), 'modified content');
      // Create untracked file
      fs.writeFileSync(path.join(tmpDir, 'untracked.txt'), 'untracked content');

      const unstaged = getUnstagedFiles(tmpDir);

      assert.ok(unstaged.includes('tracked.txt'), 'Modified file should be in unstaged files');
      assert.ok(unstaged.includes('untracked.txt'), 'Untracked file should be in unstaged files');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('throws when not in a git repository', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-git-test-'));

    try {
      assert.throws(
        () => getStagedFiles(tmpDir),
        error => error instanceof Error && error.message.includes('Failed to get staged files')
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
