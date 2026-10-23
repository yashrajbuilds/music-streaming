import { searchTracks } from './api.js';
import { matchesFilter } from './utils.js';
import { renderResults } from './ui.js';

export const createSearch = ({ input, results, status, openSearch, catalog = [], delay = 350, search = searchTracks }) => {
  let timer;
  let filter = 'All';
  let requestId = 0;
  let sourceCatalog = catalog;
  let lastQuery = '';

  const filtered = tracks => tracks.filter(track => matchesFilter(track, filter));
  const filterLabel = () => filter === 'All' ? 'catalog tracks' : `${filter} tracks`;
  const renderFiltered = () => {
    const tracks = filtered(sourceCatalog);
    status.textContent = `${tracks.length} ${filterLabel()}`;
    renderResults(tracks, results);
  };

  const executeSearch = async (query, currentRequest) => {
    try {
      const tracks = filtered(await search(query));
      if (currentRequest !== requestId) return;
      status.textContent = `${tracks.length} ${tracks.length === 1 ? 'result' : 'results'}`;
      renderResults(tracks, results);
    } catch {
      if (currentRequest !== requestId) return;
      status.textContent = 'Search unavailable';
      results.innerHTML = '<div class="empty-state"><strong>Music catalog unavailable</strong><span>Check the local server and try again.</span></div>';
    }
  };

  const scheduleSearch = (query, wait = delay) => {
    clearTimeout(timer);
    const currentRequest = ++requestId;
    if (!query) { renderFiltered(); return; }
    status.textContent = 'Searching...';
    results.innerHTML = '<div class="empty-state"><span>Searching the catalog...</span></div>';
    timer = setTimeout(() => executeSearch(query, currentRequest), wait);
  };

  const setCatalog = nextCatalog => {
    sourceCatalog = nextCatalog;
    if (lastQuery) scheduleSearch(lastQuery, 0);
    else renderFiltered();
  };
  const setFilter = nextFilter => {
    filter = nextFilter;
    scheduleSearch(input.value.trim());
  };

  input.addEventListener('input', event => {
    openSearch();
    lastQuery = event.target.value.trim();
    scheduleSearch(lastQuery);
  });

  return { setFilter, setCatalog, renderFiltered };
};