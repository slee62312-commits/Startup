/**
 * Complete registry of 60 supported stacks (40 deployable, 20 recognized & scored),
 * 21 recognized hosts/app-builders, and 17 platform services from shiplaunchpad.com.
 */

export const SURFACES = {
  IOS: 'ios',
  ANDROID: 'android',
  MACOS_DMG: 'macos-dmg',
  WEB_APP: 'web-app',
  SITE: 'site',
  SERVICE: 'service',
  OTHER: 'other',
};

const WEB_APP_OUTCOME =
  'Live address on Vercel with a preview link per branch, custom domain support, downtime alerts, security headers, crash reports, and usage analytics.';
const STATIC_SITE_OUTCOME =
  'Live on Cloudflare Pages with a preview link per branch, custom domain, security headers, downtime alerts, cookieless analytics, and privacy/terms pages.';
const CLOUD_RUN_OUTCOME =
  'Live API on Google Cloud Run on every push, keys delivered securely, downtime alerts, and plan limit notices.';
const WORKERS_OR_CLOUD_RUN_OUTCOME =
  'Live API on Cloudflare Workers or Google Cloud Run on every push, keys delivered securely, downtime alerts, and plan limit notices.';
const RECOGNISED_OUTCOME =
  'Recognized and scored against the 50-item production checklist in Mission Control; no auto-generated deploy pipeline yet.';

export const STACKS = [
  // Mobile & Cross-Platform (6)
  {
    id: 'flutter',
    name: 'Flutter',
    status: 'deploys',
    surfaces: [SURFACES.IOS, SURFACES.ANDROID],
    deployTarget: 'TestFlight & App Store (iOS); Firebase App Distribution + signed AAB (Android)',
    outcome:
      'Ships iOS to TestFlight/App Store and signed Android builds to Firebase App Distribution with Play-ready AAB artifacts.',
  },
  {
    id: 'ios-native',
    name: 'Swift / Xcode (iOS)',
    status: 'deploys',
    surfaces: [SURFACES.IOS],
    deployTarget: 'TestFlight on test branch push; App Store upload on tag',
    outcome:
      'Signs every build for TestFlight and uploads releases to App Store Connect with optional Sentry crash reports and PostHog analytics.',
  },
  {
    id: 'android-native',
    name: 'Android (Kotlin / Java)',
    status: 'deploys',
    surfaces: [SURFACES.ANDROID],
    deployTarget: 'Firebase App Distribution on push + signed release AAB artifact',
    outcome:
      'Builds signed release AABs, distributes to testers via Firebase App Distribution, and tracks Play closed-testing readiness.',
  },
  {
    id: 'react-native',
    name: 'React Native',
    status: 'deploys',
    surfaces: [SURFACES.IOS, SURFACES.ANDROID],
    deployTarget: 'TestFlight/App Store (iOS) + Firebase App Distribution (Android)',
    outcome:
      'Ships both native mobile targets from one codebase with release signing, crash reports, and analytics.',
  },
  {
    id: 'expo',
    name: 'Expo',
    status: 'deploys',
    surfaces: [SURFACES.IOS, SURFACES.ANDROID],
    deployTarget: 'TestFlight & Firebase App Distribution (or existing EAS Build)',
    outcome:
      'Ships both iOS and Android from one Expo project, preserving existing EAS Build configurations when already wired.',
  },
  {
    id: 'capacitor',
    name: 'Capacitor / Ionic',
    status: 'deploys',
    surfaces: [SURFACES.IOS, SURFACES.ANDROID, SURFACES.WEB_APP],
    deployTarget: 'TestFlight/App Store, Firebase App Distribution / Play testing, plus optional Web',
    outcome:
      'Builds your web bundle into native iOS and Android projects for TestFlight and tester distribution alongside web hosting.',
  },

  // macOS Desktop (1)
  {
    id: 'macos',
    name: 'Swift / Xcode (macOS)',
    status: 'deploys',
    surfaces: [SURFACES.MACOS_DMG],
    deployTarget: 'Signed, notarized, stapled DMG on Cloudflare R2/Pages + Sparkle appcast',
    outcome:
      'Creates a Developer ID signed, Apple-notarized, stapled DMG with Sparkle auto-update release notes and download uptime monitoring.',
  },

  // Web Apps -> Vercel (13)
  { id: 'nextjs', name: 'Next.js', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'nuxt', name: 'Nuxt', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'sveltekit', name: 'SvelteKit', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'astro-web', name: 'Astro', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'react-router', name: 'React Router', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'tanstack-start', name: 'TanStack Start', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'remix', name: 'Remix', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'angular', name: 'Angular', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'qwik', name: 'Qwik', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'solidstart', name: 'SolidStart', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'gatsby', name: 'Gatsby', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'vite', name: 'Vite', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },
  { id: 'cra', name: 'Create React App', status: 'deploys', surfaces: [SURFACES.WEB_APP], deployTarget: 'Vercel', outcome: WEB_APP_OUTCOME },

  // Static Sites -> Cloudflare Pages (8)
  { id: 'hugo', name: 'Hugo', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'jekyll', name: 'Jekyll', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'eleventy', name: 'Eleventy', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'mkdocs', name: 'MkDocs', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'zola', name: 'Zola', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'astro', name: 'Astro (static)', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'docusaurus', name: 'Docusaurus', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },
  { id: 'plain-html', name: 'Hand-written HTML', status: 'deploys', surfaces: [SURFACES.SITE], deployTarget: 'Cloudflare Pages', outcome: STATIC_SITE_OUTCOME },

  // Backend Services -> Cloudflare Workers / Google Cloud Run (12)
  {
    id: 'cloudflare-worker',
    name: 'Cloudflare Worker',
    status: 'deploys',
    surfaces: [SURFACES.SERVICE],
    deployTarget: 'Cloudflare Workers',
    outcome: 'Live on Cloudflare Workers on every push, with separate staging Worker, cron triggers, queues, secrets, and uptime alerts.',
  },
  { id: 'hono', name: 'Hono', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Cloudflare Workers or Google Cloud Run', outcome: WORKERS_OR_CLOUD_RUN_OUTCOME },
  { id: 'itty-router', name: 'itty-router', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Cloudflare Workers or Google Cloud Run', outcome: WORKERS_OR_CLOUD_RUN_OUTCOME },
  { id: 'express', name: 'Express', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'fastify', name: 'Fastify', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'nestjs', name: 'NestJS', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'koa', name: 'Koa', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'hapi', name: 'hapi', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'elysia', name: 'Elysia', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'go-service', name: 'Go HTTP server', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'python-service', name: 'Python web service', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },
  { id: 'docker', name: 'Containerised service', status: 'deploys', surfaces: [SURFACES.SERVICE], deployTarget: 'Google Cloud Run', outcome: CLOUD_RUN_OUTCOME },

  // Recognized & Scored Only (20)
  { id: 'tauri', name: 'Tauri desktop app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / custom release', outcome: RECOGNISED_OUTCOME },
  { id: 'electron', name: 'Electron desktop app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / custom release', outcome: RECOGNISED_OUTCOME },
  { id: 'swift-package', name: 'Swift package', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Swift Package Index / Git tag', outcome: RECOGNISED_OUTCOME },
  { id: 'rails', name: 'Ruby on Rails app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / custom server', outcome: RECOGNISED_OUTCOME },
  { id: 'django', name: 'Django app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / custom server', outcome: RECOGNISED_OUTCOME },
  { id: 'wordpress', name: 'WordPress site', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / WP host', outcome: RECOGNISED_OUTCOME },
  { id: 'laravel', name: 'Laravel app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / PHP host', outcome: RECOGNISED_OUTCOME },
  { id: 'phoenix', name: 'Phoenix app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / BEAM host', outcome: RECOGNISED_OUTCOME },
  { id: 'elixir', name: 'Elixir project', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Hex / manual release', outcome: RECOGNISED_OUTCOME },
  { id: 'rust', name: 'Rust project', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'crates.io / binary release', outcome: RECOGNISED_OUTCOME },
  { id: 'go', name: 'Go project', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Go module / binary release', outcome: RECOGNISED_OUTCOME },
  { id: 'python', name: 'Python package', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'PyPI / manual release', outcome: RECOGNISED_OUTCOME },
  { id: 'ruby-gem', name: 'Ruby gem', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'RubyGems / manual release', outcome: RECOGNISED_OUTCOME },
  { id: 'dotnet', name: '.NET project', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'NuGet / manual host', outcome: RECOGNISED_OUTCOME },
  { id: 'jvm', name: 'JVM project', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Maven / manual host', outcome: RECOGNISED_OUTCOME },
  { id: 'deno', name: 'Deno app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Deno Deploy / manual', outcome: RECOGNISED_OUTCOME },
  { id: 'wasp', name: 'Wasp app', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Manual / Fly.io', outcome: RECOGNISED_OUTCOME },
  { id: 'browser-extension', name: 'Browser extension', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'Chrome Web Store / Firefox AMO', outcome: RECOGNISED_OUTCOME },
  { id: 'node-cli', name: 'Node CLI', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'npm / manual release', outcome: RECOGNISED_OUTCOME },
  { id: 'node-lib', name: 'Node package', status: 'recognised', surfaces: [SURFACES.OTHER], deployTarget: 'npm / manual release', outcome: RECOGNISED_OUTCOME },
];

export const STACK_BY_ID = Object.fromEntries(STACKS.map((s) => [s.id, s]));

/**
 * 21 existing hosts & app builders preserved without duplicating deployments.
 */
export const HOSTS_AND_BUILDERS = [
  { id: 'lovable', name: 'Lovable', kind: 'builder' },
  { id: 'bolt', name: 'Bolt', kind: 'builder' },
  { id: 'replit', name: 'Replit', kind: 'builder' },
  { id: 'v0', name: 'v0', kind: 'builder' },
  { id: 'vercel', name: 'Vercel', kind: 'host' },
  { id: 'netlify', name: 'Netlify', kind: 'host' },
  { id: 'cloudflare-pages', name: 'Cloudflare Pages', kind: 'host' },
  { id: 'cloudflare-workers', name: 'Cloudflare Workers', kind: 'host' },
  { id: 'firebase-hosting', name: 'Firebase Hosting', kind: 'host' },
  { id: 'fly-io', name: 'Fly.io', kind: 'host' },
  { id: 'railway', name: 'Railway', kind: 'host' },
  { id: 'render', name: 'Render', kind: 'host' },
  { id: 'heroku', name: 'Heroku', kind: 'host' },
  { id: 'digitalocean', name: 'DigitalOcean App Platform', kind: 'host' },
  { id: 'aws-amplify', name: 'AWS Amplify', kind: 'host' },
  { id: 'github-pages', name: 'GitHub Pages', kind: 'host' },
  { id: 'surge', name: 'Surge', kind: 'host' },
  { id: 'deno-deploy', name: 'Deno Deploy', kind: 'host' },
  { id: 'cloud-run', name: 'Google Cloud Run', kind: 'host' },
  { id: 'eas', name: 'Expo EAS', kind: 'host' },
  { id: 'azure-static', name: 'Azure Static Web Apps', kind: 'host' },
];

export const DETECTABLE_SERVICES = [
  { id: 'supabase', name: 'Supabase', metered: true, capUrl: 'https://supabase.com/dashboard/org/_/billing' },
  { id: 'firebase', name: 'Firebase', metered: true, capUrl: 'https://console.firebase.google.com/' },
  { id: 'openai', name: 'OpenAI API', metered: true, capUrl: 'https://platform.openai.com/settings/organization/limits' },
  { id: 'anthropic', name: 'Anthropic API', metered: true, capUrl: 'https://console.anthropic.com/settings/limits' },
  { id: 'aws', name: 'AWS', metered: true, capUrl: 'https://console.aws.amazon.com/billing/home#/budgets' },
  { id: 'vercel', name: 'Vercel', metered: true, capUrl: 'https://vercel.com/dashboard/settings/billing' },
  { id: 'cloudflare-workers', name: 'Cloudflare Workers', metered: true, capUrl: 'https://dash.cloudflare.com/' },
  { id: 'cloud-run', name: 'Google Cloud Run', metered: true, capUrl: 'https://console.cloud.google.com/billing/budgets' },
  { id: 'stripe', name: 'Stripe', metered: false },
  { id: 'revenuecat', name: 'RevenueCat', metered: false },
  { id: 'lemon-squeezy', name: 'Lemon Squeezy', metered: false },
  { id: 'resend', name: 'Resend', metered: false },
  { id: 'sentry', name: 'Sentry', metered: false },
  { id: 'posthog', name: 'PostHog', metered: false },
  { id: 'google-auth', name: 'Google Auth Platform', metered: false },
  { id: 'turnstile', name: 'Cloudflare Turnstile', metered: false },
  { id: 'upstash', name: 'Upstash Redis', metered: false },
];
