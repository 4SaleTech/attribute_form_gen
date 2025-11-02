-- Restore slack type to webhooks
ALTER TABLE form_webhooks MODIFY COLUMN type ENUM('slack','http') NOT NULL;
ALTER TABLE form_webhooks MODIFY COLUMN mode ENUM('raw','slack') NOT NULL DEFAULT 'raw';

