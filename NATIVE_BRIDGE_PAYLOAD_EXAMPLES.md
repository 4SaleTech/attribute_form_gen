# Native Bridge Payload Examples for All Field Types

This document shows how the native bridge payload looks for each field type when a form is submitted.

## Payload Structure

The native bridge sends a message with this overall structure:

```json
{
  "type": "form_submit",
  "payload": {
    "formId": "form-id",
    "version": 1,
    "submittedAt": 1234567890123,
    "answers": {
      "field_name": "value"
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["attribute1", "attribute2"],
      "sessionId": "session-id-here"
    }
  }
}
```

## Field Type Examples

### 1. Text (`text`)
Simple text input field.

**Payload:**
```json
{
  "type": "form_submit",
  "payload": {
    "formId": "example-form",
    "version": 1,
    "submittedAt": 1234567890123,
    "answers": {
      "full_name": "John Doe"
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["full_name"],
      "sessionId": ""
    }
  }
}
```

### 2. Textarea (`textarea`)
Multi-line text input.

**Payload:**
```json
{
  "answers": {
    "description": "This is a longer text that can span multiple lines.\nIt supports line breaks."
  }
}
```

### 3. Number (`number`)
Numeric input field.

**Payload:**
```json
{
  "answers": {
    "age": 25,
    "quantity": 10,
    "price": 99.99
  }
}
```

### 4. Email (`email`)
Email address input.

**Payload:**
```json
{
  "answers": {
    "email_address": "user@example.com"
  }
}
```

### 5. Phone (`phone`)
Phone number with country code.

**Payload:**
```json
{
  "answers": {
    "phone_number": {
      "e164": "+96550000000",
      "country": "KW"
    }
  }
}
```

**Note:** The phone field always returns an object with:
- `e164`: Full phone number in E.164 format (e.g., `+96550000000`)
- `country`: ISO country code (e.g., `KW`, `SA`, `US`)

### 6. Date (`date`)
Date picker field.

**Payload:**
```json
{
  "answers": {
    "birth_date": "2024-01-15"
  }
}
```

**Format:** `YYYY-MM-DD` (ISO 8601 date format)

### 7. Time (`time`)
Time picker field.

**Payload:**
```json
{
  "answers": {
    "appointment_time": "14:30"
  }
}
```

**Format:** `HH:MM` (24-hour format)

### 8. Select (`select`)
Single selection dropdown.

**Payload (regular option):**
```json
{
  "answers": {
    "country": {
      "value": "us"
    }
  }
}
```

**Payload (with "other" option selected):**
```json
{
  "answers": {
    "country": {
      "value": "other",
      "other": "Custom country name here"
    }
  }
}
```

**Note:** When "other" is selected, the `other` property contains the custom text entered by the user.

### 9. Radio (`radio`)
Single selection radio buttons.

**Payload (regular option):**
```json
{
  "answers": {
    "contact_preference": {
      "value": "email"
    }
  }
}
```

**Payload (with "other" option selected):**
```json
{
  "answers": {
    "contact_preference": {
      "value": "other",
      "other": "I prefer WhatsApp"
    }
  }
}
```

### 10. Multiselect (`multiselect`)
Multiple selection dropdown.

**Payload (multiple options):**
```json
{
  "answers": {
    "interests": [
      { "value": "sports" },
      { "value": "music" },
      { "value": "travel" }
    ]
  }
}
```

**Payload (with "other" option):**
```json
{
  "answers": {
    "interests": [
      { "value": "sports" },
      { "value": "other", "other": "Photography" }
    ]
  }
}
```

**Note:** Multiselect always returns an array of objects. Each object has a `value` property, and optionally an `other` property if "other" was selected.

### 11. Checkbox (`checkbox`)
Single checkbox (boolean).

**Payload:**
```json
{
  "answers": {
    "terms_accepted": true
  }
}
```

**Values:** `true` or `false` (boolean)

### 12. Switch (`switch`)
Toggle switch (boolean).

**Payload:**
```json
{
  "answers": {
    "notifications_enabled": true
  }
}
```

**Values:** `true` or `false` (boolean)

### 13. File Upload (`file_upload`)
File upload field.

**Payload (single file):**
```json
{
  "answers": {
    "profile_picture": {
      "id": "forms/uploads/form_abc123",
      "url": "https://res.cloudinary.com/cloud/image/upload/v1234567890/forms/uploads/form_abc123.jpg",
      "bytes": 245678,
      "resource_type": "image",
      "name": "profile.jpg"
    }
  }
}
```

**Payload (multiple files):**
```json
{
  "answers": {
    "documents": [
      {
        "id": "forms/uploads/form_doc1",
        "url": "https://res.cloudinary.com/cloud/image/upload/v1234567890/forms/uploads/form_doc1.pdf",
        "bytes": 1024567,
        "resource_type": "raw",
        "name": "document1.pdf"
      },
      {
        "id": "forms/uploads/form_doc2",
        "url": "https://res.cloudinary.com/cloud/image/upload/v1234567890/forms/uploads/form_doc2.pdf",
        "bytes": 2048123,
        "resource_type": "raw",
        "name": "document2.pdf"
      }
    ]
  }
}
```

**Note:** 
- Single file: Returns an object
- Multiple files: Returns an array of objects
- Each file object contains:
  - `id`: Cloudinary public ID
  - `url`: Secure URL to access the file
  - `bytes`: File size in bytes
  - `resource_type`: Type of resource (`image`, `video`, `raw`, etc.)
  - `name`: Original filename

### 14. Location (`location`)
Geolocation picker.

**Payload:**
```json
{
  "answers": {
    "current_location": {
      "lat": 29.3759,
      "lng": 47.9774,
      "accuracy": 10.5,
      "url": "https://www.google.com/maps?q=29.3759,47.9774"
    }
  }
}
```

**Note:** Location object contains:
- `lat`: Latitude (number)
- `lng`: Longitude (number)
- `accuracy`: Accuracy in meters (number)
- `url`: Google Maps URL for the coordinates

## Complete Example

Here's a complete example with multiple field types:

```json
{
  "type": "form_submit",
  "payload": {
    "formId": "service-request",
    "version": 1,
    "submittedAt": 1704067200000,
    "answers": {
      "full_name": "Ahmed Al-Sabah",
      "email": "ahmed@example.com",
      "phone_number": {
        "e164": "+96550000000",
        "country": "KW"
      },
      "birth_date": "1990-05-15",
      "appointment_time": "14:30",
      "service_type": {
        "value": "consultation"
      },
      "contact_preference": {
        "value": "phone"
      },
      "interests": [
        { "value": "health" },
        { "value": "wellness" }
      ],
      "terms_accepted": true,
      "notifications_enabled": false,
      "documents": [
        {
          "id": "forms/uploads/form_doc123",
          "url": "https://res.cloudinary.com/cloud/image/upload/v123/forms/uploads/form_doc123.pdf",
          "bytes": 1024567,
          "resource_type": "raw",
          "name": "id_document.pdf"
        }
      ],
      "current_location": {
        "lat": 29.3759,
        "lng": 47.9774,
        "accuracy": 10.5,
        "url": "https://www.google.com/maps?q=29.3759,47.9774"
      }
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": [
        "full_name",
        "email",
        "phone_number",
        "birth_date",
        "appointment_time",
        "service_type",
        "contact_preference",
        "interests",
        "terms_accepted",
        "notifications_enabled",
        "documents",
        "current_location"
      ],
      "sessionId": "session-abc123"
    }
  }
}
```

## Notes

1. **Field Names:** The field names in `answers` correspond to the `name` property of each field in the form configuration.

2. **Null/Empty Values:** Fields that are not filled or are optional will not appear in the `answers` object, or will have `null` values.

3. **"Other" Option:** For `select`, `radio`, and `multiselect` fields, when "other" is selected:
   - The `value` property is set to `"other"`
   - An `other` property contains the custom text entered by the user
   - The custom text is what should be used for processing/storage

4. **Arrays:** `multiselect` and `file_upload` (when multiple files allowed) always return arrays, even if only one item is selected.

5. **Booleans:** `checkbox` and `switch` fields return boolean values (`true`/`false`), not strings.

6. **Numbers:** `number` fields return actual numbers (not strings), and can be integers or decimals.

7. **Timestamps:** `submittedAt` is a Unix timestamp in milliseconds (number).

8. **Meta Information:** The `meta` object contains:
   - `locale`: The language locale (`en` or `ar`)
   - `device`: Device type (usually `"web"`)
   - `attributes`: Array of attribute keys used in the form
   - `sessionId`: Session identifier for idempotency (if enabled)

