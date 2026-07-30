# Letterboxd Random Picker

A Chrome extension that adds a "🎲 Pick a movie" button to any Letterboxd list or
watchlist page, and picks a random film from it.

## Install (unpacked, for local use)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repo's folder.
4. Visit any Letterboxd list (`letterboxd.com/<user>/list/<slug>/`) or watchlist
   (`letterboxd.com/<user>/watchlist/`) — a green **🎲 Pick a movie** button
   appears bottom-right.

## How it works

- Reads film titles directly from the page's DOM (`data-item-name` /
  `data-item-link` attributes on each poster) — no API calls, no login required
  beyond what your browser already has.
- If the list spans multiple pages, it fetches the remaining pages
  (same-origin `fetch()`) so the random pick covers the whole list, not just
  the first page.
- "Pick again" rerolls from the already-scanned list without re-fetching.

## Known limitations

- Relies on Letterboxd's current markup (`LazyPoster` component with
  `data-item-*` attributes). If Letterboxd changes this, the scraper will need
  updating — check `content.js`.
- For very long lists, the true last page number is inferred from the visible
  pagination links, which should cover typical list sizes.
