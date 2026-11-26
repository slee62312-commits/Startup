import test from 'node:test';
import assert from 'node:assert/strict';
import { HOSTS_AND_BUILDERS, DETECTABLE_SERVICES, STACKS } from '../src/catalog/stacks.mjs';
import { CHECKLIST_CATEGORIES, CHECKLIST_ITEMS, evaluateChecklist } from '../src/catalog/checklist.mjs';
import { calculateCosts } from '../src/catalog/costs.mjs';

test('catalog has exact 60 stacks (40 deploys, 20 recognised), 21 hosts/builders, 17 services', () => {
  assert.equal(STACKS.length, 60);
  assert.equal(STACKS.filter((s) => s.status === 'deploys').length, 40);
  assert.equal(STACKS.filter((s) => s.status === 'recognised').length, 20);
  assert.equal(HOSTS_AND_BUILDERS.length, 21);
  assert.equal(DETECTABLE_SERVICES.length, 17);
});

test('checklist has exact 50 items matching all 8 category counts', () => {
  assert.equal(CHECKLIST_ITEMS.length, 50);
  const totalExpected = CHECKLIST_CATEGORIES.reduce((a, c) => a + c.expectedCount, 0);
  assert.equal(totalExpected, 50);
  for (const cat of CHECKLIST_CATEGORIES) {
    const count = CHECKLIST_ITEMS.filter((i) => i.category === cat.id).length;
    assert.equal(count, cat.expectedCount, `Category ${cat.id} count mismatch`);
  }
});

test('cost calculator computes Apple + Google + Vercel Pro + wait timelines accurately', () => {
  const personal = calculateCosts({
    paths: ['ios', 'android', 'web-app'],
    payments: true,
    company: false,
    detectedServiceIds: ['openai', 'supabase'],
  });
  assert.equal(personal.beforeLaunchTotal, 124);
  assert.equal(personal.minWaitDays, 14);
  assert.ok(personal.recurring.some((r) => r.cadence === 'yearly' && r.amount === 99));
  assert.ok(personal.recurring.some((r) => r.cadence === 'monthly' && r.amount === 20));
  assert.ok(personal.metered.some((m) => m.id === 'openai'));
  assert.ok(personal.metered.some((m) => m.id === 'supabase'));
  assert.ok(personal.metered.some((m) => m.id === 'stripe'));
  assert.ok(personal.metered.some((m) => m.id === 'revenuecat'));

  const company = calculateCosts({
    paths: ['ios', 'android'],
    payments: false,
    company: true,
  });
  assert.equal(company.beforeLaunchTotal, 124);
  assert.equal(company.minWaitDays, 7); // D-U-N-S 7 days; Play 14-day rule exempt for companies

  const site = calculateCosts({ paths: ['site'], payments: false, company: false });
  assert.equal(site.beforeLaunchTotal, 0);
  assert.equal(site.recurring.length, 0);
  assert.equal(site.minWaitDays, 0);
});

test('evaluateChecklist scores applicable items cleanly', () => {
  const res = evaluateChecklist({
    detection: { surfaces: ['site'], stacks: [{ id: 'hugo', name: 'Hugo', status: 'deploys' }], hosts: [], services: [], workflows: [], files: {} },
    audit: { findings: [] },
    state: { exists: false, manualItems: [], checklistOverrides: { done: [], na: [] }, snapshots: [] },
    config: {},
  });
  assert.equal(res.totalCatalogItems, 50);
  assert.ok(res.applicableCount < 50);
  assert.equal(res.byCategory.length, 8);
});
