-- Adds editable labels for the Get in Touch form.
-- Only needed if you already ran seed.sql before this update.
update content_blocks
set data = data || '{
  "field_name_label":"Your name",
  "field_company_label":"Company",
  "field_email_label":"Email",
  "field_phone_label":"Phone / WhatsApp",
  "field_subject_label":"What are you moving?",
  "field_subject_placeholder":"e.g. 2,000 pairs of sports shoes to Dhaka",
  "field_message_label":"Details",
  "field_submit_label":"Send message",
  "field_sending_label":"Sending…"
}'::jsonb
where key = 'contact'
  and not (data ? 'field_name_label');
