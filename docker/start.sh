#!/bin/sh
set -e

# Function to handle shutdown
cleanup() {
    echo "Shutting down..."
    kill -TERM "$API_PID" 2>/dev/null || true
    kill -TERM "$NGINX_PID" 2>/dev/null || true
    wait "$API_PID" "$NGINX_PID" 2>/dev/null || true
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Log file for API server
API_LOG="/tmp/api-server.log"

# Force API server to use port 8080 (override any PORT env var)
export PORT=8080

# Start API server in background
echo "[$(date)] Starting API server on port 8080..."
/usr/local/bin/api-server > "$API_LOG" 2>&1 &
API_PID=$!

# Give API server a moment to start
sleep 2

# Check if API process is still running
if ! kill -0 $API_PID 2>/dev/null; then
    echo "[$(date)] ERROR: API server process died immediately!"
    echo "API server logs:"
    cat "$API_LOG" 2>/dev/null || echo "No logs available"
    echo ""
    echo "Checking required environment variables..."
    echo "ADMIN_TOKEN: ${ADMIN_TOKEN:+SET} ${ADMIN_TOKEN:-NOT SET}"
    echo "DB_HOST: ${DB_HOST:+SET} ${DB_HOST:-NOT SET}"
    echo "DB_NAME: ${DB_NAME:+SET} ${DB_NAME:-NOT SET}"
    echo "DB_USER: ${DB_USER:+SET} ${DB_USER:-NOT SET}"
    echo "DB_PASSWORD: ${DB_PASSWORD:+SET} ${DB_PASSWORD:-NOT SET}"
    echo "CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME:+SET} ${CLOUDINARY_CLOUD_NAME:-NOT SET}"
    echo "CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY:+SET} ${CLOUDINARY_API_KEY:-NOT SET}"
    echo "CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET:+SET} ${CLOUDINARY_API_SECRET:-NOT SET}"
    echo "WEBHOOK_SIGNING_KEY: ${WEBHOOK_SIGNING_KEY:+SET} ${WEBHOOK_SIGNING_KEY:-NOT SET}"
    exit 1
fi

# Wait for API server to be ready (check if port 8080 is listening)
echo "[$(date)] Waiting for API server to be ready..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    # Check if process is still alive
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "[$(date)] ERROR: API server process died during startup!"
        echo "API server logs:"
        cat "$API_LOG" 2>/dev/null || echo "No logs available"
        exit 1
    fi
    
    # Check if API is responding (use curl directly, more reliable)
    if curl -f -s http://127.0.0.1:8080/api/health > /dev/null 2>&1; then
        echo "[$(date)] API server is ready and responding"
        break
    fi
    
    # Also check if port is listening (fallback check)
    if nc -z 127.0.0.1 8080 2>/dev/null; then
        # Port is listening, but API might not be ready yet, continue waiting
        :
    fi
    
    sleep 1
    WAITED=$((WAITED + 1))
    if [ $((WAITED % 5)) -eq 0 ]; then
        echo "[$(date)] Still waiting... (${WAITED}/${MAX_WAIT}s)"
    fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "[$(date)] ERROR: API server did not become ready within ${MAX_WAIT} seconds"
    echo "API server process status:"
    ps aux | grep api-server | grep -v grep || echo "Process not found"
    echo ""
    echo "Port 8080 status:"
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep 8080 || echo "Port 8080 not listening"
    elif command -v nc >/dev/null 2>&1; then
        if nc -z 127.0.0.1 8080 2>/dev/null; then
            echo "Port 8080 is listening (checked via nc)"
        else
            echo "Port 8080 not listening"
        fi
    else
        echo "Cannot check port status (netstat/nc not available)"
    fi
    echo ""
    echo "API server logs (last 50 lines):"
    tail -50 "$API_LOG" 2>/dev/null || echo "No logs available"
    exit 1
fi

# Start nginx in foreground
echo "[$(date)] Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Monitor API server in background and restart nginx if API dies
(
    while kill -0 $API_PID 2>/dev/null; do
        sleep 5
    done
    echo "[$(date)] ERROR: API server died! Shutting down nginx..."
    kill -TERM $NGINX_PID 2>/dev/null || true
) &

# Wait for both processes
wait $API_PID $NGINX_PID

