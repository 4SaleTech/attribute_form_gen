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

# Function to push an image
push_image() {
    local service=$1
    local image_name="${ECR_REGISTRY}/${REPO_PREFIX}-${service}"
    
    echo -e "${GREEN}Pushing ${service} to ECR...${NC}"
    
    docker push "${image_name}:${TAG}"
    
    if [ "$TAG" != "latest" ]; then
        docker push "${image_name}:latest"
    fi
    
    echo -e "${GREEN}✓ ${service} pushed successfully${NC}"
}

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# Push each service
echo -e "${YELLOW}Pushing images...${NC}"

push_image "api"
push_image "admin"
push_image "form"

echo -e "${GREEN}✓ All images pushed successfully!${NC}"

