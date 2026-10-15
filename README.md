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
- Local playback with play, pause, seek, volume, mute, previous, next, shuffle, and repeat
- Search with filters and stale-request protection
- Likes, recent history, and playlists persisted in `localStorage`
- Fallback artwork and explicit metadata-only states

## Validation

```powershell
npm run build
```

The build check validates JavaScript syntax, catalog fields, unique IDs, and referenced local audio files.

## Supabase owner CMS

The Supabase integration is opt-in and keeps the local catalog/audio rollback path intact. It includes versioned SQL for songs, playlists, playback telemetry, analytics, audit history, owner authorization, RLS, and private storage buckets. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before configuring a real project.

```powershell
npm run catalog:export
```

This generates an idempotent seed from `songs.json` without modifying the original catalog or MP3 files. No Supabase project, owner account, upload, RLS policy test, or deployment is claimed until configured and verified with real credentials.
