// generate-toc.mjs
// Prints a table of contents for data.js (sections, subsections, and their ids/titles)
import { siteData } from './data.js';
import { writeFileSync } from 'fs';

let toc = '';

siteData.sections.forEach(section => {
  toc += `${section.title || section.id}\n`;
  if (section.subsections) {
    section.subsections.forEach(sub => {
      toc += `  ${sub.title || sub.id}\n`;
      if (sub.items) {
        sub.items.forEach(item => {
          toc += `    ${item.name}\n`;
        });
      }
    });
  }
});

writeFileSync('toc.txt', toc);
console.log('TOC written to toc.txt');
