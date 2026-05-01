# ghst

**AI-aware pre-push leak blocker for developers using Claude, Cursor, and Copilot.**

ghst detects sensitive leaks before they reach GitHub—not just traditional credentials (AWS keys, API tokens), but also AI IDE footprints that existing security tools miss (.cursor/ workspace folders, CLAUDE.md agent memories, Copilot cached contexts, AI-generated config mistakes). Install once with `ghst install`, and get automatic pre-push protection on every commit.

## Features

- ✅ **68+ leak detection patterns** across 40+ providers (payment, AI/ML, auth, cloud deployment, CI/CD, monitoring, and more)
- ✅ **AI-IDE awareness** — detects .cursor/, CLAUDE.md, Copilot patterns, and AI-generated mistakes that other tools miss
- ✅ **Pre-push automation** — one command install, then silent protection on every push
- ✅ **Clear, actionable feedback** — when leaks are detected, you get the file path, risk reason, and how to fix it
- ✅ **Fast & lightweight** — <100ms scans, zero dependencies beyond Node.js
- ✅ **Cross-platform** — works on macOS, Linux, and Windows

## Quick Start

### Prerequisites

- **Node.js 18+** (required for runtime)
- **npm or yarn** (for installation)
- **git** (for pre-push hook integration)

### Installation

Install ghst globally to your system:

```bash
npm install -g ghst
```

Or install locally in a project:

```bash
npm install ghst
```

### Verify Installation

Check that ghst is installed correctly:

```bash
ghst --version
ghst --help
```

## Usage

### Manual Scanning

Scan the current directory for leaks:

```bash
ghst scan
```

Scan a specific directory or file:

```bash
ghst scan ./src
ghst scan .env.example
```

**Output Example:**

```
Scanning staged & unstaged changes...

⚠️ WARN: .env
   Risk: Environment file with potential secrets
   Path: .env
   Action: Delete or unstage this file before pushing

⚠️ WARN: .claude.md
   Risk: Agent memory file with internal architecture details
   Path: .claude.md
   Action: Delete or unstage this file before pushing

⚠️ WARN: .env.example
   Risk: AI-generated configuration mistake - potential secrets in example file
   Path: .env.example (staged)
   Action: Verify contents and use placeholder values instead

Found 3 warning(s). Continue anyway? (y/n): 
```

**Exit Codes:**
- `exit 0` — All checks passed or user confirmed warnings (safe to push)
- `exit 1` — User declined warnings or errors occurred (push blocked)

### Automatic Pre-Push Protection

Set up automatic scanning on every push attempt:

```bash
ghst install
```

This creates a `.git/hooks/pre-push` hook that runs `ghst scan` automatically before each push. When WARNings are detected and you're in an interactive terminal, you'll be prompted to confirm whether to proceed.

**Interactive Prompt Example:**

```
Found 1 warning. Continue anyway? (y/n): y
```

Respond with:
- `y` or `yes` → Push proceeds (exit 0)
- `n`, `no`, or any other input → Push blocked (exit 1)

**In Non-Interactive Mode** (CI/CD, piped input, background processes):
- WARNings automatically proceed with an informational message

## Supported Leak Types

### AI-IDE Specific

- **`.env` files** — Environment configuration with potential secrets
- **`.cursor/` folders** — Cursor IDE workspace context and settings
- **`CLAUDE.md`** — Claude agent memory and conversation history
- **Copilot cached patterns** — Microsoft Copilot context cache files
- **AI-generated mistakes** — Configuration files with hallucinated secrets

### Traditional Credentials

- **AWS keys** — AKIA... patterns with smart false-positive filtering
- **API tokens** — 68+ patterns across 40+ providers including:
  - **Payment:** Stripe, Lemon Squeezy, Dodo Payments
  - **AI/ML:** Anthropic Claude, OpenAI, Google Gemini, Hugging Face, Replicate
  - **Auth:** Clerk, Auth0, Firebase JWT, Notion
  - **Git:** GitHub PAT/SSH, GitLab PAT/OAuth
  - **Communication:** Slack (5 variants), Discord (3 variants)
  - **Email/SMS:** SendGrid, Mailgun, Twilio (2 variants)
  - **Cloud & Deployment:** Azure, Vercel, Heroku, DigitalOcean, Railway, Render, PlanetScale, Supabase, Kubernetes
  - **Monitoring:** New Relic, Elastic, Sentry, Datadog, Rollbar, LaunchDarkly
  - **CI/CD:** CircleCI, Travis CI, Buildkite, Spacelift, Firebase CI
  - **Container:** Docker Registry, GitHub Container Registry
  - **Analytics:** Segment, Mixpanel, Amplitude
- **Generic patterns** — Bearer tokens, private keys, generic API keys

## Architecture

ghst is built with TypeScript and Commander.js for maximum clarity and reliability. Here's how it works:

### Project Structure

```
ghst/
├── src/
│   ├── index.ts                    # CLI entry point with command routing
│   ├── commands/
│   │   ├── scan.ts                 # 'ghst scan' command
│   │   └── install.ts              # 'ghst install' command
│   └── lib/
│       ├── rules.ts                # Leak detection patterns (68+ rules)
│       ├── scanner.ts              # File scanning orchestration
│       ├── formatter.ts            # Output formatting
│       └── git.ts                  # Git integration
├── dist/                           # Compiled JavaScript (built output)
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

### Rule Engine Architecture

All leak detection rules implement a common interface:

```typescript
interface LeakDetectionRule {
  name: string;                     // Unique rule identifier
  severity: 'BLOCK' | 'WARN';       // Impact level
  reason: string;                   // Human-readable explanation
  matches(file: File): boolean;     // Detection logic
}
```

**Example: Detecting .env files**

```typescript
class EnvFileRule implements LeakDetectionRule {
  name = 'detect-env-file';
  severity = 'WARN';
  reason = 'Environment file with potential secrets';
  
  matches(file: File): boolean {
    return /\.env$/.test(file.name);
  }
}
```

### How Scanning Works

1. **File Detection** — Identify files in git staging area or specified directory
2. **Rule Matching** — Apply all 68+ detection rules to each file
3. **Severity Classification** — Mark results as BLOCK or WARN (with PASS shown when no rules match)
4. **Output Formatting** — Display human-readable messages with file path and fix suggestions
5. **Exit Code** — Return 0 (safe) or 1 (blocked) for git hook integration

### Adding New Detection Rules

To contribute a new detection rule:

1. Open `src/lib/rules.ts`
2. Create a new rule class implementing `LeakDetectionRule`
3. Add it to the rules array exported at the end of the file
4. Write tests in `src/lib/rules.test.ts`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## Configuration

### Customizing Rule Severity

To customize which rules trigger warnings (Phase 2 feature):

ghst currently uses fixed rule severity from the rule engine. Custom rule configuration is planned for Phase 2. For now, all leak detection rules use WARN severity, which prompts users for confirmation in interactive mode.

### Uninstalling the Pre-Push Hook

To remove automatic pre-push protection:

```bash
rm .git/hooks/pre-push
```

Verify it's removed:

```bash
ls -la .git/hooks/pre-push
# Should return: No such file or directory
```

## Troubleshooting

### "Pre-push hook not running"

**Symptom:** You ran `ghst install`, but `git push` doesn't seem to be running the scan.

**Solution:**
1. Verify the hook file exists and is executable:
   ```bash
   ls -la .git/hooks/pre-push
   # Should show: -rwxr-xr-x (executable)
   ```
2. Check the hook content:
   ```bash
   cat .git/hooks/pre-push
   # Should show: #!/bin/bash followed by ghst scan
   ```
3. Run the hook manually:
   ```bash
   bash .git/hooks/pre-push
   # Should run ghst scan immediately
   ```
4. Ensure ghst is installed globally or available in your PATH:
   ```bash
   ghst --version
   ```

### "Too many false positives"

**Symptom:** ghst is blocking legitimate files or throwing WARN for files you know are safe.

**Possible Causes:**
- Example files with placeholder secrets (e.g., `.env.example` with `KEY=placeholder`)
- Documentation with code samples containing test credentials
- Configuration files with intentionally visible patterns for teaching/examples

**Solutions:**
1. Verify the file is actually safe:
   ```bash
   ghst scan .env.example
   # Review the output to confirm it's not a real secret
   ```
2. Understand which rule triggered the warning:
   - The output shows the risk reason (e.g., "AI-generated configuration mistake")
   - Check `src/lib/rules.ts` to understand the pattern matching
3. Contact the community or open an issue if you believe a rule is too strict

### "Build fails"

**Symptom:** `npm run build` or npm installation fails.

**Solutions:**
1. Ensure you're using Node.js 18+:
   ```bash
   node --version
   # Should show: v18.0.0 or higher
   ```
2. Use a clean install to clear corrupted dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm ci
   npm run build
   ```
3. Check for TypeScript compilation errors:
   ```bash
   npx tsc --noEmit
   # Shows any type errors
   ```

### "Hook blocks legitimate push"

**Symptom:** ghst is blocking a push you believe should succeed.

**Diagnosis:**
1. Run the scan manually to see exactly what's blocking:
   ```bash
   ghst scan
   # Shows the problematic files with severity and reason
   ```
2. Review the specific files mentioned
3. Either:
   - **Fix the file** (remove the secret or move to `.env.example`)
   - **Unstage the file** (don't commit it):
     ```bash
     git reset HEAD filename
     ```
   - **Review the rule** (if you believe the rule is incorrect)

4. Retry the push after fixing:
   ```bash
   ghst scan
   # Should now show PASS or only WARNings
   git push
   ```

## Development

### Local Development

Clone and set up for development:

```bash
git clone https://github.com/your-org/ghst
cd ghst
npm install
npm run dev
```

### Running Tests

Run the full test suite:

```bash
npm test
```

Tests cover:
- ✅ All 68+ leak detection rules
- ✅ False positive filtering (documentation, examples, test files)
- ✅ Output formatting
- ✅ Git integration
- ✅ Exit codes and error handling

### Building for Distribution

Build the compiled JavaScript:

```bash
npm run build
```

This creates `dist/index.js` with the executable shebang. The built file is what gets published to npm.

### Manual Testing

Test the tool end-to-end:

```bash
# Create a test file with a fake secret
echo "OPENAI_API_KEY=sk-test123456789" > test.js
git add test.js

# Run scan - should detect the issue
ghst scan

# Expected output: ⚠️ WARN: test.js (with prompt to confirm)

# Clean up
git reset HEAD test.js
rm test.js
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to add new detection rules
- Testing requirements and standards
- Code style conventions
- PR submission process

## License

MIT License — see LICENSE file for details.

## Support

- **Issues & Bug Reports** — [GitHub Issues](https://github.com/your-org/ghst/issues)
- **Feature Requests** — Open an issue with the `feature-request` label
- **Security Vulnerabilities** — Please report privately (don't open a public issue)

## Contact

Connect with me on social media:
- **LinkedIn** — [Sandro Saric](https://www.linkedin.com/in/sandro-saric-4b8b60227/)
- **Twitter/X** — [@IAmSandroSaric](https://x.com/IAmSandroSaric)

---

**Questions or feedback?** Open an issue or start a discussion on GitHub. We're here to help make ghst better for the community.
