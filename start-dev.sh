#!/bin/bash
set -e

echo -e "\e[32m=== Starting Dev Environment ===\e[0m"

# 1. Start Docker services
echo -e "\e[36m1. Starting Postgres Database...\e[0m"
docker compose up -d postgres --wait
docker compose up -d keycloak

# 2. Build Frontend
echo -e "\e[36m2. Building React Frontend...\e[0m"
(cd frontend && npm run build)

# 3. Start Backend
echo -e "\e[36m3. Starting Spring Boot Backend in background (logs redirected to backend.log)...\e[0m"
PORT_IN_USE=false
if command -v lsof >/dev/null 2>&1 && lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
  PORT_IN_USE=true
elif command -v netstat >/dev/null 2>&1 && netstat -ano | grep LISTENING | grep -q :8080; then
  PORT_IN_USE=true
fi

if [ "$PORT_IN_USE" = true ]; then
  echo "Port 8080 is already in use. Stop the existing backend and run this script again." >&2
  exit 1
fi
(cd backend && nohup mvn clean spring-boot:run -Dspring-boot.run.profiles=dev > ../backend.log 2>&1 &)

echo -e "\e[32m=== Dev Environment Ready at http://localhost:8080/ ===\e[0m"
