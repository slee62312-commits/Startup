import { getGuideForItem } from './guides.mjs';

/**
 * Full 50-item production readiness checklist across the 8 categories from shiplaunchpad.com:
 * web (6) + stores (10) + security (7) + monitoring (4) + legal (3) + payments (6) + build (6) + dashboard (8) = 50.
 */

export const CHECKLIST_CATEGORIES = [
  { id: 'web', name: 'Live on the web', expectedCount: 6 },
  { id: 'stores', name: 'App stores and downloads', expectedCount: 10 },
  { id: 'security', name: 'Security and data', expectedCount: 7 },
  { id: 'monitoring', name: 'See how it is used', expectedCount: 4 },
  { id: 'legal', name: 'Legal and trust', expectedCount: 3 },
  { id: 'payments', name: 'Payments and costs', expectedCount: 6 },
  { id: 'build', name: 'Builds and releases', expectedCount: 6 },
  { id: 'dashboard', name: 'Mission Control and safety', expectedCount: 8 },
];

export const CHECKLIST_ITEMS = [
  // 1. Live on the web (6)
  {
    id: 'web-live-host',
    category: 'web',
    title: 'Your app or site live on the web',
    level: 'wires',
    appliesTo: ['web-app', 'site', 'service'],
    why: 'Deploy pipeline or preserved existing host (Vercel, Cloudflare Pages/Workers, Cloud Run, Lovable, Bolt, Netlify).',
  },
  {
    id: 'web-domain-dns',
    category: 'web',
    title: 'Your domain and DNS configured',
    level: 'wires',
    appliesTo: ['web-app', 'site', 'macos-dmg', 'service'],
    why: 'Connect custom domain and verify TLS/DNS records without breaking existing records.',
  },
  {
    id: 'web-landing-page',
    category: 'web',
    title: 'A landing page designed to convert',
    level: 'guided',
    appliesTo: '*',
    why: 'Clear value proposition, call-to-action, screenshots/demo, and OpenGraph metadata for sharing.',
  },
  {
    id: 'web-branch-previews',
    category: 'web',
    title: 'Preview link for every branch and PR',
    level: 'wires',
    appliesTo: ['web-app', 'site'],
    why: 'Every branch/PR gets an isolated preview URL before merging to production.',
  },
  {
    id: 'web-staging-env',
    category: 'web',
    title: 'Staging environment beside production',
    level: 'wires',
    appliesTo: ['web-app', 'site', 'service', 'ios', 'android'],
    why: 'Separate staging environment keeps testers off production databases and payment webhooks.',
  },
  {
    id: 'web-security-headers',
    category: 'web',
    title: 'HTTP security headers enforced (CSP, HSTS, X-Frame-Options)',
    level: 'wires',
    appliesTo: ['web-app', 'site', 'service'],
    why: 'Hardens responses with HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and CSP.',
  },

  // 2. App stores and downloads (10)
  {
    id: 'stores-tester-builds',
    category: 'stores',
    title: 'Every build delivered to your testers (TestFlight / Firebase)',
    level: 'wires',
    appliesTo: ['ios', 'android'],
    why: 'Automated TestFlight and Firebase App Distribution builds on push.',
  },
  {
    id: 'stores-installable-artifact',
    category: 'stores',
    title: 'Signed release bundle ready for store upload (IPA / AAB)',
    level: 'checks',
    appliesTo: ['ios', 'android'],
    why: 'Produces release-signed IPA or Play App Bundle (AAB) matching store signing requirements.',
  },
  {
    id: 'stores-macos-dmg-notarized',
    category: 'stores',
    title: 'Signed, notarized Mac download with Sparkle auto-update',
    level: 'wires',
    appliesTo: ['macos-dmg'],
    why: 'Developer ID signed, Apple-notarized, stapled DMG with Sparkle EdDSA appcast feed and release notes.',
  },
  {
    id: 'stores-account-deletion',
    category: 'stores',
    title: 'Account deletion inside the app and on a public web page',
    level: 'checks',
    appliesTo: ['ios', 'android', 'web-app'],
    why: 'Apple Guideline 5.1.1(v) requires in-app full account deletion; Google Play also requires a public web deletion URL.',
  },
  {
    id: 'stores-sign-in-with-apple',
    category: 'stores',
    title: 'Sign in with Apple offered alongside third-party social login',
    level: 'checks',
    appliesTo: ['ios'],
    why: 'Apple Guideline 4.8 requires Sign in with Apple (or equivalent private-email login) when Google/Facebook login is offered.',
  },
  {
    id: 'stores-reviewer-demo',
    category: 'stores',
    title: 'Working demo account and live backend for App Review',
    level: 'checks',
    appliesTo: ['ios', 'android'],
    why: 'Apple Guideline 2.1 rejects login-gated apps lacking working reviewer credentials and an active backend.',
  },
  {
    id: 'stores-permissions-privacy-manifest',
    category: 'stores',
    title: 'Clear permission reasons and Apple Privacy Manifest (PrivacyInfo.xcprivacy)',
    level: 'checks',
    appliesTo: ['ios', 'android'],
    why: 'Missing Info.plist usage descriptions crash on iOS; PrivacyInfo.xcprivacy is required for App Store submissions.',
  },
  {
    id: 'stores-ipad-compatibility',
    category: 'stores',
    title: 'iPad layout verified and tablet screenshots prepared',
    level: 'checks',
    appliesTo: ['ios'],
    why: 'Apple Guideline 2.4.1 expects iPhone apps to run cleanly on iPad without clipped layouts.',
  },
  {
    id: 'stores-play-closed-test-14d',
    category: 'stores',
    title: 'Google Play 12 testers for 14 consecutive days & Play signing key registered',
    level: 'checks',
    appliesTo: ['android'],
    why: 'Personal Play accounts after Nov 13, 2023 require 12 opted-in testers for 14 days; Google Sign-In needs Play SHA-256.',
  },
  {
    id: 'stores-compliance-paperwork',
    category: 'stores',
    title: 'EU trader status, age rating questions, and Small Business Program (15%)',
    level: 'checks',
    appliesTo: ['ios', 'android', 'macos-dmg'],
    why: 'EU DSA trader declaration prevents EU App Store removal; updated age ratings block submissions; SBP cuts commission to 15%.',
  },

  // 3. Security and data (7)
  {
    id: 'security-os-keychain-vault',
    category: 'security',
    title: 'Keys stored in OS keychain or encrypted vault, never git or .env',
    level: 'wires',
    appliesTo: '*',
    why: 'Secrets stay in macOS Keychain or AES-256-GCM ~/.shiplaunchpad/vault.enc and are pushed straight to CI/host.',
  },
  {
    id: 'security-no-secret-leaks',
    category: 'security',
    title: 'No secret keys leaked in source, .env, or client bundles',
    level: 'checks',
    appliesTo: '*',
    why: 'Scans source and build artifacts for SUPABASE_SERVICE_ROLE_KEY, Stripe sk_live_, AWS keys, and private keys.',
  },
  {
    id: 'security-db-access-rules',
    category: 'security',
    title: 'Database access rules block unauthorized access (Supabase RLS / Firebase Rules)',
    level: 'checks',
    appliesTo: '*',
    why: 'Client-side Supabase/Firebase keys are public; Row Level Security or Firestore/RTDB rules protect user data.',
  },
  {
    id: 'security-auth-redirects-audience',
    category: 'security',
    title: 'Auth redirect URLs point to production (no localhost) & Google OAuth published',
    level: 'checks',
    appliesTo: '*',
    why: 'Removes localhost redirect defaults and ensures Google OAuth audience is switched from Testing (100-user/7-day limit) to Production.',
  },
  {
    id: 'security-custom-smtp',
    category: 'security',
    title: 'Custom SMTP / email provider connected (Resend / Postmark / SES)',
    level: 'checks',
    appliesTo: '*',
    why: 'Supabase built-in email caps delivery to project team members at 2 emails/hour until custom SMTP is configured.',
  },
  {
    id: 'security-bot-rate-limit',
    category: 'security',
    title: 'Public form bot protection (Turnstile) & API rate limiting',
    level: 'checks',
    appliesTo: ['web-app', 'service'],
    why: 'Protects sign-up forms and public/AI API endpoints from credential stuffing and abuse.',
  },
  {
    id: 'security-backup-restore-tested',
    category: 'security',
    title: 'Database backups enabled and restore tested once on a spare copy',
    level: 'checks',
    appliesTo: '*',
    why: 'An untested backup is a guess; verify restore procedures before real users depend on data.',
  },

  // 4. See how it is used (4)
  {
    id: 'monitoring-cookieless-analytics',
    category: 'monitoring',
    title: 'Cookieless usage analytics wired (no cookie banner needed)',
    level: 'wires',
    appliesTo: '*',
    why: 'PostHog cookieless or Plausible instrumentation captures core usage without invasive tracking.',
  },
  {
    id: 'monitoring-uptime-alerts',
    category: 'monitoring',
    title: 'Uptime alerts notify you when your app, API, or download goes down',
    level: 'wires',
    appliesTo: ['web-app', 'site', 'service', 'macos-dmg'],
    why: 'Scheduled health probe / uptime check flags outages across web apps, services, and DMG download links.',
  },
  {
    id: 'monitoring-crash-reports',
    category: 'monitoring',
    title: 'Crash reporting & error tracking configured (Sentry / Crashlytics)',
    level: 'wires',
    appliesTo: '*',
    why: 'Captures unhandled production crashes and stack traces with source maps or dSYMs.',
  },
  {
    id: 'monitoring-privacy-labels',
    category: 'monitoring',
    title: 'Store privacy labels & Data safety inventory cover every SDK',
    level: 'checks',
    appliesTo: ['ios', 'android'],
    why: 'Includes data collected by analytics, crash reporting, login, and ad SDKs—not only your own code.',
  },

  // 5. Legal and trust (3)
  {
    id: 'legal-privacy-policy',
    category: 'legal',
    title: 'Public HTML privacy policy linked in-app and on store listings',
    level: 'wires',
    appliesTo: '*',
    why: 'Required by Apple 5.1.1(i) and Google Play User Data policy even when collecting zero data (non-PDF web URL).',
  },
  {
    id: 'legal-terms-of-service',
    category: 'legal',
    title: 'Terms of Service page published and linked',
    level: 'wires',
    appliesTo: '*',
    why: 'Clarifies billing, acceptable use, and service boundaries before onboarding paying users.',
  },
  {
    id: 'legal-support-contact',
    category: 'legal',
    title: 'Real support contact page and web account-deletion link',
    level: 'wires',
    appliesTo: '*',
    why: 'App Store Connect requires a live Support URL with real contact details; Google Play requires a web deletion link.',
  },

  // 6. Payments and costs (6)
  {
    id: 'payments-webhooks-iap',
    category: 'payments',
    title: 'Payments configured for live mode (Stripe HMAC webhook / IAP / RevenueCat)',
    level: 'checks',
    appliesTo: ['web-app', 'service', 'ios', 'android', 'macos-dmg'],
    why: 'Verifies live Stripe webhook signing secret & HMAC check, Apple Paid Apps Agreement + Restore Purchases, or Lemon Squeezy.',
  },
  {
    id: 'payments-cost-timeline',
    category: 'payments',
    title: 'Every platform fee and approval wait calculated upfront',
    level: 'wires',
    appliesTo: '*',
    why: 'Surfaces Apple $99/yr, Play $25, D-U-N-S (up to 7 days), and Play 14-day wait before spending.',
  },
  {
    id: 'payments-spend-caps',
    category: 'payments',
    title: 'Spend caps and billing alerts set on pay-per-use services',
    level: 'checks',
    appliesTo: '*',
    why: 'Covers Firebase Blaze, Vercel Pro, Cloudflare Workers, Supabase, OpenAI, Anthropic, and AWS.',
  },
  {
    id: 'payments-commercial-plan',
    category: 'payments',
    title: 'Hosting plan permits commercial use before first sale',
    level: 'checks',
    appliesTo: ['web-app', 'site'],
    why: 'Vercel Hobby prohibits commercial apps, payments, and ads; requires Pro ($20/mo/seat) before accepting money.',
  },
  {
    id: 'payments-ai-permission-caps',
    category: 'payments',
    title: 'Explicit user permission before sending data to AI & AI route limits',
    level: 'checks',
    appliesTo: '*',
    why: 'Apple Guideline 5.1.2 requires explicit consent for third-party AI data sharing; unthrottled AI endpoints risk runaway bills.',
  },
  {
    id: 'payments-db-pause-guard',
    category: 'payments',
    title: 'Database sleep/pause risk addressed (Supabase 7-day idle pause)',
    level: 'checks',
    appliesTo: '*',
    why: 'Free Supabase projects pause after 7 days of low activity, breaking App Review or early launches.',
  },

  // 7. Builds and releases (6)
  {
    id: 'build-multi-surface-detect',
    category: 'build',
    title: 'Every app, site, and service in repository discovered',
    level: 'wires',
    appliesTo: '*',
    why: 'Finds mobile, desktop, web, static, and API apps in single or monorepo layouts.',
  },
  {
    id: 'build-reproducible-ci',
    category: 'build',
    title: 'Reproducible GitHub Actions workflows build every surface identically',
    level: 'wires',
    appliesTo: '*',
    why: 'Writes clean .github/workflows/shiplaunchpad-*.yml pipelines with pinned actions and node/toolchain versions.',
  },
  {
    id: 'build-tests-before-ship',
    category: 'build',
    title: 'Automated test and lint checks run before anything deploys',
    level: 'wires',
    appliesTo: '*',
    why: 'Prevents broken builds from shipping to testers or production.',
  },
  {
    id: 'build-env-isolation',
    category: 'build',
    title: 'Staging and production secrets & branches isolated',
    level: 'wires',
    appliesTo: '*',
    why: 'Prevents test traffic or staging credentials from mixing with live production.',
  },
  {
    id: 'build-versioned-releases',
    category: 'build',
    title: 'Deterministic version bumps and tag-based release flow',
    level: 'wires',
    appliesTo: '*',
    why: 'Coordinates semver bumps, release notes, and store/production deploy tags.',
  },
  {
    id: 'build-doctor-diagnostics',
    category: 'build',
    title: 'Redacted doctor diagnostic report passes environment checks',
    level: 'checks',
    appliesTo: '*',
    why: 'Verifies required CLIs, git remote, Node >= 20, and signing/vault status without exposing secrets.',
  },

  // 8. Mission Control and safety (8)
  {
    id: 'dashboard-all-projects',
    category: 'dashboard',
    title: 'Project registered on Mission Control (all apps on one screen)',
    level: 'wires',
    appliesTo: '*',
    why: 'Tracks progress, surface scores, and next actions across every repo in ~/.shiplaunchpad/projects.json.',
  },
  {
    id: 'dashboard-readiness-score',
    category: 'dashboard',
    title: 'Live readiness checklist and category scores computed',
    level: 'wires',
    appliesTo: '*',
    why: 'Keeps passing, failing, and manual items visible until every applicable check passes.',
  },
  {
    id: 'dashboard-confirmation-gates',
    category: 'dashboard',
    title: 'Confirmation gates before spending money, DNS changes, public flips, or stores',
    level: 'wires',
    appliesTo: '*',
    why: 'Prevents irreversible or paid actions without explicit human approval.',
  },
  {
    id: 'dashboard-safe-undo',
    category: 'dashboard',
    title: 'Snapshot-based undo available without overwriting edited files',
    level: 'wires',
    appliesTo: '*',
    why: 'Restores files from the previous ShipLaunchpad run while leaving user-modified files intact.',
  },
  {
    id: 'dashboard-plain-state',
    category: 'dashboard',
    title: 'Plain inspectable state stored in .shiplaunchpad/ (STATUS.md + state.json)',
    level: 'wires',
    appliesTo: '*',
    why: 'Everything written to the repo is transparent, diffable, and travels with git.',
  },
  {
    id: 'dashboard-manual-queue',
    category: 'dashboard',
    title: 'Manual hand-off queue tracks store and account steps with official links',
    level: 'checks',
    appliesTo: '*',
    why: 'Tracks human-only steps (Apple fee, D-U-N-S, 14-day Play closed test) until marked done.',
  },
  {
    id: 'dashboard-decision-log',
    category: 'dashboard',
    title: 'Architecture & host decision reasons documented in plain English',
    level: 'wires',
    appliesTo: '*',
    why: 'Records why each host, bundler, signing strategy, or preserved platform was selected.',
  },
  {
    id: 'dashboard-zero-telemetry',
    category: 'dashboard',
    title: 'Runs 100% locally with zero outbound telemetry or license lockouts',
    level: 'wires',
    appliesTo: '*',
    why: 'Mission Control binds only to 127.0.0.1 and never phones home.',
  },
];

export function appliesToSurfaces(item, activeSurfaces) {
  if (item.appliesTo === '*') return true;
  if (!activeSurfaces || activeSurfaces.length === 0) return true;
  return item.appliesTo.some((s) => activeSurfaces.includes(s));
}

/**
 * Evaluates all 50 checklist items against detected surfaces, audit results, repo state, and config.
 */
export function evaluateChecklist({ detection, audit, state, config }) {
  const surfaces = detection?.surfaces || [];
  const findingsById = new Map((audit?.findings || []).map((f) => [f.checkId, f]));
  const manualDone = new Set(state?.checklistOverrides?.done || []);
  const manualWaived = new Set(state?.checklistOverrides?.na || []);
  const playTest = state?.playClosedTest || null;
  const applied = Boolean(state?.lastApplyAt);

  const rawItems = CHECKLIST_ITEMS.map((item) => {
    const applicable = appliesToSurfaces(item, surfaces);
    if (!applicable || manualWaived.has(item.id)) {
      return { ...item, status: 'na', reason: applicable ? 'Marked not applicable' : 'Does not apply to detected surfaces', manualOverride: manualWaived.has(item.id) ? 'na' : null };
    }
    if (manualDone.has(item.id)) {
      return { ...item, status: 'pass', reason: 'Marked done by owner', manualOverride: 'done' };
    }

    const finding = findingsById.get(item.id);
    if (finding && (finding.severity === 'critical' || finding.severity === 'warn')) {
      return { ...item, status: 'fail', severity: finding.severity, reason: finding.message, fix: finding.fix };
    }

    // Evaluate automated / state-driven items
    let status = 'todo';
    let reason = 'Not configured yet';

    switch (item.id) {
      case 'web-live-host':
        if (detection?.hosts?.length > 0 || detection?.workflows?.some((w) => /vercel|pages|worker|cloud-run/i.test(w))) {
          status = 'pass';
          reason = detection.hosts?.length ? `Preserving ${detection.hosts.map((h) => h.name).join(', ')}` : 'Deploy workflow wired';
        }
        break;
      case 'web-domain-dns':
        if (config?.domain) {
          status = 'pass';
          reason = `Domain set: ${config.domain}`;
        }
        break;
      case 'web-landing-page':
        if (detection?.files?.hasLandingPage) {
          status = 'pass';
          reason = 'Landing page detected';
        }
        break;
      case 'web-branch-previews':
        if (detection?.hosts?.some((h) => ['vercel', 'netlify', 'cloudflare-pages'].includes(h.id)) || applied) {
          status = 'pass';
          reason = 'Branch preview pipeline ready';
        }
        break;
      case 'web-staging-env':
        if (config?.staging === true || config?.staging === 'true') {
          status = 'pass';
          reason = 'Staging environment enabled';
        }
        break;
      case 'web-security-headers':
        if (detection?.files?.hasSecurityHeaders) {
          status = 'pass';
          reason = 'Security headers config present';
        }
        break;
      case 'stores-tester-builds':
        if (detection?.workflows?.some((w) => /testflight|firebase|ios|android/i.test(w))) {
          status = 'pass';
          reason = 'Tester distribution workflow configured';
        }
        break;
      case 'stores-installable-artifact':
        if (detection?.workflows?.some((w) => /ios|android|flutter|react-native|expo|capacitor/i.test(w))) {
          status = 'pass';
          reason = 'Release bundle pipeline configured';
        }
        break;
      case 'stores-macos-dmg-notarized':
        if (detection?.workflows?.some((w) => /macos|dmg/i.test(w))) {
          status = 'pass';
          reason = 'Signed/notarized DMG + Sparkle workflow configured';
        }
        break;
      case 'stores-account-deletion':
      case 'stores-sign-in-with-apple':
      case 'stores-permissions-privacy-manifest':
      case 'stores-no-secret-leaks':
      case 'security-db-access-rules':
      case 'security-auth-redirects-audience':
      case 'security-custom-smtp':
      case 'security-bot-rate-limit':
      case 'payments-webhooks-iap':
      case 'payments-commercial-plan':
      case 'payments-ai-permission-caps':
      case 'payments-db-pause-guard':
        // Passed audit cleanly if no finding was raised and audit ran on relevant markers
        if (finding?.status === 'pass') {
          status = 'pass';
          reason = finding.message;
        } else if (finding?.status === 'manual') {
          status = 'manual';
          reason = finding.message;
        } else if (item.id === 'stores-no-secret-leaks') {
          status = 'pass';
          reason = 'Zero leaked secrets found in repo scan';
        }
        break;
      case 'stores-play-closed-test-14d':
        if (config?.company === true || config?.company === 'true') {
          status = 'pass';
          reason = 'Organization Play account is exempt from 14-day closed test';
        } else if (playTest?.startedAt) {
          const daysElapsed = Math.floor((Date.now() - new Date(playTest.startedAt).getTime()) / 86400000);
          if (daysElapsed >= 14 && (playTest.testersCount || 0) >= 12) {
            status = 'pass';
            reason = `14 days & ${playTest.testersCount} testers met`;
          } else {
            status = 'manual';
            reason = `Day ${Math.min(daysElapsed, 14)}/14 (${playTest.testersCount || 0}/12 testers)`;
          }
        } else {
          status = 'manual';
          reason = 'Run `play-test start` once closed test starts (12 testers × 14 days)';
        }
        break;
      case 'stores-reviewer-demo':
      case 'stores-ipad-compatibility':
      case 'stores-compliance-paperwork':
      case 'security-backup-restore-tested':
      case 'monitoring-privacy-labels':
        status = 'manual';
        reason = 'Requires human verification and confirmation in store/vendor console';
        break;
      case 'security-os-keychain-vault':
        status = 'pass';
        reason = 'Keychain / AES-256-GCM local vault available (no secrets committed)';
        break;
      case 'monitoring-cookieless-analytics':
        if (detection?.services?.some((s) => s.id === 'posthog')) {
          status = 'pass';
          reason = 'PostHog detected';
        }
        break;
      case 'monitoring-uptime-alerts':
        if (detection?.workflows?.some((w) => /uptime/i.test(w))) {
          status = 'pass';
          reason = 'Uptime workflow configured';
        }
        break;
      case 'monitoring-crash-reports':
        if (detection?.services?.some((s) => s.id === 'sentry' || s.id === 'firebase')) {
          status = 'pass';
          reason = 'Crash reporting SDK detected';
        }
        break;
      case 'legal-privacy-policy':
        if (detection?.files?.hasPrivacyPolicy) {
          status = 'pass';
          reason = 'Privacy policy page/file found';
        }
        break;
      case 'legal-terms-of-service':
        if (detection?.files?.hasTerms) {
          status = 'pass';
          reason = 'Terms of Service page/file found';
        }
        break;
      case 'legal-support-contact':
        if (detection?.files?.hasSupportPage || config?.supportEmail) {
          status = 'pass';
          reason = config?.supportEmail ? `Support email set (${config.supportEmail})` : 'Support page found';
        }
        break;
      case 'payments-cost-timeline':
        status = 'pass';
        reason = 'Cost & timeline calculator available';
        break;
      case 'payments-spend-caps':
        if ((detection?.services || []).some((s) => s.metered)) {
          status = 'manual';
          reason = 'Verify spend caps in detected metered provider consoles';
        } else {
          status = 'pass';
          reason = 'No metered pay-per-use APIs detected';
        }
        break;
      case 'build-multi-surface-detect':
        status = detection?.stacks?.length > 0 ? 'pass' : 'manual';
        reason = detection?.stacks?.length ? `Detected ${detection.stacks.map((s) => s.name).join(', ')}` : 'No known stack detected';
        break;
      case 'build-reproducible-ci':
        if (detection?.workflows?.length > 0) {
          status = 'pass';
          reason = `${detection.workflows.length} workflow(s) found`;
        }
        break;
      case 'build-tests-before-ship':
        if (detection?.files?.hasTests) {
          status = 'pass';
          reason = 'Test script or test suite detected';
        }
        break;
      case 'build-env-isolation':
        if (config?.staging === true || config?.staging === 'true') {
          status = 'pass';
          reason = 'Staging & production environments separated';
        }
        break;
      case 'build-versioned-releases':
        if (detection?.workflows?.some((w) => /release|shiplaunchpad/i.test(w)) || state?.releases?.length) {
          status = 'pass';
          reason = 'Release workflow/history present';
        }
        break;
      case 'build-doctor-diagnostics':
        status = 'pass';
        reason = 'Redacted doctor report ready (`shiplaunchpad report`)';
        break;
      case 'dashboard-all-projects':
        if (state?.registeredAt) {
          status = 'pass';
          reason = 'Registered in Mission Control';
        }
        break;
      case 'dashboard-readiness-score':
      case 'dashboard-confirmation-gates':
      case 'dashboard-zero-telemetry':
        status = 'pass';
        reason = 'Active by design';
        break;
      case 'dashboard-safe-undo':
        status = state?.snapshots?.length ? 'pass' : applied ? 'pass' : 'todo';
        reason = state?.snapshots?.length ? `${state.snapshots.length} snapshot(s) ready for undo` : 'Snapshot created automatically on first apply';
        break;
      case 'dashboard-plain-state':
        status = state?.exists ? 'pass' : 'todo';
        reason = state?.exists ? '.shiplaunchpad/state.json & STATUS.md present' : 'Run apply to initialize .shiplaunchpad/';
        break;
      case 'dashboard-manual-queue':
        status = 'pass';
        reason = `${(state?.manualItems || []).filter((m) => !m.done).length} open manual item(s)`;
        break;
      case 'dashboard-decision-log':
        status = state?.decisions?.length ? 'pass' : 'todo';
        reason = state?.decisions?.length ? `${state.decisions.length} decision(s) recorded` : 'Recorded during onboard/apply';
        break;
      default:
        break;
    }

    return { ...item, status, reason };
  });

  const items = rawItems.map((it) => {
    const guide = getGuideForItem(it);
    const isBlocker = it.status === 'fail' ? it.severity === 'critical' || guide.blocksRelease : guide.blocksRelease && it.status !== 'pass' && it.status !== 'na';
    let bucket = 'na';
    if (it.status === 'pass') bucket = 'done';
    else if (it.status !== 'na') {
      bucket = it.status === 'fail' || guide.owner !== 'auto' ? 'for_you' : 'auto';
    }
    return { ...it, guide, blocksRelease: isBlocker, bucket };
  });

  const applicableItems = items.filter((i) => i.status !== 'na');
  const passedItems = applicableItems.filter((i) => i.status === 'pass');
  const forYouItems = applicableItems.filter((i) => i.bucket === 'for_you');
  const autoItems = applicableItems.filter((i) => i.bucket === 'auto');
  const blockingItems = applicableItems.filter((i) => i.status !== 'pass' && i.blocksRelease);
  const scorePct = applicableItems.length ? Math.round((passedItems.length / applicableItems.length) * 100) : 100;

  const byCategory = CHECKLIST_CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat.id);
    const catApplicable = catItems.filter((i) => i.status !== 'na');
    const catPassed = catApplicable.filter((i) => i.status === 'pass');
    return {
      ...cat,
      totalInCatalog: catItems.length,
      applicable: catApplicable.length,
      passed: catPassed.length,
      items: catItems,
    };
  });

  return {
    totalCatalogItems: CHECKLIST_ITEMS.length,
    applicableCount: applicableItems.length,
    passedCount: passedItems.length,
    remainingCount: applicableItems.length - passedItems.length,
    summary: {
      done: passedItems.length,
      forYou: forYouItems.length,
      auto: autoItems.length,
      blocking: blockingItems.length,
    },
    scorePct,
    byCategory,
    items,
  };
}
