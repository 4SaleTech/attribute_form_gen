# Amplitude Event Testing Guide

## Overview

This guide explains how to test and verify Amplitude event logging for forms.

## Prerequisites

1. **Amplitude Account**: Access to Amplitude dashboard at https://amplitude.com
2. **API Key**: `ea353a2eec64ceddbb5cde4f6d9ee886` (already configured)
3. **Running Form Server**: Admin and API servers should be running

## Testing Methods

### Method 1: View Events in Amplitude Dashboard (Real-time)

1. **Login to Amplitude**
   - Go to https://amplitude.com
   - Login with your credentials

2. **Navigate to User Lookup**
   - Go to **Data** → **User Lookup** in the sidebar
   - Search for your user ID (from user_token API response)

3. **View Live Events**
   - Go to **Data** → **Live View** (if available)
   - Or go to **Charts** → **New Chart** → **Event Segmentation**
   - Select event type (e.g., `form_viewed`)
   - Set time range to "Last 1 hour" or "Last 15 minutes"
   - Events should appear in real-time

4. **Check Event Properties**
   - Click on any event in User Lookup
   - View all event properties
   - Verify `form_id`, `sessionId`, `field_name`, etc.

### Method 2: Test Form with Query Parameters

#### Step 1: Create a Test Form

Use the existing form we created earlier, or create a new one:

```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Test Form - Amplitude",
      "ar": "نموذج اختبار - Amplitude"
    },
    "attributes": ["field_text", "field_email", "field_phone"]
  }'
```

Note the `formId` from the response.

#### Step 2: Access Form with Query Parameters

Open the form URL in your browser with both `sessionId` and `user_token`:

```
http://localhost:5174/{formId}/1?lang=en&sessionId=test-session-123&user_token=2151987|tpqGogrub8WEJ7PVmx9aIx5OvYBrG9vQFB48pB71
```

Replace `{formId}` with your actual form ID.

#### Step 3: Interact with Form

1. **Form Load**: Event `form_viewed` should fire immediately
2. **Focus Field**: Click on any field → `form_field_focused`
3. **Type in Field**: Enter text → `form_field_changed`
4. **Blur Field**: Click away → `form_field_blurred`
5. **Submit Form**: Click submit → `form_submission_started` → `form_submission_success`
6. **Thank You**: See thank you page → `form_thank_you_viewed`

### Method 3: Browser Console Verification

Open browser DevTools (F12) and check the console:

1. **Check for Errors**
   - Look for any Amplitude initialization errors
   - Check for user API call errors

2. **Check Network Tab**
   - Filter by "amplitude" or "api.amplitude.com"
   - Verify requests are being sent
   - Check request payloads

3. **Check Application Tab**
   - Look for `__sessionId` in window object
   - Verify user data was fetched

### Method 4: Amplitude Debug Mode

Add debug logging to see events being tracked:

1. Open browser console
2. Events will be logged (if we add debug mode)
3. Check Network tab for Amplitude API calls

## Expected Events Sequence

When you load and interact with a form, you should see these events in order:

1. `form_viewed` - When form loads
2. `form_field_focused` - When you click on a field
3. `form_field_changed` - When you type/select a value
4. `form_field_blurred` - When you leave a field
5. `form_submission_started` - When you click submit
6. `form_submission_success` - When submission succeeds
7. `form_thank_you_viewed` - When thank you page shows

## Event Properties to Verify

### form_viewed
- `form_id`: Should match your form ID
- `form_version`: Should be 1 (or current version)
- `locale`: "en" or "ar"
- `device_type`: "mobile", "tablet", or "desktop"
- `field_count`: Number of fields in form
- `sessionId`: Should match URL parameter (if provided)

### form_field_focused
- `field_name`: Name of the field
- `field_type`: Type (text, email, phone, etc.)
- `field_position`: Position in form (1-indexed)
- `is_required`: true/false

### form_submission_success
- `submission_id`: Server-assigned submission ID
- `completion_percentage`: 0-100
- `fields_completed`: Number of fields with values
- `has_file_uploads`: true/false
- `has_location`: true/false

## Troubleshooting

### Events Not Appearing in Amplitude

1. **Check API Key**
   - Verify API key is correct: `ea353a2eec64ceddbb5cde4f6d9ee886`
   - Check Amplitude dashboard → Settings → Projects

2. **Check Browser Console**
   - Look for Amplitude errors
   - Check for CORS errors
   - Verify network requests are being made

3. **Check User ID**
   - Verify user_token is valid
   - Check if user API call succeeded
   - Verify user_id is being set in Amplitude

4. **Check Session ID**
   - Verify sessionId is in URL
   - Check if it's being extracted correctly

5. **Amplitude Dashboard Delay**
   - Events may take 1-2 minutes to appear
   - Use "Last 15 minutes" time range
   - Refresh the dashboard

### User API Not Working

1. **Check Network Tab**
   - Verify API call is being made
   - Check response status code
   - Verify headers are correct

2. **Check CORS**
   - User API might have CORS restrictions
   - May need to test from actual domain

3. **Check Token**
   - Verify token format is correct
   - Token might be expired

## Quick Test Script

See `test-amplitude-events.sh` for automated testing script.

## Testing Checklist

- [ ] Form loads with sessionId in URL
- [ ] Form loads with user_token in URL
- [ ] User API call succeeds (check Network tab)
- [ ] Amplitude initializes (check console)
- [ ] form_viewed event fires on load
- [ ] form_field_focused fires on field focus
- [ ] form_field_changed fires on value change
- [ ] form_field_blurred fires on field blur
- [ ] form_submission_started fires on submit
- [ ] form_submission_success fires after submit
- [ ] form_thank_you_viewed fires on thank you page
- [ ] Events appear in Amplitude dashboard
- [ ] User ID is set correctly in Amplitude
- [ ] Session ID is included in events
- [ ] Event properties are correct

## Next Steps

1. Test with different form types
2. Test with different field types
3. Test file upload events
4. Test location capture events
5. Test validation error events
6. Test abandonment events
7. Verify events in Amplitude dashboard



