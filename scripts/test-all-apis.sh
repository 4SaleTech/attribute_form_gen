#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://127.0.0.1:8081}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
API_KEY="${API_KEY:-test-api-key}"

PASSED=0
FAILED=0

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local auth_type=$3  # "none", "admin", "apikey"
    local data=$4
    local expected_status=$5
    local description=$6
    
    local url="${BASE_URL}${endpoint}"
    local headers=()
    local status_code
    
    # Set auth headers
    if [ "$auth_type" = "admin" ]; then
        headers+=("-H" "Authorization: Bearer ${ADMIN_TOKEN}")
    elif [ "$auth_type" = "apikey" ]; then
        headers+=("-H" "X-API-Key: ${API_KEY}")
    fi
    
    # Make request
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" "$url" 2>&1)
    elif [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "DELETE" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -H "Content-Type: application/json" -d "$data" "$url" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" "$url" 2>&1)
        fi
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check if status matches expected
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ${description}"
        echo -e "  ${BLUE}${method}${NC} ${endpoint} → ${GREEN}${status_code}${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} ${description}"
        echo -e "  ${BLUE}${method}${NC} ${endpoint} → ${RED}${status_code}${NC} (expected ${expected_status})"
        if [ -n "$body" ]; then
            echo -e "  Response: ${RED}$(echo "$body" | head -c 200)${NC}"
        fi
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing All API Endpoints${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Base URL: ${BASE_URL}"
echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
echo ""

# Get a form ID and version for testing
echo -e "${BLUE}Fetching test form data...${NC}"
FORMS_RESPONSE=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/forms")
FORM_ID=$(echo "$FORMS_RESPONSE" | grep -o '"formId":"[^"]*"' | head -1 | cut -d'"' -f4)
FORM_VERSION=$(echo "$FORMS_RESPONSE" | grep -o '"version":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$FORM_ID" ]; then
    FORM_ID="test-form"
    FORM_VERSION="1"
    echo -e "${YELLOW}Warning: No forms found, using test values${NC}"
fi

echo "Using Form ID: ${FORM_ID}, Version: ${FORM_VERSION}"
echo ""

# ==========================================
# PUBLIC ENDPOINTS (No Auth)
# ==========================================
echo -e "${YELLOW}--- Public Endpoints ---${NC}"

test_endpoint "GET" "/api/health" "none" "" "200" "Health check"
test_endpoint "GET" "/api/config" "none" "" "200" "Get config"

# Test form endpoints
if [ -n "$FORM_ID" ] && [ "$FORM_ID" != "test-form" ]; then
    test_endpoint "GET" "/api/forms/${FORM_ID}/latest" "none" "" "200" "Get latest form version"
    test_endpoint "GET" "/api/forms/${FORM_ID}/${FORM_VERSION}" "none" "" "200" "Get form by version"
fi

# Test form generation
test_endpoint "POST" "/api/forms/generate" "none" '{"formId":"test-gen","title":{"en":"Test Form","ar":"نموذج اختبار"},"attributes":[],"thankYou":{"show":false},"submit":{"actions":[{"type":"server_persist","enabled":true}]}}' "200" "Generate form"

# Test upload sign (may fail if Cloudinary not configured, but should return 400/500, not 401)
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d '{"filename":"test.jpg","contentType":"image/jpeg"}' "${BASE_URL}/api/uploads/sign" 2>&1)
UPLOAD_STATUS=$(echo "$UPLOAD_RESPONSE" | tail -n1)
if [ "$UPLOAD_STATUS" = "200" ] || [ "$UPLOAD_STATUS" = "400" ] || [ "$UPLOAD_STATUS" = "500" ]; then
    echo -e "${GREEN}✓${NC} Upload sign endpoint"
    echo -e "  ${BLUE}POST${NC} /api/uploads/sign → ${GREEN}${UPLOAD_STATUS}${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Upload sign endpoint"
    echo -e "  ${BLUE}POST${NC} /api/uploads/sign → ${RED}${UPLOAD_STATUS}${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ==========================================
# ADMIN ENDPOINTS (Bearer Token)
# ==========================================
echo -e "${YELLOW}--- Admin Endpoints (Bearer Token) ---${NC}"

test_endpoint "GET" "/api/forms" "admin" "" "200" "List all forms"
test_endpoint "GET" "/api/attributes" "admin" "" "200" "List attributes"
test_endpoint "GET" "/api/questions" "admin" "" "200" "List questions"
test_endpoint "GET" "/api/submissions" "admin" "" "200" "List submissions"

# Test form webhooks (if form exists)
if [ -n "$FORM_ID" ] && [ "$FORM_ID" != "test-form" ]; then
    test_endpoint "GET" "/api/forms/${FORM_ID}/${FORM_VERSION}/webhooks" "admin" "" "200" "List webhooks for form"
fi

# Test creating an attribute
ATTRIBUTE_KEY="test_attr_$(date +%s)"
test_endpoint "POST" "/api/attributes" "admin" "{\"key\":\"${ATTRIBUTE_KEY}\",\"label\":{\"en\":\"Test Attribute\",\"ar\":\"اختبار\"},\"defaultPosition\":0}" "201" "Create attribute"

# Test updating the attribute
test_endpoint "PUT" "/api/attributes/${ATTRIBUTE_KEY}" "admin" "{\"label\":{\"en\":\"Updated Test\",\"ar\":\"محدث\"},\"defaultPosition\":1}" "204" "Update attribute"

# Test creating a question
QUESTION_DATA="{\"attributeKey\":\"${ATTRIBUTE_KEY}\",\"type\":\"text\",\"name\":\"test_field\",\"label\":{\"en\":\"Test Field\",\"ar\":\"حقل اختبار\"},\"props\":{},\"status\":\"active\"}"
test_endpoint "POST" "/api/questions" "admin" "$QUESTION_DATA" "201" "Create question"

# Test form publish (use empty attributes array since we'll clean up the test attribute)
PUBLISH_DATA="{\"formId\":\"test-publish-$(date +%s)\",\"title\":{\"en\":\"Test Publish\",\"ar\":\"اختبار نشر\"},\"attributes\":[],\"thankYou\":{\"show\":false},\"submit\":{\"actions\":[{\"type\":\"server_persist\",\"enabled\":true}],\"on_error\":\"continue\"}}"
test_endpoint "POST" "/api/forms/publish" "admin" "$PUBLISH_DATA" "200" "Publish form"

# Test invalid endpoints (should return 404 or 400)
test_endpoint "GET" "/api/forms/invalid-form-id/999" "admin" "" "404" "Get non-existent form (404 expected)"
test_endpoint "GET" "/api/submissions/999999" "admin" "" "404" "Get non-existent submission (404 expected)"

# Test delete question (cleanup)
QUESTION_ID=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/questions" | grep -o "\"id\":[0-9]*" | grep -o "[0-9]*" | head -1)
if [ -n "$QUESTION_ID" ]; then
    test_endpoint "DELETE" "/api/questions/${QUESTION_ID}" "admin" "" "204" "Delete question"
fi

# Test delete attribute (cleanup)
test_endpoint "DELETE" "/api/attributes/${ATTRIBUTE_KEY}" "admin" "" "204" "Delete attribute"

# Test delete form snapshot (if form exists)
if [ -n "$FORM_ID" ] && [ "$FORM_ID" != "test-form" ] && [ -n "$FORM_VERSION" ]; then
    # Create a test form version to delete
    TEST_DELETE_FORM="test-delete-$(date +%s)"
    DELETE_PUBLISH_DATA="{\"formId\":\"${TEST_DELETE_FORM}\",\"title\":{\"en\":\"Delete Test\",\"ar\":\"حذف اختبار\"},\"attributes\":[],\"fields\":[],\"thankYou\":{\"show\":false},\"submit\":{\"actions\":[\"server_persist\"]}}"
    curl -s -X POST -H "Authorization: Bearer ${ADMIN_TOKEN}" -H "Content-Type: application/json" -d "$DELETE_PUBLISH_DATA" "${BASE_URL}/api/forms/publish" > /dev/null
    sleep 1
    test_endpoint "DELETE" "/api/forms/${TEST_DELETE_FORM}/1" "admin" "" "204" "Delete form snapshot"
fi

echo ""

# ==========================================
# AUTHENTICATION TESTS
# ==========================================
echo -e "${YELLOW}--- Authentication Tests ---${NC}"

# Test without auth (should fail)
test_endpoint "GET" "/api/forms" "none" "" "401" "Admin endpoint without auth (401 expected)"

# Test with invalid token
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid-token" "${BASE_URL}/api/forms" 2>&1)
INVALID_STATUS=$(echo "$INVALID_RESPONSE" | tail -n1)
if [ "$INVALID_STATUS" = "401" ]; then
    echo -e "${GREEN}✓${NC} Invalid token rejected"
    echo -e "  ${BLUE}GET${NC} /api/forms (invalid token) → ${GREEN}401${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Invalid token not rejected"
    echo -e "  ${BLUE}GET${NC} /api/forms (invalid token) → ${RED}${INVALID_STATUS}${NC} (expected 401)"
    FAILED=$((FAILED + 1))
fi

echo ""

# ==========================================
# SUMMARY
# ==========================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

