#!/usr/bin/env node
// run-all.mjs
// Runs the complete maintenance sequence: normalize, refresh stars, regenerate, validate.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));

const scripts = [
  'normalize-data.mjs',
  'fetch-stars.mjs',
  'generate-llm-txt.mjs',
  'generate-toc.mjs',
  'generate-readme.mjs',
  'validate-data.mjs',
];

for (const script of scripts) {
  console.log(`Running ${script}...`);
  execFileSync(process.execPath, [path.join(PROJECT_DIR, script)], {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
  });
}

console.log('All scripts completed.');
