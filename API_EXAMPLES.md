# API Call Examples

## Base URL
```
http://localhost:8080/api
```

## Authentication
All requests require the `Authorization` header:
```
Authorization: Bearer dev-admin-token
```

---

## 1. Create/Publish a Normal Form

**Endpoint:** `POST /api/forms/publish`

**Request:**
```bash
curl -X POST "http://localhost:8080/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {
      "en": "Contact Us Form",
      "ar": "نموذج الاتصال بنا"
    },
    "attributes": ["hero_banner", "contact_preference", "phone_number"],
    "form_type": "normal",
    "submit": {
      "actions": [
        {
          "type": "server_persist",
          "enabled": true
        }
      ],
      "ordering": ["server_persist"],
      "on_error": "continue"
    },
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "We have received your submission.",
        "ar": "لقد استلمنا طلبك."
      },
      "duration_ms": 3000,
      "close_behavior": "auto"
    }
  }'
```

**Response:**
```json
{
  "formId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 1,
  "isDuplicate": false,
  "urls": {
    "en": "http://localhost:8080/a1b2c3d4-e5f6-7890-abcd-ef1234567890/1?lang=en",
    "ar": "http://localhost:8080/a1b2c3d4-e5f6-7890-abcd-ef1234567890/1?lang=ar"
  }
}
```

**Note:** `form_type` can be omitted (defaults to "normal") or explicitly set to "normal".

---

## 2. Create/Publish a User-Specific Form

**Endpoint:** `POST /api/forms/publish`

**Request:**
```bash
curl -X POST "http://localhost:8080/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {
      "en": "Personal Survey",
      "ar": "استطلاع شخصي"
    },
    "attributes": ["hero_banner", "phone_number", "attachments"],
    "form_type": "user_specific",
    "user_token": "2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI",
    "submit": {
      "actions": [
        {
          "type": "server_persist",
          "enabled": true
        }
      ],
      "ordering": ["server_persist"],
      "on_error": "continue"
    },
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "Your response has been recorded.",
        "ar": "تم تسجيل ردك."
      },
      "duration_ms": 3000,
      "close_behavior": "auto"
    }
  }'
```

**Response:**
```json
{
  "formId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "version": 1,
  "instanceId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "isDuplicate": false,
  "urls": {
    "en": "http://localhost:8080/b2c3d4e5-f6a7-8901-bcde-f12345678901/1?lang=en&instanceId=c3d4e5f6-a7b8-9012-cdef-123456789012",
    "ar": "http://localhost:8080/b2c3d4e5-f6a7-8901-bcde-f12345678901/1?lang=ar&instanceId=c3d4e5f6-a7b8-9012-cdef-123456789012"
  }
}
```

**Key Differences:**
- `form_type` must be `"user_specific"`
- `user_token` is **required** (will return 400 error if missing)
- Response includes `instanceId` field
- URLs include `instanceId` query parameter

---

## 3. Retrieve a Normal Form

**Endpoint:** `GET /api/forms/{formId}/{version}`

**Request:**
```bash
curl "http://localhost:8080/api/forms/a1b2c3d4-e5f6-7890-abcd-ef1234567890/1" \
  -H "Authorization: Bearer dev-admin-token"
```

**Response:**
```json
{
  "formId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 1,
  "title": {
    "en": "Contact Us Form",
    "ar": "نموذج الاتصال بنا"
  },
  "fields": [...],
  "attributes": ["hero_banner", "contact_preference", "phone_number"],
  "form_type": "normal",
  "supported_locales": ["en", "ar"],
  "default_locale": "en",
  "submit": {...},
  "thankYou": {...}
}
```

---

## 4. Retrieve a User-Specific Form (with instanceId)

**Endpoint:** `GET /api/forms/{formId}/{version}?instanceId={instanceId}`

**Request:**
```bash
curl "http://localhost:8080/api/forms/b2c3d4e5-f6a7-8901-bcde-f12345678901/1?instanceId=c3d4e5f6-a7b8-9012-cdef-123456789012" \
  -H "Authorization: Bearer dev-admin-token"
```

**Response:**
```json
{
  "formId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "version": 1,
  "title": {
    "en": "Personal Survey",
    "ar": "استطلاع شخصي"
  },
  "fields": [...],
  "attributes": ["hero_banner", "phone_number", "attachments"],
  "form_type": "user_specific",
  "instance_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "instance_user_token": "2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI",
  "supported_locales": ["en", "ar"],
  "default_locale": "en",
  "submit": {...},
  "thankYou": {...}
}
```

**Key Points:**
- When `instanceId` query parameter is provided, the response includes:
  - `instance_id`: The instance ID
  - `instance_user_token`: The user token associated with this instance
- Without `instanceId`, these fields are not included in the response

---

## 5. Submit a Form (Normal)

**Endpoint:** `POST /api/submissions`

**Request:**
```bash
curl -X POST "http://localhost:8080/api/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "version": 1,
    "submittedAt": 1701436800000,
    "answers": {
      "contact_preference": "email",
      "phone_number": "+1234567890"
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["hero_banner", "contact_preference", "phone_number"],
      "sessionId": "session-abc-123"
    }
  }'
```

**Response:**
```json
{
  "id": 42,
  "ok": true,
  "submissionId": 42
}
```

---

## 6. Submit a User-Specific Form

**Endpoint:** `POST /api/submissions`

**Request:**
```bash
curl -X POST "http://localhost:8080/api/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "version": 1,
    "submittedAt": 1701436800000,
    "answers": {
      "phone_number": "+1234567890",
      "attachments": ["https://cloudinary.com/..."]
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["hero_banner", "phone_number", "attachments"],
      "sessionId": "session-xyz-789",
      "instance_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "user_id": 1885389
    }
  }'
```

**Response:**
```json
{
  "id": 43,
  "ok": true,
  "submissionId": 43
}
```

**Key Differences:**
- `meta.instance_id`: The instance ID from the form creation response
- `meta.user_id`: The user ID (integer) associated with the user_token

---

## Error Responses

### Missing user_token for user_specific form
```json
{
  "error": "user_token is required when form_type is 'user_specific'"
}
```
**Status:** 400 Bad Request

### Invalid form_type
```json
{
  "error": "invalid form_type, must be 'normal' or 'user_specific'"
}
```
**Status:** 400 Bad Request

### Missing attributes
```json
{
  "error": "missing attributes",
  "missing": ["invalid_attribute"]
}
```
**Status:** 422 Unprocessable Entity

---

## JavaScript/TypeScript Examples

### Normal Form
```typescript
const createNormalForm = async () => {
  const response = await fetch('http://localhost:8080/api/forms/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-admin-token'
    },
    body: JSON.stringify({
      title: {
        en: 'Contact Us Form',
        ar: 'نموذج الاتصال بنا'
      },
      attributes: ['hero_banner', 'contact_preference', 'phone_number'],
      form_type: 'normal',
      submit: {
        actions: [{ type: 'server_persist', enabled: true }],
        ordering: ['server_persist'],
        on_error: 'continue'
      }
    })
  });
  
  const data = await response.json();
  console.log('Form created:', data.formId);
  console.log('URL:', data.urls.en);
};
```

### User-Specific Form
```typescript
const createUserSpecificForm = async (userToken: string) => {
  const response = await fetch('http://localhost:8080/api/forms/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-admin-token'
    },
    body: JSON.stringify({
      title: {
        en: 'Personal Survey',
        ar: 'استطلاع شخصي'
      },
      attributes: ['hero_banner', 'phone_number'],
      form_type: 'user_specific',
      user_token: userToken, // Required!
      submit: {
        actions: [{ type: 'server_persist', enabled: true }],
        ordering: ['server_persist'],
        on_error: 'continue'
      }
    })
  });
  
  const data = await response.json();
  console.log('Form created:', data.formId);
  console.log('Instance ID:', data.instanceId);
  console.log('URL:', data.urls.en);
  
  return data;
};

// Usage
const formData = await createUserSpecificForm('2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI');
```

### Retrieve Form with Instance
```typescript
const getFormWithInstance = async (formId: string, version: number, instanceId: string) => {
  const response = await fetch(
    `http://localhost:8080/api/forms/${formId}/${version}?instanceId=${instanceId}`,
    {
      headers: {
        'Authorization': 'Bearer dev-admin-token'
      }
    }
  );
  
  const form = await response.json();
  console.log('Instance token:', form.instance_user_token);
  return form;
};
```



