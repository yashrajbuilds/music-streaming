import { supabaseAuth, supabaseConfigured, supabaseRest } from './supabase.js';
import { escapeHtml } from './utils.js';
import { songPayload, validateAsset, validateSongDraft } from './validation.js';

const $ = id => document.getElementById(id);
const loginPanel = $('loginPanel');
const adminPanel = $('adminPanel');
const pageSize = 10;
let session;
let songs = [];
let page = 1;
let analyticsRows = [];
let audioPreviewUrl;
let artworkPreviewUrl;

const accessToken = () => supabaseAuth.session()?.access_token || session?.access_token;
const query = value => encodeURIComponent(value);
const setStatus = (message, error = false) => {
  const target = adminPanel.classList.contains('hidden') ? $('loginStatus') : $('adminStatus');
  target.textContent = message;
  target.className = `admin-status${error ? ' error' : ''}`;
};
const setFormErrors = errors => {
  document.querySelectorAll('.field-error').forEach(field => field.classList.remove('field-error'));
  $('songFormErrors').innerHTML = errors.length ? `<ul>${errors.map(error => `<li>${escapeHtml(error.message)}</li>`).join('')}</ul>` : '';
  errors.forEach(error => $(error.id)?.classList.add('field-error'));
};
const fillFilter = (id, values, label) => {
  const select = $(id);
  const current = select.value;
  select.innerHTML = `<option value="">${label}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
  if (values.includes(current)) select.value = current;
};
const filterValues = key => [...new Set(songs.map(song => song[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const filteredSongs = () => {
  const search = $('songSearch').value.trim().toLowerCase();
  const language = $('languageFilter').value;
  const genre = $('genreFilter').value;
  const publicationStatus = $('statusFilter').value;
  return songs.filter(song => (!search || [song.title, song.artist, song.album, song.language, song.legacy_id].some(value => String(value || '').toLowerCase().includes(search))) && (!language || song.language === language) && (!genre || song.genre === genre) && (!publicationStatus || song.publication_status === publicationStatus));
};

const renderSongs = () => {
  const visible = filteredSongs();
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  page = Math.min(page, totalPages);
  const rows = visible.slice((page - 1) * pageSize, page * pageSize);
  const published = songs.filter(song => song.publication_status === 'published').length;
  const drafts = songs.filter(song => song.publication_status === 'draft').length;
  $('songCount').textContent = `${songs.length} songs · ${published} published · ${drafts} drafts`;
  $('libraryPageStatus').textContent = `${visible.length ? (page - 1) * pageSize + 1 : 0}-${Math.min(page * pageSize, visible.length)} of ${visible.length} · page ${page}/${totalPages}`;
  $('songList').innerHTML = rows.length ? rows.map(song => `<div class="admin-list-item song-item"><button class="song-select" data-song-id="${escapeHtml(song.id)}" type="button"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.artist)}${song.album ? ` · ${escapeHtml(song.album)}` : ''} · ${escapeHtml(song.language)} · ${escapeHtml(song.genre)}</small></button><span class="status-pill status-${escapeHtml(song.publication_status)}">${escapeHtml(song.publication_status)}</span><button class="text-button" data-song-toggle="${escapeHtml(song.id)}">${song.publication_status === 'published' ? 'Unpublish' : 'Publish'}</button><button class="text-button danger-action" data-song-delete="${escapeHtml(song.id)}">Delete</button></div>`).join('') : '<div class="admin-empty">No songs match this view.</div>';
  $('songPagination').innerHTML = `<button class="text-button" data-page="-1" ${page <= 1 ? 'disabled' : ''}>Previous</button><button class="text-button" data-page="1" ${page >= totalPages ? 'disabled' : ''}>Next</button>`;
};

const loadSongs = async () => {
  songs = await supabaseRest.select('songs', '?select=*&order=updated_at.desc', accessToken());
  fillFilter('languageFilter', filterValues('language'), 'All languages');
  fillFilter('genreFilter', filterValues('genre'), 'All genres');
  renderSongs();
};
const loadAnalytics = async () => {
  analyticsRows = await supabaseRest.select('daily_analytics', '?select=*&order=day.desc&limit=30', accessToken());
  const totals = analyticsRows.reduce((sum, row) => ({ visitors: sum.visitors + row.unique_visitors_estimate, starts: sum.starts + row.playback_starts, completions: sum.completions + row.completed_plays, seconds: sum.seconds + row.listening_seconds }), { visitors: 0, starts: 0, completions: 0, seconds: 0 });
  $('metricGrid').innerHTML = [['Visitors', totals.visitors, 'estimated'], ['Starts', totals.starts, 'playback events'], ['Completed', totals.completions, 'completed plays'], ['Listening', `${Math.round(totals.seconds / 60)} min`, 'active time']].map(metric => `<div class="metric-card"><span>${metric[0]}</span><strong>${metric[1]}</strong><small>${metric[2]}</small></div>`).join('');
  $('analyticsTable').innerHTML = analyticsRows.length ? analyticsRows.map(row => `<div class="admin-list-item"><span><strong>${escapeHtml(row.day)}</strong><small>${row.active_sessions_estimate} active listeners estimated</small></span><span>${row.playback_starts} starts · ${Math.round(row.listening_seconds / 60)} min</span></div>`).join('') : '<div class="admin-empty">No analytics events have arrived yet.</div>';
};
const loadAudit = async () => {
  const rows = await supabaseRest.select('admin_audit_log', '?select=*&order=created_at.desc&limit=30', accessToken());
  $('auditList').innerHTML = rows.length ? rows.map(row => `<div class="admin-list-item"><span><strong>${escapeHtml(row.action)} · ${escapeHtml(row.entity_type)}</strong><small>${escapeHtml(row.created_at)}</small></span><small>${escapeHtml(row.entity_id || '')}</small></div>`).join('') : '<div class="admin-empty">No admin actions recorded yet.</div>';
};
const audit = (action, entityId, details = {}) => supabaseRest.insert('admin_audit_log', { actor_id: session.user.id, action, entity_type: 'song', entity_id: entityId, details }, accessToken());

const resetPreview = () => {
  if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
  if (artworkPreviewUrl) URL.revokeObjectURL(artworkPreviewUrl);
  audioPreviewUrl = null;
  artworkPreviewUrl = null;
  $('audioPreview').hidden = true;
  $('audioPreview').removeAttribute('src');
  $('artworkPreview').hidden = true;
  $('artworkPreview').removeAttribute('src');
};
const clearForm = () => { $('songForm').reset(); $('songId').value = ''; $('songFormTitle').textContent = 'Add song'; $('songStatus').value = 'draft'; setFormErrors([]); resetPreview(); };
const editSong = song => { const metadata = song.metadata || {}; $('songAudio').value = ''; $('songArtwork').value = ''; resetPreview(); $('songId').value = song.id; $('songLegacyId').value = song.legacy_id || ''; $('songTitle').value = song.title || ''; $('songArtist').value = song.artist || ''; $('songArtistId').value = metadata.artist_id || ''; $('songAlbum').value = song.album || ''; $('songAlbumId').value = metadata.album_id || ''; $('songLanguage').value = song.language || ''; $('songGenre').value = song.genre || ''; $('songDuration').value = song.duration_seconds || ''; $('songStatus').value = song.publication_status || 'draft'; $('songFormTitle').textContent = 'Edit song'; setFormErrors([]); window.scrollTo({ top: 0, behavior: 'smooth' }); };
const readFormValues = () => ({
  legacyId: $('songLegacyId').value,
  title: $('songTitle').value,
  artist: $('songArtist').value,
  artistId: $('songArtistId').value,
  album: $('songAlbum').value,
  albumId: $('songAlbumId').value,
  language: $('songLanguage').value,
  genre: $('songGenre').value,
  durationSeconds: $('songDuration').value,
  status: $('songStatus').value
});
const readFormFiles = () => ({ audio: $('songAudio').files[0], artwork: $('songArtwork').files[0] });
const validateForm = () => validateSongDraft({ values: readFormValues(), files: readFormFiles(), songs, currentId: $('songId').value });
const updatePreview = () => { const audio = $('songAudio').files[0]; const artwork = $('songArtwork').files[0]; resetPreview(); if (audio && !validateAsset(audio, 'audio')) { audioPreviewUrl = URL.createObjectURL(audio); $('audioPreview').src = audioPreviewUrl; $('audioPreview').hidden = false; $('audioPreview').onloadedmetadata = () => { if (!$('songDuration').value) $('songDuration').value = Math.round($('audioPreview').duration); }; } if (artwork && !validateAsset(artwork, 'artwork')) { artworkPreviewUrl = URL.createObjectURL(artwork); $('artworkPreview').src = artworkPreviewUrl; $('artworkPreview').hidden = false; } };
const uploadAsset = async (bucket, path, file, label) => { setStatus(`Uploading ${label}...`); await supabaseRest.upload(bucket, path, file, accessToken(), progress => setStatus(`Uploading ${label}: ${Math.round(progress * 100)}%`)); };

const handleSongAction = async event => {
  const item = event.target.closest('[data-song-id]');
  if (item) { const song = songs.find(entry => entry.id === item.dataset.songId); if (song) editSong(song); return; }
  const pageButton = event.target.closest('[data-page]');
  if (pageButton && !pageButton.disabled) { page += Number(pageButton.dataset.page); renderSongs(); return; }
  const toggle = event.target.closest('[data-song-toggle]');
  if (toggle) { const song = songs.find(entry => entry.id === toggle.dataset.songToggle); if (!song || !window.confirm(`${song.publication_status === 'published' ? 'Unpublish' : 'Publish'} ${song.title}?`)) return; try { if (song.publication_status !== 'published' && !song.audio_path && !song.local_audio_reference) throw new Error('Add verified audio before publishing this song.'); const nextStatus = song.publication_status === 'published' ? 'draft' : 'published'; await supabaseRest.update('songs', `?id=eq.${query(song.id)}`, { publication_status: nextStatus }, accessToken()); await audit('change_publication_status', song.id, { publication_status: nextStatus }); await loadSongs(); setStatus('Publication status updated.'); } catch (error) { setStatus(error.message, true); } return; }
  const remove = event.target.closest('[data-song-delete]');
  if (!remove) return;
  const song = songs.find(entry => entry.id === remove.dataset.songDelete);
  if (!song || !window.confirm(`Delete ${song.title}? This cannot be undone.`)) return;
  try { await supabaseRest.remove('songs', `?id=eq.${query(song.id)}`, accessToken()); const cleanup = []; for (const [bucket, path] of [['yr-audio', song.audio_path], ['yr-artwork', song.artwork_path]]) if (path) { try { await supabaseRest.removeObject(bucket, path, accessToken()); } catch (error) { cleanup.push(`${bucket}: ${error.message}`); } } await audit('delete_song', song.id, { title: song.title }); await loadSongs(); await loadAudit(); setStatus(cleanup.length ? `Song deleted, but asset cleanup needs attention: ${cleanup.join('; ')}` : 'Song deleted.', cleanup.length > 0); } catch (error) { setStatus(error.message, true); }
};

$('loginForm').addEventListener('submit', async event => { event.preventDefault(); if (!supabaseConfigured) return setStatus('Supabase is not configured. Add the project URL and anon key in the page configuration.', true); setStatus('Signing in...'); try { await supabaseAuth.signIn($('loginEmail').value.trim(), $('loginPassword').value); await boot(); } catch (error) { setStatus(error.message, true); } });
$('logoutButton').addEventListener('click', async () => { await supabaseAuth.signOut(); location.reload(); });
$('newSongButton').addEventListener('click', clearForm);
$('cancelSongButton').addEventListener('click', clearForm);
$('songSearch').addEventListener('input', () => { page = 1; renderSongs(); });
['languageFilter', 'genreFilter', 'statusFilter'].forEach(id => $(id).addEventListener('change', () => { page = 1; renderSongs(); }));
$('songList').addEventListener('click', handleSongAction);
$('songPagination').addEventListener('click', handleSongAction);
$('songAudio').addEventListener('change', updatePreview);
$('songArtwork').addEventListener('change', updatePreview);
$('refreshAnalytics').addEventListener('click', () => loadAnalytics().catch(error => setStatus(error.message, true)));
$('exportAnalytics').addEventListener('click', () => { const header = ['day', 'unique_visitors_estimate', 'playback_starts', 'completed_plays', 'listening_seconds', 'active_sessions_estimate']; const csv = [header, ...analyticsRows.map(row => header.map(key => JSON.stringify(row[key] ?? '')))].map(row => row.join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'yr-music-analytics.csv'; link.click(); URL.revokeObjectURL(link.href); });
$('songForm').addEventListener('submit', async event => { event.preventDefault(); const validation = validateForm(); setFormErrors(validation.errors); if (validation.errors.length) return setStatus('Fix the highlighted song fields.', true); const id = $('songId').value; const existing = songs.find(song => song.id === id); const payload = songPayload({ values: readFormValues(), existing, legacyId: validation.legacyId }); const newPaths = []; try { setStatus('Saving song...'); const saved = id ? (await supabaseRest.update('songs', `?id=eq.${query(id)}`, payload, accessToken()))[0] : (await supabaseRest.insert('songs', payload, accessToken()))[0]; if (!saved?.id) throw new Error('Song was not returned by Supabase.'); for (const [inputId, bucket, column, label] of [['songAudio', 'yr-audio', 'audio_path', 'audio'], ['songArtwork', 'yr-artwork', 'artwork_path', 'artwork']]) { const file = $(inputId).files[0]; if (!file) continue; const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`; await uploadAsset(bucket, path, file, label); newPaths.push([bucket, path]); await supabaseRest.update('songs', `?id=eq.${query(saved.id)}`, { [column]: path }, accessToken()); const oldPath = saved[column]; if (oldPath && oldPath !== path) { try { await supabaseRest.removeObject(bucket, oldPath, accessToken()); } catch (error) { setStatus(`Song saved, but old ${label} cleanup failed: ${error.message}`, true); } } } await audit(id ? 'update_song' : 'create_song', saved.id, { publication_status: payload.publication_status }); clearForm(); await Promise.all([loadSongs(), loadAudit()]); setStatus('Song saved.'); } catch (error) { for (const [bucket, path] of newPaths) await supabaseRest.removeObject(bucket, path, accessToken()).catch(() => {}); if (!id) { const savedRows = await supabaseRest.select('songs', `?legacy_id=eq.${query(validation.legacyId)}&select=id`, accessToken()).catch(() => []); if (savedRows[0]?.id) await supabaseRest.remove('songs', `?id=eq.${query(savedRows[0].id)}`, accessToken()).catch(() => {}); } setStatus(error.message, true); } });

const requireOwner = async () => { session = supabaseAuth.session(); if (!session?.access_token) return false; const rows = await supabaseRest.select('owner_authorizations', `?select=user_id&user_id=eq.${query(session.user.id)}`, accessToken()); if (!rows.length) { await supabaseAuth.signOut(); throw new Error('This account is not authorized for the owner console.'); } return true; };
const boot = async () => { if (!await requireOwner()) return; loginPanel.classList.add('hidden'); adminPanel.classList.remove('hidden'); $('adminIdentity').textContent = session.user.email || 'Owner account'; setStatus('Loading owner data...'); try { await Promise.all([loadSongs(), loadAnalytics(), loadAudit()]); setStatus('Owner console ready.'); } catch (error) { setStatus(error.message, true); } };
if (supabaseConfigured) boot().catch(error => setStatus(error.message, true));
else setStatus('Supabase is not configured. Add the project URL and anon key before signing in.', true);
