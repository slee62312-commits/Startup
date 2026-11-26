import path from 'node:path';
import { SURFACES } from '../catalog/stacks.mjs';

function sanitizeDomain(domain, fallbackName) {
  if (!domain) return `https://${fallbackName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.example.com`;
  return domain.startsWith('http') ? domain.replace(/\/$/, '') : `https://${domain.replace(/\/$/, '')}`;
}

export function buildDecisions(detection, config = {}) {
  const decisions = [];
  const hosts = detection.hosts || [];
  const surfaces = new Set(detection.surfaces || []);

  if (hosts.some((h) => ['lovable', 'bolt', 'replit', 'netlify'].includes(h.id))) {
    const names = hosts.map((h) => h.name).join(', ');
    decisions.push({
      topic: 'Hosting preservation',
      choice: `Keep existing deployment on ${names}`,
      why: 'Avoids duplicating a working deployment while still applying security, legal, monitoring, and release checks.',
    });
  } else {
    if (surfaces.has(SURFACES.WEB_APP)) {
      decisions.push({
        topic: 'Web app hosting',
        choice: 'Vercel',
        why: 'Provides zero-config SSR/SPA previews per branch and free hobby hosting (upgrade to Pro $20/mo/seat once commercial).',
      });
    }
    if (surfaces.has(SURFACES.SITE)) {
      decisions.push({
        topic: 'Static site hosting',
        choice: 'Cloudflare Pages',
        why: 'Free unlimited bandwidth, branch previews, custom DNS, and `_headers` security header support.',
      });
    }
    if (surfaces.has(SURFACES.SERVICE)) {
      const hasWorker = detection.stacks.some((s) => s.id === 'cloudflare-worker' || (s.id === 'hono' && !detection.files?.hasDocker));
      decisions.push({
        topic: 'Backend service hosting',
        choice: hasWorker ? 'Cloudflare Workers' : 'Google Cloud Run',
        why: hasWorker
          ? 'Edge runtime fits Worker/Hono apps on free tier with isolated staging Worker.'
          : 'Container/Node/Go/Python services run cleanly on Cloud Run free tier with scale-to-zero.',
      });
    }
  }

  if (surfaces.has(SURFACES.IOS)) {
    decisions.push({
      topic: 'iOS release pipeline',
      choice: 'TestFlight on staging/test branch; App Store upload on release tag',
      why: 'Gets builds to testers quickly while holding public store submission behind explicit tag approval.',
    });
  }
  if (surfaces.has(SURFACES.ANDROID)) {
    decisions.push({
      topic: 'Android tester distribution',
      choice: 'Firebase App Distribution + signed release AAB',
      why: 'Distributes testable builds immediately while preserving Google Play AABs and tracking the 14-day/12-tester closed test rule.',
    });
  }
  if (surfaces.has(SURFACES.MACOS_DMG)) {
    decisions.push({
      topic: 'macOS distribution',
      choice: 'Signed, Apple-notarized, stapled DMG + Sparkle appcast',
      why: 'Prevents Gatekeeper warnings on macOS and delivers signed self-updates with release notes.',
    });
  }
  if (detection.recognisedOnlyStacks?.length) {
    decisions.push({
      topic: 'Recognized-only stacks',
      choice: `Score only (${detection.recognisedOnlyStacks.map((s) => s.name).join(', ')})`,
      why: 'ShipLaunchpad grades these against the 50-item checklist in Mission Control without writing unsupported deploy workflows.',
    });
  }

  decisions.push({
    topic: 'Environments',
    choice: config.staging === false || config.staging === 'false' ? 'Production only' : 'Staging beside Production',
    why: 'Separates test traffic, auth redirects, and test payment webhooks from live customers.',
  });

  return decisions;
}

function vercelWorkflow(appName, hasTests, hasStaging) {
  return `name: ShipLaunchpad Web (Vercel)

on:
  push:
    branches: [main${hasStaging ? ', staging' : ''}]
  pull_request:

jobs:
  verify-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
${hasTests ? '      - run: npm test\n' : ''}      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npx --yes vercel@latest pull --yes --environment=\${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }} --token="$VERCEL_TOKEN"
          npx --yes vercel@latest build \${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token="$VERCEL_TOKEN"
          npx --yes vercel@latest deploy --prebuilt \${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token="$VERCEL_TOKEN"
`;
}

function cloudflarePagesWorkflow(appName, buildCmd = 'npm run build', outDir = 'dist') {
  return `name: ShipLaunchpad Static Site (Cloudflare Pages)

on:
  push:
    branches: [main, staging]
  pull_request:

jobs:
  deploy-pages:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - name: Build static site
        run: |
          if [ -f package.json ]; then npm ci && ${buildCmd}; fi
      - name: Publish to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy ${outDir} --project-name=${appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}
`;
}

function cloudflareWorkerWorkflow(hasTests, hasStaging) {
  return `name: ShipLaunchpad Backend (Cloudflare Workers)

on:
  push:
    branches: [main${hasStaging ? ', staging' : ''}]

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: if [ -f package.json ]; then npm ci; fi
${hasTests ? '      - run: if [ -f package.json ]; then npm test; fi\n' : ''}      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: \${{ github.ref == 'refs/heads/main' && 'deploy' || 'deploy --env staging' }}
`;
}

function cloudRunWorkflow(appName, hasTests, hasStaging) {
  const svc = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `name: ShipLaunchpad Backend (Google Cloud Run)

on:
  push:
    branches: [main${hasStaging ? ', staging' : ''}]

jobs:
  deploy-cloud-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${hasTests ? '      - run: if [ -f package.json ]; then npm ci && npm test; fi\n' : ''}      - uses: google-github-actions/auth@v2
        with:
          credentials_json: \${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Build and Deploy to Cloud Run
        run: |
          ENV_SUFFIX=\${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
          gcloud run deploy ${svc}-$ENV_SUFFIX \\
            --source . \\
            --region \${{ vars.GCP_REGION || 'us-central1' }} \\
            --allow-unauthenticated
`;
}

function iosWorkflow(appName) {
  return `name: ShipLaunchpad iOS (TestFlight & App Store)

on:
  push:
    branches: [staging]
    tags: ['v*']

jobs:
  build-ios:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - name: Select Xcode & install Apple API key
        env:
          APP_STORE_CONNECT_API_KEY_ID: \${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_ISSUER_ID: \${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          APP_STORE_CONNECT_KEY_B64: \${{ secrets.APP_STORE_CONNECT_KEY_B64 }}
        run: |
          mkdir -p ~/.appstoreconnect/private_keys
          echo "$APP_STORE_CONNECT_KEY_B64" | base64 --decode > ~/.appstoreconnect/private_keys/AuthKey_\${APP_STORE_CONNECT_API_KEY_ID}.p8
      - name: Build & Upload Archive for ${appName}
        run: |
          echo "Configure scheme and ExportOptions.plist in .shiplaunchpad/ios/ before running xcodebuild archive/exportArchive."
          echo "On staging push -> TestFlight; on v* tag -> App Store Connect release upload (manual submit for review)."
`;
}

function androidWorkflow() {
  return `name: ShipLaunchpad Android (Firebase App Distribution & Signed AAB)

on:
  push:
    branches: [main, staging]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Decode Release Keystore & Build Signed AAB/APK
        env:
          ANDROID_KEYSTORE_B64: \${{ secrets.ANDROID_KEYSTORE_B64 }}
          ANDROID_KEYSTORE_PASS: \${{ secrets.ANDROID_KEYSTORE_PASS }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASS: \${{ secrets.ANDROID_KEY_PASS }}
        run: |
          if [ -f android/gradlew ]; then cd android; fi
          ./gradlew bundleRelease assembleRelease
      - name: Upload AAB Artifact (for Google Play Console)
        uses: actions/upload-artifact@v4
        with:
          name: android-release-aab
          path: '**/build/outputs/bundle/release/*.aab'
      - name: Distribute to Testers via Firebase App Distribution
        if: \${{ secrets.FIREBASE_APP_ID != '' }}
        uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: \${{ secrets.FIREBASE_APP_ID }}
          serviceCredentialsFileContent: \${{ secrets.FIREBASE_SERVICE_CREDENTIALS }}
          groups: testers
          file: app/build/outputs/apk/release/app-release.apk
`;
}

function macosDmgWorkflow(appName) {
  return `name: ShipLaunchpad macOS (Signed Notarized DMG + Sparkle)

on:
  push:
    tags: ['v*']

jobs:
  release-macos-dmg:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - name: Sign, Notarize, Staple & Update Sparkle Appcast
        env:
          DEVELOPER_ID_CERT_B64: \${{ secrets.DEVELOPER_ID_CERT_B64 }}
          DEVELOPER_ID_CERT_PASS: \${{ secrets.DEVELOPER_ID_CERT_PASS }}
          APPLE_ID: \${{ secrets.APPLE_ID }}
          APPLE_TEAM_ID: \${{ secrets.APPLE_TEAM_ID }}
          APPLE_APP_PASSWORD: \${{ secrets.APPLE_APP_PASSWORD }}
          SPARKLE_ED_PRIVATE_KEY: \${{ secrets.SPARKLE_ED_PRIVATE_KEY }}
        run: |
          echo "1. Archive ${appName}.app with Developer ID Application signing"
          echo "2. Create DMG with hdiutil create && codesign --timestamp --sign 'Developer ID Application'"
          echo "3. Submit with xcrun notarytool submit --wait && xcrun stapler staple"
          echo "4. Sign update and regenerate appcast.xml with Sparkle generate_appcast"
      - name: Upload DMG & Appcast Artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg-release
          path: '*.dmg'
`;
}

function uptimeWorkflow(url) {
  return `name: ShipLaunchpad Uptime Alert

on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  healthcheck:
    runs-on: ubuntu-latest
    steps:
      - name: Probe Production URL
        run: |
          STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "${url}")
          echo "HTTP status: $STATUS"
          test "$STATUS" -ge 200 -a "$STATUS" -lt 400
`;
}

function generateLegalPages(appName, domainUrl, supportEmail) {
  const email = supportEmail || `support@${new URL(domainUrl).hostname}`;
  const privacy = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy — ${appName}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.25rem;line-height:1.6">
  <h1>Privacy Policy for ${appName}</h1>
  <p><strong>Effective date:</strong> ${new Date().toISOString().slice(0, 10)}</p>
  <p>${appName} respects your privacy. This policy explains what data is collected, how it is used, how long it is kept, and how you can request deletion.</p>
  <h2>Data We Collect</h2>
  <p>We collect only the information strictly required to operate ${appName} (for example, account details you provide, crash diagnostics, and cookieless aggregate usage metrics).</p>
  <h2>Third-Party Services</h2>
  <p>Where enabled, infrastructure providers (hosting, payments, crash reporting, and analytics) process only the fields required to deliver the service.</p>
  <h2>Data Retention &amp; Deletion</h2>
  <p>You may delete your account and associated personal data inside the app or via our <a href="/delete-account.html">Account Deletion page</a>, or by emailing <a href="mailto:${email}">${email}</a>.</p>
</body>
</html>
`;
  const terms = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms of Service — ${appName}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.25rem;line-height:1.6">
  <h1>Terms of Service — ${appName}</h1>
  <p><strong>Effective date:</strong> ${new Date().toISOString().slice(0, 10)}</p>
  <p>By accessing or using ${appName} (${domainUrl}), you agree to use the service lawfully and not abuse automated rate limits or attempt unauthorized access.</p>
  <h2>Contact</h2>
  <p>Questions? Contact <a href="mailto:${email}">${email}</a>.</p>
</body>
</html>
`;
  const support = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Support — ${appName}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.25rem;line-height:1.6">
  <h1>${appName} Support</h1>
  <p>Need help with your account, billing, or a bug report?</p>
  <p>Email us at <a href="mailto:${email}">${email}</a> and we will respond promptly.</p>
  <p>Looking to delete your account and personal data? Visit <a href="/delete-account.html">Account Deletion</a>.</p>
</body>
</html>
`;
  const deleteAccount = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Delete Account — ${appName}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1.25rem;line-height:1.6">
  <h1>Delete Your ${appName} Account</h1>
  <p>You can permanently delete your ${appName} account and personal data inside the app under <strong>Settings &rarr; Account &rarr; Delete Account</strong>.</p>
  <p>If you already uninstalled the app, email <a href="mailto:${email}?subject=Account%20Deletion%20Request">${email}</a> from your account email address. Active App Store or Google Play subscriptions must also be cancelled in your store subscription settings.</p>
</body>
</html>
`;
  return { privacy, terms, support, deleteAccount };
}

function generateLandingPage(appName, domainUrl, supportEmail) {
  const email = supportEmail || `support@${new URL(domainUrl).hostname}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${appName} — Launch Page</title>
  <meta name="description" content="${appName} — Built for fast, reliable production workflows.">
  <meta property="og:title" content="${appName}">
  <meta property="og:description" content="${appName} — Ready for real users.">
  <meta property="og:url" content="${domainUrl}">
  <style>
    :root { --bg:#0b1020; --fg:#f1f5f9; --muted:#94a3b8; --acc:#38bdf8; --card:#131a2f; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--fg); line-height:1.6; }
    .wrap { max-width:960px; margin:0 auto; padding:4rem 1.5rem; }
    .hero { text-align:center; padding:3rem 0; }
    h1 { font-size:clamp(2rem,5vw,3.5rem); margin:.5rem 0; letter-spacing:-.03em; }
    .sub { color:var(--muted); max-width:600px; margin:0 auto 2rem; font-size:1.125rem; }
    .cta { display:inline-block; background:var(--acc); color:#08101e; padding:.85rem 1.75rem; border-radius:999px; font-weight:700; text-decoration:none; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1.25rem; margin-top:3rem; }
    .card { background:var(--card); border:1px solid #1e293b; border-radius:16px; padding:1.5rem; }
    footer { margin-top:4rem; border-top:1px solid #1e293b; padding-top:1.5rem; display:flex; gap:1.5rem; flex-wrap:wrap; color:var(--muted); font-size:.9rem; }
    footer a { color:var(--muted); }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>${appName}</h1>
      <p class="sub">Explain the single sharpest problem ${appName} solves in one clear sentence.</p>
      <a class="cta" href="#start">Get Started</a>
    </section>
    <section class="grid" id="features">
      <article class="card"><h3>Fast Onboarding</h3><p>Highlight the primary outcome users achieve within the first 60 seconds.</p></article>
      <article class="card"><h3>Private &amp; Reliable</h3><p>Backed by strict data controls, uptime monitoring, and clear support.</p></article>
      <article class="card"><h3>Transparent Pricing</h3><p>Simple plans with no surprise fees.</p></article>
    </section>
    <footer>
      <span>&copy; ${new Date().getFullYear()} ${appName}</span>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
      <a href="/support.html">Support (${email})</a>
      <a href="/delete-account.html">Delete Account</a>
    </footer>
  </main>
</body>
</html>
`;
}

function generatePrivacyManifestPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;
}

function generateHeadersFiles(surfaces) {
  const files = [];
  if (surfaces.has(SURFACES.WEB_APP)) {
    files.push({
      relPath: 'vercel.json',
      content: JSON.stringify(
        {
          headers: [
            {
              source: '/(.*)',
              headers: [
                { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              ],
            },
          ],
        },
        null,
        2
      ) + '\n',
    });
  }
  if (surfaces.has(SURFACES.SITE)) {
    files.push({
      relPath: 'public/_headers',
      content: `/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`,
    });
  }
  return files;
}

/**
 * Plans all generated production files for the detected stacks & user flags.
 */
export function planGeneratedFiles(detection, config = {}, options = {}) {
  const planned = [];
  const surfaces = new Set(detection.surfaces || []);
  const hosts = new Set((detection.hosts || []).map((h) => h.id));
  const preservedExternalBuilder = ['lovable', 'bolt', 'replit', 'netlify'].some((id) => hosts.has(id));
  const hasStaging = config.staging !== false && config.staging !== 'false';
  const domainUrl = sanitizeDomain(config.domain, detection.name);
  const hasTests = Boolean(detection.files?.hasTests);
  const force = Boolean(options.force);

  // CI/CD workflows (only for deployable stacks, and preserve external hosts unless --force)
  if (!preservedExternalBuilder || force) {
    if (surfaces.has(SURFACES.WEB_APP) && !hosts.has('vercel')) {
      planned.push({
        relPath: '.github/workflows/shiplaunchpad-web-vercel.yml',
        content: vercelWorkflow(detection.name, hasTests, hasStaging),
        force,
        allowCreateOrUpdate: true,
      });
    }
    if (surfaces.has(SURFACES.SITE)) {
      const siteStack = detection.deployableStacks.find((s) => s.surfaces.includes(SURFACES.SITE));
      const outDir = siteStack?.id === 'hugo' || siteStack?.id === 'zola' ? 'public' : siteStack?.id === 'jekyll' || siteStack?.id === 'eleventy' ? '_site' : siteStack?.id === 'docusaurus' ? 'build' : '.';
      planned.push({
        relPath: '.github/workflows/shiplaunchpad-site-cloudflare.yml',
        content: cloudflarePagesWorkflow(detection.name, 'npm run build', outDir),
        force,
        allowCreateOrUpdate: true,
      });
    }
    if (surfaces.has(SURFACES.SERVICE)) {
      const useWorkers = detection.deployableStacks.some((s) => s.id === 'cloudflare-worker') || hosts.has('cloudflare-workers');
      planned.push({
        relPath: useWorkers ? '.github/workflows/shiplaunchpad-worker.yml' : '.github/workflows/shiplaunchpad-cloud-run.yml',
        content: useWorkers ? cloudflareWorkerWorkflow(hasTests, hasStaging) : cloudRunWorkflow(detection.name, hasTests, hasStaging),
        force,
        allowCreateOrUpdate: true,
      });
    }
  }

  if (surfaces.has(SURFACES.IOS)) {
    planned.push({
      relPath: '.github/workflows/shiplaunchpad-ios.yml',
      content: iosWorkflow(detection.name),
      force,
      allowCreateOrUpdate: true,
    });
    if (!detection.files?.hasPrivacyManifest) {
      planned.push({
        relPath: 'ios/PrivacyInfo.xcprivacy',
        content: generatePrivacyManifestPlist(),
        force,
        allowCreateOrUpdate: false,
      });
    }
  }
  if (surfaces.has(SURFACES.ANDROID)) {
    planned.push({
      relPath: '.github/workflows/shiplaunchpad-android.yml',
      content: androidWorkflow(),
      force,
      allowCreateOrUpdate: true,
    });
  }
  if (surfaces.has(SURFACES.MACOS_DMG)) {
    planned.push({
      relPath: '.github/workflows/shiplaunchpad-macos-dmg.yml',
      content: macosDmgWorkflow(detection.name),
      force,
      allowCreateOrUpdate: true,
    });
  }

  // Uptime alert workflow for web/site/service/macOS
  if (surfaces.has(SURFACES.WEB_APP) || surfaces.has(SURFACES.SITE) || surfaces.has(SURFACES.SERVICE) || surfaces.has(SURFACES.MACOS_DMG)) {
    planned.push({
      relPath: '.github/workflows/shiplaunchpad-uptime.yml',
      content: uptimeWorkflow(domainUrl),
      force,
      allowCreateOrUpdate: true,
    });
  }

  // Security headers (default on apply or --headers)
  if ((options.headers !== false) && !detection.files?.hasSecurityHeaders) {
    for (const hf of generateHeadersFiles(surfaces)) {
      planned.push({ ...hf, force, allowCreateOrUpdate: false });
    }
  }

  // Legal pages (when --legal or missing on store/web projects)
  const wantLegal = options.legal || !detection.files?.hasPrivacyPolicy || !detection.files?.hasTerms || !detection.files?.hasSupportPage;
  if (wantLegal) {
    const baseDir = surfaces.has(SURFACES.WEB_APP) || surfaces.has(SURFACES.SITE) ? 'public' : 'site';
    const pages = generateLegalPages(detection.name, domainUrl, config.supportEmail);
    if (!detection.files?.hasPrivacyPolicy) planned.push({ relPath: `${baseDir}/privacy.html`, content: pages.privacy, force, allowCreateOrUpdate: false });
    if (!detection.files?.hasTerms) planned.push({ relPath: `${baseDir}/terms.html`, content: pages.terms, force, allowCreateOrUpdate: false });
    if (!detection.files?.hasSupportPage) planned.push({ relPath: `${baseDir}/support.html`, content: pages.support, force, allowCreateOrUpdate: false });
    if (!detection.files?.hasDeletionPage) planned.push({ relPath: `${baseDir}/delete-account.html`, content: pages.deleteAccount, force, allowCreateOrUpdate: false });
  }

  // Landing page (when --landing or missing)
  if (options.landing || (!detection.files?.hasLandingPage && surfaces.size > 0)) {
    const baseDir = surfaces.has(SURFACES.WEB_APP) || surfaces.has(SURFACES.SITE) ? 'public' : 'site';
    planned.push({
      relPath: `${baseDir}/landing.html`,
      content: generateLandingPage(detection.name, domainUrl, config.supportEmail),
      force,
      allowCreateOrUpdate: false,
    });
  }

  return planned;
}
