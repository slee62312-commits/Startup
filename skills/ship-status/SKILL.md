---
name: ship-status
description: Read-only inspection of a repository's detected stacks (across 60 recognized frameworks), existing hosts/builders, 50-item production readiness score, pre-flight security & App Review findings, and remaining manual blockers. Never modifies files.
---

# ShipLaunchpad: Status & Readiness Scorecard

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Steps

1. Run read-only status & audit commands:
   ```bash
   node "$SHIP_CLI" status
   node "$SHIP_CLI" audit
   ```
   (Use `--json` if parsing structured scores or building a custom summary.)
2. Report clearly:
   - **Detected surfaces & stacks**: Distinguish **Deployable (40 stacks)** vs **Recognised & Scored only (20 stacks — no deploy pipeline)**.
   - **Existing host/builder preserved**: Note if Lovable, Bolt, Replit, Netlify, etc. is already configured.
   - **50-Item Checklist Score**: Breakdown across all 8 categories (*Live on the web*, *App stores and downloads*, *Security and data*, *See how it is used*, *Legal and trust*, *Payments and costs*, *Builds and releases*, *Mission Control and safety*).
   - **Critical & Warning Audit Findings**: Highlight leaked secrets, `localhost` auth redirect URLs, Vercel Hobby commercial violation, missing Supabase RLS / Firebase rules, missing account deletion or Sign in with Apple, missing permission usage strings or `PrivacyInfo.xcprivacy`, missing Stripe live webhook signature check, or unconfigured AI spend caps.
   - **Manual Queue & Waits**: List open manual items (`node "$SHIP_CLI" manual list`) and active wait clocks (e.g. Google Play 14-day closed testing tracker).
3. If security findings appear in frontend bundles, APIs, or mobile binaries, offer to run deeper inspection using `rea-skills` (`website-security-audit`, `rea-web-bundle-recovery`, or `rea-mobile-app-recovery`).
