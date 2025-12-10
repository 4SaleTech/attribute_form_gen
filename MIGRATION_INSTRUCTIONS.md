# Database Migration Instructions for User-Specific Forms

## Important: Remote Database Migration Required

The API server connects to a remote AWS RDS database (`sc_dynamic_form_generator`). The migration **must be run on this database** before the feature will work.

## Current Database Configuration

From `.env.local`:
- **Host**: `staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com`
- **Port**: `3306`
- **Database**: `sc_dynamic_form_generator`
- **User**: `sc_dynamic_form_generator_dbuser`

## Migration Steps

### Step 1: Connect to Remote Database

You'll need access to the remote database. Options:

**Option A: Using AWS RDS Proxy or Direct Connection**
```bash
mysql -h staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com \
  -u sc_dynamic_form_generator_dbuser \
  -p \
  sc_dynamic_form_generator
```

**Option B: Using AWS Systems Manager Session Manager** (if configured)
```bash
aws rds start-db-instance --db-instance-identifier <instance-id>
# Then connect via bastion host or VPN
```

**Option C: Using migrate tool with connection string**
```bash
migrate -path db/migrations \
  -database "mysql://sc_dynamic_form_generator_dbuser:PASSWORD@tcp(staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com:3306)/sc_dynamic_form_generator" \
  up
```

### Step 2: Run Migration SQL

Execute the migration file:

```bash
mysql -h <host> -u <user> -p <database> < db/migrations/0008_add_form_instances.up.sql
```

Or manually execute the SQL from `db/migrations/0008_add_form_instances.up.sql`

### Step 3: Verify Migration

```sql
-- Check form_instances table exists
SHOW TABLES LIKE 'form_instances';

-- Check submissions table has new columns
DESCRIBE submissions;
-- Should show: instance_id and user_id columns

-- Check indexes exist
SHOW INDEXES FROM submissions WHERE Key_name IN ('idx_submissions_instance_id', 'idx_submissions_user_id');
```

### Step 4: Test the Feature

After migration, test with:

```bash
./test-user-specific-form-complete.sh
```

## Migration SQL Summary

The migration (`0008_add_form_instances.up.sql`) does the following:

1. **Creates `form_instances` table**:
   - `id` (VARCHAR, PRIMARY KEY) - Instance UUID
   - `form_id` (VARCHAR) - Form identifier
   - `version` (INT) - Form version
   - `user_token` (TEXT) - User token for this instance
   - Unique constraint on (`form_id`, `version`)

2. **Adds columns to `submissions` table**:
   - `instance_id` (VARCHAR, nullable) - Instance ID if form is user-specific
   - `user_id` (BIGINT UNSIGNED, nullable) - User ID from identification

3. **Creates indexes**:
   - `idx_submissions_instance_id` on `instance_id`
   - `idx_submissions_user_id` on `user_id`

## Rollback (if needed)

To rollback the migration:

```bash
mysql -h <host> -u <user> -p <database> < db/migrations/0008_add_form_instances.down.sql
```

Or use migrate tool:
```bash
migrate -path db/migrations -database "<connection_string>" down 1
```

## Testing After Migration

Once the migration is complete, you can test:

1. **Create user-specific form**:
   ```bash
   curl -X POST http://localhost:8080/api/forms/publish \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer dev-admin-token" \
     -d '{
       "title": {"en": "Test", "ar": "اختبار"},
       "attributes": ["hero_banner"],
       "form_type": "user_specific",
       "user_token": "test-token-123",
       "submit": {"actions": [{"type": "server_persist", "enabled": true}], "ordering": ["server_persist"], "on_error": "continue"}
     }'
   ```

2. **Verify instance was created**:
   - Response should include `instanceId` field
   - URLs should include `instanceId` query parameter

3. **Test form retrieval**:
   ```bash
   curl "http://localhost:8080/api/forms/{formId}/{version}?instanceId={instanceId}"
   ```
   - Should include `instance_user_token` in response

4. **Test form submission**:
   - Submit form and verify `instance_id` and `user_id` are stored

## Troubleshooting

### Error: Table doesn't exist
- **Solution**: Run the migration on the correct database
- **Check**: Verify you're connected to `sc_dynamic_form_generator` database

### Error: Column already exists
- **Solution**: Migration already applied, this is okay
- **Check**: Verify columns exist: `DESCRIBE submissions;`

### Error: Instance creation failed
- **Check**: API logs for detailed error message
- **Check**: Database connection is working
- **Check**: Migration has been applied

## Security Notes

- Database credentials should be stored securely
- Use environment variables or AWS Secrets Manager
- Never commit database credentials to git
- Use read-only database user for verification queries if possible



