import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_RULES, buildSongId, songPayload, validateAsset, validateSongDraft } from '../yr music project/js/validation.js';

const audioFile = (type = 'audio/mpeg', size = 1024) => ({ type, size });
const values = overrides => ({
  legacyId: '', title: 'New Song', artist: 'New Artist', artistId: '', album: 'Album', albumId: '',
  language: 'Hindi', genre: 'Bollywood', durationSeconds: '', status: 'draft', ...overrides
});

test('asset limits mirror the storage bucket configuration', () => {
  assert.deepEqual(ASSET_RULES.audio.types, ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav']);
  assert.equal(ASSET_RULES.audio.max, 52428800);
  assert.equal(ASSET_RULES.artwork.max, 10485760);
});

test('validateAsset accepts known types and rejects others', () => {
  assert.equal(validateAsset(null, 'audio'), null);
  assert.equal(validateAsset(audioFile(), 'audio'), null);
  assert.equal(validateAsset(audioFile('image/png'), 'audio'), 'audio type image/png is not allowed.');
  assert.equal(validateAsset({ type: '', size: 10 }, 'artwork'), 'artwork type unknown is not allowed.');
  assert.equal(validateAsset(audioFile('audio/mpeg', ASSET_RULES.audio.max + 1), 'audio'), 'audio exceeds the 50 MB limit.');
  assert.equal(validateAsset({ type: 'image/webp', size: 10 }, 'artwork'), null);
  assert.match(validateAsset(audioFile(), 'lyrics'), /Unknown asset kind/);
});

test('buildSongId prefers the legacy id and falls back to the title', () => {
  assert.equal(buildSongId('', 'Tum Hi Ho'), 'tum-hi-ho');
  assert.equal(buildSongId('hindi-arijit-tum-hi-ho', 'Ignored'), 'hindi-arijit-tum-hi-ho');
  assert.equal(buildSongId('', ''), '');
});

test('validateSongDraft reports every missing required field', () => {
  const { errors } = validateSongDraft({ values: values({ title: '', artist: ' ', language: '', genre: '' }) });
  const ids = errors.map(error => error.id);
  for (const id of ['songArtist', 'songGenre', 'songLanguage', 'songTitle']) assert.ok(ids.includes(id), `expected ${id} error`);
});

test('validateSongDraft enforces a stable, unique legacy id', () => {
  const songs = [{ id: 'uuid-1', legacy_id: 'new-song' }];
  const duplicate = validateSongDraft({ values: values({}), songs });
  assert.ok(duplicate.errors.some(error => error.id === 'songLegacyId' && /already exists/.test(error.message)));

  const editingSelf = validateSongDraft({ values: values({}), songs, currentId: 'uuid-1' });
  assert.equal(editingSelf.errors.length, 0);

  const blank = validateSongDraft({ values: values({ title: '!!!', legacyId: '!!!' }) });
  assert.ok(blank.errors.some(error => /stable song ID is required/.test(error.message)));
});

test('validateSongDraft rejects publishing without verified audio', () => {
  const { errors } = validateSongDraft({ values: values({ status: 'published' }) });
  assert.ok(errors.some(error => error.id === 'songStatus'));

  const withUpload = validateSongDraft({ values: values({ status: 'published' }), files: { audio: audioFile() } });
  assert.equal(withUpload.errors.length, 0);

  const withLocalReference = validateSongDraft({
    values: values({ status: 'published' }),
    songs: [{ id: 'uuid-1', legacy_id: 'new-song', local_audio_reference: './song.mp3' }],
    currentId: 'uuid-1'
  });
  assert.equal(withLocalReference.errors.length, 0);
});

test('validateSongDraft validates duration bounds when provided', () => {
  assert.ok(validateSongDraft({ values: values({ durationSeconds: '0' }) }).errors.some(error => error.id === 'songDuration'));
  assert.ok(validateSongDraft({ values: values({ durationSeconds: '86401' }) }).errors.some(error => error.id === 'songDuration'));
  assert.ok(validateSongDraft({ values: values({ durationSeconds: 'abc' }) }).errors.some(error => error.id === 'songDuration'));
  assert.equal(validateSongDraft({ values: values({ durationSeconds: '200' }) }).errors.length, 0);
});

test('songPayload trims fields and merges slug metadata', () => {
  const payload = songPayload({
    values: values({ title: '  Song  ', artist: ' Arijit Singh ', artistId: '', album: '', albumId: 'Jawan', status: 'published', durationSeconds: '201' }),
    existing: { metadata: { popularity: 12, keep: true } },
    legacyId: 'song'
  });
  assert.equal(payload.title, 'Song');
  assert.equal(payload.artist, 'Arijit Singh');
  assert.equal(payload.album, null);
  assert.equal(payload.duration_seconds, 201);
  assert.equal(payload.publication_status, 'published');
  assert.deepEqual(payload.metadata, { popularity: 12, keep: true, artist_id: 'arijit-singh', album_id: 'jawan' });
});