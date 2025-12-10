-- Create form_instances table for user-specific forms
CREATE TABLE IF NOT EXISTS form_instances (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `form_id` VARCHAR(191) NOT NULL,
  `version` INT NOT NULL,
  `user_token` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_form_instances_form_version` (`form_id`,`version`)
);

-- Add instance_id and user_id columns to submissions table (if they don't exist)
SET @instance_id_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'submissions' 
    AND COLUMN_NAME = 'instance_id'
);

SET @sql = IF(@instance_id_exists = 0,
  'ALTER TABLE submissions ADD COLUMN `instance_id` VARCHAR(191) NULL AFTER `idempotency_key`',
  'SELECT "Column instance_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_id_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'submissions' 
    AND COLUMN_NAME = 'user_id'
);

SET @sql = IF(@user_id_exists = 0,
  'ALTER TABLE submissions ADD COLUMN `user_id` BIGINT UNSIGNED NULL AFTER `instance_id`',
  'SELECT "Column user_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on instance_id for faster lookups (if it doesn't exist)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'submissions' 
    AND INDEX_NAME = 'idx_submissions_instance_id'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_submissions_instance_id ON submissions(`instance_id`)',
  'SELECT "Index idx_submissions_instance_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on user_id for faster lookups (if it doesn't exist)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'submissions' 
    AND INDEX_NAME = 'idx_submissions_user_id'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_submissions_user_id ON submissions(`user_id`)',
  'SELECT "Index idx_submissions_user_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

