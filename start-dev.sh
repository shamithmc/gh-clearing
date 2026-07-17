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
(cd backend && nohup mvn spring-boot:run > ../backend.log 2>&1 &)

echo -e "\e[32m=== Dev Environment Ready at http://localhost:8080/ ===\e[0m"
