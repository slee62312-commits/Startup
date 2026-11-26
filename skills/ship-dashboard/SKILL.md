---
name: ship-dashboard
description: Start and open Mission Control, the local-only loopback dashboard (http://127.0.0.1:4747) showing every onboarded project on one screen, its 50-item readiness checklist, Google Play 14-day countdown, cost breakdown, audit findings, manual action queue, and architecture decisions.
---

# ShipLaunchpad: Mission Control Dashboard

```bash
SHIP_CLI="${SHIPLAUNCHPAD_BIN:-$HOME/.gemini/config/plugins/shiplaunchpad/bin/shiplaunchpad.mjs}"
```

## Steps

1. Register the current repo (if applicable) without altering source files:
   ```bash
   node "$SHIP_CLI" register
   ```
2. Launch Mission Control bound strictly to loopback (`127.0.0.1:4747`, or `--port <port>` if 4747 is busy):
   ```bash
   node "$SHIP_CLI" dashboard --port 4747
   ```
   - Use `IsDaemon: true` when starting it in the background so it stays available while the user interacts with it in their browser.
   - Alternatively, if the user wants a quick terminal summary or static HTML report without keeping a server running, run:
     ```bash
     node "$SHIP_CLI" projects list
     node "$SHIP_CLI" status
     ```
3. Give the user the clickable URL `http://127.0.0.1:4747` and tell them they can inspect all registered projects, toggle manual checklist items, track the 14-day Google Play closed test countdown, inspect cost estimates, and view audit findings locally with zero external network calls.
4. If the user asks to preview it in the built-in browser, delegate opening `http://127.0.0.1:4747` to the `browser` subagent.
