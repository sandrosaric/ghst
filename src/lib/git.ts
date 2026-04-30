import { execSync } from 'node:child_process';

export function getStagedFiles(cwd: string = process.cwd()): string[] {
  try {
    const output = execSync('git diff --cached --name-only', { cwd, encoding: 'utf-8' });
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    throw new Error('Failed to get staged files from git');
  }
}

export function getUnstagedFiles(cwd: string = process.cwd()): string[] {
  try {
    // Get modified tracked files
    const modifiedOutput = execSync('git diff --name-only', { cwd, encoding: 'utf-8' });
    const modified = modifiedOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Get untracked files
    const untrackedOutput = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf-8' });
    const untracked = untrackedOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return [...modified, ...untracked];
  } catch (error) {
    throw new Error('Failed to get unstaged files from git');
  }
}
