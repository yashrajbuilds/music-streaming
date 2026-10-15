import { supabaseConfigured, supabaseRest, supabaseAuth } from './supabase.js';

const storageKey = 'yr-listening-session-key';
const getSessionKey = () => {
  try {
    let key = localStorage.getItem(storageKey);
    if (!key) { key = `${crypto.randomUUID()}-${crypto.randomUUID()}`; localStorage.setItem(storageKey, key); }
    return key;
  } catch { return null; }
};
const deviceCategory = () => window.matchMedia('(max-width: 600px)').matches ? 'mobile' : window.matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop';

export const recordPlaybackEvent = async (track, eventType, details = {}) => {
  if (!supabaseConfigured || !track?.supabaseId) return;
  const sessionKey = getSessionKey();
  if (!sessionKey) return;
  try {
    await supabaseRest.rpc('ingest_listening_event', {
      p_session_key: sessionKey,
      p_client_event_id: crypto.randomUUID(),
      p_song_id: track.supabaseId,
      p_event_type: eventType,
      p_position_seconds: Number.isFinite(details.positionSeconds) ? Math.round(details.positionSeconds) : null,
      p_listening_seconds: Number.isFinite(details.listeningSeconds) ? Math.round(details.listeningSeconds) : null,
      p_device_category: deviceCategory()
    }, supabaseAuth.session()?.access_token);
  } catch {
    // Telemetry must never interrupt playback or expose event errors to listeners.
  }
};
