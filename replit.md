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
- Admin UI running on port 5000
- API Server running on port 8080
- Connected to external MySQL database

## Running Services

### Admin UI (Frontend)
- Command: `pnpm dev:admin`
- Port: 5000
- Access at: `/admin/`

### API Server (Backend)
- Command: `cd apps/api && go run ./cmd/server`
- Port: 8080
- Proxied through Admin UI at `/api/`

### Form Renderer (Optional)
- Command: `pnpm dev:form`
- For rendering public forms

## Environment Variables
Required secrets (configured):
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL database
- `ADMIN_TOKEN` - Bearer token for admin API access
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For file uploads
- `WEBHOOK_SIGNING_KEY` - For webhook security

## Project Structure
- `apps/api/cmd/server/` - Go API entry point
- `apps/api/internal/` - Go API internal packages
- `apps/admin/src/ui/` - Admin UI React components
- `apps/form/src/` - Form renderer
- `packages/renderer/src/` - Shared form rendering components
- `db/migrations/` - Database migration scripts

## Submit Actions

### Available Actions
- **native_bridge** - Post to native mobile app bridge
- **server_persist** - Save form responses to database
- **webhooks** - Trigger configured webhooks
- **nextjs_post** - Post data to Next.js endpoint
- **redirect** - Redirect user after submit (supports templates)
- **purchase_authenticated** - Authenticated purchase flow with login modal

### Purchase Authenticated Action
New submit action type for forms requiring user authentication and purchase:
- Validates existing auth token or prompts login modal
- Calls external purchase API with form data
- Supports configurable field mappings for purchase payload
- Optional additional webhooks after successful purchase

Configuration fields:
- `auth_api_base_url` - Base URL for auth/login API
- `purchase_api_url` - Purchase API endpoint
- `device_id`, `app_signature`, `version_number` - API credentials
- `adv_id_field`, `item_id_field`, `category_id_field`, `district_id_field` - Form field mappings
- `payment_method` - CARD, CASH, or KNET
- `additional_webhooks` - Array of webhooks to call after purchase

## Recent Changes
- December 16, 2025: Added Authenticated Purchase Submit Action feature
  - New auth service module (login, validate, purchase API)
  - Login modal component for phone/password authentication
  - Purchase authenticated action handler in submit pipeline
  - Admin UI configuration panel for the new action
- December 16, 2025: Full Replit setup complete
  - Configured Admin UI for port 5000 with Replit host settings
  - Configured API Server on port 8080
  - Connected to external MySQL database
