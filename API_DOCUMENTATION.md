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
      }
    ],
    "ordering": ["native_bridge", "server_persist", "webhooks", "redirect"],
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
  - `redirect` action requires valid URL if enabled
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

## Notes

- All endpoints require bilingual content (English and Arabic) for titles, labels, and messages
- Form versions are auto-incremented - each publish creates a new version
- Attributes must exist in the questions table before they can be used in forms
- The API key endpoint (`/api/forms/create`) is more convenient for programmatic access
- The Bearer token endpoint (`/api/forms/publish`) is available for admin UI compatibility

