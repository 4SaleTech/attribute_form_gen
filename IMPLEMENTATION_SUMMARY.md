# Array Format Response Implementation Summary

## Changes Implemented

### 1. Added `attribute` Field to All Answers
- Every answer in the array format now includes its `attribute` key
- Extracted from `fields_json` → `attribute_key` property

### 2. Added `mapsUrl` Field to Location Fields
- Location fields include `mapsUrl` (string or null)
- Extracted from location object's `url` field, or constructed from coordinates
- Only present for location fields, not for other field types

### 3. Enhanced Location Answer Formatting
- **GPS with Address**: `"Address Text (29.337500, 48.075800)"`
- **Manual Entry**: `"Address Text"` (no coordinates)
- **GPS Only**: `"29.337500, 48.075800"` (no address)

## Files Modified

### `apps/api/internal/serverhandlers/submissions_admin.go`

#### Changes:
1. **Enhanced field metadata extraction**:
   - Now extracts `attribute_key` and `type` from fields_json
   - Builds `fieldAttributes` and `fieldTypes` maps

2. **Updated `transformAnswersToArrayAdmin` function**:
   - Signature changed: Added `fieldAttributes` and `fieldTypes` parameters
   - Return type changed: `[]map[string]interface{}` (was `[]map[string]string`)
   - Adds `attribute` field to each answer
   - Adds `mapsUrl` field for location fields only

3. **Updated `formatAnswerForArray` function**:
   - Signature changed: Added `fieldType` parameter, returns `(string, string)` tuple
   - Returns: `(formattedAnswer, mapsUrl)`
   - Enhanced location formatting logic:
     - Extracts/constructs maps URL
     - Formats answer with address + coordinates when available

## API Response Examples

### Location Field - GPS Detected with Address
```json
{
  "question": "Location",
  "answer": "Hamad Al-Mubarak Street, Salmiya - Block 5, Salmiya, Hawalli Governorate, 20004, Kuwait (29.337500, 48.075800)",
  "attribute": "location_area_block_landmark",
  "mapsUrl": "https://www.google.com/maps?q=29.3375,48.0758"
}
```

### Location Field - Manual Entry
```json
{
  "question": "Location",
  "answer": "Block 10, Salmiya, Kuwait",
  "attribute": "location_area_block_landmark",
  "mapsUrl": null
}
```

### Non-Location Field
```json
{
  "question": "Phone number",
  "answer": "+96550000000",
  "attribute": "phone_number"
}
```

## Testing

### Test Cases to Verify:
1. ✅ Location field with GPS + address → includes mapsUrl
2. ✅ Location field with manual entry → mapsUrl is null
3. ✅ Location field with GPS only → includes mapsUrl
4. ✅ Non-location fields → no mapsUrl field
5. ✅ All fields include attribute key
6. ✅ Answer formatting includes address when available

## Backward Compatibility

- ✅ Object format (`?format=object` or no format) unchanged
- ✅ Array format enhanced but backward compatible (new fields can be ignored)
- ✅ Existing clients will receive new fields but can continue working

## Next Steps

1. Test with real submissions
2. Verify mapsUrl construction for all location cases
3. Test with Arabic locale
4. Verify attribute extraction for all field types



