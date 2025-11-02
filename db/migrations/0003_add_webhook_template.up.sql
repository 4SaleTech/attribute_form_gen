ALTER TABLE form_webhooks
  ADD COLUMN `content_type` VARCHAR(64) NOT NULL DEFAULT 'application/json' AFTER `http_method`,
  ADD COLUMN `body_template` TEXT NULL AFTER `headers_json`;



