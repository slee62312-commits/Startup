import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SURFACES } from '../catalog/stacks.mjs';

export function getGlobalHome() {
  return process.env.SHIPLAUNCHPAD_HOME
    ? path.resolve(process.env.SHIPLAUNCHPAD_HOME)
    : path.join(os.homedir(), '.shiplaunchpad');
}

export function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function stateDir(repoRoot) {
  return path.join(path.resolve(repoRoot), '.shiplaunchpad');
}

export function loadRepoState(repoRoot) {
  const dir = stateDir(repoRoot);
  const file = path.join(dir, 'state.json');
  if (!fs.existsSync(file)) {
    return {
      exists: false,
      version: 1,
      config: {},
      manualItems: [],
      decisions: [],
      checklistOverrides: { done: [], na: [] },
      snapshots: [],
      releases: [],
      playClosedTest: null,
      registeredAt: null,
      lastApplyAt: null,
    };
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    exists: true,
    version: 1,
    config: {},
    manualItems: [],
    decisions: [],
    checklistOverrides: { done: [], na: [] },
    snapshots: [],
    releases: [],
    playClosedTest: null,
    ...parsed,
  };
}

export function saveRepoState(repoRoot, state) {
  const dir = stateDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  const toSave = { ...state, exists: true, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(toSave, null, 2) + '\n', 'utf8');
  return toSave;
}

export function renderStatusMarkdown(detection, checklist, audit, state) {
  const lines = [
    `# ShipLaunchpad Status — ${detection.name}`,
    '',
    `- **Readiness Score:** ${checklist.passedCount}/${checklist.applicableCount} (${checklist.scorePct}%)`,
    `- **Detected Surfaces:** ${detection.surfaces.join(', ') || 'none'}`,
    `- **Stacks:** ${detection.stacks.map((s) => `${s.name} (${s.status})`).join(', ') || 'none'}`,
    `- **Existing Hosts/Builders:** ${detection.hosts.map((h) => h.name).join(', ') || 'none'}`,
    `- **Detected Services:** ${detection.services.map((s) => s.name).join(', ') || 'none'}`,
    `- **Last Updated:** ${new Date().toISOString()}`,
    '',
    '## Category Breakdown',
    '',
    '| Category | Passed | Applicable |',
    '| --- | ---: | ---: |',
    ...checklist.byCategory.map((c) => `| ${c.name} | ${c.passed} | ${c.applicable} |`),
    '',
    '## Audit Findings',
    '',
    ...(audit.findings.length
      ? audit.findings.map((f) => `- **[${f.severity.toUpperCase()}]** ${f.message}${f.fix ? ` — *Fix:* ${f.fix}` : ''}`)
      : ['- None']),
    '',
    '## Open Manual Steps',
    '',
    ...((state.manualItems || []).filter((m) => !m.done).length
      ? state.manualItems
          .filter((m) => !m.done)
          .map((m) => `- [ ] \`${m.id}\` **${m.title}** — ${m.why}${m.link ? ` ([link](${m.link}))` : ''}`)
      : ['- None']),
    '',
    '## Decisions',
    '',
    ...((state.decisions || []).length
      ? state.decisions.map((d) => `- **${d.topic}:** ${d.choice} — ${d.why}`)
      : ['- Pending initial onboarding apply']),
    '',
  ];
  return lines.join('\n');
}

export function writeStatusMarkdown(repoRoot, detection, checklist, audit, state) {
  const dir = stateDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  const md = renderStatusMarkdown(detection, checklist, audit, state);
  fs.writeFileSync(path.join(dir, 'STATUS.md'), md, 'utf8');
  return md;
}

/**
 * Registers or updates a project in the global Mission Control registry (~/.shiplaunchpad/projects.json).
 */
export function registerProjectGlobal(repoRoot, summary) {
  const home = getGlobalHome();
  fs.mkdirSync(home, { recursive: true });
  const registryPath = path.join(home, 'projects.json');
  let list = [];
  if (fs.existsSync(registryPath)) {
    try {
      list = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch {
      list = [];
    }
  }
  const absRoot = path.resolve(repoRoot);
  const idx = list.findIndex((p) => p.root === absRoot);
  const record = {
    root: absRoot,
    name: summary.name,
    surfaces: summary.surfaces,
    stacks: summary.stacks,
    hosts: summary.hosts,
    scorePct: summary.scorePct,
    passedCount: summary.passedCount,
    applicableCount: summary.applicableCount,
    criticalCount: summary.criticalCount,
    warnCount: summary.warnCount,
    openManualCount: summary.openManualCount,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...record };
  else list.push(record);
  fs.writeFileSync(registryPath, JSON.stringify(list, null, 2) + '\n', 'utf8');
  return list;
}

export function listGlobalProjects() {
  const registryPath = path.join(getGlobalHome(), 'projects.json');
  if (!fs.existsSync(registryPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Returns only the onboarding questions that cannot be answered from the codebase.
 */
export function getPendingQuestions(detection, state) {
  const cfg = state.config || {};
  const surfaces = new Set(detection.surfaces || []);
  const qs = [];

  if (cfg.supportEmail === undefined) {
    qs.push({
      key: 'supportEmail',
      prompt: 'What support email address should appear on your support & legal pages?',
      recommended: `support@${(cfg.domain || `${detection.name}.app`).replace(/^https?:\/\//, '')}`,
      required: true,
    });
  }
  if ((surfaces.has(SURFACES.WEB_APP) || surfaces.has(SURFACES.SITE) || surfaces.has(SURFACES.MACOS_DMG)) && cfg.domain === undefined) {
    qs.push({
      key: 'domain',
      prompt: 'Custom domain (leave blank to use default host URL for now)?',
      recommended: '',
      required: false,
    });
  }
  if (cfg.payments === undefined) {
    const inferredPayments = detection.services?.some((s) => ['stripe', 'revenuecat', 'lemon-squeezy'].includes(s.id));
    qs.push({
      key: 'payments',
      prompt: 'Will this app accept payments, subscriptions, or paid unlocks?',
      recommended: inferredPayments ? 'true' : 'false',
      type: 'boolean',
    });
  }
  if ((surfaces.has(SURFACES.IOS) || surfaces.has(SURFACES.ANDROID) || surfaces.has(SURFACES.MACOS_DMG)) && cfg.company === undefined) {
    qs.push({
      key: 'company',
      prompt: 'Are you enrolling in Apple/Google developer accounts as a company (D-U-N-S) rather than an individual?',
      recommended: 'false',
      type: 'boolean',
    });
  }
  if (cfg.staging === undefined) {
    qs.push({
      key: 'staging',
      prompt: 'Set up a separate staging environment beside production?',
      recommended: 'true',
      type: 'boolean',
    });
  }
  return qs;
}

export function addManualItem(repoRoot, { title, why, steps = [], link = '', checkId = '' }) {
  const state = loadRepoState(repoRoot);
  const id = `man-${crypto.randomBytes(3).toString('hex')}`;
  const item = {
    id,
    title,
    why,
    steps: Array.isArray(steps) ? steps : String(steps).split(';').map((s) => s.trim()).filter(Boolean),
    link,
    checkId,
    done: false,
    createdAt: new Date().toISOString(),
  };
  state.manualItems.push(item);
  saveRepoState(repoRoot, state);
  return item;
}

export function completeManualItem(repoRoot, id) {
  const state = loadRepoState(repoRoot);
  const item = state.manualItems.find((m) => m.id === id);
  if (!item) throw new Error(`Manual item not found: ${id}`);
  item.done = true;
  item.completedAt = new Date().toISOString();
  if (item.checkId && !state.checklistOverrides.done.includes(item.checkId)) {
    state.checklistOverrides.done.push(item.checkId);
  }
  saveRepoState(repoRoot, state);
  return item;
}

/**
 * Snapshot creation & safe undo: preserves files modified by user after apply.
 */
export function writeFilesWithSnapshot(repoRoot, plannedFiles) {
  const absRoot = path.resolve(repoRoot);
  const state = loadRepoState(absRoot);
  const snapId = `snap-${Date.now()}`;
  const records = [];
  const written = [];
  const skipped = [];

  for (const file of plannedFiles) {
    const absPath = path.join(absRoot, file.relPath);
    const existed = fs.existsSync(absPath);
    const prevContent = existed ? fs.readFileSync(absPath, 'utf8') : null;
    const prevHash = prevContent !== null ? sha256(prevContent) : null;

    // Never overwrite a file the user edited since our last snapshot unless force is explicitly passed
    const lastSnap = state.snapshots[state.snapshots.length - 1];
    const lastRec = lastSnap?.files?.find((r) => r.relPath === file.relPath);
    if (existed && !file.force && lastRec && lastRec.writtenHash && prevHash !== lastRec.writtenHash) {
      skipped.push({ relPath: file.relPath, reason: 'Modified by user since last ShipLaunchpad run' });
      continue;
    }
    if (existed && !file.force && !lastRec && !file.allowCreateOrUpdate) {
      skipped.push({ relPath: file.relPath, reason: 'Existing user file preserved (pass --force to overwrite)' });
      continue;
    }

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, file.content, 'utf8');
    const writtenHash = sha256(file.content);

    records.push({
      relPath: file.relPath,
      existed,
      prevContent,
      prevHash,
      writtenHash,
    });
    written.push(file.relPath);
  }

  state.snapshots.push({
    id: snapId,
    createdAt: new Date().toISOString(),
    files: records,
  });
  // Keep latest 10 snapshots
  if (state.snapshots.length > 10) state.snapshots = state.snapshots.slice(-10);
  state.lastApplyAt = new Date().toISOString();
  saveRepoState(absRoot, state);

  return { snapId, written, skipped };
}

export function planUndo(repoRoot) {
  const absRoot = path.resolve(repoRoot);
  const state = loadRepoState(absRoot);
  const lastSnap = state.snapshots[state.snapshots.length - 1];
  if (!lastSnap) return { hasSnapshot: false, actions: [] };

  const actions = lastSnap.files.map((rec) => {
    const absPath = path.join(absRoot, rec.relPath);
    const existsNow = fs.existsSync(absPath);
    const currentHash = existsNow ? sha256(fs.readFileSync(absPath, 'utf8')) : null;
    const editedSince = currentHash !== rec.writtenHash;
    return {
      relPath: rec.relPath,
      action: rec.existed ? 'restore' : 'delete',
      editedSince,
      willSkip: editedSince,
    };
  });

  return { hasSnapshot: true, snapId: lastSnap.id, createdAt: lastSnap.createdAt, actions };
}

export function executeUndo(repoRoot, { force = false } = {}) {
  const absRoot = path.resolve(repoRoot);
  const state = loadRepoState(absRoot);
  const lastSnap = state.snapshots[state.snapshots.length - 1];
  if (!lastSnap) throw new Error('No ShipLaunchpad snapshot available to undo.');

  const restored = [];
  const deleted = [];
  const preserved = [];

  for (const rec of lastSnap.files) {
    const absPath = path.join(absRoot, rec.relPath);
    const existsNow = fs.existsSync(absPath);
    const currentHash = existsNow ? sha256(fs.readFileSync(absPath, 'utf8')) : null;
    const editedSince = currentHash !== rec.writtenHash;

    if (editedSince && !force) {
      preserved.push({ relPath: rec.relPath, reason: 'Edited after last run — preserved' });
      continue;
    }
    if (rec.existed) {
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, rec.prevContent ?? '', 'utf8');
      restored.push(rec.relPath);
    } else if (existsNow) {
      fs.unlinkSync(absPath);
      deleted.push(rec.relPath);
    }
  }

  state.snapshots.pop();
  saveRepoState(absRoot, state);
  return { snapId: lastSnap.id, restored, deleted, preserved };
}

export function startPlayClosedTest(repoRoot, { testersCount = 12, startedAt = new Date().toISOString() } = {}) {
  const state = loadRepoState(repoRoot);
  state.playClosedTest = {
    startedAt,
    testersCount: Number(testersCount),
    updatedAt: new Date().toISOString(),
  };
  saveRepoState(repoRoot, state);
  return getPlayClosedTestStatus(repoRoot);
}

export function updatePlayClosedTest(repoRoot, { testersCount }) {
  const state = loadRepoState(repoRoot);
  if (!state.playClosedTest) {
    return startPlayClosedTest(repoRoot, { testersCount });
  }
  state.playClosedTest.testersCount = Number(testersCount);
  state.playClosedTest.updatedAt = new Date().toISOString();
  saveRepoState(repoRoot, state);
  return getPlayClosedTestStatus(repoRoot);
}

export function getPlayClosedTestStatus(repoRoot) {
  const state = loadRepoState(repoRoot);
  const pt = state.playClosedTest;
  if (!pt) {
    return { active: false, daysElapsed: 0, daysRemaining: 14, testersCount: 0, testersNeeded: 12, readyForProductionApplication: false };
  }
  const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(pt.startedAt).getTime()) / 86400000));
  const daysRemaining = Math.max(0, 14 - daysElapsed);
  const ready = daysElapsed >= 14 && pt.testersCount >= 12;
  return {
    active: true,
    startedAt: pt.startedAt,
    daysElapsed,
    daysRemaining,
    testersCount: pt.testersCount,
    testersNeeded: 12,
    readyForProductionApplication: ready,
  };
}
