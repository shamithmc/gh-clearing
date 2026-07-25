#!/bin/bash

echo -e "\e[33m=== Stopping Dev Environment ===\e[0m"

# 1. Stop backend Tomcat process running on port 8080
echo -e "\e[36m1. Terminating backend on port 8080...\e[0m"

PID=""
if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -t -i:8080 || true)
fi

if [ -z "$PID" ] && command -v fuser >/dev/null 2>&1; then
    PID=$(fuser 8080/tcp 2>/dev/null || true)
fi

# Windows netstat / taskkill fallback (Git Bash / MSYS2 / CYGWIN)
if command -v netstat >/dev/null 2>&1; then
    WIN_PIDS=$(netstat -ano | grep LISTENING | grep :8080 | awk '{print $NF}' | sort -u || true)
    for wpid in $WIN_PIDS; do
        if [ -n "$wpid" ] && [ "$wpid" -gt 0 ] 2>/dev/null; then
            echo -e "\e[33mTerminating Windows process $wpid on port 8080...\e[0m"
            taskkill //F //PID "$wpid" 2>/dev/null || true
            PID="$wpid"
        fi
    done
fi

# PowerShell fallback
if [ -z "$PID" ] && command -v powershell.exe >/dev/null 2>&1; then
    PS_PID=$(powershell.exe -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess" 2>/dev/null | tr -d '\r' | head -n 1 || true)
    if [ -n "$PS_PID" ] && [ "$PS_PID" -gt 0 ] 2>/dev/null; then
        echo -e "\e[33mTerminating process $PS_PID via PowerShell...\e[0m"
        powershell.exe -NoProfile -Command "Stop-Process -Id $PS_PID -Force" 2>/dev/null || true
        PID="$PS_PID"
    fi
fi

if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo -e "\e[32mBackend process ($PID) terminated.\e[0m"
else
    echo -e "\e[90mNo process found running on port 8080.\e[0m"
fi

# 2. Stop Docker services
echo -e "\e[36m2. Stopping Docker containers...\e[0m"
docker compose down

echo -e "\e[33m=== Dev Environment Stopped ===\e[0m"
