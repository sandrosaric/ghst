import { ALL_RULES } from './rules.js';
import type { ScanResult } from './formatter.js';

export interface FileToScan {
  path: string;
  content: string;
  staged: boolean | null;
}

export function scanFiles(files: FileToScan[]): ScanResult[] {
  const results: ScanResult[] = [];

  for (const file of files) {
    for (const rule of ALL_RULES) {
      try {
        if (rule.matches({ path: file.path, content: file.content })) {
          results.push({
            path: file.path,
            severity: rule.severity,
            reason: rule.reason,
            ruleName: rule.name,
            staged: file.staged,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Rule '${rule.name}' failed: ${message}`);
      }
    }
  }

  return results;
}
