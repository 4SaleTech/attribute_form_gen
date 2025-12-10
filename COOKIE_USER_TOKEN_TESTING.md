# Testing Cookie-Based User Token Implementation

This guide explains how to test that the form correctly reads the `_xyzW` cookie to identify users for Amplitude analytics.

## Quick Test Methods

### Method 1: Using the Test HTML File

1. Open `test-cookie-user-token.html` in your browser
2. Enter a user token in the "User Token" field
3. Click "Set Cookie (_xyzW)"
4. Click "Open Form (with cookie)"
5. Check browser console for user identification logs
6. Verify Amplitude events include the user ID

### Method 2: Browser DevTools (Manual)

1. **Open your form URL** (e.g., `http://localhost:5174/{formId}/1?lang=en`)

2. **Set the cookie via DevTools:**
   - Open DevTools (F12)
   - Go to **Application** tab → **Cookies** → Select your domain
   - Click "+" to add a new cookie:
     - **Name:** `_xyzW`
     - **Value:** Your user token (e.g., `2151987|tpqGogrub8WEJ7PVmx9aIx5OvYBrG9vQFB48pB71`)
     - **Domain:** `localhost` (or your domain)
     - **Path:** `/`
     - **HttpOnly:** Unchecked (must be readable by JavaScript)
     - **Secure:** Unchecked (unless using HTTPS)
     - **SameSite:** `Lax` or `None`

3. **Refresh the page**

4. **Verify it works:**
   - Open **Console** tab
   - Look for logs showing user data being fetched
   - Check for Amplitude user ID being set
   - Open **Network** tab → Filter by `amplitude` → Check events have `user_id` property

### Method 3: Browser Console (Quick Test)

1. Open your form URL
2. Open Browser Console (F12)
3. Run this command to set the cookie:
   ```javascript
   document.cookie = "_xyzW=YOUR_TOKEN_HERE; path=/; domain=localhost";
   ```
4. Refresh the page
5. Verify in console that user data is fetched

### Method 4: Test Cookie Reading Function

Open browser console on any page and test the cookie reading:

```javascript
// Helper function (same as in FormView)
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

// Set cookie
document.cookie = "_xyzW=test-token-123; path=/";

// Read cookie
console.log(getCookie('_xyzW')); // Should output: "test-token-123"
```

## Testing Scenarios

### Scenario 1: Cookie Exists ✅
- **Setup:** Set `_xyzW` cookie with valid token
- **Expected:** 
  - Cookie value is read
  - User API is called with token
  - Amplitude user ID is set
  - Events include `user_id` property

### Scenario 2: Cookie Doesn't Exist, URL Parameter Exists ✅
- **Setup:** No cookie, but URL has `?user_token=...`
- **Expected:**
  - Falls back to URL parameter
  - User API is called with URL token
  - Amplitude user ID is set
  - **Note:** This tests backward compatibility

### Scenario 3: Cookie Takes Priority ✅
- **Setup:** Both cookie and URL parameter exist
- **Expected:**
  - Cookie value is used (not URL parameter)
  - User API is called with cookie token
  - Amplitude user ID is set

### Scenario 4: Neither Cookie Nor URL Parameter ❌
- **Setup:** No cookie, no URL parameter
- **Expected:**
  - User remains anonymous
  - No user API call
  - Amplitude events don't have `user_id` property

## Verification Checklist

- [ ] Cookie `_xyzW` can be set and read
- [ ] Form reads cookie on page load
- [ ] User API is called with cookie token
- [ ] Amplitude user ID is set correctly
- [ ] Amplitude events include `user_id` property
- [ ] URL parameter fallback still works (backward compatibility)
- [ ] Cookie takes priority over URL parameter
- [ ] Works when cookie doesn't exist (anonymous user)

## Debugging

### Check if Cookie is Being Read

Open browser console and check:
```javascript
// Check if cookie exists
console.log(document.cookie);

// Check if our function can read it
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}
console.log('_xyzW cookie:', getCookie('_xyzW'));
```

### Check Network Requests

1. Open **Network** tab in DevTools
2. Filter by `users/auth/user` - should see request with `Authorization: Bearer {token}`
3. Filter by `amplitude` - check events have `user_id` property

### Check Console Logs

Look for these log messages:
- `[User API]` - User data fetch logs
- `[Amplitude]` - Amplitude initialization and user ID setting logs
- Any error messages related to cookie reading

## Common Issues

### Cookie Not Being Read
- **Issue:** Cookie exists but not being read
- **Check:** 
  - Cookie domain matches page domain
  - Cookie path is `/` or includes the form path
  - Cookie doesn't have `HttpOnly` flag (if it does, JS can't read it)

### Cookie Set But User Not Identified
- **Issue:** Cookie exists but Amplitude user ID not set
- **Check:**
  - Cookie value is a valid token
  - User API returns valid user data with `user_id`
  - Check Network tab for API errors

### Fallback Not Working
- **Issue:** URL parameter not working when cookie doesn't exist
- **Check:**
  - URL parameter is `user_token` (not `userToken` or other)
  - Parameter value is URL-encoded if needed

## Example Test Token

For testing purposes, you can use a test token format:
```
2151987|tpqGogrub8WEJ7PVmx9aIx5OvYBrG9vQFB48pB71
```

**Note:** This should be a real token from your authentication system for actual testing.

## Automated Testing

Use the test HTML file (`test-cookie-user-token.html`) which includes:
- Cookie management (set/delete/check)
- Form loading
- Automated test suite
- Console logging

Run all tests by clicking "Run All Tests" button in the test file.



