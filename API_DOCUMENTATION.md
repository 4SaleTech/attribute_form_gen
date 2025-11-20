# Form Creation API Documentation

## Overview

The Form Creation API allows you to create and manage forms programmatically without using the admin UI. There are two ways to authenticate:

1. **Bearer Token**: Traditional Authorization header
2. **API Key**: X-API-Key header or query parameter (more convenient for programmatic access)

## Authentication

Both authentication methods use the same token/key value (configured via `ADMIN_TOKEN` environment variable).

### Method 1: Bearer Token
```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '...'
```

### Method 2: API Key Header
```bash
curl -X POST http://localhost:8080/api/forms/create \
  -H "X-API-Key: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '...'
```

### Method 3: API Key Query Parameter
```bash
curl -X POST "http://localhost:8080/api/forms/create?api_key=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '...'
```

## Endpoints

### 1. Create/Publish Form

**Endpoint**: `POST /api/forms/create` (public with API key) or `POST /api/forms/publish` (admin with Bearer token)

**Description**: Creates a new form version and saves it to the database.

**Request Body**:
```json
{
  "title": {
    "en": "English Title",
    "ar": "العنوان العربي"
  },
  "attributes": ["attribute1", "attribute2"],
  "thankYou": {
    "show": true,
    "title": {
      "en": "Thank You!",
      "ar": "شكراً لك!"
    },
    "message": {
      "en": "Your submission was successful.",
      "ar": "تم إرسال طلبك بنجاح."
    }
  },
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
        "enabled": false
      },
      {
        "type": "redirect",
        "enabled": false,
        "url": ""
      },
      {
        "type": "nextjs_post",
        "enabled": false
      }
    ],
    "ordering": ["native_bridge", "server_persist", "webhooks", "nextjs_post", "redirect"],
    "timeout_ms": 6000,
    "on_error": "continue",
    "idempotency": {
      "enabled": true,
      "key": "sessionId"
    }
  }
}
```

**Response** (Success):
```json
{
  "formId": "550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "urls": {
    "en": "http://localhost:5174/550e8400-e29b-41d4-a716-446655440000/1?lang=en",
    "ar": "http://localhost:5174/550e8400-e29b-41d4-a716-446655440000/1?lang=ar"
  }
}

**Note:** The `formId` in the response will be the auto-generated UUID (if not provided in request) or the one you provided.
```

**Response** (Error):
```json
{
  "error": "bilingual required",
  "details": [
    "/title: missing en/ar",
    "/fields/0/label: missing en/ar"
  ]
}
```

**Validation Rules**:
- `formId`: Optional string. If not provided, a UUID will be automatically generated. You can optionally provide your own unique identifier.
- `title`: Required object with both `en` and `ar` keys
- `attributes`: Required array of attribute keys (must exist in questions table)
- `thankYou`: Optional object, but if provided, must have bilingual `title` and `message`
- `submit`: Optional object, but if provided:
  - Must have at least one enabled action
  - `redirect` action requires valid URL if enabled (supports template placeholders like `{{.submissionId}}`, `{{.formId}}`, `{{.fieldName}}`)
  - Valid `on_error` values: `"continue"`, `"stop"`, `"show_error"`

### 2. Generate Form (Preview)

**Endpoint**: `POST /api/forms/generate`

**Description**: Generates a form configuration without saving it. Useful for previewing or validation.

**Request Body**: Same as Create Form, plus optional `onMissing` field:
```json
{
  "title": {...},
  "attributes": [...],
  "thankYou": {...},
  "submit": {...},
  "onMissing": "skip" // or "error" or "placeholder"
}
```

**Response**: Returns full `FormConfig` object (same structure as GET endpoints)

### 3. Get Form (Latest Version)

**Endpoint**: `GET /api/forms/:formId/latest`

**Description**: Retrieves the latest version of a form.

**Response**:
```json
{
  "formId": "my-form-id",
  "version": 1,
  "title": {...},
  "fields": [...],
  "attributes": [...],
  "thankYou": {...},
  "submit": {...},
  "supportedLocales": ["en", "ar"],
  "defaultLocale": "en"
}
```

### 4. Get Form (Specific Version)

**Endpoint**: `GET /api/forms/:formId/:version`

**Description**: Retrieves a specific version of a form.

**Response**: Same as Get Latest Form

## Example Usage

### Create a Form with cURL

```bash
curl -X POST http://localhost:8080/api/forms/create \
  -H "X-API-Key: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Contact Us",
      "ar": "اتصل بنا"
    },
    "attributes": ["name", "email", "message"],
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
        {"type": "server_persist", "enabled": true}
      ],
      "ordering": ["server_persist"],
      "timeout_ms": 5000,
      "on_error": "show_error"
    }
  }'
```

### Create a Form with JavaScript

```javascript
const response = await fetch('http://localhost:8080/api/forms/create', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    formId: 'contact-form',
    title: {
      en: 'Contact Us',
      ar: 'اتصل بنا'
    },
    attributes: ['name', 'email', 'message'],
    thankYou: {
      show: true,
      title: {
        en: 'Thank You!',
        ar: 'شكراً لك!'
      },
      message: {
        en: 'We will get back to you soon.',
        ar: 'سنتواصل معك قريباً.'
      }
    },
    submit: {
      actions: [
        { type: 'server_persist', enabled: true }
      ],
      ordering: ['server_persist'],
      timeout_ms: 5000,
      on_error: 'show_error'
    }
  })
});

const result = await response.json();
console.log('Form created:', result);
// Result includes:
// {
//   formId: 'contact-form',
//   version: 1,
//   urls: {
//     en: 'http://localhost:5174/contact-form/1?lang=en',
//     ar: 'http://localhost:5174/contact-form/1?lang=ar'
//   }
// }
```

### Create a Form with Python

```python
import requests

url = "http://localhost:8080/api/forms/create"
headers = {
    "X-API-Key": "your-admin-token",
    "Content-Type": "application/json"
}
data = {
    "formId": "contact-form",
    "title": {
        "en": "Contact Us",
        "ar": "اتصل بنا"
    },
    "attributes": ["name", "email", "message"],
    "thankYou": {
        "show": True,
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
            {"type": "server_persist", "enabled": True}
        ],
        "ordering": ["server_persist"],
        "timeout_ms": 5000,
        "on_error": "show_error"
    }
}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result)
# Result includes:
# {
#   'formId': 'contact-form',
#   'version': 1,
#   'urls': {
#     'en': 'http://localhost:5174/contact-form/1?lang=en',
#     'ar': 'http://localhost:5174/contact-form/1?lang=ar'
#   }
# }
```

## Submissions API

### 1. Submit Form

**Endpoint**: `POST /api/submissions`

**Description**: Submit a form response. This is the public endpoint used by the form renderer.

**Authentication**: None required (public endpoint)

**Request Body**:
```json
{
  "formId": "my-form-id",
  "version": 1,
  "submittedAt": 1704067200000,
  "answers": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": {
      "e164": "+96550012345",
      "country": "KW"
    }
  },
  "meta": {
    "locale": "en",
    "device": "web",
    "attributes": ["name", "email", "phone"],
    "sessionId": "abc123"
  }
}
```

**Response** (Success):
```json
{
  "ok": true,
  "id": 42,
  "submissionId": 42
}
```

**Response** (Validation Error):
```json
{
  "error": "validation failed",
  "errors": [
    {
      "field": "email",
      "code": "REQUIRED",
      "message": {
        "en": "Email is required",
        "ar": "البريد الإلكتروني مطلوب"
      }
    }
  ]
}
```

**Response** (Idempotency Conflict):
```json
{
  "error": "duplicate submission",
  "id": 42
}
```

**Notes**:
- `submittedAt`: Optional timestamp in milliseconds (defaults to current time)
- `answers`: Object with field names as keys and answer values
- `meta.sessionId`: Used for idempotency if enabled in form config
- See [SUBMISSION_ANSWER_FORMATS.md](./SUBMISSION_ANSWER_FORMATS.md) for answer value formats

---

### 2. List Submissions (Admin)

**Endpoint**: `GET /api/submissions`

**Description**: List form submissions with optional filtering.

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `formId` (optional): Filter by form ID
- `version` (optional): Filter by form version (requires `formId`)
- `limit` (optional): Maximum number of results (default: 100, max: 1000)
- `offset` (optional): Number of results to skip (default: 0)

**Example Requests**:
```bash
# List all submissions
curl "http://localhost:8080/api/submissions" \
  -H "Authorization: Bearer dev-admin-token"

# List submissions for a specific form
curl "http://localhost:8080/api/submissions?formId=my-form-id" \
  -H "Authorization: Bearer dev-admin-token"

# List submissions for a specific form version
curl "http://localhost:8080/api/submissions?formId=my-form-id&version=1" \
  -H "Authorization: Bearer dev-admin-token"

# Paginated results
curl "http://localhost:8080/api/submissions?limit=50&offset=0" \
  -H "Authorization: Bearer dev-admin-token"
```

**Response**:
```json
[
  {
    "id": 1,
    "formId": "my-form-id",
    "version": 1,
    "submittedAt": 1704067200000,
    "locale": "en",
    "device": "web",
    "answers": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "attributes": {},
    "idempotencyKey": "abc123",
    "webhookStatus": "success",
    "createdAt": "2025-11-13T10:00:00Z"
  }
]
```

---

### 3. Get Submission by ID (Admin)

**Endpoint**: `GET /api/submissions/:id`

**Description**: Retrieve a single submission by its ID.

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `format` (optional): Response format - `"object"` (default) or `"array"`

**Example Requests**:
```bash
# Get submission in object format (default)
curl "http://localhost:8080/api/submissions/42" \
  -H "Authorization: Bearer dev-admin-token"

# Get submission in array format
curl "http://localhost:8080/api/submissions/42?format=array" \
  -H "Authorization: Bearer dev-admin-token"
```

**Response** (Object Format - default):
```json
{
  "id": 42,
  "formId": "my-form-id",
  "version": 1,
  "submittedAt": 1704067200000,
  "locale": "en",
  "device": "web",
  "answers": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": {
      "e164": "+96550012345",
      "country": "KW"
    }
  },
  "attributes": {},
  "idempotencyKey": "abc123",
  "webhookStatus": "success",
  "createdAt": "2025-11-13T10:00:00Z"
}
```

**Response** (Array Format - `?format=array`):
```json
{
  "id": 42,
  "formId": "my-form-id",
  "version": 1,
  "submittedAt": 1704067200000,
  "locale": "en",
  "device": "web",
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
      "answer": "+96550012345"
    }
  ],
  "attributes": {},
  "idempotencyKey": "abc123",
  "webhookStatus": "success",
  "createdAt": "2025-11-13T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid submission ID format
  ```json
  {"error": "invalid submission id"}
  ```
- `401 Unauthorized`: Missing or invalid authentication
  ```json
  {"error": "missing bearer"}
  ```
- `404 Not Found`: Submission not found
  ```json
  {"error": "submission not found"}
  ```

**Format Comparison**:
- **Object Format** (`format=object` or default): Answers as object with field names as keys. Preserves data types (string, number, boolean, object, array).
- **Array Format** (`format=array`): Answers as array of `{question, answer}` objects. All answers converted to strings. Question labels use form field labels.

**See Also**: [SUBMISSION_ANSWER_FORMATS.md](./SUBMISSION_ANSWER_FORMATS.md) for detailed examples of all field types in both formats.

---

## Notes

- All endpoints require bilingual content (English and Arabic) for titles, labels, and messages
- Form versions are auto-incremented - each publish creates a new version
- Attributes must exist in the questions table before they can be used in forms
- The API key endpoint (`/api/forms/create`) is more convenient for programmatic access
- The Bearer token endpoint (`/api/forms/publish`) is available for admin UI compatibility
- Redirect URLs support template placeholders: `{{.submissionId}}`, `{{.formId}}`, `{{.fieldName}}`, etc.

