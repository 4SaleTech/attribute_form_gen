#!/bin/bash

BASE_URL="http://localhost:8080/api"
ADMIN_TOKEN="dev-admin-token"

echo "=========================================="
echo "Detailed API Endpoint Testing"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Config Endpoint (seems to be missing)
echo "2. Testing Config Endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/config)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE (Expected 200)"
    echo "   Response: $BODY"
    echo "   ISSUE: Config endpoint returns 404 - route may not be registered correctly"
fi
echo ""

# Test 3: List Forms (Admin)
echo "3. Testing List Forms (Admin)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/api/forms)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    FORM_COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "N/A")
    echo "   Forms found: $FORM_COUNT"
    # Extract first form ID for later tests
    FIRST_FORM_ID=$(echo "$BODY" | jq -r '.[0].formId' 2>/dev/null)
    FIRST_FORM_VERSION=$(echo "$BODY" | jq -r '.[0].version' 2>/dev/null)
    if [ -n "$FIRST_FORM_ID" ] && [ "$FIRST_FORM_ID" != "null" ]; then
        echo "   First form: $FIRST_FORM_ID v$FIRST_FORM_VERSION"
    fi
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: Create Form
echo "4. Testing Create Form..."
FORM_DATA='{
  "title": {
    "en": "API Test Form",
    "ar": "نموذج اختبار API"
  },
  "attributes": ["phone_number"]
}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$FORM_DATA" \
  http://localhost:8080/api/forms/publish)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    NEW_FORM_ID=$(echo "$BODY" | jq -r '.formId' 2>/dev/null)
    NEW_FORM_VERSION=$(echo "$BODY" | jq -r '.version' 2>/dev/null)
    echo "   Created form: $NEW_FORM_ID v$NEW_FORM_VERSION"
    FIRST_FORM_ID=$NEW_FORM_ID
    FIRST_FORM_VERSION=$NEW_FORM_VERSION
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 5: Get Form Latest (if we have a form ID)
if [ -n "$FIRST_FORM_ID" ] && [ "$FIRST_FORM_ID" != "null" ]; then
    echo "5. Testing Get Form Latest..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:8080/api/forms/$FIRST_FORM_ID/latest")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "   ✓ PASS - HTTP $HTTP_CODE"
        FORM_VERSION=$(echo "$BODY" | jq -r '.version' 2>/dev/null)
        echo "   Form version: $FORM_VERSION"
    else
        echo "   ✗ FAIL - HTTP $HTTP_CODE"
        echo "   Response: $BODY"
    fi
else
    echo "5. Testing Get Form Latest... SKIPPED (no form ID available)"
fi
echo ""

# Test 6: Get Form Version (if we have a form ID)
if [ -n "$FIRST_FORM_ID" ] && [ -n "$FIRST_FORM_VERSION" ]; then
    echo "6. Testing Get Form Version..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:8080/api/forms/$FIRST_FORM_ID/$FIRST_FORM_VERSION")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "   ✓ PASS - HTTP $HTTP_CODE"
        echo "   Form retrieved successfully"
    else
        echo "   ✗ FAIL - HTTP $HTTP_CODE"
        echo "   Response: $BODY"
    fi
else
    echo "6. Testing Get Form Version... SKIPPED (no form ID/version available)"
fi
echo ""

# Test 7: List Attributes
echo "7. Testing List Attributes..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/api/attributes)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    ATTR_COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "N/A")
    echo "   Attributes found: $ATTR_COUNT"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 8: List Questions
echo "8. Testing List Questions..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/api/questions)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    Q_COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "N/A")
    echo "   Questions found: $Q_COUNT"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 9: Upload Sign
echo "9. Testing Upload Sign..."
UPLOAD_DATA='{"filename":"test.jpg","contentType":"image/jpeg"}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$UPLOAD_DATA" \
  http://localhost:8080/api/uploads/sign)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    echo "   Upload signature generated"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 10: Generate Form
echo "10. Testing Generate Form..."
GENERATE_DATA='{"attributes":["phone_number"]}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$GENERATE_DATA" \
  http://localhost:8080/api/forms/generate)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
    echo "   Form generated successfully"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 11: Submit Form (should fail without valid form)
echo "11. Testing Submit Form (invalid form)..."
SUBMIT_DATA='{"formId":"invalid-form","version":1,"answers":{},"locale":"en","device":"web"}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_DATA" \
  http://localhost:8080/api/submissions)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 404 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE (Expected error for invalid form)"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE (Expected 400 or 404)"
    echo "   Response: $BODY"
fi
echo ""

# Test 12: Unauthorized Access
echo "12. Testing Unauthorized Access..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/forms)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE (Correctly rejected)"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE (Expected 401)"
    echo "   Response: $BODY"
    echo "   ISSUE: Endpoint should require authentication"
fi
echo ""

# Test 13: Invalid Token
echo "13. Testing Invalid Token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer wrong-token" http://localhost:8080/api/forms)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE (Correctly rejected)"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE (Expected 401)"
    echo "   Response: $BODY"
    echo "   ISSUE: Invalid token should be rejected"
fi
echo ""

# Test 14: API Key Authentication (Header)
echo "14. Testing API Key Authentication (Header)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $ADMIN_TOKEN" http://localhost:8080/api/forms/create -X POST \
  -H "Content-Type: application/json" \
  -d "$FORM_DATA")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 15: API Key Authentication (Query)
echo "15. Testing API Key Authentication (Query)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:8080/api/forms/create?api_key=$ADMIN_TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d "$FORM_DATA")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ PASS - HTTP $HTTP_CODE"
else
    echo "   ✗ FAIL - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

echo "=========================================="
echo "Testing Complete"
echo "=========================================="

