# Submit Actions Documentation

## Overview

Submit actions define what happens when a user submits a form. The form submission pipeline executes actions in a specified order, with configurable error handling and timeouts.

## Submit Pipeline Configuration

The submit pipeline is configured in the `submit` object when creating or publishing a form:

```json
{
  "submit": {
    "actions": [
      {
        "type": "server_persist",
        "enabled": true
      },
      {
        "type": "webhooks",
        "enabled": true
      },
      {
        "type": "redirect",
        "enabled": false,
        "url": ""
      },
      {
        "type": "native_bridge",
        "enabled": false
      },
      {
        "type": "nextjs_post",
        "enabled": false
      }
    ],
    "ordering": ["server_persist", "webhooks", "redirect", "native_bridge", "nextjs_post"],
    "timeout_ms": 6000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

### Configuration Fields

- **`actions`** (array): List of available submit actions with their enabled state
- **`ordering`** (array): Execution order of actions (only enabled actions are executed)
- **`timeout_ms`** (number): Maximum time in milliseconds for each action to complete
- **`on_error`** (string): Error handling strategy (`continue`, `stop`, `show_error`)
- **`idempotency`** (object): Prevents duplicate submissions
  - **`enabled`** (boolean): Enable/disable idempotency check
  - **`key`** (string): Meta field name to use as idempotency key (e.g., `"sessionId"`)

## Submit Action Types

### 1. `server_persist`

**Purpose**: Saves form submissions to the database.

**Description**: 
- Persists form data to the `form_submissions` table
- Validates answers against form schema
- Returns a submission ID for reference
- Required for most use cases

**Configuration**:
```json
{
  "type": "server_persist",
  "enabled": true
}
```

**Execution**:
- Makes POST request to `/api/submissions`
- Validates submission against form schema
- Stores answers, metadata, and timestamps
- Returns submission ID

**Payload Sent**:
```json
{
  "formId": "form_123",
  "version": 1,
  "submittedAt": 1704067200000,
  "answers": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "locale": "en",
    "device": "web",
    "attributes": ["name", "email"],
    "sessionId": "abc123"
  }
}
```

**Response**:
```json
{
  "id": 42,
  "success": true
}
```

**Error Handling**:
- Validation errors return `422 Unprocessable Entity` with error details
- Database errors return `500 Internal Server Error`
- Idempotency violations return `409 Conflict`

**Notes**:
- This action typically runs first to ensure data is saved
- Submission ID from this action can be used by subsequent actions (e.g., `nextjs_post`)

---

### 2. `webhooks`

**Purpose**: Triggers HTTP webhooks configured for the form.

**Description**:
- Executes all enabled webhooks configured for the form version
- Webhooks are configured separately via the Admin API
- Supports custom headers, body templates, and field selection
- Includes HMAC signature for security

**Configuration**:
```json
{
  "type": "webhooks",
  "enabled": true
}
```

**Webhook Configuration** (via Admin API):
```json
{
  "type": "http",
  "endpoint_url": "https://example.com/webhook",
  "http_method": "POST",
  "content_type": "application/json",
  "headers": {
    "Authorization": "Bearer token123"
  },
  "body_template": "{\"formId\":\"{{.formId}}\",\"answers\":{{json .answers}}}",
  "selected_fields": ["name", "email"],
  "mode": "raw",
  "enabled": true
}
```

**Execution**:
- Fetches enabled webhooks for the form version
- For each webhook:
  - Builds request body (from template or default)
  - Adds custom headers
  - Adds system headers (`X-Form-Id`, `X-Form-Version`, `X-Signature`)
  - Sends HTTP request with retries
  - Logs results

**Request Headers**:
```
Content-Type: application/json
X-Form-Id: form_123
X-Form-Version: 1
X-Signature: sha256=<hmac_signature>
Authorization: Bearer token123  (custom header)
```

**Body Template Variables**:
- `{{.formId}}` - Form ID
- `{{.version}}` - Form version
- `{{.submissionId}}` - Submission ID (if available)
- `{{.submittedAt}}` - Submission timestamp
- `{{.answers}}` - All form answers
- `{{.selected}}` - Selected fields only
- `{{.meta}}` - Submission metadata
- `{{json .answers}}` - JSON-encoded answers (via `json` function)
- Individual field values: `{{.name}}`, `{{.email}}`, etc.

**Retry Logic**:
- Maximum retries: 3 (configurable via `WEBHOOK_MAX_RETRIES`)
- Backoff: 1500ms between retries (configurable via `WEBHOOK_RETRY_BACKOFF_MS`)
- Timeout: 8000ms per request (configurable via `WEBHOOK_TIMEOUT_MS`)

**Error Handling**:
- Network errors trigger retries
- Non-2xx responses are logged but don't fail the pipeline (unless `on_error: stop`)
- Timeouts are logged and retried

**Notes**:
- Webhooks run asynchronously and don't block the submission pipeline
- HMAC signature is calculated using `WEBHOOK_SIGNING_KEY` environment variable
- Webhooks can be tested via Admin API: `POST /api/forms/{formId}/{version}/webhooks/{id}/test`

---

### 3. `redirect`

**Purpose**: Redirects the user to a specified URL after submission.

**Description**:
- Performs a browser redirect after other actions complete
- Typically used for thank you pages or external redirects
- Only executes if enabled and URL is provided
- Supports template placeholders for dynamic URLs

**Configuration**:
```json
{
  "type": "redirect",
  "enabled": true,
  "url": "https://example.com/thank-you"
}
```

**Template Support**:
The redirect URL supports Go-style template syntax with placeholders that are filled at submission time:

```json
{
  "type": "redirect",
  "enabled": true,
  "url": "https://www.example.com/booking?formSubmissionId={{.submissionId}}&name={{.name}}"
}
```

**Available Template Variables**:
- `{{.formId}}` - Form ID
- `{{.version}}` - Form version number
- `{{.submittedAt}}` - Submission timestamp (milliseconds)
- `{{.submissionId}}` - Database submission ID (requires `server_persist` to run first)
- `{{.answers}}` - All form answers (object, use individual field names instead)
- `{{.meta}}` - Submission metadata (object, use nested paths like `meta.locale`)
- `{{.fieldName}}` - Individual answer field (e.g., `{{.name}}`, `{{.email}}`)
- `{{.meta.locale}}` - Nested meta values
- `{{.meta.sessionId}}` - Session ID from metadata

**Template Examples**:
```json
// With submission ID
"url": "https://www.example.com/booking?formSubmissionId={{.submissionId}}"

// With form data
"url": "https://www.example.com/thank-you?formId={{.formId}}&version={{.version}}&submissionId={{.submissionId}}"

// With answer fields
"url": "https://www.example.com/profile?name={{.name}}&email={{.email}}"

// With metadata
"url": "https://www.example.com/result?locale={{.meta.locale}}&sessionId={{.meta.sessionId}}"

// Mixed static and dynamic
"url": "https://www.example.com/booking/{{.submissionId}}?ref=form&name={{.name}}"
```

**Value Formatting**:
- **Strings/Numbers**: Used as-is
- **Phone numbers**: E.164 format (e.g., `+96550000000`)
- **Select/Radio**: Selected value, or "other" text if custom option selected
- **Multiselect**: Comma-separated values
- **Location**: Coordinates as `"29.375900,47.977400"`
- **File upload**: File URL
- **Arrays**: Comma-separated string
- **Objects**: JSON string (or extracted value like phone.e164)

**URL Encoding**:
- Template values in query parameters are automatically URL-encoded
- Example: `{{.name}}` = "John Doe" → `John%20Doe` in URL

**Execution**:
- Template evaluation happens client-side when redirect executes
- Sets `window.location.href` to the evaluated URL
- Executes after other actions complete (typically last)
- No network request - pure client-side redirect

**Static URL Examples** (backward compatible):
- Absolute URL: `"https://example.com/thank-you"`
- Relative URL: `"/thank-you"`
- With static query params: `"https://example.com/thank-you?ref=form"`

**Error Handling**:
- Invalid URLs may cause browser errors
- If template evaluation fails, falls back to original URL
- If fallback also fails, error is logged but doesn't stop pipeline
- Redirects are not retried
- If redirect fails, other actions continue (if `on_error: continue`)

**Notes**:
- Redirect typically runs last in the pipeline
- For `{{.submissionId}}` to work, ensure `server_persist` runs before `redirect` in the `ordering` array
- Can be combined with thank you message (redirect happens after message display)
- Static URLs (without `{{}}`) work exactly as before (backward compatible)
- Template values are automatically URL-encoded for query parameters

---

### 4. `native_bridge`

**Purpose**: Sends form data to native mobile app via bridge.

**Description**:
- Communicates with React Native WebView, iOS WKWebView, or Android WebView
- Sends submission data to native app for processing
- No-op in regular web browsers (silently succeeds)

**Configuration**:
```json
{
  "type": "native_bridge",
  "enabled": true
}
```

**Execution**:
- Detects available bridge:
  - React Native: `window.ReactNativeWebView.postMessage()`
  - iOS: `window.webkit.messageHandlers.bridge.postMessage()`
  - Android: `window.AndroidBridge.postMessage()`
- Sends JSON message with submission payload
- Returns success even if no bridge detected (web browser case)

**Message Format**:
```json
{
  "type": "form_submit",
  "payload": {
    "formId": "form_123",
    "version": 1,
    "submittedAt": 1704067200000,
    "answers": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "meta": {
      "locale": "en",
      "device": "mobile",
      "attributes": ["name", "email"],
      "sessionId": "abc123"
    },
    "bridgeAck": false
  }
}
```

**Bridge Detection**:
- React Native WebView: Checks for `window.ReactNativeWebView`
- iOS WKWebView: Checks for `window.webkit.messageHandlers.bridge`
- Android WebView: Checks for `window.AndroidBridge`
- Web Browser: No bridge detected, action succeeds silently

**Error Handling**:
- Bridge errors are logged but don't fail the pipeline
- If no bridge is available, action succeeds (no-op)
- Network errors don't apply (local bridge communication)

**Notes**:
- Typically runs first to send data to native app immediately
- Native app can acknowledge receipt via `bridgeAck` flag
- Works seamlessly in web browsers (no errors)

---

### 5. `nextjs_post`

**Purpose**: Sends formatted submission data to a Next.js API endpoint.

**Description**:
- Transforms answers into question-answer pairs with labels
- Posts to configured Next.js endpoint
- Uses submission ID from `server_persist` if available
- Only executes if configured via environment variables

**Configuration**:
```json
{
  "type": "nextjs_post",
  "enabled": true
}
```

**Environment Variables** (API server):
- `NEXTJS_POST_URL`: Next.js API endpoint URL
- `NEXTJS_POST_ENABLED`: Enable/disable Next.js POST feature

**Execution**:
- Fetches Next.js URL from `/api/config` endpoint (cached)
- Transforms answers to array format with question labels
- Formats answer values based on field type
- Posts to Next.js endpoint with submission data

**Payload Format**:
```json
{
  "submissionId": 42,
  "formId": "form_123",
  "version": 1,
  "submittedAt": 1704067200000,
  "locale": "en",
  "device": "web",
  "sessionId": "abc123",
  "answers": [
    {
      "question": "Full Name",
      "answer": "John Doe"
    },
    {
      "question": "Email Address",
      "answer": "john@example.com"
    },
    {
      "question": "Phone Number",
      "answer": "+96550000000"
    },
    {
      "question": "Preferred Language",
      "answer": "English"
    }
  ]
}
```

**Answer Formatting**:
- **Text/Email/Number**: String value
- **Boolean**: "Yes" / "No" (or "نعم" / "لا" in Arabic)
- **Phone**: E.164 format (e.g., `+96550000000`)
- **Select/Radio**: Selected option value, or "other" text if custom option
- **Multiselect**: Comma-separated values
- **Date/Time**: ISO 8601 format
- **Location**: Coordinates as `"29.375900, 47.977400"`
- **File Upload**: File URL or name
- **Array**: Comma-separated string

**Error Handling**:
- If Next.js URL not configured, action succeeds silently (no-op)
- Network errors are logged and can fail pipeline (depending on `on_error`)
- Non-2xx responses throw errors

**Notes**:
- Requires `server_persist` to run first to get submission ID
- Answer transformation uses form field labels in the submission locale
- Falls back to English labels if locale-specific label not available

---

## Execution Order

Actions execute in the order specified by the `ordering` array. Only enabled actions are executed.

**Default Order**:
1. `native_bridge` - Send to native app immediately
2. `server_persist` - Save to database
3. `webhooks` - Trigger webhooks
4. `nextjs_post` - Post to Next.js (requires submission ID)
5. `redirect` - Redirect user (typically last)

**Recommended Order**:
```json
{
  "ordering": ["native_bridge", "server_persist", "webhooks", "nextjs_post", "redirect"]
}
```

**Why This Order?**
- `native_bridge` first: Immediate feedback to native app
- `server_persist` second: Ensure data is saved before external calls
- `webhooks` third: Trigger external integrations
- `nextjs_post` fourth: Requires submission ID from `server_persist`
- `redirect` last: User-facing action after all backend operations

---

## Error Handling

The `on_error` field controls how errors are handled:

### `continue`
- Execution continues with remaining actions
- Errors are logged but don't stop the pipeline
- Best for non-critical actions (e.g., webhooks, analytics)

**Example**:
```json
{
  "on_error": "continue",
  "ordering": ["server_persist", "webhooks", "redirect"]
}
```
If `webhooks` fails, `redirect` still executes.

### `stop`
- Execution stops immediately on error
- Remaining actions are not executed
- Best for critical actions (e.g., `server_persist`)

**Example**:
```json
{
  "on_error": "stop",
  "ordering": ["server_persist", "webhooks"]
}
```
If `server_persist` fails, `webhooks` are not executed.

### `show_error`
- Displays error message to user
- Execution stops
- Best for user-facing errors

**Example**:
```json
{
  "on_error": "show_error",
  "ordering": ["server_persist", "redirect"]
}
```
If `server_persist` fails, user sees error alert and `redirect` doesn't execute.

---

## Timeouts

Each action has a maximum execution time specified by `timeout_ms`.

**Default**: 6000ms (6 seconds)

**Timeout Behavior**:
- Action execution is cancelled after timeout
- Error is thrown (handled according to `on_error`)
- Subsequent actions may still execute (if `on_error: continue`)

**Per-Action Timeouts**:
- `server_persist`: Typically fast (< 1s)
- `webhooks`: Can be slow (network dependent, 8s default)
- `nextjs_post`: Network dependent
- `redirect`: Instant (client-side)
- `native_bridge`: Instant (local communication)

**Recommendation**: Set `timeout_ms` to accommodate the slowest action (usually webhooks).

---

## Idempotency

Prevents duplicate submissions using a key from submission metadata.

**Configuration**:
```json
{
  "idempotency": {
    "enabled": true,
    "key": "sessionId"
  }
}
```

**How It Works**:
1. Extract idempotency key from `meta` object (e.g., `meta.sessionId`)
2. Check if submission with same form/version/key exists
3. If exists, return `409 Conflict` without creating duplicate
4. If not exists, create submission normally

**Use Cases**:
- Prevent double-submission from button double-clicks
- Prevent duplicate submissions from network retries
- Track submissions per session/user

**Key Selection**:
- `"sessionId"`: Per-session uniqueness
- `"userId"`: Per-user uniqueness
- `"deviceId"`: Per-device uniqueness
- Custom field: Any unique identifier

**Example**:
```json
{
  "meta": {
    "sessionId": "abc123",
    "userId": "user_456",
    "device": "mobile"
  }
}
```

With `"key": "sessionId"`, duplicate submissions with the same `sessionId` are rejected.

---

## Complete Examples

### Example 1: Simple Contact Form

Save to database only:

```json
{
  "submit": {
    "actions": [
      {
        "type": "server_persist",
        "enabled": true
      }
    ],
    "ordering": ["server_persist"],
    "timeout_ms": 5000,
    "on_error": "show_error",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

### Example 2: Form with Webhooks and Redirect

Save, trigger webhooks, then redirect:

```json
{
  "submit": {
    "actions": [
      {
        "type": "server_persist",
        "enabled": true
      },
      {
        "type": "webhooks",
        "enabled": true
      },
      {
        "type": "redirect",
        "enabled": true,
        "url": "https://example.com/thank-you"
      }
    ],
    "ordering": ["server_persist", "webhooks", "redirect"],
    "timeout_ms": 10000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

### Example 2a: Redirect with Template Placeholders

Redirect with dynamic submission ID and form data:

```json
{
  "submit": {
    "actions": [
      {
        "type": "server_persist",
        "enabled": true
      },
      {
        "type": "redirect",
        "enabled": true,
        "url": "https://www.example.com/booking?formSubmissionId={{.submissionId}}&formId={{.formId}}&name={{.name}}"
      }
    ],
    "ordering": ["server_persist", "redirect"],
    "timeout_ms": 5000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

**Result URL** (example):
- `submissionId` = 42
- `formId` = "form_123"
- `name` = "John Doe"
- **Final URL**: `https://www.example.com/booking?formSubmissionId=42&formId=form_123&name=John%20Doe`

### Example 3: Mobile App Form

Send to native app, save to database:

```json
{
  "submit": {
    "actions": [
      {
        "type": "native_bridge",
        "enabled": true
      },
      {
        "type": "server_persist",
        "enabled": true
      }
    ],
    "ordering": ["native_bridge", "server_persist"],
    "timeout_ms": 5000,
    "on_error": "stop",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

### Example 4: Full Pipeline

All actions enabled:

```json
{
  "submit": {
    "actions": [
      {
        "type": "native_bridge",
        "enabled": true
      },
      {
        "type": "server_persist",
        "enabled": true
      },
      {
        "type": "webhooks",
        "enabled": true
      },
      {
        "type": "nextjs_post",
        "enabled": true
      },
      {
        "type": "redirect",
        "enabled": true,
        "url": "https://example.com/thank-you"
      }
    ],
    "ordering": ["native_bridge", "server_persist", "webhooks", "nextjs_post", "redirect"],
    "timeout_ms": 15000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

---

## API Endpoints

### Create Form with Submit Actions

```bash
POST /api/forms/publish
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "formId": "form_123",
  "title": {
    "en": "Contact Form",
    "ar": "نموذج الاتصال"
  },
  "fields": [...],
  "submit": {
    "actions": [
      {"type": "server_persist", "enabled": true}
    ],
    "ordering": ["server_persist"],
    "timeout_ms": 6000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

### Submit Form

```bash
POST /api/submissions
Content-Type: application/json

{
  "formId": "form_123",
  "version": 1,
  "submittedAt": 1704067200000,
  "answers": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "locale": "en",
    "device": "web",
    "attributes": ["name", "email"],
    "sessionId": "abc123"
  }
}
```

---

## Best Practices

1. **Always enable `server_persist`**: Ensure data is saved
2. **Use idempotency**: Prevent duplicate submissions
3. **Order actions logically**: Critical actions first, user-facing last
4. **Set appropriate timeouts**: Account for network latency
5. **Handle errors gracefully**: Use `continue` for non-critical actions
6. **Test webhooks**: Use test endpoint before going live
7. **Monitor submissions**: Check logs for failed actions
8. **Use redirect last**: Redirect after all backend operations complete

---

## Troubleshooting

### Submission Not Saving

- Check `server_persist` is enabled
- Verify form version exists
- Check database connection
- Review validation errors

### Webhooks Not Firing

- Verify webhooks are enabled for form version
- Check webhook endpoint is accessible
- Review webhook logs
- Test webhook via Admin API

### Redirect Not Working

- Verify redirect URL is valid
- Check redirect is enabled
- Ensure redirect is last in ordering
- Check browser console for errors

### Next.js POST Not Working

- Verify `NEXTJS_POST_ENABLED=true`
- Check `NEXTJS_POST_URL` is set
- Ensure `server_persist` runs first
- Review Next.js endpoint logs

### Native Bridge Not Working

- Verify bridge is available in WebView
- Check bridge message format
- Review native app logs
- Test in WebView environment

---

## Related Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Native Bridge Implementation](./NATIVE_BRIDGE_IMPLEMENTATION.md) - Native bridge details
- [Webhook Configuration](./CREATE_FORM_CURL.md#webhooks) - Webhook setup guide
- [Form Creation Guide](./CREATE_FORM_CURL.md) - Form creation examples

