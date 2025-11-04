-- Remove config_hash column and index
DROP INDEX idx_forms_config_hash ON forms;
ALTER TABLE forms DROP COLUMN config_hash;

