#!/bin/bash
set -e

echo "=========================================="
echo "Docker Local Deployment"
echo "=========================================="
echo ""

# Check if .env.docker.local exists, if not create it from .env.local
if [ ! -f ".env.docker.local" ]; then
    echo "Creating .env.docker.local from apps/api/.env.local..."
    if [ -f "apps/api/.env.local" ]; then
        # Copy and adapt the .env.local file
        cat > .env.docker.local << 'EOF'
# Docker Local Deployment Environment Variables
# Generated from apps/api/.env.local

# Server
ADMIN_TOKEN=dev-admin-token
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174
FORM_BASE_URL=http://localhost:3001

# Database (Staging)
DB_HOST=staging-jan-4-2023-cluster.cluster-cylpew54lkmg.eu-west-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=sc_dynamic_form_generator
DB_USER=sc_dynamic_form_generator_dbuser
DB_PASSWORD=oin!zxc@12mk$palksd

# Cloudinary
CLOUDINARY_CLOUD_NAME=dsg6pa4hp
CLOUDINARY_API_KEY=573184522222431
CLOUDINARY_API_SECRET=EoEztHoWoi3aksb8m4kT3uoxQ4Q
CLOUDINARY_UPLOAD_FOLDER=forms/uploads
CLOUDINARY_UPLOAD_TTL_SECONDS=300

# Webhooks
WEBHOOK_SIGNING_KEY=dev-sign-key
WEBHOOK_TIMEOUT_MS=8000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_BACKOFF_MS=1500

# Next.js POST
NEXTJS_POST_URL=
NEXTJS_POST_ENABLED=false
EOF
        echo "✓ Created .env.docker.local"
    else
        echo "⚠ Warning: apps/api/.env.local not found, using defaults"
    fi
else
    echo "✓ Using existing .env.docker.local"
fi

echo ""
echo "Building and starting services..."
echo ""

# Build and start
docker-compose -f docker-compose.local.yml --env-file .env.docker.local up --build "$@"

