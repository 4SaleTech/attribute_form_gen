-- Make label_json nullable and remove status requirement
ALTER TABLE attributes 
  MODIFY COLUMN label_json JSON NULL,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active';

-- Set existing NULL labels to empty JSON object
UPDATE attributes SET label_json = JSON_OBJECT() WHERE label_json IS NULL;

