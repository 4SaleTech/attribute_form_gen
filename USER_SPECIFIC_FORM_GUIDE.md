# User-Specific Form Implementation Guide

This guide explains how to use the new user-specific form feature.

## Overview

User-specific forms allow you to create forms that are tied to a specific user token. When a user accesses the form with the instance ID, their user token is automatically used for Amplitude analytics logging.

## Features

- **Form Type Selection**: Choose between "normal" (default) or "user_specific"
- **Instance Management**: Each user-specific form gets a unique instance ID
- **Automatic Token Usage**: Instance token is automatically used for Amplitude logging
- **Submission Tracking**: Submissions include `instance_id` and `user_id` for tracking

## Database Migration

Before using this feature, you must run the database migration:

### Option 1: Using migrate tool

```bash
# For local development
migrate -path db/migrations -database "mysql://formdev:formdevpw@tcp(localhost:3307)/formdev" up

# For staging/production (replace with your credentials)
migrate -path db/migrations -database "mysql://user:pass@host:port/database" up
```

### Option 2: Using the migration script

```bash
# Set environment variables
export MYSQL_HOST=your-host
export MYSQL_USER=your-user
export MYSQL_PASSWORD=your-password
export MYSQL_DATABASE=your-database
export MYSQL_PORT=3306

# Run script
./scripts/run-migration-0008.sh
```

### Option 3: Manual SQL execution

```bash
mysql -h<host> -u<user> -p<password> <database> < db/migrations/0008_add_form_instances.up.sql
```

## Creating a User-Specific Form

### Via Admin UI

1. Open the Admin panel at `http://localhost:5173/admin`
2. Fill in the form details:
   - Form ID (auto-generated)
   - Title (EN and AR)
   - Select attributes
3. **Set Form Type**: Select "User Specific" from the dropdown
4. **Enter User Token**: When "User Specific" is selected, enter the user token
5. Configure submit actions
6. Click "Publish"
7. Copy the returned URLs which include the `instanceId` parameter

### Via API

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "My Form", "ar": "نموذجي"},
    "attributes": ["hero_banner", "phone_number"],
    "form_type": "user_specific",
    "user_token": "2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI",
    "submit": {
      "actions": [{"type": "server_persist", "enabled": true}],
      "ordering": ["server_persist"],
      "on_error": "continue"
    }
  }'
```

Response includes:
```json
{
  "formId": "abc-123",
  "version": 1,
  "instanceId": "xyz-789",
  "urls": {
    "en": "http://localhost:5174/abc-123/1?lang=en&instanceId=xyz-789",
    "ar": "http://localhost:5174/abc-123/1?lang=ar&instanceId=xyz-789"
  }
}
```

## Accessing User-Specific Forms

### URL Format

User-specific forms must be accessed with the `instanceId` query parameter:

```
http://localhost:5174/{formId}/{version}?instanceId={instanceId}&lang=en&sessionId={sessionId}
```

**Important**: Both `instanceId` and `sessionId` can be used together. The `sessionId` parameter is not affected by the instance feature.

### Token Priority

When accessing a form, the user token is determined in this priority order:

1. **Instance Token** (highest priority) - From `instanceId` query parameter
2. **Cookie Token** - From `_xyzW` cookie
3. **URL Token** - From `user_token` query parameter (backward compatibility)
4. **Anonymous** - No token available

## Form Submission

When a user submits a user-specific form:

1. The `instance_id` is automatically included in the submission meta
2. The `user_id` (if available from user identification) is included
3. Both are stored in the `submissions` table

### Submission Meta Format

```json
{
  "formId": "abc-123",
  "version": 1,
  "answers": {...},
  "meta": {
    "locale": "en",
    "device": "web",
    "attributes": [...],
    "sessionId": "session-123",
    "instance_id": "xyz-789",  // Automatically added
    "user_id": 1885389          // Automatically added if user identified
  }
}
```

## Testing

### Run Comprehensive Tests

```bash
./test-user-specific-form-complete.sh
```

This will test:
- ✅ API health
- ✅ User-specific form creation
- ✅ Instance ID generation
- ✅ Form retrieval without instanceId (no instance data)
- ✅ Form retrieval with instanceId (includes instance data)
- ✅ Form submission with instance_id and user_id
- ✅ Normal form creation (no instance)
- ✅ URL format with both instanceId and sessionId

### Manual Testing Steps

1. **Create a user-specific form** via admin UI
2. **Copy the URL** with instanceId from the response
3. **Open the URL** in a browser
4. **Check browser console** for:
   - User API calls using instance token
   - Amplitude user ID being set
5. **Submit the form**
6. **Verify submission** includes instance_id and user_id

## Database Schema

### form_instances Table

```sql
CREATE TABLE form_instances (
  id VARCHAR(191) PRIMARY KEY,
  form_id VARCHAR(191) NOT NULL,
  version INT NOT NULL,
  user_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (form_id, version)
);
```

### submissions Table (New Columns)

- `instance_id` VARCHAR(191) NULL - Instance ID if form is user-specific
- `user_id` BIGINT UNSIGNED NULL - User ID from user identification

## API Endpoints

### Create Form (with user-specific)

```
POST /api/forms/publish
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": {"en": "...", "ar": "..."},
  "attributes": [...],
  "form_type": "user_specific",  // or "normal"
  "user_token": "...",            // Required if form_type is "user_specific"
  "submit": {...}
}
```

### Get Form (with instance)

```
GET /api/forms/{formId}/{version}?instanceId={instanceId}&sessionId={sessionId}
```

Returns form config with `instance_user_token` and `instance_id` if `instanceId` is provided.

### Submit Form

```
POST /api/submissions
Content-Type: application/json

{
  "formId": "...",
  "version": 1,
  "answers": {...},
  "meta": {
    "instance_id": "...",  // Automatically added by frontend
    "user_id": 123,         // Automatically added by frontend
    ...
  }
}
```

## Troubleshooting

### Instance creation fails

- **Check**: Database migration has been run
- **Check**: `form_instances` table exists
- **Check**: API logs for detailed error messages

### Instance token not found

- **Check**: URL includes `instanceId` query parameter
- **Check**: Instance ID matches the one returned on form creation
- **Check**: Form version matches

### Submission missing instance_id

- **Check**: Form was accessed with `instanceId` query parameter
- **Check**: Form config includes `instance_id` field
- **Check**: Frontend is passing `instance_id` in meta

## Examples

### Example 1: Create and Access User-Specific Form

```bash
# 1. Create form
RESPONSE=$(curl -X POST http://localhost:8080/api/forms/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "User Form", "ar": "نموذج المستخدم"},
    "attributes": ["hero_banner"],
    "form_type": "user_specific",
    "user_token": "2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI",
    "submit": {"actions": [{"type": "server_persist", "enabled": true}], "ordering": ["server_persist"], "on_error": "continue"}
  }')

# 2. Extract instance ID
INSTANCE_ID=$(echo $RESPONSE | jq -r '.instanceId')
FORM_ID=$(echo $RESPONSE | jq -r '.formId')
VERSION=$(echo $RESPONSE | jq -r '.version')

# 3. Access form with instanceId
open "http://localhost:5174/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&lang=en&sessionId=test-123"
```

### Example 2: Normal Form (No Instance)

```bash
# Create normal form (no form_type specified, defaults to "normal")
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "Normal Form", "ar": "نموذج عادي"},
    "attributes": ["hero_banner"],
    "submit": {"actions": [{"type": "server_persist", "enabled": true}], "ordering": ["server_persist"], "on_error": "continue"}
  }'
```

## Security Considerations

1. **Instance IDs**: Instance IDs are UUIDs and should be treated as sensitive
2. **User Tokens**: User tokens are stored in the database and should be encrypted at rest
3. **URL Sharing**: Instance-specific URLs should not be shared publicly
4. **Token Validation**: Always validate user tokens server-side before use

## Migration Checklist

- [ ] Run database migration `0008_add_form_instances.up.sql`
- [ ] Verify `form_instances` table exists
- [ ] Verify `submissions` table has `instance_id` and `user_id` columns
- [ ] Test form creation via admin UI
- [ ] Test form access with instanceId
- [ ] Test form submission
- [ ] Verify Amplitude logging uses instance token
- [ ] Verify submissions include instance_id and user_id



