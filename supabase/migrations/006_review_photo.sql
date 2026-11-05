-- Lets a review carry a separate customer-submitted photo (e.g. a photo of the
-- product they received) in addition to the small round avatar next to their name.
-- Only needed if you already ran schema.sql before this update.
alter table reviews add column if not exists photo_url text;
