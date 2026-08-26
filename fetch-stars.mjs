#!/usr/bin/env node
// Refreshes GitHub star snapshots in data.js.
// Usage: node fetch-stars.mjs
//        node fetch-stars.mjs --cache-only
// With auth: GITHUB_TOKEN=ghp_xxx node fetch-stars.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteData } from './data.js';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(PROJECT_DIR, 'data.js');
const CACHE_FILE = path.join(PROJECT_DIR, 'fetch-stars-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const CACHE_ONLY = process.argv.includes('--cache-only');
const DELAY_MS = 250;

function loadCache() {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    cache.stars ||= {};
    cache.projectFetched ||= {};
    return cache;
  } catch {
    return { lastFetched: 0, stars: {}, projectFetched: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function writeData() {
  const output = `export const siteData = ${JSON.stringify(siteData, null, 2)};\n`;
  fs.writeFileSync(DATA_FILE, output, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract owner/repo from a GitHub repository URL. */
function extractOwnerRepo(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) return null;
    const parts = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/i, '')}`;
  } catch {
    return null;
  }
}

function getGitHubUrl(item) {
  if (item.github) return item.github;
  if (item.links?.github) return item.links.github;
  if (item.url?.includes('github.com')) return item.url;
  return null;
}

async function fetchStars(ownerRepo) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cool-code-cad-star-fetcher',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com/repos/${ownerRepo}`, { headers });
  if (response.status === 404) return { error: '404 Not Found', status: 404 };
  if ([403, 429].includes(response.status)) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetAt = response.headers.get('x-ratelimit-reset');
    const resetDate = resetAt
      ? new Date(Number.parseInt(resetAt, 10) * 1000).toLocaleTimeString()
      : 'unknown';
    return {
      error: `Rate limited (${response.status}). Remaining: ${remaining}. Resets at: ${resetDate}`,
      rateLimited: true,
      status: response.status,
    };
  }
  if (!response.ok) {
    return { error: `HTTP ${response.status} ${response.statusText}`, status: response.status };
  }

  const data = await response.json();
  return { stars: data.stargazers_count };
}

async function main() {
  console.log('=== GitHub Star Snapshot Refresh ===');
  console.log(CACHE_ONLY
    ? 'Mode: cache only (no network requests)'
    : `Auth: ${GITHUB_TOKEN ? 'GITHUB_TOKEN (5,000 requests/hour)' : 'anonymous (60 requests/hour)'}`);
  console.log('');

  const cache = loadCache();
  const now = Date.now();
  const repoItems = [];
  const uniqueRepos = new Map();

  for (const section of siteData.sections || []) {
    for (const subsection of section.subsections || []) {
      for (const item of subsection.items || []) {
        const githubUrl = getGitHubUrl(item);
        if (!githubUrl) continue;
        const ownerRepo = extractOwnerRepo(githubUrl);
        if (!ownerRepo) {
          console.log(`SKIP (not a repository URL): ${item.name} -> ${githubUrl}`);
          continue;
        }
        repoItems.push({ item, ownerRepo });
        if (!uniqueRepos.has(ownerRepo)) uniqueRepos.set(ownerRepo, item.name);
      }
    }
  }

  console.log(`Found ${repoItems.length} entries with ${uniqueRepos.size} unique GitHub repositories.`);

  // Seed snapshots from the cache. Stale values remain useful when clearly dated,
  // especially when an anonymous refresh reaches GitHub's hourly limit.
  const starMap = new Map();
  const fetchedMap = new Map();
  for (const ownerRepo of uniqueRepos.keys()) {
    const stars = cache.stars[ownerRepo];
    const fetched = Number(cache.projectFetched[ownerRepo] || 0);
    if (Number.isInteger(stars) && fetched > 0) {
      starMap.set(ownerRepo, stars);
      fetchedMap.set(ownerRepo, fetched);
    }
  }

  const failures = [];
  let fetchedCount = 0;
  let cacheChanged = false;
  let rateLimited = false;

  if (!CACHE_ONLY) {
    const reposToFetch = [...uniqueRepos.keys()].filter((ownerRepo) => {
      const fetched = Number(cache.projectFetched[ownerRepo] || 0);
      return now - fetched >= CACHE_TTL_MS || cache.stars[ownerRepo] === undefined;
    });

    for (const ownerRepo of reposToFetch) {
      fetchedCount++;
      process.stdout.write(`[${fetchedCount}/${reposToFetch.length}] ${ownerRepo} ... `);
      try {
        const result = await fetchStars(ownerRepo);
        if (result.error) {
          console.log(result.error);
          if (result.status === 404) {
            starMap.delete(ownerRepo);
            fetchedMap.delete(ownerRepo);
            delete cache.stars[ownerRepo];
            delete cache.projectFetched[ownerRepo];
            cacheChanged = true;
          } else if (result.rateLimited) {
            rateLimited = true;
            break;
          } else {
            failures.push({ ownerRepo, error: result.error });
          }
        } else {
          console.log(`${result.stars.toLocaleString()} stars`);
          starMap.set(ownerRepo, result.stars);
          fetchedMap.set(ownerRepo, now);
          cache.stars[ownerRepo] = result.stars;
          cache.projectFetched[ownerRepo] = now;
          cacheChanged = true;
        }
      } catch (cause) {
        console.log(`ERROR: ${cause.message}`);
        failures.push({ ownerRepo, error: cause.message });
      }

      if (fetchedCount < reposToFetch.length) await sleep(DELAY_MS);
    }
  }

  if (cacheChanged) {
    cache.lastFetched = now;
    saveCache(cache);
  }

  let snapshotCount = 0;
  let freshCount = 0;
  for (const { item, ownerRepo } of repoItems) {
    const stars = starMap.get(ownerRepo);
    const fetched = fetchedMap.get(ownerRepo);
    if (Number.isInteger(stars) && fetched > 0) {
      item.stars = stars;
      item.starsUpdated = new Date(fetched).toISOString().slice(0, 10);
      snapshotCount++;
      if (now - fetched < CACHE_TTL_MS) freshCount++;
    } else {
      delete item.stars;
      delete item.starsUpdated;
    }
  }

  // A non-GitHub entry should never retain a misleading star count.
  for (const section of siteData.sections || []) {
    for (const subsection of section.subsections || []) {
      for (const item of subsection.items || []) {
        if (!getGitHubUrl(item)) {
          delete item.stars;
          delete item.starsUpdated;
        }
      }
    }
  }

  writeData();

  console.log('');
  console.log(`Wrote ${snapshotCount} dated star snapshots (${freshCount} fresh, ${snapshotCount - freshCount} older).`);
  if (rateLimited) console.log('GitHub rate limit reached; retained older dated snapshots for the remaining repositories.');
  if (failures.length) {
    console.log(`Other failures: ${failures.length}`);
    for (const failure of failures) console.log(`  - ${failure.ownerRepo}: ${failure.error}`);
  }
}

main().catch((cause) => {
  console.error('Fatal error:', cause);
  process.exit(1);
});
