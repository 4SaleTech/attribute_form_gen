# Submission Answer Formats

This document shows example answer values for all field types in both object and array formats.

## API Endpoints

- **Object Format (default):** `GET /api/submissions/:id` or `GET /api/submissions/:id?format=object`
- **Array Format:** `GET /api/submissions/:id?format=array`

---

## Object Format Examples

In object format, answers are stored as a map where keys are field names and values are the answer data.

### 1. Text Field
```json
{
  "text_field": "Simple text value"
}
```
**Format:** `string`

---

### 2. Textarea Field
```json
{
  "textarea_field": "This is a longer text\nwith multiple lines\nand paragraphs."
}
```
**Format:** `string` (preserves newlines)

---

### 3. Email Field
```json
{
  "email_field": "user@example.com"
}
```
**Format:** `string`

---

### 4. Number Field
```json
{
  "number_field": 42
}
```
**Format:** `number` (integer or float)

---

### 5. Phone Field
```json
{
  "phone_field": {
    "e164": "+96550012345",
    "country": "KW"
  }
}
```
**Format:** `object`
- `e164`: E.164 formatted phone number (string)
- `country`: Country code (string)

---

### 6. Select Field (Single Choice)
```json
{
  "select_field": {
    "value": "option2"
  }
}
```
**Format:** `object`
- `value`: Selected option value (string)

---

### 7. Select Field with "Other" Option
```json
{
  "select_with_other": {
    "value": "other",
    "other": "Custom option text here"
  }
}
```
**Format:** `object`
- `value`: Always `"other"` when custom option selected
- `other`: User-provided custom text (string)

---

### 8. Radio Field (Single Choice)
```json
{
  "radio_field": {
    "value": "radio_option"
  }
}
```
**Format:** `object`
- `value`: Selected option value (string)

---

### 9. Radio Field with "Other" Option
```json
{
  "radio_with_other": {
    "value": "other",
    "other": "Custom radio option"
  }
}
```
**Format:** `object`
- `value`: Always `"other"` when custom option selected
- `other`: User-provided custom text (string)

---

### 10. Multiselect Field (Multiple Choices)
```json
{
  "multiselect_field": [
    {"value": "option1"},
    {"value": "option2"},
    {"value": "option3"}
  ]
}
```
**Format:** `array` of objects
- Each object has `value`: Selected option value (string)

---

### 11. Multiselect Field with "Other" Option
```json
{
  "multiselect_with_other": [
    {"value": "option1"},
    {"value": "other", "other": "Custom multiselect option"}
  ]
}
```
**Format:** `array` of objects
- Objects can include `other` field for custom values

---

### 12. Checkbox Field
```json
{
  "checkbox_field": true
}
```
**Format:** `boolean`
- `true` or `false`

---

### 13. Switch Field
```json
{
  "switch_field": false
}
```
**Format:** `boolean`
- `true` or `false`

---

### 14. Date Field
```json
{
  "date_field": "2025-12-25"
}
```
**Format:** `string`
- ISO date format: `YYYY-MM-DD`

---

### 15. Time Field
```json
{
  "time_field": "14:30"
}
```
**Format:** `string`
- 24-hour time format: `HH:MM`

---

### 16. Location Field
```json
{
  "location_field": {
    "lat": 29.3759,
    "lng": 47.9774,
    "accuracy": 10,
    "url": "https://www.google.com/maps?q=29.3759,47.9774"
  }
}
```
**Format:** `object`
- `lat`: Latitude (number)
- `lng`: Longitude (number)
- `accuracy`: Accuracy in meters (number, optional)
- `url`: Google Maps URL (string, optional)

---

### 17. File Upload (Single File)
```json
{
  "single_file": {
    "id": "file_single_123",
    "url": "https://example.com/uploads/single-document.pdf",
    "bytes": 102400,
    "resource_type": "raw",
    "name": "document.pdf"
  }
}
```
**Format:** `object`
- `id`: File identifier (string)
- `url`: File URL (string)
- `bytes`: File size in bytes (number)
- `resource_type`: Resource type - `"raw"`, `"image"`, etc. (string)
- `name`: Original filename (string)

---

### 18. File Upload (Multiple Files)
```json
{
  "multiple_files": [
    {
      "id": "file_multi_1",
      "url": "https://example.com/uploads/image1.jpg",
      "bytes": 204800,
      "resource_type": "image",
      "name": "photo1.jpg"
    },
    {
      "id": "file_multi_2",
      "url": "https://example.com/uploads/image2.jpg",
      "bytes": 153600,
      "resource_type": "image",
      "name": "photo2.jpg"
    }
  ]
}
```
**Format:** `array` of objects
- Each object follows the single file format

---

## Array Format Examples

In array format, answers are transformed into an array of `{question, answer}` objects where:
- `question`: The field label (what the user sees)
- `answer`: The formatted answer as a string

### 1. Text Field
```json
{
  "question": "Text Field",
  "answer": "Simple text value"
}
```

---

### 2. Textarea Field
```json
{
  "question": "Textarea Field",
  "answer": "This is a longer text\nwith multiple lines\nand paragraphs."
}
```
**Note:** Newlines are preserved in the answer string

---

### 3. Email Field
```json
{
  "question": "Email Field",
  "answer": "user@example.com"
}
```

---

### 4. Number Field
```json
{
  "question": "Number Field",
  "answer": "42"
}
```
**Note:** Numbers are converted to strings

---

### 5. Phone Field
```json
{
  "question": "Phone Field",
  "answer": "+96550012345"
}
```
**Note:** Only the E.164 formatted number is returned

---

### 6. Select Field (Single Choice)
```json
{
  "question": "Select Field",
  "answer": "option2"
}
```
**Note:** Only the selected value is returned

---

### 7. Select Field with "Other" Option
```json
{
  "question": "Select with Other",
  "answer": "Custom option text here"
}
```
**Note:** When "other" is selected, only the custom text is returned (not "other")

---

### 8. Radio Field (Single Choice)
```json
{
  "question": "Radio Field",
  "answer": "radio_option"
}
```
**Note:** Only the selected value is returned

---

### 9. Radio Field with "Other" Option
```json
{
  "question": "Radio with Other",
  "answer": "Custom radio option"
}
```
**Note:** When "other" is selected, only the custom text is returned

---

### 10. Multiselect Field (Multiple Choices)
```json
{
  "question": "Multiselect Field",
  "answer": "option1, option2, option3"
}
```
**Note:** Multiple values are comma-separated

---

### 11. Multiselect Field with "Other" Option
```json
{
  "question": "Multiselect with Other",
  "answer": "option1, Custom multiselect option"
}
```
**Note:** Custom "other" text is included in comma-separated list

---

### 12. Checkbox Field
```json
{
  "question": "Checkbox Field",
  "answer": "Yes"
}
```
**Note:** 
- `true` → `"Yes"` (English) or `"نعم"` (Arabic)
- `false` → `"No"` (English) or `"لا"` (Arabic)

---

### 13. Switch Field
```json
{
  "question": "Switch Field",
  "answer": "No"
}
```
**Note:** Same formatting as checkbox

---

### 14. Date Field
```json
{
  "question": "Date Field",
  "answer": "2025-12-25"
}
```
**Note:** ISO date format preserved as string

---

### 15. Time Field
```json
{
  "question": "Time Field",
  "answer": "14:30"
}
```
**Note:** 24-hour time format preserved as string

---

### 16. Location Field
```json
{
  "question": "Location Field",
  "answer": "29.375900, 47.977400"
}
```
**Note:** Coordinates formatted as `"lat, lng"` with 6 decimal places

---

### 17. File Upload (Single File)
```json
{
  "question": "Single File",
  "answer": "https://example.com/uploads/single-document.pdf"
}
```
**Note:** Only the file URL is returned

---

### 18. File Upload (Multiple Files)
```json
{
  "question": "Multiple Files",
  "answer": "https://example.com/uploads/image1.jpg, https://example.com/uploads/image2.jpg"
}
```
**Note:** Multiple file URLs are comma-separated

---

## Complete Example Response

### Object Format Response
```json
{
  "id": 3,
  "formId": "test-form",
  "version": 1,
  "submittedAt": 1763032000000,
  "locale": "en",
  "device": "web",
  "answers": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": {
      "e164": "+96550012345",
      "country": "KW"
    },
    "age": 30,
    "newsletter": true,
    "interests": [
      {"value": "technology"},
      {"value": "sports"}
    ],
    "location": {
      "lat": 29.3759,
      "lng": 47.9774,
      "accuracy": 10
    }
  },
  "attributes": {},
  "idempotencyKey": "session-123",
  "webhookStatus": "success",
  "createdAt": "2025-11-13T11:06:40Z"
}
```

### Array Format Response
```json
{
  "id": 3,
  "formId": "test-form",
  "version": 1,
  "submittedAt": 1763032000000,
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
    },
    {
      "question": "Age",
      "answer": "30"
    },
    {
      "question": "Subscribe to Newsletter",
      "answer": "Yes"
    },
    {
      "question": "Interests",
      "answer": "technology, sports"
    },
    {
      "question": "Location",
      "answer": "29.375900, 47.977400"
    }
  ],
  "attributes": {},
  "idempotencyKey": "session-123",
  "webhookStatus": "success",
  "createdAt": "2025-11-13T11:06:40Z"
}
```

---

## Formatting Rules Summary

### Object Format
- Preserves original data types (string, number, boolean, object, array)
- Complex values (phone, location, files) remain as objects
- Arrays remain as arrays
- Best for programmatic processing

### Array Format
- All answers converted to strings
- Question labels use form field labels (in submission locale)
- Complex values simplified:
  - Phone → E.164 number only
  - Location → Coordinates as "lat, lng"
  - Files → URLs only (comma-separated for multiple)
  - Select/Radio with "other" → Custom text only
  - Multiselect → Comma-separated values
  - Boolean → "Yes"/"No" or "نعم"/"لا"
- Best for display/export purposes

---

## Usage

```bash
# Get submission in object format (default)
curl "http://localhost:8080/api/submissions/3" \
  -H "Authorization: Bearer dev-admin-token"

# Get submission in array format
curl "http://localhost:8080/api/submissions/3?format=array" \
  -H "Authorization: Bearer dev-admin-token"
```

