# Deployment Guide

This guide covers deploying the form monorepo to AWS ECR and production environments.

## Architecture

The application consists of three services:
1. **API** - Go backend API server
2. **Admin** - React admin UI (nginx)
3. **Form** - React form renderer (nginx)

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Access to AWS ECR repository
- Production database credentials
- Cloudinary credentials
- Webhook signing key

## AWS ECR Setup

### 1. Create ECR Repositories

Create three repositories in AWS ECR:

```bash
# Set your AWS account ID and region
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

# Create repositories
aws ecr create-repository --repository-name form-repo-api --region $AWS_REGION
aws ecr create-repository --repository-name form-repo-admin --region $AWS_REGION
aws ecr create-repository --repository-name form-repo-form --region $AWS_REGION
```

### 2. Set Environment Variables

```bash
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export AWS_REGION=us-east-1
export REPO_PREFIX=form-repo
export TAG=v1.0.0  # or use git commit SHA, timestamp, etc.
```

## Building and Pushing Images

### Option 1: Build and Push in One Command

```bash
./scripts/build-and-push-ecr.sh
```

### Option 2: Build and Push Separately

```bash
# Build all images
./scripts/build-ecr.sh

# Push all images
./scripts/push-ecr.sh
```

### Option 3: Build Individual Services

```bash
# Build API
docker build -t ${ECR_REGISTRY}/form-repo-api:${TAG} -f apps/api/Dockerfile .

# Build Admin
docker build -t ${ECR_REGISTRY}/form-repo-admin:${TAG} -f apps/admin/Dockerfile .

# Build Form
docker build -t ${ECR_REGISTRY}/form-repo-form:${TAG} -f apps/form/Dockerfile .

# Push individually
docker push ${ECR_REGISTRY}/form-repo-api:${TAG}
docker push ${ECR_REGISTRY}/form-repo-admin:${TAG}
docker push ${ECR_REGISTRY}/form-repo-form:${TAG}
```

## Environment Variables

### API Service

Required environment variables for the API service:

```bash
# Server Configuration
PORT=8080
CORS_ORIGINS=https://admin.yourdomain.com,https://forms.yourdomain.com
ADMIN_TOKEN=your-secure-admin-token-here
FORM_BASE_URL=https://forms.yourdomain.com

# Database
DB_HOST=your-db-host.rds.amazonaws.com
DB_PORT=3306
DB_NAME=formdb
DB_USER=formuser
DB_PASSWORD=your-secure-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=forms/uploads
CLOUDINARY_UPLOAD_TTL_SECONDS=300

# Webhooks
WEBHOOK_SIGNING_KEY=your-webhook-signing-key
WEBHOOK_TIMEOUT_MS=8000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_BACKOFF_MS=1500

# Next.js POST (optional)
NEXTJS_POST_URL=https://your-nextjs-app.com/api/submit
NEXTJS_POST_ENABLED=true
```

### Frontend Services

The frontend services (admin and form) don't require environment variables at runtime, but you may want to configure API URLs via nginx proxy or build-time environment variables.

## Deployment Options

### Option 1: AWS ECS/Fargate

1. **Create Task Definitions** for each service
2. **Create ECS Services** pointing to your ECR images
3. **Configure Load Balancers** (ALB) for public access
4. **Set Environment Variables** in task definitions or use AWS Secrets Manager

Example task definition structure:
```json
{
  "family": "form-repo-api",
  "containerDefinitions": [{
    "name": "api",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/form-repo-api:latest",
    "portMappings": [{
      "containerPort": 8080,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "PORT", "value": "8080"},
      {"name": "DB_HOST", "value": "..."}
      // ... other env vars
    ],
    "secrets": [
      {
        "name": "DB_PASSWORD",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:form-repo/db-password"
      }
    ]
  }]
}
```

### Option 2: AWS EC2 with Docker Compose

1. **Launch EC2 instance** with Docker installed
2. **SSH into instance** and clone repository
3. **Create `.env.prod` file** with production credentials
4. **Run docker-compose**:

```bash
# On EC2 instance
export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com
export TAG=latest
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Option 3: Kubernetes

1. **Create Kubernetes manifests** for each service
2. **Create secrets** for sensitive environment variables
3. **Deploy using kubectl** or Helm

Example Kubernetes deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: form-repo-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: form-repo-api
  template:
    metadata:
      labels:
        app: form-repo-api
    spec:
      containers:
      - name: api
        image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/form-repo-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: form-repo-secrets
              key: db-host
        # ... other env vars
```

## Database Migration

Before deploying, ensure your production database is migrated:

```bash
# Using migrate CLI
migrate -path db/migrations \
  -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}" \
  up
```

Or run migrations as part of your deployment process.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push to ECR

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push
        run: |
          export ECR_REGISTRY=${{ env.ECR_REGISTRY }}
          export TAG=${{ github.sha }}
          ./scripts/build-and-push-ecr.sh
```

## Health Checks

All services include health check endpoints:

- **API**: `GET /api/health`
- **Admin**: `GET /health`
- **Form**: `GET /health`

Configure these in your load balancer or orchestration platform.

## Monitoring and Logging

### CloudWatch Logs

Configure log drivers in your task definitions or docker-compose:

```yaml
logging:
  driver: awslogs
  options:
    awslogs-group: /ecs/form-repo-api
    awslogs-region: us-east-1
    awslogs-stream-prefix: ecs
```

### Application Metrics

The API uses structured logging with zap. Consider integrating with:
- CloudWatch Metrics
- Datadog
- New Relic
- Prometheus

## Security Best Practices

1. **Never commit secrets** - Use AWS Secrets Manager or Parameter Store
2. **Use least privilege IAM roles** for ECS tasks
3. **Enable VPC endpoints** for ECR access
4. **Use HTTPS** with SSL certificates (Let's Encrypt or ACM)
5. **Enable CloudTrail** for audit logging
6. **Regularly update base images** for security patches
7. **Scan images** with ECR image scanning or Trivy

## Troubleshooting

### Image Pull Errors

```bash
# Verify ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Check repository exists
aws ecr describe-repositories --repository-names form-repo-api
```

### Container Startup Issues

```bash
# Check container logs
docker logs form-api

# Check environment variables
docker exec form-api env
```

### Database Connection Issues

- Verify security groups allow traffic from ECS/EC2 to RDS
- Check database credentials
- Verify VPC configuration

## Rollback Procedure

1. **Identify previous working tag**:
```bash
aws ecr describe-images --repository-name form-repo-api --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageTags[0]'
```

2. **Update task definition** or docker-compose to use previous tag

3. **Redeploy** service

## Cost Optimization

- Use **Fargate Spot** for non-critical workloads
- Right-size **ECS task CPU/memory** allocations
- Use **ECR lifecycle policies** to clean up old images
- Consider **AWS App Runner** for simpler deployments

