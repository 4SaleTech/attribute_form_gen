-- Remove slack type from webhooks
ALTER TABLE form_webhooks MODIFY COLUMN type ENUM('http') NOT NULL;
ALTER TABLE form_webhooks MODIFY COLUMN mode ENUM('raw') NOT NULL DEFAULT 'raw';

