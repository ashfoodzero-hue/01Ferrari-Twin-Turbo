@echo off
title Ferrari Twin Turbo
cd /d "C:\01Ferrari Twin Turbo"
rem make sure the app is running (the watchdog starts it only if it is down; it never kills anything)
"C:\Program Files\nodejs\node.exe" ops\watchdog_twin.mjs
rem give a fresh start a moment to bring the chart server up, then open the live chart in the default browser
timeout /t 6 /nobreak >nul
start "" "http://127.0.0.1:7444"
:loop
cls
"C:\Program Files\nodejs\node.exe" scripts\status.mjs
echo   Live chart: http://127.0.0.1:7444   ^|   this window refreshes every 30 s - close it any time (the app keeps running).
timeout /t 30 >nul
goto loop
