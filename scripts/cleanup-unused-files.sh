#!/bin/bash
# Script to identify and optionally remove files not used by ECR production builds
# Note: All versions (V9, V16, V17, etc.) use the same root Dockerfile

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cleanup: Files Not Used by ECR Production Builds${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in dry-run mode
DRY_RUN=true
if [ "$1" == "--execute" ]; then
    DRY_RUN=false
    echo -e "${YELLOW}⚠️  EXECUTE MODE: Files will be removed from git${NC}"
    echo ""
else
    echo -e "${GREEN}ℹ️  DRY-RUN MODE: Showing what would be removed${NC}"
    echo -e "${GREEN}   Run with --execute to actually remove files${NC}"
    echo ""
fi

# Track what we find
FILES_TO_REMOVE=()
BUILD_ARTIFACTS=()
TEST_FILES=()

# Check for build artifacts
echo -e "${YELLOW}Checking for build artifacts...${NC}"
if [ -f "apps/api/main" ]; then
    BUILD_ARTIFACTS+=("apps/api/main")
    echo "  ❌ Found: apps/api/main (build artifact)"
fi
if [ -f "apps/api/server" ]; then
    BUILD_ARTIFACTS+=("apps/api/server")
    echo "  ❌ Found: apps/api/server (build artifact)"
fi

# Check for test files
echo ""
echo -e "${YELLOW}Checking for standalone test files...${NC}"

# HTML test files
for file in test-*.html test-cookie-*.html; do
    if [ -f "$file" ]; then
        TEST_FILES+=("$file")
        echo "  ❌ Found: $file"
    fi
done

# JS test files
for file in test-*.js; do
    if [ -f "$file" ]; then
        TEST_FILES+=("$file")
        echo "  ❌ Found: $file"
    fi
done

# Shell test scripts
for file in test-*.sh create-all-fields-form.sh; do
    if [ -f "$file" ]; then
        TEST_FILES+=("$file")
        echo "  ❌ Found: $file"
    fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TOTAL_FILES=$((${#BUILD_ARTIFACTS[@]} + ${#TEST_FILES[@]}))

if [ $TOTAL_FILES -eq 0 ]; then
    echo -e "${GREEN}✓ No unused files found!${NC}"
    exit 0
fi

echo -e "Build artifacts: ${#BUILD_ARTIFACTS[@]}"
echo -e "Test files: ${#TEST_FILES[@]}"
echo -e "${YELLOW}Total files to remove: $TOTAL_FILES${NC}"
echo ""

# Show files
if [ ${#BUILD_ARTIFACTS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Build Artifacts:${NC}"
    for file in "${BUILD_ARTIFACTS[@]}"; do
        echo "  - $file"
    done
    echo ""
fi

if [ ${#TEST_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Test Files:${NC}"
    for file in "${TEST_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
fi

# Execute removal if requested
if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}Removing files from git...${NC}"
    
    ALL_FILES=("${BUILD_ARTIFACTS[@]}" "${TEST_FILES[@]}")
    
    for file in "${ALL_FILES[@]}"; do
        if git ls-files --error-unmatch "$file" > /dev/null 2>&1; then
            echo "  Removing: $file"
            git rm "$file" 2>/dev/null || echo "    (file not tracked in git)"
        else
            echo "  Skipping: $file (not tracked in git)"
        fi
    done
    
    echo ""
    echo -e "${GREEN}✓ Cleanup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes: git status"
    echo "  2. Commit: git commit -m 'Remove unused files not needed for ECR production builds'"
    echo "  3. Push: git push"
else
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}To actually remove these files:${NC}"
    echo -e "${BLUE}  ./scripts/cleanup-unused-files.sh --execute${NC}"
    echo -e "${BLUE}========================================${NC}"
fi
