# Accessing Backend Logs

## Container Logs

The API server logs are written to `/tmp/api-server.log` inside the container.

### Docker

```bash
# View all container logs
docker logs <container-name>

# Follow logs in real-time
docker logs -f <container-name>

# View last 100 lines
docker logs --tail 100 <container-name>

# View API server logs specifically (inside container)
docker exec <container-name> cat /tmp/api-server.log

# View API server logs with tail (inside container)
docker exec <container-name> tail -f /tmp/api-server.log

# View last 50 lines of API server logs
docker exec <container-name> tail -50 /tmp/api-server.log
```

### Kubernetes

```bash
# View pod logs
kubectl logs <pod-name>

# Follow logs in real-time
kubectl logs -f <pod-name>

# View logs from specific container (if multi-container pod)
kubectl logs <pod-name> -c <container-name>

# View API server logs specifically (inside pod)
kubectl exec <pod-name> -- cat /tmp/api-server.log

# View API server logs with tail
kubectl exec <pod-name> -- tail -f /tmp/api-server.log

# View last 50 lines
kubectl exec <pod-name> -- tail -50 /tmp/api-server.log
```

### ECS (AWS)

```bash
# View logs via AWS CLI
aws logs tail /ecs/<task-definition-name> --follow

# Or via CloudWatch Console
# Go to: CloudWatch > Log Groups > /ecs/<task-definition-name>
```

## Nginx Logs

Nginx logs are also available:

```bash
# Nginx access logs
docker exec <container-name> cat /var/log/nginx/access.log

# Nginx error logs (shows 502 errors)
docker exec <container-name> cat /var/log/nginx/error.log

# Follow nginx error logs
docker exec <container-name> tail -f /var/log/nginx/error.log
```

## What to Look For

### API Server Startup Issues

Look for these in `/tmp/api-server.log`:

1. **Missing Environment Variables:**
   ```
   load config: required key ADMIN_TOKEN missing value
   ```

2. **Database Connection Errors:**
   ```
   db ping: dial tcp: connect: connection refused
   db ping: Access denied for user
   ```

3. **API Server Crashes:**
   ```
   panic: runtime error
   fatal error: ...
   ```

### Startup Script Output

The startup script logs to stdout/stderr, visible in `docker logs`:

- `[timestamp] Starting API server...`
- `[timestamp] Waiting for API server to be ready...`
- `[timestamp] ERROR: API server failed to start!` (if startup fails)
- `[timestamp] API server is ready and responding` (if successful)

## Quick Debug Commands

```bash
# Check if API server process is running
docker exec <container-name> ps aux | grep api-server

# Check if port 8080 is listening
docker exec <container-name> netstat -tlnp | grep 8080
# or
docker exec <container-name> ss -tlnp | grep 8080

# Test API health endpoint directly
docker exec <container-name> curl http://127.0.0.1:8080/api/health

# Check environment variables
docker exec <container-name> env | grep -E "(DB_|ADMIN_|CLOUDINARY_|WEBHOOK_)"
```

## Common Issues and Solutions

### Issue: "Connection refused" (502 error)
**Check:**
1. Is API server process running? `ps aux | grep api-server`
2. Is port 8080 listening? `netstat -tlnp | grep 8080`
3. Check API server logs: `cat /tmp/api-server.log`

### Issue: API server dies immediately
**Check:**
1. Missing environment variables (startup script will show these)
2. Database connection failure
3. Check logs for panic/error messages

### Issue: API server takes too long to start
**Check:**
1. Database connection timeout
2. Network issues
3. Check DB credentials and connectivity

