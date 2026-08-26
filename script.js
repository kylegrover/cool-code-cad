import { siteData } from './data.js';
import { itemAnchorId, subsectionAnchorId } from './catalog-utils.js';

// ============================================================================
// Renderer — turns siteData into DOM
// ============================================================================

const app = document.getElementById('app');
const heroTitle = document.getElementById('hero-title');
const heroSubtitle = document.getElementById('hero-subtitle');
const heroNav = document.getElementById('hero-nav');
const searchInput = document.getElementById('search');
const searchMeta = document.getElementById('search-meta');
const stickyBar = document.getElementById('sticky-bar');

// --- Hero -------------------------------------------------------------------

heroTitle.innerHTML = siteData.meta.title.replace('\n', '<br>');
heroSubtitle.innerHTML = siteData.meta.subtitle;

if (siteData.meta.updated) {
  const kicker = document.createElement('p');
  kicker.className = 'hero-kicker';
  kicker.textContent = `Curated field guide · reviewed ${siteData.meta.updated}`;
  heroTitle.before(kicker);
}

// --- Nav --------------------------------------------------------------------

function buildNav(sections) {
  heroNav.innerHTML = '';
  for (const section of sections) {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    a.textContent = section.title;
    heroNav.appendChild(a);
  }
}

buildNav(siteData.sections);

// --- Card rendering ---------------------------------------------------------

function renderItem(item, anchorId, headingLevel) {
  if (item.featured) {
    return renderFeaturedCard(item, anchorId, headingLevel);
  }
  return renderLinkCard(item, anchorId, headingLevel);
}

// Build the links row for any card (GitHub link, website, extras)
function buildLinksHTML(item) {
  const parts = [];
  const githubUrl = item.links?.github || item.github || (isGitHubUrl(item.url) ? item.url : null);
  const websiteUrl = item.links?.website || (item.url && !isGitHubUrl(item.url) ? item.url : null);

  if (githubUrl) {
    parts.push(`<a href="${esc(githubUrl)}" target="_blank" rel="noopener" title="GitHub">GitHub</a>`);
  }
  if (websiteUrl && websiteUrl !== githubUrl) {
    parts.push(`<a href="${esc(websiteUrl)}" target="_blank" rel="noopener" title="Website">Website</a>`);
  }
  // Extra links from .links (docs, npm, pypi, etc.) — skip website/github (already shown)
  if (item.links) {
    for (const [label, url] of Object.entries(item.links)) {
      if (['website', 'github', 'fork'].includes(label)) continue;
      if (label.match(/^website\d+$/)) continue; // skip website2, etc.
      const display = label.charAt(0).toUpperCase() + label.slice(1);
      parts.push(`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(display)}</a>`);
    }
  }
  return parts.join('');
}

function buildMetaHTML(item) {
  const parts = [];
  if (item.year) parts.push(`<span class="meta-year" title="First released">${item.year}</span>`);
  if (Number.isInteger(item.stars)) {
    const snapshot = item.starsUpdated ? ` as of ${item.starsUpdated}` : '';
    const snapshotLabel = item.starsUpdated
      ? `<small class="meta-as-of">${esc(formatSnapshotDate(item.starsUpdated))}</small>`
      : '';
    parts.push(
      `<span class="meta-stars" title="GitHub stars${esc(snapshot)}" `
      + `aria-label="${item.stars.toLocaleString()} GitHub stars${esc(snapshot)}">`
      + `\u2605 ${formatStars(item.stars)}${snapshotLabel}</span>`
    );
  }
  if (item.license) {
    parts.push(`<span class="meta-license" title="License or access model">${esc(item.license)}</span>`);
  }
  return parts.length ? `<div class="card-meta">${parts.join('')}</div>` : '';
}

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function formatSnapshotDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function isGitHubUrl(url) {
  return url && (url.includes('github.com') || url.includes('codeberg.org'));
}

function renderFeaturedCard(item, anchorId, headingLevel) {
  const div = document.createElement('div');
  div.className = 'card';
  div.id = anchorId;
  div.dataset.searchable = searchableText(item);

  let headerHTML = '<div class="card-header">';
  if (item.badge) {
    headerHTML += `<div class="card-badge badge--star">${esc(item.badge)}</div>`;
  }
  headerHTML += `<div class="card-links">${buildLinksHTML(item)}</div>`;
  headerHTML += '</div>';

  const headingTag = headingLevel === 3 ? 'h3' : 'h4';
  let bodyHTML = `<${headingTag}><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></${headingTag}>`;
  if (item.tagline) {
    bodyHTML += `<p class="card-tagline">${esc(item.tagline)}</p>`;
  }
  bodyHTML += buildMetaHTML(item);
  bodyHTML += `<p>${item.description}</p>`;

  if (item.tech && item.tech.length) {
    bodyHTML += '<div class="card-tech">';
    for (const t of item.tech) {
      bodyHTML += `<span>${esc(t)}</span>`;
    }
    bodyHTML += '</div>';
  }

  div.innerHTML = headerHTML + bodyHTML;
  return div;
}

function renderLinkCard(item, anchorId, headingLevel) {
  const div = document.createElement('div');
  div.className = 'link-card';
  div.id = anchorId;
  div.dataset.searchable = searchableText(item);

  const linksHTML = buildLinksHTML(item);
  const headingTag = headingLevel === 3 ? 'h3' : 'h4';
  let html = '<div class="link-card-header">';
  html += `<${headingTag}><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></${headingTag}>`;
  if (linksHTML) html += `<div class="card-links">${linksHTML}</div>`;
  html += '</div>';
  html += buildMetaHTML(item);
  html += `<p>${item.description}</p>`;

  if (item.tech && item.tech.length) {
    html += '<div class="card-tech">';
    for (const t of item.tech) {
      html += `<span>${esc(t)}</span>`;
    }
    html += '</div>';
  }

  div.innerHTML = html;
  return div;
}

// --- CAD pipeline infographic ----------------------------------------------

function pipelineVisual(kind) {
  const common = 'class="pipeline-visual" viewBox="0 0 240 150" aria-hidden="true" focusable="false"';

  if (kind === 'blueprint') {
    return `<svg ${common}>
      <rect class="pipeline-visual-frame" x="1" y="1" width="238" height="148" rx="8" />
      <path class="pipeline-blueprint-grid" d="M1 30h238M1 59h238M1 89h238M1 118h238M40 1v148M80 1v148M120 1v148M160 1v148M200 1v148" />
      <path class="pipeline-visual-fill" d="M27 105V80h58l30-36h54a36 36 0 0 1 0 72H80l-17-11H27Z" />
      <circle class="pipeline-visual-cut" cx="169" cy="80" r="19" />
      <circle class="pipeline-visual-cut" cx="169" cy="80" r="11" />
      <circle class="pipeline-visual-cut" cx="55" cy="92" r="7" />
      <path class="pipeline-blueprint-centerline" d="M169 51v58M140 80h58M55 79v26M42 92h26" />
      <path class="pipeline-visual-dimension" d="M27 122v17m178-23v23M27 134h178M214 44h15m-15 72h15M224 44v72M115 36V20m54 17V20M115 25h54" />
      <path class="pipeline-visual-tick" d="m27 134 7-4m-7 4 7 4m171-4-7-4m7 4-7 4m26-90-4 7m4-7 4 7m-4 65-4-7m4 7 4-7m-109-84 7-4m-7 4 7 4m47-4-7-4m7 4-7 4" />
      <path class="pipeline-blueprint-leader" d="m151 64-22-21H98" />
      <text x="116" y="131">80 mm</text><text x="142" y="22">Ø20</text><text x="222" y="83" transform="rotate(-90 222 83)">40 mm</text><text x="85" y="40">R5 FILLET</text>
    </svg>`;
  }

  if (kind === 'solid') {
    return `<svg ${common}>
      <ellipse class="pipeline-visual-shadow" cx="121" cy="130" rx="98" ry="12" />
      <path class="pipeline-solid-base-side" d="m23 101 128 21 66-38v14l-66 40-128-22Z" />
      <path class="pipeline-solid-base-top" d="m23 101 59-34 135 17-66 38Z" />
      <path class="pipeline-solid-web-side" d="m82 67 38-22 36 19v54l-26-4-30-33Z" />
      <path class="pipeline-solid-upright-side" d="m120 45 48-28 39 22v56l-51 29V64Z" />
      <path class="pipeline-solid-upright-front" d="m168 17 39 22v56l-39-22Z" />
      <ellipse class="pipeline-solid-boss" cx="177" cy="49" rx="25" ry="29" transform="rotate(-28 177 49)" />
      <ellipse class="pipeline-visual-cut" cx="177" cy="49" rx="11" ry="16" transform="rotate(-28 177 49)" />
      <ellipse class="pipeline-solid-hole-rim" cx="63" cy="98" rx="15" ry="8" />
      <ellipse class="pipeline-visual-cut" cx="63" cy="98" rx="10" ry="5" />
      <path class="pipeline-solid-highlight" d="m27 99 56-29 132 16M123 44l45-24 35 20M153 120V66" />
      <path class="pipeline-visual-edge" d="m23 101 128 21 66-38M151 122v16M217 84v14M82 67l48 47m-10-69 36 19 51-25" />
    </svg>`;
  }

  if (kind === 'wireframe') {
    return `<svg ${common}>
      <rect class="pipeline-viewport-frame" x="1" y="1" width="238" height="148" rx="8" />
      <path class="pipeline-viewport-grid" d="M18 128 121 69l101 51M38 140l103-59m-70 66 91-52m-142 24 119 20m-99-32 119 20m-99-32 119 20" />
      <path class="pipeline-wire-fill" d="m19 105 59-34 38-22 48-28 39 22v56l-55 33-129-14Z" />
      <path class="pipeline-wire-edge" d="m19 105 59-34 70 17 55-45M19 105l129 27 55-33M78 71l38-22 48-28 39 22M116 49l32 39v44M164 21l39 78M78 71l22 48m48-31 55 11M19 105l129-17M45 90l55 29m-22-48 70 61m0-44 55-45m-87 6 48 51m0-79v79M43 119l57-47m0 47 48-31m0 44 55-89M19 105l59-5 70 32m-70-61 70 17m-32-39 87 50" />
      <ellipse class="pipeline-wire-boss" cx="174" cy="54" rx="25" ry="29" transform="rotate(-28 174 54)" />
      <path class="pipeline-wire-facets" d="m153 37 41 33m-45-11 49 5m-44 15 36-47m-35 67 38-56M152 44l44 28M149 70l47-22" />
      <ellipse class="pipeline-visual-cut" cx="174" cy="54" rx="11" ry="16" transform="rotate(-28 174 54)" />
      <ellipse class="pipeline-wire-boss" cx="59" cy="101" rx="15" ry="8" />
      <ellipse class="pipeline-visual-cut" cx="59" cy="101" rx="9" ry="4.5" />
      <g class="pipeline-viewport-tools"><circle cx="224" cy="18" r="5" /><path d="m221 18 3-3 3 3m-3-3v7M219 35h10m-5-5v10M220 49l8 8m0-8-8 8" /></g>
    </svg>`;
  }

  if (kind === 'model') {
    return `<svg class="pipeline-visual pipeline-visual--model" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <path class="pipeline-model-face pipeline-model-face--top" d="m80 18 55 31-55 32-55-32Z" />
      <path class="pipeline-model-face pipeline-model-face--left" d="M25 49v63l55 31V81Z" />
      <path class="pipeline-model-face pipeline-model-face--right" d="m80 81 55-32v63l-55 31Z" />
      <ellipse class="pipeline-model-hole" cx="80" cy="50" rx="22" ry="12" />
      <ellipse class="pipeline-model-hole" cx="108" cy="103" rx="12" ry="19" />
    </svg>`;
  }

  return '';
}

function pipelineFormatVisual(kind) {
  if (kind === 'exact') {
    return `<svg viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      <ellipse class="pipeline-format-shadow" cx="59" cy="62" rx="49" ry="5" />
      <path class="pipeline-format-side" d="m10 45 65 11 35-20v8L75 65 10 53Z" />
      <path class="pipeline-format-fill" d="m10 45 31-18 69 9-35 20Z" />
      <path class="pipeline-format-fill" d="m43 27 20-12 21 11v29l-21 11V36Z" />
      <path class="pipeline-format-highlight" d="m63 15 21 11v29L63 44Z" />
      <ellipse class="pipeline-format-boss" cx="68" cy="27" rx="13" ry="15" transform="rotate(-28 68 27)" />
      <ellipse class="pipeline-format-cut" cx="68" cy="27" rx="6" ry="8" transform="rotate(-28 68 27)" />
      <ellipse class="pipeline-format-cut" cx="29" cy="44" rx="7" ry="3.5" />
      <path class="pipeline-format-edge" d="m10 45 65 11 35-20M75 56v9M43 27l20 9 21-10" />
    </svg>`;
  }

  return `<svg viewBox="0 0 120 72" aria-hidden="true" focusable="false">
    <ellipse class="pipeline-format-shadow" cx="59" cy="62" rx="49" ry="5" />
    <path class="pipeline-format-mesh-fill" d="m10 45 31-18 22-12 21 11 26 10v8L75 65 10 53Z" />
    <path class="pipeline-format-edge" d="m10 45 65 11 35-20M10 45l65 20m0-9v9m35-29v8M41 27l22-12 21 11v29M63 15v51M41 27l43 28M10 45l65 11M29 34l46 31m-34-38 69 17M63 15l47 29M84 26 10 29M41 27l-12 27m55-28L63 66M10 45l74-19M29 54l81-18" />
    <ellipse class="pipeline-format-edge" cx="68" cy="27" rx="13" ry="15" transform="rotate(-28 68 27)" />
  </svg>`;
}

function pipelineRouteIcon(kind) {
  if (kind === 'print') {
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 9h24M24 9v8m-7 0h14l-3 6h-8l-3-6Zm7 6v5m-10 3h20v10H14zM10 43h28" />
    </svg>`;
  }
  if (kind === 'cnc') {
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M16 7h16l-4 8v8l-4 5-4-5v-8l-4-8Zm8 21v7m-13 8h26M14 35h20v8H14z" />
    </svg>`;
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect x="7" y="8" width="34" height="26" rx="2" />
    <path d="m18 17-5 4 5 4m12-8 5 4-5 4m-8 4 4-16M17 40h14m-7-6v6" />
  </svg>`;
}

function pipelineRouteStepIcon(kind, index) {
  const icons = {
    print: [
      '<path d="m14 5 10 6-10 6-10-6 10-6Zm-10 6v11l10 7 10-7V11M14 17v12" />',
      '<path d="m4 9 10 5 10-5-10-5L4 9Zm0 6 10 5 10-5M4 21l10 5 10-5" />',
      '<rect x="4" y="6" width="20" height="17" rx="2" /><path d="m11 11-3 3 3 3m6-6 3 3-3 3m-3 4V8" />',
      '<rect x="7" y="7" width="14" height="14" rx="2" /><path d="M10 2v5m4-5v5m4-5v5m-8 14v5m4-5v5m4-5v5M2 10h5m-5 4h5m-5 4h5m14-8h5m-5 4h5m-5 4h5" />',
      '<path d="m14 5 10 6-10 6-10-6 10-6Zm-10 6v11l10 7 10-7V11M14 17v12M9 24l5 3 5-3" />'
    ],
    cnc: [
      '<path d="m14 5 10 6-10 6-10-6 10-6Zm-10 6v11l10 7 10-7V11M14 17v12" />',
      '<path d="M8 4h12l-3 6v7l-3 4-3-4v-7L8 4Zm6 17v5M4 27h20" />',
      '<rect x="4" y="6" width="20" height="17" rx="2" /><path d="m11 11-3 3 3 3m6-6 3 3-3 3m-3 4V8" />',
      '<rect x="4" y="6" width="20" height="17" rx="2" /><circle cx="9" cy="11" r="1.5" /><circle cx="14" cy="11" r="1.5" /><path d="M8 18h12M8 21h8" />',
      '<path d="M5 23v-9h6l4-6h8v15H5Zm11-8h5m-2-4v8M3 26h22" />'
    ],
    direct: [
      '<rect x="3" y="5" width="22" height="17" rx="2" /><path d="m10 10-4 3.5 4 3.5m8-7 4 3.5-4 3.5m-5 3 3-14M9 26h10" />',
      '<circle cx="6" cy="8" r="2.5" /><circle cx="22" cy="7" r="2.5" /><circle cx="14" cy="23" r="2.5" /><path d="M8 9.5c6 1 2 8 6 11m6-12c-6 2-2 8-6 12" />',
      '<rect x="4" y="6" width="20" height="17" rx="2" /><path d="m11 11-3 3 3 3m6-6 3 3-3 3m-3 4V8" />',
      '<rect x="4" y="6" width="20" height="17" rx="2" /><circle cx="9" cy="11" r="1.5" /><circle cx="14" cy="11" r="1.5" /><path d="M8 18h12M8 21h8" />',
      '<circle cx="14" cy="14" r="10" /><circle cx="14" cy="14" r="5" /><path d="M14 1v6m0 14v6M1 14h6m14 0h6" />'
    ]
  };
  const body = (icons[kind] || icons.direct)[index] || '';
  return `<svg class="pipeline-route-step-icon" viewBox="0 0 28 30" aria-hidden="true" focusable="false">${body}</svg>`;
}

function renderPipelineStage(stage) {
  const article = document.createElement('article');
  const role = stage.role || 'generic';
  article.className = `pipeline-stage pipeline-stage--${esc(role)}`;

  const examplesLabel = stage.examplesLabel
    ? `<p class="pipeline-examples-label">${esc(stage.examplesLabel)}</p>`
    : '';
  const examples = stage.examples?.length
    ? `<div class="pipeline-chips">${stage.examples.map(example => `<span>${esc(example)}</span>`).join('')}</div>`
    : '';
  const emphasis = stage.emphasis
    ? `<p class="pipeline-stage-emphasis">${esc(stage.emphasis)}</p>`
    : '';
  const formats = stage.formats?.length
    ? `<div class="pipeline-format-compare">${stage.formats.map(format => `
        <div class="pipeline-format pipeline-format--${esc(format.kind)}">
          <strong>${esc(format.name)}</strong>
          ${pipelineFormatVisual(format.kind)}
          <span>${esc(format.detail)}</span>
        </div>`).join('')}</div>`
    : '';

  article.innerHTML = `
    <div class="pipeline-stage-kicker">
      <span class="pipeline-stage-number">${esc(stage.number)}</span>
      <span>${esc(stage.label)}</span>
    </div>
    <h3>${esc(stage.title)}</h3>
    <p class="pipeline-stage-description">${esc(stage.description)}</p>
    ${emphasis}
    ${examplesLabel}
    ${examples}
    ${formats}
    ${stage.visual ? pipelineVisual(stage.visual) : ''}
  `;
  return article;
}

function renderPipeline(pipeline, container) {
  const graphic = document.createElement('div');
  graphic.className = 'pipeline-graphic';
  graphic.setAttribute('aria-label', 'How a CAD model feeds inspection, exchange, and manufacturing');

  const stages = pipeline.stages || [];
  const stageByRole = role => stages.find(stage => stage.role === role);
  const architecture = document.createElement('div');
  architecture.className = 'pipeline-architecture';

  architecture.appendChild(renderPipelineStage(stageByRole('author') || stages[0]));

  const authorArrow = document.createElement('div');
  authorArrow.className = 'pipeline-flow-arrow pipeline-flow-arrow--author';
  authorArrow.setAttribute('aria-hidden', 'true');
  authorArrow.textContent = '→';
  architecture.appendChild(authorArrow);

  architecture.appendChild(renderPipelineStage(stageByRole('evaluate') || stages[1]));

  const evaluateArrow = document.createElement('div');
  evaluateArrow.className = 'pipeline-flow-arrow pipeline-flow-arrow--evaluate';
  evaluateArrow.setAttribute('aria-hidden', 'true');
  evaluateArrow.textContent = '→';
  architecture.appendChild(evaluateArrow);

  const hub = pipeline.hub || {};
  const model = document.createElement('article');
  model.className = 'pipeline-model';
  model.innerHTML = `
    <p class="pipeline-model-label">${esc(hub.label || 'The model')}</p>
    <h3>${esc(hub.title || 'Source of truth')}</h3>
    <p>${esc(hub.description)}</p>
    ${pipelineVisual(hub.visual || 'model')}
    <p class="pipeline-model-caption">${esc(hub.caption)}</p>
  `;
  architecture.appendChild(model);

  const fork = document.createElement('div');
  fork.className = 'pipeline-fork';
  fork.setAttribute('aria-hidden', 'true');
  fork.innerHTML = '<span class="pipeline-fork-arm pipeline-fork-arm--top"></span><span class="pipeline-fork-arm pipeline-fork-arm--bottom"></span>';
  architecture.appendChild(fork);

  const outcomes = document.createElement('div');
  outcomes.className = 'pipeline-outcomes';
  outcomes.innerHTML = '<p class="pipeline-outcomes-label">Independent uses of the model</p>';
  outcomes.appendChild(renderPipelineStage(stageByRole('inspect') || stages[2]));
  outcomes.appendChild(renderPipelineStage(stageByRole('exchange') || stages[3]));
  architecture.appendChild(outcomes);

  const modelDrop = document.createElement('div');
  modelDrop.className = 'pipeline-model-drop';
  modelDrop.setAttribute('aria-hidden', 'true');
  modelDrop.innerHTML = '<span>↓</span>';
  architecture.appendChild(modelDrop);

  const manufacturing = pipeline.manufacturing || {};
  const manufacturingSection = document.createElement('div');
  manufacturingSection.className = 'pipeline-manufacturing';
  manufacturingSection.innerHTML = `
    <div class="pipeline-manufacturing-header">
      <span class="pipeline-manufacturing-number">${esc(manufacturing.number || '05')}</span>
      <div>
        <p>${esc(manufacturing.label || 'Manufacture')}</p>
        <h3>${esc(manufacturing.title || 'When geometry becomes a manufacturing plan')}</h3>
        <span>${esc(manufacturing.description)}</span>
      </div>
    </div>
  `;

  const routes = document.createElement('div');
  routes.className = 'pipeline-routes';
  for (const route of pipeline.routes || []) {
    const article = document.createElement('article');
    article.className = `pipeline-route pipeline-route--${esc(route.kind)}`;

    const steps = (route.steps || []).map((step, index) => `
      <li class="pipeline-route-step">
        ${pipelineRouteStepIcon(route.kind, index)}
        <span>${esc(step)}</span>
      </li>`).join('');

    article.innerHTML = `
      <div class="pipeline-route-heading">
        ${pipelineRouteIcon(route.kind)}
        <div>
          <span>${esc(route.label)}</span>
          <h4>${esc(route.title)}</h4>
          <p>${esc(route.caption)}</p>
        </div>
      </div>
      <ol class="pipeline-route-steps">${steps}</ol>
    `;
    routes.appendChild(article);
  }
  manufacturingSection.appendChild(routes);
  architecture.appendChild(manufacturingSection);
  graphic.appendChild(architecture);

  if (pipeline.note) {
    const note = document.createElement('aside');
    note.className = 'pipeline-note';
    note.setAttribute('aria-label', 'Important geometry boundary');
    note.innerHTML = `<span class="pipeline-note-icon" aria-hidden="true">i</span><p>${pipeline.note}</p>`;
    graphic.appendChild(note);
  }

  const glossaryTitle = document.createElement('h3');
  glossaryTitle.className = 'pipeline-glossary-title';
  glossaryTitle.textContent = 'The jobs people commonly mix up';
  graphic.appendChild(glossaryTitle);

  const glossary = document.createElement('dl');
  glossary.className = 'pipeline-glossary';
  for (const item of pipeline.glossary || []) {
    const group = document.createElement('div');
    group.className = 'pipeline-term';
    group.innerHTML = `<dt>${esc(item.term)}</dt><dd>${esc(item.definition)}</dd>`;
    glossary.appendChild(group);
  }
  graphic.appendChild(glossary);

  container.appendChild(graphic);
}

// --- Section rendering ------------------------------------------------------

function renderSections(sections) {
  app.innerHTML = '';

  for (const section of sections) {
    const sectionEl = document.createElement('section');
    sectionEl.id = section.id;
    sectionEl.className = section.pipeline ? 'section section--pipeline' : 'section';

    let html = '<div class="container">';
    html += `<h2 class="section-title">${esc(section.title)}</h2>`;
    if (section.description) {
      html += `<p class="section-desc">${section.description}</p>`;
    }
    html += '</div>';
    sectionEl.innerHTML = html;

    const container = sectionEl.querySelector('.container');

    if (section.pipeline) {
      renderPipeline(section.pipeline, container);
    }

    for (const [subsectionIndex, sub] of section.subsections.entries()) {
      const subsectionEl = document.createElement('section');
      subsectionEl.className = 'subsection';
      subsectionEl.id = subsectionAnchorId(section, sub, subsectionIndex);

      if (sub.title) {
        const h3 = document.createElement('h3');
        h3.className = 'subsection-title';
        h3.textContent = sub.title;
        subsectionEl.appendChild(h3);
      }
      if (sub.description) {
        const p = document.createElement('p');
        p.className = 'subsection-desc';
        p.innerHTML = sub.description;
        subsectionEl.appendChild(p);
      }

      const indexedItems = sub.items.map((item, itemIndex) => ({ item, itemIndex }));
      const featured = indexedItems.filter(({ item }) => item.featured);
      const links = indexedItems.filter(({ item }) => !item.featured);
      const itemHeadingLevel = sub.title ? 4 : 3;

      if (featured.length) {
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        for (const { item, itemIndex } of featured) {
          const anchorId = itemAnchorId(section, sub, item, itemIndex, subsectionIndex);
          grid.appendChild(renderItem(item, anchorId, itemHeadingLevel));
        }
        subsectionEl.appendChild(grid);
      }

      if (links.length) {
        const grid = document.createElement('div');
        grid.className = 'link-grid';
        for (const { item, itemIndex } of links) {
          const anchorId = itemAnchorId(section, sub, item, itemIndex, subsectionIndex);
          grid.appendChild(renderItem(item, anchorId, itemHeadingLevel));
        }
        subsectionEl.appendChild(grid);
      }

      container.appendChild(subsectionEl);
    }

    app.appendChild(sectionEl);
  }
}

renderSections(siteData.sections);

// The sections are created after initial HTML parsing, so the browser cannot
// resolve a deep link such as #emerging until rendering has finished.
if (window.location.hash) {
  const rawTargetId = window.location.hash.slice(1);
  let targetId = rawTargetId;
  try {
    targetId = decodeURIComponent(rawTargetId);
  } catch {
    // Leave malformed percent escapes untouched instead of aborting the app.
  }
  const target = document.getElementById(targetId);
  if (target) target.scrollIntoView();
}

// --- Search -----------------------------------------------------------------

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(filterItems, 150);
});

function filterItems() {
  const query = searchInput.value.trim().toLowerCase();
  const allCards = app.querySelectorAll('.card, .link-card');
  const allSections = app.querySelectorAll('.section');
  const allSubsections = app.querySelectorAll('.subsection');
  const allGrids = app.querySelectorAll('.card-grid, .link-grid');

  if (!query) {
    // Show everything
    allCards.forEach(c => c.style.display = '');
    allSections.forEach(s => s.style.display = '');
    allSubsections.forEach(s => s.style.display = '');
    allGrids.forEach(g => g.style.display = '');
    searchMeta.textContent = '';
    return;
  }

  const terms = query.split(/\s+/);
  let matchCount = 0;

  allCards.forEach(card => {
    const text = card.dataset.searchable || '';
    const matches = terms.every(t => text.includes(t));
    card.style.display = matches ? '' : 'none';
    if (matches) matchCount++;
  });

  // Hide grids that have no visible children
  allGrids.forEach(grid => {
    const hasVisible = [...grid.children].some(c => c.style.display !== 'none');
    grid.style.display = hasVisible ? '' : 'none';
  });

  // Keep subsection headings and descriptions attached to their matching cards.
  allSubsections.forEach(subsection => {
    const hasVisibleCard = [...subsection.querySelectorAll('.card, .link-card')]
      .some(card => card.style.display !== 'none');
    subsection.style.display = hasVisibleCard ? '' : 'none';
  });

  // Hide sections with no visible subsections.
  allSections.forEach(section => {
    const hasVisibleSubsection = [...section.querySelectorAll('.subsection')]
      .some(subsection => subsection.style.display !== 'none');
    section.style.display = hasVisibleSubsection ? '' : 'none';
  });

  searchMeta.textContent = `${matchCount} result${matchCount !== 1 ? 's' : ''} found`;
}

// --- Scroll reveal ----------------------------------------------------------

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.1 }
);

function observeCards() {
  document.querySelectorAll('.card, .link-card').forEach(el => {
    observer.observe(el);
  });
}

observeCards();

// --- Active nav highlighting ------------------------------------------------

const navLinks = heroNav.querySelectorAll('a');
const sectionEls = document.querySelectorAll('.section');

const navObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = heroNav.querySelector(`a[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    }
  },
  { rootMargin: '-20% 0px -80% 0px' }
);

sectionEls.forEach(s => navObserver.observe(s));

// --- Sticky bar shadow on scroll --------------------------------------------

const heroEl = document.querySelector('.hero');
const stickyObserver = new IntersectionObserver(
  ([entry]) => {
    stickyBar.classList.toggle('stuck', !entry.isIntersecting);
  },
  { threshold: 0 }
);
stickyObserver.observe(heroEl);

// --- Utilities --------------------------------------------------------------

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function searchableText(item) {
  const parts = [
    item.name,
    item.description?.replace(/<[^>]*>/g, ''),
    ...(item.tags || []),
    ...(item.tech || []),
    item.tagline || '',
    item.badge || '',
  ];
  return parts.join(' ').toLowerCase();
}

// --- TOC Sidebar -----------------------------------------------------------

const tocSidebar = document.getElementById('toc-sidebar');
const tocFloatBtn = document.getElementById('toc-float-btn');

function buildTOCSidebar(data) {
  tocSidebar.innerHTML = '';
  const tocList = document.createElement('ul');
  tocList.className = 'toc-list';
  for (const section of data.sections) {
    const sectionLi = document.createElement('li');
    sectionLi.className = 'toc-section';
    const sectionA = document.createElement('a');
    sectionA.href = `#${section.id}`;
    sectionA.textContent = section.title;
    sectionLi.appendChild(sectionA);
    if (section.subsections) {
      const subUl = document.createElement('ul');
      subUl.className = 'toc-sublist';
      for (const [subsectionIndex, sub] of section.subsections.entries()) {
        const subLi = document.createElement('li');
        subLi.className = 'toc-subsection';
        const subsectionId = subsectionAnchorId(section, sub, subsectionIndex);
        if (sub.title) {
          const subA = document.createElement('a');
          subA.href = `#${subsectionId}`;
          subA.textContent = sub.title;
          subLi.appendChild(subA);
        }
        if (sub.items && sub.items.length) {
          const itemsUl = document.createElement('ul');
          itemsUl.className = 'toc-items';
          for (const [itemIndex, item] of sub.items.entries()) {
            const itemLi = document.createElement('li');
            itemLi.className = 'toc-item';
            const itemA = document.createElement('a');
            itemA.href = `#${itemAnchorId(section, sub, item, itemIndex, subsectionIndex)}`;
            itemA.textContent = item.name;
            itemLi.appendChild(itemA);
            itemsUl.appendChild(itemLi);
          }
          subLi.appendChild(itemsUl);
        }
        subUl.appendChild(subLi);
      }
      sectionLi.appendChild(subUl);
    }
    tocList.appendChild(sectionLi);
  }
  tocSidebar.appendChild(tocList);
}

buildTOCSidebar(siteData);

// Sidebar open/close logic
let tocOpen = false;

function openTOC() {
  tocOpen = true;
  tocSidebar.classList.add('open');
  tocSidebar.inert = false;
  tocSidebar.setAttribute('aria-hidden', 'false');
  document.body.classList.add('toc-open');
  tocFloatBtn.setAttribute('aria-expanded', 'true');
  tocFloatBtn.setAttribute('aria-label', 'Close table of contents');
  tocSidebar.querySelector('a')?.focus();
}

function closeTOC({ returnFocus = false } = {}) {
  tocOpen = false;
  tocSidebar.classList.remove('open');
  tocSidebar.inert = true;
  tocSidebar.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('toc-open');
  tocFloatBtn.setAttribute('aria-expanded', 'false');
  tocFloatBtn.setAttribute('aria-label', 'Open table of contents');
  if (returnFocus) tocFloatBtn.focus();
}

closeTOC();

tocFloatBtn.addEventListener('click', () => {
  if (tocOpen) closeTOC();
  else openTOC();
});

document.addEventListener('keydown', (e) => {
  if (tocOpen && (e.key === 'Escape' || e.key === 'Esc')) {
    closeTOC({ returnFocus: true });
  }
});

document.addEventListener('pointerdown', (e) => {
  if (tocOpen && !tocSidebar.contains(e.target) && !tocFloatBtn.contains(e.target)) {
    closeTOC();
  }
});

// Clicking a TOC link closes the sidebar (for better UX)
tocSidebar.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    closeTOC();
  }
});
