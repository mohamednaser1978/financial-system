@echo off
echo Starting Financial System...
echo.

REM Find node in common locations
set NODE_PATH=
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" set NODE_PATH=C:\Program Files\nodejs\node.exe
    if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_PATH=C:\Program Files (x86)\nodejs\node.exe
)

if defined NODE_PATH (
    echo Using Node from: %NODE_PATH%
    "%NODE_PATH%" ".next\standalone\server.js"
) else (
    echo Node not found. Please install Node.js from https://nodejs.org
    pause
)