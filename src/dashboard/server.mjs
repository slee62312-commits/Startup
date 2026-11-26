import http from 'node:http';
import fs from 'node:fs';
import {
  completeManualItem,
  getPlayClosedTestStatus,
  listGlobalProjects,
  loadRepoState,
  registerProjectGlobal,
  saveRepoState,
  startPlayClosedTest,
  updatePlayClosedTest,
} from '../core/state.mjs';
import { detectRepo } from '../core/detect.mjs';
import { runAudit } from '../core/audit.mjs';
import { evaluateChecklist } from '../catalog/checklist.mjs';
import { calculateCosts } from '../catalog/costs.mjs';
import { buildDoctorReport } from '../core/report.mjs';

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
    projects.push({
      root: entry.root,
      name: detection.name,
      version: detection.version,
      surfaces: detection.surfaces,
      stacks: detection.stacks,
      hosts: detection.hosts,
      services: detection.services,
      config: state.config,
      decisions: state.decisions,
      manualItems: state.manualItems,
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

function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mission Control — ShipLaunchpad</title>
<style>
  :root {
    --bg:#090d16; --panel:#111827; --card:#172033; --border:#24314a;
    --fg:#f1f5f9; --muted:#94a3b8; --acc:#38bdf8; --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444;
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:Inter,system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--fg); }
  header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid var(--border); background:var(--panel); }
  .brand { font-weight:800; font-size:1.1rem; display:flex; align-items:center; gap:.6rem; }
  .pill { font-size:.75rem; padding:.2rem .6rem; border-radius:999px; background:#0f2942; color:var(--acc); border:1px solid #1e4b73; }
  .layout { display:grid; grid-template-columns:280px 1fr; min-height:calc(100vh - 60px); }
  aside { border-right:1px solid var(--border); background:var(--panel); padding:1rem; }
  main { padding:1.5rem; max-width:1200px; }
  .proj-btn { width:100%; text-align:left; background:transparent; border:1px solid transparent; color:var(--fg); padding:.75rem; border-radius:10px; cursor:pointer; margin-bottom:.5rem; }
  .proj-btn.active { background:var(--card); border-color:var(--acc); }
  .proj-sub { font-size:.8rem; color:var(--muted); display:flex; justify-content:space-between; margin-top:.25rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; margin-bottom:1.5rem; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:1rem 1.25rem; }
  .kpi { font-size:1.8rem; font-weight:800; margin:.25rem 0; }
  .muted { color:var(--muted); font-size:.875rem; }
  .badge { display:inline-block; padding:.15rem .5rem; border-radius:6px; font-size:.75rem; font-weight:600; margin:.15rem; }
  .b-ok { background:#052e16; color:#4ade80; }
  .b-warn { background:#451a03; color:#fbbf24; }
  .b-bad { background:#450a0a; color:#f87171; }
  .b-info { background:#0c2d48; color:#38bdf8; }
  .cat-bar { height:8px; background:#0b1020; border-radius:999px; overflow:hidden; margin-top:.4rem; }
  .cat-fill { height:100%; background:var(--acc); }
  .item-row { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; padding:.65rem 0; border-bottom:1px solid #1f2b42; }
  button.sm { background:#1e293b; color:var(--fg); border:1px solid var(--border); padding:.3rem .6rem; border-radius:6px; cursor:pointer; font-size:.75rem; }
  button.sm:hover { border-color:var(--acc); }
  @media (max-width:860px) { .layout { grid-template-columns:1fr; } aside { border-right:0; border-bottom:1px solid var(--border); } }
</style>
</head>
<body>
<header>
  <div class="brand">🚀 ShipLaunchpad <span class="pill">Mission Control · 127.0.0.1</span></div>
  <div class="muted" id="summary-line">Loading projects...</div>
</header>
<div class="layout">
  <aside>
    <div class="muted" style="margin-bottom:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Projects</div>
    <div id="project-list"></div>
  </aside>
  <main id="detail"><p class="muted">Select or onboard a project with <code>shiplaunchpad register</code>.</p></main>
</div>
<script>
let DATA = { projects: [] };
let ACTIVE_ROOT = null;

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function refresh() {
  const res = await fetch('/api/projects');
  DATA = await res.json();
  if (!ACTIVE_ROOT && DATA.projects.length) ACTIVE_ROOT = DATA.projects[0].root;
  render();
}

async function apiPost(url, body) {
  await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  await refresh();
}

function render() {
  const sumEl = document.getElementById('summary-line');
  sumEl.textContent = DATA.projects.length + ' project(s) · 0 outbound telemetry · loopback only';

  const listEl = document.getElementById('project-list');
  listEl.innerHTML = DATA.projects.map(p => \`
    <button class="proj-btn \${p.root === ACTIVE_ROOT ? 'active' : ''}" onclick="ACTIVE_ROOT='\${esc(p.root)}';render()">
      <div><strong>\${esc(p.name)}</strong></div>
      <div class="proj-sub"><span>\${esc(p.surfaces.join(', ') || 'other')}</span><span>\${p.checklist.scorePct}%</span></div>
    </button>
  \`).join('') || '<div class="muted">No projects registered yet.</div>';

  const p = DATA.projects.find(x => x.root === ACTIVE_ROOT);
  const main = document.getElementById('detail');
  if (!p) { main.innerHTML = '<div class="card"><h3>No project selected</h3><p class="muted">Run <code>shiplaunchpad register</code> or <code>/ship-onboard</code> inside any repository.</p></div>'; return; }

  const statusBadge = s => s === 'pass' ? 'b-ok' : s === 'fail' ? 'b-bad' : s === 'manual' ? 'b-warn' : 'b-info';
  main.innerHTML = \`
    <h2 style="margin-top:0">\${esc(p.name)} <span class="pill">\${p.checklist.passedCount}/\${p.checklist.applicableCount} (\${p.checklist.scorePct}%)</span></h2>
    <div class="grid">
      <div class="card"><div class="muted">Detected Stacks</div><div style="margin-top:.5rem">\${p.stacks.map(s => '<span class="badge '+(s.status==='deploys'?'b-ok':'b-warn')+'">'+esc(s.name)+' ('+esc(s.status)+')</span>').join('') || '<span class="muted">None</span>'}</div></div>
      <div class="card"><div class="muted">Hosts &amp; Services</div><div style="margin-top:.5rem">\${[...p.hosts.map(h=>h.name), ...p.services.map(s=>s.name)].map(n=>'<span class="badge b-info">'+esc(n)+'</span>').join('') || '<span class="muted">None</span>'}</div></div>
      <div class="card"><div class="muted">Before Launch Fees</div><div class="kpi">$\${p.costs.beforeLaunchTotal}</div><div class="muted">Min wait: \${p.costs.minWaitDays} day(s)</div></div>
      <div class="card"><div class="muted">Audit Alerts</div><div class="kpi">\${p.audit.criticalCount} critical · \${p.audit.warnCount} warn</div><div class="muted">\${p.snapshotsCount} undo snapshot(s)</div></div>
    </div>

    \${p.surfaces.includes('android') ? \`
      <div class="card" style="margin-bottom:1.5rem">
        <h3 style="margin-top:0">Google Play 14-Day / 12-Tester Closed Test Tracker</h3>
        <p class="muted">\${p.playTest.active ? 'Day '+p.playTest.daysElapsed+'/14 ('+p.playTest.daysRemaining+' remaining) · '+p.playTest.testersCount+'/12 testers opted in' : 'Not started yet (required for personal Google Play accounts opened after Nov 13, 2023).'}</p>
        <button class="sm" onclick="apiPost('/api/project/play-test', { root: '\${esc(p.root)}', action: 'start', testersCount: 12 })">\${p.playTest.active ? 'Reset / Restart 14d Clock' : 'Start 14-Day Clock (12 testers)'}</button>
      </div>\` : ''}

    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-top:0">50-Item Production Checklist (8 Categories)</h3>
      <div class="grid">\${p.checklist.byCategory.map(c => \`
        <div><strong>\${esc(c.name)}</strong> <span class="muted">\${c.passed}/\${c.applicable}</span>
          <div class="cat-bar"><div class="cat-fill" style="width:\${c.applicable ? Math.round(c.passed*100/c.applicable) : 100}%"></div></div>
        </div>\`).join('')}
      </div>
      \${p.checklist.items.filter(i => i.status !== 'na').map(i => \`
        <div class="item-row">
          <div>
            <span class="badge \${statusBadge(i.status)}">\${esc(i.status.toUpperCase())}</span>
            <strong>\${esc(i.title)}</strong>
            <div class="muted">\${esc(i.reason)}\${i.fix ? ' · Fix: ' + esc(i.fix) : ''}</div>
          </div>
          <div>
            \${i.status !== 'pass' ? '<button class="sm" onclick="apiPost(\\'/api/project/checklist\\',{root:\\''+esc(p.root)+'\\',id:\\''+esc(i.id)+'\\',action:\\'done\\'})">Mark Done</button>' : ''}
          </div>
        </div>\`).join('')}
    </div>

    <div class="grid">
      <div class="card">
        <h3 style="margin-top:0">Manual Hand-Off Queue</h3>
        \${(p.manualItems||[]).map(m => \`
          <div class="item-row">
            <div><strong>\${m.done ? '✅ ' : '⏳ '}\${esc(m.title)}</strong><div class="muted">\${esc(m.why)}</div></div>
            \${!m.done ? '<button class="sm" onclick="apiPost(\\'/api/project/manual/done\\',{root:\\''+esc(p.root)+'\\',id:\\''+esc(m.id)+'\\'})">Done</button>' : ''}
          </div>\`).join('') || '<p class="muted">No manual items queued.</p>'}
      </div>
      <div class="card">
        <h3 style="margin-top:0">Architecture Decisions</h3>
        \${(p.decisions||[]).map(d => '<p><strong>'+esc(d.topic)+':</strong> '+esc(d.choice)+'<br><span class="muted">'+esc(d.why)+'</span></p>').join('') || '<p class="muted">Run <code>shiplaunchpad apply</code> to record decisions.</p>'}
      </div>
    </div>
  \`;
}
refresh();
</script>
</body>
</html>`;
}

/**
 * Creates the Mission Control HTTP server bound strictly to 127.0.0.1.
 */
export function createDashboardServer({ defaultRepoRoot = null } = {}) {
  if (defaultRepoRoot && fs.existsSync(defaultRepoRoot)) {
    const det = detectRepo(defaultRepoRoot);
    const st = loadRepoState(defaultRepoRoot);
    const aud = runAudit(defaultRepoRoot, det, st.config);
    const chk = evaluateChecklist({ detection: det, audit: aud, state: st, config: st.config });
    registerProjectGlobal(defaultRepoRoot, {
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
        if (!root) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'root query param required' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(buildDoctorReport(root)));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/checklist') {
        const body = await readJsonBody(req);
        const state = loadRepoState(body.root);
        if (body.action === 'done' && !state.checklistOverrides.done.includes(body.id)) {
          state.checklistOverrides.done.push(body.id);
        } else if (body.action === 'na' && !state.checklistOverrides.na.includes(body.id)) {
          state.checklistOverrides.na.push(body.id);
        }
        saveRepoState(body.root, state);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/manual/done') {
        const body = await readJsonBody(req);
        const item = completeManualItem(body.root, body.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, item }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/project/play-test') {
        const body = await readJsonBody(req);
        const status =
          body.action === 'start'
            ? startPlayClosedTest(body.root, { testersCount: body.testersCount || 12 })
            : updatePlayClosedTest(body.root, { testersCount: body.testersCount || 12 });
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
