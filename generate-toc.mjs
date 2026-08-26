#!/usr/bin/env node
// Generates a plain-text table of contents with the same anchors as the site.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siteData } from './data.js';
import { itemAnchorId, subsectionAnchorId } from './catalog-utils.js';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(PROJECT_DIR, 'toc.txt');

export function generateToc(data = siteData) {
  let toc = '';

  for (const section of data.sections || []) {
    toc += `${section.title || section.id} (#${section.id})\n`;
    for (const [subsectionIndex, subsection] of (section.subsections || []).entries()) {
      const subsectionId = subsectionAnchorId(section, subsection, subsectionIndex);
      toc += `  ${subsection.title || subsection.id || 'Untitled'} (#${subsectionId})\n`;
      for (const [itemIndex, item] of (subsection.items || []).entries()) {
        const itemId = itemAnchorId(section, subsection, item, itemIndex, subsectionIndex);
        toc += `    ${item.name} (#${itemId})\n`;
      }
    }
  }

  return toc;
}

function isMainModule() {
  return process.argv[1]
    && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

if (isMainModule()) {
  fs.writeFileSync(OUTPUT_FILE, generateToc(), 'utf8');
  console.log('TOC written to toc.txt');
}
