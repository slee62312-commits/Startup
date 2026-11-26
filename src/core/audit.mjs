import fs from 'node:fs';
import path from 'node:path';
import { SURFACES } from '../catalog/stacks.mjs';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.dart_tool', 'Pods', 'DerivedData', 'target', '.venv', '.shiplaunchpad']);

const SECRET_PATTERNS = [
  { name: 'Stripe Live Secret Key', regex: /\bsk_live_[0-9a-zA-Z]{16,}/ },
  { name: 'Stripe Restricted Key', regex: /\brk_live_[0-9a-zA-Z]{16,}/ },
  { name: 'Stripe Webhook Secret', regex: /\bwhsec_[0-9a-zA-Z]{16,}/ },
  { name: 'GitHub Personal Token', regex: /\b(ghp|gho|ghu|ghs|github_pat)_[0-9A-Za-z_]{20,}/ },
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'OpenAI API Key', regex: /\bsk-(proj-)?[0-9A-Za-z_-]{24,}/ },
  { name: 'Anthropic API Key', regex: /\bsk-ant-[0-9A-Za-z_-]{24,}/ },
  { name: 'Private Key Material', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'Supabase Service Role Key Assignment', regex: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?eyJ[0-9A-Za-z._-]{20,}/ },
];

function collectRepoFiles(rootDir, maxFiles = 1200) {
  const out = [];
  function walk(dir) {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= maxFiles) break;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out.push({ full, rel: path.relative(rootDir, full), name: e.name });
    }
  }
  walk(rootDir);
  return out;
}

function readSafe(filePath, maxBytes = 200_000) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile() || st.size > maxBytes) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Runs pre-flight security, App Review, Play Store, and launch-trap checks.
 * Strictly obeys Zero-Secret Law: never includes matched secret text in output.
 */
export function runAudit(repoRoot, detection, config = {}) {
  const absRoot = path.resolve(repoRoot);
  const files = collectRepoFiles(absRoot);
  const findings = [];
  const svcIds = new Set((detection.services || []).map((s) => s.id));
  const surfaces = new Set(detection.surfaces || []);

  // 1. Secret leak scan (never inspect .env values, only check whether .env is unignored + scan source files)
  const gitignoreText = readSafe(path.join(absRoot, '.gitignore'));
  const hasDotEnv = files.some((f) => f.name === '.env' || f.name.startsWith('.env.local') || f.name.startsWith('.env.production'));
  if (hasDotEnv && !/^\s*\.env\b/m.test(gitignoreText)) {
    findings.push({
      id: 'env-not-gitignored',
      checkId: 'security-no-secret-leaks',
      severity: 'critical',
      message: '.env file exists in repository and `.env` is missing from .gitignore.',
      fix: 'Add `.env` and `.env.*` (except `.env.example`) to `.gitignore`, rotate any exposed keys, and move secrets to `shiplaunchpad vault set`.',
    });
  }

  const secretMatches = [];
  for (const f of files) {
    if (f.name === '.env' || f.name.startsWith('.env.')) continue; // Zero-Secret Law: do not open .env values
    if (!/\.(js|mjs|cjs|ts|tsx|jsx|json|yml|yaml|toml|py|go|dart|swift|kt|java|rb|php|sh|md|html)$/i.test(f.name)) continue;
    const text = readSafe(f.full);
    if (!text) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/example|placeholder|your[-_]|xxx|<.*>|REDACTED/i.test(line)) continue;
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(line)) {
          secretMatches.push(`${f.rel}:${i + 1} (${pat.name})`);
          break;
        }
      }
    }
  }
  if (secretMatches.length > 0) {
    findings.push({
      id: 'hardcoded-secrets',
      checkId: 'security-no-secret-leaks',
      severity: 'critical',
      message: `Potential hardcoded secret pattern(s) detected: ${secretMatches.slice(0, 5).join(', ')}`,
      fix: 'Remove hardcoded credentials immediately, rotate compromised keys, and store them via `shiplaunchpad vault set <KEY>`.',
    });
  } else {
    findings.push({
      id: 'no-secret-leaks',
      checkId: 'security-no-secret-leaks',
      severity: 'info',
      status: 'pass',
      message: 'No hardcoded secret patterns detected in source files.',
    });
  }

  // Load source corpus once for static pattern checks
  const codeCorpus = files
    .filter((f) => /\.(js|mjs|ts|tsx|jsx|sql|json|rules|swift|kt|xml|plist|dart|py|go|html)$/i.test(f.name))
    .slice(0, 300)
    .map((f) => ({ rel: f.rel, text: readSafe(f.full, 128_000) }));
  const joinedCode = codeCorpus.map((c) => c.text).join('\n');

  // 2. Supabase RLS & Firebase Security Rules
  if (svcIds.has('supabase')) {
    const sqlText = codeCorpus.filter((c) => c.rel.endsWith('.sql')).map((c) => c.text).join('\n');
    if (sqlText && !/ENABLE ROW LEVEL SECURITY/i.test(sqlText)) {
      findings.push({
        id: 'supabase-missing-rls',
        checkId: 'security-db-access-rules',
        severity: 'critical',
        message: 'Supabase SQL migrations found without `ENABLE ROW LEVEL SECURITY`.',
        fix: 'Enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) and add scoped `CREATE POLICY` rules using `auth.uid()`.',
      });
    } else if (!sqlText) {
      findings.push({
        id: 'supabase-verify-rls',
        checkId: 'security-db-access-rules',
        severity: 'warn',
        message: 'Supabase detected without local SQL migrations — verify RLS policies are enabled on all public tables.',
        fix: 'Check Supabase Dashboard -> Authentication/Table Policies so anon key cannot read/write other users’ data.',
      });
    }
    if (!svcIds.has('resend') && !/SMTP_|NODEMAILER|POSTMARK|SENDGRID/i.test(joinedCode)) {
      findings.push({
        id: 'supabase-default-smtp',
        checkId: 'security-custom-smtp',
        severity: 'warn',
        message: 'Supabase detected without custom SMTP/email service — Supabase built-in email only delivers to team members at 2 emails/hour.',
        fix: 'Configure custom SMTP (e.g. Resend) in Supabase Auth settings before real user sign-ups.',
      });
    }
    findings.push({
      id: 'supabase-pause-warning',
      checkId: 'payments-db-pause-guard',
      severity: 'warn',
      message: 'Supabase free tier pauses projects after 7 days of low activity (can break App Review or early launches).',
      fix: 'Upgrade to Supabase Pro before production traffic or keep a health ping / monitor active during App Review.',
    });
  }

  if (svcIds.has('firebase')) {
    const rulesFile = codeCorpus.find((c) => /firestore\.rules|database\.rules\.json/i.test(c.rel));
    if (rulesFile && /allow\s+read\s*,\s*write\s*:\s*if\s+true|"\.read"\s*:\s*true|"\.write"\s*:\s*true/i.test(rulesFile.text)) {
      findings.push({
        id: 'firebase-open-rules',
        checkId: 'security-db-access-rules',
        severity: 'critical',
        message: `Wide-open Firebase security rules detected in ${rulesFile.rel}.`,
        fix: 'Restrict rules to authenticated owners (`request.auth != null && request.auth.uid == userId`).',
      });
    }
  }

  // 3. Localhost auth redirects & Google OAuth audience
  if (/(redirect(To|_uri|Urls?)?|redir(ect)?|callbackUrl|site_url|NEXTAUTH_URL|AUTH_URL)[^;\n]*localhost(:\d+)?/i.test(joinedCode)) {
    findings.push({
      id: 'localhost-auth-redirect',
      checkId: 'security-auth-redirects-audience',
      severity: 'warn',
      message: 'Hardcoded `localhost` redirect URL detected in auth/config code.',
      fix: 'Configure production site URL & redirect allow-lists dynamically from environment config before launch.',
    });
  }

  // 4. Vercel Hobby commercial restriction check
  const usesVercel = detection.hosts?.some((h) => h.id === 'vercel') || surfaces.has(SURFACES.WEB_APP);
  const takesMoneyOrAds = Boolean(config.payments) || svcIds.has('stripe') || /adsbygoogle|googlesyndication|pricing|checkout/i.test(joinedCode);
  if (usesVercel && takesMoneyOrAds) {
    findings.push({
      id: 'vercel-commercial-plan',
      checkId: 'payments-commercial-plan',
      severity: 'warn',
      message: 'Web app uses payment/commercial or ad markers — Vercel Hobby forbids commercial use.',
      fix: 'Move to Vercel Pro ($20/mo per seat) before accepting payments or showing ads.',
    });
  }

  // 5. Stripe live webhook HMAC verification check
  if (svcIds.has('stripe')) {
    if (!/constructEvent|stripe-signature/i.test(joinedCode)) {
      findings.push({
        id: 'stripe-webhook-hmac',
        checkId: 'payments-webhooks-iap',
        severity: 'critical',
        message: 'Stripe detected without webhook signature verification (`stripe.webhooks.constructEvent`).',
        fix: 'Verify `stripe-signature` using your live mode `STRIPE_WEBHOOK_SECRET` on raw request body.',
      });
    } else {
      findings.push({
        id: 'stripe-webhook-ok',
        checkId: 'payments-webhooks-iap',
        severity: 'info',
        status: 'pass',
        message: 'Stripe webhook signature verification detected; ensure live-mode endpoint and `whsec_` secret are configured.',
      });
    }
  }

  // 6. AI spend caps & Apple 5.1.2 AI data consent
  if (svcIds.has('openai') || svcIds.has('anthropic')) {
    if (!svcIds.has('upstash') && !/ratelimit|rate-limit|rateLimit/i.test(joinedCode)) {
      findings.push({
        id: 'ai-no-rate-limit',
        checkId: 'payments-ai-permission-caps',
        severity: 'warn',
        message: 'Paid AI SDK (OpenAI/Anthropic) detected without rate limiting — unthrottled callers can spike token bills.',
        fix: 'Add route rate limiting (e.g. Upstash Ratelimit) and configure hard monthly spend caps in provider billing.',
      });
    }
    if (surfaces.has(SURFACES.IOS)) {
      findings.push({
        id: 'ios-ai-consent',
        checkId: 'payments-ai-permission-caps',
        severity: 'warn',
        message: 'iOS app sends data to external AI — Apple Guideline 5.1.2 requires explicit user permission before sharing personal data with third-party AI.',
        fix: 'Display an explicit opt-in consent prompt explaining what data is sent to the AI provider before first AI call.',
      });
    }
  }

  // 7. Account deletion & Sign in with Apple (Mobile / Auth apps)
  const hasAuth = svcIds.has('supabase') || svcIds.has('firebase') || svcIds.has('google-auth') || /signUp|createUser|auth\./i.test(joinedCode);
  if (hasAuth && (surfaces.has(SURFACES.IOS) || surfaces.has(SURFACES.ANDROID))) {
    if (!/deleteAccount|delete[-_]account|deleteUser/i.test(joinedCode)) {
      findings.push({
        id: 'missing-in-app-account-deletion',
        checkId: 'stores-account-deletion',
        severity: 'critical',
        message: 'Mobile app with user accounts lacks detectable in-app account deletion (`deleteAccount`/`deleteUser`).',
        fix: 'Apple 5.1.1(v) requires full account & data deletion inside the app; Google Play also requires a public web deletion URL.',
      });
    }
    if (surfaces.has(SURFACES.IOS) && svcIds.has('google-auth') && !/ASAuthorizationAppleID|signInWithApple|apple-auth|signInWithOAuth.*apple/i.test(joinedCode)) {
      findings.push({
        id: 'missing-sign-in-with-apple',
        checkId: 'stores-sign-in-with-apple',
        severity: 'critical',
        message: 'iOS app offers Google Sign-In without detectable Sign in with Apple (Apple Guideline 4.8).',
        fix: 'Add Sign in with Apple whenever offering third-party social login on iOS.',
      });
    }
  }

  // 8. iOS Info.plist permission reasons & PrivacyInfo.xcprivacy
  if (surfaces.has(SURFACES.IOS)) {
    const plistFile = codeCorpus.find((c) => c.rel.endsWith('Info.plist'));
    if (plistFile) {
      const checks = [
        { codeRe: /AVCaptureDevice|UIImagePickerController|image_picker|expo-camera/i, key: 'NSCameraUsageDescription' },
        { codeRe: /PHPhotoLibrary|expo-media-library/i, key: 'NSPhotoLibraryUsageDescription' },
        { codeRe: /CLLocationManager|geolocator|expo-location/i, key: 'NSLocationWhenInUseUsageDescription' },
        { codeRe: /AVAudioRecorder|AVAudioSession|record_audio/i, key: 'NSMicrophoneUsageDescription' },
      ];
      for (const chk of checks) {
        if (chk.codeRe.test(joinedCode) && !plistFile.text.includes(chk.key)) {
          findings.push({
            id: `plist-missing-${chk.key}`,
            checkId: 'stores-permissions-privacy-manifest',
            severity: 'critical',
            message: `iOS capability used in code but \`${chk.key}\` is missing from ${plistFile.rel} (app will crash when requested).`,
            fix: `Add a clear user-facing purpose string for \`${chk.key}\` in ${plistFile.rel}.`,
          });
        }
      }
    }
    if (!detection.files?.hasPrivacyManifest) {
      findings.push({
        id: 'ios-missing-privacy-manifest',
        checkId: 'stores-permissions-privacy-manifest',
        severity: 'warn',
        message: 'Apple `PrivacyInfo.xcprivacy` manifest not found in iOS project.',
        fix: 'Generate `PrivacyInfo.xcprivacy` declaring Required Reason APIs and collected data types (`shiplaunchpad apply` can scaffold one).',
      });
    }
  }

  // 9. AndroidManifest 5-pillar checks (REA_Skill mobile security)
  if (surfaces.has(SURFACES.ANDROID)) {
    const manifestFile = codeCorpus.find((c) => c.rel.endsWith('AndroidManifest.xml'));
    if (manifestFile) {
      if (/android:debuggable="true"/i.test(manifestFile.text)) {
        findings.push({
          id: 'android-debuggable',
          checkId: 'stores-installable-artifact',
          severity: 'critical',
          message: `\`android:debuggable="true"\` hardcoded in ${manifestFile.rel}.`,
          fix: 'Remove `android:debuggable="true"` from AndroidManifest.xml before release builds.',
        });
      }
      if (/android:usesCleartextTraffic="true"/i.test(manifestFile.text)) {
        findings.push({
          id: 'android-cleartext',
          checkId: 'security-no-secret-leaks',
          severity: 'warn',
          message: `\`android:usesCleartextTraffic="true"\` enabled in ${manifestFile.rel}.`,
          fix: 'Enforce HTTPS via `network_security_config.xml` and disable cleartext traffic in release.',
        });
      }
      if (/android:allowBackup="true"/i.test(manifestFile.text)) {
        findings.push({
          id: 'android-allow-backup',
          checkId: 'security-db-access-rules',
          severity: 'warn',
          message: `\`android:allowBackup="true"\` in ${manifestFile.rel} can expose local app data via ADB backups.`,
          fix: 'Set `android:allowBackup="false"` or configure strict `dataExtractionRules`.',
        });
      }
    }
  }

  // 10. Web security headers check
  if ((surfaces.has(SURFACES.WEB_APP) || surfaces.has(SURFACES.SITE) || surfaces.has(SURFACES.SERVICE)) && !detection.files?.hasSecurityHeaders) {
    findings.push({
      id: 'missing-security-headers',
      checkId: 'web-security-headers',
      severity: 'warn',
      message: 'No security headers config (`vercel.json` headers or Cloudflare `_headers`) detected.',
      fix: 'Run `shiplaunchpad apply --headers` to configure HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and CSP.',
    });
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warnCount = findings.filter((f) => f.severity === 'warn').length;

  return {
    criticalCount,
    warnCount,
    passed: criticalCount === 0,
    findings,
  };
}
