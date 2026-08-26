#!/usr/bin/env node
// Generates llm.txt from data.js. Run after editing or normalizing the catalog.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siteData } from './data.js';
import { collectCatalogItems } from './catalog-utils.js';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(PROJECT_DIR, 'llm.txt');
const SITE_URL = 'https://kylegrover.github.io/cool-code-cad/';

const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const radix = code[1]?.toLowerCase() === 'x' ? 16 : 10;
      const digits = radix === 16 ? code.slice(2) : code.slice(1);
      const point = Number.parseInt(digits, radix);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

export function htmlToText(value = '') {
  return decodeEntities(String(value)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote, url, label) => {
      const text = label.replace(/<[^>]*>/g, '').trim();
      return text === url ? url : `${text} (${url})`;
    })
    .replace(/<br\s*\/?>|<\/(?:div|li|p)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function linkLabel(label) {
  const knownLabels = {
    api: 'API',
    github: 'GitHub',
    npm: 'npm',
    pypi: 'PyPI',
  };
  return knownLabels[label.toLowerCase()] || label.charAt(0).toUpperCase() + label.slice(1);
}

function appendItemLinks(item) {
  const primaryUrl = item.url || item.links?.website || item.links?.github;
  const lines = [];
  const seen = new Set();

  if (primaryUrl) {
    lines.push(`  URL: ${primaryUrl}`);
    seen.add(primaryUrl);
  }

  const candidates = [
    ['github', item.github],
    ...Object.entries(item.links || {}),
  ];
  for (const [label, url] of candidates) {
    if (!url || label === 'fork' || seen.has(url)) continue;
    seen.add(url);
    lines.push(`  ${linkLabel(label)}: ${url}`);
  }

  return lines.join('\n');
}

export function generateLlmText(data = siteData) {
  const totalItems = collectCatalogItems(data).length;
  let out = `# Programmatic G-Code & Code-First CAD — Complete Reference
# Source: ${SITE_URL}
# Repository license: CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/
# Reviewed: ${data.meta?.updated || 'unknown'}
# Curated reference; verify versions, availability, and machine-specific G-code before use.
#
# Total catalog entries: ${totalItems}

`;

  for (const section of data.sections || []) {
    out += '='.repeat(80) + '\n';
    out += `${section.title.toUpperCase()}\n`;
    out += '='.repeat(80) + '\n';
    if (section.description) out += `${htmlToText(section.description)}\n`;
    out += '\n';

    if (section.pipeline) {
      out += '--- HOW THIS PIPELINE WORKS ---\n\n';
      const stages = section.pipeline.stages || [];
      const writeStage = stage => {
        const label = [stage.number, stage.label].filter(Boolean).join(' / ');
        out += `  ${label}: ${stage.title}\n`;
        out += `  ${stage.description}\n`;
        if (stage.emphasis) out += `  Key distinction: ${stage.emphasis}\n`;
        if (stage.examples?.length) out += `  Examples: ${stage.examples.join(', ')}\n`;
        if (stage.formats?.length) {
          out += `  Formats: ${stage.formats.map(format => `${format.name} (${format.detail})`).join(', ')}\n`;
        }
        out += '\n';
      };

      out += '  Creation path:\n';
      for (const stage of stages.filter(stage => ['author', 'evaluate'].includes(stage.role))) {
        writeStage(stage);
      }

      if (section.pipeline.hub) {
        const hub = section.pipeline.hub;
        out += `  ${hub.label}: ${hub.title}\n`;
        out += `  ${hub.description}\n`;
        if (hub.caption) out += `  ${hub.caption}\n`;
        out += '\n';
      }

      out += '  Independent downstream uses of the model:\n';
      for (const stage of stages.filter(stage => ['inspect', 'exchange'].includes(stage.role))) {
        writeStage(stage);
      }

      if (section.pipeline.manufacturing) {
        const manufacturing = section.pipeline.manufacturing;
        out += `  ${manufacturing.number} / ${manufacturing.label}: ${manufacturing.title}\n`;
        out += `  ${manufacturing.description}\n\n`;
      }

      out += '  Manufacturing routes:\n';
      for (const route of section.pipeline.routes || []) {
        const caption = route.caption ? ` — ${route.caption}` : '';
        out += `  - ${route.title}${caption}: ${(route.steps || []).join(' -> ')}\n`;
      }
      out += '\n';

      out += '  Glossary:\n';
      for (const item of section.pipeline.glossary || []) {
        out += `  - ${item.term}: ${item.definition}\n`;
      }
      if (section.pipeline.note) out += `\n  ${htmlToText(section.pipeline.note)}\n`;
      out += '\n';
    }

    for (const subsection of section.subsections || []) {
      if (subsection.title) out += `--- ${subsection.title} ---\n`;
      if (subsection.description) out += `${htmlToText(subsection.description)}\n`;
      out += '\n';

      for (const item of subsection.items || []) {
        out += `  ${item.name}`;
        if (item.year) out += ` (${item.year})`;
        out += '\n';

        const links = appendItemLinks(item);
        if (links) out += `${links}\n`;
        if (item.license) out += `  License / access: ${item.license}\n`;
        if (Number.isInteger(item.stars)) {
          const asOf = item.starsUpdated ? ` (snapshot ${item.starsUpdated})` : '';
          out += `  GitHub stars: ${item.stars}${asOf}\n`;
        }
        if (item.tech?.length) out += `  Tech: ${item.tech.join(', ')}\n`;
        if (item.tags?.length) out += `  Tags: ${item.tags.join(', ')}\n`;
        out += `  ${htmlToText(item.description)}\n\n`;
      }
    }
    out += '\n';
  }

  return out;
}

function isMainModule() {
  return process.argv[1]
    && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

if (isMainModule()) {
  const output = generateLlmText();
  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(
    `Generated llm.txt: ${output.split('\n').length} lines, `
    + `${(output.length / 1024).toFixed(1)} KB, ${collectCatalogItems(siteData).length} entries`
  );
}
