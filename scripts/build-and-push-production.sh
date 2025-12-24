#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ECR_REGISTRY="640249400316.dkr.ecr.eu-west-1.amazonaws.com"
REPO_BASE="sc_attribute_form_generator"
VERSION="V17"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Building and Pushing Production Image${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "ECR Registry: ${ECR_REGISTRY}"
echo "Repository: ${REPO_BASE}"
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

# Build single combined image
image_name="${ECR_REGISTRY}/${REPO_BASE}"
tag_version="${image_name}:${VERSION}"
tag_latest="${image_name}:latest"

echo -e "${GREEN}Building combined image (linux/amd64)...${NC}"

# Build for amd64 architecture
docker buildx build \
    --platform linux/amd64 \
    -t "${tag_version}" \
    -t "${tag_latest}" \
    -f Dockerfile \
    --load \
    .

echo -e "${GREEN}Pushing image to ECR...${NC}"
docker push "${tag_version}"
docker push "${tag_latest}"

echo -e "${GREEN}✓ Image pushed successfully${NC}"
echo "  Image: ${tag_version}"
echo "  Image: ${tag_latest}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Image built and pushed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Image pushed:"
echo "  - ${tag_version}"
echo "  - ${tag_latest}"
echo ""
echo "Routes:"
echo "  - Admin: https://attribute-form-generator.q84sale.com/admin"
echo "  - Forms: https://attribute-form-generator.q84sale.com/"
echo "  - API: https://attribute-form-generator.q84sale.com/api"
echo ""

