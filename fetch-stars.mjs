#!/usr/bin/env node
// Fetches GitHub star counts for all items in data.js and updates the file.
// Usage: node fetch-stars.mjs
// With auth: GITHUB_TOKEN=ghp_xxx node fetch-stars.mjs


import { siteData } from './data.js';
import fs from 'fs';
import { execSync } from 'child_process';

const CACHE_FILE = 'fetch-stars-cache.json';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    return data;
  } catch {
    return { lastFetched: 0, stars: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const DELAY_MS = 1000; // 1 second between requests

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract owner/repo from a GitHub URL.
 * Returns null for non-repo URLs (org pages, plain github.com, etc.).
 */
function extractOwnerRepo(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      return null;
    }
    // pathname like /owner/repo or /owner/repo/...
    const parts = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      // Org-only URL like https://github.com/grblHAL
      return null;
    }
    // Filter out non-repo paths (e.g., /owner/repo/issues)
    // We only care about the first two segments
    return `${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

/**
 * Find the best GitHub URL for an item.
 * Priority: item.github > item.links.github > item.url (if github.com)
 */
function getGitHubUrl(item) {
  if (item.github) return item.github;
  if (item.links?.github) return item.links.github;
  if (item.url && item.url.includes('github.com')) return item.url;
  return null;
}

/**
 * Fetch star count for a given owner/repo.
 */
async function fetchStars(ownerRepo) {
  const url = `https://api.github.com/repos/${ownerRepo}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'gcode-knowledge-site-star-fetcher',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const resp = await fetch(url, { headers });

  if (resp.status === 404) {
    return { error: '404 Not Found' };
  }
  if (resp.status === 403 || resp.status === 429) {
    const remaining = resp.headers.get('x-ratelimit-remaining');
    const resetAt = resp.headers.get('x-ratelimit-reset');
    const resetDate = resetAt ? new Date(parseInt(resetAt) * 1000).toLocaleTimeString() : 'unknown';
    return { error: `Rate limited (${resp.status}). Remaining: ${remaining}. Resets at: ${resetDate}` };
  }
  if (!resp.ok) {
    return { error: `HTTP ${resp.status} ${resp.statusText}` };
  }

  const data = await resp.json();
  return { stars: data.stargazers_count };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {

  console.log('=== GitHub Star Fetcher ===');
  console.log(`Auth: ${GITHUB_TOKEN ? 'Using GITHUB_TOKEN (5000 req/hr)' : 'Anonymous (60 req/hr)'}`);
  console.log('');

  // Load cache and check TTL
  const cache = loadCache();
  const now = Date.now();
  if (cache.lastFetched && now - cache.lastFetched < CACHE_TTL_MS) {
    console.log(`Using cached star data (last fetched ${(new Date(cache.lastFetched)).toLocaleString()})`);
    return;
  }

  // Collect all items with GitHub repos
  const repoItems = []; // { name, ownerRepo, ghUrl }
  const seen = new Set(); // deduplicate by ownerRepo

  for (const section of siteData.sections) {
    for (const sub of section.subsections) {
      for (const item of sub.items) {
        const ghUrl = getGitHubUrl(item);
        if (!ghUrl) continue;
        const ownerRepo = extractOwnerRepo(ghUrl);
        if (!ownerRepo) {
          console.log(`  SKIP (not a repo URL): ${item.name} -> ${ghUrl}`);
          continue;
        }
        if (seen.has(ownerRepo)) {
          // Still record it so the same star count applies to duplicate entries
          repoItems.push({ name: item.name, ownerRepo, ghUrl, duplicate: true });
          continue;
        }
        seen.add(ownerRepo);
        repoItems.push({ name: item.name, ownerRepo, ghUrl, duplicate: false });
      }
    }
  }

  console.log(`Found ${repoItems.length} items with GitHub repos (${seen.size} unique repos)`);
  console.log('');


  // Fetch stars
  const starMap = new Map(); // ownerRepo -> star count
  const failures = [];
  let fetchCount = 0;
  let rateLimited = false;

  for (const entry of repoItems) {
    if (entry.duplicate) continue; // already fetched or will fetch

    fetchCount++;
    process.stdout.write(`[${fetchCount}/${seen.size}] ${entry.ownerRepo} ... `);

    try {
      const result = await fetchStars(entry.ownerRepo);
      if (result.error) {
        if (result.error.includes('Rate limited')) {
          console.log(`RATE LIMIT: ${result.error}`);
          rateLimited = true;
          break;
        } else if (result.error.includes('404')) {
          console.log(`404 Not Found`);
          failures.push({ name: entry.name, ownerRepo: entry.ownerRepo, error: result.error });
        } else {
          console.log(`FAIL: ${result.error}`);
          failures.push({ name: entry.name, ownerRepo: entry.ownerRepo, error: result.error });
        }
      } else {
        console.log(`${result.stars.toLocaleString()} stars`);
        starMap.set(entry.ownerRepo, result.stars);
        cache.stars[entry.ownerRepo] = result.stars;
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failures.push({ name: entry.name, ownerRepo: entry.ownerRepo, error: err.message });
    }

    if (rateLimited) break;
    // Rate limit delay (skip after last request)
    if (fetchCount < seen.size) {
      await sleep(DELAY_MS);
    }
  }

  // Save cache
  cache.lastFetched = Date.now();
  saveCache(cache);

  console.log('');
  console.log(`Fetched stars for ${starMap.size} repos`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.length}`);
    for (const f of failures) {
      console.log(`  - ${f.name} (${f.ownerRepo}): ${f.error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Update data.js
  // ---------------------------------------------------------------------------
  if (starMap.size === 0) {
    console.log('\nNo stars to update. Exiting.');
    return;
  }

  console.log('\nUpdating data.js ...');

  const dataText = fs.readFileSync('data.js', 'utf8');
  const lines = dataText.split('\n');
  const output = [];

  // Process line by line, collecting context per item block
  // When we see a `url:` line we scan the surrounding block to figure out
  // which repo it belongs to and where to place the stars line.
  let i = 0;
  let updatedCount = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect url: line inside an item object
    const urlMatch = line.match(/^(\s*)url:\s*'([^']+)'/);
    if (!urlMatch) {
      // If this is an existing stars: line, check if the *next pass* will
      // replace it — but we handle that below. Just emit for now.
      output.push(line);
      i++;
      continue;
    }

    const indent = urlMatch[1];
    const url = urlMatch[2];

    // Scan backward from url: to find github: that may precede it
    let githubUrl = null;
    for (let b = output.length - 1; b >= Math.max(0, output.length - 5); b--) {
      const bline = output[b];
      const ghM = bline.match(/^\s*github:\s*'([^']+)'/);
      if (ghM) { githubUrl = ghM[1]; break; }
      if (bline.match(/^\s*name:/)) break;
    }

    // Scan forward from url: to find year:, github:, links:{github:}, stars:
    let yearOffset = -1;   // offset relative to url line
    let starsOffset = -1;
    let scanEnd = Math.min(lines.length, i + 20);

    for (let j = i + 1; j < scanEnd; j++) {
      const jline = lines[j];
      // Stop at next item or block close
      if (jline.match(/^\s*name:\s*'/) || jline.match(/^\s*\},?\s*$/)) break;

      if (jline.match(/^\s*year:/)) yearOffset = j - i;
      if (jline.match(/^\s*stars:/)) starsOffset = j - i;

      const ghM = jline.match(/^\s*github:\s*'([^']+)'/);
      if (ghM) githubUrl = ghM[1];

      const linksGhM = jline.match(/links:\s*\{[^}]*github:\s*'([^']+)'/);
      if (linksGhM && !githubUrl) githubUrl = linksGhM[1];
    }

    // Determine repo and star count
    const effectiveGhUrl = githubUrl || (url.includes('github.com') ? url : null);
    const ownerRepo = effectiveGhUrl ? extractOwnerRepo(effectiveGhUrl) : null;
    const stars = ownerRepo !== null ? starMap.get(ownerRepo) : undefined;

    if (stars === undefined) {
      // No stars data — emit url line as-is
      output.push(line);
      i++;
      continue;
    }

    // We have stars for this item
    if (starsOffset !== -1) {
      // There's an existing stars: line — emit lines up to it, replace it
      for (let k = 0; k <= starsOffset; k++) {
        if (k === starsOffset) {
          const starsIndent = lines[i + k].match(/^(\s*)/)[1];
          output.push(`${starsIndent}stars: ${stars},`);
        } else {
          output.push(lines[i + k]);
        }
      }
      i += starsOffset + 1;
      updatedCount++;
    } else {
      // No existing stars line — insert after year: or after url:
      const insertAfterOffset = yearOffset !== -1 ? yearOffset : 0;
      for (let k = 0; k <= insertAfterOffset; k++) {
        output.push(lines[i + k]);
      }
      output.push(`${indent}stars: ${stars},`);
      i += insertAfterOffset + 1;
      updatedCount++;
    }
  }

  const updatedText = output.join('\n');
  fs.writeFileSync('data.js', updatedText, 'utf8');
  console.log(`data.js updated (${updatedCount} items).`);

  // ---------------------------------------------------------------------------
  // Normalize link schema and license metadata
  // ---------------------------------------------------------------------------
  console.log('\nNormalizing data schema with normalize-data.mjs ...');
  try {
    execSync('node normalize-data.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to normalize data.js:', err.message);
  }

  // ---------------------------------------------------------------------------
  // Regenerate llm.txt
  // ---------------------------------------------------------------------------
  console.log('\nRegenerating llm.txt ...');
  try {
    execSync('node generate-llm-txt.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to regenerate llm.txt:', err.message);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n=== Summary ===');
  console.log(`Repos found:    ${seen.size}`);
  console.log(`Stars fetched:  ${starMap.size}`);
  console.log(`Failures:       ${failures.length}`);
  if (starMap.size > 0) {
    const sorted = [...starMap.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\nTop 10 by stars:`);
    for (const [repo, stars] of sorted.slice(0, 10)) {
      console.log(`  ${stars.toLocaleString().padStart(8)} ${repo}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
