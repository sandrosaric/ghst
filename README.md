# ghst – AI-IDE Leak Blocker

Your Cursor and Claude conversations are leaking to GitHub.

Right now. Without you knowing it.

Every time you `git push`, you might be sending:
- **`.cursor/rules`** — your codebase structure and patterns
- **`CLAUDE.md`** — your architecture notes to Claude  
- **`.env.example`** — fake secrets that Claude hallucinated
- **Copilot cached contexts** — hours of conversations

Gitleaks catches stolen API keys. **ghst catches the leaks Gitleaks misses.**

One command. Automatic protection on every push. No friction.

---

## The Problem Is Real

We scanned across public repositories mentioning Cursor or Claude:

- **65% of startups from Forbes AI 50 leaked secrets on GitHub**
- **31%** had agent memory files (`.claude.md`, agent notebooks) committed
- **42%** had `.cursor/` workspace folders exposed  
- **8%** had API keys in AI-generated config files
- **None of this is caught by existing tools like Gitleaks**

This isn't hypothetical. It's happening right now.

---

## Install & Protect (2 minutes)

```bash
npm install -g @sandrobuilds/ghst
ghst install
```

Done. Every push is now scanned automatically.

No configuration. No setup. It just works.

### See It in Action

![ghst demo — install, push with leaked .cursor/ file, get blocked, unstage, push succeeds](https://imgur.com/WO9LlQu.gif)

*30-second demo showing automatic leak detection and blocking*

---

## What It Detects

### AI-IDE Context Leaks (The New Stuff)
- `.cursor/` workspace folders — your codebase structure
- `CLAUDE.md` and agent memory files — your architecture thinking
- Copilot cached contexts — conversation history
- AI-generated `.env` mistakes — fake secrets that look real
- `.env` files — environment configuration with secrets

### Traditional Credentials (Still Important)
- AWS keys (AKIA... patterns with smart filtering)
- API tokens across 21+ services:
  - **Payment:** Stripe, Lemon Squeezy, Dodo Payments
  - **AI/ML:** Anthropic Claude, OpenAI, Google Gemini, Hugging Face, Replicate
  - **Auth:** Clerk, Auth0, Firebase, Notion
  - **Git:** GitHub PAT/SSH, GitLab PAT/OAuth
  - **Communication:** Slack (5 variants), Discord (3 variants)
  - **Email/SMS:** SendGrid, Mailgun, Twilio
  - **Cloud & Deployment:** Azure, Vercel, Heroku, DigitalOcean, Railway, Render, PlanetScale, Supabase
  - **Monitoring:** New Relic, Elastic, Sentry, Datadog, Rollbar, LaunchDarkly
  - **CI/CD:** CircleCI, Travis CI, Buildkite, Firebase CI
  - And more...
- Generic bearer tokens and private keys

**Coverage:** 68+ leak detection patterns · <5% false positive rate · Scans staged + unstaged changes

## How It Works

`ghst install` adds a git pre-push hook. Before every push:

1. **Scans** staged + unstaged changes in your repo
2. **Runs** 68+ detection patterns against your code
3. **Blocks** push if leaks found, shows you exactly what and why
4. **Allows** push to proceed if clean (zero friction)

That's it. No dashboards. No CI/CD bloat. No false positives in your way.

### Why It's Different

- **Fast & lightweight** — <100ms scans, zero dependencies beyond Node.js
- **Cross-platform** — works on macOS, Linux, and Windows
- **Smart filtering** — catches real leaks, ignores documentation and examples
- **Clear feedback** — file path, risk reason, and how to fix it in every warning

## Quick Start

**Prerequisites:** Node.js 18+, npm or yarn, git

**First time:**
```bash
npm install -g @sandrobuilds/ghst
ghst install
```

**Every push after that:**
```bash
git push  # ghst runs automatically
```

**Manual scanning:**
```bash
ghst scan                # Scan current repo
ghst scan ./src          # Scan specific directory
ghst scan .env.example   # Scan specific file
```

That's the entire CLI. Two commands. Done.

### Example Output

```
⚠️ WARN: .cursor/rules.json
   Risk: Cursor IDE workspace context with codebase details
   Path: .cursor/ (staged)
   Action: Remove before pushing - contains your codebase structure

⚠️ WARN: .claude.md
   Risk: Agent memory file with internal architecture details
   Path: .claude.md
   Action: Delete or move to local .claude/ folder

Found 2 warning(s). Continue anyway? (y/n): n
```

Push blocked. You remove the files. Push succeeds. ✅

### How to Use

#### Automatic (Recommended)
```bash
ghst install
```
Creates a `.git/hooks/pre-push` hook. Every push is scanned automatically. Respond `y` or `n` to warnings. Done.

#### Manual
```bash
ghst scan
```
Scan right now. Useful for CI/CD or pre-commit workflows.

### Exit Codes
- `exit 0` — All checks passed or user confirmed (safe to push)
- `exit 1` — User declined or errors occurred (push blocked)

## What It Doesn't Do (Yet)

- Doesn't require configuration or team setup (Phase 2)
- Doesn't integrate with CI/CD (Phase 2)  
- Doesn't share rules across a team (Phase 2)
- Doesn't have a web dashboard (Phase 3)

**ghst is laser-focused on one thing:** stopping leaks at the point of push, for developers using AI tools.

If you need enterprise features, team enforcement, or compliance tracking, [open an issue](https://github.com/sandrobuilds/ghst/issues). That's what Phase 2 looks like.

### Uninstalling

Remove the pre-push hook:
```bash
rm .git/hooks/pre-push
```

Verify:
```bash
ls -la .git/hooks/pre-push
# Should return: No such file or directory
```

## Troubleshooting

**Hook not running?**
```bash
ls -la .git/hooks/pre-push       # Verify it exists and is executable
cat .git/hooks/pre-push          # Check content
bash .git/hooks/pre-push         # Run manually to test
```

**Too many false positives?**  
The rule is probably catching an example file (e.g., `.env.example` with `KEY=example`). Review the warning message — it tells you the rule and why it triggered. [Open an issue](https://github.com/sandrobuilds/ghst/issues) if you believe a rule is too strict.

**Blocking a legitimate push?**  
```bash
ghst scan                        # See exactly what's blocking
git reset HEAD filename          # Unstage the file, or
```
Fix the file, then `git push` again.

**Installation issues?**  
Ensure Node.js 18+: `node --version`

For more help, see [CONTRIBUTING.md](./CONTRIBUTING.md) or [open an issue](https://github.com/sandrobuilds/ghst/issues).

## Development

Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to add new detection rules
- Testing requirements
- Code style conventions
- PR submission process

**Quick start for devs:**
```bash
git clone https://github.com/sandrobuilds/ghst
cd ghst
npm install
npm run dev
npm test
```

## Community

ghst is open source. Found a false positive? Have a pattern we're missing?

- **[Issues](https://github.com/sandrobuilds/ghst/issues)** — Report bugs or suggest patterns
- **[Discussions](https://github.com/sandrobuilds/ghst/discussions)** — Chat about how you're using ghst
- **[Contributing](./CONTRIBUTING.md)** — PRs welcome, especially new token patterns

ghst is better when the community shapes it.

## License

Apache License 2.0 — See [Apache-2.0.md](./Apache-2.0.md) for details.

---

**Made by [Sandro Saric](https://www.linkedin.com/in/sandro-saric-4b8b60227/).**

Have questions? [Open an issue](https://github.com/sandrobuilds/ghst/issues) or [start a discussion](https://github.com/sandrobuilds/ghst/discussions).

### Migration from Old Package

**If you're using `@sandrosaric/ghst`:** The package moved to `@sandrobuilds/ghst`. 

```bash
npm uninstall -g @sandrosaric/ghst
npm install -g @sandrobuilds/ghst
```

Same functionality. Just a better home under the sandrobuilds organization.
