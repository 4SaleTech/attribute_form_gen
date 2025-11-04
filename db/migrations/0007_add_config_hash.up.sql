-- Add config_hash column to forms table for duplicate detection
ALTER TABLE forms
  ADD COLUMN config_hash VARCHAR(64) NULL AFTER submit_json;

-- Create index for fast lookups
CREATE INDEX idx_forms_config_hash ON forms(config_hash);

-- Generate hashes for existing forms (optional - can be NULL for old forms)
-- Note: This would require computing hashes, so we'll leave them NULL for now
-- New forms will always have a hash

