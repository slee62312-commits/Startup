import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { detectRepo } from './core/detect.mjs';
import { runAudit } from './core/audit.mjs';
import { evaluateChecklist } from './catalog/checklist.mjs';
import { calculateCosts } from './catalog/costs.mjs';
import {
  addManualItem,
  completeManualItem,
  executeUndo,
  getPendingQuestions,
  getPlayClosedTestStatus,
  listGlobalProjects,
  loadRepoState,
  planUndo,
  registerProjectGlobal,
  saveRepoState,
  startPlayClosedTest,
  updatePlayClosedTest,
  writeFilesWithSnapshot,
  writeStatusMarkdown,
} from './core/state.mjs';
import { buildDecisions, planGeneratedFiles } from './core/generators.mjs';
import { deleteSecret, hasSecret, listSecrets, setSecret } from './core/vault.mjs';
import { buildDoctorReport } from './core/report.mjs';
import { startDashboard } from './dashboard/server.mjs';

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(tok);
    }
  }
  return { positionals, flags };
}

function parseBool(val) {
  if (val === true || val === 'true' || val === '1' || val === 'yes') return true;
  if (val === false || val === 'false' || val === '0' || val === 'no') return false;
  return val;
}

function out(data, asJson, formatter) {
  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(formatter(data));
  }
}

function syncProjectSnapshot(repoRoot) {
  const detection = detectRepo(repoRoot);
  const state = loadRepoState(repoRoot);
  const audit = runAudit(repoRoot, detection, state.config);
  const checklist = evaluateChecklist({ detection, audit, state, config: state.config });
  state.registeredAt = state.registeredAt || new Date().toISOString();
  saveRepoState(repoRoot, state);
  writeStatusMarkdown(repoRoot, detection, checklist, audit, state);
  registerProjectGlobal(repoRoot, {
    name: detection.name,
    surfaces: detection.surfaces,
    stacks: detection.stacks.map((s) => s.id),
    hosts: detection.hosts.map((h) => h.id),
    scorePct: checklist.scorePct,
    passedCount: checklist.passedCount,
    applicableCount: checklist.applicableCount,
    criticalCount: audit.criticalCount,
    warnCount: audit.warnCount,
    openManualCount: (state.manualItems || []).filter((m) => !m.done).length,
  });
  return { detection, state, audit, checklist };
}

function bumpSemver(ver, kind = 'patch') {
  const m = String(ver || '0.1.0').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return '0.1.1';
  let [, maj, min, pat] = m.map(Number);
  if (kind === 'major') { maj++; min = 0; pat = 0; }
  else if (kind === 'minor') { min++; pat = 0; }
  else { pat++; }
  return `${maj}.${min}.${pat}`;
}

async function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function printHelp() {
  console.log(`shiplaunchpad — Open production-launch CLI & Mission Control

Commands:
  detect [--json]                     Detect stacks (60), hosts (21), and services (17)
  status [--json]                     Score repo against the 50-item production checklist
  audit [--strict] [--json]           Run security, App Review, Play, and secret-leak checks
  questions [--json]                  List only missing onboarding questions
  config set <key> <value>            Set config key (domain, supportEmail, payments, company, staging)
  config get                          Show current repo configuration
  apply [--dry-run] [--landing] [--legal] [--headers] [--force]
                                      Generate CI/CD workflows, security headers, legal & landing pages
  undo [--dry-run] [--force]          Restore files from previous apply snapshot (preserves edited files)
  cost [--auto | --paths ...] [--payments] [--company] [--json]
                                      Compute upfront fees, recurring fees, metered caps, and wait times
  vault set <KEY> [--value V]         Store secret in macOS Keychain or AES-256-GCM encrypted vault
  vault list | has <KEY> | delete <KEY>
  manual add "<title>" [--why ...] [--steps ...] [--link ...]
  manual list | done <id>
  play-test start|update|status       Track Google Play 12-tester / 14-day closed testing window
  release [--bump patch|minor|major] [--dry-run]
  report [--json]                     Print secret-redacted diagnostic report
  register                            Register repo in Mission Control (~/.shiplaunchpad/projects.json)
  projects list [--json]              List all projects registered in Mission Control
  dashboard [--port 4747]             Start local Mission Control web UI on 127.0.0.1
`);
}

export async function runCli(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const cmd = positionals[0] || 'help';
  const sub = positionals[1];
  const repoRoot = path.resolve(String(flags.cwd || process.cwd()));
  const asJson = Boolean(flags.json);

  switch (cmd) {
    case 'help':
    case '-h':
    case '--help':
      printHelp();
      return 0;

    case 'detect': {
      const det = detectRepo(repoRoot);
      out(det, asJson, (d) => [
        `Project: ${d.name} (${d.root})`,
        `Surfaces: ${d.surfaces.join(', ') || 'none'}`,
        `Stacks (${d.stacks.length}):`,
        ...d.stacks.map((s) => `  - ${s.name} [${s.id}] -> ${s.status} (${s.deployTarget})`),
        `Hosts/Builders: ${d.hosts.map((h) => h.name).join(', ') || 'none'}`,
        `Services: ${d.services.map((s) => s.name).join(', ') || 'none'}`,
      ].join('\n'));
      return 0;
    }

    case 'status': {
      const detection = detectRepo(repoRoot);
      const state = loadRepoState(repoRoot);
      const audit = runAudit(repoRoot, detection, state.config);
      const checklist = evaluateChecklist({ detection, audit, state, config: state.config });
      out({ detection, audit, checklist }, asJson, (r) => [
        `ShipLaunchpad Readiness: ${r.checklist.passedCount}/${r.checklist.applicableCount} (${r.checklist.scorePct}%)`,
        `Surfaces: ${r.detection.surfaces.join(', ') || 'none'}`,
        `Stacks: ${r.detection.stacks.map((s) => `${s.name} (${s.status})`).join(', ') || 'none'}`,
        '',
        ...r.checklist.byCategory.map((c) => `  ${c.name.padEnd(28)} ${c.passed}/${c.applicable}`),
        '',
        `Audit: ${r.audit.criticalCount} critical, ${r.audit.warnCount} warning(s)`,
      ].join('\n'));
      return 0;
    }

    case 'audit': {
      const detection = detectRepo(repoRoot);
      const state = loadRepoState(repoRoot);
      const audit = runAudit(repoRoot, detection, state.config);
      out(audit, asJson, (a) => [
        `Audit Summary: ${a.criticalCount} critical, ${a.warnCount} warning(s)`,
        ...a.findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.message}${f.fix ? `\n  Fix: ${f.fix}` : ''}`),
      ].join('\n'));
      if (flags.strict && !audit.passed) return 2;
      return 0;
    }

    case 'questions': {
      const detection = detectRepo(repoRoot);
      const state = loadRepoState(repoRoot);
      const qs = getPendingQuestions(detection, state);
      out(qs, asJson, (list) =>
        list.length
          ? list.map((q) => `- ${q.key}: ${q.prompt} (recommended: ${q.recommended || 'none'})`).join('\n')
          : 'All onboarding questions answered.'
      );
      return 0;
    }

    case 'config': {
      const state = loadRepoState(repoRoot);
      if (sub === 'get') {
        out(state.config, asJson, (c) => JSON.stringify(c, null, 2));
        return 0;
      }
      if (sub === 'set') {
        const key = positionals[2];
        const val = positionals[3];
        if (!key || val === undefined) throw new Error('Usage: config set <key> <value>');
        state.config[key] = parseBool(val);
        saveRepoState(repoRoot, state);
        out({ key, value: state.config[key] }, asJson, (r) => `Saved config ${r.key}=${r.value}`);
        return 0;
      }
      throw new Error('Usage: config <get|set>');
    }

    case 'apply': {
      const detection = detectRepo(repoRoot);
      const state = loadRepoState(repoRoot);
      const planned = planGeneratedFiles(detection, state.config, {
        force: Boolean(flags.force),
        landing: Boolean(flags.landing),
        legal: Boolean(flags.legal),
        headers: flags.headers === undefined ? true : Boolean(flags.headers),
      });
      if (flags['dry-run']) {
        out({ dryRun: true, files: planned.map((f) => f.relPath) }, asJson, (d) =>
          ['Planned files (dry-run):', ...d.files.map((f) => `  + ${f}`)].join('\n')
        );
        return 0;
      }
      const res = writeFilesWithSnapshot(repoRoot, planned);
      const nextState = loadRepoState(repoRoot);
      nextState.decisions = buildDecisions(detection, nextState.config);
      saveRepoState(repoRoot, nextState);
      const synced = syncProjectSnapshot(repoRoot);
      out({ ...res, scorePct: synced.checklist.scorePct }, asJson, (r) => [
        `Applied snapshot ${r.snapId}`,
        `Written (${r.written.length}): ${r.written.join(', ') || 'none'}`,
        `Skipped (${r.skipped.length}): ${r.skipped.map((s) => `${s.relPath} (${s.reason})`).join(', ') || 'none'}`,
        `Updated readiness: ${r.scorePct}%`,
      ].join('\n'));
      return 0;
    }

    case 'undo': {
      if (flags['dry-run']) {
        const plan = planUndo(repoRoot);
        out(plan, asJson, (p) =>
          p.hasSnapshot
            ? [`Undo preview for ${p.snapId}:`, ...p.actions.map((a) => `  - ${a.action} ${a.relPath}${a.willSkip ? ' [SKIPPED: edited by user]' : ''}`)].join('\n')
            : 'No snapshot available.'
        );
        return 0;
      }
      const res = executeUndo(repoRoot, { force: Boolean(flags.force) });
      out(res, asJson, (r) => [
        `Undid snapshot ${r.snapId}`,
        `Restored: ${r.restored.join(', ') || 'none'}`,
        `Deleted: ${r.deleted.join(', ') || 'none'}`,
        `Preserved (user edited): ${r.preserved.map((p) => p.relPath).join(', ') || 'none'}`,
      ].join('\n'));
      return 0;
    }

    case 'cost': {
      let paths = [];
      let detectedServiceIds = null;
      const state = loadRepoState(repoRoot);
      if (flags.auto || !flags.paths) {
        const det = detectRepo(repoRoot);
        paths = det.surfaces;
        detectedServiceIds = det.services.map((s) => s.id);
      } else {
        paths = String(flags.paths).split(',').map((s) => s.trim()).filter(Boolean);
      }
      const result = calculateCosts({
        paths,
        payments: flags.payments !== undefined ? parseBool(flags.payments) : Boolean(state.config?.payments),
        company: flags.company !== undefined ? parseBool(flags.company) : Boolean(state.config?.company),
        detectedServiceIds,
      });
      out(result, asJson, (c) => [
        `Paths: ${c.paths.join(', ') || 'none'} | Payments: ${c.payments} | Company: ${c.company}`,
        `Before launch: $${c.beforeLaunchTotal}${c.beforeLaunchVendors.length ? ` (${c.beforeLaunchVendors.join(', ')})` : ''}`,
        `Recurring: ${c.recurring.length ? c.recurring.map((r) => `$${r.amount} ${r.cadenceLabel}`).join('; ') : '$0'}`,
        `Minimum wait: ${c.minWaitDays} day(s)`,
        ...(c.metered.length ? ['Metered / spend-cap targets:', ...c.metered.map((m) => `  - ${m.name}: ${m.detail}`)] : []),
        ...(c.waits.length ? ['Wait timelines:', ...c.waits.map((w) => `  - ${w.name}: ${w.detail}`)] : []),
      ].join('\n'));
      return 0;
    }

    case 'vault': {
      if (sub === 'list') {
        const items = listSecrets(repoRoot);
        out(items, asJson, (list) =>
          list.length ? list.map((i) => `- ${i.keyName} [${i.backend}] (${i.updatedAt})`).join('\n') : 'No vault keys recorded.'
        );
        return 0;
      }
      if (sub === 'has') {
        const key = positionals[2];
        const exists = hasSecret(repoRoot, key);
        out({ keyName: key, exists }, asJson, (r) => `${r.keyName}: ${r.exists ? 'present' : 'missing'}`);
        return exists ? 0 : 1;
      }
      if (sub === 'set') {
        const key = positionals[2];
        if (!key) throw new Error('Usage: vault set <KEY> [--value <VAL>]');
        const value = typeof flags.value === 'string' ? flags.value : await promptLine(`Enter secret value for ${key}: `);
        const res = setSecret(repoRoot, key, value, { backend: flags.backend });
        out(res, asJson, (r) => `Stored ${r.keyName} in ${r.backend} (value hidden).`);
        return 0;
      }
      if (sub === 'delete') {
        const key = positionals[2];
        const res = deleteSecret(repoRoot, key, { backend: flags.backend });
        out(res, asJson, (r) => `Deleted ${r.keyName}.`);
        return 0;
      }
      throw new Error('Usage: vault <set|list|has|delete>');
    }

    case 'manual': {
      if (sub === 'list') {
        const state = loadRepoState(repoRoot);
        out(state.manualItems, asJson, (items) =>
          items.length
            ? items.map((m) => `${m.done ? '[x]' : '[ ]'} ${m.id}: ${m.title} — ${m.why}`).join('\n')
            : 'No manual items.'
        );
        return 0;
      }
      if (sub === 'add') {
        const title = positionals[2];
        if (!title) throw new Error('Usage: manual add "<title>" --why "<reason>"');
        const item = addManualItem(repoRoot, {
          title,
          why: flags.why || 'Owner action required',
          steps: flags.steps || '',
          link: flags.link || '',
          checkId: flags['check-id'] || '',
        });
        out(item, asJson, (i) => `Added manual item ${i.id}: ${i.title}`);
        return 0;
      }
      if (sub === 'done') {
        const id = positionals[2];
        const item = completeManualItem(repoRoot, id);
        out(item, asJson, (i) => `Marked ${i.id} done.`);
        return 0;
      }
      throw new Error('Usage: manual <list|add|done>');
    }

    case 'play-test': {
      if (sub === 'start') {
        const status = startPlayClosedTest(repoRoot, { testersCount: Number(flags.testers || 12) });
        out(status, asJson, (s) => `Started 14-day Play closed test tracker (${s.testersCount}/12 testers, Day ${s.daysElapsed}/14).`);
        return 0;
      }
      if (sub === 'update') {
        const status = updatePlayClosedTest(repoRoot, { testersCount: Number(flags.testers || 12) });
        out(status, asJson, (s) => `Updated Play closed test (${s.testersCount}/12 testers, Day ${s.daysElapsed}/14).`);
        return 0;
      }
      const status = getPlayClosedTestStatus(repoRoot);
      out(status, asJson, (s) =>
        s.active
          ? `Play closed test: Day ${s.daysElapsed}/14 (${s.daysRemaining} left), ${s.testersCount}/12 testers, ready=${s.readyForProductionApplication}`
          : 'Play closed test tracker not started.'
      );
      return 0;
    }

    case 'release': {
      const detection = detectRepo(repoRoot);
      const state = loadRepoState(repoRoot);
      const audit = runAudit(repoRoot, detection, state.config);
      if (!audit.passed && !flags.force) {
        out({ blocked: true, criticalCount: audit.criticalCount, findings: audit.findings.filter((f) => f.severity === 'critical') }, asJson, (r) =>
          `Release blocked by ${r.criticalCount} critical audit issue(s). Run \`shiplaunchpad audit\` to resolve.`
        );
        return 2;
      }
      const pkgPath = path.join(repoRoot, 'package.json');
      const currentVer = detection.version;
      const nextVer = bumpSemver(currentVer, String(flags.bump || 'patch'));
      const releaseTag = `v${nextVer}`;

      if (flags['dry-run']) {
        out({ dryRun: true, currentVer, nextVer, releaseTag, surfaces: detection.surfaces }, asJson, (r) =>
          `Release dry-run: ${r.currentVer} -> ${r.nextVer} (tag ${r.releaseTag}) for surfaces: ${r.surfaces.join(', ') || 'none'}`
        );
        return 0;
      }

      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.version = nextVer;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      }
      state.releases.push({ version: nextVer, tag: releaseTag, createdAt: new Date().toISOString() });
      saveRepoState(repoRoot, state);
      out({ version: nextVer, tag: releaseTag }, asJson, (r) =>
        `Prepared release ${r.version} (${r.tag}). Confirm before running \`git tag ${r.tag} && git push --tags\` to publish.`
      );
      return 0;
    }

    case 'report': {
      const report = buildDoctorReport(repoRoot);
      out(report, asJson, (r) => [
        `ShipLaunchpad Doctor Report (${r.generatedAt})`,
        `Node: ${r.environment.nodeVersion} (ok=${r.environment.nodeOk}) | OS: ${r.environment.platform}/${r.environment.arch}`,
        `Repo: ${r.repo.name} | GitHub: ${r.repo.isGitHub} | Branch: ${r.repo.branch || 'none'}`,
        `Surfaces: ${r.repo.surfaces.join(', ') || 'none'} | Readiness: ${r.readiness.passed}/${r.readiness.applicable} (${r.readiness.scorePct}%)`,
        `Vault keys: ${r.vault.storedKeyNames.join(', ') || 'none'}`,
        `Findings: ${r.readiness.criticalFindings} critical, ${r.readiness.warnings} warnings`,
      ].join('\n'));
      return 0;
    }

    case 'register': {
      const synced = syncProjectSnapshot(repoRoot);
      out({ registered: true, root: repoRoot, scorePct: synced.checklist.scorePct }, asJson, (r) =>
        `Registered ${r.root} in Mission Control (${r.scorePct}% ready).`
      );
      return 0;
    }

    case 'projects': {
      const list = listGlobalProjects();
      out(list, asJson, (ps) =>
        ps.length ? ps.map((p) => `- ${p.name} (${p.scorePct}%) — ${p.root}`).join('\n') : 'No projects registered yet.'
      );
      return 0;
    }

    case 'dashboard': {
      const port = Number(flags.port || 4747);
      const started = await startDashboard({ port, repoRoot });
      console.log(`Mission Control running at ${started.url} (127.0.0.1 loopback only)`);
      // Keep process alive until SIGINT/SIGTERM
      await new Promise(() => {});
      return 0;
    }

    default:
      throw new Error(`Unknown command: ${cmd}. Run \`shiplaunchpad help\`.`);
  }
}
