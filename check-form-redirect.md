# Check Form Redirect URL

## Form ID: `b97dd1d3-01d2-4c1f-81d8-64b4a20948d7`

## How to Test

### Option 1: Browser Test Page (Recommended)
1. Open `test-form-submission-id.html` in your browser
2. The form ID is pre-filled: `b97dd1d3-01d2-4c1f-81d8-64b4a20948d7`
3. Update the API Base URL if needed (default: `http://localhost:8080`)
4. Click "Load Form" to see the redirect configuration
5. Click "Test Submission" to simulate submission
6. Check the results

### Option 2: Manual Check via API
```bash
# Fetch form configuration
curl "http://localhost:8080/api/forms/b97dd1d3-01d2-4c1f-81d8-64b4a20948d7/latest" | jq '.submit'

# Look for:
# - redirect action URL template
# - action ordering (should have server_persist before redirect)
```

### Option 3: Test in Production
1. Submit the actual form
2. Check browser console for `[Redirect]` logs
3. Verify the redirect URL contains the submission ID

## What to Check

1. **Redirect URL Template**
   - Does it contain `{{.submissionId}}` or `{{.formSubmissionId}}`?
   - Both should work now (after the fix)

2. **Action Ordering**
   - `server_persist` should run BEFORE `redirect`
   - This ensures `submissionId` is available

3. **Final Redirect URL**
   - Should have `formSubmissionId=29` (or actual ID)
   - Should NOT have `formSubmissionId=` (empty)
   - Should NOT have encoding issues (`%3F`, `%3D`)

## Expected Behavior

If the redirect URL template is:
```
http://localhost:33/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}
```

After submission with ID `29`, it should redirect to:
```
http://localhost:33/ar/listing/booking?categoryId=1100&formSubmissionId=29
```

## If Issues Found

1. **Empty submissionId**: Check action ordering
2. **Encoding issues**: Check if fix is deployed (V12+)
3. **Wrong URL**: Check redirect URL template configuration





