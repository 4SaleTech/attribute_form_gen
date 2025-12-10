# Location Field Storage Format

## Database Storage

### Table Structure
```sql
submissions (
  id BIGINT UNSIGNED PRIMARY KEY,
  form_id VARCHAR(191),
  version INT,
  answers_json JSON,  -- Location data stored here
  ...
)
```

### Storage Format
Location data is stored in the `answers_json` column as part of the answers object. The entire `answers_json` is a JSON object where each field name maps to its answer value.

---

## Case 1: GPS Detected Location (with Reverse Geocoding)

### Frontend Submission Payload
```json
{
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "address": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
      "address_ar": "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت",
      "address_components": {
        "road": "Hamad Al-Mubarak Street",
        "neighbourhood": "Salmiya - Block 5",
        "city": "Salmiya",
        "state": "Hawalli Governorate",
        "postcode": "20004",
        "country": "Kuwait",
        "country_code": "kw"
      },
      "detection_method": "gps",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "meta": {
    "locale": "en",
    "device": "web"
  }
}
```

### Database Storage (`answers_json` column)
```json
{
  "location_field": {
    "lat": 29.3375,
    "lng": 48.0758,
    "accuracy": 10,
    "address": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
    "address_ar": "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت",
    "address_components": {
      "road": "Hamad Al-Mubarak Street",
      "neighbourhood": "Salmiya - Block 5",
      "city": "Salmiya",
      "state": "Hawalli Governorate",
      "postcode": "20004",
      "country": "Kuwait",
      "country_code": "kw"
    },
    "detection_method": "gps",
    "url": "https://www.google.com/maps?q=29.3375,48.0758"
  }
}
```

---

## Case 2: Manual Text Entry

### Frontend Submission Payload
```json
{
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "answers": {
    "location_field": {
      "address": "Block 10, Salmiya, Kuwait",
      "address_ar": "قطعة 10، السالمية، الكويت",
      "detection_method": "manual"
    }
  },
  "meta": {
    "locale": "en",
    "device": "web"
  }
}
```

### Database Storage (`answers_json` column)
```json
{
  "location_field": {
    "address": "Block 10, Salmiya, Kuwait",
    "address_ar": "قطعة 10، السالمية، الكويت",
    "detection_method": "manual"
  }
}
```

**Note:** No `lat`, `lng`, `accuracy`, or `url` fields for manual entries.

---

## Case 3: GPS Detected Then Edited

### Frontend Submission Payload
```json
{
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "address": "Block 10, Salmiya, Kuwait",  // User edited this
      "address_ar": "قطعة 10، السالمية، الكويت",
      "address_components": {
        "road": "Hamad Al-Mubarak Street",
        "neighbourhood": "Salmiya - Block 5",
        "city": "Salmiya",
        "state": "Hawalli Governorate",
        "postcode": "20004",
        "country": "Kuwait",
        "country_code": "kw"
      },
      "detection_method": "gps_edited",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "meta": {
    "locale": "en",
    "device": "web"
  }
}
```

### Database Storage (`answers_json` column)
```json
{
  "location_field": {
    "lat": 29.3375,
    "lng": 48.0758,
    "accuracy": 10,
    "address": "Block 10, Salmiya, Kuwait",
    "address_ar": "قطعة 10، السالمية، الكويت",
    "address_components": {
      "road": "Hamad Al-Mubarak Street",
      "neighbourhood": "Salmiya - Block 5",
      "city": "Salmiya",
      "state": "Hawalli Governorate",
      "postcode": "20004",
      "country": "Kuwait",
      "country_code": "kw"
    },
    "detection_method": "gps_edited",
    "url": "https://www.google.com/maps?q=29.3375,48.0758"
  }
}
```

**Note:** Coordinates are preserved even though address text was edited.

---

## Case 4: GPS Detected (No Reverse Geocoding - Fallback)

### Frontend Submission Payload
```json
{
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "detection_method": "gps",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "meta": {
    "locale": "en",
    "device": "web"
  }
}
```

### Database Storage (`answers_json` column)
```json
{
  "location_field": {
    "lat": 29.3375,
    "lng": 48.0758,
    "accuracy": 10,
    "detection_method": "gps",
    "url": "https://www.google.com/maps?q=29.3375,48.0758"
  }
}
```

**Note:** No `address` field if reverse geocoding fails or is disabled.

---

## GET Submission API Response

### Endpoint
```
GET /api/submissions/{id}
Authorization: Bearer {admin_token}
```

### Response Format (Object Format - Default)

#### Case 1: GPS Detected with Address
```json
{
  "id": 123,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "address": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait",
      "address_ar": "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت",
      "address_components": {
        "road": "Hamad Al-Mubarak Street",
        "neighbourhood": "Salmiya - Block 5",
        "city": "Salmiya",
        "state": "Hawalli Governorate",
        "postcode": "20004",
        "country": "Kuwait",
        "country_code": "kw"
      },
      "detection_method": "gps",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 2: Manual Text Entry
```json
{
  "id": 124,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": {
    "location_field": {
      "address": "Block 10, Salmiya, Kuwait",
      "address_ar": "قطعة 10، السالمية، الكويت",
      "detection_method": "manual"
    }
  },
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 3: GPS Detected Then Edited
```json
{
  "id": 125,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "address": "Block 10, Salmiya, Kuwait",
      "address_ar": "قطعة 10، السالمية، الكويت",
      "address_components": {
        "road": "Hamad Al-Mubarak Street",
        "neighbourhood": "Salmiya - Block 5",
        "city": "Salmiya",
        "state": "Hawalli Governorate",
        "postcode": "20004",
        "country": "Kuwait",
        "country_code": "kw"
      },
      "detection_method": "gps_edited",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 4: GPS Only (No Address)
```json
{
  "id": 126,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": {
    "location_field": {
      "lat": 29.3375,
      "lng": 48.0758,
      "accuracy": 10,
      "detection_method": "gps",
      "url": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  },
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

### Response Format (Array Format)

#### Endpoint
```
GET /api/submissions/{id}?format=array
Authorization: Bearer {admin_token}
```

#### Case 1: GPS Detected with Address
```json
{
  "id": 123,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Location",
      "answer": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)"
    }
  ],
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 2: Manual Text Entry
```json
{
  "id": 124,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Location",
      "answer": "Block 10, Salmiya, Kuwait"
    }
  ],
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 3: GPS Detected Then Edited
```json
{
  "id": 125,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Location",
      "answer": "Block 10, Salmiya, Kuwait (29.337500, 48.075800)"
    }
  ],
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

#### Case 4: GPS Only (No Address)
```json
{
  "id": 126,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Location",
      "answer": "29.337500, 48.075800"
    }
  ],
  "attributes": {
    "hero_banner": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

## Formatting Logic for Array Format

### Current Implementation (Needs Update)
Currently, location is formatted as: `"29.337500, 48.075800"`

### Proposed Formatting Logic

```go
// In formatAnswerForArray function
if lat, ok := v["lat"].(float64); ok {
    lng, _ := v["lng"].(float64)
    address, hasAddress := v["address"].(string)
    
    if hasAddress && address != "" {
        // Has address: "Address Text (lat, lng)"
        return fmt.Sprintf("%s (%.6f, %.6f)", address, lat, lng)
    } else {
        // No address: just coordinates
        return fmt.Sprintf("%.6f, %.6f", lat, lng)
    }
}

// Manual entry (no coordinates)
if address, ok := v["address"].(string); ok && address != "" {
    if detectionMethod, _ := v["detection_method"].(string); detectionMethod == "manual" {
        return address
    }
}
```

### Resulting Array Format Examples

1. **GPS with Address**: `"Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)"`
2. **Manual Entry**: `"Block 10, Salmiya, Kuwait"`
3. **GPS Edited**: `"Block 10, Salmiya, Kuwait (29.337500, 48.075800)"`
4. **GPS Only**: `"29.337500, 48.075800"`

---

## Field Reference

### Location Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | number | Conditional | Latitude (required for GPS) |
| `lng` | number | Conditional | Longitude (required for GPS) |
| `accuracy` | number | Optional | GPS accuracy in meters |
| `address` | string | Conditional | Full address text (required for manual, optional for GPS) |
| `address_ar` | string | Optional | Arabic address text |
| `address_components` | object | Optional | Structured address components (road, city, etc.) |
| `detection_method` | string | Required | `"gps"`, `"manual"`, or `"gps_edited"` |
| `url` | string | Optional | Maps URL (usually for GPS) |

### Detection Method Values

- `"gps"`: Location detected via GPS, address from reverse geocoding
- `"manual"`: User typed address manually, no coordinates
- `"gps_edited"`: GPS detected but user edited the address text

---

## Database Query Examples

### Get All Submissions with Location Field
```sql
SELECT 
  id,
  form_id,
  version,
  JSON_EXTRACT(answers_json, '$.location_field') as location_data
FROM submissions
WHERE JSON_EXTRACT(answers_json, '$.location_field') IS NOT NULL;
```

### Get Submissions with GPS Coordinates
```sql
SELECT 
  id,
  form_id,
  JSON_EXTRACT(answers_json, '$.location_field.lat') as latitude,
  JSON_EXTRACT(answers_json, '$.location_field.lng') as longitude,
  JSON_EXTRACT(answers_json, '$.location_field.address') as address
FROM submissions
WHERE JSON_EXTRACT(answers_json, '$.location_field.lat') IS NOT NULL;
```

### Get Manual Location Entries
```sql
SELECT 
  id,
  form_id,
  JSON_EXTRACT(answers_json, '$.location_field.address') as address
FROM submissions
WHERE JSON_EXTRACT(answers_json, '$.location_field.detection_method') = 'manual';
```

---

## Summary

1. **Database**: All location data stored as JSON in `answers_json` column
2. **Object Format**: Returns full location object with all fields
3. **Array Format**: Formats as readable string with address and/or coordinates
4. **Backward Compatible**: Existing GPS-only locations still work
5. **Flexible**: Supports GPS, manual, and hybrid (GPS + edited) entries



