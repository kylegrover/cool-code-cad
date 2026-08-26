#!/usr/bin/env node
// Validates catalog structure and generated artifacts. Add --links for a live URL check.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteData } from './data.js';
import {
  collectCatalogItems,
  itemAnchorId,
  subsectionAnchorId,
} from './catalog-utils.js';
import { generateLlmText } from './generate-llm-txt.mjs';
import { generateToc } from './generate-toc.mjs';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CHECK_LINKS = process.argv.includes('--links');
const errors = [];
const warnings = [];
const anchorIds = new Set();
const duplicatePrimaryUrls = new Map();

function error(location, message) {
  errors.push(`${location}: ${message}`);
}

function warning(location, message) {
  warnings.push(`${location}: ${message}`);
}

function validHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function htmlAnchors(value) {
  return typeof value === 'string' ? value.match(/<a\b[^>]*>/gi) || [] : [];
}

function hrefFromAnchor(anchor) {
  return anchor.match(/\bhref=['"]([^'"]+)['"]/i)?.[1];
}

function validateHtml(value, location) {
  for (const anchor of htmlAnchors(value)) {
    const href = hrefFromAnchor(anchor);
    if (!href) error(location, 'anchor is missing href');
    else if (!href.startsWith('#') && !validHttpUrl(href)) {
      error(location, `invalid anchor URL: ${href}`);
    }
    if (/target=['"]_blank['"]/i.test(anchor) && !/rel=['"][^'"]*noopener/i.test(anchor)) {
      error(location, 'target="_blank" link is missing rel="noopener"');
    }
  }
}

function addAnchor(id, location) {
  if (!id) return error(location, 'anchor is empty');
  if (anchorIds.has(id)) return error(location, `duplicate anchor #${id}`);
  anchorIds.add(id);
}

if (!siteData.meta?.title) error('meta', 'title is required');
if (!siteData.meta?.subtitle) error('meta', 'subtitle is required');
if (!validIsoDate(siteData.meta?.updated)) {
  error('meta.updated', 'expected an ISO date (YYYY-MM-DD)');
}
if (!Array.isArray(siteData.sections) || siteData.sections.length === 0) {
  error('sections', 'expected at least one section');
}

for (const [sectionIndex, section] of (siteData.sections || []).entries()) {
  const sectionLocation = `sections[${sectionIndex}]`;
  if (!section.id) error(sectionLocation, 'id is required');
  if (!section.title) error(sectionLocation, 'title is required');
  addAnchor(section.id, sectionLocation);
  validateHtml(section.description, `${sectionLocation}.description`);
  validateHtml(section.pipeline?.note, `${sectionLocation}.pipeline.note`);

  if (!Array.isArray(section.subsections)) {
    error(sectionLocation, 'subsections must be an array');
    continue;
  }

  for (const [subsectionIndex, subsection] of section.subsections.entries()) {
    const subsectionLocation = `${section.id}.subsections[${subsectionIndex}]`;
    const subsectionId = subsectionAnchorId(section, subsection, subsectionIndex);
    addAnchor(subsectionId, subsectionLocation);
    validateHtml(subsection.description, `${subsectionLocation}.description`);
    if (!Array.isArray(subsection.items)) {
      error(subsectionLocation, 'items must be an array');
      continue;
    }

    const names = new Set();
    for (const [itemIndex, item] of subsection.items.entries()) {
      const itemLocation = `${section.id}/${subsectionId}/items[${itemIndex}]`;
      if (typeof item.name !== 'string' || !item.name.trim()) {
        error(itemLocation, 'name is required');
      }
      if (typeof item.description !== 'string' || !item.description.trim()) {
        error(itemLocation, 'description is required');
      }
      if (!validHttpUrl(item.url)) error(itemLocation, `invalid primary URL: ${item.url}`);
      if (names.has(item.name)) error(itemLocation, `duplicate item name: ${item.name}`);
      names.add(item.name);
      if (item.tags !== undefined && !Array.isArray(item.tags)) {
        error(itemLocation, 'tags must be an array');
      }
      if (item.tech !== undefined && !Array.isArray(item.tech)) {
        error(itemLocation, 'tech must be an array');
      }
      if (item.links !== undefined && (!item.links || Array.isArray(item.links) || typeof item.links !== 'object')) {
        error(itemLocation, 'links must be an object');
      }

      addAnchor(
        itemAnchorId(section, subsection, item, itemIndex, subsectionIndex),
        itemLocation
      );

      if (item.year !== undefined) {
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(item.year) || item.year < 1900 || item.year > currentYear) {
          error(itemLocation, `invalid year: ${item.year}`);
        }
      }

      if (item.stars !== undefined) {
        if (!Number.isInteger(item.stars) || item.stars < 0) {
          error(itemLocation, `invalid star count: ${item.stars}`);
        }
        if (!validIsoDate(item.starsUpdated)) {
          error(itemLocation, 'star counts must include starsUpdated (YYYY-MM-DD)');
        }
      } else if (item.starsUpdated !== undefined) {
        error(itemLocation, 'starsUpdated is present without stars');
      }

      if (item.github && item.links?.github && item.github !== item.links.github) {
        error(itemLocation, 'github and links.github disagree');
      }
      for (const [label, url] of Object.entries(item.links || {})) {
        if (!validHttpUrl(url)) error(itemLocation, `invalid links.${label} URL: ${url}`);
      }

      validateHtml(item.description, `${itemLocation}.description`);

      const normalizedUrl = item.url?.replace(/\/$/, '');
      if (normalizedUrl) {
        const locations = duplicatePrimaryUrls.get(normalizedUrl) || [];
        locations.push(`${section.id}/${subsectionId}/${item.name}`);
        duplicatePrimaryUrls.set(normalizedUrl, locations);
      }
    }
  }
}

for (const [url, locations] of duplicatePrimaryUrls) {
  if (locations.length > 1) {
    warning('duplicate URL', `${url} appears in ${locations.join(', ')}`);
  }
}

const generatedFiles = [
  ['llm.txt', generateLlmText(siteData)],
  ['toc.txt', generateToc(siteData)],
];
for (const [filename, expected] of generatedFiles) {
  const filepath = path.join(PROJECT_DIR, filename);
  const actual = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf8') : null;
  if (actual !== expected) error(filename, 'generated file is stale; run npm run generate');
}

async function checkUrl(url) {
  const options = {
    headers: { 'User-Agent': 'cool-code-cad-link-checker' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  };

  let response;
  try {
    response = await fetch(url, { ...options, method: 'HEAD' });
  } catch {
    // A few healthy servers terminate HEAD requests instead of responding.
  }
  // Some otherwise healthy sites do not implement HEAD consistently. Confirm
  // every failed or non-success response with a small GET before reporting it.
  if (!response?.ok) {
    response = await fetch(url, { ...options, method: 'GET' });
    await response.body?.cancel();
  }
  return response;
}

async function checkCatalogLinks() {
  const urlLocations = new Map();

  function addUrl(url, location) {
    if (!validHttpUrl(url)) return;
    const locations = urlLocations.get(url) || [];
    locations.push(location);
    urlLocations.set(url, locations);
  }

  function addHtmlUrls(value, location) {
    for (const anchor of htmlAnchors(value)) addUrl(hrefFromAnchor(anchor), location);
  }

  for (const section of siteData.sections) {
    addHtmlUrls(section.description, `${section.title} description`);
    addHtmlUrls(section.pipeline?.note, `${section.title} pipeline note`);
    for (const subsection of section.subsections) {
      addHtmlUrls(subsection.description, `${subsection.title || section.title} description`);
      for (const item of subsection.items) {
        for (const url of [item.url, item.github, ...Object.values(item.links || {})]) {
          addUrl(url, item.name);
        }
        addHtmlUrls(item.description, `${item.name} description`);
      }
    }
  }

  const entries = [...urlLocations.entries()];
  let cursor = 0;
  let checked = 0;
  const workers = Array.from({ length: Math.min(12, entries.length) }, async () => {
    while (cursor < entries.length) {
      const entryIndex = cursor++;
      const [url, names] = entries[entryIndex];
      try {
        const response = await checkUrl(url);
        if ([404, 410].includes(response.status)) {
          error(`link (${names.join(', ')})`, `${response.status} ${url}`);
        } else if (!response.ok) {
          warning(`link (${names.join(', ')})`, `${response.status} ${url}`);
        }
      } catch (cause) {
        const reason = cause?.message ? `${cause.name || 'Error'}: ${cause.message}` : 'request failed';
        warning(`link (${names.join(', ')})`, `${reason}: ${url}`);
      }
      checked++;
      if (checked % 50 === 0) console.log(`Checked ${checked}/${entries.length} URLs...`);
    }
  });
  await Promise.all(workers);
  console.log(`Checked ${entries.length} unique URLs.`);
}

if (CHECK_LINKS) await checkCatalogLinks();

for (const message of warnings) console.warn(`WARN ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

console.log(
  `Validated ${siteData.sections.length} sections and ${collectCatalogItems(siteData).length} entries: `
  + `${errors.length} error(s), ${warnings.length} warning(s).`
);

if (errors.length) process.exitCode = 1;
