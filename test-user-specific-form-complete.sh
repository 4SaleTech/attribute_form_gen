#!/bin/bash
set -e

# Comprehensive test script for user-specific form implementation
# Tests all functionality end-to-end

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_BASE="${API_BASE:-http://localhost:8080}"
TEST_USER_TOKEN="2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI"
PASSED=0
FAILED=0

# Test counter
test_count=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
    ((test_count++))
}

fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    echo "  Details: $2"
    ((FAILED++))
    ((test_count++))
}

info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

section() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

# Check API health
section "Test 1: API Health Check"
if curl -s "${API_BASE}/api/health" | grep -q "ok"; then
    pass "API is running"
else
    fail "API is not running" "Please start API server"
    exit 1
fi

# Test 2: Create user-specific form
section "Test 2: Create User-Specific Form"
TIMESTAMP=$(date +%s)
FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "User Test Form '"${TIMESTAMP}"'", "ar": "نموذج اختبار المستخدم '"${TIMESTAMP}"'"},
    "attributes": ["hero_banner", "phone_number"],
    "form_type": "user_specific",
    "user_token": "'"${TEST_USER_TOKEN}"'",
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true}
      ],
      "ordering": ["server_persist"],
      "on_error": "continue"
    }
  }')

FORM_ID=$(echo "$FORM_RESPONSE" | grep -o '"formId":"[^"]*' | cut -d'"' -f4)
VERSION=$(echo "$FORM_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
INSTANCE_ID=$(echo "$FORM_RESPONSE" | grep -o '"instanceId":"[^"]*' | cut -d'"' -f4)
IS_DUPLICATE=$(echo "$FORM_RESPONSE" | grep -o '"isDuplicate":[^,}]*' | cut -d':' -f2)

if [ -z "$FORM_ID" ] || [ -z "$VERSION" ]; then
    fail "Form creation failed" "$FORM_RESPONSE"
    exit 1
fi

if [ "$IS_DUPLICATE" = "true" ]; then
    info "Form is duplicate (this is okay, reusing existing form)"
    # For duplicate, instance might not be created, so we'll test with a new form
    TIMESTAMP=$(date +%s)
    FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/forms/publish" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer dev-admin-token" \
      -d '{
        "title": {"en": "Unique Test '"${TIMESTAMP}"'", "ar": "اختبار فريد '"${TIMESTAMP}"'"},
        "attributes": ["hero_banner"],
        "form_type": "user_specific",
        "user_token": "'"${TEST_USER_TOKEN}"'",
        "submit": {
          "actions": [{"type": "server_persist", "enabled": true}],
          "ordering": ["server_persist"],
          "on_error": "continue"
        }
      }')
    FORM_ID=$(echo "$FORM_RESPONSE" | grep -o '"formId":"[^"]*' | cut -d'"' -f4)
    VERSION=$(echo "$FORM_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
    INSTANCE_ID=$(echo "$FORM_RESPONSE" | grep -o '"instanceId":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$INSTANCE_ID" ]; then
    fail "Instance ID not returned" "Response: $FORM_RESPONSE"
    exit 1
fi

pass "User-specific form created"
info "  Form ID: $FORM_ID"
info "  Version: $VERSION"
info "  Instance ID: $INSTANCE_ID"

# Test 3: Retrieve form without instanceId
section "Test 3: Retrieve Form Without instanceId"
FORM_WITHOUT_INSTANCE=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/${VERSION}")
HAS_INSTANCE_TOKEN=$(echo "$FORM_WITHOUT_INSTANCE" | grep -o '"instance_user_token"')
HAS_INSTANCE_ID=$(echo "$FORM_WITHOUT_INSTANCE" | grep -o '"instance_id"')

if [ -n "$HAS_INSTANCE_TOKEN" ] || [ -n "$HAS_INSTANCE_ID" ]; then
    fail "Form should not have instance data without instanceId param" "Found instance data in response"
else
    pass "Form retrieved without instance data (correct)"
fi

# Test 4: Retrieve form with instanceId
section "Test 4: Retrieve Form With instanceId"
FORM_WITH_INSTANCE=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}")
RETRIEVED_INSTANCE_TOKEN=$(echo "$FORM_WITH_INSTANCE" | grep -o '"instance_user_token":"[^"]*' | cut -d'"' -f4)
RETRIEVED_INSTANCE_ID=$(echo "$FORM_WITH_INSTANCE" | grep -o '"instance_id":"[^"]*' | cut -d'"' -f4)
HAS_FORM_TYPE=$(echo "$FORM_WITH_INSTANCE" | grep -o '"form_type":"[^"]*' | cut -d'"' -f4)

if [ -z "$RETRIEVED_INSTANCE_TOKEN" ]; then
    fail "Form should have instance_user_token with instanceId param" "Token not found in response"
elif [ "$RETRIEVED_INSTANCE_TOKEN" != "$TEST_USER_TOKEN" ]; then
    fail "User token mismatch" "Expected: ${TEST_USER_TOKEN:0:30}..., Got: ${RETRIEVED_INSTANCE_TOKEN:0:30}..."
else
    pass "Form retrieved with correct instance token"
fi

if [ "$RETRIEVED_INSTANCE_ID" != "$INSTANCE_ID" ]; then
    fail "Instance ID mismatch" "Expected: $INSTANCE_ID, Got: $RETRIEVED_INSTANCE_ID"
else
    pass "Instance ID matches"
fi

if [ "$HAS_FORM_TYPE" != "user_specific" ]; then
    fail "Form type should be user_specific" "Got: $HAS_FORM_TYPE"
else
    pass "Form type is correct"
fi

# Test 5: Test form submission with instance_id and user_id
section "Test 5: Submit Form With Instance"
SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE}/api/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "'"${FORM_ID}"'",
    "version": '"${VERSION}"',
    "submittedAt": '$(date +%s000)',
    "answers": {
      "phone_number": "+1234567890"
    },
    "meta": {
      "locale": "en",
      "device": "web",
      "attributes": ["hero_banner", "phone_number"],
      "sessionId": "test-session-'"${TIMESTAMP}"'",
      "instance_id": "'"${INSTANCE_ID}"'",
      "user_id": 1885389
    }
  }')

SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$SUBMISSION_ID" ]; then
    SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"submissionId":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -z "$SUBMISSION_ID" ]; then
    fail "Form submission failed" "$SUBMIT_RESPONSE"
else
    pass "Form submitted successfully"
    info "  Submission ID: $SUBMISSION_ID"
fi

# Test 6: Create normal form (without form_type)
section "Test 6: Create Normal Form"
NORMAL_FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "Normal Test '"${TIMESTAMP}"'", "ar": "اختبار عادي '"${TIMESTAMP}"'"},
    "attributes": ["hero_banner"],
    "submit": {
      "actions": [{"type": "server_persist", "enabled": true}],
      "ordering": ["server_persist"],
      "on_error": "continue"
    }
  }')

NORMAL_FORM_ID=$(echo "$NORMAL_FORM_RESPONSE" | grep -o '"formId":"[^"]*' | cut -d'"' -f4)
NORMAL_HAS_INSTANCE_ID=$(echo "$NORMAL_FORM_RESPONSE" | grep -o '"instanceId"')

if [ -z "$NORMAL_FORM_ID" ]; then
    fail "Normal form creation failed" "$NORMAL_FORM_RESPONSE"
elif [ -n "$NORMAL_HAS_INSTANCE_ID" ]; then
    fail "Normal form should not have instanceId" "Found instanceId in response"
else
    pass "Normal form created without instance"
fi

# Test 7: Test URL format with both instanceId and sessionId
section "Test 7: URL Format Test"
URL_WITH_BOTH="${API_BASE}/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&sessionId=test-session-123&lang=en"
info "Testing URL format: $URL_WITH_BOTH"
FORM_FROM_URL=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&sessionId=test-session-123")
URL_INSTANCE_TOKEN=$(echo "$FORM_FROM_URL" | grep -o '"instance_user_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$URL_INSTANCE_TOKEN" ]; then
    pass "URL with both instanceId and sessionId works correctly"
else
    fail "URL format test failed" "Instance token not found"
fi

# Summary
section "Test Summary"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total:  $test_count"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ All Tests Passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Test Form URLs:"
    echo "  User-Specific: http://localhost:5174/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&lang=en&sessionId=test-session"
    echo "  Normal: http://localhost:5174/${NORMAL_FORM_ID}/1?lang=en"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Some Tests Failed${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi



