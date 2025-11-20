# Native Bridge Behavior in Web Browsers

This document explains how the native bridge works when a form is accessed in a regular web browser (Chrome, Safari, Firefox, etc.) rather than in a native app's WebView.

## Quick Answer

**In a regular web browser, the native bridge does nothing and silently succeeds.** The form continues normally with other submit actions (server_persist, webhooks, redirect).

## How It Works

### Detection Process

When a form is submitted, the `nativeBridge()` function checks for native bridge interfaces in this order:

1. **React Native WebView**: `window.ReactNativeWebView?.postMessage`
2. **iOS WKWebView**: `window.webkit?.messageHandlers?.bridge`
3. **Android WebView**: `window.AndroidBridge?.postMessage`

### In a Web Browser

In a regular web browser, **none of these interfaces exist**, so:

```javascript
async function nativeBridge(payload: Payload) {
  try {
    // Check React Native - NOT FOUND ❌
    if (window.ReactNativeWebView?.postMessage) { ... }
    
    // Check iOS - NOT FOUND ❌
    if (window.webkit?.messageHandlers?.bridge) { ... }
    
    // Check Android - NOT FOUND ❌
    if (window.AndroidBridge?.postMessage) { ... }
  } catch (e) {
    // Error handling
  }
  
  // No bridge found - this is normal in web browsers
  console.log('[Native Bridge] No native bridge detected - this is normal in web browsers');
  return true; // ✅ Successfully completes (no-op)
}
```

### What Happens

1. ✅ **Function executes** - The `nativeBridge()` function runs
2. ✅ **Checks for bridges** - Looks for native bridge interfaces
3. ✅ **Logs message** - Console log: `"No native bridge detected - this is normal in web browsers"`
4. ✅ **Returns success** - Returns `true` (no error)
5. ✅ **Continues pipeline** - Form continues with next actions (server_persist, webhooks, redirect)

## Visual Flow

```
┌─────────────────────────────────────────────────────────┐
│              Regular Web Browser                         │
│                                                          │
│  User submits form                                       │
│         ↓                                                │
│  Submit pipeline starts                                  │
│         ↓                                                │
│  ┌──────────────────────────────────────┐              │
│  │  native_bridge action                 │              │
│  │         ↓                             │              │
│  │  Check window.ReactNativeWebView      │              │
│  │  → Not found ❌                       │              │
│  │         ↓                             │              │
│  │  Check window.webkit.messageHandlers  │              │
│  │  → Not found ❌                       │              │
│  │         ↓                             │              │
│  │  Check window.AndroidBridge           │              │
│  │  → Not found ❌                       │              │
│  │         ↓                             │              │
│  │  Log: "No native bridge detected..."  │              │
│  │         ↓                             │              │
│  │  Return true ✅ (success)            │              │
│  └──────────────────────────────────────┘              │
│         ↓                                                │
│  ┌──────────────────────────────────────┐              │
│  │  server_persist action               │              │
│  │  → Saves to database ✅              │              │
│  └──────────────────────────────────────┘              │
│         ↓                                                │
│  ┌──────────────────────────────────────┐              │
│  │  webhooks action                     │              │
│  │  → Triggers webhooks ✅             │              │
│  └──────────────────────────────────────┘              │
│         ↓                                                │
│  ┌──────────────────────────────────────┐              │
│  │  redirect action                     │              │
│  │  → Redirects user ✅                │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  Form submission completes successfully! ✅             │
└─────────────────────────────────────────────────────────┘
```

## Console Output

When you submit a form in a web browser, you'll see this in the browser console:

```
[Native Bridge] No native bridge detected - this is normal in web browsers
```

This is **not an error** - it's an informational message indicating that the bridge gracefully handled the absence of native interfaces.

## Key Points

### ✅ Graceful Degradation

The native bridge is designed to work seamlessly in both environments:

- **Native App**: Sends data to native code
- **Web Browser**: Silently succeeds (no-op)

### ✅ No Errors

The bridge **never throws an error** when running in a web browser. It always returns `true` (success), allowing the form to continue normally.

### ✅ Same Form Code

You can use the **exact same form** in both:
- Native mobile apps (via WebView)
- Regular web browsers

No code changes needed!

### ✅ Other Actions Continue

Even though the native bridge does nothing in a browser, all other submit actions work normally:

- ✅ `server_persist` - Saves submission to database
- ✅ `webhooks` - Triggers configured webhooks
- ✅ `redirect` - Redirects user to success page

## Example: Form Submission in Browser

### Form Configuration

```json
{
  "submit": {
    "actions": [
      {"type": "native_bridge", "enabled": true},
      {"type": "server_persist", "enabled": true},
      {"type": "webhooks", "enabled": true},
      {"type": "redirect", "enabled": true, "url": "/success"}
    ],
    "ordering": ["native_bridge", "server_persist", "webhooks", "redirect"]
  }
}
```

### What Happens in Browser

1. **native_bridge** ✅
   - Checks for native interfaces
   - None found
   - Logs message
   - Returns `true` (success)
   - **Time taken**: ~1ms

2. **server_persist** ✅
   - Sends POST request to `/api/submissions`
   - Saves form data to database
   - Returns success
   - **Time taken**: ~200-500ms

3. **webhooks** ✅
   - Triggers configured webhooks
   - Returns success
   - **Time taken**: ~100-300ms

4. **redirect** ✅
   - Redirects browser to `/success`
   - **Time taken**: Immediate

**Total time**: ~300-800ms (native_bridge adds almost no overhead)

## Testing in Browser

### Method 1: Browser Console

1. Open your form in a browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Submit the form
5. You'll see: `[Native Bridge] No native bridge detected - this is normal in web browsers`

### Method 2: Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Submit the form
4. You'll see:
   - ✅ POST to `/api/submissions` (server_persist)
   - ✅ POST to webhook URLs (if configured)
   - ❌ No native bridge calls (expected)

## Why This Design?

### Benefits

1. **Single Codebase**: Same form works everywhere
2. **No Conditional Logic**: No need to check if running in browser vs native
3. **No Errors**: Never fails in browser environment
4. **Transparent**: Clear console logging for debugging
5. **Performance**: Minimal overhead (~1ms) in browsers

### Alternative Approaches (Not Used)

❌ **Throw Error**: Would break forms in browsers  
❌ **Skip Action**: Would require conditional logic  
❌ **Silent Fail**: Would hide debugging information  

✅ **Current Approach**: Log and succeed - best of all worlds!

## Common Questions

### Q: Will the form work in a browser if native_bridge is enabled?

**A:** Yes! The form works perfectly in browsers. The native bridge simply does nothing and the form continues with other actions.

### Q: Does enabling native_bridge slow down browser submissions?

**A:** No. The bridge check takes ~1ms and doesn't affect performance.

### Q: Should I disable native_bridge for web-only forms?

**A:** No need. The bridge gracefully handles browser environments. You can enable it for all forms without issues.

### Q: Will I see errors in the browser console?

**A:** No errors. You'll only see an informational log message: `"No native bridge detected - this is normal in web browsers"`

### Q: Can I test native bridge functionality in a browser?

**A:** Yes! Use the `test-native-bridge.html` file to simulate native bridges. See `NATIVE_BRIDGE_TESTING.md` for details.

## Summary

**In a regular web browser:**

- ✅ Native bridge checks for native interfaces
- ✅ None are found (expected)
- ✅ Logs informational message
- ✅ Returns success (`true`)
- ✅ Form continues with other actions
- ✅ No errors, no delays, no issues

**The native bridge is designed to be invisible in web browsers while providing full functionality in native apps.**


