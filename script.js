let allMovies = [];
let currentDecade = 'all';

/* 📥 Загрузка фильмов из JSON */
function loadMovies() {
  fetch('movies.json')
    .then(response => response.json())
    .then(movies => {
      allMovies = movies;
      renderMovies(movies);
      setupDecadeFilters();
      setupSearch();
    })
    .catch(error => console.error('Ошибка загрузки:', error));
}

/* 🎨 Отрисовка фильмов с учётом фильтра десятилетий и поиска */
function renderMovies(movies) {
  const catalog = document.getElementById('catalog');
  catalog.innerHTML = '';

  // 1) Фильтрация по десятилетию
  let filteredMovies = movies;
  if (currentDecade !== 'all') {
    const decadeStart = parseInt(currentDecade, 10);
    filteredMovies = movies.filter(
      (movie) => movie.year >= decadeStart && movie.year < decadeStart + 10
    );
  }

  // 2) Поиск по названию (prefix match; игнорируем артикли)
  const searchTerm =
    document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  if (searchTerm) {
    filteredMovies = filteredMovies.filter((movie) => {
      const cleanTitle = movie.title.replace(/^(the|a|an)\s+/i, '');
      return (
        cleanTitle.toLowerCase().startsWith(searchTerm) ||
        movie.title.toLowerCase().startsWith(searchTerm)
      );
    });
  }

  // 3) Рендер карточек (создаём DOM-элементы вручную, чтобы повесить onload для fade-in)
  filteredMovies.forEach((movie) => {
    // Обёртка карточки
    const card = document.createElement('div');
    card.className = 'card';

    // ➕ Пробрасываем цвет подсветки из JSON в CSS-переменную на карточке
    const hl = movie.color || '#ffcc00';
    card.style.setProperty('--hl', hl);

    // Постер с fade-in: сначала прозрачный, после загрузки добавим класс .loaded
    const img = document.createElement('img');
    img.src = movie.poster;
    img.alt = movie.title;
    img.loading = 'lazy';
    img.onload = () => img.classList.add('loaded'); // класс .loaded включает opacity:1 из CSS

    // Инфо-блок (название + год). Название может содержать <span class="highlight">...
    const info = document.createElement('div');
    info.className = 'info';
    const highlightTitle = getHighlightedTitle(movie.title, searchTerm);
    info.innerHTML = `<h3>${highlightTitle}</h3><p>${movie.year}</p>`;

    // Клик по карточке — открыть модалку с деталями
    card.addEventListener('click', () => showModal(movie));

    // Собираем карточку
    card.appendChild(img);
    card.appendChild(info);
    catalog.appendChild(card);
  });

  // 4) Пустая выдача
  if (filteredMovies.length === 0) {
    catalog.innerHTML = '<p class="no-results">Nothing found</p>';
  }
}

/* ✨ Подсветка совпадения в названии (prefix) */
function getHighlightedTitle(title, searchTerm) {
  if (!searchTerm) return title;

  const cleanTitle = title.replace(/^(the|a|an)\s+/i, '');
  if (cleanTitle.toLowerCase().startsWith(searchTerm)) {
    const prefixLen = title.length - cleanTitle.length;
    return `<span class="highlight">${title.substring(
      0,
      prefixLen + searchTerm.length
    )}</span>${title.substring(prefixLen + searchTerm.length)}`;
  }
  if (title.toLowerCase().startsWith(searchTerm)) {
    return `<span class="highlight">${title.substring(
      0,
      searchTerm.length
    )}</span>${title.substring(searchTerm.length)}`;
  }
  return title;
}

/* ⏳ Кнопки фильтра десятилетий */
function setupDecadeFilters() {
  document.querySelectorAll('.decade-filters button').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentDecade = btn.dataset.decade;
      document
        .querySelectorAll('.decade-filters button')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderMovies(allMovies);
    });
  });
}

/* 🔍 Живой поиск */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    renderMovies(allMovies);
  });
}

/* 📖 Модальное окно с деталями фильма */
function showModal(movie) {
  const modal = document.getElementById('modal');
  document.getElementById('modal-title').textContent = movie.title;
  document.getElementById('modal-year').textContent = movie.year;
  document.getElementById('modal-notes').textContent = movie.notes || '';

  // Цитаты
  const quotesList = document.getElementById('modal-quotes');
  quotesList.innerHTML = '';
  (movie.quotes || []).forEach((q) => {
    const li = document.createElement('li');
    li.textContent = q;
    quotesList.appendChild(li);
  });

  // Ссылки
  const linksList = document.getElementById('modal-links');
  linksList.innerHTML = '';
  (movie.links || []).forEach((l) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = l;
    a.textContent = l;
    a.target = '_blank';
    li.appendChild(a);
    linksList.appendChild(li);
  });

  modal.style.display = 'flex';
}

/* ❌ Закрытие модалки */
document.getElementById('close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

/* 🚀 Старт */
loadMovies();
