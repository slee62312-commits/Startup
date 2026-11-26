import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BIN = path.resolve('bin/shiplaunchpad.mjs');

test('CLI end-to-end workflow: detect, status, cost, apply, undo, manual, report', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-cli-home-'));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-cli-repo-'));
  const env = { ...process.env, SHIPLAUNCHPAD_HOME: home };

  try {
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'cli-test-app', version: '1.2.3', dependencies: { vite: '5.0.0' }, scripts: { test: 'node -e "process.exit(0)"' } }));
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'src/main.ts'), 'console.log("hi");\n');

    const run = (args) => execFileSync('node', [BIN, ...args, '--cwd', repo], { env, encoding: 'utf8' });

    const det = JSON.parse(run(['detect', '--json']));
    assert.ok(det.stacks.some((s) => s.id === 'vite'));

    const cost = JSON.parse(run(['cost', '--auto', '--payments', '--json']));
    assert.equal(cost.beforeLaunchTotal, 0);
    assert.ok(cost.recurring.some((r) => r.amount === 20));

    run(['config', 'set', 'supportEmail', 'help@clitest.app']);
    run(['config', 'set', 'domain', 'clitest.app']);
    const applied = JSON.parse(run(['apply', '--landing', '--legal', '--json']));
    assert.ok(applied.written.includes('.github/workflows/shiplaunchpad-web-vercel.yml'));
    assert.ok(fs.existsSync(path.join(repo, '.shiplaunchpad/STATUS.md')));

    const man = JSON.parse(run(['manual', 'add', 'Enroll Apple SBP', '--why', '15% fee', '--json']));
    run(['manual', 'done', man.id]);

    const rep = JSON.parse(run(['report', '--json']));
    assert.equal(rep.repo.name, 'cli-test-app');
    assert.equal(rep.environment.nodeOk, true);

    const undone = JSON.parse(run(['undo', '--json']));
    assert.ok(undone.deleted.includes('.github/workflows/shiplaunchpad-web-vercel.yml'));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
