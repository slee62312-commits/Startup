import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DETECTABLE_SERVICES, HOSTS_AND_BUILDERS, STACK_BY_ID, SURFACES } from '../catalog/stacks.mjs';

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.astro',
  'dist',
  'build',
  'out',
  '.dart_tool',
  'Pods',
  'DerivedData',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.shiplaunchpad',
  '.launchpad',
]);

function readTextSafe(filePath, maxBytes = 256_000) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > maxBytes) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function walkFiles(rootDir, maxDepth = 4, maxFiles = 1200) {
  const results = [];
  function walk(dir, depth) {
    if (depth > maxDepth || results.length >= maxFiles) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile()) {
        results.push({ full, rel, name: entry.name });
      }
    }
  }
  walk(rootDir, 0);
  return results;
}

function findCandidateRoots(repoRoot) {
  const roots = [repoRoot];
  for (const sub of ['apps', 'packages', 'services']) {
    const subDir = path.join(repoRoot, sub);
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      for (const entry of fs.readdirSync(subDir, { withFileTypes: true })) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          roots.push(path.join(subDir, entry.name));
        }
      }
    }
  }
  for (const single of ['web', 'frontend', 'client', 'site', 'docs', 'api', 'server', 'backend', 'mobile', 'app', 'ios', 'android', 'macos']) {
    const p = path.join(repoRoot, single);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      roots.push(p);
    }
  }
  return [...new Set(roots)];
}

function detectStackAtDir(dir, relDir, repoFiles) {
  const found = [];
  const exists = (f) => fs.existsSync(path.join(dir, f));
  const pkg = readJsonSafe(path.join(dir, 'package.json'));
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const hasDep = (d) => Object.prototype.hasOwnProperty.call(deps, d);
  const add = (id, evidence) => {
    const stack = STACK_BY_ID[id];
    if (stack) found.push({ ...stack, path: relDir || '.', evidence });
  };

  // Mobile / Cross-platform
  if (exists('pubspec.yaml')) {
    const pub = readTextSafe(path.join(dir, 'pubspec.yaml'));
    if (/\bflutter\s*:/i.test(pub)) add('flutter', 'pubspec.yaml');
  }
  if (exists('app.json') || exists('app.config.js') || exists('app.config.ts') || hasDep('expo')) {
    const appJson = readJsonSafe(path.join(dir, 'app.json'));
    if (hasDep('expo') || appJson?.expo) {
      add('expo', hasDep('expo') ? 'package.json (expo)' : 'app.json (expo)');
    }
  }
  if (hasDep('@capacitor/core') || exists('capacitor.config.ts') || exists('capacitor.config.json')) {
    add('capacitor', 'capacitor config / @capacitor/core');
  }
  if (hasDep('react-native') && !hasDep('expo')) {
    add('react-native', 'package.json (react-native)');
  }

  // Native Apple (Xcode)
  const dirEntries = (() => {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  })();
  const xcodeItems = dirEntries.filter((n) => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace'));
  if (xcodeItems.length > 0 && !found.some((f) => ['flutter', 'react-native', 'expo', 'capacitor'].includes(f.id))) {
    const pbx = xcodeItems
      .map((x) => readTextSafe(path.join(dir, x, 'project.pbxproj')))
      .join('\n');
    const isMac = /SDKROOT = macosx|SUPPORTED_PLATFORMS = .*macosx/i.test(pbx) || relDir === 'macos';
    const isIos = /SDKROOT = iphoneos|SUPPORTED_PLATFORMS = .*iphone/i.test(pbx) || !isMac;
    if (isMac) add('macos', xcodeItems[0]);
    if (isIos && (!isMac || /iphone/i.test(pbx))) add('ios-native', xcodeItems[0]);
  }
  if (exists('Package.swift') && xcodeItems.length === 0) {
    add('swift-package', 'Package.swift');
  }

  // Native Android (Kotlin/Java)
  const hasGradle = exists('build.gradle') || exists('build.gradle.kts') || exists('app/build.gradle') || exists('app/build.gradle.kts');
  if (hasGradle && !found.some((f) => ['flutter', 'react-native', 'expo', 'capacitor'].includes(f.id))) {
    const gradle = readTextSafe(path.join(dir, 'app/build.gradle')) + readTextSafe(path.join(dir, 'app/build.gradle.kts')) + readTextSafe(path.join(dir, 'build.gradle'));
    if (/com\.android\.application|android\s*\{/i.test(gradle) || exists('app/src/main/AndroidManifest.xml')) {
      add('android-native', 'Gradle Android app');
    } else if (/kotlin|java/i.test(gradle)) {
      add('jvm', 'Gradle JVM project');
    }
  }

  // Desktop frameworks
  if (exists('src-tauri/tauri.conf.json') || hasDep('@tauri-apps/api') || hasDep('@tauri-apps/cli')) {
    add('tauri', 'tauri.conf.json / @tauri-apps');
  }
  if (hasDep('electron') || hasDep('electron-builder')) {
    add('electron', 'package.json (electron)');
  }

  // Browser extension
  const manifest = readJsonSafe(path.join(dir, 'manifest.json')) || readJsonSafe(path.join(dir, 'public/manifest.json'));
  if (manifest?.manifest_version === 2 || manifest?.manifest_version === 3) {
    add('browser-extension', `manifest.json (v${manifest.manifest_version})`);
  }

  // Static site generators
  if (exists('hugo.toml') || exists('hugo.yaml') || exists('hugo.json') || (exists('config.toml') && exists('layouts'))) {
    add('hugo', 'Hugo config');
  }
  if (exists('_config.yml') && (exists('Gemfile') && /jekyll/i.test(readTextSafe(path.join(dir, 'Gemfile'))))) {
    add('jekyll', '_config.yml + Gemfile');
  }
  if (exists('.eleventy.js') || exists('eleventy.config.js') || exists('eleventy.config.mjs') || hasDep('@11ty/eleventy')) {
    add('eleventy', 'Eleventy config');
  }
  if (exists('mkdocs.yml')) add('mkdocs', 'mkdocs.yml');
  if (exists('config.toml') && exists('templates') && exists('content')) {
    const cfg = readTextSafe(path.join(dir, 'config.toml'));
    if (/base_url|compile_sass/i.test(cfg)) add('zola', 'Zola config.toml');
  }
  if (hasDep('@docusaurus/core') || exists('docusaurus.config.js') || exists('docusaurus.config.ts')) {
    add('docusaurus', 'Docusaurus config');
  }

  // Web apps (Vercel) & Astro static vs web
  if (hasDep('next') || exists('next.config.js') || exists('next.config.mjs') || exists('next.config.ts')) {
    add('nextjs', 'next dependency/config');
  } else if (hasDep('nuxt') || exists('nuxt.config.ts') || exists('nuxt.config.js')) {
    add('nuxt', 'nuxt dependency/config');
  } else if (hasDep('@sveltejs/kit') || exists('svelte.config.js')) {
    add('sveltekit', '@sveltejs/kit');
  } else if (hasDep('astro') || exists('astro.config.mjs') || exists('astro.config.ts')) {
    const astroCfg = readTextSafe(path.join(dir, 'astro.config.mjs')) + readTextSafe(path.join(dir, 'astro.config.ts'));
    if (/output:\s*['"](server|hybrid)['"]|adapter:/i.test(astroCfg)) {
      add('astro-web', 'astro.config (SSR/adapter)');
    } else {
      add('astro', 'astro.config (static)');
    }
  } else if (hasDep('@tanstack/react-start') || hasDep('@tanstack/start')) {
    add('tanstack-start', '@tanstack/start');
  } else if (hasDep('@remix-run/react') || hasDep('@remix-run/node')) {
    add('remix', '@remix-run');
  } else if (hasDep('@react-router/dev') || hasDep('@react-router/node')) {
    add('react-router', '@react-router/dev');
  } else if (hasDep('@angular/core') || exists('angular.json')) {
    add('angular', 'angular.json / @angular/core');
  } else if (hasDep('@builder.io/qwik')) {
    add('qwik', '@builder.io/qwik');
  } else if (hasDep('solid-start') || hasDep('@solidjs/start')) {
    add('solidstart', 'solid-start');
  } else if (hasDep('gatsby') || exists('gatsby-config.js') || exists('gatsby-config.ts')) {
    add('gatsby', 'gatsby');
  } else if (hasDep('react-scripts')) {
    add('cra', 'react-scripts');
  } else if (hasDep('vite') && !found.some((f) => ['tauri', 'electron', 'capacitor'].includes(f.id))) {
    add('vite', 'vite');
  }

  // Backend services
  if (exists('wrangler.toml') || exists('wrangler.json') || exists('wrangler.jsonc') || hasDep('wrangler')) {
    if (hasDep('hono')) add('hono', 'hono + wrangler');
    else if (hasDep('itty-router')) add('itty-router', 'itty-router + wrangler');
    else add('cloudflare-worker', 'wrangler config');
  } else {
    if (hasDep('hono')) add('hono', 'package.json (hono)');
    if (hasDep('itty-router')) add('itty-router', 'package.json (itty-router)');
  }
  if (hasDep('express')) add('express', 'package.json (express)');
  if (hasDep('fastify')) add('fastify', 'package.json (fastify)');
  if (hasDep('@nestjs/core')) add('nestjs', 'package.json (@nestjs/core)');
  if (hasDep('koa')) add('koa', 'package.json (koa)');
  if (hasDep('@hapi/hapi')) add('hapi', 'package.json (@hapi/hapi)');
  if (hasDep('elysia')) add('elysia', 'package.json (elysia)');

  // Wasp / Deno / WordPress / Rails / Laravel / Phoenix / Django / Python / Go / Rust / .NET / JVM / Node CLI / Node package
  if (exists('main.wasp')) add('wasp', 'main.wasp');
  if (exists('deno.json') || exists('deno.jsonc')) add('deno', 'deno.json');
  if (exists('wp-config.php') || exists('wp-content')) add('wordpress', 'wp-config.php / wp-content');
  if (exists('Gemfile')) {
    const gemfile = readTextSafe(path.join(dir, 'Gemfile'));
    if (/\brails\b/i.test(gemfile)) add('rails', 'Gemfile (rails)');
    else if (dirEntries.some((n) => n.endsWith('.gemspec'))) add('ruby-gem', '*.gemspec');
  }
  if (exists('composer.json') && /laravel\/framework/i.test(readTextSafe(path.join(dir, 'composer.json')))) {
    add('laravel', 'composer.json (laravel/framework)');
  }
  if (exists('mix.exs')) {
    const mix = readTextSafe(path.join(dir, 'mix.exs'));
    if (/:phoenix\b/i.test(mix)) add('phoenix', 'mix.exs (:phoenix)');
    else add('elixir', 'mix.exs');
  }
  if (exists('Cargo.toml') && !found.some((f) => f.id === 'tauri')) {
    add('rust', 'Cargo.toml');
  }
  if (exists('go.mod')) {
    const goFiles = repoFiles.filter((f) => f.rel.startsWith(relDir ? `${relDir}/` : '') && f.name.endsWith('.go'));
    const goText = goFiles.slice(0, 12).map((f) => readTextSafe(f.full)).join('\n');
    if (/net\/http|gin-gonic|labstack\/echo|gofiber\/fiber|go-chi\/chi/i.test(goText)) {
      add('go-service', 'go.mod + HTTP server');
    } else {
      add('go', 'go.mod');
    }
  }
  if (exists('pyproject.toml') || exists('requirements.txt') || exists('manage.py')) {
    const pyMeta = readTextSafe(path.join(dir, 'pyproject.toml')) + readTextSafe(path.join(dir, 'requirements.txt'));
    if (exists('manage.py') || /\bdjango\b/i.test(pyMeta)) {
      add('django', 'manage.py / django');
    } else if (/fastapi|flask|uvicorn|gunicorn|starlette|litestar|aiohttp/i.test(pyMeta)) {
      add('python-service', 'Python web dependencies');
    } else {
      add('python', 'pyproject.toml / requirements.txt');
    }
  }
  if (dirEntries.some((n) => n.endsWith('.csproj') || n.endsWith('.sln'))) add('dotnet', '.csproj/.sln');
  if ((exists('pom.xml') || hasGradle) && !found.some((f) => ['android-native', 'jvm'].includes(f.id))) {
    add('jvm', exists('pom.xml') ? 'pom.xml' : 'Gradle');
  }
  if (exists('Dockerfile') && !found.some((f) => f.surfaces.includes(SURFACES.SERVICE))) {
    add('docker', 'Dockerfile');
  }

  // Fallback HTML site or Node CLI/Lib
  if (found.length === 0) {
    if (exists('index.html') && !pkg) {
      add('plain-html', 'index.html');
    } else if (pkg) {
      if (pkg.bin) add('node-cli', 'package.json (bin)');
      else add('node-lib', 'package.json');
    }
  }

  return found;
}

function detectHostsAndBuilders(repoRoot, files) {
  const byId = Object.fromEntries(HOSTS_AND_BUILDERS.map((h) => [h.id, h]));
  const found = new Map();
  const add = (id, evidence) => {
    if (!found.has(id) && byId[id]) found.set(id, { ...byId[id], evidence });
  };

  const relSet = new Set(files.map((f) => f.rel));
  const pkg = readJsonSafe(path.join(repoRoot, 'package.json'));
  const allDeps = JSON.stringify({ ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) });
  const textSample = files
    .filter((f) => /\.(json|toml|ya?ml|md|js|mjs|ts|tsx|html)$/i.test(f.name))
    .slice(0, 60)
    .map((f) => readTextSafe(f.full, 64_000))
    .join('\n');

  if (relSet.has('.lovable') || /lovable-tagger|lovable\.dev|gptengineer/i.test(allDeps + textSample)) add('lovable', 'lovable-tagger / project metadata');
  if (/stackblitz|webcontainer|bolt\.new/i.test(allDeps + textSample) || relSet.has('.bolt')) add('bolt', 'Bolt / WebContainer config');
  if (relSet.has('.replit') || relSet.has('replit.nix')) add('replit', '.replit');
  if (/v0\.dev|v0-generated/i.test(textSample)) add('v0', 'v0 markers');
  if (relSet.has('vercel.json') || relSet.has('.vercel/project.json')) add('vercel', 'vercel.json');
  if (relSet.has('netlify.toml') || relSet.has('_redirects')) add('netlify', 'netlify.toml');
  if (relSet.has('wrangler.toml') || relSet.has('wrangler.json') || relSet.has('wrangler.jsonc')) add('cloudflare-workers', 'wrangler config');
  if (/pages\.dev|cloudflare-pages/i.test(textSample)) add('cloudflare-pages', 'Cloudflare Pages config');
  if (relSet.has('firebase.json')) add('firebase-hosting', 'firebase.json');
  if (relSet.has('fly.toml')) add('fly-io', 'fly.toml');
  if (relSet.has('railway.json') || relSet.has('railway.toml')) add('railway', 'railway config');
  if (relSet.has('render.yaml')) add('render', 'render.yaml');
  if (relSet.has('Procfile') || relSet.has('app.json') && /heroku/i.test(readTextSafe(path.join(repoRoot, 'app.json')))) add('heroku', 'Procfile / Heroku');
  if (relSet.has('.do/app.yaml')) add('digitalocean', '.do/app.yaml');
  if (relSet.has('amplify.yml')) add('aws-amplify', 'amplify.yml');
  if (relSet.has('CNAME') || files.some((f) => /\.github\/workflows\/.*pages/i.test(f.rel))) add('github-pages', 'GitHub Pages workflow / CNAME');
  if (/surge\.sh/i.test(allDeps + textSample)) add('surge', 'surge');
  if (/deno\.land\/deploy|deployctl/i.test(textSample)) add('deno-deploy', 'Deno Deploy');
  if (/cloud\.run|run\.googleapis\.com/i.test(textSample)) add('cloud-run', 'Cloud Run config');
  if (relSet.has('eas.json')) add('eas', 'eas.json');
  if (relSet.has('staticwebapp.config.json')) add('azure-static', 'staticwebapp.config.json');

  return [...found.values()];
}

function detectServices(repoRoot, files) {
  const pkg = readJsonSafe(path.join(repoRoot, 'package.json'));
  const corpus = [
    JSON.stringify(pkg || {}),
    ...files
      .filter((f) => /\.(json|yaml|yml|toml|ts|tsx|js|jsx|mjs|py|go|dart|swift|kt|gradle|env\.example)$/i.test(f.name))
      .slice(0, 120)
      .map((f) => readTextSafe(f.full, 64_000)),
  ].join('\n');

  const rules = {
    supabase: /@supabase\/|supabase\.co|SUPABASE_URL/i,
    firebase: /\bfirebase\b|firebase\.google\.com|GoogleService-Info\.plist|google-services\.json/i,
    openai: /\bopenai\b|OPENAI_API_KEY|api\.openai\.com/i,
    anthropic: /@anthropic-ai|ANTHROPIC_API_KEY|api\.anthropic\.com/i,
    aws: /@aws-sdk|aws-sdk|boto3|AWS_ACCESS_KEY_ID/i,
    vercel: /vercel\.json|@vercel\//i,
    'cloudflare-workers': /wrangler\.toml|@cloudflare\/workers/i,
    'cloud-run': /cloud\.run|gcloud run/i,
    stripe: /\bstripe\b|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/i,
    revenuecat: /revenuecat|purchases_flutter|react-native-purchases|RevenueCat/i,
    'lemon-squeezy': /lemonsqueezy|@lemonsqueezy/i,
    resend: /\bresend\b|RESEND_API_KEY/i,
    sentry: /@sentry\/|sentry_flutter|SENTRY_DSN/i,
    posthog: /posthog-js|posthog_flutter|POSTHOG_KEY/i,
    'google-auth': /SignInWithGoogle|@react-native-google-signin|google_sign_in|accounts\.google\.com|GOOGLE_CLIENT_ID/i,
    turnstile: /challenges\.cloudflare\.com\/turnstile|TURNSTILE/i,
    upstash: /@upstash\/ratelimit|@upstash\/redis|UPSTASH_REDIS/i,
  };

  return DETECTABLE_SERVICES.filter((svc) => rules[svc.id]?.test(corpus));
}

function detectGitInfo(repoRoot) {
  try {
    const remote = execFileSync('git', ['-C', repoRoot, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const branch = execFileSync('git', ['-C', repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { hasGit: true, isGitHub: /github\.com/i.test(remote), remote, branch };
  } catch {
    return { hasGit: false, isGitHub: false, remote: null, branch: null };
  }
}

/**
 * Performs comprehensive repository detection across all 60 stacks, 21 hosts/builders, and 17 services.
 */
export function detectRepo(repoRoot) {
  const absRoot = path.resolve(repoRoot);
  const files = walkFiles(absRoot);
  const candidateDirs = findCandidateRoots(absRoot);

  const stackMatches = [];
  for (const dir of candidateDirs) {
    const rel = path.relative(absRoot, dir);
    for (const m of detectStackAtDir(dir, rel, files)) {
      stackMatches.push(m);
    }
  }

  // Deduplicate stack id + path
  const seenKey = new Set();
  const stacks = stackMatches.filter((s) => {
    const key = `${s.id}:${s.path}`;
    if (seenKey.has(key)) return false;
    seenKey.add(key);
    return true;
  });

  const surfaces = [...new Set(stacks.flatMap((s) => s.surfaces))];
  const hosts = detectHostsAndBuilders(absRoot, files);
  const services = detectServices(absRoot, files);
  const workflows = files.filter((f) => f.rel.startsWith(`.github${path.sep}workflows${path.sep}`) && /\.ya?ml$/i.test(f.name)).map((f) => f.rel);
  const pkg = readJsonSafe(path.join(absRoot, 'package.json'));

  const relNames = files.map((f) => f.rel.toLowerCase());
  const fileSignals = {
    hasPrivacyPolicy: relNames.some((r) => /privacy([-_]policy)?\.(html|md|tsx|jsx|astro|txt)$/.test(r) || r.includes('/privacy/')),
    hasTerms: relNames.some((r) => /terms([-_](of[-_]service|of[-_]use))?\.(html|md|tsx|jsx|astro|txt)$/.test(r) || r.includes('/terms/')),
    hasSupportPage: relNames.some((r) => /support\.(html|md|tsx|jsx)$/.test(r) || r.includes('/support/')),
    hasDeletionPage: relNames.some((r) => /(delete[-_]account|account[-_]deletion)\.(html|md|tsx|jsx)$/.test(r)),
    hasLandingPage: relNames.some((r) => /^(index|landing|public\/landing|site\/index)\.(html|astro)$/.test(r)) || stacks.some((s) => s.surfaces.includes(SURFACES.WEB_APP) || s.surfaces.includes(SURFACES.SITE)),
    hasSecurityHeaders: relNames.some((r) => r.endsWith('_headers') || r === 'vercel.json' && /headers/i.test(readTextSafe(path.join(absRoot, 'vercel.json')))),
    hasTests: Boolean(pkg?.scripts?.test && !/no test specified/i.test(pkg.scripts.test)) || relNames.some((r) => /(^|\/)(test|tests|__tests__|spec)\//.test(r) || /\.(test|spec)\.(mjs|js|ts|tsx|py|go|dart|swift)$/.test(r)),
    hasEnvExample: relNames.includes('.env.example') || relNames.includes('.env.template'),
    hasPrivacyManifest: relNames.some((r) => r.endsWith('privacyinfo.xcprivacy')),
    hasGitignore: relNames.includes('.gitignore'),
  };

  const git = detectGitInfo(absRoot);
  const name = pkg?.name || path.basename(absRoot);

  return {
    root: absRoot,
    name,
    version: pkg?.version || '0.1.0',
    stacks,
    deployableStacks: stacks.filter((s) => s.status === 'deploys'),
    recognisedOnlyStacks: stacks.filter((s) => s.status === 'recognised'),
    surfaces,
    hosts,
    services,
    workflows,
    files: fileSignals,
    git,
    scannedFileCount: files.length,
  };
}
