# Redirect URL Production Verification Test

## Issue Description
The redirect URL was incorrectly encoding query parameter separators:
- **Broken:** `categoryId=1100%3FformSubmissionId%3D29` (where `%3F` = `?` and `%3D` = `=`)
- **Expected:** `categoryId=1100&formSubmissionId=29`

## Fix Applied
Updated `encodeTemplateInURL` function in `packages/renderer/src/workflow/submit.ts` to use `URLSearchParams` properly, which handles encoding automatically.

## Verification Steps

### 1. Check Current Version
Verify the deployed version includes the fix:
- Check ECR image tag (should be V12 or later)
- Check build timestamp matches after the fix was applied

### 2. Test in Browser Console
Open browser console on the form page and run:

```javascript
// Simulate the redirect function
function testRedirect() {
    const urlTemplate = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}';
    const context = { formSubmissionId: 29 };
    
    // This should match the fixed implementation
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
    
    return result;
}

testRedirect();
```

### 3. Test Actual Form Submission
1. Create a form with redirect URL: `http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}`
2. Submit the form
3. Check the browser's Network tab to see the redirect URL
4. Verify the URL in the address bar after redirect

### 4. Check for Encoding Issues
Look for these patterns in the redirect URL:
- `%3F` (should be `&`)
- `%3D` (should be `=`)
- Double encoding: `%253F` or `%253D`

### 5. Test Different Scenarios

#### Test Case 1: Existing param + template param
```
Input: http://localhost:3000/page?existing=value&formId={{.formId}}
Expected: http://localhost:3000/page?existing=value&formId=test-form
```

#### Test Case 2: Multiple existing params
```
Input: http://localhost:3000/page?a=1&b=2&c=3&id={{.submissionId}}
Expected: http://localhost:3000/page?a=1&b=2&c=3&id=29
```

#### Test Case 3: Template param in middle
```
Input: http://localhost:3000/page?a=1&id={{.submissionId}}&b=2
Expected: http://localhost:3000/page?a=1&id=29&b=2
```

#### Test Case 4: Relative URL
```
Input: /ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}
Expected: /ar/listing/booking?categoryId=1100&formSubmissionId=29
```

## Debugging Checklist

If the issue persists:

1. **Check Browser Cache**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache
   - Try incognito/private window

2. **Verify Code Deployment**
   - Check that V12 image is deployed
   - Verify the built JavaScript includes the fix
   - Check browser console for any errors

3. **Check for Other Encoding**
   - Look for other places where `encodeURIComponent` might be called
   - Check if the URL is being modified after template evaluation
   - Verify `window.location.href` assignment isn't causing issues

4. **Network Inspection**
   - Open DevTools → Network tab
   - Submit form and check the redirect request
   - Look at the actual URL being used

5. **Console Logging**
   Add temporary logging to see what's happening:
   ```javascript
   console.log('Template URL:', urlTemplate);
   console.log('Evaluated URL:', finalUrl);
   console.log('URL object:', new URL(finalUrl));
   ```

## Expected Behavior After Fix

✅ Query parameters are preserved correctly
✅ `&` characters remain as parameter separators (not encoded)
✅ `=` characters remain as key-value separators (not encoded)
✅ Only parameter values are URL-encoded when necessary
✅ Template placeholders are evaluated correctly

## If Issue Persists

1. Check the actual deployed code in browser DevTools → Sources
2. Look for the `encodeTemplateInURL` function
3. Verify it uses `URLSearchParams` and `toString()` method
4. Check if there are multiple versions of the function
5. Verify no other code is modifying the URL after template evaluation







