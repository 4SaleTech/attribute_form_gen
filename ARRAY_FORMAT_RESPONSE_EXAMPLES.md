# Array Format Response Examples (With Attributes & Google Maps Links)

## Current Response Format

### Current Structure
```json
{
  "id": 123,
  "answers": [
    {
      "question": "Location",
      "answer": "29.337500, 48.075800"
    }
  ]
}
```

---

## Proposed Response Format

### New Structure
```json
{
  "id": 123,
  "answers": [
    {
      "question": "Location",
      "answer": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  ]
}
```

---

## Example 1: Complete Form Submission (All Field Types)

### Request
```
GET /api/submissions/123?format=array
Authorization: Bearer {admin_token}
```

### Response
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
      "question": "Hero Banner",
      "answer": "",
      "attribute": "hero_banner"
    },
    {
      "question": "How should we contact you?",
      "answer": "Phone",
      "attribute": "contact_pref"
    },
    {
      "question": "Phone number",
      "answer": "+96550000000",
      "attribute": "phone_number"
    },
    {
      "question": "Location",
      "answer": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    },
    {
      "question": "Attachments",
      "answer": "https://res.cloudinary.com/example/image/upload/v123/file.jpg",
      "attribute": "attachments"
    }
  ],
  "attributes": {
    "hero_banner": true,
    "contact_pref": true,
    "phone_number": true,
    "location_area_block_landmark": true,
    "attachments": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

## Example 2: Location Field - GPS Detected with Address

### Response
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
      "answer": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  ],
  "attributes": {
    "location_area_block_landmark": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

## Example 3: Location Field - Manual Text Entry

### Response
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
      "answer": "Block 10, Salmiya, Kuwait",
      "attribute": "location_area_block_landmark",
      "mapsUrl": null
    }
  ],
  "attributes": {
    "location_area_block_landmark": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

**Note:** `mapsUrl` is `null` for manual entries since there are no coordinates.

---

## Example 4: Location Field - GPS Detected Then Edited

### Response
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
      "answer": "Block 10, Salmiya, Kuwait (29.337500, 48.075800)",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  ],
  "attributes": {
    "location_area_block_landmark": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

**Note:** `mapsUrl` is still included because coordinates exist, even though address was edited.

---

## Example 5: Location Field - GPS Only (No Reverse Geocoding)

### Response
```json
{
  "id": 127,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Location",
      "answer": "29.337500, 48.075800",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    }
  ],
  "attributes": {
    "location_area_block_landmark": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

**Note:** `mapsUrl` is included even when there's no address text.

---

## Example 6: Multiple Location Fields

### Response
```json
{
  "id": 128,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Pickup Location",
      "answer": "Arabian Gulf Street, Sharq, Dasman, Capital Governorate, 13021, Kuwait (29.389700, 48.003100)",
      "attribute": "pickup_location",
      "mapsUrl": "https://www.google.com/maps?q=29.3897,48.0031"
    },
    {
      "question": "Delivery Location",
      "answer": "Block 10, Salmiya, Kuwait",
      "attribute": "delivery_location",
      "mapsUrl": null
    }
  ],
  "attributes": {
    "pickup_location": true,
    "delivery_location": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

## Example 7: Non-Location Fields (No mapsUrl)

### Response
```json
{
  "id": 129,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "en",
  "device": "web",
  "answers": [
    {
      "question": "Phone number",
      "answer": "+96550000000",
      "attribute": "phone_number"
    },
    {
      "question": "Email",
      "answer": "user@example.com",
      "attribute": "email_address"
    },
    {
      "question": "Preferred contact method",
      "answer": "Phone",
      "attribute": "contact_pref"
    },
    {
      "question": "Attachments",
      "answer": "https://res.cloudinary.com/example/image/upload/v123/file1.jpg, https://res.cloudinary.com/example/image/upload/v123/file2.jpg",
      "attribute": "attachments"
    }
  ],
  "attributes": {
    "phone_number": true,
    "email_address": true,
    "contact_pref": true,
    "attachments": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

**Note:** Non-location fields don't have `mapsUrl` field at all (not even `null`).

---

## Example 8: Arabic Locale Response

### Request
```
GET /api/submissions/130?format=array
Authorization: Bearer {admin_token}
```

### Response
```json
{
  "id": 130,
  "formId": "abc-123",
  "version": 1,
  "submittedAt": 1701234567890,
  "locale": "ar",
  "device": "web",
  "answers": [
    {
      "question": "الموقع",
      "answer": "شارع حمد المبارك, السالمية - قطعة 5, السالمية, محافظة حولي, 20004, الكويت (29.337500, 48.075800)",
      "attribute": "location_area_block_landmark",
      "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
    },
    {
      "question": "رقم الهاتف",
      "answer": "+96550000000",
      "attribute": "phone_number"
    }
  ],
  "attributes": {
    "location_area_block_landmark": true,
    "phone_number": true
  },
  "idempotencyKey": null,
  "webhookStatus": "pending",
  "createdAt": "2024-12-01T12:00:00Z"
}
```

---

## Field Structure Summary

### For All Fields
```typescript
{
  question: string;    // Field label in submission locale
  answer: string;     // Formatted answer value
  attribute: string;  // Attribute key (e.g., "location_area_block_landmark")
}
```

### For Location Fields Only
```typescript
{
  question: string;    // Field label in submission locale
  answer: string;     // Formatted answer (address + coordinates if available)
  attribute: string;  // Attribute key
  mapsUrl: string | null;  // Google Maps URL (null if no coordinates)
}
```

---

## Answer Formatting Rules

### Location Field Answer Format

1. **GPS with Address**: 
   - `"{address} ({lat}, {lng})"`
   - Example: `"Salmiya - Block 5, Kuwait (29.337500, 48.075800)"`

2. **Manual Entry**: 
   - `"{address}"`
   - Example: `"Block 10, Salmiya, Kuwait"`

3. **GPS Edited**: 
   - `"{edited_address} ({lat}, {lng})"`
   - Example: `"Block 10, Salmiya, Kuwait (29.337500, 48.075800)"`

4. **GPS Only (No Address)**: 
   - `"{lat}, {lng}"`
   - Example: `"29.337500, 48.075800"`

### Maps URL Format

- **Format**: `"https://www.google.com/maps?q={lat},{lng}"`
- **Present**: When `lat` and `lng` exist in location object
- **Null**: When location is manual entry (no coordinates)
- **Not Present**: For non-location fields

---

## Implementation Notes

### Data Sources

1. **Attribute Key**: 
   - Fetched from `form_snapshots.fields_json` 
   - Each field has `attribute_key` property
   - Map field name → attribute_key

2. **Maps URL**: 
   - Extracted from location object's `url` field if present
   - Or constructed from `lat` and `lng` if `url` not present
   - Format: `https://www.google.com/maps?q={lat},{lng}`

3. **Field Type Detection**: 
   - Check field's `type` property from `fields_json`
   - If `type === "location"`, include `mapsUrl` field

### Response Structure Changes

**Before:**
```json
{
  "answers": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
```

**After:**
```json
{
  "answers": [
    {
      "question": "...",
      "answer": "...",
      "attribute": "...",
      "mapsUrl": "..."  // Only for location fields
    }
  ]
}
```

---

## Backward Compatibility

- **Object Format** (`?format=object` or no format): Unchanged
- **Array Format** (`?format=array`): Enhanced with `attribute` and `mapsUrl` fields
- **Existing Clients**: Will receive new fields but can ignore them if not needed

---

## Summary

1. ✅ **Attribute Added**: Every answer includes its `attribute` key
2. ✅ **Maps URL Added**: Location fields include `mapsUrl` (string or null)
3. ✅ **Backward Compatible**: Object format unchanged
4. ✅ **Type-Safe**: Only location fields have `mapsUrl` field
5. ✅ **Bilingual**: Works with both English and Arabic locales



