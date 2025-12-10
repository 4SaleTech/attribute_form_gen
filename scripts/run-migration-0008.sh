#!/bin/bash
set -e

# Migration script for form_instances table
# Usage: ./scripts/run-migration-0008.sh [database_url]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database URL from argument or environment
if [ -n "$1" ]; then
    DB_URL="$1"
elif [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
else
    echo -e "${RED}Error: Database URL required${NC}"
    echo "Usage: $0 <database_url>"
    echo "Example: $0 mysql://user:pass@host:port/database"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo -e "${YELLOW}Running migration 0008_add_form_instances...${NC}"
echo "Database: $DB_URL"
echo ""

# Extract components from URL if needed for direct mysql command
# For now, use migrate tool if available
if command -v migrate &> /dev/null; then
    echo -e "${GREEN}Using migrate tool...${NC}"
    migrate -path db/migrations -database "$DB_URL" up
    echo -e "${GREEN}✓ Migration completed${NC}"
elif [ -n "$MYSQL_HOST" ] && [ -n "$MYSQL_USER" ] && [ -n "$MYSQL_PASSWORD" ] && [ -n "$MYSQL_DATABASE" ]; then
    echo -e "${GREEN}Using direct MySQL connection...${NC}"
    MYSQL_PORT="${MYSQL_PORT:-3306}"
    mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < db/migrations/0008_add_form_instances.up.sql
    echo -e "${GREEN}✓ Migration completed${NC}"
else
    echo -e "${YELLOW}Migration tool not found. Please run the SQL manually:${NC}"
    echo ""
    echo "mysql -h<host> -u<user> -p<password> <database> < db/migrations/0008_add_form_instances.up.sql"
    echo ""
    echo "Or install migrate tool:"
    echo "  brew install golang-migrate"
    echo "  or"
    echo "  go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    exit 1
fi

echo ""
echo -e "${GREEN}Verifying migration...${NC}"

# Verify tables exist (if mysql command available)
if command -v mysql &> /dev/null && [ -n "$MYSQL_HOST" ]; then
    mysql -h"$MYSQL_HOST" -P"${MYSQL_PORT:-3306}" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "
        SELECT 'form_instances table:' AS check_name;
        SHOW TABLES LIKE 'form_instances';
        SELECT 'submissions columns:' AS check_name;
        SHOW COLUMNS FROM submissions WHERE Field IN ('instance_id', 'user_id');
    " 2>/dev/null || echo "Could not verify (this is okay if using remote DB)"
fi

echo -e "${GREEN}✓ Migration 0008 completed successfully!${NC}"



