import { state, setRecent } from './state.js';
import { storage, rememberTrack } from './storage.js';
import { artwork, artistName, showToast } from './ui.js';
import { recordPlaybackEvent } from './analytics.js';

const formatTime = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';

export const createPlayer = elements => {
  const audio = elements.audio;
  audio.volume = storage.volume;
  let hasStartedCurrent = false;

  const syncTrack = track => {
    if (!track) return;
    state.current = track;
    elements.nowArtwork.innerHTML = artwork(track);
    elements.nowTitle.textContent = track.title;
    elements.nowArtist.textContent = artistName(track);
    const liked = state.liked.some(item => item.id === track.id);
    elements.likeButton.textContent = liked ? '♥' : '♡';
    elements.likeButton.classList.toggle('selected', liked);
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
      if (autoplay) showToast('This track has metadata only and no verified audio.');
      return false;
    }
    audio.src = source;
    audio.load();
    if (autoplay) play(true);
    return true;
  };

  const play = (retryAfterLoad = false) => {
    if (!state.current) return showToast('Choose a track to start listening.');
    if (!state.current.audioUrl && !state.current.previewUrl) return showToast('This track has metadata only and no verified audio.');
    audio.play().catch(() => {
      if (retryAfterLoad && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        const retry = () => { audio.removeEventListener('canplay', retry); audio.play().catch(() => showToast('This track could not be played.')); };
        audio.addEventListener('canplay', retry, { once: true });
        return;
      }
      showToast('This track could not be played.');
    });
  };

  const chooseNextIndex = () => {
    if (!state.queue.length) return -1;
    if (state.shuffle && state.queue.length > 1) {
      let nextIndex = state.queueIndex;
      while (nextIndex === state.queueIndex) nextIndex = Math.floor(Math.random() * state.queue.length);
      return nextIndex;
    }
    return state.queueIndex + 1;
  };

  const next = (fromEnded = false) => {
    if (!state.queue.length) return showToast('Your queue is empty.');
    const nextIndex = chooseNextIndex();
    if (nextIndex >= state.queue.length) {
      if (fromEnded && state.repeat === 0) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      state.queueIndex = 0;
    } else {
      state.queueIndex = nextIndex;
    }
    setCurrent(state.queue[state.queueIndex]);
  };

  const previous = () => {
    if (!state.current || !state.queue.length) return showToast('Your queue is empty.');
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    state.queueIndex = state.queueIndex > 0 ? state.queueIndex - 1 : state.queue.length - 1;
    setCurrent(state.queue[state.queueIndex]);
  };

  elements.playButton.addEventListener('click', () => state.current ? (audio.paused ? play() : audio.pause()) : showToast('Choose a track to start listening.'));
  elements.nextButton.addEventListener('click', () => { recordPlaybackEvent(state.current, 'manual_skip', { positionSeconds: audio.currentTime }); next(); });
  elements.previousButton.addEventListener('click', previous);
  elements.shuffleButton.addEventListener('click', () => { state.shuffle = !state.shuffle; elements.shuffleButton.classList.toggle('selected', state.shuffle); });
  elements.repeatButton.addEventListener('click', () => { state.repeat = (state.repeat + 1) % 3; elements.repeatButton.textContent = state.repeat === 2 ? '↻1' : '↻'; elements.repeatButton.classList.toggle('selected', state.repeat > 0); showToast(['Repeat off', 'Repeat all', 'Repeat one'][state.repeat]); });
  elements.seekInput.addEventListener('input', event => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 100 * audio.duration; });
  elements.volumeInput.addEventListener('input', event => { audio.volume = Number(event.target.value); storage.volume = audio.volume; });
  elements.muteButton.addEventListener('click', () => { audio.muted = !audio.muted; elements.muteButton.textContent = audio.muted ? '◼' : '◖'; elements.muteButton.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute'); });
  audio.addEventListener('timeupdate', () => { elements.currentTime.textContent = formatTime(audio.currentTime); elements.seekInput.value = Number.isFinite(audio.duration) ? audio.currentTime / audio.duration * 100 : 0; });
  audio.addEventListener('loadedmetadata', () => { elements.duration.textContent = formatTime(audio.duration); });
  audio.addEventListener('play', () => { elements.playButton.textContent = 'Ⅱ'; const recent = rememberTrack(state.current); setRecent(recent); document.dispatchEvent(new CustomEvent('recentchange')); recordPlaybackEvent(state.current, hasStartedCurrent ? 'resume' : 'playback_start', { positionSeconds: audio.currentTime }); hasStartedCurrent = true; });
  audio.addEventListener('pause', () => { elements.playButton.textContent = '▶'; if (!audio.ended) recordPlaybackEvent(state.current, 'pause', { positionSeconds: audio.currentTime }); });
  audio.addEventListener('ended', () => { recordPlaybackEvent(state.current, 'complete', { positionSeconds: audio.currentTime, listeningSeconds: audio.duration }); state.repeat === 2 ? setCurrent(state.current) : next(true); });

  return { setCurrent, next, previous };
};
