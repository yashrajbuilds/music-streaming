# YR MUSIC

YR MUSIC is a framework-free music discovery interface with a normalized local catalog, two bundled MP3 files, search, filters, likes, recent history, playlists, and queue controls.

## Run locally

From the repository root:

```powershell
npm run dev
```

Open http://localhost:8080. The static server publishes `yr music project` as the site root. `npm start` is an alias for the same command.

## Playback and provider status

The bundled `Jai Shree Ram.mp3` and `Ram Aayenge to Angana Sajaungi (Female Version).mp3` files are verified local playback sources. Other catalog records are metadata-only and are visibly labeled until a licensed provider supplies a verified preview or playable URL. The app does not scrape, download unauthorized music, bypass DRM, rehost streams, or expose provider credentials.

`yr music project/js/api.js` is a normalized provider boundary. It currently reads `data/songs.json`; no iTunes or SoundCloud integration is active. A future provider must be licensed, server-mediated where credentials are required, and compliant with attribution and playback restrictions.

## Features

- Responsive desktop and mobile navigation
- Hindi, Haryanvi, Punjabi, and Indian editorial catalog sections
- Local playback with play, pause, seek, volume (persisted), mute, previous, next, shuffle, and repeat
- Queue navigation that skips metadata-only tracks instead of silently stopping playback
- Playlist playback, duplicate-safe track picking, and a queue built from the playlist
- Search with filters and stale-request protection
- Likes, recent history, and playlists persisted in `localStorage`
- Fallback artwork and explicit metadata-only states

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause the current track |
| `M` | Mute / unmute |
| `←` / `→` | Seek 5 seconds backwards / forwards |

Shortcuts are ignored while typing in a field or while a control has focus.

## Validation and tests

```powershell
npm run build
npm test
npm run verify
```

- `npm run build` checks JavaScript syntax, local module imports, catalog fields, slug-safe unique IDs, relative audio paths, referenced HTML assets, and the Supabase migration markers.
- `npm test` runs the zero-dependency `node:test` suite in `tests/`.
- `npm run verify` runs the build check, the test suite, and the Supabase foundation verification together.

The test runner uses the built-in `node:test` module, so Node.js 20 or newer is recommended and no packages need to be installed.

The tests cover catalog normalization and HTTP failure recovery, search debouncing and filters, storage/history persistence, XSS-safe rendering, playlist rules, admin form validation, and player queue behaviour (skipping unplayable tracks, repeat modes, shuffle, and volume restore). `tests/helpers/fake-dom.js` provides the small DOM/audio stubs, so no extra dependencies are required.

## Supabase owner CMS

The Supabase integration is opt-in and keeps the local catalog/audio rollback path intact. It includes versioned SQL for songs, playlists, playback telemetry, analytics, audit history, owner authorization, RLS, and private storage buckets. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before configuring a real project.

```powershell
npm run catalog:export
```

This generates an idempotent seed from `songs.json` without modifying the original catalog or MP3 files. No Supabase project, owner account, upload, RLS policy test, or deployment is claimed until configured and verified with real credentials.
