# Form Monorepo Project

## Overview
This is a form generation monorepo with three main services:
- **API Backend** (Go + Gin) - `apps/api/`
- **Admin UI** (React + Vite + TypeScript + Tailwind) - `apps/admin/`
- **Form Renderer** (React + Vite) - `apps/form/`
- **Shared Renderer Package** - `packages/renderer/`

## Current State
- Node.js and Go are installed
- pnpm dependencies installed
- Admin UI configured to run on port 5000

## Database Requirement
**Important:** This project was built for MySQL, but Replit provides PostgreSQL. To run the full backend API, you'll need:
1. An external MySQL database connection, OR
2. Modify the Go API code to use PostgreSQL instead of MySQL

Required environment variables for full operation:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL database
- `ADMIN_TOKEN` - Bearer token for admin API access
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For file uploads
- `WEBHOOK_SIGNING_KEY` - For webhook security

## Running the Project

### Frontend Only (Admin UI)
```bash
pnpm dev:admin
```
Runs on port 5000.

### Full Stack (requires MySQL)
1. Set environment variables for database and services
2. Run the API: `cd apps/api && go run ./cmd/server`
3. Run Admin UI: `pnpm dev:admin`
4. Run Form Renderer: `pnpm dev:form`

## Project Structure
- `apps/api/cmd/server/` - Go API entry point
- `apps/admin/src/ui/` - Admin UI React components
- `apps/form/src/` - Form renderer
- `packages/renderer/src/` - Shared form rendering components
- `db/migrations/` - Database migration scripts

## Recent Changes
- December 16, 2025: Initial Replit setup, configured Admin UI for port 5000
