---
name: ship-doctor
description: Diagnose why a build, deploy, signing step, vault secret, or ShipLaunchpad configuration is broken. Always runs a safe, secret-redacted diagnostic report first before asking questions. Also manages vault keys and checks environment prerequisites (Node >= 20, git, gh, xcodebuild, fastlane, vercel, wrangler, gcloud, firebase).
---

# ShipLaunchpad: Doctor & Diagnostics

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Standing Rule
When the user says something is broken, failing to deploy, or won't sign: **always run `report` first** before asking diagnostic questions.

## Steps

1. **Generate the safe, redacted diagnostic report**:
   ```bash
   node "$SHIP_CLI" report
   ```
   - `report` automatically redacts API keys, JWTs, `sk_live_*` / `ghp_*` / `AIza*` tokens, emails, vault passphrases, and local home directory usernames.
   - Never open `.env` files to read secret values. Only inspect `.env.example` or check key presence via `node "$SHIP_CLI" vault list`.
2. **Verify toolchain & credentials**:
   - Check Node.js (`>= 20`), Git remote, GitHub CLI (`gh`), Xcode/notarytool (macOS/iOS), Java/Gradle/keytool (Android), Vercel CLI, Wrangler (Cloudflare), Google Cloud CLI (`gcloud`), and Firebase CLI.
   - For missing credentials, print the exact command for the user to run in their own terminal:
     ```bash
     node "$SHIP_CLI" vault set <SECRET_NAME>
     ```
3. **Inspect audit & state consistency**:
   ```bash
   node "$SHIP_CLI" audit
   ```
4. **If troubleshooting a compiled artifact, web bundle, or CI failure**:
   - Use `rea-skills` (`rea-performance-crash-triage`, `rea-ci-tests-audit`, or `website-security-audit`) to diagnose deeper bundle, binary, or workflow issues.
