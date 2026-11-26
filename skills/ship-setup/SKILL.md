---
name: ship-setup
description: Re-scan, extend, or reconfigure an app's production setup: add a new surface (web, mobile, macOS DMG, backend, static site), add a separate staging environment beside production, wire payments (Stripe, RevenueCat, Lemon Squeezy), configure custom domain and DNS checklists, or generate a converting landing page and legal pages (privacy policy, terms, support, account deletion).
---

# ShipLaunchpad: Setup & Configure

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Capabilities

1. **Re-scan & refresh surfaces**:
   ```bash
   node "$SHIP_CLI" detect --json
   node "$SHIP_CLI" status --json
   ```
2. **Configure environment & features**:
   - Enable staging beside production: `node "$SHIP_CLI" config set staging true`
   - Configure payments (`stripe`, `revenuecat`, `lemonsqueezy`, `iap`): `node "$SHIP_CLI" config set payments stripe`
   - Set custom domain: `node "$SHIP_CLI" config set domain example.com`
   - Set support email: `node "$SHIP_CLI" config set supportEmail support@example.com`
   - Enable optional generators:
     - `--landing`: High-converting landing page (`public/landing.html` or `site/index.html`)
     - `--legal`: Privacy policy, Terms of Service, Support page, and Account Deletion request page
     - `--headers`: Security headers (`vercel.json` / `_headers` for Cloudflare Pages)
     - `--analytics`: Cookieless PostHog snippet & Sentry boilerplate guidance
3. **Preview and apply**:
   ```bash
   node "$SHIP_CLI" apply --dry-run
   node "$SHIP_CLI" apply [--landing] [--legal] [--headers]
   ```
4. **Store Secrets Safely (Zero-Secret Law)**:
   - Never ask the user to paste API keys, keystores, or certificates in chat.
   - Instruct the user to store required keys in their own terminal using:
     ```bash
     node "$SHIP_CLI" vault set <SECRET_NAME>
     ```
   - Supported backends: macOS Keychain (`security`) on macOS, or AES-256-GCM encrypted file (`~/.shiplaunchpad/vault.enc` protected by `SHIPLAUNCHPAD_VAULT_PASSPHRASE`) on Linux/Windows/headless environments.
5. **Confirm DNS, Paid Plans, and Public Changes**:
   - Before modifying DNS records, enabling paid plans (e.g. Vercel Pro for commercial use), or making a repo/site public, summarize the exact cost/impact and wait for explicit approval.
