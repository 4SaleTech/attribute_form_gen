# DevOps Deployment Guide

This guide explains what DevOps needs to do after images are built and pushed to ECR to make the application usable in production.

## Prerequisites

✅ **Completed:**
- Docker images built for linux/amd64
- Images pushed to ECR with version tags
- Images available at:
  - `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:api-V1`
  - `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:admin-V1`
  - `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:form-V1`

## DevOps Deployment Steps

### 1. Create ECS Task Definitions

Create task definitions for each service that define:
- Container image to use
- CPU and memory requirements
- Environment variables
- Port mappings
- Logging configuration
- Health checks

#### API Task Definition Example

```json
{
  "family": "sc-attribute-form-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:api-V1",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "CORS_ORIGINS",
          "value": "https://admin.yourdomain.com,https://forms.yourdomain.com"
        },
        {
          "name": "ADMIN_TOKEN",
          "value": "your-secure-admin-token"
        },
        {
          "name": "FORM_BASE_URL",
          "value": "https://forms.yourdomain.com"
        },
        {
          "name": "DB_HOST",
          "value": "your-rds-endpoint.rds.amazonaws.com"
        },
        {
          "name": "DB_PORT",
          "value": "3306"
        },
        {
          "name": "DB_NAME",
          "value": "sc_dynamic_form_generator"
        },
        {
          "name": "DB_USER",
          "value": "sc_dynamic_form_generator_dbuser"
        },
        {
          "name": "CLOUDINARY_CLOUD_NAME",
          "value": "your-cloud-name"
        },
        {
          "name": "CLOUDINARY_API_KEY",
          "value": "your-api-key"
        },
        {
          "name": "CLOUDINARY_API_SECRET",
          "value": "your-api-secret"
        },
        {
          "name": "WEBHOOK_SIGNING_KEY",
          "value": "your-webhook-signing-key"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:eu-west-1:640249400316:secret:form-repo/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sc-attribute-form-api",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:8080/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Admin Task Definition Example

```json
{
  "family": "sc-attribute-form-admin",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "admin",
      "image": "640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:admin-V1",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sc-attribute-form-admin",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Form Task Definition Example

```json
{
  "family": "sc-attribute-form-form",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "form",
      "image": "640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:form-V1",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sc-attribute-form-form",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### 2. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name sc-attribute-form-cluster \
  --region eu-west-1
```

### 3. Create ECS Services

Create services for each task definition:

#### API Service

```bash
aws ecs create-service \
  --cluster sc-attribute-form-cluster \
  --service-name sc-attribute-form-api \
  --task-definition sc-attribute-form-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:eu-west-1:640249400316:targetgroup/api-tg/xxx,containerName=api,containerPort=8080" \
  --region eu-west-1
```

#### Admin Service

```bash
aws ecs create-service \
  --cluster sc-attribute-form-cluster \
  --service-name sc-attribute-form-admin \
  --task-definition sc-attribute-form-admin:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:eu-west-1:640249400316:targetgroup/admin-tg/xxx,containerName=admin,containerPort=80" \
  --region eu-west-1
```

#### Form Service

```bash
aws ecs create-service \
  --cluster sc-attribute-form-cluster \
  --service-name sc-attribute-form-form \
  --task-definition sc-attribute-form-form:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:eu-west-1:640249400316:targetgroup/form-tg/xxx,containerName=form,containerPort=80" \
  --region eu-west-1
```

### 4. Set Up Application Load Balancer (ALB)

Create an ALB with:
- **API Target Group**: Port 8080, health check `/api/health`
- **Admin Target Group**: Port 80, health check `/health`
- **Form Target Group**: Port 80, health check `/health`

**Listener Rules:**
```
ALB Listener (Port 443 - HTTPS)
├── /api/* → API Target Group
├── /admin → Admin Target Group (or use subdomain)
└── /* → Form Target Group (or use subdomain)
```

**Or use subdomains:**
- `api.yourdomain.com` → API Target Group
- `admin.yourdomain.com` → Admin Target Group
- `forms.yourdomain.com` → Form Target Group

### 5. Configure Security Groups

#### API Security Group
- **Inbound**: Port 8080 from ALB security group
- **Outbound**: Port 3306 to RDS security group, HTTPS to Cloudinary

#### Admin/Form Security Groups
- **Inbound**: Port 80 from ALB security group
- **Outbound**: HTTPS to API (if needed for API calls)

#### ALB Security Group
- **Inbound**: Port 443 (HTTPS) from 0.0.0.0/0
- **Inbound**: Port 80 (HTTP) from 0.0.0.0/0 (redirect to HTTPS)
- **Outbound**: All traffic

### 6. Set Up IAM Roles

#### ECS Task Execution Role
Allows ECS to:
- Pull images from ECR
- Write logs to CloudWatch
- Access Secrets Manager

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:eu-west-1:640249400316:log-group:/ecs/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:eu-west-1:640249400316:secret:form-repo/*"
    }
  ]
}
```

#### ECS Task Role (for API)
Allows API to access AWS services if needed.

### 7. Configure CloudWatch Logs

Create log groups:
```bash
aws logs create-log-group --log-group-name /ecs/sc-attribute-form-api --region eu-west-1
aws logs create-log-group --log-group-name /ecs/sc-attribute-form-admin --region eu-west-1
aws logs create-log-group --log-group-name /ecs/sc-attribute-form-form --region eu-west-1
```

### 8. Set Up Secrets Manager

Store sensitive values:
```bash
# Database password
aws secretsmanager create-secret \
  --name form-repo/db-password \
  --secret-string "your-database-password" \
  --region eu-west-1

# Admin token
aws secretsmanager create-secret \
  --name form-repo/admin-token \
  --secret-string "your-admin-token" \
  --region eu-west-1

# Webhook signing key
aws secretsmanager create-secret \
  --name form-repo/webhook-signing-key \
  --secret-string "your-webhook-key" \
  --region eu-west-1
```

### 9. Configure DNS

Point domains to ALB:
- `api.yourdomain.com` → ALB DNS name (A record or CNAME)
- `admin.yourdomain.com` → ALB DNS name
- `forms.yourdomain.com` → ALB DNS name

Or use Route 53:
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-changes.json
```

### 10. Set Up SSL/TLS Certificates

Request ACM certificate:
```bash
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region eu-west-1
```

Attach to ALB listener (HTTPS:443).

### 11. Configure RDS Security Group

Allow inbound MySQL (port 3306) from:
- API ECS security group
- Your office IP (for migrations)

### 12. Run Database Migrations

Before starting services, ensure database is migrated:

```bash
# Option 1: Run migration container
docker run --rm \
  -e DB_HOST=your-rds-endpoint.rds.amazonaws.com \
  -e DB_PORT=3306 \
  -e DB_NAME=sc_dynamic_form_generator \
  -e DB_USER=sc_dynamic_form_generator_dbuser \
  -e DB_PASSWORD=your-password \
  migrate/migrate \
  -path /migrations \
  -database "mysql://sc_dynamic_form_generator_dbuser:password@tcp(your-rds-endpoint.rds.amazonaws.com:3306)/sc_dynamic_form_generator" \
  up

# Option 2: Run from ECS task
aws ecs run-task \
  --cluster sc-attribute-form-cluster \
  --task-definition migration-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

### 13. Set Up Auto-Scaling (Optional)

Configure auto-scaling for services:

```bash
# API auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/sc-attribute-form-cluster/sc-attribute-form-api \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/sc-attribute-form-cluster/sc-attribute-form-api \
  --policy-name api-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue":70.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"}}'
```

### 14. Set Up Monitoring and Alarms

Create CloudWatch alarms for:
- High CPU utilization
- High memory utilization
- Failed health checks
- Error rates
- Request latency

### 15. Update CORS Origins

Ensure `CORS_ORIGINS` in API task definition includes:
- Production admin URL: `https://admin.yourdomain.com`
- Production form URL: `https://forms.yourdomain.com`

### 16. Test Deployment

1. **Health Checks:**
   ```bash
   curl https://api.yourdomain.com/api/health
   curl https://admin.yourdomain.com/health
   curl https://forms.yourdomain.com/health
   ```

2. **API Test:**
   ```bash
   curl -X POST https://api.yourdomain.com/api/forms/publish \
     -H "Authorization: Bearer your-admin-token" \
     -H "Content-Type: application/json" \
     -d '{"title":{"en":"Test","ar":"اختبار"},"attributes":["phone_number"]}'
   ```

3. **Frontend Test:**
   - Open https://admin.yourdomain.com in browser
   - Open https://forms.yourdomain.com in browser

## Deployment Checklist

- [ ] ECS cluster created
- [ ] Task definitions created and registered
- [ ] ECS services created
- [ ] Application Load Balancer configured
- [ ] Target groups created and health checks configured
- [ ] Security groups configured
- [ ] IAM roles created and attached
- [ ] CloudWatch log groups created
- [ ] Secrets stored in Secrets Manager
- [ ] DNS records configured
- [ ] SSL certificates attached to ALB
- [ ] RDS security group allows API access
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] CORS origins updated
- [ ] Health checks passing
- [ ] Monitoring and alarms configured
- [ ] Auto-scaling configured (if needed)

## Quick Start Commands

### Register Task Definitions
```bash
aws ecs register-task-definition --cli-input-json file://api-task-definition.json --region eu-west-1
aws ecs register-task-definition --cli-input-json file://admin-task-definition.json --region eu-west-1
aws ecs register-task-definition --cli-input-json file://form-task-definition.json --region eu-west-1
```

### Create Services
```bash
aws ecs create-service --cli-input-json file://api-service.json --region eu-west-1
aws ecs create-service --cli-input-json file://admin-service.json --region eu-west-1
aws ecs create-service --cli-input-json file://form-service.json --region eu-west-1
```

### Update Service (for new image version)
```bash
aws ecs update-service \
  --cluster sc-attribute-form-cluster \
  --service sc-attribute-form-api \
  --task-definition sc-attribute-form-api:2 \
  --force-new-deployment \
  --region eu-west-1
```

## Troubleshooting

### Service won't start
- Check CloudWatch logs
- Verify security groups allow traffic
- Check task definition (CPU/memory)
- Verify ECR image exists and is accessible

### Health checks failing
- Check container logs
- Verify health check path is correct
- Check security groups allow health check traffic
- Increase `startPeriod` if container takes time to start

### Can't connect to database
- Verify RDS security group allows API security group
- Check database credentials in Secrets Manager
- Verify VPC configuration (subnets, route tables)

### Images not pulling
- Verify ECS task execution role has ECR permissions
- Check ECR repository exists
- Verify image tags are correct

## Next Steps After Deployment

1. **Set up CI/CD pipeline** to automate future deployments
2. **Configure backup strategy** for database
3. **Set up disaster recovery** plan
4. **Configure monitoring dashboards** in CloudWatch
5. **Set up alerting** for critical issues
6. **Document runbooks** for common operations
7. **Set up staging environment** for testing before production




