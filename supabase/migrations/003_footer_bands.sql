-- Footer colour bands + a pale logo for dark backgrounds.
-- Only needed if you already ran seed.sql before this update.
update content_blocks
set data = data
  || '{"band1_bg":"#E8912F","band1_text":"#0B2231","band2_bg":"#08151F","band3_bg":"#0B2231"}'::jsonb
where key = 'footer'
  and not (data ? 'band1_bg');

update content_blocks
set data = data || '{"logo_light_url":""}'::jsonb
where key = 'site' and not (data ? 'logo_light_url');
