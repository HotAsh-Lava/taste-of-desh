-- =====================================================================
--  Starter content. Run AFTER schema.sql. Safe to re-run.
-- =====================================================================

-- Top navigation ------------------------------------------------------
delete from nav_items;
insert into nav_items (label, path, sort_order, variant) values
  ('Who We Are',   '/who-we-are',   1, 'link'),
  ('What We Do',   '/what-we-do',   2, 'link'),
  ('Why RTI?',     '/why-rti',      3, 'link'),
  ('Our Team',     '/our-team',     4, 'link'),
  ('Imports',      '/imports',      5, 'link'),
  ('Exports',      '/exports',      6, 'link'),
  ('Social Media', '/social-media', 7, 'link'),
  ('Get in Touch', '/get-in-touch', 8, 'button');

-- Which sections show on which page, and in what order ----------------
delete from page_sections;
insert into page_sections (page_slug, section_key, sort_order) values
  ('home','hero',1), ('home','who_we_are',2), ('home','results',3),
  ('home','what_we_do',4), ('home','services',5), ('home','reviews',6),
  ('home','supply_chain',7), ('home','catalogue',8), ('home','other_products_cta',9),
  ('home','blog',10), ('home','contact',11),
  ('who-we-are','who_we_are',1), ('who-we-are','about_journey',2), ('who-we-are','results',3),
  ('what-we-do','what_we_do',1), ('what-we-do','services',2),
  ('why-rti','why_rti',1), ('why-rti','supply_chain',2), ('why-rti','process',3), ('why-rti','reviews',4),
  ('our-team','team',1),
  ('social-media','blog',1), ('social-media','videos',2),
  ('get-in-touch','contact',1), ('get-in-touch','map',2);

-- Content blocks ------------------------------------------------------
insert into content_blocks (key, data) values
('site', '{
  "company_name":"Raa Trade International",
  "short_name":"RTI",
  "logo_url":"",
  "logo_light_url":"",
  "announcement":"Consolidated Guangzhou → Dhaka sailings every Tuesday. Book by Sunday.",
  "announcement_enabled":true,
  "announcement_link":"/get-in-touch"
}'),
('home.hero', '{
  "video_url":"",
  "poster_url":"",
  "stamp":"China → Worldwide",
  "show_text":true,
  "show_cta":true,
  "align":"left",
  "title_size":"large",
  "overlay":"medium",
  "title_color":"",
  "highlight_color":"#2E8F78",
  "title_line_1":"We Make Quality Sourcing",
  "title_line_2":"Fast & Easy from China & Bangladesh",
  "title_line_3":"Your one stop solution in one place",
  "subtitle":"",
  "cta_label":"Get in Touch",
  "cta_link":"/get-in-touch",
  "ticker":"SOURCE / VERIFY / PURCHASE / INSPECT / RE-PACK / CONSOLIDATE / SHIP / CLEAR / DELIVER"
}'),
('services', '{
  "eyebrow":"Our Services",
  "heading":"Everything between the factory and your warehouse",
  "body":"Pick a service to see how we handle it."
}'),
('who_we_are', '{
  "eyebrow":"Who We Are",
  "heading":"A buying office in China that answers to you, not the factory.",
  "body":"Raa Trade International is a sourcing and trade partner working between China, Bangladesh and the rest of the world. We find the right supplier, negotiate in the local language, pay in the local currency, inspect every carton before it moves, re-pack where it makes sense, and hand you a single door-to-door shipment with one set of paperwork.\n\nWe run live shipping lanes into Bangladesh and the USA, and we have delivered into Malaysia and Italy. We are set up to serve Saudi Arabia, Brunei and Poland on request.",
  "image_url":"",
  "bullets":["Independent of the factory — we work for the buyer","Bilingual team on the ground in China","Door-to-door, one invoice, one point of contact"]
}'),
('who_we_are.journey', '{
  "eyebrow":"About Us",
  "heading":"How we started",
  "body":"RTI began as a small buying desk helping Bangladeshi importers avoid the two things that ruin a shipment: the wrong supplier and the wrong paperwork. Word travelled. Today we handle sourcing, QC, consolidation and freight for buyers who would rather run their business than chase a factory across nine time zones.",
  "image_url":""
}'),
('what_we_do', '{
  "eyebrow":"What We Do",
  "heading":"From factory floor to your door — handled end to end.",
  "body":"You send us a product, a photo, a link, or a sample. We come back with verified suppliers, real landed costs and a timeline you can plan around. Once you approve, we take it from there: purchase, inspect, re-pack, consolidate, ship, clear and deliver.",
  "image_url":"",
  "cta_label":"What We Do",
  "cta_link":"/what-we-do"
}'),
('why_rti', '{
  "eyebrow":"Why RTI?",
  "heading":"Why buyers hand us the whole job",
  "body":"Most sourcing agents stop at the purchase order. We stay on the shipment until it is in your warehouse — which is exactly where the expensive mistakes happen.",
  "image_url":"",
  "points":[
    {"title":"We buy as your agent","text":"No hidden factory commission. You see the supplier invoice."},
    {"title":"Inspection before payment clears","text":"Photo and video QC on every order, with a written report."},
    {"title":"Re-packing that survives the trip","text":"Cartons re-worked for freight, not for a showroom shelf."},
    {"title":"One consolidated shipment","text":"Ten suppliers, one container, one set of documents."},
    {"title":"Door-to-door in seven markets","text":"Bangladesh and USA weekly; Malaysia, Italy, Saudi, Brunei, Poland on request."}
  ]
}'),
('supply_chain', '{
  "eyebrow":"Supply Chain Difference",
  "heading":"The same order, two very different journeys",
  "body":"Pick a destination to see how the traditional route compares with an RTI-managed lane."
}'),
('results', '{"eyebrow":"Results Delivered","heading":"Counted, not claimed.","body":""}'),
('reviews', '{"eyebrow":"Reviews","heading":"What buyers say after the goods land","body":""}'),
('team',    '{"eyebrow":"Our Team","heading":"The people who answer your messages","body":""}'),
('process', '{
  "eyebrow":"Our Process",
  "heading":"Nine steps, no surprises",
  "body":"Every order runs through the same track. You get an update at each stage."
}'),
('catalogue', '{
  "eyebrow":"What We Handle",
  "heading":"Products moving through RTI right now",
  "body":"Imports into Bangladesh and exports out of it. Click a category to see what we are sourcing."
}'),
('other_products_cta', '{
  "heading":"Looking for something that is not on this list?",
  "body":"If it is made in China or Bangladesh, we can almost certainly source it. Send us the product and we will come back with suppliers and a landed cost.",
  "cta_label":"Get in Touch",
  "cta_link":"/get-in-touch"
}'),
('blog', '{
  "eyebrow":"From the Desk",
  "heading":"Notes on sourcing, freight and customs",
  "body":"Short, practical write-ups from the people doing the work."
}'),
('videos', '{
  "eyebrow":"On Video",
  "heading":"Inside the process",
  "body":"Factory visits, inspections and warehouse days."
}'),
('contact', '{
  "eyebrow":"Get in Touch",
  "heading":"Tell us what you need to move",
  "body":"Send the product, the quantity and the destination. We will come back with suppliers, a landed cost and a timeline.",
  "email":"hello@raatradeinternational.com",
  "phone":"+880 0000 000000",
  "whatsapp":"",
  "address":"Office address line 1, Dhaka, Bangladesh",
  "hours":"Sun–Thu, 9:00–18:00 (GMT+6)",
  "map_embed_url":"",
  "form_note":"We reply within one working day.",
  "field_name_label":"Your name",
  "field_company_label":"Company",
  "field_email_label":"Email",
  "field_phone_label":"Phone / WhatsApp",
  "field_subject_label":"What are you moving?",
  "field_subject_placeholder":"e.g. 2,000 pairs of sports shoes to Dhaka",
  "field_message_label":"Details",
  "field_submit_label":"Send message",
  "field_sending_label":"Sending…"
}'),
('footer', '{
  "band1_bg":"#E8912F",
  "band1_text":"#0B2231",
  "band2_bg":"#08151F",
  "band3_bg":"#0B2231",
  "newsletter_title":"Get Regular Updates",
  "newsletter_body":"Freight rate changes, sailing schedules and sourcing notes. About one email a month.",
  "description":"Sourcing, quality assurance, re-packing and door-to-door shipping from China and Bangladesh to the world.",
  "address":"Office address line 1, Dhaka, Bangladesh",
  "phone":"+880 0000 000000",
  "email":"hello@raatradeinternational.com",
  "facebook":"", "instagram":"", "youtube":"", "linkedin":"", "whatsapp":"", "tiktok":"", "whatsapp_float":true,
  "facebook_page_url":"",
  "copyright":"Copyright © 2026 Raa Trade International — All Rights Reserved",
  "credit":"Powered by Ideal Gadgets"
}'),
('page.who-we-are',   '{"title":"Who We Are","image_url":""}'),
('page.what-we-do',   '{"title":"What We Do","image_url":""}'),
('page.why-rti',      '{"title":"Why RTI?","image_url":""}'),
('page.our-team',     '{"title":"Our Team","image_url":""}'),
('page.imports',      '{"title":"Imports","image_url":""}'),
('page.exports',      '{"title":"Exports","image_url":""}'),
('page.social-media', '{"title":"Social Media","image_url":""}'),
('page.get-in-touch', '{"title":"Get in Touch","image_url":""}')
on conflict (key) do nothing;

-- Services ------------------------------------------------------------
delete from services;
insert into services (title, summary, description, sort_order) values
('Product Sourcing','We find and vet the supplier.','Send a photo, a link or a sample. We identify factories rather than traders, check business licences and export history, pull samples, and come back with a shortlist and real quotes.',1),
('Product Purchasing','We buy in RMB, as your agent.','Negotiation in Mandarin, deposit handling, contract terms and payment in local currency — with the supplier invoice visible to you. No hidden margin on the goods.',2),
('Quality Assurance','Every order is inspected before it ships.','Pre-production checks, during-production checks and a full pre-shipment inspection with photos, video and a written report. Nothing moves until you have seen it.',3),
('Storage & Re-packing','Warehousing and freight-ready packing.','Free short-term storage while we wait on the rest of your order. Cartons re-worked, labelled and reinforced for the trip, with barcodes and shipping marks applied.',4),
('Shipping','Consolidated, door to door.','Sea, air and express. Ten suppliers arrive as one shipment with one set of documents. We handle export clearance, freight, import clearance and final delivery.',5);

-- Results delivered ---------------------------------------------------
delete from stats;
insert into stats (value, label, note, sort_order) values
('700+','Orders shipped','Across sea, air and express',1),
('9','Destination markets','Live and on request',2),
('98%','Inspection pass rate','Before goods leave China',3),
('12 yrs','On the ground in China','Supplier network built the slow way',4);

-- Process -------------------------------------------------------------
delete from process_steps;
insert into process_steps (title, description, sort_order) values
('Enquiry','You send the product, quantity and destination.',1),
('Supplier search','We shortlist verified factories and pull quotes.',2),
('Sample & approval','Samples to you or to our office for sign-off.',3),
('Quotation','Landed cost: goods, freight, duty, delivery.',4),
('Purchase order','We buy as your agent and place the deposit.',5),
('Production QC','In-line checks with photo and video updates.',6),
('Inspection & re-pack','Pre-shipment inspection, then freight-ready packing.',7),
('Consolidation & shipping','One shipment, one set of documents.',8),
('Clearance & delivery','Import clearance and delivery to your door.',9);

-- Supply chain lanes --------------------------------------------------
delete from supply_chain_lanes;
insert into supply_chain_lanes (name, country, mode, variant, transport, transit_days, note, steps, sort_order) values
('Traditional route','Bangladesh','Sea LCL','traditional','sea',52,'Buyer coordinates every party separately.',
 '[{"label":"Buyer finds supplier online","days":10,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory ships to a forwarder","days":7,"owner":"Factory","icon":"factory"},
   {"label":"Goods wait for a full container","days":9,"owner":"Forwarder","icon":"warehouse"},
   {"label":"Sea freight to Chattogram","days":18,"owner":"Carrier","icon":"ship"},
   {"label":"Clearance delays, missing docs","days":5,"owner":"You","icon":"customs"}]',1),
('RTI managed lane','Bangladesh','Sea LCL','rti','sea',34,'One contract, one point of contact.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":3,"owner":"RTI","icon":"clipboard"},
   {"label":"Weekly consolidation slot","days":4,"owner":"RTI","icon":"container"},
   {"label":"Sea freight to Chattogram","days":18,"owner":"Carrier","icon":"ship"},
   {"label":"Clearance + door delivery","days":4,"owner":"RTI","icon":"truck"}]',2),
('Traditional route','USA','Sea FCL','traditional','sea',60,'Multiple handoffs, no single owner.',
 '[{"label":"Buyer finds supplier online","days":12,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory to forwarder","days":8,"owner":"Factory","icon":"factory"},
   {"label":"Waiting on container space","days":7,"owner":"Forwarder","icon":"warehouse"},
   {"label":"Sea freight to LA/Long Beach","days":24,"owner":"Carrier","icon":"ship"},
   {"label":"Customs hold, ISF filed late","days":6,"owner":"You","icon":"customs"}]',3),
('RTI managed lane','USA','Sea FCL','rti','sea',41,'ISF filed on time, one consolidated load.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":3,"owner":"RTI","icon":"clipboard"},
   {"label":"Consolidation + ISF filing","days":4,"owner":"RTI","icon":"container"},
   {"label":"Sea freight to LA/Long Beach","days":24,"owner":"Carrier","icon":"ship"},
   {"label":"Clearance + door delivery","days":5,"owner":"RTI","icon":"truck"}]',4),
('Traditional route','Bangladesh','Air','traditional','air',26,'Booked ad hoc, cleared by the buyer.',
 '[{"label":"Buyer finds supplier online","days":10,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory to airport handler","days":4,"owner":"Factory","icon":"factory"},
   {"label":"Air freight to Dhaka","days":5,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance delays, missing docs","days":4,"owner":"You","icon":"customs"}]',5),
('RTI managed lane','Bangladesh','Air','rti','air',14,'Documents prepared before the flight lands.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":2,"owner":"RTI","icon":"clipboard"},
   {"label":"Air freight to Dhaka","days":5,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance + door delivery","days":2,"owner":"RTI","icon":"truck"}]',6),
('Traditional route','USA','Air','traditional','air',30,'Multiple handoffs, no single owner.',
 '[{"label":"Buyer finds supplier online","days":12,"owner":"You","icon":"search"},
   {"label":"Payment sent, no inspection","days":3,"owner":"You","icon":"check"},
   {"label":"Factory to airport handler","days":5,"owner":"Factory","icon":"factory"},
   {"label":"Air freight to LAX","days":6,"owner":"Carrier","icon":"plane"},
   {"label":"Customs hold, ISF filed late","days":4,"owner":"You","icon":"customs"}]',7),
('RTI managed lane','USA','Air','rti','air',17,'ISF filed before departure.',
 '[{"label":"Verified supplier shortlist","days":3,"owner":"RTI","icon":"search"},
   {"label":"Purchase as your agent","days":2,"owner":"RTI","icon":"check"},
   {"label":"Inspection + re-pack","days":2,"owner":"RTI","icon":"clipboard"},
   {"label":"Air freight to LAX","days":6,"owner":"Carrier","icon":"plane"},
   {"label":"Clearance + door delivery","days":4,"owner":"RTI","icon":"truck"}]',8);

-- Catalogue -----------------------------------------------------------
delete from categories;
insert into categories (name, slug, trade_type, description, sort_order) values
('Footwear','footwear','import','Sports, formal, casual and safety footwear sourced from Guangdong and Fujian.',1),
('Bags & Luggage','bags-luggage','import','Backpacks, school bags, travel luggage and promotional totes.',2),
('Computer Electronics & Home Appliances','electronics-appliances','import','Components, accessories and small appliances from named brands and OEM lines.',3),
('Garments & Textiles','garments-textiles','export','Knit and woven garments, home textiles and fabric out of Bangladesh.',4),
('Jute & Jute Goods','jute-goods','export','Raw jute, jute bags, rugs and eco packaging.',5);

-- Reviews (placeholders — replace with real ones) ----------------------
delete from reviews;
insert into reviews (author_name, rating, body, source, sort_order) values
('Placeholder review',5,'Replace these from Admin → Why RTI? → Reviews, or connect your Facebook page.','manual',1);
