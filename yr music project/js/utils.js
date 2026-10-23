// Small dependency-free helpers shared by the UI, player, search, and admin code.
// Keeping them here makes the behaviour testable without a browser.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const formatTime = seconds => Number.isFinite(seconds) && seconds >= 0
  ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  : '0:00';

export const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);

export const isPlayable = track => Boolean(track?.audioUrl || track?.previewUrl);

// A "Trending" filter is an editorial rank, every other filter matches the language.
export const matchesFilter = (track, filter) => !filter || filter === 'All'
  || (filter === 'Trending' ? Number(track.catalogRank) < 10 : track.language === filter);

export const uniqueById = tracks => [...new Map((tracks || []).filter(Boolean).map(track => [track.id, track])).values()];