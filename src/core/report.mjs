import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { detectRepo } from './detect.mjs';
import { runAudit } from './audit.mjs';
import { loadRepoState } from './state.mjs';
import { listSecrets } from './vault.mjs';
import { evaluateChecklist } from '../catalog/checklist.mjs';

/**
 * Redacts tokens, API keys, emails, and user home paths so doctor reports are safe to share.
 */
export function redactText(input) {
  if (!input) return '';
  const home = os.homedir();
  const user = os.userInfo().username;
  return String(input)
    .replace(/\b(sk_live_|rk_live_|whsec_|ghp_|gho_|ghu_|ghs_|github_pat_|sk-ant-|sk-proj-|sk-|AKIA|AIza)[A-Za-z0-9_.-]{8,}/g, '[REDACTED_KEY]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g, '[REDACTED_JWT]')
    .replace(/https?:\/\/[^:@\s]+:[^@\s]+@/g, 'https://[REDACTED]@')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replaceAll(home, '~')
    .replace(new RegExp(`/Users/${user}\\b`, 'g'), '~')
    .replace(new RegExp(`/home/${user}\\b`, 'g'), '~');
}

function probeTool(bin, args = ['--version']) {
  try {
    const out = execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 2000 })
      .trim()
      .split('\n')[0];
    return { installed: true, version: redactText(out.slice(0, 80)) };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * Builds a complete, secret-redacted diagnostic report (`shiplaunchpad report`).
 */
export function buildDoctorReport(repoRoot) {
  const detection = detectRepo(repoRoot);
  const state = loadRepoState(repoRoot);
  const audit = runAudit(repoRoot, detection, state.config);
  const checklist = evaluateChecklist({ detection, audit, state, config: state.config });
  const vaultKeys = listSecrets(repoRoot);

  const tools = {
    node: { installed: true, version: process.version },
    git: probeTool('git'),
    gh: probeTool('gh'),
    vercel: probeTool('vercel'),
    wrangler: probeTool('wrangler'),
    gcloud: probeTool('gcloud', ['version']),
    firebase: probeTool('firebase'),
    xcodebuild: os.platform() === 'darwin' ? probeTool('xcodebuild', ['-version']) : { installed: false, version: null },
    fastlane: probeTool('fastlane'),
    java: probeTool('java', ['-version']),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      nodeOk: Number(process.versions.node.split('.')[0]) >= 20,
    },
    repo: {
      name: detection.name,
      isGit: detection.git.hasGit,
      isGitHub: detection.git.isGitHub,
      branch: detection.git.branch,
      remote: redactText(detection.git.remote || 'none'),
      surfaces: detection.surfaces,
      stacks: detection.stacks.map((s) => ({ id: s.id, name: s.name, status: s.status })),
      hosts: detection.hosts.map((h) => h.name),
      services: detection.services.map((s) => s.name),
      workflows: detection.workflows,
    },
    readiness: {
      passed: checklist.passedCount,
      applicable: checklist.applicableCount,
      scorePct: checklist.scorePct,
      criticalFindings: audit.criticalCount,
      warnings: audit.warnCount,
      openManualItems: (state.manualItems || []).filter((m) => !m.done).length,
    },
    vault: {
      storedKeyNames: vaultKeys.map((k) => `${k.keyName} (${k.backend})`),
    },
    toolchain: tools,
    findings: audit.findings.map((f) => ({ severity: f.severity, id: f.id, message: redactText(f.message) })),
  };

  return report;
}
