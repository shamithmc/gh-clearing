# Start Dev Environment PowerShell Script for Windows
$ErrorActionPreference = "Stop"

Write-Host "=== Starting Dev Environment ===" -ForegroundColor Green

Write-Host "1. Starting Postgres Database..." -ForegroundColor Cyan
docker compose up -d postgres --wait
docker compose up -d keycloak

Write-Host "2. Building React Frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
Pop-Location

Write-Host "3. Starting Spring Boot Backend in background..." -ForegroundColor Cyan
$existingPid = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess
if ($existingPid) {
    Write-Host "Port 8080 is already in use by process $existingPid. Please stop it first." -ForegroundColor Red
    exit 1
}

Push-Location backend
Start-Process -FilePath "mvn" -ArgumentList "clean", "spring-boot:run", "-Dspring-boot.run.profiles=dev" -NoNewWindow
Pop-Location

Write-Host "=== Dev Environment Ready at http://localhost:8080/ ===" -ForegroundColor Green
