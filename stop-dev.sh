#!/bin/bash

echo -e "\e[33m=== Stopping Dev Environment ===\e[0m"

# 1. Stop backend Tomcat process running on port 8080
echo -e "\e[36m1. Terminating backend on port 8080...\e[0m"
PID=$(lsof -t -i:8080 || true)
if [ -n "$PID" ]; then
    kill -9 $PID
    echo -e "\e[32mBackend process ($PID) terminated.\e[0m"
else
    # Fallback to fuser if lsof is not available
    PID=$(fuser 8080/tcp 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID
        echo -e "\e[32mBackend process ($PID) terminated.\e[0m"
    else
        echo -e "\e[90mNo process found running on port 8080.\e[0m"
    fi
fi

# 2. Stop Docker services
echo -e "\e[36m2. Stopping Docker containers...\e[0m"
docker compose down

echo -e "\e[33m=== Dev Environment Stopped ===\e[0m"
