---
name: ship-onboard
description: End-to-end production launch onboarding for any repository. Detects all app surfaces across 60 stacks, runs the 50-item production readiness audit, asks only what cannot be inferred, previews every file change, generates CI/CD workflows, landing/legal pages, and security configurations, and registers the project on Mission Control. Use when the user asks to onboard, ship, launch, or productionize an app from scratch.
---

# ShipLaunchpad: Onboard

Run the ShipLaunchpad CLI from the installed plugin directory (or local repo `bin/shiplaunchpad.mjs`):

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Workflow

1. **Inspect existing state (read-only first)**:
   - If `.shiplaunchpad/STATUS.md` exists, read it first so you know what is already live, pending, or answered.
   - Run full detection and pre-flight audit without modifying files:
     ```bash
     node "$SHIP_CLI" detect --json
     node "$SHIP_CLI" audit --json
     ```
2. **Present what was found & calculate costs**:
   - Summarize detected surfaces (`iOS`, `Android`, `macOS DMG`, `Web app`, `Static site`, `Backend service`), frameworks, existing host/builder (e.g., Lovable, Bolt, Replit, Netlify, Vercel), and detected services (Supabase, Firebase, Stripe, RevenueCat, OpenAI, Anthropic, PostHog, Sentry).
   - Run the cost and wait-time estimator matching detected surfaces:
     ```bash
     node "$SHIP_CLI" cost --auto --json
     ```
   - Clearly display upfront store fees (Apple \$99/yr, Google Play \$25 once), recurring triggers (Vercel Pro \$20/mo/seat once commercial), metered APIs needing spend caps, and wait times (Google Play 12 testers / 14 days, D-U-N-S 5+2 business days, App Review 24–48h).
3. **Ask only missing onboarding questions**:
   - Check `node "$SHIP_CLI" questions --json` and ask the user in plain language only what could not be detected (e.g., custom domain, company vs individual store enrollment, whether the app takes payments, staging environment preference, contact/support email, bundle ID / team ID).
   - Save answers via:
     ```bash
     node "$SHIP_CLI" config set <key> <value>
     ```
4. **Confirm before side effects & preview changes**:
   - Run dry-run apply to list every file that will be created or updated:
     ```bash
     node "$SHIP_CLI" apply --dry-run
     ```
   - Confirm with the user before writing files. Never spend money, alter DNS, make private repos public, or upload to stores without explicit confirmation.
5. **Apply setup (creates snapshot for safe undo)**:
   - Execute:
     ```bash
     node "$SHIP_CLI" apply
     ```
   - Tell the user which files were created/updated (`.github/workflows/shiplaunchpad-*.yml`, `.shiplaunchpad/`, legal/landing templates if requested, security header config, `PrivacyInfo.xcprivacy` if iOS), and explain any secrets that must be stored via `vault set <KEY>` (never ask for secret values in chat!).
6. **Deep Security Pairing (REA_Skill)**:
   - For web apps/APIs or mobile apps, also recommend or invoke `rea-skills`'s `website-security-audit` or `rea-mobile-app-recovery` if deeper bundle or binary analysis is needed.
7. **Open Mission Control**:
   - Tell the user their app is registered in Mission Control and offer to launch `node "$SHIP_CLI" dashboard` (`http://127.0.0.1:4747`).
