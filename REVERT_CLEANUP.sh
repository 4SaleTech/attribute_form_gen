#!/bin/bash
# Script to revert the cleanup if needed
# This restores files that were removed during cleanup

set -e

echo "=========================================="
echo "Revert Cleanup Script"
echo "=========================================="
echo ""
echo "This will restore files removed during cleanup."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Files that were removed
FILES_TO_RESTORE=(
    "apps/api/main"
    "apps/api/server"
    "test-form-submission-id.html"
    "test-native-bridge.html"
    "test-redirect-template.html"
    "test-redirect-standalone.js"
    "test-amplitude-events.sh"
    "test-api-detailed.sh"
    "test-api.sh"
    "create-all-fields-form.sh"
)

echo "Restoring files from git history..."
for file in "${FILES_TO_RESTORE[@]}"; do
    if git log --all --full-history -- "$file" | head -1 > /dev/null 2>&1; then
        echo "  Restoring: $file"
        git checkout HEAD~1 -- "$file" 2>/dev/null || git checkout $(git log --all --full-history --format=%H -- "$file" | head -1) -- "$file" 2>/dev/null || echo "    Could not restore: $file"
    else
        echo "  Skipping: $file (not in git history)"
    fi
done

echo ""
echo "✓ Revert complete!"
echo ""
echo "Note: Build artifacts (apps/api/main, apps/api/server) should remain gitignored."
echo "They will be regenerated on build."
