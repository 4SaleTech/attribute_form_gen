-- Add config_hash column to forms/form_snapshots table for duplicate detection
-- Only add if the table has the expected structure (i.e., has submit_json column)
-- This prevents errors when an existing forms table with different structure exists

-- Check which table exists (forms or form_snapshots)
SET @forms_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'forms'
    AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'forms' 
         AND COLUMN_NAME = 'submit_json') > 0
);

SET @form_snapshots_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'form_snapshots'
);

-- Add config_hash to forms table if it exists with correct structure
SET @sql = IF(@forms_exists > 0,
  'ALTER TABLE forms ADD COLUMN IF NOT EXISTS config_hash VARCHAR(64) NULL AFTER submit_json',
  'SELECT "Skipping forms table" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add config_hash to form_snapshots table if it exists
SET @sql = IF(@form_snapshots_exists > 0,
  'ALTER TABLE form_snapshots ADD COLUMN IF NOT EXISTS config_hash VARCHAR(64) NULL AFTER submit_json',
  'SELECT "Skipping form_snapshots table" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index on forms table (only if column exists)
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'forms' 
    AND COLUMN_NAME = 'config_hash'
);

SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'forms' 
    AND INDEX_NAME = 'idx_forms_config_hash'
);

SET @sql = IF(@column_exists > 0 AND @index_exists = 0,
  'CREATE INDEX idx_forms_config_hash ON forms(config_hash)',
  'SELECT "Skipping forms index creation" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index on form_snapshots table (only if column exists)
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'form_snapshots' 
    AND COLUMN_NAME = 'config_hash'
);

SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'form_snapshots' 
    AND INDEX_NAME = 'idx_form_snapshots_config_hash'
);

SET @sql = IF(@column_exists > 0 AND @index_exists = 0,
  'CREATE INDEX idx_form_snapshots_config_hash ON form_snapshots(config_hash)',
  'SELECT "Skipping form_snapshots index creation" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
