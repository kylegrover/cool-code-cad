import { siteData } from './data.js';

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

function renderItem(item) {
  if (item.featured) {
    return renderFeaturedCard(item);
  }
  return renderLinkCard(item);
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
  if (item.stars) parts.push(`<span class="meta-stars" title="GitHub stars">\u2605 ${formatStars(item.stars)}</span>`);  if (item.license) parts.push(`<span class="meta-license" title="License">${esc(item.license)}</span>`);  return parts.length ? `<div class="card-meta">${parts.join('')}</div>` : '';
}

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function isGitHubUrl(url) {
  return url && (url.includes('github.com') || url.includes('codeberg.org'));
}

function renderFeaturedCard(item) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.searchable = searchableText(item);

  let headerHTML = '<div class="card-header">';
  if (item.badge) {
    headerHTML += `<div class="card-badge badge--star">${esc(item.badge)}</div>`;
  }
  headerHTML += `<div class="card-links">${buildLinksHTML(item)}</div>`;
  headerHTML += '</div>';

  let bodyHTML = `<h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></h3>`;
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

function renderLinkCard(item) {
  const div = document.createElement('div');
  div.className = 'link-card';
  div.dataset.searchable = searchableText(item);

  const linksHTML = buildLinksHTML(item);
  let html = '<div class="link-card-header">';
  html += `<h4><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></h4>`;
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

// --- Section rendering ------------------------------------------------------

function renderSections(sections) {
  app.innerHTML = '';

  for (const section of sections) {
    const sectionEl = document.createElement('section');
    sectionEl.id = section.id;
    sectionEl.className = 'section';

    let html = '<div class="container">';
    html += `<h2 class="section-title">${esc(section.title)}</h2>`;
    if (section.description) {
      html += `<p class="section-desc">${section.description}</p>`;
    }
    html += '</div>';
    sectionEl.innerHTML = html;

    const container = sectionEl.querySelector('.container');

    for (const sub of section.subsections) {
      // Subsection heading
      if (sub.title) {
        const h3 = document.createElement('h3');
        h3.className = 'subsection-title';
        h3.textContent = sub.title;
        container.appendChild(h3);
      }
      if (sub.description) {
        const p = document.createElement('p');
        p.className = 'subsection-desc';
        p.innerHTML = sub.description;
        container.appendChild(p);
      }

      // Separate featured items from link items
      const featured = sub.items.filter(i => i.featured);
      const links = sub.items.filter(i => !i.featured);

      // Featured cards in card-grid
      if (featured.length) {
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        for (const item of featured) {
          grid.appendChild(renderItem(item));
        }
        container.appendChild(grid);
      }

      // Link cards in link-grid
      if (links.length) {
        const grid = document.createElement('div');
        grid.className = 'link-grid';
        for (const item of links) {
          grid.appendChild(renderItem(item));
        }
        container.appendChild(grid);
      }
    }

    app.appendChild(sectionEl);
  }
}

renderSections(siteData.sections);

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
  const allSubTitles = app.querySelectorAll('.subsection-title, .subsection-desc');
  const allGrids = app.querySelectorAll('.card-grid, .link-grid');

  if (!query) {
    // Show everything
    allCards.forEach(c => c.style.display = '');
    allSections.forEach(s => s.style.display = '');
    allSubTitles.forEach(s => s.style.display = '');
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

  // Hide sections with no visible grids
  allSections.forEach(section => {
    const hasVisibleGrid = [...section.querySelectorAll('.card-grid, .link-grid')].some(g => g.style.display !== 'none');
    section.style.display = hasVisibleGrid ? '' : 'none';
  });

  // Hide orphaned subsection titles
  allSubTitles.forEach(el => {
    const nextSibling = el.nextElementSibling;
    if (nextSibling && (nextSibling.classList.contains('card-grid') || nextSibling.classList.contains('link-grid'))) {
      el.style.display = nextSibling.style.display;
    } else if (el.classList.contains('subsection-desc')) {
      // subsection-desc is between title and grid
      const prevSibling = el.previousElementSibling;
      if (prevSibling) {
        el.style.display = prevSibling.style.display;
      }
    }
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
const tocLink = document.getElementById('toc-link');

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
      for (const sub of section.subsections) {
        const subLi = document.createElement('li');
        subLi.className = 'toc-subsection';
        if (sub.title) {
          const subA = document.createElement('a');
          subA.href = `#${section.id}`; // Could use anchors for subsections if present
          subA.textContent = sub.title;
          subLi.appendChild(subA);
        }
        if (sub.items && sub.items.length) {
          const itemsUl = document.createElement('ul');
          itemsUl.className = 'toc-items';
          for (const item of sub.items) {
            const itemLi = document.createElement('li');
            itemLi.className = 'toc-item';
            const itemA = document.createElement('a');
            itemA.href = `#${section.id}`; // Could use anchors for items if present
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

tocSidebar.style.display = 'none';
tocLink.addEventListener('click', (e) => {
  e.preventDefault();
  tocSidebar.style.display = tocSidebar.style.display === 'none' ? 'block' : 'none';
});
