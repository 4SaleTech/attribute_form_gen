# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Build Admin Frontend
# ============================================
FROM node:20-alpine AS admin-builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/renderer/package.json ./packages/renderer/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/admin ./apps/admin

# Build the admin app
WORKDIR /app/apps/admin
RUN pnpm build

# ============================================
# Stage 2: Build Form Frontend
# ============================================
FROM node:20-alpine AS form-builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/renderer/package.json ./packages/renderer/
COPY apps/form/package.json ./apps/form/

# Install dependencies
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/form ./apps/form

# Build the form app
WORKDIR /app/apps/form
RUN pnpm build

# ============================================
# Stage 3: Build API Backend
# ============================================
FROM golang:1.23-alpine AS api-builder

WORKDIR /app

# Copy go mod files first for better caching
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

# Copy source code
COPY apps/api/ ./

# Build the binary
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /out/server ./cmd/server

# ============================================
# Stage 4: Production Runtime
# ============================================
FROM nginx:alpine

# Install dumb-init and netcat for health checks
RUN apk add --no-cache dumb-init netcat-openbsd curl

# Copy built frontend apps
COPY --from=admin-builder /app/apps/admin/dist /usr/share/nginx/html/admin
COPY --from=form-builder /app/apps/form/dist /usr/share/nginx/html/form

# Copy API binary
COPY --from=api-builder /out/server /usr/local/bin/api-server

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/start.sh"]

