export interface ScanResult {
  path: string;
  severity: 'BLOCK' | 'WARN';
  reason: string;
  ruleName: string;
  staged: boolean | null;
}

const ACTIONS: Record<string, string> = {
  'detect-env-file': 'Delete or unstage this file before pushing',
  'detect-aws-keys': 'Remove credentials and rotate the key immediately',
  'detect-api-tokens': 'Remove the token and rotate it immediately as it may be compromised',
  'detect-cursor-workspace': 'Add .cursor/ to .gitignore',
  'detect-claude-memory': 'Delete or unstage this file and add to .gitignore',
  'detect-copilot-cache': 'Add .github/copilot/ to .gitignore',
  'detect-ai-generated-mistakes': 'Replace any real secrets with placeholder values',
};

function getAction(ruleName: string): string {
  return ACTIONS[ruleName] || 'Fix this issue before pushing';
}

function formatStatus(staged: boolean | null): string {
  if (staged === null) return '';
  return staged ? ' (staged)' : ' (unstaged)';
}

function getSeverityIcon(severity: 'BLOCK' | 'WARN'): string {
  return severity === 'BLOCK' ? '❌ BLOCK' : '⚠️ WARN';
}

export function formatOutput(results: ScanResult[], context: string = 'Scanning staged & unstaged changes'): string {
  if (results.length === 0) {
    return `${context}...\n✅ PASS: All files are clean`;
  }

  const lines: string[] = [context + '...', ''];

  for (const result of results) {
    const icon = getSeverityIcon(result.severity);
    const status = formatStatus(result.staged);
    const action = getAction(result.ruleName);

    lines.push(`${icon}: ${result.path}${status}`);
    lines.push(`   Risk: ${result.reason}`);
    lines.push(`   Action: ${action}`);
    lines.push('');
  }

  const blockCount = results.filter(r => r.severity === 'BLOCK').length;
  const warnCount = results.filter(r => r.severity === 'WARN').length;

  if (blockCount > 0) {
    lines.push(`Push blocked: ${blockCount} BLOCK${blockCount === 1 ? '' : 's'}${warnCount > 0 ? `, ${warnCount} WARN${warnCount === 1 ? '' : 's'}` : ''} detected. Fix the above and try again.`);
  } else if (warnCount > 0) {
    lines.push(`⚠️ ${warnCount} warning${warnCount === 1 ? '' : 's'} detected. You will be asked to confirm.`);
  }

  return lines.join('\n').trim();
}
