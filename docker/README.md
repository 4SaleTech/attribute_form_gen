# Single Image Deployment

This Docker setup combines all three services (API, Admin, Form) into a single image.

## Architecture

- **API Backend**: Go server running on port 8080 (internal)
- **Admin Frontend**: React app served at `/admin`
- **Form Frontend**: React app served at `/` (root)
- **Nginx**: Reverse proxy routing requests

## Routes

- `https://attribute-form-generator.q84sale.com/admin` → Admin UI
- `https://attribute-form-generator.q84sale.com/` → Form UI  
- `https://attribute-form-generator.q84sale.com/api/*` → API Backend

## Environment Variables

The API server requires these environment variables (set at container runtime):

### Database
- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port (default: 3306)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Authentication
- `ADMIN_TOKEN` - Bearer token for admin API access

### Cloudinary (for file uploads)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_UPLOAD_FOLDER` - Upload folder (default: forms/uploads)
- `CLOUDINARY_UPLOAD_TTL_SECONDS` - Upload TTL (default: 300)

### Webhooks
- `WEBHOOK_SIGNING_KEY` - Key for signing webhooks
- `WEBHOOK_TIMEOUT_MS` - Timeout in ms (default: 8000)
- `WEBHOOK_MAX_RETRIES` - Max retries (default: 3)
- `WEBHOOK_RETRY_BACKOFF_MS` - Retry backoff (default: 1500)

### Optional
- `PORT` - API port (default: 8080)
- `CORS_ORIGINS` - CORS origins (default: http://localhost:5173,http://localhost:5174)
- `FORM_BASE_URL` - Base URL for forms (defaults to Origin header)
- `NEXTJS_POST_URL` - Next.js POST URL (optional)
- `NEXTJS_POST_ENABLED` - Enable Next.js POST (default: false)

## Building

```bash
./scripts/build-and-push-production.sh
```

This builds and pushes a single image:
- `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:V3`
- `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:latest`

## Running

```bash
docker run -d \
  -p 80:80 \
  -e DB_HOST=your-db-host \
  -e DB_NAME=your-db-name \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e ADMIN_TOKEN=your-admin-token \
  -e CLOUDINARY_CLOUD_NAME=your-cloud-name \
  -e CLOUDINARY_API_KEY=your-api-key \
  -e CLOUDINARY_API_SECRET=your-api-secret \
  -e WEBHOOK_SIGNING_KEY=your-signing-key \
  640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:V3
```

## Frontend Configuration

The admin and form apps **do not require environment variables**. They use relative `/api` paths which nginx proxies to the backend automatically.

No build-time configuration needed - the apps will work with any domain as long as nginx is routing `/api` correctly.
