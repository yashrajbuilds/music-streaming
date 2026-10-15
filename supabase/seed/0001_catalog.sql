-- Generated from yr music project/data/songs.json.
-- Idempotent by legacy_id. Does not modify songs.json or copy/delete audio files.
-- Local audio remains referenced by its existing relative URL until uploaded to Supabase Storage.

insert into public.songs (legacy_id, title, artist, album, language, genre, duration_seconds, artwork_path, audio_path, local_audio_reference, source, publication_status, catalog_rank, metadata)
values
('local-jai-shree-ram', 'Jai Shree Ram', 'Hansraj Raghuwanshi', 'YR local library', 'Hindi', 'Devotional', null, null, null, './Jai%20Shree%20Ram.mp3', 'local', 'published', '1', '{"popularity":0,"original_source":"local"}'::jsonb),
('local-ram-aayenge', 'Ram Aayenge To Angana Sajaungi', 'Urvashi Kiran Sharma', 'YR local library', 'Hindi', 'Devotional', null, null, null, './Ram%20Aayenge%20to%20Angana%20Sajaungi%20(Female%20Version).mp3', 'local', 'published', '2', '{"popularity":0,"original_source":"local"}'::jsonb),
('hindi-arijit-chaleya', 'Chaleya', 'Arijit Singh, Shilpa Rao', 'Jawan', 'Hindi', 'Bollywood', '200', null, null, null, 'supabase', 'draft', '10', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('hindi-arijit-tum-hi-ho', 'Tum Hi Ho', 'Arijit Singh', 'Aashiqui 2', 'Hindi', 'Bollywood', '262', null, null, null, 'supabase', 'draft', '11', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('hindi-shreya-param-sundari', 'Param Sundari', 'Shreya Ghoshal', 'Mimi', 'Hindi', 'Bollywood', '171', null, null, null, 'supabase', 'draft', '12', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('haryanvi-52-gaj-ka-daman', '52 Gaj Ka Daman', 'Renuka Panwar', 'Haryanvi Hits', 'Haryanvi', 'Haryanvi Pop', '164', null, null, null, 'supabase', 'draft', '20', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('haryanvi-gajban', 'Gajban', 'Vishvajeet Chaudhary', 'Haryanvi Hits', 'Haryanvi', 'Haryanvi Pop', '190', null, null, null, 'supabase', 'draft', '21', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('haryanvi-designer', 'Desi Desi Na Bolya Kar Chhori Re', 'Raju Punjabi', 'Haryanvi Hits', 'Haryanvi', 'Haryanvi Pop', '218', null, null, null, 'supabase', 'draft', '22', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('punjabi-excuses', 'Excuses', 'AP Dhillon, Gurinder Gill', 'Punjabi Hits', 'Punjabi', 'Punjabi Pop', '176', null, null, null, 'supabase', 'draft', '30', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('punjabi-lehanga', 'Lehanga', 'Jass Manak', 'Punjabi Hits', 'Punjabi', 'Punjabi Pop', '196', null, null, null, 'supabase', 'draft', '31', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('punjabi-born-to-shine', 'Born To Shine', 'Diljit Dosanjh', 'Punjabi Hits', 'Punjabi', 'Punjabi Pop', '185', null, null, null, 'supabase', 'draft', '32', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('trending-tauba-tauba', 'Tauba Tauba', 'Karan Aujla', 'Indian Trending', 'Punjabi', 'Indian Pop', '190', null, null, null, 'supabase', 'draft', '3', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('trending-aaj-ki-raat', 'Aaj Ki Raat', 'Madhubanti Bagchi, Divya Kumar', 'Indian Trending', 'Hindi', 'Bollywood', '196', null, null, null, 'supabase', 'draft', '4', '{"popularity":0,"original_source":"catalog"}'::jsonb),
('trending-apa-fer-milange', 'Apa Fer Milange', 'Sidhumoose Wala', 'Indian Trending', 'Punjabi', 'Punjabi Pop', '220', null, null, null, 'supabase', 'draft', '5', '{"popularity":0,"original_source":"catalog"}'::jsonb)
on conflict (legacy_id) do update set
  title = excluded.title, artist = excluded.artist, album = excluded.album, language = excluded.language, genre = excluded.genre, duration_seconds = excluded.duration_seconds, artwork_path = excluded.artwork_path, local_audio_reference = coalesce(public.songs.local_audio_reference, excluded.local_audio_reference), source = excluded.source, catalog_rank = excluded.catalog_rank, metadata = excluded.metadata, updated_at = timezone('utc', now());
