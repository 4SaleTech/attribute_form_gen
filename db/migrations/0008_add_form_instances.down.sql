-- Remove indexes
DROP INDEX IF EXISTS `idx_submissions_user_id` ON submissions;
DROP INDEX IF EXISTS `idx_submissions_instance_id` ON submissions;

-- Remove columns from submissions
ALTER TABLE submissions 
  DROP COLUMN IF EXISTS `user_id`,
  DROP COLUMN IF EXISTS `instance_id`;

-- Drop form_instances table
DROP TABLE IF EXISTS form_instances;



