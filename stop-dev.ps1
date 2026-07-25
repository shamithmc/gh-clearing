# Stop Dev Environment PowerShell Script for Windows
Write-Host "=== Stopping Dev Environment ===" -ForegroundColor Yellow

Write-Host "1. Terminating backend process on port 8080..." -ForegroundColor Cyan
$pids = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique

if ($pids) {
    foreach ($pidToKill in $pids) {
        if ($pidToKill -gt 0) {
            Write-Host "Terminating process $pidToKill..." -ForegroundColor Yellow
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            Write-Host "Backend process ($pidToKill) terminated." -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found running on port 8080." -ForegroundColor Gray
}

Write-Host "2. Stopping Docker containers..." -ForegroundColor Cyan
docker compose down

Write-Host "=== Dev Environment Stopped ===" -ForegroundColor Yellow
