#!/usr/bin/env node
import { runCli } from '../src/cli.mjs';

try {
  const code = await runCli(process.argv.slice(2));
  if (typeof code === 'number' && code !== 0) process.exit(code);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
