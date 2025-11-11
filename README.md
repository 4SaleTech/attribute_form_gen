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
# Set AWS credentials
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=eu-west-1

# Set ECR configuration
export ECR_REGISTRY=640249400316.dkr.ecr.eu-west-1.amazonaws.com
export REPO_PREFIX=sc_attribute_form_generator
export TAG=V1

# Build and push images (amd64 architecture)
./scripts/build-and-push-production.sh
```

**Images pushed to:**
- `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:api-V1`
- `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:admin-V1`
- `640249400316.dkr.ecr.eu-west-1.amazonaws.com/sc_attribute_form_generator:form-V1`

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



