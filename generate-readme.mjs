#!/usr/bin/env node
// Generates the GitHub-facing awesome-list README from the canonical catalog.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siteData } from './data.js';
import { collectCatalogItems, subsectionAnchorId } from './catalog-utils.js';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(PROJECT_DIR, 'README.md');
const SITE_URL = 'https://kylegrover.github.io/cool-code-cad/';
const SUGGEST_URL = 'https://github.com/kylegrover/cool-code-cad/issues/new?template=catalog-suggestion.yml';

function itemMetadata(item) {
  const parts = [];
  if (item.tech?.length) parts.push(item.tech.join(', '));
  if (item.license) parts.push(item.license);
  return parts.length ? ` _(${parts.join(' · ')})_` : '';
}

function renderPipeline(pipeline) {
  if (!pipeline) return '';
  let out = '### The stack in brief\n\n';
  for (const stage of pipeline.stages || []) {
    out += `- **${stage.label}: ${stage.title}** — ${stage.description}\n`;
  }
  if (pipeline.hub) out += `- **${pipeline.hub.label}: ${pipeline.hub.title}** — ${pipeline.hub.description}\n`;
  if (pipeline.manufacturing) {
    out += `- **${pipeline.manufacturing.label}: ${pipeline.manufacturing.title}** — ${pipeline.manufacturing.description}\n`;
  }
  if (pipeline.routes?.length) {
    out += '\n### Manufacturing routes\n\n';
    for (const route of pipeline.routes) {
      out += `- **${route.title}** — ${(route.steps || []).join(' → ')}`;
      if (route.caption) out += ` (${route.caption})`;
      out += '\n';
    }
  }
  return `${out}\n`;
}

export function generateReadme(data = siteData) {
  const totalItems = collectCatalogItems(data).length;
  let out = `# Cool Code CAD\n\n`;
  out += `[![Cool Code CAD — code-first CAD and programmatic manufacturing field guide](docs/cool-code-cad-hero.png)](${SITE_URL})\n\n`;
  out += `A curated list of code-first CAD, geometry kernels, G-code tooling, CAM, slicing, visualization, simulation, and programmatic manufacturing.\n\n`;
  out += `**[Browse the interactive field guide](${SITE_URL}) · [Suggest an addition or change](${SUGGEST_URL}) · [Read the plain-text edition](llm.txt)**\n\n`;
  out += `${totalItems} catalog entries · Last reviewed **${data.meta?.updated || 'unknown'}**\n\n`;
  out += `> This catalog is a starting point, not a compatibility guarantee or endorsement. G-code is controller- and firmware-specific; verify commands, units, coordinate systems, limits, and safety behavior before running generated output.\n\n`;

  out += '## Contents\n\n';
  for (const section of data.sections || []) {
    out += `- [${section.title}](#catalog-${section.id})\n`;
    for (const [subsectionIndex, subsection] of (section.subsections || []).entries()) {
      const id = subsectionAnchorId(section, subsection, subsectionIndex);
      out += `  - [${subsection.title || 'Projects and resources'}](#catalog-${id})\n`;
    }
  }
  out += '\n';

  for (const section of data.sections || []) {
    out += `<a id="catalog-${section.id}"></a>\n\n## ${section.title}\n\n`;
    if (section.description) out += `${section.description}\n\n`;
    out += renderPipeline(section.pipeline);

    for (const [subsectionIndex, subsection] of (section.subsections || []).entries()) {
      const id = subsectionAnchorId(section, subsection, subsectionIndex);
      out += `<a id="catalog-${id}"></a>\n\n### ${subsection.title || 'Projects and resources'}\n\n`;
      if (subsection.description) out += `${subsection.description}\n\n`;
      for (const item of subsection.items || []) {
        out += `- [${item.name}](${item.url}) — ${item.description}${itemMetadata(item)}\n`;
      }
      out += '\n';
    }
  }

  out += `## Contributing\n\n`;
  out += `The easiest way to help is to **[suggest an addition or change](${SUGGEST_URL})**. Rough notes, corrections, and half-formed suggestions are welcome. You can also edit \`data.js\` directly and open a pull request. Prefer official project pages, repositories, documentation, releases, or papers as sources.\n\n`;
  out += `After changing \`data.js\`, run:\n\n\`\`\`text\nnpm run generate\nnpm test\n\`\`\`\n\n`;
  out += `The interactive site is dependency-free and can be previewed with \`npm start\`, then opened at <http://127.0.0.1:8000>.\n\n`;
  out += `## License\n\nThe code and original catalog content are dedicated to the public domain under [CC0 1.0 Universal](LICENSE). Third-party project names, trademarks, and linked materials remain subject to their respective owners’ rights and terms.\n`;
  return out;
}

function isMainModule() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

if (isMainModule()) {
  fs.writeFileSync(OUTPUT_FILE, generateReadme(), 'utf8');
  console.log('README written to README.md');
}
