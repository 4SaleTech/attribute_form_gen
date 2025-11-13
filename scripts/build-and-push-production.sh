#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ECR_REGISTRY="640249400316.dkr.ecr.eu-west-1.amazonaws.com"
REPO_BASE="sc_attribute_form_generator"
VERSION="V1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Building and Pushing Production Images${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "ECR Registry: ${ECR_REGISTRY}"
echo "Repository: ${REPO_NAME}"
echo "Version: ${VERSION}"
echo "Architecture: linux/amd64"
echo ""

# Set AWS credentials
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${AWS_REGION}"

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
echo -e "${GREEN}✓ Logged in successfully${NC}"
echo ""

# Function to build and push an image
build_and_push() {
    local service=$1
    local dockerfile_path=$2
    # Use single repository with service name as tag prefix
    local image_name="${ECR_REGISTRY}/${REPO_BASE}"
    local tag_v1="${image_name}:${service}-${VERSION}"
    local tag_latest="${image_name}:${service}-latest"
    
    echo -e "${GREEN}Building ${service} (linux/amd64)...${NC}"
    
    # Build for amd64 architecture
    docker buildx build \
        --platform linux/amd64 \
        -t "${tag_v1}" \
        -t "${tag_latest}" \
        -f "${dockerfile_path}" \
        --load \
        .
    
    echo -e "${GREEN}Pushing ${service} to ECR...${NC}"
    docker push "${tag_v1}"
    docker push "${tag_latest}"
    
    echo -e "${GREEN}✓ ${service} pushed successfully${NC}"
    echo "  Image: ${tag_v1}"
    echo "  Image: ${tag_latest}"
    echo ""
}

# Build and push each service
echo -e "${YELLOW}Building and pushing images...${NC}"
echo ""

# API
build_and_push "api" "apps/api/Dockerfile"

# Admin frontend
build_and_push "admin" "apps/admin/Dockerfile"

# Form frontend
build_and_push "form" "apps/form/Dockerfile"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All images built and pushed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Images pushed:"
echo "  - ${ECR_REGISTRY}/${REPO_BASE}:api-${VERSION}"
echo "  - ${ECR_REGISTRY}/${REPO_BASE}:admin-${VERSION}"
echo "  - ${ECR_REGISTRY}/${REPO_BASE}:form-${VERSION}"
echo ""

