-- Hides "Our Team" from the top menu right away. You can turn it back on any time
-- in Admin -> Dashboard -> Top menu by ticking "Visible" again -- no code change needed.
update nav_items set is_visible = false where path = '/our-team';
