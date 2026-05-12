@echo off
setlocal
title SQA Bug Gate — Stopping
cd /d "%~dp0"

echo.
echo  Stopping SQA Bug Gate...
echo.

set STOPPED=0

REM ─── Kill processes on port 3001 (Express API server) ─────────────────────────
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r " [0-9]*:3001 "') do (
  if not "%%a"=="0" (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 (
      echo  [STOPPED] API server  port 3001  ^(PID %%a^)
      set STOPPED=1
    )
  )
)

REM ─── Kill processes on port 5173 (Vite client) ────────────────────────────────
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r " [0-9]*:5173 "') do (
  if not "%%a"=="0" (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 (
      echo  [STOPPED] UI client   port 5173  ^(PID %%a^)
      set STOPPED=1
    )
  )
)

REM ─── Close named console windows if still open ────────────────────────────────
taskkill /FI "WINDOWTITLE eq SQA — API Server (port 3001)" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SQA — UI Client (port 5173)"  /F >nul 2>&1

if "%STOPPED%"=="0" (
  echo  [INFO] No running SQA Bug Gate processes found.
) else (
  echo.
  echo  All stopped.
)
echo.
timeout /t 2 /nobreak >nul
