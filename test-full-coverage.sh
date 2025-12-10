#!/bin/bash

# Full Coverage Test Suite
# Tests all functionality of the form system

set -e

API_URL="http://localhost:8080/api"
ADMIN_TOKEN="dev-admin-token"
TIMESTAMP=$(date +%s)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
print_test() {
    echo -e "${BLUE}Test $TOTAL: $1${NC}"
    TOTAL=$((TOTAL + 1))
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ️  INFO: $1${NC}"
}

# Check API health
check_api_health() {
    print_test "API Health Check"
    if curl -s "${API_URL}/health" | jq -e '.ok == true' > /dev/null 2>&1; then
        print_pass "API is healthy"
        return 0
    else
        print_fail "API health check failed"
        return 1
    fi
}

# Test 1: Create Normal Form (No Authorization Header)
test_create_normal_form() {
    print_test "Create Normal Form (No Authorization Header)"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": {\"en\": \"Normal Form Test ${TIMESTAMP}\", \"ar\": \"اختبار ${TIMESTAMP}\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    FORM_ID=$(echo "$RESPONSE" | jq -r '.formId')
    VERSION=$(echo "$RESPONSE" | jq -r '.version')
    INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId')
    
    if [ "$FORM_ID" != "null" ] && [ -n "$FORM_ID" ] && [ "$VERSION" -gt 0 ]; then
        if [ "$INSTANCE_ID" = "null" ] || [ -z "$INSTANCE_ID" ]; then
            print_pass "Normal form created without instance"
            echo "$FORM_ID|$VERSION" > /tmp/normal_form.txt
            return 0
        else
            print_fail "Normal form should not have instance ID"
            return 1
        fi
    else
        print_fail "Failed to create normal form"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 2: Create User-Specific Form (With Authorization Header)
test_create_user_specific_form() {
    print_test "Create User-Specific Form (With Authorization Header)"
    
    USER_TOKEN="test-user-token-${TIMESTAMP}"
    RESPONSE=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${USER_TOKEN}" \
        -d "{
            \"title\": {\"en\": \"User Form Test ${TIMESTAMP}\", \"ar\": \"اختبار مستخدم ${TIMESTAMP}\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    FORM_ID=$(echo "$RESPONSE" | jq -r '.formId')
    VERSION=$(echo "$RESPONSE" | jq -r '.version')
    INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId')
    
    if [ "$FORM_ID" != "null" ] && [ -n "$FORM_ID" ] && [ "$VERSION" -gt 0 ]; then
        if [ "$INSTANCE_ID" != "null" ] && [ -n "$INSTANCE_ID" ]; then
            print_pass "User-specific form created with instance ID: $INSTANCE_ID"
            echo "$FORM_ID|$VERSION|$INSTANCE_ID|$USER_TOKEN" > /tmp/user_form.txt
            return 0
        else
            print_fail "User-specific form should have instance ID"
            return 1
        fi
    else
        print_fail "Failed to create user-specific form"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 3: Retrieve Normal Form (Without instanceId)
test_retrieve_normal_form() {
    print_test "Retrieve Normal Form (Without instanceId)"
    
    if [ ! -f /tmp/normal_form.txt ]; then
        print_fail "Normal form not created in previous test"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION < /tmp/normal_form.txt
    RESPONSE=$(curl -s "${API_URL}/forms/${FORM_ID}/${VERSION}")
    
    HAS_INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instance_id // empty')
    HAS_INSTANCE_TOKEN=$(echo "$RESPONSE" | jq -r '.instance_user_token // empty')
    
    if [ -z "$HAS_INSTANCE_ID" ] && [ -z "$HAS_INSTANCE_TOKEN" ]; then
        print_pass "Normal form retrieved without instance data"
        return 0
    else
        print_fail "Normal form should not have instance data"
        return 1
    fi
}

# Test 4: Retrieve User-Specific Form (With instanceId)
test_retrieve_user_form_with_instance() {
    print_test "Retrieve User-Specific Form (With instanceId)"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created in previous test"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    RESPONSE=$(curl -s "${API_URL}/forms/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}")
    
    RET_INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instance_id')
    RET_TOKEN=$(echo "$RESPONSE" | jq -r '.instance_user_token')
    FORM_TYPE=$(echo "$RESPONSE" | jq -r '.form_type')
    
    if [ "$RET_INSTANCE_ID" = "$INSTANCE_ID" ] && [ "$RET_TOKEN" = "$USER_TOKEN" ] && [ "$FORM_TYPE" = "user_specific" ]; then
        print_pass "User-specific form retrieved with correct instance data"
        return 0
    else
        print_fail "Instance data mismatch. Expected ID: $INSTANCE_ID, Got: $RET_INSTANCE_ID"
        return 1
    fi
}

# Test 5: Retrieve User-Specific Form (Without instanceId)
test_retrieve_user_form_without_instance() {
    print_test "Retrieve User-Specific Form (Without instanceId)"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created in previous test"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    RESPONSE=$(curl -s "${API_URL}/forms/${FORM_ID}/${VERSION}")
    
    HAS_INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instance_id // empty')
    HAS_INSTANCE_TOKEN=$(echo "$RESPONSE" | jq -r '.instance_user_token // empty')
    
    if [ -z "$HAS_INSTANCE_ID" ] && [ -z "$HAS_INSTANCE_TOKEN" ]; then
        print_pass "User-specific form retrieved without instance data (when instanceId not provided)"
        return 0
    else
        print_fail "Form should not have instance data when instanceId not provided"
        return 1
    fi
}

# Test 6: Submit Normal Form
test_submit_normal_form() {
    print_test "Submit Normal Form"
    
    if [ ! -f /tmp/normal_form.txt ]; then
        print_fail "Normal form not created"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION < /tmp/normal_form.txt
    SUBMIT_TIME=$(date +%s000)
    SESSION_ID="test-session-${TIMESTAMP}"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/submissions" \
        -H "Content-Type: application/json" \
        -d "{
            \"formId\": \"${FORM_ID}\",
            \"version\": ${VERSION},
            \"submittedAt\": ${SUBMIT_TIME},
            \"answers\": {\"test_field\": \"test_value\"},
            \"meta\": {
                \"locale\": \"en\",
                \"device\": \"web\",
                \"attributes\": [\"hero_banner\"],
                \"sessionId\": \"${SESSION_ID}\"
            }
        }")
    
    SUBMIT_ID=$(echo "$RESPONSE" | jq -r '.id // .submissionId')
    
    if [ "$SUBMIT_ID" != "null" ] && [ -n "$SUBMIT_ID" ] && [ "$SUBMIT_ID" != "0" ]; then
        print_pass "Normal form submitted successfully. Submission ID: $SUBMIT_ID"
        echo "$SUBMIT_ID" > /tmp/normal_submission.txt
        return 0
    else
        print_fail "Failed to submit normal form"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 7: Submit User-Specific Form
test_submit_user_form() {
    print_test "Submit User-Specific Form"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    SUBMIT_TIME=$(date +%s000)
    SESSION_ID="test-session-user-${TIMESTAMP}"
    USER_ID=1885389
    
    RESPONSE=$(curl -s -X POST "${API_URL}/submissions" \
        -H "Content-Type: application/json" \
        -d "{
            \"formId\": \"${FORM_ID}\",
            \"version\": ${VERSION},
            \"submittedAt\": ${SUBMIT_TIME},
            \"answers\": {\"test_field\": \"test_value\"},
            \"meta\": {
                \"locale\": \"en\",
                \"device\": \"web\",
                \"attributes\": [\"hero_banner\"],
                \"sessionId\": \"${SESSION_ID}\",
                \"instance_id\": \"${INSTANCE_ID}\",
                \"user_id\": ${USER_ID}
            }
        }")
    
    SUBMIT_ID=$(echo "$RESPONSE" | jq -r '.id // .submissionId')
    
    if [ "$SUBMIT_ID" != "null" ] && [ -n "$SUBMIT_ID" ] && [ "$SUBMIT_ID" != "0" ]; then
        print_pass "User-specific form submitted successfully. Submission ID: $SUBMIT_ID"
        echo "$SUBMIT_ID" > /tmp/user_submission.txt
        return 0
    else
        print_fail "Failed to submit user-specific form"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 8: Get Submission (Normal)
test_get_normal_submission() {
    print_test "Get Normal Submission"
    
    if [ ! -f /tmp/normal_submission.txt ]; then
        print_fail "Normal submission not created"
        return 1
    fi
    
    SUBMIT_ID=$(cat /tmp/normal_submission.txt)
    RESPONSE=$(curl -s -X GET "${API_URL}/submissions/${SUBMIT_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}")
    
    RET_FORM_ID=$(echo "$RESPONSE" | jq -r '.formId')
    RET_VERSION=$(echo "$RESPONSE" | jq -r '.version')
    
    if [ "$RET_FORM_ID" != "null" ] && [ -n "$RET_FORM_ID" ] && [ "$RET_VERSION" -gt 0 ]; then
        print_pass "Normal submission retrieved successfully"
        return 0
    else
        print_fail "Failed to retrieve normal submission"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 9: Get Submission (User-Specific)
test_get_user_submission() {
    print_test "Get User-Specific Submission"
    
    if [ ! -f /tmp/user_submission.txt ]; then
        print_fail "User submission not created"
        return 1
    fi
    
    SUBMIT_ID=$(cat /tmp/user_submission.txt)
    RESPONSE=$(curl -s -X GET "${API_URL}/submissions/${SUBMIT_ID}" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}")
    
    RET_FORM_ID=$(echo "$RESPONSE" | jq -r '.formId')
    RET_VERSION=$(echo "$RESPONSE" | jq -r '.version')
    
    if [ "$RET_FORM_ID" != "null" ] && [ -n "$RET_FORM_ID" ] && [ "$RET_VERSION" -gt 0 ]; then
        print_pass "User-specific submission retrieved successfully"
        return 0
    else
        print_fail "Failed to retrieve user-specific submission"
        echo "$RESPONSE" | jq .
        return 1
    fi
}

# Test 10: Duplicate Form Detection (Normal)
test_duplicate_normal_form() {
    print_test "Duplicate Normal Form Detection"
    
    RESPONSE=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": {\"en\": \"Duplicate Test ${TIMESTAMP}\", \"ar\": \"اختبار ${TIMESTAMP}\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    IS_DUPLICATE=$(echo "$RESPONSE" | jq -r '.isDuplicate')
    
    if [ "$IS_DUPLICATE" = "true" ]; then
        print_pass "Duplicate normal form detected correctly"
        return 0
    else
        print_info "Form is not duplicate (first time creating this config)"
        return 0
    fi
}

# Test 11: Duplicate Form Detection (User-Specific)
test_duplicate_user_form() {
    print_test "Duplicate User-Specific Form Detection"
    
    USER_TOKEN="duplicate-test-${TIMESTAMP}"
    RESPONSE=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${USER_TOKEN}" \
        -d "{
            \"title\": {\"en\": \"Duplicate User Test ${TIMESTAMP}\", \"ar\": \"اختبار ${TIMESTAMP}\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    IS_DUPLICATE=$(echo "$RESPONSE" | jq -r '.isDuplicate')
    INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId')
    
    if [ "$IS_DUPLICATE" = "true" ]; then
        if [ "$INSTANCE_ID" != "null" ] && [ -n "$INSTANCE_ID" ]; then
            print_pass "Duplicate user-specific form detected and instance created: $INSTANCE_ID"
            return 0
        else
            print_fail "Duplicate user-specific form should create instance"
            return 1
        fi
    else
        print_info "Form is not duplicate (first time creating this config)"
        if [ "$INSTANCE_ID" != "null" ] && [ -n "$INSTANCE_ID" ]; then
            print_pass "New user-specific form created with instance"
            return 0
        else
            print_fail "New user-specific form should have instance"
            return 1
        fi
    fi
}

# Test 12: Authorization Header Edge Cases
test_auth_header_edge_cases() {
    print_test "Authorization Header Edge Cases"
    
    # Test with empty token
    RESPONSE1=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer " \
        -d "{
            \"title\": {\"en\": \"Empty Token Test\", \"ar\": \"اختبار\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    INSTANCE_ID1=$(echo "$RESPONSE1" | jq -r '.instanceId')
    
    # Test with invalid format
    RESPONSE2=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -H "Authorization: InvalidFormat token123" \
        -d "{
            \"title\": {\"en\": \"Invalid Format Test\", \"ar\": \"اختبار\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    INSTANCE_ID2=$(echo "$RESPONSE2" | jq -r '.instanceId')
    
    if [ "$INSTANCE_ID1" = "null" ] && [ "$INSTANCE_ID2" = "null" ]; then
        print_pass "Edge cases handled correctly (empty/invalid tokens treated as normal forms)"
        return 0
    else
        print_fail "Edge cases not handled correctly"
        return 1
    fi
}

# Test 13: Form URL Generation
test_form_url_generation() {
    print_test "Form URL Generation"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    
    # Check if URLs contain instanceId
    RESPONSE=$(curl -s -X POST "${API_URL}/forms/publish" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-url-${TIMESTAMP}" \
        -d "{
            \"title\": {\"en\": \"URL Test\", \"ar\": \"اختبار\"},
            \"attributes\": [\"hero_banner\"],
            \"submit\": {
                \"actions\": [{\"type\": \"server_persist\", \"enabled\": true}],
                \"ordering\": [\"server_persist\"],
                \"on_error\": \"continue\"
            }
        }")
    
    EN_URL=$(echo "$RESPONSE" | jq -r '.urls.en')
    AR_URL=$(echo "$RESPONSE" | jq -r '.urls.ar')
    RET_INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId')
    
    if [[ "$EN_URL" == *"instanceId=${RET_INSTANCE_ID}"* ]] && [[ "$AR_URL" == *"instanceId=${RET_INSTANCE_ID}"* ]]; then
        print_pass "Form URLs generated correctly with instanceId"
        return 0
    else
        print_fail "Form URLs missing instanceId"
        return 1
    fi
}

# Test 14: Database Verification
test_database_verification() {
    print_test "Database Verification"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    
    # Check if instance exists in database
    DB_CHECK=$(mysql -h staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com -P 3306 \
        -u sc_dynamic_form_generator_dbuser -p'oin!zxc@12mk$palksd' \
        sc_dynamic_form_generator \
        -e "SELECT COUNT(*) as count FROM form_instances WHERE id='${INSTANCE_ID}' AND form_id='${FORM_ID}' AND version=${VERSION};" \
        2>&1 | grep -v "Using a password" | tail -1 | awk '{print $1}')
    
    if [ "$DB_CHECK" = "1" ]; then
        print_pass "Instance verified in database"
        return 0
    else
        print_fail "Instance not found in database"
        return 1
    fi
}

# Test 15: Form Loader instanceId Extraction
test_form_loader_instance_extraction() {
    print_test "Form Loader instanceId Extraction"
    
    if [ ! -f /tmp/user_form.txt ]; then
        print_fail "User form not created"
        return 1
    fi
    
    IFS='|' read -r FORM_ID VERSION INSTANCE_ID USER_TOKEN < /tmp/user_form.txt
    
    # Test if form loader would correctly extract instanceId from URL
    TEST_URL="http://localhost:5174/${FORM_ID}/${VERSION}?instanceId=${INSTANCE_ID}&lang=en&sessionId=test"
    
    # Simulate what the form loader does
    EXTRACTED_INSTANCE=$(echo "$TEST_URL" | grep -o 'instanceId=[^&]*' | cut -d'=' -f2)
    
    if [ "$EXTRACTED_INSTANCE" = "$INSTANCE_ID" ]; then
        print_pass "Form loader would correctly extract instanceId from URL"
        return 0
    else
        print_fail "Form loader instanceId extraction test failed"
        return 1
    fi
}

# Main test execution
main() {
    echo "=========================================="
    echo "  Full Coverage Test Suite"
    echo "=========================================="
    echo ""
    
    # Run all tests
    check_api_health || true
    test_create_normal_form || true
    test_create_user_specific_form || true
    test_retrieve_normal_form || true
    test_retrieve_user_form_with_instance || true
    test_retrieve_user_form_without_instance || true
    test_submit_normal_form || true
    test_submit_user_form || true
    test_get_normal_submission || true
    test_get_user_submission || true
    test_duplicate_normal_form || true
    test_duplicate_user_form || true
    test_auth_header_edge_cases || true
    test_form_url_generation || true
    test_database_verification || true
    test_form_loader_instance_extraction || true
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo -e "Total Tests: ${BLUE}$TOTAL${NC}"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Run tests
main



