@echo off
title Ferrari Twin Turbo - installer
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this PC. Install Node.js 22 or newer ^(LTS^), then double-click INSTALL.cmd again:
  echo     - https://nodejs.org  ^(download the LTS installer^)   or
  echo     - in a terminal:  winget install OpenJS.NodeJS.LTS
  echo.
  pause
  exit /b 1
)
node ops\setup.mjs %*
echo.
pause
