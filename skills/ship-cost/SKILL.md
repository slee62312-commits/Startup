---
name: ship-cost
description: Calculate exact pre-launch developer fees, recurring monthly/yearly platform costs, metered pay-per-use spend-cap alerts, and store approval wait timelines (Apple D-U-N-S, App Review, Google Play 12-tester 14-day closed test) for any combination of iOS, Android, macOS DMG, Web app, Static site, or Backend service.
---

# ShipLaunchpad: Cost & Timeline Calculator

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Steps

1. Either auto-detect surfaces from the current repo:
   ```bash
   node "$SHIP_CLI" cost --auto
   ```
   Or compute for explicit target surfaces:
   ```bash
   node "$SHIP_CLI" cost --paths ios,android,web-app --payments --company
   ```
   Supported `--paths`: `ios`, `android`, `macos-dmg`, `web-app`, `site`, `service`.
   Optional flags: `--payments` (app takes money), `--company` (enrolling as an organization needing D-U-N-S, exempting Google Play 14-day personal test rule), `--json`.
2. Present:
   - **Before launch (one-time/initial)**: e.g. Apple Developer Program (\$99/yr), Google Play Console (\$25 once).
   - **Repeating fees**: Yearly/monthly triggers (e.g. Vercel Pro \$20/mo/seat once a web app takes money or runs ads).
   - **Billed by use & payment processors**: Stripe (2.9% + 30¢ US cards, +1.5% international, 0.7% Billing), RevenueCat (free up to \$2.5k MTR then 1%), Lemon Squeezy (5% + 50¢ Merchant of Record), plus metered spend caps detected in code (`Firebase Blaze`, `Vercel`, `Cloudflare Workers`, `Supabase`, `OpenAI API`, `Anthropic API`, `AWS`).
   - **Wait timelines**: D-U-N-S (up to 5+2 business days), Apple Developer confirmation (~1 day individual), App Review (50% < 24h, 90% < 48h), Google Play 12 testers × 14 days (personal accounts after Nov 13, 2023) + ~7 days production review.
