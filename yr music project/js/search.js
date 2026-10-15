import { searchTracks } from './api.js';
import { state } from './state.js';
import { renderResults } from './ui.js';

const matchesFilter = (track, filter) => filter === 'All' || (filter === 'Trending' ? track.catalogRank < 10 : track.language === filter);

export const createSearch = ({ input, results, status, openSearch, catalog = [] }) => {
  let timer;
  let filter = 'All';
  let requestId = 0;
  let sourceCatalog = catalog;

  const renderFiltered = () => renderResults(sourceCatalog.filter(track => matchesFilter(track, filter)), results);
  const setCatalog = nextCatalog => { sourceCatalog = nextCatalog; if (!input.value.trim()) renderFiltered(); };
  const setFilter = nextFilter => { filter = nextFilter; status.textContent = filter === 'All' ? `${sourceCatalog.length} catalog tracks` : filter; if (!input.value.trim()) renderFiltered(); };

  input.addEventListener('input', event => {
    clearTimeout(timer);
    const currentRequest = ++requestId;
    openSearch();
    const query = event.target.value.trim();
    if (!query) { status.textContent = ''; renderFiltered(); return; }
    status.textContent = 'Searching...';
    results.innerHTML = '<div class="empty-state"><span>Searching the catalog...</span></div>';
    timer = setTimeout(async () => {
      try {
        const tracks = (await searchTracks(query)).filter(track => matchesFilter(track, filter));
        if (currentRequest !== requestId) return;
        state.tracks = [...state.tracks.filter(track => track.source === 'local'), ...tracks.filter(track => track.source !== 'local')];
        status.textContent = `${tracks.length} results`;
        renderResults(tracks, results);
      } catch {
        if (currentRequest !== requestId) return;
        status.textContent = 'Search unavailable';
        results.innerHTML = '<div class="empty-state"><strong>Music catalog unavailable</strong><span>Check the local server and try again.</span></div>';
      }
    }, 350);
  });

  return { setFilter, setCatalog, renderFiltered };
};
