# Create a Form with cURL

This guide explains how to create a form using the API endpoint with cURL commands.

## Endpoint

**URL:** `POST /api/forms/publish`  
**Authentication:** Bearer token (required)

## Basic cURL Command

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "English Title",
      "ar": "العنوان العربي"
    },
    "attributes": ["attribute1", "attribute2"]
  }'
```

**Note:** The `formId` is optional. If not provided, a UUID will be automatically generated and returned in the response.

## Request Body Structure

### Required Fields

- **`title`** (object): Form title in both languages
  - `en` (string): English title
  - `ar` (string): Arabic title
- **`attributes`** (array): List of attribute keys to include in the form (must exist in the database)

### Optional Fields

- **`formId`** (string): Unique identifier for your form. If not provided, a UUID will be automatically generated. You can optionally provide your own identifier (e.g., `"contact-form"`, `"service-request"`)
- **`thankYou`** (object): Thank you message configuration
  - `show` (boolean): Whether to show thank you message after submission
  - `title` (object): Thank you title with `en` and `ar` keys
  - `message` (object): Thank you message with `en` and `ar` keys
- **`submit`** (object): Submit action configuration
  - `actions` (array): List of action objects
  - `ordering` (array): Order of actions execution
  - `timeout_ms` (number): Timeout in milliseconds (default: 6000)
  - `on_error` (string): Error handling (`"continue"`, `"stop"`, or `"show_error"`)
  - `idempotency` (object): Duplicate submission prevention

## Complete Example

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Contact Us",
      "ar": "اتصل بنا"
    },
    "attributes": ["full_name", "email", "phone_number", "message"],
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "We will get back to you soon.",
        "ar": "سنتواصل معك قريباً."
      }
    },
    "submit": {
      "actions": [
        {
          "type": "server_persist",
          "enabled": true
        },
        {
          "type": "webhooks",
          "enabled": false
        },
        {
          "type": "redirect",
          "enabled": false,
          "url": ""
        },
        {
          "type": "native_bridge",
          "enabled": false
        }
      ],
      "ordering": ["server_persist", "webhooks", "redirect", "native_bridge"],
      "timeout_ms": 6000,
      "on_error": "continue",
      "idempotency": {
        "enabled": true,
        "key": "sessionId"
      }
    }
  }'
```

## Success Response

When the form is created successfully, you'll receive:

```json
{
  "formId": "contact-form",
  "version": 1,
  "isDuplicate": false,
  "urls": {
    "en": "http://localhost:8080/contact-form/1?lang=en",
    "ar": "http://localhost:8080/contact-form/1?lang=ar"
  }
}
```

**Response Fields:**
- `formId`: The form identifier (auto-generated UUID if not provided in request, or the one you provided)
- `version`: The version number (starts at 1, increments with each publish)
- `isDuplicate`: `false` if a new form was created, `true` if an existing form with the same configuration was found
- `urls`: URLs to access the form in English and Arabic

### Duplicate Detection Response

If a form with the same configuration already exists:

```json
{
  "formId": "existing-form-id",
  "version": 2,
  "isDuplicate": true,
  "urls": {
    "en": "http://localhost:8080/existing-form-id/2?lang=en",
    "ar": "http://localhost:8080/existing-form-id/2?lang=ar"
  }
}
```

**Note:** The system compares attributes, submit configuration, and thank you configuration. If they match an existing form, it returns that form instead of creating a duplicate.

## Error Responses

### Missing Attributes

**Status:** `422 Unprocessable Entity`

```json
{
  "error": "missing attributes",
  "missing": ["attribute1", "attribute2"]
}
```

**Solution:** Ensure all attributes in the `attributes` array exist in the database.

### Missing Bilingual Content

**Status:** `422 Unprocessable Entity`

```json
{
  "error": "bilingual required",
  "details": [
    "/title: missing en/ar",
    "/fields/0/label: missing en/ar",
    "/thankYou/title: missing en/ar (required when show=true)"
  ]
}
```

**Solution:** Provide both English (`en`) and Arabic (`ar`) translations for all text fields.

### Invalid JSON

**Status:** `400 Bad Request`

```json
{
  "error": "invalid json"
}
```

**Solution:** Check your JSON syntax and ensure proper escaping of quotes.

### Database Error

**Status:** `500 Internal Server Error`

```json
{
  "error": "db error"
}
```

**Solution:** Check server logs and database connectivity.

### Insert Failed

**Status:** `500 Internal Server Error`

```json
{
  "error": "insert failed"
}
```

**Solution:** Check database constraints and server logs.

## Minimal Example

The simplest form creation requires only the essentials:

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Simple Form",
      "ar": "نموذج بسيط"
    },
    "attributes": ["test_text"]
  }'
```

**Note:** The `formId` will be auto-generated (UUID format) and returned in the response.

This will create a form with default submit actions (server_persist enabled) and no thank you message.

## Submit Actions Explained

### Action Types

1. **`server_persist`**: Saves form submissions to the database
2. **`webhooks`**: Triggers configured webhooks
3. **`redirect`**: Redirects user after submission (requires `url` if enabled)
4. **`native_bridge`**: Sends data to native mobile app bridge

### Action Ordering

The `ordering` array determines the execution sequence. Actions are executed in the order specified.

### Error Handling

- **`continue`**: Continue with remaining actions even if one fails
- **`stop`**: Stop execution if any action fails
- **`show_error`**: Display error message to user and stop

## Common Use Cases

### 1. Simple Contact Form

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Contact Us",
      "ar": "اتصل بنا"
    },
    "attributes": ["name", "email", "message"],
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true}
      ],
      "ordering": ["server_persist"]
    }
  }'
```

### 2. Form with Thank You Message

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Feedback Form",
      "ar": "نموذج التعليقات"
    },
    "attributes": ["rating", "comments"],
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "Your feedback has been received.",
        "ar": "تم استلام تعليقاتك."
      }
    },
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true}
      ],
      "ordering": ["server_persist"]
    }
  }'
```

### 3. Form with Webhooks

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Place Order",
      "ar": "تقديم طلب"
    },
    "attributes": ["product", "quantity", "customer_info"],
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true},
        {"type": "webhooks", "enabled": true}
      ],
      "ordering": ["server_persist", "webhooks"],
      "on_error": "stop"
    }
  }'
```

### 4. Form with Redirect

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Sign Up",
      "ar": "التسجيل"
    },
    "attributes": ["email", "password"],
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true},
        {
          "type": "redirect",
          "enabled": true,
          "url": "https://example.com/success"
        }
      ],
      "ordering": ["server_persist", "redirect"]
    }
  }'
```

## Tips

1. **Pretty Print Response**: Add `| jq` or `| python3 -m json.tool` to format the JSON response:
   ```bash
   curl ... | python3 -m json.tool
   ```

2. **Save Response to File**:
   ```bash
   curl ... -o response.json
   ```

3. **Verbose Output**: Add `-v` flag to see request/response headers:
   ```bash
   curl -v -X POST ...
   ```

4. **Use Variables**: Store your token in a variable:
   ```bash
   TOKEN="dev-admin-token"
   curl -X POST http://localhost:8080/api/forms/publish \
     -H "Authorization: Bearer $TOKEN" \
     ...
   ```

5. **Read JSON from File**: Use `@filename` to read JSON from a file:
   ```bash
   curl -X POST http://localhost:8080/api/forms/publish \
     -H "Authorization: Bearer dev-admin-token" \
     -H "Content-Type: application/json" \
     -d @form.json
   ```

## Validation Checklist

Before submitting, ensure:

- ✅ `formId` is optional (auto-generated if not provided)
- ✅ `title.en` and `title.ar` are both provided
- ✅ All attributes in `attributes` array exist in the database
- ✅ If `thankYou.show` is `true`, both `thankYou.title` and `thankYou.message` have `en` and `ar` keys
- ✅ At least one submit action is enabled
- ✅ If `redirect` action is enabled, `url` is provided and is a valid URL
- ✅ `on_error` is one of: `"continue"`, `"stop"`, or `"show_error"`

## Next Steps

After creating a form:

1. **View the form**: Use the URLs from the response to access your form
2. **Configure webhooks**: Set up webhooks for the form (if needed)
3. **Test submission**: Submit a test response to verify everything works
4. **View submissions**: Check the submissions endpoint to see submitted data

