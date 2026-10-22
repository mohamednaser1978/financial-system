@echo off
cd /d "%~dp0.next\standalone"
start /b node server.js
timeout /t 5 /nobreak > nul
start "" "Financial System.exe"