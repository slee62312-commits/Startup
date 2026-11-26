import http from 'node:http';
import fs from 'node:fs';
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
} from '../core/state.mjs';
import { detectRepo } from '../core/detect.mjs';
import { runAudit } from '../core/audit.mjs';
import { evaluateChecklist } from '../catalog/checklist.mjs';
import { calculateCosts } from '../catalog/costs.mjs';
import { buildDoctorReport } from '../core/report.mjs';
import { buildDecisions, planGeneratedFiles } from '../core/generators.mjs';
import { listSecrets, setSecret } from '../core/vault.mjs';
import { renderDashboardHtml } from './ui.mjs';

function syncRepo(repoRoot) {
  const det = detectRepo(repoRoot);
  const st = loadRepoState(repoRoot);
  const aud = runAudit(repoRoot, det, st.config);
  const chk = evaluateChecklist({ detection: det, audit: aud, state: st, config: st.config });
  writeStatusMarkdown(repoRoot, det, chk, aud, st);
  registerProjectGlobal(repoRoot, {
    name: det.name,
    surfaces: det.surfaces,
    stacks: det.stacks.map((s) => s.id),
    hosts: det.hosts.map((h) => h.id),
    scorePct: chk.scorePct,
    passedCount: chk.passedCount,
    applicableCount: chk.applicableCount,
    criticalCount: aud.criticalCount,
    warnCount: aud.warnCount,
    openManualCount: (st.manualItems || []).filter((m) => !m.done).length,
  });
  return { det, st, aud, chk };
}

function collectAllProjectsPayload() {
  const registered = listGlobalProjects();
  const projects = [];
  for (const entry of registered) {
    if (!fs.existsSync(entry.root)) continue;
    const detection = detectRepo(entry.root);
    const state = loadRepoState(entry.root);
    const audit = runAudit(entry.root, detection, state.config);
    const checklist = evaluateChecklist({ detection, audit, state, config: state.config });
    const costs = calculateCosts({
      paths: detection.surfaces,
      payments: state.config?.payments === true || state.config?.payments === 'true',
      company: state.config?.company === true || state.config?.company === 'true',
      detectedServiceIds: detection.services.map((s) => s.id),
    });
    const playTest = getPlayClosedTestStatus(entry.root);
    const vaultKeys = listSecrets(entry.root); // Metadata only, zero secret values
    projects.push({
      root: entry.root,
      name: detection.name,
      version: detection.version,
      surfaces: detection.surfaces,
      stacks: detection.stacks,
      hosts: detection.hosts,
      services: detection.services,
      workflows: detection.workflows,
      config: state.config,
      decisions: state.decisions,
      manualItems: state.manualItems,
      pendingQuestions: getPendingQuestions(detection, state),
      vaultKeys,
      checklist,
      audit,
      costs,
      playTest,
      snapshotsCount: (state.snapshots || []).length,
      updatedAt: state.updatedAt || entry.updatedAt,
    });
  }
  return { projects };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function assertRegisteredRoot(root) {
  if (!root || !fs.existsSync(root)) throw new Error('Invalid or missing project root');
  const registered = listGlobalProjects().map((p) => p.root);
  if (!registered.includes(root)) throw new Error('Project root is not registered in Mission Control');
}

/**
 * Creates the Mission Control HTTP server bound strictly to 127.0.0.1.
 */
export function createDashboardServer({ defaultRepoRoot = null } = {}) {
  if (defaultRepoRoot && fs.existsSync(defaultRepoRoot)) {
    syncRepo(defaultRepoRoot);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboardHtml());
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/projects') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(collectAllProjectsPayload()));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/report') {
        const root = url.searchParams.get('root') || defaultRepoRoot;
        assertRegisteredRoot(root);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(buildDoctorReport(root)));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/checklist') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const state = loadRepoState(body.root);
        state.checklistOverrides.done = state.checklistOverrides.done.filter((x) => x !== body.id);
        state.checklistOverrides.na = state.checklistOverrides.na.filter((x) => x !== body.id);
        if (body.action === 'done') state.checklistOverrides.done.push(body.id);
        else if (body.action === 'na') state.checklistOverrides.na.push(body.id);
        saveRepoState(body.root, state);
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/config') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const state = loadRepoState(body.root);
        state.config[body.key] = body.value;
        saveRepoState(body.root, state);
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, config: state.config }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/vault') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const result = setSecret(body.root, body.keyName, body.value);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, keyName: result.keyName, backend: result.backend }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/apply') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const detection = detectRepo(body.root);
        const state = loadRepoState(body.root);
        const planned = planGeneratedFiles(detection, state.config, {
          force: Boolean(body.force),
          landing: Boolean(body.landing),
          legal: Boolean(body.legal),
          headers: body.headers === undefined ? true : Boolean(body.headers),
        });
        if (body.dryRun) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, dryRun: true, files: planned.map((f) => f.relPath) }));
          return;
        }
        const applied = writeFilesWithSnapshot(body.root, planned);
        const nextState = loadRepoState(body.root);
        nextState.decisions = buildDecisions(detection, nextState.config);
        saveRepoState(body.root, nextState);
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ...applied }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/undo') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        if (body.dryRun) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, ...planUndo(body.root) }));
          return;
        }
        const undone = executeUndo(body.root, { force: Boolean(body.force) });
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ...undone }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/manual/add') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const item = addManualItem(body.root, body);
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, item }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/manual/done') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const item = completeManualItem(body.root, body.id);
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, item }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/play-test') {
        const body = await readJsonBody(req);
        assertRegisteredRoot(body.root);
        const status =
          body.action === 'start'
            ? startPlayClosedTest(body.root, { testersCount: body.testersCount || 12 })
            : updatePlayClosedTest(body.root, { testersCount: body.testersCount || 12 });
        syncRepo(body.root);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, status }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return server;
}

export function startDashboard({ port = 4747, repoRoot = null } = {}) {
  const server = createDashboardServer({ defaultRepoRoot: repoRoot });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}
