export interface ScannedFile {
  path: string;
  content: string;
}

export interface LeakDetectionRule {
  name: string;
  severity: 'BLOCK' | 'WARN';
  reason: string;
  matches(file: ScannedFile): boolean;
}

class EnvFileRule implements LeakDetectionRule {
  name = 'detect-env-file';
  severity = 'WARN' as const;
  reason = 'Environment file with potential secrets';

  matches(file: ScannedFile): boolean {
    try {
      // Match .env or .env.* (e.g., .env.local, .env.production) but NOT .env.example
      const isEnvFile = /\.env(\.[^.]+)?$/.test(file.path);
      const isEnvExample = /\.env\.example$|\.env\.sample$/.test(file.path);
      return isEnvFile && !isEnvExample;
    } catch {
      return false;
    }
  }
}

class AwsCredentialsRule implements LeakDetectionRule {
  name = 'detect-aws-keys';
  severity = 'WARN' as const;
  reason = 'AWS credentials detected';

  private awsAccessKeyPattern = /AKIA[0-9A-Z]{16}/;
  private awsSecretPattern = /aws_secret_access_key\s*=|aws_secret_key\s*=|AKIA[0-9A-Z]{16}/i;
  private fakeKeyIndicators = /FAKE|EXAMPLE|PLACEHOLDER|TEST|SAMPLE|DEMO/i;
  private documentationMarkers = /format|example|placeholder|fake|sample|demo|documentation|do not|should not/i;

  matches(file: ScannedFile): boolean {
    try {
      const hasAccessKey = this.awsAccessKeyPattern.test(file.content);
      const hasSecretPattern = this.awsSecretPattern.test(file.content);

      if (!hasAccessKey && !hasSecretPattern) {
        return false;
      }

      // Check if it's a fake/example key
      if (hasAccessKey) {
        const keyMatch = this.awsAccessKeyPattern.exec(file.content);
        if (keyMatch && this.fakeKeyIndicators.test(keyMatch[0])) {
          return false; // It's clearly a fake example key
        }

        // For markdown files, be extra careful
        if (file.path.endsWith('.md')) {
          if (keyMatch) {
            const context = file.content.substring(Math.max(0, keyMatch.index - 100), Math.min(file.content.length, keyMatch.index + 150));
            if (this.documentationMarkers.test(context)) {
              return false; // It's documentation, not a real credential
            }
          }
        }
      }

      return hasAccessKey || hasSecretPattern;
    } catch {
      return false;
    }
  }
}

class ApiTokenRule implements LeakDetectionRule {
  name = 'detect-api-tokens';
  severity = 'WARN' as const;
  reason = 'API token detected';

  private tokenPatterns = [
    // Payment Processors
    /sk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Stripe API key (live or test)
    /ls_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Lemon Squeezy API key
    /rk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Lemon Squeezy secret key
    /dd_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Dodo Payments key

    // AI/ML Providers
    /sk-[a-zA-Z0-9\-_]{20,50}/,       // OpenAI API key (with dashes/underscores for variants)
    /sk-ant-[a-zA-Z0-9\-_]{20,50}/,   // Anthropic Claude API key
    /AIza[0-9A-Za-z\-_]{32,}/,        // Google API key (Gemini, Firebase, etc.)
    /hf_[a-zA-Z0-9\-_]{30,50}/,       // Hugging Face API key
    /r8_[a-zA-Z0-9\-_]{20,50}/,       // Replicate API token

    // Auth & Identity
    /pk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Clerk publishable key
    /sk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Clerk secret key (generic sk_ pattern)
    /eyJ[A-Za-z0-9_-]{20,}/,          // JWT tokens (Auth0, Firebase, etc.)
    /secret_[a-zA-Z0-9]{20,50}/,      // Notion secrets

    // GitHub & Git
    /ghp_[a-zA-Z0-9]{36,50}/,         // GitHub Personal Access Token
    /ghs_[a-zA-Z0-9]{36,50}/,         // GitHub Server Token
    /ghu_[a-zA-Z0-9]{36,50}/,         // GitHub User Token
    /glpat-[a-zA-Z0-9\-_]{20,50}/,    // GitLab Personal Access Token
    /glsoat-[a-zA-Z0-9\-_]{20,50}/,   // GitLab OAuth Access Token

    // Communication & Messaging
    /xoxb-[0-9a-zA-Z\-_]{30,50}/,     // Slack Bot Token
    /xoxp-[0-9a-zA-Z\-_]{30,50}/,     // Slack User Token
    /xoxe-[0-9a-zA-Z\-_]{30,50}/,     // Slack Enterprise Token
    /xoxs-[0-9a-zA-Z\-_]{30,50}/,     // Slack Workspace Token
    /[a-zA-Z0-9_-]{24}\.[\w-]{6}\.[\w-]{27}/,  // Discord Bot Token (pattern: USER_ID.TIMESTAMP.HMAC)
    /Mzc[0-9A-Za-z_-]{20,}/,          // Discord Bot Token (base64)
    /ODk[0-9A-Za-z_-]{20,}/,          // Discord Bot Token variant

    // Email & SMS Services
    /SG\.[A-Za-z0-9_-]{20,}/,         // SendGrid API key
    /key-[a-zA-Z0-9]{20,50}/,         // Mailgun API key
    /AC[a-zA-Z0-9]{32,}/,             // Twilio Account SID or Auth Token
    /PA[a-zA-Z0-9]{32,}/,             // Twilio Auth Token

    // CRM & Business Tools
    /pat-[a-zA-Z0-9\.\-_]{20,50}/,    // HubSpot Personal Access Token
    /privat-[a-zA-Z0-9\.\-_]{20,50}/, // HubSpot private app key
    /xapp-1-[A-Za-z0-9\-_]{20,50}/,   // Slack app-level token

    // Cloud & Infrastructure Providers
    /DefaultEndpointsProtocol=https.*AccountKey=/,  // Azure Storage Connection String
    /ver_[a-zA-Z0-9]{20,50}/,         // Vercel API token
    /heroku_[a-zA-Z0-9]{20,50}/,      // Heroku API key
    /dop_v[a-zA-Z0-9]{20,50}/,        // DigitalOcean Personal Access Token
    /rly_[a-zA-Z0-9]{20,50}/,         // Railway API token
    /rnd_[a-zA-Z0-9]{20,50}/,         // Render API token
    /pscale_[a-zA-Z0-9]{20,50}/,      // PlanetScale password
    /sbp_[a-zA-Z0-9]{20,50}/,         // Supabase API key
    /NRAPI-[a-zA-Z0-9]{20,50}/,       // New Relic API key
    /elastic_[a-zA-Z0-9]{20,50}/,     // Elastic API key
    /sntrys_[a-zA-Z0-9]{20,50}/,      // Sentry release token
    /sentry-cli[a-zA-Z0-9\.\-_]{10,}/,  // Sentry CLI token
    /post_[a-zA-Z0-9]{20,50}/,        // Rollbar post_server_item token
    /rk_[a-zA-Z0-9]{20,50}/,          // Datadog API key (different from Lemon Squeezy)
    /dd_api_[a-zA-Z0-9]{20,50}/,      // Datadog API variant
    /sdk-[a-zA-Z0-9]{20,50}/,         // LaunchDarkly SDK key
    /[a-zA-Z0-9]{20,}\.apps\.internal/,  // Kubernetes ServiceAccount token pattern
    /kubernetes\.io\/service-account/,   // K8s service account reference
    /bearer\s+[a-zA-Z0-9\.\-_]{20,}/i,   // Generic bearer token

    // Docker & Container Registries
    /dckr_[a-zA-Z0-9]{20,50}/,        // Docker API token
    /ghr_[a-zA-Z0-9]{20,50}/,         // GitHub Container Registry token
    /ghcr\.io\/[a-zA-Z0-9\-_]+:[a-zA-Z0-9]{20,}/,  // GHCR image with token

    // CI/CD Platforms
    /circle_token=[a-zA-Z0-9]{20,50}/,  // CircleCI token
    /travis_token=[a-zA-Z0-9]{20,50}/,  // Travis CI token
    /BUILDKITE_TOKEN=[a-zA-Z0-9]{20,50}/,  // Buildkite token
    /spacelift_[a-zA-Z0-9]{20,50}/,   // Spacelift API token
    /fci_[a-zA-Z0-9]{20,50}/,         // Firebase CI token

    // Analytics & Monitoring
    /segment_write_key_[a-zA-Z0-9]{20,50}/,  // Segment write key
    /mixpanel_token=[a-zA-Z0-9]{20,50}/,     // Mixpanel token
    /amplitude_api_key=[a-zA-Z0-9]{20,50}/,  // Amplitude API key
    /sentry_dsn=https:\/\/[a-zA-Z0-9]{20,}/,  // Sentry DSN

    // Other Providers
    /private_[a-zA-Z0-9]{20,50}/,     // Generic private key
    /api_key_[a-zA-Z0-9]{20,50}/,     // Generic API key pattern
  ];

  matches(file: ScannedFile): boolean {
    try {
      return this.tokenPatterns.some(pattern => pattern.test(file.content));
    } catch {
      return false;
    }
  }
}

class CursorRule implements LeakDetectionRule {
  name = 'detect-cursor-workspace';
  severity = 'WARN' as const;
  reason = 'Cursor workspace context folder detected';

  matches(file: ScannedFile): boolean {
    try {
      return /\/.cursor\/|^\.cursor\//.test(file.path);
    } catch {
      return false;
    }
  }
}

class ClaudeRule implements LeakDetectionRule {
  name = 'detect-claude-memory';
  severity = 'WARN' as const;
  reason = 'Agent memory file with internal architecture details';

  matches(file: ScannedFile): boolean {
    try {
      const isClaude =
        /^CLAUDE\.md$|^claude\.md$|\.claude\.md$|\/\.claude\/|^\.claude\/|^\.claude$/.test(file.path) ||
        /CLAUDE_|agent-memory|claude-context/.test(file.path);
      return isClaude;
    } catch {
      return false;
    }
  }
}

class CopilotRule implements LeakDetectionRule {
  name = 'detect-copilot-cache';
  severity = 'WARN' as const;
  reason = 'Copilot cache or .vscode context folder detected';

  matches(file: ScannedFile): boolean {
    try {
      return /\.github\/copilot\/|^\.copilot\/|\/\.copilot\/|^\.vscode\/copilot|\/\.vscode\/copilot/.test(file.path);
    } catch {
      return false;
    }
  }
}

class AIGeneratedMistakeRule implements LeakDetectionRule {
  name = 'detect-ai-generated-mistakes';
  severity = 'WARN' as const;
  reason = 'AI-generated configuration mistake - potential secrets in example file';

  private highConfidencePatterns = [
    // Payment Processors
    /sk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Stripe API key
    /ls_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Lemon Squeezy API key
    /rk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Lemon Squeezy secret
    /dd_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Dodo Payments

    // AI/ML Providers
    /sk-ant-[a-zA-Z0-9\-_]{20,50}/,   // Anthropic Claude API key
    /AIza[0-9A-Za-z\-_]{35,40}/,      // Google API key
    /hf_[a-zA-Z0-9\-_]{30,50}/,       // Hugging Face

    // Auth & Identity
    /pk_(?:live|test)_[a-zA-Z0-9]{20,50}/,  // Clerk publishable key
    /secret_[a-zA-Z0-9]{20,50}/,      // Notion secrets
    /eyJ[A-Za-z0-9_-]{20,}/,          // JWT tokens

    // GitHub & Git
    /ghp_[a-zA-Z0-9]{36,50}/,         // GitHub Personal Access Token
    /ghs_[a-zA-Z0-9]{36,50}/,         // GitHub Server token
    /glpat-[a-zA-Z0-9\-_]{20,50}/,    // GitLab token

    // Communication
    /xoxb-[0-9a-zA-Z\-_]{30,50}/,     // Slack bot token
    /xoxp-[0-9a-zA-Z\-_]{30,50}/,     // Slack user token
    /Mzc[0-9A-Za-z_-]{50,}/,          // Discord bot token

    // Email & SMS
    /SG\.[A-Za-z0-9_-]{20,}/,         // SendGrid
    /key-[a-zA-Z0-9]{20,50}/,         // Mailgun
    /AC[a-zA-Z0-9]{32,}/,             // Twilio

    // Cloud & Infrastructure
    /ver_[a-zA-Z0-9]{20,50}/,         // Vercel API token
    /heroku_[a-zA-Z0-9]{20,50}/,      // Heroku API key
    /dop_v[a-zA-Z0-9]{20,50}/,        // DigitalOcean token
    /rly_[a-zA-Z0-9]{20,50}/,         // Railway token
    /pscale_[a-zA-Z0-9]{20,50}/,      // PlanetScale password
    /sbp_[a-zA-Z0-9]{20,50}/,         // Supabase API key
    /NRAPI-[a-zA-Z0-9]{20,50}/,       // New Relic API key
    /sntrys_[a-zA-Z0-9]{20,50}/,      // Sentry token
    /post_[a-zA-Z0-9]{20,50}/,        // Rollbar token

    // CI/CD
    /circle_token=[a-zA-Z0-9]{20,50}/,  // CircleCI
    /spacelift_[a-zA-Z0-9]{20,50}/,   // Spacelift token

    // Other
    /AKIA[0-9A-Z]{16}/,               // AWS access key
    /aws_secret_access_key\s*=\s*[A-Za-z0-9/+]{40}/,
    /pat-[a-zA-Z0-9\.\-_]{20,50}/,    // HubSpot PAT
  ];

  private isLikelyRealSecret(value: string): boolean {
    // Filter out placeholder text like "your-password-here", "my-secret-here"
    const placeholderPatterns = [
      /^your[-_]/i,
      /^my[-_]/i,
      /^the[-_]/i,
      /^example[-_]/i,
      /^placeholder[-_]/i,
      /^test[-_]/i,
      /^sample[-_]/i,
      /^dummy[-_]/i,
      /^fake[-_]/i,
    ];

    const cleanValue = value.replace(/^["']|["']$/g, '').trim();

    // If it matches a placeholder pattern, it's not a real secret
    if (placeholderPatterns.some(p => p.test(cleanValue))) {
      return false;
    }

    // If it has numbers or special chars (indicating randomness), it's likely real
    if (/[0-9!@#$%^&*]/.test(cleanValue)) {
      return true;
    }

    // Mixed case with length > 12 suggests real secret
    if (cleanValue.length > 12 && /[A-Z]/.test(cleanValue) && /[a-z]/.test(cleanValue)) {
      return true;
    }

    return false;
  }

  matches(file: ScannedFile): boolean {
    try {
      const isExampleFile = /\.example\.|\.sample\.|\.template\.|\.example$|\.sample$|\.template$|example-/.test(file.path);
      if (!isExampleFile) return false;

      // Check high-confidence patterns first
      if (this.highConfidencePatterns.some(pattern => pattern.test(file.content))) {
        return true;
      }

      // Check for password/secret patterns with realistic values
      const passwordMatch = /password\s*=\s*["']?([^"\'\s]+)/i.exec(file.content);
      if (passwordMatch && this.isLikelyRealSecret(passwordMatch[1])) {
        return true;
      }

      const secretMatch = /secret\s*=\s*["']?([^"\'\s]+)/i.exec(file.content);
      if (secretMatch && this.isLikelyRealSecret(secretMatch[1])) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}

export const ALL_RULES: LeakDetectionRule[] = [
  new EnvFileRule(),
  new AwsCredentialsRule(),
  new ApiTokenRule(),
  new CursorRule(),
  new ClaudeRule(),
  new CopilotRule(),
  new AIGeneratedMistakeRule(),
];

export {
  EnvFileRule,
  AwsCredentialsRule,
  ApiTokenRule,
  CursorRule,
  ClaudeRule,
  CopilotRule,
  AIGeneratedMistakeRule,
};
