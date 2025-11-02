-- Revert to required label_json
ALTER TABLE attributes 
  MODIFY COLUMN label_json JSON NOT NULL;

