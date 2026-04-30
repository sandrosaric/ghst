import { test } from 'node:test';
import assert from 'node:assert';
import {
  ALL_RULES,
  EnvFileRule,
  AwsCredentialsRule,
  ApiTokenRule,
  CursorRule,
  ClaudeRule,
  CopilotRule,
  AIGeneratedMistakeRule,
  type ScannedFile,
} from './rules.js';

test('EnvFileRule', async t => {
  const rule = new EnvFileRule();

  await t.test('should match .env file', () => {
    const file: ScannedFile = { path: '.env', content: 'SECRET=value' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match .env.local', () => {
    const file: ScannedFile = { path: '.env.local', content: 'SECRET=value' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match .env.production', () => {
    const file: ScannedFile = { path: '.env.production', content: 'SECRET=value' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match .env.example (false positive prevention)', () => {
    const file: ScannedFile = { path: '.env.example', content: 'SECRET=value' };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match .env.sample (false positive prevention)', () => {
    const file: ScannedFile = { path: '.env.sample', content: 'SECRET=value' };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match .envrc.backup', () => {
    const file: ScannedFile = { path: '.envrc.backup', content: 'export VAR=value' };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match regular source files', () => {
    const file: ScannedFile = { path: 'src/index.ts', content: 'import ...' };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('AwsCredentialsRule', async t => {
  const rule = new AwsCredentialsRule();

  await t.test('should match AWS access key ID pattern (AKIA)', () => {
    const file: ScannedFile = {
      path: 'config.js',
      content: 'const accessKey = "AKIAIOSFODNN7EXAMPLE";',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match aws_secret_access_key pattern', () => {
    const file: ScannedFile = {
      path: 'credentials.txt',
      content: 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match clean files', () => {
    const file: ScannedFile = {
      path: 'src/aws-sdk.ts',
      content: 'import { S3Client } from "@aws-sdk/client-s3";',
    };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match random uppercase strings', () => {
    const file: ScannedFile = {
      path: 'README.md',
      content: 'AKIX is not the same as AKIA',
    };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('ApiTokenRule', async t => {
  const rule = new ApiTokenRule();

  await t.test('should match OpenAI API keys (sk- prefix)', () => {
    const file: ScannedFile = {
      path: 'api.js',
      content: 'const apiKey = "sk-proj-1234567890abcdefghijklmn";',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match GitHub Personal Access Token (ghp_ prefix)', () => {
    const file: ScannedFile = {
      path: 'github-config.js',
      content: 'token: "ghp_1234567890abcdefghijklmnopqrstuvwxyz"',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match Slack Bot Token (xoxb- prefix)', () => {
    const file: ScannedFile = {
      path: 'slack.js',
      content: 'botToken = "xoxb-1234567890-1234567890-abcdefghijklmn"',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match GitLab Personal Access Token (glpat- prefix)', () => {
    const file: ScannedFile = {
      path: 'gitlab.js',
      content: 'token = "glpat-1234567890abcdefghij"',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match clean files', () => {
    const file: ScannedFile = {
      path: 'src/api-client.ts',
      content: 'export class ApiClient { constructor(apiKey: string) {} }',
    };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match references to token names', () => {
    const file: ScannedFile = {
      path: 'docs.md',
      content: 'OpenAI API keys start with sk- prefix for security',
    };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('CursorRule', async t => {
  const rule = new CursorRule();

  await t.test('should match .cursor/rules file', () => {
    const file: ScannedFile = { path: '.cursor/rules', content: 'Your instructions' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match nested .cursor/ files', () => {
    const file: ScannedFile = { path: '.cursor/context/guide.md', content: '...' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match .cursor at root', () => {
    const file: ScannedFile = { path: '.cursor/settings.json', content: '{}' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match regular source files', () => {
    const file: ScannedFile = { path: 'src/cursor-utils.ts', content: 'export function ...' };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match files with cursor in middle of path', () => {
    const file: ScannedFile = { path: 'src/my-cursor-library.ts', content: 'export ...' };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('ClaudeRule', async t => {
  const rule = new ClaudeRule();

  await t.test('should match CLAUDE.md', () => {
    const file: ScannedFile = { path: 'CLAUDE.md', content: '# Agent Memory' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match claude.md', () => {
    const file: ScannedFile = { path: 'claude.md', content: '# Claude context' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match .claude.md', () => {
    const file: ScannedFile = { path: '.claude.md', content: '# Agent memory' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match files in .claude/ directory', () => {
    const file: ScannedFile = { path: '.claude/memory.md', content: '...' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match CLAUDE_ prefixed files', () => {
    const file: ScannedFile = { path: 'CLAUDE_MEMORY.txt', content: 'memory data' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match agent-memory files', () => {
    const file: ScannedFile = { path: 'agent-memory.json', content: '{}' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match regular claude usage', () => {
    const file: ScannedFile = { path: 'src/claude-client.ts', content: 'import claude from ...' };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT block claude-utils.js (false positive prevention)', () => {
    const file: ScannedFile = { path: 'src/claude-utils.js', content: 'export function ...' };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('CopilotRule', async t => {
  const rule = new CopilotRule();

  await t.test('should match .github/copilot/ files', () => {
    const file: ScannedFile = { path: '.github/copilot/config.yml', content: 'settings' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should match .copilot/ directory', () => {
    const file: ScannedFile = { path: '.copilot/settings.json', content: '{}' };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT match regular GitHub workflows', () => {
    const file: ScannedFile = {
      path: '.github/workflows/test.yml',
      content: 'name: Test',
    };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match src files with copilot in name', () => {
    const file: ScannedFile = { path: 'src/copilot-helper.ts', content: 'export ...' };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('AIGeneratedMistakeRule', async t => {
  const rule = new AIGeneratedMistakeRule();

  await t.test('should warn on .env.example with secret content', () => {
    const file: ScannedFile = {
      path: '.env.example',
      content: 'API_KEY=sk-1234567890abcdefghijklmn\nDATABASE_PASSWORD=secret123',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should warn on .env.sample with credentials', () => {
    const file: ScannedFile = {
      path: 'config.sample',
      content: 'password = "actual_password_123"',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should warn on .env.template with token', () => {
    const file: ScannedFile = {
      path: '.env.template',
      content: 'token = ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    };
    assert.strictEqual(rule.matches(file), true);
  });

  await t.test('should NOT warn on clean .env.example', () => {
    const file: ScannedFile = {
      path: '.env.example',
      content: 'API_KEY=your-api-key-here\nDATABASE_PASSWORD=your-password-here',
    };
    assert.strictEqual(rule.matches(file), false);
  });

  await t.test('should NOT match regular non-example files with secrets', () => {
    const file: ScannedFile = {
      path: 'README.md',
      content: 'password = "secret123"',
    };
    assert.strictEqual(rule.matches(file), false);
  });
});

test('ALL_RULES export', async t => {
  await t.test('should contain exactly 7 rules', () => {
    assert.strictEqual(ALL_RULES.length, 7);
  });

  await t.test('all rules should have required properties', () => {
    ALL_RULES.forEach(rule => {
      assert.ok(typeof rule.name === 'string' && rule.name.length > 0, 'rule must have name');
      assert.ok(
        rule.severity === 'BLOCK' || rule.severity === 'WARN',
        'rule must have valid severity'
      );
      assert.ok(typeof rule.reason === 'string' && rule.reason.length > 0, 'rule must have reason');
      assert.ok(typeof rule.matches === 'function', 'rule must have matches method');
    });
  });

  await t.test('should have correct rule names', () => {
    const names = ALL_RULES.map(r => r.name);
    assert.deepStrictEqual(names, [
      'detect-env-file',
      'detect-aws-keys',
      'detect-api-tokens',
      'detect-cursor-workspace',
      'detect-claude-memory',
      'detect-copilot-cache',
      'detect-ai-generated-mistakes',
    ]);
  });

  await t.test('should have correct severity levels', () => {
    const severities = ALL_RULES.map(r => r.severity);
    assert.deepStrictEqual(severities, [
      'WARN',
      'WARN',
      'WARN',
      'WARN',
      'WARN',
      'WARN',
      'WARN',
    ]);
  });
});
