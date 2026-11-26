# ShipLaunchpad

Open, local-first production launch plugin for Antigravity, inspired by the full feature set of [shiplaunchpad.com](https://shiplaunchpad.com) and built with zero runtime dependencies (Node.js >= 20).

## Features

- **60-Stack Detection & Scoring**: Auto-detects **40 deployable stacks** across 6 app surfaces (`iOS`, `Android`, `macOS DMG`, `Web app`, `Static site`, `Backend service`) plus **20 recognized & scored stacks**, **21 existing hosts/app builders** (Lovable, Bolt, Replit, Netlify, Vercel, Cloudflare, etc.), and **17 pay-per-use / backend / auth / payment services**.
- **50-Item Production Readiness Checklist** across all 8 categories:
  1. Live on the web (6)
  2. App stores and downloads (10)
  3. Security and data (7)
  4. See how it is used (4)
  5. Legal and trust (3)
  6. Payments and costs (6)
  7. Builds and releases (6)
  8. Mission Control and safety (8)
- **CI/CD & Store Pipeline Generation**: Writes `.github/workflows/shiplaunchpad-*.yml` for Vercel, Cloudflare Pages, Cloudflare Workers, Google Cloud Run, iOS TestFlight/App Store, Android Firebase App Distribution + signed AAB, and macOS signed/notarized DMG + Sparkle appcast.
- **Pre-Flight Security & App Review Audit**: Checks secret leaks in code/bundles, HTTP security headers, Supabase RLS / Firebase rules, `localhost` auth redirects, Vercel Hobby commercial use, Apple App Review traps (5.1.1(v) account deletion, 4.8 Sign in with Apple, 2.1 demo account, 5.1.2 AI consent, permission strings, `PrivacyInfo.xcprivacy`), and Google Play 12-testers / 14-day closed testing tracker.
- **OS Keychain & Encrypted Vault**: Stores secrets via macOS Keychain (`security`) or AES-256-GCM encrypted file (`~/.shiplaunchpad/vault.enc`), never in git or `.env`.
- **Official Cost & Wait-Time Calculator**: Computes upfront fees, recurring fees, metered spend-cap targets, and store/D-U-N-S/14-day wait timelines.
- **Safe Snapshots & Undo**: Every write creates a snapshot under `.shiplaunchpad/snapshots/` and `shiplaunchpad undo` restores generated files while preserving files you edited afterward.
- **Mission Control Dashboard**: Local-only server on `http://127.0.0.1:4747` displaying all onboarded projects, readiness scores, interactive 50-item checklists, 14-day Play closed-test countdown, cost breakdown, and manual action queue.

## Skills

- `/ship-onboard` — Inspect repository, answer onboarding questions, preview plan, and wire production setup.
- `/ship-setup` — Add surfaces, configure staging, payments (Stripe, RevenueCat, Lemon Squeezy), custom domain, or re-sync workflows.
- `/ship-status` — Read-only stack detection, 50-item scorecard, and audit report.
- `/ship-release` — Run pre-release checks, bump version, tag release, and guide store submission.
- `/ship-doctor` — Print redacted diagnostic report and troubleshoot CI, signing, or vault issues.
- `/ship-dashboard` — Launch Mission Control (`http://127.0.0.1:4747`).
- `/ship-cost` — Run interactive launch cost, recurring fee, and wait-time calculator.
- `/ship-undo` — Roll back last generated changes safely or manage manual tasks.

## Install

### Antigravity

```bash
git clone https://github.com/slee62312-commits/Startup.git
agy plugin install ./Startup
```

### Claude Code

```text
/plugin marketplace add slee62312-commits/Startup
/plugin install shiplaunchpad@shiplaunchpad
```

### CLI & Tests

```bash
npm test
node ./bin/shiplaunchpad.mjs help
```
