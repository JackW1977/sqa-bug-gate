@echo off
cd /d "%~dp0"

echo.
echo  =========================================
echo   Software Bug Gate  - Noah Medical
echo  =========================================
echo.

REM Check Python
where py >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Python not found.
  echo  Install from https://www.python.org/downloads/
  echo  Tick "Add Python to PATH" during install.
  pause
  exit /b 1
)
echo  [OK] Python found

REM Install Flask if missing
py -c "import flask" >nul 2>&1
if errorlevel 1 (
  echo  [SETUP] Installing Flask...
  py -m pip install flask httpx
)

REM Install httpx if missing
py -c "import httpx" >nul 2>&1
if errorlevel 1 (
  py -m pip install httpx
)

REM Create .env on first run
if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo  [SETUP] .env created - fill in your Jira credentials then re-run.
    start "" notepad ".env"
    pause
    exit /b 0
  )
)
echo  [OK] .env found

REM Start the server in a new window
start "Software Bug Gate - Server" "%~dp0server_window.bat"

echo  Waiting for server to start...
timeout /t 3 /nobreak >nul

start "" "http://localhost:8080"

echo.
echo  App running at http://localhost:8080
echo  Run stop.bat to shut down.
echo.
