#!/bin/bash

BASE_URL="http://localhost:8080/api"
ADMIN_TOKEN="dev-admin-token"
API_KEY="dev-admin-token"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local auth_type=$4  # "bearer", "apikey", "none"
    local data=$5
    local expected_status=${6:-200}
    
    echo -n "Testing $name... "
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    # Add auth header
    case $auth_type in
        bearer)
            curl_cmd="$curl_cmd -H 'Authorization: Bearer $ADMIN_TOKEN'"
            ;;
        apikey)
            curl_cmd="$curl_cmd -H 'X-API-Key: $API_KEY'"
            ;;
        apikey_query)
            curl_cmd="$curl_cmd '${BASE_URL}${endpoint}?api_key=${API_KEY}'"
            endpoint=""  # Clear endpoint since it's in URL
            ;;
    esac
    
    # Add content type and data if provided
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    # Add endpoint if not in query string
    if [ -n "$endpoint" ]; then
        curl_cmd="$curl_cmd '${BASE_URL}${endpoint}'"
    fi
    
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "  Response: $body" | head -c 200
        echo ""
        ((FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "API Endpoint Testing"
echo "=========================================="
echo ""

# 1. Health Check
test_endpoint "Health Check" "GET" "/health" "none" "" 200

# 2. Config Endpoint
test_endpoint "Config Endpoint" "GET" "/config" "none" "" 200

# 3. List Attributes (Admin)
test_endpoint "List Attributes (Admin)" "GET" "/attributes" "bearer" "" 200

# 4. List Questions (Admin)
test_endpoint "List Questions (Admin)" "GET" "/questions" "bearer" "" 200

# 5. List Forms (Admin)
test_endpoint "List Forms (Admin)" "GET" "/forms" "bearer" "" 200

# 6. List Submissions (Admin)
test_endpoint "List Submissions (Admin)" "GET" "/submissions" "bearer" "" 200

# 7. Create Form (Bearer Token)
FORM_DATA='{
  "title": {
    "en": "Test Form",
    "ar": "نموذج اختبار"
  },
  "attributes": ["phone_number"]
}'
test_endpoint "Create Form (Bearer)" "POST" "/forms/publish" "bearer" "$FORM_DATA" 200

# Extract form_id and version from response if successful
if [ $? -eq 0 ]; then
    # We'll need to parse this, but for now just note it
    TEST_FORM_ID="test-form-$(date +%s)"
fi

# 8. Create Form (API Key Header)
test_endpoint "Create Form (API Key Header)" "POST" "/forms/create" "apikey" "$FORM_DATA" 200

# 9. Create Form (API Key Query)
test_endpoint "Create Form (API Key Query)" "POST" "/forms/create" "apikey_query" "$FORM_DATA" 200

# 10. Get Form Latest (should fail if no forms exist, or succeed if forms exist)
test_endpoint "Get Form Latest" "GET" "/forms/test-form-123/latest" "none" "" "200|404"

# 11. Get Form Version (should fail if no forms exist)
test_endpoint "Get Form Version" "GET" "/forms/test-form-123/1" "none" "" "200|404"

# 12. Upload Sign
UPLOAD_DATA='{
  "filename": "test.jpg",
  "contentType": "image/jpeg"
}'
test_endpoint "Upload Sign" "POST" "/uploads/sign" "none" "$UPLOAD_DATA" 200

# 13. Generate Form
GENERATE_DATA='{
  "attributes": ["phone_number"]
}'
test_endpoint "Generate Form" "POST" "/forms/generate" "none" "$GENERATE_DATA" 200

# 14. Submit Form (should fail without valid form)
SUBMIT_DATA='{
  "formId": "test-form-123",
  "version": 1,
  "answers": {},
  "locale": "en",
  "device": "web"
}'
test_endpoint "Submit Form" "POST" "/submissions" "none" "$SUBMIT_DATA" "400|404"

# 15. Test unauthorized access
test_endpoint "Unauthorized Access" "GET" "/forms" "none" "" 401

# 16. Test invalid auth
test_endpoint "Invalid Auth" "GET" "/forms" "bearer" "" 401
# Override with wrong token
ADMIN_TOKEN_OLD=$ADMIN_TOKEN
ADMIN_TOKEN="wrong-token"
test_endpoint "Wrong Token" "GET" "/forms" "bearer" "" 401
ADMIN_TOKEN=$ADMIN_TOKEN_OLD

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi

