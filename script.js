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

function renderFeaturedCard(item) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.searchable = searchableText(item);

  // Header: badge + links
  let headerHTML = '<div class="card-header">';
  if (item.badge) {
    headerHTML += `<div class="card-badge badge--star">${esc(item.badge)}</div>`;
  }
  headerHTML += '<div class="card-links">';
  // Determine if primary URL is GitHub
  const isGitHub = item.url.includes('github.com') || item.url.includes('codeberg.org');
  if (item.links) {
    for (const [label, url] of Object.entries(item.links)) {
      if (label === 'fork') continue;
      const displayLabel = label.replace(/\d+$/, '').charAt(0).toUpperCase() + label.replace(/\d+$/, '').slice(1);
      headerHTML += `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(displayLabel)}</a>`;
    }
  }
  const primaryLabel = isGitHub ? 'GitHub' : 'Link';
  headerHTML += `<a href="${esc(item.url)}" target="_blank" rel="noopener">${primaryLabel}</a>`;
  headerHTML += '</div></div>';

  let bodyHTML = `<h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></h3>`;
  if (item.tagline) {
    bodyHTML += `<p class="card-tagline">${esc(item.tagline)}</p>`;
  }
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

  let html = `<h4><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a></h4>`;
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
