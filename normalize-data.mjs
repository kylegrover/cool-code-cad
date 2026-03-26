#!/usr/bin/env node
// Normalize data.js schema:
// - Aggregate url/github into links: { website, github }
// - Add license metadata from tags
// - Keep existing url/github for backwards compatibility (optional)

import fs from 'fs';
import { siteData } from './data.js';

const KNOWN_LICENSE_MAP = {
  mit: 'MIT',
  gplv3: 'GPLv3',
  gpl: 'GPL',
  lgpl: 'LGPL',
  apache: 'Apache',
  bsd: 'BSD',
  proprietary: 'Proprietary',
  commercial: 'Proprietary',
  'open-source': 'Open Source',
  free: 'Free',
};

function extractLicense(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return undefined;
  }

  const normalized = tags.map((t) => String(t).trim().toLowerCase());

  if (normalized.includes('mit')) return 'MIT';
  if (normalized.includes('gplv3')) return 'GPLv3';
  if (normalized.includes('gpl')) return 'GPL';
  if (normalized.includes('lgpl')) return 'LGPL';
  if (normalized.includes('apache')) return 'Apache';
  if (normalized.includes('bsd')) return 'BSD';
  if (normalized.includes('commercial')) return 'Proprietary';
  if (normalized.includes('proprietary')) return 'Proprietary';
  if (normalized.includes('open-source')) return 'Open Source';
  if (normalized.includes('free')) return 'Free';

  return undefined;
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return;

  item.links = item.links || {};

  // Prefer explicit `.links` entries; fallback to legacy top-level fields.
  if (item.url) {
    if (!item.links.website) {
      item.links.website = item.url;
    }
    if (!item.links.github && item.url.includes('github.com')) {
      item.links.github = item.url;
    }
  }

  if (item.github) {
    if (!item.links.github) {
      item.links.github = item.github;
    }
  }

  // Ensure license field is present when tags include source info
  if (!item.license) {
    const candidate = extractLicense(item.tags);
    if (candidate) {
      item.license = candidate;
    }
  }

  // Keep url/github unchanged for backward compatibility for now.
  // Potential future cleanup: remove top-level url/github once all views rely on links.
}

function normalizeAll() {
  if (!siteData || !Array.isArray(siteData.sections)) {
    console.error('Unexpected data structure in data.js');
    process.exit(1);
  }

  for (const section of siteData.sections ?? []) {
    for (const sub of section.subsections ?? []) {
      for (const item of sub.items ?? []) {
        normalizeItem(item);
      }
    }
  }

  const dataText = `export const siteData = ${JSON.stringify(siteData, null, 2)};\n`;
  fs.writeFileSync('data.js', dataText, 'utf8');
  console.log('✅ data.js normalized (links + license metadata added).');
}

normalizeAll();
