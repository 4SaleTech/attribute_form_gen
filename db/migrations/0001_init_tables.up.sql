-- Attributes
CREATE TABLE IF NOT EXISTS attributes (
  `key` VARCHAR(191) PRIMARY KEY,
  `label_json` JSON NOT NULL,
  `default_position` INT DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Questions (1:1 with attribute via unique FK)
CREATE TABLE IF NOT EXISTS questions (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `attribute_key` VARCHAR(191) NOT NULL UNIQUE,
  `type` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `label_json` JSON NOT NULL,
  `props_json` JSON NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `version` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_questions_attribute` FOREIGN KEY (`attribute_key`) REFERENCES `attributes`(`key`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Forms (snapshots)
-- Check if forms table exists and has the expected structure (form_id column)
-- If forms exists but doesn't have form_id, it's the old schema - create form_snapshots instead
SET @forms_has_form_id = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'forms' 
    AND COLUMN_NAME = 'form_id'
);

SET @forms_table_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'forms'
);

-- If forms table doesn't exist, or exists with correct structure, create/use forms
-- Otherwise, create form_snapshots to avoid conflict
SET @table_name = IF(@forms_table_exists = 0 OR @forms_has_form_id > 0, 'forms', 'form_snapshots');

SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS ', @table_name, ' (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `form_id` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `title_json` JSON NOT NULL,
  `fields_json` JSON NOT NULL,
  `attributes_json` JSON NOT NULL,
  `thank_you_json` JSON NOT NULL,
  `submit_json` JSON NOT NULL,
  `supported_locales_json` JSON NOT NULL,
  `default_locale` VARCHAR(8) NOT NULL DEFAULT ''en'',
  `status` VARCHAR(32) NOT NULL DEFAULT ''active'',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_form_version` (`form_id`,`version`)
)');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Webhooks for a form snapshot
CREATE TABLE IF NOT EXISTS form_webhooks (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `form_id` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `type` ENUM('slack','http') NOT NULL,
  `endpoint_url` TEXT NOT NULL,
  `http_method` VARCHAR(16) NOT NULL DEFAULT 'POST',
  `headers_json` JSON NOT NULL,
  `mode` ENUM('raw','slack') NOT NULL DEFAULT 'raw',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_form_webhooks_form_version` (`form_id`,`version`)
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `form_id` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `submitted_at` BIGINT NOT NULL,
  `locale` VARCHAR(8) NOT NULL,
  `device` VARCHAR(64) NOT NULL,
  `answers_json` JSON NOT NULL,
  `attributes_json` JSON NOT NULL,
  `idempotency_key` VARCHAR(191) NULL,
  `webhook_status` ENUM('pending','partial','success','failed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_submission_idem` (`form_id`,`version`,`idempotency_key`)
);


