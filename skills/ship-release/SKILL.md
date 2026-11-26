---
name: ship-release
description: Cut a release and walk through shipping to production: runs pre-release audit gates and test suites, bumps version, creates a release snapshot/tag, verifies signing and Sparkle/store requirements, and guides store submission or production deploy with explicit approval gates.
---

# ShipLaunchpad: Release

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Steps

1. **Pre-release gate (fail closed on secrets or broken tests)**:
   ```bash
   node "$SHIP_CLI" status --json
   node "$SHIP_CLI" audit --strict
   ```
   - Never proceed to release if secret leaks, missing test runs, or critical store blockers remain unresolved unless the user explicitly waives a non-secret warning.
2. **Verify Google Play / Apple App Store readiness (mobile & Mac)**:
   - For **iOS**: Confirm demo account credentials (App Review 2.1), in-app account deletion (5.1.1v), Sign in with Apple (4.8 if Google/social login exists), AI data consent (5.1.2), permission usage descriptions, `PrivacyInfo.xcprivacy`, iPad layout check (2.4.1), EU trader status, Age Rating answers, Paid Apps Agreement, and Small Business Program (15%) enrollment.
   - For **Android**: Confirm signed release AAB, Play App Signing SHA-256 registered in Google Cloud/Firebase for Google Sign-In, web account-deletion link, Data Safety answers, and if a personal account created after 13 Nov 2023, check the 14-day / 12-tester closed test tracker (`node "$SHIP_CLI" play-test status`).
   - For **macOS DMG**: Confirm Developer ID Application certificate, `notarytool` notarization & stapling, Sparkle EdDSA signature & `appcast.xml` release notes, and download URL uptime monitor.
3. **Prepare version bump & tag (dry-run first)**:
   ```bash
   node "$SHIP_CLI" release --dry-run [--bump patch|minor|major]
   ```
4. **Ask for explicit confirmation before**:
   - Pushing git tags that trigger production CI/CD deploys
   - Submitting to App Store Connect / TestFlight / Google Play
   - Publishing a public GitHub Release / DMG / Sparkle appcast
5. **Execute release**:
   ```bash
   node "$SHIP_CLI" release --bump <patch|minor|major>
   ```
   Show the exact post-release verification steps (TestFlight link, Vercel production URL, Cloud Run revision, or DMG download + Sparkle feed check).
