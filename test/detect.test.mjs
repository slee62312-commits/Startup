import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectRepo } from '../src/core/detect.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'slp-detect-'));
}

test('detectRepo finds multiple surfaces in a monorepo and preserves Lovable builder', () => {
  const dir = makeTmpDir();
  try {
    fs.mkdirSync(path.join(dir, 'apps/web'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'apps/web/package.json'),
      JSON.stringify({ dependencies: { next: '15.0.0', 'lovable-tagger': '1.0.0', '@supabase/supabase-js': '2.0.0' } })
    );
    fs.mkdirSync(path.join(dir, 'apps/api'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'apps/api/package.json'),
      JSON.stringify({ dependencies: { express: '4.19.0', stripe: '16.0.0' } })
    );
    fs.mkdirSync(path.join(dir, 'mobile'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'mobile/pubspec.yaml'), 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n');
    fs.mkdirSync(path.join(dir, 'site'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'site/hugo.toml'), 'title = "Docs"\n');

    const det = detectRepo(dir);
    const ids = det.stacks.map((s) => s.id);
    assert.ok(ids.includes('nextjs'));
    assert.ok(ids.includes('express'));
    assert.ok(ids.includes('flutter'));
    assert.ok(ids.includes('hugo'));
    assert.ok(det.surfaces.includes('web-app'));
    assert.ok(det.surfaces.includes('service'));
    assert.ok(det.surfaces.includes('ios'));
    assert.ok(det.surfaces.includes('android'));
    assert.ok(det.surfaces.includes('site'));
    assert.ok(det.services.some((s) => s.id === 'supabase'));
    assert.ok(det.services.some((s) => s.id === 'stripe'));

    // Root lovable-tagger check
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { 'lovable-tagger': '1.0.0' } }));
    const det2 = detectRepo(dir);
    assert.ok(det2.hosts.some((h) => h.id === 'lovable'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('detectRepo recognizes non-deployable stacks as recognised', () => {
  const dir = makeTmpDir();
  try {
    fs.writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\nname = "cli"\nversion = "0.1.0"\n');
    fs.mkdirSync(path.join(dir, 'src-tauri'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src-tauri/tauri.conf.json'), '{}');

    const det = detectRepo(dir);
    assert.ok(det.recognisedOnlyStacks.some((s) => s.id === 'tauri'));
    assert.equal(det.deployableStacks.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
