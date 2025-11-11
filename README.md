## Form Monorepo

Monorepo containing:
- Backend API (Go + Gin + MySQL)
- Admin UI (React + Vite + TypeScript + Tailwind + shadcn/ui)
- Form Renderer (React + Vite)
- Renderer package (schema-driven React renderer)

### Local Dev

1. Start MySQL:

```bash
docker-compose up -d
```

2. Migrate dev DB:

```bash
migrate -path db/migrations -database "mysql://formdev:formdevpw@tcp(localhost:3307)/formdev" up
```

3. Run API (dev env):

```bash
cd apps/api
ENVFILE=.env.local go run ./cmd/server
```

4. Admin UI:

```bash
pnpm install
pnpm dev:admin
```

5. Form Renderer (optional):

```bash
pnpm dev:form
```

### Production Deployment

This project includes Dockerfiles and deployment scripts for AWS ECR.

**Quick Start:**
```bash
export ECR_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com
export AWS_REGION=us-east-1
./scripts/build-and-push-ecr.sh
```

**Documentation:**
- See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed deployment instructions
- See [`CREATE_FORM_CURL.md`](./CREATE_FORM_CURL.md) for API usage examples
- See [`USER_GUIDE.md`](./USER_GUIDE.md) for user documentation

### Project Structure

- `apps/api/` - Go backend API server
- `apps/admin/` - Admin UI for managing forms
- `apps/form/` - Form renderer for public forms
- `packages/renderer/` - Shared React form renderer package
- `db/migrations/` - Database migrations
- `scripts/` - Build and deployment scripts

See `db/migrations` for schema and seeds. See example `curl` commands in the specification to exercise endpoints.



