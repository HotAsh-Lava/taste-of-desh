-- [Q-12] Puts the "Our other websites" bar on the home page, right under the hero video.
-- Only needed because the home page layout is saved in Supabase (page_sections); it moves
-- the blocks after the hero down one place and adds the bar. Safe to run more than once:
-- if the bar is already on the home page, nothing changes.
do $$
declare
  hero_pos int;
begin
  if exists (select 1 from page_sections where page_slug = 'home')
     and not exists (select 1 from page_sections where page_slug = 'home' and section_key = 'partner_sites') then
    select coalesce(min(sort_order), 0) into hero_pos
      from page_sections where page_slug = 'home' and section_key = 'hero';
    update page_sections set sort_order = sort_order + 1
      where page_slug = 'home' and sort_order > hero_pos;
    insert into page_sections (page_slug, section_key, sort_order, is_visible)
      values ('home', 'partner_sites', hero_pos + 1, true);
  end if;
end $$;

-- Shows the home page order afterwards: partner_sites should be second, after hero
select sort_order, section_key, is_visible from page_sections where page_slug = 'home' order by sort_order;
