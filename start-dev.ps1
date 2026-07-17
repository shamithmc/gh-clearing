Write-Host "=== Starting Dev Environment ===" -ForegroundColor Green

# 1. Start Docker services
Write-Host "1. Starting Postgres Database..." -ForegroundColor Cyan
docker compose up -d --wait

# 2. Build Frontend
Write-Host "2. Building React Frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
Pop-Location

# 3. Start Backend in a separate window
Write-Host "3. Starting Spring Boot Backend in a separate window..." -ForegroundColor Cyan
Push-Location backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn spring-boot:run"
Pop-Location

Write-Host "=== Dev Environment Ready at http://localhost:8080/ ===" -ForegroundColor Green
