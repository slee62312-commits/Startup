import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectRepo } from '../src/core/detect.mjs';
import { planGeneratedFiles } from '../src/core/generators.mjs';
import { createDashboardServer } from '../src/dashboard/server.mjs';

test('planGeneratedFiles creates workflows, headers, legal/deletion pages, and preserves Lovable host', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-gen-'));
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo', dependencies: { next: '15.0.0' } }));
    fs.mkdirSync(path.join(dir, 'ios'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'ios/App.xcodeproj'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ios/App.xcodeproj/project.pbxproj'), 'SDKROOT = iphoneos;');

    const det = detectRepo(dir);
    const planned = planGeneratedFiles(det, { domain: 'demo.app', supportEmail: 'hi@demo.app', staging: true }, { landing: true, legal: true });
    const paths = planned.map((p) => p.relPath);

    assert.ok(paths.includes('.github/workflows/shiplaunchpad-web-vercel.yml'));
    assert.ok(paths.includes('.github/workflows/shiplaunchpad-ios.yml'));
    assert.ok(paths.includes('.github/workflows/shiplaunchpad-uptime.yml'));
    assert.ok(paths.includes('ios/PrivacyInfo.xcprivacy'));
    assert.ok(paths.includes('vercel.json'));
    assert.ok(paths.includes('public/privacy.html'));
    assert.ok(paths.includes('public/terms.html'));
    assert.ok(paths.includes('public/support.html'));
    assert.ok(paths.includes('public/delete-account.html'));
    assert.ok(paths.includes('public/landing.html'));

    // Lovable preservation test
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo', dependencies: { next: '15.0.0', 'lovable-tagger': '1.0.0' } }));
    const detLovable = detectRepo(dir);
    const plannedLovable = planGeneratedFiles(detLovable, {}, {});
    assert.equal(plannedLovable.some((p) => p.relPath === '.github/workflows/shiplaunchpad-web-vercel.yml'), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Mission Control dashboard binds to 127.0.0.1 and serves HTML + JSON APIs', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-dash-home-'));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-dash-repo-'));
  const prevHome = process.env.SHIPLAUNCHPAD_HOME;
  process.env.SHIPLAUNCHPAD_HOME = home;
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'mc-app', dependencies: { express: '4.19.0' } }));

  const server = createDashboardServer({ defaultRepoRoot: repo });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const htmlRes = await fetch(`${base}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('Mission Control'));
    assert.ok(html.includes('The quickest way'));
    assert.equal(/purple|violet|linear-gradient|🚀/i.test(html), false, 'UI must not use purple gradients or emojis');

    const apiRes = await fetch(`${base}/api/projects`);
    assert.equal(apiRes.status, 200);
    const data = await apiRes.json();
    assert.equal(data.projects.length, 1);
    assert.equal(data.projects[0].name, 'mc-app');
    assert.equal(data.projects[0].checklist.totalCatalogItems, 50);
    assert.ok(data.projects[0].checklist.items.every((it) => Array.isArray(it.guide?.steps) && it.guide.steps.length >= 1));

    const cfgRes = await fetch(`${base}/api/project/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: repo, key: 'payments', value: true }),
    });
    assert.equal(cfgRes.status, 200);

    const toggleRes = await fetch(`${base}/api/project/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: repo, id: 'web-landing-page', action: 'done' }),
    });
    assert.equal(toggleRes.status, 200);

    const applyRes = await fetch(`${base}/api/project/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: repo, legal: true }),
    });
    assert.equal(applyRes.status, 200);
    const applied = await applyRes.json();
    assert.ok(applied.written.length >= 1);

    const undoRes = await fetch(`${base}/api/project/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: repo }),
    });
    assert.equal(undoRes.status, 200);

    const resetRes = await fetch(`${base}/api/project/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: repo, id: 'web-landing-page', action: 'reset' }),
    });
    assert.equal(resetRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    process.env.SHIPLAUNCHPAD_HOME = prevHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
