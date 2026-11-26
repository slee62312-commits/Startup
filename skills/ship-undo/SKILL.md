---
name: ship-undo
description: Safely roll back ShipLaunchpad's last generated file changes using saved snapshots (leaving user-edited files untouched), or manage manual checklist items and Google Play 14-day closed test tracking.
---

# ShipLaunchpad: Undo & Manual Queue

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Safe Snapshot Rollback

1. Preview what `undo` will restore vs skip (any file the user edited after the last run is left untouched unless `--force` is explicitly requested):
   ```bash
   node "$SHIP_CLI" undo --dry-run
   ```
2. Ask the user to confirm, and remind them that `undo` restores repository files only — it cannot undo live cloud deploys, DNS changes, or store submissions.
3. Run:
   ```bash
   node "$SHIP_CLI" undo
   ```

## Manual Tasks & Play 14-Day Closed Test Tracker

- List manual hand-off items: `node "$SHIP_CLI" manual list`
- Add a manual step: `node "$SHIP_CLI" manual add "<title>" --why "<reason>" --steps "<step1>; <step2>" --link <url>`
- Mark manual item done: `node "$SHIP_CLI" manual done <id>`
- Start/check Google Play 14-day / 12-tester tracker:
  - `node "$SHIP_CLI" play-test start [--testers 12]`
  - `node "$SHIP_CLI" play-test update --testers <n>`
  - `node "$SHIP_CLI" play-test status`
