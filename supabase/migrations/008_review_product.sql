-- Lets a review say what the customer bought (e.g. "Key rings"), shown as a bold
-- line on the review card, matching the reference slideshow design.
alter table reviews add column if not exists product text;
