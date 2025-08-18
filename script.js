/* ===========================================================
   Movie Catalog — main script
   Фичи: поиск, фильтры, подсветка, fade-in, модалка, трейлеры
   =========================================================== */

let allMovies = [];
let currentDecade = 'all';

/* ===== Feature toggles (для быстрого отката) ===== */
const ENABLE_FADE_IN     = true;  // плавное проявление постеров
const ENABLE_MODAL_ANIM  = true;  // анимация открытия/закрытия модалки
const ENABLE_TRAILERS    = true;  // кнопка трейлера + встроенный плеер

/* 📥 Загрузка фильмов из JSON */
function loadMovies() {
  fetch('movies.json')
    .then(res => res.json())
    .then(movies => {
      allMovies = movies;
      renderMovies(movies);
      setupDecadeFilters();
      setupSearch();
      setupModalBGClose(); // закрытие модалки по клику на фон
    })
    .catch(err => console.error('Load error:', err));
}

/* 🎨 Отрисовка каталога (десятилетия + поиск + подсветка) */
function renderMovies(movies) {
  const catalog = document.getElementById('catalog');
  catalog.innerHTML = '';

  // 1) фильтр по десятилетию
  let filtered = movies;
  if (currentDecade !== 'all') {
    const d0 = parseInt(currentDecade, 10);
    filtered = movies.filter(m => m.year >= d0 && m.year < d0 + 10);
  }

  // 2) поиск по префиксу, игнорируя артикли
  const q = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  if (q) {
    filtered = filtered.filter(m => {
      const clean = m.title.replace(/^(the|a|an)\s+/i, '');
      return clean.toLowerCase().startsWith(q) || m.title.toLowerCase().startsWith(q);
    });
  }

  // 3) карточки
  filtered.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--hl', movie.color || '#ffcc00'); // цвет подсветки заголовка

    // постер (вариант с fade-in)
    if (ENABLE_FADE_IN) {
      const img = document.createElement('img');
      img.src = movie.poster;
      img.alt = movie.title;
      img.loading = 'lazy';
      img.onload = () => img.classList.add('loaded');
      // если картинка уже из кэша — onload может не сработать
      if (img.complete) requestAnimationFrame(() => img.classList.add('loaded'));
      card.appendChild(img);
    } else {
      // откат: без fade-in
      card.insertAdjacentHTML('beforeend', `<img src="${movie.poster}" alt="${movie.title}" loading="lazy">`);
    }

    // инфо
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `
      <h3>${getHighlightedTitle(movie.title, q)}</h3>
      <p>${movie.year}</p>
    `;
    card.appendChild(info);

    // клик → модалка
    card.addEventListener('click', () => showModal(movie));
    catalog.appendChild(card);
  });

  // 4) пустая выдача
  if (filtered.length === 0) {
    catalog.innerHTML = '<p class="no-results">Nothing found</p>';
  }
}

/* ✨ Подсветка совпадения в названии (prefix) */
function getHighlightedTitle(title, searchTerm) {
  if (!searchTerm) return title;
  const clean = title.replace(/^(the|a|an)\s+/i, '');
  if (clean.toLowerCase().startsWith(searchTerm)) {
    const prefixLen = title.length - clean.length;
    return `<span class="highlight">${title.substring(0, prefixLen + searchTerm.length)}</span>${title.substring(prefixLen + searchTerm.length)}`;
  }
  if (title.toLowerCase().startsWith(searchTerm)) {
    return `<span class="highlight">${title.substring(0, searchTerm.length)}</span>${title.substring(searchTerm.length)}`;
  }
  return title;
}

/* ⏳ Кнопки десятилетий */
function setupDecadeFilters() {
  document.querySelectorAll('.decade-filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDecade = btn.dataset.decade;
      document.querySelectorAll('.decade-filters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMovies(allMovies);
    });
  });
}

/* 🔍 Живой поиск */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => renderMovies(allMovies));
}

/* ============= МОДАЛКА ============= */

/* Открытие модалки и заполнение данных */
function showModal(movie) {
  const modal = document.getElementById('modal');

  // контент
  setText('modal-title', movie.title);
  setText('modal-year', movie.year);
  setText('modal-notes', movie.notes || '');

  // цитаты
  const quotesList = document.getElementById('modal-quotes');
  quotesList.innerHTML = '';
  (movie.quotes || []).forEach(q => {
    const li = document.createElement('li');
    li.textContent = q;
    quotesList.appendChild(li);
  });

  // ссылки
  const linksList = document.getElementById('modal-links');
  linksList.innerHTML = '';
  (movie.links || []).forEach(url => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.target = '_blank';
    li.appendChild(a);
    linksList.appendChild(li);
  });

  // трейлер
  setupTrailer(movie);

  // показ модалки
  modal.classList.remove('closing');
  modal.style.display = 'flex';
  if (ENABLE_MODAL_ANIM) {
    requestAnimationFrame(() => modal.classList.add('visible'));
  }
}

/* Крестик «×» */
document.getElementById('close').addEventListener('click', () => closeModal());

/* Закрытие модалки (учитываем анимацию и остановку трейлера) */
function closeModal() {
  const modal = document.getElementById('modal');

  // остановить и скрыть трейлер
  resetTrailer();

  if (!ENABLE_MODAL_ANIM) {
    modal.style.display = 'none';
    modal.classList.remove('visible', 'closing');
    return;
  }
  modal.classList.remove('visible');
  modal.classList.add('closing');
  setTimeout(() => {
    modal.style.display = 'none';
    modal.classList.remove('closing');
  }, 200); // синхронизировано с --modal-dur в CSS
}

/* Закрытие модалки по клику на тёмный фон */
function setupModalBGClose() {
  const modal = document.getElementById('modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/* ============= ТРЕЙЛЕРЫ ============= */

/* Ищем ссылку трейлера: сначала явное поле movie.trailer, затем первая подходящая из links */
function getTrailerUrl(movie) {
  if (!ENABLE_TRAILERS) return null;
  if (movie.trailer && typeof movie.trailer === 'string') return movie.trailer;

  const links = Array.isArray(movie.links) ? movie.links : [];
  return links.find(u => /youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\//i.test(u)) || null;
}

/* Превращаем обычный URL в embed-URL для iframe (YouTube/Vimeo) */
function toEmbedUrl(url) {
  if (!url) return '';
  // YouTube: https://www.youtube.com/watch?v=ID → /embed/ID
  const ytWatch = url.match(/youtube\.com\/watch\?v=([^&]+)/i);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1`;
  // YouTube short: https://youtu.be/ID → /embed/ID
  const ytShort = url.match(/youtu\.be\/([^?&]+)/i);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1`;
  // Vimeo: https://vimeo.com/ID → player.vimeo.com/video/ID
  const vimeo = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  // по умолчанию — оригинал
  return url;
}

/* Сброс плеера (чтобы видео не играло после закрытия) */
function resetTrailer() {
  const wrap  = document.getElementById('trailer-wrap');
  const frame = document.getElementById('trailer-frame');
  const btn   = document.getElementById('trailer-btn');
  if (frame) frame.src = '';
  if (wrap)  wrap.hidden = true;
  if (btn)   btn.hidden = true;
}

/* Настройка кнопки и плеера под конкретный фильм */
function setupTrailer(movie) {
  const btn   = document.getElementById('trailer-btn');
  const wrap  = document.getElementById('trailer-wrap');
  const frame = document.getElementById('trailer-frame');

  resetTrailer();               // сбрасываем предыдущий плеер
  if (!ENABLE_TRAILERS) return;

  const url = getTrailerUrl(movie);
  if (!url) return;             // если трейлера нет — кнопка остаётся скрытой

  btn.hidden = false;
  btn.onclick = () => {
    wrap.hidden = false;
    frame.src = toEmbedUrl(url);
  };
}

/* ===== Хелперы ===== */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

/* 🚀 Старт */
loadMovies();
