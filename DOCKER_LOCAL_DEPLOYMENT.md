# Local Docker Deployment Guide

This guide shows you how to deploy and test the entire application stack using Docker locally.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2 (included with Docker Desktop)
- At least 4GB of available RAM

## Quick Start

### 1. Build and Start All Services

```bash
# Build and start all services
docker-compose -f docker-compose.local.yml --env-file .env.docker.local up --build

# Or run in detached mode (background)
docker-compose -f docker-compose.local.yml --env-file .env.docker.local up --build -d
```

### 2. Check Service Status

```bash
# View running containers
docker-compose -f docker-compose.local.yml ps

# View logs
docker-compose -f docker-compose.local.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.local.yml logs -f api
```

### 3. Access the Services

Once started, the services will be available at:

- **API**: http://localhost:8080
  - Health check: http://localhost:8080/api/health
  - API docs: See `API_DOCUMENTATION.md`

- **Admin UI**: http://localhost:3000
  - Frontend admin interface

- **Form Renderer**: http://localhost:3001
  - Public form rendering interface

## Services

### API Service
- **Port**: 8080
- **Image**: Built from `apps/api/Dockerfile`
- **Database**: Uses staging database (configured in `.env.docker.local`)
- **Health Check**: `/api/health`

### Admin UI
- **Port**: 3000
- **Image**: Built from `apps/admin/Dockerfile`
- **Web Server**: Nginx serving static files
- **Health Check**: `/health`

### Form Renderer
- **Port**: 3001
- **Image**: Built from `apps/form/Dockerfile`
- **Web Server**: Nginx serving static files
- **Health Check**: `/health`

## Environment Variables

The deployment uses `.env.docker.local` for configuration. You can:

1. **Use defaults**: The docker-compose file has defaults for most values
2. **Override with .env file**: Create `.env.docker.local` and set your values
3. **Override per command**: Use environment variables

```bash
# Override specific values
ADMIN_TOKEN=my-token docker-compose -f docker-compose.local.yml up
```

## Common Commands

### Start Services
```bash
docker-compose -f docker-compose.local.yml --env-file .env.docker.local up
```

### Stop Services
```bash
docker-compose -f docker-compose.local.yml down
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose -f docker-compose.local.yml --env-file .env.docker.local up --build

# Rebuild specific service
docker-compose -f docker-compose.local.yml build api
docker-compose -f docker-compose.local.yml up -d api
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f api
docker-compose -f docker-compose.local.yml logs -f admin
docker-compose -f docker-compose.local.yml logs -f form
```

### Execute Commands in Containers
```bash
# Access API container shell
docker exec -it form-api-local sh

# Run commands in API container
docker exec form-api-local wget -q -O- http://localhost:8080/api/health
```

### Clean Up
```bash
# Stop and remove containers
docker-compose -f docker-compose.local.yml down

# Remove containers, networks, and volumes
docker-compose -f docker-compose.local.yml down -v

# Remove images
docker-compose -f docker-compose.local.yml down --rmi all
```

## Testing the Deployment

### 1. Test API Health
```bash
curl http://localhost:8080/api/health
# Expected: {"ok":true}
```

### 2. Test API Config
```bash
curl http://localhost:8080/api/config
# Expected: {"nextjsPost":{"enabled":false,"url":""}}
```

### 3. Test Form Creation
```bash
curl -X POST http://localhost:8080/api/forms/publish \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": {
      "en": "Test Form",
      "ar": "نموذج اختبار"
    },
    "attributes": ["phone_number"]
  }'
```

### 4. Access Admin UI
Open http://localhost:3000 in your browser

### 5. Access Form Renderer
Open http://localhost:3001 in your browser

## Troubleshooting

### Port Already in Use
If ports 8080, 3000, or 3001 are already in use:

```bash
# Option 1: Stop the conflicting service
# Find what's using the port
lsof -i :8080

# Option 2: Change ports in docker-compose.local.yml
# Edit the ports section:
ports:
  - "8081:8080"  # Change host port
```

### Build Failures
```bash
# Clean build (no cache)
docker-compose -f docker-compose.local.yml build --no-cache

# Check build logs
docker-compose -f docker-compose.local.yml build api 2>&1 | tee build.log
```

### Database Connection Issues
```bash
# Check if API can reach database
docker exec form-api-local ping -c 3 staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com

# Check API logs for database errors
docker-compose -f docker-compose.local.yml logs api | grep -i "db\|database\|mysql"
```

### Frontend Not Loading
```bash
# Check if nginx is running
docker exec form-admin-local ps aux | grep nginx

# Check nginx logs
docker exec form-admin-local cat /var/log/nginx/error.log

# Test nginx directly
docker exec form-admin-local wget -q -O- http://localhost/health
```

### Container Won't Start
```bash
# Check container status
docker ps -a | grep form-

# Check logs
docker logs form-api-local
docker logs form-admin-local
docker logs form-renderer-local

# Check resource usage
docker stats
```

## Development Workflow

### Making Code Changes

1. **Make your changes** to the code
2. **Rebuild the affected service**:
   ```bash
   docker-compose -f docker-compose.local.yml build api
   docker-compose -f docker-compose.local.yml up -d api
   ```

3. **Or rebuild everything**:
   ```bash
   docker-compose -f docker-compose.local.yml up --build
   ```

### Hot Reload (Development)

For faster development, you can run services locally while using Docker for others:

```bash
# Run only API in Docker
docker-compose -f docker-compose.local.yml up api

# Run frontend locally (in separate terminals)
cd apps/admin && pnpm dev
cd apps/form && pnpm dev
```

## Production Simulation

This local deployment simulates production by:
- ✅ Using Docker containers
- ✅ Using production-like nginx configuration
- ✅ Using staging database
- ✅ Using environment variables
- ✅ Health checks and restart policies

## Next Steps

After testing locally with Docker:

1. **Build images for ECR**:
   ```bash
   ./scripts/build-ecr.sh
   ```

2. **Push to ECR**:
   ```bash
   ./scripts/push-ecr.sh
   ```

3. **Deploy to production** (see `DEPLOYMENT.md`)

## Additional Resources

- See `DEPLOYMENT.md` for production deployment
- See `API_DOCUMENTATION.md` for API usage
- See `README.md` for project overview

