-- Lets each product category use a looping video instead of (or with) its cover photo.
-- Only needed if you already ran schema.sql before this update.
alter table categories add column if not exists cover_video_url text;
