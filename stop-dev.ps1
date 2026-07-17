Write-Host "=== Stopping Dev Environment ===" -ForegroundColor Yellow

# 1. Stop backend Tomcat process running on port 8080
Write-Host "1. Terminating backend on port 8080..." -ForegroundColor Cyan
$port8080Process = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port8080Process) {
    Stop-Process -Id $port8080Process -Force
    Write-Host "Backend process terminated." -ForegroundColor Green
} else {
    Write-Host "No process found running on port 8080." -ForegroundColor Gray
}

# 2. Stop Docker services
Write-Host "2. Stopping Docker containers..." -ForegroundColor Cyan
docker compose down

Write-Host "=== Dev Environment Stopped ===" -ForegroundColor Yellow
