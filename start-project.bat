@echo off
cd /d "%~dp0"
title Khoi dong You Can't Stop Here
echo ===================================================
echo   Dang khoi dong You Can't Stop Here Full-Stack...
echo ===================================================

echo [1/2] Dang khoi dong Backend API (Cong 5050)...
start "Backend API Server" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [2/2] Dang khoi dong Frontend UI (Cong 3000)...
start "Frontend React Vite" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ===================================================
echo   Ca 2 server Backend va Frontend da duoc bat!
echo   Trinh duyet se san sang tai: http://localhost:3000
echo ===================================================
pause

