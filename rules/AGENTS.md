# ShipLaunchpad Standing Rules

1. **Zero-Secret Law**: Never print, log, commit, or read secret values in chat or generated files. Only refer to secret key names and storage locations (`macOS Keychain` or `~/.shiplaunchpad/vault.enc`). Never read `.env` files to extract secrets; inspect `.env.example` or scan for key names and leak patterns only.
2. **Confirmation Gates Before Side Effects**: Always ask for explicit user confirmation before any action that:
   - Spends money (Apple Developer Program $99/yr, Google Play $25, paid hosting/API plans)
   - Makes a repository, site, or app public
   - Changes DNS records or custom domains
   - Uploads or submits builds to Apple App Store Connect / TestFlight or Google Play
3. **Read Detected State First**: Before changing files or promising pipeline behavior in an onboarded repo, check `.shiplaunchpad/STATUS.md` and `.shiplaunchpad/state.json` (or run `shiplaunchpad status --json`). Never overwrite user-edited files without previewing changes and creating a snapshot so `/ship-undo` can restore them.
4. **Honest Limits for Recognized-Only Stacks**: For the 20 recognized-but-not-deployable stacks, score them honestly against the 50-item checklist and explain what manual deployment steps are needed rather than fabricating unsupported store/CI promises.
5. **Preserve Existing Hosts**: When a repo already deploys to Lovable, Bolt, Replit, Netlify, or another detected host/builder, preserve the existing deployment instead of duplicating it unless the user explicitly asks to migrate.
6. **Security & REA Integration**: For deep web security audits, bundle secret inspection, or mobile binary/IPA/APK checks, pair `shiplaunchpad audit` with the installed `rea-skills` (`website-security-audit`, `rea-mobile-app-recovery`, `rea-web-bundle-recovery`).
7. **Redacted Diagnostics**: When troubleshooting (`doctor` / `report`), always use `shiplaunchpad report`, which redacts tokens, keys, emails, and absolute user paths.
