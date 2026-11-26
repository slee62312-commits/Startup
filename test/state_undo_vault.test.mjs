import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  executeUndo,
  getPlayClosedTestStatus,
  planUndo,
  startPlayClosedTest,
  writeFilesWithSnapshot,
} from '../src/core/state.mjs';
import { deleteSecret, getSecret, hasSecret, listSecrets, setSecret } from '../src/core/vault.mjs';
import { buildDoctorReport, redactText } from '../src/core/report.mjs';

test('writeFilesWithSnapshot + undo restores original files and preserves user-edited files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-undo-'));
  try {
    fs.writeFileSync(path.join(dir, 'existing.txt'), 'original content\n');
    const res = writeFilesWithSnapshot(dir, [
      { relPath: 'existing.txt', content: 'updated by slp\n', force: true },
      { relPath: 'new-unmodified.txt', content: 'generated 1\n', allowCreateOrUpdate: true },
      { relPath: 'new-edited.txt', content: 'generated 2\n', allowCreateOrUpdate: true },
    ]);
    assert.equal(res.written.length, 3);

    // User edits one generated file afterward
    fs.writeFileSync(path.join(dir, 'new-edited.txt'), 'user customized!\n');

    const plan = planUndo(dir);
    assert.equal(plan.hasSnapshot, true);
    assert.equal(plan.actions.find((a) => a.relPath === 'new-edited.txt').willSkip, true);

    const undone = executeUndo(dir);
    assert.ok(undone.restored.includes('existing.txt'));
    assert.ok(undone.deleted.includes('new-unmodified.txt'));
    assert.ok(undone.preserved.some((p) => p.relPath === 'new-edited.txt'));

    assert.equal(fs.readFileSync(path.join(dir, 'existing.txt'), 'utf8'), 'original content\n');
    assert.equal(fs.existsSync(path.join(dir, 'new-unmodified.txt')), false);
    assert.equal(fs.readFileSync(path.join(dir, 'new-edited.txt'), 'utf8'), 'user customized!\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('encrypted-file vault stores, retrieves, lists metadata only, and deletes secrets', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-home-'));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-repo-'));
  const prevHome = process.env.SHIPLAUNCHPAD_HOME;
  const prevPass = process.env.SHIPLAUNCHPAD_VAULT_PASSPHRASE;
  const prevBackend = process.env.SHIPLAUNCHPAD_VAULT_BACKEND;
  try {
    process.env.SHIPLAUNCHPAD_HOME = home;
    process.env.SHIPLAUNCHPAD_VAULT_PASSPHRASE = 'test-passphrase-strong';
    process.env.SHIPLAUNCHPAD_VAULT_BACKEND = 'encrypted-file';

    setSecret(repo, 'VERCEL_TOKEN', 'tok_super_secret_123');
    assert.equal(hasSecret(repo, 'VERCEL_TOKEN'), true);
    assert.equal(getSecret(repo, 'VERCEL_TOKEN'), 'tok_super_secret_123');

    const listed = listSecrets(repo);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].keyName, 'VERCEL_TOKEN');
    assert.equal(JSON.stringify(listed).includes('tok_super_secret_123'), false);

    deleteSecret(repo, 'VERCEL_TOKEN');
    assert.equal(hasSecret(repo, 'VERCEL_TOKEN'), false);
  } finally {
    process.env.SHIPLAUNCHPAD_HOME = prevHome;
    process.env.SHIPLAUNCHPAD_VAULT_PASSPHRASE = prevPass;
    process.env.SHIPLAUNCHPAD_VAULT_BACKEND = prevBackend;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Play 14-day closed test tracker computes countdown accurately and report redacts sensitive strings', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-play-'));
  try {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
    startPlayClosedTest(repo, { testersCount: 12, startedAt: fifteenDaysAgo });
    const status = getPlayClosedTestStatus(repo);
    assert.equal(status.readyForProductionApplication, true);
    assert.equal(status.daysRemaining, 0);

    const red = redactText('Contact alice@example.com with ghp_1234567890abcdef1234567890');
    assert.equal(red.includes('alice@example.com'), false);
    assert.equal(red.includes('ghp_1234567890'), false);

    const doc = buildDoctorReport(repo);
    assert.equal(doc.environment.nodeOk, true);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
