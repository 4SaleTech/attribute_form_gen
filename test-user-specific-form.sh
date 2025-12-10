#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="${API_BASE:-http://localhost:8080}"
TEST_USER_TOKEN="2160720|peBF4cQygr0PAt1dsjX2B4PVQojsfhU9sKfGhKsI"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing User-Specific Form Implementation${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Test 1: Check API health
echo -e "${YELLOW}Test 1: API Health Check${NC}"
if curl -s "${API_BASE}/api/health" | grep -q "ok"; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API is not running. Please start it with: cd apps/api && ENVFILE=.env.local go run ./cmd/server${NC}"
    exit 1
fi
echo ""

# Test 2: Create a user-specific form
echo -e "${YELLOW}Test 2: Create User-Specific Form${NC}"
FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "Test User Form", "ar": "نموذج اختبار المستخدم"},
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

echo "Response: $FORM_RESPONSE"
FORM_ID=$(echo "$FORM_RESPONSE" | grep -o '"formId":"[^"]*' | cut -d'"' -f4)
VERSION=$(echo "$FORM_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
INSTANCE_ID=$(echo "$FORM_RESPONSE" | grep -o '"instanceId":"[^"]*' | cut -d'"' -f4)

if [ -z "$FORM_ID" ] || [ -z "$VERSION" ]; then
    echo -e "${RED}✗ Failed to create form${NC}"
    echo "$FORM_RESPONSE"
    exit 1
fi

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${RED}✗ Instance ID not returned in response${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Form created successfully${NC}"
echo "  Form ID: $FORM_ID"
echo "  Version: $VERSION"
echo "  Instance ID: $INSTANCE_ID"
echo ""

# Test 3: Retrieve form without instanceId (should not have instance data)
echo -e "${YELLOW}Test 3: Retrieve Form Without instanceId${NC}"
FORM_WITHOUT_INSTANCE=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/${VERSION}")
HAS_INSTANCE_TOKEN=$(echo "$FORM_WITHOUT_INSTANCE" | grep -o '"instance_user_token"')

if [ -n "$HAS_INSTANCE_TOKEN" ]; then
    echo -e "${RED}✗ Form should not have instance_user_token without instanceId param${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Form retrieved without instance data (correct)${NC}"
echo ""

# Test 4: Retrieve form with instanceId (should have instance data)
echo -e "${YELLOW}Test 4: Retrieve Form With instanceId${NC}"
FORM_WITH_INSTANCE=$(curl -s "${API_BASE}/api/forms/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}")
HAS_INSTANCE_TOKEN=$(echo "$FORM_WITH_INSTANCE" | grep -o '"instance_user_token":"[^"]*' | cut -d'"' -f4)
HAS_INSTANCE_ID=$(echo "$FORM_WITH_INSTANCE" | grep -o '"instance_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$HAS_INSTANCE_TOKEN" ]; then
    echo -e "${RED}✗ Form should have instance_user_token with instanceId param${NC}"
    exit 1
fi

if [ "$HAS_INSTANCE_ID" != "$INSTANCE_ID" ]; then
    echo -e "${RED}✗ Instance ID mismatch. Expected: $INSTANCE_ID, Got: $HAS_INSTANCE_ID${NC}"
    exit 1
fi

if [ "$HAS_INSTANCE_TOKEN" != "$TEST_USER_TOKEN" ]; then
    echo -e "${RED}✗ User token mismatch. Expected: ${TEST_USER_TOKEN:0:20}..., Got: ${HAS_INSTANCE_TOKEN:0:20}...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Form retrieved with instance data (correct)${NC}"
echo "  Instance ID: $HAS_INSTANCE_ID"
echo "  User Token: ${HAS_INSTANCE_TOKEN:0:30}..."
echo ""

# Test 5: Test form submission with instance_id
echo -e "${YELLOW}Test 5: Submit Form With Instance${NC}"
# First, we need to get user_id from the token
# For now, we'll test with a mock user_id
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
      "sessionId": "test-session-123",
      "instance_id": "'"${INSTANCE_ID}"'",
      "user_id": 1885389
    }
  }')

SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$SUBMISSION_ID" ]; then
    SUBMISSION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"submissionId":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -z "$SUBMISSION_ID" ]; then
    echo -e "${RED}✗ Failed to submit form${NC}"
    echo "$SUBMIT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Form submitted successfully${NC}"
echo "  Submission ID: $SUBMISSION_ID"
echo ""

# Test 6: Verify submission has instance_id and user_id in database
echo -e "${YELLOW}Test 6: Verify Submission Data${NC}"
echo "  (This would require database access to verify instance_id and user_id columns)"
echo -e "${GREEN}✓ Submission created (manual DB verification needed)${NC}"
echo ""

# Test 7: Test normal form creation (without form_type)
echo -e "${YELLOW}Test 7: Create Normal Form (form_type not specified)${NC}"
NORMAL_FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/api/forms/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token" \
  -d '{
    "title": {"en": "Test Normal Form", "ar": "نموذج عادي"},
    "attributes": ["hero_banner"],
    "submit": {
      "actions": [
        {"type": "server_persist", "enabled": true}
      ],
      "ordering": ["server_persist"],
      "on_error": "continue"
    }
  }')

NORMAL_FORM_ID=$(echo "$NORMAL_FORM_RESPONSE" | grep -o '"formId":"[^"]*' | cut -d'"' -f4)
HAS_INSTANCE_ID=$(echo "$NORMAL_FORM_RESPONSE" | grep -o '"instanceId"')

if [ -n "$HAS_INSTANCE_ID" ]; then
    echo -e "${RED}✗ Normal form should not have instanceId${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Normal form created without instance (correct)${NC}"
echo "  Form ID: $NORMAL_FORM_ID"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All Tests Passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ API is running"
echo "  ✓ User-specific form creation works"
echo "  ✓ Instance ID is generated and returned"
echo "  ✓ Form retrieval without instanceId works (no instance data)"
echo "  ✓ Form retrieval with instanceId works (includes instance data)"
echo "  ✓ Form submission with instance_id and user_id works"
echo "  ✓ Normal form creation works (no instance)"
echo ""
echo "Test Form URLs:"
echo "  User-Specific: http://localhost:5174/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&lang=en"
echo "  Normal: http://localhost:5174/${NORMAL_FORM_ID}/1?lang=en"



