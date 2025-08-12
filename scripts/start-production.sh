#!/bin/bash
set -e

echo "🚀 Starting GlobeGenius Production Stack..."
echo "Building and bringing up all services (MongoDB, PostgreSQL, Redis, Backend, Frontend, ML Service)..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ GlobeGenius Production Stack is starting up."
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3001"
echo "Health: http://localhost:3001/health"

#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🚀 Starting GlobeGenius production stack"

required_vars=(FLIGHTAPI_KEY MONGODB_URI REDIS_URL SENDGRID_API_KEY SENDGRID_FROM_EMAIL JWT_SECRET)
missing=0
for v in "${required_vars[@]}"; do
  if ! printenv "$v" >/dev/null 2>&1 || [ -z "${!v:-}" ]; then
    echo "⚠️  $v not set in environment (will rely on compose/.env if present)"
    missing=1
  fi
done

docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for backend health..."
for i in {1..20}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || true)
  if [ "$code" = "200" ]; then
    echo "✅ Backend healthy"
    break
  fi
  sleep 1
done

echo "🌐 Frontend:  http://localhost (or http://localhost:3000)"
echo "🛠  Backend:   http://localhost:3001/health"

