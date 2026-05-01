# Contributing to ghst

Thank you for your interest in contributing to ghst! This guide will help you get started with adding new detection rules, improving existing functionality, and sharing your changes with the community.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- git
- Basic familiarity with TypeScript

### Setting Up Your Environment

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ghst
   cd ghst
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building and Testing

**Build the project:**
```bash
npm run build
```

**Run tests:**
```bash
npm test
```

**Run in development mode (with hot reload):**
```bash
npm run dev scan
npm run dev install
```

### Code Structure

- **`src/commands/`** — CLI command implementations
  - `scan.ts` — Manual scan command logic
  - `install.ts` — Pre-push hook installation logic
- **`src/lib/`** — Core library code
  - `rules.ts` — All leak detection rules
  - `scanner.ts` — File scanning orchestration
  - `formatter.ts` — Output formatting
  - `git.ts` — Git integration

## Adding New Detection Rules

### Understanding the Rule Interface

All detection rules implement the `LeakDetectionRule` interface:

```typescript
interface LeakDetectionRule {
  name: string;                      // Unique rule identifier (e.g., 'detect-stripe-key')
  severity: 'BLOCK' | 'WARN';        // Impact level
  reason: string;                    // Human-readable explanation
  matches(file: File): boolean;      // Detection logic returns true if leak detected
}
```

**Severity Levels:**
- `BLOCK` — Critical leak that must be fixed (blocks push immediately) — *Reserved for future high-criticality rules*
- `WARN` — Warning to review (prompts user for confirmation in interactive mode) — *Currently used by all leak detection rules*

### Step-by-Step Guide: Adding a Rule

Let's add a detection rule for a fictional service called "MyCRM".

#### Step 1: Create the Rule Class

Open `src/lib/rules.ts` and add your rule class:

```typescript
class MyCrmApiKeyRule implements LeakDetectionRule {
  name = 'detect-mycrm-api-key';
  severity = 'WARN';
  reason = 'MyCRM API key detected';
  
  matches(file: File): boolean {
    // Detect MyCRM API key pattern: mycrm_sk_live_[a-zA-Z0-9]{32}
    const pattern = /mycrm_sk_(?:live|test)_[a-zA-Z0-9]{32}/;
    return pattern.test(file.content);
  }
}
```

#### Step 2: Add to Rules Array

At the end of `src/lib/rules.ts`, add your rule to the exported rules array:

```typescript
export const rules: LeakDetectionRule[] = [
  new EnvFileRule(),
  new AwsCredentialsRule(),
  new MyCrmApiKeyRule(),  // Add here
  // ... other rules
];
```

#### Step 3: Write Tests

Open `src/lib/rules.test.ts` and add tests for your rule:

```typescript
import { describe, it, expect } from 'node:test';
import { MyCrmApiKeyRule } from './rules.js';

describe('MyCrmApiKeyRule', () => {
  const rule = new MyCrmApiKeyRule();
  
  it('should detect MyCRM live API keys', () => {
    const file = {
      path: 'config.js',
      content: 'const apiKey = "mycrm_sk_live_abcd1234efgh5678ijkl9012mnop3456";'
    };
    expect(rule.matches(file)).toBe(true);
  });
  
  it('should detect MyCRM test API keys', () => {
    const file = {
      path: 'config.js',
      content: 'const apiKey = "mycrm_sk_test_abcd1234efgh5678ijkl9012mnop3456";'
    };
    expect(rule.matches(file)).toBe(true);
  });
  
  it('should not flag legitimate code without MyCRM keys', () => {
    const file = {
      path: 'readme.md',
      content: 'This is documentation about MyCRM API but no actual keys here.'
    };
    expect(rule.matches(file)).toBe(false);
  });
});
```

#### Step 4: Test Your Rule

Run the test suite to verify your rule works:

```bash
npm test
```

All tests should pass. Specifically check:
- ✅ Detects real-looking keys
- ✅ Distinguishes between live and test keys (if applicable)
- ✅ Doesn't flag legitimate text mentioning the service

#### Step 5: Verify Performance

Ensure your regex patterns are efficient:

```bash
npm run dev scan .
# Check that scan completes in <100ms
```

### Best Practices for Detection Rules

#### Pattern Correctness

- **Use specific patterns** — Don't catch common words (e.g., avoid just matching "secret")
- **Test with real examples** — Use actual token formats from the service
- **Include variants** — Many services have multiple token prefixes (test_, live_, dev_, etc.)
- **Escape special characters** — Use `\.` for dots, `\-` for dashes, etc.

#### False Positive Prevention

- **Avoid overly broad patterns** — A rule matching 1000 files is unusable
- **Consider context** — Don't flag API keys in documentation files (readme, examples, etc.)
- **Check file type** — Different rules for different file types (`.env` vs `.js` vs `.md`)

**Example: Smart AWS Credential Detection**

```typescript
class AwsCredentialsRule implements LeakDetectionRule {
  name = 'detect-aws-credentials';
  severity = 'BLOCK';
  reason = 'AWS credentials detected';
  
  matches(file: File): boolean {
    // Only apply to code/config files, not documentation
    const docExts = ['.md', '.txt', '.rst', '.adoc'];
    if (docExts.some(ext => file.name.endsWith(ext))) {
      return false; // Skip documentation
    }
    
    // AWS access key pattern: AKIA + 16 alphanumeric characters
    const pattern = /AKIA[0-9A-Z]{16}/;
    return pattern.test(file.content);
  }
}
```

#### Testing Standards

- Aim for **<5% false positive rate** across community feedback
- Include tests for:
  - ✅ Real credentials
  - ✅ Test/example credentials (if different format)
  - ✅ Legitimate files that should NOT trigger the rule
  - ✅ Edge cases (incomplete patterns, partial matches)

### Rule Naming Convention

Use descriptive rule names following this pattern:

```
detect-[service-or-type]-[credential-type]
```

**Examples:**
- `detect-github-pat` (GitHub Personal Access Token)
- `detect-stripe-secret-key`
- `detect-env-file` (for `.env` files)
- `detect-cursor-workspace` (for `.cursor/` folders)
- `detect-openai-api-key`

## Testing Requirements

### Unit Tests

All code changes should include unit tests:

```bash
npm test
```

**Test file locations:**
- Rule tests: `src/lib/rules.test.ts`
- Scanner tests: `src/lib/scanner.test.ts`
- Formatter tests: `src/lib/formatter.test.ts`
- Command tests: `src/commands/scan.test.ts`, `src/commands/install.test.ts`

### Test Format

Use Node.js built-in `test` module:

```typescript
import { describe, it, expect } from 'node:test';
import { MyNewRule } from './rules.js';

describe('MyNewRule', () => {
  const rule = new MyNewRule();
  
  it('should detect the target pattern', () => {
    const file = { name: 'test.js', content: 'secret_pattern_123' };
    expect(rule.matches(file)).toBe(true);
  });
});
```

### Coverage Goals

- All rules tested for both positive and negative cases
- <5% false positive rate validated
- Edge cases covered (empty files, special characters, etc.)

## Code Style

### TypeScript Guidelines

- **Use explicit types** — Avoid `any` type
- **Use interfaces** — Define shape of objects
- **Prefer const** — Over let/var
- **Use meaningful names** — Classes, variables, and functions should be clear

**Example:**

```typescript
// ✅ Good
interface DetectionResult {
  matched: boolean;
  reason: string;
  severity: 'BLOCK' | 'WARN';
}

class ApiKeyRule implements LeakDetectionRule {
  readonly name = 'detect-api-key';
  readonly severity: 'BLOCK' = 'BLOCK';
  
  matches(file: File): boolean {
    // Clear logic
  }
}

// ❌ Avoid
class rule1 {
  matches(f: any): any {
    // vague naming and types
  }
}
```

### Formatting

- **Use 2-space indentation** (enforced by project)
- **Keep lines under 100 characters** when practical
- **Use camelCase** for variables and functions
- **Use PascalCase** for classes and interfaces

### Comments

Write comments for the "why", not the "what":

```typescript
// ✅ Good - explains why we need this
// Exclude documentation files because they often contain example credentials
const docExts = ['.md', '.txt'];

// ❌ Avoid - just repeats the code
// Check if file extension is .md or .txt
const docExts = ['.md', '.txt'];
```

## Commit Conventions

Follow conventional commit messages:

```
type(scope): subject

body (optional)
```

**Types:**
- `feat:` — New feature (e.g., new detection rule)
- `fix:` — Bug fix
- `test:` — Test additions or changes
- `docs:` — Documentation changes
- `refactor:` — Code changes without feature/fix
- `perf:` — Performance improvements

**Examples:**

```
feat(rules): add Stripe API key detection
docs: update README with new rule examples
fix(scanner): handle files with special characters correctly
test(rules): add comprehensive test cases for AWS detection
```

## PR Submission Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   npm test
   ```
2. **Build successfully:**
   ```bash
   npm run build
   ```
3. **Update documentation** if your change affects usage
4. **Rebase on latest main:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

### Creating a Pull Request

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a PR on GitHub** with:
   - **Clear title** — What does this change do?
   - **Description** — Why this change? What problem does it solve?
   - **Tests** — Reference which tests validate the change
   - **Examples** — Show before/after output if applicable

**Example PR Description:**

```markdown
## Summary
Add detection for MyCRM API keys to prevent accidental leaks of integration credentials.

## Changes
- New rule: `MyCrmApiKeyRule` detects `mycrm_sk_*` pattern
- Comprehensive tests with live/test key variants
- Prevents false positives in documentation files

## Testing
- ✅ All 30+ test cases passing
- ✅ Verified <5% false positive rate
- ✅ Manual testing with real MyCRM integration

## Related
Closes #123 (if there's an issue)
```

### PR Review Process

Your PR will be reviewed by maintainers for:
- ✅ Code quality and style consistency
- ✅ Test coverage (aim for >90%)
- ✅ False positive rate (<5%)
- ✅ Documentation completeness
- ✅ Performance impact (<100ms scans)

**Be responsive to feedback** — iterate on comments and questions to get your PR merged.

## Reporting Issues

Found a bug or false positive? Open an issue with:

1. **Clear title** — What's the problem?
2. **Steps to reproduce** — How can we see it?
3. **Expected behavior** — What should happen?
4. **Actual behavior** — What actually happens?
5. **Environment** — OS, Node.js version, ghst version

**Example Issue:**

```markdown
## Title
False positive: ghst blocks legitimate .env.example with placeholder values

## Steps to Reproduce
1. Create `.env.example` with `API_KEY=placeholder`
2. Run `ghst scan`
3. See BLOCK for false placeholder

## Expected
Should not block obviously fake placeholder values

## Actual
Blocks with "Environment file with potential secrets"

## Environment
- OS: macOS 14.2
- Node.js: 18.16.0
- ghst: 1.0.0
```

## Questions?

- **Ask in issues** — Open a discussion or question issue
- **Check existing issues** — Your question might be answered
- **Read the README** — Common usage is documented there

## Code of Conduct

Be respectful and constructive. We're building this together for the community.

---

**Thank you for contributing to ghst!** Your help makes this tool better for everyone.
