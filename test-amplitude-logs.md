# Testing Amplitude Logs

## How to Test Amplitude Logging

1. **Open the form in your browser:**
   ```
   http://localhost:5174/e98e937d-2985-4e88-96c1-5da831e813d4/1?lang=en&sessionId=test-session-123&user_token=2151987|tpqGogrub8WEJ7PVmx9aIx5OvYBrG9vQFB48pB71
   ```

2. **Open Browser DevTools Console:**
   - Press F12 or right-click → Inspect
   - Go to the Console tab
   - Look for `[Amplitude]` prefixed logs

3. **Expected Logs:**
   - `[Amplitude] Initialized successfully` - When Amplitude loads
   - `[Amplitude] Tracking form_viewed` - When form is viewed
   - `[Amplitude] Tracking form_field_focused` - When a field is focused
   - `[Amplitude] Tracking form_field_changed` - When a field value changes
   - `[Amplitude] Tracking form_submission_started` - When form submission begins
   - `[Amplitude] Tracking form_submission_success` - When form is submitted successfully

4. **Check Amplitude Dashboard:**
   - Go to https://analytics.amplitude.com
   - Navigate to your project (API Key: `ea353a2eec64ceddbb5cde4f6d9ee886`)
   - Check the Events tab to see incoming events
   - Events should appear within a few seconds

5. **Test Events:**
   - **Form View**: Just open the form URL
   - **Field Focus**: Click on any input field
   - **Field Change**: Type in any field
   - **Form Submit**: Fill out and submit the form

## Troubleshooting

- If you see `[Amplitude] trackFormViewed skipped - client not initialized`, Amplitude failed to load
- Check console for any error messages
- Verify the API key is correct
- Check network tab for failed requests to Amplitude API

