#!/bin/bash
set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="${ECR_REGISTRY:-}"  # e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com
REPO_PREFIX="${REPO_PREFIX:-form-repo}"
TAG="${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ECR_REGISTRY is set
if [ -z "$ECR_REGISTRY" ]; then
    echo -e "${RED}Error: ECR_REGISTRY environment variable is required${NC}"
    echo "Example: export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com"
    exit 1
fi

# Function to build an image (without pushing)
build_image() {
    local service=$1
    local dockerfile_path=$2
    local image_name="${ECR_REGISTRY}/${REPO_PREFIX}-${service}"
    
    echo -e "${GREEN}Building ${service}...${NC}"
    
    # Build the image from repo root
    docker build -t "${image_name}:${TAG}" -f "${dockerfile_path}" .
    
    # Tag as latest if not already
    if [ "$TAG" != "latest" ]; then
        docker tag "${image_name}:${TAG}" "${image_name}:latest"
    fi
    
    echo -e "${GREEN}✓ ${service} built successfully${NC}"
    echo "  Image: ${image_name}:${TAG}"
}

# Build each service
echo -e "${YELLOW}Building images...${NC}"

# API
build_image "api" "apps/api/Dockerfile"

# Admin frontend
build_image "admin" "apps/admin/Dockerfile"

# Form frontend
build_image "form" "apps/form/Dockerfile"

echo -e "${GREEN}✓ All images built successfully!${NC}"
echo -e "${YELLOW}To push images, run: ./scripts/push-ecr.sh${NC}"

