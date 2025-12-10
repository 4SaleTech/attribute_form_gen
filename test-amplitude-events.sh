#!/bin/bash

# Test script for Amplitude event logging
# This script helps test Amplitude integration by creating a form and providing test URLs

BASE_URL="http://localhost:8080"
TOKEN="dev-admin-token"
USER_TOKEN="2151987|tpqGogrub8WEJ7PVmx9aIx5OvYBrG9vQFB48pB71"
SESSION_ID="test-session-$(date +%s)"

echo "🧪 Amplitude Event Testing Script"
echo "=================================="
echo ""

# Step 1: Create a test form
echo "📝 Step 1: Creating test form..."
FORM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/forms/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Amplitude Test Form",
      "ar": "نموذج اختبار Amplitude"
    },
    "attributes": [
      "field_text",
      "field_email",
      "field_phone",
      "field_select",
      "field_checkbox"
    ],
    "thankYou": {
      "show": true,
      "title": {
        "en": "Thank You!",
        "ar": "شكراً لك!"
      },
      "message": {
        "en": "Your form has been submitted successfully.",
        "ar": "تم إرسال النموذج بنجاح."
      }
    },
    "submit": {
      "actions": [
        {
          "type": "server_persist",
          "enabled": true
        }
      ],
      "ordering": ["server_persist"],
      "timeout_ms": 6000,
      "on_error": "continue"
    }
  }')

FORM_ID=$(echo "$FORM_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('formId', ''))" 2>/dev/null)
FORM_VERSION=$(echo "$FORM_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('version', 1))" 2>/dev/null)

if [ -z "$FORM_ID" ]; then
  echo "❌ Failed to create form"
  echo "Response: $FORM_RESPONSE"
  exit 1
fi

echo "✅ Form created successfully!"
echo "   Form ID: $FORM_ID"
echo "   Version: $FORM_VERSION"
echo ""

# Step 2: Display test URLs
echo "🔗 Step 2: Test URLs"
echo "==================="
echo ""
echo "English Form (with sessionId and user_token):"
echo "http://localhost:5174/$FORM_ID/$FORM_VERSION?lang=en&sessionId=$SESSION_ID&user_token=$USER_TOKEN"
echo ""
echo "Arabic Form (with sessionId and user_token):"
echo "http://localhost:5174/$FORM_ID/$FORM_VERSION?lang=ar&sessionId=$SESSION_ID&user_token=$USER_TOKEN"
echo ""
echo "English Form (sessionId only, no user_token):"
echo "http://localhost:5174/$FORM_ID/$FORM_VERSION?lang=en&sessionId=$SESSION_ID"
echo ""
echo "English Form (no query parameters):"
echo "http://localhost:5174/$FORM_ID/$FORM_VERSION?lang=en"
echo ""

# Step 3: Instructions
echo "📋 Step 3: Testing Instructions"
echo "================================"
echo ""
echo "1. Open one of the URLs above in your browser"
echo "2. Open Browser DevTools (F12)"
echo "3. Go to Console tab to see any errors"
echo "4. Go to Network tab and filter by 'amplitude'"
echo "5. Interact with the form:"
echo "   - Click on fields (should see form_field_focused)"
echo "   - Type in fields (should see form_field_changed)"
echo "   - Click away from fields (should see form_field_blurred)"
echo "   - Submit the form (should see form_submission_started → form_submission_success)"
echo "6. Check Amplitude Dashboard:"
echo "   - Go to https://amplitude.com"
echo "   - Navigate to Data → User Lookup"
echo "   - Search for user_id: 1885389 (from user_token)"
echo "   - Or go to Charts → Event Segmentation"
echo "   - Select event: form_viewed"
echo "   - Set time range: Last 15 minutes"
echo ""

# Step 4: Verify user API
echo "🔍 Step 4: Verifying User API"
echo "=============================="
echo ""
echo "Testing user_token API call..."
USER_API_RESPONSE=$(curl -s -X GET "https://services.q84sale.com/api/v1/users/auth/user" \
  -H "accept: application/json" \
  -H "authorization: Bearer $USER_TOKEN" \
  -H "application-source: q84sale" \
  -H "device-id: web_user_test_123" \
  -H "origin: https://www.q84sale.com" \
  -H "x-custom-authorization: com.forsale.forsale.web 1748956341 1b109a5f85723be5b1a442899fca9595ffe93a10" 2>&1)

if echo "$USER_API_RESPONSE" | grep -q "user_id"; then
  USER_ID=$(echo "$USER_API_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('user', {}).get('user_id', ''))" 2>/dev/null)
  echo "✅ User API call successful!"
  echo "   User ID: $USER_ID"
  echo "   This user ID should be set in Amplitude events"
else
  echo "⚠️  User API call failed or returned unexpected response"
  echo "   Response: $USER_API_RESPONSE"
  echo "   Form will still work, but user will be anonymous in Amplitude"
fi
echo ""

# Step 5: Expected events
echo "📊 Step 5: Expected Events"
echo "==========================="
echo ""
echo "When you interact with the form, you should see these events in Amplitude:"
echo ""
echo "1. form_viewed"
echo "   - Fires when form loads"
echo "   - Properties: form_id, form_version, locale, device_type, field_count"
echo ""
echo "2. form_field_focused"
echo "   - Fires when you click on a field"
echo "   - Properties: field_name, field_type, field_position, is_required"
echo ""
echo "3. form_field_changed"
echo "   - Fires when you type/select a value"
echo "   - Properties: field_name, change_type, value_type, completion_percentage"
echo ""
echo "4. form_field_blurred"
echo "   - Fires when you leave a field"
echo "   - Properties: field_name, has_value, value_length, time_in_field"
echo ""
echo "5. form_submission_started"
echo "   - Fires when you click submit"
echo "   - Properties: fields_completed, completion_percentage, has_file_uploads"
echo ""
echo "6. form_submission_success"
echo "   - Fires after successful submission"
echo "   - Properties: submission_id, completion_percentage, actions_completed"
echo ""
echo "7. form_thank_you_viewed"
echo "   - Fires when thank you page shows"
echo "   - Properties: submission_id, submission_time"
echo ""

echo "✨ Testing setup complete!"
echo ""
echo "Next steps:"
echo "1. Open the form URL in your browser"
echo "2. Interact with the form"
echo "3. Check Amplitude dashboard for events"
echo "4. Verify event properties are correct"
echo ""



