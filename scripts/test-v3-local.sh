#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing V3 Image Locally${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Configuration
ECR_REGISTRY="640249400316.dkr.ecr.eu-west-1.amazonaws.com"
REPO_BASE="sc_attribute_form_generator"
VERSION="V3"
IMAGE_NAME="${ECR_REGISTRY}/${REPO_BASE}:${VERSION}"
CONTAINER_NAME="form-generator-v6-test"
PORT=8081

# Check if port is available, if not try next port
while lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; do
    PORT=$((PORT + 1))
done

# Check if MySQL is running
echo -e "${YELLOW}Checking MySQL connection...${NC}"
if ! docker ps | grep -q formdev-mysql; then
    echo -e "${RED}✗ MySQL container not running. Starting it...${NC}"
    docker-compose up -d mysql
    echo "Waiting for MySQL to be ready..."
    sleep 5
fi

# Determine host IP for database connection
# When connecting from container to host MySQL via host.docker.internal,
# we need to use the host's mapped port (3307), not the container's internal port (3306)
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    DB_HOST="host.docker.internal"
    DB_PORT="3307"  # Host mapped port
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # On Linux, try host.docker.internal first, fallback to gateway IP
    DB_HOST="host.docker.internal"
    DB_PORT="3307"
else
    DB_HOST="172.17.0.1"
    DB_PORT="3307"
fi

# Check if image exists locally, if not pull it
echo -e "${YELLOW}Checking for V8 image...${NC}"
if ! docker images | grep -q "${REPO_BASE}.*V8"; then
    echo -e "${YELLOW}Image not found locally. Pulling from ECR...${NC}"
    AWS_REGION="eu-west-1"
    export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
    export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
    export AWS_DEFAULT_REGION="${AWS_REGION}"
    aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
    docker pull "${IMAGE_NAME}"
else
    echo -e "${GREEN}✓ Image found locally${NC}"
fi

# Stop and remove existing container if running
if docker ps -a | grep -q "${CONTAINER_NAME}"; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
    docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
fi

# Set environment variables
# You can override these by setting them before running the script
# Note: DB_PORT should be 3307 (host mapped port) when using host.docker.internal
export DB_HOST="${DB_HOST}"
export DB_PORT="${DB_PORT}"
export DB_NAME="${DB_NAME:-formdev}"
export DB_USER="${DB_USER:-formdev}"
export DB_PASSWORD="${DB_PASSWORD:-formdevpw}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token}"
export CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-test-cloud}"
export CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-test-key}"
export CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-test-secret}"
export WEBHOOK_SIGNING_KEY="${WEBHOOK_SIGNING_KEY:-test-signing-key}"

echo ""
echo -e "${GREEN}Starting V8 container...${NC}"
echo "  Container: ${CONTAINER_NAME}"
echo "  Port: ${PORT}"
echo "  Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""

# Run the container
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:80" \
  -e DB_HOST="${DB_HOST}" \
  -e DB_PORT="${DB_PORT}" \
  -e DB_NAME="${DB_NAME}" \
  -e DB_USER="${DB_USER}" \
  -e DB_PASSWORD="${DB_PASSWORD}" \
  -e ADMIN_TOKEN="${ADMIN_TOKEN}" \
  -e CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME}" \
  -e CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY}" \
  -e CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET}" \
  -e WEBHOOK_SIGNING_KEY="${WEBHOOK_SIGNING_KEY}" \
  --add-host=host.docker.internal:host-gateway \
  "${IMAGE_NAME}"

echo ""
echo -e "${GREEN}✓ Container started${NC}"
echo ""
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 3

# Check if container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo -e "${RED}✗ Container failed to start${NC}"
    echo "Logs:"
    docker logs "${CONTAINER_NAME}"
    exit 1
fi

# Check health
echo -e "${YELLOW}Checking health...${NC}"
for i in {1..10}; do
    if curl -s -f "http://localhost:${PORT}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Health check failed${NC}"
        echo "Container logs:"
        docker logs "${CONTAINER_NAME}" | tail -20
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ V8 Deployment Test Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Access the services at:"
echo "  - Admin:    http://localhost:${PORT}/admin"
echo "  - Forms:    http://localhost:${PORT}/"
echo "  - API:      http://localhost:${PORT}/api"
echo "  - Health:    http://localhost:${PORT}/health"
echo ""
echo "To view logs:"
echo "  docker logs -f ${CONTAINER_NAME}"
echo ""
echo "To stop:"
echo "  docker stop ${CONTAINER_NAME}"
echo "  docker rm ${CONTAINER_NAME}"
echo ""

