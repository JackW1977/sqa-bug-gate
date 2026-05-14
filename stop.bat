@echo off
setlocal
title Software Bug Gate - Stopping
cd /d "%~dp0"

echo.
echo  Stopping Software Bug Gate...
echo.

set STOPPED=0

REM --- Kill processes on port 8080 (Flask server) ---
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r " [0-9]*:8080 "') do (
  if not "%%a"=="0" (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 (
      echo  [STOPPED] Flask server  port 8080  (PID %%a)
      set STOPPED=1
    )
  )
)

REM --- Close named console window if still open ---
taskkill /FI "WINDOWTITLE eq Software Bug Gate - Server (port 8080)" /F >nul 2>&1

if "%STOPPED%"=="0" (
  echo  [INFO] No running Software Bug Gate processes found.
) else (
  echo.
  echo  All stopped.
)
echo.
timeout /t 2 /nobreak >nul
