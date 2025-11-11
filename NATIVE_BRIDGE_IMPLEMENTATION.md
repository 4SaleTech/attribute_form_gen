# Native Bridge Implementation Guide

This document explains how the native bridge works in this form system, allowing web forms to communicate with native mobile apps (React Native, iOS, and Android).

## Overview

The native bridge enables bidirectional communication between a web form (running in a WebView) and the native mobile app that hosts it. When a form is submitted, the bridge sends form data to the native app, allowing the app to process submissions natively.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Native Mobile App                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              WebView (WKWebView/WebView)             │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Web Form (React/HTML)                  │  │   │
│  │  │                                                │  │   │
│  │  │  User fills form → Clicks Submit              │  │   │
│  │  │         ↓                                     │  │   │
│  │  │  nativeBridge() function executes             │  │   │
│  │  │         ↓                                     │  │   │
│  │  │  Detects bridge interface                     │  │   │
│  │  │         ↓                                     │  │   │
│  │  │  Calls postMessage()                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                    ↓                                  │   │
│  └────────────────────┼──────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Native Bridge Handler                          │   │
│  │  (onMessage / didReceiveMessage / postMessage)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                       ↓                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Native App Logic                               │   │
│  │  (Process form data, save, navigate, etc.)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Form Submission Flow

When a user submits a form:

1. **Client-side validation** runs first
2. **Submit pipeline** executes actions in order:
   - `native_bridge` (if enabled)
   - `server_persist` (if enabled)
   - `webhooks` (if enabled)
   - `redirect` (if enabled)

### 2. Native Bridge Detection

The `nativeBridge()` function checks for three different bridge interfaces in order:

#### React Native WebView
```javascript
if (window.ReactNativeWebView?.postMessage) {
  const message = JSON.stringify({ type: 'form_submit', payload });
  window.ReactNativeWebView.postMessage(message);
  return true;
}
```

#### iOS WKWebView
```javascript
if (window.webkit?.messageHandlers?.bridge) {
  const message = { type: 'form_submit', payload };
  window.webkit.messageHandlers.bridge.postMessage(message);
  return true;
}
```

#### Android WebView
```javascript
if (window.AndroidBridge?.postMessage) {
  const message = JSON.stringify({ type: 'form_submit', payload });
  window.AndroidBridge.postMessage(message);
  return true;
}
```

### 3. Message Format

The bridge sends a standardized message structure:

```json
{
  "type": "form_submit",
  "payload": {
    "formId": "contact-form",
    "version": 1,
    "submittedAt": 1704067200000,
    "answers": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone_number": {
        "e164": "+96550000000",
        "country": "KW"
      }
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["name", "email", "phone_number"],
      "sessionId": "session-abc123"
    }
  }
}
```

### 4. Platform-Specific Differences

| Platform | Message Format | Interface |
|----------|---------------|-----------|
| **React Native** | JSON string | `window.ReactNativeWebView.postMessage(string)` |
| **iOS** | JavaScript object | `window.webkit.messageHandlers.bridge.postMessage(object)` |
| **Android** | JSON string | `window.AndroidBridge.postMessage(string)` |

**Note:** React Native and Android require JSON stringification, while iOS receives a native JavaScript object.

## Implementation Details

### Code Location

The native bridge logic is in:
- **File:** `packages/renderer/src/workflow/submit.ts`
- **Function:** `nativeBridge(payload: Payload)`

### Execution Flow

```typescript
export async function runSubmitPipeline(form: FormConfig, payload: Payload) {
  const submit = form.submit;
  if (!submit) return;
  
  const actionMap = {
    native_bridge: nativeBridge,
    server_persist: serverPersist,
    webhooks: async () => true,
    redirect: async () => true,
  }
  
  // Execute actions in order specified by submit.ordering
  for (const step of submit.ordering) {
    const action = submit.actions.find((a) => a.type === step);
    if (!action || !action.enabled) continue;
    
    try {
      await runWithTimeout(actionMap[step](payload), submit.timeout_ms)
    } catch (e) {
      // Handle errors based on on_error setting
      if (submit.on_error === 'show_error') { 
        alert('Submit step failed'); 
      }
      if (submit.on_error === 'stop') throw e;
    }
  }
}
```

### Error Handling

The bridge handles errors gracefully:

1. **If bridge is not available** (normal in web browsers):
   - Logs a message: `"No native bridge detected - this is normal in web browsers"`
   - Returns `true` (no-op, doesn't fail)

2. **If bridge call fails**:
   - Error is caught and logged
   - Behavior depends on `on_error` setting:
     - `"continue"`: Continue with next actions
     - `"stop"`: Stop entire pipeline
     - `"show_error"`: Show alert and continue

3. **Timeout handling**:
   - Each action has a timeout (default: 6000ms)
   - If timeout expires, action fails and error handling applies

## Native App Integration

### React Native Example

```javascript
import { WebView } from 'react-native-webview';

function FormScreen() {
  const handleMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    
    if (data.type === 'form_submit') {
      const { formId, version, submittedAt, answers, meta } = data.payload;
      
      // Process form submission
      console.log('Form submitted:', formId);
      console.log('Answers:', answers);
      
      // Your native logic here:
      // - Save to local database
      // - Navigate to success screen
      // - Send to your backend
      // - etc.
    }
  };

  return (
    <WebView
      source={{ uri: 'https://your-domain.com/form/contact-form/1?lang=en' }}
      onMessage={handleMessage}
      injectedJavaScript={`
        // Ensure ReactNativeWebView is available
        window.ReactNativeWebView = {
          postMessage: function(message) {
            window.ReactNative.postMessage(message);
          }
        };
      `}
    />
  );
}
```

### iOS Example (Swift)

```swift
import WebKit

class FormViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()
        
        // Register message handler
        userContentController.add(self, name: "bridge")
        config.userContentController = userContentController
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        view.addSubview(webView)
        
        let url = URL(string: "https://your-domain.com/form/contact-form/1?lang=en")!
        webView.load(URLRequest(url: url))
    }
    
    func userContentController(_ userContentController: WKUserContentController, 
                              didReceive message: WKScriptMessage) {
        if message.name == "bridge" {
            guard let body = message.body as? [String: Any],
                  let type = body["type"] as? String,
                  type == "form_submit",
                  let payload = body["payload"] as? [String: Any] else {
                return
            }
            
            // Process form submission
            let formId = payload["formId"] as? String ?? ""
            let answers = payload["answers"] as? [String: Any] ?? [:]
            
            print("Form submitted: \(formId)")
            print("Answers: \(answers)")
            
            // Your native logic here
        }
    }
}
```

### Android Example (Kotlin)

```kotlin
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

class FormActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)
        
        webView.settings.javaScriptEnabled = true
        
        // Add JavaScript interface
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
        
        val url = "https://your-domain.com/form/contact-form/1?lang=en"
        webView.loadUrl(url)
    }
    
    inner class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun postMessage(message: String) {
            try {
                val data = JSONObject(message)
                val type = data.getString("type")
                
                if (type == "form_submit") {
                    val payload = data.getJSONObject("payload")
                    val formId = payload.getString("formId")
                    val answers = payload.getJSONObject("answers")
                    
                    Log.d("Form", "Form submitted: $formId")
                    Log.d("Form", "Answers: $answers")
                    
                    // Your native logic here
                    // Run on UI thread if needed
                    runOnUiThread {
                        // Update UI, navigate, etc.
                    }
                }
            } catch (e: Exception) {
                Log.e("Form", "Error parsing message", e)
            }
        }
    }
}
```

## Key Features

### 1. Graceful Degradation

The bridge is designed to work seamlessly in both native and web environments:

- **In native apps**: Bridge sends data to native code
- **In web browsers**: Bridge silently succeeds (no-op)
- **No errors**: The form works the same way regardless of environment

### 2. Execution Order

The bridge executes as part of a pipeline:

1. **native_bridge** (first) - Sends to native app immediately
2. **server_persist** - Saves to server database
3. **webhooks** - Triggers webhooks
4. **redirect** - Redirects user (last)

This order ensures the native app receives data before any redirects occur.

### 3. Timeout Protection

Each action has a timeout (configurable via `timeout_ms`):

- Default: 6000ms (6 seconds)
- Prevents hanging if bridge is slow or unresponsive
- Timeout errors are handled according to `on_error` setting

### 4. Error Resilience

The bridge is resilient to failures:

- If bridge is unavailable → succeeds silently
- If bridge call fails → handled by error strategy
- If timeout occurs → handled by error strategy
- Other actions continue → unless `on_error: "stop"`

## Configuration

### Enable Native Bridge

To enable the native bridge for a form, include it in the submit actions:

```json
{
  "submit": {
    "actions": [
      {
        "type": "native_bridge",
        "enabled": true
      },
      {
        "type": "server_persist",
        "enabled": true
      }
    ],
    "ordering": ["native_bridge", "server_persist"],
    "timeout_ms": 6000,
    "on_error": "continue"
  }
}
```

### Order Matters

The `ordering` array determines execution order. Typically:

```json
{
  "ordering": ["native_bridge", "server_persist", "webhooks", "redirect"]
}
```

This ensures:
- Native app gets data first
- Server saves the submission
- Webhooks are triggered
- User is redirected last

## Testing

### Browser Testing

In a regular web browser, the bridge will:
- Log: `"No native bridge detected - this is normal in web browsers"`
- Return `true` (success)
- Continue with other actions

### Native Testing

Use the test file `test-native-bridge.html` to simulate native bridges:

1. Open `test-native-bridge.html` in browser
2. Select bridge type (React Native, iOS, or Android)
3. Click "Setup Bridge Mock"
4. Open your form in another tab
5. Submit the form
6. Check the test page logs for the bridge message

## Debugging

### Console Logs

The bridge logs helpful messages:

- **Success**: `"[Native Bridge] Sent to React Native: ..."`
- **No bridge**: `"[Native Bridge] No native bridge detected - this is normal in web browsers"`
- **Error**: `"[Native Bridge] Error: ..."`

### Common Issues

1. **Bridge not triggering**:
   - Check that `native_bridge` is enabled in form config
   - Verify `native_bridge` is in the `ordering` array
   - Check browser console for errors

2. **Message not received**:
   - Verify bridge interface is properly set up in native app
   - Check message handler registration
   - Verify message format matches expected structure

3. **Timeout errors**:
   - Increase `timeout_ms` if native processing is slow
   - Check native app logs for processing delays

## Summary

The native bridge provides a seamless way to integrate web forms with native mobile apps:

- ✅ **Automatic detection** of platform (React Native, iOS, Android)
- ✅ **Graceful degradation** in web browsers
- ✅ **Standardized message format** across platforms
- ✅ **Error resilient** with configurable error handling
- ✅ **Timeout protection** prevents hanging
- ✅ **Pipeline integration** works with other submit actions

The implementation is simple, robust, and works out-of-the-box with minimal configuration.

