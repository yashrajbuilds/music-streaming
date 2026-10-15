# YR MUSIC

YR MUSIC is a focused, dark music discovery interface built from the original static music page. It combines the two included local MP3 files with catalog search and 30-second previews from the public iTunes Search API.

## Features

- Responsive desktop and mobile navigation
- Local MP3 playback with play, pause, seek, volume, mute, previous, next, shuffle, and repeat
- Catalog search with debounce, loading, empty, and network error states
- Favorites and recently played state persisted in `localStorage`
- Keyboard shortcuts: Space for play/pause, M for mute, and arrow keys to seek
- Accessible controls, fallback artwork, reduced-motion support, and no exposed secrets

## Architecture

The app remains framework-free and uses native ES modules:

```text
yr music project/
├── index.html              semantic application shell
├── css/
│   ├── style.css           variables, typography, layout, base styles
│   ├── components.css      navigation, cards, player, controls, states
│   └── responsive.css      mobile and tablet behavior
├── js/
│   ├── app.js              bootstrap, views, event wiring
│   ├── api.js              iTunes Search API client and normalization
│   ├── player.js           audio playback, queue, seek, volume, repeat
│   ├── state.js            centralized application state
│   ├── storage.js          safe localStorage persistence
│   ├── search.js           debounced catalog search
│   └── ui.js               rendering, cards, artwork, and toasts
├── Jai Shree Ram.mp3      original local audio asset
└── Ram Aayenge to Angana Sajaungi (Female Version).mp3
```

## Run Locally

No build step or API key is required. Serve the repository over HTTP so browser audio and fetch behavior are consistent:

```powershell
cd "yr music project"
python -m http.server 8080
```

Open http://localhost:8080.

## API and Limitations

Search uses Apple's public iTunes Search API. Its results provide metadata, artwork, and provider-hosted short previews. YR MUSIC does not claim or implement unrestricted streaming, downloading, scraping, DRM bypass, or authentication. The two bundled MP3s are the only full-length local playback assets in this repository.

The app is intentionally local-first: favorites, recent history, player volume, and queue behavior are stored in the browser. A backend, user accounts, server-side provider credentials, playlist sync, and production observability would be the next step for a deployed multi-user product.

## Security

There are no API keys in the frontend. `.env` files, build artifacts, logs, and dependency folders are ignored. If a private provider is added later, put its credentials behind a server-side API or serverless function and rotate any credential that has ever been committed.

## Deployment

This static app can be deployed to Netlify, Vercel, GitHub Pages, or any static host. Publish the `yr music project` directory as the site root. Keep the MP3 files available at the same relative paths.

## Future Improvements

1. Add a server-side provider adapter and authenticated account flow.
2. Add real playlist creation and playlist editing UI backed by local storage or a database.
3. Add routeable artist, album, and track detail views.
4. Add automated browser tests for search and player state.
5. Add a proper build pipeline with linting, asset optimization, and deployment previews.