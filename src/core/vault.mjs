import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getGlobalHome } from './state.mjs';

function projectSlug(repoRoot) {
  const abs = path.resolve(repoRoot);
  const hash = crypto.createHash('sha256').update(abs).digest('hex').slice(0, 8);
  const base = path.basename(abs).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${base}-${hash}`;
}

function resolveBackend(explicitBackend) {
  if (explicitBackend) return explicitBackend;
  if (process.env.SHIPLAUNCHPAD_VAULT_BACKEND) return process.env.SHIPLAUNCHPAD_VAULT_BACKEND;
  if (os.platform() === 'darwin' && !process.env.SHIPLAUNCHPAD_VAULT_PASSPHRASE) {
    try {
      execFileSync('which', ['security'], { stdio: 'ignore' });
      return 'keychain';
    } catch {
      return 'encrypted-file';
    }
  }
  return 'encrypted-file';
}

function vaultFilePath() {
  return path.join(getGlobalHome(), 'vault.enc');
}

function requirePassphrase() {
  const pass = process.env.SHIPLAUNCHPAD_VAULT_PASSPHRASE;
  if (!pass || pass.length < 8) {
    throw new Error(
      'Encrypted file vault requires SHIPLAUNCHPAD_VAULT_PASSPHRASE (>= 8 chars) in the environment.'
    );
  }
  return pass;
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32);
}

function readEncryptedVault() {
  const fp = vaultFilePath();
  if (!fs.existsSync(fp)) return { entries: {} };
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const pass = requirePassphrase();
  const key = deriveKey(pass, Buffer.from(raw.salt, 'hex'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
  const plain = Buffer.concat([decipher.update(Buffer.from(raw.ciphertext, 'hex')), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}

function writeEncryptedVault(data) {
  const home = getGlobalHome();
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  const pass = requirePassphrase();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(pass, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = {
    version: 1,
    algorithm: 'aes-256-gcm',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
  fs.writeFileSync(vaultFilePath(), JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
}

function keychainService(repoRoot) {
  return `shiplaunchpad.${projectSlug(repoRoot)}`;
}

/**
 * Stores a secret value in macOS Keychain or AES-256-GCM encrypted local vault.
 */
export function setSecret(repoRoot, keyName, secretValue, { backend } = {}) {
  if (!keyName || !/^[A-Z0-9_.-]+$/i.test(keyName)) {
    throw new Error(`Invalid secret key name: ${keyName}`);
  }
  if (!secretValue) throw new Error('Secret value cannot be empty.');
  const chosen = resolveBackend(backend);

  if (chosen === 'keychain') {
    const svc = keychainService(repoRoot);
    execFileSync('security', ['add-generic-password', '-U', '-a', keyName, '-s', svc, '-w', secretValue], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    // Record non-secret metadata index so `vault list` never probes secret values
    recordVaultMeta(repoRoot, keyName, 'keychain');
    return { keyName, backend: 'keychain', stored: true };
  }

  const vault = readEncryptedVault();
  const slug = projectSlug(repoRoot);
  if (!vault.entries[slug]) vault.entries[slug] = {};
  vault.entries[slug][keyName] = { value: secretValue, updatedAt: new Date().toISOString() };
  writeEncryptedVault(vault);
  recordVaultMeta(repoRoot, keyName, 'encrypted-file');
  return { keyName, backend: 'encrypted-file', stored: true };
}

export function hasSecret(repoRoot, keyName, { backend } = {}) {
  const chosen = resolveBackend(backend);
  if (chosen === 'keychain') {
    try {
      execFileSync('security', ['find-generic-password', '-a', keyName, '-s', keychainService(repoRoot)], {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }
  const fp = vaultFilePath();
  if (!fs.existsSync(fp)) return false;
  const vault = readEncryptedVault();
  return Boolean(vault.entries?.[projectSlug(repoRoot)]?.[keyName]);
}

export function getSecret(repoRoot, keyName, { backend } = {}) {
  const chosen = resolveBackend(backend);
  if (chosen === 'keychain') {
    const out = execFileSync('security', ['find-generic-password', '-a', keyName, '-s', keychainService(repoRoot), '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.replace(/\r?\n$/, '');
  }
  const vault = readEncryptedVault();
  const entry = vault.entries?.[projectSlug(repoRoot)]?.[keyName];
  if (!entry) throw new Error(`Secret not found in vault: ${keyName}`);
  return entry.value;
}

export function deleteSecret(repoRoot, keyName, { backend } = {}) {
  const chosen = resolveBackend(backend);
  if (chosen === 'keychain') {
    try {
      execFileSync('security', ['delete-generic-password', '-a', keyName, '-s', keychainService(repoRoot)], {
        stdio: 'ignore',
      });
    } catch {
      // Ignore if already absent
    }
  } else if (fs.existsSync(vaultFilePath())) {
    const vault = readEncryptedVault();
    const slug = projectSlug(repoRoot);
    if (vault.entries?.[slug]) {
      delete vault.entries[slug][keyName];
      writeEncryptedVault(vault);
    }
  }
  removeVaultMeta(repoRoot, keyName);
  return { keyName, deleted: true };
}

function metaFilePath() {
  return path.join(getGlobalHome(), 'vault-index.json');
}

function readVaultMeta() {
  const fp = metaFilePath();
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return {};
  }
}

function recordVaultMeta(repoRoot, keyName, backend) {
  const home = getGlobalHome();
  fs.mkdirSync(home, { recursive: true });
  const meta = readVaultMeta();
  const slug = projectSlug(repoRoot);
  if (!meta[slug]) meta[slug] = {};
  meta[slug][keyName] = { backend, updatedAt: new Date().toISOString() };
  fs.writeFileSync(metaFilePath(), JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

function removeVaultMeta(repoRoot, keyName) {
  const fp = metaFilePath();
  if (!fs.existsSync(fp)) return;
  const meta = readVaultMeta();
  const slug = projectSlug(repoRoot);
  if (meta[slug]) {
    delete meta[slug][keyName];
    fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  }
}

/**
 * Lists only key names and backend metadata — never reads or returns secret values.
 */
export function listSecrets(repoRoot) {
  const meta = readVaultMeta();
  const entries = meta[projectSlug(repoRoot)] || {};
  return Object.entries(entries).map(([keyName, info]) => ({
    keyName,
    backend: info.backend,
    updatedAt: info.updatedAt,
  }));
}
