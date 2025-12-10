#!/bin/bash

# Test script to verify submission ID in redirect URL
# Usage: ./test-form-submission.sh [form-id] [api-base-url]

FORM_ID="${1:-80c7acb8-a2d0-44c6-9636-2ba197eb938d}"
API_BASE="${2:-http://localhost:8080}"

echo "Testing form: $FORM_ID"
echo "API Base: $API_BASE"
echo ""

# Step 1: Fetch form configuration
echo "=== Step 1: Fetching form configuration ==="
FORM_CONFIG=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/latest")

if [ $? -ne 0 ] || [ -z "$FORM_CONFIG" ]; then
    echo "❌ Error: Could not fetch form configuration"
    echo "Make sure the API is running at $API_BASE"
    exit 1
fi

echo "✅ Form configuration fetched"
echo ""

# Extract redirect URL and ordering
REDIRECT_URL=$(echo "$FORM_CONFIG" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
ORDERING=$(echo "$FORM_CONFIG" | grep -o '"ordering":\[[^]]*\]' | head -1)

echo "=== Form Configuration ==="
echo "Redirect URL: $REDIRECT_URL"
echo "Ordering: $ORDERING"
echo ""

# Check if redirect URL contains submissionId template
if echo "$REDIRECT_URL" | grep -q '{{.submissionId}}'; then
    echo "✅ Redirect URL contains {{.submissionId}} template"
else
    echo "ℹ️  Redirect URL does not contain {{.submissionId}} template"
fi

# Check if server_persist runs before redirect
if echo "$ORDERING" | grep -q 'server_persist.*redirect'; then
    echo "✅ server_persist runs before redirect - submissionId will be available"
else
    echo "⚠️  Warning: redirect may run before server_persist - submissionId might be undefined"
fi

echo ""
echo "=== Step 2: Submitting form ==="

# Create submission payload
TIMESTAMP=$(date +%s)000
PAYLOAD=$(cat <<EOF
{
  "formId": "$FORM_ID",
  "version": 1,
  "submittedAt": $TIMESTAMP,
  "answers": {},
  "meta": {
    "locale": "en",
    "device": "web"
  }
}
EOF
)

echo "Payload: $PAYLOAD"
echo ""

# Submit form
SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE}/api/submissions" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ $? -ne 0 ]; then
    echo "❌ Error: Could not submit form"
    exit 1
fi

echo "Submission response: $SUBMIT_RESPONSE"
echo ""

# Extract submission ID
SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$SUBMISSION_ID" ]; then
    SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"submissionId":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -z "$SUBMISSION_ID" ]; then
    echo "⚠️  Warning: Could not extract submission ID from response"
    echo "Response: $SUBMIT_RESPONSE"
else
    echo "✅ Submission ID: $SUBMISSION_ID"
fi

echo ""
echo "=== Step 3: Testing redirect URL template ==="

if [ -n "$REDIRECT_URL" ] && [ -n "$SUBMISSION_ID" ]; then
    # Simulate template evaluation
    EVALUATED_URL=$(echo "$REDIRECT_URL" | sed "s/{{\.submissionId}}/$SUBMISSION_ID/g")
    
    echo "Template URL: $REDIRECT_URL"
    echo "Evaluated URL: $EVALUATED_URL"
    echo ""
    
    # Check if submissionId is in the evaluated URL
    if echo "$EVALUATED_URL" | grep -q "submissionId=$SUBMISSION_ID\|formSubmissionId=$SUBMISSION_ID"; then
        echo "✅ Submission ID found in evaluated URL"
    else
        echo "❌ Submission ID NOT found in evaluated URL"
    fi
    
    # Check for encoding issues
    if echo "$EVALUATED_URL" | grep -q '%3F\|%3D'; then
        echo "⚠️  WARNING: Found encoded characters (%3F or %3D) in URL"
        echo "   This indicates an encoding issue"
    else
        echo "✅ No encoding issues detected"
    fi
else
    echo "⚠️  Cannot test redirect URL - missing redirect URL or submission ID"
fi

echo ""
echo "=== Test Complete ==="





