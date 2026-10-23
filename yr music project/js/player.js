import { state, setRecent } from './state.js';
import { storage, rememberTrack } from './storage.js';
import { artwork, artistName, showToast } from './ui.js';
import { formatTime, isPlayable } from './utils.js';
import { recordPlaybackEvent } from './analytics.js';

export const createPlayer = elements => {
  const audio = elements.audio;
  audio.volume = storage.volume;
  if (elements.volumeInput) elements.volumeInput.value = String(audio.volume);
  let hasStartedCurrent = false;
  let isSeeking = false;

  const setQueue = (tracks, index = 0) => {
    state.queue = (tracks || []).filter(Boolean);
    state.queueIndex = state.queue.length ? Math.min(Math.max(index, 0), state.queue.length - 1) : -1;
    return state.queue.length;
  };

  const syncTrack = track => {
    state.current = track;
    elements.nowArtwork.innerHTML = artwork(track);
    elements.nowTitle.textContent = track.title;
    elements.nowArtist.textContent = artistName(track);
    const liked = state.liked.some(item => item.id === track.id);
    elements.likeButton.textContent = liked ? '♥' : '♡';
    elements.likeButton.classList.toggle('selected', liked);
    elements.likeButton.setAttribute('aria-pressed', String(liked));
  };

  const resetProgress = () => {
    elements.currentTime.textContent = '0:00';
    elements.duration.textContent = '0:00';
    elements.seekInput.value = '0';
  };

  const setCurrent = (track, autoplay = true) => {
    if (!track) return false;
    audio.pause();
    syncTrack(track);
    hasStartedCurrent = false;
    const source = track.audioUrl || track.previewUrl;
    if (!source) {
      audio.removeAttribute('src');
      audio.load();
      elements.playButton.textContent = '▶';
      elements.playButton.setAttribute('aria-label', 'Play');
      resetProgress();
      if (autoplay) showToast('This track has metadata only and no verified audio.');
      return false;
    }
    audio.src = source;
    audio.load();
    resetProgress();
    if (autoplay) play(true);
    return true;
  };

  const play = (retryAfterLoad = false) => {
    if (!state.current) return showToast('Choose a track to start listening.');
    if (!isPlayable(state.current)) return showToast('This track has metadata only and no verified audio.');
    audio.play().catch(() => {
      if (retryAfterLoad && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        const retry = () => { audio.removeEventListener('canplay', retry); audio.play().catch(() => showToast('This track could not be played.')); };
        audio.addEventListener('canplay', retry, { once: true });
        return;
      }
      showToast('This track could not be played.');
    });
  };

  // Skips metadata-only entries so "next" never silently stops playback.
  const findPlayableIndex = step => {
    const length = state.queue.length;
    if (!length) return -1;
    let index = state.queueIndex >= 0 ? state.queueIndex : (step > 0 ? -1 : 0);
    for (let visited = 0; visited < length; visited += 1) {
      index = (index + step + length) % length;
      if (isPlayable(state.queue[index])) return index;
    }
    return -1;
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    elements.playButton.textContent = '▶';
    resetProgress();
  };

  const next = (fromEnded = false) => {
    if (!state.queue.length) return showToast('Your queue is empty.');
    const atEnd = state.queueIndex >= state.queue.length - 1;
    if (fromEnded && !state.shuffle && atEnd && state.repeat === 0) return stop();
    recordPlaybackEvent(state.current, fromEnded ? 'automatic_next' : 'manual_skip', { positionSeconds: audio.currentTime });

    let nextIndex = -1;
    if (state.shuffle) {
      const candidates = state.queue.map((track, index) => isPlayable(track) && index !== state.queueIndex ? index : -1).filter(index => index >= 0);
      if (candidates.length) nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
      else if (state.queue.length === 1) nextIndex = state.queueIndex;
    }
    if (nextIndex < 0) nextIndex = findPlayableIndex(1);
    if (nextIndex < 0) {
      if (fromEnded) stop();
      else showToast('No playable tracks in this queue.');
      return false;
    }
    state.queueIndex = nextIndex;
    return setCurrent(state.queue[nextIndex]);
  };

  const previous = () => {
    if (!state.current || !state.queue.length) return showToast('Your queue is empty.');
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const previousIndex = findPlayableIndex(-1);
    if (previousIndex < 0) return showToast('No playable tracks in this queue.');
    state.queueIndex = previousIndex;
    setCurrent(state.queue[previousIndex]);
  };

  const syncToggle = (button, active, label) => {
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
  };

  elements.playButton.addEventListener('click', () => {
    if (!state.current) return showToast('Choose a track to start listening.');
    if (audio.paused) play();
    else audio.pause();
  });
  elements.nextButton.addEventListener('click', () => next());
  elements.previousButton.addEventListener('click', previous);
  elements.shuffleButton.addEventListener('click', () => {
    state.shuffle = !state.shuffle;
    syncToggle(elements.shuffleButton, state.shuffle, state.shuffle ? 'Shuffle on' : 'Shuffle off');
    showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  });
  elements.repeatButton.addEventListener('click', () => {
    state.repeat = (state.repeat + 1) % 3;
    elements.repeatButton.textContent = state.repeat === 2 ? '↻1' : '↻';
    syncToggle(elements.repeatButton, state.repeat > 0, ['Repeat off', 'Repeat all', 'Repeat one'][state.repeat]);
    showToast(['Repeat off', 'Repeat all', 'Repeat one'][state.repeat]);
  });
  elements.seekInput.addEventListener('input', event => {
    isSeeking = true;
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 100 * audio.duration;
  });
  elements.seekInput.addEventListener('change', () => { isSeeking = false; });
  elements.seekInput.addEventListener('blur', () => { isSeeking = false; });
  elements.volumeInput.addEventListener('input', event => {
    audio.volume = Number(event.target.value);
    storage.volume = audio.volume;
  });
  elements.muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted;
    elements.muteButton.textContent = audio.muted ? '◼' : '◖';
    elements.muteButton.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
    elements.muteButton.setAttribute('aria-pressed', String(audio.muted));
  });
  audio.addEventListener('timeupdate', () => {
    elements.currentTime.textContent = formatTime(audio.currentTime);
    if (!isSeeking) elements.seekInput.value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
  });
  audio.addEventListener('loadedmetadata', () => {
    elements.duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('play', () => {
    elements.playButton.textContent = 'Ⅱ';
    elements.playButton.setAttribute('aria-label', 'Pause');
    setRecent(rememberTrack(state.current));
    document.dispatchEvent(new CustomEvent('recentchange'));
    recordPlaybackEvent(state.current, hasStartedCurrent ? 'resume' : 'playback_start', { positionSeconds: audio.currentTime });
    hasStartedCurrent = true;
  });
  audio.addEventListener('pause', () => {
    elements.playButton.textContent = '▶';
    elements.playButton.setAttribute('aria-label', 'Play');
    if (!audio.ended) recordPlaybackEvent(state.current, 'pause', { positionSeconds: audio.currentTime });
  });
  audio.addEventListener('ended', () => {
    recordPlaybackEvent(state.current, 'complete', { positionSeconds: audio.currentTime, listeningSeconds: audio.duration });
    if (state.repeat === 2) setCurrent(state.current);
    else next(true);
  });

  return { setCurrent, setQueue, next, previous };
};