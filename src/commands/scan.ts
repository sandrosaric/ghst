import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { getStagedFiles, getUnstagedFiles } from '../lib/git.js';
import { scanFiles, type FileToScan } from '../lib/scanner.js';
import { formatOutput } from '../lib/formatter.js';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', 'build', 'coverage', '.venv', 'venv']);

function isBinary(content: string): boolean {
  return content.includes('\0');
}

function walkDirectory(dir: string): string[] {
  const files: string[] = [];
  const visited = new Set<string>();

  function walk(currentPath: string, relativePath: string): void {
    try {
      const realPath = fs.realpathSync(currentPath);
      if (visited.has(realPath)) return;
      visited.add(realPath);

      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            walk(path.join(currentPath, entry.name), path.join(relativePath, entry.name));
          }
        } else if (entry.isFile()) {
          files.push(path.join(relativePath, entry.name));
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(dir, '');
  return files;
}

function readFileContent(filePath: string, cwd: string): string | null {
  try {
    const fullPath = path.join(cwd, filePath);
    const stats = fs.statSync(fullPath);
    if (stats.size > 10 * 1024 * 1024) {
      console.warn(`⚠️ File too large (skipped): ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return isBinary(content) ? null : content;
  } catch (error) {
    if (error instanceof Error && error.code === 'EACCES') {
      console.warn(`⚠️ Permission denied (cannot scan): ${filePath}`);
    }
    return null;
  }
}

async function promptContinue(warnCount: number, forcePrompt: boolean = false): Promise<boolean> {
  if (!process.stdin.isTTY && !forcePrompt) {
    console.log(`⚠️  Non-interactive mode: proceeding past ${warnCount} warning${warnCount !== 1 ? 's' : ''}.`);
    return true;
  }

  return new Promise((resolve) => {
    try {
      const ttyFd = fs.openSync('/dev/tty', 'r+');
      const ttyStream = fs.createReadStream('', { fd: ttyFd });

      process.stdout.write(`\nFound ${warnCount} warning${warnCount !== 1 ? 's' : ''}. Continue anyway? (y/n): `);

      const timeout = setTimeout(() => {
        ttyStream.destroy();
        fs.closeSync(ttyFd);
        resolve(false);
      }, 30000);

      ttyStream.once('data', (data) => {
        clearTimeout(timeout);
        ttyStream.destroy();
        fs.closeSync(ttyFd);
        const answer = data.toString().trim().toLowerCase();
        resolve(answer === 'y' || answer === 'yes');
      });

      ttyStream.once('end', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export async function runScan(dirPath?: string, cwd: string = process.cwd()): Promise<number> {
  try {
    let filesToScan: FileToScan[] = [];

    if (dirPath) {
      // Directory scan mode
      const fullPath = path.resolve(path.isAbsolute(dirPath) ? dirPath : path.join(cwd, dirPath));
      const basePath = path.resolve(cwd);
      if (!fullPath.startsWith(basePath + path.sep) && fullPath !== basePath) {
        throw new Error('Path escapes intended scope');
      }
      const files = walkDirectory(fullPath);

      for (const file of files) {
        const content = readFileContent(file, fullPath);
        if (content !== null) {
          filesToScan.push({ path: file, content, staged: null });
        }
      }

      const results = scanFiles(filesToScan);
      const output = formatOutput(results, `Scanning ${dirPath}`);
      console.log(output);

      const hasBlocks = results.some(r => r.severity === 'BLOCK');
      if (hasBlocks) return 1;

      const warnCount = results.filter(r => r.severity === 'WARN').length;
      if (warnCount > 0) {
        const proceed = await promptContinue(warnCount);
        return proceed ? 0 : 1;
      }
      return 0;
    } else {
      // Git scan mode
      try {
        const staged = getStagedFiles(cwd);
        const unstaged = getUnstagedFiles(cwd);

        // Read staged files
        for (const file of staged) {
          const content = readFileContent(file, cwd);
          if (content !== null) {
            filesToScan.push({ path: file, content, staged: true });
          }
        }

        // Read unstaged files (only if not already staged)
        for (const file of unstaged) {
          if (!staged.includes(file)) {
            const content = readFileContent(file, cwd);
            if (content !== null) {
              filesToScan.push({ path: file, content, staged: false });
            }
          }
        }

        const results = scanFiles(filesToScan);
        const output = formatOutput(results);
        console.log(output);

        const hasBlocks = results.some(r => r.severity === 'BLOCK');
        if (hasBlocks) return 1;

        const stagedWarnings = results.filter(r => r.staged === true && r.severity === 'WARN');

        if (stagedWarnings.length > 0) {
          const strict = process.env.GHST_STRICT !== 'false';

          if (process.stdin.isTTY) {
            console.error(`\n⚠️  ${stagedWarnings.length} warning${stagedWarnings.length !== 1 ? 's' : ''} in staged files. Proceed anyway?`);
            const proceed = await promptContinue(stagedWarnings.length, true);
            return proceed ? 0 : 1;
          } else if (strict) {
            console.error(`\n❌ Staged files contain warnings. Set GHST_STRICT=false to bypass.`);
            return 1;
          }
        }

        const warnCount = results.filter(r => r.severity === 'WARN').length;
        if (warnCount > 0) {
          const proceed = await promptContinue(warnCount);
          return proceed ? 0 : 1;
        }
        return 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Scan failed: ${message}`);
        return 1;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Scan failed: ${message}`);
    return 1;
  }
}

export const scanCommand = new Command('scan')
  .argument('[path]', 'Optional directory path to scan')
  .description('Scan for leaked secrets and AI context in files')
  .action(async (dirPath?: string) => {
    const exitCode = await runScan(dirPath);
    process.exit(exitCode ?? 1);
  });
