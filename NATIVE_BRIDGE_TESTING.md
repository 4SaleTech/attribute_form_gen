# Native Bridge Testing Guide

The native bridge functionality allows forms to send submission data to native mobile apps (React Native, iOS, or Android) when a form is submitted.

## How It Works

The native bridge checks for three different bridge interfaces:

1. **React Native WebView**: `window.ReactNativeWebView.postMessage`
2. **iOS WKWebView**: `window.webkit.messageHandlers.bridge.postMessage`
3. **Android Interface**: `window.AndroidBridge.postMessage`

When a form is submitted with `native_bridge` enabled, it sends a message with this structure:

```json
{
  "type": "form_submit",
  "payload": {
    "formId": "form-id",
    "version": 1,
    "submittedAt": 1234567890,
    "answers": {
      "field_name": "value"
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": []
    }
  }
}
```

## Testing Methods

### Method 1: Browser Console (Quick Test)

1. Open your form page in a browser
2. Open the browser console (F12)
3. Paste one of these mock bridge setups:

**React Native:**
```javascript
window.ReactNativeWebView = {
  postMessage: function(msg) {
    console.log('[Native Bridge] React Native received:', JSON.parse(msg));
  }
};
```

**iOS:**
```javascript
window.webkit = {
  messageHandlers: {
    bridge: {
      postMessage: function(data) {
        console.log('[Native Bridge] iOS received:', data);
      }
    }
  }
};
```

**Android:**
```javascript
window.AndroidBridge = {
  postMessage: function(msg) {
    console.log('[Native Bridge] Android received:', JSON.parse(msg));
  }
};
```

4. Submit the form
5. Check the console for the bridge message

### Method 2: Test HTML Page (Recommended)

1. Open `test-native-bridge.html` in your browser
2. Select a bridge type (React Native, iOS, or Android)
3. Click "Setup Bridge Mock"
4. Open your form page in a new tab (or same tab)
5. Submit the form
6. Return to the test page to see the logs

Alternatively, use the "Test Bridge Directly" button to simulate a form submission.

### Method 3: Unit Tests

Run the existing unit tests:

```bash
cd packages/renderer
npm test
```

The test file `submit.test.ts` includes basic tests for the submit pipeline.

## Verification Checklist

- [ ] Bridge mock is installed (check console for bridge status)
- [ ] Form has `native_bridge` enabled in submit actions
- [ ] Form submission triggers the bridge
- [ ] Bridge receives the correct payload structure
- [ ] All form answers are included in the payload
- [ ] Meta information (locale, device) is included

## Troubleshooting

**Bridge not triggering:**
- Check that `native_bridge` is enabled in the form's submit actions
- Verify the form's submit ordering includes `native_bridge`
- Check browser console for errors

**Bridge not receiving data:**
- Verify the bridge mock is correctly installed
- Check the console logs for the bridge message format
- Ensure the form is actually submitting (check network tab)

**Payload structure issues:**
- Verify form answers are valid
- Check that meta information is included
- Ensure formId and version are present

## Integration with Native Apps

### React Native Example

```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://your-form-url.com/form/form-id/1?lang=en' }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'form_submit') {
      // Handle form submission
      console.log('Form submitted:', data.payload);
      // Your native app logic here
    }
  }}
  injectedJavaScript={`
    window.ReactNativeWebView = {
      postMessage: function(message) {
        window.ReactNative.postMessage(message);
      }
    };
  `}
/>
```

### iOS Example (Swift)

```swift
import WebKit

class ViewController: UIViewController, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "bridge" {
            if let body = message.body as? [String: Any] {
                if body["type"] as? String == "form_submit" {
                    if let payload = body["payload"] as? [String: Any] {
                        // Handle form submission
                        print("Form submitted:", payload)
                    }
                }
            }
        }
    }
    
    // In viewDidLoad:
    let config = WKWebViewConfiguration()
    config.userContentController.add(self, name: "bridge")
    webView = WKWebView(frame: view.bounds, configuration: config)
}
```

### Android Example (Kotlin)

```kotlin
import android.webkit.JavascriptInterface
import android.webkit.WebView

class WebAppInterface(private val context: Context) {
    @JavascriptInterface
    fun postMessage(message: String) {
        val data = JSONObject(message)
        if (data.getString("type") == "form_submit") {
            val payload = data.getJSONObject("payload")
            // Handle form submission
            Log.d("NativeBridge", "Form submitted: $payload")
        }
    }
}

// In Activity:
webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
webView.loadUrl("https://your-form-url.com/form/form-id/1?lang=en")
```

## Notes

- The native bridge is a "no-op" in regular web browsers (returns `true` without error)
- Bridge messages are sent synchronously before other submit actions (server_persist, webhooks, redirect)
- The bridge timeout is controlled by the form's `submit.timeout_ms` setting
- If the bridge fails and `on_error` is set to `stop`, the entire submission pipeline will stop

