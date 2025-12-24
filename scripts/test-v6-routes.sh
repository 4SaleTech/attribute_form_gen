#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:8082}"
PASSED=0
FAILED=0

# Test helper function
test_url() {
    local url=$1
    local description=$2
    local expected_status="${3:-200}"
    
    local status_code
    local response
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ${description}"
        echo -e "  ${BLUE}GET${NC} ${url} → ${GREEN}${status_code}${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} ${description}"
        echo -e "  ${BLUE}GET${NC} ${url} → ${RED}${status_code}${NC} (expected ${expected_status})"
        if [ -n "$body" ]; then
            echo -e "  Response: ${RED}$(echo "$body" | head -c 100)${NC}"
        fi
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing V6 Routes${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Base URL: ${BASE_URL}"
echo ""

# Test API endpoints
echo -e "${YELLOW}--- API Endpoints ---${NC}"
test_url "${BASE_URL}/api/health" "API Health Check"
test_url "${BASE_URL}/api/config" "API Config"

# Test Admin routes
echo ""
echo -e "${YELLOW}--- Admin Panel Routes ---${NC}"
test_url "${BASE_URL}/admin/" "Admin Panel Root"
test_url "${BASE_URL}/admin" "Admin Panel (no trailing slash)" "301"

# Test Admin assets (check if they exist by looking at HTML)
echo ""
echo -e "${YELLOW}--- Admin Assets ---${NC}"
ADMIN_HTML=$(curl -s "${BASE_URL}/admin/")
if echo "$ADMIN_HTML" | grep -q "index.*\.js"; then
    ASSET_FILE=$(echo "$ADMIN_HTML" | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
    if [ -n "$ASSET_FILE" ]; then
        # Extract just the filename
        ASSET_PATH=$(echo "$ASSET_FILE" | sed 's|^/admin/||')
        test_url "${BASE_URL}/admin/${ASSET_PATH}" "Admin JS Asset"
    fi
fi

if echo "$ADMIN_HTML" | grep -q "href.*\.css"; then
    CSS_FILE=$(echo "$ADMIN_HTML" | grep -o 'href="[^"]*\.css"' | head -1 | sed 's/href="//;s/"//')
    if [ -n "$CSS_FILE" ]; then
        CSS_PATH=$(echo "$CSS_FILE" | sed 's|^/admin/||')
        test_url "${BASE_URL}/admin/${CSS_PATH}" "Admin CSS Asset"
    fi
fi

# Test Form routes
echo ""
echo -e "${YELLOW}--- Form App Routes ---${NC}"
test_url "${BASE_URL}/" "Form App Root"

# Test Form assets (check if they exist by looking at HTML)
FORM_HTML=$(curl -s "${BASE_URL}/")
if echo "$FORM_HTML" | grep -q "src.*\.js"; then
    FORM_ASSET=$(echo "$FORM_HTML" | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
    if [ -n "$FORM_ASSET" ]; then
        FORM_PATH=$(echo "$FORM_ASSET" | sed 's|^/||')
        test_url "${BASE_URL}/${FORM_PATH}" "Form JS Asset"
    fi
fi

# Test 404 handling
echo ""
echo -e "${YELLOW}--- Error Handling ---${NC}"
test_url "${BASE_URL}/nonexistent" "Non-existent route (should serve index.html)" "200"

# Test API 404
API_404_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/nonexistent" 2>&1)
API_404_STATUS=$(echo "$API_404_RESPONSE" | tail -n1)
if [ "$API_404_STATUS" = "404" ]; then
    echo -e "${GREEN}✓${NC} API 404 handling"
    echo -e "  ${BLUE}GET${NC} ${BASE_URL}/api/nonexistent → ${GREEN}404${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} API 404 handling"
    echo -e "  ${BLUE}GET${NC} ${BASE_URL}/api/nonexistent → ${RED}${API_404_STATUS}${NC} (expected 404)"
    FAILED=$((FAILED + 1))
fi

# Test that admin HTML contains expected content
echo ""
echo -e "${YELLOW}--- Content Verification ---${NC}"
if echo "$ADMIN_HTML" | grep -qi "react\|root\|app"; then
    echo -e "${GREEN}✓${NC} Admin HTML contains React app"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Admin HTML missing React app"
    FAILED=$((FAILED + 1))
fi

if echo "$FORM_HTML" | grep -qi "react\|root\|app"; then
    echo -e "${GREEN}✓${NC} Form HTML contains React app"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Form HTML missing React app"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All route tests passed!${NC}"
    echo ""
    echo -e "${GREEN}V6 is ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some route tests failed${NC}"
    echo ""
    echo -e "${YELLOW}Please check the nginx configuration before deploying.${NC}"
    exit 1
fi

