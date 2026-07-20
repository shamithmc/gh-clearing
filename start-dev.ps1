Write-Host "=== Starting Dev Environment ===" -ForegroundColor Green

# 1. Start Docker services
Write-Host "1. Starting Postgres Database..." -ForegroundColor Cyan
docker compose up -d postgres --wait
docker compose up -d keycloak

# 2. Build Frontend
Write-Host "2. Building React Frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
Pop-Location

# 3. Start Backend in a separate window
Write-Host "3. Starting Spring Boot Backend in a separate window..." -ForegroundColor Cyan
Push-Location backend
$existingBackend = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($existingBackend) {
    Pop-Location
    Write-Error "Port 8080 is already in use by process $($existingBackend.OwningProcess). Close the existing backend and run this script again."
    exit 1
}
Start-Process powershell -WorkingDirectory (Get-Location) -ArgumentList "-NoExit", "-Command", "mvn clean spring-boot:run `"-Dspring-boot.run.profiles=dev`""
Pop-Location

Write-Host "=== Dev Environment Ready at http://localhost:8080/ ===" -ForegroundColor Green
