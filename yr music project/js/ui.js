import { isLiked } from './state.js';
import { escapeHtml, isPlayable } from './utils.js';

export const artistName = track => track?.artist?.name || 'Unknown artist';
export const albumName = track => track?.album?.name || 'Unknown album';

export const artwork = track => track?.album?.artwork
  ? `<img loading="lazy" src="${escapeHtml(track.album.artwork)}" alt="${escapeHtml(track.title)} artwork">`
  : '<span>YR</span>';

const availability = track => isPlayable(track) ? 'Verified audio' : 'Metadata only';
const playLabel = track => isPlayable(track) ? `Play ${escapeHtml(track.title)}` : `${escapeHtml(track.title)} is unavailable`;

const trackCard = track => `<article class="track-card"><div class="artwork">${artwork(track)}<button class="play-overlay" data-play="${escapeHtml(track.id)}" aria-label="${playLabel(track)}" ${isPlayable(track) ? '' : 'disabled'}>${isPlayable(track) ? '▶' : '—'}</button></div><strong class="track-title">${escapeHtml(track.title)}</strong><span class="track-artist">${escapeHtml(artistName(track))}</span><span class="track-language">${escapeHtml(track.language)} · ${escapeHtml(track.genre)}</span><span class="track-availability">${availability(track)}</span><button class="card-like ${isLiked(track) ? 'selected' : ''}" data-like="${escapeHtml(track.id)}" aria-label="${isLiked(track) ? 'Unlike' : 'Like'} ${escapeHtml(track.title)}">${isLiked(track) ? '♥' : '♡'}</button></article>`;

const section = (tracks, emptyMessage) => tracks.length
  ? tracks.map(trackCard).join('')
  : `<div class="empty-state"><strong>${escapeHtml(emptyMessage)}</strong><span>Try another view.</span></div>`;

export const renderCatalogHome = (sections, elements) => {
  elements.trendingTracks.innerHTML = section(sections.trending, 'No editorially ordered tracks yet.');
  elements.hindiTracks.innerHTML = section(sections.hindi, 'No Hindi songs found.');
  elements.haryanviTracks.innerHTML = section(sections.haryanvi, 'No Haryanvi songs found.');
  elements.punjabiTracks.innerHTML = section(sections.punjabi, 'No Punjabi songs found.');
  elements.recentTracks.innerHTML = section(sections.recent, 'No recently played songs yet.');
  elements.likedTracks.innerHTML = section(sections.liked, 'No liked songs yet.');
  const artists = [...new Map(sections.catalog.map(track => [track.artist?.id, track.artist]).filter(([id, artist]) => id && artist?.name)).values()].slice(0, 6);
  elements.popularArtists.innerHTML = artists.map(artist => `<div class="artist-chip"><span>${escapeHtml(artist.name.slice(0, 2).toUpperCase())}</span><strong>${escapeHtml(artist.name)}</strong></div>`).join('')
    || '<div class="empty-state"><strong>No artists yet.</strong><span>Tracks will appear here once the catalog loads.</span></div>';
};

export const renderResults = (tracks, container) => {
  container.innerHTML = tracks.length
    ? tracks.map(track => `<div class="result-row"><div class="artwork">${artwork(track)}</div><div class="result-copy"><strong>${escapeHtml(track.title)}</strong><div class="track-artist">${escapeHtml(artistName(track))} · ${escapeHtml(albumName(track))}</div><div class="track-language">${escapeHtml(track.language)} · ${escapeHtml(track.genre)}</div><div class="track-availability">${availability(track)}</div></div><button class="row-play" data-play="${escapeHtml(track.id)}" aria-label="${playLabel(track)}" ${isPlayable(track) ? '' : 'disabled'}>${isPlayable(track) ? '▶' : '—'}</button></div>`).join('')
    : '<div class="empty-state"><strong>No music found</strong><span>Try another song, artist, album, language, or genre.</span></div>';
};

export const renderLiked = (tracks, container) => renderResults(tracks, container);

export const renderPlaylists = (playlists, catalog, container) => {
  container.innerHTML = playlists.length ? playlists.map(playlist => {
    const tracks = playlist.trackIds.map(id => catalog.find(track => track.id === id)).filter(Boolean);
    const firstPlayable = tracks.find(isPlayable);
    const available = catalog.filter(track => !playlist.trackIds.includes(track.id));
    const options = available.length
      ? available.map(track => `<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)}</option>`).join('')
      : '<option value="" disabled>No tracks left to add</option>';
    return `<article class="playlist-card"><div class="playlist-card-heading"><div><span class="eyebrow">Playlist</span><h3>${escapeHtml(playlist.name)}</h3><span class="playlist-meta">${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} · ${tracks.filter(isPlayable).length} playable</span></div><div class="playlist-card-actions"><button class="text-button" data-playlist-play="${escapeHtml(playlist.id)}" ${firstPlayable ? '' : 'disabled'}>▶ Play</button><button class="text-button" data-playlist-rename="${escapeHtml(playlist.id)}">Rename</button><button class="text-button danger-action" data-playlist-delete="${escapeHtml(playlist.id)}">Delete</button></div></div><div class="playlist-actions"><select data-playlist-select="${escapeHtml(playlist.id)}" aria-label="Choose track for ${escapeHtml(playlist.name)}" ${available.length ? '' : 'disabled'}><option value="">Add a track...</option>${options}</select><button class="text-button add-track-button" data-playlist-add="${escapeHtml(playlist.id)}" ${available.length ? '' : 'disabled'}>+ Add track</button></div>${tracks.length ? `<div class="playlist-tracks">${tracks.map(track => `<div class="result-row"><div class="result-copy"><strong>${escapeHtml(track.title)}</strong><div class="track-artist">${escapeHtml(artistName(track))}</div><div class="track-availability">${availability(track)}</div></div><button class="row-play" data-play="${escapeHtml(track.id)}" aria-label="${playLabel(track)}" ${isPlayable(track) ? '' : 'disabled'}>${isPlayable(track) ? '▶' : '—'}</button><button class="text-button" data-playlist-remove="${escapeHtml(playlist.id)}" data-track-id="${escapeHtml(track.id)}">Remove</button></div>`).join('')}</div>` : '<div class="playlist-empty"><strong>This playlist is ready for its first track.</strong><span>Choose a song above to start building it.</span></div>'}</article>`;
  }).join('') : '<div class="library-empty"><div class="empty-artwork">▦</div><strong>Your library is waiting.</strong><span>Create a playlist for commutes, quiet hours, or whatever comes next.</span></div>';
};

export const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
};