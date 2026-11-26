import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectRepo } from '../src/core/detect.mjs';
import { runAudit } from '../src/core/audit.mjs';

test('runAudit detects secret leaks without printing secret value, plus RLS, Stripe HMAC, Vercel Hobby, iOS/Android traps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slp-audit-'));
  try {
    const fakeSecret = 'sk_live_' + '999988887777666655554444';
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          next: '15.0.0',
          stripe: '16.0.0',
          '@supabase/supabase-js': '2.0.0',
          openai: '4.0.0',
          '@react-native-google-signin/google-signin': '12.0.0',
          'react-native': '0.75.0',
        },
      })
    );
    fs.writeFileSync(path.join(dir, '.env'), 'SECRET=should_never_be_read\n');
    fs.writeFileSync(path.join(dir, 'vercel.json'), '{}');
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'src/app.ts'),
      `const k = "${fakeSecret}";\nconst redir = "http://localhost:3000/callback";\nAVCaptureDevice.requestAccess();\nsignUp();\n`
    );
    fs.mkdirSync(path.join(dir, 'supabase/migrations'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'supabase/migrations/001.sql'), 'CREATE TABLE users (id uuid);');
    fs.mkdirSync(path.join(dir, 'ios'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ios/Info.plist'), '<plist><dict></dict></plist>');
    fs.mkdirSync(path.join(dir, 'android/app/src/main'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'android/app/src/main/AndroidManifest.xml'),
      '<manifest><application android:debuggable="true" android:usesCleartextTraffic="true" android:allowBackup="true"/></manifest>'
    );

    const det = detectRepo(dir);
    const audit = runAudit(dir, det, { payments: true });
    const ids = new Set(audit.findings.map((f) => f.id));

    assert.equal(audit.passed, false);
    assert.ok(ids.has('env-not-gitignored'));
    assert.ok(ids.has('hardcoded-secrets'));
    assert.ok(ids.has('supabase-missing-rls'));
    assert.ok(ids.has('supabase-default-smtp'));
    assert.ok(ids.has('localhost-auth-redirect'));
    assert.ok(ids.has('vercel-commercial-plan'));
    assert.ok(ids.has('stripe-webhook-hmac'));
    assert.ok(ids.has('ai-no-rate-limit'));
    assert.ok(ids.has('missing-in-app-account-deletion'));
    assert.ok(ids.has('missing-sign-in-with-apple'));
    assert.ok(ids.has('plist-missing-NSCameraUsageDescription'));
    assert.ok(ids.has('android-debuggable'));
    assert.ok(ids.has('android-cleartext'));

    // Zero-Secret Law: matched secret value MUST NOT appear anywhere in audit output
    const serialized = JSON.stringify(audit);
    assert.equal(serialized.includes(fakeSecret), false);
    assert.equal(serialized.includes('should_never_be_read'), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
