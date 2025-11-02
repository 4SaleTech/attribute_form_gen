-- Add selected_fields_json column to form_webhooks table
ALTER TABLE form_webhooks
  ADD COLUMN `selected_fields_json` JSON NULL AFTER `body_template`;

