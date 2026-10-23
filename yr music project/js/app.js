import { getCatalogTracks, getTrendingTracks, getHindiTracks, getHaryanviTracks, getPunjabiTracks } from './api.js';
import { state, isLiked, setLiked, savePlaylists } from './state.js';
import { createPlayer } from './player.js';
import { createSearch } from './search.js';
import { renderCatalogHome, renderLiked, renderPlaylists, renderResults, showToast } from './ui.js';
import { isPlayable, uniqueById } from './utils.js';

const $ = id => document.getElementById(id);
const elements = {
    trendingTracks: $('trendingTracks'), hindiTracks: $('hindiTracks'), haryanviTracks: $('haryanviTracks'), punjabiTracks: $('punjabiTracks'), recentTracks: $('recentTracks'), likedTracks: $('likedTracks'), popularArtists: $('popularArtists'), discoverTracks: $('discoverTracks'), playlistForm: $('playlistForm'), playlistName: $('playlistName'), playlistList: $('playlistList'), homeView: $('homeView'), searchView: $('searchView'), discoverView: $('discoverView'), playlistsView: $('playlistsView'), searchInput: $('searchInput'), searchResults: $('searchResults'), searchStatus: $('searchStatus'), searchEyebrow: $('searchEyebrow'), searchTitle: $('searchTitle'), filterRow: $('filterRow'), audio: $('audioElement'), nowArtwork: $('nowArtwork'), nowTitle: $('nowTitle'), nowArtist: $('nowArtist'), playButton: $('playButton'), nextButton: $('nextButton'), previousButton: $('previousButton'), shuffleButton: $('shuffleButton'), repeatButton: $('repeatButton'), seekInput: $('seekInput'), volumeInput: $('volumeInput'), muteButton: $('muteButton'), currentTime: $('currentTime'), duration: $('duration'), likeButton: $('likeButton'), exploreButton: $('exploreButton')
};
const player = createPlayer(elements);
const sections = { catalog: [], trending: [], hindi: [], haryanvi: [], punjabi: [], recent: state.recent, liked: state.liked };
const viewCopy = {
    search: ['Catalog search', 'Search results'],
    liked: ['Your library', 'Liked songs'],
    recent: ['Your history', 'Recently played']
};

const openView = view => {
    state.view = view;
    elements.homeView.classList.toggle('hidden', view !== 'home');
    elements.searchView.classList.toggle('hidden', !viewCopy[view]);
    elements.discoverView.classList.toggle('hidden', view !== 'discover');
    elements.playlistsView.classList.toggle('hidden', view !== 'playlists');
    document.querySelectorAll('[data-view]').forEach(button => {
        const active = button.dataset.view === view;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });

    const [eyebrow, title] = viewCopy[view] || ['Catalog search', 'Search results'];
    elements.searchEyebrow.textContent = eyebrow;
    elements.searchTitle.textContent = title;
    elements.filterRow.classList.toggle('hidden', view !== 'search');

    if (view === 'liked') { renderLiked(state.liked, elements.searchResults); elements.searchStatus.textContent = `${state.liked.length} liked`; }
    if (view === 'recent') { renderLiked(state.recent, elements.searchResults); elements.searchStatus.textContent = `${state.recent.length} recent`; }
    if (view === 'search') {
        if (elements.searchInput.value.trim()) elements.searchInput.dispatchEvent(new Event('input'));
        else search.renderFiltered();
    }
    if (view === 'discover') renderResults(sections.catalog, elements.discoverTracks);
    if (view === 'playlists') refreshPlaylists();
};

const findTrack = id => sections.catalog.find(track => track.id === id) || state.liked.find(track => track.id === id) || state.recent.find(track => track.id === id);
const refreshHome = () => { sections.recent = state.recent; sections.liked = state.liked; renderCatalogHome(sections, elements); };
const refreshPlaylists = () => {
    renderPlaylists(state.playlists, sections.catalog, elements.playlistList);
    const count = $('playlistCount');
    if (count) count.textContent = `${state.playlists.length} ${state.playlists.length === 1 ? 'playlist' : 'playlists'}`;
};
const playQueue = (tracks, index = 0) => {
    if (!tracks.length) return showToast('There are no tracks to play.');
    player.setQueue(tracks, index);
    if (isPlayable(tracks[index])) player.setCurrent(tracks[index]);
    else {
        player.setCurrent(tracks[index], false);
        showToast('This track has metadata only and no verified audio.');
    }
};
const startTrack = track => {
    if (!track) return showToast('That track is no longer in the catalog.');
    playQueue([track, ...sections.catalog.filter(item => item.id !== track.id)]);
};
const playlistTracks = playlist => playlist.trackIds.map(findTrack).filter(Boolean);
const playlistId = () => `playlist-${globalThis.crypto?.randomUUID?.() || Date.now()}`;

const search = createSearch({ input: elements.searchInput, results: elements.searchResults, status: elements.searchStatus, openSearch: () => openView('search') });

document.addEventListener('click', event => {
    const playButton = event.target.closest('[data-play]');
    if (playButton && !playButton.disabled) startTrack(findTrack(playButton.dataset.play));
    const likeButton = event.target.closest('[data-like]');
    if (likeButton) {
        const track = findTrack(likeButton.dataset.like);
        if (track) {
            setLiked(track);
            refreshHome();
            if (state.view === 'liked') renderLiked(state.liked, elements.searchResults);
            showToast(isLiked(track) ? 'Added to Liked Songs' : 'Removed from Liked Songs');
        }
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
        document.querySelectorAll('.filter-button').forEach(button => button.classList.toggle('active', button === filterButton));
        openView('search');
        search.setFilter(filterButton.dataset.filter);
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) openView(viewButton.dataset.view);
    const playlistPlay = event.target.closest('[data-playlist-play]');
    if (playlistPlay && !playlistPlay.disabled) {
        const playlist = state.playlists.find(item => item.id === playlistPlay.dataset.playlistPlay);
        const tracks = playlist ? playlistTracks(playlist) : [];
        const index = tracks.findIndex(isPlayable);
        if (index < 0) showToast('Add verified audio before playing this playlist.');
        else playQueue(tracks, index);
    }
    const addButton = event.target.closest('[data-playlist-add]');
    if (addButton) {
        const playlist = state.playlists.find(item => item.id === addButton.dataset.playlistAdd);
        if (playlist) {
            const select = document.querySelector(`[data-playlist-select="${CSS.escape(playlist.id)}"]`);
            if (select?.value) {
                if (!playlist.trackIds.includes(select.value)) playlist.trackIds.push(select.value);
                savePlaylists();
                refreshPlaylists();
                showToast('Track added to playlist.');
            }
        }
    }
    const removeButton = event.target.closest('[data-playlist-remove]');
    if (removeButton) {
        const playlist = state.playlists.find(item => item.id === removeButton.dataset.playlistRemove);
        if (playlist) {
            playlist.trackIds = playlist.trackIds.filter(id => id !== removeButton.dataset.trackId);
            savePlaylists();
            refreshPlaylists();
        }
    }
    const renameButton = event.target.closest('[data-playlist-rename]');
    if (renameButton) {
        const playlist = state.playlists.find(item => item.id === renameButton.dataset.playlistRename);
        const name = window.prompt('Rename playlist', playlist?.name || '');
        if (playlist && name?.trim()) { playlist.name = name.trim(); savePlaylists(); refreshPlaylists(); }
    }
    const deleteButton = event.target.closest('[data-playlist-delete]');
    if (deleteButton) {
        const playlist = state.playlists.find(item => item.id === deleteButton.dataset.playlistDelete);
        if (!playlist || !window.confirm(`Delete the playlist "${playlist.name}"?`)) return;
        state.playlists = state.playlists.filter(item => item.id !== deleteButton.dataset.playlistDelete);
        savePlaylists();
        refreshPlaylists();
    }
});

elements.likeButton.addEventListener('click', () => {
    if (!state.current) return showToast('Choose a track to like.');
    setLiked(state.current);
    const liked = isLiked(state.current);
    elements.likeButton.textContent = liked ? '♥' : '♡';
    elements.likeButton.classList.toggle('selected', liked);
    elements.likeButton.setAttribute('aria-pressed', String(liked));
    refreshHome();
    showToast(liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
});
elements.exploreButton?.addEventListener('click', () => { openView('search'); elements.searchInput.focus(); });
elements.playlistForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = elements.playlistName.value.trim();
    if (!name) return showToast('Give your playlist a name first.');
    if (state.playlists.some(playlist => playlist.name.toLowerCase() === name.toLowerCase())) return showToast('A playlist with that name already exists.');
    state.playlists.push({ id: playlistId(), name, trackIds: [] });
    savePlaylists();
    elements.playlistName.value = '';
    refreshPlaylists();
    showToast('Playlist created.');
});
document.addEventListener('recentchange', () => {
    refreshHome();
    if (state.view === 'recent') renderLiked(state.recent, elements.searchResults);
});

const initialize = async () => {
    try {
        sections.catalog = uniqueById(await getCatalogTracks());
        state.tracks = [...sections.catalog];
        const freshTrack = track => sections.catalog.find(item => item.id === track.id) || track;
        state.liked = state.liked.map(freshTrack);
        state.recent = state.recent.map(freshTrack);
        search.setCatalog(sections.catalog);
        [sections.trending, sections.hindi, sections.haryanvi, sections.punjabi] = await Promise.all([getTrendingTracks(), getHindiTracks(), getHaryanviTracks(), getPunjabiTracks()]);
        refreshHome();
        refreshPlaylists();
        if (state.view === 'discover') renderResults(sections.catalog, elements.discoverTracks);
    } catch {
        elements.searchResults.innerHTML = '<div class="empty-state"><strong>Catalog unavailable</strong><span>Start the local server and reload to try again.</span></div>';
        elements.discoverTracks.innerHTML = '<div class="empty-state"><strong>Catalog unavailable</strong><span>No tracks can be loaded right now.</span></div>';
        showToast('Music catalog unavailable.');
    }
};

const hour = new Date().getHours();
$('greeting').textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Good night';
refreshHome();
refreshPlaylists();
initialize();
document.addEventListener('keydown', event => {
    if (event.repeat || event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    if (event.code === 'Space') { event.preventDefault(); elements.playButton.click(); }
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); elements.muteButton.click(); }
    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && elements.audio.src) {
        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 5 : -5;
        elements.audio.currentTime = Math.max(0, elements.audio.currentTime + delta);
    }
});