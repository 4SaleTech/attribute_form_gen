-- Remove selected_fields_json column from form_webhooks table
ALTER TABLE form_webhooks
  DROP COLUMN `selected_fields_json`;

