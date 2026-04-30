import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInstall } from './install.js';

test('runInstall()', async t => {
  await t.test('writes pre-push hook file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');

    try {
      // Create a minimal git repo structure
      fs.mkdirSync(gitDir, { recursive: true });

      // Call runInstall
      runInstall(tmpDir);

      // Verify hook file exists
      const hookPath = path.join(gitDir, 'hooks', 'pre-push');
      assert.ok(fs.existsSync(hookPath), 'Hook file should exist');

      // Verify hook content
      const content = fs.readFileSync(hookPath, 'utf-8');
      assert.ok(content.includes('#!/bin/bash'), 'Hook should have bash shebang');
      assert.ok(content.includes('ghst scan'), 'Hook should call ghst scan');
      assert.ok(content.includes('exit $?'), 'Hook should exit with scan exit code');
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('creates hooks directory if it does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');

    try {
      fs.mkdirSync(gitDir, { recursive: true });

      const hooksDir = path.join(gitDir, 'hooks');
      assert.ok(!fs.existsSync(hooksDir), 'hooks dir should not exist initially');

      runInstall(tmpDir);

      assert.ok(fs.existsSync(hooksDir), 'hooks dir should be created');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('makes hook file executable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');

    try {
      fs.mkdirSync(gitDir, { recursive: true });

      runInstall(tmpDir);

      const hookPath = path.join(gitDir, 'hooks', 'pre-push');
      const stats = fs.statSync(hookPath);

      // Check if executable bit is set (mode & 0o111)
      // eslint-disable-next-line no-bitwise
      assert.ok(stats.mode & 0o111, 'Hook file should be executable');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('throws when not in a git repository', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));

    try {
      await assert.rejects(
        () => runInstall(tmpDir),
        error => error instanceof Error && error.message.includes('Not a git repository')
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('succeeds when hooks directory already exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');
    const hooksDir = path.join(gitDir, 'hooks');

    try {
      fs.mkdirSync(hooksDir, { recursive: true });

      runInstall(tmpDir);

      const hookPath = path.join(hooksDir, 'pre-push');
      assert.ok(fs.existsSync(hookPath), 'Hook file should be created');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('overwrites existing hook file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    const hookPath = path.join(hooksDir, 'pre-push');

    try {
      fs.mkdirSync(hooksDir, { recursive: true });
      fs.writeFileSync(hookPath, 'old content', 'utf-8');

      runInstall(tmpDir);

      const content = fs.readFileSync(hookPath, 'utf-8');
      assert.strictEqual(content, `#!/bin/bash
ghst scan
exit $?
`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  await t.test('hook content is correct', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghst-test-'));
    const gitDir = path.join(tmpDir, '.git');

    try {
      fs.mkdirSync(gitDir, { recursive: true });

      runInstall(tmpDir);

      const hookPath = path.join(gitDir, 'hooks', 'pre-push');
      const content = fs.readFileSync(hookPath, 'utf-8');
      const expected = `#!/bin/bash
ghst scan
exit $?
`;
      assert.strictEqual(content, expected, 'Hook content should match exactly');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
