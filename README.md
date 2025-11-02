## Form Monorepo

Monorepo containing:
- Backend API (Go + Gin + MySQL)
- Admin UI (React + Vite + TypeScript + Tailwind + shadcn/ui)
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

See `db/migrations` for schema and seeds. See example `curl` commands in the specification to exercise endpoints.



