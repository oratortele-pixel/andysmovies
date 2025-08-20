// Пример фильмов (можно подгружать JSON)
const movies = [
  {
    title: "The Godfather",
    year: 1972,
    poster: "assets/posters/godfather.jpg",
    quotes: ["I'm gonna make him an offer he can't refuse."],
    links: [{label: "IMDb", url: "https://www.imdb.com/title/tt0068646/"}],
    trailer: "https://www.youtube.com/embed/sY1S34973zA"
  },
  {
    title: "Pulp Fiction",
    year: 1994,
    poster: "assets/posters/pulpfiction.jpg",
    quotes: ["Say 'what' again!"],
    links: [{label: "IMDb", url: "https://www.imdb.com/title/tt0110912/"}],
    trailer: "https://www.youtube.com/embed/s7EdQ4FqbhY"
  }
];

const catalog = document.getElementById("catalog");
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("close");
const modalTitle = document.getElementById("modal-title");
const modalYear = document.getElementById("modal-year");
const modalQuotes = document.getElementById("modal-quotes");
const modalLinks = document.getElementById("modal-links");
const trailerBtn = document.getElementById("trailer-btn");
const trailerWrap = document.getElementById("trailer-wrap");
const trailerFrame = document.getElementById("trailer-frame");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

let currentIndex = 0;

// Рендер карточек
movies.forEach((movie, index) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<img src="${movie.poster}" alt="${movie.title}" loading="lazy">`;
  card.addEventListener("click", () => openModal(index));
  catalog.appendChild(card);
});

// Открытие модалки
function openModal(index) {
  currentIndex = index;
  const movie = movies[index];

  modalTitle.textContent = movie.title;
  modalYear.textContent = movie.year;
  modalQuotes.innerHTML = movie.quotes.map(q => `<li>${q}</li>`).join("");
  modalLinks.innerHTML = movie.links.map(l => `<li><a href="${l.url}" target="_blank">${l.label}</a></li>`).join("");

  if (movie.trailer) {
    trailerBtn.hidden = false;
    trailerBtn.onclick = () => {
      trailerWrap.hidden = false;
      trailerFrame.src = movie.trailer;
    };
  } else {
    trailerBtn.hidden = true;
  }

  modal.hidden = false;
}

// Закрытие
function closeModal() {
  modal.hidden = true;
  trailerFrame.src = "";
  trailerWrap.hidden = true;
}
closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// Навигация стрелками
prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + movies.length) % movies.length;
  openModal(currentIndex);
});
nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % movies.length;
  openModal(currentIndex);
});
