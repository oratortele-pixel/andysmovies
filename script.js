/* ===========================================================
   Andy's Movies — main script
   Features: load JSON, search, decade filters, highlight, fade-in,
             big modal, trailer (privacy), close on Esc / backdrop
=========================================================== */

(() => {
  // --- Feature toggles ---
  const ENABLE_FADE_IN     = true;
  const ENABLE_MODAL_ANIM  = true;
  const ENABLE_TRAILERS    = true;

  // --- State ---
  let allMovies = [];
  let currentDecade = 'all';

  // --- Elements ---
  const $catalog      = byId('catalog');
  const $searchInput  = byId('search-input');
  const $decadeBar    = q('.decade-filters');
  const $modal        = byId('modal');
  const $close        = byId('close');
  const $mTitle       = byId('modal-title');
  const $mYear        = byId('modal-year');
  const $mNotes       = byId('modal-notes');
  const $mQuotes      = byId('modal-quotes');
  const $mLinks       = byId('modal-links');
  const $trailerBtn   = byId('trailer-btn');
  const $trailerWrap  = byId('trailer-wrap');
  const $trailerFrame = byId('trailer-frame');

  // --- Init ---
  boot();

  async function boot() {
    wireHeader();
    wireModalGeneral();
    await loadMovies();
    renderMovies(allMovies);
  }

  // Load movies.json (expects array of {title, year, poster, notes?, quotes?, links?, color?, trailer?})
  async function loadMovies() {
    try {
      const res = await fetch('movies.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      allMovies = await res.json();
      setupDecadeFilters();
      setupSearch();
    } catch (err) {
      console.error('Failed to load movies.json:', err);
      allMovies = [];
    }
  }

  // Render grid with filters + search + highlight
  function renderMovies(movies) {
    if (!$catalog) return;
    $catalog.innerHTML = '';

    // 1) decade filter
    let list = movies;
    if (currentDecade !== 'all') {
      const d0 = parseInt(currentDecade, 10);
      list = list.filter(m => Number(m.year) >= d0 && Number(m.year) < d0 + 10);
    }

    // 2) search prefix (ignoring leading articles)
    const q = ($searchInput?.value || '').toLowerCase().trim();
    if (q) {
      list = list.filter(m => {
        const clean = (m.title || '').replace(/^(the|a|an)\s+/i, '');
        return clean.toLowerCase().startsWith(q) || (m.title || '').toLowerCase().startsWith(q);
      });
    }

    // 3) cards
    list.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--hl', movie.color || '#ffcc00');

      // poster
      if (ENABLE_FADE_IN) {
        const img = document.createElement('img');
        img.src = movie.poster;
        img.alt = movie.title;
        img.loading = 'lazy';
        img.onload = () => img.classList.add('loaded');
        if (img.complete) requestAnimationFrame(() => img.classList.add('loaded'));
        card.appendChild(img);
      } else {
        card.insertAdjacentHTML('beforeend',
          `<img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy">`
        );
      }

      // info
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `
        <h3>${highlightTitle(movie.title, q)}</h3>
        <p>${movie.year ?? ''}</p>
      `;
      card.appendChild(info);

      // open modal
      card.addEventListener('click', () => showModal(movie));
      $catalog.appendChild(card);
    });

    if (list.length === 0) {
      $catalog.innerHTML = '<p class="no-results">Nothing found</p>';
    }
  }

  // Highlight search match at the start (prefix)
  function highlightTitle(title = '', searchTerm = '') {
    if (!searchTerm) return esc(title);
    const clean = title.replace(/^(the|a|an)\s+/i, '');
    if (clean.toLowerCase().startsWith(searchTerm)) {
      const prefixLen = title.length - clean.length;
      const hiEnd = prefixLen + searchTerm.length;
      return `<span class="highlight">${esc(title.substring(0, hiEnd))}</span>${esc(title.substring(hiEnd))}`;
    }
    if (title.toLowerCase().startsWith(searchTerm)) {
      return `<span class="highlight">${esc(title.substring(0, searchTerm.length))}</span>${esc(title.substring(searchTerm.length))}`;
    }
    return esc(title);
  }

  // Decade buttons
  function setupDecadeFilters() {
    if (!$decadeBar) return;
    $decadeBar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDecade = btn.dataset.decade || 'all';
        $decadeBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMovies(allMovies);
      });
    });
  }

  // Live search (debounced)
  function setupSearch() {
    if (!$searchInput) return;
    const onInput = debounce(() => renderMovies(allMovies), 120);
    $searchInput.addEventListener('input', onInput);
  }

  // Modal fill + show
  function showModal(movie) {
    if (!$modal) return;

    setText($mTitle, movie.title);
    setText($mYear, String(movie.year ?? ''));
    setText($mNotes, movie.notes || '');

    // quotes
    $mQuotes.innerHTML = '';
    (movie.quotes || []).forEach(qt => {
      const li = document.createElement('li');
      li.textContent = qt;
      $mQuotes.appendChild(li);
    });

    // links
    $mLinks.innerHTML = '';
    (movie.links || []).forEach(url => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      li.appendChild(a);
      $mLinks.appendChild(li);
    });

    // trailer
    setupTrailer(movie);

    // show
    $modal.hidden = false;
    $modal.style.display = 'flex';
    $modal.classList.remove('closing');
    if (ENABLE_MODAL_ANIM) requestAnimationFrame(() => $modal.classList.add('visible'));

    // focus for accessibility
    $close?.focus();
  }

  // Close modal (button/backdrop/Esc)
  function closeModal() {
    if (!$modal) return;
    resetTrailer();

    if (!ENABLE_MODAL_ANIM) {
      $modal.style.display = 'none';
      $modal.hidden = true;
      $modal.classList.remove('visible', 'closing');
      return;
    }
    $modal.classList.remove('visible');
    $modal.classList.add('closing');
    setTimeout(() => {
      $modal.style.display = 'none';
      $modal.hidden = true;
      $modal.classList.remove('closing');
    }, 200);
  }

  function wireModalGeneral() {
    // close button
    if ($close) $close.addEventListener('click', closeModal);

    // backdrop click
    if ($modal) {
      $modal.addEventListener('click', (e) => {
        if (e.target === $modal) closeModal();
      });
    }

    // Esc key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $modal && !$modal.hidden) closeModal();
    });
  }

  // Trailer helpers
  function setupTrailer(movie) {
    if (!ENABLE_TRAILERS || !$trailerBtn || !$trailerWrap || !$trailerFrame) return;

    resetTrailer(); // clear prev

    // Priority: explicit movie.trailer, then first suitable link
    const rawUrl = movie.trailer || (Array.isArray(movie.links) ? movie.links.find(isVideoLink) : null);
    if (!rawUrl) return;

    $trailerBtn.hidden = false;
    $trailerBtn.onclick = () => {
      $trailerWrap.hidden = false;
      $trailerFrame.src = toEmbedUrl(rawUrl);
      $trailerFrame.setAttribute('loading', 'lazy');
      $trailerFrame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      $trailerFrame.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    };
  }

  function resetTrailer() {
    if ($trailerFrame) $trailerFrame.src = '';
    if ($trailerWrap)  $trailerWrap.hidden = true;
    if ($trailerBtn)   $trailerBtn.hidden = true;
  }

  function isVideoLink(u = '') {
    return /youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\//i.test(u);
  }

  // Convert to embed (privacy for YouTube)
  function toEmbedUrl(url) {
    if (!url) return '';

    const ytWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/i);
    if (ytWatch) return `https://www.youtube-nocookie.com/embed/${ytWatch[1]}?autoplay=1`;

    const ytShort = url.match(/youtu\.be\/([^?&]+)/i);
    if (ytShort) return `https://www.youtube-nocookie.com/embed/${ytShort[1]}?autoplay=1`;

    const vimeo = url.match(/vimeo\.com\/(\d+)/i);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;

    return url;
  }

  // Header helpers (optional future stuff)
  function wireHeader() {
    // placeholder for future header actions
  }

  // --- Utilities ---
  function byId(id) { return document.getElementById(id); }
  function q(sel, root = document) { return root.querySelector(sel); }
  function setText(el, value) { if (el) el.textContent = value ?? ''; }

  function esc(s = '') {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
})();
