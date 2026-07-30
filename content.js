(function () {
  const POSTER_SELECTOR = '[data-component-class="LazyPoster"]';

  function scrapeFilmsFromDocument(doc) {
    return Array.from(doc.querySelectorAll(POSTER_SELECTOR))
      .map((el) => ({
        name: el.dataset.itemFullDisplayName || el.dataset.itemName,
        link: el.dataset.itemLink,
      }))
      .filter((film) => film.name && film.link);
  }

  function getOtherPageUrls() {
    const pageLinks = Array.from(document.querySelectorAll('.paginate-pages a'));
    if (pageLinks.length === 0) return [];

    const pageNumbers = pageLinks
      .map((a) => parseInt(a.textContent.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    const maxPage = Math.max(1, ...pageNumbers);
    if (maxPage <= 1) return [];

    const lastHref = pageLinks[pageLinks.length - 1].getAttribute('href');
    const basePath = lastHref.replace(/page\/\d+\/$/, '');

    const urls = [];
    for (let page = 2; page <= maxPage; page++) {
      urls.push(`${basePath}page/${page}/`);
    }
    return urls;
  }

  async function fetchFilmsFromUrl(url) {
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return scrapeFilmsFromDocument(doc);
  }

  async function collectAllFilms(onProgress) {
    let films = scrapeFilmsFromDocument(document);
    const otherPageUrls = getOtherPageUrls();
    const totalPages = otherPageUrls.length + 1;

    for (let i = 0; i < otherPageUrls.length; i++) {
      onProgress(i + 2, totalPages);
      const more = await fetchFilmsFromUrl(otherPageUrls[i]);
      films = films.concat(more);
    }
    return films;
  }

  async function fetchPosterUrl(filmLink) {
    try {
      const url = new URL(filmLink, window.location.origin).href;
      const response = await fetch(url, { credentials: 'include' });
      const html = await response.text();
      const match = html.match(/<meta property="og:image" content="([^"]+)"/);
      return match ? match[1] : null;
    } catch (err) {
      console.error('[Letterboxd Random Picker] failed to fetch poster', err);
      return null;
    }
  }

  // --- UI ---

  let cachedFilms = null;

  const button = document.createElement('button');
  button.id = 'lbx-picker-button';
  button.type = 'button';
  button.textContent = '\u{1F3B2} Pick a movie';
  document.body.appendChild(button);

  const overlay = document.createElement('div');
  overlay.id = 'lbx-picker-overlay';
  overlay.innerHTML = `
    <div id="lbx-picker-card">
      <button id="lbx-picker-close" type="button" aria-label="Close">&times;</button>
      <p id="lbx-picker-status"></p>
      <img id="lbx-picker-poster" alt="" hidden />
      <h2 id="lbx-picker-title"></h2>
      <a id="lbx-picker-link" target="_blank" rel="noopener"></a>
      <div id="lbx-picker-actions">
        <button id="lbx-picker-reroll" type="button">\u{1F3B2} Pick again</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const statusEl = overlay.querySelector('#lbx-picker-status');
  const posterEl = overlay.querySelector('#lbx-picker-poster');
  const titleEl = overlay.querySelector('#lbx-picker-title');
  const linkEl = overlay.querySelector('#lbx-picker-link');
  const rerollBtn = overlay.querySelector('#lbx-picker-reroll');
  const closeBtn = overlay.querySelector('#lbx-picker-close');

  function showOverlay() {
    overlay.classList.add('lbx-visible');
  }

  function hideOverlay() {
    overlay.classList.remove('lbx-visible');
  }

  let pickToken = 0;

  async function pickRandomFilm() {
    if (!cachedFilms || cachedFilms.length === 0) return;
    const film = cachedFilms[Math.floor(Math.random() * cachedFilms.length)];
    const token = ++pickToken;

    statusEl.textContent = `Picked from ${cachedFilms.length} films`;
    titleEl.textContent = film.name;
    linkEl.textContent = 'Open on Letterboxd →';
    linkEl.href = new URL(film.link, window.location.origin).href;
    posterEl.hidden = true;
    posterEl.removeAttribute('src');

    const posterUrl = await fetchPosterUrl(film.link);
    if (token !== pickToken) return; // a newer pick has since happened

    if (posterUrl) {
      posterEl.src = posterUrl;
      posterEl.hidden = false;
    }
  }

  async function handlePickClick() {
    showOverlay();
    if (cachedFilms) {
      pickRandomFilm();
      return;
    }

    button.disabled = true;
    statusEl.textContent = 'Scanning list…';
    titleEl.textContent = '';
    linkEl.textContent = '';
    linkEl.removeAttribute('href');

    try {
      cachedFilms = await collectAllFilms((current, total) => {
        statusEl.textContent = `Scanning list… (page ${current} of ${total})`;
      });
      if (cachedFilms.length === 0) {
        statusEl.textContent = 'No films found on this page.';
      } else {
        pickRandomFilm();
      }
    } catch (err) {
      statusEl.textContent = 'Something went wrong scanning this list.';
      console.error('[Letterboxd Random Picker]', err);
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', handlePickClick);
  rerollBtn.addEventListener('click', pickRandomFilm);
  closeBtn.addEventListener('click', hideOverlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hideOverlay();
  });
})();
