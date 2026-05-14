@echo off
cd /d "%~dp0"
title Software Bug Gate - Server
echo Starting Software Bug Gate server on port 8080...
echo.
py app.py
echo.
echo Server stopped. Press any key to close.
pause >nul
