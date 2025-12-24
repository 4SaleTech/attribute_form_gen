# V3 Local Testing URLs

## Container Status
- **Container**: `form-generator-v3-test`
- **Image**: `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:V3`
- **Port**: `8081` (mapped from container port 80)

## Access URLs

### Try these URLs in your browser:

1. **Health Check**:
   - http://127.0.0.1:8081/health
   - http://localhost:8081/health

2. **Admin UI**:
   - http://127.0.0.1:8081/admin/
   - http://localhost:8081/admin/

3. **Form UI**:
   - http://127.0.0.1:8081/
   - http://localhost:8081/

4. **API**:
   - http://127.0.0.1:8081/api/health
   - http://localhost:8081/api/health

## Troubleshooting

If you're getting "connection failed":

1. **Check if container is running**:
   ```bash
   docker ps | grep form-generator-v3-test
   ```

2. **Try using 127.0.0.1 instead of localhost**:
   - Some browsers/networks prefer IP over hostname

3. **Check if port is accessible**:
   ```bash
   curl http://127.0.0.1:8081/health
   ```

4. **Check container logs**:
   ```bash
   docker logs form-generator-v3-test
   ```

5. **Verify port mapping**:
   ```bash
   docker port form-generator-v3-test
   ```

6. **Restart the container**:
   ```bash
   docker stop form-generator-v3-test
   docker rm form-generator-v3-test
   ./scripts/test-v3-local.sh
   ```

## Browser-Specific Issues

- **Chrome/Edge**: Try clearing cache or using incognito mode
- **Firefox**: Check if localhost is blocked in privacy settings
- **Safari**: May require explicit localhost permission

## Network Issues

If accessing from another machine on the same network:
- Use your machine's IP address instead of localhost
- Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Access via: `http://YOUR_IP:8081/admin/`

