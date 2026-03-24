#!/usr/bin/env node
// Generates llm.txt from data.js — run after editing content.
// Usage: node generate-llm-txt.mjs

import { siteData } from './data.js';
import fs from 'fs';

function stripHTML(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\u2014/g, ' -- ')
    .replace(/\u2192/g, '->');
}

let totalItems = 0;
for (const s of siteData.sections)
  for (const sub of s.subsections)
    totalItems += sub.items.length;

let out = `# Programmatic G-Code & Code-First CAD — Complete Reference
# Generated from https://kylegrover.github.io/gcode-knowledge-site/
# Feed this to an LLM for context about code-CAD and G-code tools.
#
# Total items: ${totalItems}

`;

for (const section of siteData.sections) {
  out += '='.repeat(80) + '\n';
  out += section.title.toUpperCase() + '\n';
  out += '='.repeat(80) + '\n';
  if (section.description) out += stripHTML(section.description) + '\n';
  out += '\n';

  for (const sub of section.subsections) {
    if (sub.title) out += `--- ${sub.title} ---\n`;
    if (sub.description) out += stripHTML(sub.description) + '\n';
    out += '\n';

    for (const item of sub.items) {
      out += `  ${item.name}`;
      if (item.year) out += ` (${item.year})`;
      out += '\n';
      out += `  URL: ${item.url}\n`;
      if (item.github && item.github !== item.url) out += `  GitHub: ${item.github}\n`;
      if (item.links) {
        for (const [label, url] of Object.entries(item.links)) {
          if (label === 'fork') continue;
          out += `  ${label.charAt(0).toUpperCase() + label.slice(1)}: ${url}\n`;
        }
      }
      if (item.tech?.length) out += `  Tech: ${item.tech.join(', ')}\n`;
      if (item.tags?.length) out += `  Tags: ${item.tags.join(', ')}\n`;
      out += `  ${stripHTML(item.description)}\n\n`;
    }
  }
  out += '\n';
}

fs.writeFileSync('llm.txt', out, 'utf8');
console.log(`Generated llm.txt: ${out.split('\n').length} lines, ${(out.length / 1024).toFixed(1)} KB, ${totalItems} items`);
