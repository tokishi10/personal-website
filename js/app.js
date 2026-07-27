/* ============================================================
   Personal Photography Website — app.js
   ============================================================ */

const DATA_PATH = 'data/photos.json';
let siteData = null;

// ---- Bootstrap ----

async function loadData() {
  try {
    const res = await fetch(DATA_PATH);
    if (!res.ok) throw new Error('Could not load photos.json');
    siteData = await res.json();
    init();
  } catch (e) {
    console.error('[Photography] Failed to load data:', e);
  }
}

function init() {
  const page = detectPage();
  initNav();
  initFooter();
  if (page === 'home')           initHome();
  else if (page === 'about')     initAbout();
  else if (page === 'category')  initCategory();
  else if (page === 'collection') initCollection();
  initNavScroll(page);
  initMobileNav();
}

function detectPage() {
  const path = window.location.pathname;
  if (path.includes('about'))      return 'about';
  if (path.includes('category'))   return 'category';
  if (path.includes('collection')) return 'collection';
  if (path.includes('contact'))    return 'contact';
  return 'home';
}

// ---- Navigation ----

function initNav() {
  const { photographer } = siteData;
  document.querySelectorAll('.footer__name').forEach(el => {
    el.textContent = '@' + photographer.name;
  });
}

function initNavScroll(page) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.classList.add('scrolled');
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  // Close on outside click
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
    }
  });
}

// ---- Footer ----

function initFooter() {
  const year = new Date().getFullYear();
  document.querySelectorAll('.js-year').forEach(el => el.textContent = year);
}

// ============================================================
// HOME PAGE
// ============================================================

function initHome() {
  const { photographer } = siteData;

  const taglineEl = document.getElementById('hero-tagline');
  if (taglineEl) taglineEl.textContent = photographer.tagline;

  initHero(photographer);
  initStatement(photographer);
  initHighlights();
}

function initStatement(photographer) {
  const el = document.getElementById('statement-body');
  if (!el || !photographer.statement) return;
  el.innerHTML = photographer.statement
    .split('\n')
    .map(p => `<p class="statement-p">${p}</p>`)
    .join('');
}

function initHighlights() {
  const grid = document.getElementById('highlights-grid');
  if (!grid || !siteData.highlights?.length) return;

  siteData.highlights.forEach(photo => {
    const div = document.createElement('div');
    div.className = 'highlight-item';

    const img = document.createElement('img');
    img.src     = photo.src;
    img.alt     = photo.caption || '';
    img.loading = 'lazy';
    lazyFade(img);

    if (photo.location) {
      const overlay = document.createElement('div');
      overlay.className = 'highlight-overlay';
      const loc = document.createElement('span');
      loc.className = 'highlight-overlay__location';
      loc.textContent = photo.location;
      overlay.appendChild(loc);
      div.appendChild(overlay);
    }

    div.appendChild(img);
    grid.appendChild(div);
  });
}

function initHero(photographer) {
  const img = document.getElementById('hero-img');
  if (!img) return;
  const src = photographer.heroImage || '';
  if (src) img.src = src;
}

// ============================================================
// ABOUT PAGE
// ============================================================

function initAbout() {
  const { photographer } = siteData;

  setEl('about-name',    photographer.name);
  setEl('about-label',   photographer.tagline || 'Photographer');

  const portrait = document.getElementById('about-portrait');
  if (portrait) {
    portrait.src = photographer.avatar;
    portrait.alt = photographer.name;
  }

  // Bio is rendered inside the Photography section below
  const bioWrap = document.getElementById('about-bio');
  if (bioWrap) bioWrap.innerHTML = '';

  // Info sections
  const contact = document.getElementById('about-contact');
  if (contact) {
    const section = (label, items) => `
      <div class="about-section">
        <p class="about-contact__label">${label}</p>
        <div class="about-contact__links">${items.join('')}</div>
      </div>`;

    const plain = text =>
      `<span class="about-contact__link" style="border:none;cursor:default;">${text}</span>`;

    let html = '';

    // Background — stacked lines
    const bgLines = [];
    if (photographer.education) bgLines.push(`<span class="about-info-line">${photographer.education}</span>`);
    if (photographer.career)    bgLines.push(`<span class="about-info-line">${photographer.career}</span>`);
    if (photographer.location)  bgLines.push(`<span class="about-info-line">Based in ${photographer.location}</span>`);
    if (bgLines.length) html += `
      <div class="about-section">
        <p class="about-contact__label">Background</p>
        <div class="about-info-stack">${bgLines.join('')}</div>
      </div>`;

    // Photography — bio text + gear inline
    const photoLines = [];
    if (photographer.bio) {
      photographer.bio.split('\n\n').forEach(p => {
        photoLines.push(`<p class="about-info-bio">${p}</p>`);
      });
    }
    if (photoLines.length) html += `
      <div class="about-section">
        <p class="about-contact__label">Photography</p>
        ${photoLines.join('')}
      </div>`;

    // Cameras
    if (photographer.gear?.length) {
      const gearItems = photographer.gear.map(g => `
        <span class="gear-item">
          <img class="gear-logo"
               src="https://cdn.simpleicons.org/${g.brand}/e8e6e3"
               alt="${g.brand}"
               data-initial="${g.brand[0].toUpperCase()}"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'gear-initial',textContent:this.dataset.initial}))">
          <span>${g.name}</span>
        </span>`).join('<span class="gear-sep">|</span>');
      html += `
        <div class="about-section">
          <p class="about-contact__label">Cameras</p>
          <div class="gear-list">${gearItems}</div>
        </div>`;
    }

    // Get in touch
    const links = [];
    if (photographer.instagram) {
      const handle = photographer.instagram.replace('@', '');
      links.push(`<a href="https://instagram.com/${handle}" class="about-contact__link" target="_blank" rel="noopener">Instagram</a>`);
    }
    if (links.length) html += section('Get in touch', links);

    contact.innerHTML = html;
  }
}

// ============================================================
// CATEGORY PAGE
// ============================================================

function initCategory() {
  const cat = new URLSearchParams(window.location.search).get('cat');
  if (!cat) return;

  const label = cat.charAt(0).toUpperCase() + cat.slice(1);
  document.title = `${label} — ${siteData.photographer.name}`;
  setEl('cat-title', label);

  const grid = document.getElementById('category-grid');
  if (!grid) return;

  siteData.collections
    .filter(col => col.category === cat)
    .forEach(col => {
      const a = document.createElement('a');
      a.className = 'cat-card';
      a.href = `collection.html?id=${col.id}`;
      a.innerHTML = `
        <div class="cat-card__img">
          <img src="${col.cover}" alt="${col.title}" loading="lazy">
        </div>
        <div class="cat-card__info">
          <span class="cat-card__title">${col.title}</span>
          ${col.subtitle ? `<span class="cat-card__sep">|</span><span class="cat-card__sub">${col.subtitle}</span>` : ''}
        </div>`;
      lazyFade(a.querySelector('img'));
      grid.appendChild(a);
    });
}

// ============================================================
// COLLECTION PAGE
// ============================================================

function initCollection() {
  const id  = new URLSearchParams(window.location.search).get('id');
  if (!id) return;

  const col = siteData.collections.find(c => c.id === id);
  if (!col) { document.title = 'Not Found'; return; }

  document.title = `${col.title} — ${siteData.photographer.name}`;

  // Back link → correct category page
  const backLink = document.querySelector('.collection-back');
  if (backLink && col.category) {
    const label = col.category.charAt(0).toUpperCase() + col.category.slice(1);
    backLink.href = `category.html?cat=${col.category}`;
    backLink.textContent = label;
  }

  setEl('col-title',    col.title);
  setEl('col-subtitle', col.subtitle);
  setEl('col-desc',     col.description);
  setEl('col-count',    String(col.photos.length).padStart(2, '0'));

  const grid = document.getElementById('photo-grid');
  if (!grid) return;

  const shuffled = [...col.photos].sort(() => Math.random() - 0.5);
  buildJustifiedGrid(shuffled, grid);
  initLightbox();
}

function buildJustifiedGrid(photos, grid) {
  const GAP    = 8;
  const TARGET = 320; // target row height px

  function render() {
    const W = grid.clientWidth;
    if (!W) return;

    grid.innerHTML = '';
    grid.style.display       = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap           = GAP + 'px';

    // Group photos into rows
    let row = [], rowAspect = 0;

    function flushRow(isLast) {
      if (!row.length) return;
      const totalGaps = (row.length - 1) * GAP;
      const height    = isLast && row.length < 3
        ? TARGET  // last incomplete row: keep target height (left-aligned)
        : (W - totalGaps) / rowAspect;

      const rowEl = document.createElement('div');
      rowEl.style.cssText = `display:flex;gap:${GAP}px;height:${height}px`;

      row.forEach(({ photo, aspect, i }) => {
        const div = document.createElement('div');
        div.className   = 'photo-item';
        div.style.cssText = `flex:0 0 ${aspect * height}px;height:${height}px;overflow:hidden`;

        const img   = document.createElement('img');
        img.src     = photo.src;
        img.alt     = photo.caption || `Photo ${i + 1}`;
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
        lazyFade(img);

        div.appendChild(img);
        div.addEventListener('click', () => openLightbox(photos, i));
        rowEl.appendChild(div);
      });

      grid.appendChild(rowEl);
      row = []; rowAspect = 0;
    }

    photos.forEach((photo, i) => {
      const aspect = (photo.w && photo.h) ? photo.w / photo.h : 3 / 2;
      row.push({ photo, aspect, i });
      rowAspect += aspect;

      const rowWidth = rowAspect * TARGET + (row.length - 1) * GAP;
      if (rowWidth >= W) flushRow(false);
    });
    flushRow(true); // last row
  }

  render();
  window.addEventListener('resize', render);
}

// ============================================================
// LIGHTBOX
// ============================================================

let lbPhotos = [];
let lbIndex  = 0;

function openLightbox(photos, index) {
  lbPhotos = photos;
  lbIndex  = index;
  document.getElementById('lightbox')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const img     = document.getElementById('lb-img');
  const caption = document.getElementById('lb-caption');
  const counter = document.getElementById('lb-counter');
  const photo   = lbPhotos[lbIndex];

  if (img) {
    img.style.opacity = '0';
    img.src = photo.src;
    img.onload = () => { img.style.opacity = '1'; };
    img.alt = photo.caption || '';
  }
  if (caption) caption.textContent = photo.caption || '';
  if (counter) counter.textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
}

function lbPrev() {
  lbIndex = (lbIndex - 1 + lbPhotos.length) % lbPhotos.length;
  updateLightbox();
}
function lbNext() {
  lbIndex = (lbIndex + 1) % lbPhotos.length;
  updateLightbox();
}

function initLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.getElementById('lb-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lb-prev')?.addEventListener('click', lbPrev);
  document.getElementById('lb-next')?.addEventListener('click', lbNext);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lbPrev();
    if (e.key === 'ArrowRight')  lbNext();
  });

  // Touch swipe
  let tx = 0;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 48) { dx > 0 ? lbPrev() : lbNext(); }
  }, { passive: true });
}

// ============================================================
// HELPERS
// ============================================================

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function lazyFade(img) {
  img.addEventListener('load', () => img.classList.add('loaded'));
  if (img.complete && img.naturalWidth) img.classList.add('loaded');
}

// ---- Protect images ----
function protectImages() {
  // Disable right-click on images
  document.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
  // Disable drag
  document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}

// ---- Start ----
document.addEventListener('DOMContentLoaded', () => {
  protectImages();
  loadData();
});
