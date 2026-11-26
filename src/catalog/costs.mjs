/**
 * Official platform fee, metered billing, and approval wait-time calculator
 * matching shiplaunchpad.com/cost/calculator/.
 */

export const COST_ROWS = [
  {
    id: 'apple-developer',
    kind: 'fee',
    name: 'Apple Developer Program',
    detail: 'TestFlight, the App Store and notarized Mac apps',
    vendor: 'Apple',
    source: 'https://developer.apple.com/programs/',
    paths: ['ios', 'macos-dmg'],
    amount: 99,
    cadence: 'yearly',
    cadenceLabel: 'a year',
    due: ['launch', 'repeat'],
  },
  {
    id: 'google-play',
    kind: 'fee',
    name: 'Google Play Console',
    detail: 'Your public listing on the Play Store',
    vendor: 'Google',
    source: 'https://support.google.com/googleplay/android-developer/answer/6112435',
    paths: ['android'],
    amount: 25,
    cadence: 'one-time',
    cadenceLabel: 'once',
    due: ['launch'],
  },
  {
    id: 'vercel:paid',
    kind: 'fee',
    name: 'Vercel Pro',
    detail: 'Required once a web app takes payments, runs ads, or is commercial',
    vendor: 'Vercel',
    source: 'https://vercel.com/docs/limits/fair-use-guidelines',
    paths: ['web-app'],
    condition: 'payments',
    amount: 20,
    cadence: 'monthly',
    cadenceLabel: 'a month per seat',
    due: ['repeat'],
  },
  {
    id: 'stripe',
    kind: 'use',
    name: 'Stripe',
    detail: 'No monthly fee: 2.9% + 30¢ per US card payment (+1.5% international), 0.7% Stripe Billing.',
    vendor: 'Stripe',
    source: 'https://stripe.com/pricing',
    paths: ['web-app', 'service'],
    condition: 'payments',
  },
  {
    id: 'revenuecat',
    kind: 'use',
    name: 'RevenueCat',
    detail: 'Free until $2.5k monthly tracked revenue, then 1% before Apple/Google share.',
    vendor: 'RevenueCat',
    source: 'https://www.revenuecat.com/pricing/',
    paths: ['ios', 'android'],
    condition: 'payments',
  },
  {
    id: 'lemon-squeezy',
    kind: 'use',
    name: 'Lemon Squeezy',
    detail: 'No monthly fee: 5% + 50¢ a sale as Merchant of Record (handles sales tax & VAT).',
    vendor: 'Lemon Squeezy',
    source: 'https://www.lemonsqueezy.com/pricing',
    paths: ['macos-dmg'],
    condition: 'payments',
  },
  {
    id: 'firebase:use',
    kind: 'use',
    name: 'Firebase',
    detail: 'Billed by use for Firestore, storage, functions & bandwidth on Blaze plan (Spark cannot bill).',
    vendor: 'Google',
    source: 'https://firebase.google.com/pricing',
    paths: ['android'],
    serviceId: 'firebase',
  },
  {
    id: 'vercel:use',
    kind: 'use',
    name: 'Vercel Usage',
    detail: 'Billed by use for function invocations, bandwidth, and build minutes past Pro included limits.',
    vendor: 'Vercel',
    source: 'https://vercel.com/pricing',
    paths: ['web-app'],
    serviceId: 'vercel',
  },
  {
    id: 'cloudflare-workers:use',
    kind: 'use',
    name: 'Cloudflare Workers',
    detail: 'Free tier up to 100k req/day; Paid plan $5/mo + usage.',
    vendor: 'Cloudflare',
    source: 'https://developers.cloudflare.com/workers/platform/pricing/',
    paths: ['service'],
    serviceId: 'cloudflare-workers',
  },
  {
    id: 'supabase',
    kind: 'if-used',
    name: 'Supabase',
    detail: 'Free tier pauses after 7 days of low activity; Pro ($25/mo) + usage beyond plan.',
    vendor: 'Supabase',
    source: 'https://supabase.com/pricing',
    paths: '*',
    serviceId: 'supabase',
  },
  {
    id: 'openai',
    kind: 'if-used',
    name: 'OpenAI API',
    detail: 'Billed by use for tokens sent and received — set hard monthly spend cap.',
    vendor: 'OpenAI',
    source: 'https://openai.com/api/pricing/',
    paths: '*',
    serviceId: 'openai',
  },
  {
    id: 'anthropic',
    kind: 'if-used',
    name: 'Anthropic API',
    detail: 'Billed by use for tokens sent and received — set workspace spend limit.',
    vendor: 'Anthropic',
    source: 'https://www.anthropic.com/pricing',
    paths: '*',
    serviceId: 'anthropic',
  },
  {
    id: 'aws',
    kind: 'if-used',
    name: 'AWS',
    detail: 'Billed by use — configure AWS Budgets alert before launch.',
    vendor: 'Amazon',
    source: 'https://aws.amazon.com/pricing/',
    paths: '*',
    serviceId: 'aws',
  },
  {
    id: 'apple-developer:wait',
    kind: 'wait',
    name: 'Apple Developer Program',
    detail: 'Individual membership usually confirms within ~1 day; company verification takes longer.',
    vendor: 'Apple',
    source: 'https://developer.apple.com/support/enrollment/',
    paths: ['ios', 'macos-dmg'],
    minDays: 1,
  },
  {
    id: 'gate:app-review',
    kind: 'wait',
    name: 'Apple App Review',
    detail: 'Apple reviews 50% of submissions within 24 hours and 90% within 48 hours.',
    vendor: 'Apple',
    source: 'https://developer.apple.com/app-store/review/',
    paths: ['ios', 'macos-dmg'],
    minDays: 2,
  },
  {
    id: 'gate:duns',
    kind: 'wait',
    name: 'D-U-N-S Number (Company)',
    detail: 'Up to 5 business days for Dun & Bradstreet to issue it, plus up to 2 days for Apple visibility.',
    vendor: 'Apple',
    source: 'https://developer.apple.com/support/D-U-N-S/',
    paths: ['ios', 'macos-dmg', 'android'],
    condition: 'company',
    minDays: 7,
  },
  {
    id: 'google-play:wait',
    kind: 'wait',
    name: 'Google Play Identity Verification',
    detail: 'Google verifies identity before publishing (no fixed SLA published).',
    vendor: 'Google',
    source: 'https://support.google.com/googleplay/android-developer/',
    paths: ['android'],
    minDays: 2,
  },
  {
    id: 'gate:play-closed-test',
    kind: 'wait',
    name: 'Google Play Closed Test (12 testers)',
    detail: 'Personal accounts after Nov 13, 2023 need 12 testers opted in for 14 consecutive days, then ~7 days production review.',
    vendor: 'Google',
    source: 'https://support.google.com/googleplay/android-developer/answer/14151465',
    paths: ['android'],
    condition: 'personal',
    minDays: 14,
  },
];

function rowMatches(row, { paths, payments, company, detectedServiceIds }) {
  const onPath = row.paths === '*' ? paths.length > 0 : row.paths.some((p) => paths.includes(p));
  if (!onPath) return false;
  if (row.condition === 'payments' && !payments) return false;
  if (row.condition === 'company' && !company) return false;
  if (row.condition === 'personal' && company) return false;
  if (row.kind === 'if-used' && detectedServiceIds && !detectedServiceIds.includes(row.serviceId)) {
    return false;
  }
  return true;
}

/**
 * Computes pre-launch fees, recurring fees, metered items, and minimum wait days.
 */
export function calculateCosts({ paths = [], payments = false, company = false, detectedServiceIds = null } = {}) {
  const cleanPaths = [...new Set(paths.filter((p) => p && p !== 'other'))];
  const matched = COST_ROWS.filter((r) => rowMatches(r, { paths: cleanPaths, payments, company, detectedServiceIds }));

  const beforeLaunchRows = matched.filter((r) => r.kind === 'fee' && r.due?.includes('launch'));
  const beforeLaunchTotal = beforeLaunchRows.reduce((sum, r) => sum + r.amount, 0);

  const repeatMap = new Map();
  for (const r of matched.filter((row) => row.kind === 'fee' && row.due?.includes('repeat'))) {
    const prev = repeatMap.get(r.cadence) || { cadence: r.cadence, cadenceLabel: r.cadenceLabel, amount: 0, vendors: [] };
    prev.amount += r.amount;
    prev.vendors.push(r.vendor);
    repeatMap.set(r.cadence, prev);
  }

  const waitRows = matched.filter((r) => r.kind === 'wait');
  const minWaitDays = waitRows.reduce((max, r) => Math.max(max, r.minDays || 0), 0);

  return {
    paths: cleanPaths,
    payments: Boolean(payments),
    company: Boolean(company),
    beforeLaunchTotal,
    beforeLaunchVendors: [...new Set(beforeLaunchRows.map((r) => r.vendor))],
    recurring: [...repeatMap.values()],
    minWaitDays,
    fees: matched.filter((r) => r.kind === 'fee'),
    metered: matched.filter((r) => r.kind === 'use' || r.kind === 'if-used'),
    waits: waitRows,
  };
}
