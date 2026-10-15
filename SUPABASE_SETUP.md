# Supabase setup

This integration is intentionally opt-in. The existing local catalog and MP3 playback remain the rollback path until a Supabase project is configured and verified.

## 1. Create the project

Create a Supabase project and record:

- Project URL
- Public anon key

Never use the service-role key in browser code, `.env.example`, or source control.

## 2. Apply schema and seed

Using the Supabase SQL editor, run these files in order:

```text
supabase/migrations/202610150001_initial_schema.sql
supabase/seed/0001_catalog.sql
```

The seed is generated from the unchanged `yr music project/data/songs.json`:

```powershell
npm run catalog:export
```

Run the non-destructive local foundation check before using an isolated project:

```powershell
npm run supabase:verify
```

This checks migration security markers, owner/path policy markers, destructive-statement absence, seed idempotency, catalog coverage, and SHA-256 preservation of `songs.json` and both local MP3s. It does not connect to Supabase or execute SQL.

It upserts by `legacy_id`, so repeated imports do not duplicate songs. It preserves the two existing local audio references and does not copy, delete, or overwrite MP3 files.

## 3. Provision the single owner

1. In Supabase Authentication, create the owner user with email/password.
2. Disable public signups in Authentication settings.
3. Insert only that user's UUID into the protected authorization table:

```sql
insert into public.owner_authorizations (user_id)
values ('OWNER_AUTH_USER_UUID');
```

Do not put the password in SQL, source files, or chat. Use Supabase's password reset/recovery flow for recovery.

## 4. Configure the browser

The static app does not load `.env` automatically. Before `admin.html` or `index.html` is loaded, configure a browser-safe object in your hosting setup or a local untracked config script:

```html
<script>
  globalThis.YR_MUSIC_CONFIG = {
    supabase: {
      url: 'https://your-project-ref.supabase.co',
      anonKey: 'your-public-anon-key'
    }
  };
</script>
```

Only the URL and public anon key belong here. Do not add `service_role`, database passwords, or OAuth client secrets.

The current `admin.html` includes an empty fallback configuration, so it will show a clear “Supabase is not configured” state until a real project config is supplied.

For an isolated verification project, apply the migration and seed in the SQL editor, then verify with three identities: anonymous, a normal authenticated user, and the owner. Confirm anonymous users can select only published songs; the normal user cannot write songs, storage objects, analytics tables, or audit rows; and the owner can perform the intended catalog/storage writes. Do not use production credentials for this test.

## 5. Admin usage

Run the static site:

```powershell
npm run dev
```

Open `http://localhost:8080/admin.html`. The admin page requires a valid Supabase Auth session and an entry in `owner_authorizations`. RLS remains the enforcement boundary for every database/storage write.

The current admin surface supports sign-in, sign-out, owner verification, song search/filtering, create/edit metadata, publication status, upload progress, analytics overview, CSV export, and audit history. Run `select public.refresh_daily_analytics();` as the owner before reporting daily aggregates.

## 6. Public catalog behavior

When `YR_MUSIC_CONFIG.supabase` is configured, the public adapter reads published rows from `songs`. If Supabase is unavailable or not configured, it falls back to the original local `songs.json`. Metadata-only rows remain non-playable; the adapter never fabricates audio URLs.

## Security checklist

- Confirm anonymous users can select only published songs.
- Confirm anonymous users cannot insert/update/delete songs, playlists, events, or storage objects directly.
- Confirm a non-owner authenticated account cannot access owner analytics or mutate catalog/storage.
- Confirm owner writes create audit entries.
- Confirm Storage objects must be stored under `<owner-user-id>/...` and cross-owner paths are rejected.
- Confirm audio/artwork bucket MIME and size limits match operational needs.
- Enable project backups and export the database before destructive migrations.
- Keep the original `songs.json` and local MP3 files in the rollback artifact.

## Known limitations

- No Supabase project, owner account, storage upload, RLS test, or production deployment is verified in this repository.
- `npm run supabase:verify` is local static verification only; it is not a substitute for the isolated-project identity/policy tests above.
- The admin page currently uses REST/Auth directly to avoid adding a dependency; production deployment should add a CSP and a hosting-level config injection step.
- Daily analytics aggregation is available through the owner-only `refresh_daily_analytics()` function; schedule it only after validating event volume and retention in the real project.
- The existing local playlist UI remains separate from Supabase playlists until that sync contract is implemented and tested.
