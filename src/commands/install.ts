import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

const HOOK_CONTENT = `#!/bin/bash
ghst scan
exit $?
`;

export async function runInstall(cwd: string = process.cwd()): Promise<void> {
  const gitDir = path.join(cwd, '.git');

  if (!fs.existsSync(gitDir)) {
    throw new Error('Not a git repository. Run `git init` first.');
  }

  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(hookPath, HOOK_CONTENT, { mode: 0o755 });

  console.log('✅ ghst pre-commit hook installed');
  console.log(`   Hook location: ${hookPath}`);
  console.log('   Run `git commit` to activate automatic leak protection.');
}

export const installCommand = new Command('install')
  .description('Install pre-commit git hook for automatic leak protection')
  .action(async () => {
    try {
      await runInstall();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Installation failed: ${message}`);
      process.exit(1);
    }
  });
