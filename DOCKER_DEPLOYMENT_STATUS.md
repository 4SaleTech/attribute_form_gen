# Docker Local Deployment - Current Status

## ✅ Successfully Deployed Services

### 1. Admin UI
- **URL**: http://localhost:3000
- **Status**: ✅ Running and accessible
- **Container**: `form-admin-local`
- **Port**: 3000 → 80 (nginx)

### 2. Form Renderer
- **URL**: http://localhost:3001
- **Status**: ✅ Running and accessible
- **Container**: `form-renderer-local`
- **Port**: 3001 → 80 (nginx)

## ⚠️ API Service Issue

### API Server
- **URL**: http://localhost:8080
- **Status**: ❌ Database connection blocked
- **Container**: `form-api-local`
- **Port**: 8080 → 8080

### Problem
The API container cannot connect to the staging RDS database because:
- RDS security group is blocking the Docker container's IP address (`84.36.108.147`)
- The database only allows connections from whitelisted IPs

### Error Message
```
Error 1045 (28000): Access denied for user 'sc_dynamic_form_generator_dbuser'@'84.36.108.147'
```

## Solutions

### Option 1: Use Local MySQL Database (Recommended for Testing)

Update `docker-compose.local.yml` to use the local MySQL container:

```yaml
environment:
  - DB_HOST=formdev-mysql  # Use Docker service name
  - DB_PORT=3306
  - DB_NAME=formdev
  - DB_USER=formdev
  - DB_PASSWORD=formdevpw
```

Then start MySQL:
```bash
docker-compose up -d mysql
```

### Option 2: Whitelist Docker Container IP in RDS

1. Get your Docker container's public IP
2. Add it to the RDS security group inbound rules
3. Allow MySQL/Aurora traffic from that IP

### Option 3: Use Host Network Mode

Add to API service in docker-compose:
```yaml
network_mode: "host"
```

This makes the container use the host's network, so it will appear to come from your machine's IP.

## Current Test URLs

### Working Services
- **Admin UI**: http://localhost:3000
- **Form Renderer**: http://localhost:3001

### API Endpoints (when database access is fixed)
- **Health Check**: http://localhost:8080/api/health
- **Config**: http://localhost:8080/api/config
- **Forms**: http://localhost:8080/api/forms
- **Attributes**: http://localhost:8080/api/attributes

## Container Management

### View Status
```bash
docker ps --filter "name=form-"
```

### View Logs
```bash
# API logs
docker logs form-api-local

# Admin logs
docker logs form-admin-local

# Form logs
docker logs form-renderer-local

# All logs
docker-compose -f docker-compose.local.yml logs -f
```

### Stop Services
```bash
docker-compose -f docker-compose.local.yml down
```

### Restart API (after fixing database)
```bash
docker-compose -f docker-compose.local.yml restart api
```

## Next Steps

1. **For immediate testing**: Use Option 1 (local MySQL) - this is the fastest solution
2. **For production-like testing**: Use Option 2 (whitelist IP) - requires AWS access
3. **For development**: Use Option 3 (host network) - simplest but less isolated

## Images Built Successfully

All Docker images were built successfully:
- ✅ `form-repo-api` (Go API server)
- ✅ `form-repo-admin` (React Admin UI with nginx)
- ✅ `form-repo-form` (React Form Renderer with nginx)

The deployment infrastructure is working correctly - only the database connectivity needs to be resolved.

