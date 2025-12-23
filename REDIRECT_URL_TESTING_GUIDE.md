# Redirect URL Testing Guide

## Issue Summary
The redirect URL was incorrectly encoding query parameter separators:
- **Broken:** `categoryId=1100%3FformSubmissionId%3D29` 
- **Expected:** `categoryId=1100&formSubmissionId=29`

## Fix Applied (V12)
Updated `encodeTemplateInURL` function to use `URLSearchParams.toString()` which properly handles encoding.

## Testing Tools Created

### 1. `test-redirect-debug.js`
Node.js script for quick testing:
```bash
node test-redirect-debug.js
```
Shows detailed step-by-step processing of the URL.

### 2. `test-redirect-browser.html`
Browser-based test that simulates the redirect flow.
- Open in browser
- Shows detailed console logs
- Tests the exact issue reported

### 3. `test-redirect-production.html`
Production testing tool:
- Can be deployed to production
- Allows testing with actual URLs
- Shows encoding analysis
- Can simulate actual redirect

### 4. `test-redirect-integration.html`
Comprehensive integration test with multiple scenarios.

## How to Test Thoroughly

### Step 1: Verify Code is Deployed
1. Check ECR image version (should be V12 or later)
2. Verify deployment timestamp
3. Check browser cache is cleared

### Step 2: Test in Browser Console
Open DevTools Console and run:

```javascript
// Test the exact function
const urlTemplate = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}';
const context = { formSubmissionId: 29 };

// Simulate encodeTemplateInURL
const urlObj = new URL(urlTemplate);
const existingParams = new URLSearchParams(urlObj.search);
const newParams = new URLSearchParams();

existingParams.forEach((value, key) => {
    const evaluatedValue = value.includes('{{') ? '29' : value;
    newParams.append(key, evaluatedValue);
});

const resultUrl = new URL(urlObj.pathname, urlObj.origin);
newParams.forEach((value, key) => {
    resultUrl.searchParams.append(key, value);
});

const result = resultUrl.toString();
console.log('Result:', result);
console.log('Expected: http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29');
console.log('Match:', result === 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29');

// Check for encoding issues
if (result.includes('%3F') || result.includes('%3D')) {
    console.error('❌ ENCODING ISSUE FOUND!');
    console.log('Found %3F:', result.includes('%3F'));
    console.log('Found %3D:', result.includes('%3D'));
} else {
    console.log('✅ No encoding issues');
}
```

### Step 3: Test Actual Form Submission
1. Create a form with redirect URL containing existing params:
   ```
   http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}
   ```
2. Submit the form
3. Check browser console for `[Redirect]` logs
4. Check Network tab for redirect request
5. Verify URL in address bar after redirect

### Step 4: Check for Common Issues

#### Issue 1: Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Try incognito/private window

#### Issue 2: Old Version Deployed
- Verify V12 image is running
- Check build timestamp
- Restart the service if needed

#### Issue 3: Multiple Encoding
Look for double encoding:
- `%253F` (encoded `%3F`)
- `%253D` (encoded `%3D`)

#### Issue 4: URL Modification After Evaluation
Check if anything modifies the URL after `encodeTemplateInURL`:
- Look for other `encodeURIComponent` calls
- Check if `window.location.href` assignment causes issues
- Verify no middleware modifies the URL

### Step 5: Debug Logging
The code now includes debug logging. Check browser console for:
```
[Redirect] Template URL: ...
[Redirect] Evaluated URL: ...
[Redirect] URL search params: ...
```

## Expected Behavior

✅ Query parameters preserved correctly
✅ `&` remains as separator (not `%3F`)
✅ `=` remains as separator (not `%3D`)
✅ Only parameter values are encoded when needed
✅ Template placeholders evaluated correctly

## If Issue Persists

1. **Check Deployed Code**
   - Open DevTools → Sources
   - Find `submit.ts` or bundled JavaScript
   - Search for `encodeTemplateInURL`
   - Verify it uses `URLSearchParams` and `toString()`

2. **Check for Multiple Versions**
   - Search for all occurrences of `encodeTemplateInURL`
   - Verify only one version exists
   - Check if old code is cached

3. **Network Inspection**
   - Open DevTools → Network tab
   - Submit form
   - Check the actual redirect request
   - Look at request URL

4. **Console Errors**
   - Check for JavaScript errors
   - Look for `[Redirect Template]` error messages
   - Check if fallback is being used

5. **Compare URLs**
   - Log the template URL
   - Log the evaluated URL
   - Compare character by character
   - Check for hidden characters

## Test Cases to Verify

1. ✅ Existing param + template param
2. ✅ Multiple existing params
3. ✅ Template param in middle
4. ✅ Relative URLs
5. ✅ Special characters in existing params
6. ✅ Encoded values in existing params

## Reporting Issues

If the issue persists, provide:
1. Browser console logs (especially `[Redirect]` messages)
2. Network tab screenshot
3. Actual URL vs Expected URL
4. Browser version
5. Deployed image version/tag







