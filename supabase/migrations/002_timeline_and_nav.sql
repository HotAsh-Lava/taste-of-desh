-- =====================================================================
--  Run this in Supabase → SQL Editor if you already ran schema.sql
--  before this update. Safe to run more than once.
-- =====================================================================

-- Sea / air switching on the supply chain timeline
alter table supply_chain_lanes add column if not exists transport text default 'sea';
update supply_chain_lanes set transport = 'sea' where transport is null;

-- Let a menu item render as a button instead of a plain link
alter table nav_items add column if not exists variant text default 'link';
update nav_items set variant = 'button' where path = '/get-in-touch';

-- Heading block for the new tabbed services section
insert into content_blocks (key, data) values
('services', '{"eyebrow":"Our Services","heading":"Everything between the factory and your warehouse","body":"Pick a service to see how we handle it."}')
on conflict (key) do nothing;

-- Air freight lanes so the Sea / Air switch has something to show
insert into supply_chain_lanes (name, country, mode, variant, transport, transit_days, note, steps, sort_order)
select * from (values
('Traditional route','Bangladesh','Air','traditional','air',26,'Booked ad hoc, cleared by the buyer.',
 '[{"label":"Buyer finds supplier online","days":10,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory to airport handler","days":4,"owner":"Factory","icon":"factory"},
   {"label":"Air freight to Dhaka","days":5,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance delays, missing docs","days":4,"owner":"You","icon":"customs"}]'::jsonb,5),
('RTI managed lane','Bangladesh','Air','rti','air',14,'Documents prepared before the flight lands.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":2,"owner":"RTI","icon":"clipboard"},
   {"label":"Air freight to Dhaka","days":5,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance + door delivery","days":2,"owner":"RTI","icon":"truck"}]'::jsonb,6),
('Traditional route','USA','Air','traditional','air',30,'Multiple handoffs, no single owner.',
 '[{"label":"Buyer finds supplier online","days":12,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory to airport handler","days":5,"owner":"Factory","icon":"factory"},
   {"label":"Air freight to LAX","days":6,"owner":"Carrier","icon":"plane"},
   {"label":"Customs hold, ISF filed late","days":4,"owner":"You","icon":"customs"}]'::jsonb,7),
('RTI managed lane','USA','Air','rti','air',17,'ISF filed before departure.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":2,"owner":"RTI","icon":"clipboard"},
   {"label":"Air freight to LAX","days":6,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance + door delivery","days":4,"owner":"RTI","icon":"truck"}]'::jsonb,8)
) as v(name,country,mode,variant,transport,transit_days,note,steps,sort_order)
where not exists (select 1 from supply_chain_lanes where transport = 'air');
