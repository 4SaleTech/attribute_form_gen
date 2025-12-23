# Files Used by ECR Production Images

**Note**: All production versions (V9, V16, V17, etc.) use the same root `Dockerfile`, so the files listed here apply to all versions. The version number is just a tag - it doesn't change which files are used.

This document lists all files that are used by the Docker build process for production ECR images.

## Root Configuration Files
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `package.json` - Root package.json for monorepo
- `pnpm-lock.yaml` - Lock file for dependencies
- `tsconfig.base.json` - TypeScript base configuration
- `Dockerfile` - Main Dockerfile used for building the image

## Docker Runtime Files
- `docker/nginx.conf` - Nginx configuration for production
- `docker/start.sh` - Startup script that runs API server and nginx

## Admin Frontend (apps/admin/)
### Configuration
- `apps/admin/package.json`
- `apps/admin/vite.config.ts`
- `apps/admin/tailwind.config.js`
- `apps/admin/postcss.config.js`
- `apps/admin/index.html`
- `apps/admin/nginx.conf` (not used in combined Dockerfile, but exists)

### Source Code
- `apps/admin/src/index.css`
- `apps/admin/src/main.tsx`
- `apps/admin/src/ui/App.tsx`
- `apps/admin/src/ui/Attributes.tsx`
- `apps/admin/src/ui/FormBuilder.tsx`
- `apps/admin/src/ui/Forms.tsx`
- `apps/admin/src/ui/QuestionEditor.tsx`
- `apps/admin/src/ui/Questions.tsx`
- `apps/admin/src/ui/Submissions.tsx`
- `apps/admin/src/ui/Webhooks.tsx`

### Assets
- `apps/admin/public/fonts/sakrPro-Bold.otf`
- `apps/admin/public/fonts/sakrPro-Light.otf`
- `apps/admin/public/fonts/sakrPro-Medium.otf`
- `apps/admin/public/fonts/sakrPro-Regular.otf`

## Form Frontend (apps/form/)
### Configuration
- `apps/form/package.json`
- `apps/form/vite.config.ts`
- `apps/form/tailwind.config.js`
- `apps/form/postcss.config.js`
- `apps/form/index.html`
- `apps/form/nginx.conf` (not used in combined Dockerfile, but exists)

### Source Code
- `apps/form/src/index.css`
- `apps/form/src/main.tsx`

### Assets
- `apps/form/public/fonts/sakrPro-Bold.otf`
- `apps/form/public/fonts/sakrPro-Light.otf`
- `apps/form/public/fonts/sakrPro-Medium.otf`
- `apps/form/public/fonts/sakrPro-Regular.otf`

### Test Files (included but may not be used in production)
- `apps/form/public/test-native-bridge.html`
- `apps/form/test-amplitude.html`

## Renderer Package (packages/renderer/)
### Configuration
- `packages/renderer/package.json`
- `packages/renderer/tsconfig.json`
- `packages/renderer/vitest.config.ts` (for tests, included in build)

### Source Code
- `packages/renderer/src/index.ts` - Main entry point
- `packages/renderer/src/analytics/amplitude.ts`
- `packages/renderer/src/analytics/userApi.ts`
- `packages/renderer/src/renderer/createRenderer.tsx`
- `packages/renderer/src/renderer/renderForm.tsx`
- `packages/renderer/src/renderer/types.ts`
- `packages/renderer/src/ui/FormView.tsx`
- `packages/renderer/src/ui/registry.tsx`
- `packages/renderer/src/ui/styles.css`
- `packages/renderer/src/ui/theme.tsx`
- `packages/renderer/src/workflow/submit.ts`
- `packages/renderer/src/workflow/submit.test.ts` (included but not executed)
- `packages/renderer/src/workflow/submit-redirect.test.ts` (included but not executed)

## API Backend (apps/api/)
### Configuration
- `apps/api/go.mod` - Go module definition
- `apps/api/go.sum` - Go dependencies checksum
- `apps/api/sqlc.yaml` - SQLC code generation config

### Source Code
- `apps/api/cmd/server/main.go` - Main entry point
- `apps/api/internal/config/config.go` - Configuration loading
- `apps/api/internal/server/server.go` - HTTP server setup
- `apps/api/internal/types/types.go` - Type definitions
- `apps/api/internal/serverhandlers/admin.go` - Admin endpoints
- `apps/api/internal/serverhandlers/forms.go` - Form endpoints
- `apps/api/internal/serverhandlers/submissions.go` - Submission endpoints
- `apps/api/internal/serverhandlers/submissions_admin.go` - Admin submission endpoints
- `apps/api/internal/serverhandlers/uploads.go` - File upload endpoints
- `apps/api/internal/serverhandlers/validation.go` - Validation logic
- `apps/api/internal/serverhandlers/webhooks.go` - Webhook endpoints
- `apps/api/internal/serverhandlers/middleware.go` - Middleware functions
- `apps/api/internal/serverhandlers/handlers_test.go` - Tests (included but not executed)
- `apps/api/internal/db/queries/forms.sql` - SQL queries for SQLC

## Files NOT Used by ECR Production Builds (but exist in repo)
- `apps/admin/Dockerfile` - Individual Dockerfile (superseded by root Dockerfile)
- `apps/api/Dockerfile` - Individual Dockerfile (superseded by root Dockerfile)
- `apps/form/Dockerfile` - Individual Dockerfile (superseded by root Dockerfile)
- `apps/api/main` - Build artifact (should be gitignored)
- `apps/api/server` - Build artifact (should be gitignored)
- All root-level test files (`test-*.html`, `test-*.js`, `test-*.sh`)
- Documentation files (`.md` files)
- Scripts in `scripts/` directory
- `docker-compose*.yml` files
- `db/migrations/` files (database migrations are run separately, not in Docker image)

## Build Process Summary

1. **Stage 1 (Admin Builder)**: Copies workspace files, installs dependencies, builds admin app
2. **Stage 2 (Form Builder)**: Copies workspace files, installs dependencies, builds form app  
3. **Stage 3 (API Builder)**: Copies Go files, downloads dependencies, builds Go binary
4. **Stage 4 (Production Runtime)**: Combines built frontends, API binary, nginx config, and startup script

The final image contains:
- Built admin frontend in `/usr/share/nginx/html/admin`
- Built form frontend in `/usr/share/nginx/html/form`
- API binary at `/usr/local/bin/api-server`
- Nginx config at `/etc/nginx/nginx.conf`
- Startup script at `/start.sh`
