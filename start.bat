@echo off
setlocal enabledelayedexpansion
title SQA Bug Gate — Starting
cd /d "%~dp0"

echo.
echo  =========================================
echo   SQA Bug Gate  ^|  Noah Medical
echo  =========================================
echo.

REM ─── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js not found.
  echo.
  echo  Install Node.js from https://nodejs.org/ and re-run this file.
  echo  Recommended: LTS version 20 or later.
  echo.
  pause
  exit /b 1
)
for /f %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

REM ─── Create .env from example if missing ──────────────────────────────────────
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo  [SETUP] Created .env — please fill in your credentials.
    echo.
    echo  Required fields:
    echo    JIRA_HOST   e.g. yourcompany.atlassian.net
    echo    JIRA_EMAIL  your Jira account email
    echo    JIRA_TOKEN  Jira API token from id.atlassian.com/manage-profile/security/api-tokens
    echo.
    echo  Optional ^(for AI rephrasing^):
    echo    GLEAN_TOKEN     your Glean API token
    echo    GLEAN_BASE_URL  e.g. https://yourcompany-be.glean.com
    echo.
    echo  Opening .env in Notepad — save it, then re-run start.bat.
    echo.
    start "" notepad ".env"
    pause
    exit /b 0
  )
)
echo  [OK] .env found

REM ─── Check GLEAN in .env ──────────────────────────────────────────────────────
findstr /i "GLEAN_TOKEN=" .env | findstr /v "^#" | findstr /v "your-glean" >nul 2>&1
if errorlevel 1 (
  echo  [INFO] GLEAN_TOKEN not set — AI rephrasing will be unavailable.
  echo         Add GLEAN_TOKEN to .env to enable it.
) else (
  echo  [OK] Glean AI configured
)

REM ─── Install server dependencies ──────────────────────────────────────────────
if not exist "server\node_modules" (
  echo.
  echo  [SETUP] Installing server dependencies ^(first run only^)...
  cd server
  call npm install --silent
  if errorlevel 1 ( echo  [ERROR] npm install failed in server\. & pause & exit /b 1 )
  cd ..
  echo  [OK] Server dependencies installed
)

REM ─── Install client dependencies ──────────────────────────────────────────────
if not exist "client\node_modules" (
  echo.
  echo  [SETUP] Installing client dependencies ^(first run only^)...
  cd client
  call npm install --silent
  if errorlevel 1 ( echo  [ERROR] npm install failed in client\. & pause & exit /b 1 )
  cd ..
  echo  [OK] Client dependencies installed
)

REM ─── Start Express server ─────────────────────────────────────────────────────
echo.
echo  Starting servers...
start "SQA — API Server (port 3001)" cmd /k "cd /d "%~dp0server" && echo [Server] Starting... && npm run dev"

REM ─── Start Vite client ────────────────────────────────────────────────────────
start "SQA — UI Client (port 5173)" cmd /k "cd /d "%~dp0client" && echo [Client] Starting... && npm run dev"

REM ─── Wait then open browser ───────────────────────────────────────────────────
echo  Waiting for servers to initialise...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo  =========================================
echo   Running!
echo.
echo   Wizard:    http://localhost:5173
echo   Settings:  http://localhost:5173/admin
echo.
echo   Close the two server windows to stop,
echo   or run stop.bat
echo  =========================================
echo.
