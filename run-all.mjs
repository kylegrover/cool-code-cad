#!/usr/bin/env node
// run-all.mjs
// Runs all project scripts in sequence: normalize, fetch stars, generate LLM txt, generate TOC
import { execSync } from 'child_process';

const scripts = [
  'normalize-data.mjs',
  'fetch-stars.mjs',
  'generate-llm-txt.mjs',
  'generate-toc.mjs',
];

for (const script of scripts) {
  console.log(`Running ${script}...`);
  execSync(`node ${script}`, { stdio: 'inherit' });
}

console.log('All scripts completed.');
